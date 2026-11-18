---
layout: page.njk
title: "Text Elements / Tables"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/tables/'
---

## Tables

<div class="meta-info">css/modules/typography/_tables.scss</div>

Tabular data forms a crucial part of business information presentation. Tables allow users to quickly comprehend and compare large data volumes.

<div class="table-scroll">
<table class="table-terminal table-striped">
    <tr>
        <th>Library</th>
        <th>Versatility</th>
        <th>Simplicity</th>
        <th>Recognizability</th>
        <th>Score</th>
    </tr>
    <tr>
        <td>Tailwind</td>
        <td>V</td>
        <td>X</td>
        <td>X</td>
        <td>1</td>
    </tr>
    <tr>
        <td>Bootstrap</td>
        <td>V</td>
        <td>X</td>
        <td>V</td>
        <td>2</td>
    </tr>
    <tr>
        <td>Rare Styles</td>
        <td>V</td>
        <td>V</td>
        <td>V</td>
        <td>3</td>
    </tr>
</table>
</div>

<div class="sidenote-wrapper">
    <div>
        <p>Tables default to <code>min-width: 100%</code>, occupying the full width of their parent element. When a table is wider than its column, wrap it in <code>.table-scroll</code> so it scrolls horizontally instead of breaking the layout grid — <code>overflow-x</code> has no effect on the table element itself. Inside the box, <code>code</code> in a cell keeps its shape: an option name never breaks mid-word on a phone — the table grows and the box scrolls. In the first column, which holds the keys, a class or token name does not break at a hyphen either. On paper, which does not scroll, the code breaks again so the table fits the page.</p>
        <p>For small tables and table-style data presentation, the <code>.table-small</code> selector is available with left-aligned content.</p>
        <p>Always remember the primary purpose of tables: presenting data for quick analysis and comparison. Don't overload tables with unnecessary information or use them for content better presented as text or graphics.
        </p>
    </div>
    <div class="sidenote">
        <p>To limit table width, use either parent elements or preset spacing selectors like <code>.width-50</code>, <code>.mobile:width-75</code>, etc., or create custom classes.</p>
        <p>A table wider than its column — a note on a tablet is often one — goes in a <code>.table-scroll</code> wrapper: it scrolls inside the box instead of widening the page.</p>
    </div>
</div>

A table that hangs into the outdent, with `.text-content-caption`, `.full-width-caption` or `.card-caption` on it or on its box, steps its first column back in by the outdent (32px, 8px on a phone), so the row labels stay on the text edge. In a card, a panel or a collapsible nothing hangs, and the column stays as it is.

### Preset Tables

<div class="sidenote-wrapper">
    <div>
        <p>For dashboards and other data-heavy pages, the library includes preset selectors. These allow you to quickly create readable tables with minimal code—like specialized table templates in your construction kit.
        </p>
        <div class="table-scroll">
        <table class="table-small">
            <tr>
                <th>Selector</th>
                <th>Purpose</th>
            </tr>
            <tr>
                <td><code>.table-striped</code></td>
                <td>Alternating row backgrounds (zebra)</td>
            </tr>
            <tr>
                <td><code>.table-terminal</code></td>
                <td>Monospace metrics readout: columns 8px apart, no padding on the outer edges, value rows flush (4px above and below in a <code>.table-striped</code> table); centered values, last column right-aligned</td>
            </tr>
            <tr>
                <td><code>.table-comparison</code></td>
                <td>Centers value columns for scanning across options; row label stays left</td>
            </tr>
            <tr>
                <td><code>.table-numeric</code></td>
                <td>Tabular figures, value columns right-aligned for comparing numbers down a column</td>
            </tr>
            <tr>
                <td><code>.table-horizontal-borders</code></td>
                <td>Quiet rules between rows, no outer frame</td>
            </tr>
            <tr>
                <td><code>.table-small</code></td>
                <td>Compact, fit-content, left-aligned</td>
            </tr>
            <tr>
                <td><code>.table-bordered</code></td>
                <td>Full grid with outer frame and header band</td>
            </tr>
            <tr>
                <td><code>.table-section</code></td>
                <td>A group row inside <code>.table-bordered</code> (on the <code>&lt;tr&gt;</code>)</td>
            </tr>
            <tr>
                <td><code>.table-scroll</code></td>
                <td>Wrapper (not a table class) — lets a wide table scroll horizontally</td>
            </tr>
        </table>
        </div>
    </div>
    <div class="sidenote">
        <p>
            .table-terminal example:
        </p>
        <div class="table-scroll">
            <table class="table-terminal">
                <tr>
                    <td>Visitors:</td>
                    <td>1,234</td>
                </tr>
                <tr>
                    <td>Clicks:</td>
                    <td>345</td>
                </tr>
                <tr>
                    <td>Leads:</td>
                    <td>123</td>
                </tr>
                <tr>
                    <td>Sales:</td>
                    <td>12</td>
                </tr>
                <tr>
                    <td>Revenue:</td>
                    <td>$1,234</td>
                </tr>
                <tr>
                    <td>Conversion:</td>
                    <td>1%</td>
                </tr>
            </table>
        </div>
    </div>
