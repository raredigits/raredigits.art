---
layout: page.njk
title: "Graph (Network)"
section: "Charts"
displaySidebar: true
permalink: '/charts/graph/'
---

The Graph chart renders networks of relationships — entity connections, agent networks, blockchain addresses. Instead of a single force simulation, it is a viewport over a headless graph model with deterministic views: **ego** (who surrounds a node), **path** (how two nodes are connected), **cluster** (the shape of the whole network), and **[flow](/charts/graph/flow/)** (a trace of value moving through ordered lanes — money trails, supply chains). You never draw the full graph — you draw the answer to a query.

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> <code>Graph</code> is not covered by the 1.0 stability guarantee — its layout, rendering, and options may change without a major-version bump. For production reporting, prefer the stable chart types.</p>
</div>

### Ego view

Nodes snap to a regular grid sized for the neighborhood. The focused node is pinned to the center cell; every category (node `group`) owns a home corner or edge and fills cells from its far corner toward the center — so the deepest connections sit at the rim and first-ring ones end up next to the ego, and distance from the center still reads as degrees of separation. When one category holds almost the whole neighbourhood (over 80% of at least six nodes), it has no corners to share: it fills the grid from the ego outwards instead, first ring nearest, and the few others sit just outside it towards their corners. The layout is deterministic — same data, same picture. Nodes are monochrome with a category glyph; color belongs to the links, and the filled dark node marks the current center. Click any node to recenter on it: the chart queries the source for that node's neighborhood, and nodes present in both views travel to their new positions instead of being redrawn. Zoom out to switch to the cluster overview (semantic zoom).

<div id="graph-ego"></div>

### Path view

"How are A and B connected?" — up to `pathCount` edge-disjoint routes, laid out left to right: columns are hops, each route gets its own row with a hop-count caption, and the shortest route is visually emphasized while the alternatives recede. Each endpoint's other connections fan out behind it, faded — showing that both nodes are well connected beyond these routes (disable with `pathContext: false`). Pathfinding is the data source's job (server-side on a real backend), because the client only holds the neighborhoods it has walked.

<div id="graph-path"></div>

### Cluster view

The whole network collapsed into communities (Louvain). Meta-nodes stand on the same kind of grid as the ego view — the largest community in the centre, the rest spiralling out — so big communities never overlap. Each meta-node is labelled by its most-connected member; size encodes the community size, link width the number of real edges between groups (up to eight; more draw at full width). Click a community to dive into the ego view of its top member; zoom in to dive back to the last ego view.

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

Ids arrive as strings. `types` is an array of relation types, or `null` for all; the path view also asks `neighbors(id, { depth: 1 })` for each endpoint's context. `paths()` must return `paths` — arrays of node ids, shortest first — with the `nodes` and `links` along them; for a node and itself (`connect(a, a)`) that is one route of one node, `[[a]]`, which the path view draws alone, without routes or context. `aggregates()` returns `communities: [{ id, label, size, top }]` (`top` is the member a click focuses) and `links: [{ source, target, weight }]` between community ids, `weight` being the number of ties. A query that throws is logged to the console and the view stays as it was.

For static payloads, `RareCharts.memorySource(data)` simulates that backend over a full in-memory graph:

<pre class="text-content-caption"><code>const dataSource = RareCharts.memorySource({ nodes, links });
new RareCharts.Graph('#chart', { dataSource, depth: 2 }).focus('some-node');</code></pre>

The option is named `dataSource` because `source` keeps its usual RareCharts meaning — the attribution line in the chart footer.

Everything the user walks through accumulates in a client-side model: views are laid out from it, and nodes keep their identity from one view to the next, so shared nodes travel instead of being redrawn. It is not a response cache: every `focus()`, `connect()`, `overview()` and `back()` asks the source again, with the current depth and relation filter, so a source that is slow or expensive to call should cache its own answers. Swapping `memorySource` for a real backend adapter changes nothing else.

### Nodes

Each node requires only `id`. `label` and every other field are optional; when no label is supplied, Graph displays the id:

<div class="table-scroll card-caption">
<table class="table-bordered">
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
      <td>—</td>
      <td>Node category: picks the glyph inside the node (<code>nodeIcons</code>), the ego sector with <code>groupBy: 'group'</code> (nodes without a group share an <code>other</code> sector) and the category line of the tooltip. Nodes stay monochrome; in the flow view <code>nodeGroups</code> colors nodes by group</td>
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
    <tr>
      <td><code>note</code></td>
      <td>string</td>
      <td>—</td>
      <td>A paragraph about the node in the built-in details panel (<code>details: true</code>); <code>description</code> is read too</td>
    </tr>
  </tbody>
</table>
</div>

### Links

Each link requires `source` and `target` node ids:

<div class="table-scroll card-caption">
<table class="table-bordered">
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
      <td>Source node id (required). <code>from</code> is accepted as an alias</td>
    </tr>
    <tr>
      <td><code>target</code></td>
      <td>string</td>
      <td>—</td>
      <td>Target node id (required). <code>to</code> is accepted as an alias</td>
    </tr>
    <tr>
      <td><code>id</code></td>
      <td>string</td>
      <td>derived</td>
      <td>Identity of the tie. Without it, the same pair and <code>type</code> is one tie: loading it again updates it in place</td>
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
      <td><code>0</code>–<code>1</code>. Observable tie strength from your domain (deal count, transaction volume). Drives line thickness and the choice of a node's primary branch in the ego layout. <code>strength</code> is accepted as a legacy alias; when a link has both, <code>weight</code> wins</td>
    </tr>
    <tr>
      <td><code>label</code></td>
      <td>string</td>
      <td>—</td>
      <td>Shown in the tie's tooltip, not rendered on the graph</td>
    </tr>
    <tr>
      <td><code>sources</code></td>
      <td>array</td>
      <td>—</td>
      <td><code>[{ url, title }]</code> or URL strings — evidence for the tie, listed in its tooltip and the details panel. <code>http(s)</code>, site-root (<code>/…</code>) and <code>#</code> URLs become links (click the tie to pin it and follow them); anything else is shown as text</td>
    </tr>
  </tbody>
</table>
</div>

**Several ties between one pair.** A pair can carry ties of different types — family, investment and employment at once. They are drawn as parallel arcs; a pair with more than three ties collapses into one line with a `+N` badge, and its tooltip lists them all. Filtering a type in the legend hides only that type's arc, not the pair. The same tie listed in both directions counts once — in the drawing, the tooltip and the details panel (the flow view, where direction matters, keeps both).

Note the division of labor: link **weight** is data you bring (observable ties), while node **importance** is computed — with `sizeBy: 'degree'` a node's size follows how many distinct neighbors it has in everything loaded, so "who has the most connections" is an answer, not an input.

### Link types

The `type` field on a link is resolved against the `linkTypes` map you pass in. Each entry defines how that type looks:

<pre class="text-content-caption"><code>{
  professional: { color: '#00aaff', dash: null, label: 'Professional' },
  family:       { color: '#00c97a', dash: null, label: 'Family'       },
}</code></pre>

- `color` — stroke color for the link line and arrow
- `dash` — SVG `stroke-dasharray` string, or `null` for solid
- `label` — text shown in the legend

A link without a type belongs to the `default` type. While you pass no `linkTypes`, the ego, path and cluster views draw it gray (`#888888`) and label it *Connection*; with a `linkTypes` map or a preset — and always in the flow view — it takes the theme's muted color and the label *connection*, unless the map describes `default` itself. A type that `linkTypes` does not describe takes a palette color by its order among the types in use — the same rule in every relation chart (Graph views, Sankey, Map Flows). The tooltip and the details panel name a tie's category the way the drawing colors it. Five presets are available via `RareCharts.linkPresets`:

<div class="table-scroll">

| Preset | Types |
|--------|-------|
| `personal` | professional, family, friendship, investment, philanthropy, education |
| `knowledge` | partOf, causes, related, example, contradicts, prerequisite, extends |
| `org` | subsidiary, investment, board, partnership, acquisition, competitor |
| `tech` | depends, calls, dataFlow, inherits, optional |
| `causal` | causes, enables, blocks, correlates, weakens |

</div>

### Options

