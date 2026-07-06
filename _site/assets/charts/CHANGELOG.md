# RareCharts — Changelog

All notable changes to RareCharts are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/). The library follows semantic versioning.

Roadmap and planned features: [raredigits.art/charts/backlog](https://raredigits.art/charts/backlog/).

This file begins tracking at `v0.9.6`. Earlier versions were released without an itemized changelog.

> **Release checklist — the version has a single source of truth:**
> 1. Move the accumulated `[Unreleased]` entries in this file under a new `## [vX.Y.Z] — date — Title` heading.
> 2. Bump `version` in `assets/charts/src/version.json`. That value flows automatically to the runtime `RareCharts.VERSION` (`src/index.js`), the build banner (`scripts/build-charts.mjs`), and the docs version label / CDN pin (`_data/versions.js`) — nothing else to edit.
> 3. Push to `main`. CI does the rest: runs the tests, rebuilds the bundles from source (they are **not committed to git**), syncs `raredigits/rare-charts`, and pushes the `vX.Y.Z` tag — jsDelivr resolves `@latest` and version pins from those tags. The sync only fires for a version that is not yet tagged, so pushes between releases never reach CDN consumers.
>
> Whenever the public API surface changes (new chart class, new adapter, the construction pattern), update the banner's machine-readable header in `scripts/build-charts.mjs`.

---

## [Unreleased]

### Fixed

- **Categorical `Bar` now renders negative values** (`src/charts/Bar.js`). The vertical and horizontal category modes hard-coded a `[0, max]` scale domain, so a negative bar computed a negative height/width — an invalid rect that silently didn't render (the time-series mode already handled negatives). The domain now always includes 0 and extends to the data on both sides; bars grow from the zero baseline in both directions, entry animation starts at the baseline, and horizontal value labels flip to the correct side of a negative bar. Covered by `test/bar-negatives.test.js`.

### Changed

- **A GitHub Release is published automatically on release** (`.github/workflows/sync-charts.yml`). The sync already pushed the `vX.Y.Z` tag (which drives jsDelivr); now it also creates the human-facing card on the `rare-charts` Releases page, lifting the title and notes from this changelog's entry — so the Releases page no longer lags the tags.

## [v0.9.8] — 2026-07-03 — Axes & Accessibility

The pre-freeze groundwork release. Two axes features close out the backlog's Axes section: hiding an axis now reclaims the margin it occupied — so a flush or sparkline look no longer needs a manual `margin` override — and `TimeSeries` gains the visibility toggles every other cartesian class already had. Around the code: the library's first automated test suite (122 tests, now gating every deploy and CDN sync), accessibility groundwork (`prefers-reduced-motion`, accessible names on every chart), a release pipeline where the CDN only ever receives tagged versions, a documentation catch-up for every working option, and an MIT license consistency fix — plus a real adapter bug the new tests caught.

### Added

- **Hiding an axis now reclaims its margin** (`src/charts/Line.js`, `Bar.js`, `DualAxes.js`, `TimeSeries.js`). Turning an axis off (`showXAxis` / `showYAxis` / `showY1Axis` / `showY2Axis: false`) previously only dropped its ticks and labels — the default margin the axis occupied stayed behind, so a flush or sparkline look required a manual `margin` override. The default margins now track what actually occupies each gutter: a hidden axis collapses its side to `0`, and where a gutter is shared the space is kept while any occupant remains — `Line`/`DualAxes` keep the right margin while `endLabels` are on, `DualAxes` keeps an axis gutter while its `y1Title`/`y2Title` is set. An explicit `margin` always wins. Covered by `test/axes-margins.test.js`; removed from the [backlog](https://raredigits.art/charts/backlog/).
- **Axis-visibility toggles on `RareCharts.TimeSeries`** (`src/charts/TimeSeries.js`). The `showGrid` / `showXAxis` / `showYAxis` options that `Line`, `Bar`, and `DualAxes` already expose now work on `TimeSeries` too — previously its grid and both axes rendered unconditionally. Hidden axes reclaim their margins, same as above. Removed from the [backlog](https://raredigits.art/charts/backlog/).
- **Test harness — Vitest + jsdom** (`vitest.config.js`, `test/`). First automated tests for the library (122 across 10 files, including the axes tests above). Pure-function coverage of `core/utils.js` (date parsing, timeframe extents, stroke-dash, marker paths, nice ticks, annotation normalization, motion gating), `core/seriesPath.js` (line/area/band geometry, baseline), `core/theme.js` (theme merge), `applySvgA11y`, and the `fromArray` adapter — plus render **smoke tests** that construct every chart type (`Line`, `Bar`, `Donut`, `Gauge`, `DualAxes`, `TimeSeries`, `Map` via inline GeoJSON, `MultiChart` with children), feed data, and assert a labelled `<svg>` renders without throwing, including edge data (empty/all-zero Donut, Gauge value parsing and clamping). jsdom layout/`ResizeObserver` shimmed in `test/setup.js`. Run with `npm test` (watch) or `npm run test:run`. Tests live in repo-root `test/`, outside the Eleventy-published `assets/charts/`.
- **Reduced-motion support** (`src/core/utils.js` → `prefersReducedMotion()` / `motionDuration()`, `rare-charts.css`). Honours the OS `prefers-reduced-motion: reduce` setting: a CSS media query neutralizes in-chart CSS transitions, and `motionDuration()` collapses D3 animation durations to 0 so transitions resolve instantly. Applied to every animating chart type — `Bar`, `Line`, `DualAxes`, `Donut`, `Gauge` (`TimeSeries`, `Map`, `MultiChart` have no entry animation; `Graph` is experimental and excluded from 1.0).
- **Accessible name on the chart SVG** (`src/core/renderHelpers.js` → `applySvgA11y()`). The root `<svg>` now carries `role="img"` and an `aria-label` derived from `title`/`subtitle` (or an explicit `ariaLabel` option), so screen readers announce the chart instead of skipping it. Applied to `Bar`, `Line`, `TimeSeries`, `DualAxes`, `Donut`, `Gauge`, `Map` (`MultiChart` delegates to its child charts; `Graph` is experimental and excluded from 1.0).

### Fixed

- **`fromArray` / data adapters kept rows with a non-finite `value`** (`src/adapters/index.js`). The filter `!row.value || isFinite(row.value)` let `NaN` through because `NaN` is falsy (`!NaN === true`), so a row whose value failed to parse (e.g. `+'x'`) was not dropped despite the documented intent. Now uses `row.value == null || Number.isFinite(+row.value)` — an absent value and a legitimate `0` are kept, a present-but-non-finite value is dropped. Surfaced by the new test suite.

### Changed

- **Single source of truth for the version** (`assets/charts/src/version.json`, `scripts/build-charts.mjs`, `_data/versions.js`). The version was stamped by hand in four places — `index.js`, the triplicated build banner across three `package.json` esbuild scripts, and `_data/versions.json` — which could (and did, per the old release checklist) drift. Now `version.json` is the only place to edit: the runtime `RareCharts.VERSION`, the build banner, and the docs label all read from it. The build moved from inline `esbuild` CLI calls to a small Node script (`scripts/build-charts.mjs`) that composes the banner once and emits both bundles; `_data/versions.json` became `_data/versions.js`. No change to the public API or bundle output.
- **License field corrected to MIT** (`package.json`). Was `ISC`, contradicting the `LICENSE` file and README which both state MIT.
- **Documentation catch-up for existing options** (source header comments; docs pages). Every working option is now listed both in its class's header comment — the reference a human or LLM reads next to the code — and in the docs tables. Newly documented: `defaultView` (all date-based charts), `xTicks` on Line, `animate` on MultiChart, `reflectY` and `projection: 'identity'` on Map, `labelContent` and the actual pie-mode defaults on Donut, the global `strokeDash`/`markers` group and `yAxisPosition` on Line, the area/marker group on DualAxes, `areaColor` and tick formatters on TimeSeries. The Map `topoObject` doc no longer claims it is required (the code falls back to the topology's first object).
- **Built bundles removed from git** (`.gitignore`). `rare-charts.js` / `rare-charts.min.js` are build artifacts: every consumer — the site deploy, the CDN sync, local dev — rebuilds them from `src/` via `npm run charts:build`, so the committed copies could only drift from the source (and had). The source of truth in git is `src/`; ready-made bundles are distributed from the `raredigits/rare-charts` repo as before. No change to the published files.
- **Tests gate CI** (`.github/workflows/deploy.yml`, `sync-charts.yml`). `npm run test:run` now runs before the site build and before the CDN sync — a failing test blocks both.

## [v0.9.7] — 2026-06-19 — Footnotes

Finishes the chart footer. Two new attribution slots — an editorial `note` and a linkable, multi-part `source` — so the interpretive line and the data credits live inside the component instead of as hand-built markup glued around it. Plus a set of edge-rendering fixes (axis titles, web-font timing, flush bar labels) that surfaced while wiring a real client chart.

### Added

- **`source` accepts links and multi-part attribution** (`src/core/Chart.js` → `_renderAttribution`, `rare-charts.css`). Beyond a plain string, `source` now takes `{ text, href }` (a single linked attribution) or an **array of parts** — strings render as plain text, `{ text, href }` objects as links — so a footer can mix several linked and unlinked sources on one line (e.g. `Source: NASDAQ, Bloomberg, Internal calculations` with the first two linked). Links inherit the source text color (set apart by an underline, so they adapt to light/dark theme), open in a new tab with `rel="noopener noreferrer"`, and an array source wraps instead of truncating so every attribution stays visible. String and `HTMLElement` sources are unchanged. Flows through `MultiChart`'s shared footer. Removed from the [backlog](https://raredigits.art/charts/backlog/).
- **`note` text slot on every chart** (`src/core/Chart.js`, `rare-charts.css`). A new footer option renders a `<p class="rc-chart-note">` below the source line in `theme.muted`, for disclaimers, data caveats, and editorial context. Accepts a string or an `HTMLElement`. This was the recurring anti-pattern the settings page warned about — interpretive captions hand-built as a stray `<div>` glued under the chart container — now an in-component slot the chart owns. Long notes wrap (including unbroken tokens like URLs, via `overflow-wrap`) and the plot shrinks to keep the note inside the card rather than overflowing it. Also flows through `MultiChart`'s shared footer. Documented at [`/charts/settings/`](https://raredigits.art/charts/settings/); removed from the [backlog](https://raredigits.art/charts/backlog/).
- **Machine-readable bundle header + `RareCharts.VERSION`** (`src/index.js`, build banner in `package.json`). The minified bundle is opaque to anyone — human or LLM — handed only the file. The header now states the global, the `new RareCharts.<Type>(selector, options).setData(data)` construction pattern, the full list of chart classes, the container requirement, that d3/CSS are bundled, and that external data loads via the `fromJson`/`fromCsv`/`fromApi`/`fromArray` adapters — so consumers stop guessing class names or hardcoding structure. `VERSION` is also exported as a runtime constant for build identification. Pairs with the text-slot conventions added to [`/charts/settings/`](https://raredigits.art/charts/settings/).

### Changed

- **Axis titles clip to their margin instead of running off the chart** (`src/core/renderHelpers.js` → `renderAxisTitles`, `src/charts/DualAxes.js`, `src/core/utils.js` → `warnAxisTitleClipped`). `y1Title` / `y2Title` are now measured by rendered pixel width against the available axis margin (its exact overflow-clip boundary) and trimmed with an ellipsis only when they would actually be cut off — narrow glyphs in a terse title like `N · K HLX`, and the uppercase transform applied via CSS, are accounted for as they render, so a label that fits (e.g. `Inflows`) is left intact. The full text is kept as a hover `<title>`, a one-time console hint fires, and `axisTitleMaxLength` caps the length explicitly.

### Fixed

- **Horizontal bar value-axis end labels no longer clip at the chart edge** (`src/charts/Bar.js`). When the value axis sits flush against the card (`margin.left` / `right` = 0), the centered first/last tick label (e.g. `0`) was half-cut by the card's overflow clip. The first label is now anchored `start` and the last `end`, so both sit fully inside the plot while the bars stay flush.
- **Text-dependent layout now settles after the web font loads** (`src/core/Chart.js`). First paint can happen before the bundled font (Fira Sans) finishes loading, so measurements taken against the wider fallback font were wrong — axis titles that fit were trimmed, X-axis labels over-thinned, end-label boxes mis-sized. Each chart now re-renders once on `document.fonts.ready`, so these measurements are correct without waiting for a resize. The re-render does not replay entry animations.

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
