---
layout: page.njk
title: "Bar Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/'
---

Bar charts are the simplest and most reliable way to compare things. If you have categories and numbers, and you want people to understand the difference between them without decoding a visual puzzle, you use bars. Revenue by month. Product sales. Survey answers. Demographics. Anything where the question is basically “how much?” or “which one is bigger?”

The strength of a bar chart is that it relies on length. Humans are very good at comparing lengths. Longer bar means bigger value. Shorter bar means smaller value. No interpretation layer, no storytelling tricks. Just comparison.

<div id="bar-chart-revenue" class="text-content-caption card-dashboard-bordered"></div>

Orientation and reading comfort

The Bar chart supports two orientations: `vertical` (default) and `horizontal`. Vertical bars work well for short labels and compact comparisons. Horizontal bars are usually the better default when labels are long or when you want the chart to read like a ranked list.

In horizontal mode, the category axis is on the left and values run along the bottom. In vertical mode, categories sit at the bottom and values are on the right, which matches how most business dashboards place numeric scales.

<div class="text-content-width">
    <div id="bar-chart-coder-gender"></div>
</div>

### Data format

Bar expects a simple dataset:
<pre class="text-content-caption"><code>[
    { label: 'Sales', value: 128000 },
    { label: 'Marketing', value: 76000 },
    { label: 'R&D', value: 154000, color: '#00aaff' }   <span class="code-comment">// color is optional</span>
]</code></pre>

The library treats label as the category key, so it is used for scale domain, tick labels, and join keys during updates.

An item may also carry a `color`: that bar is filled with it instead of `barColor` (see Bar width and color below).

Values may be negative: the scale always includes zero, and bars grow from the zero baseline in both directions — below it in vertical mode, to the left of it in horizontal mode. Useful for P&amp;L by segment, period-over-period changes, and other signed comparisons.

A row whose `value` is missing or not a number keeps its category on the axis but draws no bar (and no value label).

Bar also supports a time-based mode, vertical only, when you pass `{ date, value }` points instead of categorical `{ label, value }` items:

<pre class="text-content-caption"><code>[
    { date: '2025-01-01', value: 128000 },
    { date: '2025-02-01', value: 142500 },
    { date: '2025-03-01', value: 119000 }
]</code></pre>

Dated rows need the default `orientation: 'vertical'`: horizontal bars have no date axis, so they draw such rows without labels and log one console warning.

In that mode the chart uses a time scale on the X axis, which means it can also expose the built-in timeframe controls:

<pre class="text-content-caption"><code>const chart = new RareCharts.Bar('#chart', {
    timeframes: true,
    defaultTimeframe: '1Y',
});

chart.setData(data);</code></pre>

Timeframe controls and the navigator apply only to the date-based vertical mode. Categorical rows, stacked series and `orientation: 'horizontal'` have no date axis: there the chart hides the buttons and the navigator strip, and `getView()` returns `null`.

There is a third shape: hand Bar series-major data `[{ name, values }]` and it switches into the stacked mode — segments per category, an auto-built legend, and a `'percent'` variant. See <a href="/charts/bar/stacked-bar/">Stacked Bar</a>.

### Bar width and color

By default a bar takes a fixed share of the space for its category, or, in the date-based mode, `barWidthRatio` of the smallest gap between dates. `barWidth` sets it in px instead: the width of a vertical bar, the thickness of a horizontal one, the whole column of a stacked bar. With categories (and stacked) the bar stays centred in its slot, so the axis labels do not move; in the date-based mode the time axis is inset by half a bar, so the bars and date labels shift inward a little as the width changes. A width larger than the space per category or date is cut to it: neighbouring bars touch but never overlap, which also keeps a fixed width sane on a phone. Anything that is not a positive number is ignored and the default applies.

A row's own `color` fills that bar; bars without one take `barColor`, then the theme accent. That is enough to pick out one bar (the current month, a record, an outlier) without a second series:

<pre class="text-content-caption"><code>new RareCharts.Bar('#chart', {
    barWidth: 18,
    barColor: '#cccccc',
}).setData([
    { label: 'Nov', value: 141000 },
    { label: 'Dec', value: 156000, color: '#00aaff' },
]);</code></pre>

<div id="bar-chart-highlight" class="text-content-caption card-dashboard-bordered"></div>

