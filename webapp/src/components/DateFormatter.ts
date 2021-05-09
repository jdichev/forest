//
export default class DateFormatter {
  public static format(date: Date) {
    const locale = "en-GB";

    const formatter = new Intl.DateTimeFormat(locale, {
      // @ts-ignore
      dateStyle: "short",
      timeStyle: "long",
    });

    return formatter.format(date);
  }
}
