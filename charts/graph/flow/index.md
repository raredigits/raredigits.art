---
layout: page.njk
title: "Graph — Flow view"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/flow/'
---

The flow view draws a **trace**: value moving between entities, left to right through ordered lanes — networks, stages, jurisdictions. Ties are directed, may repeat between the same pair (a swap there and back, a deposit and a withdrawal), and carry value (width), category (color), certainty (dash) and a label. It is the view for money trails, supply chains and address investigations.

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> Like the rest of <code>Graph</code>, the flow view is outside the 1.0 stability guarantee. This release lays nodes out from hints in the data; automatic in-lane layout, aggregation and collapsible groups come next.</p>
</div>

The demo below follows funds as they move: income from a validator is swapped, bridged and moved through five networks, then spent on a token crowdfunding — and the trace goes on to show where the sale money went. Read it left to right: lanes are networks, line color is the asset, width its USD value, a dashed line an amount derived rather than read from transactions. Click the **Crowdfunding** node to fold the sale away and focus on the route that led to it (click again to bring it back); the legend's **address poisoning** item reveals a look-alike address that tried to pass as the team's.

<div class="full-width-caption bordered padding-lg mobile:padding-md" id="graph-flow-demo"></div>

<div id="graph-flow-demo-panel" aria-live="polite"></div>

Select a node or a tie: the chart reports it through `onSelect`, and the page fills the details panel — placed inside the card with the `details` option: beside the drawing on a wide screen, below it on a narrow one. The library draws, your page explains. The Crowdfunding node's open/close is page code in the same `onSelect` handler, switching a `setFilter` (collapsible groups built into the library come in the next release); the decoy starts hidden with `hiddenLinkTypes: ['noise']`.

## Data

The same `{ nodes, links }` contract as every Graph view. Hints on the nodes place them; any extra field passes through to `onSelect` and the tooltips untouched.

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
  view: 'flow',
  lanes: [{ id: 'osmosis', label: 'Osmosis' }, { id: 'ethereum', label: 'Ethereum', weight: 3 }],
  laneBy: 'net',                                  <span class="code-comment">// node field naming its lane</span>
  nodeGroups: { tracked: { color: '#2c5d8f', label: 'tracked wallets' } },
  nodeShapes: { wallet: 'circle', contract: 'square', exchange: 'diamond', crowd: 'stack' },
  linkColorBy: 'asset',
  linkTypes: { ETH: { color: '#3d4a5c', label: 'ETH' } },
  linkWidth: { by: 'value', scale: 'sqrt', min: 1.6, max: 22 },
  linkDash: link => link.basis === 'derived',
  hulls: [{ id: 'owner', label: 'one key on five networks', members: n => n.cluster }],
  hiddenLinkTypes: ['noise'],                     <span class="code-comment">// off until turned on in the legend</span>
  details: '#details',                            <span class="code-comment">// your panel, placed beside or below the drawing</span>
  onSelect: ({ node, link }) => showDetails(node ?? link),
}).setData({
  nodes: [
    { id: 'osmo', label: 'Owner wallet', sub: 'osmo1uvkv…w7zs', group: 'tracked', kind: 'wallet', net: 'osmosis', row: 0 },
  ],
  links: [
    { from: 'osmo', to: 'swap-dex', asset: 'ATOM', value: 530, label: '61.38 ATOM', start: '2023-09' },
  ],
});</code></pre>

### Placing nodes

- **`lane`** (or the field named by `laneBy`) puts a node in a lane. Lanes split the width by `weight`, in the order given; a lane only the data mentions is appended.
- **`row`** is the vertical slot: `0` is the main line, `-1`, `-2` above, `1`, `2` below. A node without a row takes the next free slot of its cell.
- **`col`** splits a wide lane into sub-columns (`0`, `1`, …).
- **`x` / `y`** override both, as fractions `0..1` of the lane width and of the drawing height.

### Ties

- `source` / `target` (or `from` / `to`), plus any fields you need. Several ties between one pair fan out; `bend` adjusts a curve by hand.
- **Width** comes from `linkWidth` — `value` through a square-root scale by default; a tie without a value gets the minimum width.
- **Color** comes from `linkColorBy` (a field or a function) resolved against `linkTypes`; **dash** from the type or from `linkDash(link)`.
- **Time:** `start` / `end` (years, `YYYY-MM` or ISO dates). `setTimeWindow(from, to)` dims ties outside the window — and fades nodes whose ties are all outside — or hides them with `timeWindowMode: 'hide'`.

## Options

