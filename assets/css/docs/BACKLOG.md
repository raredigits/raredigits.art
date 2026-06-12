# Rare Styles — Backlog & Roadmap

**Current version:** resolved from [`_data/versions.json`](../../../_data/versions.json) → `styles`. Do not hardcode version numbers in this header — they rot.
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

- Source of truth for the current released library version: `_data/versions.json` (`styles`). Codenames live in the Release summary table at the bottom — no duplicate version claims elsewhere in this file.
- Current released library version: `v0.6.14` (`Cross-Project Enrichment`). Release manifest: [`HARVEST_v0.6.14.md`](./HARVEST_v0.6.14.md).
- Current working release: `v0.6.14_1` for audit hotfixes (findings from the 2026-06-06 and 2026-06-11 audits).
- Next release after that: `v0.6.15` — namespace foundations (`rd-` prefix, `rd-is-*`, `rd-js-*`), early scripts-integration contract, plus CDN migration and GitHub Pages sunset.

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

`_icons.scss` full cleanup is deferred to `v0.6.16`: make selectors family-agnostic where possible, remove legacy compatibility tails only after downstream migration is complete, and avoid doing the same refactor twice across adjacent releases.

**Exit criteria:**

- [x] Candidate classes from adjacent projects are reviewed and curated, not copied wholesale
- [x] Imported classes follow Rare Styles naming/token conventions
- [x] New patterns are documented with intended use cases and non-goals

Icon-family cleanup follow-up: the external-project audit and compatibility-selector removal are moved out of `v0.6.14` and tracked for `v0.6.16`, where the full legacy Material icon cleanup can be handled as one bounded pass instead of stretching the harvest release.

---

# Milestone `v0.6.14_1` — Audit Hotfixes

**Goal:** ship a tight follow-up patch to `v0.6.14` that clears the audit findings from 2026-06-06 and 2026-06-11. Scope is strictly bugs and small hygiene fixes — no new features, no harvesting, no API changes. Nothing from this list is hotfixed into `v0.6.14` — the harvest release stays liftable.

