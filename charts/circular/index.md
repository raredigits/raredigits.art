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

<div id="chart-donut" class="text-content-caption card-dashboard-bordered"></div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>const d3 = RareCharts.d3;   <span class="code-comment">// the bundled D3</span>

new RareCharts.Donut('#chart', {
  title:       'Revenue by Product',
  source:      'Source: Internal accounting',
  legend:      segments.map(d => ({ label: d.label, type: 'bar' })),
  height:      300,
  centerText:  data => '$' + d3.format(',.0f')(d3.sum(data, d => d.value)),
  centerLabel: 'Revenue',
}).setData(segments);</code></pre>

### Legend to the right

Pass `legendPosition: 'right'` to place the legend in a vertical column beside the chart instead of above it. Works well when you have many categories or want to keep the chart area compact.

<div id="chart-donut-legend-right" class="text-content-caption card-dashboard-bordered"></div>

<div class="air-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  legend:         segments.map(d => ({ label: d.label, type: 'bar' })),
  legendPosition: 'right',
  height:         340,
}).setData(segments);</code></pre>

Either way the legend items need no `color`: the chart paints each dot, line or band in the color of the slice with the same `label` — or the same `id`, when the item has one — so the items may come in any order. An item whose slice is not in the ring (a zero value, a level you drilled away from) keeps the theme accent, and an item with its own `color` keeps that.

### Drill-down (hierarchy mode)

Hand Donut a **tree** — a single root object instead of a flat array — and it becomes an interactive drill-down. It opens on the root’s direct children; click a slice that has children to descend into it, and click the center (or a breadcrumb crumb) to come back up — once you are in, the center is a button, so Tab and Enter take you up as well. A leaf slice just shows its value. It is the same tree contract as the <a href="/charts/bar/hierarchical-bar/">hierarchical bar</a> — one data shape, two views: the bar lays the whole hierarchy out at once, the donut walks it one ring at a time.

<div id="chart-donut-drilldown" class="text-content-caption card-dashboard-bordered"></div>

<div class="air-md"></div>

Two composition details carry over from the tree contract. A parent whose children don’t add up to its stated value has a **remainder** — the undisclosed gap — which draws as a muted slice once you surface it with `showRemainder: true` or a per-node `remainderLabel`. And a **named-but-undisclosed** item (`value: null`) has no magnitude, so it cannot be a slice; the ring notes it as “*N not disclosed*” beneath the chart instead. A parent with no `value` of its own whose children are all undisclosed is undisclosed too — noted the same way, never drawn as an empty slice. See the <a href="/charts/bar/hierarchical-bar/">hierarchical bar</a> page for the full node shape and the value tri-state.

<pre class="text-content-caption"><code>new RareCharts.Donut('#chart', {
  showRemainder: true,
}).setData({
  label: 'Portfolio', value: 1400,
  children: [
    { label: 'World Liberty Financial', value: 536.4, remainderLabel: 'Other', children: [
      { label: 'Ethereum Key', value: 106 },
      { label: 'USDC Key',     value: 56 },
    ] },
    { label: 'Stablecoin proceeds', value: 196.9 },
    { label: 'NFT INT, LLC',        value: null },   <span class="code-comment">// undisclosed → noted, not drawn</span>
  ],
});</code></pre>

From code: `chart.drillUp()` goes one level up, and `chart.drillToDepth(i)` jumps to the i-th crumb of the breadcrumb (0 is the root). Both return the chart and do nothing at the root or on flat data. `chart.drillTo(child)` is the step a click on a slice takes: it descends into a child of the level shown — pass the object you gave `setData`, its `id`, or its `label` — and draws that level as a click does, remainder and undisclosed items included. A child without disclosed children (a leaf, a remainder), or one not in the level shown, is ignored. It returns the chart too.

## Pie

A pie is a donut with `innerRadius: 0`, and that is what `Pie` draws by default: no hole, no center text, slightly tighter slice gaps. Every other Donut option and method works the same, drill-down included — a pie has no center to click, so you go back up through the breadcrumb; an explicit `innerRadius` still makes a hole.

<div id="chart-pie" class="text-content-caption card-dashboard-bordered"></div>

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

<div class="grid grid-cols-3 mobile:grid-cols-1 gap-none bordered rounded-xs card-caption">
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

`setData()` accepts a plain number, or an object to override `max` and `min` for that call only — the next `setData` starts again from the `max` and `min` options:

<pre class="text-content-caption"><code><span class="code-comment">// 73 out of 100 (default max)</span>
const gauge = new RareCharts.Gauge('#gauge-progress', {
  centerLabel: 'Complete',
}).setData(73);