Common options shared by all chart types (`title`, `subtitle`, `source`, `note`, `controls`, `theme`) are documented on the [Settings](/charts/settings/) page. Graph ignores `margin`: the drawing fills the card.

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
        <tr>
            <td><code>view</code></td>
            <td>string</td>
            <td><code>'ego'</code></td>
            <td><code>'flow'</code> turns on the flow view (lanes and trace options: see <a href="/charts/graph/flow/">Flow view</a>). Otherwise the view follows the method you call — <code>focus()</code> (ego), <code>connect()</code> (path), <code>overview()</code> (cluster); <code>setData()</code> opens an ego view</td>
        </tr>
        <tr>
            <td><code>dataSource</code></td>
            <td>object</td>
            <td>—</td>
            <td>Source adapter (see Data source above). Optional if you call <code>setData()</code></td>
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
            <td>Ego view: legend items filter relation types. A regular click isolates one type; Shift/Ctrl/Cmd-click toggles types in a multi-selection. The flow view's legend always hides and shows categories (see <a href="/charts/graph/flow/">Flow view</a>)</td>
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
            <td><code>'recenter'</code>, a <code>({ node, event }) =&gt; …</code> callback, or <code>null</code> (also <code>false</code>): clicks do nothing</td>
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
            <td>Card height in px — title, legend, breadcrumbs and footer included; on a narrow card they wrap and take more of it, and the drawing gets what is left (see Sizing below)</td>
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
            <td><code>details</code></td>
            <td>boolean | element | selector</td>
            <td>—</td>
            <td>A details panel inside the card. <code>true</code>: the library shows the hovered node or the clicked tie (in the ego view the focused node when nothing is hovered; in the flow view the selected node or tie) — name, group, connections, a node's <code>note</code>, a tie's value, period and <code>sources</code>. An element or selector: your own panel, which gets the class <code>rc-graph-details</code> — it styles <code>h4</code>, <code>dl</code>, <code>ul</code> and the <code>.rc-graph-details-kind</code> / <code>.rc-graph-details-muted</code> lines, so your content can match the built-in panel; in the flow view fill it from <code>onSelect</code> (the other views have no selection event). Beside the drawing when the card is at least <code>detailsBreakpoint</code> wide, below it otherwise; in the flow view the drawing also keeps <code>minWidth</code> beside the panel</td>
        </tr>
        <tr>
            <td><code>detailsFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ node, link, view }) =&gt; html</code> for <code>details: true</code></td>
        </tr>
        <tr>
            <td><code>detailsWidth</code> / <code>detailsBreakpoint</code> / <code>detailsHeight</code></td>
            <td>number</td>
            <td><code>300</code> / <code>1000</code> / <code>200</code></td>
            <td>Side panel width; card width from which the panel sits beside the drawing; panel height when it sits below (the card grows by it)</td>
        </tr>
        <tr>
            <td><code>fullscreen</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Full-screen button in the footer tools; Esc or the button exits. Programmatic: <code>toggleFullscreen(on?)</code></td>
        </tr>
        <tr>
            <td><code>maxNodes</code></td>
            <td>number | 'auto'</td>
            <td><code>'auto'</code></td>
            <td>Cap on rendered ego nodes. <code>'auto'</code> derives it from the canvas size (at least 12); first-ring and best-connected nodes win. Clicking <code>+N more</code> opens the omitted-node list, where any node can become the new focus</td>
        </tr>
        <tr>
            <td><code>draggable</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Nodes can be hand-dragged to fine-tune the picture; positions persist until the next view change. Movement under 6 px counts as a click</td>
        </tr>
        <tr>
            <td><code>linkTypes</code></td>
            <td>object</td>
            <td><code>{ default: … }</code></td>
            <td>Type styling map or a preset (see Link types above); without it, untyped ties are gray <code>#888888</code>, labelled <em>Connection</em></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ node, links }) =&gt; html</code> — custom tooltip renderer</td>
        </tr>
        <tr>
            <td><code>linkTooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ link, source, target }) =&gt; html</code> — tooltip for a tie; <code>source</code>/<code>target</code> are the endpoint nodes</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td>number</td>
            <td><code>500</code></td>
            <td>Transition ms for view changes; respects reduced-motion</td>
        </tr>
    </tbody>