Colors follow the data: `setData` repaints a bar whose `color` changed, and a bar that lost its `color` goes back to `barColor`. Hover only dims a bar, so its color stays. The stacked mode ignores a value's `color`: segments always take their series color. Value labels inside horizontal bars are drawn in the theme background color, so a per-bar color should be dark enough to carry them.

In the date-based mode the time axis is inset by half a bar, so the first and last bars sit whole inside the plot.

### Long labels (without ruining the axis)

Real category labels are rarely “A, B, C”. They are usually “Dubai Marina - Contract Renewals (Enterprise)”. For that, Bar supports `labelMaxLength`, which truncates the rendered axis label to a fixed number of characters and adds an ellipsis. Importantly, the full label remains available via tooltip when the label was truncated, so you do not lose information, you just stop the axis from turning into a paragraph. On horizontal bars the left gutter grows to fit the longest label (after `labelMaxLength`) — never below 65px, at most 40% of the chart width; a label longer than that is cut with an ellipsis and keeps its full text in the tooltip. An explicit `margin.left` keeps the gutter as given.

This is one of those details you only miss when you do not have it.

### Value formatting and units

In vertical mode, the Y axis uses `yTickFormat`. If you do not provide it, Bar labels the ticks by the step between them — `0 0.5 1 1.5`, `145 150 155`, SI prefixes from 1,000 on with one prefix per axis (`0 0.5M 1M`), zero always as `0` — and supports `yPrefix` and `ySuffix` for units — in the categorical, date-based and stacked modes alike (a stacked `'percent'` axis keeps its own percent labels).

In horizontal mode, the X axis uses `xTickFormat` (the same default). If your values are money, percentages, or mixed units, pass explicit formatters. The chart will not guess what your business means by “1.2”. In the date-based mode `xTickFormat` formats the dates instead; by default the format follows the span in view, as on Time Series — `'%H:%M'` up to 36 hours (a tick at midnight names the day), `'%b %d'` up to 92 days (at most one tick per day), `'%b'` up to a year, `"%b '%y"` up to five years, `'%Y'` beyond.

Tooltips can be customized via `tooltipFormat: (d, info) => html`, where `d` is a copy of the row you passed — `label` as a string, `value` as a number; in the date-based mode `date` is a `Date` and `label` is `''` — with any extra fields, such as `color`; `info` holds the role fields every formatter gets — `{ label, value, color }`, in the date-based mode `{ date, value, color }`. By default it shows the label (the date in the date-based mode) and the value with comma formatting.

### Built-in timeframe controls

When the bar chart is running in time-based mode, the shared view API is available:

- `timeframes` renders the built-in range buttons in the chart header.
- `defaultTimeframe` selects the initial visible range and active button.
- `navigator: true` renders the built-in overview strip with a brush under the main chart.
- `setView([start, end])` sets any custom visible date window.
- `getView()` returns the currently visible `[start, end]`.
- `setTimeframe(key, { silent })` selects a timeframe from code, as a button click does.
- `onViewChange(fn)` calls `fn([start, end])` (Dates, clamped to the data; a window entirely outside the data is passed as given) after every view change — a button, the end of a navigator drag, `setTimeframe()` or `setView()` — unless that call passed `{ silent: true }`.

Example:

<pre class="text-content-caption"><code>const chart = new RareCharts.Bar('#chart', {
    timeframes: ['3M', '6M', '1Y', 'ALL'],
    defaultTimeframe: '1Y',
    navigator: true,
});</code></pre>

### Annotations

The date-based vertical mode takes the same `annotations` as <a href="/charts/line/">Line</a>: points and ranges on dates, lines and bands on values, mixed in one array. They are drawn over the bars on the chart’s own scales, follow timeframes, the navigator and `setView()`, and move with new data. The pointer passes through them, so a bar under a band still shows its tooltip. The full API is on the <a href="/charts/line/annotations/">Annotations</a> page.

<div id="bar-chart-dated-annotations" class="text-content-caption card-dashboard-bordered"></div>

<pre class="text-content-caption"><code>new RareCharts.Bar('#chart', {
    annotations: [
        { date: '2025-02-01', label: 'Price up' },
        <span class="code-comment">// half a month out on each side: the Jun–Aug bars are shaded whole</span>
        { from: '2025-05-16', to: '2025-08-16', label: 'Promo' },
        { value: 500, label: 'Target' },
    ],
}).setData(data);</code></pre>

