---
layout: page.njk
title: "Dual Axes Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/dual-axes/'
---

Sometimes you need to plot two things on the same timeline that simply do not belong to the same scale. Revenue and headcount. Inflation and GDP. Price and spread. If you force them onto one axis, one series becomes unreadable, and the chart turns into a polite lie.

A dual-axis chart solves this by keeping a shared X axis (time) while providing two independent Y axes, so each metric is shown in its natural units. The goal is not to pretend the metrics are comparable. The goal is to compare when they move and how their dynamics relate.

In RareCharts, `DualAxes` is exactly that: a time-based chart with two vertical scales.

To illustrate a real-world use case, this example uses a finance-native story: a convergence (arbitrage) strategy based on the idea that two similar instruments that temporarily diverged in price will later converge again.

<div class="text-content-caption card-dashboard-bordered">
    <div id="dual-chart-ltcm-treasuries"></div>
</div>

One concrete version of this story exists in government bonds, where a newly issued “on-the-run” Treasury can trade slightly richer than the previous “off-the-run” issue for a period of time. Traders may position for convergence by going long the cheaper issue and hedging the richer one, expecting the price gap to compress as the market normalizes.

In the chart, the right axis (Y1) shows the price index of the two instruments over time. The left axis (Y2) shows the spread between them. Prices and spread are different categories, so they get different axes. The chart stays readable, and the relationship stays visible.

### Axis behavior and formatting

Both axes are configured independently. You can set titles (`y1Title`, `y2Title`), control tick formatting (`y1TickFormat`, `y2TickFormat`), and, when needed, override the visible ranges (`y1Domain`, `y2Domain`) to keep the chart stable and comparable across screenshots, reports, or multiple panels.

Axis titles are meant to be terse units (`PRICE`, `N · K HLX`). A title that would run past its axis margin is trimmed with an ellipsis — measured by rendered width, so a short label that fits is left alone — with the full text on hover and a one-time console hint. Set `axisTitleMaxLength` to cap it explicitly, or widen `margin` if you need more room.

In this example, the spread axis uses a signed format and treats very small values as clean zero, so you do not get the infamous +0.00 noise that makes charts look broken even when the data is fine. That is also the default `y2TickFormat`: a sign, two decimals, and a plain `0` near zero.

### Logarithmic scale

Each axis has its own scale: `y1Scale` and `y2Scale` take `'linear'` (default) or `'log'`, and `setYScale(type, { axis })` switches `'y1'`, `'y2'` or `'both'`. `scaleToggle` adds a Lin/Log button pinned to the top right of the header, above the Y-axis labels; `onScaleChange(fn)` reports every switch. A worked example — a long-horizon index on a log Y1 next to a signed yearly change on Y2 — is on the <a href="/charts/combined/#logarithmic-scale">Combined</a> page.

### Interaction

Dual Axes supports cursor inspection through a crosshair and a tooltip. The tooltip is fully customizable through `tooltipFormat: ({ date, points }) => html`, so you can present values in your product’s language instead of whatever generic tooltip someone thought was “good enough”.

### Built-in timeframe controls

Because `DualAxes` is inherently time-based, it can also render the shared timeframe switcher in its own chart header:

<pre class="text-content-caption"><code>const chart = new RareCharts.DualAxes('#chart', {
    timeframes: true,
    defaultTimeframe: '1Y',
});

chart.setData(series);</code></pre>

Available pieces:

- `timeframes` renders the built-in range buttons in the chart header.
- `defaultTimeframe` selects the initial visible range and active button.
- `navigator: true` renders the built-in overview strip with a brush under the main chart.
- `setView([start, end])` sets any custom visible date window.
- `getView()` returns the currently visible `[start, end]`.
- `setTimeframe(key, { silent })` selects a timeframe from code, as a button click does.
- `onViewChange(fn)` calls `fn([start, end])` (Dates, clamped to the data; a window entirely outside the data is passed as given) after every view change — a button, the end of a navigator drag, `setTimeframe()` or `setView()` — unless that call passed `{ silent: true }`, so external UI stays synchronized.
- `scaleToggle` adds a Lin/Log button, pinned right in the same header row, above the Y-axis labels (see Logarithmic scale above).

Example:

<pre class="text-content-caption"><code>const chart = new RareCharts.DualAxes('#chart', {
    timeframes: true,
    defaultTimeframe: '1Y',
    navigator: true,
});</code></pre>

Dual-axis charts are often implemented as a hack: two scales, mismatched formatting, confusing labels, and tooltips that quietly mix units. This component exists to make the dual-axis case predictable, explicit, and safe for real reporting: independent scales, consistent structure, and controlled formatting.

### Annotations

