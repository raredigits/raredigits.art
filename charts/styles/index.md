---
layout: page.njk
title: "Styles"
section: "Charts"
displaySidebar: true
permalink: '/charts/styles/'
---

RareCharts uses a two-layer styling system. Structure and layout live in CSS. Colors, fonts, and visual tokens live in a JavaScript theme object. They work independently, which means you can swap a theme without touching CSS, and you can override layout without touching the theme.

## Layer 1: CSS structure

`rare-charts.js` automatically injects a small stylesheet into `<head>` when the library loads. It handles:

- The `.rc-chart` flex container (title → legend → SVG → source, in that order)
- Legend layout (horizontal row, or vertical aside when `legendPosition: 'right'`)
- Tooltip positioning and fade transition
- SVG axis label styles, end labels, markers

**Colors are not in CSS.** This is intentional. Every color — grid lines, axis text, tooltips, series fills — is set inline by the chart from the active theme. That makes theming predictable: change the theme object, everything follows. No hunting for overridden CSS variables.

If you use [Rare Styles](/styles/), the chart CSS picks up your typography and spacing variables automatically (`--primary-font`, `--font-size-sm`, `--space-md`, etc.). If you don't, the library falls back to sensible built-in values.

## Layer 2: JS theme

The theme is a plain object that every chart reads at render time. The default theme looks like this:

<pre><code>const defaultTheme = {
  // Backgrounds
  bg:      '#ffffff',
  surface: '#f5f5f5',     // tooltip bg, panel fills

  // Structure
  grid:      '#e8e8e8',   // horizontal grid lines
  border:    '#cccccc',   // axis lines, zero baseline
  crosshair: '#aaaaaa',   // vertical hover line

  // Text
  text:  '#000000',       // primary labels
  muted: '#666666',       // axis ticks, secondary text

  // Semantic colors
  positive: '#389e0d',    // gains, up moves
  negative: '#ff0000',    // losses, down moves
  accent:   '#00aaff',    // highlights, single-series default

  // Series palette — used in order for multi-series charts
  colors: ['#ff6200', '#00aaff', '#00c97a', '#ffcc00', '#cc44ff', '#ff0000'],

  // Typography
  font:        'var(--primary-font)',
  numericFont: 'var(--primary-font, monospace)',

  // Sizing defaults (charts use these as fallbacks)
  strokeWidth: 2,
  dotRadius:   3,
  markerSize:  4,
  barOpacity:  0.35,

  // Tooltip
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

**`RareCharts.defaultTheme`** — light background, clean grays, orange/blue accent palette. Works anywhere.

**`RareCharts.darkTheme`** — dark background with Bloomberg terminal aesthetics. Deep blacks, muted grids, orange accent. Looks sharp on dashboard UIs and dark-mode pages.

<pre><code>new RareCharts.Line('#chart', {
  theme: RareCharts.darkTheme,
}).setData(data);</code></pre>

## Creating a custom theme

`RareCharts.createTheme(overrides)` merges your overrides with the default and returns a complete theme object. You only need to specify what you want to change:

<pre><code>const brandTheme = RareCharts.createTheme({
  accent:  '#e63946',
  colors:  ['#e63946', '#457b9d', '#a8dadc', '#1d3557'],
  font:    '"Inter", sans-serif',
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

<pre><code>const theme = RareCharts.createTheme({ accent: '#ff6200' });

new RareCharts.Line('#chart-a', { theme }).setData(dataA);
new RareCharts.Bar('#chart-b',  { theme }).setData(dataB);
new RareCharts.Donut('#chart-c', { theme }).setData(dataC);</code></pre>

All three charts will use the same colors, fonts, and tooltip styling. Consistency without repetition.

## Partial overrides

You don't have to use `createTheme` for minor tweaks. Passing a partial object directly to the `theme` option works the same way — it merges automatically:

<pre><code>// Just change the grid color
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
| `font` | `var(--primary-font)` | All chart labels |
| `numericFont` | `var(--primary-font, monospace)` | Axis numbers, tooltips |

If your page uses Rare Styles, `--primary-font` is already set. Otherwise these fall back to the browser default.

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
