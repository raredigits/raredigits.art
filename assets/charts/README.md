# RareCharts

A lightweight D3-based charting library for professional data presentation. Built for financial reporting, KPI dashboards, and operational analytics — where numbers actually matter.

## CDN

```html
<!-- Minified (recommended for production) -->
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/rare-charts.min.js"></script>

<!-- Readable -->
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/rare-charts.js"></script>
```

Pin to a specific version to avoid unexpected updates:

```html
<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@v0.9.0/rare-charts.min.js"></script>
```

## Quick start

```html
<div id="my-chart"></div>

<script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/rare-charts.min.js"></script>
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

## Chart types

| Class | Description |
|-------|-------------|
| `RareCharts.Line` | Multi-series line chart with crosshair and tooltip |
| `RareCharts.TimeSeries` | Price time series with zoom, pan, and OHLCV data support |
| `RareCharts.Bar` | Vertical and horizontal bar charts |
| `RareCharts.DualAxes` | Two metrics on independent Y axes, supports bar + line overlay |
| `RareCharts.Donut` | Part-to-whole with center label |
| `RareCharts.Pie` | Pie chart alias for Donut with `innerRadius: 0` |
| `RareCharts.Gauge` | Progress toward a target |
| `RareCharts.Graph` | Force-directed network visualization |
| `RareCharts.Map` | Choropleth and region-highlight geographic maps |

## Documentation

Full documentation, configuration reference, and live examples:
**[raredigits.art/charts](https://raredigits.art/charts/)**

## License

MIT — free to use in any project, including commercial. Attribution required.
See [LICENSE](LICENSE) for full terms.
