const http = require("http");
const path = require("path");
const finalhandler = require("finalhandler");
const serveStatic = require("serve-static");
const { fetchFeedSync } = require(".");

const serve = serveStatic(path.join(__dirname, "test-data"));

const server = http.createServer((req, res) => {
  serve(req, res, finalhandler(req, res));
});

server.listen(0, () => {
  const { port } = server.address();
  try {
    const resStr = fetchFeedSync(`http://127.0.0.1:${port}/ala-feed.xml`);
    const res = JSON.parse(resStr);
    const first = res.items[0];

    if (!first) {
      throw new Error("Expected at least one item in the feed");
    }

    if (!first.publishedRaw || first.publishedRaw === "NO_DATE") {
      throw new Error("Expected publishedRaw to contain a date value");
    }

    if (typeof first.published !== "number" || first.published === 0) {
      throw new Error("Expected published to be a parsed timestamp");
    }

    console.log("Dublin Core date fallback test passed.");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
