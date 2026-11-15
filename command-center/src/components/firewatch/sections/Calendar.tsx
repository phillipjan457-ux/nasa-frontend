import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HarmonizedObservation } from "@/lib/firewatch/harmonize";
import { quantile } from "@/lib/firewatch/harmonize";
import { dailySeries, monthlyActivity } from "@/lib/firewatch/analysis";
import { MONTHS } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
import { PanelHeader, SectionHeader, Tag, fmt } from "../ui";

const LEVELS = [
  { label: "None", cls: "bg-muted/50 border-border/60" },
  { label: "Low", cls: "bg-heat-1/15 border-heat-1/35" },
  { label: "Moderate", cls: "bg-heat-2/15 border-heat-2/40" },
  { label: "High", cls: "bg-heat-3/20 border-heat-3/45" },
  { label: "Very high", cls: "bg-heat-4/25 border-heat-4/55" },
];

export function CalendarSection({
  obs,
  year,
  monthFilter,
  province,
}: {
  obs: HarmonizedObservation[];
  year: number;
  monthFilter: string;
  province: string;
}) {
  const t = useT();
  const daily = useMemo(() => dailySeries(obs), [obs]);
  const peak = useMemo(() => {
    const m = monthlyActivity(obs);
    return m.indexOf(m.reduce((a, b) => (b.activity > a.activity ? b : a)));
  }, [obs]);
  const [month, setMonth] = useState(monthFilter === "all" ? peak : +monthFilter);
  const [day, setDay] = useState<string | null>(null);
  useEffect(() => {
    setMonth(monthFilter === "all" ? peak : +monthFilter);
    setDay(null);
  }, [monthFilter, peak, year]);

  // Thresholds from this year's non-zero daily distribution (stated in legend).
  const th = useMemo((): [number, number, number] => {
    const xs = [...daily.values()].map((c) => c.activity).filter((x) => x > 0);
    const f = (x: number) => (Number.isNaN(x) ? 1 : Math.max(1, Math.round(x)));
    return [f(quantile(xs, 0.5)), f(quantile(xs, 0.75)), f(quantile(xs, 0.9))];
  }, [daily]);
  const level = (n: number) => (n === 0 ? 0 : n <= th[0] ? 1 : n <= th[1] ? 2 : n <= th[2] ? 3 : 4);

  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const key = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  const monthTotal = Array.from(
    { length: days },
    (_, i) => daily.get(key(i + 1))?.activity ?? 0,
  ).reduce((a, b) => a + b, 0);
  const sel = day ? daily.get(day) : null;
  const topRegions = sel
    ? Object.entries(sel.byProvince)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  return (
    <section id="calendar" aria-labelledby="cal-title" className="scroll-mt-32">
      <SectionHeader
        id="cal-title"
        eyebrow={t("cal_eyebrow")}
        title={t("cal_title")}
        desc={t("cal_desc")}
        right={<Tag>{province === "all" ? "Indonesia" : province}</Tag>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <PanelHeader
            title="Harmonized activity calendar"
            desc={`${MONTHS[month]} ${year} · activity units per day · ${fmt(monthTotal)} total`}
            right={
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setMonth((m) => Math.max(0, m - 1));
                    setDay(null);
                  }}
                  disabled={month === 0}
                  aria-label="Previous month"
                >
                  <ChevronLeft />
                </Button>
                <span className="num w-16 text-center text-xs">
                  {MONTHS[month]} {year}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setMonth((m) => Math.min(11, m + 1));
                    setDay(null);
                  }}
                  disabled={month === 11}
                  aria-label="Next month"
                >
                  <ChevronRight />
                </Button>
              </div>
            }
          />
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="label-caps pb-1 text-center">
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = key(d);
              const n = daily.get(k)?.activity ?? 0;
              const lv = level(n);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDay(day === k ? null : k)}
                  aria-pressed={day === k}
                  aria-label={`${MONTHS[month]} ${d}: ${n} activity units, ${LEVELS[lv]!.label}`}
                  className={cn(
                    "flex h-14 flex-col justify-between rounded-md border p-1.5 text-left transition-all hover:ring-1 hover:ring-ring sm:h-16",
                    LEVELS[lv]!.cls,
                    day === k && "ring-2 ring-primary",
                  )}
                >
                  <span className="num text-[10px] text-muted-foreground">{d}</span>
                  <span className="num text-sm font-medium leading-none">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] text-muted-foreground">
            {LEVELS.slice(1).map((l, i) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-sm border", l.cls)} />
                {l.label}{" "}
                <span className="num">
                  {i === 0
                    ? `1–${th[0]}`
                    : i === 3
                      ? `>${th[2]}`
                      : `${th[(i - 1) as 0 | 1]! + 1}–${th[i as 1 | 2]}`}
                </span>
              </span>
            ))}
            <span className="ml-auto">Thresholds: {year} daily p50 / p75 / p90</span>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <PanelHeader
            title={day ? `${day}` : "Selected day"}
            desc={day ? "Breakdown of the selected day" : "Select a day in the calendar"}
          />
          {!sel ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-xs text-muted-foreground">
              {day
                ? "No observations on this day."
                : "Tap any day to see MODIS, VIIRS, matched and regional counts."}
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["Activity units", sel.activity, "bg-primary"],
                  ["Matched groups", sel.matched, "bg-matched"],
                  ["MODIS detections", sel.modis, "bg-modis"],
                  ["VIIRS detections", sel.viirs, "bg-viirs"],
                ].map(([l, v, c]) => (
                  <div
                    key={l as string}
                    className="rounded-md border border-border bg-muted/40 p-3"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", c as string)} />
                      {l}
                    </div>
                    <div className="num mt-1 text-xl font-medium">{v}</div>
                  </div>
                ))}
              </div>
              <div className="label-caps mt-4">Top regions</div>
              <ul className="mt-2 space-y-2">
                {topRegions.map(([p, n]) => (
                  <li key={p} className="text-xs">
                    <div className="flex justify-between">
                      <span>{p}</span>
                      <span className="num">{n}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(n / sel.activity) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {sel.possible > 0 && (
                <p className="mt-3 text-[11px] text-possible">
                  {sel.possible} possible match{sel.possible > 1 ? "es" : ""} awaiting review.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
