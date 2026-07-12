# Rare Styles — Backlog & Roadmap

**Current version:** resolved from [`_data/versions.js`](../../../_data/versions.js) → `styles`. Do not hardcode version numbers in this header — they rot.
**Public release target:** `1.0.0`

**Positioning:** `Rare Styles` is a narrow professional CSS library for clarity-first longreads and decision-first data views. It is not a general-purpose CSS framework and not a Tailwind/Bootstrap competitor.

---

## Conventions

- **Priority:** P0 (blocker) · P1 (important) · P2 (nice-to-have)
- **Type:** `bug` · `feat` · `a11y` · `perf` · `chore` · `docs` · `dx`
- **Estimate:** S (≤4 h) · M (1 day) · L (2–3 days) · XL (a week+)

## Documentation-driven audit policy

Starting with `v0.7.0`, every milestone that touches a module also writes the first-pass `/styles/<section>/` page for that module. The act of writing is the audit. Explaining each class, justifying every utility, producing a real example — that's the pressure that surfaces duplicates, exposes temporary/unused classes, and reveals over-complicated utility families that look fine in isolation but can't be described together.

Findings that come out of a docs-pass are filed as separate task IDs and routed to the next available bug-fix release (`v0.X.Y_1` pattern) or to the feature backlog.

The `CSS-282..295` IDs in `v0.9.0` are reframed: they become **finalization + KSS-extracted reference integration + remaining edge pages**, not first-pass writing. First-pass write-ups happen in `v0.7.0` and `v0.8.0` per this policy.

Rule of thumb: if you change a module's code in `v0.7.0` or `v0.8.0`, you also write or update its `/styles/` page in the same milestone — before the milestone ships.

## Planning note

- Source of truth for the current released library version: `_data/versions.js` (`styles`). Codenames live in the Release summary table at the bottom — no duplicate version claims elsewhere in this file.
- Current released library version: `v0.6.16` (`Font Self-Hosting`) — self-hosted text families, one scoped Material Symbols import (weights 200/400), legacy Material Icons dropped. Changes recorded in [`Changelog.md`](./Changelog.md).
- Current release (shipping now): `v0.6.17` — scripts contract & unified rewrite: audit the five `/scripts/` companions, adopt the `rd-` namespace (pulled forward from the dissolved `v0.7.0`), and rewrite the scripts onto `.rd-js-*` hooks + `.rd-is-*` states + baseline ARIA. **Breaking** — hard cut, no dual-hook window (scope decision 2026-07-12).
- Then: `v0.6.18` — docs/examples migration off GitHub Pages URLs, downstream CDN cutover, and Pages cleanup.
- Then: `v0.6.19` — documentation skeleton pass: keep draft docs pages visible as module backlogs, fix dead-nav edges, and formalize the incomplete-page policy.
- Then: `v0.6.20` — vendor/media kit prep for Rare Digits branding surfaces, attribution variants, and library-linking guidance.
- Then: `v0.7.1` — stabilization. (`v0.7.0` Namespace Foundations was consumed by `v0.6.17`; the version number is retired, not reused.)

---

# Milestone `v0.6.12` — Cleanup & Delivery Hygiene

**Goal:** ship the next technical cleanup release without breaking the shared-library ergonomics: reduce CSS noise, clarify build/lint workflow, trim waste in font/icon loading, and prepare reusable external assets for downstream projects.
**Status:** ready for release

**Recommended scope:**

- [x] `CSS-020` Stylelint stack and canonical `npm run lint:css`
- [x] `CSS-021` lint command + team workflow cleanup
- [x] `CSS-022` build pipeline documentation
- [x] `CSS-023` / `CSS-024` / `CSS-025` cleanup batch
- [x] `CSS-026` reusable floating contact button audit
- [x] `CSS-031` trim Fira Sans weights
- [x] `CSS-032` Material Icons strategy cleanup
- [x] `CSS-033` external vendor-icon CDN track
- [x] `CSS-034` server-side dependency security refresh

**Exit criteria:**

- [x] `npm run lint:css` passes or has a clearly reduced remaining error set with documented follow-up
- [x] `rare.css` / `rare.min.css` still build cleanly from `assets/css/rare.scss`
- [x] Build/lint/release flow is documented at a practical maintainer level
- [x] Font loading keeps shared-project convenience while reducing unnecessary payload
- [x] Material icon loading has an explicit policy instead of three ad-hoc imports
- [x] Reusable vendor assets (`wa.svg`, `github.svg`, etc.) have a concrete CDN/public-distribution follow-up task and target location
- [x] High-severity server-side dependency vulnerabilities are reviewed and fixed or explicitly triaged for follow-up

---

# Milestone `v0.6.13` — Reusable Asset Reshuffle

**Goal:** publish a tiny follow-up release that stabilizes the reusable image surface for Rare Styles after the library-facing asset reshuffle.
**Status:** ready for release

**Recommended scope:**

- Finalize the canonical reusable-image layout under `assets/css/images/**`
- Keep the release narrowly focused on asset reshuffle and reuse prep
- Avoid mixing in downstream CDN cutover or cross-project component harvesting
- Treat this as a compatibility-preserving micro-release

**Exit criteria:**

- [x] Reusable library images are reorganized into their intended canonical structure
- [x] The reusable-image surface is documented as the public contract for downstream use
- [x] No consumer-facing CSS API changes are introduced in the reshuffle release

---

# Milestone `v0.6.14` — Cross-Project Enrichment

**Goal:** enrich Rare Styles with proven reusable classes and patterns harvested from adjacent projects that already consume the library.

**Recommended scope:**

- Audit sibling and downstream projects that use Rare Styles
- Audit sibling and downstream projects for legacy Material icon selectors before removing compatibility from the library
- Identify classes/patterns that are actually reusable across at least two projects
- Normalize naming, token usage, and API shape before importing into the library
- Port the selected classes into core modules or clearly scoped opt-in modules
- Add minimal documentation/examples for every harvested pattern
- Wire harvested patterns to existing library tokens: `.wide-background` must consume the already-declared but currently unused `--sidebar-width` (`navigation/_sidebar.scss:4`); the harvested calc also references `--field-width`, which is declared nowhere in the library — define it or rework the calc, otherwise `margin-left` fails silently (see `HARVEST_v0.6.14.md`, F6)
- Fix harvest source bugs that already leaked into modules: the CDN-pinned blockquote `background-image` URL is live in `typography/_text-content.scss:142` — switch to a relative `images/...` path during the blockquote patch integration (HARVEST source bug 5 / F7)

**Legacy Material icon migration hints (for external projects):**

| Legacy selector / pattern | Likely usage in external projects | Canonical replacement target | Removal goal |
|---|---|---|---|
| `.material-icons` | Header actions (`search`, `menu`, `close`), download links, breadcrumb/meta icons, utility buttons | `.material-symbols-outlined` with verified icon names (`file_download` often becomes `download`) | Remove markup-level dependency on `Material Icons` |
| `.material-icons-outlined` | Section icons, launch/open-external icons, collapsible affordances (`keyboard_arrow_down`) | `.material-symbols-outlined` with verified icon names (`launch` becomes `open_in_new`) | Remove markup-level dependency on `Material Icons Outlined` |
| `.section-icon.material-icons-outlined` | Typography/docs pages, section headers, collapsible cards | `.section-icon.material-symbols-outlined` or a family-agnostic `.section-icon` rule | Drop legacy class coupling from `_icons.scss` |
| `.remark .material-icons` / `.remark .material-icons-outlined` | Inline note markers inside prose components | `.remark .material-symbols-outlined` or a pseudo-element-based icon rule | Collapse remark styling onto canonical Symbols path |
| `.sidebar-icon.material-icons` | Sidebar navigation affordances or meta rows | `.sidebar-icon.material-symbols-outlined` or family-agnostic `.sidebar-icon` | Remove legacy sidebar compatibility selectors |
| Icon text names from old Material Icons set | `file_download`, `launch`, and any project-specific legacy names | Verify against Symbols before migration | Prevent silent broken glyphs during cleanup |

`_icons.scss` full cleanup **landed in `v0.6.16`** (not `v0.7.1` as originally planned): the legacy `.material-icons` / `.material-icons-outlined` selectors were removed and `.sidebar-icon.material-icons` was repointed to `.material-symbols-outlined`. Per decision `Q-06` the in-repo cut did not wait for downstream migration (0 markup usages here); downstream coordination is tracked separately as `CSS-032a`.

**Exit criteria:**

- [x] Candidate classes from adjacent projects are reviewed and curated, not copied wholesale
- [x] Imported classes follow Rare Styles naming/token conventions
- [x] New patterns are documented with intended use cases and non-goals

Icon-family cleanup follow-up: the compatibility-selector removal was moved out of `v0.6.14` and handled as one bounded pass in `v0.6.16` (Font Self-Hosting). The remaining piece — the external-project audit and downstream `.material-icons` migration — is `CSS-032a`.

---

# Milestone `v0.6.15` — Audit Hotfixes & Post-Harvest Cleanup

**Goal:** ship a tight follow-up patch to `v0.6.14` that clears the audit findings from 2026-06-06 and 2026-06-11 and absorbs the first post-harvest fixes discovered immediately after release. Scope is strictly bugs, small hygiene fixes, asset-path cleanup, and narrowly scoped harvested selectors that are already needed downstream. Nothing from this list is hotfixed into `v0.6.14` — the harvest release stays liftable.
**Status:** ready for release — all scoped items resolved, exit criteria met, `npm run lint:css` clean, `rare.css` / `rare.min.css` rebuilt.

