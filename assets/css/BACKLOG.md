# Rare CSS — Backlog & Roadmap

**Current version:** `0.6.9` (early beta)
**Public release target:** `1.0.0`

---

## Conventions

- **Priority:** P0 (blocker) · P1 (important) · P2 (nice-to-have)
- **Type:** `bug` · `feat` · `a11y` · `perf` · `chore` · `docs` · `dx`
- **Estimate:** S (≤4 h) · M (1 day) · L (2–3 days) · XL (a week+)

---

# Milestone `0.7.0` — Stabilization

**Goal:** zero invalid CSS in the codebase, linter in place, fonts loaded properly, and the existing button module turned into a real button system.

## Bugs (P0)

| ID | Type | File / line | Issue | Estimate |
|---|---|---|---|---|
| `CSS-001` | bug | `modules/typography/_fonts.scss:1–4` | `@import url(...)` strings contain leftover HTML attribute fragments (`...&display=swap" rel="stylesheet'`). URLs are invalid. | S |
| `CSS-002` | bug | `rare.scss:11` | `body { color: var(--text-color) }` — `--text-color` is not defined anywhere. | S |
| `CSS-003` | bug | `modules/bricks/_cards.scss:11` | `.card-hover` references `--grey-lightest` (British spelling); only `--gray-lightest` exists. | S |
| `CSS-004` | bug | `modules/typography/_text-content.scss:130` | `.warning { color: var(--warning-color) }` — variable is undefined. | S |
| `CSS-005` | bug | `modules/typography/_text-content.scss:138` | `cite { color: var(--grey-dark) }` — British spelling, undefined. | S |
| `CSS-006` | bug | `modules/typography/_text-content.scss:211` | `pre code { border-radius: none }` — invalid value, must be `0`. | S |
| `CSS-007` | bug | `modules/utilities/_resets.scss:14–17` | `.no-decoration:hover { background-color: none; color: none }` — both values invalid. | S |
| `CSS-008` | bug | `modules/utilities/_display.scss:32` | `.text-wrap { white-space: wrap }` — `wrap` is not a valid value for `white-space`; should be `normal`. | S |
| `CSS-009` | bug | `modules/align/_align.scss:31, 41` | `.top { text-align: top }`, `.bottom { text-align: bottom }` — `text-align` does not accept `top`/`bottom`. Classes do nothing. | S |
| `CSS-010` | bug | `modules/align/_align.scss:14, 35` | `.center-y` is declared twice with different definitions; the second overrides the first. | S |

## Quality infrastructure (P0–P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-020` | dx | Add **stylelint** + `stylelint-config-recommended-scss` to `package.json`. Enable `declaration-property-value-no-unknown`, `no-invalid-position-at-import-rule`, `scss/no-global-function-names`. | M |
| `CSS-021` | dx | Run `stylelint --fix` across `modules/` after `CSS-001..010`. Wire as a pre-commit hook. | S |
| `CSS-022` | dx | Document the build pipeline: how `rare.css` / `rare.min.css` are produced. Add `build:css`, `watch:css`, `lint:css` scripts to `package.json`. | M |

## Buttons (P0)

The current `_buttons.scss` is a single style with no variants. Turn it into a proper button system before forms in `0.8.0`.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-040` | feat | `_buttons.scss`: variants `primary` / `secondary` / `ghost` / `danger` / `link`. | M |
| `CSS-041` | feat | Sizes: `button-sm` / `button-md` (default) / `button-lg`. Driven by `--button-padding` and `--button-font-size` tokens. | S |
| `CSS-042` | feat | Icon buttons (`button-icon`), buttons with leading/trailing icons, button-only-icon-square. | M |
| `CSS-043` | feat | States: `:hover`, `:active`, `:focus-visible`, `:disabled`, `[aria-busy="true"]` (loading spinner). | M |
| `CSS-044` | feat | `button-group` — segmented horizontal group with shared borders. | S |
| `CSS-045` | feat | `button-block` modifier (full-width). | S |
| `CSS-046` | feat | Token surface: `--button-radius`, `--button-padding-x/y`, `--button-font-weight`, `--button-transition`. | S |

## Performance (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-030` | perf | Move Google Fonts out of `@import url()` into the page `<head>`: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` + non-blocking stylesheet load. | S |
| `CSS-031` | perf | Trim Fira Sans weights (currently 18 weights × 2 styles). Keep 300/400/500/700 + italic 400. | S |

---

# Milestone `0.8.0` — Completeness

**Goal:** close the functional gaps. After this version Rare CSS can build any common site, not just longreads. Two themes (`theme-story`, `theme-dashboard`) ship as preset bundles.

## Forms (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-100` | feat | `modules/elements/_forms.scss`: base styles for `input[type=text/email/password/search/tel/url/number]`, `textarea`, `select`. | M |
| `CSS-101` | feat | Custom-styled `checkbox` and `radio` via `appearance: none`. | M |
| `CSS-102` | feat | `<label>`, `.form-group`, `.form-row`, `.form-help`, `.form-error`. | S |
| `CSS-103` | feat | States: `:focus`, `:focus-visible`, `:disabled`, `:invalid`, `:valid`, `[aria-invalid]`. | M |
| `CSS-104` | feat | `fieldset` / `legend` reset and styling. | S |
| `CSS-105` | feat | `range`, `color`, `file` inputs — minimal styling. | S |

