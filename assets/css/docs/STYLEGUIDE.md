# Rare Styles — Maintainer Workflow

This file documents the canonical CSS workflow for Rare Styles inside `raredigits.art`.

## Runtime

- Node: use the version pinned in `.nvmrc`
- Install dependencies with `npm install`

## Canonical commands

- `npm run lint:css`
  Runs Stylelint against `assets/css/**/*.scss`. This is the canonical CSS quality gate.

- `npm run build:css`
  Runs `scripts/build-css.mjs`: Sass compiles `assets/css/rare.scss`, then the PostCSS `rd-gate` step (`scripts/rd-gate.mjs`, `CSS-343`) applies the `.rd` scope gate, producing:
  - `assets/css/rare.css`
  - `assets/css/rare.min.css`
  (plus chained source maps). Never call the `sass` CLI directly for the artifacts — that would ship an ungated build.

- `npm run watch:css` (alias `npm run sass-watch`)
  Watches `assets/css/**/*.scss` and rebuilds both artifacts through the gate.

## The `.rd` gate config

`scripts/rd-gate.config.mjs` is the global-rule inventory (`CSS-337`). Every selector that targets bare elements (no class, attribute or id) must be listed there as `PAGE` (page shell: active only with `.rd` on `<html>`/`<body>`) or `ISLAND` (tag styles: active on `.rd` and inside it). The build fails on an unclassified bare selector and warns about stale entries. Class/attribute/id selectors are island-gated automatically, but not one whose classes sit only inside `:not()`: an exclusion does not scope a rule, so `p:not(.lead)` is listed like `p`, by its key without the `:not()` parts (`inventoryKey()` in `scripts/rd-gate.mjs`, `v0.7.2`), and the build error names the keys. `:root`, `@font-face`, `@keyframes` and self-contained `rd-icon-*` compounds stay ungated.

## Reset and normalize (decided 2026-10-16, `CSS-078`)

Both apply only inside `.rd`: `vendor/normalize.css` (v8.0.1, kept **whole and unmodified**) and the `* { margin: 0; padding: 0; box-sizing: border-box }` reset at the end of `rare.scss`.

**Islands.** The reset matches the island root and everything inside it, at zero specificity (`*:where(.rd, .rd *)`). It removes **user-agent** margins and padding only. Any host rule with a type or class selector (`figcaption { margin: … }`) still wins over it. Same-specificity collisions, such as a host `p {}` against the library's `p:where(…)`, resolve by load order. That is the documented caveat: the gate protects the host from the library, not the library from the host.

**Why normalize stays whole.** It costs about 1.9 KB minified and **≈ 730 B gzip (≈ 2% of `rare.min.css`)**. Trimming it to what the library relies on would save under 400 B gzip and turn a vendor file into a fork. Rules the library relies on today: `[hidden]` (carousel arrows), `b, strong` bolder, `small`, `sub`/`sup`, `kbd`/`samp`, `details`/`summary`, and the form-control font family inheritance that the `v0.7.2` forms (`elements/_forms.scss`) build on. IE- and legacy-Edge-era rules that are no-ops in evergreen browsers (`main`, `template`, `img { border-style }`, `hr` overflow, `button` overflow, `legend` table display) stay as harmless weight. Revisit in Lean Delivery (`v0.7.5`) with the `CSS-097` coverage data, not before.

## Element defaults: buttons and forms (`v0.7.2`, `Q-04`)

A bare `<button>`, `<input>`, `<select>`, `<textarea>`, `<fieldset>` and `<legend>` inside `.rd` get the library's look (`elements/_buttons.scss`, `elements/_forms.scss`). Three rules keep them from fighting the components that style their own controls:

- **Type weight in every state.** The element rules stay at `(0,0,1)`, hover, active, disabled, busy and validation included: the state goes in `:where()` (`button:where(:hover:not(:disabled))`), so any class beats the defaults in every state and a component never repeats its look for `:hover`. `.button` keeps the `(0,2,0)` its states always had, so a link-button outranks `nav a:hover` and a page's `.button.my-variant` loaded later still wins.
- **They stop at a RareCharts card.** Every element selector carries `:not(:where(.rc-chart *))` (zero weight), as the prose measure and the print URLs do: the chart owns its controls (RareCharts C-13), the page controls it moves into its `controls:` row included. `test/browser/charts-rd-host.test.js` (`CSS-381`) compares each chart control with the same page without the library. The exclusion does not take the rules out of the inventory: they are listed as `ISLAND` in `rd-gate.config.mjs` by their keys (`button`, `button:where(:hover)`, `select::placeholder`, …). A rule scoped by an attribute (`input:where([type="text"])`) is class context, as before.
- **A component that resets a button names the states it resets** (see `button.legend__item` in `bricks/_legend.scss`): a disabled toggle must not fade, a busy one must not spin.

A variant only sets colour slots (`--button-bg`, `--button-text`, `--button-border-color`, `--button-bg-hover`, `--button-border-color-hover`, `--button-bg-active`); the base rule reads them. A selector that names the icon set inside a pseudo-class argument (`button:has(> [class*=rd-icon-])`) is gated like any other: only a self-contained `rd-icon-*` compound stays ungated (`classify()` in `scripts/rd-gate.mjs`).

