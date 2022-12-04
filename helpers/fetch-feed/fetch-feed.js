const { Worker } = require("worker_threads");
const path = require("path");

function fetchFeed(feedUrl) {
  return new Promise((resolve) => {
    const worker = new Worker(path.join(__dirname, "fetch-feed-worker.js"));

    worker.on("message", (msg) => {
      resolve(msg);
    });

    worker.postMessage(feedUrl);
  });
}

module.exports = {
  fetchFeed,
};