**Recommended scope:**

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-027` | bug | **Responsive aliases broken in production.** `_spacing-aliases.scss` uses `\\:` and compiles to `.mobile\\:p-s` (literal backslash in the class name) — verified in `assets/css/rare.css`. Every short-form responsive alias (`mobile:p-s`, `tablet:m-l`, `desktop:gap-xl`, …) currently fails to match HTML. Fix: use `\:` (single backslash) to match `_spacing.scss`. | P0 | S |
| `CSS-028` | bug | `--header-height` declared in both `layout/_containers.scss:5` and `navigation/header/_header-container.scss:4`. Drop the duplicate and keep `layout/_containers.scss` as the single owner. | P1 | S |
| `CSS-035` | a11y | `--font-size: 16px` literal in `typography/_fonts.scss:14`. Should be `1rem` so the user font-size preference is honored. All other size tokens are already in rem. | P1 | S |
| `CSS-037` | chore | ~~Resolve outstanding stylelint error at `_grid.scss:137` (`at-rule-empty-line-before`).~~ **Done early in `v0.6.14`** — blank line added before the `@if`; `npm run lint:css` is clean. Pulled forward so the harvest release ships lint-clean. | P1 | S |
| `CSS-029` | chore | Duplicate brand class in `special/_rare.scss`: `.rare-brand` and `.rare-brand-color` produce identical rules. Pick one. | P2 | S |
| `CSS-038` | chore | ~~Decide fate of `assets/css/move-in.css` — a plain-CSS file outside the SCSS pipeline with site-specific overrides. Options: fold into SCSS, document as a separate site layer, or delete.~~ **Done in `v0.6.14`** — the original site-override file was cleared: harvested rules were either integrated into SCSS modules, deferred, or dropped with rationale in `HARVEST_v0.6.14.md`. If `assets/css/move-in.css` appears again later, treat it as a temporary migration scratchpad for targeted transfers (such as `CSS-059`), not as a revived production layer by default. | P2 | S |
| `CSS-048` | bug | **normalize.css is emitted at the end of the compiled bundle.** In `rare.scss`, `@use "vendor/normalize"` comes after `@use "modules/index"`, so the reset lands after all module CSS (`rare.css:20370` of 20678) and overrides component styles instead of underpinning them. Fix in this patch release: reorder the `@use` statements so normalize is emitted first. The broader reset/normalization audit is deferred to `CSS-078` in `v0.7.1`. | P1 | S |
| `CSS-049` | bug | **Generated utilities emit invalid CSS.** The `$spaces` matrix in `_spacing.scss` produces `.gap-auto`, `.gap-x-auto`, `.gap-y-auto` (`gap: auto` is not a valid value) in the base set and across all three responsive prefixes. Special-case `auto` out of the gap families. The full property×value matrix audit is `CSS-079` (`0.7.0`) — this is only the invalid-CSS slice. | P2 | S |
| `CSS-051` | docs | **Install snippets contradict each other today.** `/styles/usage/` still recommends `https://raredigits.github.io/rare-styles/...` in three snippets, while the `/styles/` landing page already points to versioned jsDelivr. Update the usage page to the CDN URL now; the broader Pages sunset remains `CSS-T00.2` (`v0.6.18`). | P1 | S |
| `CSS-052` | chore | **Reconcile the `CSS-031` record with shipped reality.** `_fonts.scss:2` imports Fira Sans 100/200/400/700/900 + italics (10 styles), and that set matches the shipped `--font-weight-*` tokens (`thin: 100`, `light: 200`, `normal: 400`, `bold: 700`, `black: 900`). Update the backlog/task record to reflect the shipped set instead of reintroducing the older 300/400/500/700 plan. Note: `--font-weight-light: 200` actually maps to the extra-light cut. | P2 | S |
| `CSS-053` | bug | ~~**Table horizontal scroll is non-functional.**~~ **Done early in `v0.6.14`** — removed the dead `overflow-x` from `table`, shipped the opt-in `.table-scroll` wrapper, reconciled the docs claim. | P1 | S |
| `CSS-054` | bug | ~~**Zebra/hover signal is inverted in `.table-striped`.**~~ **Done early in `v0.6.14`** — both directions unified upward: even rows `--gray-lightest`, hover `--white` across every preset. | P2 | S |
| `CSS-055` | chore | ~~**Dead declaration `thead, tbody { width: 100% }`.**~~ **Done early in `v0.6.14`** — removed. | P2 | S |
| `CSS-056` | bug | **Equalize implicit columns in `.list-fixed-rows`.** The utility currently uses `grid-auto-flow: column` without sizing the implicit columns, so visually identical lists end up with different column widths depending on content. Add `grid-auto-columns: minmax(0, 1fr)` so every generated column shares the available width evenly instead of shrinking to its own contents. **Resolved in `v0.6.15`.** Scope note: with the base utility now equalizing its implicit columns, the `.list-fixed-rows-2col` modifier became redundant and was **removed (breaking)** — author two-column fixed-rows lists by setting `--list-rows` on the base instead. `-2col` shipped only in `v0.6.14`, so this corrects it within one release; recorded in `Changelog.md`. | P1 | S |
| `CSS-057` | bug | **Normalize supporting copy inside harvested `.card-grid` tiles.** Post-harvest usage exposed that paragraphs inside `card-grid` tiles currently inherit generic prose rhythm and look too loose for the compact tile surface. Add the minimum scoped typography adjustment needed for tile copy and verify it does not bleed into unrelated card patterns. | P1 | S |
| `CSS-058` | chore | **Move vendor/brand asset dependencies onto `assets/css/images/**` and relative library paths.** Extend the blockquote asset-path cleanup to the remaining library-owned image consumers: `.vendor-logo` (`_media.scss`), `.wa-button` (`_web-reusable.scss`), and the Rare Digits brand-logo surface currently living in `rare-website.css`. Consolidate the Rare Digits branding asset into the same reusable vendor surface as WhatsApp and GitHub, add the needed files under `assets/css/images/vendors/**`, and replace old `/assets/img/...` URLs with package-local relative paths so downstream consumers no longer depend on site-root image folders or CDN-pinned CSS internals. | P0 | S |
| `CSS-059` | feat | **Add harvested selectors `.boilerplate` and `.feature-row`.** Promote the two selectors now required by downstream projects into Rare Styles as normalized library primitives, using the annotated `assets/css/move-in.css` notes as the transfer guide. `.boilerplate` is the pattern for text notes/news blocks; `.feature-row` is the row-style subclass for sections that enumerate features. Choose their target modules, align them with existing spacing/token conventions, and document the structural contract before import so they land as reusable library API rather than project residue. | P1 | M |

**Exit criteria:**

- [x] `CSS-027` resolved — responsive-alias regression cleared from compiled `rare.css` (zero double-backslash occurrences)
- [x] `CSS-028`, `CSS-035`, `CSS-048`, `CSS-051`, `CSS-056`, `CSS-057`, `CSS-058`, `CSS-059` resolved
- [x] `CSS-037` — pulled forward and resolved in `v0.6.14`; `npm run lint:css` clean
- [x] `npm run lint:css` runs clean
- [x] P2 items: `CSS-029` (canonical `.rare-brand-color`, `.rare-brand` kept as deprecated alias) and `CSS-049` resolved; `CSS-052` reconciled against shipped reality; `CSS-038` already closed in `v0.6.14`
- [x] `CSS-053`, `CSS-054`, `CSS-055` — pulled forward and resolved in `v0.6.14` (table pass), not waiting for this patch
- [x] Library-owned vendor and brand image surfaces resolve via `assets/css/images/**` relative paths, not `/assets/img/...`
- [x] Narrow post-harvest additions only: `.boilerplate` and `.feature-row` are normalized and documented, with no broader harvesting reopened

---

# Milestone `v0.6.16` — Font Self-Hosting

**Goal:** eliminate the render-blocking Google Fonts `@import` waterfall by self-hosting the four text families and rationalizing icon loading, without breaking the shared-library ergonomics. Pulled forward from `v0.7.1` (`CSS-030` / `CSS-032`) because it is a live, dated perf regression (schnellreich.ru, PageSpeed mobile 2026-07-12). Distribution-layer scope only — no component or token API changes.

**Decisions carried in (2026-07-12):**

- `Q-05` → **(a) batteries-included, self-hosted.** `rare.min.css` keeps `@font-face` pointing at self-hosted woff2 under `fonts/`. Consumers bump the version and get the same families minus the Google/waterfall cost. No opt-in font pack.
- `Q-06` → **keep Material Symbols as a single scoped `@import`** (weights `200`/`400` only), drop legacy `Material Icons` + `Material Icons Outlined` now. Symbols stays Google-hosted so consumers need zero icon migration; the two legacy families have **0 markup usages in this repo**, so their removal here is CSS-rule cleanup only. The `.material-icons` breaking change is downstream-only (schnellreich.ru header) and is coordinated via `CSS-032a`, not blocking this release's in-repo cut.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-030` | perf | **Kill the render-blocking `@import` font waterfall; self-host the text families.** Remove the four text-font `@import`s in `typography/_fonts.scss:1-4` and replace with `@font-face` blocks pointing at self-hosted woff2 under `assets/css/fonts/` via **relative** `url(fonts/…)`. The `sync-css.yml` workflow (`cp -r assets/css/* temp-rare-styles/`) lands `fonts/` at the `rare-styles` repo root, so the same relative path resolves on jsDelivr and on the local site with no path fixup. Ship latin + cyrillic `unicode-range` subsets and `font-display: swap`. Families: Playfair Display (`400..900`), Fira Sans (`100/200/400/700/900` + italics, matching the `--font-weight-*` tokens per `CSS-031`), Cousine (`400/700` + italics), Caveat (`400`). Fonts are OFL/Apache — ship the license text alongside the woff2 (`CSS-030b`). **Never re-introduce `@import` for the text fonts.** | P0 | M |
| `CSS-030a` | chore | **Add the fonts passthrough.** `.eleventy.js` passes through `rare.css`, `images`, examples, and `rare-website.css` but not a fonts dir, so `assets/css/fonts/` would not exist on the built site. Add `addPassthroughCopy("assets/css/fonts")` and a watch target so `/assets/css/fonts/…` resolves locally the same way it does on the CDN. | P0 | S |
| `CSS-030b` | chore | **Ship font licenses.** Add the OFL (Playfair Display, Fira Sans, Caveat) and Apache-2.0 (Cousine) license text under `assets/css/fonts/` next to the woff2, so downstream redistribution via the CDN stays compliant. | P1 | S |
| `CSS-030c` | perf | **Preload the critical text faces on raredigits.art. ✅ Done in `v0.6.16`.** Added `<link rel="preload" as="font" type="font/woff2" crossorigin>` for `FiraSans-Regular-latin.woff2` (body) and `PlayfairDisplay-latin.woff2` (headings) in `_includes/head.njk`. Browser-verified: each preloaded face is fetched exactly once, initiated by the `link` — no double-fetch, no unused-preload warning. Companion hint added in the same pass: `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com` (crossorigin) for the still-Google-hosted Material Symbols — its gstatic woff2 URL is a content hash that can't be preloaded stably, so preconnect is the correct lever under `display: block`. Both are documented on `/styles/typography/`. Site-level, not a library change. | P2 | S |
| `CSS-032` | chore | **Rationalize Material icon loading → single scoped Symbols import.** Drop the `Material Icons` and `Material Icons Outlined` `@import`s (`typography/_fonts.scss:5-6`). Convert the `Material Symbols Outlined` line to the `css2` API scoped to the two weights the library actually uses — `family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@…,200;400,…` — and keep it as **one** `@import` (decision `Q-06`): Symbols stays Google-hosted, so consumers need no icon migration. Remove the now-dead `.material-icons` / `.material-icons-outlined` selectors from `decorations/_icons.scss` and the `.sidebar-icon.material-icons` rule in `navigation/_sidebar.scss:148`; keep `.material-symbols-outlined`. Net result in `rare.min.css`: 7 `@import`s → 1 (Symbols only), text fonts self-hosted. | P0 | S |
| `CSS-032a` | chore | **Coordinate the downstream `.material-icons` cut. ✅ Done (confirmed 2026-07-12).** Downstream consumers (schnellreich.ru header) migrated off `.material-icons` / `.material-icons-outlined` to `.material-symbols-outlined` with verified icon names. The legacy-family removal in `CSS-032` is now safe to reach consumers via CDN. | P1 | S |

