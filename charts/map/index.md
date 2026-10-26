---
layout: page.njk
title: "Map"
section: "Charts"
displaySidebar: true
permalink: '/charts/map/'
---

The Map chart renders geographic data as a choropleth or region-highlight map. In practice this usually means one simple thing: you have data tied to places and you want to show it on a map.

Common examples include visited countries, regional performance, market presence, or anything else where geography matters more than a precise number. To draw flows between places — capital, goods, influence — use [Map Flows](/charts/map/flow/).

<div class="text-content-caption card-dashboard-bordered">
    <div id="map-europe-visited"></div>
</div>

Map charts combine two ingredients:

1. **Geographic shapes** — the borders of regions (`GeoJSON` or `TopoJSON`).
2. **Value data** — an array of items that match those regions by ID.

The map provides the geometry; your data decides what gets highlighted.

## Geographic data

Pass a URL to fetch, or an inline object — whichever fits your pipeline.

<pre class="text-content-caption"><code><span class="code-comment">// TopoJSON from a local file</span>
new RareCharts.Map('#chart', {
    topoUrl:    '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json',
    topoObject: 'countries',  <span class="code-comment">// named object inside the topology</span>
});

<span class="code-comment">// GeoJSON fetched from a URL</span>
new RareCharts.Map('#chart', {
    geoUrl: '/data/europe.geojson',
});

<span class="code-comment">// Inline GeoJSON FeatureCollection</span>
new RareCharts.Map('#chart', {
    geoData: myFeatureCollection,
});</code></pre>

RareCharts supports both **GeoJSON** and **TopoJSON**. Give one source; if several are set, the first of `geoData`, `topoData`, `geoUrl`, `topoUrl` is used.

A URL loads asynchronously. `chart.whenReady()` returns a promise that resolves to the chart once the geometry has loaded and the map is drawn. It also resolves when the file fails to load: the error goes to the console and the map stays empty. A map given no source at all draws nothing and warns in the console.

<pre class="text-content-caption"><code>const chart = new RareCharts.Map('#chart', {
    topoUrl:    '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json',
    topoObject: 'countries',
}).setData([{ id: '250', label: 'France' }]);

chart.whenReady().then(() => {
    <span class="code-comment">// the regions are on the page now</span>
});</code></pre>

In practice TopoJSON is usually the better choice for world maps: it is smaller, simpler to ship with your bundle, and avoids duplicated borders between neighboring regions.

### Open geographic datasets

A convenient public source of world map data is the **world-atlas** dataset: <a href="https://cdn.jsdelivr.net/npm/world-atlas@2/">https://cdn.jsdelivr.net/npm/world-atlas@2/</a>.

It provides several ready-to-use TopoJSON files that differ only by geometric detail:

<div class="table-scroll">

| File | Description |
|-----|-------------|
| `countries-110m.json` | Smallest dataset. Best for dashboards and simple maps (~100 Kb) |
| `countries-50m.json` | Medium detail. Good default for most projects (~750 Kb) |
| `countries-10m.json` | High detail. Suitable for zoomable or full-screen maps (~3.5 Mb) |

</div>

Example:

<pre class="text-content-caption"><code>new RareCharts.Map('#chart', {
    topoUrl: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
    topoObject: 'countries'
});</code></pre>

These files use <a href="https://en.wikipedia.org/wiki/ISO_3166-1_numeric">ISO 3166-1 numeric country codes</a> as `feature.id`, which makes them easy to match with data items.

## Value data

Each item in the data array identifies a geographic feature and optionally carries a value and color:

<pre class="text-content-caption"><code>chart.setData([
    { id: '250', label: 'France',  color: '#00aaff' },
    { id: '276', label: 'Germany', color: '#00aaff' },
    { id: '380', label: 'Italy',   value: 42 },
]);</code></pre>

The `id` field must match either `feature.id` or a property inside `feature.properties`.

For example:

- **world-atlas TopoJSON** uses numeric ISO 3166-1 country codes as `feature.id`
- other datasets often store identifiers inside `feature.properties`

If needed, use the `idField` option to tell the chart which property should be used.

## Projections

RareCharts supports five projections:

<div class="table-scroll">

| Name | Description |
|------|-------------|
| `'naturalEarth1'` | Default. Balanced projection suitable for most maps |
| `'mercator'` | Familiar web-map projection. Often used for regional maps |
| `'equalEarth'` | Equal-area projection. Useful when region size matters |
| `'orthographic'` | Globe view. Mostly for visual context |
| `'identity'` | No geographic projection. Useful when your GeoJSON is already in screen coordinates or a custom planar space |

</div>

The chart automatically fits the projection to the loaded features using `fitExtent`, so you normally do not need to set scale or center manually.

`graticule: true` draws a 10° grid of meridians and parallels under the regions, in `theme.map.graticule` — it shows over the sea and wherever no region covers it. With `projection: 'identity'` there is none: planar data has no meridians.

## Coloring

