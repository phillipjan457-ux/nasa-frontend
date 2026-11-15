// Aggregations, anomaly detection, forecasting and narrative — all computed
// from harmonized observations, never hard-coded.
import {
  DEFAULT_CONFIG,
  harmonize,
  median,
  pctChange,
  quantile,
  robustZ,
  type HarmonizationResult,
  type HarmonizedObservation,
  type ThresholdConfig,
} from "./harmonize";
import { MONTHS, PROVINCES, YEARS, generateSourceObservations, type Year } from "./sample-data";

const cache = new Map<string, HarmonizationResult>();

export function getYear(year: Year, cfg: ThresholdConfig = DEFAULT_CONFIG): HarmonizationResult {
  const key = `${year}:${cfg.id}`;
  let res = cache.get(key);
  if (!res) {
    res = harmonize(generateSourceObservations(year), cfg);
    if (cfg.id === DEFAULT_CONFIG.id) {
      const flagged = new Set(
        anomalyTable(year)
          .filter((a) => a.flagged)
          .map((a) => `${a.province}|${a.month}`),
      );
      for (const o of res.observations)
        o.anomaly = flagged.has(`${o.province}|${+o.date.slice(5, 7) - 1}`);
    }
    cache.set(key, res);
  }
  return res;
}

/** Harmonized activity unit: one per group, plus each MODIS-only and VIIRS-only observation. */
export function isActivityUnit(o: HarmonizedObservation) {
  return o.sensor === "MODIS" || o.status === "viirs-only";
}

export function summarize(obs: HarmonizedObservation[]) {
  const modis = obs.filter((o) => o.sensor === "MODIS");
  const viirs = obs.filter((o) => o.sensor === "VIIRS");
  const groups = new Map<string, HarmonizedObservation["status"]>();
  for (const o of obs) if (o.groupId) groups.set(o.groupId, o.status);
  const matchedGroups = [...groups.values()].filter((s) => s === "matched").length;
  const possibleGroups = groups.size - matchedGroups;
  const modisInMatched = modis.filter((o) => o.status === "matched").length;
  const viirsInMatched = viirs.filter((o) => o.status === "matched").length;
  const modisOnly = modis.filter((o) => o.status === "modis-only").length;
  const viirsOnly = viirs.filter((o) => o.status === "viirs-only").length;
  const frp = (a: HarmonizedObservation[]) =>
    a.map((o) => o.frp).filter((x): x is number => x != null);
  const stats = (xs: number[]) => ({
    median: median(xs),
    mean: xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN,
    p90: quantile(xs, 0.9),
  });
  const latest = obs.reduce<HarmonizedObservation | null>(
    (a, o) => (!a || o.ts > a.ts ? o : a),
    null,
  );
  return {
    modis: modis.length,
    viirs: viirs.length,
    matchedGroups,
    possibleGroups,
    modisInMatched,
    viirsInMatched,
    modisOnly,
    viirsOnly,
    activity: groups.size + modisOnly + viirsOnly,
    highFrp: obs.filter((o) => isActivityUnit(o) && (o.frp ?? 0) >= 50).length,
    anomalyProvinces: new Set(obs.filter((o) => o.anomaly).map((o) => o.province)).size,
    modisFrp: stats(frp(modis)),
    viirsFrp: stats(frp(viirs)),
    modisScan: median(modis.map((o) => o.scan).filter((x): x is number => x != null)),
    viirsScan: median(viirs.map((o) => o.scan).filter((x): x is number => x != null)),
    viirsNoFootprint: viirs.filter((o) => o.scan == null).length,
    matchRateModis: modis.length ? modisInMatched / modis.length : null,
    matchRateViirs: viirs.length ? viirsInMatched / viirs.length : null,
    latest,
  };
}
export type Summary = ReturnType<typeof summarize>;

export interface DayCell {
  activity: number;
  modis: number;
  viirs: number;
  matched: number;
  possible: number;
  byProvince: Record<string, number>;
}
export function dailySeries(obs: HarmonizedObservation[]) {
  const map = new Map<string, DayCell>();
  for (const o of obs) {
    const c = map.get(o.date) ?? {
      activity: 0,
      modis: 0,
      viirs: 0,
      matched: 0,
      possible: 0,
      byProvince: {},
    };
    if (o.sensor === "MODIS") c.modis++;
    else c.viirs++;
    if (isActivityUnit(o)) {
      c.activity++;
      c.byProvince[o.province] = (c.byProvince[o.province] ?? 0) + 1;
      if (o.sensor === "MODIS" && o.status === "matched") c.matched++;
      if (o.sensor === "MODIS" && o.status === "possible") c.possible++;
    }
    map.set(o.date, c);
  }
  return map;
}

