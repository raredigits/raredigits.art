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

<pre class="text-content-caption"><code>new RareCharts.ChartType(selector, options)</code></pre>

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

<pre class="text-content-caption"><code>legend: [
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

<pre class="text-content-caption"><code>source: 'Source: The Truth'</code></pre>

## Layout

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `height` | number | varies | Total container height in px. See each chart's page for its default. |
| `margin` | object | `{ top: 16, right: 70, bottom: 16, left: 0 }` | Inner padding around the SVG drawing area |

The `margin` defaults are tuned for charts with a right-side Y axis (which is the default for line charts). If you're building something custom or have a left-side axis, you may want to adjust `margin.left` and `margin.right`.

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
  height: 320,
  margin: { top: 8, right: 50, bottom: 16, left: 40 },
})</code></pre>

## Theme

| Option | Type | Description |
|--------|------|-------------|
| `theme` | object | Partial or full theme object. Merged with the active default. |

Pass a theme object to override colors, fonts, or sizing defaults. The full theme system is documented on the [Styles](/charts/styles/) page.

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

Area fills inherit the series `color`. Their opacity is controlled separately via `areaOpacity` (default `0.12`). Bar fill opacity is `barOpacity` (default `0.35`). Both can be set as chart options or through the theme.

## Axis labels

Y axis tick labels support two levels of customization.

**Prefix and suffix** (Line charts) attach a fixed string before or after each auto-formatted value:

<pre class="text-content-caption"><code>yPrefix: '$'    <span class="code-comment">// → $1.2M</span>
ySuffix: '%'    <span class="code-comment">// → 12.5%</span></code></pre>

**Full format override** replaces automatic formatting entirely and works on all chart types:

<pre class="text-content-caption"><code>yTickFormat: v => d3.format(',.0f')(v) + ' units'</code></pre>

DualAxes has independent formatters for each axis — no prefix/suffix shortcuts, use `y1TickFormat` / `y2TickFormat` directly:

<pre class="text-content-caption"><code>y1TickFormat: v => '$' + d3.format(',.2f')(v),
y2TickFormat: v => d3.format('+.1f')(v) + 'bp'</code></pre>

When `yTickFormat` is provided, `yPrefix`, `ySuffix`, and `yFormat` are all ignored — the format function takes full ownership.

## Crosshair and tooltip

The crosshair is a vertical tracker that follows the cursor, snaps to the nearest data point on each series, and shows a tooltip. It is enabled by default on Line, TimeSeries, and DualAxes charts.

To disable it entirely (removes both the tracker line and the tooltip):

<pre class="text-content-caption"><code>crosshair: false</code></pre>

### Custom tooltip

`tooltipFormat` replaces the default tooltip with your own HTML:

<pre class="text-content-caption"><code>tooltipFormat: ({ date, points }) => {
  const d = d3.timeFormat('%b %d, %Y')(date);
  return `&lt;div&gt;${d}&lt;/div&gt;` +
    points.map(p =>
      `&lt;div style="color:${p.color}"&gt;${p.name}: ${p.fmt}&lt;/div&gt;`
    ).join('');
}</code></pre>

`points` is an array of `{ name, value, color, fmt }` — one entry per series. `fmt` is the value already run through `yTickFormat` (or the default formatter), so you don't need to reformat it yourself.

### Tooltip styling

Tooltip colors and shadow are controlled through `theme.tooltip`:

<pre class="text-content-caption"><code>theme: {
  tooltip: {
    bg:     '#1a1a1a',
    border: '#333333',
    text:   '#e8e8e8',
    muted:  '#888888',
    shadow: '0 2px 12px rgba(0,0,0,0.5)',
  }
}</code></pre>

For structural changes (padding, border-radius, font size), target the `.rc-tooltip` CSS class directly. The crosshair line uses `.rc-cross-line`.

## setData()

All charts expose a `setData(data)` method that accepts the chart-specific data format and triggers a render. You can call it multiple times — the chart will update in place without re-initializing.

<pre class="text-content-caption"><code>const chart = new RareCharts.Bar('#chart', options);

chart.setData(initialData);

<span class="code-comment">// Later — same chart, new data, no flicker</span>
chart.setData(updatedData);</code></pre>

## destroy()

Cleans up the chart: disconnects the resize observer and clears the container. Call this when removing a chart from the page to avoid memory leaks.

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
