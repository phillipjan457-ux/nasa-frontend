// SAMPLE DATA — deterministic, seeded generator used only to preview the
// interface. It is clearly labelled in the UI and kept separate from the
// production pipeline (Python + SQLite ingestion of NASA FIRMS files).
import type { SourceObservation } from "./harmonize";

export const IS_SAMPLE_DATA = true;
export const YEARS = [2022, 2023, 2024, 2025] as const;
export type Year = (typeof YEARS)[number];
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const PROVINCES = [
  { name: "Riau", lat: 0.5, lon: 101.8, sLat: 0.7, sLon: 0.9 },
  { name: "Jambi", lat: -1.7, lon: 103.2, sLat: 0.5, sLon: 0.7 },
  { name: "South Sumatra", lat: -3.2, lon: 104.5, sLat: 0.6, sLon: 0.8 },
  { name: "West Kalimantan", lat: -0.2, lon: 110.8, sLat: 0.8, sLon: 0.8 },
  { name: "Central Kalimantan", lat: -2.0, lon: 113.5, sLat: 0.7, sLon: 1.1 },
  { name: "East Kalimantan", lat: 0.3, lon: 116.6, sLat: 0.7, sLon: 0.5 },
  { name: "East Nusa Tenggara", lat: -8.75, lon: 121.4, sLat: 0.15, sLon: 1.2 },
  { name: "South Papua", lat: -7.4, lon: 139.8, sLat: 0.5, sLon: 0.7 },
] as const;
export type Province = (typeof PROVINCES)[number]["name"];

// Province weights per year create a plausible geographic shift to analyse.
const PROVINCE_WEIGHTS: Record<Year, number[]> = {
  2022: [2, 1, 2, 4, 3, 1, 3, 2],
  2023: [3, 3, 6, 3, 5, 1, 2, 2],
  2024: [2, 1, 2, 2, 5, 2, 2, 2],
  2025: [2, 2, 3, 3, 6, 1, 2, 4],
};
// Monthly share of events (sums ≈ 1); peak month differs by year.
const MONTH_PROFILE: Record<Year, number[]> = {
  2022: [0.04, 0.03, 0.04, 0.04, 0.05, 0.07, 0.1, 0.14, 0.18, 0.14, 0.09, 0.08],
  2023: [0.015, 0.012, 0.015, 0.02, 0.03, 0.04, 0.08, 0.15, 0.22, 0.26, 0.11, 0.048],
  2024: [0.03, 0.025, 0.03, 0.035, 0.05, 0.08, 0.14, 0.22, 0.17, 0.11, 0.06, 0.05],
  2025: [0.02, 0.02, 0.025, 0.03, 0.04, 0.06, 0.12, 0.2, 0.23, 0.14, 0.07, 0.045],
};
const EVENTS: Record<Year, number> = { 2022: 240, 2023: 1180, 2024: 460, 2025: 940 };

// Sample archive metadata (would come from the source_files table).
export const COVERAGE: Record<
  Year,
  { validDays: number; totalDays: number; missingFiles: number; satellites: string[] }
> = {
  2022: {
    validDays: 362,
    totalDays: 365,
    missingFiles: 3,
    satellites: ["Terra", "Aqua", "Suomi NPP", "NOAA-20"],
  },
  2023: {
    validDays: 365,
    totalDays: 365,
    missingFiles: 0,
    satellites: ["Terra", "Aqua", "Suomi NPP", "NOAA-20", "NOAA-21"],
  },
  2024: {
    validDays: 360,
    totalDays: 366,
    missingFiles: 6,
    satellites: ["Terra", "Aqua", "Suomi NPP", "NOAA-20", "NOAA-21"],
  },
  2025: {
    validDays: 361,
    totalDays: 365,
    missingFiles: 4,
    satellites: ["Terra", "Aqua", "Suomi NPP", "NOAA-20", "NOAA-21"],
  },
};
export const PIPELINE_RUN_UTC = "2026-01-04 06:00";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function weightedIndex(r: () => number, weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) if ((x -= weights[i]!) < 0) return i;
  return weights.length - 1;
}

