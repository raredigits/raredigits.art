---
layout: page.njk
title: "Installation"
section: "Charts"
displaySidebar: true
permalink: '/charts/installation/'
---

RareCharts ships as a single self-contained JavaScript file. No build step, no package manager, no fifteen dependencies with conflicting peer requirements. You add one script tag and it works.

D3 is bundled in. You do not need to include it separately.

## Getting the file

**From GitHub** — clone the repo and use the prebuilt file:

<pre><code>git clone https://github.com/raredigits/rare-charts.git</code></pre>

Copy `dist/rare-charts.js` wherever your project keeps static assets.

**From CDN** — load it directly, no download required:

<pre><code>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/dist/rare-charts.js"&gt;&lt;/script&gt;</code></pre>

For production, pin to a specific version. `@latest` is fine for prototyping, bad for anything that ships:

<pre><code>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@1.0.0/dist/rare-charts.js"&gt;&lt;/script&gt;</code></pre>

## Where to put the script tag

Two standard options, both work fine.

**Before `</body>`** — the classic approach. The page renders first, then the script loads. Charts initialize against already-present DOM elements.

<pre><code>&lt;body&gt;
  &lt;div id="chart"&gt;&lt;/div&gt;
  ...
  &lt;script src="/assets/rare-charts.js"&gt;&lt;/script&gt;
  &lt;script&gt;
    new RareCharts.Line('#chart', { height: 260 }).setData(data);
  &lt;/script&gt;
&lt;/body&gt;</code></pre>

**In `<head>` with `defer`** — loads in parallel, executes after the DOM is ready. Same result, slightly cleaner separation:

<pre><code>&lt;head&gt;
  &lt;script src="/assets/rare-charts.js" defer&gt;&lt;/script&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;div id="chart"&gt;&lt;/div&gt;
  &lt;script defer&gt;
    new RareCharts.Line('#chart', { height: 260 }).setData(data);
  &lt;/script&gt;
&lt;/body&gt;</code></pre>

The only rule: your chart initialization code must run after both the library and the container element are in the DOM. Either approach guarantees that.

## Creating a chart

Every chart follows the same three-step pattern.

**1.** Add a container element:
<pre><code>&lt;div id="my-chart"&gt;&lt;/div&gt;</code></pre>

**2.** Create a chart instance, passing a selector and options:
<pre><code>const chart = new RareCharts.Line('#my-chart', {
  title:  'Revenue',
  height: 300,
});</code></pre>

**3.** Feed it data:
<pre><code>chart.setData(data);</code></pre>

Or chain steps 2 and 3:
<pre><code>new RareCharts.Bar('#my-chart', { height: 300 }).setData(data);</code></pre>

`setData()` can be called multiple times. The chart updates in place — useful for filters, date range selectors, or live data.

## Sizing

**Width** is always 100% of the container. Make the container whatever width you need — the chart fills it and redraws automatically on resize. No `window.addEventListener('resize', ...)` required.

**Height** is set per instance via the `height` option. Each chart type has its own default (240–520px), but you almost always want to set it explicitly.

<pre><code>new RareCharts.Graph('#network', { height: 600 }).setData(data);</code></pre>

## Available chart types

| Class | Use case |
|-------|----------|
| `RareCharts.Line` | Time series, trend lines, multi-series performance |
| `RareCharts.TimeSeries` | OHLCV candlestick / price charts |
| `RareCharts.Bar` | Category comparisons, ranked lists |
| `RareCharts.DualAxes` | Two metrics on different scales |
| `RareCharts.Combined` | Bar + line overlay |
| `RareCharts.Donut` | Part-to-whole with center label |
| `RareCharts.Pie` | Part-to-whole, no hole (alias for Donut with `innerRadius: 0`) |
| `RareCharts.Gauge` | Progress toward a target |
| `RareCharts.Graph` | Force-directed network of nodes and links |

All types share the same base options (`title`, `subtitle`, `source`, `height`, `theme`) — documented on the [Settings](/charts/settings/) page.

## Using with Rare Styles

If your project uses [Rare Styles](/styles/), RareCharts picks up the CSS custom properties automatically — fonts, colors, and spacing stay consistent with the rest of your UI without extra configuration.

If you are using RareCharts standalone, the built-in defaults take over. Nothing breaks, nothing looks out of place.

## Minimal working example

<pre><code>&lt;div id="chart"&gt;&lt;/div&gt;

&lt;script src="/assets/rare-charts.js"&gt;&lt;/script&gt;
&lt;script&gt;
  new RareCharts.Line('#chart', {
    title:  'Daily Active Users',
    source: 'Source: Analytics',
    height: 280,
  }).setData([
    { date: '2026-01-01', value: 1240 },
    { date: '2026-01-02', value: 1580 },
    { date: '2026-01-03', value: 1390 },
  ]);
&lt;/script&gt;</code></pre>

One file, one div, one chart.
