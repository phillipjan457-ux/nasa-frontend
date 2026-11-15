// MODIS–VIIRS harmonization engine (pure functions, no I/O).
// Implements the brief's two-stage process: hard candidate gates, then a
// normalized evidence score. Thresholds are prototype settings, not calibrated
// probabilities, and every result carries its config + formula version.

export type Sensor = "MODIS" | "VIIRS";
export type MatchStatus = "matched" | "possible" | "modis-only" | "viirs-only";

export interface SourceObservation {
  id: string;
  sensor: Sensor;
  satellite: string;
  instrument: string;
  product: string;
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD (UTC)
  timeUtc: string; // HH:MM
  ts: number; // epoch ms, UTC
  confidence: string; // original product semantics, never rescaled
  frp: number | null; // MW
  brightness: number | null; // K (MODIS brightness / VIIRS bright_ti4)
  scan: number | null; // km
  track: number | null; // km
  daynight: "D" | "N";
  province: string;
}

export interface ThresholdConfig {
  id: string;
  name: string;
  maxDistanceKm: number;
  maxTimeMin: number;
  weights: { d: number; t: number; f: number };
  centerWeights: { d: number; t: number };
  matched: number;
  possible: number;
  version: string;
}

export const DEFAULT_CONFIG: ThresholdConfig = {
  id: "cfg-proto-1km-30m",
  name: "Prototype default",
  maxDistanceKm: 1,
  maxTimeMin: 30,
  weights: { d: 0.35, t: 0.25, f: 0.4 },
  centerWeights: { d: 0.6, t: 0.4 },
  matched: 0.7,
  possible: 0.45,
  version: "0.3.0",
};

export const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const dPhi = (lat2 - lat1) * r;
  const dLam = (lon2 - lon1) * r;
  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLam / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Approximate pixel footprints as rectangles (scan × track km) centred on the
 * reported pixel centre, in a local equirectangular km frame (adequate at
 * pixel scale). Returns null when either footprint is unavailable — missing
 * overlap is never treated as zero.
 */
export function footprintOverlap(a: SourceObservation, b: SourceObservation) {
  if (a.scan == null || a.track == null || b.scan == null || b.track == null) return null;
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lon - a.lon) * 111.32 * Math.cos(meanLat);
  const dy = (b.lat - a.lat) * 110.574;
  const ix = Math.max(
    0,
    Math.min(a.scan / 2, dx + b.scan / 2) - Math.max(-a.scan / 2, dx - b.scan / 2),
  );
  const iy = Math.max(
    0,
    Math.min(a.track / 2, dy + b.track / 2) - Math.max(-a.track / 2, dy - b.track / 2),
  );
  const inter = ix * iy;
  const areaA = a.scan * a.track;
  const areaB = b.scan * b.track;
  return { iou: inter / (areaA + areaB - inter), coverage: inter / Math.min(areaA, areaB) };
}

export interface PairEvaluation {
  modisId: string;
  viirsId: string;
  distanceKm: number;
  dtMin: number;
  iou: number | null;
  coverage: number | null;
  sd: number;
  st: number;
  sf: number | null;
  score: number;
  formula: "M_footprint" | "M_center";
  passesGates: boolean;
  label: "MATCHED" | "POSSIBLE_MATCH" | "UNMATCHED";
}

export function scoreLabel(
  score: number,
  passesGates: boolean,
  cfg: ThresholdConfig,
): PairEvaluation["label"] {
  if (!passesGates) return "UNMATCHED"; // a failed hard gate is never rescued by a high score
  if (score >= cfg.matched) return "MATCHED";
  if (score >= cfg.possible) return "POSSIBLE_MATCH";
  return "UNMATCHED";
}

export function evaluatePair(
  m: SourceObservation,
  v: SourceObservation,
  cfg: ThresholdConfig = DEFAULT_CONFIG,
): PairEvaluation {
  const distanceKm = haversineKm(m.lat, m.lon, v.lat, v.lon);
  const dtMin = Math.abs(m.ts - v.ts) / 60000;
  const passesGates = distanceKm <= cfg.maxDistanceKm && dtMin <= cfg.maxTimeMin;
  const sd = Math.max(0, 1 - distanceKm / cfg.maxDistanceKm);
  const st = Math.max(0, 1 - dtMin / cfg.maxTimeMin);
  const fp = footprintOverlap(m, v);
  // S_f uses coverage of the finer (VIIRS) pixel: IoU between a ~1 km MODIS
  // pixel and a 375 m VIIRS pixel is bounded by their area ratio (~0.14), so
  // raw IoU cannot express "fully inside". IoU is still stored and reported.
  const sf = fp ? fp.coverage : null;
  const score =
    sf != null
      ? cfg.weights.d * sd + cfg.weights.t * st + cfg.weights.f * sf
      : cfg.centerWeights.d * sd + cfg.centerWeights.t * st;
  return {
    modisId: m.id,
    viirsId: v.id,
    distanceKm,
    dtMin,
    iou: fp?.iou ?? null,
    coverage: fp?.coverage ?? null,
    sd,
    st,
    sf,
    score,
    formula: sf != null ? "M_footprint" : "M_center",
    passesGates,
    label: scoreLabel(score, passesGates, cfg),
  };
}

