---
layout: page.njk
title: "Styles"
section: "Charts"
displaySidebar: true
permalink: '/charts/styles/'
---

RareCharts uses a two-layer styling system. Structure, layout and typography live in CSS. Colors, the tooltip fonts and a few sizing defaults live in a JavaScript theme object. They work independently, which means you can swap a theme without touching CSS, and you can override layout without touching the theme.

## Layer 1: CSS structure

`rare-charts.js` automatically injects a small stylesheet into `<head>` when the library loads (a page under a strict Content Security Policy loads it as a file instead — see [Installation](/charts/installation/)). It handles:

- The `.rc-chart` flex container (header with the title, subtitle, legend and range buttons → SVG → navigator → your controls → source and note, in that order)
- Legend layout (horizontal row, or vertical aside when `legendPosition: 'right'`)
- The header layout by the card's width: `.rc-chart` is a size container (`container: rc-chart / inline-size`), and on a card 460 px wide or narrower the buttons move under the subtitle, whatever the window's width. The card takes its width from its parent — a block, a grid cell, a stretched flex item; in a box that shrinks to fit its content (an inline-block, an item of a flex row) give it a width, or it collapses
- Tooltips: position and fade, size, weights and spacing of their rows
- SVG axis label styles, end labels, markers
- Spacing, the chart font, and the timeframe buttons — a page's `button:hover` background does not reach them, and the Log toggle keeps its fill on hover

RareCharts ships with its own typography and spacing defaults. The base stylesheet defines:

- `--rc-font-family`: the page's `--chart-font-family`, else `"Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- `--rc-font-family-numeric`: the page's `--chart-font-family-numeric`, else `"Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
- `--rc-font-size: 16px`
- `--rc-font-size-sm: 14px`
- `--rc-space-xs`, `--rc-space-sm`, `--rc-space-md`, `--rc-space-lg`: `4px`, `8px`, `16px`, `32px`

These variables live on `.rc-chart`, so the charts keep a consistent visual language even when embedded on a third-party site with a completely different type system. The chart sets `font-family` once, on `.rc-chart`; everything inside inherits it. To change a variable, use a selector that outranks the library's `.rc-chart` rule — the library appends its stylesheet to `<head>` when it loads, after any stylesheet already there, so a plain `.rc-chart { … }` on the page loses the tie: `:root .rc-chart { --rc-font-family: Georgia, serif; }`, or the chart's id.

The library loads no fonts. Fira Sans and Cousine are used when the page provides them — Rare Styles self-hosts both — and system fonts otherwise. [Installation](/charts/installation/) has a `<link>` that loads them on any page.

**Colors are tokens.** A chart has two kinds of color:

- **Role colors** — the background behind labels, text, axis labels, axes, grid, crosshair, the range buttons, the focus ring, the tooltip, a map's empty regions and borders — are CSS variables, `--rc-*`, declared on `.rc-chart`. The SVG refers to them (`fill="var(--rc-muted, #666666)"`) and the HTML reads them through CSS rules, so a chart follows its card, a page theme switch and print without a redraw.
- **Data colors** — the accent, the series palette and every color you pass — are plain colors, read when the chart is built, at each `setData` and at each render. Formatters get them as `#rrggbb`, never as `var()`; a color you passed by name, such as `'steelblue'`, arrives as written.

### Where colors come from

Each color resolves in this order, highest first:

1. a color the chart's own `theme` sets — `darkTheme`, `createTheme(…)`, any value other than the default. The chart writes it on its element as `--rc-*`, so it wins over the page;
2. the page's chart tokens, `--chart-*`. Rare Styles `v0.7.2` sets them on the page, on `.card` and on `.card-inverted`;
3. older page tokens, only where earlier versions read them: `--bg-color` for the background; `--text-color-light`, `--border-color`, `--primary-color`, `--primary-text-color` and `--white` for the range buttons;
4. the library's own value.

So a chart in a Rare Styles `v0.7.2` `.card-inverted` reads light on the dark card, and a page without Rare Styles, or with `v0.7.1`, gets the library's values. The token behind each color is in the [reference](#theme-token-reference) below. A page that changes `--chart-series-*` while a chart is on screen sees the new colors at the next `setData` or resize.

