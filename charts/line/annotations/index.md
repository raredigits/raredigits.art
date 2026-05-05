---
layout: page.njk
title: "Annotations"
section: "Charts"
displaySidebar: true
permalink: '/charts/line/annotations/'
---

A line chart shows the trend. Annotations explain *why* the trend bent — and what it should be measured against. They are reference markers placed on the chart’s axes: a halving date, a product release, a break-even level, a target band. Without them, the reader is left to guess which kink in the line corresponds to which event, or whether the current value is good or bad.

RareCharts supports four kinds of annotations within a single `annotations` array:

- **Point** — a single date with a label. Drawn as a vertical line spanning the full plot height, with the label in the reserved area above the chart.
- **Range** — a date range with optional fill. Drawn as a translucent band between two boundary lines. Useful for periods (a bear market, a freeze window, an A/B test).
- **Horizontal line** — a reference level at a Y value. Drawn as a horizontal line spanning the full plot width, with an inline label. Useful for break-even, targets, KPI thresholds.
- **Horizontal band** — a Y-value range with optional fill. Useful for tolerance windows or “acceptable range” bands.

Annotations are supported on `Line`, `DualAxes`, and `TimeSeries` charts. The kind is inferred from which fields are present — `date`, `from/to`, `value`, or `yFrom/yTo`.

<div class="card-dashboard-bordered text-content-caption">
    <div id="btc-price-chart"></div>
</div>

The chart above combines all three common cases: a point annotation on the 4th BTC halving (2024-04-19), a range annotation for the post-election rally window, and a horizontal line at the $100k psychological level. All three are out-of-the-box visuals — no custom SVG, no overlays. The chart automatically reserves vertical space above the plot for the date labels.

### Configuration

Pass an `annotations` array on the chart options. Each entry is one of four kinds, inferred from its fields:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
    height: 360,
    annotations: [
        // Point — vertical line at a date
        {
            date:  '2024-04-19',
            label: '4th Halving',
            color: '#888',
        },
        // Range — vertical band between two dates
        {
            from:        '2024-11-05',
            to:          '2025-01-20',
            label:       'Post-election rally',
            color:       '#00c97a',
            fillOpacity: 0.06,
        },
        // Horizontal line — reference level at a Y value
        {
            value:         100_000,
            label:         '$100k',
            color:         '#fa8c16',
            labelPosition: 'left',
        },
        // Horizontal band — between two Y values
        {
            yFrom:       80_000,
            yTo:         100_000,
            label:       'Support zone',
            fillOpacity: 0.05,
        },
    ],
}).setData(values);</code></pre>

Dates accept any format understood by the chart’s date parser: ISO strings, timestamps, or `Date` objects. Y values are plain numbers in the same units as the data series.

### Horizontal annotations vs. constant series

The classic way to draw a reference level is to add a series with a constant value. That works, but it has costs: the constant series stretches the Y domain (a far-out break-even pulls the axis), shows up in the crosshair tooltip on every point, and clutters the legend.

Horizontal annotations sidestep all of that. They’re purely visual — they don’t participate in domain calculation, they don’t appear in the tooltip, and they don’t belong to the legend. Use them for break-even lines, KPI targets, support/resistance levels, tolerance bands.

### DualAxes — choosing an axis

For a `DualAxes` chart, horizontal annotations need to specify which Y axis they reference:

<pre class="text-content-caption"><code>new RareCharts.DualAxes('#chart', {
    annotations: [
        { value: 14.50, axis: 'y2', label: 'Break-even, USD' },
        { value: 100_000, axis: 'y1', label: 'BTC $100k' },
    ],
});</code></pre>

`axis` defaults to `'y1'`. Vertical (date-based) annotations don’t need this — they span both axes by definition.

### Layout

Labels are rendered *above* the plot area. The chart automatically pushes its top margin down by `annotationLabelHeight + 4` pixels when at least one annotation is configured, so labels never collide with the line. The default height is `22`. Override it when you need taller labels (multi-line, larger font) or want to compact the layout:

<pre class="text-content-caption"><code>new RareCharts.Line('#chart', {
    annotations: [{ date: '2024-04-19', label: '4th Halving' }],
    annotationLabelHeight: 28,
});</code></pre>

If you provide an explicit `margin.top` it will be respected — but you must reserve enough room yourself.

### View clipping

Annotations whose date(s) fall outside the visible X extent are skipped automatically. This is the expected behavior when used together with `timeframes`, `navigator`, or `setView()`: as the user zooms or pans, in-range annotations appear and out-of-range ones disappear. For range annotations partially visible, the fill is clamped to the visible portion and only the boundary line(s) inside the extent are drawn.

### Styling

