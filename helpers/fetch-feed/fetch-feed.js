const os = require("os")
const WorkerPool = require("./worker-pool");

const cpus = os.cpus();
const numWorkers = cpus.length > 1 ? Math.min(Math.min(cpus.length / 2), 4) : 1;

const workerPool = new WorkerPool(numWorkers);

function fetchFeed(feedUrl) {
  return new Promise(async (resolve) => {
    const worker = await workerPool.pullWorker();

    worker.once("message", (msg) => {
      workerPool.pushWorker(worker);

      resolve(msg);
    });

    worker.postMessage(feedUrl);
  });
}

module.exports = {
  fetchFeed,
};
