---
layout: page.njk
title: "Graph (Network)"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/'
---

The Graph chart renders a force-directed network: nodes connected by typed links. Use it when the structure of relationships is the message — who is connected to whom, how tightly, and in what way.

<div id="knowledge-graph"></div>

### How it works

The layout is driven by a physics simulation (D3 force). Each node repels every other node, while links act like springs pulling connected nodes together. The simulation runs until it reaches equilibrium, then stops.

A few extra forces keep things readable:

- **Collision** prevents nodes from overlapping
- **Clustering** softly pulls nodes of the same `group` toward a shared anchor point — same-group nodes naturally cluster without hard-locking the layout
- **Center** keeps the graph from drifting off-screen

Node size affects how hard it pushes: larger nodes repel stronger, so hubs naturally create space around themselves.

### Nodes

Each node requires `id` and `label`. Everything else is optional:

<table class="table-bordered card-caption">
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
      <td><code>id</code></td>
      <td>string</td>
      <td>—</td>
      <td>Unique identifier (required)</td>
    </tr>
    <tr>
      <td><code>label</code></td>
      <td>string</td>
      <td>—</td>
      <td>Display name (required)</td>
    </tr>
    <tr>
      <td><code>group</code></td>
      <td>string</td>
      <td><code>default</code></td>
      <td>Affects node color and clustering</td>
    </tr>
    <tr>
      <td><code>size</code></td>
      <td>number</td>
      <td><code>1</code></td>
      <td>Radius multiplier, <code>0.6</code>–<code>3</code></td>
    </tr>
    <tr>
      <td><code>color</code></td>
      <td>string</td>
      <td>group color</td>
      <td>CSS color override</td>
    </tr>
    <tr>
      <td><code>image</code></td>
      <td>string</td>
      <td>—</td>
      <td>Avatar URL, rendered inside the circle</td>
    </tr>
  </tbody>
</table>

### Links

Each link requires `source` and `target` — either node id strings or node objects:

<table class="table-bordered card-caption">
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
      <td><code>source</code></td>
      <td>string \| node</td>
      <td>—</td>
      <td>Source node id or object (required)</td>
    </tr>
    <tr>
      <td><code>target</code></td>
      <td>string \| node</td>
      <td>—</td>
      <td>Target node id or object (required)</td>
    </tr>
    <tr>
      <td><code>type</code></td>
      <td>string</td>
      <td><code>'default'</code></td>
      <td>Controls color, dash style, arrow, and legend label</td>
    </tr>
    <tr>
      <td><code>label</code></td>
      <td>string</td>
      <td>—</td>
      <td>Available in <code>tooltipFormat</code>, not rendered on the graph</td>
    </tr>
    <tr>
      <td><code>strength</code></td>
      <td>number</td>
      <td><code>0.5</code></td>
      <td><code>0</code>–<code>1</code>. Affects link distance and line thickness</td>
    </tr>
  </tbody>
</table>

### Link types

The `type` field on a link is resolved against the `linkTypes` map you pass in. Each entry defines how that type looks:

<pre class="text-content-caption"><code>{
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

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
  linkTypes: {
    ...RareCharts.linkPresets.knowledge,
    contradicts: { color: '#ff3b5c', dash: '2,3', label: 'Contradicts' },
  },
})</code></pre>

<div id="thiel-graph"></div>

### Options

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
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>520</code></td>
            <td>Container height in px</td>
        </tr>
        <tr>
            <td><code>nodeRadius</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Base node radius in px. Per-node <code>size</code> multiplies this</td>
        </tr>
        <tr>
            <td><code>linkDistance</code></td>
            <td>number</td>
            <td><code>140</code></td>
            <td>Base spring length in px. Longer = more breathing room</td>
        </tr>
        <tr>
            <td><code>chargeStrength</code></td>
            <td>number</td>
            <td><code>-600</code></td>
            <td>Repulsion force. More negative = nodes push further apart</td>
        </tr>
        <tr>
            <td><code>focusOnClick</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>
                Click a node to dim unrelated nodes and links.<br>
                Click background to clear
            </td>
        </tr>
        <tr>
            <td><code>zoom</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>
                Enable scroll-to-zoom and drag-to-pan.<br>
                Double-click zoom is disabled
            </td>
        </tr>
        <tr>
            <td><code>linkTypes</code></td>
            <td>object</td>
            <td><code>{ default: … }</code></td>
            <td>Type styling map or a preset</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ node, links }) =&gt; html</code> — custom tooltip renderer</td>
        </tr>
    </tbody>
</table>

### Interaction

**Zoom and pan** — scroll to zoom, drag the background to pan. Double-click zoom is intentionally disabled.

**Node drag** — drag any node to reposition it. The simulation briefly wakes up to relax the surrounding layout, then cools down again.

**Focus on click** — click a node to dim everything unrelated to it. Only that node, its direct neighbors, and the links between them stay visible. Click the background to reset.

### Tooltip

The default tooltip groups connections by type and lists connected node names. Override it with `tooltipFormat`:

<pre class="text-content-caption"><code>tooltipFormat: ({ node, links }) => `
  &lt;strong&gt;${node.label}&lt;/strong&gt;
  &lt;div&gt;${links.length} connections&lt;/div&gt;
`</code></pre>

`links` contains all links connected to the hovered node, with full source/target objects resolved by D3.

### Minimal example

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
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
