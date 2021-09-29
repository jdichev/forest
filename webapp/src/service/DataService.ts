// main data service
export default class DataService {
  private static instance: DataService;
  private static getItemsController: AbortController;

  public static getInstance(): DataService {
    if (this.instance === undefined) {
      this.instance = new DataService();
    }

    return this.instance;
  }

  public async getFeedCategories(): Promise<FeedCategory[]> {
    const response = await fetch("http://localhost:3031/categories");
    const categories = await response.json();

    return Promise.resolve(categories);
  }

  public async getFeedCategoryReadStats(): Promise<FeedCategoryReadStat[]> {
    const response = await fetch("http://localhost:3031/categories/readstats");
    const feedCategoryReadStats = response.json();

    return Promise.resolve(feedCategoryReadStats);
  }

  public async getFeedReadStats(): Promise<FeedReadStat[]> {
    const response = await fetch("http://localhost:3031/feeds/readstats");
    const feedReadStats = response.json();

    return Promise.resolve(feedReadStats);
  }

  public async getItems(
    params: {
      size: number;
      unreadOnly: boolean;
      selectedFeedCategory?: FeedCategory | undefined;
      selectedFeed?: Feed | undefined;
    } = {
      size: 50,
      unreadOnly: false,
      selectedFeedCategory: undefined,
      selectedFeed: undefined,
    }
  ): Promise<Item[]> {
    if (DataService.getItemsController) {
      DataService.getItemsController.abort();
    }

    DataService.getItemsController = new AbortController();
    const getItemsSignal = DataService.getItemsController.signal;

    const query = new URLSearchParams();

    if (params.size > 0) {
      query.set("size", JSON.stringify(params.size));
    }

    query.set("unread", JSON.stringify(params.unreadOnly));

    if (params.selectedFeedCategory) {
      query.set("cid", JSON.stringify(params.selectedFeedCategory.id));
    }

    if (params.selectedFeed) {
      query.set("fid", JSON.stringify(params.selectedFeed.id));
    }

    const queryString = query.toString();

    const response = await fetch(`http://localhost:3031/items?${queryString}`, {
      signal: getItemsSignal,
    }).catch((reason) => {
      console.log(reason.code, reason.message, reason.name);
    });

    if (response) {
      const items = await response.json();
      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }

  public async getItem(itemId: number | undefined): Promise<Item | undefined> {
    const response = await fetch(`http://localhost:3031/items/${itemId}`);
    const item = await response.json();

    return Promise.resolve(item);
  }

  public async markItemsRead(params: {
    feed?: Feed;
    feedCategory?: FeedCategory;
  }) {
    const query = new URLSearchParams();

    if (params.feed) {
      query.set("fid", JSON.stringify(params.feed.id));
    } else if (!params.feed && params.feedCategory) {
      query.set("cid", JSON.stringify(params.feedCategory.id));
    }

    const queryString = query.toString();

    const response = await fetch(
      `http://localhost:3031/itemsread?${
        params.feed || params.feedCategory ? queryString : ""
      }`
    );
    const result = response.json();

    return Promise.resolve(result);
  }

  public async markItemRead(item: Item) {
    const query = new URLSearchParams();

    query.set("id", JSON.stringify(item.id));

    const queryString = query.toString();

    const response = await fetch(
      `http://localhost:3031/item/read?${queryString}`
    );

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async getFeeds(
    params: {
      selectedFeedCategory?: FeedCategory;
    } = {}
  ): Promise<Feed[]> {
    const query = new URLSearchParams();

    if (params.selectedFeedCategory) {
      query.set("cid", JSON.stringify(params.selectedFeedCategory.id));
    }

    const queryString = query.toString();

    const response = await fetch(`http://localhost:3031/feeds?${queryString}`);
    const feeds = await response.json();

    return Promise.resolve(feeds);
  }

  public async getFeedById(feedId: number): Promise<Feed> {
    const query = new URLSearchParams();

    query.set("fid", JSON.stringify(feedId));

    const queryString = query.toString();

    const response = await fetch(`http://localhost:3031/feeds?${queryString}`);

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async removeFeed(feedId: number): Promise<boolean> {
    const query = new URLSearchParams();

    query.set("fid", JSON.stringify(feedId));

    const queryString = query.toString();

    const response = await fetch(`http://localhost:3031/feeds?${queryString}`, {
      method: "DELETE",
    });

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async updateFeed(feed: Feed): Promise<boolean> {
    const feedJson = JSON.stringify(feed);

    const response = await fetch("http://localhost:3031/feeds", {
      method: "PUT",
      headers: {
        "Content-type": "application/json",
      },
      body: feedJson,
    });

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async checkFeed(feedUrl: string): Promise<Feed[]> {
    const encodedFeedUrl = encodeURIComponent(feedUrl);

    const result = await fetch(
      `http://localhost:3031/checkfeed?url=${encodedFeedUrl}`
    );

    const resultJson = result.json();

    return Promise.resolve(resultJson);
  }

  public async checkFeedUrls(feedUrls: string[]) {
    const feedJson = JSON.stringify(feedUrls);
    const result = await fetch("http://localhost:3031/checkfeedurls", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: feedJson,
    });

    const resultJson = await result.json();

    return Promise.resolve(resultJson);
  }

  public async addFeed(feed: Feed) {
    const feedJson = JSON.stringify(feed);

    const response = await fetch("http://localhost:3031/feeds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: feedJson,
    });

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async addFeedCategory(feedCategory: FeedCategory) {
    const feedCategoryJson = JSON.stringify(feedCategory);

    const response = await fetch("http://localhost:3031/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: feedCategoryJson,
    });

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async removeFeedCategory(feedCategoryId: Number) {
    const query = new URLSearchParams();

    query.set("cid", JSON.stringify(feedCategoryId));

    const queryString = query.toString();

    const response = await fetch(
      `http://localhost:3031/categories?${queryString}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async updateFeedCategory(feedCategory: FeedCategory) {
    const feedCategoryJson = JSON.stringify(feedCategory);

    const response = await fetch("http://localhost:3031/categories", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: feedCategoryJson,
    });

    const result = await response.json();

    return Promise.resolve(result);
  }

  public async importOpmlFile(fileName: string) {
    const fileNameJson = JSON.stringify({ fileName });

    const response = await fetch("http://localhost:3031/opml-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: fileNameJson,
    });

    const result = await response.json();

    return Promise.resolve(result);
  }
}