</table>
</div>

### Sizing

Graph lays nodes out on a grid: one node per cell of about **96 × 50 px** (the node and its label). The drawing area therefore decides how many nodes fit — roughly `floor(width / 96) × floor(height / 50) − 1` around the focused node. A larger neighbourhood is capped to the best-connected nodes; a `+N more` button in the footer lists the rest — pick one to recenter on it — and the **full-screen** button (⛶) gives the graph the whole screen, so more of it fits (see `maxNodes`, `fullscreen`).

`height` is the whole card — title, legend, breadcrumbs and footer included; the drawing gets what is left, typically 80–120 px less.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>View</th>
            <th>Width</th>
            <th>Height</th>
            <th>Holds</th>
        </tr>
    </thead>
    <tbody>
        <tr><td>Ego, cluster</td><td>720 px and up</td><td><code>520</code>–<code>640</code></td><td>~35 nodes at 720 × 520, ~80 at 960 × 640; full screen on a laptop, ~150</td></tr>
        <tr><td>Path</td><td>640 px and up</td><td><code>360</code> for 3 routes, +110 per extra route</td><td>3–5 routes with endpoint context</td></tr>
        <tr><td>Flow</td><td><code>minWidth</code> ≈ 120–170 px per lane</td><td>~110 px per row in use + 160</td><td>lanes scroll sideways below <code>minWidth</code></td></tr>
    </tbody>
</table>
</div>

- **Neighbourhood bigger than the card?** Enlarge `height` first (width is usually fixed by the page column), then lower `depth` to 1, or set `maxNodes` to show a curated top slice.
- **Narrow screens.** Below ~480 px an ego neighbourhood of more than ~15 nodes does not read; use `depth: 1`, a smaller `maxNodes`, or the flow view with `minWidth` and sideways scrolling.
- **Long labels** are cut to the cell width with an ellipsis; the full name is in the tooltip.

### Methods

Methods return the chart instance, so calls chain — except `whenReady()` (a promise), `isCollapsed(id)` (a boolean) and `getView()` (the current period). Fetching and rendering are async: `whenReady()` resolves when queued view changes are done. A query that fails is logged to the console and the promise still resolves.

<pre class="text-content-caption"><code>const graph = new RareCharts.Graph('#chart', { dataSource, depth: 2 });

graph.focus('peter-thiel');              // ego view around a node
graph.focus('peter-thiel', {
  types: ['investment', 'professional'], // filter the neighbors() query
});
graph.connect('peter-thiel', 'target');  // routes between two nodes
graph.overview();                        // community overview
graph.setData({ nodes, links });         // static payload: memorySource + focus on the best-connected node
graph.setData({ nodes, links }).focus('peter-thiel');
                                         // start elsewhere: chain it, no whenReady() in between
graph.add({ links: [{ source: 'a', target: 'b', type: 'deal' }] });
                                         // incremental: merge one news-sized payload
graph.hide('noisy-node');                // declutter; show(id) brings it back
graph.setRelationTypes(['investment']);  // update the current ego filter
graph.clearRelationTypes();              // restore all relation types
graph.back();                            // previous ego/path/cluster state
graph.clearHistory();                    // keep only the current breadcrumb
graph.toggleFullscreen();                // full screen on/off (also the ⛶ button, Esc)
await graph.whenReady();</code></pre>

`await` at the top level needs a `<script type="module">` or an async function; in a classic `<script>` write `graph.whenReady().then(() => …)`.

`setData()` replaces the data and starts over: the breadcrumbs and `back()` begin with its first view, and the legend lists the relation types of the new data only (under `relationTypes`, the `linkTypes` catalogue). Unless a view method follows in the same tick, it focuses the node with the most distinct neighbours — counted over the ties the view draws, so under `relationTypes` over those types; `from` / `to` count as `source` / `target`, a tie to itself or without both ends does not count. A payload without nodes or ties clears the drawing, its legend and notes.

The flow view adds `setFilter`, `setTimeWindow`, `select` / `clearSelection`, `setLinkLabels`, `setHulls`, the fold methods (`collapse`, `expand`, `isCollapsed`, `setFolds`) and time navigation (`setTimeframe`, `setView`, `getView`, `onViewChange`) — see the Methods section of [Flow view](/charts/graph/flow/).

