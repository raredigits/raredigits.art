---
layout: page.njk
title: "Search"
section: "Scripts"
displaySidebar: true
permalink: '/scripts/search/'
templateEngineOverride: md
---

<div class="meta-info">
js/search.js<br>
<p>
    v.1.1 Stable | 
    <a href="/assets/js/search.js">Download</a> <span class="material-icons">file_download</span>
</p>
</div>

If you need search on a static website, the easiest and most reliable option is to use a ready-made library instead of building your own search from scratch. It works out of the box, is free to use, and has already been tested on many real websites. One such library — and the one used on this site — is Pagefind.

[Pagefind](https://pagefind.app) is a fast and privacy-friendly search engine designed specifically for static sites. It scans the already-built HTML pages and creates a small client-side index, so search works instantly in the browser without any backend or third-party service. On Eleventy sites, Pagefind integrates right after the build step and indexes only what is actually deployed to production.

## Installation

1. Run the installation command from the root directory of your project. This will add Pagefind to your development dependencies.

```html
npm i -D pagefind
```

2. Update the build and start scripts. Open your package.json file and modify the “scripts” section so that Pagefind runs automatically after Eleventy builds the site, and so that both can be run together during local development.

```html
"scripts": {
    "start": "eleventy --serve & pagefind --source _site",
    "build": "eleventy",
    "postbuild": "pagefind --source _site"
},
```

3. Verify that the dependencies are listed in package.json. In the same file, scroll down to the “devDependencies” section and make sure that both @11ty/eleventy and pagefind are present with valid version numbers.

```html
"devDependencies": {
    "@11ty/eleventy": "^3.1.0",
    "pagefind": "^1.1.0"
}
```

If the installation was successful, they should appear there automatically.

## Adding the Search UI to the Website

First, we need an element that will allow users to open the search interface. In this example, we place a button <span class="material-icons">search</span> in the website header next to the hamburger menu:

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

All necessary styles are already included in Rare Styles. Pagefind also ships with its own default styles and JavaScript. Include them inside the `<head>` section of your layout:

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

After you start the site locally and Pagefind finishes indexing (for example by running `npm run start` from your terminal), the search UI should be fully functional.

You can always customize how the search results look by applying your own styles.

## Indexing Controls

Pagefind gives you several simple HTML-based controls to fine-tune what gets indexed and how search results are ranked. These settings are added directly in your templates using attributes or meta tags. The full list of options is available in the official [documentation](https://pagefind.app/docs/), below are the ones you will most likely need in practice.

#### Excluding a page from the index

If a page should never appear in search results (for example, the search page itself or some drafts), set a flag in the template:

```njk
{% set pagefind_exclude = true %}
```

Then in your layout `<head>` section, add a conditional meta tag:

```html
{% if pagefind_exclude %}
  <meta name="pagefind:exclude" content="true">
{% endif %}
```

Any page with this flag will be completely removed from the index.

#### Limiting the indexed area on a page

By default, Pagefind indexes the entire visible HTML. To prevent navigation bars, footers, hidden UI elements or banners from being indexed, you can explicitly mark only the “content” area using data-pagefind-body:

```html
<header> … navigation, logo … </header>

<main data-pagefind-body>
    <!-- only this content will be indexe -->
    <h1>Article title</h1>
    <p>Some text of the article…</p>
</main>

<footer> … contacts, copyright … </footer>
```

Everything outside the data-pagefind-body container will be ignored during indexing.

#### Ignoring specific elements

When you do not want to restructure the layout or you only need to ignore a few blocks, you can mark them individually:

```html
<nav data-pagefind-ignore>…</nav>
<div class="sidebar" data-pagefind-ignore>…</div>
<div class="ads" data-pagefind-ignore>…</div>
```

Ignored nodes and everything inside them will not be indexed.

#### Prioritizing certain pages in search results

You can give some pages more “weight” so they will appear higher in search results. For example, to boost blog posts over static pages:

```html
<html data-pagefind-weight="10">
```

And for lower-priority pages:

```html
<html data-pagefind-weight="2">
```

Higher values result in higher ranking when relevance is equal.

### Additional configuration

Pagefind also supports optional configuration for translations, filters, metadata-based filtering, and other advanced options (for example: restricting results by tags, grouping by content type, or customizing UI strings). These features are configured either through HTML attributes or through the `PagefindUI` initialization options. Refer to the official [documentation](https://pagefind.app/docs/) for the full list of supported options.

## Search Page

In addition to the “overlay” search opened from a button in the header, you may also want to have a stand-alone search page at /search/. This is useful when you want a full-page search experience (especially on mobile), or when users expect search to exist as a real page in navigation.

#### 1. Create a new template for the search page.

Create a file such as search.njk with the following front matter and markup:

```njk
---
layout: page
title: Search
permalink: /search/
pagefind_exclude: true # do not index this page itself
disable_header_search: true # hide the overlay-search button on this page
body_class: page-search # optional CSS hook
---

<div id="search-page"></div>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.PagefindUI) {
      new PagefindUI({
        element: '#search-page',   // stand-alone search container
        showSubResults: true,
        translations: {
          placeholder: 'Search…',
          load_more: 'Load more'
        }
      });
    }
  });
</script>
```

Key points:
- `pagefind_exclude`: true ensures this page will not show up in the search results itself.
- we use a different container (`#search-page`) so it does not conflict with the overlay search container.
- we optionally pass `disable_header_search`: true so that the header button won’t show on this page.

To conditionally style or change behavior on specific pages (for example, on the dedicated search page), you can pass a custom class through front matter and render it on the `<body>` element.

```njk
<body class="{{ body_class }}">
```

With the example above, the search page will render as:

```html
<body class="page-search">
```

This makes it possible to target this page in CSS or conditionally skip overlay initialization in JavaScript.

#### 2. Hide the overlay-search button on this page (optional)

In your header template, wrap the search button in a condition:

```njk
{% if not disable_header_search %}
  <button id="search-button" ...>…</button>
{% endif %}
```

Alternatively, you may simply hide it with CSS using `.page-search` as a body class.

#### 3. Prevent the overlay script from running on the search page

If your overlay is initialized by a global script such as `/assets/js/search.js`, add a guard at the top:

```js
// Do not initialize the overlay search on the dedicated /search/ page
if (document.body.classList.contains('page-search')) return;
```

This ensures there will never be two search UIs active on the same page.

At this point, the setup provides two independent search interfaces: an overlay search that is opened from the header on regular pages, and a dedicated /search/ page with a full-page search interface. They do not conflict with each other because they use separate containers and separate initialization logic. The search page itself is excluded from the index so it never appears in search results, which is the recommended practice for dedicated search pages.
