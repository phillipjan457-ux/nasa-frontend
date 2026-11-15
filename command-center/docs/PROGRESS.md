# FIREWATCH implementation checklist

Authoritative checklist for integration/real-archive. Completed means implemented
and checked as specified below; this is not a claim of scientific validation.

## Completed
- [x] Inspect/import both original 2022-2025 datasets (617,112 rows, zero rejected).
- [x] Preserve raw rows, sensor confidence semantics, collection versions and SHA-256 provenance.
- [x] SQLite persistence, repeat-import skipping, source/observation/filter indexes.
- [x] Source-linked distance/time candidates and maximum-weight one-to-one MVP groups.
- [x] Retain unmatched and low-quality observations; document matching eligibility.
- [x] Parameter/version metadata, candidate review API and stricter threshold sensitivity.
- [x] Licensed Indonesia ADM1 lookup; unassigned/offshore status retained.
- [x] Real-data frontend/API connection with pagination and no generated-data fallback.
- [x] Requested sensor/status legend and matching Canvas glow/cluster styling implemented.
- [x] Year/month/date/region/day-night filters, source details, and raw provenance panel.
- [x] Four-year/monthly comparison, region shares, selected calendar and computed narrative.
- [x] Exploratory anomaly analysis with baseline/fallback limitations.
- [x] Retrospective outlook with chronological backtests, MAE and empirical error bands.
- [x] API errors, missing-data labels, and live-feed-unavailable state.
- [x] Setup/ingestion/test documentation and ignored local scientific data.

## Acceptance still needed
- [ ] Visual browser check of map tiles, glow, filters, selection, paging and mobile layout.
- [ ] Independent manual review of matched/possible/unmatched observations; report false/missed matches.
- [ ] Review collection differences and observational availability with the team.
- [ ] Province-boundary vintage and offshore record review.
- [ ] Review whether MODIS-anchored provisional activity is the team-approved metric.
- [ ] Production hosting of the Python API and persistent SQLite; configure frontend origin.
- [ ] Connect live FIRMS only if a configured authorized feed is supplied (optional).
- [ ] Full Bahasa Indonesia localization (optional; current control labels partly localized).
- [ ] Broader spatial/time threshold experiments and defensible footprint geometry (optional).

## Validation
Record final command results in the delivery report. Original template pure-function
unit tests cover the retained sample implementation; new Python tests cover the
real ingestion/assignment/API. Offline UI tests cover real API wiring, filtering,
legend presence, and failure states. A production build is not a visual test.
No source commits, pushes, or publishing are performed by the assistant.


## Delivery checkpoint
- 11 frontend tests and 6 Python backend tests passed.
- TypeScript check and production build passed.
- Real-data audits passed: 617,112 originals, zero rejected, zero exact duplicate
  records, 32,614 candidates, 2,751 matched groups, 5,818 possible groups.
- 2,563 unassigned/offshore observations remain queryable.
- Group assignment is one-to-one and conserves source membership; monthly and
  annual MODIS-anchored activity totals reconcile. Strict/default sensitivity
  reconciles with the stored assignment.
- Browser preview was explicitly declined; visual/manual acceptance is pending.
- Local frontend: http://127.0.0.1:8080 ; Python API: http://127.0.0.1:8020 .
- Not committed, pushed, merged into the team repository, or published.


## Dashboard parity fixes (six requested corrections)
- [x] Monthly activity bar chart with real selected-period data.
- [x] Full-selection map without manual pagination. All 617,112 observations
  contribute; view-dependent server clusters expand with zoom and viewport.
- [x] Explicit date ranges override stale year/month selectors. All years is
  the default and reset selection. 2022 range verified: 68,965 source records.
- [x] Actual monthly heatmap calendar, correct weekday alignment and leap days,
  month/year navigation, selected-day sensor/group/region panel and map action.
- [x] Sensor contribution cards, outcome proportion bar and side-by-side match metrics.
- [x] 2022-2025 Situation & Shift cards, monthly comparison by metric, region share
  table and percentage-point shifts, and computed narrative.
- [x] Reconciled all 48 calendar months with stored monthly activity totals.
- [x] Full map totals: MODIS 106,262; VIIRS 510,850; Harmonized 608,543.
- [ ] Visual browser check: user approved this turn, but saved browser site policy
  still denies localhost:8080. No alternate browser/workaround was attempted.

Older notes about map paging describe the previous implementation and are
superseded by this checkpoint. Original observation/detail endpoints can still
page for technical API clients; the dashboard map does not page or sample.

Final six-fix checks: 12 frontend tests and 8 backend tests pass; TypeScript and
production build pass. See UI_FIX_VALIDATION.json for full-selection counts and
48-month calendar reconciliation. Browser visual testing remains blocked by
a saved local-site permission, despite the user approving it in this chat.
