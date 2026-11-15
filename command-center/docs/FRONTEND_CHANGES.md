# Frontend update

## Standalone build configuration

The frontend now configures Vite, TanStack Start, React, Tailwind and Nitro
directly, using the existing installed dependencies. Editor telemetry and
template branding were removed from source, metadata, assets and configuration.
The favicon is now a FIREWATCH flame. npm's lockfile is authoritative; the obsolete
Bun lockfile and vendor-specific install exceptions were removed.

The API proxy, application routes, Cloudflare Worker output, SSR error pages and
CSRF middleware are preserved. No scientific calculations or data were changed.
Tests and the production build pass; the map, Overview, Methodology, favicon and
proxied metadata endpoints also return HTTP 200. Git history is unchanged.

## Map QA adjustments

- VIIRS uses muted red consistently in markers, legends and sensor series; map
  anomaly halos use dashed amber outlines so red is not overloaded on the map.
- Filters open at the top-left inside the map. Detection scope and date/location
  changes share one Apply action. Reset remains a draft change; the reset action
  has a red outline and Apply uses the existing green. Escape closes the panel
  and returns focus to its toggle.
- Search is compact and sits at the top-right with an accessible search-icon
  button. Province suggestions and coordinate validation are preserved.
- Fullscreen sits above zoom, includes controls and selection details, and resizes
  Leaflet on entry/exit. Native Escape exits fullscreen; the exit button also
  works. Unsupported/denied fullscreen requests show an error.
- Content uses the available width after sidebar collapse. Light mode has a
  neutral background, darker text, stronger input borders and clearer selection
  states. Dark-mode styling is retained apart from sensor/map-control changes.

Validation: all 54 frontend tests, TypeScript and the production build pass.
The tests cover combined detection/date Apply, draft Reset, panel Escape/focus,
and fullscreen entry/exit with Leaflet resizing. The map route returns HTTP 200.
HTTP access recovered, but the automated browser failed to launch for screenshots.
Actual browser appearance, live tiles and device-specific fullscreen behavior
still require a local visual check. These are frontend changes only.

## UI simplification

The latest pass replaces the repeated introduction stack with one short page title
and a compact scope line. Removed the breadcrumb, category labels, archive badge,
brand tagline, repeated historical notice, mode description, and per-metric helper
text. General/Technical controls now sit beside the relevant page title and are
absent on pages where they have no effect.

Charts and tables use open sections instead of repeated card containers. Typography
uses a consistent system font, smaller headings, tabular numbers, quieter labels,
and fewer uppercase labels. Empty anomaly promotion on Overview and duplicated
forecast-number cards are removed; chart-value tables remain available. Counting
methods, calendar scales and technical caveats are expandable. Critical error,
empty-result, scope and retrospective-forecast context remain visible.

Filters, calculations, exports and data contracts are unchanged by this pass.
Rendered browser review remains blocked by local socket permissions.

## Redesign status — November 15, 2026

The shared layout and all analysis sections have implementation changes. Browser
acceptance is still pending; this is not a claim that every completion criterion
has been verified.

- Shared structure: clearer page purpose, applied scope, draft-filter feedback,
  readable typography, focus rings, skip navigation, responsive layouts, and
  reduced-motion rules. Core new page headings also support Indonesian.
- Overview: selected-month chart domains, explicit calendar-month aggregation
  across multiple years, source-versus-group definitions, and chart-value tables.
- Map: controls outside the viewport, province search from supplied boundaries,
  coordinate search, cluster-count explanations, selection details, retry feedback,
  and paginated accessible values. At maximum zoom, a cluster opens one
  representative source record; it does not list every member.
- FRP: sensor-specific MW labels, a sequential color scale with unchanged numeric
  thresholds, grid-resolution explanation, viewport rendering, and paginated cell
  values. Empty cells are unknown coverage, not zero radiative power.
- Calendar: selected-year browsing for multi-year ranges, mobile daily values,
  selected-day state, separate zero/missing/outside-selection styles, and accurate
  selected-date percentile labels. Old responses cannot replace newer selections.
