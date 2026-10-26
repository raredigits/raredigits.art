# RareCharts — Engineering Backlog & Roadmap

**Current version:** resolved from [`assets/charts/src/version.json`](../../assets/charts/src/version.json). Do not hardcode version numbers in this header.
**Public feature backlog:** [/charts/backlog/](../../charts/backlog/index.md) tells users what is coming. This file is the engineering plan: tasks, debts, decisions and exit criteria. It is not synced to `raredigits/rare-charts` (`sync-charts.yml` copies only the bundles, `rare-charts.css`, examples, data, README and LICENSE).
**Lives in** `_internal_docs/charts/` with the other internal documents, which the site build ignores (`.eleventyignore`).
**Replaces:** the Russian working notes `_internal_docs/charts/*-INTERNAL.md`. Deleting them is an exit criterion of `0.9.8_7`. Until then they are the sources Appendix A points into: the same text as at commit `e852051`, where they still lived under `charts/`.

---

## Conventions

- **Priority:** P0 (blocker) · P1 (important) · P2 (nice-to-have)
- **Type:** `bug` · `feat` · `a11y` · `perf` · `chore` · `docs` · `test` · `decision`
- **Estimate:** S (≤4 h) · M (1 day) · L (2–3 days) · XL (a week+)
- **IDs.** The `0.9.8_6` audit IDs stay as they are, because code comments, tests, `rare-charts.css` and the public CHANGELOG cite them. Families:
  - `R-` relation bugs (Graph flow, MapFlow)
  - `T-` time navigation and the navigator
  - `C-` older classes, theme and CSS
  - `K-` contracts and decisions before the 1.0 freeze
  - `D-` duplication
  - `X-` dead code
  - `S-` tests
  - `O-` docs and plans
  - `B-` owner requirements

  New tasks get `RC-NNN`. Rare Styles tasks are `CSS-NNN` in [`assets/css/docs/BACKLOG.md`](../styles/BACKLOG.md).
- **Pulled** marks work taken into a milestone from a later one because it touches the same code. It is the first thing to hand back if the milestone grows too large.

## Planning rules (owner decisions)

- **2026-10-26 — everything open goes into `0.9.8_7`.** Every open audit item, plus adjacent work from later releases. The aim is that nothing is forgotten or lost. On 2026-10-26 the owner also put two features in: B-06 (clickable map regions) and an interactive legend in every chart that has a legend (RC-054).
- **2026-10-26 — internal debt rides with the release that touches its files.** From `0.9.8_8` on, no separate debt list is carried. A debt found later goes into the milestone that changes those files.
- **2026-10-26 — internal documents.** Internal documents live in `_internal_docs/charts/` and `_internal_docs/styles/`, ignored by the site build. When a document's work is done, it is deleted; its open tasks move into this backlog first.
- **2026-10-26 — Rare Styles fixes never ride a charts release.** They go to the Rare Styles backlog. A RareCharts release commit holds only the charts and their docs/site, and no internal Russian files.
- **2026-10-26 — Rare Styles `v0.7.2` ships first.** It closes the Rare Styles debts toward RareCharts (Part A), ships the chart dependencies pulled in from later milestones (Part B), and harvests `rare-website.css`. After that, RareCharts removes its temporary rules against Rare Styles defects (section H).
- **2026-10-22 — TimeSeries Analytics is taken out of turn as `0.9.8_7`** for a donor's traffic report. Charts that do not set the new options must keep their current behaviour.
- **Release mechanics.**
  - A big release lives on a branch named after it. The owner checks it by hand before the push.
  - The release is a squash into `main`.
  - `sync-charts.yml` releases on push when `version.json` names an untagged version.
- **Experimental classes.** Graph (all views), Sankey and MapFlow are outside the 1.0 guarantee (B3). They are promoted only after real use.

---

# Milestone `0.9.8_7` — TimeSeries Analytics & Pre-1.0 Cleanup

**Goal.** Two halves:
1. The donor's traffic-report TimeSeries on one time-zone policy: presets anchored to now, resolution that follows the window, a custom range, a comparison series, counts and gaps.
2. Every open item of the `0.9.8_6` audit closed, so that `0.9.9` is only final debugging and the last rename window.

With this milestone the internal Russian notes are retired. Whatever still matters moves into this file, `DECISIONS.md`, the public docs or code headers. Then the nine `charts/*-INTERNAL.md` files are deleted.

**Depends on:** Rare Styles `v0.7.2`:
- section H needs `CSS-371`…`CSS-373`, `CSS-377` and `CSS-381` (Part A);
- RC-014 and K-14 need the chart tokens (`CSS-380` names and the `CSS-240` values, Part B);
- D-04 and RC-054 follow the legend primitive contract (`CSS-178`, Part B);
- RC-058 needs the panel family, `.stat` and the callout variants (Part B).

Everything else can start now. This milestone ships after `v0.7.2`. On 2026-10-26 the owner moved the sibling review (`CSS-342`) to `v0.7.3`, and added to `v0.7.2`:
- the remaining chart dependencies (Part B);
- urgent consumer requests (Part C): first the button system and forms (moved from `v0.7.9`), then whatever the owner brings.

**Working setup.**
- Branch `timeseries-analytics-v0.9.8_7`, cut from `main`. It carries the latest internal notes in `_internal_docs/charts/` once the `internal-docs` branch has merged.
- The release commit is a squash into `main`. By then the nine internal notes are deleted.

**Work order** (risk first):
1. **Safety net.** S-14, S-16, S-17, S-18 and RC-026: the tests the refactors and T-10 rely on.
2. **Owner decisions.** The table under section C. They fix the API that the refactors and the analytics build on.
3. **Refactors.** First D-02, D-09 and D-10, the base for the analytics. Then D-04 (with K-05, K-06 and the legend items), then D-05…D-08.
4. **Time.** T-10, then TimeSeries Analytics (A).
5. **The rest.** Theme and tokens (D), accessibility (E), performance and bugs (F), dead code (G).
6. **Section H**, once Rare Styles `v0.7.2` has shipped.
7. **Docs and retirement.** Docs (I), retirement of the internal notes (J), release checks (exit criteria).