export function monthlyActivity(obs: HarmonizedObservation[]) {
  const rows = MONTHS.map((m) => ({
    month: m,
    activity: 0,
    modis: 0,
    viirs: 0,
    matched: 0,
    modisOnly: 0,
    viirsOnly: 0,
  }));
  for (const o of obs) {
    const r = rows[+o.date.slice(5, 7) - 1]!;
    if (o.sensor === "MODIS") r.modis++;
    else r.viirs++;
    if (isActivityUnit(o)) r.activity++;
    if (o.sensor === "MODIS" && o.groupId) r.matched++;
    if (o.status === "modis-only") r.modisOnly++;
    if (o.status === "viirs-only") r.viirsOnly++;
  }
  return rows;
}

function provinceMonthCounts(year: Year) {
  const obs = harmonize(generateSourceObservations(year), DEFAULT_CONFIG).observations;
  const grid: Record<string, number[]> = {};
  for (const p of PROVINCES) grid[p.name] = Array(12).fill(0);
  for (const o of obs) if (isActivityUnit(o)) grid[o.province]![+o.date.slice(5, 7) - 1]!++;
  return grid;
}
const pmCache = new Map<Year, Record<string, number[]>>();
const pm = (y: Year) => pmCache.get(y) ?? pmCache.set(y, provinceMonthCounts(y)).get(y)!;

export const ANOMALY_Z = 3.5;
export const ANOMALY_MIN_COUNT = 10;

/** Leave-one-year-out, same province-month baseline; robust z on harmonized activity. */
export function anomalyTable(year: Year) {
  const rows = [];
  for (const p of PROVINCES) {
    for (let m = 0; m < 12; m++) {
      const observed = pm(year)[p.name]![m]!;
      const baseline = YEARS.filter((y) => y !== year).map((y) => pm(y)[p.name]![m]!);
      const rz = robustZ(observed, baseline);
      rows.push({
        province: p.name,
        month: m,
        observed,
        baseline,
        baselineMedian: rz.median,
        mad: rz.mad,
        fallback: rz.fallback,
        diff: observed - rz.median,
        z: rz.z,
        flagged: rz.z >= ANOMALY_Z && observed >= ANOMALY_MIN_COUNT,
      });
    }
  }
  return rows.sort((a, b) => b.z - a.z);
}
export type AnomalyRow = ReturnType<typeof anomalyTable>[number];

export function annual() {
  return YEARS.map((y) => {
    const s = summarize(getYear(y).observations);
    const monthly = monthlyActivity(getYear(y).observations);
    const peak = monthly.reduce((a, b) => (b.activity > a.activity ? b : a));
    const regions = regionalShares(y);
    return { year: y, s, monthly, peak: peak.month, top: regions[0]! };
  });
}

export function regionalShares(year: Year) {
  const grid = pm(year);
  const total = Object.values(grid).reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0);
  return PROVINCES.map((p) => {
    const n = grid[p.name]!.reduce((a, b) => a + b, 0);
    return { province: p.name, count: n, share: total ? (n / total) * 100 : 0 };
  }).sort((a, b) => b.count - a.count);
}

export function nationalMonthly(year: Year) {
  return monthlyActivity(getYear(year).observations).map((r) => r.activity);
}

/**
 * Two transparent models, chronologically backtested (train on earlier years,
 * test on the next one — never shuffled):
 *  - seasonal naive: same month of the previous year;
 *  - seasonal mean: mean of the same month across all prior years.
 * MASE is MAE scaled by the seasonal-naive MAE on the same test window.
 */