## Exit criteria

- [x] `rare.min.css` contains exactly one `@import` (Material Symbols Outlined, weights 200/400) and zero `@import`s for the text families — verified: 1 `@import`, 32 `@font-face`, 0 `material-icons`
- [x] The four text families load from self-hosted woff2 via relative `fonts/…` paths that resolve both locally (`/assets/css/fonts/…`) and on jsDelivr (`rare-styles@<ver>/fonts/…`) — browser-verified: text faces load from `/assets/css/fonts/*.woff2`, only Google request is the scoped Symbols css2
- [x] `@font-face` blocks carry latin + cyrillic `unicode-range` and `font-display: swap`; only the token-declared weights ship (Playfair variable 400–900, Fira 100/200/400/700/900 + italics, Cousine 400/700 + italics, Caveat 400)
- [x] Legacy `.material-icons` / `.material-icons-outlined` selectors are removed; `.material-symbols-outlined` still renders every in-repo glyph — browser-verified: `search` renders as a 24px icon, sidenote markers compute `wght 200`
- [x] `assets/css/fonts/` is passed through by Eleventy (32 woff2 in `_site`) and carries the license text (all four families are OFL-1.1 — Cousine was relicensed from Apache — see `OFL-*.txt` + `README.md`)
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`
- [x] No render-blocking request to `fonts.gstatic.com` for the text families (the scoped Symbols import is the only remaining Google request, by decision)
- [x] Downstream `.material-icons` consumers are notified/migrated (`CSS-032a`) before the CDN cut reaches them — confirmed 2026-07-12; schnellreich.ru migrated to `.material-symbols-outlined`, so the `sync-css.yml` (non-release-gated) CDN cut is now safe

---

# Milestone `v0.6.17` — Scripts Contract & Unified Rewrite

**Goal:** freeze the contract between Rare Styles CSS and the companion `/scripts/` JS set — and act on it in the same release: adopt the `rd-` namespace and rewrite the five companion scripts onto one unified hook/state/ARIA mechanism while the script surface is still small (~230 lines across five files).

**Scope decision (2026-07-12):** originally an audit-and-documentation-only release; expanded by maintainer decision to include the full rewrite — unifying five tiny scripts now is cheaper than migrating more consumers and markup later. Consequences:

- `v0.7.0` (Namespace Foundations, `CSS-060..063`) is **pulled forward and consumed here** as `CSS-067` — shipping `.rd-js-*` / `.rd-is-*` classes without the namespace policy would create a de-facto namespace with no contract.
- The JS-migration half of `CSS-230` (`0.9.0`) is pulled forward into `CSS-068`; `CSS-230` shrinks to a finalization pass.
- **Hard cut, no dual-hook window** (same playbook as `CSS-032a`): old hooks (`.collapsible-trigger`, `.hamburger` + `.active`, `#cookie-notice`, `#search-button`, …) are removed from JS, and their state selectors from CSS, in one release. Downstream coordination (`CSS-071`) must complete **before merge to main**, because `sync-css.yml` ships CSS to the CDN un-gated by releases.
- **Breaking release** — recorded as such in `Changelog.md`.

