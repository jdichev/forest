// Import the node-cron library for scheduling tasks and its ScheduledTask type
import cron, { ScheduledTask } from "node-cron";
// Import pino for logging
import pinoLib from "pino";
// Import the FeedUpdater class from a local module
import FeedUpdater from "./modules/FeedUpdater";

// Initialize pino logger with trace level for detailed logging
const pino = pinoLib({
  level: "trace",
});

/**
 * Updater class responsible for scheduling and managing periodic updates.
 */
export default class Updater {
  // Static property to hold the scheduled task reference
  private static task: ScheduledTask;

  /**
   * Starts the updater service.
   * Initializes an immediate update and schedules periodic updates every 5 minutes.
   */
  public static start() {
    // Create an instance of FeedUpdater
    const feedUpdater = new FeedUpdater();

    // Log the start of regular updates
    pino.debug(`Updating regularly`);
    // Perform an immediate update
    feedUpdater.updateItems();

    // Schedule a task to run every 5 minutes
    this.task = cron.schedule(
      `*/5 * * * *`, // Cron expression: every 5 minutes
      () => {
        // Perform the update when the scheduled task runs
        feedUpdater.updateItems();
      }
    );

    // Start the scheduled task after a 2-minute delay
    setTimeout(
      () => {
        this.task.start();
      },
      1000 * 60 * 2
    ); // 2 minutes in milliseconds
  }

  /**
   * Stops the updater service.
   * Stops the scheduled task from running.
   */
  public static stop() {
    this.task.stop();
    // Optional: Uncomment to completely destroy the task if needed
    // this.task.destroy();
  }
}