Regions are colored in three ways, in order of priority:

1. **Per-item `color`** — explicit CSS color on a data item.
2. **`matchFill`** — applied to matched regions without their own color.
3. **`defaultFill`** — applied to regions that have no matching data.

For a simple highlight map (visited countries, market presence), a single `matchFill` is usually enough.

For a choropleth map, you will typically compute colors yourself using a scale and pass them through the `color` field.

Hovering a region with data lightens it: its fill moves `theme.map.hoverBrighten − 1` of the way towards white (`1.3`, so 30%; dark `1.2`) — black lightens too and nothing turns pure white, while a fill already very light (lightness above 0.85) darkens a little instead, so each color of a choropleth gets its own lighter shade. Set `hoverFill` for one fixed hover color instead, or `hoverBrighten: 1` in the theme to turn the effect off. Regions without data do not react.

Default colors come from the theme's `map` section — `RareCharts.defaultTheme.map` and `RareCharts.darkTheme.map`: `matchFill` (`#00aaff`; dark `#ff6200`), `unmatchedFill` (`#e8e8e8`; dark `#1e1e2e`), `border` (`#ffffff`; dark `#444455`), `ocean` (`transparent`), `hoverBrighten` (`1.3`; dark `1.2`) and `graticule` (`rgba(0,0,0,0.08)`; dark `rgba(255,255,255,0.06)`). The theme's `accent`, `surface` and `border` are only fallbacks for a theme without them, so changing `accent` alone does not recolor a map. In most cases it is better to set them once in the theme — `createTheme({ map: { matchFill: '#ff6200' } })` — than in every chart instance.

## Tooltip

The default tooltip shows the region name and, if present, the `value` for every region on the map, including regions with no matching data item.

If you need something more specific, override it:

<pre class="text-content-caption"><code>tooltipFormat: ({ feature, item }) => `
    &lt;strong&gt;${item?.label ?? feature.properties.name}&lt;/strong&gt;
    &lt;div&gt;Revenue: $${item?.value?.toLocaleString()}&lt;/div&gt;
`</code></pre>

The formatter receives both the raw `feature` and the matched `item`, so you can display whatever makes sense. For unmatched regions, `item` will be `null`. It also gets the role fields every formatter gets: `label` (the name the default tooltip shows), `value` (`item.value`, or `null`) and `color` (the region’s fill).

