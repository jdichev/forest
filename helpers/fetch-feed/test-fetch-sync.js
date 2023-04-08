const { fetchFeedSync } = require("./fetch-feed-sync");

// Fetch atom feed
const atomFeedResStr = fetchFeedSync("http://localhost:3000/test.atom");
const atomFeedRes = JSON.parse(atomFeedResStr);

// Fetch rss feed
const rssFeedResStr = fetchFeedSync("http://localhost:3000/test.rss");
const rssFeedRes = JSON.parse(rssFeedResStr);

console.assert(
  atomFeedRes.items[0].title === rssFeedRes.items[0].title,
  "Titles of same feeds in different formats are the same"
);