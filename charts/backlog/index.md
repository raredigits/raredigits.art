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
            <td>Spatial hierarchy views — treemap, pack, sunburst, cluster — over the tree contract that shipped in v0.9.8_2 (see <a href="/charts/bar/hierarchical-bar/">Hierarchical Bar</a> for the linear outline and the node shape; <a href="/charts/circular/">Donut</a> drills the same tree).</td>
        </tr>
        <tr>
            <td>Scatter</td>
            <td><code>RareCharts.Scatter</code></td>
            <td>Two-metric point chart: <code>[{ x, y, label?, size?, color? }]</code> with optional size/color encoding, quadrant reference lines, and point labels. The workhorse of comparison analytics — risk vs. return, valuation vs. growth, any "rank N items on two axes" figure. <strong>Targeted for v0.9.8_3.</strong></td>
        </tr>
        <tr>
            <td>Heatmap</td>
            <td><code>RareCharts.Heatmap</code></td>
            <td>Matrix of <code>[{ row, column, value }]</code> cells colored by a diverging or sequential scale, with row/column labels and a cell tooltip. Covers sector-by-period performance grids and correlation matrices. <strong>Targeted for v0.9.8_3.</strong></td>
        </tr>
        <tr>
            <td>Waterfall</td>
            <td><code>RareCharts.Waterfall</code></td>
            <td>Sequential deltas from a start value to an end value with connector lines and subtotal steps — the earnings-bridge / P&amp;L-decomposition staple of financial reporting. <strong>Targeted for v0.9.8_3.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Composition &amp; stacking</h5>
                <p>Stacked bars ship on <code>Bar</code> in v0.9.8_2 — see <a href="/charts/bar/stacked-bar/">Stacked Bar</a>. Multi-series <code>Line</code> areas still overlap rather than accumulate; items below extend composition.</p>
            </td>
        </tr>
        <tr>
            <td>Stacked area</td>
            <td><code>stacked: true</code> on <code>RareCharts.Line</code> area series</td>
            <td>Accumulate multi-series areas instead of overlapping them, including a <code>'percent'</code> mode normalizing each slice to 100%. <strong>Targeted for v0.9.8_3.</strong></td>
        </tr>
        <tr>
            <td>Stacked bars on date slots</td>
            <td><code>[{ name, values: [{ date, value }] }]</code> on <code>RareCharts.Bar</code></td>
            <td>Extend the v0.9.8_2 categorical stack to the time-series bar mode: segments stacked per date slot, with the shared timeframe controls.</td>
        </tr>
        <tr>
            <td>All chart types in MultiChart</td>
            <td><code>type: 'Donut' | 'Gauge' | 'DualAxes' | ...</code> in <code>charts</code> descriptors</td>
            <td>Extend the <code>MultiChart</code> composition grid beyond <code>Line</code> and <code>Bar</code> to every chart class, and warn on an unknown <code>type</code> instead of silently falling back to <code>Line</code>. Unblocks mixed dashboard blocks — a KPI gauge next to a trend line under one shared header. <strong>Targeted for v0.9.8_4.</strong></td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Scales &amp; transforms</h5>
            </td>
        </tr>
        <tr>
            <td>Logarithmic Y scale</td>
            <td><code>yScale: 'log'</code> on <code>Line</code> / <code>TimeSeries</code> / <code>DualAxes</code></td>
            <td>Log-scale toggle for long-horizon price and index series, where a linear scale visually overstates recent moves. Requires positive-domain guards and log-aware tick generation. <strong>Targeted for v0.9.8_4.</strong></td>
        </tr>
        <tr>
            <td>Series rebase / normalization</td>
            <td><code>normalize: 'rebase'&nbsp;|&nbsp;'percent'</code> on <code>RareCharts.Line</code></td>
            <td>Re-express every series relative to its value at the start of the visible window — rebase to 100 or cumulative percent change — so multi-asset comparisons share one axis. Recomputes on zoom/timeframe change, which is why it belongs in the chart rather than in data prep. <strong>Targeted for v0.9.8_4.</strong></td>
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
            <td>Bar chart centered on a shared baseline for before/after, left/right, positive/negative, or category comparison layouts. <strong>Targeted for v0.9.8_3.</strong></td>
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
            <td>Directed and multiple graph relations</td>
            <td>optional edge direction, identity and labels</td>
            <td>Support directed relations and multiple simultaneous relations between the same pair of nodes. Allow optional edge labels and values such as ownership percentages, while keeping the minimum link payload at <code>{ source, target }</code>. Direction, relation IDs, percentages and other domain fields must enrich the result when present, not become required input.</td>
        </tr>
        <tr>
            <td>Graph details panel</td>
            <td>node and relation details surface</td>
            <td>Add a proper HTML details surface for a selected node or relation. It should show whatever metadata is available — relation type, share, dates, source, confidence and the full filterable connection list — without requiring any of those fields. The hover tooltip remains a compact summary and links to the details surface when more information exists.</td>
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
            <td>Graph chrome styling</td>
            <td>zoom controls, capacity note, navigation</td>
            <td>Align the +/−/⟲ zoom buttons, actionable <code>+N more</code> disclosure, breadcrumbs and details controls with Rare Styles: proper icons, spacing, positioning, focus and hover states, responsive behavior, and dark-theme support.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Interactivity</h5>
            </td>
        </tr>
        <tr>
            <td>Legend series isolation</td>
            <td><code>legendInteractive: true</code></td>
            <td>Clicking a legend item isolates that series. All others are dimmed. Clicking the active item or double-clicking restores all series. <strong>Targeted for v0.9.8_4.</strong></td>
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