export interface HarmonizedObservation extends SourceObservation {
  status: MatchStatus;
  groupId: string | null;
  links: PairEvaluation[]; // assigned links only
  anomaly: boolean;
}

export interface HarmonizedGroup {
  id: string;
  status: "matched" | "possible";
  modisId: string;
  viirsIds: string[];
  bestScore: number;
}

export interface HarmonizationResult {
  observations: HarmonizedObservation[];
  groups: HarmonizedGroup[];
  candidates: PairEvaluation[]; // every gate-passing pair, incl. unassigned alternatives
  config: ThresholdConfig;
}

/**
 * Candidate generation with a date-bucket + bounding-box prefilter, then a
 * greedy maximum-score assignment:
 *  - each VIIRS observation joins at most one group (no silent double assignment);
 *  - a MODIS pixel may hold several VIIRS members only when footprint coverage
 *    justifies it (one-to-many); centre-only evidence stays one-to-one;
 *  - no transitive chaining — groups are always anchored on one MODIS record.
 */
export function harmonize(
  obs: SourceObservation[],
  cfg: ThresholdConfig = DEFAULT_CONFIG,
): HarmonizationResult {
  const modis = obs.filter((o) => o.sensor === "MODIS");
  const viirs = obs.filter((o) => o.sensor === "VIIRS");
  const dayMs = 86400000;
  const buckets = new Map<number, SourceObservation[]>();
  for (const v of viirs) {
    const k = Math.floor(v.ts / dayMs);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(v);
  }
  const degPad = cfg.maxDistanceKm / 100; // generous (1° ≈ 111 km)
  const candidates: PairEvaluation[] = [];
  for (const m of modis) {
    const k = Math.floor(m.ts / dayMs);
    for (const kk of [k - 1, k, k + 1]) {
      for (const v of buckets.get(kk) ?? []) {
        if (Math.abs(v.lat - m.lat) > degPad || Math.abs(v.lon - m.lon) > degPad * 1.02) continue;
        if (Math.abs(v.ts - m.ts) / 60000 > cfg.maxTimeMin) continue;
        const e = evaluatePair(m, v, cfg);
        if (e.passesGates) candidates.push(e);
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const viirsTaken = new Map<string, PairEvaluation>();
  const modisLinks = new Map<string, PairEvaluation[]>();
  for (const c of candidates) {
    if (c.label === "UNMATCHED" || viirsTaken.has(c.viirsId)) continue;
    const existing = modisLinks.get(c.modisId) ?? [];
    if (
      existing.length > 0 &&
      !(c.coverage != null && c.coverage > 0 && existing.every((e) => e.coverage != null))
    )
      continue;
    viirsTaken.set(c.viirsId, c);
    modisLinks.set(c.modisId, [...existing, c]);
  }
  const groups: HarmonizedGroup[] = [];
  const groupOf = new Map<string, HarmonizedGroup>();
  for (const [modisId, links] of modisLinks) {
    const g: HarmonizedGroup = {
      id: `HG-${modisId.slice(4)}`,
      status: links.every((l) => l.label === "MATCHED") ? "matched" : "possible",
      modisId,
      viirsIds: links.map((l) => l.viirsId),
      bestScore: Math.max(...links.map((l) => l.score)),
    };
    groups.push(g);
    groupOf.set(modisId, g);
    for (const l of links) groupOf.set(l.viirsId, g);
  }
  const observations: HarmonizedObservation[] = obs.map((o) => {
    const g = groupOf.get(o.id);
    const links =
      o.sensor === "MODIS"
        ? (modisLinks.get(o.id) ?? [])
        : viirsTaken.has(o.id)
          ? [viirsTaken.get(o.id)!]
          : [];
    return {
      ...o,
      status: g ? g.status : o.sensor === "MODIS" ? "modis-only" : "viirs-only",
      groupId: g?.id ?? null,
      links,
      anomaly: false,
    };
  });
  return { observations, groups, candidates, config: cfg };
}

/** Year-over-year % change; null ("not computable") when the prior value is zero or missing. */
export function pctChange(current: number, prior: number | null | undefined) {
  if (prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b) as [number, ...number[]] & number[];
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (pos - lo);
}

/**
 * Robust z-score: (x − median) / (1.4826 × MAD). When MAD is zero the scale
 * falls back to max(10% of the median, 1) so a flat baseline never divides by zero.
 */
export function robustZ(x: number, baseline: number[]) {
  const med = median(baseline);
  const mad = median(baseline.map((b) => Math.abs(b - med)));
  const scale = mad > 0 ? 1.4826 * mad : Math.max(0.1 * med, 1);
  return { z: (x - med) / scale, median: med, mad, fallback: mad === 0 };
}
