const { fetchFeed } = require(".");

async function test() {
  // Fetch atom feed
  const res = await fetchFeed("http://localhost:3000/test.atom");
  console.log(res);
}

test();
