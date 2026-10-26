# Rare Styles — Migration 0.6 → 0.7

Opened by `CSS-340` (2026-10-16). `0.7.X` is a breaking-allowed series, and **every breaking release appends its rows here**. The baseline is the public API of `v0.6.19`, the last `0.6` release, snapshotted in [`api/v0.6.19.json`](./api/v0.6.19.json): 4 017 classes, 130 `:root` custom properties, `rare.css`/`rare.min.css` plus maps, and `fonts/` and `images/`. Regenerate a snapshot with `node scripts/api-snapshot.mjs <git-ref|--working> <label>`.

Consumers stay on version pins and migrate after the release ships. Nothing here changes a pinned site until its pin is bumped. A site on the unpinned GitHub Pages URL is the exception: it takes each release when it is published, until the Pages artifact is frozen (`CSS-T00`).

## `v0.7.0` — Scope Gate & Bug Closure

### The one required step

Add `class="rd"` to the `<html>` element of every page that loads Rare Styles, in the same commit that bumps the pin to `v0.7.0`:

```html
<html lang="en" class="rd">
```

Without it the page is **unstyled**: every library rule is gated by `.rd`.

### Change table

| # | Change | Was (`v0.6.19`) | Now (`v0.7.0`) | Consumer action | Kind | Task |
|---|---|---|---|---|---|---|
| 1 | Scope gate | Library styled every page that loaded it | Library styles apply only on `.rd` and inside it. `<html class="rd">` = page mode, `class="rd"` on an element = island | Add `class="rd"` to `<html>` | **breaking** | `CSS-343` |
| 2 | `<body class="rd">` | n/a | Everything except the `html`-level rules (`line-height`, `text-size-adjust`, `scroll-padding-top`) | Prefer `<html class="rd">` | note | `CSS-343` |
| 3 | Islands | n/a | An island gets tag styles and library classes, but no page shell (fixed header, `main`/`footer`, `nav` chrome) and no `body` base typography. The reset zeroes **user-agent** margins and padding on the island root and inside it at zero specificity, so the host's own rules still win (`CSS-078`) | None | new | `CSS-343` |
| 4 | Layout modes | n/a | `rd-layout-*` (from `v0.7.4`) needs `rd` next to it: `<html class="rd rd-layout-longread">` | Later | note | `Q-14` |
| 5 | Token overrides | On `:root` | Still on `:root`, ungated, loaded after `rare.css` | None | unchanged | `Q-14` |
| 6 | `rd-icon-*` | Worked anywhere | Still works anywhere (ungated) | None | unchanged | `Q-14` |
| 7 | `.padding*-auto` | 28 classes (`padding`, `-t/-r/-b/-l/-x/-y`, base and `mobile:`/`tablet:`/`desktop:`); `padding: auto` is invalid, so they computed to `padding: 0` | Removed | Use the matching `.padding*-0` (same result). No known consumer uses them | **breaking** | `CSS-346` |
| 8 | `--text-color-light` | `var(--gray-trans)` `#888` (3.1:1 on `--bg-color`) | `var(--gray-mid-dark)` `#666` (5.0:1) | None. To keep the old look: `:root { --text-color-light: var(--gray-trans) }` (fails WCAG AA) | visual | `CSS-114` |
| 9 | Nav / sidebar / footer / submenu / `.code-comment` text | Raw `--gray-trans` / `--gray` | `--text-color-light` (row 8) | Override the token, not the rules | visual | `CSS-114` |
| 10 | `h5`/`h6` margins | `0` (from the reset) | `var(--space-sm) 0`, same as `h4` | **Footers with `h5`/`h6` column headings grow by 16 px** (schnellreich.ru, raredigits.io). To keep zero: `footer :is(h5, h6) { margin: 0 }`. **Accepted as is (decided 2026-10-16):** the library keeps the rhythm, and both sites take the +16 px | visual | `CSS-126` |
| 11 | Anchor offset | Targets landed under the fixed header | `html { scroll-padding-top: calc(var(--header-height) + var(--space-sm)) }` | If your header is not `--header-height` tall, set your own `scroll-padding-top` on `html` | behavior | `CSS-129` |
| 12 | Keyboard focus | Browser default, partly suppressed | `:focus-visible` ring, `--focus-ring-color` (`--blue`), `--focus-ring-width` 2px, `--focus-ring-offset` 2px | Restyle via the tokens. Never remove without a replacement | new | `CSS-110` |
| 13 | Search input focus | `--brand-color` outline (1.2:1) | Focus-ring tokens | None | visual | `CSS-110` |
| 14 | `.visually-hidden` | n/a | New; shown in place while it has focus inside | Optional | new | `CSS-111` |
| 15 | `.skip-to-content` | n/a | New skip link; target `#main-content` | Optional: first link in `<body>` | new | `CSS-113` |
| 16 | Motion | Transitions always on | Only under `prefers-reduced-motion: no-preference`; end states unchanged | None | behavior | `CSS-112` |
| 17 | Outdents in `.card` | `pre`, `blockquote`, `.lead`, `.caption`, `.highlight`, caption-width blocks, `.card-caption`, `.collapsible-container` and `.teaser-bottom` could poke past a padded card | Reset to the card's content width | None | fix | `CSS-357` |
| 18 | 1024 px boundary | Sidenotes and `.teaser-bottom` collapsed at `width <= 1024px` | Collapse at `width < 1024px`; 1024 px is desktop everywhere | None | fix | `CSS-358` |
| 19 | Mobile overflow | Inline `code` never broke; `.card-row-bordered` and `.dl-grid` could widen the page | `code` uses `overflow-wrap: anywhere`; `.card-row-bordered` scrolls in its border; `.dl-grid` term column capped at 40% on mobile | Wrap wide tables in the existing `.table-scroll` | fix | `CSS-354` |
| 20 | Build | `sass` CLI | `scripts/build-css.mjs` (Sass → `rd-gate`). A plain `sass` build is **ungated** | Only if you build from source | tooling | `CSS-343` |
| 21 | Breakpoint media queries | `max-width: 768px` / `min-width: 769px` and `max-width: 1023px` / `min-width: 1024px` left sub-pixel gaps: at 768.18 px (110% scaling) or 1023.2–1023.6 px **no** layout layer applied | Gap-free range syntax: `width < 769px`, `769px <= width < 1024px`, `width >= 1024px` (same at integer widths) | None. Your own media queries should use the same boundaries | fix | `CSS-355` |
| 22 | `.rd-is-hidden` | `display: none` (0,1,0); lost to component states such as `.searchbar.rd-is-open`, `.collapsible-content.rd-is-open`, `.carousel-slide.rd-is-active` | `display: none !important`: hidden always wins | Don't rely on overriding it | fix | `CSS-359` |
| 23 | Closed hamburger menu | Off-screen (`top: -100%`) but focusable | Also `visibility: hidden` while closed | None | fix | `CSS-360` |
| 24 | Cookie notice vs focus | Focused elements could sit under the fixed notice | While the notice shows: `scroll-padding-bottom` and a `body::after` spacer of `--cookie-notice-reserve` (new token, 16rem) | Raise the token if your notice is taller | new token | `CSS-361` |
| 25 | `.card-inverted` text roles | Only the block colour and `a` were inverted; `cite`, `.meta-info` and similar stayed dark (1–2.2:1) | Text-role tokens re-mapped inside the card; `cite` uses `--text-color-dark` | None. Overriding roles inside your own dark surfaces follows the same pattern | fix | `CSS-364` |
| 26 | Links at rest | A 1px fill strip sat just under the link box (second underline in Safari) | Zero-height fill at rest; the hover fill is unchanged | None | fix | `CSS-365` |
| 27 | `.list-group-pack` on mobile/tablet | Group gaps were margins (Safari carried them into the next column) | Gaps are `padding-bottom` in the balanced layout | None | fix | `CSS-366` |
| 28 | CDN banner | — | `rare.css` / `rare.min.css` open with a `/*!` banner stating the `.rd` rule and the migration link | None | note | review 2026-10-17 |
| 29 | Right outdent (`.caption`, `.lead`, `.highlight`) | Always 32px into the right margin; overflowed the page at 769–1279px | At most the room that is there: `min(--space-lg, --field-width + --space-md)`; unchanged at ≥ 1280px | None | fix | `CSS-367` |
| 30 | `.iframe-video` | Its `aspect-ratio` could set a minimum width and overflow a grid column | `min-width: 0` | None | fix | `CSS-367` |