`darkTheme` sets colors of its own, so the page's tokens do not change it, but it does not paint the card: put the chart on a dark container. For a chart on a background of your own, restate the tokens there — [On a host's background](/styles/colors/chart-tokens/#host-surface) in Rare Styles shows how.

## Layer 2: JS theme

The theme is a plain object that every chart reads at render time. In the default theme each color reads the page's chart token first and ends in the library's value:

<pre><code>const defaultTheme = {

  <span class="code-comment">// ── Backgrounds ────────────────────────────────────────────────────────────</span>
  bg:      'var(--chart-bg, var(--bg-color, #ffffff))',  <span class="code-comment">// plates and halos behind labels</span>
  surface: null,          <span class="code-comment">// Graph node fills, flow lane bands: the background with 4% of the text</span>

  <span class="code-comment">// ── Structure ──────────────────────────────────────────────────────────────</span>
  grid:      'var(--chart-grid-color, #e4e4e4)',   <span class="code-comment">// horizontal grid lines, the Gauge track</span>
  border:    'var(--chart-axis-color, #cccccc)',   <span class="code-comment">// axis lines, zero baseline</span>
  crosshair: '#aaaaaa',   <span class="code-comment">// vertical hover line — subtler than border</span>

  <span class="code-comment">// ── Text ───────────────────────────────────────────────────────────────────</span>
  text:  'var(--chart-text-color, #000000)',    <span class="code-comment">// primary labels, the header and footer</span>
  muted: 'var(--chart-label-color, #666666)',   <span class="code-comment">// axis tick labels, secondary text</span>

  <span class="code-comment">// ── Accent and series palette ──────────────────────────────────────────────</span>
  accent: 'var(--chart-series-1, #1677ff)',     <span class="code-comment">// highlights, single-series default</span>
  colors: [
    'var(--chart-series-1, #1677ff)',  <span class="code-comment">// blue (the accent)</span>
    'var(--chart-series-2, #fa8c16)',  <span class="code-comment">// orange</span>
    'var(--chart-series-3, #00c97a)',  <span class="code-comment">// green</span>
    'var(--chart-series-4, #ffcc00)',  <span class="code-comment">// yellow</span>
    'var(--chart-series-5, #cc44ff)',  <span class="code-comment">// violet</span>
    'var(--chart-series-6, #ff0000)',  <span class="code-comment">// red</span>
  ],

  <span class="code-comment">// ── Typography: the tooltip's words and figures ───────────────────────────</span>
  font:        'var(--rc-font-family, "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
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
    matchFill:     null,  <span class="code-comment">// regions with data take the accent</span>
    unmatchedFill: 'var(--chart-grid-color, #e8e8e8)',
    ocean:         'transparent',
    border:        'var(--chart-bg, #ffffff)',
    hoverBrighten: 1.3,   <span class="code-comment">// hover: 30% towards white</span>
    graticule:     null,  <span class="code-comment">// the text at 8%</span>
  },

  <span class="code-comment">// ── Tooltip ────────────────────────────────────────────────────────────────</span>
  tooltip: {
    bg:     'var(--chart-tooltip-bg, #ffffff)',
    border: 'var(--chart-tooltip-border, #e4e4e4)',
    text:   'var(--chart-tooltip-text, #000000)',
    muted:  'var(--chart-tooltip-muted, #666666)',
    shadow: 'var(--chart-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))',
    header: { text: null, bg: null },
  },
};</code></pre>

A color you set in a theme is a plain color, `'#e63946'`; a key left at its default follows the page. `defaultTheme.colors[0]` passed as a series color is the chain too: the chart draws it as the page's series color. Read the colors a chart drew from its formatter arguments, not from `defaultTheme`.

## Built-in themes

Two themes ship with the library.

`RareCharts.defaultTheme` — the page's chart tokens where it has them; otherwise light: clean grays, a blue accent and the palette above. Works anywhere.

`RareCharts.darkTheme` — dark plates and labels for a dark card: deep blacks, muted grids, an orange accent (`#ff6200`) for a single series and map regions. It keeps the default palette for several series. It does not paint the card — the demo below sits on a black panel.

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
  numericFont: '"JetBrains Mono", monospace',   <span class="code-comment">// the tooltip's figures</span>
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

<pre class="text-content-caption"><code>const theme = RareCharts.createTheme({ accent: '#fa8c16' });

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