## A. TimeSeries Analytics (donor request, backlog `0979693`)

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `RC-001` | feat | **Calendar presets anchored to now.** Add `timeframeAnchor: 'now' \| 'dataEnd'` (default `'dataEnd'`, today's behaviour). Calendar keys `TODAY`, `WTD` (with `weekStart`), `MTD` and `YTD` start at the beginning of the day, week, month or year in the chart's time zone. Rolling keys `24H`, `7D`, `30D` and `12M` stay rolling. Depends on T-10. The API sketch is provisional. | P0 | L |
| `RC-002` | feat | **Resolution follows the window.** Either lazy loading, `onTimeframeChange(({ key, extent }) => Promise<data>)` with a loading state, or multi-level data, `setData({ hour, day, week, month })` with `resolution: { maxPoints }`. Switching from Year to Today shows hourly buckets instead of zooming into daily data. The navigator keeps the full range at the coarse resolution. Each switch fires one callback, and buttons and brush stay in sync. | P0 | L |
| `RC-003` | feat | **Custom range in the range bar.** From/to date inputs, key `'CUSTOM'`, which can be turned off. It goes through `setView` and `onTimeframeChange` like the preset buttons. Styled by the library and independent of Rare Styles forms (standalone contract, C-13). | P1 | M |
| `RC-004` | feat | **Comparison series.** `compare: 'previousPeriod'` or a second series: the previous window of equal length, aligned to the current one, dashed and without an area. The tooltip shows it next to the main value. | P1 | M |
| `RC-005` | feat | **Counts and gaps.** `yFormat: 'number'` as on Line, plus `yPrefix` / `ySuffix`, keeping `'$'` as the default for existing charts (see K-10). `gaps: 'join' \| 'zero' \| 'break'`, default `'join'`: today's behaviour, where a missing bucket is dropped and the line joins its neighbours. | P0 | M |
| `RC-051` | feat | **Bands on TimeSeries and DualAxes** — *pulled* from the public backlog. The `{ date, lower, upper }` band series, cheap once D-09 shares the line skeleton. | P2 | M |
| `T-09` | feat | **Wheel zoom needs Ctrl/⌘** (owner, 2026-10-26), on TimeSeries and by the same rule on Map and MapFlow. A plain wheel scrolls the page; a short hint appears when someone wheels without the modifier. Visible change; add a CHANGELOG entry. | P1 | S |

On release, remove the "Time Series: analytics ranges" section from `/charts/backlog/` (RC-041).

## B. Time zones

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `T-10` | bug | **One UTC/local policy.** Today a `'YYYY-MM-DD'` string is parsed as UTC midnight, but shown and cut in local time, so month buckets shift west of UTC. `resolveTimeframeExtent` mixes the two: YTD is normalised to midnight, relative windows are not. `'1M'` from 31 March gives 2 March. Fix: a `timeZone: 'UTC' \| 'local'` option for parsing, ticks, tooltips and preset boundaries (default `'local'`, owner 2026-10-26: what users see today; date-only strings become local midnight); a day-of-month clamp; tests under a fixed non-UTC TZ. The span-aware tick formats (C-31) follow the zone. Touches `core/utils.js`, `core/Chart.js`, `core/Crosshair.js`, `charts/TimeSeries.js`, `test/timeframes.test.js`. | P0 | L |
| `RC-006` | feat | **Link times under the same policy.** `parseTime` in `core/links.js` builds years and months in UTC and reads ISO through `Date.parse`. Apply the T-10 zone to link start/end, the link-time timeframes and the navigator (`Chart._timeLinks`) in flow and MapFlow, with tests under a non-UTC TZ. | P1 | M |

## C. Names and defaults before 1.0

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `K-05` | decision | **One type-filter API across ego, flow and MapFlow.** Today: ego has `relationTypes` / `setRelationTypes` / `clearRelationTypes` (a traversal filter; no effect in path/cluster). Flow has `hiddenLinkTypes` plus legend clicks and no setter. MapFlow has `hiddenLinkTypes` plus `setLinkTypesVisible(types\|null)`. Separate the traversal filter from visibility, and give flow a programmatic visibility API compatible with MapFlow's. Settle `interactiveLegend` (Graph ego and flow) in the same API. Record the naming of `folds` (not `groups`, which means colour) and MapFlow `linkLegend` (`legend` is the header legend). | P1 | M |
| `K-06` | decision | **State classes.** Timeframe buttons toggle a bare `.active` (`core/Chart.js`) with no `aria-pressed`. MapFlow and flow legends reuse `rc-graph-legend-item`. Target: `.rc-range-btn.is-active` plus `aria-pressed`, and `.rc-legend-toggle`. The old classes stay as aliases for one release. Lands with S-16. | P1 | S |
| `K-08` | decision | **Animation options.** `duration` defaults: Bar, HierarchicalBar and the Graph network views 500; Sankey 600; Line, DualAxes and Donut 650; Gauge 800. `stagger` exists only on Bar (not stacked). TimeSeries, Overview, MapFlow and flow silently ignore both. Pick one default or a documented per-type rule, and document which classes have no motion. | P1 | M |
| `K-10` | decision | **Defaults table.** Settle each pair, or record why it differs, in one public table (RC-033):<br>• `area`: three meanings (Line boolean + `areaOpacity`; DualAxes per series; TimeSeries/Overview `false\|true\|number`, gradient).<br>• `yTicks`: 4 vs 5.<br>• `xTickFormat`: `'%m/%d'` vs span-aware.<br>• TimeSeries `'$'`, hardcoded in ticks and tooltip, with no number-format options.<br>• `curve`: DualAxes `'linear'` vs `'monotone'`.<br>• TimeSeries has no `curveTension` and no per-series `strokeWidth`; its stroke fallback is 1.5.<br>• `barWidthRatio`: 0.72 vs 0.65.<br>• Y gutters: 64 / 65 / 70.<br>• DualAxes: `y1*` / `y2*` option names and the `'+.2f'` default of `y2TickFormat`.<br>• `centerLabel`: Donut `'Total'` vs Gauge null; Gauge has no formatters and one colour.<br>• `nodeRadius`: 22 / 18 / 4. | P1 | L |
| `K-11` | feat | **MultiChart takes every class** — *pulled in full* from `0.9.8_9`. Today `TYPE_MAP = { Line, Bar }`; add Donut, Gauge, DualAxes, TimeSeries, HierarchicalBar and the rest. Comes with the S-19 cascade test. Retarget the public backlog row. | P1 | M |
| `K-15` | decision | **Fonts.** Tooltips are wholly in Cousine: use Fira, and mono only for numbers (`.rc-num`). Put the navigator axis on `.rc-axis`. Turn ~20 px sizes into size tokens and read `--rc-font-size`. Set line-heights independently of the host (the tooltip, cell titles, controls and the source line inherit 24px on Rare Styles pages). HierarchicalBar's SVG `font-weight` 600 is outside the self-hosted set: use 700, and extend the K-01 test to SVG attributes. | P1 | M |
| `RC-007` | decision | **Formatter option names** (`yTickFormat` / `xTickFormat` / `tooltipFormat`, DualAxes `y1`/`y2`). K-09 unified the arguments, not the names. Check whether reconciliation is still needed, then decide. | P2 | S |
| `RC-008` | decision | **`legendPosition`.** Freeze the enum with `'right'` only, or add values. | P2 | S |
| `RC-009` | decision | **Bar picks its mode from the first row** (date / categorical / stacked). Add an explicit `mode` option, or document the detection rule as contract. | P2 | S |
| `RC-010` | decision | **Relation-class names** (experimental). Sankey's tooltip payload `{ node, incoming, outgoing }` vs `{ node, links }`; Sankey ignores `linkTypes[].dash`; `onSelect` exists only in flow; `timeWindowMode` is `'dim'` in flow and `'hide'` in MapFlow on purpose (record it). Bump the known consumers' pins after renames. | P2 | M |
| `RC-011` | chore | **Remove the theme tokens that have no reader:** `positive`, `negative`, `fontSize` (owner, 2026-10-26: in this release). `/charts/styles/` promised the `fontSize` removal at 1.0; update it, and add a CHANGELOG entry under Removed. | P2 | S |
| `RC-012` | docs | **`types: [...]` on one link is not supported** (owner, 2026-10-26). Document "one link per type" in the data-shape docs of Graph and MapFlow. | P2 | S |
| `RC-056` | feat | **One name for horizontal bar thickness: `barWidth`** (owner, 2026-10-26). HierarchicalBar's `barHeight` becomes `barWidth`, and `barHeight` support is removed, with no alias. The rename is mentioned in the docs and the CHANGELOG. The defaults table follows. | P2 | S |
| `RC-013` | bug | **Standalone Overview merges the theme shallowly** (`{ ...defaultTheme, ...options.theme }`). No darkTheme base, and the `tooltip`/`map` sub-objects are not deep-merged. Use `createTheme`. | P2 | S |
| `RC-059` | chore | **Remove the deprecated `viewSteps` alias** (owner, 2026-10-26: in this release, not `0.9.9`). README, `/charts/line/time-series/` and the CHANGELOG promised `0.9.9`; update them, and add a CHANGELOG entry under Removed. | P2 | S |

**Owner decisions** (2026-10-26, all taken; the tasks above carry them out):

| # | Decision | Outcome |
|---|---|---|
| 1 | C-41 Bar `valueFormat` default | `.3~r`, as on Line's end labels |
| 2 | TimeSeries `'$'` default | Keep `'$'`; add `yFormat` / `yPrefix` / `ySuffix` (RC-005) |
| 3 | Bar `barWidth` vs HierarchicalBar `barHeight` | `barWidth` in this release; `barHeight` removed without an alias, mentioned in the docs (RC-056) |
| 4 | `viewSteps` removal | In this release (RC-059) |
| 5 | Wheel zoom | Ctrl/⌘ + wheel on TimeSeries, and on Map and MapFlow (T-09) |
| 6 | `types: [...]` on one link | Not supported; one link per type, documented (RC-012) |
| 7 | Theme tokens with no reader | Removed in this release (RC-011) |
| 8 | `_drafts/address-graph-octra.html` | Deleted (branch `internal-docs`) |
| 9 | Field findings | A section at the end of this file (RC-049) |
| 10 | Items this plan pulled (RC-051, RC-052, RC-053, RC-024, K-14) | Kept; hand them back first if the release grows |
| 11 | T-10 default `timeZone` | `'local'` |
| 12 | Interactive legend default | On everywhere; `legendInteractive: false` turns it off |
| 13 | Axes when a series is hidden | Rescale; `legendRescale: false` keeps them fixed |

## D. Theme, tokens and CSS

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `K-14` / `B-05` | feat | **Theme colours reach CSS** — *pulled*; it was unplanned. Publish the theme as `--rc-text`, `--rc-muted`, `--rc-bg`, `--rc-surface`, `--rc-border`, `--rc-control-*` and `--rc-focus-ring` on the container. Graph chrome (tools, hidden-node list, details panel, full screen, the "+N more" panel) and the range buttons read them. The dark theme comes from `darkTheme`/`createTheme` only, never from the page's variables (flow spec rule). Acceptance: readable with darkTheme on a standalone page, light theme unchanged, checked in a browser. The tool icons stay later (post-1.0). | P1 | L |
| `RC-014` | feat | **Token chain to the Rare Styles chart tokens.** Read the `--chart-*` names agreed in Rare Styles `CSS-380`. Precedence, highest first:<br>1. a value the chart's own theme sets (an explicit `theme` or `darkTheme`), which K-14 publishes as `--rc-*`;<br>2. the page's `--chart-*` tokens;<br>3. today's page tokens, as fallbacks only: `--white`, `--primary-color`, `--primary-text-color`, `--text-color-light`, `--border-color`, `--bg-color`;<br>4. the literal values (the C-13 contract).<br>`theme.bg` defaults to `var(--chart-bg, var(--bg-color, #fff))`. A darkTheme chart on a Rare Styles page keeps its own colours. It absorbs Rare Styles `CSS-173` ("charts read colours from CSS custom properties"), which moved here on 2026-10-26 because it is a charts-side change. This fixes the near-invisible active timeframe inside Rare Styles `.card-inverted`. | P1 | M |
| `RC-015` | a11y | **One chart focus rule** (`--rc-focus-ring`) for every control: the range and Lin/Log buttons and the inline zoom/fullscreen buttons get none today, so one card shows two focus styles. Folds the five repeated outlines (X-07). With K-23/K-24. | P1 | S |
| `RC-016` | bug | **`box-sizing: border-box`** on `.rc-chart` and the library's own boxes: overflow panel and rows, tooltip, buttons. Today it is hidden by Rare Styles' global reset; content-box hosts get overflowing rows and less plot height. | P1 | S |
| `RC-017` | decision | **Chart links and the page's hover effect.** On Rare Styles pages the source, tooltip and details links take the page's link background effect. Add `background: none`, or accept it. | P2 | S |
| `RC-018` | bug | **`.rc-graph-overflow-close:hover`** resets border and shadow but not background. Add `background: transparent`. | P2 | S |
| `RC-019` | feat | **`@media print`**: hide the range row, the Graph tools and the tooltip. Rare Styles' print module hides page controls, not chart controls. | P2 | S |
| `RC-020` | chore | **`.rc-sr-only`**: use `clip-path: inset(50%)` instead of the deprecated `clip`. | P2 | S |

## E. Accessibility

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `K-23` | a11y | **Keyboard access to ego/path/cluster ties** and the `sources` links in their tooltips. Since K-20 nodes are reachable but ties are not, and tie tooltips pin with the mouse only (follow-up to A3). Decide the Tab order (ties come before nodes in the DOM). | P1 | M |
| `K-24` | a11y | **`svg role="img"` contains focusable `role="button"`** in Graph, flow, Sankey and MapFlow. Decide the contract with K-23: svg role, group roles, or an application region. | P1 | M |
| `RC-022` | a11y | **Sankey: a keyboard path to bands.** Today nodes are Tab stops but their tooltip shows only totals. Either the node tooltip lists inputs and outputs, or bands become focusable. | P2 | S |
| `RC-023` | a11y | **Accessible names for MultiChart and the standalone Overview.** Neither can be given one. Overview sets no role and its brush is not keyboard-operable. | P2 | M |
| `RC-024` | a11y | **Sankey: a hit area of at least 8 px for thin bands** — *pulled*. Use an invisible wide stroke, as flow and MapFlow do. | P2 | S |
| `ariaLabel` | chore | Record the rule "every SVG class calls `applySvgA11y`" in a code comment, or move the call into `Chart._createSvg()` with D-09. All ten SVG classes call it today. | P2 | S |

## F. Performance and bugs

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `K-16` | perf | **The rest of flow performance.** Live brush moves are done (`441162a`). One flow render still costs ~33 ms at 300 nodes / 900 links, mostly label fitting and `flowAuto`. Profile a fixed graph on brush and resize, cache the window-independent layout and label widths, remove any double sync, and measure again with the same scenario. The old "564 ms" figure is not a benchmark. | P1 | M |
| `C-40` | bug | **MapFlow `fitTo: 'links'`:** arc ends on the antimeridian or Mercator's polar edge stay at the frame edge. Move the point off the seam before the inverse projection, then drop the docs caveat. | P2 | S |
| `C-41` | bug | **Bar default `valueFormat` `',.0f'` prints 0.4 as "0".** The default becomes `.3~r`, as on Line's end labels (owner, 2026-10-26). Visible change; add a CHANGELOG entry. | P2 | S |
| `B-06` | feat | **Clickable map regions** (owner, 2026-10-26; it was in 1.x). Add `onRegionClick({ feature, item, event })` on Map, with the item's data and the feature; navigation through `item.href` is designed as a separate step. Acceptance:<br>• keyboard access, with regions as focusable targets (with K-24's a11y contract);<br>• a drag or zoom is not taken for a click;<br>• MapFlow arc and node clicks do not fire the region callback;<br>• destroy and setData leave no stale handlers.<br>R-10 and C-09, which it was ordered after, closed in `0.9.8_6`. | P1 | M |

