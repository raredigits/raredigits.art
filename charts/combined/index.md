---
layout: page.njk
title: "Circular Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/circular/'
---

RareCharts provides three circular chart types that share a common API and theme system: **Donut**, **Pie**, and **Gauge**. Each answers a different question.

## Donut

The default circular chart. A ring with a center area — the center gives you a place to put something useful: the total, a headline number, or a short label. That makes donut the better default for dashboards, where charts rarely live alone and context matters.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-donut"></div>
</div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  title:       'Revenue by Product',
  source:      'Source: Internal accounting',
  legend:      segments.map(d => ({ label: d.label, type: 'bar' })),
  height:      300,
  centerText:  data => '$' + d3.format(',.0f')(d3.sum(data, d => d.value)) + 'K',
  centerLabel: 'Revenue',
}).setData(segments);</code></pre>

### Legend to the right

Pass `legendPosition: 'right'` to place the legend in a vertical column beside the chart instead of above it. Works well when you have many categories or want to keep the chart area compact.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-donut-legend-right"></div>
</div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  legend:         segments.map(d => ({ label: d.label, type: 'bar' })),
  legendPosition: 'right',
  height:         260,
}).setData(segments);</code></pre>

## Pie

A pie is a donut with `innerRadius: 0`. The class name is `Donut` — `Pie` is an alias. Same API, same options, same behavior.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-pie"></div>
</div>

A pie chart is a blunt instrument: it answers “how is the total split” when there are only a few categories and the differences are obvious. It breaks down quickly when slices are similar in size, when there are many categories, or when the reader needs precision.

<pre class="text-content-caption"><code>new RareCharts.Pie('#chart', {
  height:     300,
  showLabels: true,
}).setData(segments);</code></pre>

### Outer labels

Enable with `showLabels: true`. Each slice gets a leader line and two-line text (category name + percent). Slices below `labelMinPct` (default: 4%) are skipped automatically.

Control what appears with `labelContent`:
- `'both'` — category name + percentage (default)
- `'label'` — category name only
- `'percent'` — percentage only

<pre class="text-content-caption"><code>new RareCharts.Pie('#chart', {
  showLabels:   true,
  labelContent: 'percent',   // just percentages
  labelMinPct:  0.05,        // hide labels below 5%
}).setData(segments);</code></pre>

## Gauge

An arc-based progress chart. Shows a value relative to a maximum along a partial arc. Use it for goal completion, budget usage, KPI progress — anywhere the question is "how far along are we?"

<div class="rc-demo-controls" style="gap: var(--space-lg);">
  <div class="text-content-caption card-dashboard-bordered" style="flex: 1">
    <div id="chart-gauge-progress"></div>
  </div>
  <div class="text-content-caption card-dashboard-bordered" style="flex: 1">
    <div id="chart-gauge-target"></div>
  </div>
  <div class="text-content-caption card-dashboard-bordered" style="flex: 1">
    <div id="chart-gauge-thin"></div>
  </div>
</div>

`setData()` accepts a plain number, or an object to override `max` and `min` per render:

<pre class="text-content-caption"><code>// 73 out of 100 (default max)
new RareCharts.Gauge('#chart', {
  centerLabel: 'Complete',
}).setData(73);

// 50 achieved out of 80 plan — fills to 62.5%
new RareCharts.Gauge('#chart', {
  max:         80,
  color:       '#00c97a',
  centerText:  (value, max) => `${value}/${max}`,
  centerLabel: 'achieved',
}).setData(50);

// Override max at render time
gauge.setData({ value: 50, max: 80 });</code></pre>

The arc geometry is fully configurable:

<pre class="text-content-caption"><code>new RareCharts.Gauge('#chart', {
  startAngle:   -Math.PI * 0.75,   // -135° (default)
  endAngle:      Math.PI * 0.75,   // +135° (default, 270° sweep)
  thickness:    0.18,              // ring thickness as fraction of radius
  cornerRadius: 6,
  trackColor:   '#e8e8e8',         // background arc
  color:        '#ff3b5c',         // fill arc
});</code></pre>

## Data format

All three types use the same segment data structure:

<pre class="text-content-caption"><code>[
  { label: 'Subscriptions', value: 42000, color: '#00c97a' },
  { label: 'Services',      value: 18000 },
  { label: 'Other',         value:  6000 }
]</code></pre>

Only positive finite values are rendered. Zero and negative values are filtered out.

Colors can be provided per item. If omitted, the chart uses the active theme palette in order.

## Slice geometry

`padAngle` controls the gap between slices (a small default keeps separation without turning the chart into a flower). `cornerRadius` rounds slice corners. Both have sensible defaults and adjust slightly between Pie and Donut mode.

Hover interaction expands the hovered slice outward and shows a tooltip. Tooltip content is fully customizable:

<pre class="text-content-caption"><code>tooltipFormat: ({ label, value, percent, color }) => `
  &lt;div style="color:${color}"&gt;${label}&lt;/div&gt;
  &lt;div&gt;${d3.format(',.0f')(value)}&lt;/div&gt;
  &lt;div style="color:#888"&gt;${d3.format('.1%')(percent)}&lt;/div&gt;
`</code></pre>

## Options summary

**Donut / Pie**

| Option | Default | Description |
|---|---|---|
| `height` | `280` | Chart height px |
| `innerRadius` | `0.58` | Hole size as fraction of outer radius; `0` = Pie |
| `padAngle` | `0.018` | Gap between slices (radians) |
| `cornerRadius` | `3` | Rounded slice corners px |
| `showLabels` | `false` | Show outer leader-line labels |
| `labelContent` | `'both'` | `'both'` / `'label'` / `'percent'` |
| `labelMinPct` | `0.04` | Hide label when slice < this fraction |
| `legendPosition` | `—` | `'right'` to place legend in vertical aside |
| `showCenter` | `true` (donut) | Show center text hole |
| `centerText` | formatted total | String or `function(data) => string` |
| `centerLabel` | `'Total'` | Secondary line below center text |
| `animate` | `true` | Animate on first render |
| `duration` | `650` | Animation duration ms |
| `tooltipFormat` | built-in | `function({label, value, percent, color}) => html` |

**Gauge**

| Option | Default | Description |
|---|---|---|
| `height` | `220` | Chart height px |
| `min` | `0` | Minimum value |
| `max` | `100` | Maximum value |
| `startAngle` | `-¾π` | Arc start (radians, clockwise from top) |
| `endAngle` | `+¾π` | Arc end (270° sweep by default) |
| `thickness` | `0.18` | Ring thickness as fraction of outer radius |
| `cornerRadius` | `6` | Arc end rounding px |
| `color` | `theme.accent` | Fill arc color |
| `trackColor` | `theme.grid` | Background arc color |
| `showCenter` | `true` | Show center text |
| `centerText` | `'63%'` | String or `function(value, max, min) => string` |
| `centerLabel` | `—` | Secondary line below center text |
| `animate` | `true` | Animate fill on first render |
| `tooltipFormat` | built-in | `function({value, max, min, percent}) => html` |


<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/pie-and-donut/pie-and-donut.js"></script>