The theme's colors, the CSS variable each one reaches, and the page token it reads when the theme leaves it at its default:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>CSS variable</th>
            <th>Page token</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>bg</code></td>
            <td><code>--rc-bg</code></td>
            <td><code>--chart-bg</code>, then <code>--bg-color</code></td>
            <td><code>#ffffff</code></td>
            <td><code>#0a0a0a</code></td>
            <td>Plates behind last-value and annotation labels, label backdrops and halos, the Graph tool buttons and full screen (the tooltip background is <code>tooltip.bg</code>)</td>
        </tr>
        <tr>
            <td><code>surface</code></td>
            <td><code>--rc-surface</code></td>
            <td>mixed from <code>--chart-bg</code> and <code>--chart-text-color</code></td>
            <td><code>null</code>: the background with 4% of the text, <code>#f5f5f5</code> on white</td>
            <td><code>#141414</code></td>
            <td>Graph node fills, flow lane bands</td>
        </tr>
        <tr>
            <td><code>grid</code></td>
            <td><code>--rc-grid</code></td>
            <td><code>--chart-grid-color</code></td>
            <td><code>#e4e4e4</code></td>
            <td><code>#666666</code></td>
            <td>Horizontal grid lines, the Gauge track</td>
        </tr>
        <tr>
            <td><code>border</code></td>
            <td><code>--rc-border</code></td>
            <td><code>--chart-axis-color</code></td>
            <td><code>#cccccc</code></td>
            <td><code>#888888</code></td>
            <td>Axis lines, zero baseline</td>
        </tr>
        <tr>
            <td><code>crosshair</code></td>
            <td><code>--rc-crosshair</code></td>
            <td>—</td>
            <td><code>#aaaaaa</code></td>
            <td><code>#3a3a3a</code></td>
            <td>Hover tracker line</td>
        </tr>
        <tr>
            <td><code>text</code></td>
            <td><code>--rc-text</code></td>
            <td><code>--chart-text-color</code></td>
            <td><code>#000000</code></td>
            <td><code>#e8e8e8</code></td>
            <td>Title, subtitle, legend and source; primary labels, node labels; navigator strip tint and window</td>
        </tr>
        <tr>
            <td><code>muted</code></td>
            <td><code>--rc-muted</code></td>
            <td><code>--chart-label-color</code></td>
            <td><code>#666666</code></td>
            <td><code>#888888</code></td>
            <td>Axis tick labels, the note, secondary text, fallback link color</td>
        </tr>
        <tr>
            <td><code>accent</code></td>
            <td><code>--rc-accent</code></td>
            <td><code>--chart-series-1</code></td>
            <td><code>#1677ff</code></td>
            <td><code>#ff6200</code></td>
            <td>Single-series default, highlights, map regions with data, the Log toggle when on</td>
        </tr>
        <tr>
            <td><code>colors</code></td>
            <td>—</td>
            <td><code>--chart-series-1</code> … <code>--chart-series-6</code></td>
            <td><code>#1677ff</code>, <code>#fa8c16</code>, <code>#00c97a</code>, <code>#ffcc00</code>, <code>#cc44ff</code>, <code>#ff0000</code></td>
            <td>same</td>
            <td>Multi-series palette, node group colors</td>
        </tr>
    </tbody>
</table>
</div>

The range buttons and focus rings have CSS variables only. A theme with a background of its own (`darkTheme`) sets the buttons from its colors: labels in `muted`, borders in `border`, the pressed button in `text` on `bg`.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>CSS variable</th>
            <th>Page token</th>
            <th>Default</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>--rc-control-text</code></td>
            <td><code>--chart-control-text</code>, then <code>--text-color-light</code></td>
            <td><code>#666666</code></td>
            <td>Range button labels</td>
        </tr>
        <tr>
            <td><code>--rc-control-border</code></td>
            <td><code>--chart-control-border</code>, then <code>--border-color</code></td>
            <td><code>#cccccc</code></td>
            <td>Range button and Graph tool borders</td>
        </tr>
        <tr>
            <td><code>--rc-control-hover-border</code></td>
            <td><code>--chart-control-hover-border</code>, then <code>--primary-color</code></td>
            <td><code>#000000</code></td>
            <td>The border of a hovered or pressed range button</td>
        </tr>
        <tr>
            <td><code>--rc-control-active-text</code></td>
            <td><code>--chart-control-active-text</code>, then <code>--primary-text-color</code></td>
            <td><code>#000000</code></td>
            <td>The label of a hovered or pressed range button</td>
        </tr>
        <tr>
            <td><code>--rc-control-active-bg</code></td>
            <td><code>--chart-control-active-bg</code>, then <code>--white</code></td>
            <td><code>#ffffff</code></td>
            <td>The background of the pressed range button</td>
        </tr>
        <tr>
            <td><code>--rc-focus-ring</code></td>
            <td><code>--chart-focus-ring</code></td>
            <td><code>currentColor</code></td>
            <td>Keyboard focus rings: legend items, the Graph breadcrumbs and "+N more" list, Graph, Sankey and flow nodes, flow and MapFlow ties</td>
        </tr>
    </tbody>
