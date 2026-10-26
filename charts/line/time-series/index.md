---
layout: page.njk
title: "Time Series"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/time-series/'
---

<span class="meta-info">/assets/charts/examples/line/line-chart-time-series.js</span>

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
  <div class="rc-chart" id="timeseriesChart"></div>
  
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

`viewSteps`, the old name of `timeframes`, is deprecated: it still works (`timeframes` wins when both are set) and warns once per chart in the console. Removal is planned for v0.9.9.

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

If enabled, the navigator always reflects the full dataset and highlights the current `view`. Dragging the brush updates the main chart; when the drag ends, `onViewChange` reports the new window, as a range button does. A click on the strip without a drag keeps the current selection. Clicking a range button also updates the brush. The strip lines up with the plot area (its side margins follow the chart's); pass `margin: { left, right }` to set them, and `area: false` to draw the line alone. Same state, two controls, fewer bugs.

### Programmatic control

The visible window is part of the chart API.

```js
const chart = new RareCharts.TimeSeries('#chart', { timeframes: true }).setData(data);

chart.setView([new Date('2025-01-01'), new Date('2025-06-30')]);
chart.setTimeframe('3M');   // as a click on the 3M button
const current = chart.getView();

chart.onViewChange(extent => {
  console.log(extent);
});
```

This matters when the date range is driven by router state, saved user settings, query params, or another piece of UI that insists on being in charge.

### Logarithmic scale

For prices that span decades, set `yScale: 'log'`: ticks fall on powers of ten, the margin above and below is a factor of the data's span, and zero or negative points are skipped with one console warning. `scaleToggle: true` adds a Lin/Log button to the top right of the header, above the Y-axis labels — the range buttons keep their place; `setYScale('log' | 'linear')` switches from code, and `onScaleChange(fn)` reports every switch. The scale is the same as on <a href="/charts/line/">Line</a>.

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
    timeframes: true,
    yScale: 'log',
    scaleToggle: true,
});

chart.onScaleChange(({ scale }) => console.log(scale));</code></pre>

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
- if multiple buttons resolve to the same final extent, the button chosen last stays active — clicked or set with `setTimeframe()`, or `defaultTimeframe` while its view holds; without one (before any selection, or after a brush drag, the wheel or `setView`, which clear it) a view of the whole data lights `ALL` (or `MAX`), any other the first matching button in the list

### Annotations

Time Series supports event markers and reference levels via the `annotations` option — useful for marking halvings, earnings dates, or product releases on a long-running price feed, and for placing horizontal levels (break-even, cost basis, target) on top of the area. Annotations stay in sync with zoom and pan: out-of-range entries are skipped, range bands are clamped to the visible window. See the dedicated <a href="/charts/line/annotations/">annotations</a> page for the full API.

## Time Series chart options

Common options shared by all chart types (`title`, `subtitle`, `legend`, `legendPosition`, `source`, `note`, `controls`, `theme`) are documented on the [Settings](/charts/settings/) page.

