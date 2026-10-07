---
layout: page.njk
title: "Sankey"
section: "Charts"
displaySidebar: true
permalink: '/charts/sankey/'
---

A Sankey diagram shows how a quantity flows between stages: nodes stand in columns, bands connect them, and the width of each band is the value it carries. It answers "where did it come from and where did it go" — budgets and their spending, money trails, funnels, energy balances.

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> <code>Sankey</code> is not covered by the 1.0 stability guarantee — its layout, rendering, and options may change without a major-version bump.</p>
</div>

<div class="text-content-caption card-dashboard-bordered">
    <div id="sankey-budget"></div>
</div>

## Data

A Sankey takes the same `{ nodes, links }` shape as the Graph. Each link is a flow from `source` to `target` with a positive `value`.

<pre class="text-content-caption"><code>new RareCharts.Sankey('#chart', { title: 'City budget' }).setData({
  nodes: [
    { id: 'tax',    label: 'Income tax' },
    { id: 'health', label: 'Health' },
  ],
  links: [
    { source: 'tax', target: 'health', value: 9.4 },
  ],
});</code></pre>

- **`nodes` is optional.** Without it, nodes are taken from the links in order of appearance, with the id as the label. Pass `nodes` to set labels, colors and order.
- **Aliases.** `from` / `to` are accepted for `source` / `target`, and `flows` for `links`.
- **Columns** come from the longest path from the sources. Pin a node to a column with `column: n` when the columns carry meaning of their own ("investors / vehicles / recipients").
- **Repeated flows.** Two links of the same pair and the same `type` are one flow: their values are summed, with a console warning. Different types between one pair stay separate bands.
- **Invalid input** is dropped with a warning: a missing, zero, negative or non-numeric `value`, or a link to a node not in `nodes`.
- **Cycles are an error.** A Sankey is acyclic: a link chain that returns to its start (A → B → A) throws, naming the cycle.
- **In ≠ out.** A node is as tall as the larger of its inflow and outflow.

### Recommended size

Up to **4–5 columns and about 30 nodes**. Past that, bands get too thin to read and labels collide — aggregate small flows into an "Other" node on the data side. There is no hard limit in code.

## Money trail

Color bands by `type` and the legend lists the types. Hover a band to highlight it with its two nodes; **click it to pin the tooltip**, so a long label or links inside it can be read. A click elsewhere or Escape releases it.

<div class="text-content-caption card-dashboard-bordered">
    <div id="sankey-trail"></div>
</div>

<pre class="text-content-caption"><code>new RareCharts.Sankey('#chart', {
  linkColor: 'type',
  linkTypes: {
    equity: { color: '#00aaff', label: 'Equity' },
    loan:   { color: '#fa8c16', label: 'Loan' },
  },
}).setData({
  links: [
    { from: 'Pension fund', to: 'Holding A', value: 140, type: 'equity', label: 'Series B, 2021' },
  ],
});</code></pre>

## Five columns

The recommended upper bound: an energy balance from primary sources to useful and lost energy, bands shaded from source to target color with `linkColor: 'gradient'`.

<div class="text-content-caption card-dashboard-bordered">
    <div id="sankey-energy"></div>
</div>

## Mobile

With the default `orientation: 'auto'` the diagram turns 90° when its container is at most `mobileBreakpoint` (480 px) wide: columns become rows, flows run top to bottom, and the chart grows by `rowHeight` per row instead of squeezing columns into a narrow width. Force either layout with `orientation: 'horizontal'` or `'vertical'`.

## Options

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
        <tr><td><code>height</code></td><td>number</td><td><code>400</code></td><td>Chart height in px for the horizontal layout</td></tr>
        <tr><td><code>orientation</code></td><td>string</td><td><code>'auto'</code></td><td><code>'horizontal'</code>, <code>'vertical'</code>, or <code>'auto'</code> — vertical on narrow containers</td></tr>
        <tr><td><code>mobileBreakpoint</code></td><td>number</td><td><code>480</code></td><td>Container width (px) at or below which <code>'auto'</code> turns vertical</td></tr>
        <tr><td><code>rowHeight</code></td><td>number</td><td><code>140</code></td><td>Height per column (row) in the vertical layout</td></tr>
        <tr><td><code>nodeWidth</code></td><td>number</td><td><code>12</code></td><td>Node thickness across the flow, px</td></tr>
        <tr><td><code>nodePadding</code></td><td>number</td><td><code>12</code></td><td>Gap between nodes of one column, px</td></tr>
        <tr><td><code>nodeAlign</code></td><td>string</td><td><code>'justify'</code></td><td><code>'justify'</code> (end nodes to the last column), <code>'left'</code>, <code>'right'</code>, <code>'center'</code></td></tr>
        <tr><td><code>nodeSort</code></td><td>null | string | function</td><td><code>null</code></td><td>Order inside a column: <code>null</code> keeps input order, <code>'value'</code> puts big nodes first, <code>'auto'</code> follows the relaxed layout, or a comparator <code>(a, b) =&gt; number</code></td></tr>
        <tr><td><code>iterations</code></td><td>number</td><td><code>6</code></td><td>Layout relaxation rounds — more straightens bands at the cost of time</td></tr>
        <tr><td><code>linkColor</code></td><td>string</td><td><code>'source'</code></td><td><code>'source'</code>, <code>'target'</code>, <code>'type'</code>, <code>'gradient'</code>, or any CSS color</td></tr>
        <tr><td><code>linkOpacity</code></td><td>number</td><td><code>0.45</code></td><td>Band opacity at rest</td></tr>
        <tr><td><code>linkTypes</code></td><td>object</td><td>—</td><td><code>{ type: { color, label } }</code> — band colors and legend for <code>linkColor: 'type'</code></td></tr>
        <tr><td><code>labels</code></td><td>string | false</td><td><code>'auto'</code></td><td>Node labels; <code>false</code> leaves them to the tooltip</td></tr>
        <tr><td><code>minLabelSize</code></td><td>number</td><td><code>10</code></td><td>Nodes thinner than this (px) get no label, only a tooltip</td></tr>
        <tr><td><code>showValues</code></td><td>boolean</td><td><code>true</code></td><td>Append the node value to its label</td></tr>
        <tr><td><code>valueFormat</code></td><td>function</td><td>locale number</td><td><code>v =&gt; string</code> for labels, tooltips and the table</td></tr>
        <tr><td><code>tooltipFormat</code></td><td>function</td><td>built-in</td><td><code>({ node, incoming, outgoing }) =&gt; html</code></td></tr>
        <tr><td><code>linkTooltipFormat</code></td><td>function</td><td>built-in</td><td><code>({ link, source, target }) =&gt; html</code></td></tr>
        <tr><td><code>tableFallback</code></td><td>boolean</td><td><code>true</code></td><td>A visually hidden table of the flows for screen readers</td></tr>
        <tr><td><code>animate</code> / <code>duration</code> / <code>ease</code></td><td></td><td><code>true</code> / <code>600</code> / <code>'cubicOut'</code></td><td>Entry fade of the bands; off under <code>prefers-reduced-motion</code></td></tr>
    </tbody>
</table>

Text slots `title`, `subtitle`, `source` and `note` work as on every chart — see [Settings](/charts/settings/).

## Accessibility

The SVG is labelled from `title` / `subtitle`. Every node and band carries an accessible name ("Income tax → Health: 9.4"); nodes are reachable with Tab, and Enter or Space pins a node's tooltip. A visually hidden table lists every flow, so the data stays readable without the picture.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/sankey/sankey-demos.js"></script>
