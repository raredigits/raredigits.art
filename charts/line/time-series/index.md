---
layout: page.njk
title: "Time Series"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/time-series/'
---

<spn class="meta-info">/examples/line/line-chart-time-series.js</spn>

Time Series is the chart for long date-based series where the main problem is navigation, not drawing a line. Price history, balances, revenue, traffic, sensor data: the moment the dataset stops fitting into one comfortable view, you need a way to switch windows without rebuilding the chart by hand.

In RareCharts, this module combines three things:

- a main line chart for the active date window
- a range bar with preset buttons, if you enable `timeframes`
- a navigator strip with a brush, if you enable `navigator`

The important bit is that both the buttons and the brush work with the same internal `view`. If the user clicks a range button, the chart updates its visible extent. If the user drags the brush, the chart updates the same visible extent. No duplicated state, no two widgets trying to outsmart each other, no “why is the UI lying to me” moment.

<div class="padding-y-md">
  <!-- ── Header ─────────────────────── -->
  <div class="price-chart-header">
      <div>
          <span class="price-chart-ticker">RARE</span>
          <span class="price-chart-price"  id="hd-price">—</span>
          <span class="price-chart-change" id="hd-change">—</span>
      </div>
  </div>
  
  <!-- ── Main chart ─────────────────── -->
  <div class="rc-chart" id="mainChart"></div>
  
  <!-- ── Stats ─────────────────────── -->
  <div class="card-row-bordered price-chart-stats">
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">OPEN</div>
      <div class="price-chart-stat-value" id="s-open">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">HIGH</div>
      <div class="price-chart-stat-value" id="s-high">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">LOW</div>
      <div class="price-chart-stat-value" id="s-low">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">VOLUME</div>
      <div class="price-chart-stat-value" id="s-vol">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">52W HIGH</div>
      <div class="price-chart-stat-value" id="s-52h">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">52W LOW</div>
      <div class="price-chart-stat-value" id="s-52l">—</div>
    </div>
  </div>
</div>

<div class="air-md"></div>

### What problem it solves

The plain `Line` chart is enough when one view is enough. `TimeSeries` exists for the next step: when you want one chart instance to support “show me the last month”, “show me the last year”, and “show me everything” without wiring a second component tree around it.

This example uses:

- preset range buttons: `1M`, `3M`, `6M`, `1Y`, `2Y`, `ALL`
- a built-in navigator strip under the chart
- a custom tooltip
- a few stats below the chart

Only the first two are specific to the module. The tooltip and stats are just ordinary page code around it.

### Range buttons

Range buttons are controlled by the `timeframes` option.

```js
const chart = new RareCharts.TimeSeries('#chart', {
  timeframes: true,
  defaultTimeframe: '1Y',
});
```

`timeframes: true` enables the built-in preset set: `1M`, `3M`, `6M`, `1Y`, `2Y`, `ALL`. If you need a custom set, pass an array instead.

So:

- if you omit `timeframes`, there is no range bar
- if you pass `timeframes: true`, you get the built-in preset set
- if you pass `['1Y', 'ALL']`, you get exactly those two buttons

### Navigator

The gray strip under the chart is controlled by `navigator`.

```js
const chart = new RareCharts.TimeSeries('#chart', {
  navigator: true,
});
```

Or with options:

```js
const chart = new RareCharts.TimeSeries('#chart', {
  navigator: {
    height: 56,
    color: '#666666',
    area: 1,
    areaColor: '#cccccc',
  },
});
```

If enabled, the navigator always reflects the full dataset and highlights the current `view`. Dragging the brush updates the main chart. Clicking a range button also updates the brush. Same state, two controls, fewer bugs.

### Programmatic control

The visible window is part of the chart API.

```js
chart.setView([start, end]);
const current = chart.getView();

chart.onViewChange(extent => {
  console.log(extent);
});
```

This matters when the date range is driven by router state, saved user settings, query params, or another piece of UI that insists on being in charge.

### Custom ranges

If the built-in shortcuts are not enough, you can define your own buttons.

```js
const end = data[data.length - 1].date;

timeframes: [
  'ALL',
  {
    key: 'SINCE_2025',
    label: 'Since 2025',
    range: [new Date('2025-01-01'), end],
  },
  {
    key: 'SINCE_2026',
    label: 'Since 2026',
    range: [new Date('2026-01-01'), end],
  },
]
```