- Sensors: original source counts and provisional activity stay distinct;
  archive-wide candidate evidence is explicitly separate from applied filters.
- History: consistent month comparisons, values tables, region selection, honest
  share denominators, and takeaways derived from returned values. Missing monthly
  results do not produce a fabricated peak.
- Anomalies: comparison population, minimum activity and robust-z criteria,
  baseline availability, and no-flags-versus-no-activity explanations.
- Prediction: retrospective Jan–Mar 2026 framing, whole-unit display, accessible
  values, and error-band limitations. These bounds are not an 80% prediction
  interval or a current forecast.
- Methodology: plain-language introduction, expandable technical details, and
  source provenance.

This pass changed frontend presentation and interaction only. It did not change
scientific calculations, matching thresholds, backend data contracts or records.
Existing unrelated workspace changes have been retained. No new dependency was
added, and nothing was committed or pushed.

### Verification for this pass

- Initial test check: 43 passed, 4 failed. Final check: **52 passed in 8 files**,
  including filters/navigation, calendar, deferred requests, stale map responses,
  export content, coordinate/province search, and table pagination. React `act`
  warnings remain in the test output.
- TypeScript: `tsc --noEmit` passed. Production build: `npm run build` passed.
  An isolated invalid UTF-8 punctuation byte that blocked bundling was repaired.
- Static token audit: the 16 primary text/color-on-card combinations checked
  across light and dark themes meet 4.5:1; the lowest checked ratio is 4.76:1.
  This is not a full rendered WCAG 2.2 AA audit.
- Repository-wide lint was run and remains failing on formatting and type-style
  issues. No blanket lint rewrite was performed.
- Requests to the existing app on port 8081 fail with
  `connect EACCES 127.0.0.1:8081`. A dev-server start also reported the port already
  occupied. The existing server was not stopped. Desktop/tablet/mobile screenshots,
  browser keyboard checks, live API interactions, and runtime load metrics remain
  unverified. Earlier supplied screenshots are not available in this execution.

### Performance evidence

Maps, calendar and charts are loaded on demand. The map retains its buffered
viewport cache; the FRP map renders only intersecting cells and retains its zoom
cache. Value tables render at most 25 data rows per page.

The successful build emits Leaflet and chart code as separate chunks. Build sizes
are recorded below; these are output sizes, not browser load-time measurements.
No before/after runtime speedup is claimed because browser access is blocked.

| Client output | Minified | Gzip |
| --- | ---: | ---: |
| Main client entry | 370.48 kB | 118.68 kB |
| Dashboard route | 41.64 kB | 12.95 kB |
| Leaflet, deferred | 148.81 kB | 43.39 kB |
| Shared chart chunk, deferred | 392.09 kB | 103.28 kB |
| CSS | 128.08 kB | 26.26 kB |

### Local acceptance checks still required

Run `start-backend.cmd` and `start-frontend.cmd` from the repository root, then open
`http://127.0.0.1:8081/`. Check desktop, tablet and mobile widths; Tab through
navigation, filters, map-value actions and chart tables; apply date/region/night
filters; inspect a day and return to Map; exercise exports and failed-request
retry. Confirm EN/ID and both themes, including calendar colors and chart labels.
Some technical explanatory text still falls back to English.

Real analysis requires the existing archive API on port 8021 and its configured
read-only database. Province search requires its boundary endpoint. Basemap tiles
require external network access. No backend response or unavailable coverage was
simulated to make a feature appear operational.

## Earlier implementation notes

The dashboard now uses individual pages at `/map`, `/overview`, `/calendar`,
`/sensors`, `/history`, `/anomalies`, `/prediction`, `/methodology`, and `/help`.
The `/` URL opens `/map`. The shared layout preserves filters, language and theme
when navigating between pages; a full browser reload restores January 2022.

Map filters are in a floating panel in the upper-right corner. The basemap and
marker centers follow the selected light/dark theme. Existing province geometry
provides a grid fill to distinguish Indonesia; the boundary toggle adds outlines.
Loading indicators preserve displayed markers while replacement data is loading.
The existing selected-period, per-zoom background cache is retained.

