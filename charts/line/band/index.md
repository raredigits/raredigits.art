---
layout: page.njk
title: "Bands"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/band/'
---

<spn class="meta-info">/examples/line/line-chart-band.js</spn>

A band is a filled ribbon between a lower and an upper value at each point on the X axis. Where an ordinary line answers “what is the number”, a band answers “how sure are we about it”. That makes it the natural shape for confidence intervals, forecast cones, min/max envelopes, and error ranges — anywhere a single line would overstate precision.

In RareCharts a band is just another series in a `Line` chart. You mark a series with `type: 'band'` and give each point a `lower` and an `upper` instead of a `value`. The band renders behind the lines, so a central estimate drawn as a normal line sits cleanly on top of its own range.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-demo-band"></div>
</div>

### Data format

A band series carries `{ date, lower, upper }` points. It mixes freely with ordinary line series in the same `setData` call — order matters only for layering, and bands are always drawn behind lines regardless.

<pre class="text-content-caption"><code>chart.setData([
    {
        name: 'Confidence range',
        type: 'band',
        color: '#00aaff',
        fillOpacity: 0.15,
        values: [
            { date: '2025-01-01', lower: 86,  upper: 114 },
            { date: '2025-02-01', lower: 101, upper: 135 },
            { date: '2025-03-01', lower: 96,  upper: 128 },
        ],
    },
    {
        name: 'Estimate',
        color: '#00aaff',
        values: [
            { date: '2025-01-01', value: 100 },
            { date: '2025-02-01', value: 118 },
            { date: '2025-03-01', value: 112 },
        ],
    },
]);</code>
</pre>

A series is treated as a band when it has `type: 'band'`, or when its first point contains both `lower` and `upper`. Dates are parsed via `parseDate (…)`, so strings, timestamps, and Date objects are all accepted.

### How bands behave

A band sits behind the lines but stays part of the readout:

- drawn behind every line and area, above the grid
- **reported on hover as a range** — the crosshair tooltip shows `lower – upper` at the cursor date (e.g. `P10–P90: $1.95M – $3.65M`), so you can read the interval without estimating it by eye
- no crosshair dot — a band has two edges and no single point, so a dot would be ambiguous; markers and end labels skip it for the same reason
- a series is only reported where its data actually exists, so a forecast band stays silent over the historical region instead of snapping to its first point
- both `lower` and `upper` participate in the Y scale, so the axis always grows to contain the full range

The fill uses the series `color` at `fillOpacity` (default `0.16`). Because it is a translucent fill of the same hue, a band reads correctly on both light and dark themes without any per-theme tuning.

### Forecasts

The most common use is a forecast: actuals up to today, a central path beyond it, and a widening range that makes the growing uncertainty visible instead of pretending the future is a single number.

<div class="text-content-caption card-dashboard-bordered">
    <div id="line-chart-demo-forecast"></div>
</div>

This chart is assembled from three series plus one annotation:

- a **band** series for the P10–P90 range, with zero width at the anchor date so it fans out from the last actual
- a solid line for the **actuals** (history)
- a dashed line for the **P50** central path, starting at the same anchor so the two lines connect
- a vertical [annotation](/charts/line/annotations/) marking the forecast cut-over

<div class="air-md"></div>

<pre class="text-content-caption"><code>const FCAST = '#00aaff';

new RareCharts.Line('#chart', {
    curve: 'monotone',
    endLabels: false,                 // series end at different x — right-edge labels would mislead
    annotations: [
        { date: '2024-06-01', label: 'Forecast →', color: FCAST, strokeDash: '4,3' },
    ],
}).setData([
    { name: 'P10–P90 range', type: 'band', color: FCAST, fillOpacity: 0.16, values: band },
    { name: 'Actuals',        color: '#00aaff', strokeWidth: 2.5, values: actuals },
    { name: 'Forecast (P50)', color: FCAST, strokeDash: '5,4', values: p50 },
]);</code>
</pre>

<div class="sidenote-wrapper">
    <p>The convention here is the standard one for forecasts: a single hue throughout, the past drawn solid, the future continuing dashed, and the cone shaded in the same color. Anchoring both the band and the P50 line on the last actual point (<code>2024-06-01</code>) keeps the hand-off seamless — no gap, no jump.</p>
    <div class="sidenote">
        <p>A band only needs the two boundaries you already compute. If your model emits quantiles, map the outer pair to <code>lower</code>/<code>upper</code> and pass the median as an ordinary line.</p>
    </div>
    <p>When everything shares one color, the legend has to carry the distinction. Set `type` on each legend entry so its swatch matches what is on screen — a solid rule, a dashed rule, or a filled square:</p>
</div>

<pre class="text-content-caption"><code>legend: [
    { label: 'Actuals',        color: '#00aaff' },                   <span class="code-comment">// solid line</span>
    { label: 'Forecast (P50)', color: '#00aaff', type: 'dashed' },   <span class="code-comment">// dashed line</span>
    { label: 'P10–P90 range',  color: '#00aaff', type: 'band' },     <span class="code-comment">// filled square</span>
]</code>
</pre>

Stacking several bands — for example P10–P90 around an inner P25–P75 — is just two band series with different opacities. Draw the wider, lighter range first so the tighter one reads on top.

## Band series options

A band is configured entirely through fields on its series object. It shares the common chart options (`title`, `subtitle`, `legend`, `legendPosition`, `source`, `theme`) documented on the [Settings](/charts/settings/) page, and lives inside a standard [Line](/charts/line/) chart, so all of that chart’s axis and layout options apply too.

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
        <tr class="table-section">
            <td colspan="4"><h5>Band series</h5></td>
        </tr>
        <tr>
            <td><code>type</code></td>
            <td><code>'band'</code></td>
            <td>—</td>
            <td>Marks the series as a band. Optional when each point already has <code>lower</code> and <code>upper</code>.</td>
        </tr>
        <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td><code>'Series N'</code></td>
            <td>Series name — used to key the rendered band.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>theme palette</td>
            <td>Fill color of the ribbon.</td>
        </tr>
        <tr>
            <td><code>fillOpacity</code></td>
            <td>number</td>
            <td><code>0.16</code></td>
            <td>Opacity of the fill. Falls back to <code>areaOpacity</code> if set, then to the chart default.</td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td>string</td>
            <td>global <code>curve</code></td>
            <td>Curve type for the band edges, e.g. <code>'monotone'</code>, <code>'linear'</code>, <code>'step'</code>.</td>
        </tr>
        <tr>
            <td><code>values</code></td>
            <td>array</td>
            <td>—</td>
            <td><code>[{ date, lower, upper }, ...]</code> — the lower and upper bound at each point.</td>
        </tr>
    </tbody>
</table>

<div class="teaser-bottom">
    <p>Related:</p>
    <h3><a href="/charts/line/annotations/">Annotations — reference levels and event markers</a></h3>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-band.js"></script>
<script src="/assets/charts/examples/line/line-chart-forecast.js"></script>
