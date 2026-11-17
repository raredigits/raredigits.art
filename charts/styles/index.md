---
layout: page.njk
title: "Styles"
section: "Charts"
displaySidebar: true
permalink: '/charts/styles/'
---

RareCharts uses a two-layer styling system. Structure, layout and typography live in CSS. Colors, the tooltip font and a few sizing defaults live in a JavaScript theme object. They work independently, which means you can swap a theme without touching CSS, and you can override layout without touching the theme.

## Layer 1: CSS structure

`rare-charts.js` automatically injects a small stylesheet into `<head>` when the library loads (a page under a strict Content Security Policy loads it as a file instead — see [Installation](/charts/installation/)). It handles:

- The `.rc-chart` flex container (header with the title, subtitle, legend and range buttons → SVG → navigator → your controls → source and note, in that order)
- Legend layout (horizontal row, or vertical aside when `legendPosition: 'right'`)
- The header layout by the card's width: `.rc-chart` is a size container (`container: rc-chart / inline-size`), and on a card 460 px wide or narrower the buttons move under the subtitle, whatever the window's width. The card takes its width from its parent — a block, a grid cell, a stretched flex item; in a box that shrinks to fit its content (an inline-block, an item of a flex row) give it a width, or it collapses
- Tooltips: position and fade, size, weights and spacing of their rows
- SVG axis label styles, end labels, markers
- Spacing, the chart font, and the timeframe buttons — a page's `button:hover` background does not reach them, and the Lin/Log button keeps its diagonal fill on hover

**Chart colors are not in CSS.** This is intentional. Every chart color — grid lines, axis text, series fills — is set by the chart from the active theme; tooltip colors reach the stylesheet as `--rc-tooltip-*` custom properties set on the tooltip from `theme.tooltip`. That makes theming predictable: change the theme object, everything follows. The stylesheet itself reads a few [Rare Styles](/styles/) colors — `--primary-color` for header and legend text that carries no theme color (an HTML legend, the Graph and MapFlow legend buttons), the timeframe buttons, the Graph panels — and each has a fallback, so a page without Rare Styles needs no extra CSS.

RareCharts ships with its own typography and spacing defaults. The base stylesheet defines:

- `--rc-font-family: "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- `--rc-font-family-numeric: "Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
- `--rc-font-size: 16px`
- `--rc-font-size-sm: 14px`
- `--rc-space-xs`, `--rc-space-sm`, `--rc-space-md`, `--rc-space-lg`: `4px`, `8px`, `16px`, `32px`

These variables live on `.rc-chart`, so the charts keep a consistent visual language even when embedded on a third-party site with a completely different type system. The chart sets `font-family` once, on `.rc-chart`; everything inside inherits it. To change a variable, use a selector that outranks the library's `.rc-chart` rule — the library appends its stylesheet to `<head>` when it loads, after any stylesheet already there, so a plain `.rc-chart { … }` on the page loses the tie: `:root .rc-chart { --rc-font-family: Georgia, serif; }`, or the chart's id.

The library loads no fonts. Fira Sans and Cousine are used when the page provides them — Rare Styles self-hosts both — and system fonts otherwise. [Installation](/charts/installation/) has a `<link>` that loads them on any page.

## Layer 2: JS theme

The theme is a plain object that every chart reads at render time. The default theme looks like this:

