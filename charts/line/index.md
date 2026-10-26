---
layout: page.njk
title: "Line Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/'
---

Line charts are the default choice when you need to show change over time, compare multiple series, and make trends readable without forcing the reader to do arithmetic in their head. RareCharts supports a set of practical defaults and configuration options that help keep line charts clear even when the data is messy, multi-series, or formatted for business reporting.

A common use case is performance comparison: multiple instruments, portfolios, products, or metrics plotted on the same time axis, where the story is not “what is the exact number”, but “who moved, when, and how strongly”.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-demo"></div>
</div>

Data can be passed either as a single series or as multiple named series.

**Single series format**

<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart');

chart.setData([
    { date: '2026-01-01', value: 1.00 },
    { date: '2026-01-02', value: 2.5 },
    { date: '2026-01-03', value: -0.6 },
]);</code>
</pre>

When you pass data like this, the library will use options.seriesName (default: "Series") and options.lineColor (default: theme accent) to build the internal series object.

**Multi-series format**

<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart');

chart.setData([
    {
        name: 'Portfolio A',
        color: '#00c97a',
        values: [
            { date: '2026-01-01', value: 0.00 },
            { date: '2026-01-02', value: 0.010 },
        ],
    },
    {
        name: 'Portfolio B',
        color: '#ff3b5c',
        values: [
            { date: '2026-01-01', value: 0.00 },
            { date: '2026-01-02', value: 0.006 },
        ],
    },
]);</code>
</pre>

Dates are parsed via `parseDate(…)`, so strings, timestamps, and Date objects are accepted as long as they can be converted to a valid date. A point whose value is missing (`null`, an empty string, `true` or `false`) or not a number is dropped as well: the line joins its neighbours instead of dipping to zero.

### Built-in timeframe controls

Line charts can expose built-in timeframe buttons directly in the chart header. This is useful when the chart is date-based and you want users to jump between common windows such as one month, six months, one year, or the full history without wiring a separate control bar.

<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart', {
    timeframes: true,
    defaultTimeframe: '1Y',
});

chart.setData(data);

chart.setView([new Date('2025-01-01'), new Date('2025-12-31')]);</code>
</pre>

Available pieces:

- `timeframes` renders the built-in range buttons in the chart header.
- `defaultTimeframe` selects the initial visible range and active button.
- `navigator: true` renders the built-in overview strip with a brush under the main chart.
- `setView([start, end])` sets any custom visible date window.
- `setTimeframe(key)` applies a timeframe from code — a key of `timeframes` or a preset such as `'1Y'` — as its button does, and highlights the button.
- `getView()` returns the currently visible `[start, end]`.
- `onViewChange(fn)` lets external UI stay synchronized with the chart’s active date window.
- `scaleToggle: true` adds a Lin/Log button, pinned right in the same header row, above the Y-axis labels; `onScaleChange(fn)` reports each switch (see Logarithmic scale below).

If you want the built-in mini navigator as well, enable it explicitly:

<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart', {
    timeframes: ['1M', '3M', '6M', '1Y', 'ALL'],
    defaultTimeframe: '1Y',
    navigator: true,
});</code>
</pre>

## Styling and Themes

<div class="sidenote-wrapper">
    <p>RareCharts inherits its look from the active theme (and aligns with Rare Styles when used together). You can still override per-series colors directly, and you can tune presentation without rewriting chart logic.</p>
    <div class="sidenote">
        <p>By default, the primary vertical axis is positioned on the right. This ensures consistent alignment across the layout and contributes to a professional dashboard appearance.</p>
    </div>
    <p>Two practical defaults matter here. First, <strong>the SVG width is always 100%</strong> of the parent container. Second, height is explicit and controlled per chart instance (<code>height, default 240</code>). That combination keeps layouts stable: the chart stretches horizontally with the page, and you decide how much vertical “reading room” it gets.</p>
</div>

### Configuration

The Line chart exposes a set of options that focus on business readability: formatting, tick density, baseline clarity, end labels, crosshair inspection, and line/area styling.

### Layout and animation

`height` sets the chart height (default 240). `margin` controls the inner padding (top/right/bottom/left); by default, the right margin is wider (64) to accommodate the Y axis labels and end labels.

Animation is enabled on the first render by default (`animate: true`). You can control timing via duration (default 650 ms) and easing via `ease` (`cubicOut` by default; supported values include `cubicOut`, `cubicInOut`, `linear`). With `prefers-reduced-motion: reduce` the duration is 0. The lines draw in once per chart instance. Renders that land in the middle of it — the font load and the first resize right after `setData`, a later resize — carry the draw-in on from the share already drawn, on the new geometry, instead of starting it over.

