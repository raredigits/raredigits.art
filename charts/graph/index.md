---
layout: page.njk
title: "Graph (Network)"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/'
---

The Graph chart renders a force-directed network: nodes connected by typed links. It is meant for relationship-heavy data where the structure is the message: who is connected to whom, how tightly, and by what kind of relationship.

This is not a “diagram editor”. It is a readable, interactive network view designed for dashboards and reports: clean styling, explicit data model, sensible defaults, and just enough interaction to explore without turning the page into a physics simulator.

<div id="knowledge-graph"></div>

### Data model

A graph is passed as { nodes, links }.

Nodes are objects with a required id and label, and optional visual hints:

<pre><code>{
  id: 'a1',
  label: 'Alice',
  group: 'person',     // affects clustering and color
  size: 1.4,           // 0.6..3 (relative multiplier)
  color: '#ff6200',    // optional override
  image: '/avatars/alice.png'  // optional avatar inside the node
}</code></pre>

Links connect nodes via source and target. Both can be node ids (strings) or node objects, depending on where your data comes from:

<pre><code>{
  source: 'a1',
  target: 'c7',
  type: 'professional', // used for styling + legend
  label: 'Worked with', // optional (mainly for your tooltipFormat)
  strength: 0.7         // 0..1, influences thickness + force strength
}</code></pre>

RareCharts deep-copies the input data before passing it into D3, so the simulation can mutate positions freely without corrupting your application state.

### Link types, arrows, and legend

Links are “typed”. The type field controls color, dash style, arrow markers, and legend labels through the linkTypes option.

<div id="thiel-graph"></div>

If you do not provide linkTypes, the chart falls back to a single `default` type. If you do provide it, each link type becomes a first-class visual category. Arrow markers are generated per type automatically, and the legend is built from the types present in the data.

This is what keeps the graph readable when the network is not just “connected”, but “connected in different ways”.

### Interaction (the useful kind)

The chart supports a few interactions that are practical in real use:

Zoom and pan are enabled by default (`zoom: true`). Scroll zoom + drag canvas works as expected, and double-click zoom is intentionally disabled (because it’s almost always accidental).

Node dragging is supported out of the box. Dragging temporarily increases simulation energy so the layout can relax into a new state, then cools down again.

Focus on click is enabled by default (`focusOnClick: true`). Clicking a node dims unrelated nodes and links, keeping only the neighborhood visible. Clicking the background clears focus. This is the fastest way to explore dense graphs without adding a sidebar UI.

### Tooltip customization

Graph includes a tooltip layer and exposes `tooltipFormat ({ node, links }) => html`.

On hover, the chart collects all links connected to the hovered node and passes them into the formatter. If you do not provide one, a default tooltip groups connections by link type and lists connected node names under each type label.

In other words: you can keep the default for “good enough”, or you can render a rich tooltip that matches your product language.

### Layout behavior and “clustering”

The simulation combines standard forces (link, charge, center, collision) with a small but important addition: nodes are softly pulled toward group anchors arranged in a circle. This makes nodes of the same group naturally cluster without hard-locking the layout.

It is a subtle effect, but it prevents the classic force-layout problem where a graph looks like spilled rice unless you manually tune everything.

For larger graphs (more than ~60 nodes), the simulation cools down faster to avoid endless motion.

Options

Graph exposes a small set of parameters that actually change behavior:
- `height` (default 520)
- `nodeRadius` (default 22) and per-node size multiplier
- `linkDistance` (default 120)
- `chargeStrength` (default -400)
- `animate` (run simulation; default true)
- `focusOnClick` (default true)
- `zoom` (default true)
- `linkTypes` (type styling map; can also use presets)
- `tooltipFormat` (custom tooltip renderer)

A minimal example:

<pre><code>new RareCharts.Graph('#chart', {
  height: 520,
  nodeRadius: 20,
  linkDistance: 120,
  chargeStrength: -420,
  zoom: true,
  focusOnClick: true,
  linkTypes: RareCharts.linkPresets.personal,
}).setData({ nodes, links });</code></pre>

### Practical notes

Graph charts are powerful, but they are not magic. If you have 200 nodes with the same label and random links, the chart will faithfully visualize your chaos. The fastest way to make a graph readable is still the boring one: good grouping, meaningful link types, and sane filtering (top relationships, threshold by strength, or “show neighborhood of X”).

RareCharts gives you the structure and interaction. The dataset still has to deserve it.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/graph-chart-knowledge.js"></script>
<script src="/assets/charts/examples/graph/graph-chart-thiel.js"></script>