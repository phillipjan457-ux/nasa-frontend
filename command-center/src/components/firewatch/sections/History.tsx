import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { annual, narrative, regionalShares } from "@/lib/firewatch/analysis";
import { pctChange } from "@/lib/firewatch/harmonize";
import { COVERAGE, MONTHS, PROVINCES, YEARS } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
import {
  PanelHeader,
  SectionHeader,
  Segmented,
  Tag,
  axisTick,
  chartTooltip,
  fmt,
  fmtPct,
} from "../ui";

const YEAR_COLORS = ["var(--chart-2)", "var(--chart-3)", "var(--chart-5)", "var(--chart-1)"];

export function History() {
  const t = useT();
  const a = useMemo(() => annual(), []);
  const story = useMemo(() => narrative(), []);
  const [metric, setMetric] = useState<"activity" | "matched" | "modisOnly" | "viirsOnly">(
    "activity",
  );
  const max = Math.max(...a.map((y) => y.s.activity));
  const minYear = a.reduce((x, y) => (y.s.activity < x.s.activity ? y : x)).year;
  const maxYear = a.reduce((x, y) => (y.s.activity > x.s.activity ? y : x)).year;
  const chart = MONTHS.map((m, i) =>
    Object.fromEntries([["month", m], ...a.map((y) => [String(y.year), y.monthly[i]![metric]])]),
  );
  const shares = useMemo(
    () =>
      Object.fromEntries(
        YEARS.map((y) => [y, Object.fromEntries(regionalShares(y).map((r) => [r.province, r]))]),
      ),
    [],
  );

  return (
    <section id="history" aria-labelledby="hi-title" className="scroll-mt-32">
      <SectionHeader
        id="hi-title"
        eyebrow={t("hi_eyebrow")}
        title={t("hi_title")}
        desc={t("hi_desc")}
        right={<Tag>Indonesia · MODIS + VIIRS</Tag>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {a.map((y, i) => {
          const ch = i ? pctChange(y.s.activity, a[i - 1]!.s.activity) : null;
          const cov = COVERAGE[y.year];
          const modisShare = y.s.modis / (y.s.modis + y.s.viirs);
          return (
            <div key={y.year} className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="num text-sm font-medium">{y.year}</span>
                {y.year === maxYear ? (
                  <Tag tone="viirs">Highest</Tag>
                ) : y.year === minYear ? (
                  <Tag tone="modis">Lowest</Tag>
                ) : (
                  <Tag>Peak {y.peak}</Tag>
                )}
              </div>
              <div className="num mt-3 text-[1.7rem] font-medium leading-none">
                {fmt(y.s.activity)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                harmonized activity units
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(y.s.activity / max) * 100}%` }}
                />
              </div>
              <div
                className="mt-3 flex h-1 overflow-hidden rounded-full"
                title="MODIS vs VIIRS share of source detections"
              >
                <div className="bg-modis" style={{ width: `${modisShare * 100}%` }} />
                <div className="flex-1 bg-viirs" />
              </div>
              <div className="num mt-1.5 text-[10.5px] text-muted-foreground">
                MODIS {fmt(y.s.modis)} · VIIRS {fmt(y.s.viirs)}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px]">
                {ch == null ? (
                  <span className="text-muted-foreground">Baseline year</span>
                ) : (
                  <span
                    className={cn(
                      "num flex items-center gap-0.5",
                      ch > 0 ? "text-viirs" : "text-primary",
                    )}
                  >
                    {ch > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {fmtPct(ch)} vs {y.year - 1}
                  </span>
                )}
                <span
                  className="num text-muted-foreground"
                  title={`${cov.missingFiles} missing source files`}
                >
                  {cov.validDays}/{cov.totalDays} days
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <PanelHeader
            title="Monthly comparison · same calendar months"
            desc="Each line is one archive year"
            right={
              <Segmented
                label="Metric"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "activity", label: "Activity" },
                  { value: "matched", label: "Matched" },
                  { value: "modisOnly", label: "MODIS-only" },
                  { value: "viirsOnly", label: "VIIRS-only" },
                ]}
              />
            }
          />
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ left: -8, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                <Tooltip {...chartTooltip} />
                {YEARS.map((y, i) => (
                  <Line
                    key={y}
                    dataKey={String(y)}
                    stroke={YEAR_COLORS[i]}
                    strokeWidth={y === 2025 ? 2.4 : 1.6}
                    dot={false}
                  />
                ))}
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <PanelHeader
            title="Regional share of national activity"
            desc="Percent of each year's harmonized activity"
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="label-caps">
                  <th className="py-2 text-left font-medium">Region</th>
                  {YEARS.map((y) => (
                    <th key={y} className="text-right font-medium">
                      {String(y).slice(2)}
                    </th>
                  ))}
                  <th className="text-right font-medium">Δ 24→25</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROVINCES.map((p) => {
                  const d = shares[2025]![p.name]!.share - shares[2024]![p.name]!.share;
                  return (
                    <tr key={p.name}>
                      <td className="py-1.5">{p.name}</td>
                      {YEARS.map((y) => {
                        const v = shares[y]![p.name]!.share;
                        return (
                          <td key={y} className="num text-right">
                            <span
                              className="rounded px-1"
                              style={{
                                background: `color-mix(in oklab, var(--primary) ${Math.min(60, v * 2)}%, transparent)`,
                              }}
                            >
                              {v.toFixed(0)}
                            </span>
                          </td>
                        );
                      })}
                      <td
                        className={cn(
                          "num text-right",
                          d > 0 ? "text-viirs" : d < 0 ? "text-primary" : "",
                        )}
                      >
                        {d > 0 ? "+" : ""}
                        {d.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] text-muted-foreground">
            A shift in observed detection concentration is not proof of a shift in actual fire
            occurrence.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-banner p-5 text-banner-foreground">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-80">
            What changed? · generated from computed metrics
          </span>
        </div>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {story.map((s, i) => (
            <li key={s.year} className="relative">
              <div className="flex items-center gap-2">
                <span className="num text-sm font-semibold">{s.year}</span>
                {i < story.length - 1 && (
                  <span className="hidden h-px flex-1 bg-banner-foreground/25 lg:block" />
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed opacity-85">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[10.5px] opacity-70">
          Describes satellite-observed activity; cloud cover, overpass timing and sensor
          availability affect counts. Lower detections are not proof of successful prevention.
        </p>
      </div>
    </section>
  );
}