### Y axis formatting

RareCharts can format the Y axis automatically or explicitly.

`yFormat` supports `auto` (default), `percent`, and `number`. In `auto` mode, the chart treats data as percent-like when the maximum absolute value is ≤ 1 (for example, 0.12 becomes +12.00%). If you already store values as real numbers and still happen to be below 1, you probably want to force `number` to avoid accidental percent formatting. Number ticks follow the step between them: plain numbers below 1,000 (`145 150 155 160`, `0 0.5 1`), SI prefixes from 1,000 on with one prefix for the whole axis (`0.5k 1k 1.5k`), and zero always as `0` — neighbouring ticks never print alike. End labels and tooltip values take three significant digits (`147`, `−0.6`, `1.23k`). Percents keep a sign (`+12.00%`) on the ticks, the end labels and the tooltip; a log axis labels its powers `10 100 1k`.

Zero is treated carefully: values with `|v| < zeroEpsilon` are printed as `0` (default `1e-6`). This prevents the classic “-0.00%” or “+0.00%” artifacts that make charts look broken even when the data is correct.

You can also add `yPrefix` and `ySuffix` for units. If you need full control, provide `yTickFormat: (value) => string` and ignore the automatic formatting entirely — it then formats the ticks, the end labels and the tooltip values alike.

Tick density is controlled by `yTicks` (default 4). The number is a target, not a quota: ticks fall on round 1-2-5 steps inside the data range, so the axis never stretches past the data just to fit four steps. For minimalist displays, `yLabelsOnly` can be enabled (default true), keeping the axis visually restrained.

By default, the Y axis is rendered on the right side of the chart. If your layout or design system requires a left-aligned axis, you can override this behavior by setting:

<pre class="text-content-caption"><code>yAxisPosition: 'left'</code></pre>

This moves the Y axis to the left while preserving all formatting and scaling logic.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-left-axis-demo"></div>
</div>

<h3 id="logarithmic-scale">Logarithmic scale</h3>

For long-horizon prices and indices, set `yScale: 'log'`. On a linear axis the same percentage move looks bigger the higher the series stands: the index below falls by half twice, in 2000 and in 2022, but on a linear scale the first crash is a ripple near the floor and the second a collapse. On a log scale equal percentage moves get equal height — both crashes look the same size, because they are. Switch the demo between Lin and Log to compare. Ticks fall on powers of ten (10, 100, 1k, 10k, 100k); a range narrower than two powers gets 1-2-5 steps instead (20, 50, 100). The margin above and below the data is a factor of its span rather than a share of the range, so both ends get the same room.

Zero and negative values have no place on a log scale: they are skipped (the line joins its neighbours) and the chart warns once in the console. Horizontal annotations at or below zero are dropped; an area fills down to the bottom of the plot.

The demo's Lin/Log button is built in: `scaleToggle: true` pins it to the top right of the chart header, above the Y-axis labels; timeframe buttons, when present, keep their place to its left. The button is split on the diagonal so it does not read as one more period. It names the current scale, flips it on click, and `onScaleChange(fn)` tells the page when the reader switches. The same switch works on `TimeSeries` and `DualAxes`.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-log-demo"></div>
</div>
<br>
<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart', {
    yScale: 'log',
    scaleToggle: true,  <span class="code-comment">// or { labels: { … } }</span>
});

chart.onScaleChange(({ scale }) => console.log(scale));</code></pre>

The scale can also change from code, between data swaps — for example log on the full history, linear on the last year. `setYScale()` redraws, renames the button and returns the chart, so chaining it before `setData()` changes both in one paint. Pass `{ silent: true }` to skip the event:

<pre class="text-content-caption"><code>chart.setYScale('log').setData(allHistory);
chart.setYScale('linear').setData(lastYear);</code></pre>

### X axis formatting

`xTickFormat` is a function `(date) => string`. The default format is MM/DD. For business dashboards you often want clearer labels, especially for longer ranges, for example:

<pre class="text-content-caption"><code>xTickFormat: RareCharts.d3.timeFormat('%b %d')   <span class="code-comment">// Jan 05</span>
<span class="code-comment">// or</span>
xTickFormat: RareCharts.d3.timeFormat('%Y-%m')   <span class="code-comment">// 2026-01</span></code>
</pre>

### Baseline, grid, and “relative to zero”

The chart renders a grid and a zero baseline layer. This is not a decorative choice: performance charts are usually read relative to zero, so a clear zero reference is essential. (You can still customize how the baseline looks via theme styles.)

### End labels

