const { Worker } = require("worker_threads");
const path = require("path");

const EventEmitter = require("events");

class WorkerPool extends EventEmitter {
  #freeWorkers = [];
  #busyWorkers = [];
  #queue = [];
  #initiated = false;
  #numOfWorkers;

  constructor(numOfWorkers = 2) {
    super();
    this.#numOfWorkers = numOfWorkers;
  }

  init() {
    if (!this.#initiated) {
      let repeat = this.#numOfWorkers;
      while (repeat-- > 0) {
        const worker = new Worker(path.join(__dirname, "fetch-feed-worker.js"));
        this.#freeWorkers.push(worker);
      }
      this.#initiated = true;
    }
  }

  engageWorker() {
    const worker = this.#freeWorkers.shift();
    this.#busyWorkers.push(worker);

    return worker;
  }

  dismissWorker(worker) {
    const index = this.#busyWorkers.indexOf(worker);
    const [freeWorker] = this.#busyWorkers.splice(index, 1);

    this.#freeWorkers.push(freeWorker);
  }

  deQueue() {
    if (this.#freeWorkers.length && this.#queue.length) {
      const engageAndDequeue = this.#queue.shift();
      engageAndDequeue();
    } else {
      setTimeout(() => {
        this.deQueue();
      });
    }
  }

  pullWorker() {
    this.init();

    return new Promise((resolve) => {
      const engageAndDequeue = () => {
        const engagedWorker = this.engageWorker();
        resolve(engagedWorker);
      };

      if (this.#freeWorkers.length) {
        engageAndDequeue();
      } else {
        this.#queue.push(engageAndDequeue);

        setTimeout(() => {
          this.deQueue();
        });
      }
    });
  }

  pushWorker(worker) {
    setTimeout(() => {
      worker.removeAllListeners("message");
      this.dismissWorker(worker);
    });
  }
}

module.exports = WorkerPool;