<div class="table-scroll card-caption">
<table class="table-bordered">
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
            <td>Inner padding <code>{top, right, bottom, left}</code>. Defaults <code>{ top: 16, right: 70, bottom: 28, left: 0 }</code>; hidden axes give their gutters back, and annotations raise <code>top</code> to <code>annotationLabelHeight + 4</code> unless you set <code>margin.top</code>.</td>
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
            <td><code>defaultView</code></td>
            <td>array</td>
            <td>—</td>
            <td>Initial visible date range as <code>[from, to]</code>. An explicit alternative to <code>defaultTimeframe</code>; clamped to the data extent. If it misses the data, the chart shows the full range; set together with <code>defaultTimeframe</code>, <code>defaultView</code> wins.</td>
        </tr>
        <tr>
            <td><code>navigator</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>Built-in overview strip under the chart. Pass <code>true</code> for defaults or an object with options such as <code>height</code>, <code>color</code>, <code>area</code>, <code>areaColor</code>, <code>brushColor</code>, <code>margin</code> (defaults to the chart’s side margins, so the strip lines up with the plot) and <code>axis</code> (a time axis under the strip).</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Axes</h5></td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>function</td>
            <td>by span</td>
            <td><code>(date) =&gt; string</code> — formats X axis labels. The default follows the span in view: <code>'%H:%M'</code> up to 36 hours (a tick at midnight names the day), <code>'%b %d'</code> up to 92 days (at most one tick per day), <code>'%b'</code> up to a year, <code>"%b '%y"</code> up to five years, <code>'%Y'</code> beyond — so a 1M view reads days and a long one names its years.</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>function</td>
            <td><code>$,.0f</code></td>
            <td><code>(value) =&gt; string</code> — formats Y axis labels.</td>
        </tr>
        <tr>
            <td><code>yScale</code></td>
            <td><code>'linear'</code> | <code>'log'</code></td>
            <td><code>'linear'</code></td>
            <td>Y scale type. <code>'log'</code>: power-of-ten ticks, multiplicative margin, values ≤ 0 skipped. Switch with <code>setYScale()</code>.</td>
        </tr>
        <tr>
            <td><code>scaleToggle</code></td>
            <td>boolean | object</td>
            <td><code>false</code></td>
            <td>A Lin/Log button pinned to the top right of the header, above the Y-axis labels; it names the current scale and flips it. <code>true</code> or <code>{ labels: { linear, log } }</code>. Each switch fires <code>onScaleChange</code>.</td>
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
            <td>Explicit Y tick positions. Overrides automatic tick generation; the value range widens to include them.</td>
        </tr>
        <tr>
            <td><code>yLabelsOnly</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show only Y labels and suppress the axis line.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Visibility</h5></td>
        </tr>
        <tr>
            <td><code>showGrid</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show horizontal grid lines.</td>
        </tr>
        <tr>
            <td><code>showXAxis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the X (date) axis at the bottom. Hiding it also collapses the bottom margin, so the plot runs flush.</td>
        </tr>
        <tr>
            <td><code>showYAxis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the Y (price) axis on the right. Hiding it also collapses the right margin. An explicit <code>margin</code> always wins.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Line and Area</h5>
                <p>The line takes <code>theme.accent</code> and <code>theme.strokeWidth</code> (2px) — set them through <code>theme</code>.</p>
            </td>
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
            <td><code>(point, info) =&gt; html</code> — custom tooltip for the active point: <code>point</code> is the row, with its extra fields; <code>info</code> is <code>{ date, value, color }</code> (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>). The default shows the date and the value as <code>$1,234.56</code>.</td>
        </tr>
        <tr>
            <td><code>crosshair</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Crosshair lines and the tooltip on hover; <code>false</code> turns both off.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Annotations</h5></td>
        </tr>
        <tr>
            <td><code>annotations</code></td>
            <td>array</td>
            <td>—</td>
            <td>Event markers and reference levels. Vertical (<code>date</code>, <code>from</code>/<code>to</code>) and horizontal (<code>value</code>, <code>yFrom</code>/<code>yTo</code>) entries are mixed in the same array. Stay in sync with zoom and pan. See <a href="/charts/line/annotations/">Annotations</a>.</td>
        </tr>
        <tr>
            <td><code>annotationLabelHeight</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Pixels reserved above the chart for vertical annotation labels.</td>
        </tr>
    </tbody>
</table>
</div>

## Time Series instance methods

<div class="table-scroll card-caption">
<table class="table-bordered">
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
            <td>Sets the full dataset and re-renders. The chart keeps a sorted copy: <code>date</code> may be a Date, an ISO string or epoch ms, <code>value</code> a number or a numeric string; unreadable rows are dropped; other fields (<code>open</code>, <code>volume</code>…) reach <code>tooltipFormat</code>. A selected timeframe re-applies to the new data; a window the new data no longer reaches falls back to the default view.</td>
        </tr>
        <tr>
            <td><code>appendPoint</code></td>
            <td><code>(point)</code></td>
            <td>Adds one point (read like <code>setData</code>) to the chart’s copy, keeps it in date order, and re-renders. A selected timeframe moves with the new point. The array passed to <code>setData</code> is not modified.</td>
        </tr>
        <tr>
            <td><code>setView</code></td>
            <td><code>([start, end], { silent? })</code></td>
            <td>Sets the visible date window and returns the chart. A window outside the data shows an empty plot; <code>setView(null)</code> goes back to <code>defaultView</code> / <code>defaultTimeframe</code> / the full range. <code>{ silent: true }</code> skips <code>onViewChange</code>.</td>
        </tr>
        <tr>
            <td><code>setTimeframe</code></td>
            <td><code>(key, { silent? })</code></td>
            <td>Applies a timeframe — a key of <code>timeframes</code> or a preset such as <code>'1Y'</code> — as its button does, and highlights the button. Returns the chart.</td>
        </tr>
        <tr>
            <td><code>getView</code></td>
            <td><code>()</code></td>
            <td>Returns the current visible date window.</td>
        </tr>
        <tr>
            <td><code>onViewChange</code></td>
            <td><code>(fn)</code></td>
            <td>Registers a callback that runs whenever the visible date window changes: a range button, <code>setView</code>, the wheel, or the end of a navigator drag.</td>
        </tr>
        <tr>
            <td><code>setYScale</code></td>
            <td><code>(type, { silent? })</code></td>
            <td>Switches the Y scale to <code>'log'</code> or <code>'linear'</code>, redraws and renames the Lin/Log button. Returns the chart.</td>
        </tr>
        <tr>
            <td><code>onScaleChange</code></td>
            <td><code>(fn)</code></td>
            <td>Registers a callback that gets <code>{ scale, axis: 'y' }</code> whenever the scale switches (the Lin/Log button or <code>setYScale</code> without <code>silent</code>).</td>
        </tr>
    </tbody>
