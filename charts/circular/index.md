---
layout: page.njk
title: "Circular Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/circular/'
---

RareCharts provides three circular chart types that share a common API and theme system: **Donut**, **Pie**, and **Gauge**. Each answers a different question.

## Donut

The default circular chart. A ring with a center area — the center gives you a place to put something useful: the total, a headline number, or a short label. That makes donut the better default for dashboards, where charts rarely live alone and context matters.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-donut"></div>
</div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  title:       'Revenue by Product',
  source:      'Source: Internal accounting',
  legend:      segments.map(d => ({ label: d.label, type: 'bar' })),
  height:      300,
  centerText:  data => '$' + d3.format(',.0f')(d3.sum(data, d => d.value)) + 'K',
  centerLabel: 'Revenue',
}).setData(segments);</code></pre>

### Legend to the right

Pass `legendPosition: 'right'` to place the legend in a vertical column beside the chart instead of above it. Works well when you have many categories or want to keep the chart area compact.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-donut-legend-right"></div>
</div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  legend:         segments.map(d => ({ label: d.label, type: 'bar' })),
  legendPosition: 'right',
  height:         340,
}).setData(segments);</code></pre>

## Pie

A pie is a donut with `innerRadius: 0`. The class name is `Donut` — `Pie` is an alias. Same API, same options, same behavior.

<div class="text-content-caption card-dashboard-bordered">
    <div id="chart-pie"></div>
</div>

A pie chart is a blunt instrument: it answers “how is the total split” when there are only a few categories and the differences are obvious. It breaks down quickly when slices are similar in size, when there are many categories, or when the reader needs precision.

<pre class="text-content-caption"><code>new RareCharts.Pie('#chart', {
  height:     300,
  showLabels: true,
}).setData(segments);</code></pre>

### Outer labels

Enable with `showLabels: true`. Each slice gets a leader line and two-line text (category name + percent). Slices below `labelMinPct` (default: 4%) are skipped automatically.

Control what appears with `labelContent`:
- `'both'` — category name + percentage (default)
- `'label'` — category name only
- `'percent'` — percentage only

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Pie('#chart', {
  showLabels:   true,
  labelContent: 'percent',   <span class="code-comment">// just percentages</span>
  labelMinPct:  0.05,        <span class="code-comment">// hide labels below 5%</span>
}).setData(segments);</code></pre>

## Gauge

An arc-based progress chart. Shows a value relative to a maximum along a partial arc. Use it for goal completion, budget usage, KPI progress — anywhere the question is "how far along are we?"

<div class="card-row-bordered card-caption">
  <div class="card-row-bordered-item">
    <div id="chart-gauge-progress"></div>
  </div>
  <div class="card-row-bordered-item">
    <div id="chart-gauge-target"></div>
  </div>
  <div class="card-row-bordered-item">
    <div id="chart-gauge-thin"></div>
  </div>
</div>

`setData()` accepts a plain number, or an object to override `max` and `min` per render:

<pre class="text-content-caption"><code><span class="code-comment">// 73 out of 100 (default max)</span>
new RareCharts.Gauge('#chart', {
  centerLabel: 'Complete',
}).setData(73);

<span class="code-comment">// 50 achieved out of 80 plan — fills to 62.5%</span>
new RareCharts.Gauge('#chart', {
  max:         80,
  color:       '#00c97a',
  centerText:  (value, max) => `${value}/${max}`,
  centerLabel: 'Achieved',
}).setData(50);

<span class="code-comment">// Override max at render time</span>
gauge.setData({ value: 50, max: 80 });</code></pre>

The arc geometry is fully configurable:

<pre class="text-content-caption"><code>new RareCharts.Gauge('#chart', {
  startAngle:   -Math.PI * 0.75,   <span class="code-comment">// -135° (default)</span>
  endAngle:      Math.PI * 0.75,   <span class="code-comment">// +135° (default, 270° sweep)</span>
  thickness:    0.18,              <span class="code-comment">// ring thickness as fraction of radius</span>
  cornerRadius: 6,
  trackColor:   '#e8e8e8',         <span class="code-comment">// background arc</span>
  color:        '#ff3b5c',         <span class="code-comment">// fill arc</span>
});</code></pre>

## Data format

All three types use the same segment data structure:

<pre class="text-content-caption"><code>[
  { label: 'Subscriptions', value: 42000, color: '#00c97a' },
  { label: 'Services',      value: 18000 },
  { label: 'Other',         value:  6000 }
]</code></pre>

Only positive finite values are rendered. Zero and negative values are filtered out.

Colors can be provided per item. If omitted, the chart uses the active theme palette in order.

## Slice geometry