History, forecast, matching evidence and sensitivity requests start only when
their page is opened. Forecast charts use the existing API's retrospective
outlook and error bands, with a grid toggle. API-provided model explanations and
metadata remain verbatim; UI controls and explanatory copy support English and
Indonesian.

## Annual calendar, FRP heatmap and hover areas

- `/calendar` shows one colored box per UTC day for the entire selected year,
  including leap day, with month rows, a year selector and activity legend.
  Region, day/night and explicit date-range filters are retained; the month
  filter is intentionally ignored for the annual view. Missing detections remain
  unknown rather than zero. Colors use the year's observed daily p50/p75/p90.
- `/heatmap` is a separate page without hotspot dots. It shows mean original FRP
  per occupied grid cell in MW for one selected sensor (MODIS or VIIRS S-NPP).
  Fixed intervals are 0–<10, 10–<50, 50–<100 and 100+ MW, from green to red.
  Empty areas remain transparent; the colored cells are aggregation areas, not
  observed fire perimeters or danger zones. Map filters carry into this page.
- Hovering a marker on `/map` outlines its actual aggregation grid cell. The
  outline disappears on mouse leave. No radius or exact footprint is fabricated
  from scan/track dimensions.

## Backend setup

The archive backend source and its licensed boundary files have been copied from
`../firewatch-command-center-preview/backend` into this repository. The original
project is unchanged. Two additive, read-only endpoints are registered:
`/api/archive/calendar-year` and `/api/archive/frp-heatmap`. Existing endpoint
calculations are preserved; SQLite URIs now encode special path characters.
No schema migration, database rebuild, or data import is performed.

