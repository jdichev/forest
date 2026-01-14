import chunk from "lodash/chunk";
import pinoLib from "pino";
import ms from "ms";
import MixedDataModel from "./MixedDataModel";
import Scheduler from "./Scheduler";
//@ts-ignore
import { fetchFeed } from "fetch-feed";

const pino = pinoLib({
  level: "trace",
  name: "FeedUpdater",
});

const dataModel = MixedDataModel.getInstance();

export default class FeedUpdater {
  private chunkSize = 4;

  private feedsProcCache: {
    lastUpdateTimes: { [key: string]: number };
    feedFrequencies: { [key: string]: number };
  } = {
    lastUpdateTimes: {},
    feedFrequencies: {},
  };

  /**
   * Adds a new feed to the system and processes its items.
   * @param {Feed} feedData - The feed data to add.
   * @returns {Promise<Feed>} A promise that resolves with the added feed.
   */
  public async addFeed(feedData: Feed) {
    pino.debug(feedData, "feed data");

    let feedResStr;
    let feedRes;

    try {
      feedResStr = await fetchFeed(feedData.feedUrl);
      feedRes = JSON.parse(feedResStr);
    } catch (error) {
      pino.error(error);
      throw error;
    }

    if (!feedRes || typeof feedRes !== "object") {
      const error = new Error("Invalid feed data: response is not an object");
      pino.error({ feedUrl: feedData.feedUrl }, error.message);
      throw error;
    }

    if (!Array.isArray(feedRes.items)) {
      const error = new Error("Invalid feed data: items is not an array");
      pino.error({ feedUrl: feedData.feedUrl }, error.message);
      throw error;
    }

    const feed: Feed = {
      title: feedRes.title || "NO_TITLE",
      feedUrl: feedData.feedUrl,
      url:
        Array.isArray(feedRes.links) && feedRes.links.length
          ? feedRes.links[0]
          : "",
      feedCategoryId: feedData.feedCategoryId,
    };

    try {
      await dataModel.insertFeed(feed);
    } catch (error: any) {
      pino.error(
        { error, feedUrl: feedData.feedUrl },
        "Failed to insert feed into database"
      );
      throw error;
    }

    const feedFromDb = await dataModel.getFeedByUrl(feedData.feedUrl);

    await this.insertItems({
      feed: feedFromDb,
      items: feedRes.items as Item[],
    });

    pino.info(
      { feedId: feedFromDb.id, title: feedFromDb.title },
      "Feed added successfully"
    );

    return feed;
  }

  /**
   * Inserts items from a feed into the database.
   * @param {FeedData} feedData - The feed data containing items to insert.
   */
  private async insertItems(feedData: FeedData) {
    for (const individualItem of feedData.items) {
      await dataModel.insertItem(individualItem, feedData.feed.id);
    }

    pino.debug("FEED: %s - %s", feedData.feed.title, feedData.feed.url);
  }

  /**
   * Loads feed data from a given feed URL.
   * @param {Feed} feed - The feed to load data for.
   * @returns {Promise<FeedData>} A promise that resolves with the feed data.
   */
  private async loadFeedData(feed: Feed): Promise<FeedData> {
    let feedResStr;
    let feedRes;

    try {
      feedResStr = await fetchFeed(feed.feedUrl);
      feedRes = JSON.parse(feedResStr);
    } catch (error) {
      pino.error(`Error fetching feed ${feed.feedUrl}: ${error}`);
      return { feed, items: [] };
    }

    // Validate feed data structure
    if (!feedRes || typeof feedRes !== "object") {
      pino.warn(
        { feedUrl: feed.feedUrl },
        "Invalid feed data: response is not an object"
      );
      return { feed, items: [] };
    }

    if (!Array.isArray(feedRes.items)) {
      pino.warn(
        { feedUrl: feed.feedUrl },
        "Invalid feed data: items is not an array"
      );
      return { feed, items: [] };
    }

    return {
      feed,
      items: feedRes.items as Item[],
    };
  }

  /**
   * Updates the frequency data for a feed based on its items.
   * @param {FeedData} feedData - The feed data to update frequency for.
   */
  public updateFeedFrequencyData(feedData: FeedData) {
    // feedData.items = feedData.items.map((item) => {
    //   item.description = "__HIDDEN__";
    //   item.content = "__HIDDEN__";
    //   return item;
    // });
    // pino.trace({ feedData }, "Updating feed frequency data");

    const publishedTimes = feedData.items.map((item) => item.published * 1000);

    const avg = Scheduler.computeFrequency(publishedTimes);

    if (avg === 0) {
      pino.debug({ title: feedData.feed.title }, "Zero AVG time");
    }

    this.feedsProcCache.lastUpdateTimes[`${feedData.feed.id}`] = Date.now();
    this.feedsProcCache.feedFrequencies[`${feedData.feed.id}`] = avg;
  }

  /**
   * Processes feed data in bulk by chunking the feeds.
   * @param {Feed[]} feeds - Array of feeds to process.
   * @returns {Promise<void>} Completes after processing and inserting all feed data.
   */
  private async processBulkFeedData(feeds: Feed[]): Promise<void> {
    const chunks = chunk(feeds, this.chunkSize);

    pino.debug(`Chunks num ${chunks.length}, ${this.chunkSize} feeds each`);

    for (const feedsChunk of chunks) {
      const chunkProcTimeStart = Date.now();

      const resultOfFeeds = await Promise.all(
        feedsChunk.map((feed) => {
          return this.loadFeedData(feed);
        })
      );

      const chunkProcTimeEnd = Date.now();

      pino.trace(
        "Time to process chunk %s",
        ms(chunkProcTimeEnd - chunkProcTimeStart)
      );

      const chunkInsertStart = Date.now();

      for (const individualData of resultOfFeeds) {
        await this.insertItems(individualData);
        this.updateFeedFrequencyData(individualData);
      }

      const chunkInsertEnd = Date.now();

      pino.trace(
        "Time to insert data from chunk %s",
        ms(chunkInsertEnd - chunkInsertStart)
      );
    }
  }

  /**
   * Updates items for all feeds.
   */
  public async updateItems() {
    const feeds = await dataModel.getFeeds();

    const updateStart = Date.now();

    await this.processBulkFeedData(feeds);

    const updateEnd = Date.now();

    pino.debug("Crawl time %s", ms(updateEnd - updateStart));
  }
}
