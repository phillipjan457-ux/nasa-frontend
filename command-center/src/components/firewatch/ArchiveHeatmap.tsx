import { CoordinateSearch } from "./CoordinateSearch";
import { PagedValueTable } from "./AnalysisUI";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, TileLayer } from "leaflet";
import { useText } from "@/lib/firewatch/i18n";
import { frpColor, gridBounds } from "@/lib/firewatch/map-grid";

const API = import.meta.env["VITE_ARCHIVE_API"] ?? "";
export function ArchiveHeatmap({ query, light }: { query: string; light: boolean }) {
  const text = useText();
  const cache = useRef(new Map<number, any>());
  const element = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null),
    tiles = useRef<TileLayer[]>([]);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false),
    [viewport, setViewport] = useState(0);
  const [sensor, setSensor] = useState("VIIRS"),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [cellCount, setCellCount] = useState(0);
  const [visibleCells, setVisibleCells] = useState<any[]>([]);
  const [cellStep, setCellStep] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !element.current) return;
      leaflet.current = L;
      const m = L.map(element.current, {
        preferCanvas: true,
        minZoom: 4,
        maxZoom: 12,
        zoomControl: false,
      }).fitBounds([
        [-11, 95],
        [6, 141],
      ]);
      map.current = m;
      const labels = m.createPane("heatmap-labels");
      labels.style.zIndex = "620";
      labels.style.pointerEvents = "none";
      layer.current = L.layerGroup().addTo(m);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      const base = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
      tiles.current = [
        L.tileLayer(base + "/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
          maxNativeZoom: 16,
          attribution: "Esri · NASA FIRMS",
        }).addTo(m),
        L.tileLayer(base + "/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
          maxNativeZoom: 16,
          pane: "heatmap-labels",
        }).addTo(m),
      ];
      m.on("moveend", () => setViewport((value) => value + 1));
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const base = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
    const theme = light ? "Light" : "Dark";
    tiles.current[0]?.setUrl(`${base}/World_${theme}_Gray_Base/MapServer/tile/{z}/{y}/{x}`);
    tiles.current[1]?.setUrl(`${base}/World_${theme}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`);
  }, [ready, light]);
  useEffect(() => {
    cache.current.clear();
  }, [query, sensor]);
  useEffect(() => {
    if (!ready || !element.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [ready]);
  useEffect(() => {
    const m = map.current,
      L = leaflet.current,
      g = layer.current;
    if (!ready || !m || !L || !g) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setVisibleCells([]);
    // A different selection must not retain colors from the previous sensor/period.
    g.clearLayers();
    const timer = window.setTimeout(async () => {
      const zoom = Math.min(16, Math.round(m.getZoom()) + 2);
      const params = new URLSearchParams(query);
      params.set("sensor", sensor);
      params.set("zoom", String(zoom));
      for (const [key, value] of Object.entries({ west: -180, east: 180, south: -90, north: 90 }))
        params.set(key, String(value));
      try {
        let result = cache.current.get(zoom);
        if (!result) {
          const response = await fetch(API + "/api/archive/frp-heatmap?" + params, {
            signal: abort.signal,
          });
          if (!response.ok)
            throw Error(text("FRP heatmap unavailable. Start the updated archive API."));
          result = await response.json();
          if (abort.signal.aborted) return;
          if (cache.current.size >= 3) cache.current.delete(cache.current.keys().next().value!);
          cache.current.set(zoom, result);
        }
        if (abort.signal.aborted) return;
        const bounds = m.getBounds();
        const visible = result.cells.filter((cell: any) => {
          const area = gridBounds(cell.gx, cell.gy, result.step);
          return (
            area &&
            area[0][0] <= bounds.getNorth() &&
            area[1][0] >= bounds.getSouth() &&
            area[0][1] <= bounds.getEast() &&
            area[1][1] >= bounds.getWest()
          );
        });
        for (const cell of visible) {
          const area = gridBounds(cell.gx, cell.gy, result.step),
            color = frpColor(cell.mean_frp_mw);
          if (!area || !color) continue;
          L.rectangle(area, { stroke: false, fillColor: color, fillOpacity: 0.7 })
            .bindTooltip(
              `${sensor} · ${text("Mean FRP")} ${cell.mean_frp_mw.toFixed(1)} MW<br>${cell.count.toLocaleString()} ${text("source detections")}`,
              { className: "fw-tip", sticky: true },
            )
            .addTo(g);
        }
        setVisibleCells(visible);
        setCellStep(result.step);
        setCellCount(visible.length);
      } catch (err) {
        if (!abort.signal.aborted) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [ready, query, sensor, viewport, text]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {text("Mean FRP per occupied map cell (MW). Red means higher FRP, not fire risk.")}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <label>
            {text("Sensor")}{" "}
            <select
              aria-label="Heatmap sensor"
              value={sensor}
              onChange={(e) => setSensor(e.target.value)}
            >
              <option value="VIIRS">VIIRS S-NPP</option>
              <option value="MODIS">MODIS</option>
            </select>
          </label>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
          <button className="archive-button ml-3" onClick={() => setViewport((v) => v + 1)}>
            Retry FRP heatmap
          </button>
          <button
            className="float-right"
            aria-label="Dismiss heatmap error"
            onClick={() => setError("")}
          >
            ×
          </button>
        </p>
      )}
      <div className="panel archive-map-panel relative overflow-hidden">
        <CoordinateSearch map={ready ? map.current : null} />
        <div
          ref={element}
          className="fw-map h-full w-full"
          aria-label="FRP heatmap without hotspot markers"
          aria-busy={loading}
        />
        {loading && (
          <div role="status" className="map-loading-overlay">
            <div className="map-loading-message">
              <span className="loading-spinner" />
              {text("Loading FRP heatmap…")}
            </div>
          </div>
        )}
        <div className="heatmap-legend" aria-label={text("FRP legend")}>
          <b>
            {text("Mean FRP")} · {sensor} · MW
          </b>
          <div className="flex flex-wrap gap-3 mt-2">
            {[
              [0, "0–<10"],
              [10, "10–<50"],
              [50, "50–<100"],
              [100, "100+"],
            ].map(([value, label]) => (
              <span key={value}>
                <i className="legend-dot" style={{ background: frpColor(Number(value))! }} />
                {label}
              </span>
            ))}
          </div>
          <p className="mt-2">
            {text("Transparent = no FRP data. Sensors are displayed separately.")}
          </p>
          <p className="mt-2">
            {cellStep == null
              ? "Grid resolution loads with the data."
              : `Grid: ${cellStep}° latitude × ${cellStep}° longitude; changes with zoom.`}{" "}
            Each cell shows the mean of available source FRP values, not total radiative power.
            Empty cells have unknown coverage.
          </p>
        </div>
        <PagedValueTable
          key={query + sensor}
          loading={loading}
          caption="Visible FRP cells"
          headers={["Cell southwest (lat, lon)", "Mean FRP (MW)", "Source detections"]}
          rows={visibleCells.map((cell) => {
            const area = gridBounds(cell.gx, cell.gy, cellStep!);
            return [
              area ? `${area[0][0].toFixed(4)}, ${area[0][1].toFixed(4)}` : "Unavailable",
              cell.mean_frp_mw.toLocaleString(undefined, { maximumFractionDigits: 1 }),
              cell.count.toLocaleString(),
            ];
          })}
        />
      </div>
      {!loading && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          {cellCount
            ? `${cellCount.toLocaleString()} ${text("occupied cells in view")}`
            : text("No FRP data for these filters.")}
        </p>
      )}
    </section>
  );
}
