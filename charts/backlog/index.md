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
                <p>Options for marking up the chart area with reference context</p>
            </td>
        </tr>
        <tr>
            <td>Reference lines</td>
            <td><code>referenceLines: [{ value, axis, label, color, strokeDash }]</code></td>
            <td>Horizontal lines at specified Y values (or vertical at X values) with optional label. <code>axis: 'x' | 'y'</code>, defaults to <code>'y'</code>.</td>
        </tr>
        <tr>
            <td>Callouts and overlays</td>
            <td><code>annotations: [{ x, y, text, image }]</code></td>
            <td>Text callouts and image overlays anchored to data coordinates or pixel position on the chart area.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Chart structure</h5>
                <p>Extensions to the shared base layout rendered above and below the SVG area</p>
            </td>
        </tr>
        <tr>
            <td>Notes for charts</td>
            <td><code>note</code></td>
            <td>Renders a <code>&lt;p class="rc-chart-note"&gt;</code> below the source line, styled with <code>theme.muted</code>. Intended for disclaimers, data caveats, and editorial context. Accepts string or <code>HTMLElement</code>.</td>
        </tr>
        <tr>
            <td>Interactive data source</td>
            <td><code>source</code></td>
            <td>Allow <code>source</code> to accept <code>{ text, href }</code> in addition to plain string, rendering as an <code>&lt;a&gt;</code> tag for data attribution links.</td>
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

        <tr class="table-section">
            <td colspan="3">
                <h5>Graph</h5>
            </td>
        </tr>
        <tr>
            <td>Graph refactor</td>
            <td><code>RareCharts.Graph</code></td>
            <td>Rework the Graph class: fix layout and rendering issues, improve animation, and add support for nested or grouped graph structures.</td>
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