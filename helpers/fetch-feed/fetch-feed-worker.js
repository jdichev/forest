const { parentPort } = require("worker_threads");
const { fetchFeedSync } = require("./index.node");
const validUrl = require("valid-url");

function fetchFeed(feedUrl) {
  if (!validUrl.isUri(feedUrl)) {
    return JSON.stringify({ error: "Invalid URL" });
  }

  try {
    return fetchFeedSync(feedUrl);
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

parentPort.on("message", (feedUrl) => {
  const res = fetchFeed(feedUrl);

  parentPort.postMessage(res);
});