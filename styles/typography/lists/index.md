---
layout: page.njk
title: "Text Elements / Lists & Columns"
section: "Styles"
displaySidebar: true
permalink: '/styles/typography/lists/'
---

## Lists

<div class="meta-info">css/modules/typography/_lists.scss</div>

This module handles two related jobs. First, it gives the project a small set of reusable list patterns: plain resets, section indexes, feeds, and browseable catalogs. Second, it provides three ways to lay long lists out across multiple columns when a single vertical stack becomes too tall to scan comfortably.

Use native `<ul>` and `<ol>` whenever the default document flow is enough. Reach for these classes when the list needs a clearer visual role, richer item metadata, or a deliberate multi-column layout. Definition lists (`<dl>`) are covered with the [special text elements](/styles/typography/text-content/) — they are a text pattern, not a list pattern.

## Small building blocks

### `.list-unstyled`

The base reset for structural lists. It removes bullets and left padding but keeps the semantic list markup intact.

<ul class="list-unstyled">
    <li>Navigation remains a real list</li>
    <li>Bullets disappear</li>
    <li>Indentation resets to zero</li>
</ul>

Use it for navigation blocks, groups of links, table-of-contents lists, and any custom list pattern where the marker would be visual noise.

### `.list-title`

An uppercase, bold label for a list group. It works above unstyled lists, inside `.list-group-pack` columns, and as the title of an `.index-list`. It is a pure label utility: it carries no margins of its own — vertical rhythm belongs to the surrounding context. A plain `<span>` is the right element for it — the label is a visual marker, not a document heading; the utility pins `font-family` and `font-size: 1em` so it stays stable even if it lands on a heading element.

<span class="list-title">Reference</span>
<ul class="list-unstyled">
    <li>Specification</li>
    <li>Changelog</li>
    <li>Migration Notes</li>
</ul>

## Index lists

### `.index-list`

`index-list` is the compact "section title + short link list" pattern used for table-of-contents style navigation. The title is the thing you scan first; the items underneath stay tight and quiet.

The markup is deliberately plain: a `.list-title` label on a `<span>`, then a bare `<ul>` — the component styles its own `ul`/`li` (resets markers, sets item rhythm), because any list item inside an index list is an index entry by definition; no extra classes needed. The block itself owns the bottom rhythm (`margin-bottom`), so stacked or packed index lists separate cleanly — it is also the canonical content unit inside `.list-group-pack` columns.

<div class="index-list">
    <span class="list-title"><a href="">Typography</a></span>
    <ul>
        <li><a href="">Body Text</a></li>
        <li><a href="">Lists &amp; Columns</a></li>
        <li><a href="">Tables</a></li>
    </ul>
</div>

Use it when each list needs a named category above it. If the items themselves need metadata or a richer browse-to-pick reading, move up to `.catalog-list`.

## Multi-column list layouts

All three utilities below solve the same problem in different ways: a list is too tall to read comfortably as one vertical stack. The right choice depends on what you want to control.

| Utility | Mechanism | You control | Best for |
|---|---|---|---|
| `.list-columns` | CSS columns | column count | One long flat list |
| `.list-group-pack` | CSS columns + `column-fill: auto` | min column width + container height | Several grouped sublists that must stay intact |
| `.list-fixed-rows` | CSS grid | row count | Exact number of rows, usually TOCs |

### How to choose quickly

- Use `.list-columns` when you have one long plain list and just want it to become shorter on screen.
- Use `.list-group-pack` when the list is made of named groups and each group should stay whole.
- Use `.list-fixed-rows` when you want a strict visual rhythm, for example exactly 3 or 4 rows.
- Use `.list-fixed-rows-2col` when that fixed-row layout needs exactly two columns — most commonly a table of contents.

In short: `.list-columns` controls columns, `.list-group-pack` protects groups, `.list-fixed-rows` controls rows.

### `.list-columns`

