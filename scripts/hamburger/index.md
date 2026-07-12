---
layout: page.njk
title: "Hamburger Menu Script"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/hamburger/'
---

<div class="meta-info">
js/hamburger.js<br>
<p>
    v2.0.0 Stable (breaking: `rd-js-` hook) | 
    <a href="/assets/js/hamburger.js">Download</a> <span class="material-symbols-outlined">download</span>
</p>
</div>

The hamburger menu script provides a clean, accessible way to hide frequently used information while keeping it just one click away. This pattern works best for:

* Secondary navigation options
* Frequently Asked Questions (FAQ)
* Documentation and instructions
* Quick links that don't warrant space in your primary navigation

Remember: Avoid hiding critical navigation or primary user paths in hamburger menus. For guidance on strategic implementation, see [The Hamburger Menu Saga](/kb/hamburger-menu-saga/) which explains why hamburgers work best for supplementary content rather than main navigation.

<div class="air-lg"></div>

## Implementation

First, place the hamburger script at the very end of your `<body>` element to ensure the DOM is fully loaded before the script runs:

```html
<script src="assets/js/hamburger.js"></script>
</body>
```

Second, structure your navigation. The script finds the panel by the `rd-js-hamburger-nav` hook class; presentational styling lives on a separate class (here `.nav-hamburger`). The panel should be hidden by default using CSS, and shown by the `rd-is-active` state class the script toggles:

```css
.nav-hamburger {
  position: fixed;
  top: -100%;
  width: 100%;
  /* Additional styling as needed */
  transition: top 0.3s ease;
}

.nav-hamburger.rd-is-active {
  top: 0;
}
```

```html
<div class="nav-hamburger rd-js-hamburger-nav">…</div>
```

Third, add the toggle button. The script hooks it via `rd-js-hamburger`; place it in your header or another accessible location:

```html
<button class="hamburger no-decoration rd-js-hamburger" aria-label="Toggle navigation">
  <span class="hamburger__icon-menu"></span>
  <span class="hamburger__icon-close"></span>
</button>
```

The icon spans are empty on purpose: the glyphs are baked into the classes by CSS (Material Symbols ligatures rendered via `::before`), so markup carries no vendor icon class and no ligature text. The menu ↔ close swap is also pure CSS keyed off the state class — the script never touches the icons. Rare Styles ships all of this; standalone users need:

```css
.hamburger__icon-menu,
.hamburger__icon-close {
  display: inline-block;
  font-family: "Material Symbols Outlined";
}

.hamburger__icon-menu::before { content: "menu"; }
.hamburger__icon-close::before { content: "close"; }

.hamburger__icon-close { display: none; }
.hamburger.rd-is-active .hamburger__icon-menu { display: none; }
.hamburger.rd-is-active .hamburger__icon-close { display: inline-block; }
```

You can substitute any icon system or draw custom hamburger lines in CSS — the script only toggles state classes.

## Contract

- `rd-js-hamburger` / `rd-js-hamburger-nav` are **hooks**: the script reads them, CSS never styles them
- `rd-is-active` is **state**: the script writes it on both elements, CSS styles it
- `aria-expanded` on the button mirrors the open/closed state on every toggle; if the panel has an `id`, the script also sets `aria-controls`
- `hamburger__icon-menu` / `hamburger__icon-close` are **presentational** BEM elements of the button — styled by CSS, invisible to the script
- If either hook is missing on a page, the script safely does nothing

## Functionality

The script automatically handles:

- Toggling the menu open/closed when clicking the hamburger button
- Closing the menu on a click outside the menu area or on <kbd>Escape</kbd> (both listeners are attached only while the menu is open)
- Adding/removing the `rd-is-active` state class and keeping `aria-expanded` in sync

<div class="air-md"></div>

<details>
    <summary>Raw code</summary>

```js
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.rd-js-hamburger');
  const navGlobal = document.querySelector('.rd-js-hamburger-nav');
  if (!hamburger || !navGlobal) return;

  // Closing the menu when clicking outside — attached only while open
  const outsideListener = (event) => {
    if (!navGlobal.contains(event.target) && !hamburger.contains(event.target)) {
      setState(false);
    }
  };

  const escListener = (event) => {
    if (event.key === 'Escape') setState(false);
  };

  const setState = (open) => {
    hamburger.classList.toggle('rd-is-active', open);
    navGlobal.classList.toggle('rd-is-active', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      document.addEventListener('click', outsideListener);
      document.addEventListener('keydown', escListener);
    } else {
      document.removeEventListener('click', outsideListener);
      document.removeEventListener('keydown', escListener);
    }
  };

  if (navGlobal.id) hamburger.setAttribute('aria-controls', navGlobal.id);
  setState(false);

  // Toggle the hamburger menu on click
  hamburger.addEventListener('click', () => {
    setState(!navGlobal.classList.contains('rd-is-active'));
  });
});
```
</details>

## Changelog

### v2.0.0

- **Breaking:** hooks moved to the `rd-js` contract — the script now finds elements via `rd-js-hamburger` / `rd-js-hamburger-nav`, not `.hamburger` / `.nav-hamburger`
- **Breaking:** state class renamed `.active` → `.rd-is-active`
- **Breaking:** icon elements renamed to BEM — `.icon-menu` / `.icon-close` → `.hamburger__icon-menu` / `.hamburger__icon-close` (CSS-only rename; the script never reads them)
- Added `aria-expanded` on the toggle button, plus `aria-controls` when the panel carries an `id`
- Added <kbd>Escape</kbd> to close; outside-click and Escape listeners are attached only while the menu is open
- Added a guard: pages without the hooks no longer throw
