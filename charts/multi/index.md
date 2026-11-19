---
layout: page.njk
title: "Multi Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/multi/'
---

`MultiChart` combines two to four charts inside a single block with a shared title, subtitle, legend, and source footer. Each panel is an independent chart instance of any chart class — a `Line`, a `Bar`, a `Donut`, a `Sankey`, a `Map` and so on — arranged in a CSS grid.

<div id="multi-chart-market-overview" class="panel panel--bordered text-content-caption"></div>

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
      options: { yPrefix: '$', lineColor: '#1677ff' },
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
      options: { barColor: '#1677ff' },
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

<div id="multi-chart-coding-experience" class="panel panel--bordered text-content-caption"></div>

When you need a third panel, the `span` field on a chart descriptor stretches that cell across all grid columns — a clean way to place a summary chart above two detail panels:

<div id="multi-chart-developer-survey" class="panel panel--bordered text-content-caption"></div>

### Shared legend

The grid's own `legend` works across the cells. An item that names a series of any cell — by `series`, else `name`, else `label`, as on a single chart — is a toggle: a click shows or hides the series of that name in every cell, a double click keeps only that series, and "Show all" brings everything back. The series can come from any class: a line, a stacked bar, a slice, a Sankey link type. An item that names no series stays a caption.

```js
const grid = new RareCharts.MultiChart('#prices', {
  legend: [{ label: 'Brent' }, { label: 'WTI' }],
  onLegendToggle: ({ name, visible, visibleNames }) => console.log(name, visible, visibleNames),
  charts: [
    { type: 'Line', title: 'Daily',   data: [{ name: 'Brent', values: daily.brent },   { name: 'WTI', values: daily.wti }] },
    { type: 'Line', title: 'Monthly', data: [{ name: 'Brent', values: monthly.brent }, { name: 'WTI', values: monthly.wti }] },
  ],
});

grid.setSeriesVisible(['Brent']);   // every cell, without onLegendToggle; null shows all
```

`onLegendToggle` fires on the grid only, and `legendRescale` goes down to every cell that does not set its own. A cell's own `legend` acts on that cell alone, until the next gesture on the shared one: use the shared legend when the cells draw the same series.

## MultiChart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

The grid is a group (`role="group"`) for assistive technology, named by `ariaLabel`, else by the title and subtitle joined with " — ". Each cell’s drawing is named by its own `ariaLabel`, `title` or `subtitle` in `options`, else by the cell `title`, else "Chart".

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
            <td>string</td>
            <td><code>'Line'</code></td>
            <td>Chart class to instantiate for this cell, by its name: <code>'Line'</code>, <code>'Bar'</code>, <code>'TimeSeries'</code>, <code>'DualAxes'</code>, <code>'HierarchicalBar'</code>, <code>'Donut'</code>, <code>'Pie'</code>, <code>'Gauge'</code>, <code>'Sankey'</code>, <code>'Graph'</code>, <code>'Map'</code> or <code>'MapFlow'</code>. Without <code>type</code> (or with <code>null</code>) the cell is a <code>Line</code>. Two classes are not cells: <code>'Overview'</code>, the navigator strip (use <code>navigator: true</code> on a time chart), and <code>'MultiChart'</code> (a grid does not nest). They and any other value draw a <code>Line</code> and warn in the console once per cell — a wrong case such as <code>'bar'</code> included.</td>
        </tr>
        <tr>
            <td><code>title</code></td>
            <td>string</td>
            <td>—</td>
            <td>Label shown above the cell in small uppercase; also the accessible name of the cell’s drawing when its <code>options</code> give no <code>ariaLabel</code>, <code>title</code> or <code>subtitle</code>.</td>
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
            <td>Forwarded to the child chart constructor: every option of the cell’s class applies. The grid sets <code>height</code> (<code>chartHeight</code>), <code>animate</code> and <code>theme</code> (the grid’s) unless these options set them. Under the bottom axis of <code>Line</code>, <code>Bar</code>, <code>DualAxes</code> and <code>TimeSeries</code> it also sets <code>margin.bottom: 26</code> — also with <code>showXAxis: false</code> — unless <code>margin.bottom</code> is set; the other classes keep their own margin.</td>
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