**Browser floor (decided 2026-10-16):** Chrome / Edge 111, Safari 16.4, Firefox 113. The range syntax stays; no support below this floor is planned. `color-mix()` (36 uses since `0.6`) already required Chrome 111 / Safari 16.2 / Firefox 113; the range media syntax (row 21, and already used by sidenotes in `0.6`) adds Safari 16.4. Older engines lose the affected rules. The `max-width: 768.98px`-style alternative was considered and rejected.

API diff, `v0.6.19` → `v0.7.0` (release, 2026-10-17): 4,017 → 3,991 classes: −28 (row 7), +2 (rows 14–15). 130 → 134 `:root` custom properties: +3 focus-ring tokens (row 12) and `--cookie-notice-reserve` (row 24). One changed value (row 8), no removed custom property, same artifact list. The table has 30 rows.

## `v0.7.1` — Content Starter

Mostly additive. Five classes and one selector are removed after an audit of `_text-content.scss`. **None of them is used** by raredigits.art, schnellreich.ru or raredigits.io (class attributes searched 2026-10-19), so no known consumer has to change markup.

| # | Change | Was (`v0.7.0`) | Now (`v0.7.1`) | Consumer action | Kind | Task |
|---|---|---|---|---|---|---|
| 1 | `.nobreak` | Alias of `.nobr` | Removed | Use `.nobr` | breaking (unused) | review 2026-10-19 |
| 2 | `.text-nowrap` | `white-space: nowrap` utility, a duplicate of `.nobr` | Removed | Use `.nobr` | breaking (unused) | review 2026-10-19 |
| 3 | `.font-weight-bold` | Utility, a duplicate of `.bold` | Removed | Use `.bold` | breaking (unused) | review 2026-10-19 |
| 4 | `.remark`, `.remarked` | Margin-remark component | Removed | None known; a sidenote (`.sidenote-wrapper`) covers the case | breaking (unused) | review 2026-10-19 |
| 5 | `p.highlight` | Separate selector, same rules as `.highlight` | Merged into `.highlight` | None | internal | review 2026-10-19 |
| 6 | Caption width (`.text-content-caption`, `.lead`, `.highlight`, `.teaser-bottom`) | `width: var(--text-content-caption)` whatever the container; `.teaser-bottom` used its own outdent with the full 32px on the right | Never wider than the room the outdent has (the `CSS-367` rule); on a phone the column plus 8px on each side. `.lead` no longer shrinks to 80% on a phone | None. **Visual delta:** the teaser no longer pushes the page sideways at 769–1279px; the lead is full width on a phone | fix | review 2026-10-19 |
| 7 | `.full-width-caption` | On a phone 16px wider than the column for an 8px outdent (8px page overflow) | Exactly the column plus the left outdent; `max-width: none` | None | fix | review 2026-10-19 |
| 8 | `<figure>` in `<article>` | No library styling | Reading measure, muted `figcaption`; takes `.full-width`, `.text-content-caption`, `.full-width-caption` | **Visual delta:** an existing article figure narrows to the prose measure; add one of the width classes to keep it wide | visual | `CSS-127` |
| 9 | `typography/_sidenotes.scss` | SCSS partial | Merged into `typography/_notes.scss` | Only if you `@use` the SCSS modules | tooling | review 2026-10-19 |
| 10 | Cookie notice reserve | While the notice showed: `scroll-padding-bottom` **and** a `body::after` spacer of `--cookie-notice-reserve` after the footer (`v0.7.0` row 24) | `scroll-padding-bottom` only; the spacer is gone | None. **Visual delta:** no empty band under the footer while the notice shows; the last footer links can sit under the notice until it is dismissed | visual | `CSS-361` follow-up |

