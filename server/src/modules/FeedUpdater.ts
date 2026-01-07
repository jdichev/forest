import chunk from "lodash/chunk";
import pinoLib from "pino";
import ms from "ms";
import fs from "fs";
import os from "os";
import path from "path";
import MixedDataModel from "./MixedDataModel";
import Scheduler from "./Scheduler";
//@ts-ignore
import { fetchFeed } from "fetch-feed";

/**
 * Logger instance configured to trace level for detailed logging.
 */
const pino = pinoLib({
  level: "trace",
});

/**
 * Singleton instance of the MixedDataModel for data operations.
 */
const dataModel = MixedDataModel.getInstance();

/**
 * Class responsible for updating and managing feed data.
 */
export default class FeedUpdater {
  /**
   * Number of feeds to process in each chunk.
   */
  private chunkSize = 3;

  /**
   * Path to the file where the update cache is stored.
   */
  private updateCacheFilePath;

  /**
   * Cache object to store feed update metadata and processed items.
   */
  private updateCache: {
    feeds?: Feed[] | undefined;
    updateLaunch?: number;
    nextUpdateTimes: { [key: string]: number };
    feedFrequencies: { [key: string]: number };
    feedProcessedItems: { [key: string]: string[] };
    feedProcessedItemsInitialized: boolean;
  } = {
    nextUpdateTimes: {},
    feedFrequencies: {},
    feedProcessedItems: {},
    feedProcessedItemsInitialized: false,
  };

  /**
   * Initializes the FeedUpdater and sets up the cache file path.
   */
  constructor() {
    // when testing
    const tempInstance = process.env.NODE_ENV === "test";

    const storageDir = tempInstance
      ? path.join(os.tmpdir(), ".forest-temp")
      : path.join(os.homedir(), ".forest");

    const updateCacheFileName = "update-cache.json";

    this.updateCacheFilePath = path.join(storageDir, updateCacheFileName);

    if (fs.existsSync(this.updateCacheFilePath)) {
      this.updateCache = JSON.parse(
        fs.readFileSync(this.updateCacheFilePath, "utf-8")
      );
    }
  }

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

    const feed: Feed = {
      title: feedRes.title || "NO_TITLE",
      feedUrl: feedData.feedUrl,
      url: feedRes.links.length ? feedRes.links[0] : "",
      feedCategoryId: feedData.feedCategoryId,
    };

    await dataModel.insertFeed(feed);

    const feedFromDb = await dataModel.getFeedByUrl(feedData.feedUrl);

    await this.insertItems({
      feed: feedFromDb,
      items: feedRes.items as Item[],
    });

    await this.updateFeedFrequency(feedFromDb);

    this.updateCache = {
      nextUpdateTimes: {},
      feedFrequencies: {},
      feedProcessedItems: {},
      feedProcessedItemsInitialized: false,
    };

    this.saveUpdateCache();