DualAxes supports the full annotation API — vertical date markers (point and range) and horizontal reference levels (line and band) on either Y axis. Horizontal entries take an explicit `axis: 'y1' | 'y2'` so the value is mapped to the correct scale. See the dedicated <a href="/charts/line/annotations/">annotations</a> page for the full API.

<h2 id="options-reference">Dual Axes chart options</h2>

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

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
            <td><code>280</code></td>
            <td>Chart height in px, the whole card: title, legend, timeframe buttons, navigator and footer come out of it, and the plot gets what is left. On a narrow card they wrap and take more, so leave the plot room.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td><code>{10, 64, 18, 64}</code></td>
            <td>
                Inner padding <code>{top, right, bottom, left}</code>.<br>
                Right and left default to <code>64</code> to give both axes room; a hidden axis collapses its side (see <code>showY1Axis</code>, <code>showY2Axis</code>, <code>showXAxis</code>). Top grows to <code>30</code> with <code>y1Title</code> or <code>y2Title</code>, and to <code>annotationLabelHeight + 4</code> with <code>annotations</code>.<br>
                Each side you set explicitly wins — <code>margin.top</code> too.
            </td>
        </tr>
        <tr>
            <td><code>xPad</code></td>
            <td>number</td>
            <td><code>8</code></td>
            <td>
                Gap in px between the plot edge and the outermost mark on both ends of the X scale.<br>
                With bars, the scale is inset by half the widest bar or cluster, so the first and last bars are drawn whole and <code>xPad</code> is the gap to their outer edge; lines start and end at the bar centres.
            </td>
        </tr>
        <tr>
            <td><code>timeframes</code></td>
            <td>boolean | array</td>
            <td>—</td>
            <td>Built-in timeframe buttons rendered in the chart header. Pass <code>true</code> to use the default set <code>['1M', '3M', '6M', '1Y', '2Y', 'ALL']</code>, or pass a custom array.</td>
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
            <td>Initial visible date range as <code>[from, to]</code>. An explicit alternative to <code>defaultTimeframe</code>; clamped to the data extent.</td>
        </tr>
        <tr>
            <td><code>navigator</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>Built-in overview strip with brush selection under the chart. Pass <code>true</code> for defaults or an object with overview options. The strip draws the first line series (or the first series when all are bars); its brush spans every series.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Right axis — Y1</h5>
                <p>Y1 is drawn on the <strong>right</strong> side.</p>
            </td>
        </tr>
        <tr>
            <td><code>y1Domain</code></td>
            <td><code>[min, max]</code></td>
            <td>auto</td>
            <td>
                Override the Y1 scale domain — used as given, not rounded. On a log axis it needs <code>0 &lt; min &lt; max</code>; otherwise the auto domain is used.<br>
                Useful for keeping charts comparable across snapshots.
            </td>
        </tr>
        <tr>
            <td><code>y1Scale</code></td>
            <td><code>'linear'</code> | <code>'log'</code></td>
            <td><code>'linear'</code></td>
            <td>Y1 scale type. <code>'log'</code>: power-of-ten ticks, multiplicative margin, values ≤ 0 on Y1 skipped, bars from the bottom of the axis. Switch with <code>setYScale(type, { axis: 'y1' })</code>.</td>
        </tr>
        <tr>
            <td><code>y1Ticks</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Approximate tick count on Y1 — d3 picks round steps; a log axis uses powers of ten. The auto domain is rounded to the same count, so more ticks hug the data closer (<code>y1Ticks: 10</code> on 12…87 gives 10…90, not 0…100).</td>
        </tr>
        <tr>
            <td><code>y1TickFormat</code></td>
            <td>function</td>
            <td><code>,.2f</code> (log: <code>.3~s</code>)</td>
            <td><code>(value) =&gt; string</code> — Y1 tick labels, also used for the Y1 end labels and tooltip values.</td>
        </tr>
        <tr>
            <td><code>y1LabelsOnly</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show only tick labels; suppress the axis line.</td>
        </tr>
        <tr>
            <td><code>y1Title</code></td>
            <td>string</td>
            <td>—</td>
            <td>Axis title, rendered along the right edge.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Left axis — Y2</h5>
                <p>Y2 is drawn on the <strong>left</strong> side. Grid lines and the zero baseline are keyed to Y2.</p>
            </td>
        </tr>
        <tr>
            <td><code>y2Domain</code></td>
            <td><code>[min, max]</code></td>
            <td>auto</td>
            <td>Override the Y2 scale domain — used as given, not rounded. On a log axis it needs <code>0 &lt; min &lt; max</code>; otherwise the auto domain is used.</td>
        </tr>
        <tr>
            <td><code>y2Scale</code></td>
            <td><code>'linear'</code> | <code>'log'</code></td>
            <td><code>'linear'</code></td>
            <td>Y2 scale type. <code>'log'</code>: power-of-ten ticks, multiplicative margin, values ≤ 0 on Y2 skipped, bars from the bottom of the axis. Switch with <code>setYScale(type, { axis: 'y2' })</code>.</td>
        </tr>
        <tr>
            <td><code>y2Ticks</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Approximate tick count on Y2 — d3 picks round steps; a log axis uses powers of ten. The auto domain is rounded to the same count.</td>
        </tr>
        <tr>
            <td><code>y2TickFormat</code></td>
            <td>function</td>
            <td><code>+.2f</code>, <code>0</code> near zero (log: <code>.3~s</code>)</td>
            <td><code>(value) =&gt; string</code> — Y2 tick labels, also used for the Y2 end labels and tooltip values.</td>
        </tr>
        <tr>
            <td><code>y2LabelsOnly</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show only tick labels; suppress the axis line.</td>
        </tr>
        <tr>
            <td><code>y2Title</code></td>
            <td>string</td>
            <td>—</td>
            <td>Axis title, rendered along the left edge.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>X axis</h5></td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>function</td>
            <td><code>'%m/%d'</code></td>
            <td><code>(date) =&gt; string</code> — X tick labels. With the default format a view of a few days gets at most one tick per day, so a date is never repeated.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Lines</h5></td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td><code>'linear'</code></td>
            <td>D3 curve type for line series: <code>'linear'</code>, <code>'monotone'</code>, <code>'step'</code>, etc.</td>
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
            <td>SVG <code>stroke-dasharray</code> applied to all line series globally.</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Fill area under line series.</td>
        </tr>
        <tr>
            <td><code>areaOpacity</code></td>
            <td>number</td>
            <td><code>0.12</code></td>
            <td>Area fill opacity.</td>
        </tr>
        <tr>
            <td><code>areaBaseline</code></td>
            <td><code>'zero'</code> | <code>'min'</code> | number</td>
            <td><code>'zero'</code></td>
            <td>Area baseline anchor.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Bars</h5></td>
        </tr>
        <tr>
            <td><code>barOpacity</code></td>
            <td>number</td>
            <td>theme <code>barOpacity</code> (<code>0.35</code>)</td>
            <td>Bar fill opacity. Falls back to the theme’s <code>barOpacity</code>.</td>
        </tr>
        <tr>
            <td><code>barWidth</code></td>
            <td>number</td>
            <td>—</td>
            <td>
                Bar width in px for every bar series; with <code>'cluster'</code>, the width of each bar. Overrides <code>barWidthRatio</code>; a series' own <code>barWidth</code> overrides it.<br>
                Capped at the smallest gap between bar dates: an overlapping bar is cut to it, a cluster is narrowed to fit it, so neighbours touch but never overlap. Anything that is not a positive number is ignored.
            </td>
        </tr>
        <tr>
            <td><code>barWidthRatio</code></td>
            <td>number</td>
            <td><code>0.65</code></td>
            <td>Bar width as a fraction of the smallest gap between bar dates (the whole cluster with <code>'cluster'</code>). Ignored when <code>barWidth</code> is set.</td>
        </tr>
        <tr>
            <td><code>barGrouping</code></td>
            <td><code>'overlap'</code> | <code>'cluster'</code></td>
            <td><code>'overlap'</code></td>
            <td>How multiple bar series are arranged. <code>'overlap'</code> centres every bar on its date; <code>'cluster'</code> places them side by side, each at its own width, the group centred on the date.</td>
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
            <td><code>showY1Axis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the Y1 axis on the right. The right margin collapses once <code>endLabels</code> is off and no <code>y1Title</code> is set — they all share that gutter. An explicit <code>margin</code> always wins.</td>
        </tr>
        <tr>
            <td><code>showY2Axis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the Y2 axis on the left. The left margin collapses unless a <code>y2Title</code> is set.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>End labels and markers</h5></td>
        </tr>
        <tr>
            <td><code>endLabels</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show the last value of each line series on <code>endLabelsAxis</code> at the right edge (bar series are not labelled).</td>
        </tr>
        <tr>
            <td><code>endLabelsAxis</code></td>
            <td><code>'y1'</code> | <code>'y2'</code></td>
            <td><code>'y1'</code></td>
            <td>Which axis’s line series get end labels; they are placed and formatted on that axis. With the default <code>'y1'</code>, Y2 series have none.</td>
        </tr>
        <tr>
            <td><code>markers</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Point markers at each data sample on line series.</td>
        </tr>
        <tr>
            <td><code>markerShape</code></td>
            <td>string</td>
            <td><code>'circle'</code></td>
            <td>Marker shape: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'triangle'</code>, <code>'cross'</code>.</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td>number</td>
            <td>theme <code>markerSize</code> (<code>4</code>)</td>
            <td>Marker radius in px. Falls back to the theme’s <code>markerSize</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>scaleToggle</code></td>
            <td>boolean | <code>'y1'</code> | <code>'y2'</code> | <code>'both'</code> | object</td>
            <td><code>false</code></td>
            <td>A Lin/Log button pinned to the top right of the header, above the Y-axis labels; it names the current scale and flips it. <code>true</code> drives Y1, <code>'y2'</code> the left axis, <code>'both'</code> both; or <code>{ axis, labels: { linear, log } }</code>. Each switch fires <code>onScaleChange({ scale, axis })</code>.</td>
        </tr>
        <tr>
            <td><code>crosshair</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Vertical tracker with dots at data points and a tooltip on hover.</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td>
                <code>({ date, points }) =&gt; html</code> — where
                <code>points</code> is <code>[{ name, series, axis, type, color, date, value, fmt }]</code>, one per series covering the hovered date; <code>fmt</code> is the value through that axis’s tick format. All formatters: <a href="/charts/settings/#formatter-arguments">formatter arguments</a>.
            </td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Annotations</h5></td>
        </tr>
        <tr>
            <td><code>annotations</code></td>
            <td>array</td>
            <td>—</td>
            <td>Event markers and reference levels. Horizontal entries accept <code>axis: 'y1' | 'y2'</code> to choose the scale. See <a href="/charts/line/annotations/">Annotations</a>.</td>
        </tr>
        <tr>
            <td><code>annotationLabelHeight</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Pixels reserved above the chart for vertical annotation labels (top margin <code>annotationLabelHeight + 4</code>); an explicit <code>margin.top</code> wins.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Animation</h5></td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Animate on first render, once per chart instance: lines draw in, bars grow. A render in the middle of it (font load, resize) carries the motion on to the new geometry instead of restarting it.</td>
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
                <h5>Per-series fields</h5>
                <p>Each object in the series array passed to <code>setData()</code>:</p>
            </td>
        </tr>
        <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td><code>'Series N'</code></td>
            <td>Series name — shown in the tooltip (the legend is not built from series; pass <code>legend</code>). Also the key that matches lines and bars across <code>setData</code>, so keep names unique.</td>
        </tr>
        <tr>
            <td><code>axis</code></td>
            <td><code>'y1'</code> | <code>'y2'</code></td>
            <td><code>'y1'</code></td>
            <td>Which Y axis to plot against.</td>
        </tr>
        <tr>
            <td><code>type</code></td>
            <td><code>'line'</code> | <code>'bar'</code></td>
            <td><code>'line'</code></td>
            <td>Rendering type for this series.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>theme palette</td>
            <td>Series color.</td>
        </tr>
        <tr>
            <td><code>barWidth</code></td>
            <td>number</td>
            <td>chart <code>barWidth</code></td>
            <td>Bar width in px for this series (bars only). Overrides the chart-level <code>barWidth</code>; an invalid value falls back to it.</td>
        </tr>
        <tr>
            <td><code>strokeWidth</code></td>
            <td>number</td>
            <td>theme <code>strokeWidth</code> (<code>2</code>)</td>
            <td>Line thickness in px (lines only).</td>
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
            <td>Curve override for this series.</td>
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
            <td>Per-series area opacity.</td>
        </tr>
        <tr>
            <td><code>areaBaseline</code></td>
            <td>string | number</td>
            <td>global <code>areaBaseline</code></td>
            <td>Per-series area baseline.</td>
        </tr>
        <tr>
            <td><code>markers</code></td>
            <td>boolean</td>
            <td>global <code>markers</code></td>
            <td>Point markers on this series (lines only); <code>false</code> hides them when the global <code>markers</code> is on.</td>
        </tr>
        <tr>
            <td><code>markerShape</code></td>
            <td>string</td>
            <td>global <code>markerShape</code></td>
            <td>Marker shape (lines only): <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'triangle'</code>, <code>'cross'</code>.</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td>number</td>
            <td>global <code>markerSize</code></td>
            <td>Marker radius in px (lines only).</td>
        </tr>
        <tr>
            <td><code>markerFill</code></td>
            <td>CSS color</td>
            <td>series <code>color</code></td>
            <td>Marker fill color (lines only).</td>
        </tr>
        <tr>
            <td><code>markerStroke</code></td>
            <td>CSS color</td>
            <td>theme background</td>
            <td>Marker outline color (lines only).</td>
        </tr>
        <tr>
            <td><code>values</code></td>
            <td>array</td>
            <td>—</td>
            <td><code>[{date, value}, ...]</code> — the data points; a point with a missing value (<code>null</code>, <code>''</code>) is dropped.</td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/dual-axes/dual-axes-chart-ltcm-treasuries.js"></script>
