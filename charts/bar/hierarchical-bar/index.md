---
layout: page.njk
title: "Hierarchical Bar"
section: "Charts"
displaySidebar: true
permalink: '/charts/bar/hierarchical-bar/'
---

A hierarchical bar chart is what you reach for when your data is not a flat list but a tree — a whole that breaks into parts, and those parts break down further. A portfolio splits into asset classes, and each class into holdings. A budget splits into departments, and each department into line items. An org splits into teams. The question is no longer just “how much?” but “how much, and what is it made of?”

`HierarchicalBar` answers that as an outline: one row per node, each with its own bar on a shared scale from one zero line. Parent rows carry their subtotal; nested rows read underneath them. You get the top-line comparison and the composition in a single figure, top to bottom, without a legend and without asking the reader to decode nested rectangles.

<div id="hbar-portfolio" class="text-content-caption card-dashboard-bordered"></div>

This is the linear view of a shallow hierarchy. For the spatial views of a deep one — treemap, pack, sunburst — that is a different tool. Bars are for reading a breakdown as a ranked, labeled list.

### Data format

`HierarchicalBar` takes a **tree**, not an array of rows. A node is:

<pre class="text-content-caption"><code>{
    label: 'World Liberty Financial',
    value: 536.4,
    children: [
        { label: 'Ethereum Key', value: 106 },
        { label: 'USDC Key',     value: 56 },
    ]
}</code></pre>

Pass one root object, or an array of roots (a forest — several top-level items with no shared total). Only `label` is required. `children` marks an internal node; `color` and `remainderLabel` are optional.

The same tree feeds the drill-down <a href="/charts/circular/">Donut</a> — one data shape, two representations. Build the object once and hand it to whichever view fits the page.

<div id="hbar-org" class="text-content-caption card-dashboard-bordered"></div>

### Value is authoritative — and the remainder is real

A parent’s `value` is taken as stated. It may be **larger** than the sum of its listed children, and that difference is not an error to be normalized away — it is a genuine remainder: the undisclosed, the “other”, the part that was never itemized. In the portfolio above, World Liberty Financial is stated at \$536.4M but its named holdings add up to \$243.2M; the \$293.2M gap is drawn as its own muted segment labeled *Other token &amp; equity sales*.

The remainder is never surfaced silently. It appears only when you ask for it:

- set `remainderLabel` on a node to surface that node’s remainder with a specific label, or
- pass `showRemainder: true` to the chart to surface every node’s remainder using a fallback label.

If a parent’s children *exceed* its stated value, the data is inconsistent — the chart warns in the console and leaves the (negative) remainder undrawn, or throws instead when you pass `strict: true`.

### Undisclosed items

Real breakdowns have holes: a line item you know exists but whose amount was never published. Give it `value: null` and it is kept as a **placeholder** — drawn with a `?` marker, excluded from every sum, and left out of the parent’s remainder (an unknown can’t be subtracted). It is not the same as omitting the item, and not the same as a remainder: the remainder is a *quantified* gap, a `null` is a *named but unquantified* item. A parent with no `value` of its own whose children are all `null` is unquantified too: it gets the `?` and stays out of the sums, rather than reading as zero.

<pre class="text-content-caption"><code>{ label: 'License agreement with NFT INT, LLC', value: null }
<span class="code-comment">// → drawn as “?”, counted in nothing</span></code></pre>

A leaf with no usable value at all — absent, zero, or negative — is simply dropped, since a compositional bar can only draw a positive magnitude.

### Root, depth, and color

By default the root row is drawn as a neutral full-width total, and each **top-level branch** takes the next color from the theme palette. Descendants inherit their branch’s hue and fade one step per level, so nesting reads as shade without a second encoding. A node’s own `color` wins, except on the root row, which stays neutral, and on a remainder, which stays muted.

