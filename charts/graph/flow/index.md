---
layout: page.njk
title: "Graph — Flow view"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/flow/'
---

The flow view draws a **trace**: value moving between entities, left to right through ordered lanes — networks, stages, jurisdictions. Ties are directed, may repeat between the same pair (a swap there and back, a deposit and a withdrawal), and carry value (width), category (color), certainty (dash) and a label. It is the view for money trails, supply chains and address investigations.

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> Like the rest of <code>Graph</code>, the flow view is outside the 1.0 stability guarantee. Its layout, folds and options may change without a major-version bump.</p>
</div>

The demo below follows funds as they move: income from a validator is swapped, bridged and moved through five networks, then spent on a token crowdfunding — and the trace goes on to show where the sale money went. Read it left to right: lanes are networks, line color is the asset, width its USD value, a dashed line an amount derived rather than read from transactions. Press **−** on the **Crowdfunding** node to fold the sale into one node and focus on the route that led to it (**+** brings it back); the buttons in the header jump to the trace's chapters, and the strip under the drawing brushes any period. The legend's **address poisoning** item reveals a look-alike address that tried to pass as the team's.

<div class="full-width-caption bordered padding-lg mobile:padding-md" id="graph-flow-demo"></div>

<div id="graph-flow-demo-panel" aria-live="polite"></div>

Select a node or a tie: the chart reports it through `onSelect`, and the page fills the details panel — placed inside the card with the `details` option: beside the drawing when the card has room for both — `minWidth` plus the 300 px panel, here a card about 1100 px wide — and below it otherwise. The library draws, your page explains. The crowdfunding side is a `fold`; the decoy starts hidden with `hiddenLinkTypes: ['noise']`.

## Automatic layout

Data from an API rarely knows where a node should stand. Leave the hints out and the flow view lays the trace out itself: below is the same trace with every `row` and `col` removed — only the lanes are kept, because the network a wallet lives on is data, not layout.

<div class="full-width-caption bordered padding-lg mobile:padding-md" id="graph-flow-auto"></div>

- **Columns** follow the ties inside a lane: a payment goes left to right. Loops are broken where they would read backwards — with dates, the later tie turns (a refund, a payout two years on); without dates, as few ties as possible.
- **The main route** — the longest left-to-right path, the heavier by `value` on a tie — runs along the middle. Flag nodes or ties with `main: true` to choose it yourself.
- **Side nodes** go above and below, ordered so that ties cross as little as possible. A DEX swapped with and back, a fee, an income source stand in their counterpart's column instead of taking one of their own.
- **Hints still win**: a node with `row`, `col`, `x` or `y` stays where you put it, and the rest are laid out around it. `layout: 'hints'` turns the automaton off.
- The layout is **deterministic**: the same data gives the same picture, and filters, the legend and the time window never move a node.

## Data

The same `{ nodes, links }` contract as every Graph view. Hints on the nodes place them; any extra field passes through to `onSelect` and the tooltips untouched.

<pre><code>new RareCharts.Graph('#chart', {
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
  folds: [{ id: 'sale', anchor: 'crowdfunding', members: n => n.crowd, sub: '{n} addresses' }],
  timeframes: [{ key: 'sale', label: 'The sale', range: ['2024-01-28', '2024-02-08'] }, 'ALL'],
  navigator: true,
  details: '#details',                            <span class="code-comment">// your panel, placed beside or below the drawing</span>
  onSelect: ({ node, link }) => showDetails(node ?? link),   <span class="code-comment">// your function fills #details</span>
}).setData({
  nodes: [
    { id: 'osmo', label: 'Owner wallet', sub: 'osmo1uvkv…w7zs', group: 'tracked', kind: 'wallet', net: 'osmosis', row: 0 },
  ],
  links: [
    { from: 'osmo', to: 'swap-dex', asset: 'ATOM', value: 530, label: '61.38 ATOM', start: '2023-09-26', end: '2023-12-27' },
  ],
});</code></pre>

### Placing nodes

