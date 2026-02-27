---
layout: page.njk
title: "Line Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/time-series/'
---

<!-- ── Header ─────────────────────── -->
<div class="line-chart-price-header">
    <div>
        <span class="ticker">RARE</span>
        <span class="price"  id="hd-price">—</span>
        <span class="change" id="hd-change">—</span>
    </div>
    <!-- ── Range buttons ──────────────── -->
    <div class="line-chart-price-range-bar" id="rangeBar">
        <button class="range-btn" data-range="1M">1M</button>
        <button class="range-btn" data-range="3M">3M</button>
        <button class="range-btn" data-range="6M">6M</button>
        <button class="range-btn active" data-range="1Y">1Y</button>
        <button class="range-btn" data-range="2Y">2Y</button>
        <button class="range-btn" data-range="ALL">ALL</button>
    </div>
</div>

<!-- ── Main chart ─────────────────── -->
<div class="line-chart-price-chart" id="mainChart"></div>

<!-- ── Overview ───────────────────── -->
<div class="line-chart-price-overview" id="overview"></div>

<!-- ── Stats ─────────────────────── -->
<div class="line-chart-price-stats">
  <div><div class="stat-label">OPEN</div> <div class="stat-value" id="s-open">—</div></div>
  <div><div class="stat-label">HIGH</div> <div class="stat-value" id="s-high">—</div></div>
  <div><div class="stat-label">LOW</div> <div class="stat-value" id="s-low">—</div></div>
  <div><div class="stat-label">VOLUME</div> <div class="stat-value" id="s-vol">—</div></div>
  <div><div class="stat-label">52W HIGH</div> <div class="stat-value" id="s-52h">—</div></div>
  <div><div class="stat-label">52W LOW</div> <div class="stat-value" id="s-52l">—</div></div>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-price.js"></script>