**Recommended scope:**

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-027` | bug | **Responsive aliases broken in production.** `_spacing-aliases.scss` uses `\\:` and compiles to `.mobile\\:p-s` (literal backslash in the class name) — verified in `assets/css/rare.css`. Every short-form responsive alias (`mobile:p-s`, `tablet:m-l`, `desktop:gap-xl`, …) currently fails to match HTML. Fix: use `\:` (single backslash) to match `_spacing.scss`. | P0 | S |
| `CSS-028` | bug | `--header-height` declared in both `layout/_containers.scss:5` and `navigation/header/_header-container.scss:4`. Drop the duplicate and keep `layout/_containers.scss` as the single owner. | P1 | S |
| `CSS-035` | a11y | `--font-size: 16px` literal in `typography/_fonts.scss:14`. Should be `1rem` so the user font-size preference is honored. All other size tokens are already in rem. | P1 | S |
| `CSS-037` | chore | ~~Resolve outstanding stylelint error at `_grid.scss:137` (`at-rule-empty-line-before`).~~ **Done early in `v0.6.14`** — blank line added before the `@if`; `npm run lint:css` is clean. Pulled forward so the harvest release ships lint-clean. | P1 | S |
| `CSS-039` | docs | Hide or replace stub `/styles/` pages. Five ship "🚧 SECTION ON RECONSTRUCTION": `alignment`, `idea`, `navigation`, `special`, `utilities`. The 2026-06-11 audit extends the list: `/styles/typography/interactive/` is a skeleton (empty `Links` / `Buttons` / `Forms` headings — and forms don't exist in the library until `0.8.0`), `/styles/decorations/` is near-empty (21 lines, one class mentioned), and `_data/tableOfContents.json` links dead anchors (`/styles/typography/interactive/#forms`). Either hide from sidebar until content lands (see `CSS-282..295`) or write minimum viable content. | P1 | S |
| `CSS-029` | chore | Duplicate brand class in `special/_rare.scss`: `.rare-brand` and `.rare-brand-color` produce identical rules. Pick one. | P2 | S |
| `CSS-038` | chore | ~~Decide fate of `assets/css/move-in.css` — a plain-CSS file outside the SCSS pipeline with site-specific overrides. Options: fold into SCSS, document as a separate site layer, or delete.~~ **Done in `v0.6.14`** — harvested rules were either integrated into SCSS modules, deferred, or dropped with rationale in `HARVEST_v0.6.14.md`; `assets/css/move-in.css` was then deleted. | P2 | S |
| `CSS-047` | bug | **Asymmetric outdent override in `_collapsible.scss`.** `.collapsible-content > .caption, .highlight, pre, .text-content-caption, .card-caption` (and the parallel `.collapsible-content .…` rules) override `margin-left` only, leaving `margin-right` at the parent's default. Surfaced after `@mixin outdent` (v0.6.14) made the base outdent symmetric — the asymmetry inside collapsible blocks is now visible. Fix: either mirror to `margin-right` or drop the override if it's no longer needed. While fixing, collapse the duplication: the `>`-child block and the descendant block carry identical bodies. Lines: `assets/css/modules/special/_collapsible.scss:33-44`, `:46-56`. | P1 | S |
| `CSS-048` | bug | **normalize.css is emitted at the end of the compiled bundle.** In `rare.scss`, `@use "vendor/normalize"` comes after `@use "modules/index"`, so the reset lands after all module CSS (`rare.css:20370` of 20678) and overrides component styles instead of underpinning them. Fix: reorder the `@use` statements so normalize is emitted first. Long-term the cascade gets locked by `@layer` (`CSS-130`). While there, review the doubled reset strategy: `* { margin: 0; padding: 0 }` in `rare.scss` overlaps normalize, and `box-sizing: border-box` is not extended to `*::before` / `*::after`. | P1 | S |
| `CSS-049` | bug | **Generated utilities emit invalid CSS.** The `$spaces` matrix in `_spacing.scss` produces `.gap-auto`, `.gap-x-auto`, `.gap-y-auto` (`gap: auto` is not a valid value) in the base set and across all three responsive prefixes. Special-case `auto` out of the gap families. The full property×value matrix audit is `CSS-079` (`0.7.0`) — this is only the invalid-CSS slice. | P2 | S |
| `CSS-051` | docs | **Install snippets contradict each other today.** `/styles/usage/` still recommends `https://raredigits.github.io/rare-styles/...` in three snippets, while the `/styles/` landing page already points to versioned jsDelivr. Update the usage page to the CDN URL now; the full Pages sunset remains `CSS-T00.2` (`v0.6.15`). | P1 | S |
| `CSS-052` | chore | **Reconcile the `CSS-031` record with shipped reality.** The task spec said "keep 300/400/500/700 + italic 400", but `_fonts.scss:2` imports Fira Sans 100/200/400/700/900 + italics (10 styles), which matches the `--font-weight-*` tokens (`thin: 100`, `light: 200`, `normal: 400`, `bold: 700`, `black: 900`). Decide the canonical weight set and align the import, the tokens, and the task record. Note: `--font-weight-light: 200` actually maps to the extra-light cut. | P2 | S |
| `CSS-053` | bug | ~~**Table horizontal scroll is non-functional.**~~ **Done early in `v0.6.14`** — removed the dead `overflow-x` from `table`, shipped the opt-in `.table-scroll` wrapper, reconciled the docs claim. | P1 | S |
| `CSS-054` | bug | ~~**Zebra/hover signal is inverted in `.table-striped`.**~~ **Done early in `v0.6.14`** — both directions unified upward: even rows `--gray-lightest`, hover `--white` across every preset. | P2 | S |
| `CSS-055` | chore | ~~**Dead declaration `thead, tbody { width: 100% }`.**~~ **Done early in `v0.6.14`** — removed. | P2 | S |

**Exit criteria:**

- [ ] `CSS-027` resolved — responsive-alias regression cleared from compiled `rare.css`
- [ ] `CSS-028`, `CSS-035`, `CSS-039`, `CSS-047`, `CSS-048`, `CSS-051` resolved
- [x] `CSS-037` — pulled forward and resolved in `v0.6.14`; `npm run lint:css` clean
- [ ] `npm run lint:css` runs clean
- [ ] P2 items (`CSS-029`, `CSS-038`, `CSS-049`, `CSS-052`) resolved or explicitly deferred with a target milestone
- [x] `CSS-053`, `CSS-054`, `CSS-055` — pulled forward and resolved in `v0.6.14` (table pass), not waiting for this patch
- [ ] No new features, no consumer-facing API additions — bug-fix release only

---

# Milestone `v0.6.15` — Namespace Foundations, Scripts Integration & CDN Migration

**Goal:** seed three medium-term initiatives so they can land cleanly across `0.7.0`–`0.9.0`: introduce the `rd-` namespace and reserve its utility prefixes; freeze the contract between Rare Styles CSS and the companion `/scripts/` JS set; move consumers off mutable GitHub Pages asset URLs onto versioned CDN URLs.

## Namespace foundations