## G. Refactoring and dead code

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `D-02` | chore | **Tooltip lifecycle.** The tooltip is created in 10 constructors and destroyed in 2. Add a lazy `get tooltip()` in Chart and destroy it in `Chart.destroy`. | P1 | S |
| `D-04` | chore | **One legend builder** (`core/legend.js` `renderLegendItems`) replaces three: Graph chrome, flow, MapFlow, plus flow's own dots. It carries K-05, K-06 and the R-16 focus return. One swatch contract: colour through a custom property, the off state from `[aria-pressed]` in CSS instead of three inline `style.opacity` writes, one set of swatch sizes. Joining it:<br>• `RC-052` *pulled* — Sankey's interactive type legend (hide and show bands without re-layout).<br>• `RC-053` *pulled* — a flow legend key for node shapes, dashes and line width.<br>• `RC-054` (owner, 2026-10-26) — the interactive legend in every class, below. | P1 | L |
| `RC-054` | feat | **An interactive legend in every chart that has a legend** (owner, 2026-10-26; it replaces the narrower "legend series isolation" from `0.9.8_9`).<br>**Classes:** Line, DualAxes, TimeSeries (with the RC-004 comparison series), Bar (stacked series and multi-series date mode), Donut and Pie (slices), Sankey (RC-052), and Graph / flow / MapFlow, which are interactive today and are unified by D-04. Gauge, HierarchicalBar and Map's colour scale draw no series legend; record that in the docs.<br>**Behaviour:**<br>• a click or Enter/Space toggles a series;<br>• Alt/Option-click isolates it, and a second Alt-click restores all;<br>• `aria-pressed`, and focus return (R-16);<br>• the hidden series leaves the tooltip, the crosshair and the end labels;<br>• the axes rescale to the visible series; `legendRescale: false` keeps them fixed (owner, 2026-10-26);<br>• `onLegendToggle({ name, visible, visibleNames })`.<br>**Mapping:** the header `legend` items map to series by `name`, with an explicit `series` key when the label differs.<br>**Option:** `legendInteractive`, on by default; `false` gives a static legend (owner, 2026-10-26). Visible change; add a CHANGELOG entry.<br>One builder (D-04) and the swatch contract of Rare Styles `CSS-178`. Tests per class; docs on `/charts/settings/` (Legend) and each class page. | P1 | L |
| `D-05` | chore | **`layoutFlow`** computes lane columns and resolves `_lane` twice. Re-locate the code (the cited lines predate Flows II), then merge into one pass with no behaviour change. | P2 | S |
| `D-06` | chore | **Shared link helpers.** Add `linkValue`, `linkWeight` and `groupTies` to `core/links.js`. Value/weight parsing is written 5+ times; pair grouping is in both Sankey and `flowFold`. | P2 | M |
| `D-07` | chore | **Curved links.** `parallelIndex` is shared already. Still open: a `{ directed }` option and offset, one `quadBow()`, and MapFlow's own `bow()`. | P2 | M |
| `D-08` | chore | **Label placement.** Move `estimateTextWidth`, `boxesOverlap` and `placeFirstFree` into renderHelpers; each is written 3 times. Fix the Graph "+N" badge overlapping a neighbour's label on a tight grid. | P2 | M |
| `D-09` | chore | **Shared skeleton for Line, DualAxes and TimeSeries** (~150 copied lines), and the svg preamble in 8 classes. Add `Chart._createSvg()` (with `applySvgA11y`), `drawLineSeries`, `filterLogSeries` and `clampAnnotationsForLog`. Move TimeSeries' horizontal crosshair line into Crosshair. Base for section A and RC-051. | P0 | L |
| `D-10` | chore | **Y axes.** One `renderAxisY(g, scale, { side })` instead of the near-identical right/left pair. Replace Bar's 12 inline `d3.axis*` calls, and thin Bar's X labels. | P1 | M |
| `RC-025` | chore | **Donut/Gauge angle math into pure functions** (optional). Makes the S-13 Gauge clamp test direct. | P2 | S |
| `X-06` | chore | **Write-only fields, unused parameters, a double import.** The audit's candidates:<br>• fields `_activeTimeframe`, `clipId`, `Map._zoomTransform`, `Map._geoPath` (its comment about MapFlow is wrong), `_toolsEl`, `_zoomControlsEl`, `Sankey._layout`, `Sankey._vertical`, `FlowView._apply`, `Crosshair._g`;<br>• unused parameters: `Graph._draw` W/H, and `nodeById`, `dashOf` and `top` in `flow.js`;<br>• a double `utils` import in `Graph.js`.<br>Re-verify each before deleting: after R-14 MapFlow reads `_zoomTransform`, and D-11 moved `_toolsEl`, `_zoomControlsEl` and `_draw`. | P2 | S |
| `X-07` | chore | **`rare-charts.css` duplicates.** Repeated button resets, focus outlines and note styles (re-locate; the cited lines are stale). Plus the dead rules found on 2026-10-26: `.rc-chart-controls label.is-disabled` (no JS emits it), the stale `.rc-graph-note` / `.rc-graph-hidden-note` entries, `.rc-chart-navigator { width: auto }` and the repeated legend padding. | P2 | S |
| `X-08` | test | **Doubled-class selectors.** Build a hostile-host browser fixture (button, input and reset rules) and drop a specificity boost only where the fixture proves it unneeded. Keep the hover reset of `.rc-graph-overflow-close`. The fixture also re-checks the generic guards in section H. | P1 | M |
| `X-09` | chore | **Junk in demos and `_temp`.** The unused 9th argument of `E(…)` (28 calls), `goldValues`, `codeWrap`, the link to a non-existent `price-chart.css`, `_temp/watchtower-flows-example.js`. | P2 | S |
| `X-11` | chore | **Graph tool buttons.** Move the inline `cssText` (`graph/chrome.js`) into classes; drop the inline `position` that forces `!important`; remove the dead `:fullscreen` rule. Give the details hint `.rc-graph-details-muted` instead of `<p style>`, which a strict CSP blocks. With K-14. | P2 | S |
| `X-12` | chore | **Order and comments.** Reorder the `rare-charts.css` sections and fix its stale comments, after X-07 and X-08. Also:<br>• the Graph.js header comment drift (the K-20 paragraph inside the Methods list; an orphan whenReady comment);<br>• the stale "(backlog)" pointer in `graph/tooltips.js`. | P2 | S |

**Tests** (the safety net goes first, see the work order):

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `S-13` | test | **Weak assertions.** Donut looks for non-existent classes and falls back to a path count. The Gauge clamp test checks only that nothing throws. The flow tooltip test checks only aggregate data. The MapFlow axis test checks a group that exists without ticks. Strengthen them in place (likely `circular`, `graph-flow` and `mapflow` tests). | P1 | M |
| `S-14` | test | **Boundary tests for Overview and time.** Overview `axis`, `margin`, `setBrush` and `setView`; the TimeSeries navigator; `linkTimeExtent` / `activeLinkSeries` for month and year, open ends, no time, and a navigator domain that differs from the new data. The safety net for T-10 and section A. | P0 | M |
| `S-15` | test | **Interaction gaps.** Flow: a callback fired by user input, tooltip content, selection under filter and fold, `setFolds` / `setHulls` / `clearSelection` / `clearHistory`. MapFlow: `hiddenLinkTypes`, `linkWidth`, `bend`, `nodeLabels`, formatters, Enter. Map: `topoData`, `idField`, `featureFilter`, `clipExtent`. | P1 | M |
| `S-16` | test | **CSS contract test.** The selectors in `rare-charts.css` against the classes the JS emits. Lands with or before the K-06 renames, and enforces the public-surface statement (RC-034). | P0 | S |
| `S-17` | test | **~40 checks read private fields** where a public or DOM oracle exists. Rewrite them, so refactors do not break tests that should pass. | P1 | M |
| `S-18` | test | **Global jsdom geometry stubs** (`offsetWidth = 800`, `getComputedTextLength = 0`). Set sizes per test where it matters. Check tooltip position, the right-hand legend and typography in a real browser. | P1 | M |
| `S-19` | test | **Uncovered areas.** Fetch adapters, Crosshair and hover tooltips, `appendPoint`, the MultiChart cascade (with K-11). Execute every published demo; today 1 of ~40 runs. | P1 | M |
| `RC-026` | test | **Test files by subject.** Fold `chart-core-7a`, `graph-fixes-7a`, `public-surface-k04` and `hierarchical-charts` (→ `hierarchical-bar`) into subject files, keeping a map from old scenario to new. | P1 | S |
| `RC-027` | test | **Sankey:** a pinned band tooltip is released by a click elsewhere or Escape. | P2 | S |
| `RC-055` | test | **The flaky `reference-pages` browser test.** It serves the tracked `_site/` (built 2026-07-20) and failed once at 768px. Build the site first, or serve the dev build. | P2 | S |

## H. After Rare Styles `v0.7.2`: remove the temporary rules

**What the 2026-10-26 sweep found.** Exactly one RareCharts rule is a temporary guard against a Rare Styles defect. Every other guard counters element rules that any host page can have: `button`, `button:hover`, `h5`, `p`, `cite`, `h4`, `dl`/`dt`, `a`, inherited line-height. Those stay, because they defend RareCharts against any foreign host stylesheet, not only Rare Styles. The X-08 hostile-host fixture proves which ones are needed; C-13 covers pages with no host styles at all. "Cleaner in `0.9.8_7`" therefore means three things:
- the one guard goes;
- the docs site drops its hand-made workarounds;
- sections D and G consolidate what remains: X-07, X-08, X-11, X-12, K-14 and the token chain.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `RC-028` | chore | **Delete the three-class header placement** (`.rc-chart > .rc-chart-header > …`, added 2026-10-26) once `CSS-372` ships. Check the `/charts/` sidenote demo at 1440 and 375px. No test pins it. | P1 | S |
| `RC-029` | docs | **The docs site after `CSS-371`–`CSS-373`.** Re-mark the `/charts/circular/` gauge rows with the library row class, and stack the 2-up row on phones. Decide whether gauge titles stay centred, and set the alignment on the cell. Re-check every option table at 375px and close O-11. Re-check the sidenote demos. | P1 | S |
| `RC-058` | docs | **The docs after Rare Styles `v0.7.2` Part B.** Check the chart frames migrated by `CSS-183a` (one panel recipe instead of five; `.panel` on the same element as `.rc-chart`). Re-mark the TimeSeries KPI row with `.stat` and delete `.price-chart-stat*`; colour the price change with the delta chip once it exists. Re-mark the four "Experimental" notices as the warning callout (`CSS-156`), without the card classes. | P2 | S |
| `RC-032` | test | **Re-verify the generic guards** with the hostile-host fixture (`CSS-381`) against the new element defaults of Rare Styles `v0.7.2` Part C: the button system, and forms with `appearance: none`. Keep each guard that is still needed, with a stated reason. | P1 | S |
| `RC-030` | docs | **Remove the hand-made spacers** once Rare Styles block spacing (`CSS-377`) ships: the `.air-md` spacers, the three `<br>`, `margin-b-md`, `margin-y-md`, `padding-y-md`. | P2 | S |
| `RC-031` | docs | **Docs and example one-offs** (no Rare Styles dependency):<br>• the dead `black-bg` on `charts/index.md:25`;<br>• `card-dashboard-bordered` on the three `pre` in `/charts/combined/`;<br>• the hand-added `class="rc-chart"` on the time-series page;<br>• dead example options: `theme.fontSize` in `bar-chart-understanding.js`, `tooltip: false` in `line-chart-lines-options.js`;<br>• tooltip inline greys in 12 example scripts → the `.rc-tooltip-*` row classes;<br>• the dark-theme demo should say darkTheme needs a dark container;<br>• the two synced examples that need site CSS: make them self-contained, or say so (`line-chart-lines-options.js`, `line-chart-time-series.js`);<br>• nits: a missing heading on `/charts/bar/`, backticks inside raw HTML on `/charts/line/band/`, fenced code on `/charts/line/time-series/`, "Copy link" titles on buttons that copy commands, a removal date for the `charts/dual-axes/` redirect stub. | P2 | M |

**Work triggered by later Rare Styles releases.** None of it is in `0.9.8_7`. Each item rides with the RareCharts release that is current when its trigger ships:
- `CSS-079` prunes `.air-*`. It must not ship before RC-030.
- The `Q-15` names land with the layouts (`v0.7.4`); then rename `card-caption` on 31 charts blocks.

The panel family, `.stat` and the callout variants moved into Rare Styles `v0.7.2` on 2026-10-26, so their docs work is RC-058 in this milestone.

## I. Docs

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `RC-033` | docs | **Public defaults table across classes** (the K-10 deliverable) on `/charts/settings/`: duration, ticks, tick formats, curve, area, gutters, `barWidthRatio`, `nodeRadius`, `mobileBreakpoint`. | P1 | M |
| `RC-034` | docs | **Public surface and stability statement.** What is not contract: `render()`, instance state, `_` members, the internal class families. What is: the documented hooks (`.rc-chart`, `.rc-tooltip` rows, `.rc-chart-controls`, `.rc-chart-note`, `.rc-cross-line`, `.rc-graph-details*`, `--rc-*`). Enforced by S-16. | P1 | S |
| `RC-035` | docs | **Residual gaps.** `charts/index.md:53` overclaims "a unified configuration model" until K-08/K-10 land. The points payload prose (`settings:261`, `line:183`) lacks `type`, `date`, `axis`, `lower`/`upper`. An "Exported utilities" block on `/charts/installation/` (`defaultTimeframes`, `VERSION`, `DOCS_URL`). The Graph docs never mention the `flows` collection alias, which every view reads since K-07. | P2 | S |
| `RC-036` | docs | **The `name` ↔ `label` rule** on `/charts/settings/`. A series is a `name`; a part or slice is a `label`; collapsing a stack maps `series.name` → `slice.label`. | P2 | S |
| `RC-037` | docs | **Hidden containers.** A chart created in a hidden container or background tab draws on first paint or resize (lesson from the field notes). | P2 | S |
| `RC-038` | docs | **The news-feed Graph recipe:** start empty, `add()` per event. | P2 | S |
| `RC-039` | docs | **"Not in this version" sections.** Flow non-goals. Sankey: cycles, dragging, multi-level drill-down, particles, an explicit remainder when in ≠ out. | P2 | S |
| `RC-040` | docs | **Regenerate the `/charts/styles/` typography and colour tables** from `theme.js` after K-14/K-15. | P2 | S |
| `RC-041` | docs | **Keep the public backlog page in step.** Remove the analytics section on release, retarget MultiChart and every pulled row, and state the slots for `0.9.8_8` / `0.9.8_9` and 1.x. Reword the "Map overlays" row to say that MapFlow already covers flows. Retarget "Clickable regions" and "Legend series isolation" (now RC-054) to `0.9.8_7`. | P1 | S |
| `RC-042` | docs | **API ↔ docs re-check.** The method moves to `DECISIONS.md`. Re-run it on the contracts changed by K-05/06/08/10/11 and T-10. Run every published example at 1280 and 375 on the built bundle without Rare Styles, the snippets on a bare page, and `check-links`. | P0 | M |