<span class="code-comment">// 50 achieved out of 80 plan — fills to 62.5%</span>
new RareCharts.Gauge('#gauge-target', {
  max:         80,
  color:       '#00c97a',
  centerText:  (value, max) => `${value}/${max}`,
  centerLabel: 'Achieved',
}).setData(50);

<span class="code-comment">// Override max for this call — 50 of 80</span>
gauge.setData({ value: 50, max: 80 });
<span class="code-comment">// Back to the options — 40 of 100</span>
gauge.setData(40);</code></pre>

A value outside `min`…`max` fills the arc to its end (or leaves it empty); the tooltip and `centerText` still receive the raw value.

The arc geometry is fully configurable:

<pre class="text-content-caption"><code>new RareCharts.Gauge('#chart', {
  startAngle:   -Math.PI * 0.75,   <span class="code-comment">// -135° (default)</span>
  endAngle:      Math.PI * 0.75,   <span class="code-comment">// +135° (default, 270° sweep)</span>
  thickness:    0.18,              <span class="code-comment">// ring thickness as fraction of radius</span>
  cornerRadius: 6,
  trackColor:   '#e8e8e8',         <span class="code-comment">// background arc</span>
  color:        '#ff3b5c',         <span class="code-comment">// fill arc</span>
});</code></pre>

### Speedometer — half-circle and needle

Two ingredients make the automotive-indicator look:

- **Sweep.** `startAngle` / `endAngle` set the arc in radians, clockwise from 12 o'clock. The default `±Math.PI * 0.75` is a 270° horseshoe; `-Math.PI / 2 … Math.PI / 2` is the flat 180° half-circle. The gauge re-centers vertically for any sweep and reserves room for the center text when the arc is shallow, so nothing clips.
- **Needle.** `needle: true` draws a pointer pivoting on a hub at the dial center, animated to the value together with the fill. The center readout moves below the hub, dial-style. Color it with `needleColor` (default: theme text).

<div class="grid grid-cols-2 gap-none bordered rounded-xs card-caption margin-y-md">
  <div class="card-row-bordered-item">
    <div id="chart-gauge-speed"></div>
  </div>
  <div class="card-row-bordered-item">
    <div id="chart-gauge-needle"></div>
  </div>
</div>

<pre class="text-content-caption"><code>new RareCharts.Gauge('#chart', {
  startAngle:  -Math.PI / 2,   <span class="code-comment">// 9 o'clock</span>
  endAngle:     Math.PI / 2,   <span class="code-comment">// 3 o'clock — a 180° sweep</span>
  needle:       true,
  max:          240,
  centerText:   v => v,
  centerLabel:  'km/h',
}).setData(87);</code></pre>

## Data format

Donut and Pie use the same segment data structure (Gauge takes a number — see Gauge above):

<pre class="text-content-caption"><code>[
  { label: 'Subscriptions', value: 42000, color: '#00c97a' },
  { label: 'Services',      value: 18000 },
  { label: 'Other',         value:  6000 }
]</code></pre>

Only positive finite values are rendered. Zero and negative values are filtered out.

Slices are matched across updates by `id`, else by `label`; slices that share a label are matched in order, so each keeps its own slice — give them an `id` when their order can change. Every update repaints the ring: a new `color` in `setData` shows, and a palette color moves with its slice’s position.

Passing a single root **object** instead of a flat array switches Donut into drill-down mode, where the data is a tree — see the Drill-down section above.

Colors can be provided per item. If omitted, the chart uses the active theme palette in order.

## Slice geometry

`padAngle` controls the gap between slices (a small default keeps separation without turning the chart into a flower). `cornerRadius` rounds slice corners. Both have sensible defaults and adjust slightly between Pie and Donut mode.

Hover interaction expands the hovered slice outward and shows a tooltip. Tooltip content is fully customizable:

<pre class="text-content-caption"><code>const d3 = RareCharts.d3;

new RareCharts.Donut('#chart', {
  tooltipFormat: ({ label, value, percent, color }) => `
    &lt;div style="color:${color}"&gt;${label}&lt;/div&gt;
    &lt;div&gt;${d3.format(',.0f')(value)}&lt;/div&gt;
    &lt;div class="rc-tooltip-muted"&gt;${d3.format('.1%')(percent)}&lt;/div&gt;
  `,
}).setData(segments);</code></pre>

## Circular charts options

