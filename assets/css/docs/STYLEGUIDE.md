# Rare Styles — Maintainer Workflow

This file documents the canonical CSS workflow for Rare Styles inside `raredigits.art`.

## Runtime

- Node: use the version pinned in `.nvmrc`
- Install dependencies with `npm install`

## Canonical commands

- `npm run lint:css`
  Runs Stylelint against `assets/css/**/*.scss`. This is the canonical CSS quality gate.

- `npm run build:css`
  Compiles `assets/css/rare.scss` into:
  - `assets/css/rare.css`
  - `assets/css/rare.min.css`

- `npm run watch:css`
  Watches SCSS and rebuilds `assets/css/rare.css`.

- `npm run watch:css:min`
  Watches SCSS and rebuilds `assets/css/rare.min.css`.

- `npm run sass-watch`
  Runs both watch tasks in parallel.

## Day-to-day editing flow

1. Make SCSS changes in `assets/css/modules/**` or `assets/css/rare.scss`.
2. Use `npm run watch:css` or `npm run sass-watch` while iterating.
3. Run `npm run lint:css` before considering the work ready.
4. Run `npm run build:css` before release-sensitive changes are merged.

## Release expectation for CSS changes

Before shipping a CSS-affecting release:

1. `npm run lint:css`
2. `npm run build:css`
3. If the site shell or examples changed, run `npm run build`

## Namespace policy (`rd-`)

Adopted in `v0.6.17` (`CSS-067`, consuming the dissolved `v0.7.0` Namespace Foundations). `rd-` (Rare Digits) is the official library namespace. Three rules:

1. **`rd-` for everything new.** New utility, state, and JS-hook classes ship with the `rd-` prefix. Existing component classes (`.card`, `.sidebar`, `.tag`, …) stay unprefixed until the dedicated migration pass (`CSS-133`).
2. **`.rd-is-*` is the only way to express UI state.** Scripts toggle `.rd-is-open` (disclosure surfaces), `.rd-is-active` (toggles/menus), `.rd-is-hidden` (dismissed surfaces); CSS styles these classes. Reserved as documented convention, not yet shipped: `.rd-is-loading`, `.rd-is-disabled`. No inline `style.*` writes for UI state from scripts (transient utility elements that never render as UI — e.g. the clipboard fallback `textarea` — are mechanism, not state, and are exempt), no ad-hoc state classes (`.active`, `.has-query`).
3. **`.rd-js-*` is a behavioral hook, never styled.** Scripts find DOM nodes only via `.rd-js-*` classes. CSS rules MUST NOT target `.rd-js-*` selectors — presentational styling belongs to separate presentational classes on the same element. Shipped hooks: `.rd-js-collapsible` (+ `.rd-js-collapsible-content`), `.rd-js-cookie-consent` (+ `.rd-js-cookie-accept`), `.rd-js-copy`, `.rd-js-hamburger` (+ `.rd-js-hamburger-nav`), `.rd-js-search` (+ `.rd-js-search-bar`, `.rd-js-search-ui`), `.rd-js-carousel` (+ `.rd-js-carousel-track`, `.rd-js-carousel-prev`, `.rd-js-carousel-next`, `.rd-js-carousel-dots`). Reserved: `.rd-js-dropdown`.

State MAY also be styled via ARIA attributes the scripts maintain (`[aria-expanded="true"]`) — ARIA is state, not a hook. The full CSS↔scripts contract lives in [`SCRIPTS_CONTRACT.md`](./SCRIPTS_CONTRACT.md).

**Migration note:** prefixing the existing component/utility surface is deliberately deferred — `CSS-133` (`0.8.0`) audits each class and decides prefix / alias / leave per case. Do not preemptively rename shipped classes.

## Icon policy

- The only supported icon family is `Material Symbols Outlined`. The legacy `.material-icons` and `.material-icons-outlined` families and selectors were removed in `v0.6.16`; do not use them in new or migrated markup.
- For new component-owned icon surfaces, prefer a semantic component class backed by the `symbol()` mixin from `utilities/_symbols.scss`. The component class owns the font and glyph, so markup does not need the vendor `.material-symbols-outlined` class or ligature text.
- Use the baked-glyph form for fixed icons (`@include symbol("search")`) and the `data-icon` form for genuinely dynamic glyphs (`@include symbol`).
- Direct `.material-symbols-outlined` markup remains supported while the existing site surface is migrated under `CSS-087`; do not expand its usage.
- When migrating an existing icon to a component-owned class, verify glyph-name compatibility. Some names stay the same (`search`, `menu`, `close`, `construction`), while others differ (for example `file_download` → `download`).

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
