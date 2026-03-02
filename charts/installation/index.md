---
layout: page.njk
title: "Installation"
section: "Charts"
displaySidebar: true
permalink: '/charts/installation/'
---

RareCharts can be added to a project in two straightforward ways. You can either take the library from GitHub and keep it inside your codebase, or you can load a prebuilt file from a CDN. Both options expose the same API and behave the same at runtime, so the decision is mostly about how you want to manage versions and assets.

If you already have a build pipeline and you prefer predictable deployments, GitHub is usually the right choice. If you are building a static site, a documentation page, a prototype, or you simply want the quickest path to a working chart, CDN is often enough.

## Option 1: GitHub

If you want full control over the source, pinning, and updates, clone the repository and use the compiled build (or bundle the source, if that’s how your project works).

<pre><code>git clone https://github.com/raredigits/rare-charts.git</code></pre>

After that you can include the compiled file in your project and reference it as a normal script. When loaded this way, RareCharts exposes a global RareCharts object.

<pre><code>&lt;script src="/assets/js/rare-charts.js"&gt;&lt;/script&gt;</code></pre>

This approach keeps everything under your control: you can vendor the exact version you want, review changes before updating, and ship without relying on external delivery.

## Option 2: CDN

If you want minimal setup, you can load RareCharts directly from a CDN. This is especially convenient for demos, documentation pages, and static sites where you do not want a bundler just to render a few charts.

<pre><code>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@latest/dist/rare-charts.js"&gt;&lt;/script&gt;</code></pre>

For production, using a fixed version is strongly recommended. “Latest” is fine for experimentation, but reproducibility is what you want when the chart ends up in a report, a dashboard, or anything that people will quote later.

<pre><code>&lt;script src="https://cdn.jsdelivr.net/gh/raredigits/rare-charts@1.0.0/dist/rare-charts.js"&gt;&lt;/script&gt;</code></pre>

Just like with the GitHub build, the CDN file exposes the RareCharts global. You can then use any chart class directly: RareCharts.Line, RareCharts.Bar, RareCharts.DualAxes, RareCharts.Donut, RareCharts.Graph.

### Dependencies

RareCharts includes the D3 modules it needs internally, so you do not have to install or load D3 separately. This is intentional. It reduces setup friction and avoids the classic situation where everything works until one dependency version silently stops matching another.

### Minimal example

Once the script is available on the page, you only need a container element and a chart instance. By default, the chart uses the full width of its parent container, while height is set per chart instance.

<pre><code>&lt;div id="chart"&gt;&lt;/div&gt;

&lt;script>
  const data = [
    { date: '2026-01-01', value: 10 },
    { date: '2026-01-02', value: 14 },
    { date: '2026-01-03', value: 12 }
  ];

  new RareCharts.Line('#chart', { height: 260 }).setData(data);
&lt;/script></code></pre>

That is it. No ceremony, no plugin ecosystems, no “install fifteen packages to draw one line”.