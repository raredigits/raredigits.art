# RareCharts

A self-contained D3-based charting library for financial reporting, KPI dashboards, operational analytics, and relationship exploration. D3, Graphology, and the chart CSS are bundled into one JavaScript file.

Current version: **{{ versions.charts }}**

## Installation

Load the minified bundle from jsDelivr, pinned to a release:

```html
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@{{ versions.charts }}/rare-charts.min.js"></script>
```

Always name the version. Releases after `v0.9.8` are tagged `v0.9.8_N`, which jsDelivr does not treat as newer, so `@latest` still serves `v0.9.8` — without `HierarchicalBar`, `Sankey`, `MapFlow` and the Graph flow view — until `v0.9.9`.

The readable `rare-charts.js` bundle is also available. No separate D3 or CSS import is required. Initialize charts only after the container element and the library are available.

### Fonts

The library loads no fonts. Charts use Fira Sans for text and Cousine for numbers when the page provides them — [Rare Styles](https://raredigits.art/styles/) self-hosts both — and the system sans-serif and monospace fonts otherwise. For the same look on a page without them, load the two families yourself, for example from Google Fonts:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,400;0,700;1,400&family=Cousine:wght@400;700&display=swap">
```

To use other fonts, set `--rc-font-family` and `--rc-font-family-numeric` with a selector that outranks the library's own `.rc-chart` rule — the library appends its stylesheet to `<head>` when it loads, after any stylesheet already there, so a plain `.rc-chart { … }` loses the tie. `:root .rc-chart { --rc-font-family: Georgia, serif; }` works, as does the chart's id ([Styles](https://raredigits.art/charts/styles/)).

Tooltips work the same way: their colors come from `theme.tooltip`, their size and spacing from the stylesheet, so `.rc-chart .rc-tooltip { font-size: 14px; }` restyles them ([Styles](https://raredigits.art/charts/styles/)).

## Quick start

```html
<div id="my-chart"></div>

<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@{{ versions.charts }}/rare-charts.min.js"></script>
<script>
  new RareCharts.Line('#my-chart', {
    title:    'Revenue',
    subtitle: 'USD, last 12 months',
    height:   300,
  }).setData([
    { date: '2025-01-01', value: 1.2 },
    { date: '2025-04-01', value: 0.8 },
    { date: '2025-07-01', value: 1.5 },
    { date: '2025-10-01', value: 2.1 },
    { date: '2026-01-01', value: 2.8 },
  ]);
</script>
```

Charts fill their container width and redraw through `ResizeObserver`. Height is configured per chart.

## Chart types

| Class | Description |
|-------|-------------|
| `RareCharts.Line` | Single- and multi-series lines, areas, forecasts, bands, annotations, crosshair, and tooltip |
| `RareCharts.TimeSeries` | Time series with range controls, zoom, pan, and navigator; extra fields (open, high, low, volume…) reach `tooltipFormat` |
| `RareCharts.Overview` | Standalone brush navigator for selecting a time range — the strip the `navigator` option builds, also usable on its own: [Overview (standalone navigator)](https://raredigits.art/charts/line/time-series/#overview-standalone-navigator) |
| `RareCharts.Bar` | Vertical and horizontal category comparisons, stacked and 100% stacked bars; dated bars with timeframes, navigator, and annotations |
| `RareCharts.HierarchicalBar` | A tree as an outline of bars on one scale: portfolio, org, or budget breakdowns |
| `RareCharts.DualAxes` | Two metrics on independent Y axes, including bar + line overlays |
| `RareCharts.Donut` | Part-to-whole chart with a center label |
| `RareCharts.Pie` | Part-to-whole chart without a hole: `Donut` with `innerRadius: 0` by default |
| `RareCharts.Gauge` | Progress toward a target |
| `RareCharts.Graph` | Deterministic ego, path, and cluster views over a relationship network, and a flow view for traces through ordered lanes — **experimental** |
| `RareCharts.Sankey` | Flows between stages, band width by value: budgets, money trails, balances — **experimental** |
| `RareCharts.MultiChart` | Responsive grid combining two to four `Line` or `Bar` charts |
| `RareCharts.Map` | Choropleth and region-highlight geographic maps |
| `RareCharts.MapFlow` | Flows between places drawn as arcs over a `Map`, with types, a legend, and a time scale — **experimental** |

Most chart classes follow the same construction pattern:

```js
const chart = new RareCharts.Bar('#chart', options).setData(data);
chart.destroy();
```

Every chart class (all but the standalone `Overview` strip) has `whenReady()`, a promise that resolves with the chart once it has drawn what it loads: Graph its requests and layout, `Map` and `MapFlow` their geometry. The other charts draw on `setData()`, so theirs resolves at once.

Shared text and presentation options include `title`, `subtitle`, `legend`, `legendPosition`, `source`, `note`, `controls` (your own inputs placed inside the card), `height` (except `HierarchicalBar`, which sizes to its rows, and `MultiChart`, which sizes each cell with `chartHeight`), `margin` (axis charts — Donut, Pie, Gauge, Sankey and Graph fill the card), and `theme`. Data shapes and chart-specific options are documented at [raredigits.art/charts](https://raredigits.art/charts/).

## Graph API

`RareCharts.Graph` is a viewport over a graph source, not a force simulation. It renders the answer to a query through three deterministic views:

- **ego** — the neighborhood around one node;
- **path** — routes connecting two nodes;
- **cluster** — the network collapsed into communities.

A fourth view, **flow** (`view: 'flow'`), draws a trace instead: value moving left to right through ordered lanes — money trails, supply chains. It takes the same `{ nodes, links }` through `setData()`, lays the trace out itself or from position hints, and folds, merges, and time-navigates ties ([flow view](https://raredigits.art/charts/graph/flow/)).

Graph, `Sankey`, and `MapFlow` share one relation contract — `{ nodes, links: [{ source, target, value?, type?, start?, end? }] }`, with `from`/`to` accepted — and all three remain experimental: they are not covered by the 1.0 stability guarantee.

### Minimal data

Nodes require only `id`; links require only `source` and `target`. Labels, groups, relation types, weights, images, and other metadata are optional.

```js
const data = {
  nodes: [
    { id: 'person', label: 'Investor', group: 'person' },
    { id: 'company', label: 'Company', group: 'company' },
  ],
  links: [
    { source: 'person', target: 'company', type: 'investment' },
  ],
};

const graph = new RareCharts.Graph('#network', {
  height: 520,
  depth: 2,
  linkTypes: {
    investment: { color: '#00aaff', label: 'Investment' },
  },
}).setData(data);

await graph.whenReady();
```

The `await` lines in these examples need `<script type="module">` or an async function; in a classic `<script>`, use `graph.whenReady().then(…)`.

In the ego, path and cluster views `setData()` wraps static data in `RareCharts.memorySource()` and initially focuses the best-connected node; the flow view draws the whole payload.

### Views and interaction

```js
graph.focus('person');
graph.focus('person', { types: ['investment', 'board'] });
graph.connect('person', 'company');
graph.overview();

graph.setRelationTypes(['investment']);
graph.clearRelationTypes();

graph.hide('noisy-node');
graph.show('noisy-node');

graph.back();
graph.clearHistory();
await graph.whenReady();
```

The relation legend is interactive by default: click to isolate one type, or Shift/Ctrl/Cmd-click for multiple types. When an ego view exceeds its node capacity, `+N more` opens the omitted-node list. Breadcrumbs preserve ego, path, cluster, and relation-filter states. Disable these controls with `interactiveLegend: false` or `breadcrumbs: false`.

Relevant options include:

| Option | Default | Purpose |
|--------|---------|---------|
| `dataSource` | — | Async graph source; optional when using `setData()` |
| `view` | `'ego'` | Initial view; `'flow'` draws a trace in lanes |
| `depth` | `2` | Ego traversal depth |
| `relationTypes` | all | Initial relation-type filter |
| `interactiveLegend` | `true` | Enable relation filtering from the legend |
| `breadcrumbs` | `true` | Show semantic view history |
| `historyLimit` | `12` | Maximum retained graph states |
| `maxNodes` | `'auto'` | Ego viewport capacity |
| `pathCount` | `3` | Maximum routes returned by `connect()` |
| `semanticZoom` | `true` | Switch between ego and cluster views by zoom level |
| `linkTypes` | default style | Relation type labels, colors, and dash patterns |

### Custom graph source

Large or remote graphs can implement the same asynchronous source contract used by `memorySource()`:

```js
const dataSource = {
  async neighbors(id, { depth, types }) {
    return { nodes, links };
  },
  async paths(a, b, { k }) {
    return { paths, nodes, links };
  },
  async aggregates() {
    return { communities, links };
  },
};

const graph = new RareCharts.Graph('#network', { dataSource });
graph.focus('person');
await graph.whenReady();
```

Ids arrive as strings; `paths()` returns `paths` (arrays of ids, shortest first) with their `nodes` and `links`; `aggregates()` returns `communities: [{ id, label, size, top }]` and `links: [{ source, target, weight }]`. The client model accumulates but does not cache: every `focus()`, `connect()` and `overview()` asks the source again.

Full Graph reference and live examples: [raredigits.art/charts/graph](https://raredigits.art/charts/graph/).

## Data adapters

The bundle exposes helpers for normalizing external data. `fromJson`, `fromCsv` and `fromApi` return a promise — `await` them in a module script or an async function; `fromArray` maps an array in place and returns at once:

```js
const data = await RareCharts.fromCsv('/prices.csv', {
  date:  row => new Date(row.date),
  value: row => Number(row.close),
});

chart.setData(data);
```

Available adapters are `fromJson`, `fromCsv`, `fromApi`, and `fromArray`.

## Themes and exported utilities

The global bundle also exports:

- `RareCharts.defaultTheme`, `darkTheme`, and `createTheme(overrides, base)`;
- `RareCharts.defaultTimeframes` — the buttons `timeframes: true` gives: `["1M", "3M", "6M", "1Y", "2Y", "ALL"]`;
- `RareCharts.linkPresets` and `memorySource` for Graph;
- `RareCharts.VERSION` — the release tag as a string (`"{{ versions.charts }}"`) and `RareCharts.DOCS_URL` (`"https://raredigits.art/charts"`);
- `RareCharts.d3` — a documented subset of the bundled D3 for formatters and small calculations in page code: `format`, `formatPrefix`, `timeFormat`, `timeParse`, `utcFormat`, `utcParse`; `sum`, `min`, `max`, `extent`, `mean`, `range`; `scaleLinear`, `scaleTime`, `scaleLog`, `scaleOrdinal`; `color`, `rgb`, `hsl`, `interpolate`; the intervals `timeDay`, `timeWeek`, `timeMonth`, `timeYear` and `utcDay`, `utcWeek`, `utcMonth`, `utcYear`. Before v0.9.8_6 it was the whole D3 namespace; a page that needs more of D3 loads D3 itself;
- `RareCharts.generateMockPrices(days, startPrice)` — a demo helper that makes random price rows (`date`, `value`, `open`, `high`, `low`, `volume`) for examples and sketches. It is **outside the stability guarantee**: its output and signature may change in any release, and it may leave the bundle.

Deprecated: the `viewSteps` option is the old name of `timeframes`. It still works and warns once per chart in the console; removal is planned for v0.9.9.

## Documentation

Full configuration reference, data formats, and live examples:
**[raredigits.art/charts](https://raredigits.art/charts/)**

## License

MIT. Free to use, modify, and distribute, including in commercial projects. Copies or substantial portions of the software must retain the copyright and license notice. See [LICENSE](LICENSE).
