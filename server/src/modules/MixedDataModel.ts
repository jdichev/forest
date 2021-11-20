import fs from "fs";
import os from "os";
import path from "path";
import DOMPurify from "dompurify";
import { Database } from "sqlite3";
import { JSDOM } from "jsdom";
import pinoLib from "pino";
import emojiStrip from "emoji-strip";
import opmlParser from "./OpmlParser";
import FeedFinder from "./FeedFinder";

const pino = pinoLib({
  level: "trace",
});

const { window } = new JSDOM("<!DOCTYPE html>");

// @ts-ignore
const domPurify = DOMPurify(window);

const seed = `
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "feed_categories" (
	"id"	INTEGER NOT NULL UNIQUE,
	"title"	TEXT NOT NULL,
	"text"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "feeds" (
	"id"	INTEGER NOT NULL UNIQUE,
	"title"	TEXT,
	"url"	TEXT,
	"feedUrl"	TEXT,
	"feedType"	TEXT,
	"error"	INTEGER DEFAULT 0,
	"feedCategoryId"	INTEGER DEFAULT 0,
	"updateFrequency"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "items" (
	"id"	INTEGER NOT NULL UNIQUE,
	"url"	TEXT NOT NULL UNIQUE,
	"title"	TEXT NOT NULL,
	"content"	TEXT,
	"feed_id"	INTEGER NOT NULL DEFAULT 0,
	"published"	INTEGER NOT NULL DEFAULT 0,
	"comments"	TEXT,
	"read"	INTEGER NOT NULL DEFAULT 0,
	"created"	INTEGER,
	"json_content"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
COMMIT;

INSERT INTO feed_categories (id, title, text)
VALUES (0, "Uncategorized", "Uncategorized");

`;

// main data service
export default class DataService {
  private static instance: DataService;

  private database: Database;