<pre><code>const defaultTheme = {

  <span class="code-comment">// ── Backgrounds ────────────────────────────────────────────────────────────</span>
  bg:      'var(--bg-color, #ffffff)',  <span class="code-comment">// page background under Rare Styles, white otherwise</span>
  surface: '#f5f5f5',     <span class="code-comment">// Graph node fills, flow lane bands</span>

  <span class="code-comment">// ── Structure ──────────────────────────────────────────────────────────────</span>
  grid:      '#e8e8e8',   <span class="code-comment">// horizontal grid lines</span>
  border:    '#cccccc',   <span class="code-comment">// axis lines, zero baseline</span>
  crosshair: '#aaaaaa',   <span class="code-comment">// vertical hover line — intentionally subtler than border</span>

  <span class="code-comment">// ── Text ───────────────────────────────────────────────────────────────────</span>
  text:  '#000000',       <span class="code-comment">// primary labels</span>
  muted: '#666666',       <span class="code-comment">// axis tick labels, secondary text</span>

  <span class="code-comment">// ── Semantic (P&L, deltas, signals) ────────────────────────────────────────</span>
  positive: '#389e0d',    <span class="code-comment">// gains, up moves</span>
  negative: '#ff0000',    <span class="code-comment">// losses, down moves</span>
  accent:   '#00aaff',    <span class="code-comment">// highlights, single-series default</span>

  <span class="code-comment">// ── Series palette ─────────────────────────────────────────────────────────
  // Used in order for multi-series charts; override the full array or per-series.
  </span>
  colors: [
    '#fa8c16',  <span class="code-comment">// orange</span>
    '#00aaff',  <span class="code-comment">// blue</span>
    '#00c97a',  <span class="code-comment">// green</span>
    '#ffcc00',  <span class="code-comment">// yellow</span>
    '#cc44ff',  <span class="code-comment">// violet</span>
    '#ff0000',  <span class="code-comment">// red</span>
  ],

  <span class="code-comment">// ── Typography ─────────────────────────────────────────────────────────────</span>
  font:        'var(--rc-font-family, "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
  fontSize:    'var(--rc-font-size-sm, 14px)',   <span class="code-comment">// not used; removal at 1.0</span>

  <span class="code-comment">// The tooltip font family.
  // Falls back through a chain of common tabular fonts.
  </span>
  numericFont: 'var(--rc-font-family-numeric, "Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)',

  <span class="code-comment">// ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  </span>
  strokeWidth: 2,
  dotRadius:   3,         <span class="code-comment">// crosshair dot radius</span>
  markerSize:  4,         <span class="code-comment">// per-point marker size</span>
  barOpacity:  0.35,

  <span class="code-comment">// ── Map ────────────────────────────────────────────────────────────────────</span>
  map: {
    matchFill:     '#00aaff',
    unmatchedFill: '#e8e8e8',
    ocean:         'transparent',
    border:        '#ffffff',
    hoverBrighten: 1.3,       <span class="code-comment">// hover: 30% towards white</span>
    graticule:     'rgba(0,0,0,0.08)',
  },

  <span class="code-comment">// ── Tooltip ────────────────────────────────────────────────────────────────</span>
  tooltip: {
    bg:     '#ffffff',
    border: '#e0e0e0',
    text:   '#000000',
    muted:  '#666666',
    shadow: '0 2px 8px rgba(0,0,0,0.10)',
    header: { text: null, bg: null },
  },
};</code></pre>

## Built-in themes

Two themes ship with the library.

`RareCharts.defaultTheme` — light background, clean grays, orange/blue accent palette. Works anywhere.

`RareCharts.darkTheme` — dark background, deep blacks, muted grids, orange accent. Looks sharp on dashboard UIs and dark-mode pages.

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  theme: RareCharts.darkTheme,
}).setData(data);</code></pre>

The result:

<div id="line-chart-demo-revenue" class="panel panel--bordered text-content-caption black-bg"></div>

## Creating a custom theme

`RareCharts.createTheme(overrides, base)` merges your overrides with a base theme — the default one unless you pass another — and returns a complete theme object. You only need to specify what you want to change:

<pre class="text-content-caption"><code>const brandTheme = RareCharts.createTheme({
  accent:  '#e63946',
  colors:  ['#e63946', '#457b9d', '#a8dadc', '#1d3557'],
  numericFont: '"JetBrains Mono", monospace',   <span class="code-comment">// the tooltip font</span>
  tooltip: {
    bg:     '#1d3557',
    border: '#457b9d',
    text:   '#f1faee',
  },
});

new RareCharts.Bar('#chart', {
  theme: brandTheme,
}).setData(data);</code></pre>

`createTheme` does a shallow merge for top-level keys and a deep merge for `tooltip`, `tooltip.header` and `map`, so you can override individual tooltip properties without losing the rest.

