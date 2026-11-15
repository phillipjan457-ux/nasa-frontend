import { ValueTable } from "./AnalysisUI";
import { Link } from "@tanstack/react-router";
import { useText, useMonths } from "@/lib/firewatch/i18n";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
export function ActivityOverview({
  monthly,
  anomalies,
  label,
  technical = false,
}: {
  monthly: any[];
  anomalies: any;
  label: string;
  technical?: boolean;
}) {
  const text = useText();
  const MONTHS = useMonths();
  return (
    <div className={anomalies?.data?.length ? "grid gap-8 lg:grid-cols-[1.6fr_1fr]" : "space-y-6"}>
      <div className="panel p-5">
        <h3>{text("Harmonized activity")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Monthly activity units · {text(String(label))}
        </p>
        {monthly.length === 1 ? (
          <dl className="my-5 max-w-sm rounded-lg border border-border bg-card px-5 py-4" aria-label={text("Selected-period activity")}>
            <dt className="text-sm text-muted-foreground">{text("Activity units")}</dt>
            <dd className="mt-2 font-mono text-3xl text-primary">
              {monthly[0].activity == null ? text("Unavailable") : fmt(monthly[0].activity)}
            </dd>
          </dl>
        ) : <div className="mt-5 h-[270px]">
          <ResponsiveContainer>
            <BarChart data={monthly} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis width={55} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
              />
              <Bar
                maxBarSize={48}
                name="Activity units"
                dataKey="activity"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>}
        <ValueTable
          caption="Harmonized activity · selected period"
          headers={["Month", "Activity units"]}
          rows={monthly.map((r) => [r.label, r.activity == null ? "Unavailable" : fmt(r.activity)])}
        />
        <details className="chart-method">
          <summary>How activity is counted</summary>
          <p className="chart-caption">
            Calendar-month totals within the applied selection; multiple selected years are combined
            by month. Unavailable values are gaps, never inferred zeros.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {text(
              "Matched/possible groups counted once, plus unmatched observations. All selected records contribute.",
            )}
          </p>
        </details>
      </div>
      {!!anomalies?.data?.length && (
        <div className="panel p-5">
          <h3>{text("Anomaly review")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {anomalies
              ? `Exploratory region-month signals · ${anomalies.year}`
              : "Independent region-month analysis"}
          </p>
          <p className="chart-caption">
            Anomaly comparisons use complete region-months, day + night. They do not apply
            partial-day or custom-date filters.
          </p>
          {anomalies?.data?.slice(0, 4).map((r: any) => (
            <Link
              to="/$page"
              params={{ page: "anomalies" }}
              className="my-4 flex justify-between border-b border-border pb-3 text-xs"
              key={r.region + r.month}
            >
              <span>
                {r.region}
                <small className="mt-1 block text-muted-foreground">
                  {MONTHS[r.month - 1]} · {fmt(r.observed)} vs median {fmt(r.median)}
                </small>
              </span>
              <span className="text-anomaly">
                {technical ? `z ${r.z.toFixed(1)}` : text("Above usual activity")} ›
              </span>
            </Link>
          ))}
          <p className="chart-caption">
            {text(
              "Anomalies are statistical signals, not confirmed incidents or official warnings. Coverage is unknown.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
export function SensorHarmonization({ summary: s }: { summary: any }) {
  const text = useText();
  const outcomes = [
    ["Matched groups", s?.matched, "var(--matched)"],
    ["Possible", s?.possible, "var(--possible)"],
    ["MODIS-only", s?.modis_only, "var(--modis)"],
    ["VIIRS-only", s?.viirs_only, "var(--viirs)"],
  ] as const;
  return (
    <section id="sensors" className="scroll-mt-32">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-5">
          <h3>{text("Sensor contribution")}</h3>
          <p className="my-2 text-xs text-muted-foreground">
            {text("Source detections stay separate; activity counts each provisional group once.")}
          </p>
          <div className="my-5 grid grid-cols-3 gap-2">
            {[
              ["MODIS", s?.modis, "var(--modis)", "Terra / Aqua"],
              ["VIIRS", s?.viirs, "var(--viirs)", "Suomi-NPP"],
              ["HARMONIZED", s?.activity, "var(--primary)", "Activity units"],
            ].map(([label, value, color, caption]) => (
              <div className="sensor-value" key={String(label)}>
                <small className="text-muted-foreground">{text(String(label))}</small>
                <div className="my-3 font-mono text-2xl">{fmt(value as number)}</div>
                <div className="mb-2 h-1 rounded" style={{ background: String(color) }} />
                <small className="text-[10px] text-muted-foreground">{caption}</small>
              </div>
            ))}
          </div>
          <div className="text-[10px] tracking-wider text-muted-foreground">
            {text("HARMONIZATION OUTCOME")}
          </div>
          <div
            className="my-2 flex h-3 overflow-hidden rounded"
            aria-label="Harmonization outcome proportions"
          >
            {outcomes.map(([label, value, color]) => (
              <div
                key={text(String(label))}
                title={`${text(String(label))}: ${fmt(value)}`}
                style={{
                  background: color,
                  width: `${s?.activity ? ((value ?? 0) / s.activity) * 100 : 0}%`,
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-[10px]">
            {outcomes.map(([label, value, color]) => (
              <span key={text(String(label))}>
                <i className="legend-dot !h-2 !w-2" style={{ background: color }} />
                {text(String(label))} <b className="ml-1">{fmt(value)}</b>
              </span>
            ))}
          </div>
          <p className="chart-caption">
            {text(
              "VIIRS has finer spatial sampling and often reports more detections. A candidate match does not prove the same physical fire.",
            )}
          </p>
        </div>
        <div className="panel p-5">
          <h3>{text("Side-by-side metrics")}</h3>
          <p className="my-2 text-xs text-muted-foreground">
            {text("Native product values; confidence scales are never merged.")}
          </p>
          <table className="archive-table">
            <thead>
              <tr>
                <th>{text("Metric")}</th>
                <th className="text-modis">{text("MODIS")}</th>
                <th className="text-viirs">{text("VIIRS")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Source detections", s?.modis, s?.viirs],
                ["In matched groups", s?.modis_matched, s?.viirs_matched],
                ["Unmatched (sensor-only)", s?.modis_only, s?.viirs_only],
                [
                  "Match rate",
                  s?.modis ? `${((100 * s.modis_matched) / s.modis).toFixed(1)}%` : "—",
                  s?.viirs ? `${((100 * s.viirs_matched) / s.viirs).toFixed(1)}%` : "—",
                ],
                [
                  "Median FRP (MW)",
                  s?.frp_by_sensor?.MODIS?.median,
                  s?.frp_by_sensor?.VIIRS?.median,
                ],
              ].map(([label, m, v]) => (
                <tr key={String(label)}>
                  <td>{text(String(label))}</td>
                  <td>{typeof m === "string" ? m : fmt(m)}</td>
                  <td>{typeof v === "string" ? v : fmt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-xs text-muted-foreground">
            {text(
              "Match rate = matched source observations ÷ selected source observations for that sensor. Groups are anchored on MODIS date and region. FRP is summarized separately, never summed across duplicate views.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
export function SituationShift({
  history,
  regions,
  region,
}: {
  history: any[];
  regions: string[];
  region: string;
}) {
  const text = useText();
  const MONTHS = useMonths();
  const [metric, setMetric] = useState("activity");
  const max = Math.max(1, ...history.map((r) => r.summary.activity));
  const min = Math.min(...history.map((r) => r.summary.activity));
  return (
    <section id="history" className="scroll-mt-32">
      {history.length === 0 && (
        <p role="status">No history results available. Check loading or request errors above.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {history.map((r, i) => {
          const peak = r.monthly.reduce((a: any, b: any) => (b.activity > a.activity ? b : a), {
            activity: -1,
            period: 1,
          });
          return (
            <div className="panel p-4" key={r.year}>
              <div className="flex justify-between">
                <h3>{r.year}</h3>
                <span className="rounded bg-muted px-2 text-[9px]">
                  {r.summary.activity === max
                    ? "HIGHEST"
                    : r.summary.activity === min
                      ? "LOWEST"
                      : "PEAK " + MONTHS[peak.period - 1]}
                </span>
              </div>
              <div className="mt-4 font-mono text-3xl">{fmt(r.summary.activity)}</div>
              <small className="text-muted-foreground">{text("harmonized activity units")}</small>
              <div className="mb-3 mt-4 h-1 rounded bg-muted">
                <div
                  className="h-full rounded bg-primary"
                  style={{ width: `${(r.summary.activity / max) * 100}%` }}
                />
              </div>
              <div className="mb-2 flex h-1 overflow-hidden rounded">
                <div
                  style={{
                    width: `${(r.summary.modis / r.summary.total) * 100}%`,
                    background: "var(--modis)",
                  }}
                />
                <div className="flex-1 bg-viirs" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                MODIS {fmt(r.summary.modis)} · VIIRS {fmt(r.summary.viirs)}
              </p>
              <div className="mt-4 border-t border-border pt-3 text-xs">
                {r.summary.change_pct == null
                  ? "Baseline year"
                  : `${r.summary.change_pct >= 0 ? "+" : ""}${r.summary.change_pct.toFixed(1)}% vs ${r.year - 1}`}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {r.summary.days_with_records} dates with records · coverage unknown
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <h3>{text("Monthly comparison · same calendar months")}</h3>
            <select
              aria-label="History metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="activity">{text("Activity")}</option>
              <option value="matched">{text("Matched")}</option>
              <option value="modis_only">{text("MODIS-only")}</option>
              <option value="viirs_only">{text("VIIRS-only")}</option>
            </select>
          </div>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer>
              <LineChart
                accessibilityLayer
                data={MONTHS.map((label, i) => ({
                  label,
                  ...Object.fromEntries(
                    history.map((r) => [
                      String(r.year),
                      r.monthly.find((m: any) => m.period === i + 1)?.[metric] ?? null,
                    ]),
                  ),
                }))}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis width={55} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                />
                <Legend />
                {[2022, 2023, 2024, 2025].map((y, i) => (
                  <Line
                    key={y}
                    name={String(y)}
                    dataKey={String(y)}
                    stroke={
                      ["var(--modis)", "var(--viirs)", "var(--possible)", "var(--primary)"][i]
                    }
                    strokeDasharray={[undefined, "6 3", "2 3", "10 4 2 4"][i]}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <h3>
            {text(
              region
                ? "Regional share of selected activity"
                : "Regional share of national activity",
            )}
          </h3>
          <p className="my-2 text-xs text-muted-foreground">
            {text("Percent of each year's activity units · change in percentage points.")}
          </p>
          {region && (
            <p className="chart-caption">
              Shares use {region}'s total, not Indonesia's total. Choose all regions to compare
              national shares.
            </p>
          )}
          <div className="max-h-[310px] overflow-auto">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>{text("Region")}</th>
                  {history.map((r) => (
                    <th key={r.year}>{String(r.year).slice(2)}</th>
                  ))}
                  <th>2024 → 2025 (pp)</th>
                </tr>
              </thead>
              <tbody>
                {[...regions]
                  .filter((name) => !region || name === region)
                  .sort((a, b) => {
                    const latest = history.find((r) => r.year === 2025);
                    return (
                      (latest?.regions.find((r: any) => r.region === b)?.activity ?? 0) -
                      (latest?.regions.find((r: any) => r.region === a)?.activity ?? 0)
                    );
                  })
                  .map((name) => {
                    const share = (r: any) =>
                      r?.summary.activity
                        ? ((r.regions.find((p: any) => p.region === name)?.activity ?? 0) /
                            r.summary.activity) *
                          100
                        : null;
                    const latest = share(history.find((r) => r.year === 2025)),
                      priorShare = share(history.find((r) => r.year === 2024));
                    const delta = latest == null || priorShare == null ? null : latest - priorShare;
                    return (
                      <tr key={name}>
                        <td>{name}</td>
                        {history.map((r) => (
                          <td key={r.year}>{share(r)?.toFixed(1) ?? "Unavailable"}</td>
                        ))}
                        <td>
                          {delta == null
                            ? "Unavailable"
                            : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ValueTable
        caption="History · same calendar months"
        headers={["Month", ...history.map((r) => String(r.year))]}
        rows={MONTHS.map((label, i) => [
          label,
          ...history.map((r) => fmt(r.monthly.find((m: any) => m.period === i + 1)?.[metric])),
        ])}
      />
      <div className="history-takeaways">
        <h3 className="mb-4">Year notes</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {history.map((r, i) => {
            const peak = r.monthly.reduce((a: any, b: any) => (b.activity > a.activity ? b : a), {
              activity: -1,
              period: 1,
            });
            const prior = history[i - 1];
            const changes = r.regions
              .map((p: any) => ({
                name: p.region,
                delta:
                  (r.summary.activity ? p.activity / r.summary.activity : 0) * 100 -
                  (prior?.summary.activity
                    ? (prior.regions.find((x: any) => x.region === p.region)?.activity ?? 0) /
                      prior.summary.activity
                    : 0) *
                    100,
              }))
              .sort((a: any, b: any) => Math.abs(b.delta) - Math.abs(a.delta));
            return (
              <p className="text-xs leading-relaxed" key={r.year}>
                <b>{r.year}</b>
                <br />
                {r.summary.change_pct == null
                  ? "Baseline year."
                  : `Activity ${r.summary.change_pct >= 0 ? "rose" : "fell"} ${Math.abs(r.summary.change_pct).toFixed(1)}% vs ${r.year - 1}.`}{" "}
                {peak.activity >= 0
                  ? `Peak observed month ${MONTHS[peak.period - 1]}. `
                  : "No monthly observations available. "}
                {r.regions.length > 0 && `${r.regions[0].region} held the largest share. `}
                {prior && changes.length > 0 && !region
                  ? `${changes[0].name}: largest regional share change (${changes[0].delta >= 0 ? "+" : ""}${changes[0].delta.toFixed(1)} pp).`
                  : ""}
              </p>
            );
          })}
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">
          {text(
            "Changes describe satellite detection concentration, not proven changes in fire incidents or burned area. Product versions and unknown observation coverage affect comparisons.",
          )}
        </p>
      </div>
    </section>
  );
}
