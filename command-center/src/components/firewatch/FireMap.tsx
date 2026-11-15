import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import type { HarmonizedObservation } from "@/lib/firewatch/harmonize";

export type MapView = "harmonized" | "modis" | "viirs";
export const DENSITY_CELL_DEG = 0.5;
export const DENSITY_BINS = [1, 3, 6, 10] as const; // detections per cell → heat-1..heat-4

interface Props {
  observations: HarmonizedObservation[];
  view: MapView;
  showPoints: boolean;
  showDensity: boolean;
  showBoundaries?: boolean;
  selectedId: string | null;
  onSelect: (o: HarmonizedObservation) => void;
}

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const STATUS_LABEL: Record<HarmonizedObservation["status"], string> = {
  matched: "Matched group",
  possible: "Possible match · review",
  "modis-only": "MODIS-only",
  "viirs-only": "VIIRS-only",
};

/** Which observations a view renders: harmonized shows one symbol per group (anchored on MODIS) plus unmatched records. */
export function visibleFor(view: MapView, obs: HarmonizedObservation[]) {
  if (view === "modis") return obs.filter((o) => o.sensor === "MODIS");
  if (view === "viirs") return obs.filter((o) => o.sensor === "VIIRS");
  return obs.filter((o) => o.sensor === "MODIS" || o.status === "viirs-only");
}