`add()` is built for feed-driven graphs (a news item asserts a new tie): the minimal payload is a single link — endpoint nodes are created automatically, with the label falling back to the id. It refreshes an ego view. Path and cluster views draw what the source answers, so there the new tie appears with the next ego view (`focus()`); the flow view takes new data through `setData()`.

### Interaction

**Recenter on click** — clicking a node fetches its neighborhood and re-lays the view around it; shared nodes animate to their new positions so you keep your bearings while walking the graph. In the cluster view, clicking a community recenters on its most-connected member.

**Focus + context on hover** — hovering a node highlights its direct neighborhood and fades everything else, along with a tooltip listing connections by type.

**Keyboard** — the nodes share one Tab stop: the focused node in the ego view, the first endpoint in the path view, otherwise the node focused last. ← and → step through the nodes row by row, so every node can be reached; ↑ and ↓ go to the nearest node above or below, Home and End to the first and last. A focused node shows what hover shows — the tooltip, the highlight and the details panel. Enter or Space acts as a click (`onNodeClick`), Escape hides the tooltip and the highlight. Each node is announced by its label, group and number of connections.

**Ties: hover and pin** — hovering a tie highlights it and its two endpoints and shows its tooltip: endpoints, type, label, value, period and `sources`. Clicking a tie pins the tooltip, so links inside it can be followed; a click elsewhere or Escape releases it.

**Filter relations from the legend** — click a relation type to isolate it; Shift/Ctrl/Cmd-click toggles types in a multi-selection. Filtering is applied to the `neighbors()` query and the client-side neighborhood. "Show all" clears the filter. Graphs whose links have no explicit `type` continue to work as a single `default` relation type.

**Reveal omitted nodes** — when the viewport cap removes nodes from the drawing, a `+N more` button appears in the footer tools; it opens an accessible list. Or open the graph full screen (⛶) — the bigger canvas fits more. Selecting an item recenters the graph on it. Capacity omissions are separate from nodes hidden explicitly with `hide()`.

**Breadcrumb navigation** — after more than one semantic view has been visited, Graph shows a clickable history of ego, path, and cluster states. Returning through a breadcrumb or `back()` restores the relation filter together with the view; literal pan and zoom are deliberately reset.

**Footer tools** — +/− zoom, ⟲ resets, dragging the background pans (the mouse wheel deliberately stays with page scrolling). ⛶ opens the graph full screen; Esc or ✕ closes it. When nodes did not fit, `+N more` lists them; `N hidden · restore` brings back nodes hidden with a right-click.

**Node dragging** — drag any node to fine-tune the picture (no simulation fights back); hand-placed positions survive re-renders until the next view change. A click with a slight tremor (under 6 px) stays a click.

**Hide on right-click** — right-click any node in the ego view to hide it (the focused center is exempt); an "N hidden · restore" button in the footer tools brings everything back. Same mechanism as the `hidden` field and `hide(id)`/`show(id)` — the node stays in the model and in path routes.

**Semantic zoom** — zooming far out of an ego view switches to the cluster overview; zooming into the overview returns to the last ego view. Disable with `semanticZoom: false`.

### Minimal example

<pre class="text-content-caption"><code>new RareCharts.Graph('#chart', {
  linkTypes: RareCharts.linkPresets.personal,
  depth: 2,
}).setData({ nodes, links });</code></pre>

### Notes

The demos on this page run on a ~300-node synthetic network around Peter Thiel (generated deterministically — a stand-in for a graph database). The layouts are deterministic by design: grid cells, category corners and route maps encode what is known about the data instead of asking a physics simulation to discover it. If a view still looks busy, reduce `depth`, filter link types, or let the cluster view do the summarizing.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/graph/demo-data.js"></script>
<script src="/assets/charts/examples/graph/graph-ego.js"></script>
<script src="/assets/charts/examples/graph/graph-path.js"></script>
<script src="/assets/charts/examples/graph/graph-cluster.js"></script>
<script src="/assets/charts/examples/graph/columbus-data.js"></script>
<script src="/assets/charts/examples/graph/graph-columbus.js"></script>