## J. Retire the internal notes (exit criterion)

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `RC-043` | docs | **`assets/charts/docs/DECISIONS.md`** (English): every Appendix A row whose destination is DECISIONS or ARCHITECTURE. That covers the decisions with their reasons; the Graph architecture (fixed layouts not force, no graph framework); the relation-layer contract; the hierarchy contract; the experimental status; the 1.0 vocabulary rule; the release checklist and acceptance; the API ↔ docs method; consumer provenance. | P0 | M |
| `RC-044` | docs | **Code header comments** for the Appendix A rows marked "code comment": MapFlow arrows and widths and `linkLegend`; the flow hull as a soft band; flowAuto satellites; flowFold `folds`; `core/sankey.js` not d3-sankey; the ego polar layout rejected. | P1 | S |
| `RC-045` | docs | **Audit ID index.** A compact English table in `DECISIONS.md` (ID → one line → commit or release) for every ID cited in code, tests, CSS and the public CHANGELOG (~91 files), so the citations stay resolvable. Generate the list by grep and keep it complete with a test. | P0 | M |
| `RC-046` | chore | **Repoint the comments that cite internal files.** On 2026-10-26 they were pointed at `_internal_docs/charts/` (`Graph.js:102`, `graph/views/flow.js:13`, `MapFlow.js:5`, `test/flow-layout.test.js:11`, `test/mapflow.test.js:7`; `graph/model.js:12` names API-INVENTORY). When the notes are deleted, point them at `DECISIONS.md` or the public docs. | P0 | S |
| `RC-047` | chore | ✅ **Done 2026-10-26 (branch `internal-docs`).** `.eleventyignore` lists `_internal_docs/` instead of the nine files; the `-INTERNAL.md` filter in `test/docs-data-paths.test.js` was removed; the octra mock-up was deleted. | P0 | S |
| `RC-048` | chore | **Delete the nine notes from `_internal_docs/charts/`** (the internal-documents rule). Then `git grep -n -- '-INTERNAL\.md' -- . ':(exclude)_internal_docs'` returns nothing. This file keeps its citations of the notes as history. | P0 | S |
| `RC-049` | docs | **Field findings.** A section at the end of this file replaces `FIELD-NOTES`: one row per finding, facts only, feeding `0.9.9` (owner, 2026-10-26). | P2 | S |
| `RC-050` | chore | **The data project walks through flow stage 2** on its CDN pin. Flows II acceptance ran only on synthetic data. Findings go to Field findings. | P2 | S |

## Exit criteria

- [ ] Section A works for the donor scenario (hour, day and month buckets). A TimeSeries chart that sets none of the section A options renders as in `0.9.8_6`, checked by test and in a browser. The only exceptions are the intended visible changes, each listed in the CHANGELOG:
  - the T-10 default zone;
  - C-41's number format;
  - K-15's tooltip font;
  - K-08's durations;
  - K-06's class names, with aliases;
  - RC-016 box-sizing;
  - the K-14 / RC-014 colours;
  - the legend interactive by default (RC-054);
  - Ctrl/⌘ + wheel to zoom (T-09);
  - removals: `viewSteps` (RC-059), HierarchicalBar `barHeight` (RC-056), the theme tokens `positive` / `negative` / `fontSize` (RC-011).
- [ ] T-10: tests pass under a fixed non-UTC TZ, including the month-end clamp. Link times follow the same policy.
- [ ] Every audit item listed in this milestone is closed, or moved with the owner's OK and a reason here.
- [ ] RC-054: every class with a legend has the interactive legend (mouse, keyboard, isolation), with tests per class. B-06 region clicks pass their acceptance.
- [ ] Names and defaults decisions are recorded in `DECISIONS.md` and in the docs. The defaults table and the public-surface statement are public.
- [ ] S-16 (CSS contract) and the X-08 hostile-host fixture are green; every published demo runs in a test.
- [ ] Rare Styles `v0.7.2` has shipped and section H is done: the temporary guard is removed, and the generic guards are kept with a stated reason.
- [ ] RC-042 is done: API ↔ docs re-check, examples at 1280/375 without Rare Styles, snippets, links.
- [ ] All nine `charts/*-INTERNAL.md` files are deleted, the RC-048 grep is clean, and the audit ID index is complete. Every Appendix A row is ticked.
- [ ] `/charts/backlog/` is in step, and the CHANGELOG has the size line.
- [ ] The release commit holds the charts and their docs/site only: no Rare Styles fixes, no internal files.

---

# Later milestones (moved from the internal roadmap)

Slots as planned on 2026-10-22, minus what `0.9.8_7` pulled. Debts found later ride with the release that touches their files.

## `0.9.8_8` — Composition

- Stacked area on Line (`stacked: true`, a `'percent'` mode).
- `RareCharts.DivergingBar` (contract first).
- `RareCharts.Scatter`.
- `RareCharts.Heatmap`.
- `RareCharts.Waterfall`.
- Sankey label collisions within a column, and vertical Sankey at ≤ 480 px with 5 columns (field note), after D-08's shared placement.

## `0.9.8_9` — Scales & interactivity

- Line `normalize: 'rebase' | 'percent'`, next to the RC-004 comparison series.
- HierarchicalBar interactive collapse/expand.
- HierarchicalBar drill-down for deep trees, a C-28 follow-up and a different feature from collapse/expand: a way back up, the current level or path, an explicit change of scale.
- (MultiChart for every class and legend isolation were pulled into `0.9.8_7`.)

## `0.9.9` — Final debugging before the freeze (the last rename window)

- Run in the young classes before the freeze: DivergingBar, Scatter, Heatmap, Waterfall and the scale options. Check each against the shared contract, and run each through the dashboard project.
- Check that Graph, Sankey and MapFlow are nowhere presented as stable.
- A valid semver tag, so that jsDelivr `@latest` moves off `v0.9.8`.
- Owner decision: backlog features that change existing signatures are built before the freeze or designed additively for 1.x.
- Triage the field findings.

## `1.0` — Freeze

- [ ] **The API inventory is closed.** Every class is checked and no ⚠️/❓ question is open. The successor of the internal API inventory is the `0.9.8_7` defaults table, the public-surface statement and the RC-042 method.
- [ ] **CI is green**, with tests on every push.
- [ ] **The release process is reproducible:** version from `version.json`, bundles from `charts:build`, a CDN tag, a GitHub Release.
- [ ] **A public stability statement** in the README and on `/charts/`: what is frozen (options, data shapes, events, CSS hooks), and what is not frozen (Graph, Sankey and MapFlow as experimental; the theme internals).
- [ ] **Bump to `v1.0.0`**, with a tag and a CHANGELOG entry.

**Parked by the owner:** O-12. The Rare Styles content-starter demo pins `rare-charts@v0.9.8_5`; leave it as is (2026-10-23). It is listed in the Rare Styles debt register.

## 1.x and post-1.0 (additive)

- **Bundles:** separate `rare-charts-graph` / `rare-charts-maps` bundles (K-13).
- **New chart types:** Candlestick (OHLCV). Spatial hierarchies (treemap, pack, sunburst, cluster) with the projection adapters `topLevel(tree)` / `flatten(tree, { depth })`.
- **Maps:**
  - map overlays and labels (`layers`);
- **API and labels:**
  - branding API (`RareCharts.setBrand`);
  - callouts and image overlays — note the conflict: the data project wants them before 1.0;
  - arbitrary in-chart labels.
- **Bar and Donut:**
  - stacked bars on date slots;
  - value labels on vertical Bar and DualAxes bars;
  - Donut `onDrill`.
- **Graph:**
  - the ownership layout;
  - cluster-view strategies, including semantic zoom with per-node aggregates and in-place expansion;
  - an ego focus+context default;
  - an adapter for third-party layouts (forceatlas2 / elkjs);
  - centrality beyond degree;
  - a `dataSource` response cache (O-09);
  - proper icons for the footer tools.
- **Flow:** rotated 90° on phones. Export to an image (SVG/PNG).
- **MapFlow:**
  - `onSelect` and an external details panel;
  - not in v1: particles, place clustering, choropleth under the flows, hand-bent curves.
- **Sankey (not in v1):** cycles, dragging nodes, multi-level drill-down, particles, an explicit remainder when in ≠ out.

---

# Field findings

Facts from real use, one row per finding, feeding the next plan. This section replaces `FIELD-NOTES` (owner, 2026-10-26). Record facts only; triage happens when the next milestone is planned.

| Date | Consumer | Class / area | Finding | Workaround in the consumer | Triage (filled at planning) |
|---|---|---|---|---|---|

---

## Appendix A — Migration map of the internal notes

Everything in `charts/*-INTERNAL.md` that must outlive them and is not a task in a milestone above. Sources are file:line at `e852051` (branch `flows-ii-v0.9.8_6`), file names without the `-INTERNAL.md` suffix. Tasks RC-043…RC-049 carry the moves; tick a row off when its destination holds the text.

