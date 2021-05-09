import cron from "node-cron";
import pinoLib from "pino";
import FeedUpdater from "./modules/FeedUpdater";

const pino = pinoLib({
  level: "trace",
});

let task;

export default class updater {
  public static start() {
    const UPDATE_FREQUENCY_MINUTES = 10;

    const feedUpdater = new FeedUpdater();

    pino.debug(`Updating every ${UPDATE_FREQUENCY_MINUTES} minutes`);
    feedUpdater.updateItems();

    task = cron.schedule(
      `*/${UPDATE_FREQUENCY_MINUTES} * * * *`,
      () => {
        feedUpdater.updateItems();
      },
      {
        scheduled: false,
      }
    );

    task.start();
  }
}
