---
layout: page.njk
title: "Graph (Network)"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/'
---

The Graph chart renders networks of relationships — entity connections, agent networks, blockchain addresses. Instead of a single force simulation, it is a viewport over a headless graph model with three deterministic views: **ego** (who surrounds a node), **path** (how two nodes are connected), and **cluster** (the shape of the whole network). You never draw the full graph — you draw the answer to a query.

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> <code>Graph</code> is not covered by the 1.0 stability guarantee — its layout, rendering, and options may change without a major-version bump. For production reporting, prefer the stable chart types.</p>
</div>

### Ego view

Nodes snap to a regular grid sized for the neighborhood. The focused node is pinned to the center cell; every category (node `group`) owns a home corner or edge and fills cells from its far corner toward the center — so the deepest connections sit at the rim and first-ring ones end up next to the ego, and distance from the center still reads as degrees of separation. The layout is deterministic — same data, same picture. Nodes are monochrome with a category glyph; color belongs to the links, and the filled dark node marks the current center. Click any node to recenter on it: the chart queries the source for that node's neighborhood, and nodes present in both views travel to their new positions instead of being redrawn. Zoom out to switch to the cluster overview (semantic zoom).

<div id="graph-ego"></div>

### Path view

"How are A and B connected?" — up to `pathCount` edge-disjoint routes, laid out left to right: columns are hops, each route gets its own row with a hop-count caption, and the shortest route is visually emphasized while the alternatives recede. Each endpoint's other connections fan out behind it, faded — showing that both nodes are well connected beyond these routes (disable with `pathContext: false`). Pathfinding is the data source's job (server-side on a real backend), because the client only holds the neighborhoods it has walked.

<div id="graph-path"></div>

### Cluster view

The whole network collapsed into communities (Louvain). Each meta-node is labelled by its most-connected member; size encodes the community size, link width the number of real edges between groups. Click a community to dive into the ego view of its top member; zoom in to dive back to the last ego view.

<div id="graph-cluster"></div>

### Example: warm-intro routing

A CRM-style scenario: the ego view is centered on a sales rep, and target leads — deliberately not connected to the rep — are marked with a star glyph. Clicking a lead answers the question that matters: *who can introduce me?* The `onNodeClick` callback switches to the path view with the warm-intro routes; clicking the rep restores the ego view. Category glyphs (person, company, partner org, ★ lead) carry the node semantics, so all the color stays on the relationship types.

<div id="graph-columbus"></div>

### Data source

Graph reads data through a source adapter with three async queries — the same contract a real graph backend would implement:

<pre class="text-content-caption"><code>{
  neighbors(id, { depth, types })  // → { nodes, links }         — ego view
  paths(a, b, { k })               // → { paths, nodes, links }  — path view
  aggregates()                     // → { communities, links }   — cluster view
}</code></pre>

For static payloads, `RareCharts.memorySource(data)` simulates that backend over a full in-memory graph:

<pre class="text-content-caption"><code>const dataSource = RareCharts.memorySource({ nodes, links });
new RareCharts.Graph('#chart', { dataSource, depth: 2 }).focus('some-node');</code></pre>

The option is named `dataSource` because `source` keeps its usual RareCharts meaning — the attribution line in the chart footer.

Everything the user walks through accumulates in a client-side model, so revisiting a node doesn't refetch it. Swapping `memorySource` for a real backend adapter changes nothing else.

### Nodes

