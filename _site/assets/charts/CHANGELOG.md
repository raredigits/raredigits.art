# RareCharts — Changelog

All notable changes to RareCharts are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/). The library follows semantic versioning.

Roadmap and planned features: [raredigits.art/charts/backlog](https://raredigits.art/charts/backlog/).

This file begins tracking at `v0.9.6`. Earlier versions were released without an itemized changelog.

---

## [Unreleased]

## [v0.9.6] — 2026-06-14 — Confidence Bands

Adds a band (confidence-ribbon) primitive to `Line` and the supporting legend and tooltip work to make it readable. Targeted at forecasts and any figure where a single line would overstate precision. Also corrects two `strokeDash` defects that were documented but didn't work.

### Added

- **`band` series type on `RareCharts.Line`** (`src/charts/Line.js`, `src/core/seriesPath.js`). A series marked `type: 'band'` with `{ date, lower, upper }` points renders a filled ribbon between the two boundaries at each x — for confidence intervals (P10–P90 cones), min/max envelopes, and error bands. The band draws behind every line and area, both bounds participate in the Y scale, and it mixes freely with ordinary line series in the same `setData` call. Fill uses the series `color` at `fillOpacity` (default `0.16`). Detected by `type: 'band'` or by the presence of `lower`/`upper` on the first point. Documented at [`/charts/line/band/`](https://raredigits.art/charts/line/band/) with two examples (`examples/line/line-chart-band.js`, `examples/line/line-chart-forecast.js`).
- **Band readout on hover** (`src/core/Crosshair.js`). A band reports its range in the crosshair tooltip as `lower – upper` (e.g. `P10–P90: $1.95M – $3.65M`). It draws no crosshair dot — a band has two edges and no single point, so a dot would be ambiguous; markers and end labels skip it for the same reason.
- **Legend swatch types** (`src/core/Chart.js`, `rare-charts.css`). A legend entry's `type` now selects its swatch so the legend matches the on-screen encoding: `'band'` → filled square, `'dashed'` (or `dash: true`) → dashed rule, `'dot'` / `'bar'` → dot (unchanged), default → solid rule. Needed because a forecast draws actuals, P50, and the range in a single hue, where the legend has to carry the distinction.

### Changed

- **The crosshair only reports a series where its data covers the cursor date** (`src/core/Crosshair.js`). A partial series — a forecast band or a projected line that starts part-way along the axis — no longer snaps its nearest endpoint across the whole width; it stays silent outside its own date range. When nothing is under the cursor, the crosshair line, dots, and tooltip clear. **This affects every chart that uses the crosshair, not only bands** — in practice it only changes charts whose series span different date ranges.

### Fixed

- **Per-series `strokeDash` was documented but never applied.** The field was listed in the Line options table and read during render, but `_normalizeData` dropped it, so a per-series dash pattern had no effect. It is now carried through and works.
- **`resolveStrokeDash` rejected raw dash-array strings** (`src/core/utils.js`). The options table implied a value like `'4,3'` was accepted, but only the named presets (`'dashed'`, `'dotted'`, `'dashDot'`, `'longDash'`) resolved — any raw string fell through to `null`. A numeric dash-array string (e.g. `'5,4'`, `'4 3'`) is now passed through as-is.
