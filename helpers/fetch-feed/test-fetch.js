const { fetchFeed } = require(".");

async function test() {
  const res = await fetchFeed("https://dev.to/feed/");
  // console.log(res);
  console.log(res);
}

test();