Each node requires only `id`. `label` and every other field are optional; when no label is supplied, Graph displays the id:

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
      <td><code>id</code></td>
      <td>Display name</td>
    </tr>
    <tr>
      <td><code>group</code></td>
      <td>string</td>
      <td><code>default</code></td>
      <td>Affects node color; can drive ego sectors via <code>groupBy: 'group'</code></td>
    </tr>
    <tr>
      <td><code>size</code></td>
      <td>number</td>
      <td><code>1</code></td>
      <td>Radius multiplier <code>0.6</code>–<code>3</code>; read only with <code>sizeBy: 'field'</code> (nodes are uniform by default)</td>
    </tr>
    <tr>
      <td><code>color</code></td>
      <td>string</td>
      <td>—</td>
      <td>Explicit fill override. By default nodes are monochrome — color encodes link types only</td>
    </tr>
    <tr>
      <td><code>image</code></td>
      <td>string</td>
      <td>—</td>
      <td>Avatar URL, rendered inside the circle</td>
    </tr>
    <tr>
      <td><code>hidden</code></td>
      <td>boolean</td>
      <td><code>false</code></td>
      <td>Keep the node out of the ego view without removing it from the data — for known-but-noisy entities. Runtime equivalent: <code>hide(id)</code> / <code>show(id)</code>. The path view still draws routes through hidden nodes</td>
    </tr>
  </tbody>
</table>

### Links

Each link requires `source` and `target` node ids:

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
      <td>string</td>
      <td>—</td>
      <td>Source node id (required)</td>
    </tr>
    <tr>
      <td><code>target</code></td>
      <td>string</td>
      <td>—</td>
      <td>Target node id (required)</td>
    </tr>
    <tr>
      <td><code>type</code></td>
      <td>string</td>
      <td><code>'default'</code></td>
      <td>Controls color, dash style, arrow, legend label — and ego sectors</td>
    </tr>
    <tr>
      <td><code>weight</code></td>
      <td>number</td>
      <td><code>0.5</code></td>
      <td><code>0</code>–<code>1</code>. Observable tie strength from your domain (deal count, transaction volume). Drives line thickness and the choice of a node's primary branch in the ego layout. <code>strength</code> is accepted as a legacy alias</td>
    </tr>
    <tr>
      <td><code>label</code></td>
      <td>string</td>
      <td>—</td>
      <td>Available in <code>tooltipFormat</code>, not rendered on the graph</td>
    </tr>
  </tbody>
</table>

Note the division of labor: link **weight** is data you bring (observable ties), while node **importance** is computed — the model runs degree and betweenness centrality over everything loaded, so "who has the most connections" and "who do the paths run through" are answers, not inputs.

### Link types

The `type` field on a link is resolved against the `linkTypes` map you pass in. Each entry defines how that type looks:

<pre class="text-content-caption"><code>{
  professional: { color: '#00aaff', dash: null, label: 'Professional' },
  family:       { color: '#00c97a', dash: null, label: 'Family'       },
}</code></pre>

- `color` — stroke color for the link line and arrow
- `dash` — SVG `stroke-dasharray` string, or `null` for solid
- `label` — text shown in the legend

If a link type is not found in `linkTypes`, it falls back to `t.muted` (theme gray). Five presets are available via `RareCharts.linkPresets`:

| Preset | Types |
|--------|-------|
| `personal` | professional, family, friendship, investment, philanthropy, education |
| `knowledge` | partOf, causes, related, example, contradicts, prerequisite, extends |
| `org` | subsidiary, investment, board, partnership, acquisition, competitor |
| `tech` | depends, calls, dataFlow, inherits, optional |
| `causal` | causes, enables, blocks, correlates, weakens |

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
            <td><code>view</code></td>
            <td>string</td>
            <td><code>'ego'</code></td>
            <td>Initial view: <code>'ego'</code> | <code>'path'</code> | <code>'cluster'</code></td>
        </tr>
        <tr>
            <td><code>dataSource</code></td>
            <td>object</td>
            <td>—</td>
            <td>Source adapter (see <a href="#data-source">Data source</a>). Optional if you call <code>setData()</code></td>
        </tr>
        <tr>
            <td><code>depth</code></td>
            <td>number</td>
            <td><code>2</code></td>
            <td>Ego neighborhood depth (rings)</td>
        </tr>
        <tr>
            <td><code>groupBy</code></td>
            <td>string</td>
            <td><code>'group'</code></td>
            <td>Ego sectors by node <code>'group'</code> or by first-ring link <code>'type'</code></td>
        </tr>
        <tr>
            <td><code>sectorLabels</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Caption the ego category corners</td>
        </tr>
        <tr>
            <td><code>hiddenNodes</code></td>
            <td>array</td>
            <td><code>[]</code></td>
            <td>Node ids to keep out of the ego view (see the <code>hidden</code> node field)</td>
        </tr>
        <tr>
            <td><code>relationTypes</code></td>
            <td>array</td>
            <td>—</td>
            <td>Initial ego-view relation filter: only the listed types are traversed and drawn — an off-type tie between two visible nodes stays hidden. Links without a <code>type</code> match <code>'default'</code>. Omit or pass an empty array to show every relation type</td>
        </tr>
        <tr>
            <td><code>interactiveLegend</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Legend items filter relation types. A regular click isolates one type; Shift/Ctrl/Cmd-click toggles types in a multi-selection</td>
        </tr>
        <tr>
            <td><code>breadcrumbs</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show clickable semantic history after the user visits more than one view</td>
        </tr>
        <tr>
            <td><code>historyLimit</code></td>
            <td>number</td>
            <td><code>12</code></td>
            <td>Maximum number of graph states retained by breadcrumb and <code>back()</code> navigation</td>
        </tr>
        <tr>
            <td><code>onNodeClick</code></td>
            <td>string | function</td>
            <td><code>'recenter'</code></td>
            <td><code>'recenter'</code>, a <code>({ node, event }) =&gt; …</code> callback, or <code>null</code></td>
        </tr>
        <tr>
            <td><code>pathCount</code></td>
            <td>number</td>
            <td><code>3</code></td>
            <td>Max routes fetched by <code>connect()</code></td>
        </tr>
        <tr>
            <td><code>pathContext</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Fan the endpoints' other connections behind them in the path view, faded</td>
        </tr>
        <tr>
            <td><code>pathContextCount</code></td>
            <td>number</td>
            <td><code>8</code></td>
            <td>Max context ties per endpoint</td>
        </tr>
        <tr>
            <td><code>semanticZoom</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Zooming out of ego switches to the cluster view, and back</td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>520</code></td>
            <td>Container height in px</td>
        </tr>
        <tr>
            <td><code>nodeRadius</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Base node radius in px. Per-node <code>size</code> multiplies this</td>
        </tr>
        <tr>
            <td><code>nodeIcons</code></td>
            <td>object | false</td>
            <td>built-in set</td>
            <td>Glyphs inside nodes by <code>group</code>: <code>{ group: svgPath }</code> (24×24 viewBox), merged over built-ins for <code>person</code>, <code>company</code>, <code>fund</code>, <code>org</code>, <code>politics</code>, <code>education</code>, <code>crypto</code>, <code>lead</code>, <code>cluster</code>. <code>false</code> renders plain circles</td>
        </tr>
        <tr>
            <td><code>sizeBy</code></td>
            <td>string</td>
            <td>—</td>
            <td>Uniform size by default. <code>'degree'</code> computes size from connectivity in the accumulated model; <code>'field'</code> reads the per-node <code>size</code> value</td>
        </tr>
        <tr>
            <td><code>zoom</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>+/−/reset buttons and drag-to-pan. The mouse wheel is left to page scroll</td>
        </tr>
        <tr>
            <td><code>maxNodes</code></td>
            <td>number | 'auto'</td>
            <td><code>'auto'</code></td>
            <td>Cap on rendered ego nodes. <code>'auto'</code> derives it from the canvas size; first-ring and best-connected nodes win. Clicking <code>+N more</code> opens the omitted-node list, where any node can become the new focus</td>
        </tr>
        <tr>
            <td><code>draggable</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Nodes can be hand-dragged to fine-tune the picture; positions persist until the next view change</td>
        </tr>
        <tr>
            <td><code>linkTypes</code></td>
            <td>object</td>
            <td><code>{ default: … }</code></td>
            <td>Type styling map or a preset</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ node, links }) =&gt; html</code> — custom tooltip renderer</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td>number</td>
            <td><code>500</code></td>
            <td>Transition ms for view changes; respects reduced-motion</td>
        </tr>
    </tbody>