| ID | Source | Kind | What | Destination |
|---|---|---|---|---|
| `S-02` | AUDIT:178, AUDIT:36 | lesson | Every fix ships with a regression on observable behaviour. This is a standing rule, marked ⏳ (step 2 added 70 regressions). Cover the fixed contract (result, DOM, event, absence of a stale response), not every line. Parametrize similar cases. Put tests in subject files next to the fix, never in new suites named after a release or step. The rule outlives the audit. | English ARCHITECTURE/DECISIONS doc |
| `O-10-method` | AUDIT:256-293, AUDIT:210, ROADMAP:227, ROADMAP:268 | design rationale | Docs completeness/actuality procedure (API ↔ docs matrix) and 'same-change' rule. Method: one matrix per public contract (signature and data, defaults and priorities, behaviour, proof), checked both ways (code to docs, docs to code); a mismatch triggers a decision, never a silent doc rewrite to match a bug; run the published snippets on the built bundle, both on the site and on a page without Rare Styles. Rule: from now on a contract change ships in one change with the code, the inventory row, the main doc, an example or regression, and a CHANGELOG entry. Tool limits: scripts/check-links.mjs does not run code or check fetch/CSS url(); reference-pages.test.js checks layout, not chart correctness; scripts/api-snapshot.mjs is for Rare Styles. The matrix itself lives in API-INVENTORY-INTERNAL, which is also being deleted, so its successor home must be decided. | English ARCHITECTURE/DECISIONS doc |
| `release-acceptance` | AUDIT:368, AUDIT:370-378, AUDIT:340-342 | lesson | Release acceptance checklist beyond green unit tests. Smoke-test the BUILT bundle on a standalone page without Rare Styles: Line with navigator, Pie/Donut, two TimeSeries, flow with folds, MapFlow and Sankey; cover repeat setData, empty input and destroy. In a real browser check light/dark, a narrow card, keyboard, brush/zoom, short arcs and panels. Re-measure min/gzip with one method (esbuild settings from build-charts.mjs, Node zlib default, banner excluded; sequential savings are not additive). Never remove public exports or published data URLs under the guise of internal cleanup, and never present legacy benchmarks as current. The CHANGELOG release checklist covers versioning only, so add these steps. | English ARCHITECTURE/DECISIONS doc |
| `audit-lessons` | AUDIT:5-7, AUDIT:19, AUDIT:38, AUDIT:276 … | lesson | Engineering lessons from the 0.9.8_6 audit. (1) A queue that catches and logs exceptions can keep tests green while errors happen (S-01, the Graph queue); assert that no unexpected errors were caught. (2) Never delete whole test suites or chase a test count; map old scenarios to new ones before merging. (3) Fix code to the documented contract instead of documenting the bug (Pie had to become a pie). (4) Re-verify old records before acting on them: the Donut 'double padAngle' was never true, and the Graph A1 'setData→focus race' was an unrendered-page artifact. (5) Determinism alone does not prove correctness. | English ARCHITECTURE/DECISIONS doc |
| `tooltips-stale-backlog-comment` | assets/charts/src/graph/tooltips.js:32, ROADMAP:151, ROADMAP:156 | open task | Stale '(backlog)' pointer in graph/tooltips.js. The comment says the full list of hub neighbours 'belongs to a details surface (backlog)'. The details panel shipped in 0.9.8_3 (`details: true`), and 'Graph details panel' left the public backlog. Repoint the comment at the `details` option. | code comment in assets/charts/src/graph/tooltips.js |
| `experimental-promotion` | ROADMAP:59, ROADMAP:290 | owner decision | Sankey/MapFlow (and Graph) stay experimental outside the 1.0 guarantee; promotion only after real use. Decision 2026-10-07: they do not block the freeze. Whether to promote them to stable is decided in 0.9.9 or 1.x after real use. | English ARCHITECTURE/DECISIONS doc |
| `post-1.0-scope` | ROADMAP:49, ROADMAP:290 | owner decision | Outside 1.0 (additive, 1+): candlestick, spatial hierarchies, map overlays/clickable regions, branding API, callouts. All are additive, so they go to 1+ releases. Graph (including flow), MapFlow and Sankey stay experimental. Conflict: the public backlog says the data project asks for callouts before 1.0 (backlog:30), so the owner must reconcile. | English ARCHITECTURE/DECISIONS doc |
| `decision-2026-07-06` | ROADMAP:5, ROADMAP:244 | owner decision | 1.0 freezes the full 'terminal' vocabulary; missing genres land via 0.9.8_x first. Composition, scatter/heatmap/waterfall and scales enter before the freeze, based on the 'analytical Bloomberg' gap analysis. The cost is young classes that need run-in, which is what 0.9.9 exists for. | English ARCHITECTURE/DECISIONS doc |
| `young-classes-risk` | ROADMAP:55 | lesson | Risk: 0.9.8_x classes freeze young — mitigation. Release each class when it is ready, not in a batch before 0.9.9. Add every new class to the API inventory immediately and run it through the dashboard project before the freeze. | English ARCHITECTURE/DECISIONS doc |
| `decision-2026-07-21-hierarchy` | ROADMAP:57 | design rationale | Hierarchy contract to be frozen: parent value is authoritative. One normalizer (core/hierarchy.js) serves three consumers. It takes a root or an array of roots and produces subtotals, stable path ids and a remainder. A parent `value` may exceed the sum of its children, and the difference is drawn only with `remainderLabel`/`showRemainder`, because investigative data often has a known total and a partial breakdown. The atom `{label, value, color?}` is shared with Donut and stacked segments. HierarchicalBar is the linear view; spatial Hierarchies come post-1.0 on the same contract. The behaviour is in public docs (hierarchical-bar, circular); the 'why' belongs in the decisions doc. | English ARCHITECTURE/DECISIONS doc |
| `flows-ii-layout-rationale` | ROADMAP:75-77, ROADMAP:79, ROADMAP:197-198 | design rationale | Flow auto-layout choices and why. The main route is the longest path with `value` breaking ties, not the heaviest path: summing values gave the centre to a crowdsale and pushed the trace aside. `main: true` wins. Cycles are broken by time when available (a refund or payout years on turns), otherwise by Eades; a pure minimum flipped the wrong links on the demo. Satellites: a node whose only partner is in the same lane and is a branch (swap, fee, income) sits in the partner's column, but chain ends do not. `layout: 'auto'` is the default and pins any node with a hint, so fully hinted data renders as before; `'hints'` restores stage 1. Behaviour is public (/charts/graph/flow/:30-31); the reasons should go into the decisions doc or the flowAuto.js header. | English ARCHITECTURE/DECISIONS doc |
| `flows-ii-naming-rationale` | ROADMAP:78, ROADMAP:81 | design rationale | Naming decisions before freeze: `folds` (not `groups`), `fold:<id>`, MapFlow `linkLegend`, MapFlow as Map subclass. `group` already means node colour (`nodeGroups`), so two close names would be a trap at the freeze. A meta-node id is `fold:<id>`, toggled by '+/−' on the node shoulder or the +/− keys. MapFlow's legend option is `linkLegend` because the base Chart owns `legend`. MapFlow subclasses Map, and its page is /charts/map/flow/, not /charts/mapflow/. | English ARCHITECTURE/DECISIONS doc |
| `mapflow-render-rationale` | ROADMAP:70, ROADMAP:80 | design rationale | MapFlow arrows and widths. The arrow sits at the target and is drawn as its own triangle rather than a `marker`, because a marker grows with stroke width and covers the node on thick arcs. After the owner's 2026-10-21 review, `linkWidth` defaults to 1–6 px (was 1.2–12) and the arrowhead is `6 + 1.2·w` × `2.6 + 0.8·w`. Keep this as a header comment in MapFlow.js. | code comment in assets/charts/src/charts/MapFlow.js |
| `flow-time-nav-rationale` | ROADMAP:71, ROADMAP:80 | design rationale | Time navigation in flow/MapFlow reuses base Chart machinery. Both `timeframes` and `navigator` are opt-in, built on Chart's `setView`/`onViewChange`. The navigator plots the count of active links per day, month or year. With navigation on, `setTimeWindow` moves the view and the buttons and brush follow. Overview gained `axis`, which flow and MapFlow switch on. The spec's 'time slider UI on the site side' was dropped. This is relevant to 0.9.8_7's TimeSeries work, which extends the same machinery. | English ARCHITECTURE/DECISIONS doc |
| `relation-layer-contract` | ROADMAP:102-107 | design rationale | Relation-layer contract decisions (Flows I step 0). Links use `source`/`target`; `from`/`to` and `flows` are aliases; one `linkTooltipFormat` serves all classes. Time on links is `start`/`end`, because `from`/`to` are taken by the endpoint alias and annotations. Numbers below 10000 are years (also in the core/links.js:124 comment). `setTimeWindow` takes `timeWindowMode: 'hide'\|'dim'` (MapFlow hide, flow dim). The Graph model stores a directed multigraph with an undirected simple projection for analytics. Tooltip pinning is opt-in. This was recorded in API-INVENTORY, which is also being deleted. | English ARCHITECTURE/DECISIONS doc |
| `rule-2026-10-26` | ROADMAP:83, AUDIT:41 | owner decision | Rule 2026-10-26: internal debt rides with the release that touches its files (now amended). Non-bug debt (D/X/S/K) was to be done in whichever release touches the files, with area tests pulled along, the remainder in 0.9.9, and no repeat of big cleanup passes like 0.9.8_6. A later owner decision the same day overrides this for the current debt: 0.9.8_7 takes ALL remaining items. Record the rule as amended, i.e. the policy for debt that appears after 0.9.8_7. | English ARCHITECTURE/DECISIONS doc |
| `backlog-page-maintenance` | backlog/index.md:93-95, backlog/index.md:162-197 | open task | Keep the public backlog page in step with the 0.9.8_7 plan. When 0.9.8_7 ships, remove the 'Time Series: analytics ranges' section and its six rows. Retarget any row whose slot changes, such as MultiChart (_9 → _7 if K-11 takes the feature) and anything pulled forward as adjacent work. The page will become the only feature backlog once the INTERNAL roadmap is gone, so it should also carry the slots for 0.9.8_8/_9 items (already stated) and the 1+ items. | public docs /charts/backlog/ |
| `ariaLabel-applySvgA11y` | API-INVENTORY:53, API-INVENTORY:720, API-INVENTORY:1116 | open question | ariaLabel is read in applySvgA11y(), not Chart.js — a class that forgets the call ignores it. Checked today: Bar, Donut, DualAxes, Gauge, Graph, HierarchicalBar, Line, Map (MapFlow inherits it), Sankey and TimeSeries all call applySvgA11y, so the question can be closed for SVG classes. Keep it as a stated rule in a code comment, or move the call into a shared Chart._createSvg() when D-09 lands. | code comment in assets/charts/src/core/renderHelpers.js (applySvgA11y) / Chart._createSvg with D-09 |
| `docs-residual` | API-INVENTORY:815, API-INVENTORY:816, API-INVENTORY:817, API-INVENTORY:1141 … | open task | Residual public-docs gaps from the API↔docs matrix (checked against the tree 2026-10-26). (a) charts/index.md:53 still says 'All charts follow a unified configuration model and data structure', which overclaims until K-08/K-10 land; reword it or make it true. (b) The prose at charts/settings/index.md:261 and charts/line/index.md:183 still lists points as { name, series, value, color, fmt }, without type, date, axis or the band's lower/upper; the tables at settings:319 and line:441 are complete. (c) `defaultTimeframes`, `VERSION` and `DOCS_URL` are described only in README:207-208 (excluded from the site) and on no /charts/ page; add an 'Exported utilities' block to /charts/installation/. | public docs: charts/index.md, charts/settings/, charts/line/, charts/installation/ |
| `public-surface-statement` | API-INVENTORY:62, API-INVENTORY:632, API-INVENTORY:742, API-INVENTORY:743 … | unbuilt spec | Publish what is NOT contract before the 1.0 freeze. The inventory decided: `render()` is internal (a no-op after destroy); Graph `render()` and its inherited `onScaleChange` are internal; instance state (width/height getters, container, options, theme, margin, svg; TimeSeries xScale/yScale/clipId) and `_` members are not contract; MultiChart height/margin on the grid are internal. The classes .rc-bar*, .rc-hbar*, .rc-dual*, .rc-multichart*, .rc-donut*, .rc-gauge*, .rc-map*, .rc-mapflow*, .rc-sankey*, .rc-graph-*/.rc-flow-* are internal. The documented hooks are .rc-chart, .rc-tooltip with its row classes, .rc-chart-controls, .rc-chart-note, .rc-cross-line, .rc-graph-details (-kind/-muted/-ties) and the --rc-* tokens. No public page states this, and the semver freeze needs it; enforce it with the S-16 CSS contract test. | public docs /charts/settings/ or /charts/styles/ ('Public surface and stability'); test via S-16 |
| `defaults-table` | API-INVENTORY:122-381, API-INVENTORY:654-666 | unbuilt spec | Cross-class defaults table (public), the K-10 deliverable. The per-class option tables duplicate the option tables every class page already has (the matrix confirms coverage), so they need not survive. What is missing in public is a table comparing defaults across classes: duration, yTicks, tick formats, curve, area, gutters, barWidthRatio, nodeRadius, mobileBreakpoint (480, shared by MultiChart and Sankey). AUDIT K-10 asks for 'one defaults table'. Build it after the 0.9.8_7 decisions. | public docs /charts/settings/ (defaults across chart types) |
| `hierarchy-rationale` | API-INVENTORY:404-422, API-INVENTORY:436-458, API-INVENTORY:482-490, API-INVENTORY:501 | design rationale | Tree contract decisions (v0.9.8_2, 2026-07-21) and why. Decisions recorded: a parent's value is authoritative and the remainder is real; overflow warns, or throws with `strict`; only value > 0 is drawn; null means missing, which is different from remainder and from dropped; ids are assigned in two phases (blocker 1); colour is lifted, never inherited (blocker 8); options live at chart level only; Donut's mode is chosen by input type (array vs root object), not sniffing, and the `drilldown` toggle was rejected; drill-down adds interactive state that 1.0 freezes; stacks are value ≥ 0. The 'what' is already in the core/hierarchy.js header (checked :1-40); keep the 'why' table. | English ARCHITECTURE/DECISIONS doc |
| `name-label-rule` | API-INVENTORY:422 | design rationale | name ↔ label rule. A series is identified by `name` (Line, DualAxes, stacked Bar); a part or slice by `label` (Donut, Bar categories, tree nodes). The only remap is collapsing a stack into one category: series.name → slice.label. The inventory says 'record it in the docs, don't fix it', but no public page states the rule (checked by grep). | public docs (/charts/settings/ data shapes) + English ARCHITECTURE/DECISIONS doc |
| `flows-layer-rationale` | API-INVENTORY:508-528 | design rationale | Shared relation-layer decisions (step 0, 2026-10-07) and why. links/source/target with from/to and `flows` aliases, canonical form on output. start/end for time, because from/to are taken by endpoint aliases and vertical annotations; a number < 10000 is a year; YYYY/YYYY-MM are periods. timeWindowMode defaults to hide on MapFlow and dim on flow (extra arcs are only noise on a map). Storage is a directed multigraph; Louvain/BFS run on an undirected simple projection, because Louvain can't handle mixed graphs and directed paths would change the results. Also: dedupe-on-merge rules, links(a,b) replaced link(a,b), linkWidth { by, scale, min, max }, one linkTooltipFormat (flowTooltipFormat rejected), opt-in Tooltip.pin, per-class unknownEndpoints policies, frozen id formats. The 'what' is already in core/links.js:71-92 and graph/model.js:12-18; keep the 'why' and repoint the model.js:12 comment. | English ARCHITECTURE/DECISIONS doc (+ repoint code comment in assets/charts/src/graph/model.js:12) |
| `tooltip-boundary` | API-INVENTORY:66-118 | design rationale | Tooltip theme: JS/CSS boundary and priority (B-03). The JS theme passes colours only, per chart, as --rc-tooltip-* custom properties (null → chart token → CSS fallback). CSS owns sizes, weights, spacing, max-width and letter-spacing; inline styles carry data colours only. A page rule `.rc-chart .rc-tooltip` beats the theme; header colour priority is data colour > header.text > role colour; the CSS fallbacks equal defaultTheme.tooltip (the charts-css test keeps them in step); core/html.js fragments are internal. D1–D3 (owner-approved look changes) shipped in 0.9.8_6. The public part is on /charts/styles/ (:290 and the token table) and in the Tooltip.js header. | English ARCHITECTURE/DECISIONS doc (boundary rule); the rest is already in public docs and code |
| `experimental-status` | API-INVENTORY:27, API-INVENTORY:28, API-INVENTORY:31, API-INVENTORY:34 … | owner decision | Graph, Sankey and MapFlow are experimental, outside the 1.0 guarantee (B3). Already public: README:94 and the experimental boxes on /charts/graph/, /charts/sankey/ and /charts/map/flow/. This decides that relation-class renames (item names-relation) do not block 1.0, although the shared vocabulary would have to change in three places at once. | public docs (already present); no move needed |
| `C-24-host-button` | API-INVENTORY:803 | design rationale | Lin/Log fill and range-button hover are defended against the host's button:hover (Rare Styles). `--rc-scale-btn-fill` is painted as background-image at (0,2,0)/(0,3,0) specificity, and .rc-range-btn :hover is set transparent, because Rare Styles' `button:hover` paints backgrounds (rare-charts.css:281, :800, :813). This is a candidate for the Rare Styles debt list: if Rare Styles scopes button:hover (:where or opt-in), RareCharts can drop the specificity bumps after the Rare Styles release. | Rare Styles backlog (check during the RS debt pass); code comment in rare-charts.css already exists |
| `matrix-method` | API-INVENTORY:691-695, API-INVENTORY:825, API-INVENTORY:954, API-INVENTORY:1124 … | lesson | The API↔docs matrix is a regenerable snapshot: keep the method, re-run it for 0.9.8_7. The matrix was checked at 2fad452, before the step-6 fixes in a827820, and only partly updated through step 7. Its probes (p1-chart.mjs etc.) lived in a session scratchpad, not the repo. The matrix need not survive. Keep the method (AUDIT-INTERNAL.md:256-293): check both directions; run every published example at 1280/375 on the built bundle without Rare Styles; run snippets on a bare page; run check-links; review the fixes adversarially. Re-run it on contracts changed by K-05/06/08/10/11 and T-10 as a 0.9.8_7 exit criterion; the ':1256 repeat after step 7' run of examples and snippets has no recorded result (bundle size is in CHANGELOG:241). Turn reusable probes into tests (S-19). | English release checklist (ARCHITECTURE/DECISIONS or CONTRIBUTING) + 0.9.8_7 plan task (exit-criterion re-check) |
| `header-vs-site-lesson` | API-INVENTORY:668-674 | lesson | Source header comments lagged the site docs. On 2026-07-03 most 'undocumented' options turned out to be missing from the src header comments, not from the site. Both are public: users and LLMs read the headers and the bundle banner. Rule: change the code, the header comment and the docs page in the same commit; this was AUDIT §8's 'same change' rule, which also covered the inventory row. | English release checklist / CONTRIBUTING |
| `new-class-rule` | API-INVENTORY:3-9 | lesson | Every new class or option was entered in the inventory before release. The file's own role: each new class gets an inventory entry before release (also ROADMAP-INTERNAL.md:213, SPEC-SANKEY-INTERNAL.md:5,125). The ':9 decisions on ⚠️/❓ in 0.9.9 after field testing' is superseded by the owner decision of 2026-10-26 (0.9.8_7). Once the file is deleted, the rule becomes: public option table + defaults-table row + header comment before release. | English release checklist |
| `FN-focus-hidden-page` | FIELD-NOTES:10, FIELD-NOTES:11 | lesson | Empty Graph canvas after setData+focus was an unpainted page, not a queue race. Root cause (A1, 2026-10-07): the page had not painted (background tab or hidden panel). Nodes enter at opacity 0 and ResizeObserver waits for paint. The related fix skips setData's autofocus when a view is requested in the same tick (documented at charts/graph/index.md:473), and the docs now say setData focuses the best-connected node. The consumer follow-up 'remove whenReady in stories-heroes.js' is done (checked: schnellreich_ru stories-heroes.js:52-53). What remains: no page says that a chart created in a hidden container draws on first paint/resize; add that note. | public docs /charts/installation/ (hidden-container note); rest drop |
| `FN-sankey-mobile` | FIELD-NOTES:16 | lesson | Vertical Sankey at ≤ 480 px reads fine with 2–3 columns; labels collide at 5. The default `orientation: 'auto'` was kept, and the docs recommend up to 4–5 columns and aggregating small flows (checked: charts/sankey/index.md:45). Still open: vertical mode has no label-collision handling. That fits D-08 (shared greedy label placement, ROADMAP 0.9.8_8). | public docs (already present); later-release backlog note with D-08 |
| `FN-process` | FIELD-NOTES:3, FIELD-NOTES:4, FIELD-NOTES:6 | owner decision | Where field findings go once FIELD-NOTES is deleted. The method: one row per finding (date · project · class · what happened · workaround), facts only, no decisions; the log becomes the 0.9.9 release plan. All 7 rows are resolved, but ROADMAP 0.9.9 still plans 'field-test findings' (ROADMAP-INTERNAL.md:47, :96). Pick a durable English home before deletion: a 'Field findings' section in the engineering backlog, or issues on rare-charts. | English engineering backlog (Field findings section) — owner to confirm |
| `GA-R1` | GRAPH-ARCHITECTURE:12, GRAPH-ARCHITECTURE:16, GRAPH-ARCHITECTURE:20, GRAPH-ARCHITECTURE:27 … | design rationale | Why Graph uses fixed layouts for query results, not a force simulation, and why the polar ego layout was dropped. On real data a force-directed layout gives an unreadable tangle. That comes from the method itself, so tuning the forces does not fix it. Graph therefore draws the result of a query with fixed layouts that encode what is already known (degrees of separation, link type, the path found). Zooming out switches the view instead of drawing outer rings node by node, which would mean millions of nodes and the tangle again. A polar/arc ego layout was tried and dropped: the arcs turn to mush on a dense first ring. The code says only 'no simulation' / 'No arcs' (Graph.js:2-3, layouts/ego.js:10), and the public docs give a short version (charts/graph/index.md:9, :512). Neither says why. | English ARCHITECTURE/DECISIONS doc (Graph section) + one line in code comment in assets/charts/src/graph/layouts/ego.js header (polar rejected and why) |
| `GA-R2` | GRAPH-ARCHITECTURE:86, SPEC-GRAPH-FLOW:13 | design rationale | Why we use no graph framework (Cytoscape.js, Sigma.js, vis-network; Cytoscape + ELK for flow). These frameworks take over rendering and styling, which clashes with the Rare Styles theme and adds weight to a CDN library (about 2 MB for Cytoscape + ELK). Their strength is large arbitrary graphs, which is not our case. We borrow only headless algorithms (graphology) and, if needed, layout functions. For the flow view, the case against the consumer's Cytoscape + ELK fallback was: SVG nodes that keyboard and screen-reader users can reach (Cytoscape draws on canvas), one bundle with the other charts, and the Rare theme and dark mode without extra styling. Neither the code nor the public docs record this. | English ARCHITECTURE/DECISIONS doc |
| `B3` | GRAPH-ARCHITECTURE:5, GRAPH-ARCHITECTURE:88, GRAPH-PLAYBOOK:6, SPEC-GRAPH-FLOW:5 … | owner decision | Graph (all views, flow included), Sankey and MapFlow are experimental and outside the 1.0 semver guarantee. Roadmap decision B3: these classes are not frozen with the API at 1.0 and may change without a major-version bump. The public pages already carry the banner (charts/graph/index.md:11-13, charts/graph/flow/index.md:11-13, charts/map/flow/index.md:11-13, charts/sankey/index.md:11-13), and the class headers say experimental. ARCH:5 ('release: 1.x') is out of date: Graph shipped in 0.9.8_1. | English ARCHITECTURE/DECISIONS doc (record B3); public docs already state it |
| `links-vocabulary` | SPEC-GRAPH-FLOW:78, SPEC-GRAPH-FLOW:81, SPEC-SANKEY:28, SPEC-SANKEY:54 … | owner decision | One link vocabulary for Graph, Sankey and MapFlow (step-0 decision, 2026-10-07). The three classes share: `links` with `source`/`target`; `from`/`to` and `flows` accepted as input aliases only; time as `start`/`end`; one `linkTypes` and `linkTooltipFormat` contract. This is already recorded in the core/links.js header (lines 1-14) and on the public pages (charts/graph/index.md:146-152, charts/sankey/index.md:36, charts/map/flow/index.md:46). | code comment in assets/charts/src/core/links.js (already present) — nothing to move |
| `graph-backlog-rows` | GRAPH-PLAYBOOK:108 | deferred task | Graph ownership layout and cluster-view strategies. Both are already recorded in the public backlog (charts/backlog/index.md, Graph section: 'Graph ownership layout', 'Graph cluster-view strategies'). The playbook only points to them. | public docs charts/backlog/index.md (already listed) — nothing to move |
| `playbook-news-recipe` | GRAPH-PLAYBOOK:48, GRAPH-PLAYBOOK:54, GRAPH-PLAYBOOK:101 | open task | Document the news-feed graph recipe (start empty, add() per event). The recipe: start with `setData({ nodes: [{ id: 'hub', label: '…' }], links: [] })` or a seeded base, then call `add()` for each event; the link `type` is the event type (incident, deal, sanction), styled with your own `linkTypes`. The public docs explain add() (charts/graph/index.md:477) but not the empty start. Check that a one-node payload focuses that node (Graph.js:207 falls back to nodes[0]), and reword charts/graph/index.md:473 ('A payload without nodes or ties clears the drawing'), which reads as if a hub-only payload clears the drawing. | public docs charts/graph/index.md (Methods / add()) |
| `flow-non-goals` | SPEC-GRAPH-FLOW:17, SPEC-GRAPH-FLOW:130 | design rationale | What the flow view deliberately does not do. Out of scope: free force layout; editing the graph; automatic clustering of addresses (clusters and folds come from the data); loading neighbours on click (that is the ego view). The flow view draws the given trace whole because the trace is the query result; Graph.js:481-482 already says this. The public flow page has no 'not in this version' section, unlike map/flow. | public docs charts/graph/flow/index.md (add a 'Not in this version' section) |
| `flow-hull-band` | SPEC-GRAPH-FLOW:93, SPEC-GRAPH-FLOW:142 | design rationale | Why a group outline (hull) is a soft band, not a convex hull. A group is drawn as a smoothed line through its members (width 2R+28, opacity 0.12, label below the band), as in the mock-up. When a group snakes across several lanes, this reads better than a convex hull. The code says 'soft band' (graph/views/flow.js:448) but not why. | code comment in assets/charts/src/graph/views/flow.js (hulls section) |
| `flow-satellites-why` | SPEC-GRAPH-FLOW:154 | design rationale | Why a satellite node shares its counterpart's column. Without this, every DEX swap and every fee added a column and squeezed the lanes. flowAuto.js:13-19 explains what a satellite is but not why the rule exists. The rest of the stage-2 reasoning (main route, breaking cycles, barycentre sweeps, pinned nodes) is already in flowAuto.js:1-30 and :170-307. | code comment in assets/charts/src/graph/layouts/flowAuto.js |
| `flow-folds-naming` | SPEC-GRAPH-FLOW:117, SPEC-GRAPH-FLOW:157 | design rationale | Why the option is `folds`, not `groups` as in the spec. `group` already means the node's colour (nodeGroups), so the spec's `groups: [...]` would have clashed. Record this in the K-05 naming list. | code comment in assets/charts/src/graph/views/flowFold.js header (+ K-05 naming list in 0.9.8_7) |
| `mapflow-not-v1` | SPEC-GRAPH-MAPFLOW:68, SPEC-GRAPH-MAPFLOW:69 | deferred task | MapFlow, not in v1: particles along arcs, clustering places on zoom, choropleth values under the flows, hand-bent curves. Already recorded in public docs (charts/map/flow/index.md:136-138) and in MapFlow.js:69-70. The older public backlog row 'Map overlays and labels' (routes, markers…) predates MapFlow; the next time it is edited, say that flows between places are covered by MapFlow. | public docs charts/map/flow/index.md (already listed) — nothing to move |
| `mapflow-linkLegend-naming` | SPEC-GRAPH-MAPFLOW:94 | design rationale | Why MapFlow's legend option is `linkLegend`. `legend` is already the base Chart's header legend, so MapFlow's interactive type legend needed another name. The MapFlow.js:59 comment does not say this. Add it to the K-05 naming list. | code comment in assets/charts/src/charts/MapFlow.js (+ K-05 naming list) |
| `sankey-not-v1` | SPEC-SANKEY:56, SPEC-SANKEY:59, SPEC-SANKEY:105 | deferred task | Sankey, not in v1: cycles, dragging nodes, multi-level drill-down, particles, explicit remainder when in ≠ out. None of these is in the public docs or the public backlog; the Sankey page only says that cycles throw and that a node takes the larger of in and out. An explicit remainder should reuse the hierarchy normalizer's names (`showRemainder`/`remainderLabel`). Embedding in MultiChart is covered by the public backlog row 'All chart types in MultiChart' (v0.9.8_9); the spec's slot 0.9.8_8 is out of date. | later-release backlog + public docs charts/sankey/index.md (a 'Not in this version' line, as on map/flow) |
| `sankey-no-d3-sankey` | SPEC-SANKEY:66, SPEC-SANKEY:150 | design rationale | Why core/sankey.js is our own layout, not the d3-sankey package. d3-sankey 0.12.3 has not been updated since 2020 and depends on d3-array@1-2 and d3-shape@1, which would be bundled twice next to d3 v7. The package was not in the project, so the algorithm was rewritten (same idea: columns by longest path, relaxation towards the weighted centre of neighbours, collision resolution, stacked bands), and no licence notice is needed. core/sankey.js:4-8 says only 'written for this library'. | code comment in assets/charts/src/core/sankey.js |
| `consumers-provenance` | SPEC-GRAPH-FLOW:3, SPEC-GRAPH-MAPFLOW:3, SPEC-GRAPH-MAPFLOW:36, SPEC-SANKEY:3 … | design rationale | Who uses the experimental relation charts, and where each came from. Graph flow and Sankey came from the data project (a sibling repo for blockchain-address investigations; mock-up of 2026-10-07; pinned @v0.9.8_3). Graph ego and MapFlow came from schnellreich.ru /vault/stories/ (a character graph and a 'Map' of flows; design context in schnellreich_ru/_editorial/charts/universe-visualization-plan.md, with typed links carrying `types` and `sources`). The Sankey consumer mostly uses 2–3 columns and needs mobile. Graph's use cases: entity graphs, commercial ties between agents, blockchain addresses. This is needed when renaming (K-05) to warn consumers and bump their version pins. | English ARCHITECTURE/DECISIONS doc (consumers section) |
| `inventory-before-release` | SPEC-GRAPH-FLOW:5, SPEC-SANKEY:5, SPEC-SANKEY:125 | lesson | Register every new class or view in the API inventory before release. A process rule (also stated as a risk in the roadmap): classes from 0.9.8_x are frozen while still young, so each new one gets its options inventoried and checked against the shared contract before it ships. Once API-INVENTORY-INTERNAL is deleted, the rule has to live wherever its successor lives. | English ARCHITECTURE/DECISIONS doc (release checklist) |

