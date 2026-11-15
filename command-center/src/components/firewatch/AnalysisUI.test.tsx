import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PagedValueTable } from "./AnalysisUI";

afterEach(cleanup);

it("makes every map value available while limiting rendered rows", () => {
  render(
    <PagedValueTable
      caption="Clusters"
      headers={["Location", "Count"]}
      rows={Array.from({ length: 51 }, (_, i) => [`Location ${i + 1}`, i])}
    />,
  );
  fireEvent.click(screen.getByLabelText("View chart values: Clusters"));
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("row")).toHaveLength(26);
  expect(screen.getByRole("button", { name: "Previous values" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next values" }));
  expect(within(table).getByText("Location 26")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next values" }));
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  expect(within(table).getByText("Location 51")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next values" })).toBeDisabled();
});
