---
layout: page.njk
title: "Styles"
section: "Charts"
displaySidebar: true
permalink: '/charts/styles/'
---

RareCharts uses a two-layer styling system. Structure and layout live in CSS. Colors, fonts, and visual tokens live in a JavaScript theme object. They work independently, which means you can swap a theme without touching CSS, and you can override layout without touching the theme.

## Layer 1: CSS structure

`rare-charts.js` automatically injects a small stylesheet into `<head>` when the library loads. It handles:

- The `.rc-chart` flex container (title → legend → SVG → source, in that order)
- Legend layout (horizontal row, or vertical aside when `legendPosition: 'right'`)
- Tooltip positioning and fade transition
- SVG axis label styles, end labels, markers

**Colors are not in CSS.** This is intentional. Every color — grid lines, axis text, tooltips, series fills — is set inline by the chart from the active theme. That makes theming predictable: change the theme object, everything follows. No hunting for overridden CSS variables.

RareCharts ships with its own typography defaults. The base stylesheet defines:

- `--rc-font-family: "Fira Sans", sans-serif`
- `--rc-font-family-numeric: "Cousine", monospace`
- `--rc-font-size: 16px`
- `--rc-font-size-sm: 15px`

These variables live on `.rc-chart`, so the charts keep a consistent visual language even when embedded on a third-party site with a completely different type system.

## Layer 2: JS theme

The theme is a plain object that every chart reads at render time. The default theme looks like this:

<pre><code>const defaultTheme = {

  <span class="code-comment">// ── Backgrounds ────────────────────────────────────────────────────────────</span>
  bg:      'var(--bg-color)',
  surface: '#f5f5f5',     <span class="code-comment">// tooltip bg, panel fills</span>

  <span class="code-comment">// ── Structure ──────────────────────────────────────────────────────────────</span>
  grid:      '#e8e8e8',   <span class="code-comment">// horizontal grid lines</span>
  border:    '#cccccc',   <span class="code-comment">// axis lines, zero baseline</span>
  crosshair: '#aaaaaa',   <span class="code-comment">// vertical hover line — intentionally subtler than border</span>

  /<span class="code-comment">/ ── Text ───────────────────────────────────────────────────────────────────</span>
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
  font:        'var(--rc-font-family, "Fira Sans", sans-serif)',
  fontSize:    'var(--rc-font-size-sm, 15px)',

  <span class="code-comment">// Separate monospace font for numbers on axes and in tooltips.
  // Falls back through a chain of common tabular fonts.
  </span>
  numericFont: 'var(--rc-font-family-numeric, "Cousine", monospace)',

  <span class="code-comment">// ── Sizing defaults ────────────────────────────────────────────────────────
  // Charts use these as fallbacks when options are not passed explicitly.
  </span>
  strokeWidth: 2,
  dotRadius:   3,         <span class="code-comment">// crosshair dot radius</span>
  markerSize:  4,         <span class="code-comment">// per-point marker size</span>
  barOpacity:  0.35,

  <span class="code-comment">// ── Tooltip ────────────────────────────────────────────────────────────────</span>
  tooltip: {
    bg:     '#ffffff',
    border: '#e0e0e0',
    text:   '#000000',
    muted:  '#888888',
    shadow: '0 2px 8px rgba(0,0,0,0.10)',
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

<div class="text-content-caption card-dashboard-bordered black-bg">
    <div id="line-chart-demo-revenue"></div>
</div>

## Creating a custom theme

`RareCharts.createTheme(overrides)` merges your overrides with the default and returns a complete theme object. You only need to specify what you want to change:

<pre class="text-content-caption"><code>const brandTheme = RareCharts.createTheme({
  accent:  '#e63946',
  colors:  ['#e63946', '#457b9d', '#a8dadc', '#1d3557'],
  font:    '"Inter", sans-serif',
  numericFont: '"JetBrains Mono", monospace',
  tooltip: {
    bg:     '#1d3557',
    border: '#457b9d',
    text:   '#f1faee',
  },
});

new RareCharts.Bar('#chart', {
  theme: brandTheme,
}).setData(data);</code></pre>

`createTheme` does a shallow merge for top-level keys and a deep merge for `tooltip`, so you can override individual tooltip properties without losing the rest.

## Applying theme to multiple charts

Create the theme once and reuse it:

<pre class="text-content-caption"><code>const theme = RareCharts.createTheme({ accent: '#ff6200' });

new RareCharts.Line('#chart-a', { theme }).setData(dataA);
new RareCharts.Bar('#chart-b',  { theme }).setData(dataB);
new RareCharts.Donut('#chart-c', { theme }).setData(dataC);</code></pre>

All three charts will use the same colors, fonts, and tooltip styling. Consistency without repetition.

## Partial overrides

You don't have to use `createTheme` for minor tweaks. Passing a partial object directly to the `theme` option works the same way — it merges automatically:

<pre class="text-content-caption"><code><span class="code-comment">// Just change the grid color</span>
new RareCharts.Line('#chart', {
  theme: { grid: '#f0f0f0' },
}).setData(data);</code></pre>

## Theme token reference

### Colors

| Token | Default | Used for |
|-------|---------|----------|
| `bg` | `#ffffff` | Node label backdrops, tooltip backgrounds |
| `surface` | `#f5f5f5` | Tooltip panels, secondary fills |
| `grid` | `#e8e8e8` | Horizontal grid lines |
| `border` | `#cccccc` | Axis lines, zero baseline |
| `crosshair` | `#aaaaaa` | Hover tracker line |
| `text` | `#000000` | Primary labels, node labels |
| `muted` | `#666666` | Axis tick labels, secondary text, fallback link color |
| `positive` | `#389e0d` | Gains, up deltas |
| `negative` | `#ff0000` | Losses, down deltas |
| `accent` | `#00aaff` | Single-series default, highlights |
| `colors` | 6-color array | Multi-series palette, node group colors |

### Typography

| Token | Default | Used for |
|-------|---------|----------|
| `font` | `var(--rc-font-family, "Fira Sans", sans-serif)` | Titles, legends, labels |
| `fontSize` | `var(--rc-font-size-sm, 15px)` | Theme-controlled text size inside SVG and tooltips |
| `numericFont` | `var(--rc-font-family-numeric, "Cousine", monospace)` | Axis numbers, tooltips, end labels |

The chart CSS also defines the following container-level variables:

| CSS Variable | Default | Used for |
|-------|---------|----------|
| `--rc-font-family` | `"Fira Sans", sans-serif` | Base font for chart UI and SVG |
| `--rc-font-family-numeric` | `"Cousine", monospace` | Numeric font for values and axes |
| `--rc-font-size` | `16px` | Base size for SVG text |
| `--rc-font-size-sm` | `15px` | Secondary UI text, buttons, captions |

These are RareCharts variables, not host-site variables. If you want a different type system, override them explicitly or pass `font`, `numericFont`, and `fontSize` through `theme`.

### Sizing

| Token | Default | Used for |
|-------|---------|----------|
| `strokeWidth` | `2` | Line chart stroke width |
| `dotRadius` | `3` | Crosshair hit dots |
| `markerSize` | `4` | Per-point markers |
| `barOpacity` | `0.35` | Bar fill opacity |

Individual chart options (`strokeWidth`, `markerSize`) override theme tokens when specified.

### Tooltip

The `tooltip` sub-object controls tooltip appearance independently from the main chart:

| Token | Default |
|-------|---------|
| `tooltip.bg` | `#ffffff` |
| `tooltip.border` | `#e0e0e0` |
| `tooltip.text` | `#000000` |
| `tooltip.muted` | `#888888` |
| `tooltip.shadow` | `0 2px 8px rgba(0,0,0,0.10)` |

This separation is useful when you want, say, a dark tooltip on a light chart — just override `tooltip.bg` and `tooltip.text` without touching the main colors.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/line-chart-revenue-black-theme.js"></script>
