import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HarmonizedObservation } from "@/lib/firewatch/harmonize";
import { PIPELINE_RUN_UTC } from "@/lib/firewatch/sample-data";
import { Tag } from "./ui";

const STATUS: Record<
  HarmonizedObservation["status"],
  { label: string; tone: "matched" | "possible" | "modis" | "viirs"; plain: string }
> = {
  matched: {
    label: "Matched group",
    tone: "matched",
    plain: "Both satellites saw heat here at nearly the same time and place.",
  },
  possible: {
    label: "Possible match · review",
    tone: "possible",
    plain:
      "The two satellites may have seen the same heat source — evidence is weaker and needs review.",
  },
  "modis-only": {
    label: "MODIS-only",
    tone: "modis",
    plain: "Only the MODIS sensor reported heat here within the matching window.",
  },
  "viirs-only": {
    label: "VIIRS-only",
    tone: "viirs",
    plain: "Only the VIIRS sensor reported heat here. VIIRS can see smaller fires than MODIS.",
  },
};

export function DetailPanel({
  o,
  byId,
  technical,
  onClose,
  onSelect,
}: {
  o: HarmonizedObservation;
  byId: Map<string, HarmonizedObservation>;
  technical: boolean;
  onClose: () => void;
  onSelect: (o: HarmonizedObservation) => void;
}) {
  const st = STATUS[o.status];
  const confMeaning =
    o.sensor === "MODIS"
      ? "MODIS reports 0–100. Higher means the algorithm is more certain this pixel contains a thermal anomaly."
      : "VIIRS reports low / nominal / high. It is a different scale from MODIS and is never converted.";
  const rows: [string, string][] = [
    ["Acquired (UTC)", `${o.date} ${o.timeUtc}`],
    ["Latitude", o.lat.toFixed(5)],
    ["Longitude", o.lon.toFixed(5)],
    ["Region", o.province],
    ["Satellite / sensor", `${o.satellite} / ${o.instrument}`],
    [`Confidence (${o.sensor === "MODIS" ? "0–100" : "l/n/h"})`, o.confidence],
    ["Fire radiative power", o.frp != null ? `${o.frp} MW` : "n/a"],
    ["Day / night", o.daynight === "D" ? "Daytime" : "Night-time"],
  ];
  if (technical) {
    rows.unshift(["Source record ID", o.id]);
    rows.push(
      ["Brightness temp.", o.brightness != null ? `${o.brightness} K` : "n/a"],
      ["Scan × track", o.scan != null ? `${o.scan} × ${o.track} km` : "Footprint unavailable"],
      ["Product", o.product],
      ["CRS", "WGS 84 (EPSG:4326), pixel centre"],
      ["Ingested (UTC)", PIPELINE_RUN_UTC],
    );
  }
  return (
    <div
      role="dialog"
      aria-label="Observation details"
      className="float-card absolute right-3 top-3 z-[600] flex max-h-[calc(100%-1.5rem)] w-[300px] flex-col overflow-hidden sm:w-[330px]"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium">{o.sensor} observation</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close details"
        >
          <X />
        </Button>
      </div>
      <div className="overflow-y-auto px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="num text-xl font-medium">{o.timeUtc} UTC</span>
          <span className="label-caps">Observation</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Tag tone={o.sensor === "MODIS" ? "modis" : "viirs"}>{o.sensor}</Tag>
          <Tag tone={st.tone}>{st.label}</Tag>
          {o.anomaly && <Tag tone="anomaly">Anomaly region</Tag>}
        </div>
        {!technical && <p className="mt-2 text-[11px] text-muted-foreground">{st.plain}</p>}
        <dl className="mt-3 divide-y divide-border/70 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="num text-right">{v}</dd>
            </div>
          ))}
        </dl>
        {!technical && (
          <div className="mt-3 space-y-1.5 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Confidence · </span>
              {confMeaning}
            </p>
            <p>
              <span className="font-medium text-foreground">FRP · </span>Fire radiative power: the
              heat energy released, in megawatts. It is not fire size or danger level.
            </p>
          </div>
        )}
        {o.links.length > 0 && (
          <div className="mt-3 rounded-md border border-matched/30 bg-matched/10 p-2.5 text-xs">
            <div className="mb-1.5 flex items-center justify-between font-medium">
              <span>Matching evidence</span>
              <span className="num text-[10px] text-muted-foreground">{o.groupId}</span>
            </div>
            {o.links.map((l) => {
              const pid = o.sensor === "MODIS" ? l.viirsId : l.modisId;
              const p = byId.get(pid);
              return (
                <div
                  key={pid}
                  className="mt-1.5 space-y-0.5 border-t border-matched/20 pt-1.5 first:mt-0 first:border-0 first:pt-0"
                >
                  {[
                    ["Partner", pid],
                    ["Distance", `${l.distanceKm.toFixed(2)} km`],
                    ["Δ time", `${l.dtMin.toFixed(0)} min`],
                    ...(technical
                      ? [
                          ["Footprint IoU", l.iou != null ? l.iou.toFixed(3) : "unavailable"],
                          [
                            "VIIRS coverage",
                            l.coverage != null ? l.coverage.toFixed(2) : "unavailable",
                          ],
                        ]
                      : []),
                    ["Score", `${l.score.toFixed(2)}${technical ? ` · ${l.formula}` : ""}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="num">{v}</span>
                    </div>
                  ))}
                  {p && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1.5 h-7 w-full text-[11px]"
                      onClick={() => onSelect(p)}
                    >
                      Open {p.sensor} source record
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 rounded-md border border-possible/30 bg-possible/10 px-2.5 py-2 text-[10.5px]">
          Thermal anomaly — field verification may be required. A hotspot is not a confirmed fire or
          perimeter.
        </p>
      </div>
    </div>
  );
}
