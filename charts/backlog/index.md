---
layout: page.njk
title: "Charts Backlog"
section: "Charts"
displaySidebar: true
permalink: '/charts/backlog/'
---

Features and chart types planned for future releases.

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Feature</th>
            <th>API sketch</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="3">
                <h5>Annotations</h5>
                <p>Options for marking up the chart area with reference context. The base <code>annotations</code> API (vertical and horizontal point/range markers) ships in v0.9.5 — see <a href="/charts/line/annotations/">Annotations</a>. Items below are follow-ups.</p>
            </td>
        </tr>
        <tr>
            <td>Annotations on Bar (time-series mode)</td>
            <td><code>annotations</code> on <code>RareCharts.Bar</code></td>
            <td>Wire the same <code>annotations</code> API into <code>Bar</code> when its data has a <code>date</code> field. Useful for marking events on daily volume or transaction-count bars.</td>
        </tr>
        <tr>
            <td>Callouts and image overlays</td>
            <td><code>callouts: [{ x, y, text, image, dx, dy }]</code></td>
            <td>Text callouts and image overlays anchored to data coordinates or pixel positions inside the chart area. Distinct from <code>annotations</code>: callouts are free-form content at arbitrary <code>(x, y)</code> rather than axis-aligned markers.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Band series</h5>
                <p>The <code>band</code> (confidence-ribbon) series ships on <code>RareCharts.Line</code> in v0.9.6 — see <a href="/charts/line/band/">Bands</a>. Items below extend it.</p>
            </td>
        </tr>
        <tr>
            <td>Bands on Time Series and Dual Axes</td>
            <td><code>type: 'band'</code> on <code>RareCharts.TimeSeries</code> / <code>RareCharts.DualAxes</code></td>
            <td>Wire the same <code>{ date, lower, upper }</code> band series into the other date-based chart classes. Useful for confidence ranges on a zoomable price feed or alongside a bar/line dual-axis layout. Currently band rendering lives only in <code>Line</code>.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>New chart types</h5>
            </td>
        </tr>
        <tr>
            <td>Candlestick</td>
            <td><code>RareCharts.Candlestick</code></td>
            <td>OHLCV candlestick chart for price and financial data visualization.</td>
        </tr>
        <tr>
            <td>Hierarchies</td>
            <td><code>RareCharts.Hierarchies</code></td>
            <td>Hierarchical data views such as tree, treemap, cluster, pack, or related structures for nested datasets and ownership-style breakdowns.</td>
        </tr>
        <tr>
            <td>Multi-chart container</td>
            <td><code>RareCharts.MultiChart</code></td>
            <td>Single chart block that composes up to several child charts under one shared title, subtitle, source, and legend. Intended for dashboard-style layouts where multiple chart types belong to one narrative unit.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Bar series</h5>
            </td>
        </tr>
        <tr>
            <td>Bar value labels</td>
            <td><code>barLabels: true</code></td>
            <td>Renders formatted value labels above positive bars and below negative bars. Uses <code>yTickFormat</code> for formatting. Available on Bar and DualAxes.</td>
        </tr>
        <tr>
            <td>Bar width control</td>
            <td><code>barWidth: number</code></td>
            <td>Absolute bar width in px as an alternative to the proportional <code>barWidthRatio</code>. Supports per-series override.</td>
        </tr>
        <tr>
            <td>Per-bar color override</td>
            <td><code>data: [{ label, value, color }]</code></td>
            <td>Allow an individual bar to specify its own fill color without redefining the full chart palette. Useful for highlighting a selected category, outlier, or benchmark item.</td>
        </tr>
        <tr>
            <td>Diverging bar chart</td>
            <td><code>RareCharts.DivergingBar</code></td>
            <td>Bar chart centered on a shared baseline for before/after, left/right, positive/negative, or category comparison layouts.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Map</h5>
            </td>
        </tr>
        <tr>
            <td>Map overlays and labels</td>
            <td><code>layers: [{ type, data, ... }]</code></td>
            <td>Add overlay layers to maps for extra information such as points, routes, bubbles, labels, markers, or other contextual geographic annotations.</td>
        </tr>
        <tr>
            <td>Clickable map regions</td>
            <td><code>onRegionClick: ({ feature, item, event }) =&gt; void</code> or <code>item.href</code></td>
            <td>Allow clicking a region to trigger navigation or custom actions. Intended for drill-down flows, region detail pages, dashboards, and linked geographic navigation.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Graph</h5>
            </td>
        </tr>
        <tr>
            <td>Graph rework: network views</td>
            <td><code>view: 'ego' | 'path' | 'cluster'</code></td>
            <td>Rebuild <code>Graph</code> around a headless graph model with computed analytics (centrality, communities, shortest paths) and three deterministic views instead of a single force simulation: <strong>ego</strong> (rings by degree of separation, sectors by relation type), <strong>path</strong> (layered "how are A and B connected" routes), and <strong>cluster</strong> (communities collapsed into meta-nodes). Click a node to re-center; zoom switches ego ↔ cluster semantically. Designed for entity relations, agent networks, and blockchain addresses.</td>
        </tr>
        <tr>
            <td>Graph node details panel</td>
            <td>details surface</td>
            <td>The tooltip is a capped counts-first summary by design (a hover tooltip cannot scroll); well-connected nodes end with "+N more". Add a proper HTML details surface — side panel or expandable list — with the full, filterable connection list, reachable from the tooltip hint or a node action.</td>
        </tr>
        <tr>
            <td>Graph chrome styling</td>
            <td>zoom controls, capacity note</td>
            <td>The +/−/⟲ zoom buttons and the "+N more" capacity note are functional placeholders. Align them with Rare Styles: proper icons, spacing, positioning, hover states, and dark-theme support.</td>
        </tr>
        <tr>
            <td>Graph interactive legend</td>
            <td>link-type legend</td>
            <td>Clicking a link-type item in the graph legend isolates links of that type (others fade); clicking again or clicking outside restores all. Mirrors the planned series isolation on axis charts.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Axes</h5>
            </td>
        </tr>
        <tr>
            <td>Reclaim margin when an axis is hidden</td>
            <td><code>showXAxis</code> / <code>showYAxis</code> / <code>showY1Axis</code> / <code>showY2Axis</code><code>: false</code></td>
            <td>When an axis is hidden, collapse the margin it occupied so the plot expands flush — instead of leaving the empty gutter behind. Today hiding an axis (e.g. <code>showYAxis: false</code>) only drops its ticks and labels; the <code>margin.right</code> space remains, so a flush or sparkline look needs a manual <code>margin</code> override. This should happen automatically across <code>Line</code>, <code>Bar</code>, and <code>DualAxes</code> (and <code>TimeSeries</code>, once it gains the toggles below). <strong>Targeted for v0.9.8.</strong></td>
        </tr>
        <tr>
            <td>Axis-visibility toggles on Time Series</td>
            <td><code>showGrid</code> / <code>showXAxis</code> / <code>showYAxis</code> on <code>RareCharts.TimeSeries</code></td>
            <td>Bring the grid and axis toggles that <code>Line</code>, <code>Bar</code>, and <code>DualAxes</code> already expose to <code>TimeSeries</code>, where the grid and both axes currently render unconditionally. A small change mirroring the existing pattern, and a prerequisite for margin reclaim on a time-series chart. <strong>Targeted for v0.9.8.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Interactivity</h5>
            </td>
        </tr>
        <tr>
            <td>Legend series isolation</td>
            <td><code>legendInteractive: true</code></td>
            <td>Clicking a legend item isolates that series. All others are dimmed. Clicking the active item or double-clicking restores all series.</td>
        </tr>
        <tr>
            <td>Tooltip header style</td>
            <td><code>theme.tooltip.header</code></td>
            <td>Dedicated theme token for the tooltip header row (date label). Allows independent control of header background and text color, separate from <code>tooltip.bg</code> and <code>tooltip.text</code>.</td>
        </tr>
        <tr>
            <td>Arbitrary in-chart labels</td>
            <td><code>labels: [{ x, y, text, dx, dy, color }]</code> or per-series <code>labelFormat</code></td>
            <td>Render custom text labels directly inside the chart area for lines, bars, and highlighted values. Intended for editorial annotations, direct labeling, and reducing reliance on legends or tooltips.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Branding</h5>
            </td>
        </tr>
        <tr>
            <td>Branding API</td>
            <td><code>RareCharts.setBrand(config)</code></td>
            <td>Global brand configuration applied to all chart instances: logo image (rendered as a watermark), accent color, and font family. Eliminates per-chart theme repetition in multi-chart dashboards.</td>
        </tr>
    </tbody>
</table>
