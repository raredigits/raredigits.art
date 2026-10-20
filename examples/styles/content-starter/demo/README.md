# Rare Styles starter

Two working pages for a small content site: an article index and an article with an image, a table and two charts. Plain HTML, CSS and JavaScript, with no build step and no framework. Copy the folder, change the content and publish.

```
starter/
├── index.html          article index
├── article.html        an article: prose, figure, table, two charts, a note
└── assets/
    ├── project.css     your layer: brand tokens + the article layout recipe
    └── img/            example images, replace with your own
```

## 1. Open

Unpack the folder anywhere and open `index.html` in a browser. Nothing to install, no server to run: Rare Styles and RareCharts come from the CDN through a `<link>` and a `<script>` in `<head>`. All links between the pages and to the assets are relative, so the folder works opened from disk, at a site root and under a sub-path (`example.com/notes/`) without changes.

## 2. Publish

Upload the folder as it is to any static host, such as GitHub Pages, Netlify, Cloudflare Pages or your own server. There is nothing to build. If you use a site generator or a CMS, the two pages are the templates: keep the markup and move the repeating parts (header, footer, the preview list item) into its partials.

## 3. Make it yours

It is plain HTML: change the text, add your images and media, copy the blocks you need. The demo article shows the most common elements already styled (headings, lists, a quote, a figure with a caption, a table, charts), so most of the time you copy a block and edit it. If something is unclear, see <https://raredigits.art/styles/>, or ask your AI agent to read the instruction banners at the top of `rare.css` and `rare-charts.min.js`.

- **Name and text.** Replace "Data Notes" in both pages, the footer and the `<title>`s.
- **Brand and fonts.** Edit the tokens at the top of `assets/project.css`. Every library colour and font is a CSS custom property on `:root`, and `project.css` loads after `rare.css`, so your values win. The full token list is at <https://raredigits.art/styles/>.
- **Your own rules** go in `project.css`, never in `rare.css`. Then a library upgrade cannot overwrite them.

## The one integration step

Rare Styles changes nothing on a page until it sees the `rd` class. The starter puts it on `<html>`, which is page mode: header, page grid, typography and components all apply.

```html
<html lang="en" class="rd">
```

To use the library inside a page that is styled by something else, put `class="rd"` on one element instead (an island). Only that element and its contents are styled. See <https://raredigits.art/styles/getting-started/>.

## Articles

- **Reading measure.** Paragraphs, lists and headings keep a comfortable line length. Long words and URLs break instead of widening the page.
- **Figures.** A `<figure>` inside `<article>` sits on the measure. For more room give it one of the library's width classes: `full-width` (the content column), `text-content-caption` (the measure plus an outdent on both sides) or `full-width-caption` (outdented on the left, out to the column edge on the right). Put the takeaway in `<figcaption>` and the credit in `<span class="figure-source">`. Give every `<img>` its real `width` and `height`, an `alt` that says what it shows, and `loading="lazy"` below the fold. To serve smaller files to phones, add `srcset` and `sizes="(width < 769px) 100vw, 640px"`. Producing the image files is your build's job.
- **Tables.** Wrap a table in `<div class="table-scroll">`, so a wide table scrolls sideways on a phone instead of the page.
- **Notes.** A reference is `<sup><a href="#note-1" id="ref-1">1</a></sup>`, and the note links back to `#ref-1`. Notes go in a `<div class="footnote">`. No script is needed.
- **Print.** Articles print without the header and the controls.

## Charts

The article page loads RareCharts in `<head>` and draws each chart at the end of `<body>`, once its container exists:

```html
<div id="chart-index" class="full-width margin-y-lg"></div>

<script>
    new RareCharts.Line('#chart-index', {
        title: 'Prices by Category',
        subtitle: 'Monthly price index, January 2026 = 100, 2024–2026',
        source: 'Source: Illustrative Data',
    }).setData([ { date: '2026-01-01', value: 100 }, … ]);
</script>
```

- **Title, subtitle, legend and source are options.** The chart sets them in place; do not write them as HTML around the container.
- **Width is the container's.** `full-width` spans the content column, `text-content-width` keeps the chart on the reading measure.
- **Pages without charts** (the index) do not load RareCharts at all: leave the `<script>` out of their `<head>`.
- **All chart types, data shapes and options:** <https://raredigits.art/charts/>. An AI agent can start from the banner at the top of `rare-charts.min.js`, which lists the types, how to construct one and where each option is documented.

## Versions and upgrades

Both libraries are pinned to exact versions, so a release never changes your site until you choose to upgrade:

| Library | Where the version is | Pinned to |
|---|---|---|
| Rare Styles | the `rare-styles@…` stylesheet URL in `index.html` and `article.html` | `v0.7.1` |
| RareCharts | the `rare-charts@…` script URL in `article.html` | `v0.9.8_5` |

To upgrade, read the changelog (<https://github.com/raredigits/rare-styles/blob/main/docs/Changelog.md>), change the version, and check both pages. **Self-hosting** instead of the CDN: download `rare.min.css` together with its `fonts/` and `images/` folders from <https://github.com/raredigits/rare-styles> at the same tag, keep them side by side, and point the `<link>` at your copy.
