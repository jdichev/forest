import DateFormatter from "./DateFormatter";

export default function FormattedDate({ pubDate }: FormattedDateProps) {
  const date = new Date(pubDate);
  const formattedDate = pubDate ? DateFormatter.format(date) : "";

  return <span data-testid="formatted-date">{formattedDate}</span>;
}
