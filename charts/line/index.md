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

<pre><code>chart.setData([
    { date: '2026-01-01', value: 1.00 },
    { date: '2026-01-02', value: 2.5 },
    { date: '2026-01-03', value: -0.6 },
]);</code>
</pre>

When you pass data like this, the library will use options.seriesName (default: "Series") and options.lineColor (default: theme accent) to build the internal series object.

**Multi-series format**

<pre><code>chart.setData([
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

### Styling and Themes

RareCharts inherits its look from the active theme (and aligns with Rare Styles when used together). You can still override per-series colors directly, and you can tune presentation without rewriting chart logic.

Two practical defaults matter here. First, the **SVG width is always 100%** of the parent container. Second, height is explicit and controlled per chart instance (`height, default 240`). That combination keeps layouts stable: the chart stretches horizontally with the page, and you decide how much vertical “reading room” it gets.

### Configuration

The Line chart exposes a set of options that focus on business readability: formatting, tick density, baseline clarity, end labels, crosshair inspection, and line/area styling.

### Layout and animation

`height` sets the chart height (default 240). `margin` controls the inner padding (top/right/bottom/left); by default, the right margin is wider (60) to accommodate the Y axis labels.

Animation is enabled on the first render by default (`animate: true`). You can control timing via duration (default 650 ms) and easing via `ease` (`cubicOut` by default; supported values include `cubicOut`, `cubicInOut`, `linear`).

### Y axis formatting

RareCharts can format the Y axis automatically or explicitly.

`yFormat` supports `auto` (default), `percent`, and `number`. In `auto` mode, the chart treats data as percent-like when the maximum absolute value is ≤ 1 (for example, 0.12 becomes 12%). If you already store values as “real numbers” and still happen to be below 1, you probably want to force `number` to avoid accidental percent formatting.

Zero is treated carefully: values with `|v| < zeroEpsilon` are printed as `zero` (default `1e-6`). This is there to stop the classic “-0.00%” or “+0.00%” nonsense that makes charts look haunted.

You can also add `yPrefix` and `ySuffix` for units. If you need full control, provide `yTickFormat: (value) => string` and ignore all of the above.

Tick density is controlled by `yTicks` (default 4). For minimalist displays, `yLabelsOnly` can be enabled (default true), keeping the right axis clean.

### X axis formatting

`xTickFormat` is a function `(date) => string`. The default format is MM/DD. For business dashboards you often want clearer labels, especially for longer ranges, for example:

<pre><code>xTickFormat: d3.timeFormat('%b %d')   // Jan 05
// or
xTickFormat: d3.timeFormat('%Y-%m')   // 2026-01
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

<pre><code>tooltipFormat: ({ date, points: [{ name, value, color }, …] }) => html</code></pre>

If you need a plain-text tooltip, return simple HTML with minimal markup, or keep the default and let the library handle it.

### Line shape, area fills, and markers

Line interpolation is controlled by curve (default `monotone`). You can use `linear`, `basis`, `cardinal`, `step`, and other D3 curve names supported by the library. If you choose `cardinal`, you can tune the smoothing via `curveTension` (0.1, default 0).

Area under the line can be enabled globally via `area: true`. `areaOpacity` defaults to 0.12. `areaBaseline` supports `zero`, `min`, or a numeric value.

Markers (point dots) are supported via `markers` (default false), with `markerShape` (default `circle`) and `markerSize` (default 4). Markers are useful when data is sparse or you want to emphasize sampling points, but they can clutter dense series, so they’re off by default for a reason.

### Per-series overrides

In multi-series mode, you can override some style/shape settings per series, without affecting the rest. Supported per-series fields include `curve`, `strokeWidth`, `area`, `areaOpacity`, and `areaBaseline`. This is the clean way to highlight a “main” series, or to render one series as an area while keeping others as plain lines.

### What’s covered next

This section describes the core behavior and configuration surface of the Line chart. Detailed examples (performance charts, percent vs number pitfalls, custom tick formatters, tooltip templates, and style presets) belong in the next subsections, where we can show realistic datasets and the exact options used to render them.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-performance.js"></script>