## `v0.7.2` — Charts Dependencies, Site Harvest & Consumer Requests

**Breaking.** Three class names are removed with no alias, and a bare `<button>` and form fields inside `.rd` get the library look. The steps a site has to take:

1. Replace `.card-dashboard-bordered` with `.panel .panel--bordered`, `.card-row-bordered` with `.panel__row`, and `.card-row-bordered-item` with `.panel__row-item` (rows 1–2).
2. Check your buttons. They are inline now, with a white face and 4px corners. Use `.button-block`, or a page rule, where a button must sit on its own line (row 3).
3. Check your forms inside `.rd`. Fields, checkboxes and radios get the library look (rows 7–9). Host forms outside `.rd` are untouched.
4. Add `.attribution` to any `<cite>` used as a credit outside a blockquote. If you pin RareCharts ≤ 0.9.8_5 with this release, move to ≥ 0.9.8_6 (row 13).

Everything else is a visual refinement or a fix that needs no action.

**Unpinned consumers.** A site that loads the old GitHub Pages URL (`raredigits.github.io/rare-styles/rare.min.css`) gets every release the moment it is published, breaking ones included. That lasts until the Pages artifact is frozen (`CSS-T00`, `v0.7.7`). Pin a jsDelivr version instead (`@v0.7.2`).

