---
layout: page.njk
title: "Map — Flows"
section: "Charts"
displaySidebar: true
permalink: '/charts/map/flow/'
---

`MapFlow` draws flows between places over a map: capital, goods, influence. Each flow is an arc from one point to another; its width is the value it carries, its color the type, an arrowhead marks where it goes. It is built on [`Map`](/charts/map/) — the same geometry, projections and theme — and takes the same `{ nodes, links }` shape as [`Graph`](/charts/graph/) and [`Sankey`](/charts/sankey/).

<div class="card text-content-caption card-dashboard-bordered">
  <p><strong>⚠️ Experimental.</strong> <code>MapFlow</code> is not covered by the 1.0 stability guarantee — its rendering and options may change without a major-version bump.</p>
</div>

The smallest case: three places, three flows, two types. Hover an arc for its details; click it to pin the tooltip.

<div class="text-content-caption card-dashboard-bordered">
    <div id="mapflow-triangle"></div>
</div>

## Data

Nodes are places, links are flows between them. A node is placed by its own coordinates or by a country on the map.

<pre class="text-content-caption"><code>new RareCharts.MapFlow('#chart', {
  topoUrl: '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json',
  topoObject: 'countries',
  fitTo: 'links',                                  <span class="code-comment">// frame the flows, not the whole world</span>
  linkTypes: {
    goods:  { color: '#8a5a2b', label: 'goods' },
    silver: { color: '#5b6b7d', label: 'silver', dash: '6 4' },
  },
}).setData({
  nodes: [
    { id: 'LDN', label: 'London', coords: [-0.13, 51.51] },   <span class="code-comment">// [longitude, latitude]</span>
    { id: 'CN',  label: 'China',  country: '156' },           <span class="code-comment">// the country's centroid</span>
  ],
  links: [
    { from: 'CN', to: 'LDN', type: 'silver', value: 2, label: 'silver and tea', start: 1800, end: 1860 },
  ],
});</code></pre>

- **`coords`** — `[longitude, latitude]`, exact.
- **`country`** — a feature id of the map (with world-atlas, the ISO 3166-1 numeric code). The node sits at the centroid of the country's largest polygon, so overseas territories don't pull it into the ocean.
- **`color`** — the dot's color (default: the theme's text color).
- **Flows** — `source` / `target` (or `from` / `to`; a `flows` array is accepted for `links`), plus `type`, `value`, `label`, `start` / `end` and any fields of your own. A flow to an unknown node is dropped with a console warning.

### Drawing

- Each arc follows the **great circle** between its ends and bows slightly to one side, so the flows A → B and B → A never sit on top of each other. Several flows in one direction fan out. An arc too short to show a line between two close places is drawn as its arrowhead alone, pointing at the target.
- The arc is cut where the projection cuts the map. A flow that crosses the edge of a flat map — Tokyo → San Francisco across the Pacific — leaves at one side and comes back at the other, each part bowed on its own. On `'orthographic'` only the near side of the globe is drawn: a place behind it has no dot, a flow toward it runs to the horizon without an arrowhead, and a flow between two hidden places is not drawn (nor in the Tab order).
- **Width** is `value` through a square-root scale (`linkWidth`); a flow without a value is drawn at the minimum width.
- **Color and dash** come from the flow's `type` through `linkTypes`. The legend lists the types in use; click one to hide or show its flows. A flow's tooltip lists its `sources` (`[{ url, title }]` or URLs) as links once pinned; only http(s), site-relative and `#` links are made clickable.
- **Labels** of places give way to each other: a place with more flow keeps its label first, a label that would overlap is left to the tooltip.

## Time

Flows carry `start` and `end` — years, `YYYY-MM` or ISO dates; a missing bound is open. Turn on `timeframes`, `navigator` or both and the map gets a time scale, as [TimeSeries](/charts/line/time-series/) has: `timeframes` puts period buttons in the header, `navigator` a strip under the map with a time axis that shows how many flows run over time — brush it to pick any period. Flows outside the period are hidden (`timeWindowMode: 'dim'` fades them instead), and a place whose flows are all outside fades with them.

<div class="text-content-caption card-dashboard-bordered">
    <div id="mapflow-eurodollar"></div>
</div>

<br>

<pre class="text-content-caption"><code>const chart = new RareCharts.MapFlow('#chart', {
  timeframes: [
    { key: '1957', label: '1957', range: ['1957-01-01', '1957-12-31'] },   <span class="code-comment">// an era</span>
    { key: '1968', label: '1968', range: ['1968-01-01', '1968-12-31'] },
    'ALL',
  ],
  defaultView: ['1957-01-01', '1957-12-31'],   <span class="code-comment">// the period shown first</span>
  navigator: true,
});

chart.setTimeframe('1968');
chart.setTimeWindow(null, '1970');   <span class="code-comment">// everything up to the end of 1970; the buttons and the brush follow</span>
chart.onViewChange(([from, to]) => { /* … */ });</code></pre>

Without the time scale, `setTimeWindow(from, to)` filters the flows on its own, and your page can drive it from any control.

## Options

