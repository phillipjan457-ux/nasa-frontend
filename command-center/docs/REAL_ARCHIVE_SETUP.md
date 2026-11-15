# FIREWATCH real archive integration

Branch: integration/real-archive. This is a local, two-service development setup.
Original template sample modules remain available as reference, but the / route
now renders RealDashboard and never falls back to the seeded sample archive.
Do not publish until an appropriate Python hosting endpoint is configured.
Static frontend hosting by itself does not host this Python/SQLite service.

## First-time setup (from this repository root)

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm.cmd ci
```

## Import original files

```powershell
.\.venv\Scripts\python.exe -m backend.ingest "PATH_TO_MODIS_JSON" "PATH_TO_SNPP_JSON"
```

Both paths must refer to the original downloaded 2022-2025 files. Do not add the
older 2024-only files as additional inputs. The importer hashes the original
bytes, preserves every original row, records validation failures separately,
and skips source files with a previously imported checksum. Matching is rebuilt
deterministically on repeat runs. Existing source observations are not deleted.
The default database is backend/data/firewatch.sqlite (ignored by Git).
Use --db NEW_PATH for a separately versioned processing run; do not reuse the
same database for a different matching configuration. Restart the API after
rebuilding data because historical responses are cached within the process.

## Run (two terminals)

Terminal 1:
```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.api:app --host 127.0.0.1 --port 8021
```

Terminal 2:
```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 8080
```

Open http://127.0.0.1:8080 . API documentation: http://127.0.0.1:8021/docs .
Vite proxies /api/archive to the local backend. For a separately hosted frontend,
set VITE_ARCHIVE_API to the HTTPS Python service origin at build time and add the
frontend origin to the backend CORS list. Keep the SQLite file on persistent
server storage; do not upload it or originals into public frontend assets.
There is no live feed configured. Historical mode remains usable without a key.

## Validate

```powershell
.\.venv\Scripts\python.exe -m pytest backend/test_archive.py -q
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

## Model and data definitions

- 617,112 records: 106,262 MODIS and 510,850 VIIRS S-NPP.
- All four years are imported. MODIS version 6.03 appears in 2022 and 61.03 later;
  versions are preserved rather than relabeled as one collection.
- Raw originals and normalized records are linked by file SHA-256 and row number.
- Matching eligibility: type 0, MODIS confidence >=30, VIIRS nominal/high.
  Other records stay visible as unmatched. Sensor confidence scales are separate.
- Candidate gates: Haversine <=1 km and UTC time difference <=30 minutes.
- Score: 0.6*(1-distance/1km)+0.4*(1-time/30min). Matched >=0.70;
  possible >=0.45. Formula/configuration: center-1km-30min-v1.
- Sparse maximum-weight one-to-one bipartite assignment, with dummy unmatched
  choices, is the explicit MVP policy. No greedy assignment or transitive chains.
- One-to-many physical associations are not claimed. True footprint IoU stays
  unavailable: scan/track alone do not establish pixel orientation.
- Activity units count each assigned group once, anchored on the MODIS date and
  administrative region, plus each unmatched source observation. Possible groups
  are provisional activity units, not proven duplicate fires.
- Source counts refer to original observation timestamps/regions. At period or
  region boundaries these may differ from MODIS-anchored group membership.
- geoBoundaries gbOpen IDN ADM1 polygons are used for region lookup. Source and
  license metadata are in backend/boundaries/source.json (ODbL 1.0). Boundaries
  represent their source vintage, not a claim of current official divisions.
  Unassigned/offshore records remain visible; no fabricated province assignment.
- The dashboard map includes every selected record using server-side spatial
  clusters at the viewport zoom. There is no manual paging, sample, or record cap.
  Clusters expand as you zoom; individual observations remain source-linked.
  MODIS/VIIRS source views and Harmonized activity-unit counts are distinct.
- Glow uses sensor/status colors; anomaly rings are a separate region-month flag.
- Historical source availability is unknown; detection dates are not coverage days.
  Missing months are not silently filled into forecasting input as observed zeros.
- Anomalies: exploratory leave-one-year-out, same-region/month median/MAD from
  only three baseline years. Zero-MAD fallback max(1,10% median) is disclosed.
- Outlook: retrospective Jan-Mar 2026 from data ending in 2025; not a current
  forecast. Seasonal naive vs seasonal mean, expanding-window tests in 2024/2025.
  Error bands use the 80th percentile of absolute backtest errors, not guaranteed
  prediction coverage. Model selection/evaluation share windows; no independent
  final holdout claim. The forecast target is observed activity, not fire risk.

## Manual smoke test

1. Open the frontend; confirm the real archive label and imported record count.
2. Change year/month, region, day/night, and optional date range. Explicit ranges replace year/month filters.
3. Switch MODIS/VIIRS/Harmonized; zoom to individual markers and inspect details.
4. Check blue/orange sensor and purple/amber match colors against the supplied
   legend. Unmatched markers are outlined; anomaly rings are independent.
5. Toggle glow density and province boundaries; zoom into clusters representing the entire selection.
6. Check historical monthly chart, regional shares, calendar details, candidate
   table, sensitivity, and retrospective outlook. Export selected analysis JSON.
7. Stop the backend and confirm the UI reports failure rather than sample data.

Browser automation was declined for this local origin during implementation.
Visual appearance, tile availability, small-screen behavior, and real browser
interactions therefore require this manual check before acceptance.
