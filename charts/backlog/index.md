---
layout: page.njk
title: "Charts Backlog"
section: "Charts"
displaySidebar: true
permalink: '/charts/backlog/'
---

Features and chart types planned for future releases.

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
                <p>Stacked bars ship on <code>Bar</code> in v0.9.8_2 — see <a href="/charts/bar/stacked-bar/">Stacked Bar</a>. Multi-series <code>Line</code> areas still overlap rather than accumulate; items below extend composition.</p>
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
        <tr>
            <td>All chart types in MultiChart</td>
            <td><code>type: 'Donut' | 'Gauge' | 'DualAxes' | ...</code> in <code>charts</code> descriptors</td>
            <td>Extend the <code>MultiChart</code> composition grid beyond <code>Line</code> and <code>Bar</code> to every chart class (an unknown <code>type</code> already warns and draws a <code>Line</code> since v0.9.8_6). Unblocks mixed dashboard blocks — a KPI gauge next to a trend line under one shared header. <strong>Targeted for v0.9.8_9.</strong></td>
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
            <td>Bar value labels on vertical bars and Dual Axes</td>
            <td><code>showValues: true</code> on vertical <code>RareCharts.Bar</code> / <code>RareCharts.DualAxes</code> bars</td>
            <td>Horizontal Bar already prints values at bar ends (<code>showValues</code>, <code>valueFormat</code>; short and negative bars keep their labels since v0.9.8_4_1). Extend it to vertical bars — above positive bars, below negative ones — and to the bar series of Dual Axes.</td>
        </tr>
        <tr>
            <td>Diverging bar chart</td>
            <td><code>RareCharts.DivergingBar</code></td>
            <td>Bar chart centered on a shared baseline for before/after, left/right, positive/negative, or category comparison layouts. <strong>Targeted for v0.9.8_8.</strong></td>
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
            <td>icons, dark theme</td>
            <td>The footer tools (zoom, full screen, <code>+N more</code>, restore), one-line breadcrumbs and text-like controls shipped in v0.9.8_3. Left: proper icons instead of text glyphs for the tools, and a dark-theme pass over the tools, the hidden-node list and the details panel.</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Time Series: analytics ranges</h5>
                <p>Requested by a donor for a website traffic report on <code>RareCharts.TimeSeries</code>: visits per hour, day and month, aggregated on the server. <strong>Targeted for v0.9.8_7.</strong> Charts that do not set the new options keep their current behaviour. The API sketches are provisional.</p>
            </td>
        </tr>
        <tr>
            <td>Calendar presets anchored to now</td>
            <td><code>timeframeAnchor: 'now' | 'dataEnd'</code> (default <code>'dataEnd'</code>); keys <code>TODAY</code>, <code>WTD</code> (with <code>weekStart</code>), <code>MTD</code>, <code>YTD</code>, rolling <code>24H</code>, <code>7D</code>, <code>30D</code>, <code>12M</code></td>
            <td>Presets now count back from the last data point in rolling units, so <code>1D</code> means 24 hours before the last point, not today. Calendar keys start at the beginning of the day, week, month or year in the chart's time zone; rolling keys stay rolling.</td>
        </tr>
        <tr>
            <td>Resolution follows the window</td>
            <td><code>onTimeframeChange(({ key, extent }) =&gt; Promise&lt;data&gt;)</code> with a loading state, or <code>setData({ hour, day, week, month })</code> with <code>resolution: { maxPoints }</code></td>
            <td>Switching from Year to Today shows hourly buckets instead of zooming into the daily series. The navigator keeps the full range at the coarse resolution. Each switch fires one callback with the key and the extent; buttons and brush stay in sync.</td>
        </tr>
        <tr>
            <td>Custom range</td>
            <td>A <em>Custom</em> control in the range bar with from / to date inputs; key <code>'CUSTOM'</code>; can be turned off</td>
            <td>Goes the same way as the preset buttons (<code>setView</code> and <code>onTimeframeChange</code>) and is styled by the library, so a page gets <em>Today / Week / Month / Year / All time / Custom</em> from options alone, without rebuilding the chart.</td>
        </tr>
        <tr>
            <td>A time zone</td>
            <td><code>timeZone: 'UTC' | 'local'</code> — the default <code>xTickFormat</code> by visible span shipped in v0.9.8_6 (<code>%H:%M</code>, <code>%b %d</code>, <code>%b</code>, <code>%b '%y</code>, <code>%Y</code>)</td>
            <td>One zone for parsing, ticks, tooltips and preset boundaries. Today a <code>'YYYY-MM-DD'</code> string is read as UTC midnight while presets compute in local time, so month buckets shift west of UTC; <code>'1M'</code> from 31 March also overflows to 2 March. The span-aware default tick format shipped in v0.9.8_6; its ticks will follow the zone this item picks.</td>
        </tr>
        <tr>
            <td>Comparison series</td>
            <td><code>compare: 'previousPeriod'</code> or a second series</td>
            <td>The same metric for the previous period of equal length, aligned to the current window and drawn as a dashed line without area ("this week vs last week"). The tooltip shows it next to the main value.</td>
        </tr>
        <tr>
            <td>Counts and gaps</td>
            <td><code>yFormat: 'number'</code> as on <code>Line</code>; <code>gaps: 'zero' | 'break'</code></td>
            <td>The default y format is dollars (<code>'$' + ',.0f'</code>); a count option keeps that default for existing charts. Missing buckets drawn as zero or as a break in the line (today a missing value is dropped and the line joins its neighbours).</td>
        </tr>

        <tr class="table-section">
            <td colspan="3">
                <h5>Interactivity</h5>
            </td>
        </tr>
        <tr>
            <td>Legend series isolation</td>
            <td><code>legendInteractive: true</code></td>
            <td>Clicking a legend item isolates that series. All others are dimmed. Clicking the active item or double-clicking restores all series. <strong>Targeted for v0.9.8_9.</strong></td>
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