</table>

### Methods

All methods return the chart instance; fetching and rendering are async — `whenReady()` resolves when queued view changes are done.

<pre class="text-content-caption"><code>const graph = new RareCharts.Graph('#chart', { dataSource, depth: 2 });

graph.focus('peter-thiel');              // ego view around a node
graph.focus('peter-thiel', {
  types: ['investment', 'professional'], // filter the neighbors() query
});
graph.connect('peter-thiel', 'target');  // routes between two nodes
graph.overview();                        // community overview
graph.setData({ nodes, links });         // static payload: memorySource + focus
graph.add({ links: [{ source: 'a', target: 'b', type: 'deal' }] });
                                         // incremental: merge one news-sized payload
graph.hide('noisy-node');                // declutter; show(id) brings it back
graph.setRelationTypes(['investment']);  // update the current ego filter
graph.clearRelationTypes();              // restore all relation types
graph.back();                            // previous ego/path/cluster state
graph.clearHistory();                    // keep only the current breadcrumb
await graph.whenReady();</code></pre>

`add()` is built for feed-driven graphs (a news item asserts a new tie): the minimal payload is a single link — endpoint nodes are created automatically, with the label falling back to the id.

### Interaction

**Recenter on click** — clicking a node fetches its neighborhood and re-lays the view around it; shared nodes animate to their new positions so you keep your bearings while walking the graph. In the cluster view, clicking a community recenters on its most-connected member.

**Focus + context on hover** — hovering a node highlights its direct neighborhood and fades everything else, along with a tooltip listing connections by type.

**Filter relations from the legend** — click a relation type to isolate it; Shift/Ctrl/Cmd-click toggles types in a multi-selection. Filtering is applied to the `neighbors()` query and the client-side neighborhood. "Show all" clears the filter. Graphs whose links have no explicit `type` continue to work as a single `default` relation type.

**Reveal omitted nodes** — when the viewport cap removes nodes from the drawing, the underlined `+N more` note opens an accessible list. Selecting an item recenters the graph on it. Capacity omissions are separate from nodes hidden explicitly with `hide()`.

**Breadcrumb navigation** — after more than one semantic view has been visited, Graph shows a clickable history of ego, path, and cluster states. Returning through a breadcrumb or `back()` restores the relation filter together with the view; literal pan and zoom are deliberately reset.

**Zoom buttons** — +/− buttons zoom, ⟲ resets, dragging the background pans. The mouse wheel deliberately stays with page scrolling.

**Node dragging** — drag any node to fine-tune the picture (no simulation fights back); hand-placed positions survive re-renders until the next view change.

**Hide on right-click** — right-click any node in the ego view to hide it (the focused center is exempt); a muted "N hidden · restore" control in the corner brings everything back. Same mechanism as the `hidden` field and `hide(id)`/`show(id)` — the node stays in the model and in path routes.

**Semantic zoom** — zooming far out of an ego view switches to the cluster overview; zooming into the overview returns to the last ego view. Disable with `semanticZoom: false`.

### Minimal example

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
  linkTypes: RareCharts.linkPresets.personal,
  depth: 2,
}).setData({ nodes, links });</code></pre>

### Notes

The demos on this page run on a ~300-node synthetic network around Peter Thiel (generated deterministically — a stand-in for a graph database). The layouts are deterministic by design: rings, sectors, and route maps encode what is known about the data instead of asking a physics simulation to discover it. If a view still looks busy, reduce `depth`, filter link types, or let the cluster view do the summarizing.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/demo-data.js"></script>
<script src="/assets/charts/examples/graph/graph-ego.js"></script>
<script src="/assets/charts/examples/graph/graph-path.js"></script>
<script src="/assets/charts/examples/graph/graph-cluster.js"></script>
<script src="/assets/charts/examples/graph/columbus-data.js"></script>
<script src="/assets/charts/examples/graph/graph-columbus.js"></script>