From the repository root, run `start-backend.cmd`, then `start-frontend.cmd` in
another terminal. Vite now proxies the archive API to port 8021. The original
server on 8020 has not been stopped or changed. If dependencies are missing, run
`.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.

`FIREWATCH_ARCHIVE_DB` overrides the read-only database path. The launcher uses
`backend/data/firewatch.sqlite` when present, otherwise the existing database in
`../firewatch-command-center-preview/backend/data/firewatch.sqlite`. It does not
copy or modify that database. Database files and original datasets stay ignored
by Git. Keep the database outside public frontend assets.

Tests for the new API use disposable SQLite fixtures. A live smoke check compared
an existing dashboard response on ports 8020 and 8021 (identical) and verified the
original database SHA-256 before/after the new queries (unchanged).

## Validation

### Date filters and observation extents

- Overview and FRP heatmap have year/month and custom date controls on their own pages.
  An empty month selects the whole year. Custom dates replace year/month filters.
- The map endpoint adds coordinate extents and maximum scan/track dimensions to
  each cluster. Hover outlines use these instead of the zoom-level grid cell.
  This is an approximate, axis-aligned envelope; pixel orientation is unavailable.
  Degenerate areas without dimensions have no outline. Restart the API to expose
  the new fields; older responses continue to render markers without outlines.
- Tooltips open beside the hotspot, with room for the marker itself.
- Anomalies has independent year/month controls, an observed-versus-baseline
  monthly chart, and loading/empty states. It uses all regions and day/night data,
  independently of map filters. Bars include only flagged region-months.
- General mode keeps key summary values and plain-language forecast explanations.
  Technical mode adds matching summaries, robust z scores, model errors, backtests,
  and existing source-record provenance.
- Prediction retains the existing seasonal-naive versus seasonal-mean algorithm,
  selected by historical mean absolute error. Its Jan-Mar 2026 outlook remains
  retrospective and is not a current forecast. No schema or ingestion changes.

From `frontend/command-center`:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

Manual checks: switch sidebar pages and browser Back/Forward; change filters and
return from Calendar to Map; switch EN/ID and light/dark; open map filters; pan
after background loading completes; toggle forecast grid. External tile services
still require internet access. Geographic highlighting requires the existing
`/api/archive/boundaries` endpoint.


## Applied-filter and map navigation update

- Filters keep a draft until Apply. Year, Month and Date range modes are exclusive;
  range mode requires ordered archive dates and hides year/month. Reset changes
  the draft only. Region and day/night combine with the applied time period.
- Map, Overview, Sensors, Calendar and FRP heatmap share the applied selection.
  Calendar still displays one year at a time; month/range restrict its enabled days.
  Anomalies has its own monthly Year/Month Apply form; predictions/history retain
  their documented full-archive scope. Unsupported analysis filters are not shown.
- The map's duplicate heatmap link is removed; the sidebar link remains. A panel
  icon collapses/reopens navigation, and maps resize with their containers.
- Both maps support decimal latitude/longitude search without changing zoom.
- Full-selection clusters/cells are fetched per visited zoom, with three cached
  zooms per selection. Panning does not refetch once loaded. Hotspot requests in
  flight are shared on pan, and only visible clusters become marker layers.
  Filter changes clear caches; zoom changes may fetch; external basemap tiles
  still load as needed. This does not cache all raw detection rows in the browser.
- Error/info notices are dismissible; active loading indicators remain visible.
  Calendar and page loaders overlay reserved content instead of adding layout rows.
  Older day-detail responses cannot overwrite newer selections.
- General/Technical are disabled on pages without a meaningful difference. A short
  mode description identifies the extra statistics on pages that support both.
- Repeated map copy was reduced; the hover outline explanation moved to Help.
  The outline is an approximate observation envelope, not a fire/danger boundary.

Follow-up priorities: API health/retry feedback; versioned summary caching and
precomputed historical aggregates; representative all-years/high-zoom browser
performance measurements; then mobile/keyboard and translation review.


## Data integrity corrections

The frontend now defaults to presumed vegetation fires (type 0), with an explicit
All thermal detections option and an Apply detection scope action. This selection
is independent of draft date/region edits and applies to dashboard, map, calendar,
FRP heatmap, history, anomalies and forecast requests. Confidence eligibility
continues to control matching, not removal of original observations. Existing
API clients that omit detection_type retain the all-thermal response for backward
compatibility. Caches for history/anomalies/forecast include detection scope.

Dashboard exports are enabled only on Map/Overview/Sensors when the loaded query
matches the applied query. The export carries detection_type in its scope and
filename; other pages cannot export an unrelated cached dashboard result.

Multi-year calendar selections retain the newer displayed-year navigation. The
legend now states that its percentile thresholds use selected dates in that year.
Overview retains the newer guard against displaying monthly anomalies under
custom ranges/day-night/all-years filters. These comparisons remain exploratory.

Harmonized map responses retain activity-unit counts and add source_modis and
source_viirs membership counts. Tooltips distinguish those members from units.
Groups remain anchored to MODIS date/province; source membership can include a
VIIRS partner across a province boundary. Reading Help explains this explicitly.
No matching assignments, source files, schema, or archive records are modified.


## Historical burning periods on Overview

Overview now loads `/api/archive/critical-periods` only when opened. The endpoint
uses the current provisional grouped activity definition and the complete fixed
2022-2025 reference period. Province, day/night, and vegetation/all-thermal scope
apply; the selected dashboard year/month/date range does not truncate the reference.
The reference scope is explicitly shown in the panel.

The panel provides a monthly four-year median chart, observed min/max ranges,
annual busiest recorded months (including ties), and exact values. Technical mode
adds the per-year monthly counts. A month is eligible for a typical peak only if
all four reference years have recorded month values; missing values remain null,
not zero. All-zero values do not create a positive peak. Annual peaks are based
on recorded months and report how many months have records. These are historical
monitoring guides, not danger levels, forecast intervals, or official warnings.

For Central Kalimantan, all retained type-0 records, day + night: September has the
highest monthly median (2442.5 activity units; recorded range 460-16061). The annual
peaks are September 2022 (460), October 2023 (16849), September 2024 (3124), and
September 2025 (1761). These values were independently checked against the archive
rows. The database hash was unchanged. No matching, grid, or anomaly method changed.
Restart the backend to register the new route, then refresh Overview.
