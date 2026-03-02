---
layout: page.njk
title: "Line Chart Visual Options"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/visual-options/'
---

Line charts are not only about data. They are also about how that data is read. The same numbers can look stable, volatile, aggressive, or conservative depending on curve interpolation, stroke style, area fill and point markers.

This demo exposes the core visual options available in Line. Instead of listing them abstractly, it allows you to toggle them and see how the chart reacts in real time.

<div id="rc-demo-root"></div>

### Curve

The curve option controls interpolation between points. Interpolation changes the perceived smoothness and direction of movement. Available values:

- `linear` connects points directly. It is honest and mechanical.

- `monotone` smooths transitions without creating artificial overshoots. It is usually a safe default for performance charts.

- `basis` and `cardinal` introduce more smoothing. They can make a series look more fluid, but also less precise.

- `step`, `stepBefore`, and `stepAfter` are useful when values represent discrete changes rather than continuous movement.

### On Smoothing and Visual Honesty

Smoothing is powerful. It can make a volatile series look readable. It can also make it look calmer than it actually is.

Curves like basis or cardinal interpolate between points and may introduce shapes that were not present in the original data. This is not an error — it is mathematics. But it does change perception. A sharp drawdown can become a soft dip. A sudden jump can become a gradual slope.

If your chart represents precise financial performance, risk metrics, or operational events, prefer linear or monotone. They preserve the direction of movement without inventing additional curvature.

Use stronger smoothing only when you are visualizing long-term tendencies and individual point accuracy is less important than overall structure.

A chart is not just a visual object. It is an argument. The interpolation method becomes part of that argument.

Choose it consciously.

### Stroke Style

The `strokeDash` option controls line pattern: `null` (`solid`) | `dashed` | `dotted` | `dashDot` | `longDash`

This is useful when color alone is not enough to differentiate series, or when you want to emphasize one line without changing its weight.

### Area Fill

The area option enables fill under the line. This can be useful for highlighting magnitude rather than only direction.

When enabled, the baseline can be controlled via areaBaseline:

- `zero` — fill relative to zero
- `min` — fill relative to the minimum visible value

Opacity is controlled via `areaOpacity`.

Example:
<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  area: true,
  areaBaseline: 'zero',
  areaOpacity: 0.12
}).setData(series);</code></pre>

Area fill is powerful, but it changes the visual weight of the series. In multi-series comparisons, use it deliberately.

### Markers

Markers highlight individual data points. They are disabled by default because dense time series do not need extra noise.

When enabled:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  markers: true,
  markerShape: 'diamond',  <span class="code-comment">// available: circle | square | diamond | triangle | cross</span>
  markerSize: 4
}).setData(series);</code></pre>

Markers are useful when data is sparse, exact sampling points matter and the chart is presented statically (e.g. in a PDF). They are usually unnecessary for dense daily or intraday data.

### Combined Usage

All visual options can be combined. The demo above regenerates the chart and shows the corresponding configuration snippet. This mirrors how the library is typically used: you define options once, pass data, and let the chart instance handle rendering.

### Notes on Formatting

In the example, the Y axis uses a custom formatter:

<pre class="text-content-caption"><code>yTickFormat: v => (v >= 0 ? '+' : '') + v.toFixed(1)</code></pre>

This is intentional. In performance-style charts, sign clarity matters. The library allows full control over tick formatting so you can enforce business-specific conventions without rewriting rendering logic.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-lines-options.js"></script>