Every geometry option of [`Map`](/charts/map/) works the same here (`topoUrl`, `topoData`, `geoUrl`, `geoData`, `topoObject`, `projection`, `rotate`, `fitPadding`, `featureFilter`, `clipExtent`, `defaultFill`, `borderColor`, `graticule`, `zoom`…); common options (`title`, `subtitle`, `source`, `note`, `controls`, `theme`) are on the [Settings page](/charts/settings/).

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
        <tr><td><code>height</code></td><td>number</td><td><code>420</code></td><td>Card height in px — title, period buttons, navigator and footer included, the map gets the rest; the type legend adds its own row</td></tr>
        <tr><td><code>nodes</code> / <code>links</code></td><td>array</td><td>—</td><td>Data at construction; or call <code>setData({ nodes, links })</code></td></tr>
        <tr><td><code>linkTypes</code></td><td>object</td><td>—</td><td><code>{ type: { color, dash?, label } }</code>; a flow without a type is drawn in the muted color; a type not described here takes a palette color</td></tr>
        <tr><td><code>hiddenLinkTypes</code></td><td>array</td><td><code>[]</code></td><td>Types hidden at start; the legend shows them dimmed and turns them on</td></tr>
        <tr><td><code>linkLegend</code></td><td>boolean</td><td><code>true</code></td><td>The type legend (shown with two or more types, or when <code>linkTypes</code> is set)</td></tr>
        <tr><td><code>linkWidth</code></td><td>object</td><td><code>{ by: 'value', scale: 'sqrt', min: 1, max: 6 }</code></td><td>Arc width from a value field; <code>scale: 'linear'</code> also available. The arrowhead grows with the arc, more slowly</td></tr>
        <tr><td><code>bend</code></td><td>number</td><td><code>0.18</code></td><td>How far an arc bows to its side: <code>bend</code> × 0.6 of the arc's length, at most <code>bend</code> × 90 px; parallel flows fan out from there</td></tr>
        <tr><td><code>timeframes</code></td><td>array | true</td><td>—</td><td>Period buttons in the header: <code>'1Y'</code>, <code>'ALL'</code>… or <code>{ key, label, range: [from, to] }</code></td></tr>
        <tr><td><code>navigator</code></td><td>boolean | object</td><td>—</td><td>A brushable strip with a time axis under the map</td></tr>
        <tr><td><code>defaultView</code></td><td>array</td><td>—</td><td><code>[from, to]</code> shown first with the time scale on</td></tr>
        <tr><td><code>defaultTimeframe</code></td><td>string</td><td>—</td><td>Key of the timeframe shown first (instead of <code>defaultView</code>)</td></tr>
        <tr><td><code>timeWindow</code></td><td>array</td><td><code>null</code></td><td><code>[from, to]</code> at start without the time scale; then <code>setTimeWindow()</code></td></tr>
        <tr><td><code>timeWindowMode</code></td><td>string</td><td><code>'hide'</code></td><td>What happens to flows outside the window: <code>'hide'</code> or <code>'dim'</code></td></tr>
        <tr><td><code>fitTo</code></td><td>string</td><td><code>'features'</code></td><td><code>'links'</code> fits the projection to the places and the arcs between them instead of the whole map — a great circle that runs far from its ends and the bow of each arc stay inside the frame; the frame covers every flow, so the time window and the legend do not move it An arc that crosses the projection's cut (the antimeridian, Mercator's polar edge) is framed by its pieces; an end that lies on the cut may sit at the frame's edge.</td></tr>
        <tr><td><code>nodeRadius</code></td><td>number</td><td><code>4</code></td><td>Dot radius in px</td></tr>
        <tr><td><code>nodeLabels</code></td><td>boolean</td><td><code>true</code></td><td>Place labels</td></tr>
        <tr><td><code>tooltipFormat</code></td><td>function</td><td>—</td><td><code>({ node, links }) =&gt; html</code> for a place</td></tr>
        <tr><td><code>regionTooltipFormat</code></td><td>function</td><td>—</td><td><code>({ feature, item }) =&gt; html</code> for a country under the flows (Map’s <code>tooltipFormat</code>); <code>item</code> is always <code>null</code> — MapFlow takes no region data</td></tr>
        <tr><td><code>linkTooltipFormat</code></td><td>function</td><td>—</td><td><code>({ link, source, target }) =&gt; html</code> for a flow</td></tr>
    </tbody>
</table>
</div>

## Methods

<pre class="text-content-caption"><code>chart.setData({ nodes, links });
chart.setTimeWindow(from, to);
chart.setTimeframe(key);                <span class="code-comment">// with timeframes; setView([from, to]), getView(), onViewChange(fn)</span>
chart.setLinkTypesVisible(['goods']);   <span class="code-comment">// what the legend does; null shows all</span>
chart.whenReady().then(() => { /* the map and the flows are drawn */ });   <span class="code-comment">// as on Map</span></code></pre>

## Interaction

**Hover** a place or an arc for its tooltip. **Click** an arc to pin its tooltip — links inside it stay clickable; click elsewhere or press Escape to close it. Arcs are in the Tab order: Enter pins the tooltip of the focused one.

**Legend** — click a type to hide or show its flows; its buttons are in the Tab order, and Enter or Space keeps focus on the one pressed.

**Zoom** — with `zoom: true`, as on [`Map`](/charts/map/). Arcs keep their width; dots, labels and arrowheads keep their size and move with the map, and the labels are placed again, so places that crowd each other at first get theirs as you zoom in.

## Not in this version

Moving particles along the arcs, clustering places on zoom, choropleth values under the flows, and hand-bent curves.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/map/mapflow-demo.js"></script>