<div class="sidenote-wrapper">
    <p>The default packer for a single flat list. It removes markers, flows items into two columns by default, and can be expanded with <code>.list-columns-3</code>, <code>.list-columns-4</code>, or <code>.list-columns-5</code>.</p>
    <div class="sidenote">
        <p><strong>A note on prose columns.</strong> This page documents list-oriented column tools. The generic prose utility is <code>.prose-columns</code> — deliberately not featured here, because Rare Styles treats running prose in multiple columns as an exception, not a default reading pattern. Its reference will land with the text-content documentation pass.</p>
    </div>
    <div>
        <p>On mobile, the base utility collapses to one column; the wider variants collapse to two.</p>
        <ul class="list-columns list-columns-3">
            <li>Amsterdam</li>
            <li>Berlin</li>
            <li>Copenhagen</li>
            <li>Dublin</li>
            <li>Edinburgh</li>
            <li>Frankfurt</li>
            <li>Geneva</li>
            <li>Helsinki</li>
            <li>Istanbul</li>
            <li>Lisbon</li>
            <li>Madrid</li>
            <li>Oslo</li>
            <li>Prague</li>
            <li>Stockholm</li>
            <li>Vienna</li>
            <li>Warsaw</li>
            <li>Zurich</li>
        </ul>
        <p>Use it when mechanical balancing is acceptable. If list items belong to named groups that must not split across a column edge, use <code>.list-group-pack</code> instead.</p>
    </div>
</div>

### `.list-group-pack`

For grouped sublists with subheadings. This utility packs the groups into columns sequentially and keeps each child block intact with `break-inside: avoid`, so a label and its items travel together. The canonical child is an `.index-list` — the packer arranges the columns, the index lists carry the content and their own bottom rhythm.

Important: `column-fill: auto` only does useful work when the container has a height. Add a height utility such as `.height-xxxl` or set a custom height inline. You can also tune the minimum column width with `--list-group-pack-min`.

On narrow viewports the utility ignores the height-driven packing and falls back to a balanced fixed-count layout: 2 columns on mobile, 3 on tablet.

<div class="list-group-pack height-xxxl" style="--list-group-pack-min: 11rem;">
    <div class="index-list">
        <span class="list-title">Foundations</span>
        <ul>
            <li>Tokens</li>
            <li>Typography</li>
            <li>Colors</li>
            <li>Grid</li>
        </ul>
    </div>
    <div class="index-list">
        <span class="list-title">Components</span>
        <ul>
            <li>Buttons</li>
            <li>Cards</li>
            <li>Panels</li>
            <li>Tables</li>
            <li>Tags</li>
        </ul>
    </div>
    <div class="index-list">
        <span class="list-title">Navigation</span>
        <ul>
            <li>Header</li>
            <li>Sidebar</li>
            <li>Breadcrumbs</li>
        </ul>
    </div>
    <div class="index-list">
        <span class="list-title">Decorations</span>
        <ul>
            <li>Highlights</li>
            <li>Frames</li>
            <li>Badges</li>
        </ul>
    </div>
</div>

### `.list-fixed-rows`

The grid-based option. Instead of choosing a column count, you choose the number of rows with the custom property `--list-rows`. The browser then fills columns automatically in source order.

This is useful when visual rhythm depends on a fixed row count rather than on balanced columns.

On mobile the fixed-row contract is dropped: the list reflows into two equal columns in row order. If two columns are too tight or too loose for your items, override the count with the responsive grid utilities — `mobile:grid-cols-1`, `mobile:grid-cols-3`, and so on — right on the same element.

<ol class="list-fixed-rows" style="--list-rows: 3;">
    <li>Clarify module purpose</li>
    <li>Document the public classes</li>
    <li>Add live examples</li>
    <li>Check naming consistency</li>
    <li>Verify responsive behavior</li>
    <li>Link the next typography page</li>
</ol>

### `.list-fixed-rows-2col`

An opt-in variant that locks the layout to two equal columns on larger screens and collapses to one stacked column on mobile. Its most common job is a two-column table of contents — that's the case it was harvested for.

<ol class="list-fixed-rows list-fixed-rows-2col" style="--list-rows: 4;">
    <li>What the library is for</li>
    <li>Installation</li>
    <li>Tokens</li>
    <li>Typography</li>
    <li>Layout</li>
    <li>Components</li>
    <li>Navigation</li>
    <li>Decorations</li>
</ol>

## Feed lists

### `.feed-list`, `.feed-list__item`, `.feed-list__title`, `.feed-list__meta`