Two details are specific to bars:

- A bar is centred on its date, so a range from the first to the last bar’s date covers only half of each end bar. Start and end the range half a period out to shade whole bars.
- Levels never widen the value axis: it spans the data and zero, rounded out to its ticks, as before. A level beyond the axis is not shown, and a band is cut at the edge of the plot.

The chart keeps room above the plot for the date labels (`annotationLabelHeight + 4` px); an explicit `margin.top` wins. Annotations need a date axis: categorical, stacked and horizontal bars do not draw them and log one console warning per chart.

### Showing values on bars (horizontal)

Horizontal bars have an optional “value labels” mode, because this is where it is actually useful. When enabled (`showValues: true`), the chart prints numeric labels at bar ends and automatically flips them inside the bar if there is not enough space near the edge of the chart — as long as the label fits inside. A label that fits neither way (a short bar near the edge, often a small negative value) stays outside, and the value axis widens to make room for it. This behavior is controlled by `valueInsideGap`, with spacing controlled by `valueOffset`, and the text itself by `valueFormat`. While the bars grow in, the labels fade in at their places.

This solves a classic annoyance: value labels that collide with the container edge or become unreadable when bars are short.

### Animation (if you must)

Bar can animate on first render (`animate: true` by default). The timing is controlled by duration, per-bar delay by stagger, and easing via `ease` (`cubicOut`, `cubicInOut`, or `linear`). The chart only animates once per instance by design, so it does not turn normal updates into a circus. Stacked segments fade in instead of growing, all together: `stagger` does not apply there. Renders that land in the middle of the animation — the font load and the first resize right after `setData`, a later resize or new data — carry it on to the new sizes instead of skipping to the end or starting over.

### Hiding axes and grid

Sometimes the cleanest chart is one with less chrome. All three visual layers — grid lines, X axis, and Y axis — can be independently hidden:

<pre class="text-content-caption"><code>showGrid:  false   <span class="code-comment">// no grid lines</span>
showXAxis: false   <span class="code-comment">// no bottom axis</span>
showYAxis: false   <span class="code-comment">// no side axis</span></code></pre>

This is especially useful inside a `MultiChart` when panels share the same category labels: suppress the Y axis on panels after the first to eliminate duplication and give bars more horizontal room.

### Quick example

<pre class="text-content-caption"><code>const d3 = RareCharts.d3;   <span class="code-comment">// the d3 bundled with RareCharts</span>

new RareCharts.Bar('#chart', {
  orientation: 'horizontal',
  height: 260,
  labelMaxLength: 18,
  showValues: true,
  valueFormat: d => d3.format(',.0f')(d.value),
}).setData(data);</code></pre>

## Bar chart options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

