import axiosLib from "axios";
import chunk from "lodash/chunk";
import RssParser from "rss-parser";
import pinoLib from "pino";
import prettyMs from "pretty-ms";
import fs from "fs";
import os from "os";
import path from "path";
import MixedDataModel from "./MixedDataModel";
import Scheduler from "./Scheduler";

const pino = pinoLib({
  level: "trace",
});
const dataModel = MixedDataModel.getInstance();

const axios = axiosLib.create();

export default class FeedUpdater {
  private rssParser: RssParser;

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
    this.rssParser = new RssParser({
      xml2js: {
        emptyTag: "EMPTY_TAG",
      },
    });

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

    return new Promise((resolve) => {
      this.rssParser
        .parseURL(feedData.feedUrl)
        .then(async (feedRes) => {
          const feed: Feed = {
            title: feedRes.title || "",
            feedUrl: feedData.feedUrl,
            url: feedRes.link || "",
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
        })
        .catch((e) => {
          pino.error(e);

          resolve(e);
        });
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
        pino.debug("0 iterations", feedData.feed.feedUrl);
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
      const response = await axios
        .get(feed.feedUrl, {
          timeout: 2000,
        })
        .catch((reason) => {
          pino.error(`Request error ${feed.feedUrl}:\n${reason}`);

          resolve({ feed, items: [] });
        });

      let resString = response ? response.data : "";

      this.rssParser
        .parseString(resString)
        .then((feedRes) => {
          resolve({
            feed,
            items: feedRes.items as Item[],
          });
        })
        .catch(async (reason) => {
          pino.error(
            reason,
            `Parse error for resString:\n----\n${resString}\n---`
          );

          await dataModel.markFeedError(feed);

          resolve({
            feed,
            items: [],
          });
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
        pino.trace("Time to process chunk %s", prettyMs(chunkEnd - chunkStart));

        const chunkInsertStart = Date.now();
        await this.insertBulkItems(resultOfFeeds);
        const chunkInsertEnd = Date.now();
        pino.trace(
          "Time to insert data from chunk %s",
          prettyMs(chunkInsertEnd - chunkInsertStart)
        );

        resultData = resultData.concat(resultOfFeeds);
      }

      resolve(resultData);
    });
  }

  // private updateNextUpdateTimes(feeds: Feed[]) {
  //   const now = Date.now();

  //   feeds.forEach((feed) => {
  //     const feedKey = `${feed.id}`;
  //     const ufr = feed.updateFrequency;

  //     if (ufr && ufr > Scheduler.dayLength) {
  //       this.updateCache.nextUpdateTimes[feedKey] =
  //         now + Scheduler.quarterDayLength / 2;
  //     } else if (
  //       ufr &&
  //       ufr > Scheduler.hafDayLength &&
  //       ufr < Scheduler.dayLength
  //     ) {
  //       this.updateCache.nextUpdateTimes[feedKey] =
  //         now + Scheduler.quarterDayLength / 2;
  //     } else {
  //       this.updateCache.nextUpdateTimes[feedKey] = now;
  //     }
  //   });

  //   this.saveUpdateCache();
  // }

  // private filterByNextUpdateTime(feeds: Feed[]) {
  //   const feedKeys = Object.keys(this.updateCache.nextUpdateTimes);

  //   if (feedKeys.length === 0) {
  //     pino.debug("no computed next times, returning");
  //     return feeds;
  //   }

  //   const now = Date.now();

  //   pino.debug(`unfiltered feeds length ${feeds.length}`);

  //   const filteredFeeds = feeds.filter((feed) => {
  //     const feedKey = `${feed.id}`;
  //     return now > this.updateCache.nextUpdateTimes[feedKey];
  //   });

  //   pino.debug(`filtered feeds length ${filteredFeeds.length}`);

  //   return filteredFeeds;
  // }

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

    pino.trace("Crawl time %s", prettyMs(updateEnd - updateStart));
  }
}
