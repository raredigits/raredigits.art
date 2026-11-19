---
layout: page.njk
title: "Charts Backlog"
section: "Charts"
displaySidebar: true
permalink: '/charts/backlog/'
---

Features and chart types planned for future releases. The slots: **v0.9.8_8** — composition and new chart types; **v0.9.8_9** — scales and interactivity; **v0.9.9** — final debugging before the freeze; **v1.0** — the API freeze. A row without a release is planned for after 1.0, as an addition that changes nothing existing.

<div class="table-scroll card-caption">
<table class="table-bordered">
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
                <p>Options for marking up the chart area with reference context. The base <code>annotations</code> API (vertical and horizontal point/range markers) ships in v0.9.5 — see <a href="/charts/line/annotations/">Annotations</a> — and on the dated <code>Bar</code> since v0.9.8_6. Items below are follow-ups.</p>
            </td>
        </tr>
        <tr>
            <td>Callouts and image overlays</td>
            <td><code>callouts: [{ x, y, text, image, dx, dy }]</code></td>
            <td>Text callouts and image overlays anchored to data coordinates or pixel positions inside the chart area. Distinct from <code>annotations</code>: callouts are free-form content at arbitrary <code>(x, y)</code> rather than axis-aligned markers. The data project (Churchbook) asks to bring this before 1.0 (annotations on Bar shipped in v0.9.8_6): its milestone stories (validator and project timelines — jails, renames, network halt) need labeled events on time series.</td>
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
            <td>Spatial hierarchy views — treemap, pack, sunburst, cluster — over the tree contract that shipped in v0.9.8_2 (see <a href="/charts/bar/hierarchical-bar/">Hierarchical Bar</a> for the linear outline and the node shape; <a href="/charts/circular/">Donut</a> drills the same tree).</td>
        </tr>
        <tr>
            <td>Scatter</td>
            <td><code>RareCharts.Scatter</code></td>
            <td>Two-metric point chart: <code>[{ x, y, label?, size?, color? }]</code> with optional size/color encoding, quadrant reference lines, and point labels. The workhorse of comparison analytics — risk vs. return, valuation vs. growth, any "rank N items on two axes" figure. <strong>Targeted for v0.9.8_8.</strong></td>
        </tr>
        <tr>
            <td>Heatmap</td>
            <td><code>RareCharts.Heatmap</code></td>
            <td>Matrix of <code>[{ row, column, value }]</code> cells colored by a diverging or sequential scale, with row/column labels and a cell tooltip. Covers sector-by-period performance grids and correlation matrices. <strong>Targeted for v0.9.8_8.</strong></td>
        </tr>
        <tr>
            <td>Waterfall</td>
            <td><code>RareCharts.Waterfall</code></td>
            <td>Sequential deltas from a start value to an end value with connector lines and subtotal steps — the earnings-bridge / P&amp;L-decomposition staple of financial reporting. <strong>Targeted for v0.9.8_8.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Composition &amp; stacking</h5>
                <p>Stacked bars ship on <code>Bar</code> in v0.9.8_2 — see <a href="/charts/bar/stacked-bar/">Stacked Bar</a> — and since v0.9.8_7 <a href="/charts/multi/">MultiChart</a> takes every chart type. Multi-series <code>Line</code> areas still overlap rather than accumulate; items below extend composition.</p>
            </td>
        </tr>
        <tr>
            <td>Stacked area</td>
            <td><code>stacked: true</code> on <code>RareCharts.Line</code> area series</td>
            <td>Accumulate multi-series areas instead of overlapping them, including a <code>'percent'</code> mode normalizing each slice to 100%. <strong>Targeted for v0.9.8_8.</strong></td>
        </tr>
        <tr>
            <td>Stacked bars on date slots</td>
            <td><code>[{ name, values: [{ date, value }] }]</code> on <code>RareCharts.Bar</code></td>
            <td>Extend the v0.9.8_2 categorical stack to the time-series bar mode: segments stacked per date slot, with the shared timeframe controls.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Scales &amp; transforms</h5>
            </td>
        </tr>
        <tr>
            <td>Series rebase / normalization</td>
            <td><code>normalize: 'rebase'&nbsp;|&nbsp;'percent'</code> on <code>RareCharts.Line</code></td>
            <td>Re-express every series relative to its value at the start of the visible window — rebase to 100 or cumulative percent change — so multi-asset comparisons share one axis. Recomputes on zoom/timeframe change, which is why it belongs in the chart rather than in data prep. <strong>Targeted for v0.9.8_9.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Bar series</h5>
            </td>
        </tr>
        <tr>
            <td>Value labels on Dual Axes bars</td>
            <td><code>showValues: true</code> on <code>RareCharts.DualAxes</code> bar series</td>
            <td><code>Bar</code> prints values at bar ends in every orientation (<code>showValues</code>, <code>valueFormat</code>; on vertical bars since v0.9.8_7). Extend it to the bar series of Dual Axes.</td>
        </tr>
        <tr>
            <td>Diverging bar chart</td>
            <td><code>RareCharts.DivergingBar</code></td>
            <td>Bar chart centered on a shared baseline for before/after, left/right, positive/negative, or category comparison layouts. <strong>Targeted for v0.9.8_8.</strong></td>
        </tr>

        <tr>
            <td>Collapsible HierarchicalBar rows</td>
            <td>collapse and expand on <code>RareCharts.HierarchicalBar</code></td>
            <td>Fold a branch of the outline into its parent row and open it again, so a long tree reads level by level. <strong>Targeted for v0.9.8_9.</strong></td>
        </tr>
        <tr>
            <td>HierarchicalBar drill-down</td>
            <td>a level or path in view, a way back up</td>
            <td>For deep trees: show one level at a time, with the path to it and a way back up, and an explicit change of scale between levels. Different from collapse and expand. <strong>Targeted for v0.9.8_9.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Map</h5>
            </td>
        </tr>
        <tr>
            <td>Map overlays and labels</td>
            <td><code>layers: [{ type, data, ... }]</code></td>
            <td>Add overlay layers to maps for extra information such as points, bubbles, labels, markers, or other contextual geographic annotations. Flows between places — routes, trade, capital — are already covered by <a href="/charts/map/flow/">MapFlow</a>.</td>
        </tr>
        <tr>
            <td>Links from map regions</td>
            <td><code>item.href</code></td>
            <td>Navigation straight from the data: a region whose item has an <code>href</code> opens it. Clicks already reach the page through <code>onRegionClick</code> (v0.9.8_7, see <a href="/charts/map/">Map</a>), which decides what to do.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Graph</h5>
            </td>
        </tr>
        <tr>
            <td>Graph ownership layout</td>
            <td><code>view: 'ownership'</code></td>
            <td>Add an optional deterministic hierarchy for ownership and control chains: owners above, controlled entities below, direction made explicit, and percentages or relation labels shown when supplied. It is a specialized presentation over the general graph contract, not a required ownership-specific schema.</td>
        </tr>
        <tr>
            <td>Graph cluster-view strategies</td>
            <td>configurable aggregation and layout</td>
            <td>Revisit <code>cluster</code> after relation filtering, richer edges and details are available. Explore pluggable strategies for community structure, industry roles, value chains, geography and ownership groups, with the current Louvain overview retained as a general default. Domain-specific grouping must be opt-in and may be supplied by the data source instead of inferred client-side.</td>
        </tr>
        <tr>
            <td>Graph tool icons</td>
            <td>icons</td>
            <td>The footer tools (zoom, full screen, <code>+N more</code>, restore), one-line breadcrumbs and text-like controls shipped in v0.9.8_3, and their dark theme in v0.9.8_7. Left: proper icons instead of text glyphs for the tools.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Interactivity</h5>
            </td>
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
</div>
