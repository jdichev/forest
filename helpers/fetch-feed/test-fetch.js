const { fetchFeed } = require(".");

// Fetch atom feed
const atomFeedResStr = fetchFeed("http://localhost:3000/test.atom");
const atomFeedRes = JSON.parse(atomFeedResStr);
// console.log(atomFeedRes);

// Fetch rss feed
const rssFeedResStr = fetchFeed("http://localhost:3000/test.rss");
const rssFeedRes = JSON.parse(rssFeedResStr);
// console.log(rssFeedRes);

console.assert(
  atomFeedRes.items[0].title === rssFeedRes.items[0].title,
  "Titles of same feeds in different formats are the same"
);
