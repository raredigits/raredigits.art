# Rare Styles starter

Two working pages for a small content site: an article index and an article with an image, a table and two charts. Plain HTML, CSS and JavaScript, with no build step and no framework. Copy the folder, change the content and publish.

```
starter/
├── index.html          article index
├── article.html        an article: prose, figure, table, two charts, a note
└── assets/
    ├── project.css     your layer: brand tokens + the article layout recipe
    ├── charts.js       draws charts from their data tables (loads RareCharts on demand)
    └── img/            example images, replace with your own
```

## 1. Copy and serve

Copy `starter/` anywhere and serve it with any static server. A server is needed because `file://` pages cannot fetch the CDN files reliably.

```bash
cd starter
python3 -m http.server 8000
```

Open <http://localhost:8000/>. All links between the pages and to the assets are relative, so the folder works at the site root and under a sub-path (`example.com/notes/`) without changes.

## 2. Publish

Upload the folder as it is to any static host, such as GitHub Pages, Netlify, Cloudflare Pages or your own server. There is nothing to build. If you use a site generator or a CMS, the two pages are the templates: keep the markup and move the repeating parts (header, footer, the preview list item) into its partials.

## 3. Make it yours

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
- **Figures.** A `<figure>` inside `<article>` sits on the measure. Add `class="figure-wide"` for an image or chart that needs more room. Put the takeaway in `<figcaption>` and the credit in `<span class="figure-source">`. Give every `<img>` its real `width` and `height`, an `alt` that says what it shows, and `loading="lazy"` below the fold. To serve smaller files to phones, add `srcset` and `sizes="(width < 769px) 100vw, 640px"`. Producing the image files is your build's job.
- **Tables.** Wrap a table in `<div class="table-scroll">`, so a wide table scrolls sideways on a phone instead of the page.
- **Notes.** A reference is `<sup><a href="#note-1" id="ref-1">1</a></sup>`, and the note links back to `#ref-1`. Notes go in a `<div class="footnote">`. No script is needed.
- **Print.** Articles print without the header, and charts print as their data tables.

## Charts

A chart is a figure with three parts:

```html
<figure class="figure-wide" data-chart="line" data-chart-units="Index, January = 100">
    <div class="chart" role="img" aria-label="What the chart shows, in one sentence"></div>
    <figcaption>The takeaway. <span class="figure-source">Source: …</span></figcaption>
    <details class="chart-data" open>
        <summary>Data table</summary>
        <div class="table-scroll"><table>…</table></div>
    </details>
</figure>
```

- **The table is the data.** `charts.js` reads the first column as the date (from `data-value="YYYY-MM-DD"`) or the category, and the second column as the value. Edit the table and the chart follows. `data-chart="line"` draws a line; `data-chart="bar"` draws horizontal bars.
- **It degrades to the table.** Without JavaScript, or when the chart library cannot load, the reader gets the caption and the open table. With it, the table collapses under the chart and stays one click away. The chart box is reserved before the chart draws, so the text does not jump.
- **RareCharts loads only where it is used.** Pages include `assets/charts.js` only if they have charts (the index does not), and the script fetches RareCharts only when it finds a `data-chart` figure.
- **More chart types and options** (multi-series lines, annotations, themes): <https://raredigits.art/charts/>. Add a builder to the `builders` map in `charts.js`. To load data from a JSON or CSV file instead of the table, fetch it in the builder, and keep a table in the page as the fallback.

## Versions and upgrades

Both libraries are pinned to exact versions, so a release never changes your site until you choose to upgrade:

| Library | Where the version is | Pinned to |
|---|---|---|
| Rare Styles | the `rare-styles@…` stylesheet URL in `index.html` and `article.html` | `v0.7.1` |
| RareCharts | `RARECHARTS_SRC` at the top of `assets/charts.js` | `v0.9.8_4` |

To upgrade, read the changelog (<https://github.com/raredigits/rare-styles/blob/main/docs/Changelog.md>), change the version, and check both pages. **Self-hosting** instead of the CDN: download `rare.min.css` together with its `fonts/` and `images/` folders from <https://github.com/raredigits/rare-styles> at the same tag, keep them side by side, and point the `<link>` at your copy.
