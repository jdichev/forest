const arrAvg = (arr: number[]) =>
  Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

export default class Scheduler {
  public static dayLength = 1000 * 60 * 60 * 24;

  public static hafDayLength = 1000 * 60 * 60 * 12;

  public static quarterDayLength = 1000 * 60 * 60 * 6;

  public static computeItemsFrequency(items: Item[]) {
    const publishedTimes = items.map((item) => {
      return item.published;
    });

    return this.computeFrequency(publishedTimes);
  }

  public static computeFrequency(publishedTimes: number[]) {
    const sortedPublishedTimes = publishedTimes.sort((a, b) => b - a);

    const timesBetweenA = sortedPublishedTimes.reverse().map((pubTime, i) => {
      if (i === 0) return 0;

      return pubTime - sortedPublishedTimes[i - 1];
    });

    const timesBetweenB = timesBetweenA.filter((pubTime) => {
      return pubTime !== 0;
    });

    const avg = arrAvg(timesBetweenB);

    return avg;
  }
}
