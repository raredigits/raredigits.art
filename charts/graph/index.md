---
layout: page.njk
title: "Graph (Network)"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/'
---

The Graph chart renders a force-directed network: nodes connected by typed links. Use it when the structure of relationships is the message — who is connected to whom, how tightly, and in what way.

<div id="knowledge-graph"></div>

### How it works

The layout is driven by a physics simulation (D3 force). Each node repels every other node, while links act like springs pulling connected nodes together. The simulation runs until it reaches equilibrium, then stops.

A few extra forces keep things readable:

- **Collision** prevents nodes from overlapping
- **Clustering** softly pulls nodes of the same `group` toward a shared anchor point — same-group nodes naturally cluster without hard-locking the layout
- **Center** keeps the graph from drifting off-screen

Node size affects how hard it pushes: larger nodes repel stronger, so hubs naturally create space around themselves.

### Nodes

Each node requires `id` and `label`. Everything else is optional:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | — | Unique identifier (required) |
| `label` | string | — | Display name (required) |
| `group` | string | `'default'` | Affects node color and clustering |
| `size` | number | `1` | Radius multiplier, `0.6`–`3` |
| `color` | string | group color | CSS color override |
| `image` | string | — | Avatar URL, rendered inside the circle |

### Links

Each link requires `source` and `target` — either node id strings or node objects:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | string \| node | — | Source node id or object (required) |
| `target` | string \| node | — | Target node id or object (required) |
| `type` | string | `'default'` | Controls color, dash style, arrow, and legend label |
| `label` | string | — | Available in `tooltipFormat`, not rendered on the graph |
| `strength` | number | `0.5` | `0`–`1`. Affects link distance and line thickness |

### Link types

The `type` field on a link is resolved against the `linkTypes` map you pass in. Each entry defines how that type looks:

<pre><code>{
  professional: { color: '#00aaff', dash: null, label: 'Professional' },
  family:       { color: '#00c97a', dash: null, label: 'Family'       },
}</code></pre>

- `color` — stroke color for the link line and arrow
- `dash` — SVG `stroke-dasharray` string, or `null` for solid
- `label` — text shown in the legend

If a link type is not found in `linkTypes`, it falls back to `t.muted` (theme gray).

#### Built-in presets

Five presets are available via `RareCharts.linkPresets`:

| Preset | Types |
|--------|-------|
| `personal` | professional, family, friendship, investment, philanthropy, education |
| `knowledge` | partOf, causes, related, example, contradicts, prerequisite, extends |
| `org` | subsidiary, investment, board, partnership, acquisition, competitor |
| `tech` | depends, calls, dataFlow, inherits, optional |
| `causal` | causes, enables, blocks, correlates, weakens |

You can use a preset as-is or extend it:

<pre><code>new RareCharts.Graph('#chart', {
  linkTypes: {
    ...RareCharts.linkPresets.knowledge,
    contradicts: { color: '#ff3b5c', dash: '2,3', label: 'Contradicts' },
  },
})</code></pre>

<div id="thiel-graph"></div>

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `height` | number | `520` | Container height in px |
| `nodeRadius` | number | `22` | Base node radius in px. Per-node `size` multiplies this |
| `linkDistance` | number | `140` | Base spring length in px. Longer = more breathing room |
| `chargeStrength` | number | `-600` | Repulsion force. More negative = nodes push further apart |
| `focusOnClick` | boolean | `true` | Click a node to dim unrelated nodes and links. Click background to clear |
| `zoom` | boolean | `true` | Enable scroll-to-zoom and drag-to-pan. Double-click zoom is disabled |
| `linkTypes` | object | `{ default: … }` | Type styling map or a preset |
| `tooltipFormat` | function | built-in | `({ node, links }) => html` — custom tooltip renderer |

### Interaction

**Zoom and pan** — scroll to zoom, drag the background to pan. Double-click zoom is intentionally disabled.

**Node drag** — drag any node to reposition it. The simulation briefly wakes up to relax the surrounding layout, then cools down again.

**Focus on click** — click a node to dim everything unrelated to it. Only that node, its direct neighbors, and the links between them stay visible. Click the background to reset.

### Tooltip

The default tooltip groups connections by type and lists connected node names. Override it with `tooltipFormat`:

<pre><code>tooltipFormat: ({ node, links }) => `
  &lt;strong&gt;${node.label}&lt;/strong&gt;
  &lt;div&gt;${links.length} connections&lt;/div&gt;
`</code></pre>

`links` contains all links connected to the hovered node, with full source/target objects resolved by D3.

### Minimal example

<pre><code>new RareCharts.Graph('#chart', {
  height: 520,
  linkTypes: RareCharts.linkPresets.personal,
  chargeStrength: -600,
  focusOnClick: true,
  zoom: true,
}).setData({ nodes, links });</code></pre>

### Notes

Force layout is not magic. If the data is chaotic, the graph will look chaotic. The fastest way to make a graph readable: meaningful groups, typed links, and filtered data (top N connections, or "neighborhood of X"). RareCharts gives you the structure and interaction — the dataset still has to deserve it.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/graph-chart-knowledge.js"></script>
<script src="/assets/charts/examples/graph/graph-chart-thiel.js"></script>
