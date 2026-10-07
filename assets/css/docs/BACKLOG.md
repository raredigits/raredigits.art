# Rare Styles — Backlog & Roadmap

**Current version:** resolved from [`_data/versions.js`](../../../_data/versions.js) → `styles`. Do not hardcode version numbers in this header — they rot.
**Public release target:** `1.0.0`

**Positioning:** `Rare Styles` is a narrow professional CSS library for clarity-first longreads and decision-first data views. It is not a general-purpose CSS framework and not a Tailwind/Bootstrap competitor.

## Key milestones — why we're doing this

The destination is **`1.0.0` — a public, narrowly-positioned CSS library** (see Positioning above). `1.0.0` is a **semver promise, not a feature checklist**: a stable public API, installable via npm/CDN, honestly documented. Everything between here and there serves one of six strategic waypoints:

| # | Waypoint | Why | Carried by | Status |
|---|---|---|---|---|
| 1 | **Own the runtime surface** — zero third-party requests in the shipped CSS | No render-blocking waterfalls, no Google dependency, stable long-term rendering for consumers | Self-hosted fonts (`v0.6.16` ✅) · scripts contract + `rd-` namespace (`v0.6.17` ✅) · library-owned SVG icon set (`v0.6.18` ✅) | ✅ **complete** |
| 2 | **Embed cleanly** — one `rare.css` that changes nothing on a page until `.rd` is used | The Positioning promise (a narrow toolkit, not a page framework adopted wholesale) has to be true in the CSS, not just the README — a consumer opts in per page (`<html class="rd">`) or per element (`class="rd"` island) and inherits nothing it did not ask for | the `.rd` scope gate (`v0.7.0` Scope Gate: `CSS-337` inventory · `CSS-343` PostCSS `rd-gate` · `CSS-338` hostile-host fixture; model decided in `Q-14`, 2026-10-02) · layout modes on `<html class="rd rd-layout-…">` (`v0.7.5`) | next (`v0.7.0`) |
| 3 | **Lean delivery** — consumers pay only for what they use | Observed reality (2026-07): consumers use 10–20% of the library, and `rare.css` is the main load bottleneck on their sites. The library must stop being the tax on its own ecosystem | Icon font → SVG (`v0.6.18`) · coverage measurement + downstream purge path + utility & icon cut lists (`v0.7.6` Lean Delivery: `CSS-097` / `CSS-210` / `CSS-079` / `CSS-324`) · the cuts execute in `v0.7.7` Prune · bundle budget on **transferred** size (gzip/brotli — `CSS-330`) | planned |
| 4 | **Own the distribution** — versioned, immutable delivery everywhere | Consumers pin versions and never break; the library is installable without touching our repos | Validated CSS release pipeline (`v0.7.1`, `CSS-348`) · CDN migration + Pages sunset prep (`v0.7.8`) · npm delivery at the end of `0.7.X` (`v0.7.13`, `CSS-T01`) — the package publishes an API the `0.7.X` breaking releases are done with | queued |
| 5 | **Stabilize & complete the core** — the two declared use cases work end-to-end | A trustworthy foundation: zero invalid CSS, real buttons/forms, a11y, semantic tokens. Components and data-view primitives are **harvested** from client projects where they are already nearly built, not designed from scratch | bug closure + a11y base (`v0.7.1`) · content starter for the data project (`v0.7.2`) · sibling consumers review (`v0.7.3`) · auto-shop harvest (`v0.7.4`) · `v0.7.10` Interactive Core · `v0.7.11` Stabilization · `v0.7.12` Data-View Primitives · `0.8.0` Components Harvest · `0.8.1` Completeness | planned |
| 6 | **`1.0.0` — the API promise** | The semver commitment itself: freeze the public API, publish, stop breaking consumers | Slim `0.9.0` (identity docs, sibling integration, tagging, basic CI) → `1.0.0` | planned |

**Continuous tracks — explicitly not release gates:**

