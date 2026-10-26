---
layout: page.njk
title: "Settings"
section: "Charts"
displaySidebar: true
permalink: '/charts/settings/'
---

Every chart type in RareCharts extends a shared base class. That means there's a set of options that work the same way everywhere — you don't need to re-learn them for each chart type.

This page documents those shared options. Chart-specific options (axis formatting, link types, bar orientation, etc.) are documented on each chart's own page.

## Anatomy — the text slots

Every piece of text around a chart — the headline, the explanatory line, the legend, the attribution — is an **option you pass to the constructor**. The component renders it, in the system's typography and spacing, in the right place. You do not hand-build a title, a source line, or a caption in your own markup around the chart container. Feed the options and let the chart own the layout.

This matters because hardcoded structure drifts. A title written as a full sentence, a source without the `Source:` framing, an interpretive caption bolted on as a stray `<div>` — each one is a chart that no longer looks like the rest of the document. The slots below exist so the same data always reads the same way.

Each slot has a job. Use the right one and the chart composes correctly on its own.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Slot</th>
            <th>What it carries</th>
            <th>Content rule</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>title</code></td>
            <td>The headline — <em>what</em> the chart is.</td>
            <td>A short label in Title Case, roughly two to five words ("Revenue Dynamics"). Not a sentence. Never spell out the encoding here — <code>"(bars)"</code> / <code>"(line)"</code> belong to the legend, not the title.</td>
        </tr>
        <tr>
            <td><code>subtitle</code></td>
            <td>The explanatory line — <em>what against what</em>.</td>
            <td>One sentence. The place for the full description, the units, and the timeframe that does not fit in a headline.</td>
        </tr>
        <tr>
            <td><code>legend</code></td>
            <td>Series identity <em>and</em> mark.</td>
            <td>Identifies each series and which mark it uses — <code>type: 'bar'</code> renders a dot, <code>'band'</code> a filled square, <code>'dashed'</code> a dashed line, anything else a solid line. This is where "which one is the bars" is communicated. See <strong>Legend format</strong> below.</td>
        </tr>
        <tr>
            <td><code>source</code></td>
            <td>Attribution.</td>
            <td>Always prefixed <code>Source:</code> and written in Title Case — <code>'Source: Internal Accounting'</code>, <code>'Source: Synthetic Demo Data'</code>.</td>
        </tr>
        <tr>
            <td><code>note</code></td>
            <td>Interpretation, disclaimers, caveats.</td>
            <td>One or two sentences of editorial context, rendered in muted type below the source. Use this instead of gluing a stray <code>&lt;div&gt;</code> under the chart container — same as the other slots, the component owns the placement and styling.</td>
        </tr>
    </tbody>
</table>
</div>

A correctly composed header and footer, then, is just options:

<pre class="text-content-caption"><code>new RareCharts.DualAxes('#chart', {
  title:    'Revenue Dynamics',
  subtitle: 'Monthly revenue against year-over-year growth',
  source:   'Source: Internal Accounting',
  note:     'Growth is against the same month a year earlier; 2024 is restated.',
  legend: [
    { label: 'Revenue',    color: '#4f5be0', type: 'bar' },
    { label: 'YoY growth', color: '#e0564f' },
  ],
}).setData(series);</code></pre>

The reference for each slot's exact type and behavior follows below.

## The constructor

All charts are created the same way:

<pre class="text-content-caption"><code>new RareCharts.ChartType(selector, options)</code></pre>

`selector` is a CSS selector string (`'#my-chart'`) or a direct DOM element reference. If the element is not found, the chart throws immediately — which is better than silently rendering into nothing and leaving you confused for twenty minutes.

`options` is a plain object. Everything is optional.

## Header options

The chart header sits above the chart area and can contain a title, a subtitle, and a legend.

<div class="table-scroll">

| Option | Type | Description |
|--------|------|-------------|
| `title` | string | Chart title, rendered as an uppercase `<h5>` |
| `subtitle` | string | Smaller text below the title; wraps onto as many lines as it needs (the title stays on one line) |
| `legend` | array \| string \| HTMLElement | Legend items (see below) |
| `legendPosition` | `'right'` | Move the legend into a vertical column beside the chart |
| `ariaLabel` | string | Accessible name of the chart drawing (the `<svg>` gets `role="img"`). Defaults to the title and subtitle, joined with " — "; without them, "Chart" |