The library so far ships unprefixed classes. `CSS-133` and `CSS-141` flag the collision risk. Decision taken in this release: adopt **`rd-`** (Rare Digits) as the official library namespace, starting with two reserved utility prefixes plus the policy doc. Full migration of existing component classes is a later concern (`CSS-133` in `0.7.0`).

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-060` | feat | **Introduce `rd-` namespace.** Adopt `rd-` as the official Rare Digits library prefix. New utility/state/JS-hook classes ship with the prefix from this release. Existing component classes (e.g. `.card`, `.sidebar`, `.tag`) stay unprefixed until the `0.7.0` migration pass — no churn in this release. | P0 | S |
| `CSS-061` | feat | **Reserve `.rd-is-*` state-modifier prefix.** Document `.rd-is-active`, `.rd-is-hidden`, `.rd-is-open`, `.rd-is-loading`, `.rd-is-disabled` etc. as the canonical way to express UI state on any element. Ship at minimum `.rd-is-active` and `.rd-is-hidden` as real classes (others as documented convention). | P0 | S |
| `CSS-062` | feat | **Reserve `.rd-js-*` JS-hook prefix.** Document `.rd-js-*` as the canonical hook used by `/scripts/` to find DOM nodes. CSS rules MUST NOT style `.rd-js-*` selectors directly — they are behavioral hooks only. Ship at minimum `.rd-js-dropdown` (toggleable container reserved for script-driven menus / pickers / panels). | P0 | S |
| `CSS-063` | docs | **Namespace policy in `STYLEGUIDE.md`.** Codify the three rules: `rd-` for new utilities/states/hooks; `rd-is-*` for state; `rd-js-*` for JS hooks, never styled. Include a one-paragraph migration note pointing at `CSS-133`. | P0 | S |

## Scripts integration (early audit)

Companion script set at [`/scripts/`](http://localhost:8080/scripts/) — `collapsible`, `cookies`, `copy-to-clipboard`, `hamburger`, `search` — already consumes some CSS classes. Freeze the contract here so the full integration in `CSS-230..232` (`0.9.0`) becomes finalization rather than discovery. Coordinates with `CSS-060..063` because most contract hooks will end up as `.rd-js-*`.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-064` | feat | **Audit `/scripts/` CSS+ARIA contracts.** Inventory which classes and ARIA attributes each script reads/writes today (`collapsible`, `cookies`, `copy-to-clipboard`, `hamburger`, `search`). Output: a contract table per script, lands in `STYLEGUIDE.md` or a dedicated `SCRIPTS_CONTRACT.md`. | P1 | M |
| `CSS-065` | feat | **Map each script to its `.rd-js-*` hook.** Define the canonical hook name per script (e.g. `.rd-js-collapsible`, `.rd-js-cookie-consent`, `.rd-js-copy`, `.rd-js-hamburger`, `.rd-js-search`). Document state classes each script applies (likely `.rd-is-open`, `.rd-is-active`, etc.). No JS migration in this release — only the contract. | P1 | S |

