import cron, { ScheduledTask } from "node-cron";
import pinoLib from "pino";
import FeedUpdater from "./modules/FeedUpdater";

const pino = pinoLib({
  level: "trace",
});

export default class Updater {
  private static task: ScheduledTask;

  public static start() {
    const feedUpdater = new FeedUpdater();

    pino.debug(`Updating regularly`);
    feedUpdater.updateItems();

    this.task = cron.schedule(
      `*/30 * * * *`,
      () => {
        feedUpdater.updateItems();
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