    return feed;
  }

  /**
   * Inserts items from a feed into the database.
   * @param {FeedData} feedData - The feed data containing items to insert.
   * @returns {Promise<boolean>} A promise that resolves when the operation is complete.
   */
  private async insertItems(feedData: FeedData) {
    const feedKey = `${feedData.feed.id}`;
    const itemsLen = feedData.items.length;

    if (!this.updateCache.feedProcessedItems.hasOwnProperty(feedKey)) {
      this.updateCache.feedProcessedItems[feedKey] = [];
    }

    let iterations = 0;

    for (const individualItem of feedData.items) {
      if (
        this.updateCache.feedProcessedItems[feedKey].includes(
          individualItem.link
        )
      ) {
        continue;
      }

      await dataModel.insertItem(individualItem, feedData.feed.id);

      iterations += 1;
    }

    pino.debug("%d added of total %d", iterations, itemsLen);
    pino.trace("FEED: %s - %s", feedData.feed.title, feedData.feed.url);

    if (iterations === 0 && itemsLen > 0) {
      pino.debug({ feedUrl: feedData.feed.feedUrl }, "No iterations added");
    }

    if (itemsLen > 0) {
      feedData.items.forEach((item) => {
        if (
          this.updateCache.feedProcessedItems[feedKey] &&
          !this.updateCache.feedProcessedItems[feedKey].includes(item.link)
        ) {
          this.updateCache.feedProcessedItems[feedKey].push(item.link);
        }
      });

      this.saveUpdateCache();
    }
  }

  /**
   * Inserts bulk items from multiple feeds into the database.
   * @param {FeedData[]} bulkData - Array of feed data to insert.
   * @returns {Promise<boolean>} A promise that resolves when the operation is complete.
   */
  private async insertBulkItems(bulkData: FeedData[]) {
    for (const individualData of bulkData) {
      await this.updateFeedFrequencyData(individualData);
      await this.insertItems(individualData);
    }

    this.saveUpdateCache();
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

    return {
      feed,
      items: feedRes.items as Item[],
    };
  }

  /**
   * Updates the frequency data for a feed based on its items.
   * @param {FeedData} feedData - The feed data to update frequency for.
   */
  public async updateFeedFrequencyData(feedData: FeedData) {
    const publishedTimes = feedData.items.map((item) =>
      MixedDataModel.getItemPublishedTime(item)
    );

    const avg = Scheduler.computeFrequency(publishedTimes);

    this.updateCache.feedFrequencies[`${feedData.feed.id}`] = avg;

    await dataModel.updateFeedTimings(feedData.feed, {
      updateFrequency: avg,
    });
  }

  /**
   * Updates the frequency of a specific feed.
   * @param {Feed} feed - The feed to update frequency for.
   */
  public async updateFeedFrequency(feed: Feed) {
    const items = await dataModel.getItems({
      size: 20,
      selectedFeed: feed,
    });

    const avg = Scheduler.computeItemsFrequency(items);

    await dataModel.updateFeedTimings(feed, {
      updateFrequency: avg,
    });
  }

  /**
   * Updates the frequency for all feeds.
   * @returns {Promise<boolean>} A promise that resolves when the operation is complete.
   */
  public async updateFeedFrequencies() {
    const feeds = await dataModel.getFeeds();

    for (const feed of feeds) {
      await this.updateFeedFrequency(feed);
    }
  }

  /**
   * Processes feed data in bulk by chunking the feeds.
   * @param {Feed[]} feeds - Array of feeds to process.
   * @returns {Promise<FeedData[]>} A promise that resolves with the processed feed data.
   */
  private async processBulkFeedData(feeds: Feed[]): Promise<FeedData[]> {
    const chunks = chunk(feeds, this.chunkSize);
    pino.debug(`Chunks num ${chunks.length}, ${this.chunkSize} feeds each`);

    let resultData: FeedData[] = [];

    for (const feedsChunk of chunks) {
      const chunkStart = Date.now();

      const resultOfFeeds = await Promise.all(
        feedsChunk.map((feed) => {
          return this.loadFeedData(feed);
        })
      );

      const chunkEnd = Date.now();
      pino.trace("Time to process chunk %s", ms(chunkEnd - chunkStart));

      const chunkInsertStart = Date.now();
      await this.insertBulkItems(resultOfFeeds);
      const chunkInsertEnd = Date.now();
      pino.trace(
        "Time to insert data from chunk %s",
        ms(chunkInsertEnd - chunkInsertStart)
      );

      resultData = resultData.concat(resultOfFeeds);
    }

    return resultData;
  }

  /**
   * Caps the number of processed items stored per feed to a maximum limit.
   */
  private capProcessedItemsPerFeed() {
    const processedItemsCap = 100;

    const processedItems = this.updateCache.feedProcessedItems;

    Object.keys(processedItems).forEach((feedKey) => {
      const processedItemsLength = processedItems[feedKey].length;

      if (processedItemsLength > processedItemsCap) {
        this.updateCache.feedProcessedItems[feedKey] = processedItems[
          feedKey
        ].slice(processedItemsLength - processedItemsCap);
      }
    });
  }

  /**
   * Saves the current state of the update cache to a file.
   */
  private saveUpdateCache() {
    this.capProcessedItemsPerFeed();

    const updateCacheJson = JSON.stringify(this.updateCache);

    fs.writeFileSync(this.updateCacheFilePath, updateCacheJson);
  }

  /**
   * Updates items for all feeds.
   */
  public async updateItems() {
    const feeds = await dataModel.getFeeds();

    const updateStart = Date.now();

    await this.processBulkFeedData(feeds);

    const updateEnd = Date.now();

    pino.trace("Crawl time %s", ms(updateEnd - updateStart));
  }
}
