---
layout: page.njk
title: "Time Series"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/time-series/'
---

<spn class="meta-info">/examples/line/line-chart-time-series.js</spn>

The Time Series chart is built for price-like data: long sequences, frequent updates, and the kind of “read the move” workflow where you do not want to zoom with your brain. It combines a main chart for detailed inspection with a compact overview chart that acts as a timeline navigator.

The main job of Time Series chart is to make long histories readable and to make navigation trivial: you should be able to focus on the last month, the last year, or “everything” without re-rendering the page or rebuilding the chart.

<div>
  <!-- ── Header ─────────────────────── -->
  <div class="price-chart-header">
      <div>
          <span class="price-chart-ticker">RARE</span>
          <span class="price-chart-price"  id="hd-price">—</span>
          <span class="price-chart-change" id="hd-change">—</span>
      </div>
      <!-- ── Range buttons ──────────────── -->
      <div class="price-chart-range-bar" id="rangeBar">
          <button class="range-btn" data-range="1M">1M</button>
          <button class="range-btn" data-range="3M">3M</button>
          <button class="range-btn" data-range="6M">6M</button>
          <button class="range-btn active" data-range="1Y">1Y</button>
          <button class="range-btn" data-range="2Y">2Y</button>
          <button class="range-btn" data-range="ALL">ALL</button>
      </div>
  </div>
  
  <!-- ── Main chart ─────────────────── -->
  <div class="rc-chart" id="mainChart"></div>
  
  <!-- ── Overview ───────────────────── -->
  <div class="rc-chart" id="overview"></div>
  
  <!-- ── Stats ─────────────────────── -->
  <div class="card-row-bordered price-chart-stats">
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">OPEN</div>
      <div class="price-chart-stat-value" id="s-open">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">HIGH</div>
      <div class="price-chart-stat-value" id="s-high">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">LOW</div>
      <div class="price-chart-stat-value" id="s-low">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">VOLUME</div>
      <div class="price-chart-stat-value" id="s-vol">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">52W HIGH</div>
      <div class="price-chart-stat-value" id="s-52h">—</div>
    </div>
    <div class="card-row-bordered-item price-chart-stat">
      <div class="price-chart-stat-label">52W LOW</div>
      <div class="price-chart-stat-value" id="s-52l">—</div>
    </div>
  </div>
</div>

<div class="air-md"></div>

The chart also supports business-style formatting and presentation: clear positive/negative color logic, compact numeric formats for volume, and tooltips that can show more than one number without turning into a tooltip novel.

### Anatomy of the example

The demo is composed of three connected parts.

The first is a main Time Series chart. It renders the selected time window and provides precise inspection via a tooltip that follows the cursor.

The second is an Overview chart under the main chart. It renders the full history in a compressed form and exposes a brush selection. Dragging or resizing the brush changes the main chart’s view. Likewise, changes in the main chart (for example, when you pick a range) update the brush, so both stay synchronized.

The third is a range button bar (1M / 3M / 6M / 1Y / 2Y / ALL) demonstrates that the chart view is an explicit concept (`setView`) and can be controlled programmatically, which matters when your view range is driven by application state or user preferences.

### Tooltip as a template, not a default

This example uses a custom `tooltipFormat` that returns HTML. It shows date, price, and daily change in both absolute and percent terms, and it also prints volume in a compact format. The important point is that tooltips are treated as a rendering layer you control, so you can match your product language and data semantics.

### Programmatic control of the view

The main chart exposes setView ([start, end]), and the overview exposes a brush that can be driven via `setBrush ([start, end])`. In this demo, the initial state is “last year”, but the same mechanism supports deep-linking, saved presets, and state persistence across page reloads.

This is the kind of thing that separates “a chart” from “a chart component”.

Time Series is an example of how RareCharts scales from simple chart primitives to composed, business-ready chart modules. You still work with the same core principles (explicit options, explicit data, consistent styling), but you get a higher-level component that solves a real workflow: navigating history, inspecting values, and presenting context around the chart.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-time-series.js"></script>
