---
layout: page.njk
title: "Dual Axes Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/dual-axes/'
---

Sometimes you need to plot two things on the same timeline that simply do not belong to the same scale. Revenue and headcount. Inflation and GDP. Price and spread. If you force them onto one axis, one series becomes unreadable, and the chart turns into a polite lie.

A dual-axis chart solves this by keeping a shared X axis (time) while providing two independent Y axes, so each metric is shown in its natural units. The goal is not to pretend the metrics are comparable. The goal is to compare when they move and how their dynamics relate.

In RareCharts, DualAxes is exactly that: a time-based chart with two vertical scales.

To illustrate a real-world use case, this example uses a finance-native story: a convergence (arbitrage) strategy based on the idea that two similar instruments that temporarily diverged in price will later converge again.

<div class="text-content-caption card-dashboard-bordered">
    <div id="dual-chart-ltcm-treasuries"></div>
</div>

One concrete version of this story exists in government bonds, where a newly issued “on-the-run” Treasury can trade slightly richer than the previous “off-the-run” issue for a period of time. Traders may position for convergence by going long the cheaper issue and hedging the richer one, expecting the price gap to compress as the market normalizes.

In the chart, the right axis (Y1) shows the price index of the two instruments over time. The left axis (Y2) shows the spread between them. Prices and spread are different categories, so they get different axes. The chart stays readable, and the relationship stays visible.

### Axis behavior and formatting

Both axes are configured independently. You can set titles (`y1Title`, `y2Title`), control tick formatting (`y1TickFormat`, `y2TickFormat`), and, when needed, override the visible ranges (`y1Domain`, `y2Domain`) to keep the chart stable and comparable across screenshots, reports, or multiple panels.

In this example, the spread axis uses a signed format and treats very small values as clean zero, so you do not get the infamous +0.00 noise that makes charts look broken even when the data is fine.

### Interaction

Dual Axes supports cursor inspection through a crosshair and a tooltip. The tooltip is fully customizable through `tooltipFormat ({ date, points })`, so you can present values in your product’s language instead of whatever generic tooltip someone thought was “good enough”.

Dual-axis charts are often implemented as a hack: two scales, mismatched formatting, confusing labels, and tooltips that quietly mix units. This component exists to make the dual-axis case predictable, explicit, and safe for real reporting: independent scales, consistent structure, and controlled formatting.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/dual-axes/dual-axes-chart-ltcm-treasuries.js"></script>