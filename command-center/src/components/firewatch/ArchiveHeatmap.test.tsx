import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArchiveHeatmap } from "./ArchiveHeatmap";
const mocks = vi.hoisted(() => ({
  move: () => {},
  zoom: 5,
  rectangle: vi.fn(),
  marker: vi.fn(),
  clearLayers: vi.fn(),
}));
vi.mock("leaflet", () => ({
  map: () => {
    const map = {
      fitBounds: () => map,
      createPane: () => ({ style: {} }),
      on: (_name: string, callback: () => void) => {
        mocks.move = callback;
      },
      remove: vi.fn(),
      getZoom: () => mocks.zoom,
      getBounds: () => ({
        getWest: () => 95,
        getEast: () => 141,
        getSouth: () => -11,
        getNorth: () => 6,
      }),
    };
    return map;
  },
  layerGroup: () => ({ addTo: () => ({ clearLayers: mocks.clearLayers }) }),
  control: { zoom: () => ({ addTo: vi.fn() }) },
  tileLayer: () => {
    const layer = { addTo: () => layer, setUrl: vi.fn() };
    return layer;
  },
  rectangle: (...args: unknown[]) => {
    mocks.rectangle(...args);
    const layer = { bindTooltip: () => layer, addTo: () => layer };
    return layer;
  },
  marker: mocks.marker,
}));
beforeEach(() => {
  mocks.zoom = 5;
  mocks.rectangle.mockClear();
  mocks.marker.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        step: 1,
        cells: [{ gx: 290, gy: 88, mean_frp_mw: 120, count: 3 }],
      }),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("dedicated FRP heatmap", () => {
  it("loads nationwide cells once and does not fetch again when dragged", async () => {
    render(<ArchiveHeatmap query="year=2022&month=1" light={false} />);
    await waitFor(() => expect(mocks.rectangle).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toContain("west=-180");
    await act(async () => {
      mocks.move();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("renders FRP cells and an MW legend without creating hotspot markers", async () => {
    render(<ArchiveHeatmap query="year=2022&month=1" light={false} />);
    await waitFor(() => expect(mocks.rectangle).toHaveBeenCalled());
    expect(mocks.rectangle).toHaveBeenCalledWith(
      [
        [-2, 110],
        [-1, 111],
      ],
      expect.objectContaining({ fillColor: "#a83224" }),
    );
    expect(mocks.marker).not.toHaveBeenCalled();
    expect(screen.getByLabelText("FRP legend")).toHaveTextContent("MW");
    expect(screen.getByText("100+")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Heatmap sensor"), { target: { value: "MODIS" } });
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/year=2022&month=1&sensor=MODIS/),
        expect.anything(),
      ),
    );
  });
});