</div>

Without a title, subtitle or legend — and without timeframe or Lin/Log buttons — no header element is created: the chart starts right at the top of the container.

The header lays out by the width of the card, not of the window: on a card 460 px wide or narrower the timeframe and Lin/Log buttons move from beside the title to under the subtitle — a narrow card on a wide screen included.

### Legend format

Pass an array of items and the chart renders them as a horizontal row of labeled indicators:

<pre class="text-content-caption"><code>legend: [
  { label: 'Portfolio A', color: '#00c97a' },
  { label: 'Portfolio B', color: '#ff6200' },
]</code></pre>

Each item supports:
- `label` (or `name`) — display name
- `color` — indicator color (`theme.accent` by default)
- `type` — the mark: `'bar'` or `'dot'` renders a round dot, `'band'` a small filled square (a shaded range), `'dashed'` a dashed line (as does `dash: true`); anything else, or nothing, a short solid line

For line charts, use the default line indicator. For bar and donut charts, use `type: 'bar'` — a dot reads as a filled mark rather than a stroke, which matches the shape of what you're labeling. Use `'dashed'` for a forecast and `'band'` for a confidence range.

`legendPosition: 'right'` places the legend in a vertical column to the right of the chart. Useful when you have many series and don't want the legend eating into the chart's vertical space. The chart area automatically adjusts its width; the navigator, your `controls` and the footer stay under the drawing, in that order.

## Footer

<div class="table-scroll">

| Option | Type | Description |
|--------|------|-------------|
| `source` | string \| `{ text, href }` \| array \| HTMLElement | Rendered as a `<cite>` below the chart. Great for data attribution. Pass `{ text, href }` to make it a link, or an **array of parts** to mix several links and plain text on one line — see below. |
| `note` | string \| HTMLElement | Rendered as a `<p class="rc-chart-note">` below the source, in muted type. For disclaimers, data caveats, and editorial context. Keeps interpretive text inside the component instead of as stray markup around the container. |
| `controls` | HTMLElement \| selector | Your own controls that drive the chart — checkboxes, a time slider, a select. The element is moved inside the card, between the drawing and the source line, and gets the compact `rc-chart-controls` row style; its event listeners keep working. Keeps the controls visibly part of the chart instead of floating above it. |

</div>

<pre class="text-content-caption"><code>source: 'Source: The Truth',
note:   'Figures are unaudited and restated monthly.'</code></pre>

A single linked source:

<pre class="text-content-caption"><code>source: { text: 'Source: Bloomberg', href: 'https://bloomberg.com' }</code></pre>

Multiple sources — some linked, some not. Pass an array of parts: a string renders as plain text, a `{ text, href }` object as a link (in the source text color, underlined, opening in a new tab), a `{ text }` object without `href` as plain text. Array sources wrap instead of truncating, so every attribution stays visible.

<pre class="text-content-caption"><code>source: [
  'Source: ',
  { text: 'NASDAQ',    href: 'https://nasdaq.com' },
  ', ',
  { text: 'Bloomberg', href: 'https://bloomberg.com' },
  ', Internal calculations',     <span class="code-comment">// plain, no link</span>
]</code></pre>

## Layout

<div class="table-scroll">

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `height` | number | varies | Total container height in px, with the title, subtitle, legend, buttons, navigator and footer included; see each chart's page for its default. On a narrow card those parts wrap and take more of it, and the plot gets what is left (`chart.height`). The plot keeps at least 80 px: when the parts would leave it less, the card grows past `height` by the difference, and returns to `height` once they fit again. |
| `margin` | object | per chart | Space around the drawing area in px, `{ top, right, bottom, left }`; a side you leave out keeps the chart's default. Donut, Pie, Gauge, Sankey and Graph fill the card and do not use it — except a vertical Sankey, which adds `top` and `bottom` to the height it computes for its card |

</div>

Each chart sets its own margins around its axes — Line `{ top: 10, right: 64, bottom: 18, left: 0 }`, Time Series `{ top: 16, right: 70, bottom: 28, left: 0 }`, DualAxes a 64px gutter on each side; Map, MapFlow and MultiChart use none. Hiding an axis gives its gutter back, and annotations raise `top` to make room for their labels. Set `margin` for a different frame:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  height: 320,
  margin: { top: 8, right: 50, bottom: 16, left: 40 },
})</code></pre>

