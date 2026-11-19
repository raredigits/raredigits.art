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

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>title</code></td>
            <td>string</td>
            <td>Chart title, rendered as an uppercase <code>&lt;h5&gt;</code></td>
        </tr>
        <tr>
            <td><code>subtitle</code></td>
            <td>string</td>
            <td>Smaller text below the title; wraps onto as many lines as it needs (the title stays on one line)</td>
        </tr>
        <tr>
            <td><code>legend</code></td>
            <td>array | string | HTMLElement</td>
            <td>Legend items (see below)</td>
        </tr>
        <tr>
            <td><code>legendPosition</code></td>
            <td><code>'right'</code></td>
            <td>Move the legend into a vertical column beside the chart</td>
        </tr>
        <tr>
            <td><code>ariaLabel</code></td>
            <td>string</td>
            <td>Accessible name of the chart drawing (the <code>&lt;svg&gt;</code> gets <code>role="img"</code>). Defaults to the title and subtitle, joined with " — "; without them, "Chart". On MultiChart it names the grid (<code>role="group"</code>)</td>
        </tr>
        <tr>
            <td><code>legendInteractive</code></td>
            <td>boolean</td>
            <td>Default <code>true</code>: a <code>legend</code> item that names a series is a button that hides and shows it (see <a href="#interactive-legend">Interactive legend</a>). <code>false</code>: every item is a plain label, and a series hidden from code leaves the legend</td>
        </tr>
        <tr>
            <td><code>legendRescale</code></td>
            <td>boolean</td>
            <td>Default <code>true</code>: the value axes, a stack's percents and a ring's total follow the series shown. <code>false</code>: they keep every series, so a hidden one leaves its room</td>
        </tr>
        <tr>
            <td><code>onLegendToggle</code></td>
            <td>function</td>
            <td><code>({ name, visible, visibleNames }) =&gt; void</code>, once per legend gesture, after the chart redraws</td>
        </tr>
    </tbody>
</table>
</div>

Without a title, subtitle or legend — and without timeframe buttons or the Log toggle — no header element is created: the chart starts right at the top of the container.

The header lays out by the width of the card, not of the window: on a card 460 px wide or narrower the timeframe buttons and the Log toggle move from beside the title to under the subtitle — a narrow card on a wide screen included.

### Legend format

Pass an array of items and the chart renders them as a horizontal row of labeled indicators:

<pre class="text-content-caption"><code>legend: [
  { label: 'Portfolio A', color: '#00c97a' },
  { label: 'Portfolio B', color: '#fa8c16' },
]</code></pre>

Each item supports:
- `label` (or `name`) — display name
- `series` — the series the item toggles, when its label is not the series' name; `series: false` keeps the item a caption
- `id` — on Donut and Pie, the slice the item names, when the slices have ids
- `color` — indicator color (the color of the series it names, else `theme.accent`)
- `type` — the mark: `'bar'` or `'dot'` renders a round dot, `'band'` a small filled square (a shaded range), `'dashed'` a dashed line (as does `dash: true`); anything else, or nothing, a short solid line
- an item with no `type` that names a dashed series — TimeSeries' comparison — gets a dashed swatch

For line charts, use the default line indicator. For bar and donut charts, use `type: 'bar'` — a dot reads as a filled mark rather than a stroke, which matches the shape of what you're labeling. Use `'dashed'` for a forecast and `'band'` for a confidence range.

`legendPosition: 'right'` places the legend in a vertical column to the right of the chart. Useful when you have many series and don't want the legend eating into the chart's vertical space. The chart area automatically adjusts its width; the navigator, your `controls` and the footer stay under the drawing, in that order.

### Interactive legend

A `legend` item that names a series in the data is a toggle. It names one by `series`, else `name`, else `label`, so `{ label: 'Revenue' }` toggles the series named "Revenue" and `{ label: 'Sales', series: 'Revenue' }` does the same under another label. Every other item stays a label. When some items name series and one names none, the console says so once for that item — most likely a typo; give it `series: false` to keep it a caption. A string or element `legend` is your own markup, and the chart leaves it alone.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Gesture</th>
            <th>What it does</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Click or tap; Enter or Space</td>
            <td>Hides or shows that series</td>
        </tr>
        <tr>
            <td>Double click or double tap</td>
            <td>Keeps only that series; on the only series shown, brings all back</td>
        </tr>
        <tr>
            <td>Show all</td>
            <td>Shows every series. The item is there while anything is hidden</td>
        </tr>
    </tbody>
