---
layout: page.njk
title: "Bar Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/'
---

Bar charts are the simplest and most reliable way to compare things. If you have categories and numbers, and you want people to understand the difference between them without decoding a visual puzzle, you use bars. Revenue by month. Product sales. Survey answers. Demographics. Anything where the question is basically “how much?” or “which one is bigger?”

The strength of a bar chart is that it relies on length. Humans are very good at comparing lengths. Longer bar means bigger value. Shorter bar means smaller value. No interpretation layer, no storytelling tricks. Just comparison.

<div class="text-content-caption card-dashboard-bordered">
    <div id="bar-chart-revenue"></div>
</div>

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
    { label: 'R&D', value: 154000 }
]</code></pre>

The library treats label as the category key, so it is used for scale domain, tick labels, and join keys during updates.

### Long labels (without ruining the axis)

Real category labels are rarely “A, B, C”. They are usually “Dubai Marina - Contract Renewals (Enterprise)”. For that, Bar supports `labelMaxLength`, which truncates the rendered axis label to a fixed number of characters and adds an ellipsis. Importantly, the full label remains available via tooltip when the label was truncated, so you do not lose information, you just stop the axis from turning into a paragraph.

This is one of those details you only miss when you do not have it.

### Value formatting and units

In vertical mode, the Y axis uses `yTickFormat`. If you do not provide it, Bar falls back to a compact number formatter and supports `yPrefix` and `ySuffix` for units.

In horizontal mode, the X axis uses `xTickFormat` (again, compact by default). If your values are money, percentages, or mixed units, pass explicit formatters. The chart will not guess what your business means by “1.2”.

Tooltips can be customized via `tooltipFormat (d) => html`, where `d` is `{ label, value }`. By default it shows the label and the value with comma formatting.

### Showing values on bars (horizontal)

Horizontal bars have an optional “value labels” mode, because this is where it is actually useful. When enabled (`showValues: true`), the chart prints numeric labels at bar ends and automatically flips them inside the bar if there is not enough space near the right edge. This behavior is controlled by `valueInsideGap`, with spacing controlled by `valueOffset`, and the text itself by `valueFormat`.

This solves a classic annoyance: value labels that collide with the container edge or become unreadable when bars are short.

### Animation (if you must)

Bar can animate on first render (`animate: true` by default). The timing is controlled by duration, per-bar delay by stagger, and easing via `ease` (`cubicOut`, `cubicInOut`, or `linear`). The chart only animates once per instance by design, so it does not turn normal updates into a circus.

### Quick example

<pre class="text-content-caption"><code>new RareCharts.Bar('#chart', {
  orientation: 'horizontal',
  height: 260,
  labelMaxLength: 18,
  showValues: true,
  valueFormat: d => d3.format(',.0f')(d.value),
  xTickFormat: d => d3.format('.2s')(d),
}).setData(data);</code></pre>

<div class="card collapsible-container">
    <p>
        <span class="section-icon material-icons-outlined">code</span>
        <span class="collapsible-trigger">
            Options reference
            <span class="collapsible-icon material-icons-outlined">keyboard_arrow_down</span>
        </span>
    </p>
    <div class="collapsible-content">
        <p>
            Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>legend</code>, <code>legendPosition</code>, <code>source</code>, <code>theme</code>)
            are documented on the <a href="/charts/settings/">Settings</a> page.
        </p>
        <br>
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
                <tr>
                    <td colspan="4"><h5>Layout</h5></td>
                </tr>
                <tr>
                    <td><code>height</code></td>
                    <td>number</td>
                    <td><code>200</code></td>
                    <td>Chart height in px. Width is always 100% of the container.</td>
                </tr>
                <tr>
                    <td><code>margin</code></td>
                    <td>object</td>
                    <td>—</td>
                    <td>
                        Inner padding <code>{top, right, bottom, left}</code>.<br>
                        Adjusts automatically by orientation — left is wider in horizontal mode, right is wider in vertical.
                    </td>
                </tr>
                <tr>
                    <td><code>orientation</code></td>
                    <td><code>'vertical'</code> | <code>'horizontal'</code></td>
                    <td><code>'vertical'</code></td>
                    <td>Bar direction. Horizontal works best for long category labels and ranked lists.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Bar style</h5></td>
                </tr>
                <tr>
                    <td><code>barColor</code></td>
                    <td>CSS color</td>
                    <td>theme accent</td>
                    <td>Uniform fill color for all bars.</td>
                </tr>
                <tr>
                    <td><code>labelMaxLength</code></td>
                    <td>number</td>
                    <td>—</td>
                    <td>
                        Truncate axis labels to N characters and add an ellipsis.<br>
                        The full label is still shown in the tooltip on hover.
                    </td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Animation</h5></td>
                </tr>
                <tr>
                    <td><code>animate</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Animate bars on first render. Plays only once per chart instance.</td>
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
                    <td>Per-bar delay in ms — creates a staggered cascade effect.</td>
                </tr>
                <tr>
                    <td><code>ease</code></td>
                    <td>string</td>
                    <td><code>'cubicOut'</code></td>
                    <td>Easing: <code>'cubicOut'</code>, <code>'cubicInOut'</code>, <code>'linear'</code>.</td>
                </tr>
                <tr>
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
                        <code>(d) =&gt; string</code> where <code>d</code> is <code>{label, value}</code>.<br>
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
                        When space to the right of the bar is below this px threshold, the label flips inside the bar automatically.
                    </td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Axis formatting</h5></td>
                </tr>
                <tr>
                    <td><code>yTickFormat</code></td>
                    <td>function</td>
                    <td><code>.2s</code></td>
                    <td><code>(value) =&gt; string</code> — Y axis tick labels in vertical mode.</td>
                </tr>
                <tr>
                    <td><code>yPrefix</code></td>
                    <td>string</td>
                    <td><code>''</code></td>
                    <td>Prefix for default Y labels in vertical mode (e.g. <code>'$'</code>).</td>
                </tr>
                <tr>
                    <td><code>ySuffix</code></td>
                    <td>string</td>
                    <td><code>''</code></td>
                    <td>Suffix for default Y labels in vertical mode.</td>
                </tr>
                <tr>
                    <td><code>xTickFormat</code></td>
                    <td>function</td>
                    <td><code>.2s</code></td>
                    <td><code>(value) =&gt; string</code> — X axis tick labels in horizontal mode.</td>
                </tr>
                <tr>
                    <td><code>xTicks</code></td>
                    <td>number</td>
                    <td><code>4</code></td>
                    <td>Tick count in horizontal mode.</td>
                </tr>
                <tr>
                    <td><code>xTickValues</code></td>
                    <td>array</td>
                    <td>—</td>
                    <td>Explicit X tick positions in horizontal mode.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Interaction</h5></td>
                </tr>
                <tr>
                    <td><code>tooltipFormat</code></td>
                    <td>function</td>
                    <td>—</td>
                    <td>
                        <code>(d) =&gt; html</code> where <code>d</code> is <code>{label, value}</code>.<br>
                        Default shows label and comma-formatted value.
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-revenue.js"></script>
<script src="/assets/charts/examples/bar/bar-chart-coder-gender.js"></script>