---
layout: page.njk
title: "Multi Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/multi/'
---

`MultiChart` combines two to four charts inside a single block with a shared title, subtitle, legend, and source footer. Each panel is an independent chart instance — a `Line` or a `Bar` — arranged in a CSS grid.

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-market-overview"></div>
</div>

### Usage

<pre class="text-content-caption"><code>const mc = new RareCharts.MultiChart('#container', {
  title:    'A Selloff Takes Shape',
  subtitle: 'Selling intensified on the second day of trading',
  source:   'Source: Bloomberg',
  columns:  2,         // 1 – 4 columns
  chartHeight: 200,    // height of each chart in px

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

Each child chart is accessible via `mc.charts[index]` after construction, so individual panels can be updated independently — either way the grid keeps the panel’s last data for a rebuild at the breakpoint (see below):

<pre class="text-content-caption"><code>mc.charts[0].setData(newBrentData);</code></pre>

Or update all panels in a single call — one dataset per panel, in the order of `charts`:

<pre class="text-content-caption"><code>mc.setData([brentData, dxyData, volumeData]);</code></pre>

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

The narrow layout depends on the container width alone — at most `mobileBreakpoint` px — not on the column counts: a one-column grid on a desktop screen still uses `options`. When the container crosses the breakpoint — a window resized past it, a phone turned — the grid switches its columns and rebuilds each panel that has `mobileOptions`: the old chart is destroyed and a new one is made with the options of the new side and given the panel’s last data, so every key applies, `height` and `margin` included. The rebuilt panel is a new instance: read it from `mc.charts[i]` again rather than keeping a reference, and expect state set through its own methods (a y scale, a view window) to start over from its options.

Side-by-side horizontal bar charts are a natural fit for group comparisons where labels are shared. Suppress the Y axis on panels after the first to keep things clean:

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-coding-experience"></div>
</div>

When you need a third panel, the `span` field on a chart descriptor stretches that cell across all grid columns — a clean way to place a summary chart above two detail panels:

<div class="card text-content-caption card-dashboard-bordered">
    <div id="multi-chart-developer-survey"></div>
</div>

## MultiChart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

<div class="table-scroll card-caption">
<table class="table-bordered">
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
            <td>Height of each chart in px. A child’s own <code>options.height</code> wins; a cell title adds its line above the chart.</td>
        </tr>
        <tr>
            <td><code>gap</code></td>
            <td>number | string</td>
            <td><code>32px</code></td>
            <td>Grid gap between cells — a px number or any CSS value.</td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Passed through to every child chart — set <code>false</code> to render all cells without entry animation.</td>
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
</div>

### Chart descriptor fields

Each object in the `charts` array defines one panel:

<div class="table-scroll card-caption">
<table class="table-bordered">
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
            <td>Chart class to instantiate for this cell. Without <code>type</code> (or with <code>null</code>) the cell is a <code>Line</code>. Any other value also draws a <code>Line</code> and warns in the console — a wrong case such as <code>'bar'</code> included.</td>
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
            <td>Forwarded to the child chart constructor. All standard <code>Line</code> and <code>Bar</code> options apply. The grid sets <code>height</code> (<code>chartHeight</code>), <code>animate</code>, <code>theme</code> (the grid’s) and <code>margin.bottom: 26</code> — also with <code>showXAxis: false</code> — unless these options set them.</td>
        </tr>
        <tr>
            <td><code>mobileOptions</code></td>
            <td>object</td>
            <td>—</td>
            <td>Merged over <code>options</code> while the container is at or below <code>mobileBreakpoint</code> wide, whatever the column counts. Supports all the same keys as <code>options</code>, <code>height</code> and <code>margin</code> included. Crossing the breakpoint rebuilds the panel with the options of the new side and its last data, so <code>mc.charts[i]</code> is then a new instance.</td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-market-overview.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-coding-experience.js"></script>
<script src="/assets/charts/examples/multi/multi-chart-developer-survey.js"></script>