</table>
</div>

A click that hides waits a quarter of a second for a second click, so the series you double-click to keep never flashes off. A click that shows, and Enter or Space, act at once. The toggles are buttons in the Tab order with `aria-pressed`, and the legend is a group named "Legend". The words "Show all" and "Legend" are fixed English.

A hidden series leaves the drawing, its end labels and markers, the crosshair and the tooltip. The time axis, the view, the timeframes, the navigator and the annotations stay where they are. Hide every series and the axes and the grid stay, with no marks. A hidden series stays hidden across `setData`, also while the new data lacks it.

What the rest of the chart does depends on the class and on `legendRescale`:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Chart</th>
            <th><code>legendRescale: true</code> (default)</th>
            <th><code>legendRescale: false</code></th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Line, TimeSeries</td>
            <td>The Y axis fits the series shown</td>
            <td>The Y axis keeps every series in view</td>
        </tr>
        <tr>
            <td>DualAxes</td>
            <td>Each axis fits its own series shown; an axis whose series are all hidden keeps their range, so its labels stay in its units</td>
            <td>Both axes keep every series in view</td>
        </tr>
        <tr>
            <td>Bar, stacked</td>
            <td>The value axis runs to the tallest stack shown; <code>stacked: 'percent'</code> bars are shares of what is shown</td>
            <td>The axis keeps every series; percent bars are shares of the whole bar, and the top stays empty</td>
        </tr>
        <tr>
            <td>Donut, Pie</td>
            <td>The ring closes over the slices shown; the total, the percents and the centre are theirs</td>
            <td>A hidden slice leaves its gap; the total and the percents stay of every slice</td>
        </tr>
    </tbody>
</table>
</div>

Sankey, Graph's flow view and MapFlow hide and show tie categories (`linkTypes`) the same way; a Sankey keeps its layout, so a hidden band leaves its gap at its nodes. In Graph's ego view the legend filters the traversal instead — see [Graph](/charts/graph/). A [MultiChart](/charts/multi/#shared-legend)'s own legend toggles the series of that name in every cell. Bar's category and date modes, HierarchicalBar, Gauge and Map draw one series or none: their `legend` is a caption.

`onLegendToggle` gets `{ name, visible, visibleNames }` once per gesture, after the chart redraws: `name` is the series toggled (`null` for Show all), `visible` its state now (`true` after a double click), `visibleNames` the series shown, in data order. To set the legend from code, `setSeriesVisible(names | null)` — on Line, DualAxes, TimeSeries, the stacked Bar, Donut, Pie and MultiChart — shows the series named and hides every other series in the data; `null` shows them all. `setLinkTypesVisible(types | null)` does the same for tie categories on Sankey, Graph and MapFlow. Both redraw and return the chart, and neither fires `onLegendToggle`, so a page that mirrors one chart into another cannot loop. Call them after `setData`: they read the series from the data.

<pre class="text-content-caption"><code>const chart = new RareCharts.Line('#chart', {
  legend: [
    { label: 'Revenue' },
    { label: 'Costs' },
    { label: 'Plan', series: false },   <span class="code-comment">// a caption, not a toggle</span>
  ],
  onLegendToggle: ({ visibleNames }) => saveShown(visibleNames),
}).setData(series);

chart.setSeriesVisible(['Revenue']);   <span class="code-comment">// Revenue alone; no onLegendToggle</span></code></pre>

## Footer

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>source</code></td>
            <td>string | <code>{ text, href }</code> | array | HTMLElement</td>
            <td>Rendered as a <code>&lt;cite&gt;</code> below the chart. Great for data attribution. Pass <code>{ text, href }</code> to make it a link, or an <strong>array of parts</strong> to mix several links and plain text on one line — see below.</td>
        </tr>
        <tr>
            <td><code>note</code></td>
            <td>string | HTMLElement</td>
            <td>Rendered as a <code>&lt;p class="rc-chart-note"&gt;</code> below the source, in muted type. For disclaimers, data caveats, and editorial context. Keeps interpretive text inside the component instead of as stray markup around the container.</td>
        </tr>
        <tr>
            <td><code>controls</code></td>
            <td>HTMLElement | selector</td>
            <td>Your own controls that drive the chart — checkboxes, a time slider, a select. The element is moved inside the card, between the drawing and the source line, and gets the compact <code>rc-chart-controls</code> row style; its event listeners keep working. Keeps the controls visibly part of the chart instead of floating above it.</td>
        </tr>
    </tbody>
</table>
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
            <td><code>height</code></td>
            <td>number</td>
            <td>varies</td>
            <td>Total container height in px, with the title, subtitle, legend, buttons, navigator and footer included; see each chart's page for its default. On a narrow card those parts wrap and take more of it, and the plot gets what is left (<code>chart.height</code>). The plot keeps at least 80 px: when the parts would leave it less, the card grows past <code>height</code> by the difference, and returns to <code>height</code> once they fit again.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td>per chart</td>
            <td>Space around the drawing area in px, <code>{ top, right, bottom, left }</code>; a side you leave out keeps the chart's default. Donut, Pie, Gauge, Sankey and Graph fill the card and do not use it — except a vertical Sankey, which adds <code>top</code> and <code>bottom</code> to the height it computes for its card</td>
        </tr>
    </tbody>
</table>
</div>

Each chart sets its own margins around its axes — Line `{ top: 10, right: 64, bottom: 18, left: 0 }`, Time Series `{ top: 16, right: 70, bottom: 28, left: 0 }`, DualAxes a 64px gutter on each side; Map, MapFlow and MultiChart use none. Hiding an axis gives its gutter back, and annotations raise `top` to make room for their labels. A value axis's gutter that `margin` does not set grows to fit its widest tick or end label — `$100,000` needs more than 64 px — and shrinks back to the class's width when the labels get narrower; a side you set stays as you set it. Set `margin` for a different frame:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  height: 320,
  margin: { top: 8, right: 50, bottom: 16, left: 40 },
})</code></pre>