<div class="table-scroll card-caption">
<table class="table-bordered">
    <thead>
        <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="4"><h5>Layout</h5></td>
        </tr>
        <tr>
            <td><code>height</code></td>
            <td>number</td>
            <td><code>200</code></td>
            <td>Chart height in px, the whole card: title, legend, timeframe buttons, navigator and footer come out of it, and the plot gets what is left. On a narrow card they wrap and take more, so leave the plot room. Width is always 100% of the container.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td>vertical <code>{12, 65, 8, 0}</code>, horizontal <code>{12, 0, 16, 65}</code></td>
            <td>
                Inner padding <code>{top, right, bottom, left}</code>.<br>
                The 65px gutter holds the value axis (right, vertical) or the category labels (left, horizontal — it grows to the longest label, up to 40% of the width) and collapses when that axis is hidden; the bottom one collapses with the X axis.<br>
                With <code>annotations</code> on vertical bars, top grows to <code>annotationLabelHeight + 4</code> to fit their labels. Each side you set explicitly wins.
            </td>
        </tr>
        <tr>
            <td><code>orientation</code></td>
            <td><code>'vertical'</code> | <code>'horizontal'</code></td>
            <td><code>'vertical'</code></td>
            <td>Bar direction. Horizontal works best for long category labels and ranked lists.</td>
        </tr>
        <tr>
            <td><code>timeframes</code></td>
            <td>boolean | array</td>
            <td>—</td>
            <td>Built-in timeframe buttons for date-based vertical bars. Pass <code>true</code> to use the default set <code>['1M', '3M', '6M', '1Y', '2Y', 'ALL']</code>. Categorical, stacked and horizontal bars have no date axis and hide them.</td>
        </tr>
        <tr>
            <td><code>defaultTimeframe</code></td>
            <td>string | object</td>
            <td>—</td>
            <td>Initial active timeframe used when the chart is in date-based mode.</td>
        </tr>
        <tr>
            <td><code>defaultView</code></td>
            <td>array</td>
            <td>—</td>
            <td>Initial visible date range as <code>[from, to]</code> (date-based mode). An explicit alternative to <code>defaultTimeframe</code>; clamped to the data extent.</td>
        </tr>
        <tr>
            <td><code>navigator</code></td>
            <td>boolean | object</td>
            <td>—</td>
            <td>Built-in overview strip with brush selection under date-based vertical bars. Categorical, stacked and horizontal bars hide it.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Annotations (date-based vertical mode)</h5></td>
        </tr>
        <tr>
            <td><code>annotations</code></td>
            <td>array</td>
            <td>—</td>
            <td>Event markers and reference levels, as on <code>Line</code>: vertical (<code>date</code>, <code>from</code>/<code>to</code>) and horizontal (<code>value</code>, <code>yFrom</code>/<code>yTo</code>) entries in one array. A range spans bar centres; levels outside the value axis are not shown. Categorical, stacked and horizontal bars ignore them with one console warning. See <a href="/charts/line/annotations/">Annotations</a>.</td>
        </tr>
        <tr>
            <td><code>annotationLabelHeight</code></td>
            <td>number</td>
            <td><code>22</code></td>
            <td>Pixels reserved above the chart for vertical annotation labels.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Bar style</h5></td>
        </tr>
        <tr>
            <td><code>barColor</code></td>
            <td>CSS color</td>
            <td>theme accent</td>
            <td>Fill for bars without their own <code>color</code> (single-series modes).</td>
        </tr>
        <tr>
            <td><code>barWidth</code></td>
            <td>number</td>
            <td>—</td>
            <td>
                Bar width in px: the thickness in horizontal mode, the whole column when stacked. Overrides the default width and <code>barWidthRatio</code>; with categories the bar stays centred in its slot.<br>
                Capped at the space per category or date, so neighbouring bars touch but never overlap. Anything that is not a positive number is ignored.
            </td>
        </tr>
        <tr>
            <td><code>barWidthRatio</code></td>
            <td>number</td>
            <td><code>0.72</code></td>
            <td>Bar width as a fraction of the smallest gap between dates in the date-based mode, kept within 2–48px. Ignored when <code>barWidth</code> is set.</td>
        </tr>
        <tr>
            <td><code>labelMaxLength</code></td>
            <td>number</td>
            <td>—</td>
            <td>
                Truncate axis labels to N characters and add an ellipsis.<br>
                The full label is still shown in the tooltip on hover. The horizontal label gutter is measured on the shortened labels.
            </td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Animation</h5></td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Animate bars on first render. Plays only once per chart instance. Stacked segments fade in instead of growing; value labels fade in at their places. A render in the middle of it (font load, resize, new data) carries it on.</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td>number</td>
            <td><code>500</code></td>
            <td>Animation duration in ms.</td>
        </tr>
        <tr>
            <td><code>stagger</code></td>
            <td>number</td>
            <td><code>0</code></td>
            <td>Per-bar delay in ms — creates a staggered cascade effect. Categorical and date-based modes; stacked segments fade in together.</td>
        </tr>
        <tr>
            <td><code>ease</code></td>
            <td>string</td>
            <td><code>'cubicOut'</code></td>
            <td>Easing: <code>'cubicOut'</code>, <code>'cubicInOut'</code>, <code>'linear'</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Value labels (horizontal mode only)</h5></td>
        </tr>
        <tr>
            <td><code>showValues</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Print numeric labels at bar ends.</td>
        </tr>
        <tr>
            <td><code>valueFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td>
                <code>(d, info) =&gt; string</code> — <code>d</code> is the row, <code>info</code> is <code>{ label, value, color }</code>, as for <code>tooltipFormat</code>.<br>
                Default: comma-formatted integer.
            </td>
        </tr>
        <tr>
            <td><code>valueOffset</code></td>
            <td>number</td>
            <td><code>6</code></td>
            <td>Distance in px between the bar end and the label.</td>
        </tr>
        <tr>
            <td><code>valueInsideGap</code></td>
            <td>number</td>
            <td><code>42</code></td>
            <td>
                When space past the bar end is below this px threshold, the label flips inside the bar — if it fits there; otherwise it stays outside and the axis widens to fit it.
            </td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Axis formatting</h5></td>
        </tr>
        <tr>
            <td><code>yTickFormat</code></td>
            <td>function</td>
            <td>by tick step</td>
            <td><code>(value) =&gt; string</code> — Y axis tick labels in vertical mode. Default: by the step between ticks — <code>,~f</code> below 1,000, SI <code>~s</code> (one prefix per axis) from 1,000, <code>0</code> for zero.</td>
        </tr>
        <tr>
            <td><code>yPrefix</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Prefix for the default Y labels in vertical mode — categorical, date-based and stacked, not <code>'percent'</code> (e.g. <code>'$'</code>).</td>
        </tr>
        <tr>
            <td><code>ySuffix</code></td>
            <td>string</td>
            <td><code>''</code></td>
            <td>Suffix for the default Y labels in vertical mode — categorical, date-based and stacked, not <code>'percent'</code>.</td>
        </tr>
        <tr>
            <td><code>xTickFormat</code></td>
            <td>function</td>
            <td>by tick step (dates: by span)</td>
            <td><code>(value) =&gt; string</code> — X axis tick labels in horizontal mode, the same default as <code>yTickFormat</code>. In the date-based mode it formats the dates: <code>'%H:%M'</code> up to 36 hours (a tick at midnight names the day), <code>'%b %d'</code> up to 92 days, <code>'%b'</code> up to a year, <code>"%b '%y"</code> up to five years, <code>'%Y'</code> beyond.</td>
        </tr>
        <tr>
            <td><code>xTicks</code></td>
            <td>number</td>
            <td><code>4</code> (dates: <code>6</code>)</td>
            <td>Approximate tick count on the X axis: the value axis in horizontal mode, the time axis in the date-based mode. d3 picks round steps; stacked bars divide the axis into exactly this many intervals.</td>
        </tr>
        <tr>
            <td><code>xTickValues</code></td>
            <td>array</td>
            <td>—</td>
            <td>Explicit X tick positions in horizontal mode.</td>
        </tr>
        <tr>
            <td><code>yTicks</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Approximate number of Y ticks in vertical mode — d3 picks round steps, so <code>4</code> can give 6 marks. Stacked bars divide the axis into exactly this many intervals.</td>
        </tr>
        <tr>
            <td><code>yTickValues</code></td>
            <td>array</td>
            <td>—</td>
            <td>Explicit Y tick positions in vertical mode. Overrides <code>yTicks</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Visibility</h5></td>
        </tr>
        <tr>
            <td><code>showGrid</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Show grid lines.</td>
        </tr>
        <tr>
            <td><code>showXAxis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>
                Show the X axis.<br>
                Horizontal: numeric (value) axis at the bottom.<br>
                Vertical: category axis at the bottom.<br>
                Hiding it also collapses the bottom margin, so the bars run flush.
            </td>
        </tr>
        <tr>
            <td><code>showYAxis</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>
                Show the Y axis.<br>
                Horizontal: category labels on the left.<br>
                Vertical: numeric labels on the right.<br>
                Hiding it also collapses its side margin, so the bars run flush. An explicit <code>margin</code> always wins.
            </td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td>
                <code>(d, info) =&gt; html</code> where <code>d</code> is a copy of the row: <code>label</code> as a string, <code>value</code> as a number (in the date-based mode <code>date</code> is a <code>Date</code> and <code>label</code> is <code>''</code>), with any extra fields, such as <code>color</code>; <code>info</code> is <code>{ label, value, color }</code> — in the date-based mode <code>{ date, value, color }</code> — with <code>color</code> as drawn (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>). Stacked bars pass a segment — see <a href="/charts/bar/stacked-bar/">Stacked Bar</a>.<br>
                Default shows the label (or the date) and the comma-formatted value.
            </td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-revenue.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-highlight.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-coder-gender.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-dated-annotations.js"></script>
