---
layout: page.njk
title: "Settings"
section: "Charts"
displaySidebar: true
permalink: '/charts/settings/'
---

Every chart type in RareCharts extends a shared base class. That means there's a set of options that work the same way everywhere — you don't need to re-learn them for each chart type.

This page documents those shared options. Chart-specific options (axis formatting, link types, bar orientation, etc.) are documented on each chart's own page.

## The constructor

All charts are created the same way:

<pre><code>new RareCharts.ChartType(selector, options)</code></pre>

`selector` is a CSS selector string (`'#my-chart'`) or a direct DOM element reference. If the element is not found, the chart throws immediately — which is better than silently rendering into nothing and leaving you confused for twenty minutes.

`options` is a plain object. Everything is optional.

## Header options

The chart header sits above the chart area and can contain a title, a subtitle, and a legend.

| Option | Type | Description |
|--------|------|-------------|
| `title` | string | Chart title, rendered as an uppercase `<h5>` |
| `subtitle` | string | Smaller line below the title |
| `legend` | array \| string \| HTMLElement | Legend items (see below) |
| `legendPosition` | `'right'` | Move the legend into a vertical column beside the chart |

If none of these are provided, no header element is created — the chart starts right at the top of the container.

### Legend format

Pass an array of items and the chart renders them as a horizontal row of labeled indicators:

<pre><code>legend: [
  { label: 'Portfolio A', color: '#00c97a' },
  { label: 'Portfolio B', color: '#ff6200' },
]</code></pre>

Each item supports:
- `label` — display name
- `color` — indicator color
- `type` — `'bar'` or `'dot'` renders a square dot; anything else (or omitted) renders a short line

For line charts, use the default (line indicator). For bar and donut charts, use `type: 'bar'` — it renders a square dot instead of a line, which actually matches the shape of what you're labeling.

`legendPosition: 'right'` places the legend in a vertical column to the right of the chart. Useful when you have many series and don't want the legend eating into the chart's vertical space. The chart area automatically adjusts its width.

## Footer

| Option | Type | Description |
|--------|------|-------------|
| `source` | string \| HTMLElement | Rendered as a `<cite>` below the chart. Great for data attribution. |

<pre><code>source: 'Source: Bloomberg, Q4 2025'</code></pre>

## Layout

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `height` | number | varies | Total container height in px. See each chart's page for its default. |
| `margin` | object | `{ top: 16, right: 70, bottom: 16, left: 0 }` | Inner padding around the SVG drawing area |

The `margin` defaults are tuned for charts with a right-side Y axis (which is the default for line charts). If you're building something custom or have a left-side axis, you may want to adjust `margin.left` and `margin.right`.

<pre><code>new RareCharts.Line('#chart', {
  height: 320,
  margin: { top: 8, right: 50, bottom: 16, left: 40 },
})</code></pre>

## Theme

| Option | Type | Description |
|--------|------|-------------|
| `theme` | object | Partial or full theme object. Merged with the active default. |

Pass a theme object to override colors, fonts, or sizing defaults. The full theme system is documented on the [Styles](/charts/styles/) page.

Quick example — apply the built-in dark theme:

<pre><code>new RareCharts.Line('#chart', {
  theme: RareCharts.darkTheme,
}).setData(data);</code></pre>

Or override just the accent color:

<pre><code>new RareCharts.Line('#chart', {
  theme: { accent: '#ff6200' },
}).setData(data);</code></pre>

## setData()

All charts expose a `setData(data)` method that accepts the chart-specific data format and triggers a render. You can call it multiple times — the chart will update in place without re-initializing.

<pre><code>const chart = new RareCharts.Bar('#chart', options);

chart.setData(initialData);

// Later — same chart, new data, no flicker
chart.setData(updatedData);</code></pre>

## destroy()

Cleans up the chart: disconnects the resize observer and clears the container. Call this when removing a chart from the page to avoid memory leaks.

<pre><code>chart.destroy();</code></pre>

## Complete example

<pre><code>new RareCharts.Line('#revenue-chart', {
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