export function generateSourceObservations(year: Year): SourceObservation[] {
  const r = rng(year * 7919 + 17);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const out: SourceObservation[] = [];
  let seq = 0;
  const daysIn = (m: number) => new Date(Date.UTC(year, m + 1, 0)).getUTCDate();

  for (let e = 0; e < EVENTS[year]; e++) {
    const p = PROVINCES[weightedIndex(r, PROVINCE_WEIGHTS[year])]!;
    const month = weightedIndex(r, MONTH_PROFILE[year]);
    const day = 1 + Math.floor(r() * daysIn(month));
    const night = r() < 0.18;
    const baseMin = night ? (14 + Math.floor(r() * 5)) * 60 : (3 + Math.floor(r() * 4)) * 60;
    const t0 = Date.UTC(year, month, day) + (baseMin + Math.floor(r() * 60)) * 60000;
    const lat = p.lat + gauss() * p.sLat * 0.6;
    const lon = p.lon + gauss() * p.sLon * 0.6;
    const kind = r();
    const hasModis = kind < 0.62;
    const hasViirs = kind > 0.12;

    const mk = (
      sensor: "MODIS" | "VIIRS",
      la: number,
      lo: number,
      ts: number,
    ): SourceObservation => {
      const d = new Date(ts);
      const isM = sensor === "MODIS";
      const sat = isM
        ? d.getUTCHours() < 5 || d.getUTCHours() >= 14
          ? "Terra"
          : "Aqua"
        : ["Suomi NPP", "NOAA-20", "NOAA-21"][Math.floor(r() * 3)]!;
      const prefix = isM ? "MOD" : sat === "Suomi NPP" ? "VNP" : sat === "NOAA-20" ? "VJ1" : "VJ2";
      const view = r();
      const noFootprint = !isM && r() < 0.06;
      return {
        id: `${prefix}-${year}-${pad(++seq, 6)}`,
        sensor,
        satellite: sat,
        instrument: isM ? "MODIS" : "VIIRS",
        product: isM ? "MCD14ML C6.1 (1 km)" : `${prefix}14IMG C2 (375 m)`,
        lat: +la.toFixed(5),
        lon: +lo.toFixed(5),
        date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
        timeUtc: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
        ts,
        confidence: isM
          ? String(30 + Math.floor(r() * 70))
          : ["low", "nominal", "nominal", "nominal", "high"][Math.floor(r() * 5)]!,
        frp: +(isM ? Math.exp(2.6 + gauss() * 0.9) : Math.exp(1.6 + gauss() * 0.9)).toFixed(1),
        brightness: +(isM ? 305 + r() * 55 : 300 + r() * 67).toFixed(1),
        scan: noFootprint ? null : +(isM ? 1 + view * 1.8 : 0.37 + view * 0.38).toFixed(2),
        track: noFootprint ? null : +(isM ? 1 + view * 0.6 : 0.36 + view * 0.2).toFixed(2),
        daynight: night ? "N" : "D",
        province: p.name,
      };
    };

    if (hasModis) out.push(mk("MODIS", lat, lon, t0));
    if (hasViirs) {
      const n = hasModis ? (r() < 0.7 ? 1 : r() < 0.8 ? 2 : 3) : 1 + (r() < 0.3 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const far = r() < 0.14;
        const offKm = far ? 0.8 + r() * 1.4 : Math.abs(gauss()) * 0.28;
        const ang = r() * Math.PI * 2;
        const dLat = (offKm * Math.sin(ang)) / 110.574;
        const dLon = (offKm * Math.cos(ang)) / (111.32 * Math.cos((lat * Math.PI) / 180));
        const lag = (r() < 0.15 ? 20 + r() * 40 : Math.abs(gauss()) * 9) * (r() < 0.5 ? -1 : 1);
        out.push(mk("VIIRS", lat + dLat, lon + dLon, t0 + Math.round(lag) * 60000));
      }
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
