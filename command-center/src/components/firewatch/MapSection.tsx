import { lazy, Suspense } from "react";
import { Archive, Info, Pause, Play, Radio, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HarmonizedObservation } from "@/lib/firewatch/harmonize";
import type { Summary } from "@/lib/firewatch/analysis";
import { MONTHS, PROVINCES, YEARS, PIPELINE_RUN_UTC } from "@/lib/firewatch/sample-data";
import { useT } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
import { DENSITY_BINS, DENSITY_CELL_DEG, type MapView } from "./FireMap";
import { DetailPanel } from "./DetailPanel";
import { ChipToggle, Dot, Notice, Segmented, fmt } from "./ui";

const FireMap = lazy(() => import("./FireMap").then((m) => ({ default: m.FireMap })));

export interface Filters {
  mode: "live" | "archive";
  year: number;
  month: string;
  province: string;
  daynight: "all" | "D" | "N";
}

export function MapSection(props: {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  reset: () => void;
  view: MapView;
  setView: (v: MapView) => void;
  points: boolean;
  setPoints: (b: boolean) => void;
  density: boolean;
  setDensity: (b: boolean) => void;
  playing: boolean;
  togglePlay: () => void;
  technical: boolean;
  mounted: boolean;
  obs: HarmonizedObservation[];
  summary: Summary;
  byId: Map<string, HarmonizedObservation>;
  selected: HarmonizedObservation | null;
  setSelected: (o: HarmonizedObservation | null) => void;
}) {
  const t = useT();
  const { filters: f, setFilters, technical, summary: s } = props;
  const latest = s.latest;
  const trigger = "h-8 text-xs bg-card";
  return (
    <section id="map" aria-labelledby="map-title" className="scroll-mt-32">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                f.mode === "live" ? "bg-muted-foreground" : "animate-pulse bg-primary",
              )}
            />
            {f.mode === "live" ? t("live_ops") : `${t("archive_ops")} · ${f.year}`}
          </div>
          <h1 id="map-title" className="mt-2 text-3xl font-medium sm:text-[2.1rem]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="label-caps">{t("latest_acq")}</div>
          <div className="num text-lg font-medium">
            {latest ? `${latest.date.slice(5)} ${latest.timeUtc} UTC` : "—"}
          </div>
          <div className="num text-[10.5px] text-muted-foreground">
            {t("retrieved")} {PIPELINE_RUN_UTC} UTC · periodic overpasses
          </div>
        </div>
      </div>

      <Notice tone="info" icon={<Info className="h-3.5 w-3.5" />} className="mb-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
          {technical ? t("resp_banner_t") : t("public_banner_t")}
        </span>
        <span className="ml-2">{technical ? t("resp_banner") : t("public_banner")}</span>
      </Notice>

      {/* Filter bar */}
      <div className="panel mb-3 flex flex-wrap items-center gap-2 p-2">
        <Segmented
          label="Data mode"
          value={f.mode}
          onChange={(v) => setFilters({ mode: v })}
          options={[
            {
              value: "live",
              label: (
                <>
                  <Radio className="h-3.5 w-3.5" />
                  {t("latest")}
                </>
              ),
            },
            {
              value: "archive",
              label: (
                <>
                  <Archive className="h-3.5 w-3.5" />
                  {t("archive")} 2022–2025
                </>
              ),
            },
          ]}
        />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Select
          value={String(f.year)}
          onValueChange={(v) => setFilters({ year: +v })}
          disabled={f.mode === "live"}
        >
          <SelectTrigger className={cn(trigger, "w-[88px]")} aria-label={t("year")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={f.month}
          onValueChange={(v) => setFilters({ month: v })}
          disabled={f.mode === "live"}
        >
          <SelectTrigger className={cn(trigger, "w-[128px]")} aria-label={t("month")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">{t("allMonths")}</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i)}>
                {m} {f.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={f.province}
          onValueChange={(v) => setFilters({ province: v })}
          disabled={f.mode === "live"}
        >
          <SelectTrigger className={cn(trigger, "w-[170px]")} aria-label={t("province")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">{t("allProvinces")}</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={f.daynight}
          onValueChange={(v) => setFilters({ daynight: v as Filters["daynight"] })}
          disabled={f.mode === "live"}
        >
          <SelectTrigger className={cn(trigger, "w-[120px]")} aria-label={t("dayNight")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">{t("both")}</SelectItem>
            <SelectItem value="D">{t("day")}</SelectItem>
            <SelectItem value="N">{t("night")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={props.togglePlay}
          disabled={f.mode === "live"}
          aria-label="Play monthly playback"
        >
          {props.playing ? <Pause /> : <Play />}
          {props.playing ? t("pause") : t("play")}
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={props.reset}>
          <RotateCcw />
          {t("reset")}
        </Button>
      </div>

      <div className="panel relative isolate h-[560px] overflow-hidden bg-map-surface p-0 sm:h-[640px]">
        {f.mode === "live" ? (
          <div className="dark flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-foreground">
            <Radio className="h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-medium">Live feed unavailable</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              No NASA FIRMS API key is configured, so no latest observations can be shown. Live data
              is never simulated.
            </p>
            <Button size="sm" onClick={() => setFilters({ mode: "archive" })}>
              Browse the 2022–2025 archive
            </Button>
          </div>
        ) : (
          <>
            {props.mounted && (
              <Suspense fallback={<MapLoading />}>
                <FireMap
                  observations={props.obs}
                  view={props.view}
                  showPoints={props.points}
                  showDensity={props.density}
                  selectedId={props.selected?.id ?? null}
                  onSelect={props.setSelected}
                />
              </Suspense>
            )}
            {!props.mounted && <MapLoading />}
            {props.obs.length === 0 && (
              <div className="absolute inset-0 z-[450] flex items-center justify-center">
                <div className="float-card px-4 py-3 text-center text-xs">
                  <div className="font-medium">No observations for these filters</div>
                  <div className="text-muted-foreground">
                    Try another month or region, or reset filters.
                  </div>
                </div>
              </div>
            )}
            {/* Top-left controls */}
            <div className="dark absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-2">
              <Segmented
                label="Map view"
                value={props.view}
                onChange={props.setView}
                className="float-card"
                options={[
                  { value: "harmonized", label: t("harmonized") },
                  { value: "modis", label: "MODIS" },
                  { value: "viirs", label: "VIIRS" },
                ]}
              />
              <div className="float-card flex gap-1 p-0.5">
                <ChipToggle on={props.points} onClick={() => props.setPoints(!props.points)}>
                  {t("points")}
                </ChipToggle>
                <ChipToggle on={props.density} onClick={() => props.setDensity(!props.density)}>
                  {t("density")}
                </ChipToggle>
              </div>
            </div>
            {/* Legend */}
            <div className="dark absolute bottom-3 left-14 z-[500] w-[230px] text-[10.5px]">
              <div className="float-card p-3">
                <div className="label-caps mb-2">Sensor identity</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <Dot className="bg-modis" />
                    MODIS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Dot className="bg-viirs" />
                    VIIRS
                  </span>
                </div>
                {props.view === "harmonized" && (
                  <>
                    <div className="label-caps mb-2 mt-2.5">Match status</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <Dot className="bg-matched" />
                        Matched
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Dot className="bg-possible" />
                        Possible
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Dot ring className="border-modis" />
                        MODIS-only
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Dot ring className="border-viirs" />
                        VIIRS-only
                      </span>
                    </div>
                  </>
                )}
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-[1.5px] border-dashed border-anomaly" />
                  Anomaly region (separate flag)
                </div>
                {props.density && (
                  <div className="mt-2.5">
                    <div className="label-caps">Density · per {DENSITY_CELL_DEG}° cell</div>
                    <div className="heat-ramp mt-1.5 h-1.5 rounded-full" />
                    <div className="num mt-0.5 flex justify-between text-[9px] text-muted-foreground">
                      {DENSITY_BINS.map((b, i) => (
                        <span key={b}>
                          {b}
                          {i === 3 ? "+" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Counts */}
            <div className="dark absolute bottom-3 right-3 z-[500] hidden md:block">
              <div className="float-card flex gap-5 px-4 py-2.5">
                {[
                  ["MODIS", s.modis, "text-modis"],
                  ["VIIRS", s.viirs, "text-viirs"],
                  ["Matched", s.matchedGroups, "text-matched"],
                  ["Review", s.possibleGroups, "text-possible"],
                ].map(([l, v, c]) => (
                  <div key={l as string}>
                    <div className="label-caps">{l}</div>
                    <div className={cn("num text-lg font-medium", c as string)}>
                      {fmt(v as number)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {props.selected && (
              <div className="dark">
                <DetailPanel
                  o={props.selected}
                  byId={props.byId}
                  technical={technical}
                  onClose={() => props.setSelected(null)}
                  onSelect={props.setSelected}
                />
              </div>
            )}
          </>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Source: NASA FIRMS MODIS C6.1 & VIIRS 375 m · Indonesia extent 95°E–141°E, 11°S–6°N ·{" "}
        <span className="text-possible">
          Sample records for interface preview — not real detections.
        </span>
      </p>
    </section>
  );
}

function MapLoading() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-primary" />
      Loading map…
    </div>
  );
}
