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

<div class="panel panel--bordered full-width-caption">
  <!-- ── Header ─────────────────────── -->
  <div class="price-chart-header">
      <div>
          <span class="price-chart-ticker">RARE</span>
          <span class="price-chart-price"  id="hd-price">—</span>
          <span class="price-chart-change stat" id="hd-change"><span class="stat__value">—</span></span>
      </div>
  </div>
  
  <!-- ── Main chart ─────────────────── -->
  <div id="timeseriesChart"></div>
  
  <!-- ── Stats ─────────────────────── -->
  <div class="panel__row">
    <div class="panel__row-item stat">
      <div class="stat__label">OPEN</div>
      <div class="stat__value" id="s-open">—</div>
    </div>
    <div class="panel__row-item stat">
      <div class="stat__label">HIGH</div>
      <div class="stat__value" id="s-high">—</div>
    </div>
    <div class="panel__row-item stat">
      <div class="stat__label">LOW</div>
      <div class="stat__value" id="s-low">—</div>
    </div>
    <div class="panel__row-item stat">
      <div class="stat__label">VOLUME</div>
      <div class="stat__value" id="s-vol">—</div>
    </div>
  </div>
</div>

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

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
  timeframes: true,
  defaultTimeframe: '1Y',
});</code></pre>

`timeframes: true` enables the built-in preset set: `1M`, `3M`, `6M`, `1Y`, `2Y`, `ALL`. If you need a custom set, pass an array instead.

So:

- if you omit `timeframes`, there is no range bar
- if you pass `timeframes: true`, you get the built-in preset set
- if you pass `['1Y', 'ALL']`, you get exactly those two buttons

### Navigator

The gray strip under the chart is controlled by `navigator`.

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
  navigator: true,
});</code></pre>

Or with options:

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
  navigator: {
    height: 56,
    color: '#666666',
    area: 1,
    areaColor: '#cccccc',
  },
});</code></pre>

If enabled, the navigator always reflects the full dataset and highlights the current `view`. Dragging the brush updates the main chart; when the drag ends, `onViewChange` reports the new window, as a range button does. A click on the strip without a drag keeps the current selection. Clicking a range button also updates the brush. The strip lines up with the plot area (its side margins follow the chart's); pass `margin: { left, right }` to set them, and `area: false` to draw the line alone. Same state, two controls, fewer bugs.

### Programmatic control

The visible window is part of the chart API.

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', { timeframes: true }).setData(data);

chart.setView([new Date('2025-01-01'), new Date('2025-06-30')]);
chart.setTimeframe('3M');   <span class="code-comment">// as a click on the 3M button</span>
const current = chart.getView();

chart.onViewChange(extent =&gt; {
  console.log(extent);
});</code></pre>

This matters when the date range is driven by router state, saved user settings, query params, or another piece of UI that insists on being in charge.

### Logarithmic scale

For prices that span decades, set `yScale: 'log'`: ticks fall on powers of ten, the margin above and below is a factor of the data's span, and zero or negative points are skipped with one console warning. `scaleToggle: true` adds a Log toggle to the top right of the header, filled while the axis is logarithmic, above the Y-axis labels — the range buttons keep their place; `setYScale('log' | 'linear')` switches from code, and `onScaleChange(fn)` reports every switch. The scale is the same as on <a href="/charts/line/">Line</a>.

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
    timeframes: true,
    yScale: 'log',
    scaleToggle: true,
});

chart.onScaleChange(({ scale }) => console.log(scale));</code></pre>

### Custom ranges

If the built-in shortcuts are not enough, you can define your own buttons.

<pre class="text-content-caption"><code>const end = data[data.length - 1].date;

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
]</code></pre>

Rules:

- `ALL` means the full data extent
- built-in string shortcuts such as `1M`, `6M`, `1Y`, `YTD`, `ALL` are resolved by the chart
- custom buttons use `{ key, label, range }`
- `range` is `[start, end]`
- the final range is clamped to the real data extent, so overshooting the dataset is safe
- if multiple buttons resolve to the same final extent, the button chosen last stays active — clicked or set with `setTimeframe()`, or `defaultTimeframe` while its view holds; without one (before any selection, or after a brush drag, Ctrl/⌘ + wheel or `setView`, which clear it) a view of the whole data lights `ALL` (or `MAX`), any other the first matching button in the list

