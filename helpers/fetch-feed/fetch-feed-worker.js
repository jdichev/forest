const { parentPort } = require("worker_threads");
const ffi = require("ffi-napi");
const validUrl = require("valid-url");
const path = require("path");

const lib = ffi.Library(
  path.join(__dirname, "target", "release", "libfetch_feed"),
  {
    fetch_feed_extern: ["char *", ["string"]],
    fetch_feed_release: ["void", ["char *"]],
  }
);

function fetchFeed(feedUrl) {
  if (!validUrl.isUri(feedUrl)) {
    return JSON.stringify({ error: "Invalid URL" });
  }

  const feedJSONPtr = lib.fetch_feed_extern(feedUrl);
  try {
    return feedJSONPtr.readCString();
  } finally {
    lib.fetch_feed_release(feedJSONPtr);
  }
}

parentPort.on("message", (feedUrl) => {
  const res = fetchFeed(feedUrl);

  parentPort.postMessage(res);
});