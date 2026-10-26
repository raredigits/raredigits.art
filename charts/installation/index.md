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
<button class="copy-data-icon rd-js-copy" title="Copy link" data-icon="content_copy"></button></pre>

Copy `rare-charts.js` wherever your project keeps static assets.

**From CDN** — load a release directly, no download required:

<pre class="code-block"><code data-copy>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@{{ versions.charts }}/rare-charts.min.js"&gt;&lt;/script&gt;</code>
<button class="copy-data-icon rd-js-copy" title="Copy link" data-icon="content_copy"></button></pre>

Always name the version. Releases after `v0.9.8` are tagged `v0.9.8_N`, which jsDelivr does not treat as newer, so `@latest` still serves `v0.9.8` — without `HierarchicalBar`, `Sankey` and `MapFlow` — until `v0.9.9`. The readable `rare-charts.js` sits next to the minified file under the same tag.

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

**In `<head>` with `defer`** — loads in parallel and runs after the HTML is parsed. Inline scripts ignore `defer`, so start the chart on `DOMContentLoaded` (deferred scripts run before it):

<pre><code>&lt;head&gt;
  &lt;script src="/assets/rare-charts.js" defer&gt;&lt;/script&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;div id="chart"&gt;&lt;/div&gt;
  &lt;script&gt;
    document.addEventListener('DOMContentLoaded', () =&gt; {
      new RareCharts.Line('#chart', { height: 260 }).setData(data);
    });
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

**Height** is set per instance via the `height` option. Each chart type has its own default (200–520px; `HierarchicalBar`, `MultiChart` and a vertical `Sankey` grow with their content), but you almost always want to set it explicitly.

<pre><code>new RareCharts.Graph('#network', { height: 600 }).setData(data);</code></pre>

## Available chart types

<div class="table-scroll card-caption">
<table class="table-bordered">
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
      <td>Long date series with range buttons, zoom, pan and a navigator; extra fields (open, high, low, volume) reach <code>tooltipFormat</code></td>
    </tr>
    <tr>
      <td><code>RareCharts.Overview</code></td>
      <td>The navigator strip on its own: a brush for picking a date window that drives charts you wire to it — <a href="/charts/line/time-series/#overview-standalone-navigator">Overview (standalone navigator)</a></td>
    </tr>
    <tr>
      <td><code>RareCharts.Bar</code></td>
      <td>Category comparisons, ranked lists</td>
    </tr>
    <tr>
      <td><code>RareCharts.HierarchicalBar</code></td>
      <td>A tree as an outline of bars: portfolio, org and budget breakdowns</td>
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
      <td>Part-to-whole, no hole (Donut with <code>innerRadius: 0</code> by default)</td>
    </tr>
    <tr>
      <td><code>RareCharts.Gauge</code></td>
      <td>Progress toward a target</td>
    </tr>
    <tr>
      <td><code>RareCharts.Graph</code></td>
      <td>Relationship networks: ego, path and cluster views, and money-trail flows (experimental)</td>
    </tr>
    <tr>
      <td><code>RareCharts.Sankey</code></td>
      <td>Flows between stages: budgets, money trails, balances (experimental)</td>
    </tr>
    <tr>
      <td><code>RareCharts.MultiChart</code></td>
      <td>Two to four <code>Line</code> or <code>Bar</code> charts in one card</td>
    </tr>
    <tr>
      <td><code>RareCharts.Map</code></td>
      <td>Choropleth and region-highlight geographic maps</td>
    </tr>
    <tr>
      <td><code>RareCharts.MapFlow</code></td>
      <td>Flows between places over a map (experimental)</td>
    </tr>
  </tbody>
</table>
</div>

All types share the same base options (`title`, `subtitle`, `legend`, `source`, `note`, `controls`, `height` — except `HierarchicalBar` and `MultiChart`, which size to their content — `margin` (axis charts; Donut, Pie, Gauge, Sankey and Graph fill the card), `theme`) — documented on the [Settings](/charts/settings/) page.

## D3 and helpers in the bundle

