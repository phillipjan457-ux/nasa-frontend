# FIREWATCH frontend

React, TanStack Start, Leaflet and Recharts frontend for the historical archive.
Vite and the framework plugins are configured directly in vite.config.ts.

## Run from the repository root

Install dependencies once:

```powershell
npm.cmd --prefix frontend/command-center ci
```

Start the archive API and frontend in separate terminals:

```powershell
.\start-backend.cmd
```

```powershell
.\start-frontend.cmd
```

Open http://127.0.0.1:8081/map . Press Ctrl+C in each terminal to stop its server.
The frontend proxies /api/archive to http://127.0.0.1:8021. Real analysis requires
that API and its configured read-only database; sample modules are not a fallback.

## Validate from the repository root

```powershell
npm.cmd --prefix frontend/command-center test
npm.cmd --prefix frontend/command-center run build
```

npm is the supported package manager; commit package.json and package-lock.json.
The production build retains its Cloudflare Worker target and writes .output/.
The Python API and database require separate hosting. VITE_ARCHIVE_API can point
the frontend to that API; VITE_ values are public frontend configuration.

Source errors remain available through the normal browser/server console and
application error pages. No external editor telemetry is required.
