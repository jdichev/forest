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

const pino = pinoLib({
  level: "trace",
});
const dataModel = MixedDataModel.getInstance();

export default class FeedUpdater {
  private chunkSize = 3;

  private updateCacheFilePath;

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

  public async addFeed(feedData: Feed) {
    pino.debug(feedData, "feed data");

    return new Promise(async (resolve, reject) => {
      const feedResStr = await fetchFeed(feedData.feedUrl);
      const feedRes = JSON.parse(feedResStr);

      if (feedRes.error) {
        pino.error(feedRes.error);
        reject(feedRes.error);
        return;
      }

      const feed: Feed = {
        title: feedRes.title || "",
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

      resolve(feed);
    });
  }

  private async insertItems(feedData: FeedData) {
    return new Promise(async (resolve) => {
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

      resolve(true);
    });
  }

  private async insertBulkItems(bulkData: FeedData[]) {
    return new Promise(async (resolve) => {
      for (const individualData of bulkData) {
        await this.updateFeedFrequencyData(individualData);
        await this.insertItems(individualData);
      }

      this.saveUpdateCache();

      resolve(true);
    });
  }

  private async loadFeedData(feed: Feed): Promise<FeedData> {
    return new Promise(async (resolve) => {
      const feedResStr = await fetchFeed(feed.feedUrl);
      let feedRes;

      try {
        feedRes = JSON.parse(feedResStr);
      } catch {
        pino.error(`Error parsing feed responsve for ${feed.feedUrl}:\n\n${feedResStr}`);
        resolve({ feed, items: [] });
        return;
      }

      if (feedRes.error) {
        pino.error(`Fetching feed error ${feed.feedUrl}:\n\n${feedRes.error}`);
        resolve({ feed, items: [] });
        return;
      }

      resolve({
        feed,
        items: feedRes.items as Item[],
      });
    });
  }

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

  public async updateFeedFrequencies() {
    return new Promise(async (resolve) => {
      const feeds = await dataModel.getFeeds();

      for (const feed of feeds) {
        await this.updateFeedFrequency(feed);
      }

      resolve(true);
    });
  }

  private async processBulkFeedData(feeds: Feed[]): Promise<FeedData[]> {
    const chunks = chunk(feeds, this.chunkSize);
    pino.debug(`Chunks num ${chunks.length}, ${this.chunkSize} feeds each`);

    return new Promise(async (resolve) => {
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

      resolve(resultData);
    });
  }

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

  private saveUpdateCache() {
    this.capProcessedItemsPerFeed();

    const updateCacheJson = JSON.stringify(this.updateCache);

    fs.writeFileSync(this.updateCacheFilePath, updateCacheJson);
  }

  public async updateItems() {
    const feeds = await dataModel.getFeeds();

    const updateStart = Date.now();

    await this.processBulkFeedData(feeds);

    const updateEnd = Date.now();

    pino.trace("Crawl time %s", ms(updateEnd - updateStart));
  }
}