`RareCharts.d3` is the part of the bundled [D3](https://d3js.org/) that page code needs next to a chart — for formatters and small calculations. There is no global `d3` on a page that loads only the library.

- numbers and dates as text: `format`, `formatPrefix`, `timeFormat`, `timeParse`, `utcFormat`, `utcParse`;
- arrays: `sum`, `min`, `max`, `extent`, `mean`, `range`;
- scales: `scaleLinear`, `scaleTime`, `scaleLog`, `scaleOrdinal`;
- colour: `color`, `rgb`, `hsl`, `interpolate`;
- calendar intervals: `timeDay`, `timeWeek`, `timeMonth`, `timeYear`, `utcDay`, `utcWeek`, `utcMonth`, `utcYear`.

<pre class="text-content-caption"><code>const d3 = RareCharts.d3;
yTickFormat: v => '$' + d3.format(',.0f')(v)</code></pre>

Before v0.9.8_6 `RareCharts.d3` was the whole D3 namespace, which kept all of D3 in the bundle; the subset adds nothing the charts do not use themselves. A page that needs more of D3 — selections, shapes, geo — loads D3 itself.

`RareCharts.generateMockPrices(days, startPrice)` makes random price rows (`date`, `value`, `open`, `high`, `low`, `volume`) for demos and sketches. It is a demo helper, **outside the stability guarantee**: its output and signature may change in any release, and it may leave the bundle. Real pages pass their own data.

## Fonts and Rare Styles

RareCharts does not need [Rare Styles](/styles/) or any other stylesheet. The chart CSS is bundled in with its own spacing and type variables, so a chart keeps its layout on any page, a blank one included.

The library loads no fonts. Charts use Fira Sans for text and Cousine for numbers when the page provides them, and the system sans-serif and monospace fonts otherwise. Rare Styles self-hosts both families, so a Rare Styles page needs nothing more. On any other page, load them yourself for the same look:

<pre class="code-block"><code data-copy>&lt;link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,400;0,700;1,400&amp;family=Cousine:wght@400;700&amp;display=swap"&gt;</code>
<button class="copy-data-icon rd-js-copy" title="Copy link" data-icon="content_copy"></button></pre>

To change the type system, override the `--rc-*` variables with a selector that outranks the library's `.rc-chart` rule, such as `:root .rc-chart` — see [Styles](/charts/styles/).

## Strict Content Security Policy

The bundle adds its stylesheet to `<head>` as a `<style>` element. A [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) without `'unsafe-inline'` in `style-src` blocks it, and the charts lose their layout. Serve the stylesheet as a file instead:

**1.** Take `rare-charts.css` of the same version as your bundle. Each release publishes it next to the bundle — `https://cdn.jsdelivr.net/gh/raredigits/rare-charts@{{ versions.charts }}/rare-charts.css` — if your policy allows that origin in `style-src`; otherwise save it with your other static files (the copy at [`/assets/charts/rare-charts.css`](/assets/charts/rare-charts.css) is the one these pages document, `{{ versions.charts }}`) and take it again when you update the bundle.

**2.** Link it with the id `rc-base-styles`. The bundle finds the id and adds no `<style>` of its own:

<pre class="code-block"><code data-copy>&lt;link id="rc-base-styles" rel="stylesheet" href="/assets/rare-charts.css"&gt;</code>
<button class="copy-data-icon rd-js-copy" title="Copy link" data-icon="content_copy"></button></pre>

If the stylesheet reaches the page another way — inside your own CSS bundle, say — turn the injection off before the bundle runs. Under such a policy an inline `<script>` is blocked too, so set it in a script file of your own (or one with the policy's nonce), loaded before `rare-charts.js`:

<pre><code>window.RareChartsConfig = { injectStyles: false };</code></pre>

Everything else the charts style from script — sizes, positions, theme colours — goes through the DOM style API, which the policy allows. One thing it does block: colours written as `style` attributes into the markup of the built-in tooltips (a series colour on its row, a slice colour on its label) and of the Graph details hint — that text then takes the tooltip's or the panel's own colour.

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