## CDN migration & Pages sunset

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T00.1` | chore | Update library asset references to canonical versioned CDN URLs under `assets/css/images/**`. Note: as of `v0.6.14` the folder is passed through to the built site (`.eleventy.js`) and `blockquote` already references it via a relative URL — use that relative-path pattern as the local fallback, and reconcile with the versioned-CDN form here. | P0 | S |
| `CSS-T00.2` | chore | Migrate docs/examples away from `https://raredigits.github.io/rare-styles/...`. | P0 | S |
| `CSS-T00.3` | chore | Audit known downstream consumers for GitHub Pages CSS URLs and patch them. | P0 | M |
| `CSS-T00.4` | chore | Unpublish the legacy GitHub Pages site once downstream consumers are migrated. | P0 | S |
| `CSS-T00.5` | chore | Remove legacy Pages-only repository artifacts such as `.nojekyll` after unpublish. | P1 | S |

## Exit criteria

- [ ] `rd-` namespace is documented in `STYLEGUIDE.md` with the three-rule policy
- [ ] `.rd-is-active`, `.rd-is-hidden`, `.rd-js-dropdown` are reserved and shipped (real or documented per CSS-061/062)
- [ ] Contract between Rare Styles CSS and each `/scripts/` module is documented per `CSS-064`
- [ ] Each `/scripts/` module has a defined `.rd-js-*` hook name (`CSS-065`)
- [ ] Library references to old local image paths are replaced with canonical versioned CDN URLs
- [ ] Docs/examples no longer recommend `https://raredigits.github.io/rare-styles/...`
- [ ] Known downstream consumers are migrated off GitHub Pages CSS URLs
- [ ] The `rare-styles` GitHub Pages site is unpublished
- [ ] Pages-only legacy files like `.nojekyll` are removed or explicitly justified
- [ ] No JS rewrites in this release — `/scripts/` migration to `.rd-js-*` hooks is scheduled for `CSS-230..232` in `0.9.0`

---

# Milestone `0.7.0` — Stabilization

**Goal:** zero invalid CSS in the codebase, linter in place, fonts loaded properly, and the existing button module turned into a real button system.

## Quality infrastructure (P0–P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-020` | dx | Keep **Stylelint** on a Node-18-compatible stack: `stylelint@16`, `stylelint-config-standard-scss`, `postcss-scss`. Document `npm run lint:css` as the canonical CSS check. | M |
| `CSS-021` | dx | Make `npm run lint:css` the stable team entry point, run `stylelint --fix` where safe, and document when linting is required in day-to-day work and before release. | S |
| `CSS-022` | dx | Document the build pipeline: how `rare.css` / `rare.min.css` are produced, how linting fits into the release flow, and which `package.json` scripts are canonical (`build:css`, `watch:css`, `lint:css`). | M |
| `CSS-023` | chore | Sweep low-risk Stylelint cleanup that is mostly mechanical: modern `rgb(... / ... )` notation, alpha percentages, hex shortening, empty-line normalization, operator spacing, argumentless mixin call style. | M |
| `CSS-024` | chore | Triage duplicate/dead declarations reported by Stylelint and either remove them or document intent: `_icons.scss`, `_tags.scss`, `_header-container.scss`, `_grid.scss`, `_sidenotes.scss`. | S |
| `CSS-025` | chore | Clean up module hygiene issues reported by Stylelint: `@forward` without `.scss` extension in `navigation/_index.scss`, decide whether empty `special/_rare.scss` should be removed or kept as an intentional staging file. | S |
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
| `CSS-030` | perf | Keep font loading convenient for downstream projects, but review whether Google Fonts imports can be made cheaper/cleaner without forcing every consumer to re-declare them manually. | S |
| `CSS-031` | perf | Trim Fira Sans weights (currently 18 weights × 2 styles). Keep 300/400/500/700 + italic 400. | S |
| `CSS-032` | chore | Rationalize Material icon loading. We currently import three related families (`Material Icons`, `Material Icons Outlined`, `Material Symbols Outlined`); decide the canonical set, remove unnecessary overlap, and document which family the library expects. | S |
| `CSS-033` | feat | Publish reusable vendor icon assets (`wa.svg`, `github.svg`, and similar stripes/badges) to a stable CDN/public path so downstream projects can reference them without copying files from this repo. | M |
| `CSS-033a` | chore | After tagging `v0.6.12`, replace library references to old local image paths (`/assets/img/common/vendors/...`, `/assets/img/logo/...`) with canonical versioned CDN URLs pointing at `assets/css/images/**`. Verify vendor-logo, floating contact button, and brand-logo surfaces still render correctly. | S |
| `CSS-034` | chore | Fix critical server-side dependency vulnerabilities in the site/build toolchain, starting with templating and content-processing packages flagged by `npm audit` (notably `liquidjs` and other server-side/high-severity findings). Verify `npm run build` still passes after the refresh. | M |
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
| `CSS-080` | docs | First-pass write of `/styles/typography/` covering fonts, headings, body, lists (incl. `<dl>`), code, sidenotes, blockquote, captions, tables, text-content widths. Expected to surface: heading variant overlap, list/dl duplication, table-row utility names. Finalized in `CSS-285`. | M |
| `CSS-081` | docs | First-pass write of `/styles/layout/` + child page `/styles/layout/spacing/` covering grid, containers, `fr` system, breakpoints, responsive prefixes (`mobile:` / `tablet:` / `desktop:`). Reflects the post-`CSS-027` aliases state. Expected to surface: spacing-utility overlap (`margin-t-*` vs `mt-*`), alias-vs-canonical distinction. Finalized in `CSS-284`. | M |
| `CSS-082` | docs | First-pass write of `/styles/utilities/` covering display, resets, breakpoints. Expected to surface: overlap between `.no-decoration` / `.no-padding` / `.no-border`, scrollbar helpers. Finalized in `CSS-291`. | S |
| `CSS-083` | docs | First-pass write of `/styles/decorations/` covering borders, shadows, separators, icons, images, skeleton. Reflects post-`CSS-032` Material Symbols Outlined canonical state. Pairs with `CSS-142` (Rareism rationale per utility). Finalized in `CSS-290`. | M |
| `CSS-084` | docs | First-pass write of `/styles/colors/` covering base / brand / supporting / blue and color utility classes. Expected to surface: contrast issues (feeds `CSS-114`), clarification of supporting-palette public-API surface. Finalized in `CSS-286`. | M |
| `CSS-085` | docs | First-pass write of `/styles/navigation/` covering header, sidebar, hamburger, search (post-`CSS-050` rebuild), tags, links, footer. Expected to surface: nav-list overlap, tags-vs-links distinction. Finalized in `CSS-289`. | M |
| `CSS-086` | docs | First-pass write of `/styles/elements/buttons/` covering variants, sizes, states, button-group, button-block. Depends on `CSS-040..046`. Finalized in `CSS-287` (forms section added in `v0.8.0`). | M |

## Distribution hygiene (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-T00` | chore | Migrate consumers off `https://raredigits.github.io/rare-styles/rare.min.css` (mutable, no CDN, no SRI) to a versioned CDN URL. Tag the current released snapshot (version per `_data/versions.json`), switch docs/examples to the latest tagged CDN target, and announce the old URL as deprecated. | S |

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
| `CSS-133` | chore | **Complete `rd-` namespace adoption.** Prefix decision is taken in `v0.6.15` (`CSS-060..063` — `rd-` namespace, `rd-is-*` state prefix, `rd-js-*` JS-hook prefix). This task finalizes the migration: audit existing component/utility classes (e.g. `.card`, `.tag`, `.sidebar`, `.note`, `.warning`, `.lead`) and decide per-class whether to prefix, alias, or leave as-is. Coordinates with `CSS-141`. | S |
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
| `CSS-230` | feat | **Finalize** the audit of `_collapsible.scss`, `_cookie-consent.scss`, `_search.scss`, `_hamburger.scss` against the actual JS in `/scripts/`. Initial inventory landed in `CSS-064` (`v0.6.15`); this task closes any remaining gaps and migrates the JS to consume the `.rd-js-*` hooks defined in `CSS-065`. | M |
| `CSS-231` | feat | Add `copy-to-clipboard` styles (button, success/error toast). Currently the script has no companion CSS module. Consumes the `.rd-js-copy` hook reserved in `CSS-065`. | S |
| `CSS-232` | docs | One-page "Scripts integration" doc: which CSS classes each script needs, and which tokens it reads. Builds on the contract draft from `CSS-064` (`v0.6.15`). | S |

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
| `CSS-308` | feat | Additional layouts: `.layout-print`, `.layout-presentation`, `.layout-zen` | Built on the same layout infrastructure as Story / Dashboard |
| `CSS-309` | feat | **Official Eleventy (11ty) theme built on Rare Styles** | Packaged starter/theme for 11ty sites; planned — candidate for its own release track separate from the library versioning. The `/styles/` docs shell and the KSS docs site (`CSS-260`) already run on Eleventy and can seed it |

---

## Release summary

| Version | Codename | Scope |
|---|---|---|
| `v0.6.12` | Cleanup & Delivery Hygiene | Lint/build cleanup batch, font-weight trim, Material Icons policy, reusable contact-button audit, vendor-icon CDN follow-up |
| `v0.6.13` | Reusable Asset Reshuffle | Micro-release for canonical reusable-image layout and downstream asset-surface stabilization |
| `v0.6.14` | Cross-Project Enrichment | Harvest and normalize reusable classes/patterns from adjacent projects already using Rare Styles |
| `v0.6.14_1` | _current_ — Audit Hotfixes | Bug-fix patch on top of `v0.6.14` covering the 2026-06-06 and 2026-06-11 audit findings (`CSS-027..052`; table bugs `CSS-053..055` were pulled forward into `v0.6.14`) |
| `v0.6.15` | Namespace Foundations, Scripts Integration & CDN Migration | Introduce `rd-` namespace and reserve `.rd-is-*` / `.rd-js-*` prefixes; freeze CSS↔/scripts/ contract; move library/docs consumers off GitHub Pages URLs to versioned CDN paths, retire Pages legacies |
| `0.7.0` | Stabilization | Real button system, search tooling overhaul, plus any remaining stabilization work not needed for `v0.6.12` / `v0.6.14` |
| `0.8.0` | Completeness | Forms, a11y, semantic tokens (incl. `--signal`), `@layer`, `.layout-story`, `.layout-dashboard`, layout-agnostic primitives (panel/stat/table-dense/toolbar/app-shell) |
| `0.9.0` | Release Prep | KSS docs site, token pipeline, theming guide, scripts/charts integration, purge, CI |
| `CSS-T01` | (parallel) | CDN + npm distribution |
| `1.0.0` | Public Release | Stable public API |
