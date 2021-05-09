import RssParser from "rss-parser";
import isAbsoluteUrl from "is-absolute-url";
import isValidDomain from "is-valid-domain";
import axios from "axios";
import { JSDOM } from "jsdom";
import pinoLib from "pino";

const pino = pinoLib({
  level: "trace",
});

/**
 * check a site for feeds or return feed if url is a feed
 */
export default class FeedFinder {
  private rssParser: RssParser;

  private maxDepth = 2;

  constructor() {
    this.rssParser = new RssParser({
      xml2js: {
        emptyTag: "EMPTY_TAG",
      },
    });
  }

  private async loadFeedData(feedUrl: string): Promise<Feed | null> {
    return new Promise((resolve) => {
      this.rssParser
        .parseURL(feedUrl)
        .then(async (feedRes) => {
          const feed: Feed = {
            title: feedRes.title || "",
            feedUrl,
            url: feedRes.link || "",
          };

          resolve(feed);
        })
        .catch((e) => {
          pino.error(e);
          resolve(null);
        });
    });
  }

  static async getContentType(url: string): Promise<string | undefined> {
    const res = await axios.head(url).catch((reson) => {
      pino.error(reson);
    });

    // pino.debug(res?.headers);
    const contentType = res
      ? res.headers["content-type"]?.split(";")[0].trim()
      : undefined;

    return contentType;
  }

  static async isFeedResponse(url: string): Promise<boolean> {
    const feedContentTypes = [
      "application/x-rss+xml",
      "application/rss+xml",
      "application/atom+xml",
      "application/xml",
      "text/xml",
    ];
    const contentType = await FeedFinder.getContentType(url);

    return typeof contentType === "string"
      ? feedContentTypes.includes(contentType)
      : false;
  }

  public async checkFeed(url: string, depth = 0): Promise<Feed[]> {
    let resUrl: URL;

    if (!isAbsoluteUrl(url)) {
      if (!isValidDomain(url)) {
        return Promise.resolve([]);
      }
      resUrl = new URL("http://placeholder");
      resUrl.host = url;
    } else {
      resUrl = new URL(url);
    }

    const isFeedResponse = await FeedFinder.isFeedResponse(resUrl.href);
    pino.debug("isFeedResponse %o", isFeedResponse);

    if (isFeedResponse) {
      const feedData = await this.loadFeedData(resUrl.href);
      return feedData ? [feedData] : [];
    }

    if (depth < this.maxDepth) {
      const foundFeedUrls = await this.searchForFeeds(resUrl.href, depth + 1);

      return foundFeedUrls;
    }

    return Promise.resolve([]);
  }

  private async searchForFeeds(url: string, depth: number): Promise<Feed[]> {
    const res = await axios.get(url).catch((reason) => {
      pino.error(reason);
    });

    if (!res) {
      return [];
    }

    const body = res.data;

    const doc = new JSDOM(body);

    const queryRes = doc.window.document.querySelectorAll(`
      [type="application/rss+xml"][href],
      [type="application/atom+xml"][href],
      [href*="rss"],
      [href*="atom"],
      [href*="feed"]
    `);

    const foundUrls: string[] = [];
    queryRes.forEach((feedLink) => {
      const hrefValue = feedLink.getAttribute("href");

      if (hrefValue) {
        const resolvedUrl = new URL(hrefValue, url).href;
        foundUrls.push(resolvedUrl);
      }
    });

    if (foundUrls.length) {
      let combinedResult = await Promise.all(
        foundUrls.map(async (foundUrl) => {
          const checkedFeedData = await this.checkFeed(foundUrl, depth);
          return checkedFeedData;
        })
      );

      combinedResult = combinedResult.filter((elFiltered) => {
        return elFiltered !== undefined;
      });

      let finalArr: Feed[] = [];

      finalArr = finalArr.concat(...combinedResult);

      const occurrenceArr: string[] = [];

      finalArr = finalArr.filter((feedDataItem) => {
        if (occurrenceArr.includes(feedDataItem.feedUrl)) {
          return false;
        }

        occurrenceArr.push(feedDataItem.feedUrl);
        return true;
      });

      return finalArr;
    }

    return Promise.resolve([]);
  }
}
