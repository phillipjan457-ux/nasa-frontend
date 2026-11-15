import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { HarmonizedObservation } from "@/lib/firewatch/harmonize";
import {
  dailySeries,
  monthlyActivity,
  type AnomalyRow,
  type Summary,
} from "@/lib/firewatch/analysis";
import { MONTHS } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { Notice, PanelHeader, SectionHeader, Stat, Tag, axisTick, chartTooltip, fmt } from "../ui";

export function Overview({
  s,
  obs,
  year,
  month,
  technical,
  anomalies,
  periodLabel,
}: {
  s: Summary;
  obs: HarmonizedObservation[];
  year: number;
  month: string;
  technical: boolean;
  anomalies: AnomalyRow[];
  periodLabel: string;
}) {
  const t = useT();
  const series = useMemo(() => {
    if (month === "all")
      return monthlyActivity(obs).map((r) => ({
        label: r.month,
        activity: r.activity,
        modis: r.modis,
        viirs: r.viirs,
      }));
    const d = dailySeries(obs);
    const m = +month;
    const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => {
      const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const c = d.get(key);
      return {
        label: String(i + 1),
        activity: c?.activity ?? 0,
        modis: c?.modis ?? 0,
        viirs: c?.viirs ?? 0,
      };
    });
  }, [obs, month, year]);
  const peak = series.reduce((x, y) => (y.activity > x.activity ? y : x), series[0]!);
  const total = series.reduce((x, y) => x + y.activity, 0);
  const flagged = anomalies
    .filter((a) => a.flagged && (month === "all" || a.month === +month))
    .slice(0, 4);

  return (
    <section id="overview" aria-labelledby="ov-title" className="scroll-mt-32">
      <SectionHeader
        id="ov-title"
        eyebrow={t("ov_eyebrow")}
        title={t("ov_title")}
        desc={t("ov_desc")}
        right={<Tag>{periodLabel}</Tag>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          accent
          label={technical ? "Harmonized activity units" : "Places with satellite heat signals"}
          value={fmt(s.activity)}
          sub={
            technical
              ? "Groups + MODIS-only + VIIRS-only, each group once"
              : "Satellite signals, not confirmed fires"
          }
          dot="bg-primary"
        />
        <Stat
          label="High-energy signals"
          value={fmt(s.highFrp)}
          sub="Activity units with FRP ≥ 50 MW"
          dot="bg-heat-4"
        />
        <Stat
          label={technical ? "Matched groups" : "Seen by both satellites"}
          value={fmt(s.matchedGroups)}
          sub={`${fmt(s.possibleGroups)} possible matches await review`}
          dot="bg-matched"
        />
        <Stat
          label="Regions with anomalies"
          value={fmt(s.anomalyProvinces)}
          sub="Above same-month baseline"
          dot="bg-anomaly"
        />
      </div>
      {technical && (
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="MODIS source detections"
            value={fmt(s.modis)}
            sub={`${fmt(s.modisInMatched)} in matched groups · ${fmt(s.modisOnly)} MODIS-only`}
            dot="bg-modis"
          />
          <Stat
            label="VIIRS source detections"
            value={fmt(s.viirs)}
            sub={`${fmt(s.viirsInMatched)} in matched groups · ${fmt(s.viirsOnly)} VIIRS-only`}
            dot="bg-viirs"
          />
          <Stat
            label="MODIS match rate"
            value={s.matchRateModis == null ? "n/c" : `${(s.matchRateModis * 100).toFixed(0)}%`}
            sub="MODIS in matched groups ÷ all MODIS"
          />
          <Stat
            label="VIIRS match rate"
            value={s.matchRateViirs == null ? "n/c" : `${(s.matchRateViirs * 100).toFixed(0)}%`}
            sub="VIIRS in matched groups ÷ all VIIRS"
          />
        </div>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <PanelHeader
            title="Harmonized activity"
            desc={
              month === "all"
                ? `Monthly activity units · ${year}`
                : `Daily activity units · ${MONTHS[+month]} ${year}`
            }
            right={
              total > 0 ? (
                <span className="num text-[11px] text-muted-foreground">
                  Peak{" "}
                  <span className="text-foreground">
                    {month === "all" ? peak.label : `${MONTHS[+month]} ${peak.label}`}
                  </span>{" "}
                  · {fmt(peak.activity)}
                </span>
              ) : null
            }
          />
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ left: -8, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  interval={month === "all" ? 0 : 3}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                <Bar
                  dataKey="activity"
                  name="Activity units"
                  fill="var(--chart-1)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-chart-1" />
              Harmonized activity units
            </span>
            <span>Candidate matches counted once</span>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <PanelHeader
            title="Anomaly review"
            desc="Signals requiring attention"
            right={<Tag tone="anomaly">{flagged.length} open</Tag>}
          />
          <ul className="mt-3 flex-1 divide-y divide-border">
            {flagged.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                No region-months above the anomaly threshold for this period.
              </li>
            )}
            {flagged.map((a) => (
              <li key={`${a.province}-${a.month}`}>
                <a
                  href="#anomalies"
                  className="group flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-anomaly" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{a.province}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {MONTHS[a.month]} · {a.observed} vs median {fmt(a.baselineMedian, 1)}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
                    <span className="num text-anomaly">z {a.z.toFixed(1)}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <Notice tone="caution" className="mt-3">
            Anomalies are statistical signals, not confirmed incidents or official warnings.
          </Notice>
        </div>
      </div>
    </section>
  );
}
