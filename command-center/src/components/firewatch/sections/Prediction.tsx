import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FlaskConical } from "lucide-react";
import { forecastModel, relativeLevel } from "@/lib/firewatch/analysis";
import { MONTHS } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import {
  Notice,
  PanelHeader,
  SectionHeader,
  Segmented,
  Tag,
  axisTick,
  chartTooltip,
  fmt,
} from "../ui";

const LEVEL = {
  below: { label: "Below typical", tone: "modis" as const },
  typical: { label: "Typical", tone: "primary" as const },
  above: { label: "Above typical", tone: "viirs" as const },
};

export function Prediction() {
  const t = useT();
  const f = useMemo(() => forecastModel(), []);
  const [tab, setTab] = useState<"forecast" | "backtest">("forecast");
  const next = f.horizon[0]!;
  const lvl = relativeLevel(next.point, next.typical);
  const forecastData = useMemo(
    () => [
      ...MONTHS.map((m, i) => {
        const v = f.series[2025][i] ?? 0;
        return i === 11
          ? { label: `${m} 25`, observed: v, forecast: v, band: [v, v] }
          : { label: `${m} 25`, observed: v };
      }),
      ...f.horizon.map((h) => ({
        label: `${MONTHS[h.month]} 26`,
        forecast: Math.round(h.point),
        band: [Math.round(h.lo), Math.round(h.hi)],
      })),
    ],
    [f],
  );
  const scaleMax = Math.max(next.hi, next.typical * 1.6, 1);

  return (
    <section id="prediction" aria-labelledby="pr-title" className="scroll-mt-32">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div>
          <SectionHeader
            id="pr-title"
            eyebrow={t("pr_eyebrow")}
            title={t("pr_title")}
            desc={t("pr_desc")}
          />
          <Notice
            tone="caution"
            icon={<FlaskConical className="h-3.5 w-3.5 text-possible" />}
            className="-mt-2"
          >
            Experimental signal — not a weather forecast, disaster warning, fire probability, or
            prediction of fire locations.
          </Notice>
        </div>
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-caps">Next-month outlook · {next.label}</div>
              <div className="num mt-3 text-3xl font-medium">
                {fmt(next.lo)}–{fmt(next.hi)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                harmonized activity units (80% interval) · point {fmt(next.point, 0)}
              </div>
            </div>
            <Tag tone={LEVEL[lvl].tone}>{LEVEL[lvl].label}</Tag>
          </div>
          <div className="relative mt-5 h-2 rounded-full bg-muted">
            <div
              className="absolute h-full rounded-full bg-primary/50"
              style={{
                left: `${(next.lo / scaleMax) * 100}%`,
                width: `${((next.hi - next.lo) / scaleMax) * 100}%`,
              }}
            />
            <div
              className="absolute -top-1 h-4 w-0.5 bg-foreground"
              style={{ left: `${(next.typical / scaleMax) * 100}%` }}
              title="Typical (4-year median)"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-primary/50" />
              Forecast range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-foreground" />
              Typical {fmt(next.typical, 0)} (2022–2025 median)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <PanelHeader
            title={tab === "forecast" ? "Observed vs forecast" : "Chronological backtest · 2025"}
            desc={
              tab === "forecast"
                ? "Monthly harmonized activity, 2025 observed and 3-month forecast with 80% interval"
                : "Models trained on 2022–2024 only, compared with what 2025 actually observed"
            }
            right={
              <Segmented
                label="Chart"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "forecast", label: "Forecast" },
                  { value: "backtest", label: "Backtest" },
                ]}
              />
            }
          />
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              {tab === "forecast" ? (
                <ComposedChart data={forecastData} margin={{ left: -8, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                  <Tooltip {...chartTooltip} />
                  <Area
                    dataKey="band"
                    name="80% interval"
                    stroke="none"
                    fill="var(--chart-1)"
                    fillOpacity={0.18}
                  />
                  <Line
                    dataKey="observed"
                    name="Observed"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    dataKey="forecast"
                    name="Forecast"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 2 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </ComposedChart>
              ) : (
                <ComposedChart data={f.backtest} margin={{ left: -8, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                  <Tooltip {...chartTooltip} />
                  <Line
                    dataKey="actual"
                    name="Observed 2025"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    dataKey="mean"
                    name="Seasonal mean"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                  <Line
                    dataKey="naive"
                    name="Seasonal naive"
                    stroke="var(--chart-2)"
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    dot={false}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-5">
          <PanelHeader
            title="Model card"
            desc="What produced this outlook"
            right={<Tag tone="primary">Selected by MAE</Tag>}
          />
          <dl className="mt-3 divide-y divide-border text-xs">
            {[
              ["Model", f.modelName],
              ["Target", "Observed harmonized activity / month"],
              ["Region", "Indonesia (national)"],
              ["Training period", f.training],
              ["Backtest windows", f.testWindows],
              ["Horizon", "3 months"],
              ["MAE · seasonal mean", fmt(f.maeMean, 1)],
              ["MAE · seasonal naive", fmt(f.maeNaive, 1)],
              ["MASE (vs naive)", f.maseMean == null ? "n/c" : f.maseMean.toFixed(2)],
              ["Interval", `±${(f.q80 * 100).toFixed(0)}% (80th pct. backtest error)`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="num text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10.5px] text-muted-foreground">
            Only four seasons of data: treat as indicative. Forecasts observed detections, not
            burned area, ignitions or severity.
          </p>
        </div>
      </div>
    </section>
  );
}
