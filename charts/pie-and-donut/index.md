---
layout: page.njk
title: "Pie and Donut Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/pie-and-donut/'
---

In RareCharts, Pie and Donut are the same chart. There is no separate “Pie” implementation with a different personality. A pie chart is simply a donut chart with innerRadius: 0.

That means you get one consistent API, one set of options, and predictable behavior across both variants. The only choice you make is whether you want a solid disk (pie) or a ring with a center area (donut).

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-pie"></div>
</div>

A pie chart is a blunt instrument: it answers “how is the total split” when there are only a few categories and the differences are obvious. It breaks down quickly when slices are similar in size, when there are many categories, or when the reader needs precision.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-donut"></div>
</div>

A donut chart keeps the same “share of total” idea, but the center gives you a place to put something useful: total, headline number, or a short label. That is why donut is usually the better default in dashboards, where charts rarely live alone and context matters.

### Data format

Both Pie and Donut use the same data structure:
<pre><code>[
  { label: 'Subscriptions', value: 42000, color: '#00c97a' },
  { label: 'Services',      value: 18000 },
  { label: 'Other',         value:  6000 }
]</code></pre>

Only positive finite values are rendered. Zero and negative values are filtered out. This is intentional: “<strong>negative share of total</strong>” is a different chart.

Colors can be provided per item. If you omit them, the chart uses the active theme palette.

The one option that defines Pie vs Donut is that `innerRadius` controls the hole size as a fraction of the outer radius.
- `innerRadius: 0` gives you a Pie
- `innerRadius: 0.58` (default) gives you a Donut

<pre><code>new RareCharts.Donut('#chart', {
  innerRadius: 0.58
}).setData(data);</code></pre>

Yes, the class name is `Donut`. No, we are not renaming it just to satisfy semantic purists. Your codebase has enough problems already.

### Slice geometry and readability

The chart supports spacing and rounding that make slices readable in real UI:
- `padAngle` controls the gap between slices (a small default keeps separation without turning the chart into a flower).
- `cornerRadius` rounds slice corners (subtle by default, slightly tighter for pie).

Hover interaction expands the hovered slice slightly outward, and a tooltip shows label, value, and percent. Tooltip content can be fully customized via `tooltipFormat ({ label, value, percent, color }) => html`.

### Labels and the “too many slices” problem

Outer labels can be enabled with `showLabels: true`. Labels include the category name and percent, but the chart intentionally hides tiny slices by default (below ~4%) to avoid turning the perimeter into unreadable noise.

This is not censorship. It’s layout reality.

If you need every slice labeled, it usually means you should be using a table, or you should reduce categories (group the tail into “Other”).

### Center content (Donut)

Donut mode can render center content:
- `showCenter` (default: true for donut)
- `centerText` can be a string or a function `(data) => string`
- `centerLabel` is the smaller secondary line (default: “Total”)

By default, the chart computes the total and prints it in the center using the numeric font, which works well for dashboard summaries.


<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/pie-and-donut/pie-and-donut.js"></script>