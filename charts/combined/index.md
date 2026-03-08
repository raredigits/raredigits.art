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

All standard DualAxes capabilities remain available in combined mode. This includes independent axis formatting (`y1TickFormat`, `y2TickFormat`), custom domains (`y1Domain`, `y2Domain`), axis titles, crosshair interaction, tooltips, end labels, bar grouping (`overlap` or `cluster`), and curve interpolation for line series.

If you only need bars and do not require a second scale, simply assign all series to `y1` and omit `y2TickFormat`. `DualAxes` will automatically calculate the appropriate domain for the active axis.

## Combined chart options

Combined charts are <code>DualAxes</code> — all chart-level options are identical. See the full list on the <a href="/charts/dual-axes/#options-reference">Dual Axes</a> page.

### Per-series fields

The only thing that makes a chart “combined” is the <code>type</code> field on each series object:

<table class="table-bordered card-caption">
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
            <td>Series name — appears in legend and tooltip.</td>
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
            <td><code>strokeWidth</code></td>
            <td>number</td>
            <td><code>2</code></td>
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
            <td><code>values</code></td>
            <td>array</td>
            <td>—</td>
            <td>
                <code>[{date, value}, ...]</code> — the data points.
            </td>
        </tr>
    </tbody>
</table>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/line-chart-ltcm-treasuries-combined.js"></script>