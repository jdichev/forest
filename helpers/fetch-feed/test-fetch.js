const { fetchFeed } = require(".");

async function test() {
  const res = await fetchFeed("http://localhost:3000/ala-feed.xml");
  // console.log(res);
  console.log(res.length);
}

test();