A feed is a chronological vertical stream — and a navigation surface, not body copy. Authors put content into a feed precisely because it deserves the reader's attention, so the pattern spends visual budget on it: full-size titles and generous vertical whitespace between line-separated items signal that the entries are valuable. Each item gets a top rule, a title, and a quiet meta line that keeps dates and tags from competing with the title. The pattern is intentionally narrow: it is for updates, logs, changelogs, or knowledge-base streams where sequence matters more than per-item detail.

<div class="feed-list">
    <div class="feed-list__item">
        <span class="feed-list__meta">10.06.2026</span>
        <h4 class="feed-list__title"><a href="">Lists module harvested and normalized</a></h4>
        <div class="feed-list__meta">
            <span class="tag">#release</span>
            <span class="tag">#typography</span>
        </div>
    </div>
    <div class="feed-list__item">
        <span class="feed-list__meta">06.06.2026</span>
        <h4 class="feed-list__title"><a href="">Audit findings for v0.6.14_1 prepared</a></h4>
        <div class="feed-list__meta">
            <span class="tag">#audit</span>
            <span class="tag">#maintenance</span>
        </div>
    </div>
    <div class="feed-list__item">
        <span class="feed-list__meta">01.06.2026</span>
        <h4 class="feed-list__title"><a href="">Cross-project enrichment started</a></h4>
        <div class="feed-list__meta">
            <span class="tag">#harvest</span>
            <span class="tag">#release</span>
        </div>
    </div>
</div>

Use a feed when each item is mostly "date + title + optional tags". If readers need to compare entries as options rather than follow them as a timeline, `.catalog-list` is usually the better fit.

## Catalog lists

### `.catalog-list`, `.catalog-list__item`

The browseable list pattern for catalogs, search results, documentation indexes, portfolios, and other "pick one of these" situations. The component is deliberately minimal: it owns the item rhythm, the title and the meta line — nothing else. Tag chips sit inline in the meta line; any extra content (a short summary paragraph, a nested list) is host content and renders with document defaults.

### `.catalog-list__title`

The entry title. The visual anchor of each record.

### `.catalog-list__meta`

Muted supporting metadata. Links inside stay muted too, so they remain part of the meta line instead of competing with the title. `.tag` chips can sit directly in the meta line — no dedicated wrapper needed.

<div class="text-content-caption card padding-x-lg padding-y-md">
    <div class="catalog-list">
        <div class="catalog-list__item">
            <div class="catalog-list__title"><a href="">Rare Styles backlog</a></div>
            <div class="catalog-list__meta">
                Planning · <a href="">CSS</a> · updated 10.06.2026 ·
                <span class="tag">#roadmap</span>
                <span class="tag">#release</span>
            </div>
            <p>Master milestone list for upcoming cleanup, namespace work, and docs-driven audits.</p>
        </div>
        <div class="catalog-list__item">
            <div class="catalog-list__title"><a href="">Harvest manifest v0.6.14</a></div>
            <div class="catalog-list__meta">
                Release docs · <a href="">Typography</a> · updated 10.06.2026 ·
                <span class="tag">#harvest</span>
                <span class="tag">#lists</span>
            </div>
            <p>Curated record of imported list patterns, resolved naming forks, and remaining integration work.</p>
        </div>
    </div>
</div>

The summary paragraphs above are plain `<p>` elements — host content, not component API.

### `.catalog-list--nest`

Indents everything under the title, so each entry reads as a parent with its nested contents: the children of the thing named in the title. Use it for file trees, API surfaces, section maps, and other hierarchical indexes.

<div class="catalog-list catalog-list--nest">
    <div class="catalog-list__item">
        <div class="catalog-list__title">/styles/typography/</div>
        <div class="catalog-list__meta">Section</div>
        <ul class="list-unstyled">
            <li><a href="">Body Text</a></li>
            <li><a href="">Lists &amp; Columns</a></li>
            <li><a href="">Tables</a></li>
        </ul>
    </div>
    <div class="catalog-list__item">
        <div class="catalog-list__title">/styles/layout/</div>
        <div class="catalog-list__meta">Section</div>
        <ul class="list-unstyled">
            <li><a href="">Grid</a></li>
            <li><a href="">Spacing</a></li>
        </ul>
    </div>
</div>

<div class="teaser-bottom">
    <p>Next:</p>
    <h3><a href="/styles/typography/tables/">Tables</a></h3>
</div>