## Accessibility (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-110` | a11y | Global `:focus-visible` style (2px solid `var(--brand-color)`, 2px offset). Audit and remove any stray `outline: none`. | S |
| `CSS-111` | a11y | `.sr-only` / `.visually-hidden` utilities (a11y-project recipe). | S |
| `CSS-112` | a11y | `@media (prefers-reduced-motion: reduce)` — neutralize transitions / animations. | S |
| `CSS-113` | a11y | Skip-link styles (`.skip-to-content`). | S |
| `CSS-114` | a11y | Contrast audit: `--gray-trans` (#888) on `--bg-color` (#f0f0f0) is ~3.5:1, fails WCAG AA for body text. Adjust `--text-color-light`. | M |

## Token system (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-121` | feat | Semantic color layer on top of base palette: `--color-success` / `--color-danger` / `--color-warning` / `--color-info`. Migrate components to semantic tokens. | M |
| `CSS-122` | feat | Surface tokens: `--surface-1` / `--surface-2` / `--surface-raised`, replacing direct `--gray-lightest` / `--gray-light` references inside components. | M |
| `CSS-123` | feat | Motion tokens: `--ease-out`, `--ease-in-out`, `--duration-fast` (120 ms), `--duration-base` (200 ms), `--duration-slow` (320 ms). | S |

## Architecture (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-130` | feat | Adopt `@layer reset, vendor, base, tokens, components, utilities` at the root. Removes the need for `!important` and locks cascade order. | M |
| `CSS-131` | chore | Drop `!important` from `.mobile-hidden` once `CSS-130` lands. | S |
| `CSS-132` | chore | Generate `:root` variables from a SCSS map. Eliminate the duplication between `:root { --gray: ... }` and `$base_colors: gray, ...`. Single source of truth. | M |
| `CSS-133` | chore | Library prefix decision. Either keep classes unprefixed (and document the collision risk) or introduce `r-` / `rare-`. | S |
| `CSS-134` | chore | `STYLEGUIDE.md` convention: components live in `bricks/` + `elements/`, utilities live in `layout/` + `utilities/` + `align/` + `decorations/`. | S |
| `CSS-135` | feat | Migrate margin/padding/border to logical properties (`margin-inline`, `padding-block`, `border-inline-start`). Out-of-the-box RTL/i18n support. | L |

## Themes (P0)

Themes are preset bundles of tokens (and small component tweaks) opted in via a class on `<html>` or `<body>`.

### `theme-story` — longread layout

Formalizes what the library already does well: serif headings, generous reading rhythm, narrow text column, decorative typography utilities.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-150` | feat | `modules/themes/_story.scss`. Gate via `.theme-story` on `<html>`. | S |
| `CSS-151` | feat | Token overrides: serif headings (Playfair), wider `--line-height`, narrow `--text-content-width`, larger `--font-size-xl/xxl`. | M |
| `CSS-152` | feat | Drop cap utility (`.dropcap` / `p.dropcap::first-letter`). | S |
| `CSS-153` | feat | Section divider variants for narrative structure (`.story-divider`, `.story-section-break`). | S |
| `CSS-154` | feat | Pull-quote variant tuned for Story (typographic, large, centered). | S |
| `CSS-155` | feat | Promote sidenotes / captions / blockquote / handwritten utilities into the Story theme bundle (no code change — just documented as part of the preset). | S |

### `theme-dashboard` — dense data UI

Compact layout, sans-serif everywhere, denser spacing scale, panel/grid components for KPIs and tables.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-160` | feat | `modules/themes/_dashboard.scss`. Gate via `.theme-dashboard` on `<html>`. | S |
| `CSS-161` | feat | Token overrides: sans-serif everywhere, smaller base font, tighter `--line-height`, denser spacing scale (`--space-md` → 12 px), reduced `--header-height`. | M |
| `CSS-162` | feat | `panel` component — bordered card optimized for data (`.panel`, `.panel-header`, `.panel-body`, `.panel-footer`). | M |
| `CSS-163` | feat | KPI / stat block (`.stat`, `.stat-label`, `.stat-value`, `.stat-delta-up/down`). | M |
| `CSS-164` | feat | Dense table styles (`.table-dense`, zebra rows, sticky header, sortable indicator). | M |
| `CSS-165` | feat | Status indicators (`.status-dot`, `.badge-success/warning/danger/info`). Uses semantic tokens from `CSS-121`. | S |
| `CSS-166` | feat | Toolbar / filter row (`.toolbar`, `.toolbar-section`, `.toolbar-spacer`). | S |
| `CSS-167` | feat | Sidebar layout shell for dashboards (`.dashboard-shell` with collapsible sidebar + main + topbar grid). | M |

### Theme infrastructure

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-170` | feat | `modules/themes/_index.scss` forwarding both themes. Wire from `modules/_index.scss`. | S |
| `CSS-171` | feat | Allow combining themes with overrides at `:root` (token-level customization without forking the theme). | S |

## Existing module review

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-140` | chore | Reconsider the `.desktop:` prefix. `desktop` ≥ 1024 px is the default state, so `.desktop:col-span-6` equals `.col-span-6`. Either remove or scope it strictly to `(min-width: 1024px)` overrides. | S |
| `CSS-141` | chore | Audit collision-prone names: `.left`, `.right`, `.top`, `.bottom`, `.bold`, `.italic`, `.note`, `.warning`, `.lead`. Resolve together with `CSS-133`. | S |

---

# Milestone `0.9.0` — Release Prep

**Goal:** ship-ready package — documentation, integrations with sibling libraries, build/CI, and theming guidance.

## Documentation (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-200` | docs | `README.md`: what the library is, how to install (CDN / npm / SCSS source), quick start, module map. | M |
| `CSS-201` | docs | `STYLEGUIDE.md`: naming conventions, utilities vs components, how to add a new module, how to add a new token. | M |
| `CSS-202` | docs | Single-page demo (`assets/css/examples/index.html`) showing every component and utility. Doubles as a visual smoke test. | L |
| `CSS-203` | docs | Per-module live examples: typography, grid, cards, forms, buttons, navigation, colors, themes. | L |
| `CSS-204` | docs | `CHANGELOG.md` starting at `0.7.0`, [Keep a Changelog](https://keepachangelog.com/) format. | S |
| `CSS-205` | docs | `CONTRIBUTING.md`: forking, PRs, running the linter. | S |
| `CSS-206` | docs | `LICENSE` (MIT recommended) at the repo root. | S |
| `CSS-207` | docs | **Theming guide** (`THEMING.md`): how to build a custom theme by overriding base color tokens. Show a worked dark-theme example via `:root { --bg-color: #111; --primary-color: #f0f0f0; ... }` overrides — no built-in dark mode, just a recipe. | M |

## Sibling-library integration (P0)

The CSS library lives next to two siblings: `scripts/` (collapsible, cookies, copy-to-clipboard, hamburger, search) and `charts/` (bar, line, map, multi, …). They already consume some classes; formalize the contract.

### Scripts

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-230` | feat | Audit `_collapsible.scss`, `_cookie-consent.scss`, `_search.scss`, `_hamburger.scss` against the actual JS in `scripts/`. Document required classes and ARIA hooks. | M |
| `CSS-231` | feat | Add `copy-to-clipboard` styles (button, success/error toast). Currently the script has no companion CSS module. | S |
| `CSS-232` | docs | One-page “Scripts integration” doc: which CSS classes each script needs, and which tokens it reads. | S |

### Charts

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-240` | feat | `modules/charts/_index.scss` — base tokens for charts: `--chart-axis-color`, `--chart-grid-color`, `--chart-label-color`, `--chart-tooltip-bg`, `--chart-series-1..8`. Sourced from semantic tokens. | M |
| `CSS-241` | feat | Common chart chrome styles: axis, gridlines, legend, tooltip, data labels. Used by every chart type in `charts/`. | M |
| `CSS-242` | feat | Map chart styles (`charts/map`): land/water fills, hover state, choropleth scale tokens. | M |
| `CSS-243` | feat | Theme-aware chart palette: `theme-story` uses muted/editorial palette; `theme-dashboard` uses high-contrast functional palette. | M |
| `CSS-244` | docs | “Charts integration” doc: how to wire any chart to the token system, how to override per-instance via CSS variables. | S |

## Distribution (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-211` | feat | Tag releases in git (`v0.7.0`, `v0.8.0`, `v0.9.0`). Use semver strictly. | S |
| `CSS-213` | feat | Validate source maps shipped with `rare.min.css`. | S |
| `CSS-250` | feat | **CDN + npm package** — see dedicated track below (`CSS-T01`). | L |

## Build / performance (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-210` | feat | **PurgeCSS** in the consuming site’s build. Expected reduction: 308 KB → 15–30 KB. The library itself stays full; purge happens downstream. | M |
| `CSS-218` | dx | Visual regression on the demo page (Playwright + screenshot diff). Run in CI. | L |
| `CSS-219` | dx | Lighthouse check on the demo page in CI: a11y ≥ 95, performance ≥ 95. | M |
| `CSS-220` | dx | GitHub Actions workflow: lint + build + visual regression on every PR. | M |

---

# Dedicated Track — `CSS-T01` Public Distribution (CDN + npm)

Runs in parallel with `0.9.0`. Treated as a single deliverable so distribution does not block feature work.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-T01.1` | feat | Define `dist/` layout: `dist/rare.css`, `dist/rare.min.css`, `dist/rare.css.map`, `dist/rare.min.css.map`, plus per-module SCSS sources under `dist/scss/`. | S |
| `CSS-T01.2` | feat | npm package `@raredigits/rare-css`. Set `main`, `style`, `sass`, `exports` fields. Mark `dist/` as the only published path via `files`. | M |
| `CSS-T01.3` | feat | GitHub Release pipeline: tag → build → publish to npm → push tag (jsDelivr/unpkg pick it up automatically). | M |
| `CSS-T01.4` | docs | Install instructions for three flavors: `<link>` from jsDelivr, `npm install`, `@use` from SCSS source. Add to `README.md`. | S |
| `CSS-T01.5` | feat | Subresource Integrity (SRI) hashes published with each release for the CDN flavor. | S |
| `CSS-T01.6` | feat | `package.json` peerDependencies / engines: declare Node version, mark sass as a peer for source consumers. | S |
| `CSS-T01.7` | dx | Pre-publish checks: `npm pack --dry-run` size budget (warn over 400 KB unminified), license check, no `node_modules` leakage. | S |

---

# Milestone `1.0.0` — Public Release

**Definition of done:**

- [ ] All P0/P1 tasks from `0.7` / `0.8` / `0.9` are closed
- [ ] Zero invalid CSS values (stylelint clean)
- [ ] Forms, buttons, focus-visible, sr-only, reduced-motion all shipped
- [ ] Semantic tokens (success/danger/warning/info, surfaces, motion)
- [ ] `theme-story` and `theme-dashboard` documented and demoed
- [ ] Cascade layers in place; no `!important`
- [ ] Sibling-library integration finalized for `scripts/` and `charts/`
- [ ] README + STYLEGUIDE + THEMING + CHANGELOG + LICENSE + demo page
- [ ] Theming guide includes a worked dark-theme example
- [ ] Bundle after purge ≤ 30 KB
- [ ] CDN + npm package published (`CSS-T01` complete)
- [ ] CI green: lint + visual regression + lighthouse
- [ ] `v1.0.0` tagged in git, GitHub Release notes published

---

# Post-1.0 Backlog

| ID | Type | Task | Notes |
|---|---|---|---|
| `CSS-300` | feat | Container queries (`@container`) for adaptive components | Currently everything is `@media`; CQ is more useful for a component library |
| `CSS-301` | feat | Animation library: `.fade-in`, `.slide-up`, micro-interactions | Built on the `--ease-*` / `--duration-*` tokens |
| `CSS-302` | feat | Extended color palette: 50–950 ramp per hue | Currently flat: light/base/dark |
| `CSS-303` | feat | Bundled icon set (or adapter for Lucide / Heroicons) | Currently Material Icons loaded ad-hoc |
| `CSS-304` | feat | Toast / Modal / Tooltip / Dropdown components | HTML-only via `<dialog>` and `:popover-open` where possible |
| `CSS-305` | feat | Tabs / Accordion / Stepper | Same |
| `CSS-306` | feat | RTL demo and tests after `CSS-135` | |
| `CSS-307` | dx | Figma plugin or `tokens.json` export (W3C Design Tokens) | Designer round-trip |
| `CSS-308` | feat | Additional themes: `theme-print`, `theme-presentation`, `theme-zen` | Built on the same theme infrastructure as Story / Dashboard |

---

## Release summary

| Version | Codename | Scope |
|---|---|---|
| `0.6.9` | _current_ | Architecture, grid, typography, cards, navigation — bugs inside |
| `0.7.0` | Stabilization | Bug fixes `CSS-001..010`, stylelint, build pipeline, fonts, real button system |
| `0.8.0` | Completeness | Forms, a11y, semantic tokens, `@layer`, `theme-story`, `theme-dashboard` |
| `0.9.0` | Release Prep | Docs, demo, theming guide, scripts/charts integration, purge, CI |
| `CSS-T01` | (parallel) | CDN + npm distribution |
| `1.0.0` | Public Release | Stable public API |
