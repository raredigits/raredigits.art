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
    v.1.0 Stable | 
    <a href="/assets/js/hamburger.js">Download</a> <span class="material-icons">file_download</span>
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

Second, structure your navigation. The hamburger menu requires a navigation container with the .nav-hamburger class. This element should be hidden by default using CSS:

```css
.nav-hamburger {
  position: fixed;
  top: -100%;
  width: 100%;
  /* Additional styling as needed */
  transition: top 0.3s ease;
}

.nav-hamburger.active {
  top: 0;
}
```

Third, add the toggle button. Place the hamburger button in your header or another accessible location:

```html
<button class="hamburger no-decoration" aria-label="Toggle navigation">
  <span class="material-icons icon-menu">menu</span>
  <span class="material-icons icon-close">close</span>
</button>
```
The button uses Material Icons for visual clarity, but you can substitute any icon system or create custom hamburger lines using CSS.

## Functionality

The script automatically handles:

- Toggling the menu open/closed when clicking the hamburger button
- Closing the menu when users click anywhere outside the menu area
- Adding/removing the `.active` class to control visibility

<div class="air-md"></div>

<details>
    <summary>Raw code</summary>

```js
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navGlobal = document.querySelector('.nav-hamburger');

  // Toggle the hamburger menu on click
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navGlobal.classList.toggle('active');
  });

  // Closing the menu when clicking outside
  document.addEventListener('click', (event) => {
    if (!navGlobal.contains(event.target) && !hamburger.contains(event.target)) {
      hamburger.classList.remove('active');
      navGlobal.classList.remove('active');
    }
  });
});
```
</details>