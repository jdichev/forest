const { fetchFeedSync } = require("./fetch-feed-sync");

// Fetch dummy atom feed
const atomFeedResStr = fetchFeedSync("http://localhost:3000/test.atom");
const atomFeedRes = JSON.parse(atomFeedResStr);

// Fetch dummy rss feed
const rssFeedResStr = fetchFeedSync("http://localhost:3000/test.rss");
const rssFeedRes = JSON.parse(rssFeedResStr);

console.assert(
  atomFeedRes.items[0].title === rssFeedRes.items[0].title,
  "Titles of same feeds in different formats are the same"
);

// Fetch cs feed
const csFeedResStr = fetchFeedSync("http://localhost:3000/cs-feed.xml");
const csFeedRes = JSON.parse(csFeedResStr);

console.assert(
  csFeedRes.title && csFeedRes.title !== "NO_TITLE",
  "CS feed has non-empty title"
);

// Fetch ala feed
const alaFeedResStr = fetchFeedSync("http://localhost:3000/ala-feed.xml");
const alaFeedRes = JSON.parse(alaFeedResStr);

console.assert(
  typeof alaFeedRes.items[0].published === "number" &&
    alaFeedRes.items[0].published > 0,
  `ALA feed item has non-empty published timestamp \n${JSON.stringify(alaFeedRes.items[0], null, 2)}`
);

console.assert(
  !isNaN(new Date(alaFeedRes.items[0].published).getTime()),
  `ALA feed item published timestamp is a valid date \n${JSON.stringify(alaFeedRes.items[0], null, 2)}`
);

console.log("All tests passed.");
