import { useText, useMonths } from "@/lib/firewatch/i18n";
import { useEffect, useState, useRef } from "react";
const API = import.meta.env["VITE_ARCHIVE_API"] ?? "";
export function ArchiveCalendar({
  scope,
  onShowDay,
}: {
  scope: {
    detectionType?: "vegetation" | "all";
    year: number | null;
    month: string;
    region: string;
    daynight: string;
    startDate: string;
    endDate: string;
  };
  onShowDay: (date: string) => void;
}) {
  const text = useText();
  const MONTHS = useMonths("long");
  const firstYear = scope.year || (scope.startDate ? Number(scope.startDate.slice(0, 4)) : 2022);
  const lastYear = scope.year || (scope.endDate ? Number(scope.endDate.slice(0, 4)) : 2025);
  const [browsedYear, setBrowsedYear] = useState(firstYear);
  const year = Math.max(firstYear, Math.min(lastYear, browsedYear));
  const [mobileMonth, setMobileMonth] = useState(Number(scope.month) || 1);
  const [calendar, setCalendar] = useState<any>(null),
    [day, setDay] = useState<any>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const dayRequest = useRef(0);
  useEffect(() => {
    setMobileMonth(Number(scope.month) || 1);
  }, [scope.month]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setCalendar(null);
    setDay(null);
    dayRequest.current += 1;
    setDayLoading(false);
    setError("");
    const q = new URLSearchParams({ year: String(year) });
    if (scope.region) q.set("region", scope.region);
    if (scope.daynight) q.set("daynight", scope.daynight);
    q.set("detection_type", scope.detectionType ?? "vegetation");
    if (scope.startDate) q.set("start_date", scope.startDate);
    if (scope.endDate) q.set("end_date", scope.endDate);
    if (scope.month && !scope.startDate && !scope.endDate) {
      const month = Number(scope.month);
      q.set("start_date", `${year}-${String(month).padStart(2, "0")}-01`);
      q.set(
        "end_date",
        `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`,
      );
    }
    fetch(API + "/api/archive/calendar-year?" + q, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Calendar unavailable");
        return r.json();
      })
      .then((result) => {
        if (!abort.signal.aborted) setCalendar(result);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [
    year,
    scope.month,
    scope.region,
    scope.daynight,
    scope.startDate,
    scope.endDate,
    scope.detectionType,
    retry,
  ]);
  async function select(date: string) {
    const id = ++dayRequest.current;
    setDayLoading(true);
    setError("");
    const q = new URLSearchParams({ date });
    if (scope.region) q.set("region", scope.region);
    if (scope.daynight) q.set("daynight", scope.daynight);
    q.set("detection_type", scope.detectionType ?? "vegetation");
    try {
      const r = await fetch(API + "/api/archive/day?" + q);
      if (!r.ok) throw Error("Day details unavailable");
      const result = await r.json();
      if (id === dayRequest.current) setDay(result);
    } catch (e) {
      if (id === dayRequest.current) setError(String(e));
    } finally {
      if (id === dayRequest.current) setDayLoading(false);
    }
  }
  const thresholds = calendar?.thresholds ?? [];
  const daily = new Map<string, any>((calendar?.days ?? []).map((row: any) => [row.date, row]));
  const tone = (value: number | null) =>
    value == null
      ? "unknown"
      : value === 0
        ? "zero"
        : value <= thresholds[0]
          ? "low"
          : value <= thresholds[1]
            ? "moderate"
            : value <= thresholds[2]
              ? "high"
              : "very-high";
  return (
    <section id="calendar" className="scroll-mt-32">
      <div className="space-y-4">
        <div className="panel p-5">
          <div className="mb-5 flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {year} · {calendar?.activity?.toLocaleString() ?? "—"} {text("activity units")}
              </p>
            </div>
          </div>
          {firstYear !== lastYear && (
            <label className="calendar-month-picker">
              Displayed calendar year{" "}
              <select value={year} onChange={(e) => setBrowsedYear(Number(e.target.value))}>
                {[2022, 2023, 2024, 2025]
                  .filter((y) => y >= firstYear && y <= lastYear)
                  .map((y) => (
                    <option key={y}>{y}</option>
                  ))}
              </select>
            </label>
          )}
          <p className="chart-caption">
            Showing {year}. Hatched dates are outside the applied selection.
          </p>
          {error && (
            <p role="alert">
              {error}
              <button className="archive-button ml-3" onClick={() => setRetry((v) => v + 1)}>
                Reload calendar
              </button>
              <button
                className="float-right"
                aria-label="Dismiss calendar error"
                onClick={() => setError("")}
              >
                ×
              </button>
            </p>
          )}
          <div className="section-loading-container" aria-busy={loading}>
            {loading && (
              <div role="status" className="map-loading-overlay">
                <div className="map-loading-message">
                  <span className="loading-spinner" />
                  {text("Loading year activity.")}
                </div>
              </div>
            )}
            <div className="year-grid-scroll">
              <div
                className="year-grid"
                role="group"
                aria-label={text("Daily activity for the whole year")}
              >
                <span />
                {Array.from({ length: 31 }, (_, index) => (
                  <span className="year-day-number" key={index}>
                    {index + 1}
                  </span>
                ))}
                {MONTHS.map((label, index) => (
                  <div className="year-month-row" key={index}>
                    <span className="year-month-name">{label}</span>
                    {Array.from({ length: 31 }, (_, offset) => {
                      const number = offset + 1;
                      const month = index + 1;
                      if (number > new Date(Date.UTC(year, month, 0)).getUTCDate())
                        return <span key={number} />;
                      const date = `${year}-${String(month).padStart(2, "0")}-${String(number).padStart(2, "0")}`;
                      const record = daily.get(date);
                      const activity = record?.activity ?? null;
                      const inRange =
                        (!scope.month || month === Number(scope.month)) &&
                        (!scope.startDate || date >= scope.startDate) &&
                        (!scope.endDate || date <= scope.endDate);
                      const description = `${date}: ${activity === null ? text("unknown") : activity.toLocaleString() + " " + text("activity units")}`;
                      return (
                        <button
                          key={number}
                          disabled={loading || !calendar || !inRange}
                          title={description}
                          aria-label={description}
                          aria-pressed={day?.date === date}
                          className={`year-day ${!inRange ? "is-outside" : ""} calendar-${tone(activity)} ${day?.date === date ? "calendar-selected" : ""}`}
                          onClick={() => select(date)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="calendar-mobile-days-wrapper">
            <label className="calendar-month-picker">
              Browse month{" "}
              <select
                aria-label="Calendar display month"
                value={mobileMonth}
                onChange={(e) => setMobileMonth(Number(e.target.value))}
              >
                {MONTHS.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="calendar-mobile-days"
              role="group"
              aria-label="Selected month daily values"
            >
              {Array.from(
                { length: new Date(Date.UTC(year, mobileMonth, 0)).getUTCDate() },
                (_, i) => {
                  const date = `${year}-${String(mobileMonth).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                  const activity = daily.get(date)?.activity ?? null;
                  const inRange =
                    (!scope.month || mobileMonth === Number(scope.month)) &&
                    (!scope.startDate || date >= scope.startDate) &&
                    (!scope.endDate || date <= scope.endDate);
                  return (
                    <button
                      key={date}
                      disabled={loading || !calendar || !inRange}
                      aria-label={`${date}: ${activity == null ? "unavailable" : activity + " activity units"}`}
                      aria-pressed={day?.date === date}
                      className={`year-day ${!inRange ? "is-outside" : ""} calendar-${tone(activity)} ${day?.date === date ? "calendar-selected" : ""}`}
                      onClick={() => select(date)}
                    >
                      {i + 1}
                      <small>{activity == null ? "—" : activity.toLocaleString()}</small>
                    </button>
                  );
                },
              )}
            </div>
          </div>
          <div className="year-activity-legend mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            {["low", "moderate", "high", "very-high", "zero", "unknown", "outside"].map((t) => (
              <span key={t}>
                <i className={"mr-1 inline-block h-2 w-2 rounded calendar-" + t} />
                {text(t === "outside" ? "outside selection" : t.replace("-", " "))}
              </span>
            ))}
          </div>
          <details className="chart-method">
            <summary>Calendar scale</summary>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Activity colors: selected dates in the displayed year, observed daily p50/p75/p90 (
              {thresholds.map((n: number) => Math.round(n)).join(" / ")}). Missing dates remain
              unavailable; they are not confirmed zero activity. Low: up to p50; moderate: above p50
              to p75; high: above p75 to p90; very high: above p90. These are activity ranks, not
              risk levels. Zero has an outlined cell; unavailable has a dashed border. Dates outside
              your range are disabled.
            </p>
          </details>
        </div>
        <aside
          className="panel p-5 relative"
          aria-label="Selected day details"
          aria-busy={dayLoading}
        >
          {dayLoading && (
            <div role="status" className="map-loading-overlay">
              <div className="map-loading-message">
                <span className="loading-spinner" />
                Loading day details.
              </div>
            </div>
          )}
          <h3>{day?.date ?? text("Selected day")}</h3>
          {day && (
            <p className="chart-caption">
              UTC · {scope.region || "Indonesia"} ·{" "}
              {scope.daynight === "D" ? "Day" : scope.daynight === "N" ? "Night" : "Day + night"} ·
              MODIS + VIIRS S-NPP
            </p>
          )}
          {day ? (
            <>
              <p className="my-2 text-xs text-muted-foreground">
                {text(
                  "Breakdown of the selected date, under the current region/day-night filters.",
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Activity units", day.summary.activity],
                  ["Matched groups", day.summary.matched],
                  ["MODIS detections", day.summary.modis],
                  ["VIIRS detections", day.summary.viirs],
                ].map(([label, value]) => (
                  <div className="sensor-value" key={text(String(label))}>
                    <small>{text(String(label))}</small>
                    <div className="mt-2 font-mono text-2xl">{Number(value).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <h4 className="mb-3 mt-5 text-xs text-muted-foreground">{text("TOP REGIONS")}</h4>
              {day.regions.slice(0, 6).map((r: any) => (
                <div className="mb-3 text-xs" key={r.region}>
                  <div className="flex justify-between">
                    <span>{r.region}</span>
                    <span>{r.activity.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1 rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary"
                      style={{
                        width: `${day.summary.activity ? (r.activity / day.summary.activity) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="my-3 text-xs text-possible">
                {day.summary.possible.toLocaleString()} possible groups await review.
              </p>
              {day.summary.total === 0 && (
                <p className="text-xs">
                  {text(
                    "No source records for this selection; satellite coverage remains unknown.",
                  )}
                </p>
              )}
              <button className="archive-button" onClick={() => onShowDay(day.date)}>
                {text("Show this day on map")}
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {text("Tap a date to inspect MODIS, VIIRS, matched groups and regional counts.")}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
