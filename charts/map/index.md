---
layout: page.njk
title: "Map"
section: "Charts"
displaySidebar: true
permalink: '/charts/map/'
---

The Map chart renders geographic data as a choropleth or region-highlight map. In practice this usually means one simple thing: you have data tied to places and you want to show it on a map.

Common examples include visited countries, regional performance, market presence, or anything else where geography matters more than a precise number.

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
    topoUrl:    '/assets/charts/data/countries-110m.json',
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

RareCharts supports both **GeoJSON** and **TopoJSON**.

In practice TopoJSON is usually the better choice for world maps: it is smaller, simpler to ship with your bundle, and avoids duplicated borders between neighboring regions.

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

RareCharts supports four projections:

| Name | Description |
|------|-------------|
| `'naturalEarth1'` | Default. Balanced projection suitable for most maps |
| `'mercator'` | Familiar web-map projection. Often used for regional maps |
| `'equalEarth'` | Equal-area projection. Useful when region size matters |
| `'orthographic'` | Globe view. Mostly for visual context |

The chart automatically fits the projection to the loaded features using `fitExtent`, so you normally do not need to set scale or center manually.

## Coloring

Regions are colored in three ways, in order of priority:

1. **Per-item `color`** — explicit CSS color on a data item.
2. **`matchFill`** — applied to matched regions without their own color.
3. **`defaultFill`** — applied to regions that have no matching data.

For a simple highlight map (visited countries, market presence), a single `matchFill` is usually enough.

For a choropleth map, you will typically compute colors yourself using a scale and pass them through the `color` field.

Default colors used by the chart come from the RareCharts theme. They are defined in: `/src/core/theme.js`. The map section of the theme defines values such as `matchFill`, `unmatchedFill`, `border`, and hover behavior. In most cases it is better to adjust those defaults in the theme rather than overriding colors in every chart instance.

## Tooltip

The default tooltip shows the region name and, if present, the `value`.

If you need something more specific, override it:

<pre class="text-content-caption"><code>tooltipFormat: ({ feature, item }) => `
    &lt;strong&gt;${item?.label ?? feature.properties.name}&lt;/strong&gt;
    &lt;div&gt;Revenue: $${item?.value?.toLocaleString()}&lt;/div&gt;
`</code></pre>

The formatter receives both the raw `feature` and the matched `item`, so you can display whatever makes sense.

## Map chart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>source</code>, <code>theme</code>) are documented on&nbsp;the&nbsp;<a href="/charts/settings/">Settings&nbsp;page</a>.

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
            <td><code>'naturalEarth1'</code> | <code>'mercator'</code> | <code>'equalEarth'</code> | <code>'orthographic'</code></td>
            <td><code>'naturalEarth1'</code></td>
            <td>D3 geo projection to use for rendering.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Colors</h5></td>
        </tr>
        <tr>
            <td><code>defaultFill</code></td>
            <td>CSS color</td>
            <td><code>theme.surface</code></td>
            <td>Fill for regions with no matching data item.</td>
        </tr>
        <tr>
            <td><code>matchFill</code></td>
            <td>CSS color</td>
            <td><code>theme.accent</code></td>
            <td>Fill for matched regions that have no explicit <code>color</code> field.</td>
        </tr>
        <tr>
            <td><code>hoverFill</code></td>
            <td>CSS color</td>
            <td>auto</td>
            <td>Fill on mouse-over. Defaults to a lighter version of <code>matchFill</code>.</td>
        </tr>
        <tr>
            <td><code>oceanColor</code></td>
            <td>CSS color</td>
            <td><code>'transparent'</code></td>
            <td>SVG background fill (the "ocean" behind land features).</td>
        </tr>
        <tr>
            <td><code>borderColor</code></td>
            <td>CSS color</td>
            <td><code>theme.border</code></td>
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
            <td>Enable scroll-to-zoom and drag-to-pan. Scale range: 0.5×–8×.</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>built-in</td>
            <td><code>({ feature, item }) =&gt; html</code> — custom tooltip for matched regions.</td>
        </tr>
    </tbody>
</table>

**Data fields**

<table class="table-bordered card-caption">
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

### Minimal example

<pre class="text-content-caption"><code>new RareCharts.Map('#chart', {
    title:      'Market Presence',
    topoUrl:    '/assets/charts/data/countries-110m.json',
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