## Day-to-day editing flow

1. Make SCSS changes in `assets/css/modules/**` or `assets/css/rare.scss`.
2. Use `npm run watch:css` or `npm run sass-watch` while iterating.
3. Run `npm run lint:css` before considering the work ready.
4. Run `npm run build:css` before release-sensitive changes are merged.

## Release expectation for CSS changes

Before shipping a CSS-affecting release:

1. `npm run lint:css`
2. `npm run build:css`
3. `npx vitest run`: includes the compiled-CSS checks (artifacts must equal a fresh build)
4. `npm run test:browser`: real-browser checks in headless Google Chrome (`CSS-118`)
5. `node scripts/size-report.mjs --check`, and add the release row to `SIZE-BASELINE.md` (`CSS-339`)
6. `npm run check:links`: builds the site and fails on any broken internal link or anchor (`CSS-363`)
7. If the site shell or examples changed, run `npm run build`

## Releasing (CSS-348)

`.github/workflows/release-css.yml` publishes to `raredigits/rare-styles`, and only when `_data/versions.js` names a version that has no tag there yet. Ordinary pushes publish nothing. To release:

1. Bump `_data/versions.js` (`v0.7.0`, patches `v0.7.0_1`) and `package.json` (base `0.7.0`), and add `## [v0.7.0] — YYYY-MM-DD — Title` to `docs/Changelog.md`. `node scripts/release-css.mjs check` must pass.
2. `npm run build:css`, add the release row to `SIZE-BASELINE.md`, and run the release checks above.
3. Merge to `main`. The workflow verifies, stages one artifact (`node scripts/release-css.mjs stage dist/rare-styles` locally for a dry run), publishes and tags exactly that artifact, attaches it to the GitHub Release for self-hosting, and waits until the pinned jsDelivr URL serves the same bytes.

The release set is listed in `RELEASE_FILES` in `scripts/release-css.mjs`. Maintainer docs, `examples/` and `rare-website.css` do not ship.

## Namespace policy (`rd-`)

Adopted in `v0.6.17` (`CSS-067`, consuming the dissolved `v0.7.0` Namespace Foundations). `rd-` (Rare Digits) is the official library namespace. Three rules:

1. **`rd-` for everything new.** New utility, state, and JS-hook classes ship with the `rd-` prefix. Existing component classes (`.card`, `.sidebar`, `.tag`, …) stay unprefixed until the dedicated migration pass (`CSS-133`).
2. **`.rd-is-*` is the only way to express UI state.** Scripts toggle `.rd-is-open` (disclosure surfaces), `.rd-is-active` (toggles/menus), `.rd-is-hidden` (dismissed surfaces); CSS styles these classes. Reserved as documented convention, not yet shipped: `.rd-is-loading`, `.rd-is-disabled`. No inline `style.*` writes for UI state from scripts (transient utility elements that never render as UI — e.g. the clipboard fallback `textarea` — are mechanism, not state, and are exempt), no ad-hoc state classes (`.active`, `.has-query`).
3. **`.rd-js-*` is a behavioral hook, never styled.** Scripts find DOM nodes only via `.rd-js-*` classes. CSS rules MUST NOT target `.rd-js-*` selectors — presentational styling belongs to separate presentational classes on the same element. Shipped hooks: `.rd-js-collapsible` (+ `.rd-js-collapsible-content`), `.rd-js-cookie-consent` (+ `.rd-js-cookie-accept`), `.rd-js-copy`, `.rd-js-hamburger` (+ `.rd-js-hamburger-nav`), `.rd-js-search` (+ `.rd-js-search-bar`, `.rd-js-search-ui`), `.rd-js-carousel` (+ `.rd-js-carousel-track`, `.rd-js-carousel-prev`, `.rd-js-carousel-next`, `.rd-js-carousel-dots`). Reserved: `.rd-js-dropdown`.

State MAY also be styled via ARIA attributes the scripts maintain (`[aria-expanded="true"]`) — ARIA is state, not a hook. The full CSS↔scripts contract lives in [`SCRIPTS_CONTRACT.md`](./SCRIPTS_CONTRACT.md).

**Migration note:** prefixing the existing component/utility surface is deliberately deferred — `CSS-133` (`0.8.0`) audits each class and decides prefix / alias / leave per case. Do not preemptively rename shipped classes.

## Card vs panel (`CSS-182`, v0.7.2)

Two surfaces, chosen by what the content is, never by how it should look:

- **`.card` — narrative content.** A person wrote it and it reads as content: an article preview, an author or a project, a pricing block, a briefing list in a post. A soft surface (`--gray-lightest`) with no fixed inner structure.
- **`.panel` — data and system content.** A system produced it and it reads as data: a KPI, a chart, a status, settings, a log. No surface of its own (theme-agnostic), an optional frame (`.panel--bordered`), a fixed structure when it needs one (`.panel__header` / `__body` / `__footer`), rows of figures (`.panel__row`), a grid of panels (`.panel-grid`).