</div>

### Comparison tables

`.table-comparison` left-aligns the first column (the row label) and centers every value column under its header, so the reader scans straight down each option. Use it for feature or option comparisons in normal body type — reach for `.table-terminal` instead when the values are numeric and benefit from a monospace readout.

<div class="table-scroll">
<table class="table-comparison table-horizontal-borders">
    <tr>
        <th>Library</th>
        <th>Versatility</th>
        <th>Simplicity</th>
        <th>Recognizability</th>
    </tr>
    <tr>
        <td>Tailwind</td>
        <td>Yes</td>
        <td>No</td>
        <td>No</td>
    </tr>
    <tr>
        <td>Bootstrap</td>
        <td>Yes</td>
        <td>No</td>
        <td>Yes</td>
    </tr>
    <tr>
        <td>Rare Styles</td>
        <td>Yes</td>
        <td>Yes</td>
        <td>Yes</td>
    </tr>
</table>
</div>

The example above also carries `.table-horizontal-borders`: a lighter alternative to `.table-bordered` that draws a quiet rule between rows without the outer frame or vertical lines. The two border presets are mutually exclusive — pick the frame weight the data needs.

### Numeric tables

`.table-numeric` is the preset for decision-grade figures: it switches the table to **tabular figures** (every digit the same width, so numbers line up vertically) and right-aligns the value columns while the row label stays left. Use it for financial tables, KPI readouts, and any data where the reader compares numbers down a column. It keeps the normal text font — reach for `.table-terminal` when you want a monospace readout.

<div class="table-scroll">
<table class="table-numeric table-horizontal-borders">
    <tr>
        <th>Channel</th>
        <th>Sessions</th>
        <th>Conversion</th>
        <th>Revenue</th>
    </tr>
    <tr>
        <td>Organic search</td>
        <td>48,120</td>
        <td>3.4%</td>
        <td>$182,400</td>
    </tr>
    <tr>
        <td>Paid social</td>
        <td>9,265</td>
        <td>1.1%</td>
        <td>$24,900</td>
    </tr>
    <tr>
        <td>Direct</td>
        <td>121,008</td>
        <td>5.0%</td>
        <td>$540,150</td>
    </tr>
</table>
</div>

### Group rows

A long reference table — the options of a chart, the fields of an API — reads faster in groups. Inside a `.table-bordered`, a row with `.table-section` is a group heading: one cell across every column with an `h5` (or `h6`) and, if the group needs it, a line of text. The row drops its bottom rule, so the heading belongs to the rows under it, and the heading and the text lose their margins inside the cell. The text runs the full width of the row: a data table is outside the prose measure.

<div class="table-scroll">
<table class="table-bordered">
    <thead>
        <tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr>
    </thead>
    <tbody>
        <tr class="table-section">
            <td colspan="4"><h5>Layout</h5></td>
        </tr>
        <tr><td><code>height</code></td><td>number</td><td><code>240</code></td><td>Chart height in px. Width is always 100% of the container.</td></tr>
        <tr><td><code>yAxisPosition</code></td><td><code>'left'</code> | <code>'right'</code></td><td><code>'right'</code></td><td>The side the Y axis sits on.</td></tr>
        <tr class="table-section">
            <td colspan="4">
                <h5>Legend</h5>
                <p>Every legend option is optional; without them the chart draws no legend.</p>
            </td>
        </tr>
        <tr><td><code>legend</code></td><td>array</td><td>—</td><td>Items with a <code>label</code> and a <code>type</code>.</td></tr>
        <tr><td><code>legendPosition</code></td><td><code>'top'</code> | <code>'right'</code></td><td><code>'top'</code></td><td>Above the chart, or in a column beside it.</td></tr>
    </tbody>
</table>
</div>

<pre><code>&lt;tr class="table-section"&gt;
    &lt;td colspan="4"&gt;
        &lt;h5&gt;Legend&lt;/h5&gt;
        &lt;p&gt;Every legend option is optional.&lt;/p&gt;
    &lt;/td&gt;
&lt;/tr&gt;</code></pre>

The example is the reference-table recipe the chart docs use: `.table-bordered` with group rows, inside `.table-scroll`. In the scroll box an option name in `code` never breaks mid-word: on a phone the table keeps its columns and the box scrolls. There is no separate preset class for it — the three pieces are the preset. A Markdown table cannot take a class: write a reference table as HTML.

### Table or <code>.dl-grid</code>?

Two columns of <code>key: value</code> metadata — version, status, owner — read better as a <a href="/styles/typography/text-content/"><code>.dl-grid</code></a> definition list. Reach for a table once there are three or more columns, or when rows are meant to be compared against each other rather than read as individual facts.

<div class="teaser-bottom">
    <p>Next:</p>
    <h3><a href="/styles/interactive/">Interactive Elements</a></h3>
</div>
