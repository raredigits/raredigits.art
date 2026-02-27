---
layout: page.njk
title: "Bar Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/'
---

Bar charts are the simplest and most reliable way to compare things. If you have categories and numbers, and you want people to understand the difference between them without decoding a visual puzzle, you use bars. Revenue by month. Product sales. Survey answers. Demographics. Anything where the question is basically “how much?” or “which one is bigger?”

The strength of a bar chart is that it relies on length. Humans are very good at comparing lengths. Longer bar means bigger value. Shorter bar means smaller value. No interpretation layer, no storytelling tricks. Just comparison.

There are two types: vertical and horizontal.

Vertical bar charts are the classic version. Categories sit on the X axis, values on the Y axis, and bars grow upward. This works well when labels are short — months, quarters, small names — and when the order of categories matters, for example over time.

<div>
    <div id="bar-chart-revenue"></div>
</div>

Horizontal bar charts are often more practical. Categories sit on the Y axis, values on the X axis, and bars grow from left to right. This layout gives more space to long labels and is especially useful when you are comparing named groups, survey responses, or ranked items. If your labels are longer than a couple of words, horizontal bars usually feel cleaner and easier to read.

<div class="text-content-width">
    <div id="bar-chart-coder-gender"></div>
</div>

Each chart can be configured locally without changing the global theme. You can switch the orientation, control the height and margins, and truncate long category labels with an ellipsis while still showing the full text in a tooltip. Axis values can be formatted with custom functions, or simply extended with a prefix or suffix like “$” or “%”.

You can also override the bar color for a single chart, without touching the rest of the system. For horizontal charts, you can display numeric values directly at the end of each bar, with control over formatting and placement, so users don’t have to hover to see the numbers.

Animation is optional and subtle. Bars can rise into place or slide in from the left on first render. It’s there to make the chart feel alive, not to distract from the data.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-revenue.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-coder-gender.js"></script>