export function forecastModel() {
  const series = Object.fromEntries(YEARS.map((y) => [y, nationalMonthly(y)])) as Record<
    Year,
    number[]
  >;
  const naive = (prior: Year[], m: number) => series[prior[prior.length - 1]!][m]!;
  const seasonalMean = (prior: Year[], m: number) =>
    prior.reduce((s, y) => s + series[y][m]!, 0) / prior.length;
  const testYears: Year[] = [2024, 2025];
  const errs = {
    naive: [] as number[],
    mean: [] as number[],
    rel: { naive: [] as number[], mean: [] as number[] },
  };
  for (const ty of testYears) {
    const prior = YEARS.filter((y) => y < ty) as Year[];
    for (let m = 0; m < 12; m++) {
      const a = series[ty][m]!;
      const pn = naive(prior, m),
        pmn = seasonalMean(prior, m);
      errs.naive.push(Math.abs(a - pn));
      errs.mean.push(Math.abs(a - pmn));
      errs.rel.naive.push(Math.abs(a - pn) / Math.max(pn, 1));
      errs.rel.mean.push(Math.abs(a - pmn) / Math.max(pmn, 1));
    }
  }
  const mae = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const maeNaive = mae(errs.naive),
    maeMean = mae(errs.mean);
  const best: "naive" | "mean" = maeMean <= maeNaive ? "mean" : "naive";
  const q80 = quantile(errs.rel[best], 0.8);
  const all = [...YEARS] as Year[];
  const predict = (m: number) => (best === "mean" ? seasonalMean(all, m) : naive(all, m));
  const horizon = [0, 1, 2].map((m) => {
    const p = predict(m);
    const typical = median(YEARS.map((y) => series[y][m]!));
    return {
      label: `${MONTHS[m]} 2026`,
      month: m,
      point: p,
      lo: Math.max(0, p * (1 - q80)),
      hi: p * (1 + q80),
      typical,
    };
  });
  const backtest = MONTHS.map((label, m) => ({
    label,
    actual: series[2025][m]!,
    naive: naive([2022, 2023, 2024], m),
    mean: seasonalMean([2022, 2023, 2024], m),
  }));
  return {
    series,
    best,
    maeNaive,
    maeMean,
    maseMean: maeNaive ? maeMean / maeNaive : null,
    q80,
    horizon,
    backtest,
    modelName: best === "mean" ? "Seasonal mean (climatology)" : "Seasonal naive",
    training: "Jan 2022 – Dec 2025",
    testWindows: "2024, 2025 (expanding window)",
  };
}

export function relativeLevel(point: number, typical: number): "below" | "typical" | "above" {
  if (point > typical * 1.2) return "above";
  if (point < typical * 0.8) return "below";
  return "typical";
}

/** Plain-language narrative assembled only from computed metrics. */
export function narrative() {
  const a = annual();
  return a.map((cur, i) => {
    const prev = i ? a[i - 1] : null;
    const ch = prev ? pctChange(cur.s.activity, prev.s.activity) : null;
    let mover = "";
    if (prev) {
      const prevShares = Object.fromEntries(
        regionalShares(prev.year).map((r) => [r.province, r.share]),
      );
      const deltas = regionalShares(cur.year)
        .map((r) => ({ p: r.province, d: r.share - (prevShares[r.province] ?? 0) }))
        .sort((x, y) => y.d - x.d);
      const up = deltas[0]!,
        down = deltas[deltas.length - 1]!;
      mover = ` ${up.p} gained the most share (+${up.d.toFixed(1)} pp); ${down.p} lost the most (${down.d.toFixed(1)} pp).`;
    }
    const lead =
      ch == null
        ? `Baseline year: ${cur.s.activity.toLocaleString()} harmonized activity units.`
        : `Activity ${ch >= 0 ? "rose" : "fell"} ${Math.abs(ch).toFixed(0)}% vs ${prev!.year}.`;
    return {
      year: cur.year,
      text: `${lead} Peak month ${cur.peak}; ${cur.top.province} held the largest share (${cur.top.share.toFixed(0)}%).${mover}`,
    };
  });
}

export const SENSITIVITY_CONFIGS: ThresholdConfig[] = [
  { ...DEFAULT_CONFIG, id: "cfg-0.5km-15m", name: "Strict", maxDistanceKm: 0.5, maxTimeMin: 15 },
  DEFAULT_CONFIG,
  { ...DEFAULT_CONFIG, id: "cfg-2km-60m", name: "Wide", maxDistanceKm: 2, maxTimeMin: 60 },
  {
    ...DEFAULT_CONFIG,
    id: "cfg-3km-180m",
    name: "Very wide (3 h)",
    maxDistanceKm: 3,
    maxTimeMin: 180,
  },
];