Annotations inherit the muted theme color by default so they don’t compete with the data. Per-annotation overrides:

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="4"><h5>Point annotation</h5></td>
        </tr>
        <tr>
            <td><code>date</code></td>
            <td>Date | string | number</td>
            <td>—</td>
            <td>Required. The X position of the marker.</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Text rendered above the chart. Empty string suppresses the label, line stays visible.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td><code>theme.muted</code></td>
            <td>Stroke color of the vertical line and default label color.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string</td>
            <td><code>'dashed'</code></td>
            <td>Line pattern: <code>'solid'</code>, <code>'dashed'</code>, <code>'dotted'</code>, <code>'dashDot'</code>, <code>'longDash'</code>.</td>
        </tr>
        <tr>
            <td><code>labelColor</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Label text color, when you want it different from the line.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Range annotation</h5></td>
        </tr>
        <tr>
            <td><code>from</code></td>
            <td>Date | string | number</td>
            <td>—</td>
            <td>Required. Range start.</td>
        </tr>
        <tr>
            <td><code>to</code></td>
            <td>Date | string | number</td>
            <td>—</td>
            <td>Required. Range end. If <code>to &lt; from</code>, they are swapped.</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Text rendered above the chart, centered over the visible portion of the range.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td><code>theme.muted</code></td>
            <td>Boundary line color and default fill color.</td>
        </tr>
        <tr>
            <td><code>fill</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Background fill of the band when you want it independent from the boundary color.</td>
        </tr>
        <tr>
            <td><code>fillOpacity</code></td>
            <td>number</td>
            <td><code>0.08</code></td>
            <td>Opacity of the fill band, <code>0</code>–<code>1</code>.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string</td>
            <td><code>'dashed'</code></td>
            <td>Boundary line pattern.</td>
        </tr>
        <tr>
            <td><code>labelColor</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Label text color override.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Horizontal line</h5></td>
        </tr>
        <tr>
            <td><code>value</code></td>
            <td>number</td>
            <td>—</td>
            <td>Required. The Y position of the reference line.</td>
        </tr>
        <tr>
            <td><code>axis</code></td>
            <td><code>'y1'</code> | <code>'y2'</code></td>
            <td><code>'y1'</code></td>
            <td>Which Y axis the value belongs to. Only relevant for <code>DualAxes</code>.</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Text rendered inline next to the line.</td>
        </tr>
        <tr>
            <td><code>labelPosition</code></td>
            <td><code>'left'</code> | <code>'right'</code></td>
            <td><code>'left'</code></td>
            <td>Which end of the line the label is anchored to. Pick <code>'right'</code> if your Y axis is on the left and the right edge is free.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td><code>theme.muted</code></td>
            <td>Stroke color and default label color.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string</td>
            <td><code>'dashed'</code></td>
            <td>Line pattern.</td>
        </tr>
        <tr>
            <td><code>labelColor</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Label text color override.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Horizontal band</h5></td>
        </tr>
        <tr>
            <td><code>yFrom</code></td>
            <td>number</td>
            <td>—</td>
            <td>Required. Lower Y value of the band.</td>
        </tr>
        <tr>
            <td><code>yTo</code></td>
            <td>number</td>
            <td>—</td>
            <td>Required. Upper Y value. Order is normalized.</td>
        </tr>
        <tr>
            <td><code>axis</code></td>
            <td><code>'y1'</code> | <code>'y2'</code></td>
            <td><code>'y1'</code></td>
            <td>Which Y axis the values belong to.</td>
        </tr>
        <tr>
            <td><code>label</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Text rendered inline at the top edge of the band.</td>
        </tr>
        <tr>
            <td><code>labelPosition</code></td>
            <td><code>'left'</code> | <code>'right'</code></td>
            <td><code>'left'</code></td>
            <td>Which end of the band the label is anchored to.</td>
        </tr>
        <tr>
            <td><code>color</code></td>
            <td>CSS color</td>
            <td><code>theme.muted</code></td>
            <td>Boundary line color and default fill color.</td>
        </tr>
        <tr>
            <td><code>fill</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Background fill of the band when independent from the boundary color.</td>
        </tr>
        <tr>
            <td><code>fillOpacity</code></td>
            <td>number</td>
            <td><code>0.08</code></td>
            <td>Opacity of the fill band, <code>0</code>–<code>1</code>.</td>
        </tr>
        <tr>
            <td><code>strokeDash</code></td>
            <td>string</td>
            <td><code>'dashed'</code></td>
            <td>Boundary line pattern.</td>
        </tr>
        <tr>
            <td><code>labelColor</code></td>
            <td>CSS color</td>
            <td>same as <code>color</code></td>
            <td>Label text color override.</td>
        </tr>
    </tbody>
</table>

### Chart-level options

<table class="table-bordered card-caption">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>annotations</code></td>
            <td>array</td>
            <td>—</td>
            <td>Array of point and/or range annotations. Mixed entries are allowed.</td>
        </tr>
        <tr>
            <td><code>annotationLabelHeight</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Pixels reserved above the chart for annotation labels. Increase if labels are clipped, decrease for a tighter layout.</td>
        </tr>
    </tbody>
</table>

### When to use them

Annotations are content, not decoration. A good annotation answers a question the chart raises:

- “Why did hashrate drop in April 2024?” → halving annotation.
- “Why did revenue plateau in Q3?” → range covering the marketing freeze.
- “When did the new pricing roll out?” → point on launch day.

Avoid annotating every minor event. The chart starts to look like a footnote index, and the reader stops reading them. Three or four well-chosen markers are usually enough — the rest belongs in the article body.

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/line/btc-price-chart.js"></script>
