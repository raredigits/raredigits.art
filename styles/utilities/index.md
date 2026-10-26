---
layout: page.njk
title: "CSS Utilities"
section: "Styles"
displaySidebar: true
permalink: '/styles/utilities/'
---

Small single-purpose classes that adjust one thing on one element. They live in `modules/utilities/` and, like everything in the library, apply only inside `.rd`.

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

## Resets

<div class="table-scroll">

| Class | Effect |
|---|---|
| `.no-decoration` | Removes underline, link fill, borders, shadow and `::before` glyphs, for links that are not text links |
| `.no-padding` | `padding: 0` |
| `.no-border` | Removes all borders |

</div>

## Responsive prefixes

Spacing, sizing, position and grid utilities come in breakpoint variants: `mobile:`, `tablet:` and `desktop:`, as in `mobile:padding-sm` or `desktop:grid-cols-3`. The breakpoints have no gaps between them, so a fractional viewport such as 768.5px always lands in exactly one:

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
  --focus-ring-color: var(--blue);  /* ≥ 3:1 on every library surface */
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

An article prints, or saves as PDF, without the page chrome: the header, the footer, the sidebar, the search and the menu, the cookie notice and the carousel and copy controls are left off the paper. The prose runs at the full width of the page, outdented blocks fold back into the column, and a heading stays with the text that follows it. A figure, a quote, a code block or a table row is never split across two pages, and a table in a `.table-scroll` box prints whole, wrapped to the page: the code in its cells breaks again where it must.

An external link in the prose prints its address after the text, in small type: `(https://…)`. Links to places on the same page and note marks do not, and neither do links inside an embedded chart (`.rc-chart`): its source line and notes are not prose. Hiding the chart's own controls on paper is the chart library's job.
