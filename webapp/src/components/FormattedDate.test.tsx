import { render, screen } from "@testing-library/react";
import DateFormatter from "./DateFormatter";
import FormattedDate from "./FormattedDate";

test("renders formatted date", async () => {
  const now = new Date();
  const content = DateFormatter.format(now);

  render(<FormattedDate pubDate={+now} />);

  const renderedDate = screen.getByTestId("formatted-date");

  expect(renderedDate.textContent).toEqual(content);
});

test("renders empty container", async () => {
  // @ts-ignore
  render(<FormattedDate pubDate={undefined} />);

  const renderedDate = screen.getByTestId("formatted-date");

  expect(renderedDate.textContent).toEqual("");
});
