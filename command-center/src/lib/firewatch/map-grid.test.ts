import { describe, it, expect } from "vitest";
import { gridBounds, frpColor, observationBounds } from "./map-grid";

describe("map aggregation areas and FRP colors", () => {
  it("uses pixel dimensions for a single observation instead of the zoom-level grid", () => {
    const bounds = observationBounds({
      lat: -2,
      south: -2,
      north: -2,
      west: 110,
      east: 110,
      scan_km: 1,
      track_km: 0.5,
    })!;
    expect(bounds[1][0] - bounds[0][0]).toBeCloseTo(0.5 / 111.32);
    expect(bounds[1][1] - bounds[0][1]).toBeCloseTo(1 / (111.32 * Math.cos((-2 * Math.PI) / 180)));
    expect(observationBounds({ lat: -2, south: -2, north: -2, west: 110, east: 110 })).toBeNull();
    expect(observationBounds({ lat: -2 })).toBeNull();
  });
  it("outlines the actual display cell rather than an invented radius", () => {
    expect(gridBounds(290, 88, 1)).toEqual([
      [-2, 110],
      [-1, 111],
    ]);
    expect(gridBounds(0, 0, 1)).toEqual([
      [-90, -180],
      [-89, -179],
    ]);
    expect(gridBounds(NaN, 0, 1)).toBeNull();
    expect(gridBounds(1, 1, 0)).toBeNull();
  });
  it("maps absolute FRP intervals consistently, preserving zero and missing values", () => {
    expect(frpColor(0)).toBe("#fff0c2");
    expect(frpColor(10)).toBe("#f8c56b");
    expect(frpColor(50)).toBe("#e88335");
    expect(frpColor(100)).toBe("#a83224");
    expect(frpColor(-1)).toBeNull();
    expect(frpColor(NaN)).toBeNull();
  });
});
