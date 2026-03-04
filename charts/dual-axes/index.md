---
layout: page.njk
title: "Dual Axes Charts"
section: "Charts"
displaySidebar: true
permalink: '/charts/dual-axes/'
---

Sometimes you need to plot two things on the same timeline that simply do not belong to the same scale. Revenue and headcount. Inflation and GDP. Price and spread. If you force them onto one axis, one series becomes unreadable, and the chart turns into a polite lie.

A dual-axis chart solves this by keeping a shared X axis (time) while providing two independent Y axes, so each metric is shown in its natural units. The goal is not to pretend the metrics are comparable. The goal is to compare when they move and how their dynamics relate.

In RareCharts, DualAxes is exactly that: a time-based chart with two vertical scales.

To illustrate a real-world use case, this example uses a finance-native story: a convergence (arbitrage) strategy based on the idea that two similar instruments that temporarily diverged in price will later converge again.

<div class="text-content-caption card-dashboard-bordered">
    <div id="dual-chart-ltcm-treasuries"></div>
</div>

One concrete version of this story exists in government bonds, where a newly issued “on-the-run” Treasury can trade slightly richer than the previous “off-the-run” issue for a period of time. Traders may position for convergence by going long the cheaper issue and hedging the richer one, expecting the price gap to compress as the market normalizes.

In the chart, the right axis (Y1) shows the price index of the two instruments over time. The left axis (Y2) shows the spread between them. Prices and spread are different categories, so they get different axes. The chart stays readable, and the relationship stays visible.

### Axis behavior and formatting

Both axes are configured independently. You can set titles (`y1Title`, `y2Title`), control tick formatting (`y1TickFormat`, `y2TickFormat`), and, when needed, override the visible ranges (`y1Domain`, `y2Domain`) to keep the chart stable and comparable across screenshots, reports, or multiple panels.

In this example, the spread axis uses a signed format and treats very small values as clean zero, so you do not get the infamous +0.00 noise that makes charts look broken even when the data is fine.

### Interaction

Dual Axes supports cursor inspection through a crosshair and a tooltip. The tooltip is fully customizable through `tooltipFormat ({ date, points })`, so you can present values in your product’s language instead of whatever generic tooltip someone thought was “good enough”.

