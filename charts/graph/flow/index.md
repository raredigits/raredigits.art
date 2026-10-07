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

<div class="flex-row flex-wrap gap-sm text-content-caption" role="group" aria-label="Graph options">
  <label><input type="checkbox" id="flow-opt-crowd"> Crowdsale #631</label>
  <label><input type="checkbox" id="flow-opt-cluster" checked> Owner cluster</label>
  <label><input type="checkbox" id="flow-opt-noise"> Noise (address poisoning)</label>
  <label><input type="checkbox" id="flow-opt-labels" checked> Tie labels</label>
  <label>Until <input type="range" id="flow-opt-time" min="0" max="31" step="1" value="31"> <output id="flow-opt-time-out">2026-04</output></label>
</div>

<div class="text-content-caption card-dashboard-bordered">
    <div id="graph-flow-octra"></div>
</div>

<div class="card text-content-caption card-dashboard-bordered" id="graph-flow-octra-panel" aria-live="polite"></div>

Select a node or a tie: the chart reports it through `onSelect`, and the page renders the details panel above — the library draws, your page explains. The checkboxes and the slider call `setFilter`, `setHulls`, `setLinkLabels` and `setTimeWindow`; positions never move.

## Data

The same `{ nodes, links }` contract as every Graph view. Hints on the nodes place them; any extra field passes through to `onSelect` and the tooltips untouched.

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
  view: 'flow',
  lanes: [{ id: 'osmosis', label: 'Osmosis' }, { id: 'ethereum', label: 'Ethereum', weight: 3 }],
  laneBy: 'net',                                  <span class="code-comment">// node field naming its lane</span>
  nodeGroups: { church: { color: '#2c5d8f', label: 'Church' } },
  nodeShapes: { wallet: 'circle', contract: 'square', exchange: 'diamond', crowd: 'stack' },
  linkColorBy: 'asset',
  linkTypes: { ETH: { color: '#3d4a5c', label: 'ETH' } },
  linkWidth: { by: 'value', scale: 'sqrt', min: 1.6, max: 22 },
  linkDash: link => link.basis === 'derived',
  hulls: [{ id: 'owner', label: 'one key on five networks', members: n => n.cluster }],
  onSelect: ({ node, link }) => showDetails(node ?? link),
}).setData({
  nodes: [
    { id: 'osmo', label: 'Osmosis main', sub: 'osmo1uvkv…w7zs', group: 'church', kind: 'wallet', net: 'osmosis', row: 0 },
  ],
  links: [
    { from: 'osmo', to: 'pools', asset: 'ATOM', value: 530, label: '61.38 ATOM', start: '2023-09' },
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

## Methods

<pre class="text-content-caption"><code>graph.setFilter(item => !item.noise);   <span class="code-comment">// nodes and ties; a tie hides with either end</span>
graph.setTimeWindow(null, '2024-01');    <span class="code-comment">// open start, through January 2024</span>
graph.select('osmo');                    <span class="code-comment">// or select({ link: id }); clearSelection()</span>
graph.setLinkLabels(false);
graph.setHulls([]);</code></pre>

## Interaction

**Select** — click a node or a tie: its neighbourhood stays, the rest fades, and `onSelect({ node, link, event })` fires; click the background or press Escape to clear. Without `onSelect`, clicking a tie pins its tooltip instead.

**Keyboard** — nodes are in the Tab order lane by lane; Enter or Space selects; → follows an outgoing tie, ← an incoming one, ↑ / ↓ move within a lane.

**Legend** — node groups and tie categories; click a category to hide or show its ties.

**Narrow screens** — set `minWidth` and the chart scrolls sideways instead of crushing the lanes.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/graph-flow-octra.js"></script>
