import cron from "node-cron";
import pinoLib from "pino";
import FeedUpdater from "./modules/FeedUpdater";

const pino = pinoLib({
  level: "trace",
});


export default class Updater {
  private static task: cron.ScheduledTask;

  public static start() {
    const UPDATE_FREQUENCY_MINUTES = 30;

    const feedUpdater = new FeedUpdater();

    pino.debug(`Updating every ${UPDATE_FREQUENCY_MINUTES} minutes`);
    feedUpdater.updateItems();

    this.task = cron.schedule(
      `*/${UPDATE_FREQUENCY_MINUTES} * * * *`,
      () => {
        feedUpdater.updateItems();
      },
      {
        scheduled: false,
      }
    );

    this.task.start();
  }

  public static stop() {
    this.task.stop();
    this.task.destroy();
  }
}
