import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  HarmonizationResult,
  HarmonizedObservation,
  PairEvaluation,
} from "@/lib/firewatch/harmonize";
import { SENSITIVITY_CONFIGS, getYear, summarize, type Summary } from "@/lib/firewatch/analysis";
import type { Year } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
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

function histogram(xs: number[], max: number, bins: number) {
  const w = max / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    bin: +(i * w).toFixed(2),
    label: `${+(i * w).toFixed(2)}`,
    n: 0,
  }));
  for (const x of xs) out[Math.min(bins - 1, Math.floor(x / w))]!.n++;
  return out;
}

function Histo({
  title,
  desc,
  data,
  color,
  unit,
}: {
  title: string;
  desc: string;
  data: { label: string; n: number }[];
  color: string;
  unit: string;
}) {
  return (
    <div className="panel p-5">
      <PanelHeader title={title} desc={desc} />
      <div className="mt-3 h-36">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -4, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              interval={1}
              unit={unit}
            />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="n" name="Candidate pairs" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Sensors({
  s,
  obs,
  result,
  year,
  technical,
  setTechnical,
  onOpen,
}: {
  s: Summary;
  obs: HarmonizedObservation[];
  result: HarmonizationResult;
  year: Year;
  technical: boolean;
  setTechnical: (b: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const ids = useMemo(() => new Set(obs.map((o) => o.id)), [obs]);
  const cands = useMemo(() => result.candidates.filter((c) => ids.has(c.modisId)), [result, ids]);
  const assigned = useMemo(() => {
    const set = new Set<string>();
    for (const o of obs) for (const l of o.links) set.add(`${l.modisId}|${l.viirsId}`);
    return set;
  }, [obs]);
  const cfg = result.config;
  const totalStatus = s.matchedGroups + s.possibleGroups + s.modisOnly + s.viirsOnly;
  const statusBar = [
    ["Matched groups", s.matchedGroups, "bg-matched"],
    ["Possible", s.possibleGroups, "bg-possible"],
    ["MODIS-only", s.modisOnly, "bg-modis"],
    ["VIIRS-only", s.viirsOnly, "bg-viirs"],
  ] as const;

  return (
    <section id="sensors" aria-labelledby="sen-title" className="scroll-mt-32">
      <SectionHeader
        id="sen-title"
        eyebrow={t("sen_eyebrow")}
        title={t("sen_title")}
        desc={t("sen_desc")}
        right={<Tag tone="primary">Config v{cfg.version}</Tag>}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-5">
          <PanelHeader
            title="Sensor contribution"
            desc="Source detections stay separate; harmonized activity counts each group once"
          />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["MODIS", s.modis, "bg-modis", "1 km pixels · Terra/Aqua"],
              ["VIIRS", s.viirs, "bg-viirs", "375 m pixels · S-NPP, NOAA-20/21"],
              ["Harmonized", s.activity, "bg-primary", "Activity units"],
            ].map(([l, v, c, d]) => (
              <div key={l as string} className="rounded-md border border-border bg-muted/40 p-3">
                <div className="label-caps">{l}</div>
                <div className="num mt-1 text-2xl font-medium">{fmt(v as number)}</div>
                <div className={cn("mt-2 h-1 rounded-full", c as string)} />
                <div className="mt-2 text-[10.5px] text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
          <div className="label-caps mt-5">Harmonization outcome</div>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted">
            {statusBar.map(([l, v, c]) => (
              <div
                key={l}
                className={c}
                style={{ width: `${totalStatus ? (v / totalStatus) * 100 : 0}%` }}
                title={`${l}: ${v}`}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
            {statusBar.map(([l, v, c]) => (
              <span key={l} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", c)} />
                {l} <span className="num ml-auto text-foreground">{fmt(v)}</span>
              </span>
            ))}
          </div>
          <Notice tone="neutral" className="mt-4">
            <span className="font-medium text-foreground">How the sensors work together · </span>
            VIIRS's finer pixels detect smaller fires, so it usually reports more detections. A
            match means two observations are likely the same heat source — it does not prove they
            are the same physical fire.
          </Notice>
        </div>

        <div className="panel p-5">
          <PanelHeader
            title="Side-by-side metrics"
            desc="Product values in their native units — confidence scales are never merged"
          />
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="label-caps">
                <th className="py-2 text-left font-medium">Metric</th>
                <th className="text-right font-medium text-modis">MODIS</th>
                <th className="text-right font-medium text-viirs">VIIRS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(
                [
                  ["Source detections", fmt(s.modis), fmt(s.viirs)],
                  ["In matched groups", fmt(s.modisInMatched), fmt(s.viirsInMatched)],
                  ["Unmatched (sensor-only)", fmt(s.modisOnly), fmt(s.viirsOnly)],
                  [
                    "Match rate",
                    s.matchRateModis == null ? "n/c" : `${(s.matchRateModis * 100).toFixed(0)}%`,
                    s.matchRateViirs == null ? "n/c" : `${(s.matchRateViirs * 100).toFixed(0)}%`,
                  ],
                  ["Median FRP (MW)", fmt(s.modisFrp.median, 1), fmt(s.viirsFrp.median, 1)],
                  ...(technical
                    ? [
                        [
                          "Mean / p90 FRP (MW)",
                          `${fmt(s.modisFrp.mean, 1)} / ${fmt(s.modisFrp.p90, 1)}`,
                          `${fmt(s.viirsFrp.mean, 1)} / ${fmt(s.viirsFrp.p90, 1)}`,
                        ],
                        ["Median scan width (km)", fmt(s.modisScan, 2), fmt(s.viirsScan, 2)],
                        ["Footprint unavailable", "0", fmt(s.viirsNoFootprint)],
                        ["Confidence scale", "0–100", "low / nominal / high"],
                      ]
                    : []),
                ] as string[][]
              ).map(([m, a, b]) => (
                <tr key={m}>
                  <td className="py-2 text-muted-foreground">{m}</td>
                  <td className="num text-right">{a}</td>
                  <td className="num text-right">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10.5px] text-muted-foreground">
            Match rate = observations in matched groups ÷ all source observations of that sensor in
            the current filter. FRP is summarized per sensor and never summed across matched
            duplicates.
          </p>
        </div>
      </div>

      {!technical ? (
        <div className="panel mt-3 flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold">Want to see the matching evidence?</h3>
            <p className="text-xs text-muted-foreground">
              Distance and time distributions, threshold sensitivity and every candidate pair are
              available in the Responder view.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTechnical(true)}>
            Switch to Responder view
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Histo
              title="Distance between pixel centres"
              desc={`Gate-passing pairs · ≤ ${cfg.maxDistanceKm} km · haversine`}
              data={histogram(
                cands.map((c) => c.distanceKm),
                cfg.maxDistanceKm,
                10,
              )}
              color="var(--chart-2)"
              unit=""
            />
            <Histo
              title="Time difference"
              desc={`Minutes between overpasses · ≤ ${cfg.maxTimeMin} min`}
              data={histogram(
                cands.map((c) => c.dtMin),
                cfg.maxTimeMin,
                10,
              )}
              color="var(--chart-3)"
              unit=""
            />
            <Histo
              title="VIIRS footprint coverage"
              desc={`A∩B ÷ VIIRS area · ${cands.filter((c) => c.coverage == null).length} pairs without footprint`}
              data={histogram(
                cands.filter((c) => c.coverage != null).map((c) => Math.min(0.999, c.coverage!)),
                1,
                10,
              )}
              color="var(--chart-4)"
              unit=""
            />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <ConfigCard result={result} />
            <Sensitivity year={year} />
          </div>
          <CandidateTable cands={cands} assigned={assigned} onOpen={onOpen} />
        </>
      )}
    </section>
  );
}

function ConfigCard({ result }: { result: HarmonizationResult }) {
  const c = result.config;
  return (
    <div className="panel p-5">
      <PanelHeader title="Active threshold configuration" desc={`${c.name} · ${c.id}`} />
      <dl className="mt-3 divide-y divide-border text-xs">
        {[
          ["Spatial gate", `≤ ${c.maxDistanceKm} km`],
          ["Temporal gate", `≤ ${c.maxTimeMin} min`],
          ["Footprint score M", `${c.weights.d}·S_d + ${c.weights.t}·S_t + ${c.weights.f}·S_f`],
          ["Centre-only score M_c", `${c.centerWeights.d}·S_d + ${c.centerWeights.t}·S_t`],
          ["MATCHED", `M ≥ ${c.matched.toFixed(2)}`],
          ["POSSIBLE_MATCH", `${c.possible.toFixed(2)} ≤ M < ${c.matched.toFixed(2)}`],
          ["Assignment", "Greedy max-score; VIIRS → one group"],
          ["Version", c.version],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 py-1.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="num text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10.5px] text-muted-foreground">
        Prototype settings, not calibrated probabilities. A pair that fails a hard gate is never
        rescued by a high score.
      </p>
    </div>
  );
}

function Sensitivity({ year }: { year: Year }) {
  const rows = useMemo(
    () =>
      SENSITIVITY_CONFIGS.map((cfg) => ({ cfg, s: summarize(getYear(year, cfg).observations) })),
    [year],
  );
  return (
    <div className="panel p-5">
      <PanelHeader
        title="Threshold sensitivity"
        desc={`Re-running the matcher on all ${year} records with alternative gates`}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="label-caps">
              <th className="py-2 text-left font-medium">Setting</th>
              <th className="text-right font-medium">Gates</th>
              <th className="text-right font-medium">Matched</th>
              <th className="text-right font-medium">Possible</th>
              <th className="text-right font-medium">MODIS rate</th>
              <th className="text-right font-medium">VIIRS-only</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ cfg, s }) => (
              <tr
                key={cfg.id}
                className={cn(cfg.id === SENSITIVITY_CONFIGS[1]!.id && "bg-primary/5")}
              >
                <td className="py-2">
                  {cfg.name}
                  {cfg.id === SENSITIVITY_CONFIGS[1]!.id && (
                    <Tag tone="primary" className="ml-2">
                      active
                    </Tag>
                  )}
                </td>
                <td className="num text-right">
                  {cfg.maxDistanceKm} km · {cfg.maxTimeMin} min
                </td>
                <td className="num text-right">{fmt(s.matchedGroups)}</td>
                <td className="num text-right">{fmt(s.possibleGroups)}</td>
                <td className="num text-right">
                  {s.matchRateModis == null ? "n/c" : `${(s.matchRateModis * 100).toFixed(0)}%`}
                </td>
                <td className="num text-right">{fmt(s.viirsOnly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10.5px] text-muted-foreground">
        Wider windows catch persistent fires seen on later passes but raise the risk of linking
        unrelated nearby fires. A higher match rate is not higher accuracy.
      </p>
    </div>
  );
}

type PairFilter = "all" | "MATCHED" | "POSSIBLE_MATCH" | "alt";
function CandidateTable({
  cands,
  assigned,
  onOpen,
}: {
  cands: PairEvaluation[];
  assigned: Set<string>;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<PairFilter>("all");
  const [page, setPage] = useState(0);
  const per = 8;
  const rows = useMemo(
    () =>
      cands.filter((c) => {
        const isAssigned = assigned.has(`${c.modisId}|${c.viirsId}`);
        if (filter === "alt") return !isAssigned;
        if (filter === "all") return true;
        return isAssigned && c.label === filter;
      }),
    [cands, assigned, filter],
  );
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const view = rows.slice(page * per, page * per + per);
  return (
    <div className="panel mt-3 p-5">
      <PanelHeader
        title="Candidate-pair review"
        desc="Every gate-passing MODIS–VIIRS pair, including unassigned alternatives kept for audit"
        right={
          <Segmented
            label="Pair filter"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "MATCHED", label: "Matched" },
              { value: "POSSIBLE_MATCH", label: "Possible" },
              { value: "alt", label: "Not assigned" },
            ]}
          />
        }
      />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="label-caps">
              <th className="py-2 text-left font-medium">MODIS record</th>
              <th className="text-left font-medium">VIIRS record</th>
              <th className="text-right font-medium">Distance</th>
              <th className="text-right font-medium">Δt</th>
              <th className="text-right font-medium">IoU</th>
              <th className="text-right font-medium">Coverage</th>
              <th className="text-right font-medium">Score</th>
              <th className="text-left font-medium pl-4">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {view.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  No candidate pairs for this filter.
                </td>
              </tr>
            )}
            {view.map((c) => {
              const isAssigned = assigned.has(`${c.modisId}|${c.viirsId}`);
              return (
                <tr key={`${c.modisId}-${c.viirsId}`} className="hover:bg-accent/40">
                  <td className="num py-2">{c.modisId}</td>
                  <td className="num">{c.viirsId}</td>
                  <td className="num text-right">{c.distanceKm.toFixed(2)} km</td>
                  <td className="num text-right">{c.dtMin.toFixed(0)} min</td>
                  <td className="num text-right">{c.iou != null ? c.iou.toFixed(3) : "—"}</td>
                  <td className="num text-right">
                    {c.coverage != null ? c.coverage.toFixed(2) : "—"}
                  </td>
                  <td className="num text-right">
                    {c.score.toFixed(2)}{" "}
                    <span className="text-muted-foreground">
                      {c.formula === "M_center" ? "c" : "f"}
                    </span>
                  </td>
                  <td className="pl-4">
                    {!isAssigned ? (
                      <Tag>Alternative</Tag>
                    ) : c.label === "MATCHED" ? (
                      <Tag tone="matched">Matched</Tag>
                    ) : (
                      <Tag tone="possible">Possible</Tag>
                    )}
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => onOpen(c.modisId)}
                    >
                      <MapPin />
                      Map
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmt(rows.length)} pairs · score formula f = footprint, c = centre-only</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="num px-2">
            {page + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
