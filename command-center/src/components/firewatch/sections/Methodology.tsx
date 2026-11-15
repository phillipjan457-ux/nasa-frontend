import { Database, GitMerge, Layers, LineChart, ShieldCheck } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/firewatch/harmonize";
import { COVERAGE, PIPELINE_RUN_UTC, YEARS } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { PanelHeader, SectionHeader, Tag } from "../ui";

const STEPS = [
  [
    Database,
    "Acquire",
    "NASA FIRMS MODIS and VIIRS archive files and latest feed, registered with checksums",
  ],
  [
    Layers,
    "Standardize",
    "UTC timestamps (HHMM parsed), WGS 84 coordinates, product fields preserved",
  ],
  [GitMerge, "Harmonize", "Spatial + temporal gates, footprint overlap, versioned evidence score"],
  [LineChart, "Analyze", "Daily/monthly aggregates, robust anomalies, backtested outlook"],
  [ShieldCheck, "Deliver", "Map, reports and exports with provenance on every record"],
] as const;

const GLOSSARY = [
  [
    "Source detection",
    "One row from a FIRMS product: a pixel the sensor flagged as a thermal anomaly.",
  ],
  [
    "Matched group",
    "A MODIS detection and the VIIRS detection(s) likely seeing the same heat source. Not a verified incident.",
  ],
  [
    "Unmatched",
    "A detection with no eligible counterpart within the gates. Kept and shown, never deleted.",
  ],
  ["Activity unit", "Matched/possible groups + MODIS-only + VIIRS-only; each group counted once."],
  ["Anomaly", "Observed activity unusually high versus the same region-month in other years."],
  ["Forecast", "A statistical range for future observed activity — not a fire probability."],
];

export function Methodology() {
  const t = useT();
  const c = DEFAULT_CONFIG;
  return (
    <section id="methodology" aria-labelledby="me-title" className="scroll-mt-32">
      <SectionHeader
        id="me-title"
        eyebrow={t("me_eyebrow")}
        title={t("me_title")}
        desc={t("me_desc")}
        right={<Tag>Last pipeline run · {PIPELINE_RUN_UTC} UTC</Tag>}
      />
      <ol className="panel grid gap-5 p-5 sm:grid-cols-5">
        {STEPS.map(([Icon, title, d], i) => (
          <li key={title} className="flex gap-3 sm:flex-col">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-medium">
                <span className="num mr-1 text-[11px] text-muted-foreground">0{i + 1}</span>
                {title}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="panel p-5">
          <PanelHeader title="Data-quality rules" desc={`Matching config v${c.version}`} />
          <dl className="mt-3 divide-y divide-border text-xs">
            {[
              ["Spatial matching window", `≤ ${c.maxDistanceKm} km (haversine, R = 6371.0088 km)`],
              ["Temporal matching window", `≤ ${c.maxTimeMin} minutes (UTC)`],
              ["Footprint overlap", "Scan × track rectangles; IoU stored, VIIRS coverage scored"],
              ["Association meaning", "Candidate, not proven duplicate"],
              ["Historical scope", "Same calendar months for every year"],
              ["Anomaly baseline", "Median / MAD, leave-one-year-out"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-md bg-muted/60 p-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            S_d = max(0, 1 − d / {c.maxDistanceKm})<br />
            S_t = max(0, 1 − Δt / {c.maxTimeMin})<br />M = {c.weights.d}S_d + {c.weights.t}S_t +{" "}
            {c.weights.f}S_f
            <br />
            M_c = {c.centerWeights.d}S_d + {c.centerWeights.t}S_t (no footprint)
          </div>
        </div>
        <div className="panel p-5">
          <PanelHeader title="Important limitations" />
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {[
              "Thermal anomalies are not automatically confirmed wildfires.",
              "Cloud cover and overpass timing can hide or delay detections.",
              "Raw MODIS and VIIRS counts are not directly equivalent.",
              "Heat density shows detection concentration, not burned area.",
              "Predictive indicators are experimental review signals.",
              "Not an emergency dispatch or fire-confirmation service.",
            ].map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {l}
              </li>
            ))}
          </ul>
          <div className="label-caps mt-5">Definitions</div>
          <dl className="mt-2 space-y-2 text-xs">
            {GLOSSARY.map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="panel p-5">
          <PanelHeader title="Technology & sources" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              "NASA FIRMS",
              "MODIS MCD14ML C6.1",
              "VIIRS 375 m (S-NPP, NOAA-20/21)",
              "Python pipeline",
              "SQLite",
              "Leaflet map",
              "OpenStreetMap / CARTO",
            ].map((x) => (
              <Tag key={x}>{x}</Tag>
            ))}
          </div>
          <div className="label-caps mt-5">Archive coverage</div>
          <table className="mt-2 w-full text-xs">
            <tbody className="divide-y divide-border">
              {YEARS.map((y) => (
                <tr key={y}>
                  <td className="num py-1.5">{y}</td>
                  <td className="num text-right">
                    {COVERAGE[y].validDays}/{COVERAGE[y].totalDays} days
                  </td>
                  <td className="text-right text-muted-foreground">
                    {COVERAGE[y].missingFiles} missing files
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10.5px] text-muted-foreground">
            Live feed: not configured. Preview uses a labelled, deterministic sample archive; the
            production pipeline ingests real FIRMS files into SQLite without duplicate imports.{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://firms.modaps.eosdis.nasa.gov/"
              target="_blank"
              rel="noreferrer"
            >
              About NASA FIRMS
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
