# RareCharts — design decisions

This file is the record of RareCharts design decisions and their reasons. The public docs at raredigits.art/charts/ say what the library does. This file says why.

It is not published. `assets/charts/docs/` is listed in `.eleventyignore`, `.eleventy.js` copies no file from it, and `sync-charts.yml` does not ship it to `raredigits/rare-charts`.

It replaces the Russian working notes in `_internal_docs/charts/`: the 0.9.8_6 audit, the roadmap, the API inventory, the Graph architecture note and the three specs (flow view, MapFlow, Sankey). Their text stays in git history on `main`: `git ls-tree --name-only 0b8d664 _internal_docs/charts/` lists them, and `git show 0b8d664:<path>` prints one. Open tasks live in `_internal_docs/charts/BACKLOG.md`.

**How to add an entry.**
- Put it under its subject. Write the decision, then the reason, then who decided and when, with the task ID.
- If the sources give no reason, write "maintainer decision, <date>". Do not invent one.
- When a decision changes, rewrite the entry and add a line: "Superseded <date>: <the old decision>."
- Mark a decision that is not in the code yet: *Not in the code yet (<release>).*
- The older notes call the maintainer "the owner". This file says "maintainer".

**IDs.** Code comments, tests, `rare-charts.css` and the public CHANGELOG cite audit and task IDs (`C-13`, `K-15`, `RC-026` …). Each one resolves in the [audit ID index](#14-audit-id-index) at the end. An ID that appears only in this file is either a task in `_internal_docs/charts/BACKLOG.md` or an ID from the retired roadmap and audit notes, marked "roadmap" or "audit" where it is cited (`R1`–`R3`, `B4`, `N1`, `S-01`, `S-02`, `S-05`, `S-06`). The undashed `N1` in the index below is a different, later review ID.

Version numbers without a name are RareCharts releases. Rare Styles versions always say "Rare Styles".

## Contents

1. [Library principles](#1-library-principles)
2. [API and naming](#2-api-and-naming)
3. [Defaults](#3-defaults)
4. [Time and time zones](#4-time-and-time-zones)
5. [Motion](#5-motion)
6. [Accessibility](#6-accessibility)
7. [Theming and CSS](#7-theming-and-css)
8. [Tests](#8-tests)
9. [Docs and API checks](#9-docs-and-api-checks)
10. [Release process](#10-release-process)
11. [Experimental classes (B3) and scope](#11-experimental-classes-b3-and-scope)
12. [Consumers](#12-consumers)
13. [Graph architecture](#13-graph-architecture)
14. [Audit ID index](#14-audit-id-index)

---

## 1. Library principles

- **RareCharts stands on its own; Rare Styles only helps.** The library has its own styling: `core/theme.js` and `rare-charts.css`. A chart must look and work right on a page with no Rare Styles. No minimum Rare Styles version is declared. The guards against host styles stay, and a chart must not break on a Rare Styles `v0.7.1` host either. Maintainer decision, 2026-11-17 (answers RC-032 and the minimum-version question).
- **Standalone styling has working values.** `rare-charts.css` defines its own `--rc-*` values on `.rc-chart` (fonts, spacing at the Rare Styles 16 px scale, the Lin/Log fill). Every host variable it reads has a fallback. Reason: undefined host variables (`--space-*`, `--bg-color`) made declarations invalid, so legend dots, tooltip padding and plate fills depended on the page, although the README promised a standalone library. Own tokens defined on `.rc-chart` need no fallback. (C-13, 0.9.8_6.)
- **The library loads no webfont.** The page supplies Fira Sans and Cousine; without them, system fonts apply. Reason: the unconditional Google Fonts `@import` in the injected CSS was an extra external dependency for every consumer. (K-01, 0.9.8_6.)
- **A strict Content Security Policy is supported.** `window.RareChartsConfig = { injectStyles: false }`, or a `<link id="rc-base-styles">`, stops the injected `<style>`. Each release publishes `rare-charts.css` next to the bundle. Reason: under a strict CSP the injected `<style>` was blocked, and the working route was not documented. (K-18, 0.9.8_6.)
- **The 1.0 freeze covers the full "terminal" vocabulary.** The missing genres (composition, scatter, heatmap, waterfall, scales) land in 0.9.8_x releases before the freeze. Source: the "analytical Bloomberg" gap analysis. The cost is young classes that need run-in; 0.9.9 exists for that. Maintainer decision, 2026-07-06.
- **Young classes are released one by one.** Risk: classes from 0.9.8_x freeze while young. Mitigation: release each class when it is ready, not in a batch before 0.9.9; record its options at once (see the new-class rule in §9); run it through the dashboard project before the freeze. (Roadmap, 2026-07-06.)
- **1.0 means the API freeze.** The public surface (option names, data shapes, CSS hooks, events) is frozen under semver. The library already loads by CDN on production sites, so the contract is in force in practice; 1.0 makes it formal. (Roadmap.)

## 2. API and naming

### One relation contract for Graph, Sankey and MapFlow

Step-0 decisions of 0.9.8_3, 2026-10-07. Code: `core/links.js` (`normalizeRelationData`), `graph/model.js`. The classes are experimental, but the vocabulary is shared: changing it later would hit three classes at once.

| Decision | Reason |
|---|---|
| Links are `links` with `source`/`target`. `from`/`to` (endpoints) and `flows` (the collection) are input aliases only. Events and tooltips always carry the canonical form. | Graph and d3 already used `source`/`target`. The data-project mock-up and the MapFlow draft wrote `from`/`to`; they are accepted without rewriting the data. |
| Time on a link is `start`/`end`. An open end is `null` or absent. | `from`/`to` are taken twice: by the endpoint aliases and by the vertical annotations `{ from, to }`. |
| On a link, a number below 10000 is a year. `YYYY` and `YYYY-MM` are periods; `{ end: true }` reads the last millisecond of a period. | `parseDate(1773)` gave milliseconds after 1970. Relation charts got their own `parseTime` (T-01 keeps epoch ms for ordinary time series). |
| `setTimeWindow(from, to)` with `timeWindowMode: 'hide' \| 'dim'`. MapFlow defaults to `'hide'`, the flow view to `'dim'`. | In the flow mock-up, ties outside the window are dimmed so the context stays visible. On a map, extra arcs are only noise. The difference is on purpose (recorded 2026-11-17, RC-010). |
| Graph stores a directed multigraph (graphology `{ type: 'directed', multi: true }`). Analytics (degree, Louvain, shortest paths) run on an undirected simple projection, built lazily and reset on merge. | Louvain does not support true mixed graphs. Directed paths and betweenness change results: the path view would stop finding routes "against the arrows". The projection keeps ego, path and cluster exactly as before. About 15 lines instead of a `graphology-operators` dependency. |
| Merge dedupes. The same `id` updates. Without an `id`, the same pair and `type` updates and another `type` adds a parallel tie. Ego, path and cluster treat a pair as unordered; the flow view as ordered. | The second tie of a pair used to be lost silently. Loading a neighbourhood again stays idempotent. |
| `model.links(a, b)` returns every tie of a pair, both ways. | In a multigraph `graphology.edge(a, b)` is ambiguous and throws. The compatible `link(a, b)` was removed in 0.9.8_6 (X-01). |
| One width option: `linkWidth: { by, scale, min, max }`; `value: null` takes `min`. | Shared by the flow view, Sankey (where width is the band) and MapFlow. |
| One `linkTooltipFormat` in all three classes. `flowTooltipFormat` from the MapFlow draft was rejected. | One vocabulary. |
| Tooltip pinning is opt-in: `Tooltip.pin()`, `unpin()`, `isPinned`. A click elsewhere or Escape closes it. | Links inside a tooltip (the proof sources on schnellreich.ru) must be clickable. Classes that call only `show`/`hide` keep their behaviour. |
| One normalizer with a policy per class for unknown endpoints: the Graph model and the flow view create the node, MapFlow drops the link with a warning, Sankey drops with `nodes` given and creates without. | Link data was normalized twice, with two id formats and three policies. (K-07, 0.9.8_6.) |
| Link id formats are frozen before 1.0. The caller's `id` wins. Payload classes (flow, MapFlow, Sankey) use `source→target#n`; the accumulating Graph model uses `source→target\|type`. Only `core/links.js` makes them. | K-07, 0.9.8_6. |
| A tie's category resolves in one place, `resolveLinkType`. | Four ways of mapping type to colour gave the legend and the tooltip different categories. (R-01, 0.9.8_6.) |
| One link per type. `types: [...]` on one link is not supported, and the data-shape docs say so. | Maintainer decision, 2026-10-26 (RC-012). Superseded 2026-10-26: the 2026-07 Graph spec (A2) asked to accept `types: []`. |

### Names fixed before the freeze

- **`folds`, not `groups`.** `group` already means a node's colour (`nodeGroups`); two close names would be a trap at the freeze. A meta-node id is `fold:<id>`, toggled by +/− on the node's shoulder or the + and − keys. (Flows II, 2026-10-20.)
- **MapFlow's legend option is `linkLegend`.** The base Chart owns `legend`, the header legend. (Flows II.)
- **MapFlow is a subclass of Map. Its page is `/charts/map/flow/`**, under Map in the menu, as the flow view sits under Graph. (Flows II.)
- **A series is a `name`; a part or a slice is a `label`.** Line, DualAxes and stacked Bar identify series by `name`. Donut slices, Bar categories and tree nodes use `label`. The only remap: collapsing a stack into one category maps `series.name` to `slice.label`. The rule is recorded, not "fixed". (API inventory, 2026-07-21; RC-036 puts it in the public docs.)
- **Formatter arguments follow one rule, backward compatible.** A payload object carries role fields (`label`, `value`, `date`, `color`, `percent`, `series`, as they apply). A formatter whose first argument is a number, a data row or a node keeps it and gets the role fields as the next argument. Reason: `tooltipFormat` had nine argument shapes across the classes. (K-09, 0.9.8_6; table on `/charts/settings/#formatter-arguments`.)
- **No formatter renames.** K-09 unified the arguments, not the names. Maintainer decision, 2026-11-17 (RC-007); confirmed 2026-11-19.
- **`legendPosition` is frozen**: top (the default) or `'right'`. Maintainer decision, 2026-11-17 (RC-008); confirmed 2026-11-19.
- **Bar picks its mode from the first row** (date, categorical or stacked). The detection rule is contract and is documented. Maintainer decision, 2026-11-17 (RC-009); confirmed 2026-11-19.
- **No renames in the experimental relation charts** before 1.0. Sankey also passes `links` in its node tooltip payload, beside `incoming` and `outgoing`. Maintainer decision, 2026-11-17 (RC-010).
- **The flow view's key to the drawing is `legendSymbols`, not `legendKey`.** In the legend a key is already an item's identity: the public `data-key` attribute and `legendKey()` in `core/legend.js`, which pages read. Shapes are named by their kinds by default; the dash and width rows show only with the page's words; `false` drops the key. Maintainer decision on the option, 2026-11-17 (RC-053, answer A); the name was picked by the K-05 naming rules in the implementation, 2026-11-18.
- **Show all is `button.rc-legend-reset`**: the name of the button, not a state class. `rc-graph-legend-reset` stays as an alias until 0.9.9. Maintainer decision, 2026-11-17 (legend spec, question 2, answer A).
- **`interactiveLegend` becomes `legendInteractive`, with no alias.** The type filters keep their meaning: traversal in the Graph ego view; visibility in the flow view and MapFlow. The flow view gets `setLinkTypesVisible`, as MapFlow has. Maintainer decision, 2026-11-17 (K-05). Shipped in 0.9.8_7.
- **State is `aria-pressed`, with no new classes.** `.active` on the range buttons and `rc-graph-legend-item` stay as aliases until 0.9.9. Maintainer decision, 2026-11-17 (K-06). Superseded 2026-11-17: K-06 first proposed `.rc-range-btn.is-active` and `.rc-legend-toggle`. Shipped in 0.9.8_7.
- **One name for horizontal bar thickness: `barWidth`.** HierarchicalBar's `barHeight` is removed with no alias; the docs and the CHANGELOG say so. Maintainer decision, 2026-10-26 (RC-056). Shipped in 0.9.8_7.
- **`viewSteps` is removed in 0.9.8_7**, not in 0.9.9. Maintainer decision, 2026-10-26 (RC-059). *Shipped in 0.9.8_7.*
- **Theme tokens with no reader are removed: `positive`, `negative`, `fontSize`.** Maintainer decision, 2026-10-26 (RC-011).
- **MultiChart takes every class.** Its shared legend toggles the series of that name in every cell. Maintainer decision, 2026-11-17 (K-11). The roadmap called the Line/Bar-only `TYPE_MAP` the bottleneck for dashboards. Shipped in 0.9.8_7.
- **Map region clicks.** In 0.9.8_7 the chart only tells the page which region was clicked (`onRegionClick({ feature, item, event })`); the page navigates itself. Links from the data (`href`) come after 1.0. Maintainer decision, 2026-11-17 (B-06). Shipped in 0.9.8_7.

### Public surface

From the API inventory. RC-034 publishes it; `test/charts-css-contract.test.js` (S-16) enforces the CSS part. Reason: the semver freeze needs a statement of what is not contract.

- **Not contract:** `render()` (an internal redraw, a no-op after `destroy()`); Graph's `render()` and its inherited `onScaleChange()`; instance state (`width`/`height` getters, `container`, `options`, `theme`, `margin`, `svg`; TimeSeries `xScale`, `yScale`, `clipId`); `_` members; the height and margin of MultiChart cells.
- **Internal CSS classes:** `.rc-bar*`, `.rc-hbar*`, `.rc-dual*`, `.rc-multichart*`, `.rc-donut*`, `.rc-gauge*`, `.rc-map*`, `.rc-mapflow*`, `.rc-sankey*`, `.rc-graph-*`, `.rc-flow-*`.
- **Documented hooks:** `.rc-chart`, `.rc-tooltip` and its row classes (`.rc-tooltip-header`, `-row`, `-row--plain`, `-swatch` and its `--dashed`, `--band`, `--dot`, `-label`, `-value`, `-note`, `-muted`, `-sub`, and `--rc-swatch-color`), `.rc-num`, `.rc-chart-controls`, `.rc-chart-note`, `.rc-cross-line`, `.rc-graph-details` (`-kind`, `-muted`, `-ties`), `.rc-graph-tool`, `.rc-overview`, and the `--rc-*` tokens of the token block in `rare-charts.css`.
- **A page builds its own tooltip from the row classes, not from a helper.** `tipRow`, `tipNum` and `tipDate` in `core/html.js` stay internal; `/charts/settings/` documents the markup they write, and every docs example writes it by hand. Maintainer decision, 2026-11-18 (RC-082): the classes, not a new exported function.
- **`generateMockPrices` stays exported** as a demo helper outside the stability promise. **`Overview` is a public class**, documented once on `/charts/line/time-series/`. (K-04, 0.9.8_6.)
- **`RareCharts.d3` is a frozen subset of 28 functions**, taken only from modules the bundle already carries. Reason: the whole `d3` re-export was about 25% of the gzip size; the subset costs 255 bytes over none. Pages that used other parts of d3 load D3 themselves. (K-13, 0.9.8_6.)
- **`Pie` draws a pie** (`innerRadius: 0`). Reason: the docs promised a pie; the code was fixed to the contract, not the docs to the bug. (C-05, 0.9.8_6.)
- **Donut `drillTo(node)` is public**, next to `drillUp()` and `drillToDepth()`. Decided in cleanup step 7 with the other public-surface questions (K-21, `fe4f800`, 2026-10-23); no reason recorded.

### Hierarchy contract

Decided 2026-07-21 with the maintainer, shipped in 0.9.8_2. One normalizer, `core/hierarchy.js`, serves HierarchicalBar, the Donut drill-down and, after 1.0, the spatial hierarchies (treemap, pack, sunburst). The header of `core/hierarchy.js` states what it does. The reasons:

| Decision | Reason |
|---|---|
| A parent's `value` is authoritative and may exceed the sum of its children. The difference is a remainder, drawn only with `remainderLabel` or `showRemainder`. | Investigative data often has a known total and a partial breakdown. The unknown part cannot be subtracted, and it is never drawn silently. |
| Children above a stated parent value: `overflow: true` and a warning; `strict: true` throws. | An explicit policy instead of a silent negative segment, which a donut cannot draw. |
| A leaf is kept only with `value > 0`. | Compositional charts draw only positive magnitudes. Filtering once here stops each consumer filtering differently. |
| `value: null` means "missing": kept, out of every sum, drawn as "?" in a bar and as "N not disclosed" under a donut. | A named but undisclosed item is not a remainder (anonymous) and not a dropped row. |
| A parent with no disclosed value and no disclosed child is missing, not 0. | It showed 0, and the drill-down showed NaN%. (C-19, 0.9.8_6.) |
| Ids are assigned in two phases; a sibling's disambiguation is carried into its descendants' prefix. | A naive "ancestor labels + label" path gave colliding grandchildren (blocker 1 of the 2026-07 review). |
| A node's colour is lifted into the atom, never inherited down a subtree. | Bars and donuts need categorical contrast; hue families are a job for the spatial hierarchies (blocker 8). |
| Options live at chart level only: `showRemainder`, `remainderLabel`, `strict`. | Not recorded. |
| The atom `{ label, value, color? }` is shared with Donut and stacked Bar segments. Validation rules differ per consumer. | One shape and one set of key names. |
| Donut chooses its mode by input type: an array is flat, a root object is a tree. A `drilldown` switch was rejected. | No sniffing of fields, the same smell as Bar's time-series detection. A tree on input is enough. |
| Projections down a dimension (`topLevel(tree)`, `flatten(tree, { depth })`) are explicit adapters (1.x). | Same reason: no shape sniffing inside a class. |
| Stacked Bar values are ≥ 0. | A stack encodes cumulative length. Signed comparisons belong to DivergingBar. |
| The drill-down's navigation state in the stable Donut is frozen at 1.0. `onDrill` is not in v1. | Navigation stays internal; a callback can be added later without breaking anything. |

## 3. Defaults

- **Number formats.** Axis ticks use `~s` or `,~f` by magnitude; value labels use `.3~r`. Reason: the old `.2s` gave repeats and odd labels ("150 150 160 160", "0.0", "5.0k" next to "10k"). (C-30, 0.9.8_6.)
- **Bar's default `valueFormat` is `,.2~f`**: `1,234`, `87,000`, `0.4`, `2.35`. Reason: `,.0f` printed 0.4 as "0", and `.3~r`, the format first decided, printed 1234 as "1230" and 87000 without a separator. Maintainer decision, 2026-10-26 (C-41); the format was changed in the implementation and the maintainer told, 2026-11-18. Shipped in 0.9.8_7. Superseded 2026-11-18: `.3~r`, as on Line's end labels.
- **TimeSeries keeps `'$'` as its default**; `yFormat`, `yPrefix` and `ySuffix` are added (RC-005). Reason: existing charts must not change. Maintainer decision, 2026-10-26. The new options shipped in 0.9.8_7.
- **Line and DualAxes date ticks follow the span**, as on TimeSeries and Bar: `Jan 05`, `Jan`, `Jan ’24`, `2024` instead of `01/05`. Maintainer decision, 2026-11-17 (K-10). Shipped in 0.9.8_7.
- **DualAxes without its own formatters labels its axes as Line does**: `65k` and `0.5`, not `65,000.00` and `+0.50`. The names `y1`/`y2` stay. Maintainer decision, 2026-11-17 (K-10). Shipped in 0.9.8_7.
- **The other K-10 differences stay** and go into the public defaults table (RC-033): `area`, Y ticks, curve, bar width ratio, gutters, centre label, node radius. TimeSeries' stroke and curve tension follow Line with D-09. Maintainer decision, 2026-11-17.
- **Bar's Y gutter goes from 65 to 64 px. An unknown curve name warns**, and the two docs examples with a misspelt curve are fixed. Maintainer decision, 2026-11-17. Shipped in 0.9.8_7.
- **An explicit `margin.top` wins** on Line, Bar, TimeSeries and DualAxes alike. Reason: the annotation-label formulas differed between them. (K-10, part shipped in 0.9.8_6.)
- **The interactive legend is on everywhere**; `legendInteractive: false` gives a static legend. Maintainer decision, 2026-10-26 (RC-054). Shipped in 0.9.8_7 on every class with series or tie categories (one builder, `core/legend.js`, D-04).
- **Legend gestures.** A click (or Enter/Space) toggles a series. A double click keeps only that series, and a second double click brings all back. A "Show all" item shows while anything is off. Graph follows the same gestures; today its click keeps one type. Maintainer decision, 2026-11-17 (RC-054). Shipped in 0.9.8_7.
- **Hiding a series rescales the axes**; `legendRescale: false` keeps them fixed. Maintainer decision, 2026-10-26, confirmed 2026-11-17. Shipped in 0.9.8_7.
- **The legend in detail** (the legend spec of 2026-11-17, its decision numbers in brackets; shipped in 0.9.8_7):
  - A pointer click that hides waits 250 ms (`HIDE_DELAY_MS`); a click that shows, and every keyboard, screen-reader or scripted click, acts at once. Reason: the series you double-click to keep must never flash off, and a double click is one commit. [3]
  - Hiding the last series is allowed: the frame stays with no marks, and Show all shows. Graph ego then draws the root alone from its model, with no source call and no breadcrumb. Reason: a click that does nothing reads as broken, and a remote source may read an empty type list as "all". [6, 26]
  - Hidden keys survive `setData`. A hidden key that leaves the data stays hidden and comes back hidden; `setSeriesVisible` / `setLinkTypesVisible` replace the set against the keys present now. Reason: live data that drops a series for one refresh must not show it again. [9]
  - The legend is synced before the class render, and Show all is its last child: `hidden` in a row while nothing is off, laid out but invisible in the right-hand column. Reason: Show all can add a header row the height reads, and a layout shift between the two clicks of a double click would move the target. [10, 11]
  - `legendInteractive: false` gives plain labels with no Show all, and leaves out the items whose series is hidden through the API; the setters still work. Reason: a static key must not show a series the chart does not draw. [15]
  - `legendRescale` sets the base: the value domain on the axis charts; the axis maximum and the percent base on the stacked Bar; the angles, percents and centre total on Donut and Pie. Sankey, flow, Graph and MapFlow never re-lay out. [17]
  - Never follows the legend: the time axis, the view, the timeframes and the navigator; palette colours (by input index); category axes; node positions in Sankey, flow and MapFlow; the formats (auto percent, the log decision), which read every series in view; annotations. [18]
  - No new motion: a legend redraw is instant, and an entry in progress carries on to the new geometry (C-16). [19]
  - `onLegendToggle` fires once per committed gesture, after the redraw (in Graph ego after the re-query). The setters never fire it, so a page that mirrors one chart into another cannot loop. [20]
  - One setter name per kind: `setSeriesVisible(names | null)` on Line, DualAxes, TimeSeries, Bar, Donut, Pie and MultiChart (slice `id`, else `label`), `setLinkTypesVisible(types | null)` on Sankey, Graph and MapFlow; both return `this`. No `hiddenSeries` option: chain the setter after `setData`. [21]
  - A legend item without a `color` takes its series' colour, else the accent. [22]
- **`timeZone` defaults to `'local'`** (see §4). Maintainer decision, 2026-10-26. Shipped in 0.9.8_7.
- **A TimeSeries chart that sets none of the new 0.9.8_7 options renders as in 0.9.8_6.** Hence `timeframeAnchor: 'dataEnd'` and `gaps: 'join'` as defaults. The visible changes listed in the 0.9.8_7 exit criteria are the only exceptions. Maintainer decision, 2026-10-22 (the donor's acceptance condition; RC-001, RC-005).
- **The flow view's `layout: 'auto'` is the default** (0.9.8_6). A node with any position hint is pinned, so fully hinted data renders as before; `layout: 'hints'` restores stage 1. See §13.
- **Partial `margin`: an unset side is 0.** The base Chart no longer fills in 8/70/16/0. Donut, Pie, Gauge, Sankey and Graph do not use `margin`. Reason: a partial `margin` replaced the class defaults wholesale (Map and MapFlow lost their 70 px on the right). (C-17, 0.9.8_6.)
- **A plot keeps at least 80 px.** When the header, buttons and footer do not fit in `height`, the card grows by the difference. Reason: a narrow card could be left with no plot at all. (C-32, 0.9.8_6.)
- Relation-class defaults with their reasons (Sankey orientation and sort, MapFlow widths) are in §13.

## 4. Time and time zones

- **One time-zone policy.** A `timeZone: 'UTC' | 'local'` option drives parsing, ticks, tooltips and preset boundaries. The default is `'local'`: what users see today. Date-only strings become local midnight. A day-of-month clamp applies. Tests run under a fixed non-UTC zone. Reason: a `'YYYY-MM-DD'` string is parsed as UTC midnight but shown and cut in local time, so month buckets shift west of UTC; `resolveTimeframeExtent` normalizes YTD to midnight but not the relative windows; `'1M'` from 31 March gives 2 March. Maintainer decision on the default, 2026-10-26 (T-10). Shipped in 0.9.8_7; `test/time-zones.test.js` runs under several zones.
- **Link times follow the same policy**: link start and end, the link-time timeframes and the navigator in the flow view and MapFlow (RC-006). Shipped in 0.9.8_7.
- **Relation time and series time differ.** For relation navigation, a number below 10000 is a year, and `YYYY` and `YYYY-MM` are whole periods: the upper bound is the end of the period. Ordinary time series keep documented epoch milliseconds; `parseDate` was not replaced by `parseTime` everywhere. Years 0–99 use `setUTCFullYear`, because `Date.UTC` turned year 99 into 1999. (T-01, 0.9.8_6.)
- **Time navigation lives in the base Chart.** The flow view and MapFlow reuse `timeframes`, `navigator`, `setView` and `onViewChange`. They declare themselves with `_isLinkTimeChart()` and hand over their ties with `_timeLinks()`; `core/Chart.js` does the rest once for both. Both controls are opt-in. The navigator plots the number of active links per day, month or year. With navigation on, `setTimeWindow` moves the view, and the buttons and the brush follow. `Overview` gained `axis`. Reason for the shared base: the time-navigation code was copied between Graph and MapFlow, and the view sync between six classes (D-01, 0.9.8_6). (Flows II, 2026-10-20.) The 0.9.8_7 TimeSeries work extends the same machinery.
- **No page-side time slider.** The flow spec's slider was dropped: in its form it added little. MapFlow's demo radio buttons gave way to the same time scale after the maintainer's review of 2026-10-21.
- **Date ticks follow the visible span** on TimeSeries and the Bar date axis. Reason: `'%b'` repeated months ("Sep Oct Oct Oct") and dropped the year. (C-31, 0.9.8_6.) Line and DualAxes follow in 0.9.8_7 (§3).
- **Wheel zoom needs Ctrl or ⌘** on TimeSeries, and by the same rule on Map and MapFlow. A plain wheel scrolls the page; a short hint appears when someone wheels without the modifier. Maintainer decision, 2026-10-26 (T-09). Shipped in 0.9.8_7.
- **Presets anchored to now.** `timeframeAnchor: 'now' | 'dataEnd'`. Calendar keys (`TODAY`, `WTD`, `MTD`, `YTD`) start at the start of the day, week, month or year in the chart's zone; rolling keys (`24H`, `7D`, `30D`, `12M`) stay rolling. The API sketch is provisional. Reason: a donor's traffic report (2026-10-22). (RC-001.) Shipped in 0.9.8_7.

### TimeSeries analytics (0.9.8_7)

A donor's website traffic report asked for these (2026-10-22). The maintainer answered the open questions on 2026-11-18. Charts that set none of the new options draw as before; the wheel rule below is the one exception.

- **The anchor.** `timeframeAnchor: 'dataEnd' | 'now' | a date` on every chart with timeframes. A window anchored to now ends at now: it does not show the rest of the day or month empty. "Now" is read once per data or selection change (`setData`, `appendPoint`, `setTimeframe`, a click), never on render: button lighting compares windows exactly, and a resize must not unlight one. If a step does not resolve, the earlier reading is restored. A fixed anchor is read as a view bound. The anchor words are case-insensitive; an unknown anchor or `weekStart` warns once.
- **Keys.** `TODAY`, `WTD`, `MTD` and `YTD` start at the start of the anchor's day, week, month or year in the zone. The week starts on Monday unless `weekStart` says otherwise. `nH` counts real hours, so `24H` and `TODAY` differ on a DST day.
- **The custom range.** It opens a panel under its button, not fields in the button row.
  - The panel follows its button in the range bar, for the Tab order.
  - A click outside returns focus to the button unless it focused another control, and tabbing out closes the panel.
  - On Apply the days are clamped to the fields' min / max. In a short card the panel is lifted inside the card.
  - The days are kept, not a relative window.
  - A `{ key: 'CUSTOM', range }` step stays a fixed period.
- **Resolution.** Levels in `setData({ hour, day, month… })` and `setLoading`, not a Promise protocol: the page loads lazily from `onViewChange(extent, { key, level })` and calls `setData` again. There is one view callback, not a new one.
  - Coverage is read from each level's rows after the gaps rule and counted in buckets in the zone. A covering level is one with at most one bucket of slack at each end.
  - The fallbacks: when no covering level fits, the coarsest covering one; when none covers, the finest with rows in the window; with no rows in the window, the coarsest.
  - `info.level` is `null`, not absent, on plain rows. The loading bar wears the tooltip's tokens.
- **Gaps.** Without a level or `interval`, the bucket is the data's most common step; a tie gives none. A filled bucket is dated one interval step after the row before the gap. `tooltipFormat` is not called over a gap. At most 100,000 buckets are filled, with a one-time warning.
- **The comparison.** For a calendar key it compares the same days of the previous unit (1–18 November against 1–18 October); any other window compares with its own length before. `'previousYear'` sits beside it.
  - The period picked holds while the brush, the wheel or `setView` then move the window: zoomed into a week, the comparison is still the week before (maintainer, 2026-11-18 — with the window's own length, every wheel step slid the dashed line out of phase). With nothing picked, or after `ALL`, the window's own length, rounded to whole days (whole hours under a day). Custom compares by its days.
  - The wheel's zoom limit follows the data: down to four of the finest rows, never less than 500×. A mouse notch with Ctrl zooms as much as with ⌘; only a pinch's small steps keep d3's tenfold Ctrl rate.
  - Rows move one by one, and of two rows landing on one date the later wins.
  - Its look is grey and dashed: `theme.muted`, `4 3`, 1.5 px, no area.
  - `info.series` and `info.compare` exist only with `compare`. A header item without a `type` that names a dashed series gets a dashed swatch.
- **Counts.** `yFormat: 'number'` gives compact ticks as on Line and the exact count in the tooltip (`1,234`); `'currency'` stays the default.
- **Bands.** TimeSeries reads its band from the rows (`band: true` or `{ lower, upper, … }`), so each level carries its own; DualAxes takes Line's `type: 'band'` series. The opacity is 0.12, as Line's bands. The crosshair never follows a band: its edges come as a tooltip row.
- **The wheel (T-09).** On TimeSeries, Map, MapFlow and Graph a wheel zooms only with Ctrl/⌘ (a trackpad pinch arrives as Ctrl+wheel), so a page scrolls past a chart.
  - One finger belongs to the page and two to the chart. A touch sequence the page has begun to scroll stays the page's. `touch-action: pan-x pan-y` where d3 binds touch.
  - The hints are fixed English, made on first need, in the tooltip's tokens. Graph's Ctrl + drag follows d3's default.
  - One module holds the rule: `core/zoomGesture.js`.

## 5. Motion

- **One entry duration: 650 ms for every chart.** Bars grow a little slower and the gauge fills a little faster than today. Graph transitions after the first render stay at 500 ms; the first render does not animate. Maintainer decision, 2026-11-17 (K-08). `stagger` exists only on Bar; TimeSeries, Overview, Map, MapFlow and the flow view have no entry motion.
- **One entry timeline per chart** (`core/entryMotion.js`). A render during the entry (after `document.fonts.ready`, on the first resize) continues each mark from where it stands; it neither restarts the entry nor cuts it to its end. Reason: a render mid-entry replayed the animation or froze the geometry, and the guard was copied eight times. The 0.9.8_2 Bar fix showed the cause: a flag set in `on('end')` never fires on an interrupted transition. (C-16, 0.9.8_6.)
- **Reduced motion.** Every animating class takes its duration through `motionDuration()`, which honours `prefers-reduced-motion`; the CSS gates its own motion. (B4, roadmap 2026-06-20, shipped 0.9.8.)
- **A hidden legend series disappears; it is not dimmed.** It also leaves the tooltip, the crosshair and the end labels. Maintainer decision, 2026-11-17: the 2026-10-26 behaviour, confirmed "after a short detour through dimming" (RC-054).

## 6. Accessibility

- **Every SVG chart has an accessible name.** `applySvgA11y()` in `core/renderHelpers.js` reads `ariaLabel`, else the title and subtitle. All ten SVG classes call it (checked 2026-10-26). A class that forgot the call would ignore `ariaLabel`, so the rule goes into a code comment, or the call moves into `Chart._createSvg()` with D-09. (B4.)
- **Graph keyboard access is a roving tabindex** (`graph/roving.js`). The nodes of a view share one Tab stop, the flow view's ties another; arrow keys move, Enter or Space acts as a click, Escape clears. Reason: nodes and flow ties could not be reached from the keyboard. (K-20, 0.9.8_6.) Open before 1.0: ties in ego, path and cluster (K-23), and the contract for an `svg role="img"` that holds focusable buttons (K-24).
- **Focus survives a legend redraw**: the one legend builder (`core/legend.js`) updates its items in place, keyed by `data-key`, so an item that stays keeps focus; when the focused one goes, focus moves to the toggle before it, then the one after, then the legend group. Superseded 2026-11-18: `graph/legendFocus.js`, which restored focus after a rebuild. Reason: rebuilding the legend dropped focus to `<body>`, so the next key did nothing. (R-16 and D8, 0.9.8_6.) Escape or × on the hidden-nodes list returns focus to the "+N more" button (D7).
- **Pinning works from the keyboard.** Enter on a focused Sankey node or MapFlow arc pins its tooltip.
- **Sankey renders a hidden table of flows by default** (`tableFallback: true`) as a text alternative for screen readers. Nodes are Tab stops. A keyboard path to the bands is RC-022.
- **A drilled-in Donut's hole is the button back up**, with `tabindex`, `role="button"`, an `aria-label`, and Enter or Space. (E-21, 0.9.8_6.)
- **Toggle state is `aria-pressed`** on range buttons and legend items (K-06, §2). The range buttons have it since 0.9.8_7.
- **A Map region is focusable and shows a pointer only when `onRegionClick` is set** (B-06, §2). Shipped in 0.9.8_7.

## 7. Theming and CSS

### The tooltip: JS for colours, CSS for the rest

Decided in B-03 (0.9.8_6) with C-23 and D-03. Code: `core/Tooltip.js`, `core/html.js`, `rare-charts.css`.

- The JS theme passes colours and fonts only, per chart: `tooltip.bg`, `border`, `text`, `muted`, `shadow`, `header.*`, `font` (the words) and `numericFont` (the figures). A theme's own values are published on the chart's element as `--rc-tooltip-*` and the tooltip inherits them; without them it reads the page's `--chart-tooltip-*`. A `null` value takes the chart token; an empty value leaves the CSS fallback. Superseded 2026-11-18: `Tooltip.js` set `--rc-tooltip-*` on the tooltip element itself (theme step 3).
- CSS owns the size, the row sizes, weights, padding, `max-width` and letter-spacing. Its `var()` fallbacks equal `defaultTheme.tooltip`; `test/charts-css.test.js` keeps them in step.
- **The tooltip is a table** (RC-082): the date on top, 13 px and muted; one row per series — its mark in its colour (a line, a dashed line, a square for a band, a dot for a bar or a slice), its name in the text colour, its value right-aligned in the numeric font; a note under a row (a comparison's date and change, a share). The text is 14 px on a 24 px line, and the visible tooltip is opaque. The date and the note are in the text font, the values in the numeric font. Maintainer decision, 2026-11-18, from the mock-up "variant A" with a slightly larger font; the date and note in the text font after seeing it (`4f703d3`). Reason: the old tooltip, coloured lines of `name: value` at 90% opacity, was hard to read. Superseded 2026-11-18: 13 px, 0.9 opacity, the whole tooltip in the numeric font.
- Inline HTML carries data colours only: a row's mark as `--rc-swatch-color`, a link category. A role colour (the chart's muted on a comparison, a Donut remainder) never goes inline: the tooltip is a light popover on a dark card too, so such a mark takes the tooltip's own muted.
- Priority: a page rule that outranks `.rc-tooltip` (such as `.rc-chart .rc-tooltip`) beats the theme. The header colour is the data colour, then `header.text`, then the role colour.
- The `core/html.js` fragments are internal.
- Reason: inline styles always won, so the documented override through `.rc-tooltip` did not work (C-23), and the tooltip HTML was built separately in four classes with about 40 repeated inline styles (D-03).

### Colours and tokens

- **The palette is the one agreed in Rare Styles** (`CSS-240`): #1677ff, #fa8c16, #00c97a, #ffcc00, #cc44ff, #ff0000. #1677ff is the first series and the accent. #00aaff leaves everywhere, the map's region fill and the link presets included. Orange stays only as the dark theme's accent. The theme's literal values equal the palette, so a page without Rare Styles gets the same colours. Maintainer decision, 2026-11-17. Reasons recorded: `--chart-series-1` is Rare Styles `--signal` (#1677ff), the main chart colour (maintainer, 2026-11-06); next to #1677ff, #00aaff is a second blue too close to it (RC-014). The link presets' #ff6200 became the palette orange #fa8c16 as well (maintainer, 2026-11-17). `map.matchFill` is `null` in both themes: regions with data take the accent.
- **The theme reaches CSS.** `rare-charts.css` declares the chart tokens on `.rc-chart` and a standalone `.rc-overview`: `--rc-bg`, `--rc-surface`, `--rc-text`, `--rc-muted`, `--rc-border`, `--rc-grid`, `--rc-crosshair`, `--rc-accent`, `--rc-control-*`, `--rc-focus-ring`, `--rc-tooltip-*`, `--rc-map-*`, each a chain that ends in the library's literal. A theme's own values are written inline on the container and win; `destroy()` removes them and restores what the page had set inline. The chart's HTML text (header, legend, source, note, MultiChart cell titles) is coloured by CSS rules from these tokens, not inline, and the Graph tool buttons are a class (`rc-graph-tool`, X-11). Reason: the Graph tools, the hidden-node list, the details panel and full screen ignored `darkTheme`, and a light chart's header stayed black on a Rare Styles `.card-inverted` (K-14 / B-05, RC-061). Theme steps 3 and 5, 2026-11-18.
- **The dark theme comes only from `darkTheme` or `createTheme`**, never from the page's CSS variables (flow spec rule, 2026-10-07).
- **Token chain** (RC-014). Precedence, highest first:
  1. a value the chart's own theme sets (an explicit `theme` or `darkTheme`), published as `--rc-*`;
  2. the page's `--chart-*` tokens (Rare Styles `CSS-380`);
  3. older page tokens, as fallbacks only: `--white`, `--primary-color`, `--primary-text-color`, `--text-color-light`, `--border-color`, `--bg-color`;
  4. the literal values (C-13).

  A `darkTheme` chart on a Rare Styles page keeps its own colours. Reason: inside Rare Styles `.card-inverted` the active timeframe was near-invisible (#f0f0f0 on #fff).
- **How the chain is carried** (RC-014 method, theme steps 3–4, 2026-11-18). Two kinds of colour:
  - **Role colours** (bg, surface, grid, border, crosshair, text, muted, the controls, the tooltip, the map's unmatched fill, border and graticule, the focus ring) are CSS references: SVG gets `fill="var(--rc-muted, #666666)"`, HTML a rule in `rare-charts.css`. The browser re-resolves them on every card, island, page theme switch and on paper, with no JS, no observer and no print hook.
  - **Data colours** (`accent`, `colors`, the colours a page passes) are read as hex inside the container at construction, at `setData` and at every render. A role colour that leaves the chart (a payload, colour maths such as the Map hover) goes through one hex conversion at that boundary, so `tooltipFormat` and every other formatter never sees `var()`; a page's own named colour arrives as written.
  - `defaultTheme` holds the chains as its values (`accent: 'var(--chart-series-1, #1677ff)'`); `surface` and `map.graticule` are `null`, derived from the background and the text. **A theme key is the chart's own when its value is not the library default**; only own values are published inline.
  - `chart.theme` is the object the chart draws with (role references, hex accent and palette). It stays instance state, not contract.
  - Reason: `var()` strings in the theme broke the JS colour maths (the Map highlight got NaN from `d3.hsl`) and would have reached formatter payloads; references keep the chart live on its surface, hex keeps maths and payloads plain.
  - *Not in the code yet (0.9.8_7):* the Firefox and Safari check of `var()` in SVG attributes, and the switch that resolves role colours to hex as well if either fails.
- **Colours with no token** (RC-064). Graph node fills and flow lane bands derive from the background and the text. The map on a dark card uses the tokens. The "+N" panel is drawn like the tooltip. The grid and the tooltip border fall back to #e4e4e4, as in Rare Styles. Maintainer decision, 2026-11-17. One reason recorded: mapping `muted` onto the lane labels while `surface` stays #f5f5f5 gives about 1.5:1 on `.card-inverted`.
- **Tokens besides colours** (RC-014). The font tokens and `--chart-focus-ring` are read with the chart's own fallbacks, so the existing focus rings (legend items, Graph, Sankey and flow nodes, ties) turn blue on Rare Styles pages. The tooltip size stays the chart's own, 14 px since RC-082; `--chart-tooltip-font-size` is not read. Maintainer decision, 2026-11-17. The trade-off noted before it: reading the token would make a size change need a Rare Styles release, and pages on older Rare Styles would keep the old size. Superseded 2026-11-18: the size was 13 px.

### Type

- **Fonts** (K-15). Words in a tooltip are set in Fira and numbers in Cousine, through one class. The navigator's time labels are Cousine at 10 px. No new size variables before 1.0. The legend label stays 14 px. Maintainer decision, 2026-11-17. Reason for the change: tooltips were set wholly in monospace, and the navigator axis used Fira 10 px against Cousine 14 px on the main axis. The figure class is `.rc-num`; `theme.font` sets the tooltip's words and `theme.numericFont` its figures (it used to set the whole tooltip). Chart fonts read the page's `--chart-font-family` and `--chart-font-family-numeric` first. HierarchicalBar's bold rows are 700: 600 is not in the self-hosted font set. Theme step 6, 2026-11-18.
- **Line heights are the chart's own on any page**: 24 px for the title, the tooltip and the controls, 1.3 for the source, as on Rare Styles `v0.7.1`. Maintainer decision, 2026-11-17 (K-15). Superseded 2026-11-17: B-03 left the tooltip line height to the page.

### Host pages

- **Guards against host styles stay.** The 2026-10-26 sweep found exactly one temporary guard against a Rare Styles defect: the three-class header placement (RC-028). Every other guard counters element rules any host page can have (`button`, `button:hover`, `h5`, `p`, `cite`, `h4`, `dl`/`dt`, `a`, inherited line-height), so they stay. Reason: the library is embedded in foreign pages; `:where()` lowers Rare Styles' specificity on this site only. Doubled-class selectors are dropped only where a hostile-host fixture proves them unneeded (X-08). The RC-028 guard stays while Rare Styles `v0.7.1` is supported: removing it breaks a chart in a sidenote there (RC-032).
- **No `.legend` class inside a chart.** The legend swatch contract matches Rare Styles `.legend` (an 8 px square, a 16×2 line, 0.35 when off), under RareCharts' own `rc-` names. Reason: a `.legend` class would pick up Rare Styles' rules, and `CSS-241` keeps RareCharts standalone. (D-04, 2026-11-13.)
- **The header follows the card's width, not the window's** (`@container rc-chart (max-width: 460px)`). Reason: a narrow card on a wide screen squeezed the title. (K-17, 0.9.8_6.) The 460 px threshold stays: measured on the final Rare Styles `v0.7.2`, no docs card with range buttons stacks at 760–1300 px (RC-066). The buttons also move under the title when the title would be cut beside them. Maintainer decision, 2026-11-17.
- **Chart heights on a phone.** TimeSeries: narrower range buttons in a narrow card, six on one row, which wins back the 38 px its plot lost under Rare Styles `v0.7.2`. Graph: +34 px at every width; the 20–27 px it still lacks on a phone is accepted. Maintainer decision, 2026-11-17 (RC-058). Shipped in 0.9.8_7.
- **The scale toggle is one button labelled "Log"** (RC-083): transparent with an outline and a muted label while the axis is linear, filled with the accent while it is logarithmic. Maintainer decision, 2026-11-18 (variant C). Reason: a button named after the scale in force read as a state and as an action at once. Its colours are at raised specificity and the range-button hover is transparent, because Rare Styles' `button:hover` painted backgrounds (C-24). Superseded 2026-11-18: the Lin/Log button's diagonal half fill in the chart's own `--rc-scale-btn-fill: #ccc`, not the page's `--border-color`, which some hosts set to black (0.9.8_5_1).
- **The injected stylesheet carries no docs-site CSS** (X-05), and it is minified (X-10). Reasons: every consumer received the demo styles (2.6 KB); the CSS shipped unminified with its comments (the CSS alone: gzip 7,128 → 3,546 bytes). (0.9.8_6.)
- **Decided for 0.9.8_7:**
  - `.rc-chart` and the library's own boxes get `box-sizing: border-box`. Reason: Rare Styles' global reset hid the issue; content-box hosts get overflowing rows and less plot height (RC-016).
  - `.rc-chart { text-align: start }`. Reason: the page's text alignment leaked into the chart (a sidenote's `text-align: right` moved the title and source) (RC-065).
  - Chart links get `background: none` (RC-017). Maintainer decision, 2026-11-17.
  - Print hides the range and Lin/Log buttons, the Graph tools, the "+N" panel, the legend reset and the tooltip (RC-019). Maintainer decision, 2026-11-17.

## 8. Tests

- **Every fix ships with a regression test on observable behaviour (audit S-02).** Cover the fixed contract (a result, the DOM, an event, the absence of a stale response), not every line. Parametrize similar cases. Put the test in the subject file next to the fix, never in a new suite named after a release or a step. A standing rule from the 0.9.8_6 audit; step 2 alone added 70 regressions. In 0.9.8_6 each regression was checked to fail without its fix (CHANGELOG).
- **Make caught errors visible.** A queue that catches and logs exceptions keeps tests green while errors happen: the Graph queue hid a d3-zoom `TypeError` (audit S-01). Assert that no unexpected errors were caught.
- **Never delete whole suites or chase a test count.** Before merging test files, map each old scenario to its new place. RC-026 did this: 1,231 tests before and after, the map in the moved files' header comments. Remove a test only with the functionality it tests (S-04).
- **Test files are named by subject**, not by release or step (S-07…S-12, RC-026).
- **Destroy every chart before clearing the DOM, and restore mocks** (`restoreMocks`, `unstubGlobals`, `vi.stubGlobal`). Reason: emptying `innerHTML` leaves observers, transitions and handlers alive. (Audit S-05, S-06.)
- **Prefer a public or DOM oracle to a private field** (S-17). **Set jsdom sizes per test where they matter, and check real layout in a browser** (S-18): the global stubs (`offsetWidth = 800`, `getComputedTextLength = 0`) prove no layout.
- **The CSS contract test** (`test/charts-css-contract.test.js`, S-16): every class that `rare-charts.css` selects is emitted, and the hooks the docs name are emitted.
- **A known defect is pinned with `it.fails`** and flips when fixed: T-10 in `test/time-zones.test.js`, RC-069 in `test/overview.test.js`.
- **The charts release runs the whole browser suite before the push** (RC-063). Reason: Rare Styles tests read RareCharts' DOM, and `release-css` runs them only when Rare Styles releases, so a charts DOM change would surface at the next styles tag.

## 9. Docs and API checks

- **Fix the code to the documented contract; do not document the bug.** A mismatch triggers a decision, never a silent doc rewrite. Example: `Pie` had to become a pie. (Audit lesson.)
- **Re-verify old records before acting on them.** The Donut "double `padAngle`" was never true. The Graph A1 "`setData` → `focus` race" was a page that had not painted. **Determinism alone does not prove correctness.** (Audit lessons.)
- **The API ↔ docs method** (O-10; the 0.9.8_7 re-run is RC-042):
  1. Fix the version: check the sources, the built bundle and the built pages of one commit.
  2. Keep one row per public contract: where it is implemented and documented; signature and data; defaults and priorities (inheritance, theme, options, per-series overrides, explicit `false`/`0`/`null`); behaviour (data updates, empty and invalid input, events and silent mode, ready and destroy, limits, status); proof (an example, a test or a scenario, the commit, the status).
  3. Check both ways. Code → docs: every public contract has a description. Docs → code: every promise on `/charts/*`, in the README, Installation, Settings, Styles and the bundle banner holds, defaults and units included.
  4. Run the published examples and snippets on the built bundle, on the site and on a page without Rare Styles, at 1280 and 375 px.
  5. Check the built site: links, anchors, local resources, tables and code at 375 px, and URLs inside snippets and data loaders.
  6. Record the commit, the number of contracts, the open mismatches with task IDs, the examples run and the commands. A link checker or green unit tests alone do not make "docs checked".

  Tool limits. `scripts/check-links.mjs` checks relative and site-root `href`/`src` and anchors in the built HTML; it runs no code and skips `srcset`, CSS `url()`, `fetch` in JS and external URLs. `test/browser/reference-pages.test.js` checks layout, focus and anchors, not chart correctness. `scripts/api-snapshot.mjs` is for Rare Styles. The 0.9.8_6 matrix (478 contracts, checked at `2fad452`) was a snapshot and need not survive; its probes lived outside the repository. Reusable probes become tests (S-19).
- **The same-change rule.** A contract change ships in one change with the code, the source header comment, the main docs page, an example or a regression test, and a CHANGELOG entry when users see it. Reason: on 2026-07-03 most "undocumented" options were missing from the source headers, not from the site, and users and LLMs read the headers and the bundle banner.
- **The new-class rule.** Before a new class or option ships: a public option table, a row in the defaults table, the header comment, and a check of its names against the shared contract (`duration`, formatters, `linkTypes`, the link names). It replaces "an API inventory entry before release": the inventory is retired.
- **When the public surface changes** (a new class, adapter or construction pattern), update the banner header in `scripts/build-charts.mjs` (CHANGELOG checklist).

## 10. Release process

- **A big release lives on a branch named after it** (`flows-ii-v0.9.8_6`, `timeseries-analytics-v0.9.8_7`). The maintainer checks it by hand before the push. The release is a squash into `main`. Maintainer decision.
- **To release: bump `assets/charts/src/version.json` and push.** `sync-charts.yml` checks whether `raredigits/rare-charts` has that tag. If not, it runs the tests, builds the bundles, copies the bundles, `rare-charts.css`, the examples, the data, the README and the LICENSE, commits, tags and creates the GitHub Release. Reasons (roadmap R2, 2026-07-03): the sync used to push unreleased code on every push; tags were a hidden manual step, and some were malformed (`v.0.9.2`).
- **Tests run in CI** before the site deploys and before the sync (roadmap R1, 2026-07-03). Reason: the tests protected only whoever remembered to run them.
- **Bundles are not in git** (roadmap R3, 2026-07-03). Reason: the committed bundles had gone stale. `src/` is the only source of truth; deploy, sync and local dev build from it.
- **`version.json` is the single version source** for the runtime `VERSION`, the bundle banner, the docs label and the docs' CDN pin (roadmap N1, 2026-07-03).
- **Version numbering.** Tags `v0.9.8_N` are not valid semver. jsDelivr ignores them for `@latest`, which stays on `v0.9.8`. Interim releases are therefore opt-in by pin, and `@latest` users are not affected. 0.9.9 must carry a valid semver tag so that `@latest` moves.
- **Known CI gaps** (open). The tag is pushed, not atomically, before the GitHub Release is created, and there is no `workflow_dispatch`: a failure after the tag leaves a tag without a Release, and a rerun skips (RC-067). `deploy.yml` does not wait for the rare-charts tag, so after a failed sync the docs advertise a version that does not exist (RC-068).
- **Release acceptance beyond green unit tests** (0.9.8_6 audit). The CHANGELOG checklist covers versioning only; these steps come on top:
  1. Each fixed ID has a commit and a checked result. Docs and tests describe the agreed contract, not the old workaround.
  2. The full suite passes. Graph has no unexplained caught errors.
  3. The built bundle is smoke-tested on a standalone page without Rare Styles: Line with a navigator, Pie and Donut, two TimeSeries, a flow view with folds, MapFlow, Sankey; with a repeated `setData`, empty input and `destroy`.
  4. In a real browser: light and dark themes, a narrow card, the keyboard, brush and zoom, short arcs, panels.
  5. Min and gzip sizes are measured by one method: the esbuild settings of `scripts/build-charts.mjs`, Node zlib at its default level, banner excluded. Sequential savings are not additive. The CHANGELOG gets the size line.
  6. Public exports and published data URLs are never removed under the guise of internal cleanup. Legacy benchmarks are never presented as current.
- **A release commit holds only the charts and their docs and site.** No Rare Styles fixes, no internal Russian files. Rare Styles fixes go to the Rare Styles backlog. Maintainer decision, 2026-10-26.
- **Rare Styles `v0.7.2` ships first.** It closes the Rare Styles debts toward RareCharts and ships the chart dependencies; then RareCharts removes its temporary rules. Maintainer decision, 2026-10-26.
- **Push together.** Rare Styles `v0.7.2` is pushed with RareCharts 0.9.8_7 once the charts are ready: the styles PR merges first, with a merge commit, then the charts squash. The content starter's pins (Rare Styles `v0.7.2`, RareCharts 0.9.8_7) are bumped together right after, in a site commit of their own. Maintainer decision, 2026-11-17.
- **Repository cleanup before the push**, in a commit of its own outside the charts squash. The list is agreed with the maintainer first. Maintainer decision, 2026-11-17.
- **Internal documents** live in `_internal_docs/charts/` and `_internal_docs/styles/`, which the site build ignores. When a document's work is done, it is deleted; its open tasks move into the backlog first. Maintainer decision, 2026-10-26.
- **Debt rides with the release that touches its files** (rule of 2026-10-26, as amended). Non-bug debt (duplication, dead code, test quality, naming) is done in the release that changes those files, with the tests of that area. Big separate cleanup passes like 0.9.8_6 are not repeated. The same day the rule was amended for the debt then open: 0.9.8_7 takes all of it, so nothing is forgotten or lost. The rule applies to debt found after 0.9.8_7.
- **Field findings** from real use go to the "Field findings" section of the backlog: one row per finding, facts only; triage happens when the next milestone is planned. Maintainer decision, 2026-10-26.
- **Out-of-turn releases for consumers.** Slots move down; contents do not change.
  - 0.9.8_3 / 0.9.8_6 (2026-10-07): Flows was split. Sankey and the flow view were needed together (0.9.8_3); auto layout, aggregation and folding could wait (0.9.8_6, with MapFlow).
  - 0.9.8_4 (2026-10-19): a consumer needed a log scale on Line.
  - 0.9.8_4_1 (2026-10-19): the Rare Styles starter needed a Bar label fix while Flows II was weeks away.
  - 0.9.8_5 (2026-10-20): a consumer's chart is a DualAxes and needed a log scale.
  - 0.9.8_7 (2026-10-22): a donor's traffic report on TimeSeries. Not taken into 0.9.8_6: that release was already extended, and its cleanup was reworking tooltips, line drawing and theme tokens; the new API is built on the cleaned base.

## 11. Experimental classes (B3) and scope

- **Graph (every view, flow included), Sankey and MapFlow are experimental.** They are outside the 1.0 semver guarantee and may change without a major version bump (B3). Graph since the roadmap pass of 2026-06-20 (`be5361b`); Sankey and MapFlow by the decision of 2026-10-07. Superseded: the 2026-07-03 architecture note planned the Graph rework for 1.x; it shipped in 0.9.8_1 (2026-07-12).
- **They do not block the freeze.** They are promoted to stable only after real use; the decision falls in 0.9.9 or 1.x. Maintainer decision, 2026-10-07. Consequence: renames of the shared relation vocabulary do not block 1.0, although they would hit three classes at once; RC-010 makes none before 1.0.
- **0.9.9 checks that Graph, Sankey and MapFlow are nowhere presented as stable.** Today the README and the pages `/charts/graph/`, `/charts/graph/flow/`, `/charts/sankey/` and `/charts/map/flow/` carry the experimental notice.
- **Outside 1.0, for 1.x, all additive:** candlestick; spatial hierarchies (treemap, pack, sunburst; the linear HierarchicalBar shipped in 0.9.8_2 on the same tree contract); map overlays and labels; a branding API; callouts. Superseded 2026-10-26: clickable map regions moved into 0.9.8_7 (B-06); navigation through `href` stays after 1.0. Open conflict: the public backlog says the data project wants callouts before 1.0; the maintainer has to reconcile.
- **Separate `rare-charts-graph` and `rare-charts-maps` bundles are a 1.x candidate** (K-13). Measured in 0.9.8_6: the experimental Graph stack was about 27% of the gzip size.

## 12. Consumers

Needed when renaming: warn the consumer and bump its pin.

- **Graph flow view and Sankey** came from the data project, a sibling repository for blockchain-address investigations. Its mock-up of 2026-10-07 was a hand-written SVG money trail. It pinned `@v0.9.8_3`. Its Sankey use is mostly 2–3 columns and needs phones. Flows II acceptance ran on synthetic data; the data project's walk-through on its CDN pin is RC-050.
- **Graph ego and MapFlow** came from schnellreich.ru `/vault/stories/`: a graph of the stories' characters and a "Map" of flows (the opium triangle, the eurodollar, the gold dhows, the price cap). Design context: `schnellreich_ru/_editorial/charts/universe-visualization-plan.md`; its build-time dataset `universe.json` has typed links with `types` and `sources`.
- **Graph's use cases:** entity graphs (a person's personal, work and investment ties), commercial ties between agents, blockchain addresses.
- **TimeSeries Analytics** comes from a donor's site-traffic report: visits by hour, day and month, aggregated on the server.
- **Known pins** (2026-11-13): schnellreich.ru on `v0.9.8_2` and raredigits.io on `v0.9.7`, both on Rare Styles `v0.7.1`; Churchbook has no pin (`v0.9.4_4`). The Rare Styles content starter demo pins `v0.9.8_5`; the maintainer parked it on 2026-10-23 (O-12), and the 2026-11-17 decision bumps the starter's pins right after 0.9.8_7 (§10).

## 13. Graph architecture

### Why fixed layouts, not a force simulation

- On real data a force-directed layout gives an unreadable tangle. That comes from the method itself, so tuning the forces does not fix it. The old `Graph.js` was plain d3-force. (Architecture note, 2026-07-03.)
- So Graph never draws the whole graph. It draws the result of a query, with fixed layouts that encode what is already known: degrees of separation, the link type, the path found.
- Zoom is semantic. Zooming out of the ego view switches to the cluster view (`semanticZoom`, on by default) instead of drawing outer rings node by node, which would mean millions of nodes and the tangle again.
- Code: `charts/Graph.js` ("deterministic views instead of a force simulation"), `graph/layouts/ego.js`, `graph/layouts/path.js`, `graph/layouts/cluster.js`. Each layout is a pure, deterministic function.
- **Ego** is a regular grid. The focus sits in the centre cell; each category is anchored to a corner or an edge midpoint and fills toward the centre, so distance from the centre reads as degrees of separation (`ego.js`).
- **The polar (arc) ego layout was tried and dropped:** the arcs turn to mush on a dense first ring. `ego.js` says only "no arcs, no simulation"; RC-044 adds the reason to its header.
- **One dominant category (more than 80% of the nodes)** is anchored at the focus and fills the same grid from the centre out: a rosette (A4, 0.9.8_3). Concentric rings came first and were replaced after the maintainer's hand run of 2026-10-16: rings overlapped when going deeper. Superseded 2026-10-16: the A4 spec asked for rings.
- **A grid everywhere except the path view** (maintainer's hand run, 2026-10-16). Cluster stands on a grid too (`cluster.js`): a circle of unequal meta-nodes overlapped as soon as a few were large. Superseded: the 2026-07-03 note allowed a force-like layout for cluster.
- **Path:** columns are hops, one row per route, so chaos is impossible by construction (`path.js`). `paths(a, b, k)` must be answered by the server: the client holds only the neighbourhoods already walked.
- **Ties on a grid bow gently** (`graph/views/network.js`): cell centres are collinear, and straight lines would pass through nodes.

### Why no graph framework

- Cytoscape.js, Sigma.js and vis-network take over rendering and styling. That clashes with the Rare theme and adds weight to a CDN library. Their strength, large arbitrary graphs, is not this case.
- RareCharts borrows only headless algorithms (graphology) and, if needed, layout functions. An adapter for third-party layouts (forceatlas2, elkjs) is a 1.x idea; rendering would not change.
- For the flow view, the alternative was the data project's fallback, Cytoscape.js with ELK. The reasons against it: SVG nodes that keyboard and screen-reader users can reach (Cytoscape draws on a canvas); one bundle with the other charts instead of about 2 MB on top; the Rare theme and dark mode without extra styling.
- Rendering is SVG through the RareCharts pipeline (`core/Chart.js`), with d3 for scales, paths and transitions.

### The model and the code

- **`graph/model.js` wraps graphology.** Storage is a directed multigraph; degree, Louvain and shortest paths run on an undirected simple projection (reasons in §2). Louvain runs with a fixed-seed PRNG, so communities and the cluster view stay stable between renders.
- **The model accumulates; it is not a response cache.** It keeps what the user walked (layout, node identity across views), but every `focus`, `connect`, `overview` and `back` queries the source again (O-09, 0.9.8_6). Superseded: the 2026-07-03 note said repeat visits would not hit the database. A cache needs its own design: a key by depth and types, and invalidation on `setData`.
- **Centrality metrics were removed** (X-01, 0.9.8_6). `GraphModel.centrality()` had no consumer in the library and pulled graphology-metrics into the bundle (about 4 KB gzip). Node size is `sizeBy: 'degree'`.
- **The data source contract** (`graph/source.js`): `neighbors(id, { depth, types })`, `paths(a, b, { k })`, `aggregates()`. `memorySource(data)` adapts a static payload. The `dataSource` option is not called `source` because `source` is the attribution in the footer.
- **The code split** (D-11, 0.9.8_6): `charts/Graph.js` keeps the options, the source queue, view switching and the public API; `graph/views/network.js` draws ego, path and cluster; `graph/chrome.js` the card chrome; `graph/tooltips.js` the default tooltip and details HTML. Reason: `Graph.js` had 1,912 lines and a 477-line `_draw`.

### Flow view

Code: `graph/views/flow.js` (the pure `layoutFlow()` and `FlowView`), `graph/layouts/flowAuto.js`, `graph/views/flowFold.js`. It is a module of its own, not a branch in `Graph._draw`.

- **The flow view draws the given trace whole.** The trace is the query result, so the "draw a query result" principle holds (`Graph.js`, `setData`). There is no neighbour loading on click; that is the ego view.
- **Lanes** are ordered networks, stages or jurisdictions; their widths follow `weight`.
- **Stage 1 (0.9.8_3) lays out from data hints:** `lane`, `row`, `col`, exact `x`/`y`. Rows span the range the data uses, not a symmetric band around the main line.
- **Stage 2 (0.9.8_6) lays out data without coordinates** (`flowAuto.js`). Each choice and its reason (deviations from the spec, 2026-10-20):
  - The main route is the longest left-to-right path by steps; `value` breaks ties only; `main: true` on a node or a tie wins. Reason: summing values gave the centre to one big transfer (the crowdsale collection) on the demo, and the trace itself moved aside.
  - Cycles: when ties have `start` times, they are inserted in time order, and the tie that closes a loop turns (a refund, a payout years later). Without time: the Eades heuristic (fewest turned, the lighter on a tie). Reason: a pure minimum flipped the wrong ties on the demo.
  - Satellites: a node whose only partner is in the same lane and which is a branch (a DEX swapped with and back, a fee, an income source) takes its partner's column, above or below. Reason: otherwise every DEX swap and every fee added a column and squeezed the lanes. The two ends of a plain chain are not satellites. (RC-044 adds the reason to the `flowAuto.js` header.)
  - Rows: input order, then eight alternating barycentre sweeps; row 0 is kept for the main route.
  - Any position hint pins a node, so fully hinted data (the stage 1 demo, the data project) renders as before.
  - Acceptance on the demo trace without coordinates: the main route on row 0, no overlaps, 2 crossings against 5 in the hand layout; determinism is tested.
- **The layout is computed on the folded whole**, without the filter, the legend or the time window. Folding changes the picture; filtering and time do not move nodes.
- **A hull is a soft band, not a convex hull**: a smoothed line through the members, `2R + 28` wide at opacity 0.12, with the label below, as in the mock-up. Reason: a group that snakes across several lanes reads better as a band. (`flow.js`, hulls section; RC-044 adds the reason there.)
- **Folds** (`flowFold.js`). A meta-node `fold:<id>` takes the anchor's place; it inherits only the lane and the position hints, not the anchor's fields. A node belongs to the first fold that claims it; there are no nested folds. Ties into a fold are summed per pair and category; ties inside it disappear. The name is explained in §2.
- **The aggregation key is a tuple** `[source, target, category]`. Reason: a joined string merged different pairs when ids contained the separator (R-20). An aggregated tie's id is `agg:["s","t","key"]`.
- **Tie labels** show only on active ties: mid-arc first, then shifted outward; with no room, the label stays in the tooltip.
- **Selection.** With `onSelect` set, a click on a tie selects it and calls `onSelect` (the page shows the details); without it, a click pins the tooltip. The legend shows a category's own style (`linkTypes[...].dash`), not the first tie's.
- **Narrow screens:** `minWidth` scrolls only the drawing sideways; the title, buttons, legend, navigator and panel stay put (D5). Rotating the view by 90° on phones is a 1.x idea.
- **Not in the flow view:** a free force layout, editing the graph, automatic clustering of addresses (clusters and folds come from the data), loading neighbours on click.

### MapFlow

Code: `charts/MapFlow.js`, a subclass of `charts/Map.js`.

- **A subclass, not composition.** Geometry, projections, zoom and theme work as on Map. Map gained two internal changes: it keeps its projection and `geoPath` after `render()`, and its fit object comes from `_fitObject()`, which MapFlow replaces for `fitTo: 'links'`. Map's public API did not change. Reason: reuse Map's internals (topology loading, projections, fitting, tooltip, theme) without touching the stable class's API.
- **The arrow sits at the target and is drawn as its own triangle, not an SVG `marker`.** Reason: a marker grows with the stroke width and covered the node on thick arcs. Arrowheads are obstacles for labels. The spec allowed a tapered tail instead; the arrow matches the flow view. (RC-044 records this in the `MapFlow.js` header.)
- **Widths:** `linkWidth` defaults to 1–6 px (it was 1.2–12), and the arrowhead is `6 + 1.2·w` long and `2.6 + 0.8·w` wide, so it grows more slowly than the arc. Maintainer's review, 2026-10-21.
- **Bend:** great-circle points are projected one by one and pushed by a sine along the chord's normal, `bend × min(90, 0.6 × chord)` px, plus 0.16 per place in a fan. The normal depends on the direction, so A→B and B→A part without extra logic.
- **`country` places a node at the centroid of the feature's largest polygon.** Reason: otherwise France, with Guiana, lands in the Atlantic. Rings wound by RFC 7946 are read unwound.
- **Dashed types use `stroke-linecap: butt`.** Reason: round caps fill the gaps on a dash about 10 px thick.
- **Labels:** places with more flow (the sum of `value`) are labelled first. Labels avoid arrowheads, dots and other labels; a hub ringed by arrowheads gets a second pass that avoids only labels and dots (D6).
- **No `onSelect` in v1.** A click, or Enter on a focused arc, pins the tooltip.
- **Time scale:** `timeframes` and `navigator` with a year axis, as in the flow view, instead of the demo's radio buttons. Maintainer's review, 2026-10-21.
- **`timeWindowMode: 'hide'` by default** (§2).
- **Seams and zoom:** arcs are cut at the antimeridian, and on `'orthographic'` only the near side of the globe shows (R-13). Under zoom, dots, labels and arrowheads keep their screen size, and arcs their width (R-14). C-40 (arc ends on a seam with `fitTo: 'links'`) is open.
- **Not in v1:** particles along arcs, clustering places on zoom, choropleth values under the flows, hand-bent curves.

### Sankey

Code: `charts/Sankey.js`; the layout is `core/sankey.js`, a pure function.

- **Its own layout, not the d3-sankey package.** d3-sankey 0.12.3 has not been updated since 2020 and depends on `d3-array@1-2` and `d3-shape@1`, which would be bundled twice next to d3 v7. The package was not in the project, so the algorithm was written anew: the same idea (columns by longest path, relaxation toward the weighted centre of the neighbours, collision resolution, stacked bands). No licence notice is needed. (RC-044 records this in the `core/sankey.js` header.)
- **The vertical orientation is the same layout with the axes swapped**; there is no second algorithm.
- **Deterministic.** `nodeSort: null` keeps the input order inside a column, so nodes never reshuffle; `'auto'` sorts by relaxed position, as d3 does.
- **Labels sit to the right of each node; the last column gets a measured right gutter of at most 30% of the width.** Long labels are cut with an ellipsis; the full name is in the tooltip and the `aria-label`. Reason: the spec's "first column outside left, middle columns on the freer side" put labels face to face in one gap.
- **`orientation: 'auto'`** (vertical at 480 px or less) was kept after tests at 375 px: 2 columns read well, 3 read, 5 work but the middle labels lie on bands. The docs recommend up to 4–5 columns and aggregating small flows; there is no hard limit in the code. The fallbacks of the spec (sideways scrolling, edge-only labels) were not needed.
- **The same pair with different types gives separate bands; the same type is summed with a warning.**
- **A cycle throws** and lists its links; a sankey is acyclic. A `value` of 0 or less, NaN or a dangling id gives a warning and drops the link.
- **A node whose input differs from its output is drawn at the larger.** An explicit remainder is not in v1; when it comes, it should reuse the hierarchy names (`showRemainder`, `remainderLabel`).
- **The type legend hides and shows bands without a new layout** (RC-052): nodes, their labels and values stay, a hidden band leaves its gap, and a band's "% of source" stays a share of the whole node. Superseded 2026-11-18: the type legend was static, built from `linkTypes` with `linkColor: 'type'`.
- **Not in v1:** cycles, dragging nodes, multi-level drill-down, particles, an explicit remainder.

## 14. Audit ID index

**What it covers.** Every audit and task ID cited outside `_internal_docs/`, found by grep in:
- `assets/charts/src/`, `assets/charts/rare-charts.css`, `assets/charts/CHANGELOG.md`, `assets/charts/README.md`, `charts/`, `test/`;
- and the other files that cite a RareCharts ID: `scripts/build-charts.mjs`, `.github/workflows/sync-charts.yml`, `assets/css/rare-website.css`, `assets/css/docs/STYLEGUIDE.md`, `assets/css/modules/charts/_index.scss`, `assets/css/modules/elements/_buttons.scss`, `assets/css/modules/elements/_forms.scss`, `assets/css/modules/utilities/_contracts.scss`.

Pattern: `[RTCKDXSOBQ]-NN`, `RC-NNN`, `A1`…`A5`, `N1`…`N3`, `O1`…`O9`, `D1`…`D14`, `E-NN`, `FN-…`, `GA-…`, `CSS-NNN`; matches that are not IDs (the D3 library, data labels such as `A1`, node ids such as `B1`, A4 paper) were removed by hand. Checked at `e198919` (2026-11-17). `charts/` and `assets/charts/README.md` cite no ID. `S-02`, `FN-…` and `GA-…` are not cited anywhere outside `_internal_docs/`; they are in §8 and §13. Brought up to date on 2026-11-19; `test/decisions-index.test.js` keeps it complete (RC-045): a cited ID of the pattern above (the families with a hyphen) that this file does not name fails it.

**Where the 0.9.8_6 work landed.** The release is the squash `fb1247e` on `main` (2026-10-26). The step commits below are on the local branch `flows-ii-v0.9.8_6` only.

| Commit | Step of the 0.9.8_6 cleanup | Date |
|---|---|---|
| `37a1b93` | 1. Test harness: library errors visible, charts cleaned up | 2026-10-21 |
| `04c5d5c` | 2. Data and lifecycle bugs | 2026-10-21 |
| `d75b816` | 3. Flows II finished | 2026-10-22 |
| `38edd4e` | 4. Cheap debt | 2026-10-22 |
| `3ac7af0` | 5. Owner requirements | 2026-10-22 |
| `a827820` | 6. Docs and release check | 2026-10-22 |
| `fe4f800` | 7. Public surface, Graph split, one relation normalizer, tests by subject | 2026-10-23 |
| `441162a` | 7a. All open bugs | 2026-10-23 |

Work for 0.9.8_7 is on the branch `timeseries-analytics-v0.9.8_7` until its release squash. "Open" means a task in `_internal_docs/charts/BACKLOG.md`.

**Index.** "Files" counts the files that cite the ID.

| ID | One line | Where it landed | Files |
|---|---|---|---|
| `B-01` | Colour per bar: `data: [{ label, value, color }]`, updated on `setData` | `3ac7af0`, 0.9.8_6 | 2 |
| `B-02` | MultiChart warns on an unknown `type` (diagnostics only; every class is K-11) | `3ac7af0`, 0.9.8_6 | 2 |
| `B-03` | `theme.tooltip` review: colours from the theme as `--rc-tooltip-*`, sizes in CSS | `3ac7af0`, 0.9.8_6 | 11 |
| `B-04` | Annotations on the date Bar | `3ac7af0`, 0.9.8_6 | 3 |
| `B-07` | `barWidth` in px for Bar and DualAxes bar series, with per-series override | `3ac7af0`, 0.9.8_6 | 6 |
| `C-01` | Built-in tooltips escape data (`core/html.js`) | `04c5d5c`, 0.9.8_6 | 1 |
| `C-02` | `setData([])` or an empty window clears the old drawing | `04c5d5c`, 0.9.8_6 | 2 |
| `C-03` | One line-series normalizer; DualAxes keeps `strokeDash` and markers | `38edd4e`, 0.9.8_6 | 5 |
| `C-04` | Every `<defs>` id comes from a per-chart uid | `38edd4e`, 0.9.8_6 | 7 |
| `C-05` | `Pie` draws a pie (`innerRadius: 0`) | `38edd4e`, 0.9.8_6 | 3 |
| `C-06` | TimeSeries copies, parses and sorts its input; `appendPoint` leaves the caller's array alone | `04c5d5c`, 0.9.8_6 | 2 |
| `C-07` | Time-series input is sorted | `04c5d5c`, 0.9.8_6 | 4 |
| `C-08` | TimeSeries tooltip placed in container coordinates | `04c5d5c`, 0.9.8_6 | 1 |
| `C-09` | `destroy()` stops late renders, returns `controls`, leaves full screen; Map releases a pinned tooltip | `04c5d5c`, 0.9.8_6 | 1 |
| `C-10` | Categorical Bar normalizes its data | `04c5d5c`, 0.9.8_6 | 1 |
| `C-11` | Adapters keep rows whose date is a string or a number | `04c5d5c`, 0.9.8_6 | 1 |
| `C-12` | `darkTheme` end-label plates use `theme.bg`; brush fills come from the theme | `38edd4e`, 0.9.8_6 | 3 |
| `C-13` | Standalone styling: own `--rc-*` values and fallbacks for host variables | `38edd4e`, 0.9.8_6 | 11 |
| `C-14` | Chart font set once on `.rc-chart`; buttons take `font: inherit` | `38edd4e`, 0.9.8_6 | 4 |
| `C-15` | MultiChart mobile mode by container width | `441162a`, 0.9.8_6 | 2 |
| `C-16` | One entry-motion timeline per chart (`core/entryMotion.js`) | `441162a`, 0.9.8_6 | 11 |
| `C-17` | Partial `margin`: unset sides are 0 | `441162a`, 0.9.8_6 | 2 |
| `C-18` | Donut keeps slice colours and labels on update | `441162a`, 0.9.8_6 | 2 |
| `C-19` | A node with only undisclosed children is missing, not 0 (no NaN%) | `441162a`, 0.9.8_6 | 2 |
| `C-21` | DualAxes `y1Ticks`/`y2Ticks` drive the domain; Gauge `min`/`max` from `setData` apply once | `441162a`, 0.9.8_6 | 4 |
| `C-22` | Theme tokens wired to their readers (tooltip part in `3ac7af0`) | `441162a`, 0.9.8_6 | 3 |
| `C-23` | Tooltip size in CSS; `theme.tooltip.muted` is read | `3ac7af0`, 0.9.8_6 | 5 |
| `C-24` | Lin/Log fill and range-button hover defended against a host `button:hover` | `441162a`, 0.9.8_6 | 4 |
| `C-25` | Horizontal Bar value labels no longer jump during the entry | `441162a`, 0.9.8_6 | 2 |
| `C-26` | `parseDate` rejects Invalid Date, NaN and Infinity; epoch 0 is kept | `04c5d5c`, 0.9.8_6 | 2 |
| `C-27` | DualAxes edge bars are no longer clipped to half their width | `3ac7af0`, 0.9.8_6 | 9 |
| `C-28` | HierarchicalBar label layout: name, bar, value column | `441162a`, 0.9.8_6 | 2 |
| `C-29` | Long names wrap inside relation tooltips (`.rc-tooltip-body`) | `3ac7af0`, 0.9.8_6 | 6 |
| `C-30` | Default number formats by magnitude; `.3~r` for value labels | `441162a`, 0.9.8_6 | 4 |
| `C-31` | TimeSeries date ticks follow the span | `441162a`, 0.9.8_6 | 4 |
| `C-32` | A plot keeps at least 80 px; the card grows | `441162a`, 0.9.8_6 | 4 |
| `C-33` | Callbacks do not fire after `destroy()` | `441162a`, 0.9.8_6 | 5 |
| `C-34` | ALL, not YTD, is highlighted when both cover the data | `441162a`, 0.9.8_6 | 2 |
| `C-35` | MapFlow `fitTo: 'links'` includes the arcs' bows | `441162a`, 0.9.8_6 | 2 |
| `C-36` | Graph path view keeps an edge node's label inside the drawing | `441162a`, 0.9.8_6 | 3 |
| `C-37` | Graph details panel: no double markers without Rare Styles | `441162a`, 0.9.8_6 | 2 |
| `C-38` | Flow layout density in a 900 px card | `441162a`, 0.9.8_6 | 2 |
| `C-39` | Horizontal Bar measures its label column | `441162a`, 0.9.8_6 | 2 |
| `D-02` | Tooltip lifecycle | Done, 0.9.8_7 | 2 |
| `D-03` | Tooltip HTML fragments in `core/html.js`; one `linkTooltipHtml` | `3ac7af0`, 0.9.8_6 | 3 |
| `D-05` | `layoutFlow`: the flow view's pure layout | Done, 0.9.8_7 | 2 |
| `D-06` | Shared link helpers | Done, 0.9.8_7 | 3 |
| `D-07` | Curved links | Done, 0.9.8_7 | 2 |
| `D-08` | Label placement: one helper | Done, 0.9.8_7 | 5 |
| `D-10` | Y axes: one helper | Done, 0.9.8_7 | 2 |
| `D-11` | `Graph.js` split into `views/network.js`, `chrome.js`, `tooltips.js` | `fe4f800`, 0.9.8_6 | 6 |
| `K-01` | No webfont `@import`; the page supplies fonts | `38edd4e`, 0.9.8_6 | 4 |
| `K-02` | `Sankey.setData` validates before storing: a cycle no longer breaks later renders | `d75b816`, 0.9.8_6 | 1 |
| `K-03` | MapFlow `fitTo: 'links'` with all points in one place no longer gives NaN | `d75b816`, 0.9.8_6 | 1 |
| `K-04` | Public surface: `generateMockPrices` outside stability, `viewSteps` deprecated, `Overview` public | `fe4f800`, 0.9.8_6 | 6 |
| `K-06` | State classes: `aria-pressed`, old classes kept as aliases | Open, 0.9.8_7 (decided 2026-11-17) | 1 |
| `K-07` | One relation normalizer, per-class endpoint policies, frozen id formats | `fe4f800`, 0.9.8_6 | 6 |
| `K-09` | Formatter arguments: one role-field rule, backward compatible | `fe4f800`, 0.9.8_6 | 12 |
| `K-10` | Defaults across classes (explicit `margin.top` part shipped) | Part in 0.9.8_6; rest open, 0.9.8_7 (decided 2026-11-17) | 2 |
| `K-12` | `whenReady()` on every chart; Map resolves on its geometry | `441162a`, 0.9.8_6 | 4 |
| `K-13` | `RareCharts.d3` narrowed to a 28-function subset | `fe4f800`, 0.9.8_6 | 3 |
| `K-15` | Fonts and line heights in charts | Done, 0.9.8_7 (theme step 6, 2026-11-18) | 1 |
| `K-16` | Flow performance: one brush render per frame shipped; one render's cost open | Part `441162a`, 0.9.8_6; rest open, 0.9.8_7 | 2 |
| `K-17` | The header follows the card's width (container query) | `441162a`, 0.9.8_6 | 4 |
| `K-18` | Strict CSP: `injectStyles: false`; `rare-charts.css` shipped beside the bundle | `441162a`, 0.9.8_6 | 6 |
| `K-19` | `legendPosition: 'right'` with a navigator: `controls` between navigator and footer | `441162a`, 0.9.8_6 | 4 |
| `K-20` | Keyboard access to Graph nodes and flow ties (roving tabindex) | `441162a`, 0.9.8_6 | 6 |
| `K-21` | Donut `drillTo(node)` is public | `fe4f800`, 0.9.8_6 | 3 |
| `K-22` | Donut legend coloured by slice label, not position | `441162a`, 0.9.8_6 | 2 |
| `O-09` | Graph docs no longer promise a response cache | `a827820`, 0.9.8_6 | 1 |
| `O-10` | API ↔ docs matrix checked both ways (method in §9) | `a827820`; closed `fe4f800`, 0.9.8_6; re-run RC-042, 0.9.8_7 | 3 |
| `R-01` | One link-type resolver (`resolveLinkType`) for every relation class | `d75b816`, 0.9.8_6 | 4 |
| `R-02` | Arrow marker ids stay unique for non-ASCII categories | `d75b816`, 0.9.8_6 | 2 |
| `R-03` | Details panel for a selected fold meta-node | `d75b816`, 0.9.8_6 | 1 |
| `R-04` | A dropped selection is reported to `onSelect` and the panel | `d75b816`, 0.9.8_6 | 1 |
| `R-05` | `select()` of a folded, filtered or unknown node no longer blanks the drawing | `d75b816`, 0.9.8_6 | 1 |
| `R-06` | `dim` mode: aggregates count only ties in the window | `d75b816`, 0.9.8_6 | 1 |
| `R-07` | An open fold with a hidden anchor keeps its − switch | `d75b816`, 0.9.8_6 | 1 |
| `R-08` | Auto layout respects a pinned node's `col` | `d75b816`, 0.9.8_6 | 1 |
| `R-09` | `layout: 'auto'` keeps the lane widths of fully hinted data | `d75b816`, 0.9.8_6 | 1 |
| `R-10` | MapFlow region tooltip has its own option, `regionTooltipFormat` | `d75b816`, 0.9.8_6 | 1 |
| `R-11` | Short MapFlow arcs are no longer drawn backwards | `d75b816`, 0.9.8_6 | 1 |
| `R-12` | Enter on a MapFlow arc pins the tooltip in the right place | `d75b816`, 0.9.8_6 | 1 |
| `R-13` | MapFlow arcs cut at the antimeridian; the far side of `orthographic` hidden | `441162a`, 0.9.8_6 | 2 |
| `R-14` | MapFlow under zoom: dots, labels and arrowheads keep their screen size | `441162a`, 0.9.8_6 | 2 |
| `R-15` | MapFlow's default tooltip lists `sources` | `d75b816`, 0.9.8_6 | 1 |
| `R-16` | A legend toggled from the keyboard keeps focus | `a827820`, 0.9.8_6 | 4 |
| `R-17` | `Graph.setData` resets history and types; autofocus reads endpoint aliases | `441162a`, 0.9.8_6 | 3 |
| `R-18` | `connect(a, a)` draws one node | `441162a`, 0.9.8_6 | 4 |
| `R-19` | Numeric node ids are normalized in the Graph model | `d75b816`, 0.9.8_6 | 2 |
| `R-20` | The flow aggregation key is a collision-free tuple | `d75b816`, 0.9.8_6 | 4 |
| `R-21` | A late response from an old Graph source no longer pollutes new data | `04c5d5c`, 0.9.8_6 | 1 |
| `S-03` | Exports and the built bundle are tested separately | `38edd4e`, 0.9.8_6 | 2 |
| `S-04` | Tests are removed only with the functionality they test | `38edd4e`, 0.9.8_6 | 2 |
| `S-07` | `core/utils` tests in one file | `fe4f800`, 0.9.8_6 | 1 |
| `S-13` | Weak assertions | Done, 0.9.8_7 | 3 |
| `S-14` | Boundary tests for Overview and time (T-10 pinned as `it.fails`) | `1cba080`, 2026-11-17, ships with 0.9.8_7 | 4 |
| `S-15` | Interaction gaps | Done, 0.9.8_7 | 3 |
| `S-16` | CSS contract test: selectors against emitted classes | `2717593`, 2026-11-17, ships with 0.9.8_7 | 1 |
| `T-01` | Relation time bounds: a number below 10000 is a year; periods end at their end | `d75b816`, 0.9.8_6 | 2 |
| `T-02` | A custom `defaultTimeframe` (`{ key, range }`) is honoured | `04c5d5c`, 0.9.8_6 | 1 |
| `T-03` | `setData` recomputes the view for a new data range | `04c5d5c`, 0.9.8_6 | 4 |
| `T-04` | The navigator brush fires `onViewChange` | `d75b816`, 0.9.8_6 | 1 |
| `T-05` | A click on the navigator without a drag restores the brush | `d75b816`, 0.9.8_6 | 1 |
| `T-06` | `navigator: { area: false }` is honoured | `d75b816`, 0.9.8_6 | 1 |
| `T-07` | The navigator lines up with the plot; its `margin` merges per side | `d75b816`, 0.9.8_6 | 1 |
| `T-08` | The navigator spans every series | `d75b816`, 0.9.8_6 | 1 |
| `T-09` | TimeSeries wheel and drag start from the current view; Ctrl/⌘ to zoom decided | `d75b816`, 0.9.8_6; modifier open, 0.9.8_7 | 1 |
| `T-10` | One UTC/local time-zone policy | Open, 0.9.8_7 | 4 |
| `X-01` | `GraphModel.centrality()` and `link()` removed; graphology-metrics out of the bundle | `38edd4e`, 0.9.8_6 | 1 |
| `X-03` | Four unused map files removed; docs data paths fixed | `38edd4e`, 0.9.8_6 | 1 |
| `X-05` | Docs-site CSS out of the injected stylesheet | `38edd4e`, 0.9.8_6 | 3 |
| `X-06` | Write-only fields, unused parameters, a double import | Done, 0.9.8_7 | 1 |
| `X-07` | Duplicate and dead rules in `rare-charts.css` | Open, 0.9.8_7 | 1 |
| `X-10` | CSS minified inside the bundle | `38edd4e`, 0.9.8_6 | 2 |
| `RC-002` | Resolution follows the window | Done, 0.9.8_7 | 14 |
| `RC-003` | Custom date range in the range bar, independent of Rare Styles forms | Open, 0.9.8_7 | 1 |
| `RC-004` | Comparison series | Done, 0.9.8_7 | 10 |
| `RC-006` | Link times under the T-10 policy | Open, 0.9.8_7 | 2 |
| `RC-013` | Standalone Overview merges the theme shallowly | Done, 0.9.8_7 | 2 |
| `RC-014` | Token chain to the Rare Styles chart tokens | Done, 0.9.8_7 (theme steps 3–4, 2026-11-18) | 2 |
| `RC-015` | One chart focus rule | Done, 0.9.8_7 | 3 |
| `RC-018` | The "+N" close takes no host button hover fill | Done, 0.9.8_7 | 2 |
| `RC-020` | `.rc-sr-only` hides with `clip-path`, not the deprecated `clip` | Done, 0.9.8_7 | 1 |
| `RC-023` | MultiChart grid and standalone Overview: their accessible names | Done, 0.9.8_7 | 4 |
| `RC-024` | Sankey: a hit area of at least 8 px for thin bands | Done, 0.9.8_7 | 2 |
| `RC-025` | Donut/Gauge angle math into pure functions (not needed: the needle shows the clamp) | Not needed, 0.9.8_7 | 1 |
| `RC-026` | Test files folded by subject; 1,231 tests before and after | `c299517`, 2026-11-17, ships with 0.9.8_7 | 9 |
| `RC-027` | Sankey: a pinned band tooltip is released by a click elsewhere or Escape | Done, 0.9.8_7 | 1 |
| `RC-034` | Public surface and stability statement | Open, 0.9.8_7 | 1 |
| `RC-035` | Docs: residual gaps (the points payload, exported utilities, aliases) | Done, 0.9.8_7 | 1 |
| `RC-037` | Docs: a chart in a hidden container draws on first paint or resize | Done, 0.9.8_7 | 1 |
| `RC-038` | Docs: the news-feed Graph recipe (start empty, `add()` per event) | Done, 0.9.8_7 | 1 |
| `RC-039` | Docs: "Not in this version" on the flow view and Sankey | Done, 0.9.8_7 | 1 |
| `RC-040` | Docs: `/charts/styles/` tables regenerated from `theme.js` | Done, 0.9.8_7 | 1 |
| `RC-051` | Bands on TimeSeries and DualAxes | Done, 0.9.8_7 | 4 |
| `RC-055` | The flaky `reference-pages` browser test | Done, 0.9.8_7 | 1 |
| `RC-058` | Docs after Rare Styles `v0.7.2`: chart heights, notices, `.stat` | Open, 0.9.8_7 | 2 |
| `RC-060` | Labels stay inside the drawing: auto value gutters grow to fit | Done, 0.9.8_7 | 6 |
| `RC-062` | Docs: the styles, map and installation pages after the theme work | Done, 0.9.8_7 | 1 |
| `RC-069` | `Overview.setBrush` with a reversed pair draws a negative-width selection | Open, 0.9.8_7 (pinned `it.fails`; named in `40c534f`) | 1 |
| `RC-070` | Near the plot's right edge the tooltip covers the pointer | Done, 0.9.8_7 | 2 |
| `RC-071` | MapFlow `fitTo: 'links'` overshoots at a 640px card | Done, 0.9.8_7 | 2 |
| `RC-072` | DualAxes bars overlap on narrow cards | Done, 0.9.8_7 | 2 |
| `RC-073` | Map/MapFlow and TimeSeries create `d3.zoom()` without an explicit `.extent()` | Done, 0.9.8_7 | 3 |
| `RC-074` | Graph flow: the hull keeps tie labels out inside a time window | Done, 0.9.8_7 | 1 |
| `RC-075` | Horizontal categorical Bar: the grid ignores `xTickValues` | Done, 0.9.8_7 | 2 |
| `RC-076` | The dated Bar's time axis falls to one label | Done, 0.9.8_7 | 2 |
| `RC-077` | Percent stacked horizontal Bar: the `100%` end label runs about 1 px past the svg | Done, 0.9.8_7 | 2 |
| `RC-079` | A Graph tie's value is shown two ways | Done, 0.9.8_7 | 3 |
| `RC-080` | TimeSeries follows Line: the visible half of D-09 | Done, 0.9.8_7 | 7 |
| `RC-081` | DualAxes value axes follow Line's domain rule (8% of the span, no forced zero) | Done, 0.9.8_7 | 1 |
| `RC-084` | An end label sits on a Y tick label | Done, 0.9.8_7 | 3 |

**IDs from the specs and review reports.** These come from outside the audit families: the 2026-07 Graph spec (A), the C-27 findings (N), the B-03 look changes (D1) and the step 6 review of the 0.9.8_6 cleanup (D5…D14, E-…). The step 6 review report was never committed; the meaning below is taken from the citing comments.

| ID | One line | Where it landed | Files |
|---|---|---|---|
| `A1` | A synchronous `setData(); focus()` chain draws the ego view; there was no race (an unpainted page) | 0.9.8_3 (`62bcd38`, 2026-10-16) | 1 |
| `A2` | Several typed ties per pair, both directions (multigraph) | 0.9.8_3 (`62bcd38`) | 4 |
| `A3` | Tie hit area, tie tooltip, pin on click | 0.9.8_3 (`62bcd38`) | 2 |
| `A4` | One dominant category: a rosette on the ego grid | 0.9.8_3 (`62bcd38`) | 2 |
| `N1` | Date Bar: edge bars stay inside the plot (found with C-27) | `3ac7af0`, 0.9.8_6 | 1 |
| `N2` | DualAxes bar slot taken from bar dates only | `3ac7af0`, 0.9.8_6 | 1 |
| `N3` | DualAxes bar fill and opacity follow `setData` | `3ac7af0`, 0.9.8_6 | 1 |
| `D1` | B-03 look change: the TimeSeries tooltip date row is 13 px with no gap | `3ac7af0`, 0.9.8_6 | 1 |
| `D5` | Flow `minWidth` scrolls only the drawing | `a827820`, 0.9.8_6 | 3 |
| `D6` | MapFlow labels avoid arrowheads and other places' dots | `a827820`, 0.9.8_6 | 2 |
| `D7` | Escape or × on the hidden-nodes list returns focus to "+N more" | `a827820`, 0.9.8_6 | 2 |
| `D8` | A Graph legend button keeps focus across a redraw (with R-16) | `a827820`, 0.9.8_6 | 2 |
| `D14` | Donut with `animate: false` removes the previous level at once | `a827820`, 0.9.8_6 | 1 |
| `E-03` | DualAxes date ticks on a short span do not repeat | `a827820`, 0.9.8_6 | 2 |
| `E-04` | Donut drill-down: a leaving slice is removed even when a hover interrupts its exit | `a827820`, 0.9.8_6 | 2 |
| `E-21` | A drilled-in Donut's hole is a button back up | `a827820`, 0.9.8_6 | 2 |
| `O6` | Tooltip links take the tooltip colour, hovered or pinned (they were browser blue on a dark tooltip) | `3ac7af0`, 0.9.8_6 | 1 |

**Rare Styles IDs in the scanned files.** They resolve in the Rare Styles backlog (`_internal_docs/styles/BACKLOG.md`) and `assets/css/docs/Changelog.md`, not here. Counted in the first list of scanned paths only; the Rare Styles files of the second list were scanned for RareCharts IDs alone. Every `CSS-` citation is in the Rare Styles tests that share `test/`.
- Questions: `Q-04` (4 files: `rare-charts.css`, which cites it for the breadcrumbs' `display: inline` because a host may make every `<button>` a block, and three Rare Styles test files), `Q-14` (1).
- Tasks (files): `CSS-040` (3), `CSS-041` (1), `CSS-042` (1), `CSS-043` (2), `CSS-044` (2), `CSS-045` (1), `CSS-046` (1), `CSS-078` (1), `CSS-098` (1), `CSS-100` (4), `CSS-110` (2), `CSS-112` (2), `CSS-113` (1), `CSS-118` (4), `CSS-121` (1), `CSS-124` (1), `CSS-129` (1), `CSS-156` (2), `CSS-164` (1), `CSS-167` (1), `CSS-176` (2), `CSS-178` (2), `CSS-180` (4), `CSS-181` (2), `CSS-183` (1), `CSS-183a` (3), `CSS-184` (2), `CSS-240` (2), `CSS-338` (4), `CSS-339` (1), `CSS-343` (2), `CSS-345` (1), `CSS-348` (1), `CSS-354` (2), `CSS-355` (2), `CSS-357` (3), `CSS-358` (2), `CSS-360` (1), `CSS-361` (1), `CSS-364` (1), `CSS-367` (1), `CSS-371` (4), `CSS-372` (2), `CSS-373` (2), `CSS-374` (2), `CSS-375` (2), `CSS-376` (2), `CSS-377` (2), `CSS-379` (2), `CSS-380` (4), `CSS-381` (2), `CSS-382` (1), `CSS-383` (2), `CSS-384` (2), `CSS-385` (3), `CSS-404` (1), `CSS-417` (1), `CSS-418` (1), `CSS-419` (1).

Totals: 130 RareCharts IDs resolved above (113 audit and task IDs, 17 spec and review IDs), plus 57 Rare Styles IDs listed by count.