### Analytics ranges

A traffic or sales report counts its windows from now: "today", "this week", "this month". Set `timeframeAnchor: 'now'` and use the calendar keys:

<div class="panel panel--bordered full-width-caption">
  <div id="trafficChart"></div>
  <p class="font-size-sm" id="traffic-level"></p>
</div>

<span class="meta-info">/assets/charts/examples/line/line-chart-traffic.js</span>

<pre class="text-content-caption"><code>const chart = new RareCharts.TimeSeries('#chart', {
    timeframeAnchor: 'now',
    timeframes: [
        { key: 'TODAY', label: 'Today' },
        { key: 'WTD',   label: 'Week' },
        { key: 'MTD',   label: 'Month' },
        { key: 'YTD',   label: 'Year' },
        { key: 'ALL',   label: 'All time' },
        { key: 'CUSTOM', label: 'Custom' },
    ],
    compare: 'previousPeriod',
    yFormat: 'number',
    gaps: 'zero',
    navigator: true,
}).setData({ hour, day, month });   <span class="code-comment">// levels: see Resolution below</span></code></pre>

`timeframeAnchor` is the end every timeframe counts back from:

- `'dataEnd'` (the default) — the last data point, as before;
- `'now'` — the current moment. It is read when the data is set, a point appended or a button clicked, and kept across resizes. A page that wants a moving "now" calls `setData` or `setTimeframe` again;
- a date — a fixed "as of" instant (a Date, epoch ms or an ISO string with a time; a date-only string is that day's midnight).

With an anchor past the data, `ALL`, the zoom and the navigator run on to it; a window still starts no earlier than the data.

| Key | Window |
|---|---|
| `ALL` / `MAX` | the whole data |
| `TODAY` | from the start of the anchor's day |
| `WTD` | from the start of the anchor's week (`weekStart`: Monday by default, `'sunday'` or a number 0–6) |
| `MTD` | from the start of the anchor's month |
| `YTD` | from the start of the anchor's year |
| `24H`, `nH` | n real hours back, so `24H` across a daylight-saving change is 24 hours while that day is 23 or 25 |
| `7D`, `3M`, `1Y`… | n calendar days, weeks, months or years back |

Every window ends at the anchor and is cut in the chart's `timeZone`. The keys, the anchor and the custom range below work on every chart with timeframes; see [Settings](/charts/settings/).

### Custom range

`'CUSTOM'` in `timeframes` adds a "Custom" button (the page's label wins). It opens a small panel with From and To date fields and Apply:

- the fields start at the days in view and stay within the data's days; To before From swaps them; an empty field disables Apply;
- Apply shows whole days in the chart's zone, from midnight of From to the end of To;
- Enter applies; Escape or a click outside closes the panel and returns focus to the button;
- the chart keeps the days: `setData` and `appendPoint` show the same dates again, and the button stays pressed while that view holds (its title names the days). The brush, the wheel and `setView` release it.

From code: `chart.setTimeframe('CUSTOM', { range: ['2026-03-01', '2026-03-31'] })`. The panel is styled by the library itself (`.rc-range-panel`), so it looks the same with or without Rare Styles on the page.

### Resolution follows the window

A year of hourly rows is too many to draw, and a day of daily rows is one point. Hand the chart the same series at several bucket sizes — the server aggregates, the chart never sums — and it draws, for each window, the finest level that fits:

<pre class="text-content-caption"><code>chart.setData({
    hour:  [{ date: '2026-11-18T14:00', value: 312 }, …],   <span class="code-comment">// the last weeks only is fine</span>
    day:   [{ date: '2026-11-18', value: 4120 }, …],
    month: [{ date: '2026-11', value: 98200 }, …],
});</code></pre>

- level keys: `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`. Each row is dated at the start of its bucket in the chart's zone;
- `resolution: { maxPoints: 500 }` — for a window, the finest level that covers it (one bucket of slack at each end) with at most `maxPoints` rows; if none fits, the coarsest one that covers it;
- the full range is the union of the levels; the navigator draws the coarsest level (`navigator: { level: 'day' }` picks another);
- `getLevel()` names the level drawn; `appendPoint(point, 'hour')` adds to a level;
- the tooltip names the date by the bucket: `Nov 18, 2026, 14:00`, `Nov 18, 2026`, `Week of Nov 16, 2026`, `November 2026`, `Q4 2026`, `2026`.

**Loading on demand.** A level may cover only part of the time. To fetch finer rows when the window asks for them:

<pre class="text-content-caption"><code>chart.onViewChange(async (extent, { key, level }) => {
    if (level !== 'month') return;
    chart.setLoading(true);                        <span class="code-comment">// a slim "Loading…" bar over the plot</span>
    const day = await fetchDays(extent);
    chart.setData({ ...levels, day }).setLoading(false);
});</code></pre>

The window and the selected button hold across `setData`, and `setData` itself reports no view change. Under `gaps: 'zero'` a level must have no unloaded holes inside its rows: the fill would count them as zeros.

### Comparison with an earlier period

`compare: 'previousPeriod'` draws the same metric for an earlier window over the current one, as a grey dashed line under the main line; `compare: 'previousYear'` always compares with a year before.

| The view was set by | Compared with |
|---|---|
| `TODAY`, `WTD`, `MTD`, `YTD` | the day, week, month or year before — the same days: 1–18 November against 1–18 October |
| `nH`, `nD`, `nW`, `nM`, `nY` | the n before |
| Custom | as many days before |
| the brush, the wheel or `setView`, after one of the above | the same as that period: zoomed into a week, still the week before, so the two lines keep their rhythm |
| `ALL`, or nothing picked | its own length before, in whole days (whole hours under a day) |

Each row is moved on its own, so months line up day by day; two rows that land on one date keep the later one. The comparison uses the rows of the level drawn. The default tooltip adds a row such as `Previous period  1,100 · Oct 18 · +12.2%`. The Y axis fits both lines; the time axis and the navigator follow the main one.

The comparison is a second legend key, named by `compareName` (default "Previous period" or "Previous year"): `legend: [{ label: 'Visits' }, { label: 'Previous period' }]` with `seriesName: 'Visits'` makes both toggles, and the comparison's item gets a dashed swatch. `compareColor` recolours it.

A hidden series leaves the line, the area and the crosshair; with nothing shown the frame stays — axes, grid, annotations — and the crosshair is off. The Y axis fits the series shown; the time axis, the view, the timeframes and the navigator never follow the legend. `setSeriesVisible(names | null)` sets it from code. More: [Interactive legend](/charts/settings/#interactive-legend).

### Counts and gaps

The default Y format is money, as before (`$1,234`). For counts set `yFormat: 'number'`: the ticks are compact, as on Line (`1.2k`), and the tooltip shows the exact number (`1,234`). `yPrefix` and `ySuffix` dress both formats.

`gaps` says what a missing bucket is:

- `'join'` (default) — the line joins its neighbours, as before;
- `'zero'` — it is drawn as 0. Nothing is filled before the first row; with `timeframeAnchor: 'now'` the buckets after the last row are filled up to now;
- `'break'` — the line and the area stop there; a lone point gets a dot, and the tooltip over the gap says "No data".

With `'zero'` or `'break'`, a row whose value is `null` is a missing bucket too. The bucket comes from the level, or from `interval` (`'hour'`, `'day'`, `'week'`, `'month'`…), or from the data's most common step. On a log scale `'zero'` draws as `'break'`.

### Bands

`band: true` draws a ribbon between the rows' `lower` and `upper` fields, under the area and the line — a forecast range, a min–max envelope. `band: { lower: 'p10', upper: 'p90', name: 'P10–P90' }` names the fields; `color` and `fillOpacity` (0.12) restyle it. A row without both edges breaks the ribbon. The Y axis fits it, the tooltip adds `Range  90 – 110`, and its name is its legend key. The same ribbon on several series lives on [Line](/charts/line/band/) and [Dual Axes](/charts/line/dual-axes/).

### Zoom and pan

Ctrl (⌘ on a Mac) + the mouse wheel, or a trackpad pinch, zooms; a drag pans. A plain wheel scrolls the page and shows "Hold Ctrl to zoom" for a moment. On a phone one finger scrolls the page and two fingers pan and pinch the chart; the navigator's brush still takes one finger.

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
            <td><code>timeZone</code></td>
            <td>string</td>
            <td><code>'local'</code></td>
            <td><code>'local'</code> or <code>'UTC'</code>: the zone a date string without a zone of its own is read in (the rows, <code>annotations</code>, the view bounds), the timeframes cut in, and the axis and the tooltip name dates in. A <code>Date</code>, epoch milliseconds or an ISO string with <code>Z</code> or an offset stays that instant. See <a href="/charts/settings/#dates-and-time-zones">Dates and time zones</a>.</td>
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
            <td><code>timeframeAnchor</code></td>
            <td><code>'dataEnd'</code> | <code>'now'</code> | date</td>
            <td><code>'dataEnd'</code></td>
            <td>The end every timeframe counts back from: the last data point, the current moment, or a fixed instant. With an anchor past the data, <code>ALL</code>, the zoom and the navigator run on to it. See <a href="#analytics-ranges">Analytics ranges</a>.</td>
        </tr>
        <tr>
            <td><code>weekStart</code></td>
            <td>string | number</td>
            <td><code>'monday'</code></td>
            <td>The first day of a week for <code>WTD</code> and week buckets: a day name or 0–6 (0 is Sunday).</td>
        </tr>
        <tr>
            <td><code>navigator</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>Built-in overview strip under the chart. Pass <code>true</code> for defaults or an object with options such as <code>height</code>, <code>color</code>, <code>area</code>, <code>areaColor</code>, <code>brushColor</code>, <code>margin</code> (defaults to the chart’s side margins, so the strip lines up with the plot) and <code>axis</code> (a time axis under the strip). With levels, <code>level</code> picks the level the strip draws (the coarsest by default).</td>
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
            <td>by <code>yFormat</code></td>
            <td><code>(value) =&gt; string</code> — formats Y axis labels.</td>
        </tr>
        <tr>
            <td><code>yFormat</code></td>
            <td><code>'currency'</code> | <code>'number'</code></td>
            <td><code>'currency'</code></td>
            <td><code>'currency'</code>: <code>$1,234</code> on the axis, <code>$1,234.56</code> in the tooltip. <code>'number'</code>: compact ticks as on Line (<code>1.2k</code>) and the exact count in the tooltip (<code>1,234</code>).</td>
        </tr>
        <tr>
            <td><code>yPrefix / ySuffix</code></td>
            <td>string</td>
            <td><code>'$'</code> / —</td>
            <td>Text around the default labels; the prefix is <code>'$'</code> under <code>'currency'</code> and empty under <code>'number'</code>.</td>
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
            <td>A Log toggle pinned to the top right of the header, above the Y-axis labels: filled while the axis is logarithmic, transparent while it is linear; a click flips the scale. <code>true</code> or <code>{ labels: { log } }</code>, <code>labels.log</code> being its text. Each switch fires <code>onScaleChange</code>.</td>
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
            <td><code>curveTension</code></td>
            <td>number</td>
            <td><code>0</code></td>
            <td>0–1, the tension of <code>'cardinal'</code>, as on Line.</td>
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
            <td colspan="4"><h5>Analytics</h5></td>
        </tr>
        <tr>
            <td><code>resolution</code></td>
            <td>object</td>
            <td><code>{ maxPoints: 500 }</code></td>
            <td>With levels (<code>setData({ hour, day, month… })</code>), the most rows a window may draw: the finest level that covers the window within it is drawn. See <a href="#resolution-follows-the-window">Resolution</a>.</td>
        </tr>
        <tr>
            <td><code>gaps</code></td>
            <td><code>'join'</code> | <code>'zero'</code> | <code>'break'</code></td>
            <td><code>'join'</code></td>
            <td>A missing bucket joins its neighbours, is drawn as 0, or breaks the line (a lone point gets a dot, the tooltip says “No data”). Under <code>'zero'</code> / <code>'break'</code> a <code>null</code> value is a missing bucket.</td>
        </tr>
        <tr>
            <td><code>interval</code></td>
            <td>string</td>
            <td>from the data</td>
            <td>The bucket of plain rows: <code>'minute'</code>, <code>'hour'</code>, <code>'day'</code>, <code>'week'</code>, <code>'month'</code>, <code>'quarter'</code> or <code>'year'</code>. It sets what a missing bucket is and how the tooltip names a date; without it, the data's most common step.</td>
        </tr>
        <tr>
            <td><code>compare</code></td>
            <td><code>false</code> | <code>'previousPeriod'</code> | <code>'previousYear'</code></td>
            <td><code>false</code></td>
            <td>A grey dashed line of an earlier window over the current one; the tooltip adds its value and the change. See <a href="#comparison-with-an-earlier-period">Comparison</a>.</td>
        </tr>
        <tr>
            <td><code>seriesName</code></td>
            <td>string</td>
            <td><code>'Series'</code></td>
            <td>The series' name and legend key: <code>legend: [{ label: 'Visits' }]</code> with <code>seriesName: 'Visits'</code> makes the item a toggle.</td>
        </tr>
        <tr>
            <td><code>compareName</code></td>
            <td>string</td>
            <td><code>'Previous period'</code></td>
            <td>The comparison's name and legend key (<code>'Previous year'</code> for <code>'previousYear'</code>).</td>
        </tr>
        <tr>
            <td><code>compareColor</code></td>
            <td>string</td>
            <td>theme muted</td>
            <td>The comparison's colour.</td>
        </tr>
        <tr>
            <td><code>band</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>A ribbon between the rows' <code>lower</code> and <code>upper</code> fields; <code>{ lower, upper, name, color, fillOpacity }</code> names the fields and styles it (name <code>'Range'</code>, opacity <code>0.12</code>).</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(point, info) =&gt; html</code> — custom tooltip for the active point: <code>point</code> is the row, with its extra fields; <code>info</code> is <code>{ date, value, color, level }</code>, plus <code>series</code> and <code>compare</code> (<code>{ date, value, change }</code> or <code>null</code>) with <code>compare</code>, and <code>band</code> (<code>{ lower, upper }</code> or <code>null</code>) with <code>band</code> (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>). Not called over a gap. The default shows the date, named by the bucket, and the value in the chart's format.</td>
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
            <td><code>(data | levels)</code></td>
            <td>Sets the full dataset and re-renders. The chart keeps a sorted copy: <code>date</code> may be a Date, an ISO string or epoch ms, <code>value</code> a number or a numeric string; unreadable rows are dropped; other fields (<code>open</code>, <code>volume</code>…) reach <code>tooltipFormat</code>. A selected timeframe re-applies to the new data; a window the new data no longer reaches falls back to the default view. <code>levels</code> is <code>{ minute, hour, day, week, month, quarter, year }</code>, each an array of rows (<a href="#resolution-follows-the-window">Resolution</a>).</td>
        </tr>
        <tr>
            <td><code>appendPoint</code></td>
            <td><code>(point, level?)</code></td>
            <td>Adds one point (read like <code>setData</code>) to the chart’s copy, keeps it in date order, and re-renders. A selected timeframe moves with the new point. The array passed to <code>setData</code> is not modified. With levels, it adds to <code>level</code> (the finest without one).</td>
        </tr>
        <tr>
            <td><code>setView</code></td>
            <td><code>([start, end], { silent? })</code></td>
            <td>Sets the visible date window and returns the chart. A window outside the data shows an empty plot; <code>setView(null)</code> goes back to <code>defaultView</code> / <code>defaultTimeframe</code> / the full range. <code>{ silent: true }</code> skips <code>onViewChange</code>.</td>
        </tr>
        <tr>
            <td><code>setTimeframe</code></td>
            <td><code>(key, { silent?, range? })</code></td>
            <td>Applies a timeframe — a key of <code>timeframes</code> or a preset such as <code>'1Y'</code> — as its button does, and highlights the button. <code>setTimeframe('CUSTOM', { range: [from, to] })</code> sets the custom range. Returns the chart.</td>
        </tr>
        <tr>
            <td><code>getView</code></td>
            <td><code>()</code></td>
            <td>Returns the current visible date window.</td>
        </tr>
        <tr>
            <td><code>onViewChange</code></td>
            <td><code>(fn)</code></td>
            <td>Registers <code>fn(extent, { key, level })</code>, run whenever the visible date window changes: a range button, <code>setView</code>, Ctrl/⌘ + wheel, or the end of a navigator drag. <code>key</code> is the timeframe key when a button or <code>setTimeframe</code> set the window, else <code>null</code>; <code>level</code> the level drawn, or <code>null</code> for plain rows.</td>
        </tr>
        <tr>
            <td><code>getLevel</code></td>
            <td><code>()</code></td>
            <td>The name of the level drawn, or <code>null</code> for plain rows.</td>
        </tr>
        <tr>
            <td><code>setLoading</code></td>
            <td><code>(on = true)</code></td>
            <td>Shows or hides a slim “Loading…” bar over the plot and sets <code>aria-busy</code> on the card; the drawing stays until new data comes. Returns the chart.</td>
        </tr>
        <tr>
            <td><code>setYScale</code></td>
            <td><code>(type, { silent? })</code></td>
            <td>Switches the Y scale to <code>'log'</code> or <code>'linear'</code>, redraws and fills or clears the Log toggle. Returns the chart.</td>
        </tr>
        <tr>
            <td><code>onScaleChange</code></td>
            <td><code>(fn)</code></td>
            <td>Registers a callback that gets <code>{ scale, axis: 'y' }</code> whenever the scale switches (the Log toggle or <code>setYScale</code> without <code>silent</code>).</td>
        </tr>
    </tbody>
</table>
</div>

<h2 id="overview-standalone-navigator">Overview (standalone navigator)</h2>

`RareCharts.Overview` is the strip the `navigator` option builds, as a class of its own: a small line of a series with a brush for picking a date window. Use it when the strip and what it drives are apart — a chart in another card, a table, several charts at once. It is not a chart: no header, footer, timeframes or `whenReady()`, and `new Overview(…)` draws nothing until `setData`.

<pre class="text-content-caption"><code>const overview = new RareCharts.Overview('#overview', { height: 56 });

overview.setData(data, extent =&gt; chart.setView(extent));
chart.onViewChange(extent =&gt; overview.setBrush(extent));</code></pre>

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
            <td><code>timeZone</code></td>
            <td>string</td>
            <td><code>'local'</code></td>
            <td><code>'local'</code> or <code>'UTC'</code>: the zone date strings without a zone are read in — the rows, <code>extent</code>, <code>setBrush()</code> — and the axis names dates in. Under a chart the strip takes the chart's zone.</td>
        </tr>
        <tr>
            <td><code>ariaLabel</code></td>
            <td>string</td>
            <td><code>'Chart'</code></td>
            <td>The accessible name of a standalone strip, whose <code>&lt;svg&gt;</code> gets <code>role="img"</code>. Under a chart the strip is part of the chart's drawing and takes no name of its own.</td>
        </tr>
        <tr>
            <td><code>theme</code></td>
            <td>object</td>
            <td>default theme</td>
            <td>A theme or overrides, merged as a chart's theme is (<code>createTheme</code>: <code>tooltip</code> and <code>map</code> deeply) — <code>RareCharts.darkTheme</code> on a dark page. The element gets the class <code>rc-overview</code>, which carries the chart tokens, so a standalone Overview follows the page's <code>--chart-*</code> as a chart does.</td>
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
<script src="/assets/charts/examples/line/line-chart-traffic.js"></script>