</table>
</div>

<h2 id="overview-standalone-navigator">Overview (standalone navigator)</h2>

`RareCharts.Overview` is the strip the `navigator` option builds, as a class of its own: a small line of a series with a brush for picking a date window. Use it when the strip and what it drives are apart — a chart in another card, a table, several charts at once. It is not a chart: no header, footer, timeframes or `whenReady()`, and `new Overview(…)` draws nothing until `setData`.

```js
const overview = new RareCharts.Overview('#overview', { height: 56 });

overview.setData(data, extent => chart.setView(extent));
chart.onViewChange(extent => overview.setBrush(extent));
```

Dates are read as the charts read them — a `Date`, an ISO string or epoch milliseconds — in the rows, in `extent` and in `setBrush`. The strip keeps a sorted copy of the rows; a row with an unreadable date or value is dropped.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>52</code></td>
            <td>Height of the strip in pixels, its margins included.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>theme border</td>
            <td>Line color.</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean | number</td>
            <td><code>true</code></td>
            <td>Fill under the line: <code>true</code> a gradient, a number a solid fill at that opacity, <code>false</code> none.</td>
        </tr>
        <tr>
            <td><code>areaColor</code></td>
            <td>CSS color</td>
            <td>theme accent</td>
            <td>Fill color.</td>
        </tr>
        <tr>
            <td><code>brushColor</code></td>
            <td>CSS color</td>
            <td>theme text</td>
            <td>Outline and handles of the selection.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td><code>{ top: 6, right: 70, bottom: 16, left: 0 }</code></td>
            <td>Space around the line; a side you leave out keeps its default. The right <code>70</code> lines the strip up with the Y-axis gutter of the charts it sits under.</td>
        </tr>
        <tr>
            <td><code>axis</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>A time axis under the strip.</td>
        </tr>
        <tr>
            <td><code>theme</code></td>
            <td>object</td>
            <td>default theme</td>
            <td>Theme overrides, merged over the default theme — <code>RareCharts.darkTheme</code> on a dark page.</td>
        </tr>
    </tbody>
</table>
</div>

<div class="table-scroll card-caption">
<table class="table-bordered">
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
            <td><code>(data, onBrush, { extent }?)</code></td>
            <td>Draws <code>data</code>, rows of <code>{ date, value }</code>. <code>onBrush(extent, { final })</code> runs while the selection is dragged, with <code>[start, end]</code> as Dates; <code>final</code> is <code>true</code> once, when the drag ends. <code>extent</code> is the span of the strip, the data’s own by default — pass the full span of the chart, so dates that only its other series cover can be brushed to. Returns the strip.</td>
        </tr>
        <tr>
            <td><code>setBrush</code></td>
            <td><code>([start, end])</code></td>
            <td>Moves the selection to that window, clamped to the strip, without calling <code>onBrush</code>. Does nothing before <code>setData</code> or for a bound that is not a date.</td>
        </tr>
        <tr>
            <td><code>destroy</code></td>
            <td><code>()</code></td>
            <td>Removes the strip and stops watching the container’s size. <code>onBrush</code> is never called after it, not even for a drag already under way.</td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-time-series.js"></script>