## Theme

<div class="table-scroll">

| Option | Type | Description |
|--------|------|-------------|
| `theme` | object | Partial or full theme object. Merged with the active default. |

</div>

Pass a theme object to override colors, the tooltip font, or the sizing defaults (line width, crosshair dots, markers, DualAxes bar opacity). The chart's own fonts and spacing are CSS variables. The full theme system is documented on the [Styles](/charts/styles/) page.

Quick example — apply the built-in dark theme:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  theme: RareCharts.darkTheme,
}).setData(data);</code></pre>

Or override just the accent color:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  theme: { accent: '#ff6200' },
}).setData(data);</code></pre>

## Colors

Chart colors follow a clear resolution order. Understanding it tells you exactly where to set a color and how overrides interact.

For each series, the chart resolves color in this order:

1. `color` on the individual series object — highest priority
2. `theme.colors[index]` — palette array, cycled by series position
3. `theme.accent` — single accent fallback

To change the default color across all single-series charts, override `accent` in the theme. To define a full multi-series palette, override `theme.colors`.

For multi-series charts, set `color` directly on each series in the data array:

<pre class="text-content-caption"><code>chart.setData([
  { name: 'Revenue', color: '#00aaff', values: [...] },
  { name: 'Costs',   color: '#ff6200', values: [...] },
]);</code></pre>

For single-series Line charts, `lineColor` is a shortcut that avoids wrapping flat data in a series object:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  lineColor: '#00c97a',
}).setData([{ date, value }, ...]);</code></pre>

Area fills inherit the series `color`; their opacity is the `areaOpacity` option (default `0.12`, also per series on Line and DualAxes). DualAxes bars take the `barOpacity` option (default `0.35`) — or set `theme.barOpacity` for every chart that shares the theme; `Bar` draws opaque bars.

## Axis labels

Y axis tick labels support two levels of customization.

**Prefix and suffix** (Line charts) attach a fixed string before or after each auto-formatted value:

<pre class="text-content-caption"><code>yPrefix: '$'    <span class="code-comment">// → $1.2M</span>
ySuffix: '%'    <span class="code-comment">// → 12.5%</span></code></pre>

**Full format override** replaces automatic formatting entirely on Line, Time Series and Bar. The bundled D3 is `RareCharts.d3` — there is no global `d3` on a page that loads only the library:

<pre class="text-content-caption"><code>yTickFormat: v => RareCharts.d3.format(',.0f')(v) + ' units'</code></pre>

DualAxes has independent formatters for each axis — no prefix/suffix shortcuts, use `y1TickFormat` / `y2TickFormat` directly:

<pre class="text-content-caption"><code>y1TickFormat: v => '$' + RareCharts.d3.format(',.2f')(v),
y2TickFormat: v => RareCharts.d3.format('+.1f')(v) + 'bp'</code></pre>

When `yTickFormat` is provided, `yPrefix`, `ySuffix`, and `yFormat` are all ignored — the format function takes full ownership.

## Crosshair and tooltip

The crosshair is a vertical tracker that follows the cursor, snaps to the nearest data point on each series, and shows a tooltip. It is enabled by default on Line, TimeSeries, and DualAxes charts.

To disable it entirely (removes both the tracker line and the tooltip):

<pre class="text-content-caption"><code>crosshair: false</code></pre>

### Custom tooltip

`tooltipFormat` replaces the default tooltip with your own HTML:

<pre class="text-content-caption"><code>tooltipFormat: ({ date, points }) => {
  const d = RareCharts.d3.timeFormat('%b %d, %Y')(date);
  return `&lt;div class="rc-tooltip-header rc-tooltip-muted"&gt;${d}&lt;/div&gt;` +
    points.map(p =>
      `&lt;div style="color:${p.color}"&gt;${p.name}: ${p.fmt}&lt;/div&gt;`
    ).join('');
}</code></pre>