Set `showRoot: false` to drop a single root (an object, or an array of one) entirely and start from its children — the root then reads as the chart title/total rather than a bar. Use `maxDepth` to cap how deep the outline expands: `0` draws the top rows only, `1` adds their children. Indentation is `indent` px per level, applied to the name; row height is `rowHeight`.

### Labels and values

On a plot at least 480 px wide, each row reads left to right: the name in a column of its own, flush against its bar (or, with `labelAlign: 'left'`, indented by depth); the bar, starting from one zero line shared by every row, so lengths compare directly at any depth; and the value in a right-aligned column at the right edge. The name column is as wide as the longest name needs, up to 40% of the width. A longer name wraps once, at a word, and its row grows by a line; what the second line cannot hold ends in an ellipsis. Parent rows set their name and value in semibold, and a little space opens before each new branch group, so the nesting reads without relying on color.

On a narrower plot — a phone — the name sits on its own line above its bar, indented by depth and shortened with an ellipsis to the width, and the value follows the bar end, flipping inside the bar when space is tight.

In both layouts the tooltip keeps the full name; `labelMaxLength` cuts names to a fixed number of characters instead. Format the values with `valueFormat: (node, info) => string`, or turn them off with `showValues: false`.

Hovering a row shows its label, its value and its share of the total — the root’s value, also when `showRoot: false` hides its row; for a forest, the sum of the roots.

### Quick example

<pre class="text-content-caption"><code>new RareCharts.HierarchicalBar('#chart', {
  valueFormat: n => '$' + n.value + 'M',
  showRoot: false,       <span class="code-comment">// root becomes the header, not a bar</span>
}).setData({
  label: 'Portfolio', value: 100,
  children: [
    { label: 'Equities', value: 60, remainderLabel: 'Other', children: [
      { label: 'US Large Cap', value: 35 },
      { label: 'International', value: 18 },
    ] },
    { label: 'Bonds', value: 30 },
    { label: 'Cash',  value: null },   <span class="code-comment">// undisclosed → “?”</span>
  ],
});</code></pre>

## Hierarchical Bar options

