---
layout: page.njk
title: "Content Starter"
section: "Styles"
displaySidebar: false
permalink: '/examples/styles/content-starter/'
---

<p class="lead">Two working pages for a small content site — an article index and an article with an image, a table and two charts. Plain HTML, CSS and JavaScript: copy the folder, change the content, publish.</p>

<p><a href="/examples/starter/">Open the starter</a> · <a href="/examples/starter/article.html">Open the example article</a> · <a href="https://github.com/raredigits/raredigits.art/tree/main/examples/starter">Source on GitHub</a></p>

## What it is

The starter is the shortest path from Rare Styles to a published site with articles and charts. It is not a theme and not a framework: no build step, no generator, no package to install. Every page works from any static root, including a sub-path like `example.com/notes/`.

```
starter/
├── index.html          article index
├── article.html        an article: prose, figures, a table, two charts, a note
└── assets/
    ├── project.css     your layer: brand tokens and the article layout
    ├── charts.js       draws charts from their data tables
    └── img/            example images, replace with your own
```

## How to use it

1. **Copy and serve.** Copy the [`examples/starter/`](https://github.com/raredigits/raredigits.art/tree/main/examples/starter) folder from the repository and serve it with any static server — a server is needed because `file://` pages cannot load the CDN files reliably:

    ```bash
    cd starter
    python3 -m http.server 8000
    ```

2. **Make it yours.** Replace the site name, the articles and the images. Brand colours and fonts are tokens at the top of `assets/project.css`; your own rules go in that file too, never in `rare.css`, so a library upgrade cannot overwrite them.
3. **Publish.** Upload the folder as it is to any static host. With a site generator or a CMS, the two pages are your templates: keep the markup and move the repeating parts into its partials.

The only integration step is the `rd` class on `<html>` — see [Getting Started](/styles/getting-started/) for page mode and islands.

## What is inside the article

- **Prose on the reading measure.** Headings, lists, a quote and a note reference; long words and URLs break instead of widening the page.
- **Figures.** An ordinary figure keeps to the measure; give it `full-width`, `text-content-caption` or `full-width-caption` for more room. The caption takes `.figure-source` for the credit line. See [Figures](/styles/typography/text-content/#figures).
- **A table** in `.table-scroll`, so on a phone it scrolls inside its own box.
- **Two charts**, a line and a bar, drawn by [RareCharts](/charts/).

## Charts that survive without JavaScript

Each chart is a figure that holds its own data table. `charts.js` reads the table and draws the chart from it, so there is one source of truth for the numbers.

- **Without JavaScript**, or when the chart library cannot load, the reader gets the caption and the open table instead of an empty box.
- **With JavaScript**, the table collapses under the chart and stays one click away.
- **On paper**, the chart prints as its table.
- **RareCharts loads only where it is used.** The index page has no charts and does not download it.

To add a chart, copy a chart figure and edit its table; `data-chart="line"` draws a line, `data-chart="bar"` horizontal bars.

## Versions

Rare Styles and RareCharts are pinned to exact versions — the stylesheet URL in both pages and `RARECHARTS_SRC` in `charts.js`. A new release changes nothing on your site until you change the pin. Read the [changelog](https://github.com/raredigits/rare-styles/blob/main/docs/Changelog.md) before you upgrade.

The full walkthrough is in the starter's [README](https://github.com/raredigits/raredigits.art/blob/main/examples/starter/README.md).