Dual-axis charts are often implemented as a hack: two scales, mismatched formatting, confusing labels, and tooltips that quietly mix units. This component exists to make the dual-axis case predictable, explicit, and safe for real reporting: independent scales, consistent structure, and controlled formatting.

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
                    <td><code>280</code></td>
                    <td>Chart height in px.</td>
                </tr>
                <tr>
                    <td><code>margin</code></td>
                    <td>object</td>
                    <td>—</td>
                    <td>
                        Inner padding <code>{top, right, bottom, left}</code>.<br>
                        Right defaults to <code>92</code>, left to <code>64</code> to give both axes room.
                    </td>
                </tr>
                <tr>
                    <td><code>xPad</code></td>
                    <td>number</td>
                    <td><code>8</code></td>
                    <td>Extra horizontal padding on both ends of the X scale.</td>
                </tr>
                <tr>
                    <td colspan="4">
                        <h5>Right axis — Y1</h5>
                        <p>Y1 is drawn on the <strong>right</strong> side.</p>
                    </td>
                </tr>
                <tr>
                    <td><code>y1Domain</code></td>
                    <td><code>[min, max]</code></td>
                    <td>auto</td>
                    <td>
                        Override the Y1 scale domain.<br>
                        Useful for keeping charts comparable across snapshots.
                    </td>
                </tr>
                <tr>
                    <td><code>y1Ticks</code></td>
                    <td>number</td>
                    <td><code>4</code></td>
                    <td>Tick count on Y1.</td>
                </tr>
                <tr>
                    <td><code>y1TickFormat</code></td>
                    <td>function</td>
                    <td><code>,.2f</code></td>
                    <td><code>(value) =&gt; string</code> — Y1 tick labels.</td>
                </tr>
                <tr>
                    <td><code>y1LabelsOnly</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Show only tick labels; suppress the axis line.</td>
                </tr>
                <tr>
                    <td><code>y1Title</code></td>
                    <td>string</td>
                    <td>—</td>
                    <td>Axis title, rendered along the right edge.</td>
                </tr>
                <tr>
                    <td colspan="4">
                        <h5>Left axis — Y2</h5>
                        <p>Y2 is drawn on the <strong>left</strong> side. Grid lines and the zero baseline are keyed to Y2.</p>
                    </td>
                </tr>
                <tr>
                    <td><code>y2Domain</code></td>
                    <td><code>[min, max]</code></td>
                    <td>auto</td>
                    <td>Override the Y2 scale domain.</td>
                </tr>
                <tr>
                    <td><code>y2Ticks</code></td>
                    <td>number</td>
                    <td><code>4</code></td>
                    <td>Tick count on Y2.</td>
                </tr>
                <tr>
                    <td><code>y2TickFormat</code></td>
                    <td>function</td>
                    <td><code>+.2f</code></td>
                    <td><code>(value) =&gt; string</code> — Y2 tick labels.</td>
                </tr>
                <tr>
                    <td><code>y2LabelsOnly</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Show only tick labels; suppress the axis line.</td>
                </tr>
                <tr>
                    <td><code>y2Title</code></td>
                    <td>string</td>
                    <td>—</td>
                    <td>Axis title, rendered along the left edge.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>X axis</h5></td>
                </tr>
                <tr>
                    <td><code>xTickFormat</code></td>
                    <td>function</td>
                    <td><code>'%m/%d'</code></td>
                    <td><code>(date) =&gt; string</code> — X tick labels.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Lines</h5></td>
                </tr>
                <tr>
                    <td><code>curve</code></td>
                    <td>string</td>
                    <td><code>'linear'</code></td>
                    <td>D3 curve type for line series: <code>'linear'</code>, <code>'monotone'</code>, <code>'step'</code>, etc.</td>
                </tr>
                <tr>
                    <td><code>curveTension</code></td>
                    <td>number</td>
                    <td><code>0</code></td>
                    <td>Tension for the <code>'cardinal'</code> curve, <code>0</code>–<code>1</code>.</td>
                </tr>
                <tr>
                    <td><code>strokeDash</code></td>
                    <td>string</td>
                    <td>—</td>
                    <td>SVG <code>stroke-dasharray</code> applied to all line series globally.</td>
                </tr>
                <tr>
                    <td><code>area</code></td>
                    <td>boolean</td>
                    <td><code>false</code></td>
                    <td>Fill area under line series.</td>
                </tr>
                <tr>
                    <td><code>areaOpacity</code></td>
                    <td>number</td>
                    <td><code>0.12</code></td>
                    <td>Area fill opacity.</td>
                </tr>
                <tr>
                    <td><code>areaBaseline</code></td>
                    <td><code>'zero'</code> | <code>'min'</code> | number</td>
                    <td><code>'zero'</code></td>
                    <td>Area baseline anchor.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Bars</h5></td>
                </tr>
                <tr>
                    <td><code>barOpacity</code></td>
                    <td>number</td>
                    <td><code>0.35</code></td>
                    <td>Bar fill opacity.</td>
                </tr>
                <tr>
                    <td><code>barWidthRatio</code></td>
                    <td>number</td>
                    <td><code>0.65</code></td>
                    <td>Bar width as a fraction of the time step width.</td>
                </tr>
                <tr>
                    <td><code>barGrouping</code></td>
                    <td><code>'overlap'</code> | <code>'cluster'</code></td>
                    <td><code>'overlap'</code></td>
                    <td>How multiple bar series are arranged. <code>'cluster'</code> places them side by side.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>End labels and markers</h5></td>
                </tr>
                <tr>
                    <td><code>endLabels</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Show last-value labels at the right edge for line series.</td>
                </tr>
                <tr>
                    <td><code>endLabelsAxis</code></td>
                    <td><code>'y1'</code> | <code>'y2'</code></td>
                    <td><code>'y1'</code></td>
                    <td>Which axis to use when formatting end labels.</td>
                </tr>
                <tr>
                    <td><code>markers</code></td>
                    <td>boolean</td>
                    <td><code>false</code></td>
                    <td>Point markers at each data sample on line series.</td>
                </tr>
                <tr>
                    <td><code>markerShape</code></td>
                    <td>string</td>
                    <td><code>'circle'</code></td>
                    <td>Marker shape: <code>'circle'</code>, <code>'square'</code>, <code>'diamond'</code>.</td>
                </tr>
                <tr>
                    <td><code>markerSize</code></td>
                    <td>number</td>
                    <td><code>4</code></td>
                    <td>Marker radius in px.</td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Interaction</h5></td>
                </tr>
                <tr>
                    <td><code>crosshair</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Vertical tracker with dots at data points and a tooltip on hover.</td>
                </tr>
                <tr>
                    <td><code>tooltipFormat</code></td>
                    <td>function</td>
                    <td>—</td>
                    <td>
                        <code>({ date, points }) =&gt; html</code> — where
                        <code>points</code> is <code>[{name, value, color, fmt}]</code>.
                    </td>
                </tr>
                <tr>
                    <td colspan="4"><h5>Animation</h5></td>
                </tr>
                <tr>
                    <td><code>animate</code></td>
                    <td>boolean</td>
                    <td><code>true</code></td>
                    <td>Animate on first render.</td>
                </tr>
                <tr>
                    <td><code>duration</code></td>
                    <td>number</td>
                    <td><code>650</code></td>
                    <td>Animation duration in ms.</td>
                </tr>
                <tr>
                    <td><code>ease</code></td>
                    <td>string</td>
                    <td><code>'cubicOut'</code></td>
                    <td>Easing: <code>'cubicOut'</code>, <code>'cubicInOut'</code>, <code>'linear'</code>.</td>
                </tr>
                <tr>
                    <td colspan="4">
                        <h5>Per-series fields</h5>
                        <p>Each object in the series array passed to <code>setData()</code>:</p>
                    </td>
                </tr>
                <tr>
                    <td><code>name</code></td>
                    <td>string</td>
                    <td><code>'Series N'</code></td>
                    <td>Series name — used in legend and tooltip.</td>
                </tr>
                <tr>
                    <td><code>axis</code></td>
                    <td><code>'y1'</code> | <code>'y2'</code></td>
                    <td><code>'y1'</code></td>
                    <td>Which Y axis to plot against.</td>
                </tr>
                <tr>
                    <td><code>type</code></td>
                    <td><code>'line'</code> | <code>'bar'</code></td>
                    <td><code>'line'</code></td>
                    <td>Rendering type for this series.</td>
                </tr>
                <tr>
                    <td><code>color</code></td>
                    <td>CSS color</td>
                    <td>theme palette</td>
                    <td>Series color.</td>
                </tr>
                <tr>
                    <td><code>strokeWidth</code></td>
                    <td>number</td>
                    <td><code>2</code></td>
                    <td>Line thickness in px (lines only).</td>
                </tr>
                <tr>
                    <td><code>strokeDash</code></td>
                    <td>string</td>
                    <td>—</td>
                    <td>SVG dash pattern for this series only.</td>
                </tr>
                <tr>
                    <td><code>curve</code></td>
                    <td>string</td>
                    <td>global <code>curve</code></td>
                    <td>Curve override for this series.</td>
                </tr>
                <tr>
                    <td><code>area</code></td>
                    <td>boolean</td>
                    <td>global <code>area</code></td>
                    <td>Fill area under this series.</td>
                </tr>
                <tr>
                    <td><code>areaOpacity</code></td>
                    <td>number</td>
                    <td>global <code>areaOpacity</code></td>
                    <td>Per-series area opacity.</td>
                </tr>
                <tr>
                    <td><code>areaBaseline</code></td>
                    <td>string | number</td>
                    <td>global <code>areaBaseline</code></td>
                    <td>Per-series area baseline.</td>
                </tr>
                <tr>
                    <td><code>values</code></td>
                    <td>array</td>
                    <td>—</td>
                    <td><code>[{date, value}, ...]</code> — the data points.</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/dual-axes/dual-axes-chart-ltcm-treasuries.js"></script>