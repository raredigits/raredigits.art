---
layout: page.njk
title: "Bar Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/'
---

Bar charts are the simplest and most reliable way to compare things. If you have categories and numbers, and you want people to understand the difference between them without decoding a visual puzzle, you use bars. Revenue by month. Product sales. Survey answers. Demographics. Anything where the question is basically “how much?” or “which one is bigger?”

The strength of a bar chart is that it relies on length. Humans are very good at comparing lengths. Longer bar means bigger value. Shorter bar means smaller value. No interpretation layer, no storytelling tricks. Just comparison.

<div>
    <div id="bar-chart-revenue"></div>
</div>

Orientation and reading comfort

The Bar chart supports two orientations: `vertical` (default) and `horizontal`. Vertical bars work well for short labels and compact comparisons. Horizontal bars are usually the better default when labels are long or when you want the chart to read like a ranked list.

In horizontal mode, the category axis is on the left and values run along the bottom. In vertical mode, categories sit at the bottom and values are on the right, which matches how most business dashboards place numeric scales.

<div class="text-content-width">
    <div id="bar-chart-coder-gender"></div>
</div>

### Data format

Bar expects a simple dataset:
<pre><code>[
    { label: 'Sales', value: 128000 },
    { label: 'Marketing', value: 76000 },
    { label: 'R&D', value: 154000 }
]</code></pre>

The library treats label as the category key, so it is used for scale domain, tick labels, and join keys during updates.

### Long labels (without ruining the axis)

Real category labels are rarely “A, B, C”. They are usually “Dubai Marina - Contract Renewals (Enterprise)”. For that, Bar supports `labelMaxLength`, which truncates the rendered axis label to a fixed number of characters and adds an ellipsis. Importantly, the full label remains available via tooltip when the label was truncated, so you do not lose information, you just stop the axis from turning into a paragraph.

This is one of those details you only miss when you do not have it.

### Value formatting and units

In vertical mode, the Y axis uses `yTickFormat`. If you do not provide it, Bar falls back to a compact number formatter and supports `yPrefix` and `ySuffix` for units.

In horizontal mode, the X axis uses `xTickFormat` (again, compact by default). If your values are money, percentages, or mixed units, pass explicit formatters. The chart will not guess what your business means by “1.2”.

Tooltips can be customized via `tooltipFormat (d) => html`, where `d` is `{ label, value }`. By default it shows the label and the value with comma formatting.

### Showing values on bars (horizontal)

Horizontal bars have an optional “value labels” mode, because this is where it is actually useful. When enabled (`showValues: true`), the chart prints numeric labels at bar ends and automatically flips them inside the bar if there is not enough space near the right edge. This behavior is controlled by `valueInsideGap`, with spacing controlled by `valueOffset`, and the text itself by `valueFormat`.

This solves a classic annoyance: value labels that collide with the container edge or become unreadable when bars are short.

### Animation (if you must)

Bar can animate on first render (`animate: true` by default). The timing is controlled by duration, per-bar delay by stagger, and easing via `ease` (`cubicOut`, `cubicInOut`, or `linear`). The chart only animates once per instance by design, so it does not turn normal updates into a circus.

### Options summary (what you can pass)

Bar supports the following options in its constructor. They are all optional.

- Orientation and labels: `orientation`, `labelMaxLength`
- Color and motion: `barColor`, `animate`, `duration`, `stagger`, `ease`
- Horizontal value labels: `showValues`, `valueFormat`, `valueOffset`, `valueInsideGap`
- Formatting: `yTickFormat`, `yPrefix`, `ySuffix`, `xTickFormat`, `tooltipFormat`
- Layout: `height`, `margin` (with smart defaults depending on orientation)

Example:
<pre><code>new RareCharts.Bar('#chart', {
  orientation: 'horizontal',
  height: 260,
  labelMaxLength: 18,
  showValues: true,
  valueFormat: d => d3.format(',.0f')(d.value),
  xTickFormat: d => d3.format('.2s')(d),
}).setData(data);</code></pre>


<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-revenue.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-coder-gender.js"></script>