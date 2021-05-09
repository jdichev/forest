const arrAvg = (arr: number[]) =>
  Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

export default class Scheduler {
  public static dayLength = 1000 * 60 * 60 * 24;

  public static hafDayLength = 1000 * 60 * 60 * 12;

  public static quarterDayLength = 1000 * 60 * 60 * 6;

  public static computeItemsFrequence(items: Item[]) {
    const publishedTimes = items
      .map((item) => {
        return item.published;
      })
      .sort((a, b) => b - a);

    const timesBetweenA = publishedTimes.reverse().map((pubTime, i) => {
      if (i === 0) return 0;

      return pubTime - publishedTimes[i - 1];
    });

    const timesBetweenB = timesBetweenA.filter((pubTime) => {
      return pubTime !== 0;
    });

    const avg = arrAvg(timesBetweenB);

    return avg;
  }
}
