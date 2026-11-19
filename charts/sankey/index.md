---
layout: page.njk
title: "Sankey"
section: "Charts"
displaySidebar: true
permalink: '/charts/sankey/'
---

A Sankey diagram shows how a quantity flows between stages: nodes stand in columns, bands connect them, and the width of each band is the value it carries. It answers "where did it come from and where did it go" — budgets and their spending, money trails, funnels, energy balances.

<p class="callout callout-warning"><strong>Experimental.</strong> <code>Sankey</code> is not covered by the 1.0 stability guarantee — its layout, rendering, and options may change without a major-version bump.</p>

The simplest case first: a city budget in two columns — where the money comes from on the left, where it goes on the right. Hover a band or a node to follow its flows; the tooltip gives each flow's share of its source.

<div id="sankey-budget" class="panel panel--bordered text-content-caption"></div>

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

Color bands by `type` with `linkColor: 'type'` and a `linkTypes` map, and the legend lists the described types (a type not in `linkTypes` stays muted). Hover a band to highlight it with its two nodes; **click it to pin the tooltip**, so a long label — or links you add with `linkTooltipFormat` — can be read. A click elsewhere or Escape releases it.

<div id="sankey-trail" class="panel panel--bordered text-content-caption"></div>

The setup: `linkColor: 'type'` and a `linkTypes` map; a link's `label` shows up in its tooltip — other fields reach your `linkTooltipFormat`.

The legend's items hide and show their bands: a click toggles a type, a double click keeps it alone, *Show all* brings every band back. The diagram keeps its layout — nodes, their labels and values stay where and as they were — and a hidden band leaves its gap at its nodes. The hover, the node tooltip and the screen-reader table read the bands shown; a band's "% of source" stays a share of the whole node. `chart.setLinkTypesVisible(['equity'])` does the same from code (`null` shows all), and returns the chart. More: [Interactive legend](/charts/settings/#interactive-legend).

<pre class="text-content-caption"><code>new RareCharts.Sankey('#chart', {
  linkColor: 'type',
  linkTypes: {
    equity: { color: '#1677ff', label: 'Equity' },
    loan:   { color: '#fa8c16', label: 'Loan' },
  },
}).setData({
  links: [
    { from: 'Pension fund', to: 'Holding A', value: 140, type: 'equity', label: 'Series B, 2021' },
  ],
});</code></pre>

## Five columns

The recommended upper bound: an energy balance from primary sources to useful and lost energy, bands shaded from source to target color with `linkColor: 'gradient'`.

<div id="sankey-energy" class="panel panel--bordered text-content-caption"></div>

## Mobile

With the default `orientation: 'auto'` the diagram turns 90° when its container is at most `mobileBreakpoint` (480 px) wide: columns become rows, flows run top to bottom, and the chart grows by `rowHeight` per row instead of squeezing columns into a narrow width. Force either layout with `orientation: 'horizontal'` or `'vertical'`.

## Options

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
        <tr><td><code>height</code></td><td>number</td><td><code>400</code></td><td>Card height in px for the horizontal layout — title, legend and footer included</td></tr>
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
        <tr><td><code>linkTypes</code></td><td>object</td><td>—</td><td><code>{ type: { color, label } }</code> — band colors for <code>linkColor: 'type'</code>, and then a legend of every type described here that the data uses, each item a toggle for its bands (your own <code>legend</code> replaces it); a type not described stays muted</td></tr>
        <tr><td><code>hiddenLinkTypes</code></td><td>array</td><td><code>[]</code></td><td>Link types hidden from the start (an untyped band is <code>'default'</code>); the legend shows them off</td></tr>
        <tr><td><code>legendInteractive</code></td><td>boolean</td><td><code>true</code></td><td><code>false</code>: the legend is plain labels, and a type hidden from code leaves it</td></tr>
        <tr><td><code>onLegendToggle</code></td><td>function</td><td>—</td><td><code>({ name, visible, visibleNames }) =&gt; void</code> after a legend gesture; <code>name</code> is the link type, <code>null</code> for Show all</td></tr>
        <tr><td><code>labels</code></td><td>string | false</td><td><code>'auto'</code></td><td>Node labels, right of each node (the last column gets a gutter sized to its longest label); long ones are cut with an ellipsis to the room before the next column, the full name stays in the tooltip. <code>false</code> leaves them to the tooltip</td></tr>
        <tr><td><code>minLabelSize</code></td><td>number</td><td><code>10</code></td><td>Nodes thinner than this (px) get no label, only a tooltip; in the vertical layout a node narrower than 24 px (or this, if larger) gets no label</td></tr>
        <tr><td><code>showValues</code></td><td>boolean</td><td><code>true</code></td><td>Append the node value to its label</td></tr>
        <tr><td><code>valueFormat</code></td><td>function</td><td>locale number</td><td><code>v =&gt; string</code> for labels, tooltips and the table</td></tr>
        <tr><td><code>tooltipFormat</code></td><td>function</td><td>built-in</td><td><code>({ node, incoming, outgoing, links }) =&gt; html</code> — the bands shown; <code>links</code> is <code>incoming</code> then <code>outgoing</code></td></tr>
        <tr><td><code>linkTooltipFormat</code></td><td>function</td><td>built-in</td><td><code>({ link, source, target }) =&gt; html</code></td></tr>
        <tr><td><code>tableFallback</code></td><td>boolean</td><td><code>true</code></td><td>A visually hidden table of the flows for screen readers</td></tr>
        <tr><td><code>animate</code> / <code>duration</code> / <code>ease</code></td><td></td><td><code>true</code> / <code>650</code> / <code>'cubicOut'</code></td><td>Entry fade of the bands; off under <code>prefers-reduced-motion</code></td></tr>
    </tbody>
</table>
</div>

Text slots `title`, `subtitle`, `source` and `note`, and the `controls` slot for your own inputs, work as on every chart — see [Settings](/charts/settings/).

## Accessibility

The SVG is a group labelled by `ariaLabel`, else from `title` / `subtitle`. Every node and band carries an accessible name ("Income tax → Health: 9.4"). Nodes are reachable with Tab, and Enter or Space pins a node's tooltip; a click elsewhere or Escape releases it. The tooltip lists the node's bands in and out, each with the node at its other end and its value, under the totals, so the keyboard reads the bands too. Two bands to one node are told apart by their type. A visually hidden table lists every flow, so the data stays readable without the picture.

## Not in this version

- **Cycles.** A Sankey is acyclic; links that return to a node they came from throw, naming the cycle.
- **Dragging nodes** by hand.
- **Drill-down** through several levels.
- **Particles** moving along the bands.
- **The remainder as its own band.** A node whose inflow and outflow differ is as tall as the larger; the difference is not drawn.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/sankey/sankey-demos.js"></script>