## Map chart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on&nbsp;the&nbsp;<a href="/charts/settings/">Settings&nbsp;page</a>.

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
        <tr class="table-section">
            <td colspan="4"><h5>Layout</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>400</code></td>
            <td>Container height in px. Width is always 100% of the container.</td>
        </tr>
        <tr>
            <td><code>fitPadding</code></td>
            <td>number</td>
            <td><code>20</code></td>
            <td>Padding in px around the feature bounds when fitting the projection.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Geographic data</h5></td>
        </tr>
        <tr>
            <td><code>geoUrl</code></td>
            <td>string</td>
            <td>—</td>
            <td>URL of a GeoJSON FeatureCollection to fetch via <code>d3.json()</code>.</td>
        </tr>
        <tr>
            <td><code>geoData</code></td>
            <td>object</td>
            <td>—</td>
            <td>Inline GeoJSON FeatureCollection or single Feature.</td>
        </tr>
        <tr>
            <td><code>topoUrl</code></td>
            <td>string</td>
            <td>—</td>
            <td>URL of a TopoJSON topology to fetch.</td>
        </tr>
        <tr>
            <td><code>topoData</code></td>
            <td>object</td>
            <td>—</td>
            <td>Inline TopoJSON topology object.</td>
        </tr>
        <tr>
            <td><code>topoObject</code></td>
            <td>string</td>
            <td>first object</td>
            <td>
                Named object inside the topology to extract.<br>
                Defaults to the first key in <code>topology.objects</code>.
            </td>
        </tr>
        <tr>
            <td><code>featureFilter</code></td>
            <td>function</td>
            <td>—</td>
            <td>Optional filter applied to extracted features before rendering. Receives <code>feature</code> and should return <code>true</code> to keep it.</td>
        </tr>
        <tr>
            <td><code>clipExtent</code></td>
            <td><code>[[lon, lat], [lon, lat]]</code></td>
            <td>—</td>
            <td>Geographic bounding box used to keep only polygons intersecting that extent.</td>
        </tr>
        <tr>
            <td><code>idField</code></td>
            <td>string</td>
            <td><code>'id'</code></td>
            <td>
                Feature property used as ID when <code>feature.id</code> is absent.<br>
                Falls back through <code>iso_a2</code>, <code>iso_a3</code>, <code>ISO_A2</code>, <code>ISO_A3</code> automatically.
            </td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Projection</h5></td>
        </tr>
        <tr>
            <td><code>projection</code></td>
            <td><code>'naturalEarth1'</code> | <code>'mercator'</code> | <code>'equalEarth'</code> | <code>'orthographic'</code> | <code>'identity'</code></td>
            <td><code>'naturalEarth1'</code></td>
            <td>D3 geo projection to use for rendering.</td>
        </tr>
        <tr>
            <td><code>reflectY</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Flip the Y axis. Only applies with <code>projection: 'identity'</code> — planar source data often uses a Y axis that grows downward.</td>
        </tr>
        <tr>
            <td><code>rotate</code></td>
            <td>array</td>
            <td>—</td>
            <td>Optional projection rotation passed to <code>projection.rotate([lambda, phi, gamma])</code> when supported by the chosen projection.</td>
        </tr>
        <tr>
            <td><code>graticule</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Draw a 10° grid of meridians and parallels under the regions, in <code>theme.map.graticule</code> (<code>rgba(0,0,0,0.08)</code>; dark <code>rgba(255,255,255,0.06)</code>). Not drawn with <code>projection: 'identity'</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Colors</h5></td>
        </tr>
        <tr>
            <td><code>defaultFill</code></td>
            <td>CSS color</td>
            <td><code>theme.map.unmatchedFill</code> (<code>#e8e8e8</code>; dark <code>#1e1e2e</code>)</td>
            <td>Fill for regions with no matching data item.</td>
        </tr>
        <tr>
            <td><code>matchFill</code></td>
            <td>CSS color</td>
            <td><code>theme.map.matchFill</code> (<code>#00aaff</code>; dark <code>#ff6200</code>)</td>
            <td>Fill for matched regions that have no explicit <code>color</code> field.</td>
        </tr>
        <tr>
            <td><code>hoverFill</code></td>
            <td>CSS color</td>
            <td>auto</td>
            <td>Fill of a region with data under the pointer — its own <code>color</code> included; regions without data keep theirs. Default: the region's own fill moved <code>theme.map.hoverBrighten − 1</code> of the way towards white (<code>1.3</code>; dark <code>1.2</code>; <code>1</code> turns the effect off); a very light fill darkens a little instead.</td>
        </tr>
        <tr>
            <td><code>oceanColor</code></td>
            <td>CSS color</td>
            <td><code>'transparent'</code></td>
            <td>SVG background fill (the "ocean" behind land features). Transparent by default (<code>theme.map.ocean</code>, light and dark), so the card's background shows through.</td>
        </tr>
        <tr>
            <td><code>borderColor</code></td>
            <td>CSS color</td>
            <td><code>theme.map.border</code> (<code>#ffffff</code>; dark <code>#444455</code>)</td>
            <td>Stroke color for feature borders.</td>
        </tr>
        <tr>
            <td><code>borderWidth</code></td>
            <td>number</td>
            <td><code>0.5</code></td>
            <td>Border stroke-width in px.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>zoom</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Enable scroll-to-zoom and drag-to-pan.</td>
        </tr>
        <tr>
            <td><code>zoomExtent</code></td>
            <td>array</td>
            <td><code>[0.8, 12]</code></td>
            <td>Minimum and maximum zoom scale used when <code>zoom</code> is enabled.</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ feature, item, label, value, color }) =&gt; html</code> — custom tooltip for any region. <code>item</code> is <code>null</code> when no data item matches; <code>label</code> is the name the default tooltip shows (<code>item.label</code>, then the feature’s name or id), <code>value</code> is <code>item.value</code> (<code>null</code> without an item), <code>color</code> the region’s fill (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>).</td>
        </tr>
    </tbody>
</table>
</div>

**Data fields**

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>id</code></td>
            <td>string | number</td>
            <td>Required. Must match <code>feature.id</code> or the resolved <code>idField</code> property.</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td>Display name used in the tooltip. Falls back to <code>feature.properties.name</code>.</td>
        </tr>
        <tr>
            <td><code>value</code></td>
            <td>number</td>
            <td>Optional numeric value. Shown in the default tooltip; available in <code>tooltipFormat</code>.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td>Explicit fill for this region. Overrides <code>matchFill</code>.</td>
        </tr>
    </tbody>
</table>
</div>

### Minimal example

<pre class="text-content-caption"><code>new RareCharts.Map('#chart', {
    title:      'Market Presence',
    topoUrl:    '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json',
    topoObject: 'countries',
    height:     400,
    matchFill:  '#00aaff',
    zoom:       true,
}).setData([
    { id: '840', label: 'United States' },
    { id: '276', label: 'Germany'       },
    { id: '392', label: 'Japan'         },
]);</code></pre>

In practice the workflow is usually straightforward:

1. Load a geographic file, usually TopoJSON.
2. Match your data to regions by ID.
3. Decide which regions should be highlighted.
4. Leave the projection and fitting to the chart unless you have a specific reason not to.

For most use cases, that is enough. The difficult part is rarely drawing the map itself. It is usually getting the region IDs to line up, finding a geography file that does not look terrible, and resisting the temptation to turn a simple highlight map into a geopolitical event.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/map/map-chart-europe-visited.js"></script>