## Appendix B — What the deletion drops, file by file

Checked item by item on 2026-10-26. "Drops" is shipped, superseded or regenerable material; "Keeps" is carried by the milestones above and Appendix A.

### `charts/AUDIT-INTERNAL.md` (378 lines)

- **Keeps:** Open items: T-10, K-05, K-06, K-08, K-10, K-11 (TYPE_MAP feature), K-14 with B-05, K-15, K-16 rest, K-23, K-24, D-02, D-04…D-10, X-06…X-09, X-11, X-12, S-13…S-19, C-40, C-41 → 0.9.8_7 plan tasks. B-06 → later-release backlog. O-11 and the CSS-371/372 mentions → Rare Styles backlog (already on main as CSS-371..373). O-12 (parked, owner said leave). Follow-ups hidden inside closed items: K-13 split bundles (1.x), viewSteps removal (0.9.9), theme.fontSize removal (1.0), T-09 wheel-modifier decision, C-28 drill-down idea, O-09 response-cache idea. Process knowledge for an English decisions doc: the S-02 regression rule, the O-10 docs method (§8, lines 256-293), release acceptance (§10, lines 368-378) and audit lessons (lines 5-7, 19, 38, 312). Audit IDs are cited in 91 code/test/CSS/CHANGELOG files, so keep an ID index or rewrite the comments first.
- **Drops:** Every ✅ item with a commit: R-01…R-21, T-01…T-09, C-01…C-39 apart from C-40/41, K-01…K-04, K-07, K-09, K-12, K-13 (freeze part), K-17…K-22, D-01, D-03, D-11, X-01…X-05, X-10, S-01, S-03…S-12, O-01…O-10, B-01…B-04, B-07. Also the stale-plan-records list (212-229), the §9 mapping table (299-312), the §10 reproductions table (345-366, now regressions in test/), and the header/state/order-of-cleanup sections (1-45). All shipped in v0.9.8_6 and are covered by CHANGELOG and tests.
- **Inbound references:** .eleventyignore:14. No other file names the audit by path. By description only: test/graph-fixes-7a.test.js:1 ('internal audit before v0.9.8_6') and assets/charts/CHANGELOG.md:112 ('library-wide audit'). Its IDs appear in 91 files, e.g. assets/charts/src/charts/Bar.js (31), test/chart-core-7a.test.js (27), test/graph-flow.test.js (16), test/charts-css.test.js (16), test/timeframes.test.js (15), assets/charts/rare-charts.css (15), and assets/charts/CHANGELOG.md:70,92-97,101,105,136,241. Internal links that go away with it: ROADMAP-INTERNAL.md:7,43,204,268 and API-INVENTORY-INTERNAL.md:9,693. test/docs-data-paths.test.js:20 filters all -INTERNAL.md files by pattern.