`padAngle` controls the gap between slices (a small default keeps separation without turning the chart into a flower). `cornerRadius` rounds slice corners. Both have sensible defaults and adjust slightly between Pie and Donut mode.

Hover interaction expands the hovered slice outward and shows a tooltip. Tooltip content is fully customizable:

<pre class="text-content-caption"><code>tooltipFormat: ({ label, value, percent, color }) => `
  &lt;div style="color:${color}"&gt;${label}&lt;/div&gt;
  &lt;div&gt;${d3.format(',.0f')(value)}&lt;/div&gt;
  &lt;div style="color:#888"&gt;${d3.format('.1%')(percent)}&lt;/div&gt;
`</code></pre>

## Circular charts options

<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td colspan="3"><h5>Donut / Pie</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td><code>280</code></td>
            <td>Chart height px</td>
        </tr>
        <tr>
            <td><code>innerRadius</code></td>
            <td><code>0.58</code></td>
            <td>Hole size as fraction of outer radius; <code>0</code> = Pie</td>
        </tr>
        <tr>
            <td><code>padAngle</code></td>
            <td><code>0.018</code></td>
            <td>Gap between slices (radians)</td>
        </tr>
        <tr>
            <td><code>cornerRadius</code></td>
            <td><code>3</code></td>
            <td>Rounded slice corners px</td>
        </tr>
        <tr>
            <td><code>showLabels</code></td>
            <td><code>false</code></td>
            <td>Show outer leader-line labels</td>
        </tr>
        <tr>
            <td><code>labelContent</code></td>
            <td><code>'both'</code></td>
            <td><code>'both'</code> / <code>'label'</code> / <code>'percent'</code></td>
        </tr>
        <tr>
            <td><code>labelMinPct</code></td>
            <td><code>0.04</code></td>
            <td>Hide label when slice &lt; this fraction</td>
        </tr>
        <tr>
            <td><code>legendPosition</code></td>
            <td>—</td>
            <td><code>'right'</code> to place legend in vertical aside</td>
        </tr>
        <tr>
            <td><code>showCenter</code></td>
            <td><code>true</code> (donut)</td>
            <td>Show center text hole</td>
        </tr>
        <tr>
            <td><code>centerText</code></td>
            <td>formatted total</td>
            <td>String or <code>function(data) =&gt; string</code></td>
        </tr>
        <tr>
            <td><code>centerLabel</code></td>
            <td><code>'Total'</code></td>
            <td>Secondary line below center text</td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td><code>true</code></td>
            <td>Animate on first render</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td><code>650</code></td>
            <td>Animation duration ms</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>built-in</td>
            <td><code>function({label, value, percent, color}) =&gt; html</code></td>
        </tr>
        <tr>
            <td colspan="3"><h5>Gauge</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td><code>220</code></td>
            <td>Chart height px</td>
        </tr>
        <tr>
            <td><code>min</code></td>
            <td><code>0</code></td>
            <td>Minimum value</td>
        </tr>
        <tr>
            <td><code>max</code></td>
            <td><code>100</code></td>
            <td>Maximum value</td>
        </tr>
        <tr>
            <td><code>startAngle</code></td>
            <td><code>-¾π</code></td>
            <td>Arc start (radians, clockwise from top)</td>
        </tr>
        <tr>
            <td><code>endAngle</code></td>
            <td><code>+¾π</code></td>
            <td>Arc end (270° sweep by default)</td>
        </tr>
        <tr>
            <td><code>thickness</code></td>
            <td><code>0.18</code></td>
            <td>Ring thickness as fraction of outer radius</td>
        </tr>
        <tr>
            <td><code>cornerRadius</code></td>
            <td><code>6</code></td>
            <td>Arc end rounding px</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td><code>theme.accent</code></td>
            <td>Fill arc color</td>
        </tr>
        <tr>
            <td><code>trackColor</code></td>
            <td><code>theme.grid</code></td>
            <td>Background arc color</td>
        </tr>
        <tr>
            <td><code>showCenter</code></td>
            <td><code>true</code></td>
            <td>Show center text</td>
        </tr>
        <tr>
            <td><code>centerText</code></td>
            <td><code>'63%'</code></td>
            <td>String or <code>function(value, max, min) =&gt; string</code></td>
        </tr>
        <tr>
            <td><code>centerLabel</code></td>
            <td>—</td>
            <td>Secondary line below center text</td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td><code>true</code></td>
            <td>Animate fill on first render</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>built-in</td>
            <td><code>function({value, max, min, percent}) =&gt; html</code></td>
        </tr>
    </tbody>
</table>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/pie-and-donut/pie-and-donut.js"></script>
