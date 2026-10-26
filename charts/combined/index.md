---
layout: page.njk
title: "Combined Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/combined/'
---

Combined charts in RareCharts do not require a separate class. They are built on top of `DualAxes`, which provides two vertical scales and allows each series to define its own rendering type. This makes it a natural foundation for mixing lines and bars within the same time-based chart.

To create a combined chart, you only need to specify the `type` for a particular series. All other series remain lines by default.

<pre class="text-content-caption card-dashboard-bordered"><code>{
    name: 'Spread',
    axis: 'y2',
    type: 'bar',            <span class="code-comment">// switch this series to bar</span>
    color: '#000000',
    values: dates.map((dt, i) => ({ date: dt, value: spread[i] })),
}</code></pre>

The result is a combined chart where lines and bars coexist on the same timeline:

<div class="card text-content-caption card-dashboard-bordered">
    <div id="dual-chart-ltcm-treasuries-combined"></div>
</div>

Each series explicitly declares two things: which axis it belongs to (`y1` or `y2`) and how it should be rendered (`line` or `bar`). By design, Y1 is the right axis and Y2 is the left. You can mix any number of series in any configuration — multiple lines on one axis, multiple bars on the other, or both combined.

Per-series visual overrides continue to work exactly as in `DualAxes`. For example:

<pre class="text-content-caption card-dashboard-bordered"><code>{
    name:        'Forecast',
    axis:        'y1',
    type:        'line',
    color:       '#00c97a',
    strokeDash:  'dashed',    <span class="code-comment">// dashed line</span>
    strokeWidth: 1.5,
    area:        true,        <span class="code-comment">// fill under the line</span>
    markers:     true,        <span class="code-comment">// point markers</span>
    markerShape: 'diamond',
    values: [...],
}</code></pre>

All standard DualAxes capabilities remain available in combined mode. This includes independent axis formatting (`y1TickFormat`, `y2TickFormat`), custom domains (`y1Domain`, `y2Domain`), axis titles, crosshair interaction, tooltips, end labels, bar grouping (`overlap` or `cluster`), bar width (`barWidth`, `barWidthRatio`), and curve interpolation for line series.

If you only need bars and do not require a second scale, assign all series to `y1` and set `showY2Axis: false`. `DualAxes` calculates the domain from the Y1 series; without that option the left axis is still drawn, repeats the Y1 range and labels it with the signed Y2 format (+100.00). Hidden, it gives its gutter back unless `y2Title` is set.

Bars take their width from `barWidthRatio`, a share of the smallest gap between bar dates, or in px from `barWidth`: on the chart for every bar series, or on one series for that series alone. With `barGrouping: 'cluster'`, `barWidth` is the width of each bar, and the cluster is their sum, centred on the date:

<pre class="text-content-caption card-dashboard-bordered"><code>new RareCharts.DualAxes('#chart', {
    barGrouping: 'cluster',
    barWidth:    6,                   <span class="code-comment">// each bar of the cluster</span>
}).setData([
    { name: 'Revenue', type: 'bar', barWidth: 10, values: [...] },   <span class="code-comment">// this series only</span>
    { name: 'Costs',   type: 'bar', values: [...] },
    { name: 'Margin',  type: 'line', axis: 'y2', values: [...] },
]);</code></pre>

A width too large for the space between dates is cut to it, so neighbouring bars and clusters touch but never overlap. The time scale is inset by half the widest bar or cluster: the first and last bars are drawn whole, and the lines start and end at the bar centres.

<h3 id="logarithmic-scale">Logarithmic scale</h3>

Each axis has its own scale: `y1Scale` and `y2Scale` take `'linear'` (default) or `'log'`. A long-horizon index on Y1 reads honestly on a log axis — equal percentage moves get equal height — while a signed change on Y2 stays linear, because a log axis has no zero. A log axis follows the same rules as on <a href="/charts/line/#logarithmic-scale">Line</a>: ticks on powers of ten (1-2-5 steps for a narrower range), a margin that is a factor of the data's span, zero and negative values on that axis skipped with one console warning, horizontal annotations at or below zero dropped. Bars on a log axis grow from the bottom of the axis instead of from zero.

`scaleToggle` adds a Lin/Log button pinned to the top right of the chart header, above the Y-axis labels — level with the timeframe buttons, which keep their place; it names the current scale and flips it on click. `true` drives Y1 — the right axis, usually the level or index — `'y2'` the left one, `'both'` both together (the button then reads Log while either axis is log). From code, `setYScale(type, { axis })` switches `'y1'`, `'y2'` or `'both'` (the default), and `onScaleChange(fn)` reports every switch as `{ scale, axis }` — except a `setYScale(…, { silent: true })`. In the demo the button drives Y1 only; the yearly change on Y2 stays linear.

<div class="text-content-caption card-dashboard-bordered">
    <div id="combined-chart-log-scale"></div>
</div>
<br>
<pre class="text-content-caption"><code>const chart = new RareCharts.DualAxes('#chart', {
    y1Scale: 'log',
    scaleToggle: true,  <span class="code-comment">// Y1; or 'y2', 'both'</span>
});

chart.setYScale('linear', { axis: 'y1' });
chart.onScaleChange(e => console.log(e.axis, e.scale));</code></pre>

## Combined chart options

Combined charts are <code>DualAxes</code> — all chart-level options are identical. See the full list on the <a href="/charts/line/dual-axes/#options-reference">Dual Axes</a> page.

### Per-series fields

The only thing that makes a chart “combined” is the <code>type</code> field on each series object:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
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
            <td>
                Which Y axis this series plots against.<br>
                Y1 is right, Y2 is left.
            </td>
        </tr>
        <tr>
            <td><code>type</code></td>
            <td><code>'line'</code> | <code>'bar'</code></td>
            <td><code>'line'</code></td>
            <td>
                <strong>The key field.</strong><br>
                Set to <code>'bar'</code> to render this series as bars instead of a line.
            </td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>theme palette</td>
            <td>Series color — applies to both lines and bars.</td>
        </tr>
        <tr>
            <td><code>barWidth</code></td>
            <td>number</td>
            <td>chart <code>barWidth</code></td>
            <td>
                Bar width in px for this series (bars only); in a cluster, the width of this series' bar.<br>
                Overrides the chart-level <code>barWidth</code> and <code>barWidthRatio</code>; an invalid value falls back to them.
            </td>
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
            <td>
                SVG <code>stroke-dasharray</code> for this series (lines only).<br>
                E.g. <code>'dashed'</code>, <code>'4,3'</code>.
            </td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td>global <code>curve</code></td>
            <td>Curve type override for this series (lines only).</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td>boolean</td>
            <td>global <code>area</code></td>
            <td>Fill area under this series (lines only).</td>
        </tr>
        <tr>
            <td><code>areaOpacity</code></td>
            <td>number</td>
            <td>global <code>areaOpacity</code></td>
            <td>Per-series area opacity (lines only).</td>
        </tr>
        <tr>
            <td><code>areaBaseline</code></td>
            <td>string | number</td>
            <td>global <code>areaBaseline</code></td>
            <td>Area baseline anchor (lines only).</td>
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
            <td>
                <code>[{date, value}, ...]</code> — the data points; a point with a missing value (<code>null</code>, <code>''</code>) is dropped.
            </td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/line-chart-ltcm-treasuries-combined.js"></script>
<script src="/assets/charts/examples/combined/combined-chart-log-scale.js"></script>