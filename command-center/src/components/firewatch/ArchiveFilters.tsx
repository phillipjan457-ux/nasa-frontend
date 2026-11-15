import { useState, useEffect } from "react";
import { useText, useMonths } from "@/lib/firewatch/i18n";
export type ArchiveScope = {
  detectionType?: "vegetation" | "all";
  year: number;
  month: string;
  startDate: string;
  endDate: string;
  region: string;
  daynight: string;
};
export function ArchiveFilters({
  value,
  regions,
  onApply,
  monthlyOnly = false,
  includeDetectionType = false,
}: {
  value: ArchiveScope;
  regions: string[];
  onApply: (value: ArchiveScope) => void;
  monthlyOnly?: boolean;
  includeDetectionType?: boolean;
}) {
  const text = useText(),
    months = useMonths();
  const [draft, setDraft] = useState(value);
  const modeOf = (v: ArchiveScope) =>
    v.startDate || v.endDate ? "range" : v.month ? "month" : "year";
  const [mode, setMode] = useState(modeOf(value));
  useEffect(() => {
    setDraft(value);
    setMode(modeOf(value));
  }, [value]);
  const field = (key: keyof ArchiveScope, next: string | number) =>
    setDraft((v) => ({ ...v, [key]: next }));
  const appliedDraft = {
    ...draft,
    year: mode === "range" ? 0 : draft.year || (monthlyOnly ? 2022 : 0),
    month: mode === "month" ? draft.month || "1" : "",
    startDate: mode === "range" ? draft.startDate : "",
    endDate: mode === "range" ? draft.endDate : "",
  };
  const pending = Object.keys(value).some(
    (key) => value[key as keyof ArchiveScope] !== appliedDraft[key as keyof ArchiveScope],
  );
  return (
    <form
      className="map-filter-fields"
      aria-label="Archive filters"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(appliedDraft);
      }}
    >
      <div className="map-filter-controls">
        {includeDetectionType && (
          <label>
            Detection scope
            <select
              aria-label="Detection scope"
              value={draft.detectionType ?? "vegetation"}
              onChange={(e) => field("detectionType", e.target.value)}
            >
              <option value="vegetation">Presumed vegetation fires</option>
              <option value="all">All thermal detections</option>
            </select>
          </label>
        )}
        <label>
          {text("Period")}
          <select aria-label="Period mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="year">{text("Year")}</option>
            <option value="month">{text("Month")}</option>
            {!monthlyOnly && <option value="range">{text("Date range")}</option>}
          </select>
        </label>
        {mode !== "range" && (
          <label>
            {text("Year")}
            <select
              aria-label="Archive year"
              value={draft.year}
              onChange={(e) => field("year", Number(e.target.value))}
            >
              {!monthlyOnly && <option value={0}>{text("All years (2022–2025)")}</option>}
              {[2022, 2023, 2024, 2025].map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        )}
        {mode === "month" && (
          <label>
            {text("Month")}
            <select
              aria-label="Archive month"
              value={draft.month || "1"}
              onChange={(e) => field("month", e.target.value)}
            >
              {months.map((name, i) => (
                <option value={i + 1} key={i}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "range" && (
          <>
            <label>
              {text("Start date")}
              <input
                required
                type="date"
                aria-label="Start date"
                min="2022-01-01"
                max={draft.endDate || "2025-12-31"}
                value={draft.startDate}
                onChange={(e) => field("startDate", e.target.value)}
              />
            </label>
            <label>
              {text("End date")}
              <input
                required
                type="date"
                aria-label="End date"
                min={draft.startDate || "2022-01-01"}
                max="2025-12-31"
                value={draft.endDate}
                onChange={(e) => field("endDate", e.target.value)}
              />
            </label>
          </>
        )}
        {!monthlyOnly && (
          <>
            <label>
              {text("Region")}
              <select
                aria-label="Archive region"
                value={draft.region}
                onChange={(e) => field("region", e.target.value)}
              >
                <option value="">{text("All regions")}</option>
                {regions.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
            </label>
            <label>
              {text("Day/night")}
              <select
                aria-label="Day or night"
                value={draft.daynight}
                onChange={(e) => field("daynight", e.target.value)}
              >
                <option value="">{text("Day + night")}</option>
                <option value="D">{text("Day")}</option>
                <option value="N">{text("Night")}</option>
              </select>
            </label>
          </>
        )}
        <div className="flex gap-2 filter-actions">
          <button
            type="button"
            className="archive-button reset-action"
            onClick={() => {
              setDraft({
                year: 2022,
                month: "1",
                startDate: "",
                endDate: "",
                region: "",
                daynight: "",
                ...(draft.detectionType ? { detectionType: draft.detectionType } : {}),
              });
              setMode("month");
            }}
          >
            {text("Reset filters")}
          </button>
          <button type="submit" className="archive-button primary-action">
            {text("Apply")}
          </button>
        </div>
      </div>
      {pending && (
        <p className="filter-state is-pending" role="status">
          {text("Unapplied changes · select Apply to update results.")}
        </p>
      )}
    </form>
  );
}