| # | Change | Was (`v0.7.1`) | Now (`v0.7.2`) | Consumer action | Kind | Task |
|---|---|---|---|---|---|---|
| 1 | Data-row surface | `.card-dashboard-bordered` | Removed. Use `.panel .panel--bordered`: both classes, the padding is on `.panel`, the frame on the modifier. A panel is a block; with `__header`/`__body`/`__footer` parts it becomes a flex column A panel keeps outdents (`pre`, `blockquote`, `.lead`, `.caption`, `.highlight`, the caption widths) inside it, which the old class did not, so a 1:1 swap moves those blocks in by their outdent. | Replace the class. Drop a `.card` that sat on the same element only for this frame: a panel paints no background | **breaking** | `CSS-181` |
| 2 | Data row | `.card-row-bordered`, `.card-row-bordered-item` | Removed. Use `.panel__row` / `.panel__row-item`; new modes `.panel__row--stack` (dividers side by side, stacked on a phone) and `--text-start` | Rename | **breaking** | `CSS-181`, `CSS-371` |
| 3 | Bare `<button>` and `.button` | `display: block; width: fit-content`, grey pill (#fafafa, radius 32px); hover #f0f0f0 with a black frame | `inline-block`, as wide as the label; white, 1px `--border-color` frame, radius 4px (`--button-radius`); hover keeps white with a black frame; pressed fills `--bg-color`; 0.15s colour fade | For a line of its own: wrap it, use `.button-block` or a page rule `display: block` (`.block` works on `<button>`, not on `a.button`: utility order, `CSS-130`). Pill: `--button-radius: 999px` | **breaking (visual)** | `Q-04`, `CSS-040`, `CSS-043`, `CSS-046` |
| 4 | Button type | Inherited the context's size; line-height 1.15 | `--button-font-size` (1rem), line-height 1.2, `font-family: inherit`, centred; also on any `.button` `.button` sets display, font-size and line-height after the type and display utilities at equal weight, so `.subheader`, `.font-size-*` and `.block` no longer size or place an `a.button`. | A component that styles its own `<button>`: set `font: inherit`, line-height and alignment on its class For a bigger link-button use `.button-lg` or `--button-font-size`. | visual | `CSS-041`, `CSS-046` |
| 5 | Button states | No disabled or busy look; `button:hover` at (0,1,1) overrode single-class components | `:disabled` / `[aria-disabled="true"]`: opacity 0.5, no hover; `[aria-busy="true"]`: label hidden, a spinner (still under reduced motion). States at (0,0,1): any class wins A consumer rule with two element selectors (e.g. `form button { border-color }`, weight (0,0,2)) now also overrides the hover and pressed frame. | A component that resets a button names these states (see `button.legend__item`) Drop such a rule, or restate it under `:hover` / `:active`. | visual, fix | `CSS-043` |
| 6 | `<input type=submit\|button\|reset>` | Browser look, no padding (22px) | The default button look (37px) | None | visual | `Q-04`, `CSS-100` |
| 7 | Form fields inside `.rd` | Browser look with no padding | 1px `--field-border-color` (#888) frame, 4px radius, 8px 12px padding, 1rem; focus frame `--field-accent`; red on `:user-invalid` / `[aria-invalid]`, green on `:user-valid` with `required`/`pattern`; single `select` with the library's arrow; date and time types the same height Fields get `max-width: 100%` (a field wider than its box shrinks to fit); the 2px inset border becomes 1px solid. | None; a class on the field wins; host forms outside `.rd` are untouched. Native look: `appearance: auto; background-image: none` A page rule that sets the `background` shorthand on a single `<select>` clears the library's arrow and leaves `appearance: none`: set `background-color` only, or add `appearance: auto`. | visual | `CSS-100`, `CSS-103` |
| 8 | Checkbox, radio | Native | Drawn by the library (`appearance: none`), checked fill `--field-accent` | To keep native: `appearance: auto` plus resets on the component's class | visual | `CSS-101` |
| 9 | Range, color, file; fieldset, legend, label | Native; fieldset groove; plain label | Range in the accent colour; color as tall as a field; file with a small default button. Fieldset: 1px #ccc frame, 4px radius, padding; bold legend. A label wrapping a checkbox or radio gets the pointer; one wrapping a disabled control dims | None | visual | `CSS-102`, `CSS-104`, `CSS-105` |
| 10 | Element defaults in a RareCharts chart | Button and form defaults reached inside `.rc-chart` | They stop at `.rc-chart`; `.button` still applies there | To style a page button inside a chart, add `.button` | scope | `CSS-040`, `CSS-100`, `CSS-381` |
| 11 | Link-button in `.card-inverted`, a sidenote, the sidebar | The text-link colour won at rest (#f0f0f0 on white; grey; no bottom border in the sidebar) | Keeps its own label and frame; the three link rules exclude `.button` (weight unchanged) | None | fix | `CSS-040` |
| 12 | Cookie notice button | #fafafa pill, borderless | The default button look | None | visual | `Q-04` |
| 13 | `cite` | Every `<cite>`: block, right-aligned, light, small | Only `blockquote > cite` and the new `.attribution`; a bare `<cite>` is inline (browser italic) | Add `class="attribution"` to non-quote credits. RareCharts ≤ 0.9.8_5 relied on the bare-cite block for its source line: upgrade to ≥ 0.9.8_6, or add `.rc-chart-source { display: block }` | **breaking (narrow), visual** | `CSS-379` |
| 14 | Line-height tokens and em line-heights | `1.5em`, `1em`, `1.2em`, `1.7em`, `2em`; 1.3em/1.4em/1.2em/1em on text components, inherited as fixed px | Unitless (1.5, 1, 1.2, 1.7, 2; 1.3, 1.4, 1.2, 1): each child computes its own leading | Override without a unit; never use the tokens as a length (`calc`, `height`) | visual | `CSS-375` |
| 15 | `h1`–`h4` and `pre` leading | h2–h4 inherited the body's 24px; `pre` 1.2em | `h1`–`h4`: `var(--line-height-sm)`; `pre`: `var(--line-height-sm)` (same spacing as before) The new leading is visible: h2–h4 move from the inherited body leading to 1.2× their own size (an 18px body with a 27px leading: a 32.4px h2 goes from 27px to 38.9px per line). | Set `line-height` (or `inherit`) on headings inside your own fixed-leading blocks | visual | `CSS-375` |
| 16 | Block rhythm in the article flow | Blocks (card, panel, `pre`, lists, grids, sidenote rows, charts, callouts…) touched each other | A block directly after a block gets `margin-top: var(--space-md)` at (0,0,1); sidenote row after row gets none; `.air-*` spacers are not doubled | `.margin-t-0` on the second block closes it; a margin-bottom on the first does not | visual | `CSS-377` |
| 17 | Prose measure | `article p/ul/ol`, `dl`, `blockquote`, article `figure` capped at `--text-content-width` everywhere | Not capped inside `.table-scroll`, `.table-bordered`, `.panel`, `.stat`, `.rc-chart`; a plain `<table>` keeps it | None; to cap one, set `max-width: var(--text-content-width)` | visual | `CSS-374`, `CSS-384` |
| 18 | Sidenote selectors | Every element nested in a `.sidenote-wrapper` got `grid-column: 1 / span 5`; `.sidenote p:first-child` and `.sidenote a` matched at any depth | Only the wrapper's direct children are placed; the note's first paragraph only as a direct child; links inside `.rc-chart` keep their colour | Keep `.sidenote` a direct child of `.sidenote-wrapper` | fix | `CSS-372` |
| 19 | Code in `.table-scroll` cells | `overflow-wrap: anywhere`: names broke mid-word | Keeps its shape on screen (table grows, the box scrolls); wraps again on paper | None | fix (visual) | `CSS-373` |
| 20 | Page-title `h1` | 56px at every width; a long word widened the page at 320px | `min(var(--font-size-xxxl), 14vw)`; a word wider than the column breaks | None; a project's own `h1` size wins | fix | `CSS-382` |
| 21 | Print | Link URLs printed inside charts; `.card-caption`, `.full-width-caption`, `.teaser-bottom`, `.collapsible-container` kept their −32px outdent on paper | No URLs inside `.rc-chart`; every outdent folds back to the column; `--surface-current` is white on paper | None | fix (print) | `CSS-383`, `CSS-385`, `CSS-380` |
| 22 | `.card-inverted` lines | Borders used the light-page roles (#ccc, #e4e4e4, #333 on #333) | `--border-color` #666, `--border-color-light` ≈#4d4d4d, `--border-color-dark` #f0f0f0; chart tokens re-resolved for the dark ground; a `.card` nested in it restores the light roles | None; to keep the old lines, restate the three border tokens on your `.card-inverted` RareCharts up to 0.9.8_6 reads `--border-color` directly: on a dark card its range and Lin/Log frames are #666 on #333 (about 2.2:1) until RareCharts 0.9.8_7. Upgrade both together, or keep a dark card's charts on the light roles. | visual | `CSS-380` |
| 23 | Bordered panel on a phone | 16px 32px padding | 16px below 769px | None; for 32px sides wrap the content or use `.panel--flush` with your own padding | visual | `CSS-376` |
| 24 | Panel in a collapsible | 16px padding only for `.collapsible-content > .card-dashboard-bordered` | Any direct `.panel` there except `.panel--flush` | None | visual | `CSS-181` |
| 25 | New names | n/a | `.panel`, `.panel__header/__body/__footer`, `.panel--bordered/--flush`, `.panel-grid` (`--panel-grid-min`), `.panel__row--stack/--text-start`; `.legend`, `.legend__item`, `.legend__swatch--line/--dashed/--dot/--band` (`--swatch-color`); `.stat`, `.stat__label`, `.stat__value`, `.stat--delta-up/-down`, `.stat--signal`; `.callout-info/-success/-warning/-error`; `.attribution`; `.button-primary/-secondary/-ghost/-danger/-link`, `.button-sm/-md/-lg`, `.button-icon`, `.button-group`, `.button-block`; `.form-group`, `.form-row`, `.form-help`, `.form-error` | Rename any class of your own with these names inside `.rd` (e.g. Bootstrap 3's `.panel`) | additive | `CSS-180`…`CSS-184`, `CSS-156`, `CSS-178`, `CSS-379`, `CSS-040`…`CSS-105` |
| 26 | New tokens | n/a | `--color-success/-danger/-warning/-info`; `--signal` (= `--blue`, and `--focus-ring-color` follows it: no visual change); 26 `--chart-*` tokens and `--surface-current` (ungated on `:root`); `--button-*`, `--field-*`, `--stat-delta-color` Public hooks that are not on `:root`: `--callout-color`, `--button-bg-hover`, `--button-border-color-hover`, `--button-bg-active`, `--swatch-color`. | None. Re-map a role on `:root`; an own `--focus-ring-color` still wins over `--signal` The tokens are global and unprefixed on the ungated `:root`: a host page that defines the same names and loads `rare.css` after its own CSS gets the library's values. Load your stylesheet after `rare.css`, or rename them. | additive | `CSS-121`, `CSS-124`, `CSS-380`/`240`/`176`, `CSS-046`, `CSS-100`, `CSS-184` |
| 27 | Header and copy icons | Inherited the bare-button look | `.header-icons button` and `.copy-data-icon` set `font: inherit` (header icons `line-height: 1.15`): they take the size and line box of the text around them (a copy icon in `.font-size-xxl` grows from 35.2 to 52.8px) | None | visual | `Q-04` |
| 28 | Buttons with an icon | n/a | A `button` or `.button` with a direct `rd-icon-*` child becomes `inline-flex`, centred, with a 0.5em gap; the glyph's `::before` gets `vertical-align: top` (moves a hamburger icon by about 1px) | None | visual | `CSS-042` |

## Live consumers — `v0.7.2` candidate, verified 2026-10-27

**Method.** Each site was built locally into a scratch folder; nothing was changed in its repository. Every page was loaded in Chrome at 1440 and 375 px, once with `v0.7.1` and once with the candidate. Every element's box and computed styles were compared, including pseudo-elements, with transitions off. Hover and focus were checked on the interactive pages, plus print emulation.

| Site | Pin today | Pages checked | Verdict |
|---|---|---|---|
| schnellreich.ru | `v0.7.1` (`_includes/head.njk`), page mode; `rare-charts@v0.9.8_2` | 629 × 2 widths, plus states and print | No library regression. Every difference is an intended change; four need the owner before the pin moves |
| raredigits.io | `v0.7.1` in `_includes/head.html`, the two demo heads and 10 hard-coded `demo/*` pages; page mode; `rare-charts@v0.9.7` | 96 × 2 widths, plus states and print (with a noise run: 0) | No library regression. Three changes need the owner, plus one small one |
| Churchbook (the data project) | **Unpinned** GitHub Pages URL (serves `v0.7.1` today), **no `class="rd"`**; `rare-charts@v0.9.4_4` | 17 templates rendered with stub data × 2 widths | **Not caused by `v0.7.2`:** without `.rd` the site has had no library styling since `v0.7.0` reached Pages. With `.rd` added, `v0.7.2` would clear the select arrows of its admin forms (see the checklist) |
| Gutenberg | — | Not available locally | Not verified |

### Upgrade checklist per site (when `v0.7.2` is tagged)

**schnellreich.ru**
1. Replace `card-dashboard-bordered` with `panel panel--bordered`: 7 uses in 6 files (the Trump crypto post, what-is-code parts 2, 6 and 7, `vault/stories/heroes.njk`, `hero.njk`). A simulation showed an identical look at 1440.
2. Add `class="attribution"` to the non-quote `<cite>`s: about 206 tags (image credits, `.text-content--art`, leads, epigraphs). A simulated replace restored the `v0.7.1` look exactly.
3. Bump `rare-charts@v0.9.8_2` to `@v0.9.8_6` in the same commit. Its chart source line needs it, and that bump brings RareCharts' own visible changes.
4. Cookie badge: change `sch_styles.css` `.cookie-notice__content h3 { top: -1.25em }` to `top: -1.125em`.
5. Optional:
   - `.year-dropdown__toggle:hover { border-color: var(--primary-color) }`. It had no hover of its own; the library's leaking `button:hover` used to give it one.
   - Wrap the raw-form demo on what-is-code part 5 and reset it with `all: revert`.
   - `.page-title h1 { hyphens: auto }` for long Russian titles. The site's own mobile `h1` size skips the 14vw shrink.

**raredigits.io**
1. Replace `card-dashboard-bordered` with `panel panel--bordered` in `tools/forecast/index.md` and `tools/web3/watchtower/index.md`.
2. Add `class="attribution"` to the 14 image-caption `<cite>`s (about, services/*, tools/*).
3. Delete `form button { border-color: var(--border-color) }` from `assets/css/rare.css`. It now freezes the hover and pressed frame of the contact and login buttons.
4. Add `.rc-chart-source { display: block }` until rare-charts ≥ 0.9.8_6. Then bump it and drop the rule.
5. Bump the pin in `_includes/head.html`, both demo heads and the 10 hard-coded demo pages.
6. Optional:
   - the site's own `.panel` (columbus demos) and `.form-error` now meet library classes of the same name; the effects are neutral to positive;
   - update the button showcase on `tools/open-source/styles/components/` to the new variants.

**Churchbook (the data project)**
1. Add `class="rd"` to `<html>` in `app/front/templates/base.html`. Without it the library has styled nothing since `v0.7.0`.
2. Pin jsDelivr in `templates/includes/head.html` instead of the Pages URL.
3. With `v0.7.2`:
   - add `appearance: auto` to `.admin-form select, .admin-filter select` (their `background: transparent` clears the library's arrow);
   - bump `rare-charts` from `v0.9.4_4` to ≥ `v0.9.8_6`.

## Live consumers — verified 2026-10-16

Method: each site's built `_site` was served locally. On every page, each element's computed styles (including `::before`/`::after`) were compared between `v0.6.19` without the gate and the `v0.7.0` working build with `<html class="rd">`. Transitions were disabled for the comparison, at 1280 and 375 px.

| Site | Pin today | Pages checked | Differences found | Verdict |
|---|---|---|---|---|
| schnellreich.ru | `v0.6.19` (`_includes/head.njk`) | 9 × 2 widths: `/`, `/journal/`, 2 journal posts, `/value/`, `/legacy/`, `/vault/`, `/author/`, `/search/` | Only rows 8/9 (`#888` → `#666`), row 10 (footer `h6` +16 px on journal pages) and row 11 (`scroll-padding-top`) | Gate OK |
| raredigits.io | `v0.6.18` (`_includes/head.html`, two demo heads); `v0.6.15` hard-coded in 10 `demo/*/index.html` pages | 12 × 2 widths: `/`, services, tools, about, pricing, a pressroom post, 4 demos | Only rows 8/9, row 10 (footer `h5` +16 px on all non-demo pages) and row 11. The `v0.6.15` demo pages showed no other difference | Gate OK |

Changes added to the library after this check, and expected on both sites: `.list-group-pack` group gaps on mobile/tablet (row 27); the closed-menu, cookie-notice and inverted-card fixes (rows 23–25) touch components the checked pages do not use in those states.

Not caused by `v0.7.0` (the same overflow under `v0.6.19`): schnellreich.ru `/author/` (387 px at 375), raredigits.io `/about/pricing/` (433 px) and `/pressroom/Introducing-Rare-Styles/` (405 px). These are site-side and can be fixed with `.table-scroll` or the consumer's own CSS.

raredigits.io moves from `v0.6.18` and `v0.6.15`, so its bump also takes in the `v0.6.19` and `v0.6.16..19` changelog entries. The check above isolates only the `v0.7.0` delta.

### Upgrade checklist per site (when `v0.7.0` is tagged)

**schnellreich.ru**
- [ ] `_includes/head.njk`: pin `v0.6.19` → `v0.7.0`, `<html lang="ru">` → `<html lang="ru" class="rd">`
- [x] Row 10 decided 2026-10-16: footer +16 px accepted, no action needed (`h6`)
- [ ] `admin/index.html` does not load Rare Styles: no change

**raredigits.io**
- [ ] `_includes/head.html`, `_includes/special/demo/demo-app-head.html`, `_includes/special/demo/corsair/head.html`: pin → `v0.7.0`, add `class="rd"`
- [ ] 10 hard-coded demo pages (`demo/forecast/*`, `demo/columbus/*`, `demo/atlas/*`): pin `v0.6.15` → `v0.7.0`, add `class="rd"`
- [ ] `demo/watchtower/*` does not load Rare Styles: no change
- [x] Row 10 decided 2026-10-16: footer +16 px accepted, no action needed (`h5`)
