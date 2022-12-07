const { fetchFeed } = require(".");

async function test() {
  let repeat = 29;

  while (repeat-- > 0) {
    const res = await fetchFeed("http://localhost:3000/test.atom?r=" + repeat);
    console.log(repeat + ' . res length ' + res.length);
  }

  process.exit();
}

test();