When unsure, ask where the block would feel at home: in an article (card) or on a dashboard (panel). A block that mixes both splits along the same line: the chart is the panel, and the prose that explains it stays text around it.

| Block | Markup | Why |
|---|---|---|
| Blog teaser, author box, project tile | `.card` | authored narrative |
| A briefing checklist in a post | `.card` | authored narrative, even when it is a list |
| A chart frame | `.panel .panel--bordered` on the chart element itself | data; RareCharts' container is the card it draws in: its `height` includes the padding, and its labels may run into it |
| A quote header, a chart and a row of figures | a `.panel .panel--bordered` around them, the chart unframed | one data block |
| A chart in a sidenote, or in a panel row cell | no frame of its own | a margin illustration to the text; the row is the frame |
| KPI figures under a chart, a row of gauges | `.panel__row` (`--stack` when the cells are charts) | data |
| Three KPI tiles | `.panel-grid` of `.panel`s with header / body / footer | data |

For maintainers: a panel is a block, so content moves over from `.card-dashboard-bordered` as it was; it becomes a flex column only with parts (`__header` / `__body` / `__footer`). Its layout sits at zero specificity (`:where()`), so a chart's own layout wins on the same element whatever the load order; its padding has class specificity, because the reset at the end of `rare.scss` would erase it. A panel never sets `gap`, `overflow`, `position` or `container` (`test/panels.test.js`, `test/browser/panels.test.js`).

## Surfaces and derived tokens (`CSS-380`, v0.7.2)

A custom property is resolved where it is declared and inherited as the result. A token made from another on `:root` (`--chart-axis-color: var(--border-color)`, `--chart-bg: var(--surface-current)`) keeps its `:root` value inside an element that re-maps the source. So:

- a rule that sets `--surface-current` also restates `--chart-bg` and paints its background from `--surface-current` (`.card`, `.card-inverted`); a `.panel` sets neither;
- a surface that re-maps text or border roles includes `role-tokens` from `modules/charts/_roles.scss` after the re-mapping (`.card-inverted`), which resolves the chart tokens again against it;
- a light surface nested in a dark one restores every role the dark one re-maps to its `:root` value and includes `role-tokens` again (`:where(.card-inverted .card)`), at zero specificity: it only has to beat inheritance.

`test/tokens-contracts.test.js` fails when a surface re-maps a role and does not restate a chart token made from it, and when the nested light card misses a role or a value the dark card re-maps.

## Icon policy

- Icons are **not a font**. Since `v0.6.18` (`CSS-095`/`CSS-096`) the library ships its own SVG icon set — static cuts of Material Symbols Outlined (Apache-2.0) under `assets/css/images/icons/` — drawn via `mask-image` + `background-color: currentColor`, so icons recolor through the normal `color`/token cascade. Never re-introduce an icon-font `@import` or the vendor `.material-symbols-outlined` class (removed in `v0.6.18`).
- Every glyph ships in two weights: **400** (regular, the default) and **200** (thin, for quiet marks like sidenote markers). File contract: `images/icons/<name>-<weight>.svg`.
- In markup, place icons with **one self-contained class per icon** — the glyph name is the class: `<span class="rd-icon-download"></span>`; the 200 cut is the `-thin` suffix, `<span class="rd-icon-arrow_outward-thin"></span>` (no separate base class). There is no `data-icon` authoring attribute. Only glyph names in the shipped set have a class — the `$icons` list in `decorations/_icons.scss` generates them per glyph (CSS `attr()` cannot feed `url()`, so the set is enumerated). `data-icon` exists only as `copy-to-clipboard.js`'s internal success-swap channel (`.copy-data-icon[data-icon="check"]`) — never write it in authored markup.
- For component-owned icon surfaces, bake the glyph into the component class with the `icon()` mixin from `decorations/_icons.scss` (`@include icon("search")`, weight as the second argument). Use `icon-mask()` when the component's `::before` manages its own positioning and size (carousel arrows, sidenote markers).
- The set is generated by `scripts/fetch-icons.py`; update instructions live in `assets/css/images/icons/README.md`. Adding a glyph means: extend the script's `ICONS` list, re-run it, and mirror the name in the `$icons` list in `decorations/_icons.scss`.
- When adding icons, verify glyph names against fonts.google.com/icons. Some legacy names differ (for example `file_download` → `download`).

## Public asset contract

- Canonical public asset folder for externally reusable Rare Styles images: `assets/css/images/**`
- Current canonical reusable assets include:
  - `assets/css/images/wa.svg`
  - `assets/css/images/github.svg`
  - `assets/css/images/rare-digits/rare-logo-black.svg`
- These files are deployed with the site and can be referenced through versioned jsDelivr URLs after release tagging
- Before a release tag exists, library code may still point at local project paths
- After tagging a release, library-facing asset references should be updated to canonical versioned CDN URLs rather than old project-internal image paths
- Treat `assets/css/images/**` as a public contract: renames or removals should be considered breaking for downstream consumers

## CI expectation

The main site deploy workflow must run `npm run lint:css` before `npm run build` so invalid SCSS does not ship in the generated bundle.
