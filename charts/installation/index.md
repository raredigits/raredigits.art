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

<pre class="code-block text-content-caption"><code data-copy>git clone https://github.com/raredigits/rare-charts.git</code>
<button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button></pre>

Copy `rare-charts.js` wherever your project keeps static assets.

**From CDN** — load it directly, no download required:

<pre class="code-block"><code data-copy>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/rare-charts.js"&gt;&lt;/script&gt;</code>
<button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button></pre>

For production, pin to a specific version. `@latest` is fine for prototyping, bad for anything that ships:

<pre class="code-block"><code data-copy>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@v0.9.4/rare-charts.min.js"&gt;&lt;/script&gt;</code>
<button class="copy-data-icon" title="Copy link" data-icon="content_copy"></button></pre>

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

<table class="table-bordered card-caption">
  <thead>
        <tr>
            <th>Class</th>
            <th>Use case</th>
        </tr>
    </thead>
  <tbody>
    <tr>
      <td><code>RareCharts.Line</code></td>
      <td>Time series, trend lines, multi-series performance</td>
    </tr>
    <tr>
      <td><code>RareCharts.TimeSeries</code></td>
      <td>Price time series with OHLCV data support</td>
    </tr>
    <tr>
      <td><code>RareCharts.Bar</code></td>
      <td>Category comparisons, ranked lists</td>
    </tr>
    <tr>
      <td><code>RareCharts.DualAxes</code></td>
      <td>Two metrics on different scales</td>
    </tr>
    <tr>
      <td><code>RareCharts.DualAxes</code> with mixed series</td>
      <td>Bar + line overlay (combined charts are built on top of <code>DualAxes</code>)</td>
    </tr>
    <tr>
      <td><code>RareCharts.Donut</code></td>
      <td>Part-to-whole with center label</td>
    </tr>
    <tr>
      <td><code>RareCharts.Pie</code></td>
      <td>Part-to-whole, no hole (alias for Donut with <code>innerRadius: 0</code>)</td>
    </tr>
    <tr>
      <td><code>RareCharts.Gauge</code></td>
      <td>Progress toward a target</td>
    </tr>
    <tr>
      <td><code>RareCharts.Graph</code></td>
      <td>Force-directed network of nodes and links</td>
    </tr>
    <tr>
      <td><code>RareCharts.Map</code></td>
      <td>Choropleth and region-highlight geographic maps</td>
    </tr>
  </tbody>
</table>

All types share the same base options (`title`, `subtitle`, `source`, `height`, `theme`) — documented on the [Settings](/charts/settings/) page.

## Using with Rare Styles

If your project uses [Rare Styles](/styles/), RareCharts will sit comfortably next to the rest of the UI. But the charts do not depend on host-site font variables anymore: the library ships with its own typography defaults and its own chart-level CSS variables.

If you are using RareCharts standalone, the built-in defaults take over. If you want to change the type system, override the chart theme or the `--rc-*` variables documented on the [Styles](/charts/styles/) page.

## Minimal working example

<pre class="text-content-caption"><code>&lt;div id="chart"&gt;&lt;/div&gt;

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