`endLabels` (default true) renders the last value for each series on the right edge. It is extremely useful in multi-series charts because it reduces legend-hunting: you look at the line, then you read its last value where the story ends.

If you disable it, the chart clears that layer.

### Crosshair and tooltip

`crosshair` is enabled by default. It provides a vertical tracker line, dots at the nearest points, and a tooltip.

You can override tooltip content via:

<pre class="text-content-caption"><code>tooltipFormat: ({ date, points: [{ name, series, value, color, fmt }, …] }) => html</code></pre>

If you need a plain-text tooltip, return simple HTML with minimal markup, or keep the default and let the library handle it.

### Line shape, area fills, and markers

Line interpolation is controlled by curve (default `monotone`). You can use `linear`, `basis`, `cardinal`, `step`, and other D3 curve names supported by the library. If you choose `cardinal`, you can tune the smoothing via `curveTension` (0–1, default 0).

Area under the line can be enabled globally via `area: true`. `areaOpacity` defaults to 0.12. `areaBaseline` supports `zero`, `min`, or a numeric value; the fill always ends inside the plot.

Markers (point dots) are supported via `markers` (default false), with `markerShape` (default `circle`) and `markerSize` (default 4). Markers are useful when data is sparse or you want to emphasize sampling points, but they can clutter dense series, so they’re off by default for a reason.

### Per-series overrides

In multi-series mode, you can override some style/shape settings per series, without affecting the rest. Supported per-series fields include `curve`, `strokeWidth`, `strokeDash`, `area`, `areaOpacity`, `areaBaseline`, and the marker fields: `markers`, `markerShape`, `markerSize`, `markerFill`, and `markerStroke`. This is the clean way to highlight a “main” series, or to render one series as an area while keeping others as plain lines.

### Annotations

Line charts support event markers and reference levels via the `annotations` option — vertical lines and bands for date events (halvings, releases, freeze windows), horizontal lines and bands for reference levels (break-even, KPI targets, support zones). See the dedicated <a href="/charts/line/annotations/">annotations</a> page for the full API and behavior.

