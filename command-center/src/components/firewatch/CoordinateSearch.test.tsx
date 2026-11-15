import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Map } from "leaflet";
import { CoordinateSearch } from "./CoordinateSearch";
afterEach(cleanup);
it("rejects invalid coordinates and searches without changing zoom", () => {
  const setView = vi.fn();
  render(<CoordinateSearch map={{ setView, getZoom: () => 7 } as unknown as Map} />);
  fireEvent.change(screen.getByLabelText("Latitude, longitude"), { target: { value: "91, 110" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(setView).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Latitude, longitude"), {
    target: { value: "-2.5, 110" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(setView).toHaveBeenCalledWith([-2.5, 110], 7, { animate: false });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("finds a supplied province without changing analysis filters", () => {
  const fitBounds = vi.fn();
  render(
    <CoordinateSearch
      map={{ fitBounds } as unknown as Map}
      places={[
        {
          name: "Bali",
          bounds: [
            [-9, 114],
            [-8, 116],
          ],
        },
      ]}
    />,
  );
  fireEvent.change(screen.getByLabelText("Latitude, longitude or province"), {
    target: { value: " bali " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(fitBounds).toHaveBeenCalledWith(
    [
      [-9, 114],
      [-8, 116],
    ],
    { maxZoom: 9, animate: false },
  );
  expect(screen.queryByRole("alert")).toBeNull();
});
