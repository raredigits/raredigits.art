---
layout: page.njk
title: "Combined Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/combined/'
---

Combined charts in RareCharts do not require a separate class. They are built on top of `DualAxes`, which provides two vertical scales and allows each series to define its own rendering type. This makes it a natural foundation for mixing lines and bars within the same time-based chart.

To create a combined chart, you only need to specify the `type` for a particular series. All other series remain lines by default.

<pre><code>{
    name: 'Spread',
    axis: 'y2',
    type: 'bar',            // switch this series to bar
    color: '#000000',
    values: dates.map((dt, i) => ({ date: dt, value: spread[i] })),
}</code></pre>

The result is a combined chart where lines and bars coexist on the same timeline:

<div class="text-content-caption card-dashboard-bordered">
    <div id="dual-chart-ltcm-treasuries-combined"></div>
</div>

Each series explicitly declares two things: which axis it belongs to (`y1` or `y2`) and how it should be rendered (`line` or `bar`). By design, Y1 is the right axis and Y2 is the left. You can mix any number of series in any configuration — multiple lines on one axis, multiple bars on the other, or both combined.

Per-series visual overrides continue to work exactly as in `DualAxes`. For example:

<pre><code>{
    name:        'Forecast',
    axis:        'y1',
    type:        'line',
    color:       '#00c97a',
    strokeDash:  'dashed',    // dashed line
    strokeWidth: 1.5,
    area:        true,        // fill under the line
    markers:     true,        // point markers
    markerShape: 'diamond',
    values: [...],
}</code></pre>

All standard DualAxes capabilities remain available in combined mode. This includes independent axis formatting (`y1TickFormat`, `y2TickFormat`), custom domains (`y1Domain`, `y2Domain`), axis titles, crosshair interaction, tooltips, end labels, bar grouping (`overlap` or `cluster`), and curve interpolation for line series.

If you only need bars and do not require a second scale, simply assign all series to `y1` and omit `y2TickFormat`. `DualAxes` will automatically calculate the appropriate domain for the active axis.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/combined/line-chart-ltcm-treasuries-combined.js"></script>