## Line chart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on&nbsp;the&nbsp;<a href="/charts/settings/">Settings&nbsp;page</a>.

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
            <td><code>240</code></td>
            <td>Chart height in px. Width is always 100% of the container.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td>—</td>
            <td>
                Inner padding <code>{top, right, bottom, left}</code>.<br>
                Defaults <code>{ top: 10, right: 64, bottom: 18, left: 0 }</code>; with <code>yAxisPosition: 'left'</code> the Y axis takes a 64px gutter on the left, and the right one stays for the end labels. Hidden axes and end labels give their gutters back; annotations raise <code>top</code> to <code>annotationLabelHeight + 4</code>.
            </td>
        </tr>
        <tr>
            <td><code>yAxisPosition</code></td>
            <td><code>'right'</code> | <code>'left'</code></td>
            <td><code>'right'</code></td>
            <td>Side the Y axis is rendered on. End labels stay on the right either way.</td>
        </tr>
        <tr>
            <td><code>timeframes</code></td>
            <td>boolean | array</td>
            <td>—</td>
            <td>Built-in timeframe buttons rendered in the chart header. Pass <code>true</code> to use the default set <code>['1M', '3M', '6M', '1Y', '2Y', 'ALL']</code>, or pass a custom array of shortcuts and explicit ranges.</td>
        </tr>
        <tr>
            <td><code>defaultTimeframe</code></td>
            <td>string | object</td>
            <td>—</td>
            <td>Initial active timeframe used on first render when no explicit view has been set.</td>
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
            <td>Built-in overview strip with brush selection under the chart. Pass <code>true</code> for defaults or an object with overview options such as <code>height</code>, <code>color</code>, <code>area</code>, <code>areaColor</code>, <code>brushColor</code>, <code>margin</code> (defaults to the chart’s side margins) and <code>axis</code> (a time axis under the strip). On a multi-series chart the strip draws the first line series over the dates of all of them.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Y axis</h5></td>
        </tr>
        <tr>
            <td><code>yFormat</code></td>
            <td><code>'auto'</code> | <code>'percent'</code> | <code>'number'</code></td>
            <td><code>'auto'</code></td>
            <td>In <code>auto</code> mode, values ≤ 1 are treated as percentages. Use <code>'number'</code> to prevent accidental percent formatting.</td>
        </tr>
        <tr>
            <td><code>yTicks</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Approximate number of Y ticks. Linear ticks stay inside the data range, so the actual count follows the step.</td>
        </tr>
        <tr>
            <td><code>yScale</code></td>
            <td><code>'linear'</code> | <code>'log'</code></td>
            <td><code>'linear'</code></td>
            <td>Y scale type. <code>'log'</code>: power-of-ten ticks, multiplicative margin, values ≤ 0 skipped. Change it between data swaps with <code>setYScale()</code>.</td>
        </tr>
        <tr>
            <td><code>scaleToggle</code></td>
            <td>boolean | object</td>
            <td><code>false</code></td>
            <td>A Lin/Log button pinned to the top right of the header, above the Y-axis labels; it names the current scale and flips it. <code>true</code> or <code>{ labels: { linear, log } }</code>. Each switch fires <code>onScaleChange</code>.</td>
        </tr>
        <tr>
            <td><code>xTicks</code></td>
            <td>number</td>
            <td><code>6</code></td>
            <td>Number of X tick marks. With the default date format, a span of fewer days gets one label per midnight in view (one at its start inside a single day), so a date is never repeated.</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(value) =&gt; string</code> — overrides all automatic formatting: ticks, end labels and tooltip values. Default: ticks by their step — <code>,~f</code> below 1,000, SI <code>~s</code> (one prefix per axis) from 1,000, <code>0</code> for zero; end labels and tooltip to three significant digits (<code>.3~r</code>, <code>.3~s</code> from 1,000); percent <code>+.2%</code>; log ticks <code>.3~s</code>.</td>
        </tr>
        <tr>
            <td><code>yTickValues</code></td>
            <td>array</td>
            <td>—</td>
            <td>Explicit tick positions. Overrides <code>yTicks</code>.</td>
        </tr>
        <tr>
            <td><code>yPrefix</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Prefix added before each tick label (e.g. <code>'$'</code>).</td>
        </tr>
        <tr>
            <td><code>ySuffix</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Suffix added after each tick label (e.g. <code>'%'</code>).</td>
        </tr>
        <tr>
            <td><code>yLabelsOnly</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show only tick labels; suppress the axis line and tick marks.</td>
        </tr>
        <tr>
            <td><code>zeroEpsilon</code></td>
            <td>number</td>
            <td><code>1e-6</code></td>
            <td>Values with <code>|v|</code> below this threshold are printed as <code>0</code>. Prevents <code>+0.00%</code> artifacts.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>X axis</h5></td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>function</td>
            <td><code>'%m/%d'</code></td>
            <td><code>(date) =&gt; string</code> — controls X tick labels.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Line style</h5></td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td><code>'monotone'</code></td>
            <td>D3 curve type: <code>'linear'</code>, <code>'monotone'</code>, <code>'basis'</code>, <code>'cardinal'</code>, <code>'step'</code>, etc.</td>
        </tr>
            <tr>
            <td><code>curveTension</code></td>
            <td>number</td>
            <td><code>0</code></td>
            <td>Tension for the <code>'cardinal'</code> curve, <code>0</code>–<code>1</code>.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string | number[]</td>
            <td>—</td>
            <td>Dash pattern for every series: <code>'dashed'</code>, <code>'dotted'</code>, <code>'dashDot'</code>, <code>'longDash'</code>, or a raw <code>stroke-dasharray</code> such as <code>'4,3'</code> / <code>[4, 3]</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Area fill</h5></td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Fill the area under the lines.</td>
        </tr>
        <tr>
            <td><code>areaOpacity</code></td>
            <td>number</td>
            <td><code>0.12</code></td>
            <td>Fill opacity.</td>
        </tr>
        <tr>
            <td><code>areaBaseline</code></td>
            <td><code>'zero'</code> | <code>'min'</code> | number</td>
            <td><code>'zero'</code></td>
            <td>Where the fill ends: <code>'zero'</code> — at 0, or the bottom of the plot when every value is above 0; <code>'min'</code> — the bottom of the plot; a number — that value, kept inside the plot.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Markers</h5></td>
        </tr>
        <tr>
            <td><code>markers</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Show point markers at each data sample.</td>
        </tr>
        <tr>
            <td><code>markerShape</code></td>
            <td>string</td>
            <td><code>'circle'</code></td>
            <td>Marker shape. Supported: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'triangle'</code>, <code>'cross'</code>.</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Marker radius in px. Defaults to <code>theme.markerSize</code>.</td>
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
            <td>Show the Y (value) axis. Its side margin collapses once <code>endLabels</code> is off too — the axis and the end labels share that gutter. An explicit <code>margin</code> always wins.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>crosshair</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Vertical tracker line with dots at nearest data points and a tooltip.</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>({ date, points }) =&gt; html</code> — <code>points</code> is <code>[{ name, series, type, color, date, value, fmt }]</code>, one per series covering the hovered date (a band has <code>lower</code> and <code>upper</code> instead of <code>value</code>); <code>fmt</code> is the value already formatted. All formatters: <a href="/charts/settings/#formatter-arguments">formatter arguments</a>.</td>
        </tr>
        <tr>
            <td><code>endLabels</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Render the last value of each series at the right edge.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Annotations</h5></td>
        </tr>
        <tr>
            <td><code>annotations</code></td>
            <td>array</td>
            <td>—</td>
            <td>Event markers and reference levels. Vertical (<code>date</code>, <code>from</code>/<code>to</code>) and horizontal (<code>value</code>, <code>yFrom</code>/<code>yTo</code>) entries are mixed in the same array. See <a href="/charts/line/annotations/">Annotations</a>.</td>
        </tr>
        <tr>
            <td><code>annotationLabelHeight</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Pixels reserved above the chart for vertical annotation labels.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Animation</h5></td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Animate lines on first render. Plays only once per chart instance; a render in the middle of it (font load, resize) carries the draw-in on instead of restarting it.</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td>number</td>
            <td><code>650</code></td>
            <td>Animation duration in ms.</td>
        </tr>
        <tr>
            <td><code>ease</code></td>
            <td>string</td>
            <td><code>'cubicOut'</code></td>
            <td>Easing: <code>'cubicOut'</code>, <code>'cubicInOut'</code>, <code>'linear'</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Single-series shortcuts</h5>
                <p>These only apply when data is passed as a flat <code>[{date, value}]</code> array:</p>
            </td>
        </tr>
        <tr>
            <td><code>seriesName</code></td>
            <td>string</td>
            <td><code>'Series'</code></td>
            <td>Series name shown in the crosshair tooltip.</td>
        </tr>
        <tr>
            <td><code>lineColor</code></td>
            <td>CSS color</td>
            <td>theme accent</td>
            <td>Line color.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Per-series overrides (multi-series)</h5>
                <p>Each series object in the data array can include these fields to override global settings:</p>
            </td>
        </tr>
        <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td><code>'Series N'</code></td>
            <td>Series name — shown in the tooltip; also the key that keeps a series’ line in place on setData. The header legend is the separate <code>legend</code> option.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>theme palette</td>
            <td>Series line color.</td>
        </tr>
        <tr>
            <td><code>strokeWidth</code></td>
            <td>number</td>
            <td><code>2</code></td>
            <td>Line thickness in px. Defaults to <code>theme.strokeWidth</code>.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string</td>
            <td>—</td>
            <td>SVG dash pattern for this series only.</td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td>global <code>curve</code></td>
            <td>Curve type override for this series.</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean</td>
            <td>global <code>area</code></td>
            <td>Fill area under this series.</td>
        </tr>
        <tr>
            <td><code>areaOpacity</code></td>
            <td>number</td>
            <td>global <code>areaOpacity</code></td>
            <td>Area fill opacity for this series.</td>
        </tr>
        <tr>
            <td><code>areaBaseline</code></td>
            <td>string | number</td>
            <td>global <code>areaBaseline</code></td>
            <td>Area baseline for this series.</td>
        </tr>
        <tr>
            <td><code>markers</code></td>
            <td>boolean</td>
            <td>global <code>markers</code></td>
            <td>Point markers on this series; <code>false</code> hides them when the global <code>markers</code> is on.</td>
        </tr>
        <tr>
            <td><code>markerShape</code></td>
            <td>string</td>
            <td>global <code>markerShape</code></td>
            <td>Marker shape: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'triangle'</code>, <code>'cross'</code>.</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td>number</td>
            <td>global <code>markerSize</code></td>
            <td>Marker radius in px.</td>
        </tr>
        <tr>
            <td><code>markerFill</code></td>
            <td>CSS color</td>
            <td>series <code>color</code></td>
            <td>Marker fill color.</td>
        </tr>
        <tr>
            <td><code>markerStroke</code></td>
            <td>CSS color</td>
            <td>theme background</td>
            <td>Marker outline color.</td>
        </tr>
        <tr>
            <td><code>values</code></td>
            <td>array</td>
            <td>—</td>
            <td><code>[{date, value}, ...]</code> — the data points.</td>
        </tr>
    </tbody>
</table>
</div>

<div class="teaser-bottom">
    <p>Next:</p>
    <h3><a href="/charts/line/visual-options/">Detailed visual options examples</a></h3>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-performance.js"></script>
<script src="/assets/charts/examples/line/line-chart-performance-left-axis.js"></script>
<script src="/assets/charts/examples/line/line-chart-log-scale.js"></script>
