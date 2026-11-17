---
layout: page.njk
title: "CSS Utilities"
section: "Styles"
displaySidebar: true
permalink: '/styles/utilities/'
---

Small single-purpose classes that adjust one thing on one element. Like everything in the library, they apply only inside `.rd`. Most live in `modules/utilities/`.

## Display and visibility

<div class="table-scroll">

| Class | Effect |
|---|---|
| `.block` / `.inline` / `.inline-block` | `display: block` / `inline` / `inline-block` |
| `.mobile-hidden` | Hidden below 769px (`display: none !important` on mobile) |
| `.rd-is-hidden` | State class set by the companion scripts: always `display: none !important`, whatever state the component is in |

</div>

## Wrapping

<div class="table-scroll">

| Class | Effect |
|---|---|
| `.wrap` / `.no-wrap` | `flex-wrap: wrap` / `nowrap` on a flex container |
| `.text-wrap` | `white-space: normal` (for no wrapping, see `.nobr` on [Text Elements](/styles/typography/text-content/)) |

</div>

## Alignment

These live in `layout/_grid.scss`. `.self-start`, `-center`, `-end` and `-stretch` set `align-self` on one item of a flex or grid container. On the container, `.items-*` (the same four) sets `align-items` and `.justify-items-*` sets `justify-items`; `.grid-center` sets `place-items: center`, and `.grid-flow-row`, `-col` and `-dense` set `grid-auto-flow`.

## Overflow and scrolling

<div class="table-scroll">

| Class | Effect |
|---|---|
| `.scroll-container` | `overflow: auto`. It only scrolls when the box has a height (`max-height`, `.height-*`) |
| `.table-scroll` | Wrap a wide table in it: the table scrolls inside instead of widening the page |
| `.overflow-hidden` | `overflow: hidden` |
| `.no-scrollbar` | Keeps scrolling, hides the scrollbar |

</div>

## Stacking

`.z-index-0` … `.z-index-5` set `z-index` from 0 to 5. Library chrome sits above them (header 100, skip link 1000).

`.opacity-0`, `-25`, `-50`, `-75` and `-100` set `opacity` in quarter steps, for a decoration set back: a shape, a watermark. A disabled control fades on its own.

## Resets

<div class="table-scroll">

| Class | Effect |
|---|---|
| `.no-decoration` | Removes underline, link fill, borders, shadow and `::before` glyphs, for links that are not text links |
| `.no-padding` | `padding: 0` |
| `.no-border` | Removes all borders |

</div>

## Responsive prefixes

Spacing, sizing, position, grid and type-size utilities come in breakpoint variants: `mobile:`, `tablet:` and `desktop:`, as in `mobile:padding-sm`, `desktop:grid-cols-3` or `mobile:font-size-sm`. The breakpoints have no gaps between them, so a fractional viewport such as 768.5px always lands in exactly one:

<div class="table-scroll">

| Prefix | Viewport |
|---|---|
| `mobile:` | `width < 769px` |
| `tablet:` | `769px <= width < 1024px` |
| `desktop:` | `width >= 1024px` |

</div>

The full spacing scale is on [Spacing](/styles/layout/spacing/).

## Accessibility helpers

### Focus ring

Every focusable element inside `.rd` shows a ring on keyboard focus (`:focus-visible`), so mouse clicks stay ring-free. The ring is driven by three tokens. Override them on `:root`:

```css
:root {
  --focus-ring-color: var(--signal);  /* blue by default: ≥ 3:1 on every library surface */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
}
```

Don't remove the ring with `outline: none` unless you replace it with an equally visible `:focus-visible` style.

### `.visually-hidden`

Hides content from sight but keeps it for screen readers: an icon button's label, a table caption that only repeats the heading. If the element or anything inside it receives focus, it is shown in place, so a focused element is never invisible. There is no `.sr-only` alias.

```html
<button class="icon-search">
  <span class="visually-hidden">Search the site</span>
</button>
```

### `.skip-to-content`

The first link on the page. It stays hidden until it receives keyboard focus, then appears above the fixed header. Point it at the page title or the main content so keyboard users can skip the header and the sidebar:

```html
<body>
  <a class="skip-to-content" href="#main-content">Skip to content</a>
  …
  <section class="page-title" id="main-content">…</section>
```

The target scrolls clear of the fixed header on its own: `html` carries `scroll-padding-top` from `--header-height`.

## Print

<div class="meta-info">css/modules/utilities/_print.scss</div>

An article prints, or saves as PDF, without the page chrome: the header, the footer, the sidebar, the search and the menu, the cookie notice and the carousel and copy controls are left off the paper. The article runs at the full width of the page; the prose keeps its reading measure (550px on an A4 or Letter page). Outdented blocks fold back into the column (code blocks, quotes, the lead, highlights and captions, every caption width including `.card-caption`, teasers and collapsible containers), and a heading stays with the text that follows it. A figure, a quote, a code block or a table row is never split across two pages, and a table in a `.table-scroll` box prints whole, wrapped to the page: the code in its cells breaks again where it must.

A `.card-inverted` prints as a light card in a thin frame: the page’s text, link and border colours on white paper, so nothing light is left on the sheet and no dark ground costs ink. A colour you set light yourself inside it (`.white`, `.gray-light`) stays light: give it a print colour.

An external link in the prose prints its address after the text, in small type: `(https://…)`. Links to places on the same page and note marks do not, and neither do links inside an embedded chart (`.rc-chart`): its source line and notes are not prose. Hiding the chart's own controls on paper is the chart library's job.
