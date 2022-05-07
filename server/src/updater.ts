import cron from "node-cron";
import pinoLib from "pino";
import FeedUpdater from "./modules/FeedUpdater";

const pino = pinoLib({
  level: "trace",
});

export default class Updater {
  private static task: cron.ScheduledTask;

  public static start() {
    const feedUpdater = new FeedUpdater();

    pino.debug(`Updating regularly`);
    feedUpdater.updateItems();

    this.task = cron.schedule(
      `1 * * * *`,
      () => {
        feedUpdater.updateItems();
      },
      {
        scheduled: false,
      }
    );

    setTimeout(() => {
      this.task.start();
    }, 1000 * 60 * 2);
  }

  public static stop() {
    this.task.stop();
    // this.task.destroy();
  }
}