Common options shared by all chart types (`title`, `subtitle`, `source`, `note`, `controls`, `theme`) are documented on the [Settings](/charts/settings/) page.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="3"><h5>Donut / Pie</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td><code>280</code></td>
            <td>Chart height px</td>
        </tr>
        <tr>
            <td><code>innerRadius</code></td>
            <td><code>0.58</code> (donut) / <code>0</code> (pie)</td>
            <td>Hole size as fraction of outer radius; <code>0</code> = Pie</td>
        </tr>
        <tr>
            <td><code>padAngle</code></td>
            <td><code>0.018</code> (donut) / <code>0.008</code> (pie)</td>
            <td>Gap between slices (radians)</td>
        </tr>
        <tr>
            <td><code>cornerRadius</code></td>
            <td><code>3</code> (donut) / <code>1</code> (pie)</td>
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
            <td><code>true</code> (donut) / <code>false</code> (pie)</td>
            <td>Show center text hole</td>
        </tr>
        <tr>
            <td><code>centerText</code></td>
            <td>formatted total</td>
            <td>String or <code>function(data, info) =&gt; string</code> — <code>data</code>: the drawn items, <code>info</code>: <code>{ label, value }</code>, the center label and the total. Flat data only — in drill-down the center shows the focused node’s value through <code>valueFormat</code></td>
        </tr>
        <tr>
            <td><code>centerLabel</code></td>
            <td><code>'Total'</code></td>
            <td>Secondary line below center text; in drill-down, the levels below the root show the focused node’s label</td>
        </tr>
        <tr>
            <td><code>valueFormat</code></td>
            <td><code>d3.format(',')</code> (e.g. <code>1,234.5678</code>)</td>
            <td><code>function(value, info) =&gt; string</code> — center total (in drill-down, the focused node’s value) and default tooltip value; <code>info</code> is the slice’s <code>{ label, value, percent, color }</code>, or <code>{ label, value }</code> for the center</td>
        </tr>
        <tr>
            <td><code>percentFormat</code></td>
            <td><code>.1%</code></td>
            <td><code>function(pct, info) =&gt; string</code> — outer-label and tooltip percents; <code>info</code> is the slice’s <code>{ label, value, percent, color }</code></td>
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
            <td><code>ease</code></td>
            <td><code>'cubicOut'</code></td>
            <td><code>'cubicOut'</code> / <code>'cubicInOut'</code> / <code>'linear'</code></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>built-in</td>
            <td><code>function({label, value, percent, color}) =&gt; html</code> — the role fields themselves (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>)</td>
        </tr>
        <tr>
            <td><code>showRemainder</code></td>
            <td><code>false</code></td>
            <td>Drill-down mode: draw a muted slice for each node’s undisclosed remainder (value − Σ children)</td>
        </tr>
        <tr>
            <td><code>remainderLabel</code></td>
            <td><code>'Other'</code></td>
            <td>Drill-down mode: fallback label for a surfaced remainder</td>
        </tr>
        <tr>
            <td><code>strict</code></td>
            <td><code>false</code></td>
            <td>Drill-down mode: throw when a node’s children exceed its stated value (default: warn, leave the negative remainder undrawn)</td>
        </tr>
        <tr class="table-section">
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
            <td>Minimum value. <code>setData({ value, min })</code> overrides it for that call only</td>
        </tr>
        <tr>
            <td><code>max</code></td>
            <td><code>100</code></td>
            <td>Maximum value. <code>setData({ value, max })</code> overrides it for that call only</td>
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
            <td><code>needle</code></td>
            <td><code>false</code></td>
            <td>Speedometer pointer pivoting at the dial center; the center readout moves below the hub</td>
        </tr>
        <tr>
            <td><code>needleColor</code></td>
            <td>theme text</td>
            <td>Needle and hub color</td>
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
            <td>share of the range, <code>.0%</code> (e.g. <code>63%</code>)</td>
            <td>String or <code>function(value, max, min, info) =&gt; string</code>; <code>info</code> is <code>{ value, max, min, percent, color }</code>, after the arguments it always had</td>
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
            <td><code>duration</code></td>
            <td><code>800</code></td>
            <td>Animation duration ms</td>
        </tr>
        <tr>
            <td><code>ease</code></td>
            <td><code>'cubicOut'</code></td>
            <td><code>'cubicOut'</code> / <code>'cubicInOut'</code> / <code>'linear'</code></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>built-in</td>
            <td><code>function({value, max, min, percent, color}) =&gt; html</code> — <code>color</code> is the fill arc’s (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>)</td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/pie-and-donut/pie-and-donut.js"></script>
<script src="/assets/charts/examples/pie-and-donut/donut-drilldown.js"></script>
