// Import pino for logging
import pinoLib from "pino";
// Import the FeedUpdater class from a local module
import FeedUpdater from "./modules/FeedUpdater";

const INTERVAL_MS = 10 * 60_000; // 10 minutes
const SLEEP_GAP_MS = 30_000; // treat larger as resume
const CLOCK_JUMP_MS = 10_000; // treat large drift as clock change

const pino = pinoLib({
  level: process.env.LOG_LEVEL || "trace",
  name: "updater",
});

/**
 * Updater class responsible for scheduling and managing periodic updates.
 */
export default class Updater {
  private static timer?: NodeJS.Timeout;

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
    void feedUpdater
      .updateItems()
      .catch((err) => pino.error(err, "Update failed"));
    // Self-scheduling timer with drift detection to handle sleep/clock jumps
    let nextAt = Date.now() + INTERVAL_MS;
    const scheduleNext = () => {
      const now = Date.now();
      const drift = now - nextAt;

      // Log warnings for abnormal drift
      if (drift > SLEEP_GAP_MS) {
        pino.warn({ drift }, "Resume detected; running catch-up update");
      } else if (drift < -CLOCK_JUMP_MS || drift > CLOCK_JUMP_MS) {
        pino.warn({ drift }, "Clock change detected; running update");
      }

      // Always run the update
      void feedUpdater
        .updateItems()
        .catch((err) => pino.error(err, "Update failed"));

      nextAt += INTERVAL_MS;
      const delay = Math.max(0, nextAt - Date.now());
      this.timer = setTimeout(scheduleNext, delay);
    };
    this.timer = setTimeout(scheduleNext, INTERVAL_MS);
  }

  /**
   * Stops the updater service.
   * Stops the scheduled task from running.
   */
  public static stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