### `charts/ROADMAP-INTERNAL.md` (290 lines)

- **Keeps:** Release scopes: 0.9.8_7 TimeSeries Analytics (presets, per-window resolution, Custom range, comparison series, yFormat/gaps, T-10) plus D-09, D-10, C-40, C-41 (line 44); 0.9.8_8 stacked area, DivergingBar (contract first), Scatter, Heatmap, Waterfall plus D-06/07/08 (line 45); 0.9.8_9 rebase, legend isolation, MultiChart all types plus D-04, K-11 (line 46); 0.9.9 final debugging, last rename window, inventory and FIELD-NOTES (lines 47, 213, 268); 1.0 freeze checklist and stability statement (lines 48, 232-236); 1+ exclusions (lines 49, 290). Binding decisions: 2026-07-06 full vocabulary before freeze; 2026-07-21 hierarchy contract; 2026-10-07 experimental status; 2026-10-20 Flows II deviations (layout, naming, MapFlow arrows/widths, time navigation); 2026-10-22 donor acceptance ('existing charts unchanged'); Rule 2026-10-26 (now amended by 'all to 0.9.8_7'). Open 0.9.9 questions: formatter names, signature-changing backlog features, experimental labels. The 0.9.9 semver tag must move @latest. The relation-layer contract (lines 102-107), the risk mitigation (line 55), the optional Donut/Gauge pure math (line 280), the post-release data-project walkthrough (line 209) and the Q-04 Rare Styles debt (line 150) also need homes.
- **Drops:** Header and version line (1-7, stale), the 2026-07-03 state and pipeline holes (9-26), shipped release rows 0.9.8…0.9.8_6 and out-of-order/log-scale/Flows-split notes (34-43, 51, 61-67), all shipped checklists 0.9.8 through 0.9.8_6 (89-209, apart from line 209), closed 0.9.9 lines (214, 216, 218, 222, 224-225), Block R / N2 / closed history (246-284). All shipped, with history in CHANGELOG; the CDN numbering rationale (53) and release gate are already in the CHANGELOG checklist and README:15.
- **Inbound references:** .eleventyignore:6. No other non-INTERNAL file names it. Internal links that go away with it: FIELD-NOTES-INTERNAL.md:4, SPEC-SANKEY-INTERNAL.md:3, GRAPH-ARCHITECTURE-INTERNAL.md:5,88, AUDIT-INTERNAL.md:41, API-INVENTORY-INTERNAL.md:3, SPEC-GRAPH-FLOW-INTERNAL.md:3. test/docs-data-paths.test.js:20 filters -INTERNAL.md by pattern.

### `charts/API-INVENTORY-INTERNAL.md` (1256 lines)