</table>
</div>

On Rare Styles `v0.7.2` the focus rings are blue, its `--focus-ring-color`; elsewhere they take the text color.

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
            <td>The tooltip's words: names, labels, titles</td>
        </tr>
        <tr>
            <td><code>numericFont</code></td>
            <td><code>var(--rc-font-family-numeric, "Cousine", ui-monospace, …, monospace)</code></td>
            <td>The tooltip's figures: values, percentages, counts (<code>.rc-num</code>)</td>
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
            <td><code>--chart-font-family</code>, then <code>"Fira Sans", system-ui, …, sans-serif</code></td>
            <td>Chart font: title, legend, source, note, buttons, SVG text, the tooltip</td>
        </tr>
        <tr>
            <td><code>--rc-font-family-numeric</code></td>
            <td><code>--chart-font-family-numeric</code>, then <code>"Cousine", ui-monospace, …, monospace</code></td>
            <td>Values and axes, the navigator's time labels (10px), the tooltip's figures</td>
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
    </tbody>
</table>
</div>

Line heights are the chart's own on any page: 24px for the title, the tooltip rows and the controls, 1.3 for the source.

These are RareCharts variables, not host-site variables: a host's spacing scale does not change a chart. The fonts read the page's `--chart-font-family` and `--chart-font-family-numeric` first — Rare Styles `v0.7.2` sets them — then fall back to Fira Sans and Cousine. If you want a different type system, override the variables as above. Of the theme's fonts, `font` sets the tooltip's words and `numericFont` its figures; the chart text follows the variables.

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
            <th>CSS variable</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>map.matchFill</code></td>
            <td>—</td>
            <td><code>null</code>: the accent, <code>#1677ff</code></td>
            <td><code>null</code>: the accent, <code>#ff6200</code></td>
            <td>Regions with data and no <code>color</code> of their own (the <code>matchFill</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.unmatchedFill</code></td>
            <td><code>--rc-map-unmatched-fill</code></td>
            <td><code>var(--chart-grid-color, #e8e8e8)</code></td>
            <td><code>#1e1e2e</code></td>
            <td>Regions without data (the <code>defaultFill</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.border</code></td>
            <td><code>--rc-map-border</code></td>
            <td><code>var(--chart-bg, #ffffff)</code></td>
            <td><code>#444455</code></td>
            <td>Region borders (the <code>borderColor</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.ocean</code></td>
            <td>—</td>
            <td><code>transparent</code></td>
            <td><code>transparent</code></td>
            <td>Background behind the land (the <code>oceanColor</code> option wins)</td>
        </tr>
        <tr>
            <td><code>map.hoverBrighten</code></td>
            <td>—</td>
            <td><code>1.3</code></td>
            <td><code>1.2</code></td>
            <td>Hover on a region with data: its fill moves (factor − 1) of the way towards white; a very light fill darkens a little instead (the <code>hoverFill</code> option wins; <code>1</code> turns it off)</td>
        </tr>
        <tr>
            <td><code>map.graticule</code></td>
            <td><code>--rc-map-graticule</code></td>
            <td><code>null</code>: the text at 8%, <code>rgba(0,0,0,0.08)</code> on black</td>
            <td><code>rgba(255,255,255,0.06)</code></td>
            <td>The 10° grid drawn with the <code>graticule</code> option</td>
        </tr>
    </tbody>
</table>
</div>

`createTheme` merges `map` deeply, so `createTheme({ map: { matchFill: '#fa8c16' } })` recolors every map. With `matchFill` left `null`, changing `accent` recolors maps too.

### Tooltip

The `tooltip` sub-object colors every built-in tooltip, independently from the main chart. By default the tooltip is a light popover, on a dark card too:

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Token</th>
            <th>CSS variable</th>
            <th>Default</th>
            <th>Dark</th>
            <th>Used for</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>tooltip.bg</code></td>
            <td><code>--rc-tooltip-bg</code></td>
            <td><code>var(--chart-tooltip-bg, #ffffff)</code></td>
            <td><code>#1a1a1a</code></td>
            <td>Background</td>
        </tr>
        <tr>
            <td><code>tooltip.border</code></td>
            <td><code>--rc-tooltip-border</code></td>
            <td><code>var(--chart-tooltip-border, #e4e4e4)</code></td>
            <td><code>#2e2e2e</code></td>
            <td>1px border</td>
        </tr>
        <tr>
            <td><code>tooltip.text</code></td>
            <td><code>--rc-tooltip-text</code></td>
            <td><code>var(--chart-tooltip-text, #000000)</code></td>
            <td><code>#e8e8e8</code></td>
            <td>Names, values, titles, links</td>
        </tr>
        <tr>
            <td><code>tooltip.muted</code></td>
            <td><code>--rc-tooltip-muted</code></td>
            <td><code>var(--chart-tooltip-muted, #666666)</code></td>
            <td><code>#888888</code></td>
            <td>The date on top, notes, percentages, counts — every secondary line</td>
        </tr>
        <tr>
            <td><code>tooltip.shadow</code></td>
            <td><code>--rc-tooltip-shadow</code></td>
            <td><code>var(--chart-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))</code></td>
            <td><code>0 2px 12px rgba(0,0,0,0.55)</code></td>
            <td>Box shadow</td>
        </tr>
        <tr>
            <td><code>tooltip.header.text</code></td>
            <td><code>--rc-tooltip-header-text</code></td>
            <td><code>null</code></td>
            <td><code>null</code></td>
            <td>Color of the header — the line naming what is hovered</td>
        </tr>
        <tr>
            <td><code>tooltip.header.bg</code></td>
            <td><code>--rc-tooltip-header-bg</code></td>
            <td><code>null</code></td>
            <td><code>null</code></td>
            <td>A band behind the header, across the top of the tooltip</td>
        </tr>
    </tbody>
</table>
</div>

The header is the date on top in Line, DualAxes, TimeSeries and a dated Bar, the category in a stacked Bar, and the bold title in Map (a region without a value), MapFlow, Sankey and Graph; Bar, HierarchicalBar, Donut, Pie and Gauge show rows only. With `header.text` left `null` each keeps its role: a date is muted, a title bold in `tooltip.text`.

A dark tooltip on a light chart sets the secondary color too:

<pre class="text-content-caption"><code>theme: {
  tooltip: { bg: '#1a1a1a', border: '#333333', text: '#e8e8e8', muted: '#888888' },
}</code></pre>

The tooltip inherits these variables from the chart's element: a theme writes its own values there, and without them the tooltip reads the page's `--chart-tooltip-*`. A theme's fonts arrive the same way, as `--rc-tooltip-font` (words) and `--rc-tooltip-font-numeric` (figures).

The tooltip text is 14px on a 24px line, the date on top and the notes 13px; a visible tooltip (`.is-visible`) is opaque. Its rows carry classes — `.rc-tooltip-header`, `.rc-tooltip-row`, `.rc-tooltip-swatch`, `.rc-tooltip-label`, `.rc-tooltip-value`, `.rc-tooltip-note`, `.rc-num` and the others listed under [Custom tooltip](/charts/settings/#custom-tooltip), and `.rc-tooltip-kind`, `.rc-tooltip-section`, `.rc-tooltip-small` and `.rc-tooltip-body` in the relation tooltips. A page rule that outranks the library's `.rc-tooltip` restyles any of it, colors included: `.rc-chart .rc-tooltip { border-radius: 4px; }`. A plain `.rc-tooltip { … }` loses the tie, as with `.rc-chart` above.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-revenue-black-theme.js"></script>