## Theme

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>theme</code></td>
            <td>object</td>
            <td>Partial or full theme object. Merged with the active default.</td>
        </tr>
    </tbody>
</table>
</div>

Pass a theme object to override colors, the tooltip fonts, or the sizing defaults (line width, crosshair dots, markers, DualAxes bar opacity). The chart's own fonts and spacing are CSS variables. The full theme system is documented on the [Styles](/charts/styles/) page.

Quick example — apply the built-in dark theme:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  theme: RareCharts.darkTheme,
}).setData(data);</code></pre>

Or override just the accent color:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  theme: { accent: '#fa8c16' },
}).setData(data);</code></pre>

## Colors

Chart colors follow a clear resolution order. Understanding it tells you exactly where to set a color and how overrides interact.

For each series, the chart resolves color in this order:

1. `color` on the individual series object — highest priority
2. `theme.colors[index]` — palette array, cycled by series position
3. `theme.accent` — single accent fallback

The palette starts with blue, `#1677ff`, which is also the accent, then orange, `#fa8c16`. To change the default color across all single-series charts, override `accent` in the theme. To define a full multi-series palette, override `theme.colors`. On a page that sets the chart tokens — Rare Styles `v0.7.2` does — the default palette is `--chart-series-1` … `--chart-series-6`; a theme you pass wins over them. The full order is on [Styles](/charts/styles/#where-colors-come-from).

For multi-series charts, set `color` directly on each series in the data array:

<pre class="text-content-caption"><code>chart.setData([
  { name: 'Revenue', color: '#1677ff', values: [...] },
  { name: 'Costs',   color: '#fa8c16', values: [...] },
]);</code></pre>

For single-series Line charts, `lineColor` is a shortcut that avoids wrapping flat data in a series object:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  lineColor: '#00c97a',
}).setData([{ date, value }, ...]);</code></pre>

Area fills inherit the series `color`; their opacity is the `areaOpacity` option (default `0.12`, also per series on Line and DualAxes). DualAxes bars take the `barOpacity` option (default `0.35`) — or set `theme.barOpacity` for every chart that shares the theme; `Bar` draws opaque bars.

## Axis labels

Y axis tick labels support two levels of customization.

**Prefix and suffix** (Line, Bar and TimeSeries) attach a fixed string before or after each auto-formatted value:

<pre class="text-content-caption"><code>yPrefix: '$'    <span class="code-comment">// → $1.2M</span>
ySuffix: '%'    <span class="code-comment">// → 12.5%</span></code></pre>

**Full format override** replaces automatic formatting entirely on Line, Time Series and Bar. The bundled D3 is `RareCharts.d3` — there is no global `d3` on a page that loads only the library:

<pre class="text-content-caption"><code>yTickFormat: v => RareCharts.d3.format(',.0f')(v) + ' units'</code></pre>

DualAxes has independent formatters for each axis — no prefix/suffix shortcuts, use `y1TickFormat` / `y2TickFormat` directly:

<pre class="text-content-caption"><code>y1TickFormat: v => '$' + RareCharts.d3.format(',.2f')(v),
y2TickFormat: v => RareCharts.d3.format('+.1f')(v) + 'bp'</code></pre>

When `yTickFormat` is provided, it owns the tick labels: `yPrefix`, `ySuffix` and `yFormat` no longer apply to them. On Line it formats the end labels and the tooltip values too.

<h3 id="short-numbers">Short numbers: 50K, 1.2M</h3>

Without `yTickFormat` the value axis already shortens large numbers, by the step between its ticks: `0 50k 100k 150k`, `0 0.5M 1M` (D3’s SI prefixes: `k`, `M`, and `G` for billions). Value labels (`valueFormat`) and the default tooltips print full numbers, `50,000`. To get the short form everywhere — or a capital `K` and `B` for billions — pass the same function to each:

<pre class="text-content-caption"><code>const d3 = RareCharts.d3;
const short = v => Math.abs(v) &lt; 1000
  ? d3.format(',~g')(v)                                          <span class="code-comment">// 0.5, 500</span>
  : d3.format('.3~s')(v).replace('k', 'K').replace('G', 'B');   <span class="code-comment">// 50K, 1.23M, 2.5B, −42K</span>

yTickFormat: short,
valueFormat: d => short(d.value),</code></pre>

For money, put the currency in the format: `d3.format('$.3~s')` gives `$50k` and `−$42k`. `.3` keeps three significant digits; `~` drops trailing zeros.

## Crosshair and tooltip

The crosshair is a vertical tracker that follows the cursor, snaps to the nearest data point on each series, and shows a tooltip. It is enabled by default on Line, TimeSeries, and DualAxes charts.

To disable it entirely (removes both the tracker line and the tooltip):

<pre class="text-content-caption"><code>crosshair: false</code></pre>

### Custom tooltip

`tooltipFormat` replaces the default tooltip with your own HTML. Build it from the classes of the default tooltip, and your rows look like the built-in ones:

<pre class="text-content-caption"><code>tooltipFormat: ({ date, points }) => {
  const d = RareCharts.d3.timeFormat('%b %d, %Y')(date);
  return `&lt;div class="rc-tooltip-header rc-tooltip-muted"&gt;${d}&lt;/div&gt;` +
    points.map(p => `
      &lt;div class="rc-tooltip-row"&gt;
        &lt;span class="rc-tooltip-swatch" style="--rc-swatch-color:${p.color}"&gt;&lt;/span&gt;
        &lt;span class="rc-tooltip-label"&gt;${p.name}&lt;/span&gt;
        &lt;span class="rc-tooltip-value rc-num"&gt;${p.fmt} USD&lt;/span&gt;
      &lt;/div&gt;`
    ).join('');
}</code></pre>