Companion script set at [`/scripts/`](http://localhost:8080/scripts/) — `collapsible`, `cookies`, `copy-to-clipboard`, `hamburger`, `search`; JS sources in `assets/js/`. Out of scope regardless: the Pagefind UI rebuild (`CSS-050`), the full a11y batch (`CSS-110..114` — only mechanical ARIA ships here), and cookie-consent UX changes.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-064` | feat | **Audit `/scripts/` CSS+ARIA contracts.** Inventory which selectors, classes, inline styles, `data-*` and ARIA attributes each script reads/writes today — from the actual JS in `assets/js/`, not the `/scripts/` doc pages (they drift). Output: per-script contract table in `SCRIPTS_CONTRACT.md`. Known systemic findings to record: selector strategy diverges (three scripts hook by class, two by ID), state is expressed four different ways (inline `display`, `.active`, `hidden` + `.has-query`, `data-*`), ARIA is absent everywhere. The audit doubles as the rewrite spec for `CSS-068`. | P1 | M |
| `CSS-065` | feat | **Define the unified hook/state contract.** Canonical hook per script: `.rd-js-collapsible`, `.rd-js-cookie-consent`, `.rd-js-copy`, `.rd-js-hamburger`, `.rd-js-search`. State via `.rd-is-open` / `.rd-is-active` / `.rd-is-hidden`; trigger↔content linked via `id` + `aria-controls`, open/closed mirrored to `aria-expanded`; no ID-based JS hooks; no inline `style.display`. Documented in `SCRIPTS_CONTRACT.md`, implemented by `CSS-068` / `CSS-069`. | P1 | S |
| `CSS-067` | feat | **Namespace foundations (consumes `CSS-060..063` from the dissolved `v0.7.0`).** Adopt `rd-` as the official Rare Digits library prefix; reserve `.rd-is-*` (state modifiers) and `.rd-js-*` (JS hooks — never styled by CSS); codify the three-rule policy in `STYLEGUIDE.md` with a migration note pointing at `CSS-133`. Existing component classes (`.card`, `.sidebar`, `.tag`, …) stay unprefixed until `CSS-133`. | P0 | S |
| `CSS-068` | feat | **Rewrite the five scripts onto the unified contract.** `collapsible.js`: state class instead of inline `display`, open state driven by CSS, icon via state class instead of `textContent` swap, `aria-expanded` / `aria-controls`. `hamburger.js`: `.active` → `.rd-is-active`, `aria-expanded`, guard against missing elements (currently throws on pages without a hamburger). `cookie-consent.js`: IDs → `rd-js` hooks, `.rd-is-hidden` instead of inline `display`; cookie logic untouched. `copy-to-clipboard.js`: add the hook class; the `data-*` mechanics stay — already the most modern of the five. `search.js`: hook + state + `aria-expanded` on the trigger only; the Pagefind UI rebuild remains `CSS-050`. **Breaking:** old hooks removed, no aliases. | P0 | M |
| `CSS-069` | feat | **CSS follow-through for the new states.** Add `.rd-is-*` state rules where the scripts need them (collapsible open state, hamburger/nav active state, cookie-notice hidden state, search `has-query` replacement); remove the legacy state selectors in the same pass (hard cut). `.rd-js-*` selectors MUST NOT be styled. | P0 | S |
| `CSS-047` | bug | **Asymmetric outdent override in `_collapsible.scss`. ✅ Resolved (contract inverted, 2026-07-13).** Original finding: the collapsible-scoped rules overrode `margin-left` only, and the `>` combinator bound only to `.caption`, leaving two near-duplicate blocks. First fix mirrored the outdent symmetrically — but live inspection showed the real defect: inside the padded card frame the prose outdent (`.lead` / `.highlight` / `.caption` / `.text-content-caption` via `typography/_text-content.scss` `@mixin outdent`, plus their `width: var(--text-content-caption)`) pinned elements to the card edge (`.lead` flush at desktop) or past it (`.highlight` overflowed). Final contract: **inside `.collapsible-container` / `.collapsible-content` the outdent family resets to the card's content width** (`margin-inline: 0`, `width: auto`, `max-width: 100%`) — the card frame replaces the page margins, so there is nothing to outdent into. Verified at 375/1280: every child sits at the container padding on both sides, zero overflow. | P1 | S |
| `CSS-070` | chore | **Migrate in-repo markup and the `/scripts/` doc pages.** Sweep `_includes/*.njk` and content pages onto the new hooks/ARIA; rewrite the five `/scripts/` pages (contract description, raw-code blocks, download links) against the rewritten scripts; decide the fate of `copy-to-clipboard.min.js` (the only script shipping a min variant). Doc-page drift found during the sweep is recorded in `SCRIPTS_CONTRACT.md`, not silently patched. | P1 | M |
| `CSS-071` | chore | **Downstream hard-cut coordination.** Audit done (2026-07-12/13): **both** known consumers pin the CSS by version, so the cut is version-gated and breaks neither on merge — the pre-merge urgency from the original scope note is downgraded. Deliverables: (a) publish the rewritten scripts to `raredigits/rare-scripts` and tag `v3.0.0` (doc pages already reference the `@v3.0.0` pins — must exist before this branch merges; min builds for the CDN are produced at publish time); (b) **schnellreich.ru** — migrate old JS copies of `hamburger`/`cookie-consent`/`search`/`carousel`, markup hooks in `header.njk` / `hamburger.njk` / `cookie-consent.njk` / `main-header.njk`, one legacy `collapsible-trigger` in `legacy/happyness`, and old `.carousel-img`/`.carousel-arrow.left` carousel markup in 5 posts (see `CSS-088`), in the same commit as its pin bump `@v0.6.16 → @v0.6.17`; (c) **raredigits.io** — narrower: migrate `hamburger` + `cookie-consent` only (JS copies + old markup `icon-menu`/`icon-close`, `#cookie-notice`/`#cookie-notice-accept`), bump pins `@v0.6.16 → @v0.6.17` (and the corsair demo `@v0.6.15 → @v0.6.17`), refresh the layered local `/assets/css/rare.css`; (d) re-pin the cookie-consent include here from local source back to the `rare-scripts@v3.0.0` CDN build. | P0 | M |
| `CSS-088` | feat | **Harvest the image carousel from schnellreich.ru. ✅ Done (2026-07-13, scope addition).** Rebuilt directly on the contract as the sixth companion script: `assets/js/carousel.js` (hooks `.rd-js-carousel` / `-track` / `-prev` / `-next` / `-dots`, state `.rd-is-active`, arrow-key navigation, `role`/`aria-roledescription`, per-instance init — **fixes the source's real multi-instance bug**, where every image on the page fell into one shared index), `special/_carousel.scss` (tokenized, recolorable `--carousel-*`, dots in flow below the carousel), `/scripts/carousel/` doc page. Modernization: a slide is a `<figure>` with an optional `<figcaption class="carousel-caption">`, so captions travel with their images. Enabler added along the way: `_includes/scripts.njk` supports per-page script loading via `scripts: [carousel]` front matter. Downstream markup migration is folded into `CSS-071` (b). | P1 | M |

## Exit criteria

- [x] `SCRIPTS_CONTRACT.md` documents both the as-was contract per script (audit) and the unified target contract (hooks, states, ARIA), regression-tested by `test/scripts-contract.test.js`
- [x] `STYLEGUIDE.md` carries the `rd-` namespace policy: three rules + `CSS-133` migration note
- [x] All six scripts (five rewritten + the `CSS-088` carousel harvest) find DOM via `.rd-js-*` hooks only, express state via `.rd-is-*` classes only, and carry `aria-expanded` / `aria-controls` where a trigger toggles content; zero inline `style.display` for UI state
- [x] Legacy hooks and state selectors are gone from JS, CSS, and in-repo markup — hard cut, no aliases
- [x] `CSS-047` resolved as part of the collapsible contract (final form: outdent family resets to the card's content width — see the task row)
- [x] The six `/scripts/` doc pages match the shipped scripts (live demos + ready-to-paste snippets, browser-verified)
- [ ] Downstream deliverables complete (`CSS-071`): `rare-scripts` published and tagged, schnellreich.ru migrated with its pin bump, cookie-consent include re-pinned to the CDN
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`
- [x] Out-of-scope boundaries honored: no Pagefind UI rebuild, no full a11y batch, no cookie-consent UX changes (the anti-FOUC init-order fix is a bug fix, not a UX change)

---

# Milestone `v0.6.18` — CDN Migration & Pages Sunset Prep

**Goal:** move docs, examples, and known consumers off mutable GitHub Pages asset URLs onto versioned jsDelivr targets, then clear the path for unpublishing the Pages surface and cleaning up its repository leftovers.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T00.1` | chore | Update library asset references to canonical versioned CDN URLs under `assets/css/images/**`. Note: as of `v0.6.14` the folder is passed through to the built site (`.eleventy.js`) and `blockquote` already references it via a relative URL — use that relative-path pattern as the local fallback, and reconcile with the versioned-CDN form here. | P0 | S |
| `CSS-T00.2` | chore | Migrate docs/examples away from `https://raredigits.github.io/rare-styles/...`. | P0 | S |
| `CSS-T00.3` | chore | Audit known downstream consumers for GitHub Pages CSS URLs and patch them. | P0 | M |
| `CSS-T00.4` | chore | Unpublish the legacy GitHub Pages site once downstream consumers are migrated. | P0 | S |
| `CSS-T00.5` | chore | Remove legacy Pages-only repository artifacts such as `.nojekyll` after unpublish. | P1 | S |

## Exit criteria

- [ ] Library references to old local image paths are replaced with canonical versioned CDN URLs
- [ ] Docs/examples no longer recommend `https://raredigits.github.io/rare-styles/...`
- [ ] Known downstream consumers are migrated off GitHub Pages CSS URLs
- [ ] The `rare-styles` GitHub Pages site is unpublished
- [ ] Pages-only legacy files like `.nojekyll` are removed or explicitly justified

---

# Milestone `v0.6.19` — Documentation Skeleton Pressure

**Goal:** keep draft `/styles/` pages visible as deliberate pressure on the library roadmap: incomplete pages act as module-level backlogs, while dead anchors and broken navigation are still cleaned up so the docs skeleton remains usable.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-039` | docs | Keep stub and draft `/styles/` pages as intentional skeletons rather than hiding them. Formalize the policy for "SECTION ON RECONSTRUCTION" pages, decide the minimum honest content each skeleton must carry, and fix dead-nav edges such as `_data/tableOfContents.json` anchors pointing to sections that do not exist yet (for example `/styles/typography/interactive/#forms`). This release is about making unfinished docs usable as pressure/backlog surfaces, not about fully writing the pages. | P1 | S |

## Exit criteria

- [ ] Draft docs pages are treated as intentional skeletons with a documented incomplete-page policy
- [ ] Broken docs navigation/anchors caused by empty sections are fixed
- [ ] Module-level docs skeletons remain visible as backlog pressure instead of being hidden away

---

# Milestone `v0.6.20` — Rare Digits Media Kit Prep

**Goal:** package the Rare Digits brand surfaces as a reusable vendor/media-kit layer so attribution, linking, and logo usage are consistent wherever the library is referenced.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-066` | feat | **Prepare the Rare Digits media kit.** Build the reusable branding package around the vendor/logo surfaces introduced in earlier releases: logo variants, attribution snippets, and recommended links back to the Rare Styles library/repository. Scope is documentation and asset packaging, not a broader marketing-site redesign. | P1 | M |

## Exit criteria

- [ ] Rare Digits logo variants needed for library attribution are packaged in a stable reusable location
- [ ] Docs include the intended attribution/linking variants for downstream usage
- [ ] The media-kit scope stays focused on reusable library-brand surfaces

---

# Milestone `v0.7.0` — Namespace Foundations — **consumed by `v0.6.17`**

**Dissolved (2026-07-12):** the entire scope (`CSS-060..063`) was pulled forward into `v0.6.17` as `CSS-067`, because the script rewrite ships `.rd-js-*` / `.rd-is-*` classes and the namespace policy must land with them, not after. The version number `v0.7.0` is retired, not reused; the release sequence continues `v0.6.20` → `v0.7.1`.

| ID | Resolution |
|---|---|
| `CSS-060` | Moved to `v0.6.17` (`CSS-067`) — `rd-` adopted as the official prefix; existing component classes stay unprefixed until `CSS-133` |
| `CSS-061` | Moved to `v0.6.17` — `.rd-is-*` reserved; `.rd-is-active` / `.rd-is-hidden` / `.rd-is-open` ship as real classes consumed by the rewritten scripts (`.rd-is-loading`, `.rd-is-disabled` stay documented convention) |
| `CSS-062` | Moved to `v0.6.17` — `.rd-js-*` reserved, never styled; five concrete hooks ship (`.rd-js-collapsible`, `-cookie-consent`, `-copy`, `-hamburger`, `-search`); `.rd-js-dropdown` stays a documented reservation |
| `CSS-063` | Moved to `v0.6.17` — namespace policy lands in `STYLEGUIDE.md` with the `CSS-133` migration note |

---

# Milestone `v0.7.1` — Stabilization

**Goal:** zero invalid CSS in the codebase, linter in place, fonts loaded properly, and the existing button module turned into a real button system.

## Quality infrastructure (P0–P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-020` | dx | Keep **Stylelint** on a Node-18-compatible stack: `stylelint@16`, `stylelint-config-standard-scss`, `postcss-scss`. Document `npm run lint:css` as the canonical CSS check. | M |
| `CSS-021` | dx | Make `npm run lint:css` the stable team entry point, run `stylelint --fix` where safe, and document when linting is required in day-to-day work and before release. | S |
| `CSS-022` | dx | Document the build pipeline: how `rare.css` / `rare.min.css` are produced, how linting fits into the release flow, and which `package.json` scripts are canonical (`build:css`, `watch:css`, `lint:css`). | M |
| `CSS-023` | chore | Sweep low-risk Stylelint cleanup that is mostly mechanical: modern `rgb(... / ... )` notation, alpha percentages, hex shortening, empty-line normalization, operator spacing, argumentless mixin call style. | M |
| `CSS-024` | chore | Triage duplicate/dead declarations reported by Stylelint and either remove them or document intent: `_icons.scss`, `_tags.scss`, `_header-container.scss`, `_grid.scss`, `_sidenotes.scss`. Note: `_icons.scss` was already simplified in `v0.6.16` (legacy Material Icons selectors removed) and `_sidenotes.scss` touched (marker `font-variation-settings`) — re-triage those two against their current state. | S |
| `CSS-025` | chore | Clean up module hygiene issues reported by Stylelint: `@forward` without `.scss` extension in `navigation/_index.scss`, decide whether empty `special/_rare.scss` should be removed or kept as an intentional staging file. | S |
| `CSS-087` | chore | **Migrate remaining markup off the vendor `.material-symbols-outlined` class.** `v0.6.17` introduced the `symbol()` mixin (`utilities/_symbols.scss`) and absorbed the icon font into the script-surface classes (`.hamburger__icon-*`, `.collapsible-icon`, `.icon-search`, `.copy-data-icon`); markup there is now vendor-free (`<span class="hamburger__icon-menu"></span>`). This task finishes the job: sweep the remaining ~30 usages (`.section-icon`, `.remark`, `.sidebar-icon`, download links, `construction-notice.njk`, docs pages), give each surface a component class with a baked or `data-icon` glyph, then decide whether the bare `.material-symbols-outlined` selector block in `_icons.scss` can be dropped. Coordinate with `CSS-024` (icons re-triage). | M |
| `CSS-026` | chore | Audit the floating WhatsApp/contact button pattern as a reusable library primitive. Keep it in the library if it is genuinely cross-project, but clarify whether the API is brand-specific (`wa`) or a more general floating contact / floating action pattern. | S |

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
| `CSS-030` | perf | **Moved to `v0.6.16` — Font Self-Hosting.** Pulled forward as a live perf regression; full spec (self-host text families, `CSS-030a`/`b`/`c` sub-tasks) lives there. | — |
| `CSS-031` | perf | Trim Fira Sans weights to the shipped canonical set used by the library tokens: 100/200/400/700/900 plus matching italics. Keep the task record aligned with the public `--font-weight-*` surface unless a later typography release intentionally changes both together. Reconciled in `v0.6.15` (`CSS-052`): `_fonts.scss` ships exactly this set and it matches the `--font-weight-*` tokens; note `--font-weight-light: 200` maps to the extra-light cut, not the 300 light cut. **Consumed by `CSS-030` in `v0.6.16`.** | S |
| `CSS-032` | chore | **Moved to `v0.6.16` — Font Self-Hosting.** Decision `Q-06`: keep Material Symbols as one scoped `@import` (weights 200/400), drop legacy Material Icons; downstream `.material-icons` migration tracked as `CSS-032a`. Full spec lives there. | — |
| `CSS-033` | feat | Publish reusable vendor icon assets (`wa.svg`, `github.svg`, and similar stripes/badges) to a stable CDN/public path so downstream projects can reference them without copying files from this repo. | M |
| `CSS-033a` | chore | After tagging `v0.6.12`, replace library references to old local image paths (`/assets/img/common/vendors/...`, `/assets/img/logo/...`) with canonical versioned CDN URLs pointing at `assets/css/images/**`. Verify vendor-logo, floating contact button, and brand-logo surfaces still render correctly. | S |
| `CSS-034` | chore | Fix critical server-side dependency vulnerabilities in the site/build toolchain, starting with templating and content-processing packages flagged by `npm audit` (notably `liquidjs` and other server-side/high-severity findings). Verify `npm run build` still passes after the refresh. | M |
| `CSS-078` | chore | **Audit the reset/normalization layer after the `v0.6.15` reorder fix.** Review `vendor/normalize`, the root `* { margin: 0; padding: 0 }` reset, and `box-sizing` coverage for pseudo-elements so the library has one intentional normalization strategy instead of overlapping reset behavior. Coordinates with the later `@layer` work (`CSS-130`). | S |
| `CSS-079` | perf | **Audit the generated spacing-utility matrix.** `_spacing.scss` emits 24 property families × 30 `$spaces` values × (base + 3 breakpoints) ≈ 2 900 selectors; `rare.css` is 406 KB unminified — already over the 400 KB budget set in `CSS-T01.7`, and this matrix is the main driver. Define the intentional property×value matrix (percentages and `auto` make no sense for several families — see `CSS-049` for the invalid-CSS slice), prune the generators, re-measure the bundle. Coordinates with `CSS-136` / `CSS-137`. | M |

## Accessibility base (P2)

Moved up from `0.8.0`. Not a high priority on its own, but both tasks are S-sized and the button-state work (`CSS-043`) needs a global focus story to build on. The rest of the a11y batch (`CSS-112..114`) stays in `0.8.0`.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-110` | a11y | Global `:focus-visible` style (2px solid `var(--brand-color)`, 2px offset). Audit and remove any stray `outline: none` (one known: `_search.scss:23`, already paired with a `:focus-visible` rule). | S |
| `CSS-111` | a11y | `.sr-only` / `.visually-hidden` utilities (a11y-project recipe). | S |

## Search tooling (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-050` | feat | Search tooling overhaul. Rebuild the Pagefind UI integration (`modules/navigation/header/_search.scss`, `_includes/header.njk` search trigger) and the standalone `/search/index.njk` page. Scope: align styling with library tokens, replace ad-hoc Pagefind-default markup overrides with a thin SCSS adapter, ship a documented results layout, ensure full keyboard & screen-reader path (focus-visible, ARIA roles, results live region), and audit `outline: none` patches like `CSS-013` so the global focus story (`CSS-110`) lands consistently. Treat the dedicated search page as the canonical surface, header search as a compact entry point. | L |

## Layout utilities documentation (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-072` | docs | `STYLEGUIDE.md` decision rule for picking between three column utilities: `.prose-columns` (text-flow column-count, balance) vs `.grid-cols-fit` (auto-fit grid, no balancing) vs `.list-group-pack` (sequential packing, requires height). Concrete use cases per utility. | S |

## Typography / list patterns (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-073` | feat | **Numbered steps pattern.** Add a dedicated ordered-process primitive for step-by-step flows where sequence is the main meaning, not just browser-default `<ol>` numbering. Scope: clear spacing, strong step marker, and optional short title/description structure for onboarding flows, procedures, checklists, and tutorials. | M |
| `CSS-074` | feat | **Interactive action list.** Add a list pattern for clickable rows with clear hover/focus/current states, suitable for menus, result lists, command pickers, settings sections, and other “choose one action/item” interfaces. Should cover the full-row hit area without turning every list use case into a button system. | M |
| `CSS-075` | feat | **Real tree-view list pattern.** Promote the current tree-style reading idea beyond simple visual indentation into a dedicated hierarchical list primitive for nested navigation, file trees, API surfaces, and documentation structures. Scope decision: static tree only vs expandable/collapsible tree with ARIA expectations. | M |
| `CSS-076` | feat | **Inline / horizontal list utility.** Add a lightweight list primitive for compact one-line item groups such as legal links, metadata trails, tag-like plain-text sequences, and short navigation rows. Decide separator strategy (`gap` only vs optional visual divider). | S |
| `CSS-077` | chore | ~~**Rename `.text-columns` to `.prose-columns`.**~~ **Done early, in `v0.6.14`** — renamed before the intermediate `.text-columns` name ever shipped (it existed only inside the unreleased harvest pass), so no extra breaking change. `Changelog.md` records `.columns` → `.prose-columns` directly. | S |

## Documentation-driven audit — first-pass `/styles/` pages (P1)

Per the **Documentation-driven audit policy** (see top of this doc). The corresponding `CSS-282..295` IDs in `v0.9.0` finalize these pages with KSS-extracted reference and remaining polish. Duplicates and over-complicated utilities surfaced here are filed as new tasks against the next bug-fix release.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-080` | docs | First-pass write of `/styles/typography/` covering fonts, headings, body, lists (incl. `<dl>`), code, sidenotes, blockquote, captions, tables, text-content widths. Expected to surface: heading variant overlap, list/dl duplication, table-row utility names, and the general outdent-inside-padded-surfaces contract — `v0.6.17` (`CSS-047`) resolved it for `.collapsible-container` by resetting the outdent family to the card's content width, but the same conflict awaits in any other padded card that hosts prose (`.card`, `.paper-sheet`). Finalized in `CSS-285`. | M |
| `CSS-081` | docs | First-pass write of `/styles/layout/` + child page `/styles/layout/spacing/` covering grid, containers, `fr` system, breakpoints, responsive prefixes (`mobile:` / `tablet:` / `desktop:`). Reflects the post-`CSS-027` aliases state. Expected to surface: spacing-utility overlap (`margin-t-*` vs `mt-*`), alias-vs-canonical distinction. Finalized in `CSS-284`. | M |
| `CSS-082` | docs | First-pass write of `/styles/utilities/` covering display, resets, breakpoints. Expected to surface: overlap between `.no-decoration` / `.no-padding` / `.no-border`, scrollbar helpers. Finalized in `CSS-291`. | S |
| `CSS-083` | docs | First-pass write of `/styles/decorations/` covering borders, shadows, separators, icons, images, skeleton. Reflects post-`CSS-032` Material Symbols Outlined canonical state. Pairs with `CSS-142` (Rareism rationale per utility). Finalized in `CSS-290`. | M |
| `CSS-084` | docs | First-pass write of `/styles/colors/` covering base / brand / supporting / blue and color utility classes. Expected to surface: contrast issues (feeds `CSS-114`), clarification of supporting-palette public-API surface. Finalized in `CSS-286`. | M |
| `CSS-085` | docs | First-pass write of `/styles/navigation/` covering header, sidebar, hamburger, search (post-`CSS-050` rebuild), tags, links, footer. Expected to surface: nav-list overlap, tags-vs-links distinction. Finalized in `CSS-289`. | M |
| `CSS-086` | docs | First-pass write of `/styles/elements/buttons/` covering variants, sizes, states, button-group, button-block. Depends on `CSS-040..046`. Finalized in `CSS-287` (forms section added in `v0.8.0`). | M |

## Distribution hygiene (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-T00` | chore | Migrate consumers off `https://raredigits.github.io/rare-styles/rare.min.css` (mutable, no CDN, no SRI) to a versioned CDN URL. Tag the current released snapshot (version per `_data/versions.js`), switch docs/examples to the latest tagged CDN target, and announce the old URL as deprecated. | S |

---

# Milestone `0.8.0` — Completeness

**Goal:** close the functional gaps needed for the core Rareism use cases. After this version Rare Styles covers clarity-first longreads and decision-first data views via two opt-in body-level layout modes (`.layout-story`, `.layout-dashboard`), on top of the already-correct defaults.

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

`CSS-110` / `CSS-111` moved up to the `0.7.0` accessibility-base section.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-112` | a11y | `@media (prefers-reduced-motion: reduce)` — neutralize transitions / animations. | S |
| `CSS-113` | a11y | Skip-link styles (`.skip-to-content`). | S |
| `CSS-114` | a11y | Contrast audit: `--gray-trans` (#888) on `--bg-color` (#f0f0f0) is ~3.5:1, fails WCAG AA for body text. Adjust `--text-color-light`. | M |

## Token system (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-121` | feat | Semantic color layer on top of base palette: `--color-success` / `--color-danger` / `--color-warning` / `--color-info`. Migrate components to semantic tokens. | M |
| `CSS-122` | feat | Surface tokens: `--surface-1` / `--surface-2` / `--surface-raised`, replacing direct `--gray-lightest` / `--gray-light` references inside components. | M |
| `CSS-123` | feat | Motion tokens: `--ease-out`, `--ease-in-out`, `--duration-fast` (120 ms), `--duration-base` (200 ms), `--duration-slow` (320 ms). | S |
| `CSS-124` | feat | **`--signal` token** separate from `--brand-color`. `--brand-color` stays for brand identity (link highlights, decorative brand marks). `--signal` is reserved for attention/action-driving accents (primary buttons, critical-state indicators, threshold violations, focus-visible). Migrate `button-primary`, `:focus-visible` outline, status-critical, KPI-delta-up/down to `--signal`. Codifies the Rareism distinction between identity and signal in the token layer itself. | M |

## Architecture (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-130` | feat | Adopt `@layer reset, vendor, base, tokens, components, utilities` at the root. Removes the need for `!important` and locks cascade order. | M |
| `CSS-131` | chore | Drop `!important` from `.mobile-hidden` once `CSS-130` lands. | S |
| `CSS-132` | chore | Generate `:root` variables from a SCSS map. Eliminate the duplication between `:root { --gray: ... }` and `$base_colors: gray, ...`. Single source of truth. | M |
| `CSS-133` | chore | **Complete `rd-` namespace adoption.** Prefix decision was taken in `v0.6.17` (`CSS-067`, consuming `CSS-060..063` — `rd-` namespace, `rd-is-*` state prefix, `rd-js-*` JS-hook prefix). This task finalizes the migration: audit existing component/utility classes (e.g. `.card`, `.tag`, `.sidebar`, `.note`, `.warning`, `.lead`) and decide per-class whether to prefix, alias, or leave as-is. Coordinates with `CSS-141`. | S |
| `CSS-134` | chore | `STYLEGUIDE.md` convention: components live in `bricks/` + `elements/`, utilities live in `layout/` + `utilities/` + `align/` + `decorations/`. | S |
| `CSS-135` | feat | Migrate margin/padding/border to logical properties (`margin-inline`, `padding-block`, `border-inline-start`). Out-of-the-box RTL/i18n support. | L |
| `CSS-136` | chore | **Rename top-end spacing tokens for semantic clarity.** `--space-xxxl` (12×) and `--space-xxxxl` (24×) communicate "bigger than bigger" rather than intent; arguably `--space-xxl` (6×) too. Pick a semantic scheme — three candidates: (a) industry t-shirt extension `--space-2xl/3xl/4xl`; (b) functional names like `--space-section/block/page`; (c) numeric multipliers `--space-x6/x12/x24`. Migrate the spacing scale, the `$spaces` list, all generated utility classes (`.height-xxxxl`, `.padding-xxxl`, etc.), and consumers (incl. the `.list-group-pack` height utility example in `/styles/layout/spacing/`). Mark as breaking change in `CHANGELOG.md`. | M |
| `CSS-137` | chore | **Merge `_spacing.scss` and `_spacing-aliases.scss` into one file.** The split between core tokens and short-form aliases adds an indirection layer without obvious benefit; consolidating clarifies what is canonical versus shorthand and reduces friction for contributors. While doing it, decide whether to keep the alias layer at all — the current convention `s: xs`, `m: sm`, etc. can mislead consumers (`m` ≠ `md`). Either prune to a smaller intentional set, or rebuild on cleaner ground. | M |

## Layouts (P0)

Story and Dashboard are **opt-in body-level layout modes**, not visual themes. Most pages need neither — the defaults already render correctly. Layouts only kick in when a page genuinely calls for a different frame: a longread that wants slower reading rhythm, or a data view that needs the full canvas. They are bundles of **token and layout-shell adjustments only** — they do not own components. All UI primitives (panels, stats, tables, toolbars, cards, buttons) are general-purpose and live in `bricks/` + `elements/`. They work in any layout; the layout just sets the typography/density/sidebar context.

### `layout-story` — longread mode

For prose-heavy pages: scaled-up serif typography, adjusted heading treatment, generous reading rhythm, narrow text column, left sidebar for navigation, rigid text-element constraints to protect prose.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-150` | feat | `modules/layouts/_story.scss`. Gate via `.layout-story` on `<html>` or `<body>`. | S |
| `CSS-151` | feat | Token overrides: serif headings (Playfair), scaled-up `--font-size-xl/xxl`, adjusted heading treatment, wider `--line-height`, narrow `--text-content-width`. Sidebar enabled. Rigid `max-width` on `article p/ul/ol`. | M |
| `CSS-152` | feat | Drop cap utility (`.dropcap` / `p.dropcap::first-letter`). | S |
| `CSS-153` | feat | Section divider variants for narrative structure (`.story-divider`, `.story-section-break`). | S |
| `CSS-154` | feat | Pull-quote variant tuned for Story (typographic, large, centered). | S |
| `CSS-155` | feat | Promote sidenotes / captions / blockquote / handwritten utilities as part of the documented Story preset (no code change — just docs grouping). | S |

### `layout-dashboard` — relaxed shell for decision surfaces

**Minimal delta from the defaults:** no left sidebar; no rigid `max-width` constraints on text elements (so panels and grids can expand to full width). Everything else (typography, spacing scale, colors, components) is identical to the library default. The purpose of Dashboard is not endless monitoring or generic admin CRUD, but focused display of decision-driving metrics, statuses, comparisons, and charts. Components like `panel`, `stat`, `table-dense`, `toolbar` are NOT layout-gated — they work without any layout class too (e.g. a KPI panel embedded inside a Story longread, or in plain documentation).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-160` | feat | `modules/layouts/_dashboard.scss`. Gate via `.layout-dashboard` on `<html>` or `<body>`. | S |
| `CSS-161` | feat | Sidebar removal: nullify `.sidebar` layout slot, expand main content to full grid width. | S |
| `CSS-162` | feat | Relax text-element constraints: drop `max-width` on `article p/ul/ol`, allow content to fill the grid. | S |

### Layout infrastructure

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-170` | feat | `modules/layouts/_index.scss` forwarding both layouts. Wire from `modules/_index.scss`. | S |
| `CSS-171` | feat | Allow combining a layout with token overrides at `:root` (brand-context customization without forking the layout). | S |
| `CSS-172` | docs | `STYLEGUIDE.md` section: layouts set page-level context, not components. Document which existing modules are layout-aware (typography, layout shell) and which are layout-agnostic (everything else). Make explicit: defaults are not a layout — pages without a `.layout-*` class get the canonical visual rendering. | S |

## Cross-layout components — Dashboard primitives (P0)

Functional UI primitives that work in any layout (Story, Dashboard, or no layout class at all). Deliberately not gated by `.layout-dashboard` so a Story article can embed them (e.g. a KPI panel inside a longread, a status indicator in plain documentation).

### Panel — the data-surface counterpart to `card`

Currently `.card` is overloaded for both narrative content (article preview, person, project) and functional content (KPI, status, chart wrapper). Split into two primitives with distinct semantics.

| Primitive | Semantics | Surface | Use cases |
|---|---|---|---|
| `.card` (existing) | Authorial / narrative / human | Soft, no rigid frame | Article preview, person, project, pricing |
| `.panel` (new) | Data / functional / system | Structured: header / body / footer | KPI, chart wrapper, status block, settings, log |

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-180` | feat | `modules/bricks/_panels.scss`: `.panel`, `.panel__header`, `.panel__body`, `.panel__footer`, `.panel-grid` (multi-panel layout primitive — flat per hybrid BEM policy, since it arranges panels rather than being one). Theme-agnostic. | M |
| `CSS-181` | chore | Rename data-row patterns currently misfiled under `.card`: `.card-dashboard-bordered` → `.panel--bordered`; `.card-row-bordered` → `.panel__row`; `.card-row-bordered-item` → `.panel__row-item`. Old names kept as deprecated aliases (with SCSS `@warn`) until `1.0.0`. Keeps backward compat for current site. | S |
| `CSS-182` | docs | STYLEGUIDE: `card` vs `panel` decision rule. Narrative / authorial content → `.card`. Data / system content → `.panel`. Concrete examples for each. | S |
| `CSS-183` | feat | `.panel--flush` modifier: removes outer padding so the panel docks flush against parent (used when nested in another panel or grid cell). | S |
| `CSS-183a` | chore | **Site migration**: replace `.card` usages on raredigits.art that wrap Dashboard-style blocks (KPI, charts, status, settings) with `.panel`. Audit `_includes/`, `_layouts/`, `_posts/`, `kb/`, `pricing/`, `charts/`, `_drafts/`. Old aliases keep the site working during the transition; this task removes the technical debt before `1.0.0`. | M |

### Other primitives (layout-agnostic)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-184` | feat | `modules/bricks/_stats.scss`: KPI block — `.stat`, `.stat__label`, `.stat__value`, `.stat--delta-up` / `.stat--delta-down` (BEM per hybrid policy; uses `--signal` for emphasis, semantic tokens for delta direction). | M |
| `CSS-185` | feat | Dense table styles in `modules/typography/_tables.scss`: `.table-dense`, zebra rows, sticky header, sortable indicator. | M |
| `CSS-186` | feat | Status indicators in `modules/decorations/`: `.status-dot`, `.badge-success/warning/danger/info`. Uses semantic tokens from `CSS-121`. | S |
| `CSS-187` | feat | `modules/elements/_toolbar.scss`: `.toolbar`, `.toolbar__section`, `.toolbar__spacer` (BEM per hybrid policy). Used for filter rows, dashboard headers, panel actions. | S |
| `CSS-188` | feat | `modules/layout/_shell.scss`: `.app-shell` — opt-in layout shell with topbar + main + optional sidebar. Used by dashboard pages but not gated by `layout-dashboard`. | M |

## Documentation-driven audit — first-pass `/styles/` pages (P0)

Continuation of the docs-audit policy started in `v0.7.0`. Each page below depends on the corresponding feature work landing in this milestone. Finalized in `v0.9.0` with KSS extraction.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-090` | docs | First-pass write of `/styles/tokens/`. Depends on `CSS-121..124` (semantic + surface + motion + `--signal`). Expected to surface: tokens duplicated across multiple `:root` blocks (feeds `CSS-132`). Finalized in `CSS-283` (auto-generated reference from `dist/tokens.json`). | M |
| `CSS-091` | docs | First-pass write of forms section on `/styles/elements/`. Depends on `CSS-100..105`. Joined with the buttons section already drafted in `CSS-086`. Finalized in `CSS-287`. | M |
| `CSS-092` | docs | First-pass write of `/styles/components/` (renames `/styles/bricks/`): Cards + Panels decision rule, stats, status indicators, badges, dense tables. Depends on `CSS-180..188`. Expected to surface: leftover `.card-*` patterns that are really panels (feeds `CSS-181`, `CSS-183a`). Finalized in `CSS-288`. | M |
| `CSS-093` | docs | First-pass write of `/styles/layouts/`: when `.layout-story` / `.layout-dashboard` apply, what changes vs the defaults, mixed-content examples. Depends on `CSS-150..172`. Finalized in `CSS-292a`. | M |
| `CSS-094` | docs | Update `/styles/utilities/` with a11y additions: `sr-only`, `:focus-visible` story, `prefers-reduced-motion` handling. Depends on `CSS-110..113` (`CSS-110` / `CSS-111` land earlier, in `0.7.0`). Extends `CSS-082`. | S |

## Existing module review

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-140` | chore | Reconsider the `.desktop:` prefix. `desktop` ≥ 1024 px is the default state, so `.desktop:col-span-6` equals `.col-span-6`. Either remove or scope it strictly to `(min-width: 1024px)` overrides. | S |
| `CSS-141` | chore | Audit collision-prone names: `.left`, `.right`, `.top`, `.bottom`, `.bold`, `.italic`, `.note`, `.warning`, `.lead`. Resolve together with `CSS-133`. | S |
| `CSS-142` | docs | STYLEGUIDE section **“Decoration as attention management”**: each decoration utility (border / shadow / separator / icon / image / skeleton) gets a one-line Rareism rationale — *what* attention it manages and *when* to reach for it. The Rareism stance: decorations are functional tools for guiding the eye; the standalone “decorator as creative specialist” role is obsolete. | S |
| `CSS-143` | docs | STYLEGUIDE: document `modules/special/_rare.scss` as a **staging area** for non-universal classes that have not yet earned a place in a specialized module. Promotion path: when a class generalizes, it migrates out into the appropriate module and is removed from `_rare.scss`. | S |

---

# Milestone `0.9.0` — Release Prep

**Goal:** ship-ready package — documentation, integrations with sibling libraries, build/CI, and theming guidance.

## Documentation (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-200` | docs | `README.md`: what the library is (Rareism instrument, narrow audience), how to install (CDN / npm / SCSS source), quick start, module map. Tone: assumes reader has read the manifesto; links to it rather than re-explaining. No “beginners welcome” copy — this is a principled tool, not a mass-market framework. | M |
| `CSS-200a` | docs | **`/styles/index.md`** — main library landing page on raredigits.art. Positioning ("ships the answer, not primitives"), manifesto link, two opt-in layouts (Story / Dashboard) mentioned as a flexibility feature — not the headline, install snippets, link to docs site (`/docs/`). Replaces the current placeholder. | M |
| `CSS-200b` | docs | **`/manifesto/value/`** — fill the empty page. Articulates the value proposition of Digital Rareism: who it’s for, what problem it solves, why narrow focus over mass appeal. Indirectly serves as the library’s manifesto-side rationale. | M |
| `CSS-201` | docs | `STYLEGUIDE.md`: hand-written conventions doc — naming, utilities vs components, how to add a new module, how to add a new token, breaking-change policy. | M |
| `CSS-202` | docs | Single-page demo (`assets/css/examples/index.html`) showing every component and utility. Doubles as a visual smoke test. | L |
| `CSS-203` | docs | ~~Per-module live examples~~ — subsumed by the `/styles/` content structure (`CSS-282..295`). Examples now live on each docs page. | — |
| `CSS-204` | docs | `CHANGELOG.md` starting at `0.7.0`, [Keep a Changelog](https://keepachangelog.com/) format. | S |
| `CSS-205` | docs | **`CONTRIBUTING.md`** — full contributor guide. Sections: quick start (clone/install/dev server), project structure (link to STYLEGUIDE), branching model, [Conventional Commits](https://www.conventionalcommits.org/) convention, PR process (one concern per PR, backlog-ID in title, CHANGELOG update), **public API definition** (which classes / CSS variables / SCSS exports / layout class names / dist filenames are public — i.e. require MAJOR bump to break), bug-report template, feature-proposal template, **release process for maintainers** (version bump → CHANGELOG → git tag → GitHub Release → npm publish), link to `CODE_OF_CONDUCT.md`. | M |
| `CSS-206` | docs | `LICENSE` (MIT recommended) at the repo root. | S |
| `CSS-207` | docs | **Theming guide** (`THEMING.md`): how to override base tokens for a constrained brand context. Show a worked dark-mode example via `:root { --bg-color: #111; --primary-color: #f0f0f0; ... }` overrides — no built-in dark mode, just a recipe. **Distinct from layouts**: this is the brand-override path (color/token overrides), not the Story/Dashboard mechanism (page-level shell). Cross-link to `/styles/themes/` for the no-theme-switching stance. | M |
| `CSS-208` | docs | `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 (verbatim). Linked from `CONTRIBUTING.md`. | S |
| `CSS-209` | docs | **Module inventory + documentation audit.** Compile the canonical list of every CSS/SCSS module in the library, audit each one for current purpose / ownership / public API surface, and verify that each module is documented somewhere appropriate (`/styles/`, `STYLEGUIDE.md`, KSS reference, or maintainer docs). Audit the current docs structure too: identify missing module coverage, stale sections, modules documented in the wrong place, and pages that describe code no longer present. This is an intentionally long-running task: it can advance incrementally alongside other backlog work and should be updated whenever a module changes or a docs page is written. | L |

## Documentation site `/styles/` — content structure (P0)

Public docs live under `/styles/` on raredigits.art. Organized **by user task**, not by SCSS file structure — readers shouldn’t need to know that `align/_align.scss` and `align/_flex.scss` are separate files. Each page combines: hand-written narrative (the *why*) + KSS-extracted class reference (the *what*) + live HTML examples (the *how*) + “see also” links to related tokens, components and integrations.

**First-pass write-ups happen earlier** — per the **Documentation-driven audit policy**, `CSS-080..086` (`v0.7.0`) and `CSS-090..094` (`v0.8.0`) cover the initial drafts. The `CSS-282..295` tasks below are **finalization**: integrate the KSS-extracted reference, fill the remaining edge pages (`getting-started`, `integration`, `reference`), and clean up anything still open from the earlier docs-audit passes.

**Existing folder reconciliation** — current `/styles/` already has stub folders that mostly map to this plan. The mapping below notes renames (`usage` → `getting-started`, `bricks` → `components`) and merges (`alignment` + `spaces` → `utilities`/`layout`). `/styles/idea/` and `/styles/modules/` are evaluated in `CSS-280`.

| ID | Path | Replaces / merges | Scope | Estimate |
|---|---|---|---|---|
| `CSS-280` | — | — | **Restructure plan**: review existing 14 folders, decide renames/merges/removals (`idea/` and `modules/` audit included), produce final IA before writing content. Output: a one-page proposal in `STYLEGUIDE.md`. | S |
| `CSS-281` | `/styles/` | existing | Library landing page — **done in `CSS-200a`**. | — |
| `CSS-282` | `/styles/getting-started/` | renames `/styles/usage/` | Install (CDN / npm / SCSS), first component, opting into a layout (`.layout-story` / `.layout-dashboard`), Hello World, checklist for production use (purge, fonts, focus styles). | M |
| `CSS-283` | `/styles/tokens/` | new | Auto-generated token reference from `dist/tokens.json` (depends on `CSS-271`). Categorized: color / spacing / typography / shadow / motion / surface. Includes the `--brand-color` vs `--signal` distinction explainer. | M |
| `CSS-284` | `/styles/layout/` | existing | Grid, containers, `fr` system, breakpoints, responsive prefixes (`mobile:` / `tablet:` / `desktop:`), `app-shell`. Includes the existing child page `/styles/layout/spacing/` (token reference, scale, utilities, aliases). | L |
| `CSS-285` | `/styles/typography/` | existing | Fonts, headings, body, lists (incl. `<dl>`), code, sidenotes, blockquote, captions, tables, text-content widths. Reads as a Story-style page by example. | L |
| `CSS-286` | `/styles/colors/` | existing | Palette overview, base / brand / supporting / blue families, `--signal` vs `--brand-color`, semantic tokens (`success` / `danger` / `warning` / `info`), link / text / bg utilities, contrast notes. | M |
| `CSS-287` | `/styles/elements/` | new | Buttons (variants, sizes, states, button-group, button-block), forms (inputs, checkbox, radio, select, validation states), toolbar. | L |
| `CSS-288` | `/styles/components/` | renames `/styles/bricks/` | The “what to reach for” page for product builders. Cards vs panels (decision rule + examples), stats, status indicators, badges, dense tables. | L |
| `CSS-289` | `/styles/navigation/` | existing | Header, sidebar, hamburger, search, tags, links, footer. | M |
| `CSS-290` | `/styles/decorations/` | existing | Borders, shadows, separators, icons, images, skeleton — each block opens with its Rareism rationale (ties to `CSS-142`). | M |
| `CSS-291` | `/styles/utilities/` | existing + merges `/styles/alignment/` | Display, alignment, flex, position, `sr-only`, `no-decoration`, `no-scrollbar`, resets. | M |
| `CSS-292a` | `/styles/layouts/` | new | Story and Dashboard body-level modes: when each applies, what changes vs the defaults, mixed-content examples (KPI panel inside Story, Story essay inside Dashboard shell). Explicit: defaults are not a layout — pages without a `.layout-*` class get the canonical rendering. | L |
| `CSS-292b` | `/styles/themes/` | existing | Keep the existing no-theme-switching stance. Add a pointer to the brand-override recipe from `THEMING.md` (`CSS-207`) for cases where a brand mandates a different palette. Rare cross-link to `/styles/layouts/` to clarify that themes ≠ layouts. | M |
| `CSS-293` | `/styles/integration/` | new | Wiring with Rare Scripts and Rare Charts. Per-script class/ARIA contracts, chart token consumption (depends on `CSS-230..244`). | M |
| `CSS-294` | `/styles/reference/` | new (or absorbs `/styles/modules/`) | Public API contract, semver policy, breaking-change rules, full module map, migration notes between major versions. Cross-link to `CONTRIBUTING.md`. | M |
| `CSS-295` | `/styles/special/` | existing | Cookie consent, collapsible, mockups, construction notice — narrow-purpose components that don’t fit other sections. Document as “opt-in for specific page types”. | S |

`CSS-203` (per-module live examples) is now **subsumed** by `CSS-282..295` — each docs page hosts its own live examples. Keep `CSS-202` (single-page demo) as the smoke-test artifact, separate from the docs site.

## Documentation infrastructure — KSS + auto-extracted reference (P0)

Hundreds of classes already exist; hand-written docs would rot immediately. The plan: **annotate sources with [KSS](https://github.com/kss-node/kss-node)-style comments**, generate the class reference automatically, and pair it with hand-curated examples. Token reference is fully auto-generated from `:root` (see “Token pipeline” below).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-260` | dx | Set up the docs site. Recommended stack: **kss-node** for class extraction + **Eleventy** (or Astro) shell for navigation, search, layout. The docs site itself is rendered with `.layout-story` (it's prose-heavy reading). Output to `docs/` (separate from `dist/`). Dev server with hot reload. | L |
| `CSS-261` | docs | KSS-annotate `colors` module (base, brand, supporting, blue). Each color group gets one comment block with sample swatches. | S |
| `CSS-262` | docs | KSS-annotate `typography` module (fonts, headings, body, lists, sidenotes, text-content, tables). | M |
| `CSS-263` | docs | KSS-annotate `layout` module (grid, containers, spacing). Spacing utilities documented as **one table per family** (margin, padding, gap, …) — 200+ classes don’t need 200 entries. | M |
| `CSS-264` | docs | KSS-annotate `elements` (buttons, forms) and `bricks` (cards, sections). | M |
| `CSS-265` | docs | KSS-annotate `navigation` (header, sidebar, tags, links) and `decorations` (borders, shadows, separators, icons, images, skeleton). | M |
| `CSS-266` | docs | KSS-annotate `align` (flex, position, align), `utilities` (display, resets, breakpoints), and `special` (collapsible, cookie-consent, construction, mockups). | S |
| `CSS-267` | docs | KSS-annotate layouts (`.layout-story`, `.layout-dashboard`) with side-by-side previews — including the no-layout default state for comparison. | M |
| `CSS-268` | dx | Docs site CI: build on every PR, deploy on tag to GitHub Pages at `https://raredigits.github.io/rare-styles/docs/`. Versioned URL per release (`/docs/v0.9.0/`, `/docs/latest/`). | M |
| `CSS-269` | docs | KSS authoring conventions in `STYLEGUIDE.md`: required fields, `Markup:` block format, modifier-class syntax, `Style guide:` hierarchy. So contributors annotate consistently. | S |

## Token pipeline (P0)

The library is already token-driven (CSS custom properties in `:root`). Formalize the pipeline so tokens can be auto-documented, exported to other formats, and validated against orphan references.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-270` | feat | **Token extractor**: parse `:root { --* }` blocks across `modules/**/*.scss`, emit `dist/tokens.json` in [W3C Design Tokens (DTCG)](https://www.designtokens.org/) format with categories (color / spacing / typography / motion / shadow / surface). Run as part of `build:css`. | M |
| `CSS-271` | docs | Auto-generate the token reference page in the docs site from `dist/tokens.json` — searchable table with name, value, category, computed sample (color swatch / spacing bar / shadow preview). | M |
| `CSS-272` | dx | **Token validator**: scan all SCSS for `var(--foo)` usages and fail the build if `--foo` is not declared anywhere. Catches the `--text-color` / `--warning-color` / `--grey-lightest` class of bugs at compile time. | S |
| `CSS-273` | feat | Multi-format token export via [Style Dictionary](https://amzn.github.io/style-dictionary/): emit `dist/tokens.scss` (SCSS map), `dist/tokens.js` (ES module), `dist/tokens.css` (standalone CSS file). Lets non-CSS consumers (JS charts, native apps) read the same source of truth. | M |
| `CSS-274` | docs | Token versioning policy section in `CONTRIBUTING.md`: renaming or removing a public token is a MAJOR bump; adding new tokens is MINOR; changing a value is MINOR (visual change) or PATCH (correction). | S |
| `CSS-275` | dx | Token diff tool: compare `dist/tokens.json` between two refs, output a human-readable changelog of token changes. Used for release notes. | S |

## Sibling-library integration (P0)

The CSS library lives next to two siblings: `scripts/` (collapsible, cookies, copy-to-clipboard, hamburger, search) and `charts/` (bar, line, map, multi, …). They already consume some classes; formalize the contract.

### Scripts

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-230` | feat | **Finalize** the audit of `_collapsible.scss`, `_cookie-consent.scss`, `_search.scss`, `_hamburger.scss` against the actual JS in `/scripts/`. The JS migration onto `.rd-js-*` hooks already shipped in `v0.6.17` (`CSS-068`), so this shrinks to a finalization pass: close any remaining gaps between the CSS modules and the shipped contract in `SCRIPTS_CONTRACT.md`. | S |
| `CSS-231` | feat | Add `copy-to-clipboard` styles (button, success/error toast). Currently the script has no companion CSS module. Consumes the `.rd-js-copy` hook reserved in `CSS-065`. | S |
| `CSS-232` | docs | One-page "Scripts integration" doc: which CSS classes each script needs, and which tokens it reads. Builds on the contract draft from `CSS-064` (`v0.6.17`). | S |

### Charts

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-240` | feat | `modules/charts/_index.scss` — base tokens for charts: `--chart-axis-color`, `--chart-grid-color`, `--chart-label-color`, `--chart-tooltip-bg`, `--chart-series-1..8`. Sourced from semantic tokens. | M |
| `CSS-241` | feat | Common chart chrome styles: axis, gridlines, legend, tooltip, data labels. Used by every chart type in `charts/`. | M |
| `CSS-242` | feat | Map chart styles (`charts/map`): land/water fills, hover state, choropleth scale tokens. | M |
| `CSS-243` | feat | Layout-aware chart palette: `.layout-story` uses muted/editorial palette; `.layout-dashboard` uses high-contrast functional palette. Default (no layout class) uses the high-contrast functional palette as well. | M |
| `CSS-244` | docs | “Charts integration” doc: how to wire any chart to the token system, how to override per-instance via CSS variables. | S |

## Distribution (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-211` | feat | Tag releases in git (`v0.6.12`, `v0.6.13`, `v0.7.0`, `v0.8.0`, `v0.9.0`). Use semver strictly. | S |
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
| `CSS-T01.2` | feat | npm package **`@raredigits/rare-styles`** (matches the canonical library name). Set `main`, `style`, `sass`, `exports` fields. Mark `dist/` as the only published path via `files`. The compiled file stays `rare.css` / `rare.min.css` for continuity with existing consumers. | M |
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
- [ ] Semantic tokens (success/danger/warning/info, surfaces, motion) + `--signal` separate from `--brand-color`
- [ ] `.layout-story` and `.layout-dashboard` documented and demoed against the no-layout default state; layout-agnostic primitives (panel, stat, table-dense, toolbar, app-shell) work in either layout and without any layout class
- [ ] Cascade layers in place; no `!important`
- [ ] Sibling-library integration finalized for `scripts/` and `charts/`
- [ ] README + STYLEGUIDE + CONTRIBUTING + CODE_OF_CONDUCT + THEMING + CHANGELOG + LICENSE + demo page
- [ ] Theming guide includes a worked dark-theme example
- [ ] Docs site (KSS + Eleventy) deployed; every module is annotated; token reference auto-generated from `dist/tokens.json`
- [ ] Token pipeline complete: `dist/tokens.json` + Style Dictionary exports + token validator in CI
- [ ] Bundle after purge ≤ 30 KB
- [ ] CDN + npm package published (`CSS-T01` complete)
- [ ] CI green: lint + token validator + visual regression + lighthouse
- [ ] `v1.0.0` tagged in git, GitHub Release notes published

---

# Open Questions — for discussion

Parking lot for questions that need a maintainer decision before they become (or close) tasks. Raised by the 2026-06-11 audit; review during planning, route each to its target milestone.

| # | Question | Context | Routes to |
|---|---|---|---|
| `Q-01` | Fate of `/styles/typography/interactive/` | IA conflict: the skeleton page (Links / Buttons / Forms) lives under typography, while the target IA puts buttons and forms under `/styles/elements/` (`CSS-086`, `CSS-287`). Merge, redirect, or delete — decide inside the `CSS-280` restructure plan. | `CSS-280` |
| `Q-02` | Is `CSS-200a` already done? | `/styles/index.md` already ships the positioning copy, jsDelivr install link, and manifesto framing that the task describes. Verify against the task scope, then close or re-scope it. | `0.9.0` docs |
| `Q-03` | Orphan public tokens | `--brand-color-rgb`, `--line-height-md`, `--link-color-light`, `--link-color-secondary` are declared but consumed nowhere in the library. Public API for consumers or leftovers? Feeds the token validator / reference work. | `CSS-270..272` |
| `Q-04` | Element-vs-class stance for buttons | `_buttons.scss` styles every native `button` globally (`display: block`, `width: fit-content`) — aggressive for embedded/consumer contexts. Decide whether the button system targets elements or only `.button` classes before building variants. | `CSS-040..046` |
| `Q-05` | Font-loading philosophy after killing `@import` (`CSS-030`) | **Decided (2026-07-12): (a) batteries-included, self-hosted.** `rare.min.css` keeps `@font-face` pointing at self-hosted woff2 in `fonts/`; consumers bump the version and get the same families minus Google/waterfall, mitigated by `unicode-range` + shipping only the token-declared weights. Rejected (b) agnostic core + optional pack (breaking, silent system-font fallback). | ✅ `CSS-030` / `v0.6.16` |
| `Q-06` | Scope/sequencing of icon consolidation (`CSS-032`) | **Decided (2026-07-12): keep Material Symbols as one scoped `@import`** (weights 200/400), self-host only the text families, drop legacy `Material Icons` + `Material Icons Outlined`. Symbols stays Google-hosted → zero consumer icon migration. In-repo cut is clean (0 usages); the downstream `.material-icons` break (schnellreich.ru) is staged via `CSS-032a` and lands together with `CSS-030` in one release. | ✅ `CSS-032` / `v0.6.16` |

---

# Post-1.0 Backlog

| ID | Type | Task | Notes |
|---|---|---|---|
| `CSS-300` | feat | Container queries (`@container`) for adaptive components | Currently everything is `@media`; CQ is more useful for a component library |
| `CSS-301` | feat | Animation library: `.fade-in`, `.slide-up`, micro-interactions | Built on the `--ease-*` / `--duration-*` tokens |
| `CSS-302` | feat | Extended color palette: 50–950 ramp per hue | Currently flat: light/base/dark |
| `CSS-303` | feat | Bundled icon set (or adapter for Lucide / Heroicons) | Since `v0.6.16` the library loads a single scoped Material Symbols import (weights 200/400); a bundled/self-hosted icon set or Lucide/Heroicons adapter is the post-1.0 evolution of that |
| `CSS-304` | feat | Toast / Modal / Tooltip / Dropdown components | HTML-only via `<dialog>` and `:popover-open` where possible |
| `CSS-305` | feat | Tabs / Accordion / Stepper | Same |
| `CSS-306` | feat | RTL demo and tests after `CSS-135` | |
| `CSS-307` | dx | Figma plugin or `tokens.json` export (W3C Design Tokens) | Designer round-trip |
| `CSS-308` | feat | Additional layouts: `.layout-print`, `.layout-presentation`, `.layout-zen` | Built on the same layout infrastructure as Story / Dashboard |
| `CSS-309` | feat | **Official Eleventy (11ty) theme built on Rare Styles** | Packaged starter/theme for 11ty sites; planned — candidate for its own release track separate from the library versioning. The `/styles/` docs shell and the KSS docs site (`CSS-260`) already run on Eleventy and can seed it |

---

## Release summary

| Version | Codename | Scope |
|---|---|---|
| `v0.6.12` | Cleanup & Delivery Hygiene | Lint/build cleanup batch, font-weight trim, Material Icons policy, reusable contact-button audit, vendor-icon CDN follow-up |
| `v0.6.13` | Reusable Asset Reshuffle | Micro-release for canonical reusable-image layout and downstream asset-surface stabilization |
| `v0.6.14` | Cross-Project Enrichment | Harvest and normalize reusable classes/patterns from adjacent projects already using Rare Styles |
| `v0.6.15` | Audit Hotfixes & Post-Harvest Cleanup | Bug-fix follow-up on top of `v0.6.14`: audit findings (`CSS-027..052`, with table bugs `CSS-053..055` already pulled forward), immediate downstream fixes, asset-path cleanup, and the narrow harvested additions `.boilerplate` / `.feature-row` |
| `v0.6.16` | Font Self-Hosting | Kill the render-blocking `@import` waterfall: self-host the four text families (relative `fonts/…` woff2, `unicode-range`, `swap`), keep one scoped Material Symbols import (weights 200/400), drop legacy Material Icons. Pulled forward from `v0.7.1` (`CSS-030` / `CSS-032`) |
| `v0.6.17` | _current_ — Scripts Contract & Unified Rewrite | Audit and freeze the CSS↔scripts contract, adopt the `rd-` namespace (consuming `v0.7.0`), rewrite the five companion scripts onto `.rd-js-*` hooks / `.rd-is-*` states / baseline ARIA, and harvest the carousel from schnellreich.ru as the sixth script (`CSS-088`). **Breaking** — hard cut, downstream coordinated pre-merge |
| `v0.6.18` | CDN Migration & Pages Sunset Prep | Move docs/examples and downstream consumers off GitHub Pages URLs to versioned jsDelivr targets, then clear the path for Pages unpublish and legacy cleanup |
| `v0.6.19` | Documentation Skeleton Pressure | Keep draft `/styles/` pages visible as intentional backlog pressure, while cleaning up broken anchors and incomplete-page policy |
| `v0.6.20` | Rare Digits Media Kit Prep | Package Rare Digits branding surfaces, attribution variants, and library-link guidance as a reusable media-kit layer |
| `v0.7.0` | Namespace Foundations | **Consumed by `v0.6.17`** — scope moved forward (`CSS-060..063` → `CSS-067`); version number retired, sequence continues at `v0.7.1` |
| `v0.7.1` | Stabilization | Real button system, search tooling overhaul, plus any remaining stabilization work not needed for `v0.6.12` / `v0.6.14` |
| `0.8.0` | Completeness | Forms, a11y, semantic tokens (incl. `--signal`), `@layer`, `.layout-story`, `.layout-dashboard`, layout-agnostic primitives (panel/stat/table-dense/toolbar/app-shell) |
| `0.9.0` | Release Prep | KSS docs site, token pipeline, theming guide, scripts/charts integration, purge, CI |
| `CSS-T01` | (parallel) | CDN + npm distribution |
| `1.0.0` | Public Release | Stable public API |
