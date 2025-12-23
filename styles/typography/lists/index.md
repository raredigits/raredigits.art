---
layout: page.njk
title: "Text Elements / Lists and Tables"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/lists/'
---

## Lists

<div class="meta-info">
    css/modules/typography/_lists.scss
</div>

## Tables

<div class="meta-info">css/modules/typography/_tables.scss</div>
    
Tabular data forms a crucial part of business information presentation. Tables allow users to quickly comprehend and compare large data volumes.

<table class="table-striped">
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
        <p>Tables default to <code>min-width: 100%</code>, occupying the full width of their parent element. Horizontal scrolling <code>overflow-x: auto;</code> prevents disruption of the overall layout grid.
        </p>
        <p>For small tables and table-style data presentation, , the <code>.table-small</code> selector is available with left-aligned content.</p>
        <p>Always remember the primary purpose of tables: presenting data for quick analysis and comparison. Don’t overload tables with unnecessary information or use them for content better presented as text or graphics.
        </p>
    </div>
    <div class="sidenote">
        <p>To limit table width, use either parent elements or preset spacing selectors like <code>.width-50</code>, <code>.mobile: width-75</code>, etc., or create custom classes.</p>
    </div>
</div>

### Preset Tables
<div class="sidenote-wrapper">
    <div>
        <p>For dashboards and other data-heavy pages, the library includes preset selectors. These allow you to quickly create readable tables with minimal code—like specialized table templates in your construction kit.
        </p>
        <table class="table-small">
            <tr>
                <th>Selector</th>
                <th>Purpose</th>
            </tr>
            <tr>
                <td><code>.table-striped</code></td>
                <td>Alternating background colors</td>
            </tr>
            <tr>
                <td><code>.table-terminal</code></td>
                <td>Terminal-style data</td>
            </tr>
            <tr>
                <td><code>.table-small</code></td>
                <td>Used for small tables</td>
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
