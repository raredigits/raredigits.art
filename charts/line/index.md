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

<pre class="text-content-caption"><code>chart.setData([
    { date: '2026-01-01', value: 1.00 },
    { date: '2026-01-02', value: 2.5 },
    { date: '2026-01-03', value: -0.6 },
]);</code>
</pre>

When you pass data like this, the library will use options.seriesName (default: "Series") and options.lineColor (default: theme accent) to build the internal series object.

**Multi-series format**

<pre class="text-content-caption"><code>chart.setData([
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

Dates are parsed via `parseDate (…)`, so strings, timestamps, and Date objects are accepted as long as they can be converted to a valid date.

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

`height` sets the chart height (default 240). `margin` controls the inner padding (top/right/bottom/left); by default, the right margin is wider (60) to accommodate the Y axis labels.

Animation is enabled on the first render by default (`animate: true`). You can control timing via duration (default 650 ms) and easing via `ease` (`cubicOut` by default; supported values include `cubicOut`, `cubicInOut`, `linear`).

### Y axis formatting

RareCharts can format the Y axis automatically or explicitly.

`yFormat` supports `auto` (default), `percent`, and `number`. In `auto` mode, the chart treats data as percent-like when the maximum absolute value is ≤ 1 (for example, 0.12 becomes 12%). If you already store values as real numbers and still happen to be below 1, you probably want to force `number` to avoid accidental percent formatting.

Zero is treated carefully: values with `|v| < zeroEpsilon` are printed as `0` (default `1e-6`). This prevents the classic “-0.00%” or “+0.00%” artifacts that make charts look broken even when the data is correct.

You can also add `yPrefix` and `ySuffix` for units. If you need full control, provide `yTickFormat: (value) => string` and ignore the automatic formatting entirely.

Tick density is controlled by `yTicks` (default 4). For minimalist displays, `yLabelsOnly` can be enabled (default true), keeping the axis visually restrained.

By default, the Y axis is rendered on the right side of the chart. If your layout or design system requires a left-aligned axis, you can override this behavior by setting:

<pre class="text-content-caption"><code>yAxisPosition: 'left'</code></pre>

This moves the Y axis to the left while preserving all formatting and scaling logic.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-left-axis-demo"></div>
</div>

### X axis formatting

`xTickFormat` is a function `(date) => string`. The default format is MM/DD. For business dashboards you often want clearer labels, especially for longer ranges, for example:

<pre class="text-content-caption"><code>xTickFormat: d3.timeFormat('%b %d')   <span class="code-comment">// Jan 05</span>
// or
xTickFormat: d3.timeFormat('%Y-%m')   <span class="code-comment">// 2026-01</span>
]);</code>
</pre>

### Baseline, grid, and “relative to zero”

The chart renders a grid and a zero baseline layer. This is not a decorative choice: performance charts are usually read relative to zero, so a clear zero reference is essential. (You can still customize how the baseline looks via theme styles.)

### End labels

`endLabels` (default true) renders the last value for each series on the right edge. It is extremely useful in multi-series charts because it reduces legend-hunting: you look at the line, then you read its last value where the story ends.

If you disable it, the chart clears that layer.

### Crosshair and tooltip

`crosshair` is enabled by default. It provides a vertical tracker line, dots at the nearest points, and a tooltip.

You can override tooltip content via:

<pre class="text-content-caption"><code>tooltipFormat: ({ date, points: [{ name, value, color }, …] }) => html</code></pre>

If you need a plain-text tooltip, return simple HTML with minimal markup, or keep the default and let the library handle it.

### Line shape, area fills, and markers

Line interpolation is controlled by curve (default `monotone`). You can use `linear`, `basis`, `cardinal`, `step`, and other D3 curve names supported by the library. If you choose `cardinal`, you can tune the smoothing via `curveTension` (0.1, default 0).

Area under the line can be enabled globally via `area: true`. `areaOpacity` defaults to 0.12. `areaBaseline` supports `zero`, `min`, or a numeric value.

Markers (point dots) are supported via `markers` (default false), with `markerShape` (default `circle`) and `markerSize` (default 4). Markers are useful when data is sparse or you want to emphasize sampling points, but they can clutter dense series, so they’re off by default for a reason.

### Per-series overrides

In multi-series mode, you can override some style/shape settings per series, without affecting the rest. Supported per-series fields include `curve`, `strokeWidth`, `area`, `areaOpacity`, and `areaBaseline`. This is the clean way to highlight a “main” series, or to render one series as an area while keeping others as plain lines.

## Line chart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>theme</code>) are documented on&nbsp;the&nbsp;<a href="/charts/settings/">Settings&nbsp;page</a>.

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
            <td><code>240</code></td>
            <td>Chart height in px. Width is always 100% of the container.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td>—</td>
            <td>
                Inner padding <code>{top, right, bottom, left}</code>.<br>
                Right defaults to <code>60</code> (Y axis on right) or <code>0</code> (Y axis on left).
            </td>
        </tr>
        <tr>
            <td><code>yAxisPosition</code></td>
            <td><code>'right'</code> | <code>'left'</code></td>
            <td><code>'right'</code></td>
            <td>Side the Y axis is rendered on.</td>
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
            <td>Number of Y tick marks.</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(value) =&gt; string</code> — overrides all automatic formatting.</td>
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
            <td>string</td>
            <td>—</td>
            <td>SVG <code>stroke-dasharray</code> applied to all series globally (e.g. <code>'4,3'</code>).</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Area fill</h5></td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Fill the area under the line (s).</td>
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
            <td>Where the fill anchors — bottom of chart, minimum data value, or a fixed Y value.</td>
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
            <td>Marker shape. Supported: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>.</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Marker radius in px.</td>
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
            <td>Show the X (date) axis at the bottom.</td>
        </tr>
        <tr>
            <td><code>showYAxis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the Y (value) axis.</td>
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
            <td><code>({ date, points }) =&gt; html</code> — where <code>points</code> is <code>[{name, value, color}]</code>.</td>
        </tr>
        <tr>
            <td><code>endLabels</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Render the last value of each series at the right edge.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Animation</h5></td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Animate lines on first render. Plays only once per chart instance.</td>
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
            <td>Label used in the tooltip and end label.</td>
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
            <td>Series name — appears in tooltip and legend.</td>
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
            <td>Line thickness in px.</td>
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
            <td><code>values</code></td>
            <td>array</td>
            <td>—</td>
            <td><code>[{date, value}, ...]</code> — the data points.</td>
        </tr>
    </tbody>
</table>

<div class="teaser-bottom">
    <p>Next:</p>
    <h3><a href="/charts/line/visual-options/">Detailed visual options examples</a></h3>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-performance.js"></script>
<script src="/assets/charts/examples/line/line-chart-performance-left-axis.js"></script>