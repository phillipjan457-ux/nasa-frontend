import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  evaluatePair,
  haversineKm,
  pctChange,
  robustZ,
  scoreLabel,
  type SourceObservation,
} from "./harmonize";

const base: SourceObservation = {
  id: "MOD-1",
  sensor: "MODIS",
  satellite: "Aqua",
  instrument: "MODIS",
  product: "x",
  lat: -2,
  lon: 113,
  date: "2025-09-01",
  timeUtc: "06:00",
  ts: Date.UTC(2025, 8, 1, 6),
  confidence: "80",
  frp: 20,
  brightness: 320,
  scan: 1,
  track: 1,
  daynight: "D",
  province: "Central Kalimantan",
};
const viirs = (dKm: number, dMin: number, footprint = true): SourceObservation => ({
  ...base,
  id: "VNP-1",
  sensor: "VIIRS",
  instrument: "VIIRS",
  lat: base.lat + dKm / 110.574,
  ts: base.ts + dMin * 60000,
  scan: footprint ? 0.375 : null,
  track: footprint ? 0.375 : null,
  confidence: "nominal",
});

describe("harmonization rules", () => {
  it("uses the prototype gates of 1 km and 30 minutes", () => {
    expect(DEFAULT_CONFIG.maxDistanceKm).toBe(1);
    expect(DEFAULT_CONFIG.maxTimeMin).toBe(30);
  });
  it("haversine distance of 1° latitude is ~111 km", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });
  it("a pair outside the time gate is unmatched even with a perfect distance", () => {
    const e = evaluatePair(base, viirs(0, 31));
    expect(e.passesGates).toBe(false);
    expect(e.label).toBe("UNMATCHED");
  });
  it("labels score ≥ 0.70 as matched and 0.45–0.70 as possible", () => {
    expect(scoreLabel(0.7, true, DEFAULT_CONFIG)).toBe("MATCHED");
    expect(scoreLabel(0.69, true, DEFAULT_CONFIG)).toBe("POSSIBLE_MATCH");
    expect(scoreLabel(0.45, true, DEFAULT_CONFIG)).toBe("POSSIBLE_MATCH");
    expect(scoreLabel(0.44, true, DEFAULT_CONFIG)).toBe("UNMATCHED");
  });
  it("uses 0.35/0.25/0.40 weights when a footprint is available", () => {
    const e = evaluatePair(base, viirs(0.5, 15));
    expect(e.formula).toBe("M_footprint");
    expect(e.score).toBeCloseTo(0.35 * e.sd + 0.25 * e.st + 0.4 * (e.sf ?? 0), 6);
  });
  it("falls back to the 0.60/0.40 centre score when a footprint is missing", () => {
    const e = evaluatePair(base, viirs(0.5, 15, false));
    expect(e.formula).toBe("M_center");
    expect(e.iou).toBeNull();
    expect(e.score).toBeCloseTo(0.6 * e.sd + 0.4 * e.st, 6);
  });
  it("reports year-over-year change as not computable when the prior year is zero", () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(150, 100)).toBe(50);
  });
  it("robust z falls back safely when MAD is zero", () => {
    const r = robustZ(20, [10, 10, 10]);
    expect(r.fallback).toBe(true);
    expect(Number.isFinite(r.z)).toBe(true);
  });
});
