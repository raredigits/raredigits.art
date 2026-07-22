---
layout: page.njk
title: "Stacked Bar"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/stacked-bar/'
---

A stacked bar chart answers a different question than a plain bar. A plain bar compares totals: which category is biggest. A stacked bar keeps that comparison but splits each bar into the parts it is made of — so you read the total *and* its composition in the same place. Revenue by quarter, split by product line. Headcount by department, split by team. Energy by year, split by source. Composition over a category axis is the most common analytics figure after the plain line.

It is a **mode of the <a href="/charts/bar/">Bar</a> chart**, not a separate class. Hand `Bar` a set of series instead of a flat list and it stacks them. It draws **vertically** (the default) or **horizontally** — set `orientation: 'horizontal'` for a ranked, composed list; axes, grid, and animation all behave as they do for an ordinary bar.

<div id="stacked-revenue" class="text-content-caption card-dashboard-bordered"></div>

This is composition **within a category** — several series sharing one axis. That is a different shape from the <a href="/charts/bar/hierarchical-bar/">hierarchical bar</a>, which breaks a single total down a *tree* of parents and children. Same instinct — “what is this made of?” — different structure: stacking adds a series dimension, a hierarchy adds depth.

### Data format

Pass an array of **series**, each with a `name` and its `values`:

<pre class="text-content-caption"><code>[
    { name: 'Cloud',    values: [{ label: 'Q1', value: 42 }, { label: 'Q2', value: 48 }] },
    { name: 'Licenses', values: [{ label: 'Q1', value: 30 }, { label: 'Q2', value: 29 }] },
    { name: 'Services', values: [{ label: 'Q1', value: 18 }, { label: 'Q2', value: 20 }] },
]</code></pre>

`Bar` switches into stacked mode automatically when it sees this series-major shape (a `values` array on the first item), so there is no separate class to import and no flag to remember for the common case. The categories are the **ordered union** of every series’ labels — a series that skips a category simply contributes nothing there, and the stack closes up. Segments stack in the order the series are given, bottom to top (or left to right when horizontal).

Values are expected to be **non-negative** — a stacked bar encodes cumulative length, and a negative slice has no coherent place in the pile. For signed comparisons (before/after, gains/losses around a baseline) use a diverging bar instead.

### Percent (100%) mode

When the story is the *shifting share* rather than the absolute total, normalize every bar to fill the axis: pass `stacked: 'percent'`. Each category then reads as parts of 100%, which makes a changing mix legible even when the totals move underneath it.

<div id="stacked-energy" class="text-content-caption card-dashboard-bordered margin-b-md"></div>

<pre class="text-content-caption"><code>new RareCharts.Bar('#chart', {
    stacked: 'percent',
}).setData(series);</code></pre>

### Orientation and legend

Both orientations work. `vertical` (default) reads as composition over time; `horizontal` reads as a ranked, composed list and handles long category labels better. Set it the usual way:

<pre class="text-content-caption"><code>new RareCharts.Bar('#chart', { orientation: 'horizontal' }).setData(series);</code></pre>

A legend is **built automatically** from the series names, colored to match the segments. Pass your own `legend` array to override it — see the <a href="/charts/settings/">Settings</a> page for the legend format.

### Colors and tooltips

Each series takes the next color from the theme palette, in order. Override a single series with a `color` on it:

<pre class="text-content-caption"><code>{ name: 'Cloud', color: '#00c97a', values: [ ... ] }</code></pre>

Hovering a segment shows its category, series name, value, and share of that category’s total. Customize it with `tooltipFormat: (seg) => html`, where `seg` is `{ name, cat, value, total }`.

## Stacked options

Stacked bars share the <a href="/charts/bar/">Bar</a> chart’s options — grid, axis visibility, tick formatters, animation, <code>labelMaxLength</code>, and margins all apply. The options specific to stacking:

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
            <td><code>stacked</code></td>
            <td><code>true</code> | <code>'percent'</code></td>
            <td>auto</td>
            <td>Stacking is enabled automatically by the series-major data shape. Set <code>'percent'</code> to normalize each bar to 100%.</td>
        </tr>
        <tr>
            <td><code>orientation</code></td>
            <td><code>'vertical'</code> | <code>'horizontal'</code></td>
            <td><code>'vertical'</code></td>
            <td>Stack upward (vertical) or rightward (horizontal).</td>
        </tr>
        <tr>
            <td><code>legend</code></td>
            <td>array</td>
            <td>auto</td>
            <td>Auto-built from series names. Pass your own to override.</td>
        </tr>
        <tr>
            <td><code>yTickFormat</code> / <code>xTickFormat</code></td>
            <td>function</td>
            <td><code>.2s</code> / <code>.0%</code></td>
            <td><code>(value) =&gt; string</code> for the value axis (Y in vertical, X in horizontal). Defaults to a compact number, or a percent format in <code>'percent'</code> mode.</td>
        </tr>
        <tr>
            <td><code>yTicks</code> / <code>xTicks</code></td>
            <td>number</td>
            <td><code>4</code></td>
            <td>Value-axis interval count — the niced domain is divided into exactly this many intervals. <code>yTickValues</code> / <code>xTickValues</code> override with explicit positions.</td>
        </tr>
        <tr>
            <td><code>valueFormat</code></td>
            <td>function</td>
            <td>comma number</td>
            <td><code>(seg) =&gt; string</code> — formats the value inside the default segment tooltip.</td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(seg) =&gt; html</code> where <code>seg</code> is <code>{ name, cat, value, total }</code>. Default shows the category, the series and value, and the share of the category total.</td>
        </tr>
    </tbody>
</table>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/stacked-bar-revenue.js"></script>
<script src="/assets/charts/examples/bar/stacked-bar-energy.js"></script>