  constructor() {
    const tempInstance = process.env.NODE_ENV === "test";
    const storageDir = tempInstance
      ? path.join(os.tmpdir(), ".forest-temp")
      : path.join(os.homedir(), ".forest");

    const dbFileName = "feeds.db";

    const dbPath = path.join(storageDir, dbFileName);

    pino.debug(dbPath, "db path");

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir);
    }

    this.database = new Database(dbPath, (err) => {
      if (err) {
        pino.error("Database opening error: ", err);
      }

      this.database.exec(seed, (innerErr) => {
        if (innerErr) {
          pino.error(innerErr, "Error executing seed:");
        }

        pino.debug(
          `Database initialized OK in mode ${
            tempInstance ? "temp" : "not-temp"
          }`
        );
      });
    });
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.database.close((error) => {
        if (error) {
          pino.error(error, "Error closing database");
        }

        resolve();
      });
    });
  }

  public static getInstance(): DataService {
    if (this.instance === undefined) {
      this.instance = new DataService();
    }

    return this.instance;
  }

  public async getFeedByUrl(feedUrl: string): Promise<Feed> {
    const query = `
      SELECT
        *
      FROM
        feeds
      WHERE
        feedUrl = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, feedUrl, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row);
      });
    });
  }

  public async getFeedById(feedId: number): Promise<Feed> {
    const query = `
      SELECT
        *
      FROM
        feeds
      WHERE
        id = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, feedId, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row);
      });
    });
  }

  public async getFeeds(
    params: {
      selectedFeedCategory?: FeedCategory | undefined;
    } = { selectedFeedCategory: undefined }
  ): Promise<Feed[]> {
    let query = `
      SELECT
        feeds.id,
        feeds.title,
        feeds.url,
        feeds.feedUrl,
        feeds.feedType,
        feeds.feedCategoryId,
        feeds.error,
        feeds.updateFrequency,
        feed_categories.title as categoryTitle
      FROM
        feeds
      LEFT JOIN feed_categories ON
        feed_categories.id = feeds.feedCategoryId
      __WHERE_PLACEHOLDER__
    `;

    let whereQuery = `
      WHERE
      feeds.feedCategoryId = __CATEGORY_IDS_PLACEHOLDER__
    `;

    if (params.selectedFeedCategory) {
      whereQuery = whereQuery.replace(
        "__CATEGORY_IDS_PLACEHOLDER__",
        String(params.selectedFeedCategory.id)
      );
      query = query.replace("__WHERE_PLACEHOLDER__", whereQuery);
    } else {
      query = query.replace("__WHERE_PLACEHOLDER__", "");
    }

    return new Promise((resolve) => {
      this.database.all(query, (err, rows) => {
        if (err) {
          pino.error(err);
        }

        resolve(rows || []);
      });
    });
  }

  public async removeFeeds(): Promise<void> {
    const query = `
      BEGIN TRANSACTION;
        DELETE FROM items;
        DELETE FROM feeds;
      COMMIT;
    `;

    return new Promise<void>((resolve) => {
      this.database.exec(query, (error) => {
        if (error) {
          pino.error(error);
        }

        pino.debug("removed feeds and related items");

        resolve();
      });
    });
  }

  public async removeFeed(feedId: number): Promise<void> {
    const query = `
      BEGIN TRANSACTION;
        DELETE FROM items
        WHERE feed_id = ${feedId};
        DELETE FROM feeds
        WHERE id = ${feedId};
      COMMIT;
    `;

    return new Promise<void>((resolve) => {
      this.database.exec(query, (error) => {
        if (error) {
          pino.error(error);
        }

        pino.debug(`removed feed ${feedId} and related items`);

        resolve();
      });
    });
  }

  private async feedExists(feed: Feed) {
    const query = `
      SELECT id FROM feeds
      WHERE feedUrl = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, feed.feedUrl, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row);
      });
    });
  }

  public async updateFeedTimings(
    feed: Feed,
    timingFields: {
      updateFrequency: number;
    }
  ) {
    const query = `
      UPDATE feeds
      SET
        updateFrequency = ?
      WHERE
        id = ?
    `;

    return new Promise<boolean>((resolve) => {
      this.database.run(
        query,
        [timingFields.updateFrequency, feed.id],
        (error) => {
          if (error) {
            pino.error(error);
            resolve(false);
          }

          pino.debug("feed timing updated %o %o", feed, timingFields);
          resolve(true);
        }
      );
    });
  }

  public async updateFeed(feed: Feed): Promise<boolean> {
    const query = `
      UPDATE feeds
      SET
        title = ?,
        feedCategoryId = ?,
        feedUrl = ?
      WHERE
        id = ?
    `;

    return new Promise<boolean>((resolve) => {
      this.database.run(
        query,
        [feed.title, feed.feedCategoryId, feed.feedUrl, feed.id],
        (error) => {
          if (error) {
            pino.error(error);
            resolve(false);
          }

          pino.debug("feed updated %o", feed);
          resolve(true);
        }
      );
    });
  }

  public async insertFeed(feed: Feed) {
    pino.debug(feed, "input for insert feed");

    const query = `
      INSERT INTO feeds (title, url, feedUrl, feedType, feedCategoryId)
      VALUES( ?, ?, ?, ?, ? );
    `;

    const feedExists = await this.feedExists(feed);

    if (feedExists) {
      pino.debug("Feed already exists, returning.");

      return Promise.resolve();
    }

    let categoryId: number;

    if (feed.feedCategoryId !== undefined) {
      categoryId = feed.feedCategoryId;
    } else {
      const feedCategories = await this.getFeedCategories();

      const relatedCategory = feedCategories.find((feedCategory) => {
        return feedCategory.title === feed.categoryTitle;
      });

      categoryId = relatedCategory ? relatedCategory.id : 0;
    }

    pino.debug("Category id: %s", categoryId);

    return new Promise<void>((resolve) => {
      this.database.run(
        query,
        [feed.title, feed.url, feed.feedUrl, feed.feedType, categoryId],
        (error) => {
          if (error) {
            pino.error(error);
          }

          pino.debug(feed, "feed added");

          resolve();
        }
      );
    });
  }

  public async checkFeedUrls(urls: string[]): Promise<string[]> {
    const query = `
      SELECT feedUrl
      FROM feeds
      WHERE
        feedUrl IN ('${urls.join("', '")}')
    `;

    return new Promise((resolve) => {
      this.database.all(query, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        const res = rows.map((record) => {
          return record.feedUrl;
        });

        resolve(res);
      });
    });
  }

  public async getFeedReadStats(): Promise<FeedReadStat[]> {
    const query = `
      SELECT
        feeds.id,
        feeds.title,
        count(items.feed_id) as unreadCount
      FROM
        feeds
      LEFT JOIN
        items
      ON
        items.feed_id = feeds.id
      WHERE
        items.read = 0
      GROUP BY
        feeds.id
    `;

    return new Promise((resolve) => {
      this.database.all(query, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        resolve(rows || []);
      });
    });
  }

  public async removeFeedCategory(
    feedCategory: FeedCategory
  ): Promise<boolean> {
    const query = `
      BEGIN TRANSACTION;
        UPDATE feeds
        SET feedCategoryId = 0
        WHERE feedCategoryId = ${feedCategory.id};

        DELETE FROM feed_categories
        WHERE id = ${feedCategory.id};
      COMMIT;
    `;

    return new Promise((resolve) => {
      this.database.exec(query, (error) => {
        if (error) {
          pino.error(error);
        }

        pino.debug(`removed category ${feedCategory.title} and assigned items
        to default category`);

        resolve(true);
      });
    });
  }

  public async getFeedCategoryReadStats(): Promise<FeedCategoryReadStat[]> {
    const query = `
      SELECT
        feed_categories.id,
        feed_categories.title,
        count(items.feed_id) as unreadCount
      FROM
        feed_categories
      LEFT JOIN
        feeds
      ON
        feeds.feedCategoryId = feed_categories.id
      LEFT JOIN
        items
      ON
        items.feed_id = feeds.id
      WHERE
        items.read = 0
      GROUP BY
        feed_categories.id
    `;

    return new Promise((resolve) => {
      this.database.all(query, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        resolve(rows || []);
      });
    });
  }

  public async getFeedCategoryById(
    feedCategoryId: number
  ): Promise<FeedCategory | undefined> {
    const query = `
      SELECT *
      FROM feed_categories
      WHERE id = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, feedCategoryId, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row || undefined);
      });
    });
  }

  public async getFeedCategories(): Promise<FeedCategory[]> {
    const query = `
      SELECT id, title
      FROM feed_categories
    `;

    return new Promise((resolve) => {
      this.database.all(query, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        resolve(rows || []);
      });
    });
  }

  private async feedCategoryExists(feedCategory: FeedCategory) {
    const query = `
      SELECT id FROM feed_categories
      WHERE title = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, feedCategory.title, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row);
      });
    });
  }

  public async insertFeedCategory(
    feedCategory: FeedCategory
  ): Promise<boolean> {
    const query = `
      INSERT INTO feed_categories (title, text)
      VALUES( ?, ? );
    `;

    pino.debug(feedCategory);

    const feedCategoryExists = await this.feedCategoryExists(feedCategory);

    if (feedCategoryExists) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      this.database.run(
        query,
        [feedCategory.title, feedCategory.text],
        (error) => {
          if (error) {
            pino.error(error);
          }

          resolve(true);
        }
      );
    });
  }

  public async updateFeedCategory(
    feedCategory: FeedCategory
  ): Promise<boolean> {
    const query = `
      UPDATE feed_categories
      SET title = ?, text = ?
      WHERE id = ?;
    `;

    const feedCategoryExists = await this.feedCategoryExists(feedCategory);

    if (feedCategoryExists) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      this.database.run(
        query,
        [feedCategory.title, feedCategory.text, feedCategory.id],
        (error) => {
          if (error) {
            pino.error(error);
          }

          resolve(true);
        }
      );
    });
  }

  public async importOpml(path: string) {
    const opmlContent = fs.readFileSync(path, "utf-8");
    const opmlData = opmlParser.load(opmlContent);
    const feedFinder = new FeedFinder();

    await Promise.all(
      opmlData.categories.map(async (feedCategory: FeedCategory) => {
        await this.insertFeedCategory(feedCategory);
      })
    );

    for (const feed of opmlData.feeds) {
      pino.debug(feed);
      // @ts-ignore
      const feedRes = await feedFinder.checkFeed(feed.feedUrl);
      if (feedRes.length) {
        await this.insertFeed(feedRes[0]);
      }
      // else {
      //   // @ts-ignore
      //   const feedRes2 = await feedFinder.checkFeed(feed.url);
      //   if (feedRes2.length) {
      //     await this.insertFeed(feedRes2[0]);
      //   }
      // }
    }

    pino.info("Imported %d feeds", opmlData.feeds.length);
    pino.info("Imported %d feeds", opmlData.feeds.length);
    pino.info("Imported %d feeds", opmlData.feeds.length);
  }

  private async getFeedIds(feedCategory: FeedCategory): Promise<number[]> {
    const query = `
      SELECT id FROM feeds
      WHERE feedCategoryId = ?
    `;

    return new Promise((resolve) => {
      this.database.all(query, feedCategory.id, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        let feedIds = [];

        if (rows.length) {
          feedIds = rows.map((feed) => {
            return feed.id;
          });
        }

        resolve(feedIds);
      });
    });
  }

  public async markItemsRead(params: {
    feedCategory?: FeedCategory;
    feed?: Feed;
  }) {
    let query = `
      UPDATE items
      SET read = 1
      __WHERE_PLACEHOLDER__
    `;

    if (params.feed) {
      const whereQuery = `
        WHERE feed_id = ${params.feed.id}
      `;

      query = query.replace("__WHERE_PLACEHOLDER__", whereQuery);
    }
    if (params.feedCategory) {
      let whereQuery = `
        WHERE feed_id IN (__IDS_PLACEHOLDER__)
      `;

      const feedIds = await this.getFeedIds(params.feedCategory);

      whereQuery = whereQuery.replace(
        "__IDS_PLACEHOLDER__",
        feedIds.join(", ")
      );
      query = query.replace("__WHERE_PLACEHOLDER__", whereQuery);
    } else {
      query = query.replace("__WHERE_PLACEHOLDER__", "");
    }

    return new Promise((resolve) => {
      this.database.run(query, (error: Error) => {
        if (error) {
          pino.error(error);
        }

        resolve(1);
      });
    });
  }

  public async markMultipleItemsRead(items: Item[]) {
    let query = `
      UPDATE items
      SET read = 1
      WHERE id IN (__IDS_PLACEHOLDER__)
    `;

    const itemIds = items.map((item) => item.id);

    query = query.replace("__IDS_PLACEHOLDER__", itemIds.join(", "));

    return new Promise((resolve) => {
      this.database.run(query, (error: Error, id: number) => {
        if (error) {
          pino.error(error);
        }

        resolve(id);
      });
    });
  }

  public async getItemById(itemId: number): Promise<Item | undefined> {
    const query = `
      SELECT
        items.id,
        items.title,
        items.content,
        items.json_content,
        items.published,
        items.read,
        items.url,
        feeds.title AS feedTitle
      FROM
        items
      LEFT JOIN feeds ON
        feeds.id = items.feed_id
      WHERE items.id = ?
    `;

    return new Promise((resolve) => {
      this.database.get(
        query,
        itemId,
        (error: Error, row: Item | undefined) => {
          if (error) {
            pino.error(error);
          }

          if (row) {
            // pino.debug(row);

            row.content = domPurify.sanitize(row.content, {
              FORBID_TAGS: ["style"],
              FORBID_ATTR: ["style", "width", "height", "class", "id"],
            });

            row.content = row.content.replace(
              /<a /gim,
              '<a target="_blank" rel="noreferrer noopener" '
            );

            if (row.json_content) {
              row.jsonContent = JSON.parse(row.json_content);
              delete row.json_content;
            }
          }

          resolve(row);
        }
      );
    });
  }

  public async markItemRead(item: Item) {
    const query = `
      UPDATE items
      SET read = 1
      WHERE id = ?
    `;

    return new Promise((resolve) => {
      this.database.run(query, item.id, (error: Error) => {
        if (error) {
          pino.error(error);
        }

        resolve(item.id);
      });
    });
  }

  public async getItems(
    params: {
      size: number | undefined;
      unreadOnly?: boolean;
      selectedFeedCategory?: FeedCategory | undefined;
      selectedFeed?: Feed | undefined;
      order?: string;
    } = {
      size: 50,
      unreadOnly: false,
      selectedFeedCategory: undefined,
      selectedFeed: undefined,
      order: "published",
    }
  ): Promise<Item[]> {
    if (typeof params.size === "undefined") {
      params.size = 50;
    }

    let query = `
      SELECT
        items.id,
        items.title,
        items.published,
        items.read,
        feeds.title AS feedTitle
      FROM
        items
      LEFT JOIN feeds ON
        feeds.id = items.feed_id
      __WHERE_PLACEHOLDER1__
      __WHERE_PLACEHOLDER2__
      ORDER BY items.${params.order ? params.order : "created"} DESC
      LIMIT ?
    `;

    let whereQuery1 = `
      WHERE
      items.feed_id IN (__CATEGORY_IDS_PLACEHOLDER__)
    `;

    let filteredById = false;
    if (params.selectedFeed) {
      whereQuery1 = whereQuery1.replace(
        "__CATEGORY_IDS_PLACEHOLDER__",
        `${params.selectedFeed.id}`
      );
      query = query.replace("__WHERE_PLACEHOLDER1__", whereQuery1);

      filteredById = true;
    } else if (params.selectedFeedCategory) {
      const feedIds = await this.getFeedIds(params.selectedFeedCategory);

      whereQuery1 = whereQuery1.replace(
        "__CATEGORY_IDS_PLACEHOLDER__",
        feedIds.join(", ")
      );

      query = query.replace("__WHERE_PLACEHOLDER1__", whereQuery1);

      filteredById = true;

      // todo fix cleanup
      if (feedIds.length === 0) {
        query = query.replace("__WHERE_PLACEHOLDER1__", "");
      }
    } else {
      query = query.replace("__WHERE_PLACEHOLDER1__", "");
    }

    let whereQuery2 = `
      items.read = 0
    `;
    let operator;

    if (params.unreadOnly) {
      if (filteredById) {
        operator = "AND";
      } else {
        operator = "WHERE";
      }

      whereQuery2 = `
      ${operator} ${whereQuery2}
    `;
      query = query.replace("__WHERE_PLACEHOLDER2__", whereQuery2);
    } else {
      query = query.replace("__WHERE_PLACEHOLDER2__", "");
    }

    return new Promise((resolve) => {
      this.database.all(query, [params.size], (error, rows) => {
        if (error) {
          pino.error(error);
        }

        resolve(rows || []);
      });
    });
  }

  public async removeItems(): Promise<boolean> {
    const query = "DELETE FROM items";

    return new Promise((resolve) => {
      this.database.run(query, (error) => {
        if (error) {
          pino.error(error);
        }

        resolve(true);
      });

      pino.info("Removed all items");
    });
  }

  private async itemExists(item: Item) {
    const query = `
      SELECT id FROM items
      WHERE url = ?
    `;

    return new Promise((resolve) => {
      this.database.get(query, item.link, (error, row) => {
        if (error) {
          pino.error(error);
        }

        resolve(row);
      });
    });
  }


  public static getItemPublishedTime(item: Item) {
    const possibleDateProperties = ["pubDate", "date", "isoDate"];
    const dateProperty: string =
      possibleDateProperties.find((datePropertyName) => {
        return item.hasOwnProperty(datePropertyName);
      }) || "";

    const publishedTime = possibleDateProperties.includes(dateProperty)
      ? Date.parse(item[dateProperty])
      : Date.now();

    return publishedTime;
  }

  public async insertItem(item: Item, feedId: number | undefined) {
    const query = `
      INSERT INTO items (url, title, content, feed_id, published, comments, created, json_content)
      VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )
    `;

    return new Promise<void>((resolve) => {
      let content = "";

      if (item.content !== undefined) {
        content = item.content;
      }

      if (item["content:encoded"] !== undefined) {
        content = item["content:encoded"];
      }

      // picture elements
      content = content.replace(/ data\-srcset\=/gim, " srcset=");
      content = content.replace(/ data\-sizes\=/gim, " sizes=");
      // relative links not allowed
      content = content.replace(/href="(\/|(?!http))[^"]+"/gim, "");
      // relative src not allowed
      content = content.replace(/src="(\/|(?!http))[^"]+"/gim, "");
      // all links should openin new window
      content = content.replace(
        /<a /gim,
        '<a target="_blank" rel="noreferrer noopener" '
      );

      if (item.description) {
        content += item.description;
      }

      let jsonContent = "";
      if (item.id && item.id.includes("yt:video:")) {
        const vidId = item.id.replace("yt:video:", "");
        jsonContent = JSON.stringify({
          "yt-id": vidId,
        });
      }

      const publishedTime = DataService.getItemPublishedTime(item);

      const createdTime = Date.now();

      this.database.run(
        query,
        [
          item.link,
          emojiStrip(domPurify.sanitize(item.title, { ALLOWED_TAGS: [] })),
          domPurify.sanitize(content, {
            FORBID_TAGS: ["style", "script", "svg"],
            FORBID_ATTR: ["style", "width", "height", "class", "id"],
          }),
          feedId,
          publishedTime,
          item.comments,
          createdTime,
          jsonContent,
        ],
        (error) => {
          if (error) {
            pino.error(error);
            pino.trace("ITEM URL: %s,\nFEED: %s", item.link, feedId);
          }

          resolve();
        }
      );
    });
  }

  public async markFeedError(feed: Feed): Promise<boolean> {
    const query = `
      UPDATE feeds
      SET error = error + 1
      WHERE id = ?
    `;

    return new Promise((resolve) => {
      this.database.run(query, feed.id, (error) => {
        if (error) {
          pino.error(error);
        }

        resolve(true);
      });
    });
  }

  public async getFeedsLastFirstItems(): Promise<
    { id: number; url: string }[]
  > {
    const query = `
      SELECT
        feeds.id,
        items.url
      FROM feeds
      JOIN items
      ON items.feed_id = feeds.id
      GROUP BY items.feed_id
      ORDER BY items.published DESC
    `;

    return new Promise((resolve) => {
      this.database.all(query, (error, rows) => {
        if (error) {
          pino.error(error);
        }

        resolve(rows || []);
      });
    });
  }
}
