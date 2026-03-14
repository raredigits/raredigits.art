---
layout: page.njk
title: "Multi Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/multi/'
---

`MultiChart` combines two to four charts inside a single block with a shared title, subtitle, legend, and source footer. Each panel is an independent chart instance — `Line`, `Bar`, or any other type — arranged in a CSS grid.

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-market-overview"></div>
</div>

### Usage

<pre class="text-content-caption"><code>new RareCharts.MultiChart('#container', {
  title:    'A Selloff Takes Shape',
  subtitle: 'Selling intensified on the second day of trading',
  source:   'Bloomberg',
  columns:  2,         // 1 – 4 columns
  chartHeight: 200,    // height of each cell in px

  charts: [
    {
      type:  'Line',
      title: 'Brent Crude',
      data:  brentData,
      options: { yPrefix: '$', lineColor: '#00aaff' },
    },
    {
      type:  'Line',
      title: 'DXY Dollar Index',
      data:  dxyData,
    },
    {
      type:  'Bar',
      title: 'Monthly Volumes',
      data:  volumeData,
      options: { barColor: '#00aaff' },
    },
  ],
});</code></pre>

Each child chart is accessible via `mc.charts[index]` after construction, so individual panels can be updated independently:

<pre class="text-content-caption"><code>mc.charts[0].setData(newBrentData);</code></pre>

Or update all panels in a single call:

<pre class="text-content-caption"><code>mc.setData([brentData, dxyData, ftseData, volumeData]);</code></pre>

### Responsive layout

MultiChart automatically switches to a single column when the container width reaches the breakpoint (default 480 px). No extra configuration needed — on desktop you get two columns, on mobile everything stacks vertically.

Use `mobileOptions` on any chart descriptor to override that panel's options when the narrow layout is active. The most common use case is restoring hidden Y-axis labels on panels that suppressed them in the side-by-side view:

<pre class="text-content-caption"><code>{
  type: 'Bar',
  title: 'Women',
  options: {
    showYAxis: false,   // hidden on desktop — Men chart already shows the labels
    margin: { left: 0 },
  },
  mobileOptions: {
    showYAxis: true,    // restored on mobile — chart stands alone
    margin: { left: 100 },
  },
}</code></pre>

Side-by-side horizontal bar charts are a natural fit for group comparisons where labels are shared. Suppress the Y axis on panels after the first to keep things clean:

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-coding-experience"></div>
</div>

When you need a third panel, the `span` field on a chart descriptor stretches that cell across all grid columns — a clean way to place a summary chart above two detail panels:

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-developer-survey"></div>
</div>

## MultiChart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="4"><h5>Layout</h5></td>
        </tr>
        <tr>
            <td><code>columns</code></td>
            <td>1–4</td>
            <td><code>2</code></td>
            <td>Number of grid columns on desktop.</td>
        </tr>
        <tr>
            <td><code>mobileColumns</code></td>
            <td>number</td>
            <td><code>1</code></td>
            <td>Column count when the container is at or below <code>mobileBreakpoint</code>.</td>
        </tr>
        <tr>
            <td><code>mobileBreakpoint</code></td>
            <td>number</td>
            <td><code>480</code></td>
            <td>Container width in px at which the grid switches to <code>mobileColumns</code>.</td>
        </tr>
        <tr>
            <td><code>chartHeight</code></td>
            <td>number</td>
            <td><code>200</code></td>
            <td>Height of each chart cell in px.</td>
        </tr>
        <tr>
            <td><code>gap</code></td>
            <td>number | string</td>
            <td><code>--space-lg</code></td>
            <td>Grid gap between cells — a px number or any CSS value.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Charts</h5></td>
        </tr>
        <tr>
            <td><code>charts</code></td>
            <td>array</td>
            <td><code>[]</code></td>
            <td>Array of chart descriptor objects — see table below.</td>
        </tr>
    </tbody>
</table>

### Chart descriptor fields

Each object in the `charts` array defines one panel:

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
        <tr>
            <td><code>type</code></td>
            <td><code>'Line'</code> | <code>'Bar'</code></td>
            <td><code>'Line'</code></td>
            <td>Chart class to instantiate for this cell.</td>
        </tr>
        <tr>
            <td><code>title</code></td>
            <td>string</td>
            <td>—</td>
            <td>Label shown above the cell in small uppercase.</td>
        </tr>
        <tr>
            <td><code>span</code></td>
            <td>number</td>
            <td>—</td>
            <td>Column span for this cell. Set to the number of grid columns (e.g. <code>span: 2</code>) to stretch it full width.</td>
        </tr>
        <tr>
            <td><code>data</code></td>
            <td>array</td>
            <td>—</td>
            <td>Passed to <code>setData()</code> immediately after construction.</td>
        </tr>
        <tr>
            <td><code>options</code></td>
            <td>object</td>
            <td>—</td>
            <td>Forwarded to the child chart constructor. All standard <code>Line</code> and <code>Bar</code> options apply.</td>
        </tr>
        <tr>
            <td><code>mobileOptions</code></td>
            <td>object</td>
            <td>—</td>
            <td>Merged over <code>options</code> when the container is at or below <code>mobileBreakpoint</code>. Restored to <code>options</code> values when the container widens again. Supports all the same keys as <code>options</code>, including <code>margin</code>.</td>
        </tr>
    </tbody>
</table>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-market-overview.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-coding-experience.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-developer-survey.js"></script>
