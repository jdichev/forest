const validUrl = require("valid-url");
const { fetchFeedSync: nativeFetchFeedSync } = require("./index");

function fetchFeed(feedUrl) {
  if (!validUrl.isUri(feedUrl)) {
    return JSON.stringify({ error: "Invalid URL" });
  }

  return nativeFetchFeedSync(feedUrl);
}

module.exports = {
  fetchFeedSync: fetchFeed,
};
