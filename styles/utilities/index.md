---
layout: page.njk
title: "CSS Utilities"
section: "Styles"
displaySidebar: true
permalink: '/styles/utilities/'
---

{% include "special/construction-notice.njk" %}
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