- **`lane`** (or the field named by `laneBy`) puts a node in a lane. Lanes split the width by `weight`, in the order given; a lane only the data mentions is appended.
- **`row`** is the vertical slot: `0` is the main line, `-1`, `-2` above, `1`, `2` below. A node without a row takes the next free slot of its cell. Rows share the drawing's height; a short drawing first gives up the padding under the lane headers and at the bottom, so that a row keeps room for a node, its two caption lines and the node below (about 75 px with the default `nodeRadius`). Past that, rows tighten and captions can touch the next node: give the card more `height` — about 110 px per row in use plus 160 for the title, buttons, legend and navigator.
- **`col`** splits a wide lane into sub-columns (`0`, `1`, …).
- **`x` / `y`** override both, as fractions `0..1` of the lane width and of the drawing height.
- A node **without any of these** is placed automatically (see [Automatic layout](#automatic-layout)); a lane without a `weight` is then as wide as its columns.
- **Captions:** `label` is the node's first line and `sub` a second, muted one (an address, a role); `terminal: true` adds a small "end" tag beside the node, where the trace stops.

### Ties

- `source` / `target` (or `from` / `to`), plus any fields you need. Several ties between one pair fan out; `bend` adjusts a curve by hand.
- **Width** comes from `linkWidth` — `value` through a square-root scale by default; a tie without a value gets the minimum width.
- **Color** comes from `linkColorBy` (a field or a function) resolved against `linkTypes`; **dash** from the type or from `linkDash(link)`. A tie without a category is muted; a category `linkTypes` does not describe takes a palette color by its order — the tooltip and the details panel use the same category and label.
- **Time:** `start` / `end` (years, `YYYY-MM` or ISO dates). `setTimeWindow(from, to)` dims ties outside the window — or hides them with `timeWindowMode: 'hide'` — and fades nodes whose ties are all outside.

### Folds

A fold is a set of nodes that can collapse into one: `{ id, label?, members, anchor?, collapsed?, sub?, group? }`. `members` is a list of ids or `node => boolean`; a node belongs to the first fold that lists it. The **anchor** (by default the first member in the order of `nodes`) carries a **−** switch while the fold is open. Collapsed, the members leave the drawing and one node takes the anchor's place with a **+** switch: labelled `label` (the anchor's label by default), captioned by `sub` (`'{n} addresses'`, or `n => …`; "N nodes" by default) and colored by `group` (the anchor's group by default). Its ties are summed per pair and category; ties inside the fold disappear with it. The selection follows: a selected member becomes the folded node, and back. A folded node reaches `onSelect` and the tooltips as `{ id: "fold:<id>", label, sub, group, fold, members }` — `members` are the nodes inside; apart from its position hints it carries none of the anchor's own fields.

With many parallel ties, `aggregateLinks: true` merges those of one pair and category into one, `value` summed: the merged tie keeps the first tie's fields, is labelled "N ties", spans their dates and lists the originals in `link.links` — and in its tooltip. `laneCap: n` keeps a crowded lane readable: a lane with more than `n` nodes shows `n` — its `n − 1` heaviest (by total tie `value`, then number of ties) and a "+N more" node holding the rest, folded until you press its **+**; `laneCap: 1` folds the whole lane. Nodes already in a `fold` are not counted. The lane's fold has the id `lane:<lane id>`, so `expand('lane:ethereum')` opens it.

### Time navigation

`timeframes` and `navigator` work as on [TimeSeries](/charts/line/time-series/), over the dates of the ties: buttons in the header (`'1M'`, `'1Y'`, `'ALL'`… or `{ key, label, range: [from, to] }` for the chapters of a story) and a strip under the drawing that shows how many ties are active over time — brush it to pick any period. Ties outside the period dim as with `setTimeWindow`, which, once navigation is on, moves the view and the buttons with it. `defaultTimeframe` (a key of `timeframes`) or `defaultView: [from, to]` sets the period shown first; the bounds read like the ties' dates, so `defaultView: [1990, 2000]` is 1990 through 2000. Both take effect with `timeframes` or `navigator` on.

## Options

Flow-specific options; the common Graph options (`height`, `details`, `fullscreen`, `linkTypes`, tooltips…) are on the [Graph page](/charts/graph/). The options every chart shares (`title`, `subtitle`, `source`, `note`, `controls`, `theme`) are on the [Settings](/charts/settings/) page.

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
        <tr><td><code>nodeShapes</code> / <code>shapeBy</code></td><td>object / string | function</td><td><code>{}</code> / <code>'kind'</code></td><td>Shape per node kind: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>, <code>'stack'</code>, or an SVG path. The map is read first; a kind that is one of the four names draws that shape, any other kind a circle</td></tr>
        <tr><td><code>linkColorBy</code></td><td>string | function</td><td><code>'type'</code></td><td>Tie field (or function) whose value is looked up in <code>linkTypes</code></td></tr>
        <tr><td><code>linkWidth</code></td><td>object</td><td><code>{ by: 'value', scale: 'sqrt', min: 1.6, max: 22 }</code></td><td>Tie width from a value field; <code>scale: 'linear'</code> also available</td></tr>
        <tr><td><code>linkDash</code></td><td>function</td><td>—</td><td><code>link =&gt; boolean</code> — dashed tie (e.g. a derived amount); a type's own <code>dash</code> wins</td></tr>
        <tr><td><code>linkLabels</code></td><td>boolean</td><td><code>true</code></td><td>Tie labels; also <code>setLinkLabels()</code></td></tr>
        <tr><td><code>hulls</code></td><td>array</td><td><code>[]</code></td><td><code>[{ id, label, members, color? }]</code> — a soft band through a group's nodes; <code>members</code> is a list of ids or <code>node =&gt; boolean</code></td></tr>
        <tr><td><code>hiddenLinkTypes</code></td><td>array</td><td><code>[]</code></td><td>Tie categories hidden at start; the legend shows them dimmed and turns them on</td></tr>
        <tr><td><code>layout</code></td><td>string</td><td><code>'auto'</code></td><td>Nodes without position hints are laid out from the ties; <code>'hints'</code> places them from hints only</td></tr>
        <tr><td><code>folds</code></td><td>array</td><td><code>[]</code></td><td><code>[{ id, label?, members, anchor?, collapsed?, sub?, group? }]</code> — node sets that collapse into one node with a +/− switch; <code>group</code> colors the folded node</td></tr>
        <tr><td><code>onFoldChange</code></td><td>function</td><td>—</td><td><code>({ id, collapsed, fold, event }) =&gt; void</code> when a fold opens or closes</td></tr>
        <tr><td><code>aggregateLinks</code></td><td>boolean</td><td><code>false</code></td><td>Merge parallel ties of one pair and category, <code>value</code> summed</td></tr>
        <tr><td><code>laneCap</code></td><td>integer</td><td>—</td><td>Most nodes drawn in a lane, the "+N more" node included: over the cap, the lane keeps its <code>n − 1</code> heaviest nodes and folds the rest. A whole number ≥ 1</td></tr>
        <tr><td><code>timeframes</code></td><td>array | true</td><td>—</td><td>Period buttons in the header, over the ties' dates</td></tr>
        <tr><td><code>navigator</code></td><td>boolean | object</td><td>—</td><td>A brushable strip of active ties under the drawing</td></tr>
        <tr><td><code>defaultTimeframe</code></td><td>string</td><td>—</td><td>Key of the <code>timeframes</code> button the chart opens on</td></tr>
        <tr><td><code>defaultView</code></td><td>array</td><td>—</td><td>Opening period <code>[from, to]</code> — years, <code>YYYY-MM</code> or ISO dates, read like the ties' dates; needs <code>timeframes</code> or <code>navigator</code></td></tr>
        <tr><td><code>timeWindowMode</code></td><td>string</td><td><code>'dim'</code></td><td>What <code>setTimeWindow</code> does to ties outside the window: <code>'dim'</code> or <code>'hide'</code>. Either way, nodes left without a tie in the window fade</td></tr>
        <tr><td><code>onSelect</code></td><td>function</td><td>—</td><td><code>({ node, link, event }) =&gt; void</code> on selection; without it, a clicked tie pins its tooltip</td></tr>
        <tr><td><code>minWidth</code></td><td>number</td><td><code>0</code></td><td>Below this width the drawing scrolls sideways instead of crushing the lanes — the drawing only: the header, legend, navigator and footer stay in place. A side details panel needs this much room next to it, or it moves below</td></tr>
        <tr><td><code>nodeRadius</code></td><td>number</td><td><code>18</code></td><td>Node radius in the flow view</td></tr>
    </tbody>
</table>
</div>

## Methods

<pre class="text-content-caption"><code>graph.setFilter(item => !item.noise);   <span class="code-comment">// nodes and ties; a tie hides with either end</span>
graph.setTimeWindow(null, '2024-01');    <span class="code-comment">// open start, through January 2024</span>
graph.select('osmo');                    <span class="code-comment">// or select({ link: id }); clearSelection()</span>
graph.setLinkLabels(false);
graph.setHulls([]);
graph.collapse('sale');                  <span class="code-comment">// expand(id), isCollapsed(id), setFolds(list)</span>
graph.setTimeframe('sale');              <span class="code-comment">// with timeframes; setView([from, to]), getView(), onViewChange(fn)</span></code></pre>

## Interaction

**Select** — click a node or a tie: its neighbourhood stays, the rest fades, and `onSelect({ node, link, event })` fires; click the background, or press Escape on a focused node, to clear. Without `onSelect`, clicking a tie pins its tooltip instead.

**Keyboard** — the ties and the nodes are two Tab stops, the ties first; each is the selected tie or node, else the one focused last. On a tie, the arrows step through the ties left to right, Home / End go to the first / last, and focus shows its tooltip; Enter or Space selects it as a click does (without `onSelect`, it pins the tooltip), Escape clears. On a node, Enter or Space selects; → follows an outgoing tie, ← an incoming one, ↑ / ↓ move within a lane and on into the next one, so every node can be reached; Home / End go to the first / last node; + and − open and close a fold; Escape clears. Ties are announced as "from → to, category, label".

**Folds** — − on an open fold's anchor collapses it, + on the folded node opens it; the tooltip of a folded node lists what is inside.

**Time** — timeframe buttons and the navigator brush pick a period; ties outside it dim (or go, with `timeWindowMode: 'hide'`).

**Legend** — node groups and tie categories; click a category to hide or show its ties. Categories in `hiddenLinkTypes` start hidden. A node whose ties are all hidden is hidden with them.

**Details** — with `details`, the selected node or tie is explained in a panel inside the card: beside the drawing when the card has room for `minWidth` and the panel, below it otherwise (see the [Graph options](/charts/graph/)).

**Full screen** — ⛶ in the footer opens the trace on the whole screen; Esc or ✕ closes it.

**Narrow screens** — set `minWidth` and the drawing scrolls sideways instead of crushing the lanes, while the title, buttons, legend, navigator and footer stay in place; a details panel moves below the drawing.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/graph-flow-demo.js"></script>
