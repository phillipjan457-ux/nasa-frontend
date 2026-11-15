import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANOMALY_MIN_COUNT, ANOMALY_Z, type AnomalyRow } from "@/lib/firewatch/analysis";
import { COVERAGE, MONTHS, PROVINCES, YEARS, type Year } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
import { Notice, PanelHeader, SectionHeader, Segmented, Tag, fmt } from "../ui";

export function Anomalies({
  rows,
  year,
  monthFilter,
  provinceFilter,
}: {
  rows: AnomalyRow[];
  year: Year;
  monthFilter: string;
  provinceFilter: string;
}) {
  const t = useT();
  const [month, setMonth] = useState(monthFilter);
  const [province, setProvince] = useState(provinceFilter);
  const [scope, setScope] = useState<"flagged" | "all">("flagged");
  useEffect(() => setMonth(monthFilter), [monthFilter]);
  useEffect(() => setProvince(provinceFilter), [provinceFilter]);
  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (month === "all" || r.month === +month) &&
          (province === "all" || r.province === province) &&
          (scope === "all" || r.flagged),
      ),
    [rows, month, province, scope],
  );
  const [sel, setSel] = useState<AnomalyRow | null>(null);
  useEffect(() => setSel(list[0] ?? null), [list]);
  const otherYears = YEARS.filter((y) => y !== year);
  const maxBar = sel ? Math.max(sel.observed, ...sel.baseline, 1) : 1;

  return (
    <section id="anomalies" aria-labelledby="an-title" className="scroll-mt-32">
      <SectionHeader
        id="an-title"
        eyebrow={t("an_eyebrow")}
        title={t("an_title")}
        desc={t("an_desc")}
        right={
          <Tag tone="anomaly">
            {rows.filter((r) => r.flagged).length} flagged in {year}
          </Tag>
        }
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="panel p-5">
          <PanelHeader
            title="Detected anomalies"
            desc={`Robust z ≥ ${ANOMALY_Z} and ≥ ${ANOMALY_MIN_COUNT} activity units · baseline = same region-month in ${otherYears.join(", ")}`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Segmented
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: "flagged", label: "Flagged" },
                { value: "all", label: "All region-months" },
              ]}
            />
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-8 w-[120px] bg-card text-xs" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger className="h-8 w-[170px] bg-card text-xs" aria-label="Region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {PROVINCES.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-[11px] text-muted-foreground">
              Sensor: harmonized activity
            </span>
          </div>
          <div className="mt-3 max-h-[360px] overflow-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="label-caps">
                  <th className="py-2 text-left font-medium">Region</th>
                  <th className="text-left font-medium">Month</th>
                  <th className="text-right font-medium">Observed</th>
                  <th className="text-right font-medium">Baseline median</th>
                  <th className="text-right font-medium">Difference</th>
                  <th className="text-right font-medium">Robust z</th>
                  <th className="pl-4 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No region-months match these filters.
                    </td>
                  </tr>
                )}
                {list.slice(0, 60).map((r) => (
                  <tr
                    key={`${r.province}-${r.month}`}
                    onClick={() => setSel(r)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSel(r)}
                    className={cn(
                      "cursor-pointer hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
                      sel === r && "bg-primary/10",
                    )}
                  >
                    <td className="py-2 font-medium">{r.province}</td>
                    <td>
                      {MONTHS[r.month]} {year}
                    </td>
                    <td className="num text-right">{r.observed}</td>
                    <td className="num text-right">{fmt(r.baselineMedian, 1)}</td>
                    <td
                      className={cn(
                        "num text-right",
                        r.diff > 0 ? "text-viirs" : "text-muted-foreground",
                      )}
                    >
                      {r.diff > 0 ? "+" : ""}
                      {fmt(r.diff, 1)}
                    </td>
                    <td className="num text-right">{r.z.toFixed(2)}</td>
                    <td className="pl-4">
                      {r.flagged ? <Tag tone="anomaly">Flagged</Tag> : <Tag>Within range</Tag>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <PanelHeader
            title="Why was this flagged?"
            desc={sel ? `${sel.province} · ${MONTHS[sel.month]} ${year}` : "Select a row"}
          />
          {sel ? (
            <>
              <div className="mt-4 space-y-2.5">
                {[
                  { y: year, v: sel.observed, current: true },
                  ...otherYears.map((y, i) => ({ y, v: sel.baseline[i] ?? 0, current: false })),
                ].map((b) => (
                  <div key={b.y} className="text-xs">
                    <div className="flex justify-between">
                      <span className={cn(b.current && "font-medium")}>
                        {b.y}
                        {b.current ? " · observed" : " · baseline"}
                      </span>
                      <span className="num">{b.v}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          b.current
                            ? sel.flagged
                              ? "bg-anomaly"
                              : "bg-primary"
                            : "bg-muted-foreground/50",
                        )}
                        style={{ width: `${(b.v / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <dl className="mt-4 divide-y divide-border text-xs">
                {[
                  ["Baseline median", fmt(sel.baselineMedian, 1)],
                  ["MAD", fmt(sel.mad, 1)],
                  ["Robust z", sel.z.toFixed(2)],
                  ["Threshold", `z ≥ ${ANOMALY_Z}, count ≥ ${ANOMALY_MIN_COUNT}`],
                  ["Method", "Median / MAD, leave-one-year-out"],
                  [
                    "Data coverage",
                    `${COVERAGE[year].validDays}/${COVERAGE[year].totalDays} valid days`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="num text-right">{v}</dd>
                  </div>
                ))}
              </dl>
              {sel.fallback && (
                <p className="mt-2 text-[10.5px] text-possible">
                  MAD is zero for this baseline — scale fell back to max(10% of median, 1).
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {sel.province} recorded <span className="text-foreground">{sel.observed}</span>{" "}
                activity units in {MONTHS[sel.month]} {year}, versus a typical{" "}
                {fmt(sel.baselineMedian, 1)} in the same month of other years (
                {sel.diff >= 0 ? "+" : ""}
                {fmt(sel.diff, 1)}).{" "}
                {sel.flagged
                  ? "This exceeds the anomaly threshold."
                  : "This is within the expected range."}
              </p>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
              No row selected.
            </div>
          )}
          <Notice
            tone="caution"
            icon={<AlertTriangle className="h-3.5 w-3.5 text-possible" />}
            className="mt-4"
          >
            An anomaly is unusual observed activity — not a confirmed fire and not a forecast.
          </Notice>
        </div>
      </div>
    </section>
  );
}
