import { fireEvent, render, screen } from "@testing-library/react";
import ItemsTable from "./ItemsTable";

test("renders formatted date", async () => {
  const handleSelectItem = jest.fn();

  const items: Item[] = [
    {
      id: 78049,
      title: "Do Consumers Care about Green Commerce?",
      published: 1616332431000,
      read: 1,
      feedTitle: "Practical eCommerce",
    },
  ];

  render(
    <ItemsTable
      selectedItem={undefined}
      selectItem={handleSelectItem}
      items={items}
    />
  );

  const renderedItemLink = screen.getByTestId("item-link");

  expect(renderedItemLink.textContent).toContain(items[0].title);

  fireEvent.click(renderedItemLink);

  expect(handleSelectItem).toHaveBeenCalledTimes(1);
});

test("renders message when no items for table", async () => {
  const handleSelectItem = jest.fn();

  const items: Item[] = [];

  render(
    <ItemsTable
      selectedItem={undefined}
      selectItem={handleSelectItem}
      items={items}
    />
  );

  const renderedItemsMessage = screen.getByTestId("items-message");

  expect(renderedItemsMessage).toBeTruthy;
});