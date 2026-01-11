import pinoLib from "pino";
import ms from "ms";

/**
 * Logger instance for the Scheduler module.
 */
const pino = pinoLib({
  level: "trace",
  name: "Scheduler",
});

/**
 * Calculates the rounded average of an array of numbers.
 * @param arr - Array of numbers to average
 * @returns The rounded average, or 0 if the array is empty
 */
const arrAvg = (arr: number[]) =>
  arr.length === 0
    ? 0
    : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

/**
 * Scheduler class for calculating feed update frequencies.
 * Provides utilities to determine how often a feed publishes new items,
 * which can be used to optimize polling intervals.
 */
export default class Scheduler {
  /** One day in milliseconds (24 hours) */
  public static dayLength = 1000 * 60 * 60 * 24;

  /** Half a day in milliseconds (12 hours) */
  public static halfDayLength = 1000 * 60 * 60 * 12;

  /** Quarter of a day in milliseconds (6 hours) */
  public static quarterDayLength = 1000 * 60 * 60 * 6;

  /**
   * Computes the average publishing frequency from an array of feed items.
   * The frequency represents the average time interval between consecutive publications.
   * @param items - Array of feed items with published timestamps
   * @returns Average interval in milliseconds between item publications, or 0 if insufficient data.
   *          For example, 3600000 means items are published on average every hour.
   */
  // public static computeItemsFrequency(items: Item[]) {
  //   pino.trace({ itemCount: items.length }, "Computing items frequency (ms)");

  //   const publishedTimes = items.map((item) => {
  //     return item.published;
  //   });
  //   pino.trace({ publishedTimes }, "Published times extracted");

  //   const frequency = this.computeFrequency(publishedTimes);
  //   pino.trace(
  //     { itemCount: items.length, frequencyMs: frequency },
  //     "Computed items frequency"
  //   );

  //   return frequency;
  // }

  /**
   * Computes the average frequency between a series of timestamps.
   * Sorts the timestamps, calculates the time intervals between consecutive entries,
   * and returns the average interval.
   * @param publishedTimes - Array of Unix timestamps in milliseconds (e.g., from Date.now())
   * @returns Average interval in milliseconds between consecutive timestamps, or 0 if insufficient data.
   *          Common reference values:
   *          - 1 hour = 3,600,000 ms
   *          - 1 day = 86,400,000 ms (see Scheduler.dayLength)
   */
  public static computeFrequency(publishedTimes: number[]) {
    // pino.trace(
    //   { timestampCount: publishedTimes.length },
    //   "Starting frequency computation"
    // );
    // pino.trace({ publishedTimes }, "Actual timestamps provided");

    if (publishedTimes.length < 2) {
      pino.trace(
        { timestampCount: publishedTimes.length },
        "Insufficient timestamps for frequency calculation"
      );
      return 0;
    }

    const sortedPublishedTimes = publishedTimes.sort((a, b) => b - a);
    pino.trace(
      {
        oldest: new Date(
          sortedPublishedTimes[sortedPublishedTimes.length - 1]
        ).toISOString(),
        newest: new Date(sortedPublishedTimes[0]).toISOString(),
      },
      "Sorted timestamps by date (newest first)"
    );

    const reversed = [...sortedPublishedTimes].reverse();
    const timesBetweenA = reversed.map((pubTime, i) => {
      if (i === 0) return 0;

      return pubTime - reversed[i - 1];
    });
    pino.trace(
      { rawIntervals: timesBetweenA.length },
      "Computed raw intervals between timestamps"
    );

    const timesBetweenB = timesBetweenA.filter((pubTime) => {
      return pubTime !== 0;
    });
    pino.trace(
      {
        validIntervals: timesBetweenB.length,
        minMs: Math.min(...timesBetweenB),
        maxMs: Math.max(...timesBetweenB),
      },
      "Filtered zero intervals"
    );

    const avg = arrAvg(timesBetweenB);

    pino.trace(
      { numOfIntervals: timesBetweenB.length, avgInterval: ms(avg) },
      "Frequency computation complete"
    );

    return avg;
  }
}