To adjust a built-in theme, pass it as the base:

<pre class="text-content-caption"><code>const theme = RareCharts.createTheme({ tooltip: { bg: '#000000' } }, RareCharts.darkTheme);</code></pre>

Spreading it instead — `{ ...RareCharts.darkTheme, tooltip: { bg: '#000000' } }` — merges the tooltip onto the light defaults: black text on a black tooltip.

## Applying theme to multiple charts

Create the theme once and reuse it:

<pre class="text-content-caption"><code>const theme = RareCharts.createTheme({ accent: '#ff6200' });

new RareCharts.Line('#chart-a', { theme }).setData(dataA);
new RareCharts.Bar('#chart-b',  { theme }).setData(dataB);
new RareCharts.Donut('#chart-c', { theme }).setData(dataC);</code></pre>

All three charts will use the same colors, fonts, and tooltip styling. Consistency without repetition.

## Partial overrides

You don't have to use `createTheme` for minor tweaks. Passing a partial object directly to the `theme` option works the same way — it merges with the default theme automatically:

<pre class="text-content-caption"><code><span class="code-comment">// Just change the grid color</span>
new RareCharts.Line('#chart', {
  theme: { grid: '#f0f0f0' },
}).setData(data);</code></pre>

## Theme token reference

### Colors

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>bg</code></td>
            <td><code>var(--bg-color, #ffffff)</code></td>
            <td><code>#0a0a0a</code></td>
            <td>Page background under Rare Styles, white otherwise. Plates behind last-value and annotation labels, label backdrops and halos (the tooltip background is <code>tooltip.bg</code>)</td>
        </tr>
        <tr>
            <td><code>surface</code></td>
            <td><code>#f5f5f5</code></td>
            <td><code>#141414</code></td>
            <td>Graph node fills, flow lane bands</td>
        </tr>
        <tr>
            <td><code>grid</code></td>
            <td><code>#e8e8e8</code></td>
            <td><code>#666666</code></td>
            <td>Horizontal grid lines</td>
        </tr>
        <tr>
            <td><code>border</code></td>
            <td><code>#cccccc</code></td>
            <td><code>#888888</code></td>
            <td>Axis lines, zero baseline</td>
        </tr>
        <tr>
            <td><code>crosshair</code></td>
            <td><code>#aaaaaa</code></td>
            <td><code>#3a3a3a</code></td>
            <td>Hover tracker line</td>
        </tr>
        <tr>
            <td><code>text</code></td>
            <td><code>#000000</code></td>
            <td><code>#e8e8e8</code></td>
            <td>Primary labels, node labels, navigator strip tint and window</td>
        </tr>
        <tr>
            <td><code>muted</code></td>
            <td><code>#666666</code></td>
            <td><code>#888888</code></td>
            <td>Axis tick labels, secondary text, fallback link color</td>
        </tr>
        <tr>
            <td><code>positive</code></td>
            <td><code>#389e0d</code></td>
            <td><code>#389e0d</code></td>
            <td>Not read by any chart — a named color for your own code (a <code>tooltipFormat</code>, a page header)</td>
        </tr>
        <tr>
            <td><code>negative</code></td>
            <td><code>#ff0000</code></td>
            <td><code>#ff0000</code></td>
            <td>Not read by any chart — a named color for your own code</td>
        </tr>
        <tr>
            <td><code>accent</code></td>
            <td><code>#00aaff</code></td>
            <td><code>#ff6200</code></td>
            <td>Single-series default, highlights</td>
        </tr>
        <tr>
            <td><code>colors</code></td>
            <td>6-color array</td>
            <td>same</td>
            <td>Multi-series palette, node group colors</td>
        </tr>
    </tbody>
</table>
</div>

### Typography

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>Default</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>font</code></td>
            <td><code>var(--rc-font-family, "Fira Sans", system-ui, …, sans-serif)</code></td>
            <td>Tooltip font when <code>numericFont</code> is unset</td>
        </tr>
        <tr>
            <td><code>fontSize</code></td>
            <td><code>var(--rc-font-size-sm, 14px)</code></td>
            <td>Not used — the tooltip size is CSS. Removal at 1.0</td>
        </tr>
        <tr>
            <td><code>numericFont</code></td>
            <td><code>var(--rc-font-family-numeric, "Cousine", ui-monospace, …, monospace)</code></td>
            <td>Tooltip font family</td>
        </tr>
    </tbody>
</table>
</div>

The chart CSS also defines the following container-level variables:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>CSS Variable</th>
            <th>Default</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>--rc-font-family</code></td>
            <td><code>"Fira Sans", system-ui, …, sans-serif</code></td>
            <td>Chart font: title, legend, source, note, buttons, SVG text</td>
        </tr>
        <tr>
            <td><code>--rc-font-family-numeric</code></td>
            <td><code>"Cousine", ui-monospace, …, monospace</code></td>
            <td>Numeric font for values and axes</td>
        </tr>
        <tr>
            <td><code>--rc-font-size</code></td>
            <td><code>16px</code></td>
            <td>Chart title</td>
        </tr>
        <tr>
            <td><code>--rc-font-size-sm</code></td>
            <td><code>14px</code></td>
            <td>SVG text, subtitle, legend, source, note, buttons</td>
        </tr>
        <tr>
            <td><code>--rc-space-xs</code></td>
            <td><code>4px</code></td>
            <td>Header row gap, timeframe button gap and radius</td>
        </tr>
        <tr>
            <td><code>--rc-space-sm</code></td>
            <td><code>8px</code></td>
            <td>Legend dots, tooltip and button padding, source margin</td>
        </tr>
        <tr>
            <td><code>--rc-space-md</code></td>
            <td><code>16px</code></td>
            <td>Header and legend column gap, tooltip and button padding</td>
        </tr>
        <tr>
            <td><code>--rc-space-lg</code></td>
            <td><code>32px</code></td>
            <td><code>MultiChart</code> grid gap, right-hand legend offset</td>
        </tr>
        <tr>
            <td><code>--rc-scale-btn-fill</code></td>
            <td><code>#ccc</code></td>
            <td>Half fill of the Lin/Log button</td>
        </tr>
    </tbody>
</table>
</div>

These are RareCharts variables, not host-site variables: a host's spacing scale or page font does not change a chart. If you want a different type system, override them as above. Of the theme's fonts, only `numericFont` (or `font` when it is unset) is read — the tooltip font family; the chart text follows the variables.

### Sizing

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>Default</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>strokeWidth</code></td>
            <td><code>2</code></td>
            <td>Line width of Line, DualAxes and Time Series lines</td>
        </tr>
        <tr>
            <td><code>dotRadius</code></td>
            <td><code>3</code></td>
            <td>Radius of the crosshair dots (Line, DualAxes)</td>
        </tr>
        <tr>
            <td><code>markerSize</code></td>
            <td><code>4</code></td>
            <td>Per-point markers (Line, DualAxes)</td>
        </tr>
        <tr>
            <td><code>barOpacity</code></td>
            <td><code>0.35</code></td>
            <td>DualAxes bar fill opacity; <code>Bar</code> draws opaque bars</td>
        </tr>
    </tbody>
</table>
</div>

The tokens are fallbacks: an option wins when it is set — a series' `strokeWidth`, `markerSize` on the chart or a series, DualAxes' `barOpacity`. The Time Series line has no width option; set the token.

### Map

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>map.matchFill</code></td>
            <td><code>#00aaff</code></td>
            <td><code>#ff6200</code></td>
            <td>Regions with data and no <code>color</code> of their own (the <code>matchFill</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.unmatchedFill</code></td>
            <td><code>#e8e8e8</code></td>
            <td><code>#1e1e2e</code></td>
            <td>Regions without data (the <code>defaultFill</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.border</code></td>
            <td><code>#ffffff</code></td>
            <td><code>#444455</code></td>
            <td>Region borders (the <code>borderColor</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.ocean</code></td>
            <td><code>transparent</code></td>
            <td><code>transparent</code></td>
            <td>Background behind the land (the <code>oceanColor</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.hoverBrighten</code></td>
            <td><code>1.3</code></td>
            <td><code>1.2</code></td>
            <td>Hover on a region with data: its fill moves (factor − 1) of the way towards white; a very light fill darkens a little instead (the <code>hoverFill</code> option wins; <code>1</code> turns it off)</td>
        </tr>
        <tr>
            <td><code>map.graticule</code></td>
            <td><code>rgba(0,0,0,0.08)</code></td>
            <td><code>rgba(255,255,255,0.06)</code></td>
            <td>The 10° grid drawn with the <code>graticule</code> option</td>
        </tr>
    </tbody>
</table>
</div>

`createTheme` merges `map` deeply, so `createTheme({ map: { matchFill: '#ff6200' } })` recolors every map; changing `accent` alone does not.

### Tooltip

The `tooltip` sub-object colors every built-in tooltip, independently from the main chart:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>tooltip.bg</code></td>
            <td><code>#ffffff</code></td>
            <td><code>#1a1a1a</code></td>
            <td>Background</td>
        </tr>
        <tr>
            <td><code>tooltip.border</code></td>
            <td><code>#e0e0e0</code></td>
            <td><code>#2e2e2e</code></td>
            <td>1px border</td>
        </tr>
        <tr>
            <td><code>tooltip.text</code></td>
            <td><code>#000000</code></td>
            <td><code>#e8e8e8</code></td>
            <td>Values, names, titles, links</td>
        </tr>
        <tr>
            <td><code>tooltip.muted</code></td>
            <td><code>#666666</code></td>
            <td><code>#888888</code></td>
            <td>Dates, percentages, counts — every secondary row</td>
        </tr>
        <tr>
            <td><code>tooltip.shadow</code></td>
            <td><code>0 2px 8px rgba(0,0,0,0.10)</code></td>
            <td><code>0 2px 12px rgba(0,0,0,0.55)</code></td>
            <td>Box shadow</td>
        </tr>
        <tr>
            <td><code>tooltip.header.text</code></td>
            <td><code>null</code></td>
            <td><code>null</code></td>
            <td>Color of the header — the row naming what is hovered</td>
        </tr>
        <tr>
            <td><code>tooltip.header.bg</code></td>
            <td><code>null</code></td>
            <td><code>null</code></td>
            <td>A band behind the header, across the top of the tooltip</td>
        </tr>
    </tbody>
</table>
</div>

The header is the date in Line, DualAxes and TimeSeries, the label in Bar, HierarchicalBar and Donut, the title in Map, MapFlow, Sankey and Graph. With `header.text` left `null` each keeps its role: a date is muted, a title bold in `tooltip.text`. A data color — a Donut slice label — wins over `header.text`.

A dark tooltip on a light chart sets the secondary color too:

<pre class="text-content-caption"><code>theme: {
  tooltip: { bg: '#1a1a1a', border: '#333333', text: '#e8e8e8', muted: '#888888' },
}</code></pre>

The theme reaches the tooltip as custom properties set on its element: `--rc-tooltip-font`, `--rc-tooltip-text`, `--rc-tooltip-muted`, `--rc-tooltip-bg`, `--rc-tooltip-border`, `--rc-tooltip-shadow`, `--rc-tooltip-header-text` and `--rc-tooltip-header-bg`.

The size (13px), weights and spacing of the tooltip are CSS; a visible tooltip (`.is-visible`) is drawn at 90% opacity. Its rows carry classes — `.rc-tooltip-header`, `.rc-tooltip-title`, `.rc-tooltip-muted`, `.rc-tooltip-sub`, `.rc-tooltip-small`, `.rc-tooltip-kind`, `.rc-tooltip-value`, `.rc-tooltip-section`, and `.rc-tooltip-body` for the text of relation tooltips — and a page rule that outranks the library's `.rc-tooltip` restyles any of it, colors included: `.rc-chart .rc-tooltip { font-size: 14px; }`. A plain `.rc-tooltip { … }` loses the tie, as with `.rc-chart` above.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-revenue-black-theme.js"></script>
