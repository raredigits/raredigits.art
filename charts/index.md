---
layout: page.njk
title: "Rare Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/'
---

<div class="meta-info">
  /charts/rare-charts.js
  <p>
      v.0.9.0 Beta | <a href="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@v0.9.0/rare-charts.min.js">CDN</a> | 
      <a href="/assets/charts/rare-charts.js">Download</a> <span class="material-icons">file_download</span>
  </p>
</div>

RareCharts is a charting library for professional data presentation. It is built for situations where numbers actually matter: financial reporting, KPI dashboards, operational analytics, strategic reviews. This is not a decorative widget and not a playground for “look, animations”.

### Interpretation time is not abstract. It is cost

Text can be precise. Tables can be structured. But both require sequential reading and mental calculation. A chart compresses that process. It turns numbers into shape, direction, magnitude and change — things the brain reads almost instantly.

If you write: “<em>Revenue grew from 1.2M to 2.8M, with a dip in March and acceleration in Q4</em>”, it is clear. If you show a table, it is structured. But only a chart reveals where the turning point happened, how deep the decline was, and how strong the recovery became. The difference is not visual appeal. The difference is speed of understanding.

<div class="card text-content-caption card-dashboard-bordered black-bg">
    <div id="line-chart-demo-revenue"></div>
</div>

## RareCharts

<div class="sidenote-wrapper">
  <div>
    <p>RareCharts is part of <a href="/styles/">Rare Styles</a>, professional design system for business interfaces. This means its visual language, typography and spacing are aligned with a broader system. At the same time, the library <strong>can work independently</strong> in any project without requiring the rest of Rare Styles.</p>
  </div>
  <div class="sidenote">
    <h5>Built on D3</h5>
    <p>RareCharts is built on top of D3.js, a long-established data visualization library trusted in production environments for years. We rely on D3 for scale systems, rendering precision, performance and flexibility. RareCharts adds structure, defaults and business-oriented conventions on top of that foundation.</p>
  </div>
  <div>
    <p>You can integrate it into an existing product, an internal dashboard, a reporting tool, or a public-facing analytics page. Architecturally it does not impose a design ideology. It provides a structured base.</p>
    <p>The library includes:</p>
    <ul>
      <li>Line with different visual options</li> 
      <li>Bars</li>
      <li>Circulars</li>
      <li>Network graphs</li>
      <li>Combined charts</li>
    </ul>
  </div>
</div>

The important part is not the variety, but the consistency. All charts follow a unified configuration model and data structure. Once you understand one, the rest behave predictably.

This reduces friction for developers. You learn the logic once and reuse it everywhere. Each chart type, including edge cases and advanced configuration, is documented in its own section.

<h2>Standard Structure</h2>

Every chart follows a consistent composition: title, subtitle, legend, chart area and data source. These elements are configurable. They can be provided, extended, overridden or omitted entirely.

The structure is there to support professional reporting standards. It keeps charts from turning into isolated visual fragments and instead makes them part of a coherent document.

### Data Handling

RareCharts works with internal datasets as well as JSON and CSV inputs. This makes it naturally compatible with APIs, backend responses and analytics pipelines. If your data is structured, it can be visualized.

The data model is explicit and predictable, which becomes critical when multiple charts consume data from different sources but must behave consistently.

### Styling and Themes

The library includes a built-in styling system and predefined themes that can be overridden or extended. By default, a chart occupies 100% of the parent container’s width, while its height is defined per instance. This ensures predictable behavior in responsive layouts.

There are no hidden layout “surprises”. Control remains with the developer.

### Professional Considerations

<div class="sidenote-wrapper">
  <p>RareCharts accounts for details that are often overlooked in demo-oriented libraries: correct zero-line handling, number and date formatting, structured legends, clear data source attribution, configurable axes and scale behavior.</p>
  <div class="sidenote">
    <div id="bar-chart-understanding"></div>
  </div>
  <div>
    <p>In real reporting environments, such details determine whether a chart communicates clearly or creates ambiguity.</p>
    <p>The following sections of the documentation explore each chart type in depth, including configuration parameters, customization patterns and edge cases. Complexity is not removed. It is organized.</p>
  </div>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-understanding.js"></script>
<script src="/assets/charts/examples/line/line-chart-revenue.js"></script>
