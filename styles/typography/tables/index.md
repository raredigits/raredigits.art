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

<div class="sidenote-wrapper">
    <div>
        <p>Tables default to <code>min-width: 100%</code>, occupying the full width of their parent element. When a table is wider than its column, wrap it in <code>.table-scroll</code> so it scrolls horizontally instead of breaking the layout grid — <code>overflow-x</code> has no effect on the table element itself.</p>
        <p>For small tables and table-style data presentation, the <code>.table-small</code> selector is available with left-aligned content.</p>
        <p>Always remember the primary purpose of tables: presenting data for quick analysis and comparison. Don't overload tables with unnecessary information or use them for content better presented as text or graphics.
        </p>
    </div>
    <div class="sidenote">
        <p>To limit table width, use either parent elements or preset spacing selectors like <code>.width-50</code>, <code>.mobile:width-75</code>, etc., or create custom classes.</p>
    </div>
</div>

### Preset Tables

<div class="sidenote-wrapper">
    <div>
        <p>For dashboards and other data-heavy pages, the library includes preset selectors. These allow you to quickly create readable tables with minimal code—like specialized table templates in your construction kit.
        </p>
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
                <td>Monospace metrics readout, centered values, last column right-aligned</td>
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
                <td><code>.table-scroll</code></td>
                <td>Wrapper (not a table class) — lets a wide table scroll horizontally</td>
            </tr>
        </table>
    </div>
    <div class="sidenote">
        <p>
            .table-terminal example:
        </p>
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

### Comparison tables

`.table-comparison` left-aligns the first column (the row label) and centers every value column under its header, so the reader scans straight down each option. Use it for feature or option comparisons in normal body type — reach for `.table-terminal` instead when the values are numeric and benefit from a monospace, right-aligned readout.

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

The example above also carries `.table-horizontal-borders`: a lighter alternative to `.table-bordered` that draws a quiet rule between rows without the outer frame or vertical lines. The two border presets are mutually exclusive — pick the frame weight the data needs.

### Numeric tables

`.table-numeric` is the preset for decision-grade figures: it switches the table to **tabular figures** (every digit the same width, so numbers line up vertically) and right-aligns the value columns while the row label stays left. Use it for financial tables, KPI readouts, and any data where the reader compares numbers down a column. It keeps the normal text font — reach for `.table-terminal` when you want a monospace readout.

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

<div class="caption">
    <p><strong>Table or <code>.dl-grid</code>?</strong> Two columns of <code>key: value</code> metadata — version, status, owner — read better as a <a href="/styles/typography/text-content/"><code>.dl-grid</code></a> definition list. Reach for a table once there are three or more columns, or when rows are meant to be compared against each other rather than read as individual facts.</p>
</div>

<div class="teaser-bottom">
    <p>Next:</p>
    <h3><a href="/styles/typography/interactive/">Interactive Elements</a></h3>
</div>
