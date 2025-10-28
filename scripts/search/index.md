---
layout: page.njk
title: "Search"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/search/'
---

<div class="meta-info">
js/hamburger.js<br>
<p>
    v.1.0 Stable | 
    <a href="/assets/js/hamburger.js">Download</a> <span class="material-icons">file_download</span>
</p>
</div>

For small static websites it usually makes more sense to use an off-the-shelf search library instead of building a custom solution from scratch. It saves development time, has lower maintenance cost, and is more reliable in the long run. One such solution — which is used on this site — is Pagefind.

[Pagefind](https://pagefind.app) is a fast, privacy-friendly, static-site search engine. It builds a client-side index from your generated HTML and serves results instantly—no external services, no backend, and minimal JavaScript. For Eleventy sites, Pagefind plugs in cleanly after the static build, indexing only what you ship to production.

## Installation

1.	Install packages командой в терминале

```html
npm i -D @11ty/eleventy pagefind
```

2.	Обновляем скрипты сборки и запуска сайта в файл package.json

```html
"scripts": {
    "start": "eleventy --serve & pagefind --source _site",
    "build": "eleventy",
    "postbuild": "pagefind --source _site"
},
```

3. Проверяем установку зависимостей в файле package.json

```html
"devDependencies": {
    "@11ty/eleventy": "^3.1.0",
    "pagefind": "^1.1.0"
}
```

<div class="air-lg"></div>

## Adding the Search UI to the Website

First, we need an element that will allow users to open the search interface. In this example, we place a button in the site header next to the hamburger menu:

```html
<div class="header-icons">
  <button class="icon-search no-decoration" id="search-button" aria-label="Поиск">
      <span class="material-icons">search</span>
  </button>
  <button class="hamburger no-decoration" aria-label="Toggle navigation">
      <span class="material-icons icon-menu">menu</span>
      <span class="material-icons icon-close">close</span>
  </button>
</div>
```

Next, create a container that will hold both the search input and the search results. Initially it is hidden until the user clicks the search button.

```html
<div class="search-wrapper">
  <div id="searchbar" class="searchbar" hidden>
    <div id="search" class="search-input"></div>
  </div>
</div>
```

All nessasary styles already included to the Rare Style. Also Pagefind ships with its own default styles and JavaScript. Include them inside `<head>` of your layout:

```html
<link rel="stylesheet" href="/pagefind/pagefind-ui.css">
<script src="/pagefind/pagefind-ui.js" defer></script>
```

Now add a small JavaScript file that will initialize Pagefind UI and show/hide the search panel when the user clicks the button:

```js
function initSearchUI() {
    var btn = document.getElementById('search-button');
    var bar = document.getElementById('searchbar');
    var container = document.getElementById('search');
    var initialized = false;
    var inputListenerAdded = false;

    function openSearch() {
        if (bar) {
            bar.hidden = false;
        }
        
        if (!initialized && window.PagefindUI && container) {
            new PagefindUI({
                element: '#search',
                showSubResults: true,
                translations: { placeholder: 'Search…' }
            });
            initialized = true;
        }
        
        setTimeout(function() {
            if (container) {
                var input = container.querySelector('input[type="text"]') || container.querySelector('input');
                if (input) {
                    if (input.focus) input.focus();
                    
                    if (!inputListenerAdded) {
                        input.addEventListener('input', function() {
                            if (!bar) return;
                            if (input.value && input.value.trim().length > 0) {
                                bar.classList.add('has-query');
                            } else {
                                bar.classList.remove('has-query');
                            }
                        });
                        inputListenerAdded = true;
                    }
                }
            }
        }, 50);
        
        document.addEventListener('keydown', escListener);
    }

    function closeSearch() {
        if (bar) {
            bar.hidden = true;
            bar.classList.remove('has-query');
        }
        document.removeEventListener('keydown', escListener);
    }

    function escListener(e) {
        if (e.key === 'Escape') closeSearch();
    }

    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (bar && bar.hidden) {
                openSearch();
            } else {
                closeSearch();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchUI);
} else {
    initSearchUI();
}
```

Finally, make sure this script is included at the end of the page, before `</body>`:

```html
<script src="/assets/js/search.js"></script>
```

After running your Eleventy build and Pagefind index build, the search UI should be working.

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