import crypto from "crypto";
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
    lastFirstItems: { [key: string]: string };
    lastFirstItemsInitialized: boolean;
  } = {
    nextUpdateTimes: {},
    lastFirstItems: {},
    lastFirstItemsInitialized: false,
  };

  constructor() {
    this.rssParser = new RssParser({
      xml2js: {
        emptyTag: "EMPTY_TAG",
      },
    });

    const tempInstance = process.env.NODE_ENV === "test";

    const storageDir = tempInstance
      ? path.join(os.tmpdir(), ".forest-temp")
      : path.join(os.homedir(), ".forest");

    const dbFileName = "update-cache.json";

    this.updateCacheFilePath = path.join(storageDir, dbFileName);

    if (fs.existsSync(this.updateCacheFilePath)) {
      const persistedCache = JSON.parse(
        fs.readFileSync(this.updateCacheFilePath, "utf-8")
      );

      this.updateCache = persistedCache;
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
            lastFirstItems: {},
            lastFirstItemsInitialized: false,
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

  private async insertItems(individualData: FeedData) {
    return new Promise(async (resolve) => {
      const feedKey = `${individualData.feed.id}`;
      const itemsLength = individualData.items.length;

      let iterations = 0;
      for (const individualItem of individualData.items) {
        if (this.updateCache.lastFirstItems[feedKey] === individualItem.link) {
          break;
        }

        await dataModel.insertItem(individualItem, individualData.feed.id);

        iterations += 1;
      }

      pino.debug(
        "Full iterations %d for %d incoming items",
        iterations,
        itemsLength
      );

      if (iterations === 0 && itemsLength > 0) {
        pino.debug(
          "0 iterations but not filtered via response hash for %s",
          individualData.feed.feedUrl
        );
      }

      if (itemsLength) {
        this.updateCache.lastFirstItems[feedKey] = individualData.items[0].link;
        this.saveUpdateCache();
      }

      resolve(true);
    });
  }

  private async insertBulkItems(bulkData: FeedData[]) {
    return new Promise(async (resolve) => {
      for (const individualData of bulkData) {
        await this.insertItems(individualData);
      }

      resolve(true);
    });
  }

  private async loadIndividualFeedData(feed: Feed): Promise<FeedData> {
    return new Promise(async (resolve) => {
      const response = await axios
        .get(feed.feedUrl, {
          timeout: 2000,
        })
        .catch((reason) => {
          pino.error(`Request error ${feed.feedUrl}:\n${reason}`);
        });

      if (!response) {
        resolve({ feed, items: [] });
        return;
      }

      let resString = response ? response.data : "";

      // remove some info because some sites like YT update the feed
      // without actually adding articles which is OK but we don't need it
      resString = resString.replace(/<pubdate>.*<\/pubdate>/g, "");
      resString = resString.replace(/<published>.*<\/published>/g, "");
      resString = resString.replace(/<lastBuildDate>.*<\/lastBuildDate>/g, "");
      resString = resString.replace(/<media:(starRating|statistics).*\/>/g, "");

      const hash = crypto.createHash("md5").update(resString).digest("hex");

      if (
        feed.lastHash === hash ||
        (response &&
          // @ts-ignore
          response.hasOwnProperty("headers") &&
          // @ts-ignore
          response.headers["content-type"].indexOf("xml") === -1)
      ) {
        // do nothing - return empty items

        resolve({
          feed,
          items: [],
        });
      } else {
        await dataModel.updateHashForFeed(hash, feed);

        this.rssParser
          .parseString(resString)
          .then((feedRes) => {
            resolve({
              feed,
              items: feedRes.items as Item[],
            });
          })
          .catch(async (reason) => {
            pino.error(reason, `Parse error for resString:\n${resString}\n`);

            await dataModel.markFeedError(feed);

            resolve({
              feed,
              items: [],
            });
          });
      }
    });
  }

  public async updateFeedFrequency(feed: Feed) {
    const items = await dataModel.getItems({
      size: 20,
      selectedFeed: feed,
    });

    const avg = Scheduler.computeItemsFrequence(items);

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

  private async loadBulkFeedData(feeds: Feed[]): Promise<FeedData[]> {
    const chunks = chunk(feeds, this.chunkSize);
    pino.debug(`Chunks number: ${chunks.length}, ${this.chunkSize} feeds each`);

    return new Promise(async (resolve) => {
      let resultData: FeedData[] = [];

      for (const feedsChunk of chunks) {
        const chunkStart = Date.now();

        const resultOfFeeds = await Promise.all(
          feedsChunk.map((feed) => {
            return this.loadIndividualFeedData(feed);
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

  private updateNextUpdateTimes(feeds: Feed[]) {
    const now = Date.now();

    feeds.forEach((feed) => {
      const feedKey = `${feed.id}`;
      const ufr = feed.updateFrequency;

      if (ufr && ufr > Scheduler.dayLength) {
        this.updateCache.nextUpdateTimes[feedKey] =
          now + Scheduler.quarterDayLength / 2;
      } else if (
        ufr &&
        ufr > Scheduler.hafDayLength &&
        ufr < Scheduler.dayLength
      ) {
        this.updateCache.nextUpdateTimes[feedKey] =
          now + Scheduler.quarterDayLength / 2;
      } else {
        this.updateCache.nextUpdateTimes[feedKey] = now;
      }
      this.saveUpdateCache();
    });
  }

  private filterByNextUpdateTime(feeds: Feed[]) {
    const feedKeys = Object.keys(this.updateCache.nextUpdateTimes);

    if (feedKeys.length === 0) {
      pino.debug("no computed next times, returning");
      return feeds;
    }

    const now = Date.now();

    pino.debug(`unfiltered feeds length ${feeds.length}`);
    const filteredFeeds = feeds.filter((feed) => {
      const feedKey = `${feed.id}`;
      return now > this.updateCache.nextUpdateTimes[feedKey];
    });
    pino.debug(`filtered feeds length ${filteredFeeds.length}`);

    return filteredFeeds;
  }

  private saveUpdateCache() {
    const updateCacheJson = JSON.stringify(this.updateCache);

    fs.writeFileSync(this.updateCacheFilePath, updateCacheJson);
  }

  public async updateItems() {
    pino.debug(new Date().toISOString());

    if (this.updateCache.updateLaunch === undefined) {
      this.updateCache.updateLaunch = Date.now();
      this.saveUpdateCache();
      pino.debug(
        "Started updates at %s",
        prettyMs(this.updateCache.updateLaunch)
      );

      pino.debug("will update feed frequencies");
      await this.updateFeedFrequencies();
      pino.debug("updated feed frequencies");
    }

    let feeds: Feed[];
    if (this.updateCache.feeds?.length) {
      pino.debug("Loading feeds from cache");
      feeds = this.updateCache.feeds;
    } else {
      pino.debug("Loading feeds from db");
      feeds = await dataModel.getFeeds();
      this.updateCache.feeds = feeds;
      this.saveUpdateCache();
    }

    if (!this.updateCache.lastFirstItemsInitialized) {
      pino.debug("Last first items not initialized.");
      this.updateCache.lastFirstItemsInitialized = true;
      this.saveUpdateCache();
      const lastFirstItems = await dataModel.getFeedsLastFirstItems();

      pino.debug(
        "Initialized last first items with length: %d",
        lastFirstItems.length
      );

      lastFirstItems.forEach((lastFirstItem) => {
        const feedKey = `${lastFirstItem.id}`;
        this.updateCache.lastFirstItems[feedKey] = lastFirstItem.url;
        this.saveUpdateCache();
      });
    }

    feeds = this.filterByNextUpdateTime(feeds);
    this.updateNextUpdateTimes(feeds);

    const crawlStart = Date.now();
    const filteredFeeds = feeds.filter((feed) => {
      return feed.error === undefined || feed.error < 30;
    });

    let bulkData = await this.loadBulkFeedData(filteredFeeds);

    bulkData = bulkData.filter((feedData) => {
      return feedData.items.length > 0;
    });
    const crawlEnd = Date.now();

    pino.trace("Crawl time %s", prettyMs(crawlEnd - crawlStart));
  }
}