`points` is an array of `{ name, series, type, color, date, value, fmt }` — one entry per series that covers the hovered date; on DualAxes each also has `axis`, and a band has `lower` and `upper` in place of `value` (`series` is the name again, the role field every formatter shares — see [Formatter arguments](#formatter-arguments)). `fmt` is the value already run through `yTickFormat` (or the default formatter), so you don't need to reformat it yourself.

The classes are optional. They are the ones the default tooltips use, they follow `theme.tooltip` and the page's tooltip tokens, and they are the supported hooks for page CSS:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Class</th>
            <th>What it is</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>rc-tooltip-header</code></td>
            <td>The line naming what is hovered. With <code>rc-tooltip-muted</code>: a date or a category on top, 13 px and muted. With <code>rc-tooltip-title</code>: a bold title (a region, a node)</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-row</code></td>
            <td>One row: a mark, a name and a value. Rows share the tooltip's width, so their values line up</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-row--plain</code></td>
            <td>A row without a mark</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-swatch</code></td>
            <td>The mark: a short line in <code>--rc-swatch-color</code>, which you set in the <code>style</code> attribute; without it, the text color</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-swatch--dashed</code>, <code>--band</code>, <code>--dot</code></td>
            <td>Other marks, with <code>rc-tooltip-swatch</code>: a dashed line, a square for a band, a dot for a bar, a slice or a region</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-label</code></td>
            <td>The name, in the tooltip's text color</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-value</code></td>
            <td>The value, right-aligned</td>
        </tr>
        <tr>
            <td><code>rc-num</code></td>
            <td>Figures in the numeric font with tabular digits. Put it on the value; a value in words goes without it</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-note</code></td>
            <td>A line under the name, 13 px and muted: a change, a share. It goes inside the row, after the value</td>
        </tr>
        <tr>
            <td><code>rc-tooltip-muted</code>, <code>rc-tooltip-sub</code></td>
            <td>Secondary text in the tooltip's muted color; <code>rc-tooltip-sub</code> is also small (11 px)</td>
        </tr>
    </tbody>
</table>
</div>


The string you return is inserted as HTML as is — escape anything that comes from your data (series names, labels from a CSV or an API) before putting it in. The default tooltips escape data themselves: a label such as `<b>` shows as text. This applies to every chart's `tooltipFormat`.

### Tooltip styling

The tooltip text is 14 px on a 24 px line; the date on top and a note are 13 px. Names and words are in the chart's font, figures — values, percentages, dates in a row — in the numeric font, through `.rc-num`. `theme.font` sets the tooltip's words and `theme.numericFont` its figures. A visible tooltip is opaque.

Without colors of its own, the tooltip takes the page's `--chart-tooltip-bg`, `--chart-tooltip-border`, `--chart-tooltip-text`, `--chart-tooltip-muted` and `--chart-tooltip-shadow` (Rare Styles `v0.7.2` sets them), so one rule recolors the tooltips of every chart on a page. For one chart, use `theme.tooltip` — here a dark tooltip on a light chart:

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

For structural changes (padding, border-radius, font size), use a selector that outranks the library's `.rc-tooltip` — the library appends its stylesheet to `<head>` when it loads, after any stylesheet already there, so a plain `.rc-tooltip { … }` loses the tie: `.rc-chart .rc-tooltip { border-radius: 4px; }`, `.rc-chart .rc-tooltip-value { font-weight: bold; }`. The crosshair line uses `.rc-cross-line`. All tooltip tokens and classes: [Styles](/charts/styles/).

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
            <td><code>(row, { date, value, color, level })</code> — the row with its extra fields (<code>open</code>, <code>volume</code>…); <code>level</code> is the level drawn (<code>null</code> for plain rows). With <code>compare</code> also <code>series</code> and <code>compare</code> (<code>{ date, value, change }</code> or <code>null</code>); with <code>band</code> also <code>band</code> (<code>{ lower, upper }</code> or <code>null</code>)</td>
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

## Names and labels

Two fields name things, and each has one job. A **series** is named by `name`: the lines of Line and DualAxes, the stacked Bar's series, a TimeSeries' `seriesName`. A **part** of one whole is named by `label`: a bar's category, a Donut or Pie slice, a HierarchicalBar node, a Map region. Formatters get the same two as `series` and `label` (see [Formatter arguments](#formatter-arguments)), and a legend item shows its `label` and toggles the series its `series`, `name` or `label` names.

When parts of a stack become a whole of their own — a stacked bar's series totals drawn as a Donut — each series' `name` becomes a slice's `label`:

<pre class="text-content-caption"><code>const slices = series.map(s =&gt; ({
  label: s.name,
  value: RareCharts.d3.sum(s.values, d =&gt; d.value),
}));</code></pre>

## Timeframes and the view

Every chart with timeframes — Line, DualAxes, TimeSeries, the dated Bar, MapFlow and Graph's flow view — reads the same keys and options. The [Time Series](/charts/line/time-series/#analytics-ranges) page shows them at work.

- `timeframeAnchor` — the end every timeframe counts back from: `'dataEnd'` (the default, the last data point), `'now'`, or a fixed date. With an anchor past the data, `ALL`, the zoom and the navigator run on to it. A relation chart reads a fixed anchor as a view bound: `1950` is the end of 1950.
- Keys: `ALL` / `MAX`; the calendar `TODAY`, `WTD`, `MTD`, `YTD` (from the start of the anchor's day, week, month or year in the chart's `timeZone`); `nH` (real hours); `nD`, `nW`, `nM`, `nY`; `{ key, label, range }` for a fixed period.
- `weekStart` — the first day of a week for `WTD` and week buckets: `'monday'` (default), `'sunday'`, any day name or 0–6.
- `'CUSTOM'` — a "Custom" button with From / To date fields and Apply; `setTimeframe('CUSTOM', { range: [from, to] })` sets it from code. The panel is styled by `rare-charts.css` (`.rc-range-custom`, `.rc-range-panel`, `.rc-range-label`, `.rc-range-input`, `.rc-range-apply`) in the tooltip's colours, and is hidden in print.
- `onViewChange(fn)` — `fn(extent, { key, level })`, once per button click and per brush drag: `key` is the timeframe key when a button or `setTimeframe` set the window (`null` for the brush, the wheel, `setView`), `level` the TimeSeries level drawn (`null` elsewhere).
- `setLoading(true | false)` — a slim "Loading…" bar over the plot and `aria-busy` on the card, for a page that fetches data for a new window; the drawing stays until the new data comes.

The words "Custom", "From", "To", "Apply", "Loading…", "Hold Ctrl to zoom" and "Use two fingers to move" are fixed English.

## Dates and time zones

The charts with a time axis — Line, DualAxes, TimeSeries, the dated Bar and Overview — and the time controls of Graph's flow view and MapFlow read their dates in one zone, the chart's `timeZone`: `'local'` (the default, the reader's own zone) or `'UTC'`. The zone decides how a date without a zone of its own is read, where the timeframes cut (`TODAY`, `MTD`, `1M`…), and how the ticks, the tooltip and the navigator name the dates.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>A date given as</th>
            <th>Is read as</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>A <code>Date</code>, epoch milliseconds, an ISO string with <code>Z</code> or an offset (<code>'2024-03-01T12:00Z'</code>, <code>'…+04:00'</code>)</td>
            <td>That instant, whatever the zone</td>
        </tr>
        <tr>
            <td>A calendar string with no zone: <code>'2024'</code>, <code>'2024-03'</code>, <code>'2024-03-01'</code>, <code>'2024-03-01 14:30'</code> (<code>-</code> or <code>/</code>, <code>T</code> or a space)</td>
            <td>That day and wall time in the chart's zone: local midnight by default, UTC midnight with <code>timeZone: 'UTC'</code></td>
        </tr>
        <tr>
            <td>Any other text</td>
            <td>As the browser's <code>Date</code> reads it; a row whose date cannot be read is dropped</td>
        </tr>
    </tbody>
</table>
</div>

A calendar step keeps the wall time and clamps the day of the month: `1M` back from 31 March starts on 29 February in a leap year.

Use `timeZone: 'UTC'` when the data are UTC instants that stand for days — daily closes from an API, `new Date('2024-03-01')` (JavaScript reads a date-only string as UTC midnight), `Date.UTC(…)`. In the default zone a reader west of UTC would see each such row on the evening before, named a day early. With `'UTC'` every reader sees the same days, and date-only strings in annotations and `setView()` are read in UTC too:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  timeZone: 'UTC',
  annotations: [{ date: '2024-04-19', label: 'Halving' }],
}).setData(rows.map(r =&gt; ({ date: new Date(r.day), value: r.close })));</code></pre>

Your own `xTicks` and `xTickFormat` on a UTC chart need d3's UTC helpers — `d3.utcFormat('%b %d')`, `d3.utcMonth.every(3)` — because `d3.timeFormat` and `d3.timeMonth` work in the reader's zone. The defaults follow the chart's zone by themselves.

In local time, a day that crosses a daylight-saving change lasts 23 or 25 hours, so a daily bar on that day is a little narrower or wider. TimeSeries still counts such a step as a day when it works out the rows' `interval`.

The data adapters (`fromJson`, `fromCsv`…) take no zone: they read a date-only string as local midnight. For a chart with `timeZone: 'UTC'`, map such a date to epoch milliseconds — `date: row => Date.parse(row.date)` reads `'2024-03-01'` as UTC midnight — or pass the rows' strings to `setData` without an adapter ([Data import](/charts/data-import/)).

On Graph's flow view and MapFlow a tie's `start` and `end` may also be a period: a number below 10000 or `'YYYY'` is a year, `'YYYY-MM'` a month. As an end, a period runs to its last moment, so a tie ending `'2024-01'` lasts the whole of January. A full date is a point: an end of `'2024-02-08'` is the start of that day.

## setData()

All charts expose a `setData(data)` method that accepts the chart-specific data format and triggers a render. You can call it multiple times — the chart will update in place without re-initializing. The chart keeps its own copy: the array you pass is never modified, dates are read (a `Date`, an ISO string or epoch milliseconds, in the chart's [time zone](#dates-and-time-zones)) and sorted, and rows that cannot be read are dropped. An empty array clears the drawing. On charts with timeframes, the selected timeframe is applied to the new data, and a window the new data no longer reaches falls back to the full range.

<pre class="text-content-caption"><code>const chart = new RareCharts.Bar('#chart', options);

chart.setData(initialData);

<span class="code-comment">// Later — same chart, new data, no flicker</span>
chart.setData(updatedData);</code></pre>

## whenReady()

Every chart has `whenReady()`: a promise that resolves with the chart once it has drawn what it loads — Graph its queued requests and layout, Map and MapFlow the map geometry (it also resolves when the geometry fails to load; the error goes to the console). The other charts draw on `setData()`, so theirs is already resolved. Use it before measuring the drawing or taking a screenshot.

<pre class="text-content-caption"><code>const map = new RareCharts.Map('#map', { geoUrl: '/data/europe.geojson' }).setData(rows);
map.whenReady().then(() => console.log('drawn'));</code></pre>

## A chart in a hidden container

A chart created in a container that has no size yet — `display: none`, a closed tab panel or `<details>`, a dialog not yet open — draws nothing at first. It watches its container, and draws as soon as the container gets a size, so showing the container is enough: there is nothing to call. A chart created in a background browser tab draws when the tab is shown, as the browser holds its drawing frames until then. Measure the drawing after it is visible.

## destroy()

Cleans up the chart: disconnects the resize observer, stops pending work (a font load, map geometry, graph requests), empties the container and removes the classes and inline sizes the chart added to it — anything your page set stays. Your own elements moved into the card (`controls`, a Graph `details` panel) go back where they were. After `destroy()` the chart draws nothing and calls none of your callbacks — `onViewChange`, `onScaleChange`, not even for a navigator drag that ends after it. Call this when removing a chart from the page to avoid memory leaks.

<pre class="text-content-caption"><code>chart.destroy();</code></pre>

## Defaults across charts

The options below exist on several classes, and their defaults are not all alike. Where they differ, they differ on purpose (maintainer decision, 2026-11-17): each class keeps the default that suits what it draws, and this table is the place to compare them. Each chart's page has the full list.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Where it differs</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>duration</code></td>
            <td><code>650</code> ms: the entry of Line, Bar, HierarchicalBar, DualAxes, Donut, Pie, Gauge and Sankey</td>
            <td>Graph (ego, path, cluster): <code>500</code> ms for its moves; the first drawing does not animate. TimeSeries, Overview, Map, MapFlow and the flow view draw without an entry. <code>animate: false</code> draws at once; a reader who prefers reduced motion gets none</td>
        </tr>
        <tr>
            <td><code>ease</code></td>
            <td><code>'cubicOut'</code></td>
            <td>—</td>
        </tr>
        <tr>
            <td><code>yTicks</code></td>
            <td><code>4</code>: Line, Bar; DualAxes <code>y1Ticks</code>, <code>y2Ticks</code></td>
            <td>TimeSeries: <code>5</code></td>
        </tr>
        <tr>
            <td><code>xTicks</code></td>
            <td><code>6</code> on a date axis: Line, the dated Bar (DualAxes and TimeSeries draw 6 and take no option)</td>
            <td>Bar, horizontal: <code>4</code> on its value axis</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>By the step between ticks: <code>50k</code> from 1,000, <code>0.5</code> below (Line, Bar; DualAxes <code>y1TickFormat</code>, <code>y2TickFormat</code>); on a log axis <code>.3~s</code></td>
            <td>Line, with <code>yFormat: 'auto'</code> and values within ±1: a signed percent, <code>+12.50%</code>. TimeSeries: <code>yFormat: 'currency'</code>, <code>$</code> and <code>,.0f</code>; <code>yFormat: 'number'</code> labels as Line</td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>By the span in view: <code>14:00</code> up to 36 hours, <code>Jan 05</code> up to 92 days, <code>Jan</code> up to a year, <code>Jan '24</code> up to five years, <code>2024</code> beyond (Line, DualAxes, TimeSeries, the dated Bar)</td>
            <td>Bar, horizontal: its value axis, as <code>yTickFormat</code></td>
        </tr>
        <tr>
            <td>Values (end labels, tooltip)</td>
            <td>Three significant digits: <code>147</code>, <code>1.23k</code> (Line, DualAxes)</td>
            <td>Bar <code>valueFormat</code>: <code>,.2~f</code> (<code>1,234</code>, <code>0.4</code>). HierarchicalBar, Donut, Pie: <code>,</code> (<code>1,234</code>). Sankey: the reader's locale. TimeSeries tooltip: <code>$</code> and <code>,.2f</code>, or <code>,.2~f</code> with <code>yFormat: 'number'</code></td>
        </tr>
        <tr>
            <td><code>curve</code></td>
            <td><code>'monotone'</code>: Line, TimeSeries</td>
            <td>DualAxes: <code>'linear'</code>. <code>curveTension</code> is <code>0</code> on all three</td>
        </tr>
        <tr>
            <td><code>area</code></td>
            <td><code>false</code>: Line and DualAxes, also per series, with <code>areaOpacity: 0.12</code></td>
            <td>TimeSeries and Overview: <code>true</code>, a gradient; a number is a solid fill at that opacity</td>
        </tr>
        <tr>
            <td>Line width</td>
            <td><code>theme.strokeWidth</code>, <code>2</code></td>
            <td>Line and DualAxes take a series' own <code>strokeWidth</code>; TimeSeries has none</td>
        </tr>
        <tr>
            <td>Value-axis gutter</td>
            <td><code>64</code> px: Line, DualAxes (each side), the vertical Bar</td>
            <td>TimeSeries: <code>70</code>. The horizontal Bar: <code>65</code> for its category labels, more for long ones. A gutter <code>margin</code> does not set grows to fit its widest label (see <a href="#layout">Layout</a>)</td>
        </tr>
        <tr>
            <td><code>barWidthRatio</code></td>
            <td><code>0.72</code>: Bar</td>
            <td>DualAxes: <code>0.65</code></td>
        </tr>
        <tr>
            <td><code>nodeRadius</code></td>
            <td><code>22</code>: Graph ego, path and cluster</td>
            <td>The flow view: <code>18</code>. MapFlow: <code>4</code>, a place's dot</td>
        </tr>
        <tr>
            <td><code>mobileBreakpoint</code></td>
            <td><code>480</code> px of card width: Sankey turns vertical, MultiChart takes <code>mobileColumns</code></td>
            <td>Every chart's header puts its range buttons under the subtitle on a card of 460 px or narrower; that width is not an option</td>
        </tr>
        <tr>
            <td><code>centerLabel</code></td>
            <td>Donut: <code>'Total'</code> (a Pie has no centre)</td>
            <td>Gauge: none</td>
        </tr>
        <tr>
            <td><code>legendInteractive</code>, <code>legendRescale</code></td>
            <td><code>true</code> on every chart with a series legend</td>
            <td>—</td>
        </tr>
        <tr>
            <td><code>legendSymbols</code></td>
            <td>The flow view: a key row per node shape, named by its kind, when two or more shapes are drawn</td>
            <td>The dash and width rows show only with the words you give; <code>false</code> drops the key</td>
        </tr>
        <tr>
            <td><code>timeZone</code></td>
            <td><code>'local'</code> on every chart with dates</td>
            <td>— (see <a href="#dates-and-time-zones">Dates and time zones</a>)</td>
        </tr>
    </tbody>
</table>
</div>

## What is public

The contract is what these pages document: the classes with their documented options, methods and callbacks; the data shapes; `RareCharts.d3` (a fixed part of D3, not all of it), the themes and the exported values on [Installation](/charts/installation/#exported-utilities); and the CSS hooks that [Tooltip styling](#tooltip-styling) and [Styles](/charts/styles/) name — `.rc-chart`, `.rc-tooltip` and its row classes (`.rc-tooltip-header`, `-row`, `-swatch`, `-label`, `-value`, `-note`, `-muted` …), `.rc-num`, `.rc-chart-controls`, `.rc-chart-note`, `.rc-cross-line`, `.rc-overview`, Graph's `.rc-graph-details` and `.rc-graph-tool`, and the `--rc-*` variables. At `1.0` it freezes: from then on a change to it is a major version. Graph, Sankey and MapFlow are experimental and stay outside that promise.

Not part of it, and free to change in any release:

- `render()`, the chart's internal redraw: a chart redraws itself on `setData`, on a resize and after its own methods;
- the state a chart keeps on its instance (`width`, `height`, `container`, `options`, `theme`, `margin`, `svg`; TimeSeries' `xScale` and `yScale`) and every member whose name starts with `_`;
- the classes on a chart's own parts — its bars, slices, regions, bands, nodes and ties — apart from the hooks above, the order of its elements, and the height and margin of MultiChart cells;
- `generateMockPrices`, a helper for demos.

## Complete example

<pre class="text-content-caption"><code>new RareCharts.Line('#revenue-chart', {
  title:          'Monthly Revenue',
  subtitle:       'USD, last 12 months',
  source:         'Source: Internal accounting',
  legend: [
    { label: 'Actual',   color: '#1677ff' },
    { label: 'Forecast', color: '#aaaaaa' },
  ],
  height:         320,
  theme:          { accent: '#1677ff' },
}).setData(data);</code></pre>