- **Keeps:** (1) The open ⚠️/❓ naming and default inconsistencies (lines 47, 53, 81, 128-179, 191, 215-264, 302-333, 353, 544-615, 654-666) become 0.9.8_7 plan tasks under K-05/K-06/K-08/K-10/K-11/K-15. (2) The non-✅ matrix rows: K-06 (:810, :1083), K-05 (:1155). (3) Residual doc gaps checked on 2026-10-26: charts/index.md:53 overclaim, the abbreviated points payload at settings:261 and line:183, defaultTimeframes/VERSION/DOCS_URL documented in README only. (4) The 'not contract' list (:62, :632 and the internal CSS rows) becomes a public 'Public surface and stability' section. (5) A cross-class defaults table becomes public docs (K-10). (6) Design rationale goes to the English ARCHITECTURE/DECISIONS doc: hierarchy contract (:404-505), name↔label rule (:422, also public docs), flows layer (:508-528), tooltip JS/CSS boundary (:66-118). (7) Deferred items go to the later-release backlog: viewSteps removal (0.9.9), split bundles (1.x), HierarchicalBar collapse (0.9.8_9), Donut onDrill, topLevel/flatten adapters. (8) The matrix method plus a re-run on changed contracts become the 0.9.8_7 exit criterion and an English release checklist. The matrix itself does NOT need to survive: it is a snapshot from 2fad452 with stale counts, its probes lived outside the repo, and it is regenerable by the AUDIT §8 method.
- **Drops:** The per-class option tables for shipped ✅ options (they duplicate the per-page docs tables and src headers); all ✅ matrix rows; the closed blocker and minor-bug lists (:642-652, :676-686); the K-04/K-07/K-09/K-12/K-13 decision notes (durable in docs, README, CHANGELOG, core/links.js); the 2026-07-03 header pass (:668-674). Also the 'open false promises' lists (:812-823, :947-952, :1118-1122, :1235-1246) and the stale 'нет описания'/'противоречит' rows (:797, :831, :832, :945, :964, :965, :1133-1136), which are fixed in the tree — except :815-817 (charts/index.md:53, the points payload prose at settings:261 and line:183, the exported utilities), still open and carried by RC-035, plus the obsolete :1253 note about the temporary rare-website.css rule (removed 2026-10-26; now Rare Styles CSS-373). Scratchpad probe paths (:954) are dead.
- **Inbound references:** Outside charts/*-INTERNAL.md: .eleventyignore:7 (remove the line when deleting the file); assets/charts/src/graph/model.js:12 (code comment 'decision 2026-10-07, API-INVENTORY → "Flows"' — repoint it to the English decisions doc). No test, script, docs page, README or CHANGELOG references it. For context, references inside other INTERNAL files that are also being deleted: ROADMAP-INTERNAL.md:20,47,102,160,173,203,213,218,269; SPEC-SANKEY-INTERNAL.md:5,54,125; SPEC-GRAPH-FLOW-INTERNAL.md:5,86; AUDIT-INTERNAL.md:40,80,84,130,133,134,136,137,138,204,210,213-218,221,262,303-310.

### `charts/FIELD-NOTES-INTERNAL.md` (16 lines)

- **Keeps:** (1) The field-log process (:3-6: one row per finding, facts only, the log feeds the 0.9.9 plan) needs a durable English home, since ROADMAP 0.9.9 still plans field findings; this is an owner decision. (2) A public note that a chart created in a hidden container or background tab draws on first paint/resize (lesson from :10); not documented anywhere today. (3) Vertical Sankey label collision at 5 columns (:16) as a later-backlog note with D-08; the docs recommendation already exists at charts/sankey/index.md:45. The multigraph rationale (:12) is kept via the flows-layer rationale and graph/model.js:12-18.
- **Drops:** All 7 findings are resolved: :10/:11 by A1 (setData autofocus/docs; checked that the schnellreich stories-heroes.js whenReady workaround is already gone), :12 by A2 multigraph (0.9.8_3), :13 by A4 ego rosette (0.9.8_3), :14 by A3 tie hit zones/tooltip/pin (Graph 0.9.8_3, MapFlow R-15), :15 by MapFlow (0.9.8_6, released 2026-10-26), :16 by keeping orientation 'auto' plus the docs recommendation.
- **Inbound references:** Outside charts/*-INTERNAL.md: .eleventyignore:10 only (remove the line when deleting the file). No code, test, docs page, README or CHANGELOG references it. For context, references inside other INTERNAL files: ROADMAP-INTERNAL.md:47,96,122; SPEC-SANKEY-INTERNAL.md:90; SPEC-GRAPH-MAPFLOW-INTERNAL.md:3; AUDIT-INTERNAL.md:204,227,312.

### `charts/GRAPH-ARCHITECTURE-INTERNAL.md` (88 lines)

- **Keeps:** Reasons → English ARCHITECTURE doc: fixed layouts for query results instead of force, with the polar ego layout rejected (:12, :16, :20, :27, :87); no graph framework (:86). Unbuilt spec → later backlog: per-node aggregates for semantic zoom (:20, :54, :64); ego focus+context default (:44); stage-4 external layout adapter (:82). Open questions: response cache (:8, :30; O-09) and centrality metrics (:19). Owner decision: experimental, outside 1.0 (:5, :88).
- **Drops:** Status note (:8) and everything already shipped and documented: principles, layers, views, recentring and identity, data-source table, API sketch, stages 1–3 (:10-81). Superseded: 'release 1.x' (:5), cluster on force (:36), polar layout in stage 1 (:79), groupBy 'relation' (:67).
- **Inbound references:** .eleventyignore:8. No code, test or public-doc references. From other INTERNAL files (excluded): GRAPH-PLAYBOOK:4, SPEC-GRAPH-FLOW:17, ROADMAP:61. The pattern filter in test/docs-data-paths.test.js:20 excludes all *-INTERNAL.md.

### `charts/GRAPH-PLAYBOOK-INTERNAL.md` (110 lines)

- **Keeps:** Separate rare-charts-graph bundle, 1.x (:107, K-13). Graph controls: icons and dark theme (:108, B-05/K-14). The news-feed recipe (empty start + add()) → public charts/graph/index.md (:48-54, :101). Ownership layout and cluster strategies (:108) are already in the public backlog.
- **Drops:** Header and file/test map (:1-18, covered by code headers); data schema, loading data, four views, interaction, option cheat sheet (:20-93, public docs); Thiel, Columbus and custom-backend recipes (:97, :99, :103, public docs and demos); closed gaps (:108-110). The graph_branch reference (:6) is historical.
- **Inbound references:** .eleventyignore:9. No code, test or public-doc references. From other INTERNAL files (excluded): AUDIT:162, :204, :228, :229. Pattern filter: test/docs-data-paths.test.js:20.

### `charts/SPEC-GRAPH-FLOW-INTERNAL.md` (160 lines)

- **Keeps:** Unbuilt: legend key for shapes, dashes and width (:94). Deferred: rotation on phones (:102, :130), image export (:130). Non-goals (:130) → public flow page. Reasons → code comments: hull as a soft band (:142, flow.js), satellites (:154, flowAuto.js), `folds` not `groups` (:157, flowFold.js). Cytoscape + ELK arguments (:13) → ARCHITECTURE doc. Link time under T-10 (:81). Decide the _drafts mock-up's fate (:9-11). Consumer provenance (:3).
- **Drops:** Spec body and data contract (:15-82), stage 1 and 2 requirements, acceptance criteria and estimates (:84-126), test list (:132-138), implementation decisions already in code and public docs (:140-159).
- **Inbound references:** .eleventyignore:13; assets/charts/src/charts/Graph.js:102; assets/charts/src/graph/views/flow.js:13; test/flow-layout.test.js:11. From other INTERNAL files (excluded): ROADMAP:37, :100; API-INVENTORY:510; SPEC-SANKEY:3, :143; SPEC-GRAPH-MAPFLOW:78. Pattern filter: test/docs-data-paths.test.js:20. Outbound: _drafts/address-graph-octra.html (.eleventyignore:15).

### `charts/SPEC-GRAPH-MAPFLOW-INTERNAL.md` (97 lines)

- **Keeps:** `types: []` on one link, unbuilt (:19). Keyboard path to tie `sources` → K-23 (:24-27). MapFlow onSelect deferred (:96). Not-in-v1 list (:69, already public). Why `linkLegend` (:94) → MapFlow.js comment and K-05. Link time and timeWindowMode default (:57, :59) → T-10 and K-05. Consumer provenance: schnellreich, universe.json (:3, :36).
- **Drops:** A1–A4 (:7-32, shipped in 0.9.8_3); MapFlow contract, rendering, demos, packaging and order (:34-84, shipped in 0.9.8_6); implementation decisions (:86-97, in code and public docs).
- **Inbound references:** .eleventyignore:11; assets/charts/src/charts/MapFlow.js:5; test/mapflow.test.js:7. From other INTERNAL files (excluded): FIELD-NOTES:15; ROADMAP:37, :100; API-INVENTORY:510; SPEC-SANKEY:3. Pattern filter: test/docs-data-paths.test.js:20.

### `charts/SPEC-SANKEY-INTERNAL.md` (163 lines)

- **Keeps:** Unbuilt: hit area for thin bands (:76). Deferred: interactive legend (:78, :152) and the not-in-v1 list (:56, :59, :105). Keyboard path to bands (:99) → K-23/K-24. Label collisions question (:75). Test that a pinned tooltip is released (:119). Option-consistency acceptance (:125) → K-05/K-06. Why not d3-sankey (:66, :150) → core/sankey.js comment. Consumer profile (:3, :9).
- **Drops:** Contract, validation, layout, rendering, mobile, accessibility, demos, tests, acceptance, estimate and order (:1-146): shipped in 0.9.8_3, documented in Sankey.js and core/sankey.js headers and at charts/sankey/index.md. Implementation decisions and mobile results (:148-162): in code, public docs and FIELD-NOTES:16.
- **Inbound references:** .eleventyignore:12. No code, test or public-doc references. From other INTERNAL files (excluded): ROADMAP:37, :100, :121; API-INVENTORY:510. Pattern filter: test/docs-data-paths.test.js:20.


## Appendix C — Where each inventory item went

The 2026-10-26 inventory of the internal notes named items without an audit ID by a short slug. This table maps every such slug to its place in this file, so that nothing is lost in the rewrite. Items with an audit ID keep it above.

| Inventory item | In this file |
|---|---|
| `graph-tool-icons` | 1.x Graph: tool icons (K-14 keeps text glyphs) |
| `test-files-by-subject` | RC-026 |
| `rc-host-defence-removal` | Section H (RC-028, RC-032, X-08) |
| `theme-fontSize-removal` | RC-011 (removed in `0.9.8_7`) |
| `viewSteps-removal` | RC-059 (removed in `0.9.8_7`) |
| `audit-id-index` | RC-045 |
| `internal-deletion-mechanics` | RC-046, RC-047, RC-048 |
| `TSA-presets` | RC-001 |
| `TSA-resolution` | RC-002 |
| `TSA-custom-range` | RC-003 |
| `TSA-compare` | RC-004 |
| `TSA-counts-gaps` | RC-005 |
| `TSA-decision-2026-10-22` | Planning rules (2026-10-22); exit criteria |
| `data-project-flow-demo` | RC-050 |
| `stacked-area` | `0.9.8_8` |
| `DivergingBar` | `0.9.8_8` |
| `Scatter` | `0.9.8_8` |
| `Heatmap` | `0.9.8_8` |
| `Waterfall` | `0.9.8_8` |
| `rebase` | `0.9.8_9` |
| `legend-isolation` | RC-054 (the interactive legend in every class) |
| `0.9.9-scope` | `0.9.9` |
| `formatter-names` | RC-007 |
| `signature-changing-backlog` | `0.9.9` |
| `experimental-labels` | `0.9.9` |
| `1.0-exit` | `1.0` |
| `stability-statement` | `1.0`; RC-034 (public surface) |
| `0.9.9-semver-latest` | `0.9.9` |
| `donut-gauge-pure-math` | RC-025 |
| `site-dark-by-system` | Dropped here: 375 px fixed by Rare Styles CSS-354; dark-by-system is Rare Styles Q-07 / CSS-169 |
| `callouts` | 1.x API and labels |
| `bands-ts-dualaxes` | RC-051 |
| `candlestick` | 1.x new chart types |
| `spatial-hierarchies` | 1.x new chart types |
| `stacked-bars-dates` | 1.x Bar and Donut |
| `bar-stacked-dates` | 1.x Bar and Donut |
| `vertical-showValues` | 1.x Bar and Donut |
| `map-overlays` | 1.x Maps |
| `graph-ownership` | 1.x Graph |
| `graph-cluster-strategies` | 1.x Graph |
| `in-chart-labels` | 1.x API and labels |
| `branding-api` | 1.x API and labels |
| `names-relation` | RC-010; `nodeRadius` in K-10 |
| `theme-dead-tokens` | RC-011 |
| `a11y-multichart-overview` | RC-023 |
| `Overview-consistency` | RC-013 (the stale text is dropped) |
| `bar-mode-sniffing` | RC-009 |
| `split-bundles` | 1.x Bundles (K-13) |
| `hbar-collapse` | `0.9.8_9` |
| `donut-onDrill` | 1.x Bar and Donut |
| `hierarchy-projections` | 1.x new chart types (projection adapters) |
| `hierarchies-diverging-stackedarea` | `0.9.8_8`; 1.x new chart types |
| `GA-U1` | 1.x Graph: cluster strategies / semantic zoom |
| `GA-U2` | 1.x Graph: ego focus+context |
| `GA-U3` | 1.x Graph: third-party layout adapter |
| `GA-Q-centrality` | 1.x Graph: centrality |
| `flow-legend-explainer` | RC-053 (in D-04) |
| `flow-rotate-mobile` | 1.x Flow |
| `export-image` | 1.x Flow (export to an image) |
| `octra-mockup` | Deleted 2026-10-26 (owner decision 8) |
| `A2-types-array` | RC-012 |
| `mapflow-onselect` | 1.x MapFlow |
| `sankey-hit-zone` | RC-024 |
| `sankey-legend-filter` | RC-052 (in D-04) |
| `sankey-band-keyboard` | RC-022 |
| `sankey-label-collisions` | `0.9.8_8` |
| `sankey-pin-release-test` | RC-027 |
| `relation-api-consistency` | RC-010, K-05, K-06, K-08 |
| `del-eleventyignore` | RC-047 |
| `del-code-pointers` | RC-046 |
| `del-docs-data-paths-filter` | RC-047 |
| `graph-js-comment-drift` | X-12 |