Rules:

- `ALL` means the full data extent
- built-in string shortcuts such as `1M`, `6M`, `1Y`, `YTD`, `ALL` are resolved by the chart
- custom buttons use `{ key, label, range }`
- `range` is `[start, end]`
- the final range is clamped to the real data extent, so overshooting the dataset is safe
- if multiple buttons resolve to the same final extent, the chart keeps the last explicitly selected button active

## Time Series chart options

Common options shared by all chart types (`title`, `subtitle`, `legend`, `legendPosition`, `source`, `theme`) are documented on the [Settings](/charts/settings/) page.

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="4"><h5>Layout</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>340</code></td>
            <td>Chart height in px.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td>—</td>
            <td>Inner padding <code>{top, right, bottom, left}</code>.</td>
        </tr>
        <tr>
            <td><code>timeframes</code></td>
            <td>boolean | array</td>
            <td>—</td>
            <td>Range bar button definitions. Pass <code>true</code> to use the built-in preset set <code>['1M', '3M', '6M', '1Y', '2Y', 'ALL']</code>. Or pass an array of built-in shortcuts and custom objects with <code>key</code>, <code>label</code>, and <code>range</code>.</td>
        </tr>
        <tr>
            <td><code>defaultTimeframe</code></td>
            <td>string | object</td>
            <td>—</td>
            <td>Initial active timeframe used on first render when no explicit <code>view</code> has been set.</td>
        </tr>
        <tr>
            <td><code>navigator</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>Built-in overview strip under the chart. Pass <code>true</code> for defaults or an object with options such as <code>height</code>, <code>color</code>, <code>area</code>, <code>areaColor</code>, and <code>brushColor</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Axes</h5></td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>function</td>
            <td><code>'%b'</code></td>
            <td><code>(date) =&gt; string</code> — formats X axis labels.</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>function</td>
            <td><code>$,.0f</code></td>
            <td><code>(value) =&gt; string</code> — formats Y axis labels.</td>
        </tr>
        <tr>
            <td><code>yTicks</code></td>
            <td>number</td>
            <td><code>5</code></td>
            <td>Y axis tick count.</td>
        </tr>
        <tr>
            <td><code>yTickValues</code></td>
            <td>array</td>
            <td>—</td>
            <td>Explicit Y tick positions. Overrides automatic tick generation.</td>
        </tr>
        <tr>
            <td><code>yLabelsOnly</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show only Y labels and suppress the axis line.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Line and Area</h5></td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td><code>'monotone'</code></td>
            <td>D3 curve type: <code>'linear'</code>, <code>'monotone'</code>, <code>'basis'</code>, <code>'cardinal'</code>, <code>'step'</code>, <code>'stepBefore'</code>, <code>'stepAfter'</code>.</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean | number</td>
            <td><code>true</code></td>
            <td>Area fill under the line. <code>true</code> uses a gradient, a number is treated as solid fill opacity, and <code>false</code> disables the area.</td>
        </tr>
        <tr>
            <td><code>areaColor</code></td>
            <td>CSS color</td>
            <td>theme accent</td>
            <td>Area fill color.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(point) =&gt; html</code> — custom tooltip renderer for the active point.</td>
        </tr>
    </tbody>
</table>

## Time Series instance methods

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Method</th>
            <th>Signature</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>setData</code></td>
            <td><code>(data)</code></td>
            <td>Sets the full dataset and re-renders the chart.</td>
        </tr>
        <tr>
            <td><code>appendPoint</code></td>
            <td><code>(point)</code></td>
            <td>Adds one point, re-sorts by date, and re-renders.</td>
        </tr>
        <tr>
            <td><code>setView</code></td>
            <td><code>([start, end])</code></td>
            <td>Sets the visible date window explicitly.</td>
        </tr>
        <tr>
            <td><code>getView</code></td>
            <td><code>()</code></td>
            <td>Returns the current visible date window.</td>
        </tr>
        <tr>
            <td><code>onViewChange</code></td>
            <td><code>(fn)</code></td>
            <td>Registers a callback that runs whenever the visible date window changes.</td>
        </tr>
    </tbody>
</table>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-time-series.js"></script>