- **Documentation** fills as the library evolves. The documentation-driven audit policy below stays as a working method (writing a module's page is how it gets audited), but no milestone — including `1.0.0` — is gated on docs completeness.
- **Maintainer infrastructure** (KSS docs site, token pipeline / Style Dictionary exports, visual regression, Lighthouse CI) improves maintainer velocity, not the consumer contract — it lands whenever it pays for itself, mostly post-1.0.

Rule of thumb: a task that doesn't visibly serve one of these waypoints should be questioned before it is scheduled.

---

## Conventions

- **Priority:** P0 (blocker) · P1 (important) · P2 (nice-to-have)
- **Type:** `bug` · `feat` · `a11y` · `perf` · `chore` · `docs` · `dx`
- **Estimate:** S (≤4 h) · M (1 day) · L (2–3 days) · XL (a week+)
- **Naming in task text:** class names in this file (`.panel`, `.stat`, …) are the real names — **there is no namespace prefix** except `rd-icon-*` (and the scripts-contract hooks `rd-js-*` / `rd-is-*`); everything else lives under the `.rd` scope gate (`Q-14`, 2026-10-02). The layout modes keep their names (`rd-layout-longread` / `rd-layout-dashboard`). The `rd-` namespace migration planned on 2026-07-13/21 (`CSS-133`, `Q-11`) is dropped.

## Documentation-driven audit policy

Starting with the `0.7.X` series, every milestone that touches a module also writes the first-pass `/styles/<section>/` page for that module. The act of writing is the audit. Explaining each class, justifying every utility, producing a real example — that's the pressure that surfaces duplicates, exposes temporary/unused classes, and reveals over-complicated utility families that look fine in isolation but can't be described together.

Findings that come out of a docs-pass are filed as separate task IDs and routed to the next available bug-fix release (`v0.X.Y_1` pattern) or to the feature backlog.

The `CSS-282..295` IDs in `v0.9.0` are reframed: they become **finalization + KSS-extracted reference integration + remaining edge pages**, not first-pass writing. First-pass write-ups happen in `0.7.X` and `0.8.0` per this policy.

Rule of thumb: if you change a module's code in `0.7.X` or `0.8.0`, you also write or update its `/styles/` page in the same milestone — before the milestone ships.

## Planning note

- Source of truth for the current released library version: `_data/versions.js` (`styles`). Every version’s codename and one-line scope lives in the **Release summary** table (bottom of the file, right before the archive) — no duplicate version claims elsewhere.
- The active roadmap (`v0.7.0` → `1.0.0`) is above; shipped milestones are archived at the bottom, newest first.
- **`v0.6.19` is the last `0.6` release (re-plan 2026-10-02).** The `.rd` scope gate (`Q-14`) changes the goal of `0.7`, so the gate itself opens the series as `v0.7.0` and everything planned as `v0.6.20`–`v0.6.26` moved into `0.7.X` — no transitional artifact, no `rare.embed.css`. **Next open milestone: `v0.7.0` Scope Gate.**
- **Renumbering map (2026-10-02)** — old → new: `v0.6.20` Auto-Shop Harvest → `v0.7.2` (its `CSS-337` → `v0.7.0`) · `v0.6.21` Embed Build → dissolved into `v0.7.0` · `v0.6.22` Page Layouts → `v0.7.3` · `v0.6.23` Lean Delivery → `v0.7.4` (cut execution → new `v0.7.5` Prune) · `v0.6.24` CDN → `v0.7.6` · `v0.6.25` Docs Restructure → `v0.7.7` · `v0.6.26` Sibling Review → `v0.7.1` · `v0.7.0` Interactive Core → `v0.7.8` · `v0.7.1` Stabilization → `v0.7.9` · `v0.7.2` Data-View → `v0.7.10` · `v0.7.3` npm → `v0.7.11`. Dated "moved from …" notes inside task text keep the numbers valid on their date.
- **Content-site launch (decided 2026-09-07, re-cut onto the gate 2026-10-07):** the data project — a small content site with articles, images and charts — launches on the gated library: **`v0.7.0` Scope Gate → `v0.7.1` Bug Closure & Safe Delivery → `v0.7.2` Content Starter → launch**. The September plan (drafted as `v0.6.20`/`v0.6.21` against the un-gated library) was never committed before the 2026-10-02 re-plan; it is folded in here and adapted to `Q-14` — plain names under `.rd` instead of `rd-` prefixes, page mode instead of the full-site default, no embed artifact. Its task ids are `CSS-345..353` (`CSS-342..344` were taken by the 2026-10-02 re-plan in the meantime).
- **Second renumbering (2026-10-07)** — the two inserted releases shift the 2026-10-02 sequence by two: `v0.7.1` Sibling Review → `v0.7.3` · `v0.7.2` Harvest → `v0.7.4` · `v0.7.3` Layouts → `v0.7.5` · `v0.7.4` Lean → `v0.7.6` · `v0.7.5` Prune → `v0.7.7` · `v0.7.6` CDN → `v0.7.8` · `v0.7.7` Docs → `v0.7.9` · `v0.7.8` Interactive Core → `v0.7.10` · `v0.7.9` Stabilization → `v0.7.11` · `v0.7.10` Data-View → `v0.7.12` · `v0.7.11` npm → `v0.7.13`. The 2026-10-02 renumbering map above and the `Q-14` decision row keep the numbers valid on their date.
- **Scope-class gate `.rd` (decided 2026-10-02 — `Q-14`):** library styles apply only under a `.rd` class — on `<html>` for the whole page, on any element for a local island (`<figcaption class="rd">`). The gate is `:where(.rd, .rd *)` appended to the last compound of every selector — it matches the `.rd` element itself and its descendants and adds **zero specificity**, so the library never outranks the consumer. No namespace prefixes except `rd-icon-*` (ungated); `:root` tokens, `@font-face` and `@keyframes` stay global; page-shell element rules (`html`/`body`, `header`, `main`, `article`, `section`, `footer`, …) are gated only when `.rd` sits on `<html>`/`<body>`; an island root gets tag styles only (no base typography). Layout modes need `.rd` explicitly: `<html class="rd rd-layout-longread">`. The gate is applied by a PostCSS step after Sass (`CSS-343`), not by hand; the `CSS-338` fixture asserts that no selector escapes it outside the allowed list.
- **Artifact rule:** one CSS artifact — `rare.css` / `rare.min.css`, gated from `v0.7.0` on. The size check (`CSS-330`) and the hostile-host fixture (`CSS-338`) run in `npm test`; size deltas (raw **and** gzip/brotli) are recorded in `Changelog.md`.
- **Breaking discipline (re-cut 2026-10-02):** `0.7.X` is a breaking-allowed series. Breaking is concentrated in named releases — `v0.7.0` (the `.rd` gate), `v0.7.7` (icon + utility prune), `v0.7.10` (button/form element styling under `.rd`) — and every breaking release appends rows to the migration table opened at the `CSS-340` gate. Consumers stay on version pins and migrate post-merge.
- Release numbers shifted on 2026-07-20 (Page Layouts inserted) and again on 2026-10-02 (the `0.6`→`0.7` re-plan above). Archived milestone entries keep the numbers as written at their ship time.

---

# Milestone `v0.7.0` — Scope Gate

**Goal:** open the `0.7` series with the one change that redefines it: **every library style applies only under `.rd`** (`Q-14`, decided 2026-10-02). `<html class="rd">` renders a page exactly as `rare.css` does today; `class="rd"` on any element renders a local island; a page without `.rd` is untouched by the library. One artifact — `rare.css` itself becomes gated; there is no transitional or embed file. Serves waypoint 2 (embed cleanly) — this is its **core release** — and closes `Q-12`/`Q-13`.

**Breaking.** Every consumer migrates by adding `class="rd"` to `<html>` (plus `rd` next to any `rd-layout-*`). Consumers are version-pinned and migrate post-merge; the migration line opens the `CSS-340` table.

**Replaces** the old `v0.6.21` Embed Build & Layer Extraction (2026-10-02): `CSS-318` (theme-layer extraction), `CSS-319` (page-shell extraction) and `CSS-320` (`rare.embed.css`) are **closed as superseded** — the gate needs no physical layer split and no second artifact; the theme/shell distinction survives as the two gate kinds (island vs page) in the `CSS-343` config.

## Entry gate — the `v0.6→v0.7` transition (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-340` | chore | **The transition gate — re-cut 2026-10-02.** Before the gate ships: (1) snapshot the public API of `v0.6.19` (selectors, custom properties, SCSS entry points, artifacts); (2) open the running `old → new / removed` **migration table** that every breaking `0.7.X` release appends to — first rows: `class="rd"` on `<html>`, `rd` required next to `rd-layout-*`, token overrides stay on `:root`; (3) verify the live consumers (raredigits.art, schnellreich.ru, raredigits.io) against the gated build. No longer here: the namespace slice map (migration dropped, `Q-11` superseded), the `Q-13` decision (answered by `Q-14`), the icon/utility cuts (need the `v0.7.6` coverage data → `v0.7.7` Prune). | M |

## Scope gate (P0)

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-337` | chore | **Global-rule inventory → gate config** (moved from `v0.6.20`, re-scoped 2026-10-02). Enumerate every bare-element / global rule in the compiled CSS and classify it: **ungated** (`:root` tokens, `@font-face`, `@keyframes`, `rd-icon-*`), **page-gated** (page-shell element rules — `html`/`body` sizing and flex, fixed `header`, `main` padding, `article` grid placement, `section`, `footer`, `nav a` / `footer a`, …) or **island-gated** (everything else). The output is the `CSS-343` config, not an ADR for a layer split. Prototype count on `v0.6.19`: 4 398 selectors, 123 bare-element/global, 91 class-context + element target. | P0 | S |
| `CSS-343` | feat | **PostCSS `rd-gate` step.** A build step after Sass (`sass → rd-gate → rare.css` / `rare.min.css`) that appends `:where(.rd, .rd *)` to the last compound of every selector (before any pseudo-element), applies the page gate (`.rd` on `<html>`/`<body>`) to the page-gated list, and skips the ungated list — both lists in one config file from `CSS-337`; module sources stay untouched. Prototype (2026-10-02, `v0.6.19`): 4 084 selectors gated, 314 skipped; `rare.css` 435.9 → 505.3 KB raw, gzip 35.2 → 35.9 KB, brotli 23.1 → 23.8 KB — record both raw and transferred deltas. Wire into `build:css`, `sass-watch` and the Eleventy dev loop. | P0 | M |
| `CSS-338` | dx | **Hostile-host fixture — the gate proof** (re-scoped 2026-10-02). A synthetic foreign page with its own `body`/heading/link/button/form styling and an aggressive reset, automated in `npm test`: (a) without `.rd`, computed styles are identical with and without `rare.css`; (b) a `class="rd"` island renders tag styles and library classes, with no page-shell rules and no base typography on the island root; (c) `<html class="rd">` renders the docs pages as before the gate; (d) mechanical assertion — every selector in the build is gated, page-gated or on the ungated list. Real-world consumers as additional fixtures are triaged in `v0.7.3` (`GUT-006`). | P0 | M |
| `CSS-078` | chore | **Reset/normalization stance** (re-scoped 2026-10-02). `vendor/normalize`, the `* { margin: 0; padding: 0 }` reset and `box-sizing` now apply only inside `.rd` — so the per-artifact question is gone. What remains: confirm the reset is acceptable for islands (an island zeroes margins of everything inside it — expected, but documented) and decide whether normalize stays whole or trims to what the library relies on. | P1 | S |
| `CSS-344` | chore | **Migrate the in-repo surfaces onto `.rd`.** raredigits.art layouts get `<html class="rd">`; the standalone example layouts (`_layouts/examples/*`, the hetke landing) get `.rd` on their own root or islands as fits; the `/styles/` and `/charts/` docs render identically (visual spot check on the key pages, desktop + mobile). | P0 | S |
| `CSS-321` | docs | **Document the gate** (re-scoped 2026-10-02 — was "document the two artifacts"). `/styles/getting-started/` (`CSS-282`) leads with it: page mode `<html class="rd">`, island mode `class="rd"`, what an island does and does not get (tag styles + classes; no page shell, no base typography), tokens stay on `:root` and are overridden by client styles loaded after `rare.css`, layout modes need `rd` on `<html>`, the known caveat (the gate protects the host from the library, not the library from the host's own same-named classes), the workaround for foreign non-iframe markup (put `.rd` on your own containers instead of `<html>`), and the one-line migration. | P0 | S |
| `CSS-354` | bug | **Header overflows narrow viewports** (found 2026-10-07 while testing RareCharts Sankey on `/charts/sankey/`). At a 375 px viewport the document is 462 px wide: the site header (`header.padding-x-md` → `.header-container` → nav `li`/`a`, `.header-icons`, `button.icon-search`) extends past the viewport, so every page scrolls sideways on phones. Library module: `modules/navigation/header/`. Reproduce at 320 / 375 / 414 px, find which header row refuses to shrink or wrap (nav items, icon group), fix inside the header module and verify on the gated build in page mode; check the hamburger breakpoint still switches. | P1 | S |

## Exit criteria

- [ ] The `CSS-340` gate artifacts exist: `v0.6.19` API snapshot, migration table opened with the `.rd` rows, live consumers verified against the gated build
- [ ] `rare.css` / `rare.min.css` are gated by the `CSS-343` PostCSS step; the gate config comes from the `CSS-337` inventory; module sources unchanged
- [ ] The hostile-host fixture is green in `npm test`: no effect without `.rd`, correct islands, unchanged page mode, no selector escapes the gate (`CSS-338`)
- [ ] raredigits.art and the in-repo examples render identically on `.rd` (`CSS-344`); the getting-started docs explain the gate and the migration (`CSS-321`)
- [ ] `Q-12` and `Q-13` closed via `Q-14`; `CSS-318` / `CSS-319` / `CSS-320` closed as superseded
- [ ] `npm run lint:css` clean; bundle rebuilt; raw **and** gzip/brotli deltas recorded in `Changelog.md`
- [ ] No horizontal page overflow at 320 / 375 / 414 px on raredigits.art pages — the header fits the viewport (`CSS-354`)

---

# Milestone `v0.7.1` — Bug Closure & Safe Delivery

**Status:** Open; planning only. No fixes are claimed shipped by this roadmap edit.
**Goal:** fix the known defects before the data project inherits them, and make the published CSS subject to the same checks as the source. First of the two content-launch releases (see the Planning note); drafted 2026-09-07 as `v0.6.20`, re-cut onto the `.rd` gate 2026-10-07.
**Depends on:** `v0.7.0` — every fix is made and verified on the gated build, in page mode (`<html class="rd">`) and, where relevant, in an island.
**Planning estimate:** 8–12 working days, revised after the ledger triage. Estimates are sequencing aids, not delivery dates.

**Scope of “all current bugs”.** Close all reproducible defects known at the `CSS-345` ledger cut, including defects the `v0.7.0` gate surfaces on live consumers and defects found in the content launch fixture. Missing future features (forms, dark tokens, dashboards, npm) are not bugs. No claim of universal bug-freedom: every ledger row needs reproduction, owner task, regression evidence and closure status. An unresolved confirmed bug blocks `v0.7.1`; a newly discovered launch defect blocks `v0.7.2`. A postponed bug stays open and the release cannot be described as closing all current bugs.

**Compatibility.** Additive on top of the gate: no new breaking change. Keep valid existing classes and tokens; new public API ships under plain names behind `.rd` (`Q-14`), no `rd-` prefixes except `rd-icon-*` and the scripts-contract hooks. Bug fixes that alter rendering get before/after examples and a row in the `CSS-340` migration table; utility/icon pruning stays in `v0.7.7` Prune. Test published token overrides before removing declarations that are invalid only under default token values; never silently redefine `padding-auto` as zero.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-345` | bug | **Dated bug ledger and closure sweep.** Reconcile the active backlog, shipped archive, current SCSS, scripts contract and compiled (gated) CSS. Seed with `CSS-346`, `CSS-347`, `CSS-348`, `CSS-126`, `CSS-129`, `CSS-110..114`, plus anything the `v0.7.0` gate breaks on live consumers. Reproduce older claimed defects before reopening them; `CSS-020..026`/`CSS-034` already have shipped records. Sweep declarations/property-value matrices, duplicate selectors, unresolved variables (respect fallbacks), responsive boundaries including fractional widths, hidden-state specificity, tables/captions/sidenotes/outdents inside padded cards, keyboard controls and asset paths. Check installed build dependencies against current advisories during implementation; do not carry old vulnerability claims forward as current facts. Every confirmed residual issue gets a new task ID and regression check in this release. Historical “mark contrast borderline” is a hypothesis to measure, not a confirmed defect. | P0 | M |
| `CSS-346` | bug | **Invalid generated padding values.** The September audit found 36 declarations resolving to `padding*: auto` through `--space-auto`, across base and responsive utilities. Define allowed values per family, inspect both canonical and alias generators, and stop emitting invalid combinations. Preserve valid margin/position/size auto behavior. Check consumers that override the public token; if they rely on these selectors, keep a documented compatibility path and record the public deletion in the `CSS-340` migration table for `v0.7.7` Prune. Guard computed behavior and the generator matrix. | P0 | S |
| `CSS-347` | bug | **Quick-start uses nonexistent library API.** Replace `/styles/usage/` examples using `--color-primary`, `--font-heading`, `.btn` with real `--primary-color`, `--brand-color`, `--heading-font`, `.button` as appropriate, and show the `.rd` page-mode root (coordinate with `CSS-321`). Distinguish custom project tokens/classes from library API; declaring a font name does not load a font. Render the copied example to prove colors and headings change. | P0 | S |
| `CSS-348` | bug | **Publication can bypass checks.** Replace independent `sync-css.yml` source copying with a validated, version-triggered artifact path: lockfile install on Node 24, lint/test/build (including the `CSS-343` gate step and the `CSS-338` fixture), clean staging of CSS/maps/fonts/images/licenses, exact version and artifact checks, then sync/tag that same artifact. Ordinary pushes do not mutate consumer releases; fail on tag reuse or any failed check; serialize releases. Verify all referenced assets and a pinned CDN fetch against staged bytes before recommending the URL. Provide the same local artifact for self-hosting. No npm publish or legacy Pages shutdown here — `v0.7.8` moves consumers onto these artifacts and `v0.7.13` extends the same pipeline to npm. This is the CSS-only early slice of `CSS-T01.1/3/4`, not a second pipeline. | P0 | L |
| `CSS-118` | dx | **Compiled-CSS and browser regression checks** (moved from Lean Delivery, 2026-10-07). Compilation, real tokens/fallbacks, escaped responsive selectors, canonical/alias spacing, invalid value matrix and source/artifact agreement. A small browser fixture checks computed behavior (including `rd-is-hidden` with component states), anchors and overflow inside `.rd`, next to the `CSS-338` gate fixture; JSDOM script tests alone are not rendering evidence. Run with the release checks. | P0 | M |
| `CSS-126` | bug | Restore h5/h6 vertical rhythm using existing spacing tokens; demonstrate mixed heading sequences and record the visual correction. Moved from Stabilization (2026-10-07). | P1 | S |
| `CSS-129` | bug | Fix article anchor targets hidden under the fixed header using the real header-height contract (`scroll-margin-top`); verify heading/footnote navigation with keyboard on desktop and mobile. Page mode only — islands have no fixed header. Moved from Stabilization (2026-10-07). | P1 | S |
| `CSS-110` | a11y | Visible keyboard focus across existing buttons, links, tags, carousel, collapsible, hamburger and search, inside `.rd`. Introduce `--focus-ring-color` with a contrast-tested existing-palette fallback, so this does not depend on the future `--signal`; `CSS-124` (`v0.7.10`) repoints the default later while preserving overrides. Audit local outline suppression without removing valid paired focus rules. Moved from Interactive Core (2026-10-07). | P0 | M |
| `CSS-111` | a11y | One documented `.visually-hidden` utility (record whether `.sr-only` ships as an alias); plain name behind the gate (`Q-14`). Preserve accessible text and verify that focusable hidden content has an appropriate reveal treatment. Moved from Interactive Core (2026-10-07). | P1 | S |
| `CSS-112` | a11y | Respect reduced motion in existing links, disclosure icons, carousel and other animated surfaces without disabling required state changes. Future skeleton work (`CSS-163`) consumes this policy. Moved from `0.8.1` (2026-10-07). | P1 | S |
| `CSS-113` | a11y | `.skip-to-content` styling and a working target for article/main content; visible on focus and not covered by the header. Moved from `0.8.1` (2026-10-07). | P1 | S |
| `CSS-114` | a11y | Measure actual text/background and focus pairs for body, captions, meta, nav/footer and links. Fix failing text roles (not the decorative palette wholesale), including `#888` on the default light background and `#ccc` when used as readable text. Preserve raw palette tokens; record changed role defaults, measured ratios and examples. Verify mark separately rather than repeating the old unverified claim. Moved from `0.8.1` (2026-10-07). | P0 | M |
| `CSS-339` | dx | **Dated size-baseline table** (moved from Lean Delivery, 2026-10-07). A reproducible table and baseline check: readable/minified/gzip/Brotli CSS, rules/selectors/media blocks; fonts/icons/images separately. Pre-gate reference row (September, `v0.6.19`, in-memory): minified 363,483 bytes, gzip 32,884, Brotli 22,115 (source-map trailer excluded), 4,286 rules, 2,308 media blocks — local measurements, not transferred CDN sizes or speed evidence. First gated row is `v0.7.0`. Record tooling/compression settings; `CSS-330` (`v0.7.6`) builds the budget on this table. | P1 | S |

## Exit criteria

- [ ] `CSS-345` ledger has no unresolved confirmed defects; no archived issue is silently counted as new work
- [ ] Lint, JS tests, CSS compilation, the `CSS-338` gate fixture and targeted browser checks pass; every fixed behavior has evidence
- [ ] Reference pages checked in page mode at 375 / 768 / 769 / 1024 / 1440 px, boundary/fractional widths and 200% zoom; no unintended page overflow, covered focus or hidden anchor target
- [ ] Exact CSS release artifact is built once, verified and version-pinned; asset paths work externally and when self-hosted; old consumer pins remain valid
- [ ] Changelog lists actual fixes, visual deltas, migration-table rows and regenerated sizes; version changes only when implementation ships

---

# Milestone `v0.7.2` — Content Starter

**Goal:** the data project can start from two working pages — articles, images and charts — without copying the documentation site's layout or depending on later library releases. Second of the two content-launch releases; drafted 2026-09-07 as `v0.6.21`, re-cut onto the `.rd` gate 2026-10-07.
**Depends on:** `v0.7.1`. Uses the gated `rare.css` in page mode (`<html class="rd">`) and existing public classes. No dependency on `rd-layout-longread`, npm or the future chart-token bridge.
**Planning estimate:** 6–9 working days after `v0.7.1`, excluding the site's content production. The project framework/CMS is not selected: ship portable HTML/CSS/JS first, then adapt to the chosen host without imposing Eleventy.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-349` | feat | **Portable starter directory.** Two complete pages: article index (title, description, article previews, dates/tags) and an article (title, lead, author/date, contents links, headings/lists/quote, image/caption/source, table and charts). Include `project.css`, chart initialization/data example, local example assets and a short README. Copying this directory into an unrelated static root must work via a local server, without `_includes`, site-only CSS, build config or private paths. CMS/routing/content models belong to the consuming project; Eleventy is optional, not required. | P0 | M |
| `CSS-350` | feat | **Bounded article layout recipe.** Build on current width/spacing/type primitives; keep reading measure for prose and allow image/chart/table blocks to use an explicitly wider container. Contain long titles, URLs and nested content; captions/outdents must fit on mobile and inside cards. A project-level recipe, not a prematurely shipped `rd-layout-*` mode. Only proven missing reusable styles enter the library, under plain names behind the gate (`Q-14`). Later `CSS-150` (`v0.7.5`) adoption must be optional. | P0 | M |
| `CSS-127` | feat | Scoped `figure`/`figcaption` treatment for articles: ordinary/wide images, caption and source; do not impose figure rules on carousel figures or chart internals. Include `width`/`height`, responsive image sizing and guidance for alt text, `srcset`/`sizes` and lazy loading below the fold. Image processing belongs to the consumer build. Moved from Stabilization (2026-10-07). | P0 | S |
| `CSS-128` | feat | Document/style article `kbd`, `abbr`, `sub`/`sup` where needed, scoped to prose. Use native IDs/links for a simple reference/backlink example; the complete footnote engine (`CSS-165`) and small-caps extension stay later. Moved from Stabilization (2026-10-07). | P1 | S |
| `CSS-351` | feat | **Working editorial chart integration.** Use independently pinned existing RareCharts, its bundled CSS and current JS theme API; no separate D3 or duplicated chart chrome. Example line and bar charts initialize only on pages with charts, after containers exist; verify resize, tooltip clipping and mixed prose width. Provide visible takeaway, source/units and an HTML data table or meaningful fallback when JS/data fails. Include local data and reserved chart space. Do not block on `CSS-173/240..243`, dashboard primitives or any new chart type. | P0 | M |
| `CSS-167` | a11y | Basic article print rules: hide navigation/controls, preserve prose, captions/sources and tables; prevent cropped image/chart blocks. Charts use a tested print rendering or the readable static/table fallback. Verify print preview/PDF. Article hygiene, not the future `layout-print` mode (`CSS-308`). Moved from `0.8.1` (2026-10-07). | P1 | M |
| `CSS-352` | docs | **Quick-start slice of `CSS-282/200/232/244`.** Document copy → serve → publish; pinned CDN and self-host paths, the `.rd` root, actual tokens for brand/fonts/measure, required markup, optional companion scripts, chart configuration, asset paths and version upgrades. Keep `/styles/usage/` as the working entry/redirect until the later IA migration (`v0.7.9`). Explain page mode vs islands (`CSS-321`); do not advertise unreleased npm/layout options. Separate library files from project overrides. | P0 | S |
| `CSS-353` | dx | **External-consumer launch rehearsal.** Test the copied starter from a clean unrelated root and a non-root base URL, with no repository runtime assumptions. Verify both sample pages, all assets and pinned siblings, no console errors, title/heading structure, keyboard navigation, contrast, readable no-JS article/table fallback, mobile/zoom/print and chart resize. Record payloads per page (including fonts/images/charts); article pages without charts must not load RareCharts. Default starter has no purge until a state-safe recipe is verified (`CSS-210`, `v0.7.6`). | P0 | M |

## Launch gate — the data project can start here

- [ ] A clean consumer can copy the starter, change brand/title/content and publish both pages following only its README
- [ ] Article measure, mixed-width media, captions, table scrolling, anchor navigation and long content pass the `v0.7.1` browser matrix
- [ ] Charts render/rescale; article meaning/data remain accessible without chart JS; styles and charts have separately verified version pins
- [ ] Keyboard, contrast, reduced motion, print and asset-path checks pass; any discovered defect is fixed before launch
- [ ] Full site build, lint and relevant automated checks pass; bundle and page payload changes recorded
- [ ] No library redesign, forced framework or unreleased layout dependency is required — `<html class="rd">` is the only integration step

---

# Milestone `v0.7.3` — Sibling Consumers Review

**Goal:** right after the gate, review the new sibling consumer projects — **the data project** and **Gutenberg** (`gut39.ru`) — on the gated library, and adapt the rest of `0.7.X` to what they actually need. Placed directly after `v0.7.0` on purpose (2026-10-02): the findings may reshape every later release, so they come before the harvest, the layouts and the interactive core. Was `v0.6.26` (placeholder recorded 2026-10-02); **not scoped in detail yet**.

**Depends on:** `v0.7.0` — the siblings are tested on the model that is now the default, not on a hypothesis.

**Re-cut 2026-10-07:** moved behind `v0.7.1`/`v0.7.2`. The data project no longer waits for this review — it launches on the content starter (`v0.7.2`) and enters here as a live consumer: its launch findings and remaining pages are reviewed next to Gutenberg. Still ahead of the harvest, the layouts and the interactive core.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-342` | chore | **Review the sibling consumers and adapt `0.7.X`.** (1) Test the data project and Gutenberg on the gated library — page mode and islands; (2) settle `rem` sizing in islands and across the library (`Q-14` sub-question 3, moved here 2026-10-02); (3) triage the Gutenberg proposal ([`gutenberg-test.md`](./gutenberg-test.md): forms, fluid/display type, hero, container units, breakpoints, real-world hostile-host fixture `GUT-006`) and the data project's equivalent findings — note the proposal predates `Q-14` and was written against the `rare.embed.css` / `rd-` plan; (4) fold the accepted items into the main backlog under `CSS-NNN` ids and re-plan `v0.7.4`+ accordingly; (5) add both projects to the live-consumer set the `CSS-340` migration table is verified against. | P0 | M |

## Exit criteria

- [ ] Both sibling projects tested on the gated library; findings recorded
- [ ] `rem` sizing decided (`Q-14` sub-question 3)
- [ ] The Gutenberg proposal is triaged — every `GUT-NNN` item accepted (renumbered into `CSS-NNN`), rejected or parked, with the reason
- [ ] The rest of `0.7.X` is re-planned against the findings; both projects are in the live-consumer set

---

# Milestone `v0.7.4` — Auto-Shop Harvest & Examples

**Goal:** put the auto-repair-shop project into the library in both directions — harvest the styles it proved out, and use it as the worked example the docs have been missing. Serves waypoint 5 (stabilize & complete the core) via the harvest route the roadmap already prefers: patterns are **taken from client projects where they are already nearly built**, not designed from scratch. Was `v0.6.20` (moved into `0.7.X` on 2026-10-02): it now follows the `.rd` gate (`v0.7.0`) and the sibling review (`v0.7.3`), so the harvested classes are born under `.rd` and the example is re-laid on the gated library. Still ahead of Lean Delivery (`v0.7.6`), which cannot measure coverage honestly on a library that is about to gain a harvest.

**Status:** 🔸 **Open.** `CSS-317` (the worked example) shipped ahead in **`v0.6.19`** as a demonstration — `/examples/styles/hetke/landing/` (live) + `/examples/styles/hetke/` (story) — but it was built entirely on the library's **existing** primitives. The defining task **`CSS-316` (harvest reusable patterns *into* the library) is not done**: the example's site-specific patterns (header CTA pill, price list) and the utility promotions it leaned on stayed in the site stylesheet, filed as `CSS-331..336`. This milestone closes when those promotions land and `CSS-333` re-lays the example onto the new library classes. `CSS-337` (the global-rule inventory the example surfaced) moved to `v0.7.0`, where it configures the `.rd` gate.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-316` | feat | **Harvest styles from the auto-shop site.** Inventory what the project built on top of Rare Styles, separate the genuinely reusable patterns from the site-specific ones, and land the reusable slice in the library under the `.rd` gate (no namespace prefix — `Q-14`). Same method as `v0.6.14` (Cross-Project Enrichment) and the `CSS-088` carousel harvest: the pattern must earn its place by already working in production, and anything that stays site-specific is recorded as such rather than promoted. Output includes the reject list — a promoted pattern the library cannot justify is a future prune. | P0 | L |
| `CSS-317` | docs | **Auto-shop examples in the documentation.** Use the harvested project as the library's first end-to-end worked example: real markup, real content, a real page — not a swatch grid. Feeds the pages the docs-driven audit policy will write later, and gives `/styles/` something to point at when a reader asks what the library is *for*. Coordinates with `CSS-280` (`v0.7.9`) on where the pages land; if the IA decision has not been taken yet, place them provisionally and record the debt. | P1 | M |
| `CSS-331` | feat | **Header CTA pill as a library class.** The auto-shop harvest re-skinned the base `.button` for the header CTAs (Call / WhatsApp) — a rounded pill sized to content + padding, vertically centred in the bar, coloured by a `--*Bg` modifier — and it lives in the site stylesheet, colliding with the base `.button`. Promote it to a real library class. **Coordinate with the `v0.7.10` button system (`CSS-040..046`)** so the pill becomes a variant of it rather than a second button API (the `rd-` naming constraint is gone with `Q-14`). Surfaced building `CSS-317`. | P1 | S |
| `CSS-332` | feat | **Price-list component.** The pricing section (each row: title + right-aligned price + description, thin rule between rows) is site-specific in the site stylesheet today, by maintainer decision during the harvest. Promote the reusable core to a library class; the v2 mockup adds an **accordion** variant (`CHOSE YOUR SERVICE` — each package expands via the `collapsible` script) worth folding into the same component. Harvest candidate from `CSS-316`. | P1 | M |
| `CSS-333` | docs | **Re-lay the auto-shop example onto the harvested classes.** Once `CSS-331` / `CSS-332` land, rewrite the `/examples/styles/hetke/` story page and re-build the finished landing (`/examples/styles/hetke/landing/`) on the new library classes, dropping the matching site-specific CSS from the site stylesheet. Keeps the worked example honest — it should demonstrate the library's own classes, not a private skin that reimplements them. Depends on `CSS-331`, `CSS-332`. | P1 | S |
| `CSS-334` | docs | **Document/promote `.scroll-container`.** It already ships (`utilities/_display.scss`) but is undocumented; the `/examples/styles/hetke/` story leans on it as a bounded preview frame. It is bare `overflow: auto`, so it only scrolls with an explicit `max-height` / `height` (the docs page supplies one inline). Decide whether a height belongs in the utility or stays author-supplied, then write the `/styles/` note. Surfaced building `CSS-317`. | P2 | S |
| `CSS-335` | feat | **Dedicated map-embed container.** The auto-shop map is wrapped in `.iframe-video`, which forces the `16 / 9` aspect meant for video — wrong for a map, which wants its own height. Add a purpose-named embed container (e.g. `.iframe-map` / `.map-embed`) with a map-appropriate default so `.iframe-video` stops being overloaded. Harvest finding from `CSS-317`. | P2 | S |
| `CSS-336` | feat | **`.inline-icons` utility.** `img { display: block }` (right for content images) breaks a small icon meant to sit inside a text label — the auto-shop needed a local `display: inline-block` override to keep the phone glyph on the CTA's line. Generalise it: `.inline-icons` on a container flips its child images to `inline-block` + `vertical-align: middle`, so inline icons in buttons/labels need no per-site override. Coordinate with the mask-based `rd-icon-*` set (already inline). Surfaced building `CSS-317`. | P2 | S |

> **Added 2026-07-20 (from the harvest build):** the worked example is built — the live landing at `/examples/styles/hetke/landing/` and the story page at `/examples/styles/hetke/` (`CSS-317`). Building it surfaced two patterns that stayed site-specific in the site stylesheet and should be promoted — `CSS-331` (header CTA pill) and `CSS-332` (price-list) — plus the follow-up to re-lay the example onto them once they exist (`CSS-333`). These extend `CSS-316`'s harvest scope; they do not replace it. The header/price CSS was consciously left in the site stylesheet as the reject-list-for-now, pending these promotions. A second, lighter batch of utility promotions the example leaned on is filed the same way: `CSS-334` (document `.scroll-container`, which already ships), `CSS-335` (a purpose-named map container instead of overloading `.iframe-video`), and `CSS-336` (`.inline-icons`, generalising the `img { display: block }` override).

## Exit criteria

- [x] The docs carry an end-to-end auto-shop example built from real markup and content (`CSS-317`, shipped in `v0.6.19`): `/examples/styles/hetke/` story + `/examples/styles/hetke/landing/` live
- [ ] **The reusable slice is promoted *into* the library (`CSS-316`) — not done.** The example rode existing primitives (`.feature-row` / `.grid` / `.iframe-video` / `.scroll-container`); no new pattern was harvested. Reject list = the site stylesheet; promotable patterns filed `CSS-331..336`
- [ ] The header CTA pill (`CSS-331`) and price-list (`CSS-332`) are promoted to library classes, and the example re-laid onto them (`CSS-333`) on the gated library, with the matching site CSS removed
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`; bundle delta recorded in `Changelog.md`

---

# Milestone `v0.7.5` — Page Layouts

**Goal:** harvest the two **practically-ready** client layouts into the library (maintainer report, 2026-07-21): **`rd-layout-longread`** — the mode formerly drafted as “story”; renamed outright, the old name never shipped as public API, so **no alias** — and **`rd-layout-dashboard`**. Both sit on the root contract fixed by `Q-14` (2026-10-02): **`<html class="rd rd-layout-…">`** — the mode needs `.rd` on the same element, does not imply it, and does nothing without it. Layout rules are page-shell rules: page-gated, never active inside an island. Was `v0.6.22` (moved into `0.7.X` on 2026-10-02). The work is normalization, not design: strip project-specific selectors, move magic values onto tokens, pass the harvest acceptance below. **Both modes are P0 and release-gating.** Scope stays narrowed (2026-07-21): token/shell deltas and gates only — the narrative text components (`CSS-152..154`) and `.app-shell` (`CSS-188`) remain in `0.8.0`. Serves waypoint 2 (page mode on the gate) and waypoint 5 (harvest route).

**Depends on:** `v0.7.0` — the `.rd` gate and its page-gate list must exist first; these modes plug into it.

**Harvest acceptance (per mode, before merge):** changes only page shell, measure and tokens · brings no components and no project-specific selectors · a page without the mode class renders identically · inert inside a `class="rd"` island · **mixed content holds both ways** — a panel/table inside Longread stays free of the prose measure, a prose block inside Dashboard keeps a readable measure · existing sidenotes/captions/blockquotes work with no special longread variants · **each mode** verified on desktop **and** mobile, with sidebar and without.

## Layouts (P0)

Longread and Dashboard are **opt-in root-level layout modes** (`<html class="rd rd-layout-…">`), not visual themes. Most pages need neither — the defaults already render correctly. Layouts only kick in when a page genuinely calls for a different frame: a longread that wants slower reading rhythm, or a data view that needs the full canvas. They are bundles of **token and layout-shell adjustments only** — they do not own components. All UI primitives (panels, stats, tables, toolbars, cards, buttons) are general-purpose and live in `bricks/` + `elements/`. They work in any layout; the layout just sets the typography/density/sidebar context.

### `rd-layout-longread` — the longread mode

For prose-heavy pages: scaled-up serif typography, adjusted heading treatment, generous reading rhythm, narrow text column, left sidebar for navigation, and a prose measure bound to the prose surface only — components nested inside stay unconstrained.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-150` | feat | **Harvest & normalize the ready longread layout.** `modules/layouts/_longread.scss`, gated via `<html class="rd rd-layout-longread">` — the single root contract. The styles are practically done on a client project (2026-07-21); the work is normalization: strip project-specific selectors, move magic values onto tokens, pass the harvest acceptance checks. | M |
| `CSS-151` | feat | Longread token/shell overrides: serif headings (Playfair), scaled-up `--font-size-xl/xxl`, adjusted heading treatment, wider `--line-height`, narrow `--text-content-width`. Sidebar enabled. **The measure binds only the prose surface** (`.prose` or the direct content slot — exact hook decided during the harvest), never bare `article p/ul/ol`: a paragraph inside a nested `.panel`, `.stat`, table or toolbar must not inherit the constraint — the layout owns shell, measure and tokens, not components (re-scoped 2026-07-21). | M |
| `CSS-155` | feat | Promote sidenotes / captions / blockquote / handwritten utilities as part of the documented **Longread** preset (no code change — just docs grouping). Acceptance: they work inside the mode **without special longread variants**. | S |

### `rd-layout-dashboard` — relaxed shell for decision surfaces

**Minimal delta from the defaults:** no left sidebar; a wide (or unset) prose measure so panels and grids fill the canvas — a token/shell delta, not a cancellation of other rules. Everything else (typography, spacing scale, colors, components) is identical to the library default. The purpose of Dashboard is not endless monitoring or generic admin CRUD, but focused display of decision-driving metrics, statuses, comparisons, and charts. Components like `panel`, `stat`, `table-dense`, `toolbar` are NOT layout-gated — they work without any layout class too (e.g. a KPI panel embedded inside a longread, or in plain documentation).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-160` | feat | **Harvest & normalize the ready dashboard layout.** `modules/layouts/_dashboard.scss`, gated via `<html class="rd rd-layout-dashboard">` — same root contract as `CSS-150`. Also practically done on a client project; same normalization and acceptance checks. | M |
| `CSS-161` | feat | Sidebar removal: nullify `.sidebar` layout slot, expand main content to full grid width. | S |
| `CSS-162` | feat | Dashboard widens by **token/shell delta only**: full-width content via the layout shell and a wide (or unset) `--text-content-width` — **not** by un-overriding foreign selectors like `article p/ul/ol` (re-scoped 2026-07-21: with the measure bound to the prose surface in `CSS-151`, there is nothing to cancel). | S |

### Layout infrastructure

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-170` | feat | `modules/layouts/_index.scss` forwarding both layouts. Wire from `modules/_index.scss`. | S |
| `CSS-171` | feat | Allow combining a layout with token overrides at `:root` (brand-context customization without forking the layout). | S |
| `CSS-172` | docs | `STYLEGUIDE.md` section: layouts set page-level context, not components. Document which existing modules are layout-aware (typography, layout shell) and which are layout-agnostic (everything else). Make explicit: defaults are not a layout — pages without a `rd-layout-*` class get the canonical visual rendering. | S |

### Documentation & examples (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-093` | docs | First-pass write of `/styles/layouts/`: when `rd-layout-longread` / `rd-layout-dashboard` apply, what changes vs the defaults, mixed-content examples. Moved with the modes from `0.8.0` (2026-07-21) — the docs ship with the feature. Finalized in `CSS-292a`. | M |
| `CSS-341` | docs | **One real example per mode.** A real longread page on `rd-layout-longread` and a real page on `rd-layout-dashboard`, both published under `/examples/`; **each verified on desktop and mobile, with sidebar and without**, and each carrying mixed content (a panel/table inside the longread; a prose block inside the dashboard) per the acceptance checks. Distinct from the `v0.7.12` data-view example (`CSS-159`), which demonstrates primitives, not the mode. | M |

## Exit criteria

- [ ] **Both modes ship — mandatory for this release:** `rd-layout-longread` and `rd-layout-dashboard`, on `<html class="rd rd-layout-…">` (per `Q-14`) — page-gated, inert inside islands
- [ ] Harvest acceptance holds for each mode: page shell, measure and tokens only; no components or project-specific selectors carried over; a page without the root class renders identically; composes with `:root` brand overrides (`CSS-171`); **mixed content verified both ways** — panel/table inside Longread unconstrained, prose inside Dashboard readable
- [ ] Existing sidenotes, captions and blockquotes work inside `rd-layout-longread` with **no special longread variants** (`CSS-155`)
- [ ] `/styles/` documents both modes and the no-class default (`CSS-093` / `CSS-172`); each mode has a real published example, **each verified on desktop and mobile, with sidebar and without** (`CSS-341`)
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; raw and gzip/brotli deltas recorded

---

# Milestone `v0.7.6` — Lean Delivery

**Goal:** stop taxing the consumers. Measured reality (2026-07): downstream sites use 10–20% of the library while `rare.css` is the main load bottleneck on their pages. This release gives every consumer a supported path to ship only what they use, and shrinks the worst weight driver at the source. Serves waypoint 3 (Lean delivery). The version number was re-cut on 2026-07-13 (the documentation-skeleton scope previously planned as `v0.6.19` moved to the Documentation continuous track, `CSS-039`) shifted again on 2026-07-17, and moved into `0.7.X` on 2026-10-02 (was `v0.6.23`). **Additive — measurement and preparation only;** the cuts it prepares execute in `v0.7.7` Prune.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-097` | perf | **Measure real selector coverage across consumers.** Instrument the known consumers (raredigits.art, schnellreich.ru, raredigits.io, plus the `v0.7.3` siblings): which selectors from `rare.css` actually match their DOM (coverage tooling or a PurgeCSS dry-run report per site). Output: a coverage table checked in next to this backlog, naming the heaviest unused selector families. Turns the "10–20% usage" observation into a prune target list for `CSS-079` and a baseline for the `CSS-T01.5` size budget. | P0 | S |
| `CSS-210` | perf | **Downstream purge path (moved from `0.9.0`, 2026-07-13).** PurgeCSS (or equivalent) recipe for the consuming site's build. Expected downstream result: a consumer ships 15–30 KB instead of the full bundle (baseline figures per `CSS-339`). The library itself stays full; purge happens downstream. Must ship with a documented **safelist contract**: state classes toggled at runtime (`.rd-is-*`), JS hooks (`.rd-js-*`), Pagefind/search dynamic classes — anything the DOM only grows after load — plus `rd` itself and the `:where(.rd, .rd *)` gate, which the purge must keep intact. Deliverables: a copy-paste config for Eleventy consumers + a short `/styles/` docs note. Applied to at least one real consumer as proof. | P0 | M |
| `CSS-079` | perf | **Audit the generated spacing-utility matrix (moved from `v0.7.1`, 2026-07-13).** `_spacing.scss` emits 24 property families × 30 `$spaces` values × (base + 3 breakpoints) ≈ 2 900 selectors; `rare.css` was 406 KB unminified on 2026-07-13 and 435.9 KB after `v0.6.19` (dated figures: `CSS-339`) — over the 400 KB budget, and this matrix is the main driver. Define the intentional property×value matrix (percentages and `auto` make no sense for several families — see `CSS-049` for the invalid-CSS slice) and produce the **utility cut list** with per-family downstream checks — **the removal executes in `v0.7.7` Prune**, together with the `CSS-324` icon cut. Informed by the `CSS-097` coverage data. Prune candidates from the 2026-07-13 audit: the idiosyncratic `.air-*` spacer family, percentage paddings, `*-auto` in families where `auto` is meaningless. Coordinates with `CSS-136` / `CSS-137`. | P1 | M |
| `CSS-324` | perf | **Icon-set revision — prune to what is actually used.** The set reached 143 glyphs by promotion, not by measurement: the `v0.6.18` ecosystem batch adopted every glyph the consumer sites rendered, and maintainer batches added more ahead of need (last: 6 glyphs, 2026-07-17). Several are expected to be removable. `CSS-097` produces exactly the evidence this needs — which `.rd-icon-*` classes no consumer matches — so run this after it, not on taste. Removal is **breaking** for anyone rendering a dropped glyph, so **this release only produces the cut list + per-glyph downstream check; the removal itself executes in `v0.7.7` Prune**. Note the set is a class matrix: each glyph costs 2 rules and ~0.4 KB of unminified CSS whether or not anyone uses it. Also settle near-duplicates carried by both cuts (`business_center` vs `work`). | P1 | M |
| `CSS-330` | perf | **Own and enforce the bundle budget — on transferred size** (moved out of `CSS-T01.5`, 2026-07-17; re-based 2026-10-02). A build-time size check wired into `npm test` next to `CSS-118`, reading the `CSS-339` baseline. The budget is **gzip/brotli**, not raw: the `.rd` gate (`v0.7.0`) adds ~69 KB raw but ~1 KB gzip, so the old 400 KB raw target stopped describing what consumers download. This release arms a **no-regression ceiling** at the post-gate transferred size; `v0.7.7` Prune sets the hard target after the cuts. Raw size stays reported, not budgeted. `CSS-T01.5` keeps the publish-time assertion as the last gate. Note the changelog has been citing `CSS-T01.7` for the budget since `v0.6.18` — that is the SRI task; this ID supersedes both. | P0 | S |

`CSS-339` (dated size baseline) and `CSS-118` (compiled-CSS and browser checks) moved up to `v0.7.1` Bug Closure (2026-10-07); this release extends both — the coverage report cites the table, and the checks guard the cut lists.

## Exit criteria

- [ ] Coverage report exists for all known consumers; the heaviest unused selector families are named
- [ ] A documented, copy-pasteable purge recipe (incl. the `.rd-is-*` / `.rd-js-*` safelist contract) is applied on at least one real consumer with measured before/after numbers
- [ ] The intentional property×value matrix is defined and the utility cut list exists with per-family downstream checks (`CSS-079`) — **the removal executes in `v0.7.7`, not here**
- [ ] The size check runs in `npm test` on transferred size (`CSS-330`) as a no-regression ceiling — the hard target arms in `v0.7.7`
- [ ] The dated size-baseline table (`CSS-339`, established in `v0.7.1`) carries this release's rows; every size claim in this file cites it
- [ ] The icon set is triaged against the coverage data: a cut list exists, every proposed drop is checked against downstream usage, the survivors are justified — **the removal itself is scheduled into `v0.7.7`, not executed here**
- [ ] The compiled-CSS checks (`CSS-118`, shipped in `v0.7.1`) guard the prune (alias classes, gap tokens, key custom properties)
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; sizes recorded in the `CSS-339` table

---

# Milestone `v0.7.7` — Prune

**Goal:** execute the two cut lists `v0.7.6` produced — and nothing else. A small, legible breaking release, kept separate from the interactive core on purpose (maintainer decision, 2026-10-02): a consumer reading the migration table sees "glyphs and utilities removed", not removals mixed into new button and form API. Serves waypoint 3 (lean delivery). Before 2026-10-02 these cuts were scheduled into the `v0.6→v0.7` transition gate; they moved here because the coverage data they depend on now comes after the gate.

**Breaking.** Every removed glyph and utility gets a migration-table row (`CSS-340`), with its downstream check from `v0.7.6`.

**Depends on:** `v0.7.6` — the `CSS-097` coverage report and both cut lists with per-item downstream checks.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-324` | perf | **Execute the icon cut.** Remove the glyphs on the `v0.7.6` cut list (SVG files, the `$icons` mirror, the generated class pairs) and settle the near-duplicates (`business_center` vs `work`). `scripts/fetch-icons.py` stays the single update path. | P0 | S |
| `CSS-079` | perf | **Execute the utility-matrix prune.** Shrink `_spacing.scss` to the intentional property×value matrix defined in `v0.7.6` (the `.air-*` family, percentage paddings, meaningless `*-auto` …); guarded by the `CSS-118` smoke test. Coordinates with `CSS-136` / `CSS-137`. | P0 | M |
| `CSS-330` | perf | **Arm the hard budget.** After the cuts, set the hard transferred-size target (gzip/brotli) from the new `CSS-339` row; the check in `npm test` flips from no-regression ceiling to hard-fail. `CSS-T01.5` keeps the publish-time assertion. | P0 | S |

## Exit criteria

- [ ] Both cut lists executed; every removal has a migration-table row and a passed downstream check; the live consumers render clean on the pruned build
- [ ] The hard transferred-size budget is armed in `npm test` (`CSS-330`); the new baseline row is in the `CSS-339` table
- [ ] `npm run lint:css` clean; tests green (incl. `CSS-118`, `CSS-338`); raw and gzip/brotli deltas recorded in `Changelog.md`

---

# Milestone `v0.7.8` — CDN Migration & Pages Sunset Prep

**Goal:** move docs, examples, and known consumers off mutable GitHub Pages asset URLs onto versioned jsDelivr targets, then **deprecate and freeze** the Pages surface. The unpublish itself moved behind npm (2026-07-21, external review): the old delivery channel is not deleted before the new one (`v0.7.13`) is live and verified — `CSS-T00.4`/`CSS-T00.5` now land there, after a compatibility window. Renumbered from `v0.6.18` on 2026-07-13 and from `v0.6.24` on 2026-10-02; `CSS-T00` (the consumer-migration umbrella from `v0.7.1` Distribution hygiene) is consolidated here. Its completion unblocks the `v0.7.13` npm delivery release (`CSS-T01`) at the end of the series. Note the versioned targets consumers pin here are already gated — the `.rd` migration line (`v0.7.0`) applies to every consumer moved in this release.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T00` | chore | **Consumer-migration umbrella (moved from `v0.7.1` Distribution hygiene, 2026-07-13).** Migrate consumers off `https://raredigits.github.io/rare-styles/rare.min.css` (mutable, no CDN, no SRI) to a versioned CDN URL. Tag the current released snapshot (version per `_data/versions.js`), switch docs/examples to the latest tagged CDN target, and announce the old URL as deprecated. | P0 | S |
| `CSS-T00.1` | chore | **Asset-URL contract: relative inside, versioned outside.** Inside the shipped CSS, asset references stay **package-local relative** (`fonts/…`, `images/…` — the `blockquote`/fonts pattern since `v0.6.14`/`v0.6.16`); versioned CDN URLs appear **only** in `<link>` tags and install snippets. One artifact must work unchanged via jsDelivr, unpkg, npm and self-hosting. Re-written 2026-07-21: the previous form — absolute CDN URLs inside the CSS — contradicted the npm packaging contract (`CSS-T01.1`); supersedes `CSS-033a`, whose absolute-CDN sweep is retired — the vendor-logo/brand surfaces already moved to relative paths in `v0.6.15` (`CSS-058`). Audit the shipped CSS for violations. | P0 | S |
| `CSS-T00.2` | chore | Migrate docs/examples away from `https://raredigits.github.io/rare-styles/...`. | P0 | S |
| `CSS-T00.3` | chore | Audit known downstream consumers for GitHub Pages CSS URLs and patch them. | P0 | M |
| `CSS-T00.4` | chore | **Moved to the npm release (2026-07-21; now `v0.7.13`):** unpublish only after npm/CDN delivery is live and cross-channel-verified, plus a compatibility window after the deprecation notice. This release only freezes and deprecates. | — | — |
| `CSS-T00.5` | chore | **Moved to the npm release (2026-07-21; now `v0.7.13`):** legacy-artifact cleanup (`.nojekyll`, …) follows the unpublish. | — | — |

## Exit criteria

- [ ] The shipped CSS contains only package-local relative asset URLs; versioned CDN URLs appear only in `<link>` tags and install snippets (`CSS-T00.1`)
- [ ] Docs/examples no longer recommend `https://raredigits.github.io/rare-styles/...`
- [ ] Known downstream consumers are migrated off GitHub Pages CSS URLs
- [ ] The Pages URL is announced deprecated and the surface frozen (no further syncs) — **unpublish is deferred to `v0.7.13`** (`CSS-T00.4`), after npm verification and a compatibility window

---

# Milestone `v0.7.9` — Docs Site Restructure

**Goal:** decide and land the documentation site's information architecture before the interactive core (`v0.7.10`) starts filling it. Was `v0.6.25` (moved into `0.7.X` on 2026-10-02). `CSS-280` has been sitting in Continuous Tracks, where nothing gates it — but the docs-driven audit policy makes `0.7.X` and `0.8.0` write first-pass pages for every module they touch, and those pages need somewhere to go. Promoted to a release by maintainer decision (2026-07-17): the IA is a prerequisite for the audit policy, not a docs chore.

**Note on the policy boundary:** Continuous Tracks says no milestone is gated on docs *completeness*, and that still holds. This release is not about writing the pages — it is about the structure they land in. Content keeps filling at its own pace.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-280` | docs | **Restructure plan (promoted from Continuous Tracks, 2026-07-17).** Review the existing 14 `/styles/` folders, decide renames/merges/removals (`idea/` and `modules/` audit included), produce the final IA before writing content. Output: a one-page proposal in `STYLEGUIDE.md`. Closes `Q-01` (the fate of `/styles/typography/interactive/`). | P0 | S |
| `CSS-322` | docs | **Land the IA.** Execute the `CSS-280` proposal: move, rename and merge the existing pages, fix `_data/tableOfContents.json` and the nav edges the moves break, and leave redirects or an honest 404 story for anything that had a public URL. The measure is that no existing page becomes unreachable. | P0 | M |
| `CSS-323` | docs | **Benchmark the result against the hamburger drafts.** The draft section lists already sitting in the documentation hamburger are the intended structure — they are the closest thing to a stated target IA, and the restructure is done when the shipped nav and those drafts agree. Where they disagree, the drafts are the question, not automatically the answer: record which won and why. | P0 | S |

## Exit criteria

- [ ] A one-page IA proposal is recorded in `STYLEGUIDE.md`, with `Q-01` closed by it
- [ ] The `/styles/` tree matches the proposal; no previously public page is unreachable without a redirect or a recorded decision
- [ ] The shipped nav and the hamburger draft lists agree, or every divergence is recorded with its rationale
- [ ] `_data/tableOfContents.json` has no anchors pointing at sections that do not exist (the `CSS-039` dead-nav class of bugs)

---

# Milestone `v0.7.10` — Interactive Core

**Goal:** close the two biggest functional holes in the library — a real button system and form elements — with semantic color tokens and the accessibility/focus base as their enablers (button and form states consume both). Was `v0.7.0` "Interactive Core & `rd-` Migration Start" until 2026-10-02: the `.rd` gate (`Q-14`) dropped the namespace migration, so this release carries **no namespace slice** and builds everything under plain names, gated by `.rd` like the rest of the library. The `CSS-340` transition gate moved to `v0.7.0`; the icon/utility cuts to `v0.7.7`.

**Breaking (narrow):** the existing single-style `button` / `.button` changes under the new system; changed defaults get migration-table rows (`CSS-340`). Element-vs-class stance is `Q-04` — under the gate, styling native elements is legal (it only applies inside `.rd`), so the question is now about defaults, not about embedding.

**Dropped 2026-10-02:** `CSS-133` (namespace migration umbrella — superseded by `Q-14`: no prefixes except `rd-icon-*`). `CSS-141` (collision-prone names) is kept as low-priority cleanup and moved to `v0.7.11`.

## Buttons (P0)

The current `_buttons.scss` is a single style with no variants. Turn it into a proper button system, alongside forms in this same release. Absorbs the auto-shop header CTA pill (`CSS-331`, `v0.7.4`) as a variant if it shipped as a standalone class. Element-vs-class stance is `Q-04`.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-040` | feat | `_buttons.scss`: variants `primary` / `secondary` / `ghost` / `danger` / `link`. | M |
| `CSS-041` | feat | Sizes: `button-sm` / `button-md` (default) / `button-lg`. Driven by `--button-padding` and `--button-font-size` tokens. | S |
| `CSS-042` | feat | Icon buttons (`button-icon`), buttons with leading/trailing icons, button-only-icon-square. | M |
| `CSS-043` | feat | States: `:hover`, `:active`, `:focus-visible`, `:disabled`, `[aria-busy="true"]` (loading spinner). | M |
| `CSS-044` | feat | `button-group` — segmented horizontal group with shared borders. | S |
| `CSS-045` | feat | `button-block` modifier (full-width). | S |
| `CSS-046` | feat | Token surface: `--button-radius`, `--button-padding-x/y`, `--button-font-weight`, `--button-transition`. | S |

## Forms (P0) — moved from `0.8.1` (2026-07-13)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-100` | feat | `modules/elements/_forms.scss`: base styles for `input[type=text/email/password/search/tel/url/number]`, `textarea`, `select`. Plain element selectors — no per-field classes and no wrapper class; the `.rd` gate scopes them (a form inside a `class="rd"` island gets them, a host form outside `.rd` never does). Re-scoped 2026-10-02 from the `.rd-form` container of the embed plan. | M |
| `CSS-101` | feat | Custom-styled `checkbox` and `radio` via `appearance: none` — scoped by the `.rd` gate, never applied outside it. | M |
| `CSS-102` | feat | `<label>`, `.form-group`, `.form-row`, `.form-help`, `.form-error`. | S |
| `CSS-103` | feat | States: `:focus`, `:focus-visible`, `:disabled`, `:invalid`, `:valid`, `[aria-invalid]`. | M |
| `CSS-104` | feat | `fieldset` / `legend` reset and styling. | S |
| `CSS-105` | feat | `range`, `color`, `file` inputs — minimal styling. | S |

## Enablers — semantic tokens & focus base (P0)

Button and form states depend on both: `:invalid` needs `--color-danger`, `button-primary` needs `--signal`, and every interactive state needs the global focus story. Pulled from `0.8.0` (tokens) and the old `v0.7.1` (a11y base) on 2026-07-13.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-121` | feat | Semantic color layer on top of base palette: `--color-success` / `--color-danger` / `--color-warning` / `--color-info`. Migrate components to semantic tokens. | M |
| `CSS-124` | feat | **`--signal` token** separate from `--brand-color`. `--brand-color` stays for brand identity (link highlights, decorative brand marks). `--signal` is reserved for attention/action-driving accents (primary buttons, critical-state indicators, threshold violations, focus-visible). Migrate `button-primary`, status-critical, KPI-delta-up/down to `--signal`; the `:focus-visible` ring consumes it via the dedicated `--focus-ring-color` (`CSS-110`). Codifies the Rareism distinction between identity and signal in the token layer itself. | M |

`CSS-110` (focus base, `--focus-ring-color`) and `CSS-111` (`.visually-hidden`) moved up to `v0.7.1` Bug Closure (2026-10-07). Here `CSS-124` repoints the `--focus-ring-color` default to `--signal`, preserving consumer overrides.

## Documentation-driven audit — first-pass `/styles/elements/` (P1)

Per the docs-audit policy: buttons and forms are documented in the milestone that builds them.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-086` | docs | First-pass write of `/styles/elements/buttons/` covering variants, sizes, states, button-group, button-block. Depends on `CSS-040..046`. Finalized in `CSS-287` (forms section `CSS-091` lands in this same release). | M |
| `CSS-091` | docs | First-pass write of forms section on `/styles/elements/`. Depends on `CSS-100..105`. Joined with the buttons section already drafted in `CSS-086`. Finalized in `CSS-287`. | M |

## Exit criteria

- [ ] Buttons and forms ship with their first-pass docs pages (`CSS-086`/`CSS-091`); `Q-04` closed; changed defaults recorded in the migration table
- [ ] Semantic tokens and `--signal` land (`CSS-121`/`CSS-124`); the `--focus-ring-color` default from `v0.7.1` is repointed to `--signal` without breaking overrides; every new interactive surface inside `.rd` has a visible focus state
- [ ] The `CSS-338` fixture stays green: forms, buttons and the focus ring never reach host elements outside `.rd`
- [ ] The live consumers render clean against the release
- [ ] `npm run lint:css` clean; tests green; bundle measured against the `CSS-330` budget

---

# Milestone `v0.7.11` — Stabilization & Core Polish

**Goal:** zero invalid CSS in the codebase, linter in place, and the module surface cleaned up and finished after the interactive core (`v0.7.10`). Was `v0.7.1` until 2026-10-02; the namespace slice it used to carry is gone with the migration (`Q-14`). Renamed "Stabilization & Core Polish" (2026-07-21): alongside stabilization it deliberately ships a bounded set of **new** list/utility API (`CSS-072..076`, `CSS-125`, `CSS-138..139`, `CSS-144..146`) — under plain names, gated by `.rd`.

**Table hygiene (2026-07-21):** closed and moved task IDs (`CSS-030` / `CSS-031` / `CSS-032` / `CSS-033a` / `CSS-077` / `CSS-078` / `CSS-079` / `CSS-087`) no longer sit in the active tables — their records live at their destination milestones, in the archive, and in `Changelog.md` (`CSS-077` closed early in `v0.6.14`; `CSS-087` absorbed by `v0.6.18`).

## Quality infrastructure (P0–P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-020` | dx | Keep **Stylelint** on a Node-18-compatible stack: `stylelint@16`, `stylelint-config-standard-scss`, `postcss-scss`. Document `npm run lint:css` as the canonical CSS check. | M |
| `CSS-021` | dx | Make `npm run lint:css` the stable team entry point, run `stylelint --fix` where safe, and document when linting is required in day-to-day work and before release. | S |
| `CSS-022` | dx | Document the build pipeline: how `rare.css` / `rare.min.css` are produced, how linting fits into the release flow, and which `package.json` scripts are canonical (`build:css`, `watch:css`, `lint:css`). | M |
| `CSS-023` | chore | Sweep low-risk Stylelint cleanup that is mostly mechanical: modern `rgb(... / ... )` notation, alpha percentages, hex shortening, empty-line normalization, operator spacing, argumentless mixin call style. | M |
| `CSS-024` | chore | Triage duplicate/dead declarations reported by Stylelint and either remove them or document intent: `_icons.scss`, `_tags.scss`, `_header-container.scss`, `_grid.scss`, `_sidenotes.scss`. Note: `_icons.scss` was already simplified in `v0.6.16` (legacy Material Icons selectors removed) and `_sidenotes.scss` touched (marker `font-variation-settings`) — re-triage those two against their current state. | S |
| `CSS-025` | chore | Clean up module hygiene issues reported by Stylelint: `@forward` without `.scss` extension in `navigation/_index.scss`, decide whether empty `special/_rare.scss` should be removed or kept as an intentional staging file. Audit 2026-07-13 adds: `utilities/_index.scss` forwards only display+resets while breakpoints/states/symbols are wired ad hoc elsewhere — make "utilities" one coherent forwarding surface. | S |
| `CSS-026` | chore | Audit the floating WhatsApp/contact button pattern as a reusable library primitive. Keep it in the library if it is genuinely cross-project, but clarify whether the API is brand-specific (`wa`) or a more general floating contact / floating action pattern. | S |

## Performance (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-033` | feat | Publish reusable vendor icon assets (`wa.svg`, `github.svg`, and similar stripes/badges) to a stable CDN/public path so downstream projects can reference them without copying files from this repo. | M |
| `CSS-034` | chore | Fix critical server-side dependency vulnerabilities in the site/build toolchain, starting with templating and content-processing packages flagged by `npm audit` (notably `liquidjs` and other server-side/high-severity findings). Verify `npm run build` still passes after the refresh. | M |

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

## Typographic & utility finishing (P1) — routed from the 2026-07-13 audit

Cheap, high-impact completeness for the longread core and the utility system. All S-sized. `CSS-126`/`CSS-129` moved up to `v0.7.1` and `CSS-127`/`CSS-128` to `v0.7.2` (2026-10-07) — the content starter needs them.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-125` | feat | `text-wrap: balance` for headings/`.lead`, `text-wrap: pretty` for body prose — zero usage today. | S |
| `CSS-138` | feat | `position: sticky` utility — components hand-roll it today (`align/_position.scss:1-11` vs `navigation/_sidebar.scss:10`). | S |
| `CSS-139` | chore | z-index token scale — utilities cap at `z-index-5` while components use ad-hoc `99/100/102/1000` (`utilities/_display.scss:44-65` vs `layout/_containers.scss:45`); one scale, components migrate onto it. | S |
| `CSS-144` | feat | Flex `justify-content`/`align-items` utility family — today grid-semantic `.items-*` is borrowed instead (`align/_flex.scss`, `layout/_grid.scss:210-218`). | S |
| `CSS-145` | feat | Expose the breakpoint values to consumers — **not as CSS custom properties in `@media`**: custom properties are invalid in media-query conditions (corrected 2026-07-21). Ship instead: documented canonical values, Sass exports for SCSS consumers, and evaluate build-time `@custom-media` for the compiled CSS. Today Sass-only vars (`utilities/_breakpoints.scss:1-4`). | S |
| `CSS-146` | feat | `aspect-ratio` utility — used raw in 4+ component files (`bricks/_cards.scss:72`), never exposed. P2. | S |

## Library boundary (P1) — decisions `Q-09`/`Q-10` from the 2026-07-13 audit

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-147` | chore | **`special/` eviction pass** (decision `Q-10`): move `_mockups.scss` (iPhone frame) and `_construction.scss` out of the library into the site layer — audit downstream usage first, record as breaking; tokenize `_cookie-consent.scss` (raw px/hex → tokens; it stays — it is a real companion); `.wa-button` fate is decided by the existing `CSS-026` audit. | M |
| `CSS-148` | chore | **Site-only JS exclusion** (decision `Q-09`): `themeSwitcher.js`, `header-scroll.js`, `gridDisplay.js` are declared site glue — no contract headers, excluded from the `/scripts/` docs and the `rare-scripts` distribution; record the boundary in `SCRIPTS_CONTRACT.md`. `themeSwitcher` may return as a real companion after `CSS-169` (dark-ready tokens). | S |

## Documentation-driven audit — first-pass `/styles/` pages (P1)

Per the **Documentation-driven audit policy** (see top of this doc). The corresponding `CSS-282..295` IDs in `v0.9.0` finalize these pages with KSS-extracted reference and remaining polish. Duplicates and over-complicated utilities surfaced here are filed as new tasks against the next bug-fix release.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-080` | docs | First-pass write of `/styles/typography/` covering fonts, headings, body, lists (incl. `<dl>`), code, sidenotes, blockquote, captions, tables, text-content widths. Expected to surface: heading variant overlap, list/dl duplication, table-row utility names, and the general outdent-inside-padded-surfaces contract — `v0.6.17` (`CSS-047`) resolved it for `.collapsible-container` by resetting the outdent family to the card's content width, but the same conflict awaits in any other padded card that hosts prose (`.card`, `.paper-sheet`). Audit 2026-07-13 adds: check prose-measure coherence — `article` width comes from grid columns, not the `--text-content-width` readability token (`layout/_containers.scss:79`). Finalized in `CSS-285`. | M |
| `CSS-081` | docs | First-pass write of `/styles/layout/` + child page `/styles/layout/spacing/` covering grid, containers, `fr` system, breakpoints, responsive prefixes (`mobile:` / `tablet:` / `desktop:`). Reflects the post-`CSS-027` aliases state. Expected to surface: spacing-utility overlap (`margin-t-*` vs `mt-*`), alias-vs-canonical distinction. Finalized in `CSS-284`. | M |
| `CSS-082` | docs | First-pass write of `/styles/utilities/` covering display, resets, breakpoints. Expected to surface: overlap between `.no-decoration` / `.no-padding` / `.no-border`, scrollbar helpers. Finalized in `CSS-291`. | S |
| `CSS-083` | docs | First-pass write of `/styles/decorations/` covering borders, shadows, separators, icons, images, skeleton. Reflects post-`CSS-032` Material Symbols Outlined canonical state. Pairs with `CSS-142` (Rareism rationale per utility). Finalized in `CSS-290`. | M |
| `CSS-084` | docs | First-pass write of `/styles/colors/` covering base / brand / supporting / blue and color utility classes. Expected to surface: contrast issues (feeds `CSS-114`), clarification of supporting-palette public-API surface. Finalized in `CSS-286`. | M |
| `CSS-085` | docs | First-pass write of `/styles/navigation/` covering header, sidebar, hamburger, search (post-`CSS-050` rebuild), tags, links, footer. Expected to surface: nav-list overlap, tags-vs-links distinction. Finalized in `CSS-289`. | M |

## Distribution hygiene (P0)

`CSS-T00` moved to the CDN Migration & Pages Sunset release (2026-07-13; now `v0.7.8`), consolidated with the rest of the Pages-sunset scope.

## Naming cleanup (P2) — moved from the old `v0.7.0` (2026-10-02)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-141` | chore | Audit collision-prone names: `.left`, `.right`, `.top`, `.bottom`, `.bold`, `.italic`, `.note`, `.warning`, `.lead`. Re-scoped 2026-10-02 as cleanup: with no namespace prefix, these names can only collide **inside** `.rd` (host classes of the same name still hit a `class="rd"` element — `Q-14` caveat); rename only where a name is genuinely ambiguous or misleading, with migration-table rows. | S |

## Exit criteria

- [ ] Zero invalid CSS; the Stylelint pipeline is documented and green (`CSS-020..025`)
- [ ] The search overhaul ships with the full keyboard/screen-reader path (`CSS-050`)
- [ ] Library-boundary evictions executed (`CSS-147`/`CSS-148`); new public API is limited to this milestone's enumerated core-polish tasks (`CSS-072..076`, `CSS-125`, `CSS-138..139`, `CSS-144..146`), each shipped under plain names behind the `.rd` gate
- [ ] `npm run lint:css` clean; tests green; bundle measured against the `CSS-330` budget

---

# Milestone `v0.7.12` — Data-View Primitives

**Goal:** make the "decision-first data views" half of the positioning real. The minimal data-view core ships on the `v0.7.10` semantic tokens — pulled forward from `0.8.0` (2026-07-13): these primitives are layout-agnostic, harvest-ready on client projects, and should not wait for the layout modes. Was `v0.7.2` until 2026-10-02; the final namespace slice it used to carry is gone with the migration (`Q-14`). `v0.7.13` packages the stabilized API.

**Minimal core (this release):** panel family, stat/KPI, status indicators + badges, dense table, toolbar, alert severity variants — plus the dashboard example as the proof artifact.

**Extended set (added 2026-07-13):** all five discussion candidates are included as P2 tasks so they don't get lost — see the extended-set table at the bottom of this milestone; triage on the spot when the release is being cut.

## Cross-layout components — Dashboard primitives (P0)

Functional UI primitives that work in any layout (Longread, Dashboard, or no layout class at all). Deliberately not gated by `rd-layout-dashboard` so a longread article can embed them (e.g. a KPI panel inside a longread, a status indicator in plain documentation).

### Panel — the data-surface counterpart to `card`

Currently `.card` is overloaded for both narrative content (article preview, person, project) and functional content (KPI, status, chart wrapper). Split into two primitives with distinct semantics.

| Primitive | Semantics | Surface | Use cases |
|---|---|---|---|
| `.card` (existing) | Authorial / narrative / human | Soft, no rigid frame | Article preview, person, project, pricing |
| `.panel` (new) | Data / functional / system | Structured: header / body / footer | KPI, chart wrapper, status block, settings, log |

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-180` | feat | `modules/bricks/_panels.scss`: `.panel`, `.panel__header`, `.panel__body`, `.panel__footer`, `.panel-grid` (multi-panel layout primitive — flat per hybrid BEM policy, since it arranges panels rather than being one). Theme-agnostic. | M |
| `CSS-181` | chore | Rename data-row patterns currently misfiled under `.card`: `.card-dashboard-bordered` → `.panel--bordered`; `.card-row-bordered` → `.panel__row`; `.card-row-bordered-item` → `.panel__row-item`. Old names are **removed in this same release**, no alias layer (aligned 2026-07-21), with migration-table rows; the site migrates in lockstep via `CSS-183a`. | S |
| `CSS-182` | docs | STYLEGUIDE: `card` vs `panel` decision rule. Narrative / authorial content → `.card`. Data / system content → `.panel`. Concrete examples for each. | S |
| `CSS-183` | feat | `.panel--flush` modifier: removes outer padding so the panel docks flush against parent (used when nested in another panel or grid cell). | S |
| `CSS-183a` | chore | **Site migration**: replace `.card` usages on raredigits.art that wrap Dashboard-style blocks (KPI, charts, status, settings) with `.panel`. Audit `_includes/`, `_layouts/`, `_posts/`, `kb/`, `pricing/`, `charts/`, `_drafts/`. Lands **in this release**, in lockstep with the `CSS-181` rename — there is no alias window (2026-07-21). | M |

### Other primitives (layout-agnostic)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-184` | feat | `modules/bricks/_stats.scss`: KPI block — `.stat`, `.stat__label`, `.stat__value`, `.stat--delta-up` / `.stat--delta-down` (BEM per hybrid policy; uses `--signal` for emphasis, semantic tokens for delta direction). | M |
| `CSS-185` | feat | Dense table styles in `modules/typography/_tables.scss`: `.table-dense`, zebra rows, sticky header, sortable indicator. | M |
| `CSS-186` | feat | Status indicators in `modules/decorations/`: `.status-dot`, `.badge-success/warning/danger/info`. Uses semantic tokens from `CSS-121`. | S |
| `CSS-187` | feat | `modules/elements/_toolbar.scss`: `.toolbar`, `.toolbar__section`, `.toolbar__spacer` (BEM per hybrid policy). Used for filter rows, dashboard headers, panel actions. | S |

## Audit additions routed here (2026-07-13)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-156` | feat | **Alert/callout severity variants.** `.callout` is a single muted box (`typography/_text-content.scss:134`) — add info/success/warning/error variants on the `CSS-121` semantic tokens. Alerts ≠ badges (`CSS-186`); decision views need both. | S |
| `CSS-159` | docs | **Shipped dashboard/data-view example** built from the new primitives (panel/stat/table-dense/toolbar) — `assets/css/examples/` currently holds one stale homepage-specific file (Oct 2025). Complements `CSS-202`. | M |

## Extended set — candidates included so they don't get lost (P2, triage at release cut)

Added 2026-07-13 by maintainer decision. Each is optional for this release: pull in what fits when the release is being cut, push the rest down without ceremony.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-174` | feat | **Meter / progress bar.** The "fill toward a target" element — none exists in the library. Semantic-token driven (`--signal` for threshold breach); `role="meter"` / `role="progressbar"` guidance in the docs page. | M |
| `CSS-175` | feat | **Sparkline container.** Inline-trend slot for `stat` and dense-table cells — a sized, baseline-aligned container contract that `rare-charts` (or plain SVG) renders into; today an inline trend requires the full charts bundle. | S |
| `CSS-176` | feat | **Early slice of the chart-chrome tokens.** Pull the token subset (`--chart-series-1..8`, axis/grid/label colors) forward from `CSS-240` (`0.9.0`) so `rare-charts` can start reading CSS sooner; pairs with `CSS-173`. `CSS-240` shrinks to the remainder. | S |
| `CSS-177` | feat | **Delta chip** — "▲ +3.2%" as a standalone atom usable in tables and prose, not only inside `stat` (`CSS-184`). Consumes the ▲/▼ triangle icons added to the `v0.6.18` SVG set (`CSS-096`) and the semantic/`--signal` tokens. | S |
| `CSS-178` | feat | **Reusable legend primitive** — legend chips/lines as library CSS usable outside the charts bundle; coordinates with `CSS-241` (`0.9.0`), which then consumes it instead of shipping its own. | S |

## Exit criteria

- [ ] The minimal data-view core (panel family, stat, dense table, status/badges, toolbar, alerts) ships, with the dashboard example (`CSS-159`) as proof
- [ ] The `.card-*` data-row renames land with the old names **removed in this release** (`CSS-181`) and the site migrated in lockstep (`CSS-183a`) — no alias layer survives
- [ ] The live consumers are verified against the release
- [ ] `npm run lint:css` clean; tests green; bundle measured against the `CSS-330` budget

---

# Milestone `v0.7.13` — npm Delivery

**Goal:** make Rare Styles installable as `@raredigits/rare-styles@0.7.13` without turning the `raredigits.art` site package into the library package. `raredigits.art` remains the canonical source; `raredigits/rare-styles` remains the clean distribution repository. One immutable build artifact must feed npm, the GitHub tag/Release, jsDelivr and unpkg so the same version cannot resolve to different bytes on different channels.

**Scope rule:** this is a delivery release, not an API-stability release. It may package the existing public CSS/SCSS/assets contract and improve release infrastructure; it must not introduce new selectors, rename public API, or bundle the companion scripts. npm ships the library at `0.x`; the `1.0.0` semver promise remains a later milestone. There is no namespace migration to finish (dropped with `Q-14`, 2026-10-02); this release ships no renames. Was `v0.7.3` until 2026-10-02 — kept at the end of `0.7.X` by maintainer decision.

**Depends on:** `v0.7.8` complete (consumers migrated, Pages deprecated and frozen — the unpublish happens *here*, after verification); canonical CDN paths and the `rare-styles` distribution repository verified. Before implementation, verify ownership/availability of the `@raredigits` npm scope and package name.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T01.1` | feat | **Define the package artifact and build it reproducibly.** Add a clean staging/build command that creates `dist/rare.css`, `dist/rare.min.css`, their source maps, `dist/scss/**`, `dist/fonts/**`, `dist/images/**`, plus the package metadata/docs required at the package root. Preserve package-local relative asset URLs. The command must start from a clean staging directory so removed source files cannot survive in a release. | P0 | M |
| `CSS-T01.2` | feat | **Create the public manifest for `@raredigits/rare-styles`.** Keep the site root package private; generate or maintain a separate distribution `package.json` with `style`, `sass`, explicit `exports`, `files`, `sideEffects` for CSS, `license`, `repository`, `engines`, Sass peer dependency metadata, and `publishConfig.access: public`. Support the documented root CSS import, the explicit minified import, and the SCSS entry point — note the SCSS entry compiles **ungated** source (the `.rd` gate is a PostCSS step on the CSS output, `CSS-343`); document how Sass consumers apply it or ship the gate as a reusable PostCSS plugin; do not advertise a nonexistent JavaScript `main`. | P0 | M |
| `CSS-T01.3` | dx | **Single-source the styles version.** Add a styles `version.json` analogous to Rare Charts; derive `_data/versions.js`, the distribution manifest, banners, tag and release title from it. Validate exact mapping between npm `0.7.13` and git/CDN tag `v0.7.13`; fail the release on version drift or an already-published version. Supersedes the old placement of `CSS-T01.8`. | P0 | S |
| `CSS-T01.4` | feat | **Replace the mutable CSS sync with a release-gated pipeline.** On a new version: install from lockfile, lint, test, build, assemble the clean package, validate it, sync the exact artifact to `raredigits/rare-styles`, commit/tag `v0.7.13`, create the GitHub Release, then publish that same artifact to npm. Normal `main` pushes between version bumps must not alter consumer-visible distribution. Use npm trusted publishing/OIDC with provenance if the registry/account supports it; otherwise use a narrowly scoped automation token. | P0 | L |
| `CSS-T01.5` | dx | **Verify the packed consumer experience before publish.** Run a real `npm pack --json` to produce the tarball (keep `--dry-run` as the cheap pre-check — a dry run alone creates no `.tgz` to install; corrected 2026-07-21), inspect the allowlisted file inventory, enforce no `node_modules`/site/Eleventy/chart leakage, check license and asset presence, and assert the bundle budget still holds at publish time (`CSS-330` owns the budget itself; this is the last gate before bytes go out). Install the generated `.tgz` into a temporary fixture and compile `import "@raredigits/rare-styles"` and `@use "@raredigits/rare-styles/scss"`; verify referenced fonts/images resolve from the installed package. | P0 | M |
| `CSS-T01.6` | docs | **Document the three supported installation paths.** README and `/styles/usage/`: versioned jsDelivr `<link>`, `npm install @raredigits/rare-styles`, and Sass `@use` — each with the `.rd` opt-in (`<html class="rd">`). State that `0.x` may contain breaking changes, recommend exact version pins, document exported subpaths/assets, and keep companion scripts explicitly separate. | P1 | S |
| `CSS-T01.7` | feat | **Publish integrity metadata for the browser/CDN flavor.** Generate SHA-384 SRI values for both CSS artifacts (`rare.css`, `rare.min.css`) from the final artifact and attach them to the GitHub Release (and documentation where maintainable). The hash must be computed after the final build, from the exact bytes published. | P1 | S |
| `CSS-T01.8` | chore | **Run a `0.7.11` release rehearsal, then publish.** Exercise the pipeline without registry mutation, inspect the tarball and release notes, then publish the real version. Verify from a clean external fixture that npm install, root CSS import, minified subpath, SCSS compilation, npm metadata, GitHub tag/Release, jsDelivr and unpkg all resolve to `0.7.11`; record hashes/URLs and add the release entry to `Changelog.md`. | P0 | M |

### Pages sunset — moved here from the CDN release (2026-07-21)

The old delivery channel is removed only after the new one is verified end-to-end, plus a compatibility window after the `v0.7.8` deprecation notice.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T00.4` | chore | Unpublish the legacy GitHub Pages site — gated on `CSS-T01.8` cross-channel verification and the compatibility window. | P1 | S |
| `CSS-T00.5` | chore | Remove legacy Pages-only repository artifacts (`.nojekyll`, …) after the unpublish. | P2 | S |

## Release order

1. Package boundary and single-source version (`CSS-T01.1`–`.3`).
2. Pack/install verification and documentation (`CSS-T01.5`–`.7`).
3. Release-gated automation (`CSS-T01.4`).
4. Dry rehearsal, real publication and cross-channel verification (`CSS-T01.8`).

## Exit criteria

- [ ] `npm install @raredigits/rare-styles@0.7.13` works in a clean project
- [ ] Root CSS, minified and SCSS `@use` entry points are covered by fixture tests; the gated output is what ships
- [ ] Fonts, images and source maps referenced by the package resolve without site-root assumptions
- [ ] The npm tarball contains only the intentional library artifact, metadata, documentation and licenses; no site/build/chart leakage
- [ ] `raredigits.art` remains `private: true`; the public manifest belongs only to the distribution artifact
- [ ] One version source drives docs, manifest, tag and pipeline; npm `0.7.13` maps to git/CDN `v0.7.13`
- [ ] Ordinary `main` pushes cannot mutate released distribution; only a new version triggers a release
- [ ] npm, GitHub Release, jsDelivr and unpkg serve the same final bytes for both CSS artifacts; SHA-384 values are recorded for each
- [ ] Install docs cover CDN, npm and SCSS with the `.rd` opt-in, exact pins, `0.x` compatibility expectations and separate companion scripts
- [ ] `npm run lint:css`, `npm run test:run`, CSS build and the packed-fixture smoke test pass in CI
- [ ] Pages unpublished (`CSS-T00.4`) only after cross-channel verification and the compatibility window; legacy artifacts removed (`CSS-T00.5`)

---

# Milestone `0.8.0` — Components Harvest

**Goal:** ship the remaining harvested components (tabs, TOC, card variants, skeleton, app-shell, the narrative text set). This is primarily a **harvest**: they are already nearly built on client projects — the work is normalizing them into library API (naming, tokens, structural contract, docs), not designing from scratch. **The layout modes moved earlier** (Page Layouts, now `v0.7.5`); the data-view primitives (now `v0.7.12`) and the semantic-token enablers (now `v0.7.10`) too (2026-07-13/20; renumbered 2026-10-02). Split out of the old monolithic `0.8.0` — Completeness on 2026-07-13; the a11y/architecture half is `0.8.1`. No namespace work — the migration was dropped with `Q-14` (2026-10-02); harvested components ship under plain names behind the `.rd` gate.

## Harvest additions (P1) — 2026-07-13 audit batch + returns from `v0.6.22` (2026-07-21)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-149` | feat | **Tabs** (decision `Q-08`: pulled forward from post-1.0 `CSS-305`). Harvest from client projects where already built; `rd-js-tabs` companion per the scripts contract, `tablist`/`aria-selected` roles, keyboard navigation. Accordion/stepper stay post-1.0. | M |
| `CSS-157` | feat | **Card variant coverage.** Media/thumbnail card, clickable-card `:focus-within` affordance, `.card-inverted` hover/focus parity on the dark surface (`bricks/_cards.scss:20,72`). | M |
| `CSS-158` | feat | **Table-of-contents component** with scroll-spy/active-section state for longreads — `.sidebar-nav` today is generic navigation (`navigation/_sidebar.scss`). Harvest candidate: article sidebars already exist on consumer sites. | M |
| `CSS-163` | feat | **Skeleton becomes loading-grade**: shimmer/pulse + `aria-busy` pairing (`decorations/_skeleton.scss`). Ships its **own** `prefers-reduced-motion` guard — the global motion sweep (`CSS-112`) lands later, in `0.8.1`, and absorbs it (dependency inverted 2026-07-21). | S |
| `CSS-152` | feat | Drop cap utility (`.dropcap` / `p.dropcap::first-letter`). Returned from `v0.6.22` (2026-07-21) — a text component, not a layout delta. | S |
| `CSS-153` | feat | Section divider variants for narrative structure (`.story-divider`, `.story-section-break`). Returned from `v0.6.22` (2026-07-21). Naming note: **“story” here names the standalone narrative-component family, not the retired layout working name** — final names settle at harvest. | S |
| `CSS-154` | feat | Pull-quote variant tuned for the longread mode (typographic, large, centered). Returned from `v0.6.22` (2026-07-21). | S |
| `CSS-188` | feat | `modules/layout/_shell.scss`: `.app-shell` — opt-in layout shell with topbar + main + optional sidebar. Used by dashboard pages but not gated by `layout-dashboard`. Returned from `v0.6.22` (2026-07-21) — a component, not a layout delta. | M |

## Documentation-driven audit — first-pass `/styles/` pages (P0)

Continuation of the docs-audit policy (top of this file). Each page below depends on the corresponding feature work landing in this milestone; finalization happens later via the continuous docs track (KSS extraction).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-092` | docs | First-pass write of `/styles/components/` (renames `/styles/bricks/`): Cards + Panels decision rule, stats, status indicators, badges, dense tables. Depends on `CSS-180..188`. Expected to surface: leftover `.card-*` patterns that are really panels (feeds `CSS-181`, `CSS-183a`). Finalized in `CSS-288`. | M |

## Exit criteria

- [ ] Every harvested component (tabs `CSS-149`, card variants `CSS-157`, TOC `CSS-158`, skeleton `CSS-163`, narrative text set `CSS-152..154`, app-shell `CSS-188`) ships behind the `.rd` gate with a structural contract and its first-pass docs (`CSS-092`)
- [ ] Tabs ship on the scripts contract (`rd-js-*` hooks, `tablist`/`aria-selected`, keyboard path)
- [ ] Harvested components ship under plain names behind the `.rd` gate; the `CSS-338` fixture stays green
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; sizes recorded in the `CSS-339` table

---

# Milestone `0.8.1` — Completeness: A11y & Architecture

**Goal:** close the remaining functional gaps for the core Rareism use cases: the accessibility batch, the rest of the token system (surfaces, motion), and the architectural pass (`@layer`, logical properties). Second half of the old monolithic `0.8.0` — Completeness (split 2026-07-13); the layouts/components half ships first as `0.8.0`. Forms and the namespace finalization (`CSS-100..105`, `CSS-133`, `CSS-141`) moved out on 2026-07-13 (forms now in `v0.7.10`; `CSS-133` dropped and `CSS-141` → `v0.7.11` on 2026-10-02).

## Accessibility (P0)

`CSS-110..114` moved up to `v0.7.1` Bug Closure and `CSS-167` (basic article print) to `v0.7.2` Content Starter (2026-10-07). What remains here is `CSS-168`.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-168` | a11y | **`prefers-contrast` / `forced-colors` support** — none today (audit 2026-07-13); verify tokens and key components under Windows High Contrast, add minimal overrides. | S |

## Typography completeness (P1) — routed from the 2026-07-13 audit

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-164` | feat | **Fluid type scale.** Zero `clamp()` today — the whole scale is fixed rem/em (`typography/_fonts.scss:11-17`). Introduce fluid sizing for the heading/display end of the scale (body stays stable); coordinate with the `CSS-136` token renames. | M |
| `CSS-165` | feat | **True footnote/reference system.** `.footnote` is a styled block only — no numbered refs (`sup`/counters), no backlink navigation (`typography/_text-content.scss:184`). Design the footnote contract alongside the existing sidenote system: complementary, not duplicates. Depends on `sub`/`sup` from `CSS-128`. | M |
| `CSS-166` | feat | **Table completeness for data views:** `caption`/`caption-side`, `tfoot` (totals rows), a stacked responsive mode besides `.table-scroll`, and a counter-utility for the global `th { white-space: nowrap }` (`typography/_tables.scss:13,20`). | M |

## Token system (P1)

`CSS-121` (semantic color layer) and `CSS-124` (`--signal`) moved to the interactive core (2026-07-13; now `v0.7.10`) as button/form-state enablers; the data-view primitives (`v0.7.12`) consume them as released tokens.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-122` | feat | Surface tokens: `--surface-1` / `--surface-2` / `--surface-raised`, replacing direct `--gray-lightest` / `--gray-light` references inside components. | M |
| `CSS-123` | feat | Motion tokens: `--ease-out`, `--ease-in-out`, `--duration-fast` (120 ms), `--duration-base` (200 ms), `--duration-slow` (320 ms). | S |
| `CSS-169` | feat | **Dark-ready token layer** (decision `Q-07`, 2026-07-13). No switching in the library: components consume semantic/surface tokens exclusively (depends on `CSS-121`/`CSS-122`), and an official opt-in dark token set ships as a file/class. Switcher JS stays out (`CSS-148`); `THEMING.md` (`CSS-207`) documents the path. | M |

## Architecture (P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-130` | feat | Adopt `@layer reset, vendor, base, tokens, components, utilities` at the root. Removes the need for `!important` and locks cascade order. Audit 2026-07-13 adds to scope: a `:where()` specificity floor for utilities (one incidental use library-wide today), replacing the forward-order hack self-documented in `utilities/_states.scss`. | M |
| `CSS-131` | chore | Drop `!important` from `.mobile-hidden` once `CSS-130` lands. | S |
| `CSS-132` | chore | Generate `:root` variables from a SCSS map. Eliminate the duplication between `:root { --gray: ... }` and `$base_colors: gray, ...`. Single source of truth. | M |
| `CSS-134` | chore | `STYLEGUIDE.md` convention: components live in `bricks/` + `elements/`, utilities live in `layout/` + `utilities/` + `align/` + `decorations/`. | S |
| `CSS-135` | feat | Migrate margin/padding/border to logical properties (`margin-inline`, `padding-block`, `border-inline-start`). Out-of-the-box RTL/i18n support. | L |
| `CSS-136` | chore | **Rename top-end spacing tokens for semantic clarity.** `--space-xxxl` (12×) and `--space-xxxxl` (24×) communicate "bigger than bigger" rather than intent; arguably `--space-xxl` (6×) too. Pick a semantic scheme — three candidates: (a) industry t-shirt extension `--space-2xl/3xl/4xl`; (b) functional names like `--space-section/block/page`; (c) numeric multipliers `--space-x6/x12/x24`. Migrate the spacing scale, the `$spaces` list, all generated utility classes (`.height-xxxxl`, `.padding-xxxl`, etc.), and consumers (incl. the `.list-group-pack` height utility example in `/styles/layout/spacing/`). Mark as breaking change in `CHANGELOG.md`. | M |
| `CSS-137` | chore | **Merge `_spacing.scss` and `_spacing-aliases.scss` into one file.** The split between core tokens and short-form aliases adds an indirection layer without obvious benefit; consolidating clarifies what is canonical versus shorthand and reduces friction for contributors. While doing it, decide whether to keep the alias layer at all — the current convention `s: xs`, `m: sm`, etc. can mislead consumers (`m` ≠ `md`). Either prune to a smaller intentional set, or rebuild on cleaner ground. | M |

## Documentation-driven audit — first-pass `/styles/` pages (P0)

Continuation of the docs-audit policy (top of this file). Each page below depends on the corresponding feature work landing in this milestone; finalization happens later via the continuous docs track. `CSS-092` / `CSS-093` moved to `0.8.0` and `CSS-091` to the interactive core (now `v0.7.10`) with their features.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-090` | docs | First-pass write of `/styles/tokens/`. Depends on `CSS-121..124` (semantic + surface + motion + `--signal`). Expected to surface: tokens duplicated across multiple `:root` blocks (feeds `CSS-132`). Finalized in `CSS-283` (auto-generated reference from `dist/tokens.json`). | M |
| `CSS-094` | docs | Update `/styles/utilities/` with a11y additions: `sr-only`, `:focus-visible` story, `prefers-reduced-motion` handling. Depends on `CSS-110..113` (`CSS-110` / `CSS-111` land earlier, in `0.7.0`). Extends `CSS-082`. | S |

## Existing module review

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-140` | chore | Reconsider the `.desktop:` prefix. `desktop` ≥ 1024 px is the default state, so `.desktop:col-span-6` equals `.col-span-6`. Either remove or scope it strictly to `(min-width: 1024px)` overrides. | S |
| `CSS-142` | docs | STYLEGUIDE section **“Decoration as attention management”**: each decoration utility (border / shadow / separator / icon / image / skeleton) gets a one-line Rareism rationale — *what* attention it manages and *when* to reach for it. The Rareism stance: decorations are functional tools for guiding the eye; the standalone “decorator as creative specialist” role is obsolete. | S |
| `CSS-143` | docs | STYLEGUIDE: document `modules/special/_rare.scss` as a **staging area** for non-universal classes that have not yet earned a place in a specialized module. Promotion path: when a class generalizes, it migrates out into the appropriate module and is removed from `_rare.scss`. | S |

## Exit criteria

- [ ] The remaining a11y work lands (`CSS-168`); the `prefers-reduced-motion` policy shipped in `v0.7.1` (`CSS-112`) absorbs the `CSS-163` skeleton guard
- [ ] The token system is completed (surface/motion tokens) and the opt-in dark-ready set ships (`CSS-169`, per `Q-07`)
- [ ] The architecture pass lands — `@layer` (`CSS-130`) and logical properties — with rendering changes enumerated or zero
- [ ] `@layer` composes with the `.rd` gate (`Q-14`): layering must not change what is gated, and the `CSS-338` fixture stays green — note that layered library rules lose to **any** unlayered consumer rule, a cascade change to enumerate in the migration table
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; sizes recorded in the `CSS-339` table

---

# Milestone `0.9.0` — Release Prep

**Goal:** everything the `1.0.0` API promise needs — identity docs (README, STYLEGUIDE, CONTRIBUTING, LICENSE, THEMING, CHANGELOG, Code of Conduct), the demo page, sibling-library integration, tagging and basic CI. Slimmed on 2026-07-13: the docs-site infrastructure, KSS annotation, and token pipeline moved to the **Continuous Tracks** section — they are maintainer infrastructure, not consumer contract (see Key milestones). `CSS-210` (purge) moved much earlier, to Lean Delivery (now `v0.7.6`).

## Documentation (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-200` | docs | `README.md`: what the library is (Rareism instrument, narrow audience), how to install (CDN / npm / SCSS source), quick start, module map. Tone: assumes reader has read the manifesto; links to it rather than re-explaining. No “beginners welcome” copy — this is a principled tool, not a mass-market framework. | M |
| `CSS-200a` | docs | **`/styles/index.md`** — main library landing page on raredigits.art. Positioning ("ships the answer, not primitives"), manifesto link, two opt-in layouts (Longread / Dashboard) mentioned as a flexibility feature — not the headline, install snippets, link to docs site (`/docs/`). Replaces the current placeholder. | M |
| `CSS-200b` | docs | **`/manifesto/value/`** — fill the empty page. Articulates the value proposition of Digital Rareism: who it’s for, what problem it solves, why narrow focus over mass appeal. Indirectly serves as the library’s manifesto-side rationale. | M |
| `CSS-201` | docs | `STYLEGUIDE.md`: hand-written conventions doc — naming, utilities vs components, how to add a new module, how to add a new token, breaking-change policy. | M |
| `CSS-202` | docs | Single-page demo (`assets/css/examples/index.html`) showing every component and utility. Doubles as a visual smoke test. | L |
| `CSS-203` | docs | ~~Per-module live examples~~ — subsumed by the `/styles/` content structure (`CSS-282..295`). Examples now live on each docs page. | — |
| `CSS-204` | docs | `CHANGELOG.md` starting at `0.7.0`, [Keep a Changelog](https://keepachangelog.com/) format. | S |
| `CSS-205` | docs | **`CONTRIBUTING.md`** — full contributor guide. Sections: quick start (clone/install/dev server), project structure (link to STYLEGUIDE), branching model, [Conventional Commits](https://www.conventionalcommits.org/) convention, PR process (one concern per PR, backlog-ID in title, CHANGELOG update), **public API definition** (which classes / CSS variables / SCSS exports / layout class names / dist filenames are public — i.e. require MAJOR bump to break), bug-report template, feature-proposal template, **release process for maintainers** (version bump → CHANGELOG → git tag → GitHub Release → npm publish), link to `CODE_OF_CONDUCT.md`. | M |
| `CSS-206` | docs | `LICENSE` (MIT recommended) at the repo root. | S |
| `CSS-207` | docs | **Theming guide** (`THEMING.md`): how to override base tokens for a constrained brand context. Show a worked dark-mode example via `:root { --bg-color: #111; --primary-color: #f0f0f0; ... }` overrides — no built-in dark mode, just a recipe. **Distinct from layouts**: this is the brand-override path (color/token overrides), not the Longread/Dashboard mechanism (page-level shell). Cross-link to `/styles/themes/` for the no-theme-switching stance. Decision `Q-07` (2026-07-13): the token layer goes dark-ready in `0.8.1` (`CSS-169`) with an official opt-in dark set — this guide documents that path; still no built-in switching. | M |
| `CSS-208` | docs | `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 (verbatim). Linked from `CONTRIBUTING.md`. | S |

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
| `CSS-240` | feat | `modules/charts/_index.scss` — base tokens for charts: `--chart-axis-color`, `--chart-grid-color`, `--chart-label-color`, `--chart-tooltip-bg`, `--chart-series-1..8`. Sourced from semantic tokens. An early slice may ship in `v0.7.12` (`CSS-176`) — this task then shrinks to the remainder. | M |
| `CSS-241` | feat | Common chart chrome styles: axis, gridlines, legend, tooltip, data labels. Used by every chart type in `charts/`. Audit 2026-07-13: legend/sparkline/gauge/meter/progress chrome currently exists only inside the charts bundle (`rare-charts.css`) — move the shared pieces into library CSS here. | M |
| `CSS-242` | feat | Map chart styles (`charts/map`): land/water fills, hover state, choropleth scale tokens. | M |
| `CSS-243` | feat | Layout-aware chart palette: `rd-layout-longread` uses muted/editorial palette; `rd-layout-dashboard` uses high-contrast functional palette. Default (no layout class) uses the high-contrast functional palette as well. | M |
| `CSS-244` | docs | “Charts integration” doc: how to wire any chart to the token system, how to override per-instance via CSS variables. | S |
| `CSS-173` | feat | **Charts read colors from CSS custom properties** (audit 2026-07-13). Today the series palette, positive/negative and the dark theme are hardcoded in `src/core/theme.js` (`rare-charts.css:4`: "Colors — via theme (JS), not CSS") — consumers cannot retheme charts via CSS. Make the JS theme read the `CSS-240` tokens, keeping current values as fallbacks. Charts-side change, paired with `CSS-240`. | M |

## Distribution (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-211` | feat | Tag releases in git (`v0.6.12`, `v0.6.13`, `v0.7.0`, `v0.8.0`, `v0.9.0`). Use semver strictly. | S |
| `CSS-213` | feat | Validate source maps shipped with `rare.min.css`. | S |
| `CSS-250` | feat | **CDN + npm package** — see the `v0.7.13` npm Delivery milestone (`CSS-T01`). `v0.7.8` unblocks it; it ships at the end of `0.7.X` (2026-07-17). | L |

## Build / performance (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-210` | perf | **Moved to Lean Delivery** (2026-07-13; now `v0.7.6`): the downstream purge path ships much earlier, with the `.rd-is-*` / `.rd-js-*` safelist contract. | — |
| `CSS-220` | dx | GitHub Actions workflow: lint + build on every PR. (Visual regression joins later from the maintainer-infra track — `CSS-218`.) | M |

---

# Milestone `1.0.0` — Public Release

`1.0.0` is the **API promise**, not a feature checklist (see Key milestones): from this tag on, the public API is stable and breaking changes require a major bump.

**Definition of done:**

- [ ] All P0/P1 tasks from `0.7.X` / `0.8.0` / `0.8.1` / `0.9.0` are closed
- [ ] Zero invalid CSS values (stylelint clean); cascade layers in place, no `!important`
- [ ] Forms, buttons, focus-visible, sr-only, reduced-motion all shipped
- [ ] Semantic tokens (success/danger/warning/info, surfaces, motion) + `--signal` separate from `--brand-color`
- [ ] `rd-layout-longread` and `rd-layout-dashboard` documented and demoed against the no-layout default state; layout-agnostic primitives (panel, stat, table-dense, toolbar, app-shell) work in either layout and without any layout class
- [ ] Sibling-library integration finalized for `scripts/` and `charts/`
- [ ] The `.rd` scope gate holds: a page without `.rd` is untouched by the library, islands and page mode verified by the `CSS-338` fixture
- [ ] Zero third-party requests in the shipped CSS (fonts self-hosted since `v0.6.16`, icons via the `v0.6.18` SVG set)
- [ ] The downstream purge path (`CSS-210`, `v0.7.6`) is documented with its safelist contract — consumers can ship 15–30 KB
- [ ] README + STYLEGUIDE + CONTRIBUTING + CODE_OF_CONDUCT + THEMING + CHANGELOG + LICENSE + demo page
- [ ] The public API surface is explicitly defined in `CONTRIBUTING.md` (which classes / tokens / SCSS exports / filenames are semver-protected)
- [ ] CDN + npm package published (`CSS-T01` complete), SRI hashes, versioned pins everywhere
- [ ] CI green: lint + build on every PR
- [ ] `v1.0.0` tagged in git, GitHub Release notes published

**Explicitly not gating `1.0.0`** (see Continuous Tracks): the KSS docs site, auto-generated token reference, Style Dictionary exports, visual regression, Lighthouse CI, and full `/styles/` docs coverage. They land when they pay for themselves.

---

# Continuous Tracks — not release-gated

Standing work that advances opportunistically alongside releases (see Key milestones). Nothing in this section gates a version — including `1.0.0`.

## Documentation — fills as the library evolves

The documentation-driven audit policy (top of this file) stays the working method: first-pass docs tasks remain attached to their milestones (`CSS-080..085` in `v0.7.11`, `CSS-086`/`CSS-091` in `v0.7.10`, `CSS-090`/`CSS-092..094` across `0.8.0` / `0.8.1`) because writing them *is* the audit. Everything below is pace-free — no release waits for it.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-039` | docs | **(was the dissolved `v0.6.19` Documentation Skeleton Pressure milestone, 2026-07-13 — that number is now Auto-Shop Harvest & Examples.)** Keep stub and draft `/styles/` pages as intentional skeletons rather than hiding them. Formalize the policy for "SECTION ON RECONSTRUCTION" pages, decide the minimum honest content each skeleton must carry, and fix dead-nav edges such as `_data/tableOfContents.json` anchors pointing to sections that do not exist yet (for example `/styles/typography/interactive/#forms`). The goal is making unfinished docs usable as pressure/backlog surfaces, not about fully writing the pages. | S |
| `CSS-209` | docs | **(moved from `0.9.0`, 2026-07-13.)** **Module inventory + documentation audit.** Compile the canonical list of every CSS/SCSS module in the library, audit each one for current purpose / ownership / public API surface, and verify that each module is documented somewhere appropriate (`/styles/`, `STYLEGUIDE.md`, KSS reference, or maintainer docs). Audit the current docs structure too: identify missing module coverage, stale sections, modules documented in the wrong place, and pages that describe code no longer present. This is an intentionally long-running task: it can advance incrementally alongside other backlog work and should be updated whenever a module changes or a docs page is written. | L |

### `/styles/` content structure — finalization set (moved from `0.9.0`, 2026-07-13)

Public docs live under `/styles/` on raredigits.art. Organized **by user task**, not by SCSS file structure — readers shouldn’t need to know that `align/_align.scss` and `align/_flex.scss` are separate files. Each page combines: hand-written narrative (the *why*) + KSS-extracted class reference (the *what*) + live HTML examples (the *how*) + “see also” links to related tokens, components and integrations.

**First-pass write-ups happen earlier** — per the **Documentation-driven audit policy**, `CSS-080..086` (`v0.7.10`/`v0.7.11`) and `CSS-090..094` (`0.8.0` / `0.8.1`) cover the initial drafts. The `CSS-282..295` tasks below are **finalization**: integrate the KSS-extracted reference, fill the remaining edge pages (`getting-started`, `integration`, `reference`), and clean up anything still open from the earlier docs-audit passes.

**Existing folder reconciliation** — current `/styles/` already has stub folders that mostly map to this plan. The mapping below notes renames (`usage` → `getting-started`, `bricks` → `components`) and merges (`alignment` + `spaces` → `utilities`/`layout`). `/styles/idea/` and `/styles/modules/` are evaluated in `CSS-280`.

| ID | Path | Replaces / merges | Scope | Estimate |
|---|---|---|---|---|
| `CSS-280` | — | — | **Moved to Docs Site Restructure** (2026-07-17; now `v0.7.9`) — the IA decision now gates the docs-driven audit policy, so it is release-scheduled rather than pace-free. | — |
| `CSS-281` | `/styles/` | existing | Library landing page — **done in `CSS-200a`**. | — |
| `CSS-282` | `/styles/getting-started/` | renames `/styles/usage/` | Install (CDN / npm / SCSS), first component, opting into a layout (`rd-layout-longread` / `rd-layout-dashboard`), Hello World, checklist for production use (purge, fonts, focus styles). | M |
| `CSS-283` | `/styles/tokens/` | new | Auto-generated token reference from `dist/tokens.json` (depends on `CSS-271`). Categorized: color / spacing / typography / shadow / motion / surface. Includes the `--brand-color` vs `--signal` distinction explainer. | M |
| `CSS-284` | `/styles/layout/` | existing | Grid, containers, `fr` system, breakpoints, responsive prefixes (`mobile:` / `tablet:` / `desktop:`), `app-shell`. Includes the existing child page `/styles/layout/spacing/` (token reference, scale, utilities, aliases). | L |
| `CSS-285` | `/styles/typography/` | existing | Fonts, headings, body, lists (incl. `<dl>`), code, sidenotes, blockquote, captions, tables, text-content widths. Reads as a longread-style page by example. | L |
| `CSS-286` | `/styles/colors/` | existing | Palette overview, base / brand / supporting / blue families, `--signal` vs `--brand-color`, semantic tokens (`success` / `danger` / `warning` / `info`), link / text / bg utilities, contrast notes. | M |
| `CSS-287` | `/styles/elements/` | new | Buttons (variants, sizes, states, button-group, button-block), forms (inputs, checkbox, radio, select, validation states), toolbar. | L |
| `CSS-288` | `/styles/components/` | renames `/styles/bricks/` | The “what to reach for” page for product builders. Cards vs panels (decision rule + examples), stats, status indicators, badges, dense tables. | L |
| `CSS-289` | `/styles/navigation/` | existing | Header, sidebar, hamburger, search, tags, links, footer. | M |
| `CSS-290` | `/styles/decorations/` | existing | Borders, shadows, separators, icons, images, skeleton — each block opens with its Rareism rationale (ties to `CSS-142`). | M |
| `CSS-291` | `/styles/utilities/` | existing + merges `/styles/alignment/` | Display, alignment, flex, position, `sr-only`, `no-decoration`, `no-scrollbar`, resets. | M |
| `CSS-292a` | `/styles/layouts/` | new | Longread and Dashboard root-level modes: when each applies, what changes vs the defaults, mixed-content examples (KPI panel inside Longread, a longread essay inside the Dashboard shell). Explicit: defaults are not a layout — pages without a `rd-layout-*` class get the canonical rendering. | L |
| `CSS-292b` | `/styles/themes/` | existing | Keep the existing no-theme-switching stance. Add a pointer to the brand-override recipe from `THEMING.md` (`CSS-207`) for cases where a brand mandates a different palette. Rare cross-link to `/styles/layouts/` to clarify that themes ≠ layouts. | M |
| `CSS-293` | `/styles/integration/` | new | Wiring with Rare Scripts and Rare Charts. Per-script class/ARIA contracts, chart token consumption (depends on `CSS-230..244`). | M |
| `CSS-294` | `/styles/reference/` | new (or absorbs `/styles/modules/`) | Public API contract, semver policy, breaking-change rules, full module map, migration notes between major versions. Cross-link to `CONTRIBUTING.md`. | M |
| `CSS-295` | `/styles/special/` | existing | Cookie consent, collapsible, mockups, construction notice — narrow-purpose components that don’t fit other sections. Document as “opt-in for specific page types”. | S |

`CSS-203` (per-module live examples) is now **subsumed** by `CSS-282..295` — each docs page hosts its own live examples. Keep `CSS-202` (single-page demo) as the smoke-test artifact, separate from the docs site.

## Maintainer infrastructure — mostly post-1.0

Improves maintainer velocity and confidence, not the consumer contract. Lands whenever it pays for itself.

### KSS + auto-extracted reference (moved from `0.9.0`, 2026-07-13)

Hundreds of classes already exist; hand-written docs would rot immediately. The plan: **annotate sources with [KSS](https://github.com/kss-node/kss-node)-style comments**, generate the class reference automatically, and pair it with hand-curated examples. Token reference is fully auto-generated from `:root` (see “Token pipeline” below).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-260` | dx | Set up the docs site. Recommended stack: **kss-node** for class extraction + **Eleventy** (or Astro) shell for navigation, search, layout. The docs site itself is rendered with `rd-layout-longread` (it's prose-heavy reading). Output to `docs/` (separate from `dist/`). Dev server with hot reload. | L |
| `CSS-261` | docs | KSS-annotate `colors` module (base, brand, supporting, blue). Each color group gets one comment block with sample swatches. | S |
| `CSS-262` | docs | KSS-annotate `typography` module (fonts, headings, body, lists, sidenotes, text-content, tables). | M |
| `CSS-263` | docs | KSS-annotate `layout` module (grid, containers, spacing). Spacing utilities documented as **one table per family** (margin, padding, gap, …) — 200+ classes don’t need 200 entries. | M |
| `CSS-264` | docs | KSS-annotate `elements` (buttons, forms) and `bricks` (cards, sections). | M |
| `CSS-265` | docs | KSS-annotate `navigation` (header, sidebar, tags, links) and `decorations` (borders, shadows, separators, icons, images, skeleton). | M |
| `CSS-266` | docs | KSS-annotate `align` (flex, position, align), `utilities` (display, resets, breakpoints), and `special` (collapsible, cookie-consent, construction, mockups). | S |
| `CSS-267` | docs | KSS-annotate layouts (`rd-layout-longread`, `rd-layout-dashboard`) with side-by-side previews — including the no-layout default state for comparison. | M |
| `CSS-268` | dx | Docs site CI: build on every PR, deploy on tag to GitHub Pages at `https://raredigits.github.io/rare-styles/docs/`. Versioned URL per release (`/docs/v0.9.0/`, `/docs/latest/`). | M |
| `CSS-269` | docs | KSS authoring conventions in `STYLEGUIDE.md`: required fields, `Markup:` block format, modifier-class syntax, `Style guide:` hierarchy. So contributors annotate consistently. | S |

### Token pipeline (moved from `0.9.0`, 2026-07-13)

The library is already token-driven (CSS custom properties in `:root`). Formalize the pipeline so tokens can be auto-documented, exported to other formats, and validated against orphan references.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-270` | feat | **Token extractor**: parse `:root { --* }` blocks across `modules/**/*.scss`, emit `dist/tokens.json` in [W3C Design Tokens (DTCG)](https://www.designtokens.org/) format with categories (color / spacing / typography / motion / shadow / surface). Run as part of `build:css`. | M |
| `CSS-271` | docs | Auto-generate the token reference page in the docs site from `dist/tokens.json` — searchable table with name, value, category, computed sample (color swatch / spacing bar / shadow preview). | M |
| `CSS-272` | dx | **Token validator**: scan all SCSS for `var(--foo)` usages and fail the build if `--foo` is not declared anywhere. Catches the `--text-color` / `--warning-color` / `--grey-lightest` class of bugs at compile time. | S |
| `CSS-273` | feat | Multi-format token export via [Style Dictionary](https://amzn.github.io/style-dictionary/): emit `dist/tokens.scss` (SCSS map), `dist/tokens.js` (ES module), `dist/tokens.css` (standalone CSS file). Lets non-CSS consumers (JS charts, native apps) read the same source of truth. | M |
| `CSS-274` | docs | Token versioning policy section in `CONTRIBUTING.md`: renaming or removing a public token is a MAJOR bump; adding new tokens is MINOR; changing a value is MINOR (visual change) or PATCH (correction). | S |
| `CSS-275` | dx | Token diff tool: compare `dist/tokens.json` between two refs, output a human-readable changelog of token changes. Used for release notes. | S |

### Quality gates (moved from `0.9.0`, 2026-07-13)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-218` | dx | Visual regression on the demo page (Playwright + screenshot diff). Run in CI. | L |
| `CSS-219` | dx | Lighthouse check on the demo page in CI: a11y ≥ 95, performance ≥ 95. | M |

## Parked

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-066` | feat | **(parked — was the `v0.6.20` Rare Digits Media Kit Prep milestone, 2026-07-13.)** Prepare the Rare Digits media kit — build the reusable branding package around the vendor/logo surfaces introduced in earlier releases: logo variants, attribution snippets, and recommended links back to the Rare Styles library/repository. Scope is documentation and asset packaging, not a broader marketing-site redesign. | M |

---

# Open Questions — for discussion

Parking lot for questions that need a maintainer decision before they become (or close) tasks. Raised by the 2026-06-11 audit; review during planning, route each to its target milestone.

| # | Question | Context | Routes to |
|---|---|---|---|
| `Q-01` | Fate of `/styles/typography/interactive/` | IA conflict: the skeleton page (Links / Buttons / Forms) lives under typography, while the target IA puts buttons and forms under `/styles/elements/` (`CSS-086`, `CSS-287`). Merge, redirect, or delete — decide inside the `CSS-280` restructure plan. | `CSS-280` |
| `Q-02` | Is `CSS-200a` already done? | `/styles/index.md` already ships the positioning copy, jsDelivr install link, and manifesto framing that the task describes. Verify against the task scope, then close or re-scope it. | `0.9.0` docs |
| `Q-03` | Orphan public tokens | `--brand-color-rgb`, `--line-height-md`, `--link-color-light`, `--link-color-secondary` are declared but consumed nowhere in the library. Audit 2026-07-13 adds: `--font-size-md` duplicates `--font-size` (both `1rem`). Public API for consumers or leftovers? Feeds the token validator / reference work. | `CSS-270..272` |
| `Q-04` | Element-vs-class stance for buttons | `_buttons.scss` styles every native `button` globally (`display: block`, `width: fit-content`) — aggressive for embedded/consumer contexts. Decide whether the button system targets elements or only `.button` classes before building variants. (2026-07-21) `v0.6.21`'s layer split classifies bare-element button styling into the theme layer — excluded from `rare.embed.css` — which constrains but does not close this; the final stance lands with `CSS-040..046`; the selector invariant (Planning note, 2026-07-21) already fixes the embed half — bare-element styling never reaches `rare.embed.css`. (2026-10-02) Under the `.rd` gate (`Q-14`) native-element styling only applies inside `.rd`, so the embedding concern is gone; what remains is the default (does a bare `button` inside `.rd` get the system look, or only `.button`). | `CSS-040..046` / `v0.7.10` |
| `Q-05` | Font-loading philosophy after killing `@import` (`CSS-030`) | **Decided (2026-07-12): (a) batteries-included, self-hosted.** `rare.min.css` keeps `@font-face` pointing at self-hosted woff2 in `fonts/`; consumers bump the version and get the same families minus Google/waterfall, mitigated by `unicode-range` + shipping only the token-declared weights. Rejected (b) agnostic core + optional pack (breaking, silent system-font fallback). | ✅ `CSS-030` / `v0.6.16` |
| `Q-06` | Scope/sequencing of icon consolidation (`CSS-032`) | **Decided (2026-07-12): keep Material Symbols as one scoped `@import`** (weights 200/400), self-host only the text families, drop legacy `Material Icons` + `Material Icons Outlined`. Symbols stays Google-hosted → zero consumer icon migration. In-repo cut is clean (0 usages); the downstream `.material-icons` break (schnellreich.ru) is staged via `CSS-032a` and lands together with `CSS-030` in one release. | ✅ `CSS-032` / `v0.6.16` |
| `Q-07` | Dark-mode stance | **Decided (2026-07-13): dark-ready tokens, no switching.** Components move onto semantic/surface tokens and an official opt-in dark set ships (`CSS-169`); the library still ships no switcher; `THEMING.md` (`CSS-207`) documents the path. | ✅ `CSS-169` / `0.8.1` |
| `Q-08` | Tabs before 1.0? | **Decided (2026-07-13): harvest.** Tabs pulled from post-1.0 `CSS-305` into `0.8.0` as `CSS-149` — client projects already have them; accordion/stepper stay post-1.0. | ✅ `CSS-149` / `0.8.0` |
| `Q-09` | Site-only JS packaging | **Decided (2026-07-13): exclude.** `themeSwitcher`/`header-scroll`/`gridDisplay` are site glue, not companions; `themeSwitcher` may return after `CSS-169`. | ✅ `CSS-148` / `v0.7.3` |
| `Q-10` | `special/` library boundary | **Decided (2026-07-13): evict.** Mockups + construction leave the library, cookie-consent is tokenized, `.wa-button` per `CSS-026`. | ✅ `CSS-147` / `v0.7.1` |
| `Q-11` | `rd-` migration strategy | **Superseded (2026-10-02) by `Q-14`:** no namespace prefixes except `rd-icon-*` (and the scripts-contract `rd-js-*` / `rd-is-*`); every other class stays unprefixed and is scoped by the `.rd` gate. The gradual-cut plan (slices across `0.7.X`, slice map at `CSS-340`, `CSS-133`) is dropped. Was: *decided 2026-07-13 — gradual cut across `0.7.X`, bounded 2026-07-21 to complete by `v0.7.2`.* | ✅ superseded by `Q-14` |
| `Q-12` | Embed artifact: granularity and naming | **Dissolved (2026-10-02) by `Q-14`:** there is no embed artifact — one `rare.css`, gated by `.rd`. Was: *mechanism decided 2026-07-21 — a separate `rare.embed.css`; granularity and names open.* | ✅ dissolved by `Q-14` |
| `Q-13` | Does `rare.css` ever flip to embed-by-default? | **Answered (2026-10-02) by `Q-14`: yes, in `v0.7.0`** — `rare.css` itself becomes gated; a page without `.rd` is untouched, `<html class="rd">` restores today's rendering. One-line migration, recorded in the `CSS-340` table; consumers stay on version pins until they bump. | ✅ `Q-14` / `v0.7.0` |
| `Q-14` | Scope-class gate: styles apply only under `.rd` | Raised 2026-10-02 from sibling/consumer experience: `<html class="rd">` / `<body class="rd">` = whole page, `class="rd"` on any element = local island. **Decided (2026-10-02): `:where(.rd, .rd *)`** appended to gated selectors — includes the `.rd` root itself, zero specificity (rejected: `.rd h1` — misses the root and adds `0,1,0`; `:is(.rd, .rd *)` — would outrank consumers' own element rules in page mode; `@scope` — revisit post-1.0, newer browser support and proximity cascade). **Sub-question 1 — what is gated — decided (2026-10-02):** (a) **no namespace prefixes except icons** — `rd-icon-*` stays ungated (self-gated by name); **every other rule is gated by `.rd`**, classes included: a consumer with its own `.card` adds `rd` to the element (`<div class="card rd">`) and that's it. Documented caveat: the gate protects the host from the library, not the library from the host — the host's own `.card` rules still hit that element. (b) **Ungated globals:** `:root` tokens, `@font-face`, `@keyframes`, `rd-icon-*`. (c) **Island root gets tag styles only** — no base typography is transferred from `body`; an island inherits the host's font, color and line-height. (d) **Two gate kinds:** island gate `:where(.rd, .rd *)` for everything; **page gate** — `.rd` on `<html>`/`<body>` only — for page-shell element rules (`html`/`body` sizing and flex, fixed `header`, `main` padding, `article` grid placement, `section`, `footer`, `nav a`/`footer a`, …), so an island's `<header>`/`<article>` is plain semantic markup, not page chrome. The exact page-gated list comes from the `CSS-337` inventory. (e) `rd-js-*` / `rd-is-*` stay as the scripts-contract names; their CSS rules are gated by `.rd` like everything else. (f) **`rd-layout-*` names stay.** (g) **Mechanism: a PostCSS step after Sass** (`sass → rd-gate → rare.css`) appends the gate to the last compound of every selector (before any pseudo-element); exceptions live in one config (ungated + page-gated lists), module sources are untouched, and the same lists drive the `CSS-338` assertion "no ungated selector outside the allowed set". Prototype on the `v0.6.19` bundle: 4 084 selectors gated, 314 skipped (icons, `:root`); `rare.css` 435.9 → 505.3 KB raw but gzip 35.2 → 35.9 KB, brotli 23.1 → 23.8 KB (`rare.min.css` 363.5 → 433.0 KB raw, gzip 32.8 → 33.8 KB) — the raw-size budget stops being meaningful; `CSS-330`/`CSS-339` should budget transferred size. **Consequence, to review separately:** the `rd-` namespace migration is dropped — `CSS-133` slices, `CSS-141`, `Q-11`, the `CSS-340` slice map, the "built `rd-`-native" requirement on buttons/forms, and the `CSS-331` naming constraint all need re-planning. **Sub-question 2 — decided (2026-10-02): tokens stay on `:root`, names unchanged.** Name collisions with host tokens are resolved by load order — per the docs, client styles load after `rare.css` and win; no `--rd-*` prefix, no `.rd`-scoped declaration (rejected: declaring on the outermost `.rd` — isolates both ways, but moves the override point and breaks every `:root` override). **Sub-question 5 — decided (2026-10-02): explicit rule** — a layout mode needs `.rd` on the same element: `<html class="rd rd-layout-longread">`. `rd-layout-*` does not imply `.rd` (that would give the gate a second meaning); without `.rd` the layout class does nothing — documented, not silently compensated. **Sub-question 3 — moved to `v0.6.26` (2026-10-02):** `rem` sizing — inside islands, where it follows the host's root font-size, and across the library in general — is reviewed together with the Gutenberg/sibling review (`CSS-342`). **Sub-question 4 — decided (2026-10-02): no opt-out mechanism until a real case.** Nested `.rd` inside a `.rd` page is redundant but harmless (the gate already matches every descendant; tokens live on `:root`). The open case was the reverse — foreign non-iframe markup inside a `.rd` page picking up the reset, tag styles and colliding class names. Not built: most third-party widgets sit in an iframe or shadow DOM; no known case in the sibling projects; a `.rd-off` hole doubles every selector and its re-enable case needs `@scope (.rd) to (.rd-off)`, deferred post-1.0. **Documented workaround:** put `.rd` on your own containers (`<main class="rd">`, …) instead of `<html>` — at the cost of layout modes, which need `.rd` on `<html>`. **Sub-question 6 — plan impact — decided (2026-10-02):** no transitional artifact — the gate itself opens `0.7` as **`v0.7.0` Scope Gate** (breaking: `class="rd"` on `<html>`); `v0.6.19` is the last `0.6` release and the planned `v0.6.20`–`v0.6.26` move into `0.7.X` (renumbering map in the Planning note): `v0.7.1` sibling review right after the gate, then harvest, layouts, lean delivery, a separate **`v0.7.5` Prune** release for the icon/utility cuts, CDN, docs, interactive core, stabilization (with `CSS-141` as cleanup), data-view, and npm last (`v0.7.11`). `Q-12` dissolved, `Q-13` answered, `Q-11` superseded; `CSS-337` feeds the `CSS-343` gate config. **`Q-14` closed** except sub-question 3 (`rem`), which lives in `v0.7.1`. | ✅ `v0.7.0` (`CSS-337` / `CSS-343` / `CSS-338`); `rem` → `v0.7.1` |

---

# Post-1.0 Backlog

| ID | Type | Task | Notes |
|---|---|---|---|
| `CSS-300` | feat | Container queries (`@container`) for adaptive components | Currently everything is `@media`; CQ is more useful for a component library |
| `CSS-301` | feat | Animation library: `.fade-in`, `.slide-up`, micro-interactions | Built on the `--ease-*` / `--duration-*` tokens |
| `CSS-302` | feat | Extended color palette: 50–950 ramp per hue | Currently flat: light/base/dark |
| `CSS-303` | feat | Icon-set expansion or a Lucide / Heroicons adapter | Updated 2026-07-21: since `v0.6.18` the library ships its **own self-hosted SVG set** (no icon font, no Google requests); the post-1.0 evolution is expanding that set and/or an adapter for third-party sets on the same `rd-icon-*` API |
| `CSS-304` | feat | Toast / Modal / Tooltip / Dropdown components | HTML-only via `<dialog>` and `:popover-open` where possible |
| `CSS-305` | feat | Accordion / Stepper — Tabs pulled forward to `0.8.0` as `CSS-149` (decision `Q-08`, 2026-07-13) | Same |
| `CSS-306` | feat | RTL demo and tests after `CSS-135` | |
| `CSS-307` | dx | Figma plugin or `tokens.json` export (W3C Design Tokens) | Designer round-trip |
| `CSS-308` | feat | Additional layouts: `rd-layout-print`, `rd-layout-presentation`, `rd-layout-zen` | Built on the same layout infrastructure as Longread / Dashboard |
| `CSS-309` | feat | **Official Eleventy (11ty) theme built on Rare Styles** | Packaged starter/theme for 11ty sites; planned — candidate for its own release track separate from the library versioning. The `/styles/` docs shell and the KSS docs site (`CSS-260`) already run on Eleventy and can seed it |
| `CSS-310` | feat | Longread furniture: kicker/eyebrow pattern, hero/masthead, author byline/avatar, structural footer | Audit 2026-07-13 P2 batch |
| `CSS-311` | feat | Reading-progress indicator | Audit 2026-07-13 |
| `CSS-312` | feat | Pagination (article series) + breadcrumbs | Audit 2026-07-13 |
| `CSS-313` | feat | Empty-state / error-state pattern | Audit 2026-07-13 |
| `CSS-314` | feat | Safe-area insets (`env(safe-area-inset-*)`) for the fixed header and floating chrome | Audit 2026-07-13 |
| `CSS-315` | feat | Vertical-rhythm unit; hyphenation control for narrow columns | Audit 2026-07-13 |

---

## Release summary

| Version | Codename | Scope |
|---|---|---|
| `v0.6.12` | Cleanup & Delivery Hygiene | Lint/build cleanup batch, font-weight trim, Material Icons policy, reusable contact-button audit, vendor-icon CDN follow-up |
| `v0.6.13` | Reusable Asset Reshuffle | Micro-release for canonical reusable-image layout and downstream asset-surface stabilization |
| `v0.6.14` | Cross-Project Enrichment | Harvest and normalize reusable classes/patterns from adjacent projects already using Rare Styles |
| `v0.6.15` | Audit Hotfixes & Post-Harvest Cleanup | Bug-fix follow-up on top of `v0.6.14`: audit findings (`CSS-027..052`, with table bugs `CSS-053..055` already pulled forward), immediate downstream fixes, asset-path cleanup, and the narrow harvested additions `.boilerplate` / `.feature-row` |
| `v0.6.16` | Font Self-Hosting | Kill the render-blocking `@import` waterfall: self-host the four text families (relative `fonts/…` woff2, `unicode-range`, `swap`), keep one scoped Material Symbols import (weights 200/400), drop legacy Material Icons. Pulled forward from `v0.7.1` (`CSS-030` / `CSS-032`) |
| `v0.6.17` | Scripts Contract & Unified Rewrite | Audit and freeze the CSS↔scripts contract, adopt the `rd-` namespace (consuming `v0.7.0`), rewrite the five companion scripts onto `.rd-js-*` hooks / `.rd-is-*` states / baseline ARIA, and harvest the carousel from schnellreich.ru as the sixth script (`CSS-088`). **Breaking** — hard cut, downstream coordinated post-merge (version-pinned) |
| `v0.6.17_1` | Icon & Script Load Regression Patch | Revert Material Symbols to the light `/icon?family=` cut (~312 KB vs ~1.45 MB), add the self-host advisory to the `/scripts/` docs, queue the SVG icon-set overhaul (`CSS-095`/`CSS-096`) |
| `v0.6.17_2` | Audit Bug Patch | Code-level defects from the 2026-07-13 audit: `.gap-xl` token collision (`CSS-098`), invalid/dead declarations, sidenote glyph dup, `.row-mobile`/`.column-mobile` removal (breaking, unused), token/package hygiene (`CSS-099`/`CSS-106..109`/`CSS-115..117`); bundle 423.7 → 399.7 KB |
| `v0.6.18` | Icon Strategy | Drop the Material Symbols icon font; ship a library-owned SVG icon set with Apache-2.0 attribution (`CSS-095` / `CSS-096`) |
| `v0.6.19` | _current_ — **last `0.6` release** — Rare Scripts Polish & Copy Primitives | The companion Rare Scripts' polish pass: carousel `v1.1.0` (`CSS-325`) and `copy-to-clipboard` `v3.2.0` with the new `data-copy-text` payload + `.rd-is-copied` (`CSS-326`), distributed via the `rare-scripts@v3.2.0` tag (`CSS-327`, shipped scripts-first). Plus icon set 137→143 + copied-state check (`CSS-328`), the **breaking** `.copy-data-icon-inverted` → `--light` rename + `--pinned` (`CSS-329`), and the first worked example (`CSS-317`) at `/examples/styles/hetke/` — a demonstration on the library's existing primitives |
| `v0.7.0` | Scope Gate | **Breaking — the `0.7` entry.** Every style applies only under `.rd` (`Q-14`): `<html class="rd">` = today's page rendering, `class="rd"` on any element = island, no `.rd` = untouched. PostCSS `rd-gate` step (`CSS-343`) configured by the global-rule inventory (`CSS-337`); hostile-host fixture (`CSS-338`); reset stance (`CSS-078`); in-repo migration (`CSS-344`) and docs (`CSS-321`); transition gate `CSS-340` (API snapshot, migration table). Replaces the old `v0.6.21` Embed Build — no `rare.embed.css` |
| `v0.7.1` | Bug Closure & Safe Delivery | **Additive.** Dated bug ledger and closure sweep (`CSS-345`), invalid generated padding (`CSS-346`), quick-start API (`CSS-347`), validated version-triggered CSS publication (`CSS-348`), compiled-CSS + browser checks (`CSS-118`), h5/h6 rhythm + anchor offset (`CSS-126`/`CSS-129`), a11y base (`CSS-110..114`), size baseline (`CSS-339`). New 2026-10-07 (drafted 2026-09-07 as `v0.6.20`) |
| `v0.7.2` | Content Starter | **Additive.** Portable two-page starter for the data project — article index + article with images, tables and charts (`CSS-349..353`, `CSS-127`/`CSS-128`/`CSS-167`); launch gate for the new site. New 2026-10-07 (drafted 2026-09-07 as `v0.6.21`) |
| `v0.7.3` | Sibling Consumers Review | Test the data project and Gutenberg on the gated library, settle `rem` sizing, triage `gutenberg-test.md`, re-plan the rest of `0.7.X` (`CSS-342`). Was `v0.6.26` |
| `v0.7.4` | Auto-Shop Harvest & Examples | Promote the auto-shop's reusable patterns into the library (`CSS-316`, `CSS-331..336`) and re-lay the example on them (`CSS-333`). Was `v0.6.20` (opened, never shipped) |
| `v0.7.5` | Page Layouts | `rd-layout-longread` / `rd-layout-dashboard` on `<html class="rd rd-layout-…">` (`CSS-150`/`151`/`155`, `CSS-160..162`, `CSS-170..172`), docs + one real example per mode (`CSS-093`/`CSS-341`). Was `v0.6.22` |
| `v0.7.6` | Lean Delivery | **Additive** — size baseline (`CSS-339`), consumer coverage (`CSS-097`), purge path + safelist (`CSS-210`), utility and icon cut lists (`CSS-079`/`CSS-324`), transferred-size budget as no-regression ceiling (`CSS-330`), compiled-CSS smoke test (`CSS-118`). Was `v0.6.23` |
| `v0.7.7` | Prune | **Breaking, narrow** — execute the icon and utility cut lists (`CSS-324`/`CSS-079`), arm the hard transferred-size budget (`CSS-330`). New 2026-10-02 |
| `v0.7.8` | CDN Migration & Pages Sunset Prep | Docs/examples/consumers onto versioned jsDelivr targets (`CSS-T00`); asset-URL contract (`CSS-T00.1`); deprecate + freeze Pages. Was `v0.6.24` |
| `v0.7.9` | Docs Site Restructure | `/styles/` IA (`CSS-280`/`CSS-322`/`CSS-323`) before the interactive core fills it. Was `v0.6.25` |
| `v0.7.10` | Interactive Core | Button system (`CSS-040..046`), forms (`CSS-100..105`), semantic tokens + `--signal` (`CSS-121`/`CSS-124`), focus-ring repoint onto `--signal`; plain names under `.rd`. Was `v0.7.0` minus the namespace slice and the gate |
| `v0.7.11` | Stabilization & Core Polish | Quality infra, search overhaul, bounded list/utility API, library-boundary pass, `CSS-141` naming cleanup. Was `v0.7.1` minus the slice |
| `v0.7.12` | Data-View Primitives | Panel family, stat, dense table, status/badges, toolbar, alerts, dashboard example; extended-set candidates P2. Was `v0.7.2` minus the slice |
| `v0.7.13` | npm Delivery | **Finalizes `0.7.X`.** `@raredigits/rare-styles@0.7.13` from one release-gated artifact (`CSS-T01`); Pages unpublish after verification (`CSS-T00.4`/`.5`). Was `v0.7.3` |
| `0.8.0` | Components Harvest | Harvest the remaining components (tabs, TOC, card variants, skeleton, app-shell, narrative text set — `CSS-149`/`CSS-152..154`/`CSS-157`/`CSS-158`/`CSS-163`/`CSS-188`) from client projects, under plain names behind the `.rd` gate |
| `0.8.1` | Completeness: A11y & Architecture | A11y batch, surface/motion tokens, `@layer`, logical properties; audit additions (2026-07-13): fluid type, footnotes, table completeness, print, contrast modes, dark-ready tokens (`CSS-164..169`); forms moved to `v0.7.10`; namespace work dropped (`Q-14`) |
| `0.9.0` | Release Prep (slim) | Identity docs (README / STYLEGUIDE / CONTRIBUTING / LICENSE / THEMING), demo page, scripts/charts integration, tagging + basic CI — docs site and token pipeline moved to Continuous Tracks |
| `1.0.0` | Public Release | Stable public API |

---

Dissolved planning-stage milestones (never shipped): the `0.6`→`0.7` re-plan of 2026-10-02 moved `v0.6.20`–`v0.6.26` into `0.7.X` and dissolved `v0.6.21` Embed Build into `v0.7.0` Scope Gate (renumbering map in the Planning note); 2026-07-13: Documentation Skeleton Pressure (was `v0.6.19`) → `CSS-039` in the Documentation continuous track; Rare Digits Media Kit Prep (was `v0.6.23`) → `CSS-066`, parked.

---

# Shipped Milestones — archive

Reverse-chronological record of completed releases (newest first). Nothing here is planned work — the active roadmap lives above. Kept for task-ID lookups, decision history, and migration notes.

---

# Milestone `v0.6.19` — Rare Scripts Polish & Copy Primitives

**Goal:** ship the component work already sitting in `Changelog.md` `[Unreleased]` — it is written, tested and unassigned, and it contains a **breaking rename** that should not sit in a working tree waiting for a large harvest release. Scheduled ahead of `v0.6.20` (2026-07-17) for exactly that reason: the code is done, the harvest is an `L`, and mixing a class rename into a release called *Auto-Shop Harvest* would blur both.

**Status:** ✅ Shipped 2026-07-20 as **`v0.6.19`**. The companion Rare Scripts get their polish pass and the finished `[Unreleased]` work gets a version. All tasks (`CSS-325`/`CSS-326`/`CSS-328`/`CSS-329`) done; the release blocker `CSS-327` (`rare-scripts@v3.2.0`) is executed as **step 1** of shipping (scripts before styles — see the release steps). The first worked example (`CSS-317`) also lands here as a demonstration — but **the `v0.6.20` auto-shop harvest is not done** (no reusable pattern was promoted into the library), so that milestone stays open. Details in [`Changelog.md`](./Changelog.md) under `v0.6.19`.

**Scope rule:** this milestone **records completed work**. It exists so the unreleased changes get a version, a changelog heading and a downstream story — not to invite new scope. Anything not already in `[Unreleased]` on 2026-07-17 belongs to a later release.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-325` | feat | **Carousel `v1.1.0`** (`special/_carousel.scss`, `carousel.js`). Dots overlay the photo again and the caption aligns left; the root became a two-row grid (photo · caption) whose active slide spans both through `subgrid`, which is what gives the photo a box its siblings can anchor to. Ships `.carousel-dots--dark` for pale photos, makes the dots container optional, and fixes the arrows' ~32 px vertical skew. Markup contract unchanged — `v1.0.0` carousels need no edit. **Done.** | P0 | — |
| `CSS-326` | feat | **`copy-to-clipboard` `v3.2.0`** (`assets/js/copy-to-clipboard.js`). Adds `data-copy-text` (a literal payload — the only form that stays unambiguous when many hooks share a parent) and `.rd-is-copied` (a success state for carriers that are not the copy icon, since `data-icon` only ever drove `.copy-data-icon`). Both purely additive. Powers the click-to-copy glyph grids on `/styles/icons/`. **Done.** | P0 | — |
| `CSS-327` | chore | **Tag `rare-scripts@v3.2.0` and verify the CDN resolves.** `/scripts/copy-to-clipboard/` now advertises `cdn.jsdelivr.net/gh/raredigits/rare-scripts@v3.2.0/...` in two places (the meta-info row and the install snippet), per the house practice of moving the version pill and the pin together. **The tag does not exist yet, so those URLs 404 today** — this is the only task here that is not already done, and it is a release blocker: the docs are shipping a promise the distribution repo has not kept. Sync the built `copy-to-clipboard.min.js` to `raredigits/rare-scripts`, tag `v3.2.0`, then verify both documented URLs actually serve the new bytes. | P0 | S |
| `CSS-328` | feat | **Icon set 137 → 143 + copied-state feedback** (`decorations/_icons.scss`). Six maintainer-selected glyphs (`business_center`, `explore`, `filter_alt`, `people_alt`, `savings`, `work`) through the `fetch-icons.py` pipeline with the `$icons` mirror in lockstep; plus `[class*="rd-icon-"].rd-is-copied` → check swap, the visual half of `CSS-326`'s state hook. Feeds the `CSS-324` revision in `v0.6.22`: the set keeps growing by promotion, not measurement. **Done.** | P1 | — |
| `CSS-329` | feat | **Breaking: `.copy-data-icon-inverted` → `.copy-data-icon--light`**, plus the new `.copy-data-icon--pinned` (`decorations/_icons.scss`). The rename puts the class on the library's modifier convention (`--` modifies, `__` is for elements) and names it for the ink rather than the surface. Hard cut, no alias, per the `v0.6.17`/`v0.6.18` precedent. Both known consumers are version-pinned and render no copy icons of their own, so the sync breaks neither — but the migration line belongs in the release notes. **Done.** | P0 | — |

## Exit criteria

- [x] `rare-scripts@v3.2.0` is tagged and both documented CDN URLs serve the new bytes — **executed as release step 1 (scripts before styles)**
- [x] `Changelog.md` `[Unreleased]` closed under `v0.6.19`, with the `.copy-data-icon--light` migration line stated
- [x] Script version pills (`carousel` `v1.1.0`, `copy-to-clipboard` `v3.2.0`) agree with what the repo ships
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; bundle recorded (435.9 KB unminified — **over the 400 KB budget**, which `CSS-330` in `v0.6.22` finally enforces)

---

# Milestone `v0.6.18` — Icon Strategy

**Goal:** stop shipping a third-party icon *font* entirely and replace it with a small, library-owned **SVG** set. The `v0.6.17_1` font revert is a stopgap; this removes the Google dependency and the download weight for good. Supersedes the icon half of `CSS-087` (vendor-class sweep) and relates to the post-1.0 `CSS-303` (bundled icon set). Numbered `v0.6.18` on 2026-07-13 (was an unnumbered near-term milestone queued from `v0.6.17_1`); the CDN-migration scope previously holding this number moved to `v0.6.23`.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-095` | perf | **Drop Material Symbols support from the library.** Remove the Google `@import` (`_font-faces.scss`) and the `.material-symbols-outlined` / `symbol()` machinery once `CSS-096` ships the SVG replacements. No third-party icon font in the shipped `rare.css`. Coordinate the markup migration with `CSS-087`. | P1 | M |
| `CSS-096` | feat | **Ship a limited SVG icon set with the library.** Package the icons actually used across the ecosystem as inline/`<use>`-able SVGs under `assets/css/images/icons/**` (same public-asset contract as the vendor logos). Scope decision from the 2026-07-13 inventory below: the **library-core** set (used by Rare Styles' own components + docs) is small and mandatory; the **consumer-app** icons (mostly `raredigits.io` marketing UI) stay app-owned — the library ships the shared/core set, sites supply their own extras. **License:** Material Symbols is Apache-2.0 — redistribution of a modified subset (extracted SVGs) is permitted; ship `assets/css/images/icons/LICENSE` (Apache-2.0) + an attribution line, mirroring the font-license pattern from `v0.6.16`. | P1 | L |
| `CSS-119` | docs | **`/styles/icons/` documentation page — usage rules for the icon set.** First-pass page per the docs-audit policy: available glyph names (the shipped set), the one-class-per-icon markup API (`.rd-icon-<name>` / `.rd-icon-<name>-thin`), sizing (font-size drives the 1em mask box) and coloring (currentColor / tokens), the `icon()` / `icon-mask()` mixins for component-owned surfaces, and a user-facing "need an icon that isn't here?" path (Material Symbols font as a stopgap, Issue/PR to add it). The internal update pipeline (`scripts/fetch-icons.py` + `$icons`) stays in README/STYLEGUIDE, not the public page. Added 2026-07-14 by maintainer decision. | P1 | M |

> **Scope note (2026-07-14, maintainer decisions at implementation):** the shipped set is **137 glyphs × 2 weights (200/400)** — every icon supports both, as static per-weight SVG cuts fetched by `scripts/fetch-icons.py` (updatable pipeline; instructions in `assets/css/images/icons/README.md`). Additions over the 2026-07-13 core list: `bookmark` + `info` (inventory gaps — the library's own `.sidenote-bookmark` and `.boilerplate` draw them); an extended maintainer-selected batch (`star`, `star_half`, `bookmark_star`, `flag_2`, `keep`, `flight`, `delete`, `recycling`, `login`, `logout`, `key`, `key_vertical`, `diamond`, `function`, `chess_knight`); and the **ecosystem batch** — every glyph `schnellreich.ru` (7 rendered) and `raredigits.io` (94 rendered — static markup, data-driven demo templates, YAML menu data, legacy `.material-icons` spans) uses that wasn't already in the set, promoted by maintainer decision (2026-07-14) **superseding the "consumer icons stay app-owned" half of the 2026-07-13 split**: one collection, one pipeline, sites host no icons of their own (the 2026-07-13 io inventory undercounted — live sweep found 75 unique glyphs there). Rendering technique: `mask-image` + `currentColor` (not inline `<use>`), so existing color tokens keep working and the public markup API is **one self-contained class per icon** (`.rd-icon-<name>` / `-thin`; the glyph name is the class — no `data-icon` attribute to learn), generated per glyph because CSS `attr()` can't feed `url()`. `data-icon` survives only as `copy-to-clipboard.js`'s internal success-swap channel. The icon mixins live in `decorations/_icons.scss` (maintainer decision; `utilities/_symbols.scss` is deleted). Side effects: the wght-200 sidenote markers are thin again (the `v0.6.17_1` static-font tradeoff is repaid); `CSS-087`'s markup sweep and the bare-selector drop are fully absorbed here; the dead `.sidebar-icon.material-symbols-outlined` rule (`_sidebar.scss`) removed.

## Exit criteria

- [x] `rare.css` / `rare.min.css` make **zero third-party requests** (no Google `@import`; grep-clean of `fonts.googleapis`)
- [x] All 137 glyphs ship in both weights under `assets/css/images/icons/` with `LICENSE` (Apache-2.0) + `README.md` update instructions; `scripts/fetch-icons.py` regenerates the set
- [x] No `.material-symbols-outlined` in library CSS or site markup; `utilities/_symbols.scss` deleted; every icon surface (header, collapsible, carousel, sidenotes, boilerplate, copy button, section icons) renders from the SVG set
- [x] copy button's `content_copy` → `check` swap renders via the explicit `.copy-data-icon[data-icon="check"]` rule (the only surviving `data-icon` use)
- [x] `/styles/icons/` page published (`CSS-119`); typography-page icon section rewritten against the shipped reality
- [x] Downstream consumers (`schnellreich.ru`, `raredigits.io`) migrated in lockstep: markup on the `.rd-icon-<name>` class API (incl. `io` data-driven templates + YAML data + app-CSS selectors repointed to `[class*="rd-icon-"]`), jsDelivr pins bumped to `v0.6.18`; every rendered glyph cross-checked against the generated class set (both were version-pinned, so nothing breaks on sync; `io` additionally moves off the pre-contract script hooks its `v0.6.15` pin still used)
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; bundle re-measured against the 400 KB budget (`CSS-T01.7`) with the delta explained

### Icon inventory (2026-07-13, across `raredigits.art` / `schnellreich.ru` / `raredigits.io`)

58 unique Material Symbols glyphs in use. `art` marks the library's own component/doc surfaces (the mandatory core); `io` is dominated by app-level marketing icons.

| Glyph | art | sch | io |
|---|:--:|:--:|:--:|
| `account_circle` | | | ✓ |
| `arrow_forward` | | | ✓ |
| `arrow_outward` | ✓ | | ✓ |
| `attach_file` | ✓ | | |
| `bedtime` | | | ✓ |
| `bolt` | ✓ | | |
| `bookmark` | | ✓ | |
| `call` | | | ✓ |
| `celebration` | | | ✓ |
| `check` | ✓ | | |
| `check_circle` | | | ✓ |
| `chevron_left` | ✓ | | |
| `chevron_right` | ✓ | | |
| `close` | ✓ | | ✓ |
| `code` | ✓ | | |
| `cognition` | ✓ | | |
| `construction` | ✓ | ✓ | ✓ |
| `content_copy` | ✓ | | |
| `currency_exchange` | | | ✓ |
| `dashboard` | | | ✓ |
| `description` | ✓ | | |
| `download` | ✓ | | |
| `drafts` | | | ✓ |
| `error` | | | ✓ |
| `favorite` | | | ✓ |
| `festival` | | | ✓ |
| `file_download` | | | ✓ |
| `flag` | | | ✓ |
| `folder_open` | | | ✓ |
| `forum` | | | ✓ |
| `groups` | | | ✓ |
| `handshake` | | | ✓ |
| `hub` | | | ✓ |
| `inbox` | | ✓ | |
| `info` | | | ✓ |
| `insert_drive_file` | | ✓ | |
| `keyboard_arrow_down` | ✓ | | |
| `lightbulb_2` | ✓ | | |
| `mail` | | | ✓ |
| `menu` | ✓ | | |
| `north_east` | | | ✓ |
| `notifications` | | | ✓ |
| `notifications_active` | | | ✓ |
| `open_in_new` | ✓ | ✓ | |
| `pause_circle` | | | ✓ |
| `person_add` | | | ✓ |
| `psychology` | | ✓ | |
| `radio_button_unchecked` | | | ✓ |
| `read_more` | | | ✓ |
| `remove_circle` | | | ✓ |
| `rss_feed` | | | ✓ |
| `search` | ✓ | | ✓ |
| `smart_toy` | | | ✓ |
| `sms` | | | ✓ |
| `south_west` | | | ✓ |
| `subdirectory_arrow_right` | ✓ | ✓ | |
| `trending_down` | | | ✓ |
| `tune` | | | ✓ |
| `warning` | | | ✓ |

**Library-core set to ship** (`art` column — the icons Rare Styles' own components/docs render, so they must exist in the SVG set): `arrow_outward`, `attach_file`, `bolt`, `check`, `chevron_left`, `chevron_right`, `close`, `code`, `cognition`, `construction`, `content_copy`, `description`, `download`, `keyboard_arrow_down`, `lightbulb_2`, `menu`, `open_in_new`, `search`, `subdirectory_arrow_right`. The `sch`/`io`-only glyphs are consumer-owned and out of the library set unless promoted. **Forward additions (2026-07-13):** `arrow_drop_up` / `arrow_drop_down` — the ▲/▼ delta triangles consumed by the `v0.7.2` delta chip (`CSS-177`) and the `.stat` delta states (`CSS-184`); not in the usage inventory yet, added to the SVG set ahead of need.

---

# Milestone `v0.6.17_2` — Audit Bug Patch

**Goal:** clear the code-level defects surfaced by the 2026-07-13 four-slice audit. Strictly bugs and zero-render-change hygiene, per the `_1`/`_2` bug-fix release discipline — no features, no API additions. Everything larger from the audit was routed into the milestones below in the same planning pass (see the planning note).
**Status:** ✅ shipped 2026-07-13 — all nine tasks done; side effect: `rare.css` 423.7 → 399.7 KB unminified (first time under the 400 KB `CSS-T01.5` budget), mostly from the invalid generated utilities removed with `CSS-098`. Details in [`Changelog.md`](./Changelog.md). Note on `CSS-106`: the audit's "global `td` leak" turned out to be a non-bug (Sass scopes every selector of a nested list) — landed as cosmetic cleanup, compiled output unchanged.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-098` | bug | **`.gap-xl` / `.gap-xxl` resolve to the wrong token.** Gap utilities are generated in three places (`_grid.scss:202`, `_spacing.scss:140`, `_spacing-aliases.scss:207`); the alias layer maps `xl→lg` and is forwarded last, so `.gap-xl` silently computes to the *smaller* `--space-lg` and `.gap-xxl` to `--space-xl`. Decide the canonical winner (likely: the alias layer must not re-emit names that exist canonically), de-duplicate the generators to one source, browser-verify computed values. Coordinates with `CSS-079` / `CSS-137` but does not wait for them — this is the wrong-behavior slice only. | P0 | S |
| `CSS-099` | bug | **Invalid `min-width: none`** in `_sidenotes.scss:29` — silently dropped by the browser; replace with `0`/`auto` per the original intent. | P1 | S |
| `CSS-106` | bug | **`.table-bordered` nesting bug**: `& th, td` (`_tables.scss:137`) — the comma breaks nesting, so `td` matches globally instead of scoped. Scope both selectors; sweep the file for the same loose pattern (`_tables.scss:150-158`). | P1 | S |
| `CSS-107` | bug | **`.row-mobile` / `.column-mobile` are byte-identical to `.row` / `.column`** (`align/_flex.scss:5-13`) — no media query; the suffix promises responsive behavior that does not exist. Audit in-repo + downstream usage, then either implement the intended mobile behavior or remove (breaking — record in `Changelog.md`). | P1 | S |
| `CSS-108` | bug | **Three sidenote selectors emit the same `attach_file` glyph** — `.sidenote-bookmark`, `.sidenote-attach`, `.remark` (`_sidenotes.scss:136-143`); copy-paste leftover. Give bookmark and remark their intended glyphs. | P2 | S |
| `CSS-109` | chore | **`h1` hardcodes `3.5rem`** (`_headings.scss:6`), bypassing the `--font-size-*` scale — align with the token system without visual change. | P2 | S |
| `CSS-115` | chore | **`--brand-color` and `--matrix` are both `#00ff4e`** (`_brand.scss:2`, `_supporting.scss:14`) — decide the canonical owner; alias or remove the duplicate (removal breaks `.matrix*` classes — audit usage first). | P2 | S |
| `CSS-116` | chore | **De-duplicate the color-class generator.** The `.x` / `.x-bg` / `.x-link` `@each` block is copy-pasted across all four color files with interpolation drift (`_base.scss:50`, `_blue.scss:13`, `_brand.scss:14`, `_supporting.scss:33`) — extract one shared mixin. Pure refactor: rendered output must not change. | P2 | S |
| `CSS-117` | chore | **Fix the public package mislabel.** `package.json` claims `version: 1.0.0` (contradicts `v0.6.17_1` and the 1.0-as-API-promise strategy) and `main: index.js` points to a file that does not exist. Align the version with `_data/versions.js` reality; fix or remove the dead `main` entry. | P1 | S |

## Exit criteria

- [x] `.gap-xl` / `.gap-xxl` compute to `--space-xl` / `--space-xxl` — browser-verified 48px / 96px; the gap family is generated only by `_spacing.scss` (grid duplicate removed, alias map reduced to non-colliding `s/m/l`)
- [x] No invalid declarations from the audit remain — `min-width: none` → `0` (verified: remark min-width 173px desktop → 0px mobile); bonus: ~50 invalid alias longhands (`gap-top`, `width-top`, …) removed
- [x] `td` scoping verified a non-bug: Sass always compiled `.table-bordered th, .table-bordered td`; nesting normalized cosmetically, compiled output identical
- [x] `.row-mobile` / `.column-mobile` removed (zero usage across the three known consumers) with a `Changelog.md` breaking record
- [x] Pure-refactor items produce no rendered-output change — color classes byte-identical (33 `-link` rules before/after), `h1` computed 56px via the new `--font-size-xxxl`
- [x] `package.json`: `0.6.17`, `private: true`, dead `main` removed
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`

---

# Milestone `v0.6.17_1` — Icon & Script Load Regression Patch

**Goal:** bug-fix patch on top of `v0.6.17` — the release regressed load speed on the downstream sites (heavy icon font + per-script CDN round-trips). Fix the font weight now; queue the deeper icon-strategy overhaul. Per release discipline this is the `_1` patch, not a hotfix into `v0.6.17`.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-089` | perf | **Revert Material Symbols to the light `/icon?family=` cut. ✅ Done.** `_font-faces.scss` loaded the css2 variable font over `wght 200..400 + opsz 20..48 + FILL/GRAD` (**~1.45 MB**); reverted to the legacy `@import 'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined'` — a single static wght-400 cut (**~312 KB, 4.6× lighter**), the `v0.6.15` shape. Tradeoff (accepted): the thin sidenote markers (`_sidenotes.scss`, `font-variation-settings: wght 200`) now render at the static 400 — variation settings are ignored on a static font. | P0 | S |
| `CSS-090` | docs | **Self-hosting advisory on every `/scripts/` page. ✅ Done.** Per-script CDN loads add cross-origin round-trips. Added `_includes/special/self-host-notice.njk`, injected by `_layouts/page.njk` when `section == "Scripts"` (one edit → all six pages, works even under the search page's `templateEngineOverride: md`). Recommends downloading + self-hosting for production; CDN links kept for trials. | P1 | S |

**Out of scope (handled downstream by the maintainer):** repointing the consuming sites' own font `@import`s off the CDN — the library change lightens the shared cut; each site drops its extra font round-trips itself.

## Exit criteria

- [x] `_font-faces.scss` loads the legacy `/icon?family=` Material Symbols cut; `rare.css` / `rare.min.css` rebuilt; still exactly one `@import`
- [x] Self-host advisory renders on all six `/scripts/` pages and nowhere else
- [x] `npm run lint:css` clean; icon glyphs still render (browser-verified: search, hamburger, collapsible, carousel arrows)

---

# Milestone `v0.6.17` — Scripts Contract & Unified Rewrite

**Goal:** freeze the contract between Rare Styles CSS and the companion `/scripts/` JS set — and act on it in the same release: adopt the `rd-` namespace and rewrite the five companion scripts onto one unified hook/state/ARIA mechanism while the script surface is still small (~230 lines across five files).

**Scope decision (2026-07-12):** originally an audit-and-documentation-only release; expanded by maintainer decision to include the full rewrite — unifying five tiny scripts now is cheaper than migrating more consumers and markup later. Consequences:

- `v0.7.0` (Namespace Foundations, `CSS-060..063`) is **pulled forward and consumed here** as `CSS-067` — shipping `.rd-js-*` / `.rd-is-*` classes without the namespace policy would create a de-facto namespace with no contract.
- The JS-migration half of `CSS-230` (`0.9.0`) is pulled forward into `CSS-068`; `CSS-230` shrinks to a finalization pass.
- **Hard cut, no dual-hook window** (same playbook as `CSS-032a`): old hooks (`.collapsible-trigger`, `.hamburger` + `.active`, `#cookie-notice`, `#search-button`, …) are removed from JS, and their state selectors from CSS, in one release. Downstream coordination is `CSS-071`. (Revised during the audit: both consumers pin the CSS by version, so the CDN cut is version-gated — migrations landed safely **after** merge rather than before.)
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
| `CSS-071` | chore | **Downstream hard-cut coordination.** Audit done (2026-07-12/13): **both** known consumers pin the CSS by version, so the cut is version-gated and breaks neither on merge — the pre-merge urgency from the original scope note is downgraded. Deliverables: (a) publish the rewritten scripts to `raredigits/rare-scripts` and tag `v3.0.0` (doc pages already reference the `@v3.0.0` pins — must exist before this branch merges; min builds for the CDN are produced at publish time); (b) **schnellreich.ru** — migrate old JS copies of `hamburger`/`cookie-consent`/`search`/`carousel`, markup hooks in `header.njk` / `hamburger.njk` / `cookie-consent.njk` / `main-header.njk`, one legacy `collapsible-trigger` in `legacy/happyness`, and old `.carousel-img`/`.carousel-arrow.left` carousel markup in 5 posts (see `CSS-088`), in the same commit as its pin bump `@v0.6.16 → @v0.6.17`; (c) **raredigits.io** — narrower: migrate `hamburger` + `cookie-consent` only (JS copies + old markup `icon-menu`/`icon-close`, `#cookie-notice`/`#cookie-notice-accept`), bump pins `@v0.6.16 → @v0.6.17` (and the corsair demo `@v0.6.15 → @v0.6.17`), refresh the layered local `/assets/css/rare.css`; (d) ✅ re-pinned the cookie-consent include here from local source to the `rare-scripts@v3.0.0` CDN build (2026-07-13). **✅ All deliverables complete (2026-07-13):** (a) `rare-scripts@v3.0.0` published + on CDN; (b) schnellreich.ru migrated (all five components + carousel in 5 posts + `sch_styles.css` de-duplicated) and merged, pin bumped `@v0.6.17`; (c) raredigits.io migrated (hamburger + cookie, pins `@v0.6.16`/`@v0.6.15 → @v0.6.17`); (d) cookie re-pinned. Both consumers browser-verified end-to-end against the live CDN. | P0 | M |
| `CSS-088` | feat | **Harvest the image carousel from schnellreich.ru. ✅ Done (2026-07-13, scope addition).** Rebuilt directly on the contract as the sixth companion script: `assets/js/carousel.js` (hooks `.rd-js-carousel` / `-track` / `-prev` / `-next` / `-dots`, state `.rd-is-active`, arrow-key navigation, `role`/`aria-roledescription`, per-instance init — **fixes the source's real multi-instance bug**, where every image on the page fell into one shared index), `special/_carousel.scss` (tokenized, recolorable `--carousel-*`, dots in flow below the carousel), `/scripts/carousel/` doc page. Modernization: a slide is a `<figure>` with an optional `<figcaption class="carousel-caption">`, so captions travel with their images. Enabler added along the way: `_includes/scripts.njk` supports per-page script loading via `scripts: [carousel]` front matter. Downstream markup migration is folded into `CSS-071` (b). | P1 | M |

## Exit criteria

- [x] `SCRIPTS_CONTRACT.md` documents both the as-was contract per script (audit) and the unified target contract (hooks, states, ARIA), regression-tested by `test/scripts-contract.test.js`
- [x] `STYLEGUIDE.md` carries the `rd-` namespace policy: three rules + `CSS-133` migration note
- [x] All six scripts (five rewritten + the `CSS-088` carousel harvest) find DOM via `.rd-js-*` hooks only, express state via `.rd-is-*` classes only, and carry `aria-expanded` / `aria-controls` where a trigger toggles content; zero inline `style.display` for UI state
- [x] Legacy hooks and state selectors are gone from JS, CSS, and in-repo markup — hard cut, no aliases
- [x] `CSS-047` resolved as part of the collapsible contract (final form: outdent family resets to the card's content width — see the task row)
- [x] The six `/scripts/` doc pages match the shipped scripts (live demos + ready-to-paste snippets, browser-verified)
- [x] Downstream deliverables complete (`CSS-071`, 2026-07-13): `rare-scripts@v3.0.0` published and tagged, schnellreich.ru and raredigits.io migrated with their pin bumps, cookie-consent include re-pinned to the CDN — **all `v0.6.17` exit criteria met, release complete**
- [x] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`
- [x] Out-of-scope boundaries honored: no Pagefind UI rebuild, no full a11y batch, no cookie-consent UX changes (the anti-FOUC init-order fix is a bug fix, not a UX change)

---

# Milestone `v0.7.0` — Namespace Foundations — **consumed by `v0.6.17`**

**Dissolved (2026-07-12):** the entire scope (`CSS-060..063`) was pulled forward into `v0.6.17` as `CSS-067`, because the script rewrite ships `.rd-js-*` / `.rd-is-*` classes and the namespace policy must land with them, not after. The version number was retired at the time. **Update 2026-07-13:** the number was revived for the new `v0.7.0` — Interactive Core & `rd-` Migration Start (see the active roadmap); this stub records only the original dissolution.

| ID | Resolution |
|---|---|
| `CSS-060` | Moved to `v0.6.17` (`CSS-067`) — `rd-` adopted as the official prefix; existing component classes stay unprefixed until `CSS-133` |
| `CSS-061` | Moved to `v0.6.17` — `.rd-is-*` reserved; `.rd-is-active` / `.rd-is-hidden` / `.rd-is-open` ship as real classes consumed by the rewritten scripts (`.rd-is-loading`, `.rd-is-disabled` stay documented convention) |
| `CSS-062` | Moved to `v0.6.17` — `.rd-js-*` reserved, never styled; five concrete hooks ship (`.rd-js-collapsible`, `-cookie-consent`, `-copy`, `-hamburger`, `-search`); `.rd-js-dropdown` stays a documented reservation |
| `CSS-063` | Moved to `v0.6.17` — namespace policy lands in `STYLEGUIDE.md` with the `CSS-133` migration note |

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

# Milestone `v0.6.15` — Audit Hotfixes & Post-Harvest Cleanup

**Goal:** ship a tight follow-up patch to `v0.6.14` that clears the audit findings from 2026-06-06 and 2026-06-11 and absorbs the first post-harvest fixes discovered immediately after release. Scope is strictly bugs, small hygiene fixes, asset-path cleanup, and narrowly scoped harvested selectors that are already needed downstream. Nothing from this list is hotfixed into `v0.6.14` — the harvest release stays liftable.
**Status:** ✅ shipped — all scoped items resolved, exit criteria met, `npm run lint:css` clean, `rare.css` / `rare.min.css` rebuilt.

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

# Milestone `v0.6.13` — Reusable Asset Reshuffle

**Goal:** publish a tiny follow-up release that stabilizes the reusable image surface for Rare Styles after the library-facing asset reshuffle.
**Status:** ✅ shipped

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

# Milestone `v0.6.12` — Cleanup & Delivery Hygiene

**Goal:** ship the next technical cleanup release without breaking the shared-library ergonomics: reduce CSS noise, clarify build/lint workflow, trim waste in font/icon loading, and prepare reusable external assets for downstream projects.
**Status:** ✅ shipped

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