export function FireMap({
  observations,
  view,
  showPoints,
  showDensity,
  selectedId,
  showBoundaries = false,
  onSelect,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const L = (mod as unknown as { default: typeof import("leaflet") }).default ?? mod;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, {
        zoomControl: false,
        minZoom: 4,
        maxZoom: 13,
        preferCanvas: true,
        maxBounds: [
          [-16, 88],
          [12, 148],
        ],
      }).fitBounds([
        [-11, 95],
        [6, 141],
      ]);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
      L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
        attribution:
          "Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · Detections: NASA FIRMS (real archive)",
        maxNativeZoom: 16,
      }).addTo(map);
      L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
        maxNativeZoom: 16,
        opacity: 0.9,
      }).addTo(map);
      map.on("zoomend", () => setZoom(map.getZoom()));
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setZoom(map.getZoom());
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = LRef.current,
      layer = layerRef.current,
      map = mapRef.current;
    if (!ready || !L || !layer || !map) return;
    layer.clearLayers();
    const c = {
      modis: css("--modis"),
      viirs: css("--viirs"),
      matched: css("--matched"),
      possible: css("--possible"),
      anomaly: css("--anomaly"),
      heat: [css("--heat-1"), css("--heat-2"), css("--heat-3"), css("--heat-4")],
      surface: css("--map-surface"),
      fg: css("--foreground"),
    };
    const list = visibleFor(view, observations);
    const markerColor = (o: HarmonizedObservation) =>
      view === "harmonized"
        ? o.status === "matched"
          ? c.matched
          : o.status === "possible"
            ? c.possible
            : o.sensor === "MODIS"
              ? c.modis
              : c.viirs
        : o.sensor === "MODIS"
          ? c.modis
          : c.viirs;

    if (showDensity) {
      const cells = new Map<string, { n: number; color: string }>();
      for (const o of list) {
        const k = `${Math.floor(o.lat / DENSITY_CELL_DEG)}|${Math.floor(o.lon / DENSITY_CELL_DEG)}`;
        cells.set(k, { n: (cells.get(k)?.n ?? 0) + 1, color: markerColor(o) });
      }
      for (const [k, cell] of cells) {
        const n = cell.n;
        const [i = 0, j = 0] = k.split("|").map(Number);
        const bin =
          n >= DENSITY_BINS[3] ? 3 : n >= DENSITY_BINS[2] ? 2 : n >= DENSITY_BINS[1] ? 1 : 0;
        L.rectangle(
          [
            [i * DENSITY_CELL_DEG, j * DENSITY_CELL_DEG],
            [(i + 1) * DENSITY_CELL_DEG, (j + 1) * DENSITY_CELL_DEG],
          ],
          {
            stroke: true,
            color: cell.color,
            weight: 0.5,
            opacity: 0.5,
            fillColor: cell.color,
            fillOpacity: 0.22 + bin * 0.1,
          },
        )
          .bindTooltip(
            `<b>${n}</b> ${view === "harmonized" ? "activity units" : `${view.toUpperCase()} detections`}<br/><span class="k">per ${DENSITY_CELL_DEG}° cell · density, not burned area</span>`,
            { className: "fw-tip", sticky: true },
          )
          .addTo(layer);
      }
    }
    if (!showPoints) return;

    // Greedy screen-space clustering at low zoom (radius in px); individual markers from zoom 8.
    let singles = list;
    if (zoom < 8) {
      const R = 42;
      const clusters: { x: number; y: number; items: HarmonizedObservation[] }[] = [];
      for (const o of list) {
        const pt = map.project([o.lat, o.lon], zoom);
        const hit = clusters.find((c) => Math.abs(c.x - pt.x) < R && Math.abs(c.y - pt.y) < R);
        if (hit) hit.items.push(o);
        else clusters.push({ x: pt.x, y: pt.y, items: [o] });
      }
      singles = [];
      for (const { items: g } of clusters) {
        if (g.length < 3 || g.some((o) => o.id === selectedId)) {
          singles.push(...g);
          continue;
        }
        const lat = g.reduce((s, o) => s + o.lat, 0) / g.length;
        const lon = g.reduce((s, o) => s + o.lon, 0) / g.length;
        const size = Math.min(48, 22 + Math.sqrt(g.length) * 2);
        const anomaly = g.some((o) => o.anomaly);
        const colors = g.map(markerColor);
        const parts = [...new Set(colors)].map((color) => ({
          color,
          count: colors.filter((c) => c === color).length,
        }));
        let edge = 0;
        const gradient = parts
          .map((p) => {
            const start = edge;
            edge += (p.count / g.length) * 100;
            return `${p.color} ${start}% ${edge}%`;
          })
          .join(",");
        const icon = L.divIcon({
          className: "",
          html: `<div class="fw-cluster${anomaly ? " is-anomaly" : ""}" style="width:${size}px;height:${size}px;background:conic-gradient(${gradient});border-color:${markerColor(g[0]!)};box-shadow:0 0 16px 6px color-mix(in oklab,${markerColor(g[0]!)} 35%,transparent)"><span style="display:grid;place-items:center;background:var(--map-surface);border-radius:50%;width:calc(100% - 6px);height:calc(100% - 6px)">${g.length}</span></div>`,
          iconSize: [size, size],
        });
        L.marker([lat, lon], { icon, keyboard: true, title: `${g.length} observations — zoom in` })
          .bindTooltip(
            `<b>${g.length}</b> observations<br/><span class="k">Click to zoom in${anomaly ? " · includes anomaly-flagged region" : ""}</span>`,
            { className: "fw-tip", direction: "top" },
          )
          .on("click", () => map.setView([lat, lon], Math.min(map.getZoom() + 2, 10)))
          .addTo(layer);
      }
    }

    for (const o of singles) {
      let fill = o.sensor === "MODIS" ? c.modis : c.viirs;
      let stroke = fill,
        fillOpacity = 0.9,
        label = o.sensor as string,
        radius = 5;
      if (view === "harmonized") {
        label = STATUS_LABEL[o.status];
        if (o.status === "matched") {
          fill = c.matched;
          stroke = c.matched;
          radius = 6;
        } else if (o.status === "possible") {
          fill = c.possible;
          stroke = c.possible;
          radius = 6;
        } else fillOpacity = 0.12; // unmatched: sensor colour, outlined
      }
      for (const [extra, alpha] of [
        [12, 0.045],
        [7, 0.09],
        [3, 0.14],
      ]) {
        L.circleMarker([o.lat, o.lon], {
          radius: radius + extra!,
          stroke: false,
          fillColor: fill,
          fillOpacity: alpha!,
          interactive: false,
        }).addTo(layer);
      }
      if (o.anomaly)
        L.circleMarker([o.lat, o.lon], {
          radius: radius + 5,
          color: c.anomaly,
          weight: 1.5,
          dashArray: "3 3",
          fill: false,
          interactive: false,
        }).addTo(layer);
      if (o.id === selectedId)
        L.circleMarker([o.lat, o.lon], {
          radius: radius + 8,
          color: c.fg,
          weight: 2,
          fill: false,
          interactive: false,
        }).addTo(layer);
      const link = o.links[0];
      L.circleMarker([o.lat, o.lon], {
        radius,
        color: stroke,
        weight: 2,
        fillColor: fill,
        fillOpacity,
      })
        .bindTooltip(
          `<div><b>${label}</b>${o.anomaly ? ' · <span style="color:var(--anomaly)">anomaly region</span>' : ""}</div>
           <div>${o.date} · ${o.timeUtc} UTC · ${o.satellite}</div>
           <div><span class="k">Lat/Lon</span> ${o.lat.toFixed(4)}, ${o.lon.toFixed(4)}</div>
           <div><span class="k">Confidence (${o.sensor === "MODIS" ? "0–100" : "l/n/h"})</span> ${o.confidence}</div>
           <div><span class="k">FRP</span> ${o.frp ?? "n/a"} MW</div>
           ${link ? `<div><span class="k">Match score</span> ${link.score.toFixed(2)} · ${link.formula}</div>` : ""}`,
          { className: "fw-tip", direction: "top", offset: [0, -6] },
        )
        .on("click", () => selectRef.current(o))
        .addTo(layer);
    }
  }, [ready, observations, view, showPoints, showDensity, selectedId, zoom]);

  useEffect(() => {
    const map = mapRef.current,
      L = LRef.current;
    if (!ready || !map || !L || !showBoundaries) return;
    const abort = new AbortController();
    let overlay: ReturnType<typeof L.geoJSON> | null = null;
    fetch((import.meta.env["VITE_ARCHIVE_API"] ?? "") + "/api/archive/boundaries", {
      signal: abort.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("Boundaries unavailable");
        return r.json();
      })
      .then((geo) => {
        if (!abort.signal.aborted)
          overlay = L.geoJSON(geo, {
            style: { color: "#8ed3b2", weight: 1, fillOpacity: 0, opacity: 0.5 },
            interactive: false,
          }).addTo(map);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.warn(e.message);
      });
    return () => {
      abort.abort();
      overlay?.remove();
    };
  }, [ready, showBoundaries]);

  // Bring a selection made elsewhere (e.g. the candidate table) into view.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const o = observations.find((x) => x.id === selectedId);
    if (o && !map.getBounds().pad(-0.1).contains([o.lat, o.lon])) {
      map.flyTo([o.lat, o.lon], Math.max(map.getZoom(), 7), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId]);

  return (
    <div
      ref={el}
      className="fw-map h-full w-full"
      role="application"
      aria-label="Map of Indonesia showing satellite fire detections. Use the candidate review table for keyboard access to records."
    />
  );
}