Flow-specific options; the common Graph options (`height`, `details`, `fullscreen`, `linkTypes`, tooltips…) are on the [Graph page](/charts/graph/).

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
        <tr><td><code>view</code></td><td>string</td><td>—</td><td><code>'flow'</code> turns the flow view on</td></tr>
        <tr><td><code>lanes</code></td><td>array</td><td><code>[]</code></td><td><code>[{ id, label, weight? }]</code> in left-to-right order; <code>weight</code> sets a lane's share of the width</td></tr>
        <tr><td><code>laneBy</code></td><td>string | function</td><td><code>'lane'</code></td><td>Node field (or function) naming its lane</td></tr>
        <tr><td><code>nodeGroups</code></td><td>object</td><td>—</td><td><code>{ group: { color, label } }</code> — node color and legend entry</td></tr>
        <tr><td><code>nodeShapes</code> / <code>shapeBy</code></td><td>object / string | function</td><td><code>{}</code> / <code>'kind'</code></td><td>Shape per node kind: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'stack'</code>, or an SVG path</td></tr>
        <tr><td><code>linkColorBy</code></td><td>string | function</td><td><code>'type'</code></td><td>Tie field (or function) whose value is looked up in <code>linkTypes</code></td></tr>
        <tr><td><code>linkWidth</code></td><td>object</td><td><code>{ by: 'value', scale: 'sqrt', min: 1.6, max: 22 }</code></td><td>Tie width from a value field; <code>scale: 'linear'</code> also available</td></tr>
        <tr><td><code>linkDash</code></td><td>function</td><td>—</td><td><code>link =&gt; boolean</code> — dashed tie (e.g. a derived amount); a type's own <code>dash</code> wins</td></tr>
        <tr><td><code>linkLabels</code></td><td>boolean</td><td><code>true</code></td><td>Tie labels; also <code>setLinkLabels()</code></td></tr>
        <tr><td><code>hulls</code></td><td>array</td><td><code>[]</code></td><td><code>[{ id, label, members, color? }]</code> — a soft band through a group's nodes; <code>members</code> is a list of ids or <code>node =&gt; boolean</code></td></tr>
        <tr><td><code>hiddenLinkTypes</code></td><td>array</td><td><code>[]</code></td><td>Tie categories hidden at start; the legend shows them dimmed and turns them on</td></tr>
        <tr><td><code>timeWindowMode</code></td><td>string</td><td><code>'dim'</code></td><td>What <code>setTimeWindow</code> does to ties outside the window: <code>'dim'</code> or <code>'hide'</code></td></tr>
        <tr><td><code>onSelect</code></td><td>function</td><td>—</td><td><code>({ node, link, event }) =&gt; void</code> on selection; without it, a clicked tie pins its tooltip</td></tr>
        <tr><td><code>minWidth</code></td><td>number</td><td><code>0</code></td><td>Narrower drawings scroll sideways instead of crushing the lanes; a side details panel needs this much room next to it, or it moves below</td></tr>
        <tr><td><code>nodeRadius</code></td><td>number</td><td><code>18</code></td><td>Node radius in the flow view</td></tr>
    </tbody>
</table>
</div>

## Methods

<pre class="text-content-caption"><code>graph.setFilter(item => !item.noise);   <span class="code-comment">// nodes and ties; a tie hides with either end</span>
graph.setTimeWindow(null, '2024-01');    <span class="code-comment">// open start, through January 2024</span>
graph.select('osmo');                    <span class="code-comment">// or select({ link: id }); clearSelection()</span>
graph.setLinkLabels(false);
graph.setHulls([]);</code></pre>

## Interaction

**Select** — click a node or a tie: its neighbourhood stays, the rest fades, and `onSelect({ node, link, event })` fires; click the background or press Escape to clear. Without `onSelect`, clicking a tie pins its tooltip instead.

**Keyboard** — nodes are in the Tab order lane by lane; Enter or Space selects; → follows an outgoing tie, ← an incoming one, ↑ / ↓ move within a lane.

**Legend** — node groups and tie categories; click a category to hide or show its ties. Categories in `hiddenLinkTypes` start hidden. A node whose ties are all hidden is hidden with them.

**Details** — with `details`, the selected node or tie is explained in a panel inside the card: beside the drawing on a wide card, below it on a narrow one (see the [Graph options](/charts/graph/)).

**Full screen** — ⛶ in the footer opens the trace on the whole screen; Esc or ✕ closes it.

**Narrow screens** — set `minWidth` and the chart scrolls sideways instead of crushing the lanes; a details panel moves below the drawing.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/graph-flow-demo.js"></script>