`points` is an array of `{ name, series, value, color, fmt }` — one entry per series (`series` is the name again, the role field every formatter shares — see [Formatter arguments](#formatter-arguments)). `fmt` is the value already run through `yTickFormat` (or the default formatter), so you don't need to reformat it yourself.

The classes are optional: they are the ones the default tooltips use, so your rows look the same and follow `theme.tooltip` — `rc-tooltip-header` for the row naming what is hovered (with `rc-tooltip-muted` for a date, `rc-tooltip-title` for a bold title), `rc-tooltip-muted` for secondary text, `rc-tooltip-sub` for small secondary text.


The string you return is inserted as HTML as is — escape anything that comes from your data (series names, labels from a CSV or an API) before putting it in. The default tooltips escape data themselves: a label such as `<b>` shows as text. This applies to every chart's `tooltipFormat`.

### Tooltip styling

Tooltip colors and shadow are controlled through `theme.tooltip` — here a dark tooltip on a light chart:

<pre class="text-content-caption"><code>theme: {
  tooltip: {
    bg:     '#1a1a1a',
    border: '#333333',
    text:   '#e8e8e8',
    muted:  '#888888',       <span class="code-comment">// dates and secondary rows</span>
    shadow: '0 2px 12px rgba(0,0,0,0.5)',
    header: { text: null, bg: null },   <span class="code-comment">// the date row; bg draws a band</span>
  }
}</code></pre>

For structural changes (padding, border-radius, font size), use a selector that outranks the library's `.rc-tooltip` — the library appends its stylesheet to `<head>` when it loads, after any stylesheet already there, so a plain `.rc-tooltip { … }` loses the tie: `.rc-chart .rc-tooltip { font-size: 14px; }`. The crosshair line uses `.rc-cross-line`. All tooltip tokens and classes: [Styles](/charts/styles/).

<h2 id="formatter-arguments">Formatter arguments</h2>

The formatters of Line, DualAxes, TimeSeries, Bar, HierarchicalBar, Donut and Pie, Gauge and Map — `tooltipFormat`, `valueFormat`, `percentFormat`, `centerText` — get the same **role fields**, whichever apply to what it formats: The relation charts keep their own payloads (table below): Graph, MapFlow and Sankey tooltips get one object each, and Sankey's `valueFormat` takes only the number.

- `label` — the name of the item: a category, a slice, a tree node, a region;
- `value` — the number drawn (`null` where there is none: an undisclosed node, a region without data);
- `date` — the date of the point, on the time charts;
- `color` — the colour the item is drawn in;
- `percent` — its share of the whole, 0–1: of the category total (stacked bars), of all slices (Donut), of the tree's total (HierarchicalBar), of the range (Gauge);
- `series` — the series name, where a chart has several.

Where they arrive follows one rule:

- a formatter that gets **an object** made for it finds the role fields on that object, next to its own fields;
- a formatter that gets **a number, a data row or a tree node** first keeps it, and gets the role fields as an object in the **next argument** — the second, or the fourth for Gauge's `centerText(value, max, min)`.

So `valueFormat: v => …` written for an earlier version still works, and a formatter that needs more reads the second argument — here a HierarchicalBar prints each row's share of the total next to its value:

<pre class="text-content-caption"><code>valueFormat: (node, { value, percent }) =>
  `${RareCharts.d3.format(',')(value)} · ${RareCharts.d3.format('.0%')(percent)}`</code></pre>

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Class</th>
            <th>Formatter</th>
            <th>Arguments</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Line</td>
            <td><code>tooltipFormat</code></td>
            <td><code>({ date, points })</code> — each point <code>{ name, series, type, color, date, value, fmt }</code>; a band has <code>lower</code> and <code>upper</code> instead of <code>value</code></td>
        </tr>
        <tr>
            <td>DualAxes</td>
            <td><code>tooltipFormat</code></td>
            <td>as Line; each point also has <code>axis</code></td>
        </tr>
        <tr>
            <td>TimeSeries</td>
            <td><code>tooltipFormat</code></td>
            <td><code>(row, { date, value, color })</code> — the row with its extra fields (<code>open</code>, <code>volume</code>…)</td>
        </tr>
        <tr>
            <td>Bar</td>
            <td><code>tooltipFormat</code>, <code>valueFormat</code></td>
            <td><code>(row, { label, value, color })</code>; dated bars <code>(row, { date, value, color })</code></td>
        </tr>
        <tr>
            <td>Bar, stacked</td>
            <td><code>tooltipFormat</code>, <code>valueFormat</code></td>
            <td><code>(segment)</code> — <code>{ i, name, cat, v0, v1, value, total }</code> with <code>label</code> (= <code>cat</code>), <code>series</code> (= <code>name</code>), <code>color</code>, <code>percent</code></td>
        </tr>
        <tr>
            <td>HierarchicalBar</td>
            <td><code>tooltipFormat</code>, <code>valueFormat</code></td>
            <td><code>(node, { label, value, color, percent })</code></td>
        </tr>
        <tr>
            <td>Donut, Pie</td>
            <td><code>tooltipFormat</code></td>
            <td><code>({ label, value, percent, color })</code></td>
        </tr>
        <tr>
            <td>Donut, Pie</td>
            <td><code>valueFormat</code>, <code>percentFormat</code></td>
            <td><code>(number, { label, value, percent, color })</code> for a slice; the center's value <code>(number, { label, value })</code></td>
        </tr>
        <tr>
            <td>Donut</td>
            <td><code>centerText</code></td>
            <td><code>(items, { label, value })</code> — the drawn items, the center label and the total</td>
        </tr>
        <tr>
            <td>Gauge</td>
            <td><code>tooltipFormat</code></td>
            <td><code>({ value, max, min, percent, color })</code></td>
        </tr>
        <tr>
            <td>Gauge</td>
            <td><code>centerText</code></td>
            <td><code>(value, max, min, { value, max, min, percent, color })</code></td>
        </tr>
        <tr>
            <td>Map</td>
            <td><code>tooltipFormat</code></td>
            <td><code>({ feature, item, label, value, color })</code> — <code>item</code> is <code>null</code> for a region without data</td>
        </tr>
        <tr>
            <td>Graph, Sankey, MapFlow</td>
            <td>node and link formatters</td>
            <td>one object each (<code>{ node, links }</code>, <code>{ link, source, target }</code>…) — see their pages; Sankey's <code>valueFormat(value)</code> gets the number only</td>
        </tr>
    </tbody>
</table>
</div>

The axis formatters (`yTickFormat`, `xTickFormat`, `y1TickFormat`…) take only the tick value.

## setData()

All charts expose a `setData(data)` method that accepts the chart-specific data format and triggers a render. You can call it multiple times — the chart will update in place without re-initializing. The chart keeps its own copy: the array you pass is never modified, dates are read (a `Date`, an ISO string or epoch milliseconds) and sorted, and rows that cannot be read are dropped. An empty array clears the drawing. On charts with timeframes, the selected timeframe is applied to the new data, and a window the new data no longer reaches falls back to the full range.

<pre class="text-content-caption"><code>const chart = new RareCharts.Bar('#chart', options);

chart.setData(initialData);

<span class="code-comment">// Later — same chart, new data, no flicker</span>
chart.setData(updatedData);</code></pre>

## whenReady()

Every chart has `whenReady()`: a promise that resolves with the chart once it has drawn what it loads — Graph its queued requests and layout, Map and MapFlow the map geometry (it also resolves when the geometry fails to load; the error goes to the console). The other charts draw on `setData()`, so theirs is already resolved. Use it before measuring the drawing or taking a screenshot.

<pre class="text-content-caption"><code>const map = new RareCharts.Map('#map', { geoUrl: '/data/europe.geojson' }).setData(rows);
map.whenReady().then(() => console.log('drawn'));</code></pre>

## destroy()

Cleans up the chart: disconnects the resize observer, stops pending work (a font load, map geometry, graph requests), empties the container and removes the classes and inline sizes the chart added to it — anything your page set stays. Your own elements moved into the card (`controls`, a Graph `details` panel) go back where they were. After `destroy()` the chart draws nothing and calls none of your callbacks — `onViewChange`, `onScaleChange`, not even for a navigator drag that ends after it. Call this when removing a chart from the page to avoid memory leaks.

<pre class="text-content-caption"><code>chart.destroy();</code></pre>

## Complete example

<pre class="text-content-caption"><code>new RareCharts.Line('#revenue-chart', {
  title:          'Monthly Revenue',
  subtitle:       'USD, last 12 months',
  source:         'Source: Internal accounting',
  legend: [
    { label: 'Actual',   color: '#00aaff' },
    { label: 'Forecast', color: '#aaaaaa' },
  ],
  height:         320,
  theme:          { accent: '#00aaff' },
}).setData(data);</code></pre>