Common options shared by all chart types (<code>title</code>, <code>subtitle</code>, <code>source</code>, <code>note</code>, <code>controls</code>, <code>theme</code>) are documented on the <a href="/charts/settings/">Settings</a> page.

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
            <td><code>rowHeight</code></td>
            <td>number</td>
            <td><code>28</code> / <code>44</code></td>
            <td>Height in px of a row: 28 when name, bar and value sit side by side, 44 when the name sits above the bar (a plot under 480 px). A name wrapped to two lines adds a line to its row. Chart height is content-driven — the rows, the space before each branch group, plus the top and bottom margin — so the common <code>height</code> option does not apply; width is always 100% of the container.</td>
        </tr>
        <tr>
            <td><code>margin</code></td>
            <td>object</td>
            <td><code>{8, 8, 8, 0}</code></td>
            <td>Inner padding <code>{top, right, bottom, left}</code>; top and bottom add to the content height.</td>
        </tr>
        <tr>
            <td><code>indent</code></td>
            <td>number</td>
            <td><code>16</code></td>
            <td>Horizontal indent in px per depth level, applied to the name when it is indented (stacked, or side by side with <code>labelAlign: 'left'</code>). Bars always start at the shared zero line.</td>
        </tr>
        <tr>
            <td><code>labelAlign</code></td>
            <td>string</td>
            <td><code>'right'</code></td>
            <td>Side by side: <code>'right'</code> sets every name flush against the bars; <code>'left'</code> lines the names up at the left edge, indented by depth. Stacked, the name is always indented.</td>
        </tr>
        <tr>
            <td><code>barHeight</code></td>
            <td>number</td>
            <td>auto (<code>16</code>)</td>
            <td>Bar thickness in px. By default the value-label font size + 2 — 16px with the standard 14px labels (<code>--rc-font-size-sm</code>).</td>
        </tr>
        <tr>
            <td><code>showRoot</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Draw the root row(s). When <code>false</code>, a single root is dropped and its children become the top rows — the root reads as the header/total instead of a bar. No effect on a forest of two or more roots; a one-element array counts as a single root.</td>
        </tr>
        <tr>
            <td><code>maxDepth</code></td>
            <td>number</td>
            <td>—</td>
            <td>Deepest level to render, 0-based from the top row: <code>0</code> draws the top rows only, <code>1</code> adds their children. Default: no limit.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Composition</h5></td>
        </tr>
        <tr>
            <td><code>remainderLabel</code></td>
            <td>string</td>
            <td><code>'Other'</code></td>
            <td>Per-node (in the data) it labels and surfaces that node’s remainder. As a chart option it is the fallback label used when <code>showRemainder</code> is on.</td>
        </tr>
        <tr>
            <td><code>showRemainder</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Surface every node’s remainder as a muted segment, using each node’s own <code>remainderLabel</code> or the fallback above.</td>
        </tr>
        <tr>
            <td><code>strict</code></td>
            <td>boolean</td>
            <td><code>false</code></td>
            <td>Throw when a node’s children exceed its stated value. Off by default: the chart warns and leaves the negative remainder undrawn.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Value labels</h5></td>
        </tr>
        <tr>
            <td><code>showValues</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Print the values: in a right-aligned column when name, bar and value sit side by side; at the bar end when the name sits above the bar, flipping inside the bar when space is tight.</td>
        </tr>
        <tr>
            <td><code>valueFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(node, info) =&gt; string</code>. Default: the value with thousands separators, decimals kept (<code>d3.format(',')</code>: 1,400 · 536.4). Note the first argument is the node, so you can read <code>node.value</code>, <code>node.label</code>, <code>node.depth</code>; the second, <code>info</code>, is <code>{ label, value, color, percent }</code> — the bar’s colour and the share of the total (<code>null</code> without a value).</td>
        </tr>
        <tr>
            <td><code>missingGlyph</code></td>
            <td>string</td>
            <td><code>'?'</code></td>
            <td>Marker drawn where a <code>value: null</code> node’s bar would be.</td>
        </tr>
        <tr>
            <td><code>labelMaxLength</code></td>
            <td>number</td>
            <td>—</td>
            <td>Truncate a label to N characters and add an ellipsis. The full label stays in the tooltip. Without it, a name longer than its room wraps (side by side) or shortens to the width (above the bar) on its own.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Animation</h5></td>
        </tr>
        <tr>
            <td><code>animate</code></td>
            <td>boolean</td>
            <td><code>true</code></td>
            <td>Grow bars from zero on first render and after every <code>setData</code>.</td>
        </tr>
        <tr>
            <td><code>duration</code></td>
            <td>number</td>
            <td><code>500</code></td>
            <td>Animation duration in ms.</td>
        </tr>
        <tr>
            <td><code>ease</code></td>
            <td>string</td>
            <td><code>'cubicOut'</code></td>
            <td>Easing: <code>'cubicOut'</code>, <code>'cubicInOut'</code>, <code>'linear'</code>.</td>
        </tr>
        <tr class="table-section">
            <td colspan="4"><h5>Interaction</h5></td>
        </tr>
        <tr>
            <td><code>tooltipFormat</code></td>
            <td>function</td>
            <td>—</td>
            <td><code>(node, info) =&gt; html</code>, <code>info</code> as for <code>valueFormat</code> (<a href="/charts/settings/#formatter-arguments">formatter arguments</a>). Default shows the label, the value (or “not disclosed”), and its share of the total: the root’s value, shown or not, or the sum of a forest’s roots.</td>
        </tr>
    </tbody>
</table>
</div>

<script src="/assets/charts/rare-charts.js"></script>
<script src="/assets/charts/examples/bar/hierarchical-bar-portfolio.js"></script>
<script src="/assets/charts/examples/bar/hierarchical-bar-org.js"></script>
