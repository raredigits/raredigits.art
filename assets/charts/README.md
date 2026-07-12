# RareCharts

A self-contained D3-based charting library for financial reporting, KPI dashboards, operational analytics, and relationship exploration. D3, Graphology, typography defaults, and chart CSS are bundled into one JavaScript file.

Current version: **{{ versions.charts }}**

## Installation

Load the minified bundle from jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/rare-charts.min.js"></script>
```

For production, pin a release instead of using `latest`:

```html
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@{{ versions.charts }}/rare-charts.min.js"></script>
```

The readable `rare-charts.js` bundle is also available. No separate D3 or CSS import is required. Initialize charts only after the container element and the library are available.

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
| `RareCharts.TimeSeries` | Time series with range controls, zoom, pan, navigator, and OHLCV-compatible data |
| `RareCharts.Overview` | Standalone brush navigator for selecting a time range |
| `RareCharts.Bar` | Vertical and horizontal category comparisons |
| `RareCharts.DualAxes` | Two metrics on independent Y axes, including bar + line overlays |
| `RareCharts.Donut` | Part-to-whole chart with a center label |
| `RareCharts.Pie` | Alias for `Donut` with `innerRadius: 0` |
| `RareCharts.Gauge` | Progress toward a target |
| `RareCharts.Graph` | Deterministic ego, path, and cluster views over a relationship network — **experimental** |
| `RareCharts.MultiChart` | Responsive grid combining two to four `Line` or `Bar` charts |
| `RareCharts.Map` | Choropleth and region-highlight geographic maps |

Most chart classes follow the same construction pattern:

```js
const chart = new RareCharts.Bar('#chart', options).setData(data);
chart.destroy();
```

Shared text and presentation options include `title`, `subtitle`, `legend`, `source`, `note`, `height`, and `theme`. Data shapes and chart-specific options are documented at [raredigits.art/charts](https://raredigits.art/charts/).

## Graph API

`RareCharts.Graph` is a viewport over a graph source, not a force simulation. It renders the answer to a query through three deterministic views:

- **ego** — the neighborhood around one node;
- **path** — routes connecting two nodes;
- **cluster** — the network collapsed into communities.

Graph remains experimental and is not covered by the 1.0 stability guarantee.

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

`setData()` wraps static data in `RareCharts.memorySource()` and initially focuses the best-connected node.

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

Full Graph reference and live examples: [raredigits.art/charts/graph](https://raredigits.art/charts/graph/).

## Data adapters

The bundle exposes helpers for normalizing external data:

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

- `RareCharts.defaultTheme`, `darkTheme`, and `createTheme`;
- `RareCharts.defaultTimeframes`;
- `RareCharts.linkPresets` and `memorySource` for Graph;
- `RareCharts.VERSION` and `DOCS_URL`;
- `RareCharts.d3` for access to the bundled D3 namespace.

## Documentation

Full configuration reference, data formats, and live examples:
**[raredigits.art/charts](https://raredigits.art/charts/)**

## License

MIT. Free to use, modify, and distribute, including in commercial projects. Copies or substantial portions of the software must retain the copyright and license notice. See [LICENSE](LICENSE).
