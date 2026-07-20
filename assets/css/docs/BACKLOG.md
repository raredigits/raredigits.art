# Rare Styles — Backlog & Roadmap

**Current version:** resolved from [`_data/versions.js`](../../../_data/versions.js) → `styles`. Do not hardcode version numbers in this header — they rot.
**Public release target:** `1.0.0`

**Positioning:** `Rare Styles` is a narrow professional CSS library for clarity-first longreads and decision-first data views. It is not a general-purpose CSS framework and not a Tailwind/Bootstrap competitor.

## Key milestones — why we're doing this

The destination is **`1.0.0` — a public, narrowly-positioned CSS library** (see Positioning above). `1.0.0` is a **semver promise, not a feature checklist**: a stable public API, installable via npm/CDN, honestly documented. Everything between here and there serves one of five strategic waypoints:

| # | Waypoint | Why | Carried by | Status |
|---|---|---|---|---|
| 1 | **Own the runtime surface** — zero third-party requests in the shipped CSS | No render-blocking waterfalls, no Google dependency, stable long-term rendering for consumers | Self-hosted fonts (`v0.6.16` ✅) · scripts contract + `rd-` namespace (`v0.6.17` ✅) · library-owned SVG icon set (`v0.6.18` Icon Strategy — next) | in progress |
| 2 | **Lean delivery** — consumers pay only for what they use | Observed reality (2026-07): consumers use 10–20% of the library, and `rare.css` is the main load bottleneck on their sites. The library must stop being the tax on its own ecosystem | Icon font → SVG (`v0.6.18`) · embedded-first split so consumers stop paying for a page shell (`v0.6.21`) · coverage measurement + downstream purge path + utility-matrix prune + icon-set revision (`v0.6.22` Lean Delivery: `CSS-097` / `CSS-210` / `CSS-079` / `CSS-324`) · bundle budget owned and enforced in Lean Delivery (`CSS-330`, moved out of the npm milestone 2026-07-17 so nothing waits on publish to notice) | next |
| 3 | **Own the distribution** — versioned, immutable delivery everywhere | Consumers pin versions and never break; the library is installable without touching our repos | CDN migration + Pages sunset (`v0.6.23`) · npm delivery (`v0.7.3`, `CSS-T01`) — moved to the end of `0.7.X` on 2026-07-17 so the package publishes an API the `0.7.X` breaking passes are done with | queued |
| 4 | **Stabilize & complete the core** — the two declared use cases work end-to-end | A trustworthy foundation: zero invalid CSS, real buttons/forms, a11y, semantic tokens. Story/Dashboard layouts are **harvested** from client projects where they are already nearly built, not designed from scratch | auto-shop harvest (`v0.6.20`) · embedded-first boundary (`v0.6.21`) · `v0.7.0` Interactive Core & `rd-` migration start · `v0.7.1` Stabilization · `v0.7.2` Data-View Primitives · `0.8.0` Layouts & Components Harvest · `0.8.1` Completeness (the `rd-` migration cuts gradually across `0.7.X`, `Q-11`) | planned |
| 5 | **`1.0.0` — the API promise** | The semver commitment itself: freeze the public API, publish, stop breaking consumers | Slim `0.9.0` (identity docs, sibling integration, tagging, basic CI) → `1.0.0` | planned |

**Continuous tracks — explicitly not release gates:**

- **Documentation** fills as the library evolves. The documentation-driven audit policy below stays as a working method (writing a module's page is how it gets audited), but no milestone — including `1.0.0` — is gated on docs completeness.
- **Maintainer infrastructure** (KSS docs site, token pipeline / Style Dictionary exports, visual regression, Lighthouse CI) improves maintainer velocity, not the consumer contract — it lands whenever it pays for itself, mostly post-1.0.

Rule of thumb: a task that doesn't visibly serve one of these waypoints should be questioned before it is scheduled.

> **Revision note (2026-07-17):** release plan re-cut again. Three new releases take the nearest slots: `v0.6.19` **Component Polish & Copy Primitives** — the work already finished and sitting unassigned in `Changelog.md` `[Unreleased]`, including a breaking class rename; it had no version, and the alternative was parking finished code behind an `L`-sized harvest — then `v0.6.20` **Auto-Shop Harvest & Examples** and `v0.6.21` **Embedded Library**. Everything behind them shifts by three: Lean Delivery `v0.6.19` → **`v0.6.22`**, CDN Migration `v0.6.20` → **`v0.6.23`**. `v0.6.24` **Docs Site Restructure** is new and promotes `CSS-280` out of Continuous Tracks. **npm Delivery leaves the `0.6.x` run entirely**: `v0.6.21` → **`v0.7.3`**, finalizing the `0.7.X` series instead of preceding it — the API npm publishes is the one `v0.7.0`–`v0.7.2` are still breaking, so shipping the package first would have published a promise the roadmap intends to break three more times. Ordering constraints behind the shape: Embedded Library must precede Lean Delivery (extracting theme/containers changes what is in the bundle, so coverage measured before it would be measuring a bundle that no longer exists) and must follow the harvest (its exit criterion is a rebuild of that site). The **400 KB bundle budget** moves too: it lived inside the npm packaging task (`CSS-T01.5`), so sending npm to the end of `0.7.X` would have left the one number Lean Delivery exists to move unenforced for four releases — it becomes `CSS-330`, owned and checked in `v0.6.22`. Two stale references are left alone on purpose, both in the shipped `v0.6.18` changelog entry: it calls the prune `v0.6.19` (the plan at ship time — the mapping is here), and it cites `CSS-T01.7` for the budget, which is really the SRI task.
>
> **Revision note (2026-07-14):** the parallel `CSS-T01` distribution track is promoted to the concrete `v0.6.21` **npm Delivery** release immediately after `v0.6.20` (numbers as decided that day; both moved on 2026-07-17 — see the note above). The package ships as `0.x`; npm availability does not imply the `1.0.0` API promise.
>
> **Earlier revision (2026-07-13):** waypoints revised and the release plan reflowed in the same pass. Versions `v0.6.18` / `v0.6.19` / `v0.6.20` re-cut (Icon Strategy / Lean Delivery / CDN Migration & Pages Sunset); the old monolithic `0.8.0` split into `0.8.0` Layouts & Components Harvest + `0.8.1` Completeness; `0.9.0` slimmed; docs and maintainer infra moved to the **Continuous Tracks** section; `1.0.0` redefined as the API promise. Dissolved planning-stage milestones: Documentation Skeleton Pressure (→ `CSS-039`, docs track), Rare Digits Media Kit (→ `CSS-066`, parked).

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

- Source of truth for the current released library version: `_data/versions.js` (`styles`). Codenames live in the Release summary table (end of the active roadmap, right before the archive) — no duplicate version claims elsewhere in this file.
- Current released library version: `v0.6.18` (`Icon Strategy`) — Material Symbols font dropped for a library-owned SVG set; **zero third-party requests** in the shipped CSS. Changes recorded in [`Changelog.md`](./Changelog.md).
- Current release (shipping now): `v0.6.19` (`Rare Scripts Polish & Copy Primitives`) — the companion Rare Scripts' polish pass (carousel `v1.1.0`, `copy-to-clipboard` `v3.2.0` with the new `data-copy-text` payload), icon set 137→143, the breaking `.copy-data-icon--light` rename, and the first worked example. Ships after `rare-scripts@v3.2.0` is tagged (`CSS-327`, scripts-before-styles). **`v0.6.20` (Auto-Shop Harvest) stays open** — the example rode existing primitives; no reusable pattern was promoted into the library yet.
- Release sequence re-cut on 2026-07-13 (waypoint revision) and again on 2026-07-17 (auto-shop harvest + embedded-first split inserted, docs restructure promoted, npm moved to the end of `0.7.X`) — see the revision notes under Key milestones.
- Then: `v0.6.18` — **Icon Strategy**: drop the Material Symbols font entirely (`CSS-095`), ship a library-owned SVG set (`CSS-096`).
- Then: `v0.6.19` — **Component Polish & Copy Primitives**: version the finished `[Unreleased]` work (carousel `v1.1.0`, `copy-to-clipboard` `v3.2.0`, icon set 137→143, the breaking `.copy-data-icon--light` rename), and tag `rare-scripts@v3.2.0` so the copy-doc CDN link stops 404-ing (`CSS-327`).
- Then: `v0.6.20` — **Auto-Shop Harvest & Examples**: harvest the reusable slice of the auto-repair-shop project (`CSS-316`) and make it the docs' first end-to-end worked example (`CSS-317`).
- Then: `v0.6.21` — **Embedded Library**: theme layer (`CSS-318`) and global containers (`CSS-319`) move behind an opt-in quick-start set (`CSS-320`, naming open per `Q-12`), so the library is embeddable by default and a page framework only on request. Proved by rebuilding the `v0.6.20` auto-shop site.
- Then: `v0.6.22` — **Lean Delivery**: consumer coverage measurement (`CSS-097`), downstream purge path with safelist contract (`CSS-210`), spacing-utility matrix prune (`CSS-079`), icon-set revision against the coverage data (`CSS-324`).
- Then: `v0.6.23` — **CDN Migration & Pages Sunset** (the scope previously numbered `v0.6.18`).
- Then: `v0.6.24` — **Docs Site Restructure**: settle the `/styles/` IA (`CSS-280`, promoted out of Continuous Tracks) and land it (`CSS-322`/`CSS-323`) before `v0.7.0` starts writing first-pass pages into it.
- Then: `v0.7.0` — **Interactive Core & `rd-` Migration Start** (number revived 2026-07-13; the original scope was consumed by `v0.6.17`): buttons and forms built `rd-`-native, semantic tokens + focus base as enablers, `rd-` slice map + slice 1. Per `Q-11` the migration is a **gradual cut across `0.7.X`** — each release migrates its slice.
- Then: `v0.7.1` — stabilization (+ its `rd-` slice) → `v0.7.2` — **Data-View Primitives** (panel/stat/status/dense table/toolbar/alerts + dashboard example, pulled from `0.8.0`) → `v0.7.3` — **npm Delivery**: publish `@raredigits/rare-styles@0.7.3` from one release artifact feeding npm, GitHub Releases, jsDelivr and unpkg (`CSS-T01`) — **finalizes the `0.7.X` series** (moved 2026-07-17; it publishes the API only once `0.7.X` has stopped breaking it) → `0.8.0` Layouts & Components Harvest → `0.8.1` Completeness → slim `0.9.0` → `1.0.0`.
- Shipped milestones (`v0.6.12` … `v0.6.17_1`) are archived at the bottom of this file, newest first — the roadmap above stays active-work-only.
- The 2026-07-13 four-slice audit is fully routed (same day): bugs → `v0.6.17_2`; gaps → `CSS-118` (`v0.6.22`), `CSS-125..148` (`v0.7.1`), `CSS-156`/`CSS-159` (`v0.7.2`), `CSS-149`/`CSS-157`/`CSS-158`/`CSS-163` (`0.8.0`), `CSS-164..169` (`0.8.1`), `CSS-173`/`CSS-T01.3` (`0.9.0`/`v0.7.3`), `CSS-310..315` (post-1.0). Decisions recorded as `Q-07..Q-10` in Open Questions.

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

# Milestone `v0.6.18` — Icon Strategy

**Goal:** stop shipping a third-party icon *font* entirely and replace it with a small, library-owned **SVG** set. The `v0.6.17_1` font revert is a stopgap; this removes the Google dependency and the download weight for good. Supersedes the icon half of `CSS-087` (vendor-class sweep) and relates to the post-1.0 `CSS-303` (bundled icon set). Numbered `v0.6.18` on 2026-07-13 (was an unnumbered near-term milestone queued from `v0.6.17_1`); the CDN-migration scope previously holding this number moved to `v0.6.23`.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-095` | perf | **Drop Material Symbols support from the library.** Remove the Google `@import` (`_font-faces.scss`) and the `.material-symbols-outlined` / `symbol()` machinery once `CSS-096` ships the SVG replacements. No third-party icon font in the shipped `rare.css`. Coordinate the markup migration with `CSS-087`. | P1 | M |
| `CSS-096` | feat | **Ship a limited SVG icon set with the library.** Package the icons actually used across the ecosystem as inline/`<use>`-able SVGs under `assets/css/images/icons/**` (same public-asset contract as the vendor logos). Scope decision from the 2026-07-13 inventory below: the **library-core** set (used by Rare Styles' own components + docs) is small and mandatory; the **consumer-app** icons (mostly `raredigits.io` marketing UI) stay app-owned — the library ships the shared/core set, sites supply their own extras. **License:** Material Symbols is Apache-2.0 — redistribution of a modified subset (extracted SVGs) is permitted; ship `assets/css/images/icons/LICENSE` (Apache-2.0) + an attribution line, mirroring the font-license pattern from `v0.6.16`. | P1 | L |
| `CSS-119` | docs | **`/styles/icons/` documentation page — usage rules for the icon set.** First-pass page per the docs-audit policy: available glyph names (the shipped set), the one-class-per-icon markup API (`.rd-icon-<name>` / `.rd-icon-<name>-thin`), sizing (font-size drives the 1em mask box) and coloring (currentColor / tokens), the `icon()` / `icon-mask()` mixins for component-owned surfaces, and a user-facing "need an icon that isn't here?" path (Material Symbols font as a stopgap, Issue/PR to add it). The internal update pipeline (`scripts/fetch-icons.py` + `$icons`) stays in README/STYLEGUIDE, not the public page. Added 2026-07-14 by maintainer decision. | P1 | M |

> **Scope note (2026-07-14, maintainer decisions at implementation):** the shipped set is **137 glyphs × 2 weights (200/400)** — every icon supports both, as static per-weight SVG cuts fetched by `scripts/fetch-icons.py` (updatable pipeline; instructions in `assets/css/images/icons/README.md`). Additions over the 2026-07-13 core list: `bookmark` + `info` (inventory gaps — the library's own `.sidenote-bookmark` and `.boilerplate` draw them); an extended maintainer-selected batch (`star`, `star_half`, `bookmark_star`, `flag_2`, `keep`, `flight`, `delete`, `recycling`, `login`, `logout`, `key`, `key_vertical`, `diamond`, `function`, `chess_knight`); and the **ecosystem batch** — every glyph `schnellreich.ru` (7 rendered) and `raredigits.io` (94 rendered — static markup, data-driven demo templates, YAML menu data, legacy `.material-icons` spans) uses that wasn't already in the set, promoted by maintainer decision (2026-07-14) **superseding the "consumer icons stay app-owned" half of the 2026-07-13 split**: one collection, one pipeline, sites host no icons of their own (the 2026-07-13 io inventory undercounted — live sweep found 75 unique glyphs there). Rendering technique: `mask-image` + `currentColor` (not inline `<use>`), so existing color tokens keep working and the public markup API is **one self-contained class per icon** (`.rd-icon-<name>` / `-thin`; the glyph name is the class — no `data-icon` attribute to learn), generated per glyph because CSS `attr()` can't feed `url()`. `data-icon` survives only as `copy-to-clipboard.js`'s internal success-swap channel. The icon mixins live in `decorations/_icons.scss` (maintainer decision; `utilities/_symbols.scss` is deleted). Side effects: the wght-200 sidenote markers are thin again (the `v0.6.17_1` static-font tradeoff is repaid); `CSS-087`'s markup sweep and the bare-selector drop are fully absorbed here; the dead `.sidebar-icon.material-symbols-outlined` rule (`_sidebar.scss`) removed.

## Exit criteria

- [ ] `rare.css` / `rare.min.css` make **zero third-party requests** (no Google `@import`; grep-clean of `fonts.googleapis`)
- [ ] All 137 glyphs ship in both weights under `assets/css/images/icons/` with `LICENSE` (Apache-2.0) + `README.md` update instructions; `scripts/fetch-icons.py` regenerates the set
- [ ] No `.material-symbols-outlined` in library CSS or site markup; `utilities/_symbols.scss` deleted; every icon surface (header, collapsible, carousel, sidenotes, boilerplate, copy button, section icons) renders from the SVG set
- [ ] copy button's `content_copy` → `check` swap renders via the explicit `.copy-data-icon[data-icon="check"]` rule (the only surviving `data-icon` use)
- [ ] `/styles/icons/` page published (`CSS-119`); typography-page icon section rewritten against the shipped reality
- [ ] Downstream consumers (`schnellreich.ru`, `raredigits.io`) migrated in lockstep: markup on the `.rd-icon-<name>` class API (incl. `io` data-driven templates + YAML data + app-CSS selectors repointed to `[class*="rd-icon-"]`), jsDelivr pins bumped to `v0.6.18`; every rendered glyph cross-checked against the generated class set (both were version-pinned, so nothing breaks on sync; `io` additionally moves off the pre-contract script hooks its `v0.6.15` pin still used)
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt; bundle re-measured against the 400 KB budget (`CSS-T01.7`) with the delta explained

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

# Milestone `v0.6.20` — Auto-Shop Harvest & Examples

**Goal:** put the auto-repair-shop project into the library in both directions — harvest the styles it proved out, and use it as the worked example the docs have been missing. Serves waypoint 4 (stabilize & complete the core) via the harvest route the roadmap already prefers: patterns are **taken from client projects where they are already nearly built**, not designed from scratch. Scheduled ahead of the delivery work (2026-07-17 maintainer decision) because the two releases behind it both depend on it — `v0.6.21` proves the embedded split by rebuilding this site, and `v0.6.22` cannot measure coverage honestly on a library that is about to gain a harvest.

**Status:** 🔸 **Open.** `CSS-317` (the worked example) shipped ahead in **`v0.6.19`** as a demonstration — `/examples/styles/hetke/landing/` (live) + `/examples/styles/hetke/` (story) — but it was built entirely on the library's **existing** primitives. The defining task **`CSS-316` (harvest reusable patterns *into* the library) is not done**: the example's site-specific patterns (header CTA pill, price list) and the utility promotions it leaned on stayed in the site stylesheet, filed as `CSS-331..336`. This milestone closes when those promotions land and `CSS-333` re-lays the example onto the new library classes. **New (2026-07-20): `CSS-337`** starts the site-shell extraction of the page-theming bare elements — the concrete debt the example surfaced.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-316` | feat | **Harvest styles from the auto-shop site.** Inventory what the project built on top of Rare Styles, separate the genuinely reusable patterns from the site-specific ones, and land the reusable slice in the library under the `rd-` conventions. Same method as `v0.6.14` (Cross-Project Enrichment) and the `CSS-088` carousel harvest: the pattern must earn its place by already working in production, and anything that stays site-specific is recorded as such rather than promoted. Output includes the reject list — a promoted pattern the library cannot justify is a future prune. | P0 | L |
| `CSS-317` | docs | **Auto-shop examples in the documentation.** Use the harvested project as the library's first end-to-end worked example: real markup, real content, a real page — not a swatch grid. Feeds the pages the docs-driven audit policy will write later, and gives `/styles/` something to point at when a reader asks what the library is *for*. Coordinates with `CSS-280` (`v0.6.24`) on where the pages land; if the IA decision has not been taken yet, place them provisionally and record the debt. | P1 | M |
| `CSS-331` | feat | **Header CTA pill as a library class.** The auto-shop harvest re-skinned the base `.button` for the header CTAs (Call / WhatsApp) — a rounded pill sized to content + padding, vertically centred in the bar, coloured by a `--*Bg` modifier — and it lives in the site stylesheet, colliding with the base `.button`. Promote it to a real library class. **Coordinate with the `v0.7.0` button system (`CSS-040..046`)** so this does not ship a name that release then breaks. Surfaced building `CSS-317`. | P1 | S |
| `CSS-332` | feat | **Price-list component.** The pricing section (each row: title + right-aligned price + description, thin rule between rows) is site-specific in the site stylesheet today, by maintainer decision during the harvest. Promote the reusable core to a library class; the v2 mockup adds an **accordion** variant (`CHOSE YOUR SERVICE` — each package expands via the `collapsible` script) worth folding into the same component. Harvest candidate from `CSS-316`. | P1 | M |
| `CSS-333` | docs | **Re-lay the auto-shop example onto the harvested classes.** Once `CSS-331` / `CSS-332` land, rewrite the `/examples/styles/hetke/` story page and re-build the finished landing (`/examples/styles/hetke/landing/`) on the new library classes, dropping the matching site-specific CSS from the site stylesheet. Keeps the worked example honest — it should demonstrate the library's own classes, not a private skin that reimplements them. Depends on `CSS-331`, `CSS-332`. | P1 | S |
| `CSS-334` | docs | **Document/promote `.scroll-container`.** It already ships (`utilities/_display.scss`) but is undocumented; the `/examples/styles/hetke/` story leans on it as a bounded preview frame. It is bare `overflow: auto`, so it only scrolls with an explicit `max-height` / `height` (the docs page supplies one inline). Decide whether a height belongs in the utility or stays author-supplied, then write the `/styles/` note. Surfaced building `CSS-317`. | P2 | S |
| `CSS-335` | feat | **Dedicated map-embed container.** The auto-shop map is wrapped in `.iframe-video`, which forces the `16 / 9` aspect meant for video — wrong for a map, which wants its own height. Add a purpose-named embed container (e.g. `.iframe-map` / `.map-embed`) with a map-appropriate default so `.iframe-video` stops being overloaded. Harvest finding from `CSS-317`. | P2 | S |
| `CSS-336` | feat | **`.inline-icons` utility.** `img { display: block }` (right for content images) breaks a small icon meant to sit inside a text label — the auto-shop needed a local `display: inline-block` override to keep the phone glyph on the CTA's line. Generalise it: `.inline-icons` on a container flips its child images to `inline-block` + `vertical-align: middle`, so inline icons in buttons/labels need no per-site override. Coordinate with the mask-based `rd-icon-*` set (already inline). Surfaced building `CSS-317`. | P2 | S |
| `CSS-337` | feat | **Start the site-shell extraction — `<body>` / `<header>` / `<section>`.** The auto-shop example made the cost concrete: the library themes bare elements (`body`, `header`, `section`, `h1`, `a`), so embedding it under a foreign design means re-pointing every one of them under a scope. Begin moving that page-level theming out of the unavoidable baseline into shared **site-shell components**, so an embedded consumer inherits structure without inheriting a page theme. Start with the `<body>` / `<header>` / `<section>` trio. **Leading edge of `v0.6.21`** (`CSS-318` theme extraction / `CSS-319` container extraction), pulled forward by maintainer decision (2026-07-20): `v0.6.20` starts it on these three elements; `v0.6.21` completes the theme/container split behind the opt-in (`Q-12`). | P1 | M |

> **Added 2026-07-20 (from the harvest build):** the worked example is built — the live landing at `/examples/styles/hetke/landing/` and the story page at `/examples/styles/hetke/` (`CSS-317`). Building it surfaced two patterns that stayed site-specific in the site stylesheet and should be promoted — `CSS-331` (header CTA pill) and `CSS-332` (price-list) — plus the follow-up to re-lay the example onto them once they exist (`CSS-333`). These extend `CSS-316`'s harvest scope; they do not replace it. The header/price CSS was consciously left in the site stylesheet as the reject-list-for-now, pending these promotions. A second, lighter batch of utility promotions the example leaned on is filed the same way: `CSS-334` (document `.scroll-container`, which already ships), `CSS-335` (a purpose-named map container instead of overloading `.iframe-video`), and `CSS-336` (`.inline-icons`, generalising the `img { display: block }` override).

## Exit criteria

- [x] The docs carry an end-to-end auto-shop example built from real markup and content (`CSS-317`, shipped in `v0.6.19`): `/examples/styles/hetke/` story + `/examples/styles/hetke/landing/` live
- [ ] **The reusable slice is promoted *into* the library (`CSS-316`) — not done.** The example rode existing primitives (`.feature-row` / `.grid` / `.iframe-video` / `.scroll-container`); no new pattern was harvested. Reject list = the site stylesheet; promotable patterns filed `CSS-331..336`
- [ ] The header CTA pill (`CSS-331`) and price-list (`CSS-332`) are promoted to library classes, and the example re-laid onto them (`CSS-333`) with the matching site CSS removed
- [ ] Site-shell extraction started (`CSS-337`): the page-theming of `<body>` / `<header>` / `<section>` begins moving into shared components
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`; bundle delta recorded in `Changelog.md`

---

# Milestone `v0.6.21` — Embedded Library

**Goal:** make Rare Styles an **embedded library first**. Today the library also behaves like a page framework: it ships theme-level styling and global containers that assume the page is ours. That is the wrong default for a library meant to drop into someone else's project — but it is the right convenience for a fast start, so it must become an **opt-in set** rather than an unavoidable baseline. Serves waypoints 2 (lean delivery — an embedded consumer stops paying for a shell it does not use) and 4 (stabilize the core).

**Scope rule:** this is a boundary release, not a redesign. It relocates and gates existing styling behind an explicit opt-in; it does not redesign the theme or invent new components.

**Depends on:** `v0.6.20` — the exit criterion is a rebuild of the harvested auto-shop site, which has to exist first.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-318` | feat | **Extract the theme layer.** Identify every rule that themes the *page* rather than a component (body-level typography and background, element defaults that assume ownership of the document), and move it behind the opt-in set. The embedded consumer must be able to load the library and see **nothing change** until it uses a class. Feeds `Q-04` (the `_buttons.scss` element-vs-class stance is the same problem in miniature) and the `THEMING.md` work (`CSS-207`). | P0 | L |
| `CSS-319` | feat | **Extract the global containers.** Same treatment for the page-shell layer: global width containers and body-level layout scaffolding move out of the unavoidable baseline into the opt-in set. Reconcile with the `.layout-*` body-level modes planned for `0.8.0` (`CSS-150` / `CSS-160`) — they gate on a class on `<html>`/`<body>`, which is the same mechanism this release is inventing for the opt-in, so the library must end with **one** story about who owns the page, not two. | P0 | L |
| `CSS-320` | feat | **The quick-start opt-in set.** One documented switch that turns the extracted theme and containers back on for people who want a page, not a toolkit — provisionally `<html class="rd">`. Naming and granularity are **open** (`Q-12`): one switch or two (theme vs shell), and whether the hook is a class, an attribute, or a separate stylesheet. Decide before implementing; the answer is the release's public API. | P0 | M |
| `CSS-321` | docs | **Document the two modes.** `/styles/getting-started/` (`CSS-282`) gains the embedded-vs-quick-start decision up front: what the library does when you add nothing, what the opt-in turns on, and how to leave it. Without this the split reads as a regression to anyone who upgrades. | P1 | S |

## Exit criteria

- [ ] Loading `rare.css` in a foreign page changes nothing until a class is used — no page theming, no global containers
- [ ] The opt-in set restores the current rendering; naming settled per `Q-12` and documented as public API
- [ ] **The auto-shop site (`v0.6.20`) is rebuilt on the embedded library** and renders correctly in whichever mode it chooses — this is the proof, not a smoke test
- [ ] The `.layout-*` gates (`CSS-150` / `CSS-160`) are reconciled with the opt-in shell, in writing, so `0.8.0` does not re-litigate page ownership on the same `<html>` class
- [ ] Breaking changes are enumerated in `Changelog.md` with the migration line for each; bundle re-measured

---

# Milestone `v0.6.22` — Lean Delivery

**Goal:** stop taxing the consumers. Measured reality (2026-07): downstream sites use 10–20% of the library while `rare.css` is the main load bottleneck on their pages. This release gives every consumer a supported path to ship only what they use, and shrinks the worst weight driver at the source. Serves waypoint 2 (Lean delivery). The version number was re-cut on 2026-07-13 (the documentation-skeleton scope previously planned as `v0.6.19` moved to the Documentation continuous track, `CSS-039`) and shifted again on 2026-07-17: this milestone was `v0.6.19` until the auto-shop harvest and the embedded-library split took the two slots ahead of it.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-097` | perf | **Measure real selector coverage across consumers.** Instrument the three known consumers (raredigits.art, schnellreich.ru, raredigits.io): which selectors from `rare.css` actually match their DOM (coverage tooling or a PurgeCSS dry-run report per site). Output: a coverage table checked in next to this backlog, naming the heaviest unused selector families. Turns the "10–20% usage" observation into a prune target list for `CSS-079` and a baseline for the `CSS-T01.5` size budget. | P0 | S |
| `CSS-210` | perf | **Downstream purge path (moved from `0.9.0`, 2026-07-13).** PurgeCSS (or equivalent) recipe for the consuming site's build. Expected reduction: 308 KB → 15–30 KB. The library itself stays full; purge happens downstream. Must ship with a documented **safelist contract**: state classes toggled at runtime (`.rd-is-*`), JS hooks (`.rd-js-*`), Pagefind/search dynamic classes — anything the DOM only grows after load. Deliverables: a copy-paste config for Eleventy consumers + a short `/styles/` docs note. Applied to at least one real consumer as proof. | P0 | M |
| `CSS-079` | perf | **Audit the generated spacing-utility matrix (moved from `v0.7.1`, 2026-07-13).** `_spacing.scss` emits 24 property families × 30 `$spaces` values × (base + 3 breakpoints) ≈ 2 900 selectors; `rare.css` is 406 KB unminified — already over the 400 KB budget set in `CSS-T01.5`, and this matrix is the main driver. Define the intentional property×value matrix (percentages and `auto` make no sense for several families — see `CSS-049` for the invalid-CSS slice), prune the generators, re-measure the bundle. Informed by the `CSS-097` coverage data. Prune candidates from the 2026-07-13 audit: the idiosyncratic `.air-*` spacer family, percentage paddings, `*-auto` in families where `auto` is meaningless. Coordinates with `CSS-136` / `CSS-137`. | P1 | M |
| `CSS-324` | perf | **Icon-set revision — prune to what is actually used.** The set reached 143 glyphs by promotion, not by measurement: the `v0.6.18` ecosystem batch adopted every glyph the consumer sites rendered, and maintainer batches added more ahead of need (last: 6 glyphs, 2026-07-17). Several are expected to be removable. `CSS-097` produces exactly the evidence this needs — which `.rd-icon-*` classes no consumer matches — so run this after it, not on taste. Removal is **breaking** for anyone rendering a dropped glyph, so the output is a proposed cut list plus the per-glyph downstream check, and the drop lands only where the check is clean. Note the set is a class matrix: each glyph costs 2 rules and ~4 KB of unminified CSS whether or not anyone uses it. Also settle near-duplicates carried by both cuts (`business_center` vs `work`). | P1 | M |
| `CSS-330` | perf | **Own and enforce the 400 KB bundle budget** (moved out of `CSS-T01.5` / npm Delivery, 2026-07-17). The budget was defined inside the packaging task, so nothing enforced it until publish — and once npm moved behind `0.7.X` that became four releases of drift on the one number this release exists to move. Give it a home here: a build-time check that fails (or loudly warns) when `rare.css` exceeds 400 KB unminified, wired into `npm test` next to `CSS-118`. Baseline going in: **435.9 KB — already over**, and `v0.6.20` adds a harvest on top, so this release starts in the red by design. `CSS-T01.5` keeps the publish-time assertion as the last gate. Note the changelog has been citing `CSS-T01.7` for the budget since `v0.6.18` — that is the SRI task; the two shipped entries are left as-is, this ID supersedes both. | P0 | S |
| `CSS-118` | dx | **Compiled-CSS smoke test.** All 15 vitest files test chart JS; the CSS half has zero tests. Add a cheap build-level test: `rare.css` compiles, key tokens are present, responsive alias classes carry no `\\:` regression (the `CSS-027` class of bugs), and gap utilities resolve to the right tokens (guards the `CSS-098` fix while `CSS-079` prunes the matrix). Cheaper near-term complement to `CSS-218`. | P1 | S |

## Exit criteria

- [ ] Coverage report exists for all three known consumers; the heaviest unused selector families are named
- [ ] A documented, copy-pasteable purge recipe (incl. the `.rd-is-*` / `.rd-js-*` safelist contract) is applied on at least one real consumer with measured before/after numbers
- [ ] The spacing-utility matrix is pruned to an intentional property×value set; the bundle is re-measured against the 400 KB unminified budget
- [ ] The 400 KB budget is **enforced by a check in `npm test`** (`CSS-330`), not just asserted in a changelog line — and `rare.css` is back under it
- [ ] The icon set is triaged against the coverage data: a cut list exists, every proposed drop is checked against downstream usage, and the survivors are justified
- [ ] The compiled-CSS smoke test runs in `npm test` and guards the prune (alias classes, gap tokens, key custom properties)
- [ ] `npm run lint:css` clean; `rare.css` / `rare.min.css` rebuilt from `assets/css/rare.scss`

---

# Milestone `v0.6.23` — CDN Migration & Pages Sunset Prep

**Goal:** move docs, examples, and known consumers off mutable GitHub Pages asset URLs onto versioned jsDelivr targets, then clear the path for unpublishing the Pages surface and cleaning up its repository leftovers. Renumbered from `v0.6.18` on 2026-07-13; `CSS-T00` (the consumer-migration umbrella from `v0.7.1` Distribution hygiene) is consolidated here. Its completion unblocks the `v0.7.3` npm delivery release (`CSS-T01`), which no longer follows it directly — npm moved behind the `0.7.X` breaking passes on 2026-07-17.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T00` | chore | **Consumer-migration umbrella (moved from `v0.7.1` Distribution hygiene, 2026-07-13).** Migrate consumers off `https://raredigits.github.io/rare-styles/rare.min.css` (mutable, no CDN, no SRI) to a versioned CDN URL. Tag the current released snapshot (version per `_data/versions.js`), switch docs/examples to the latest tagged CDN target, and announce the old URL as deprecated. | P0 | S |
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

# Milestone `v0.6.24` — Docs Site Restructure

**Goal:** decide and land the documentation site's information architecture before `v0.7.0` starts filling it. `CSS-280` has been sitting in Continuous Tracks, where nothing gates it — but the docs-driven audit policy makes `v0.7.0` and `0.8.0` write first-pass pages for every module they touch, and those pages need somewhere to go. Promoted to a release by maintainer decision (2026-07-17): the IA is a prerequisite for the audit policy, not a docs chore.

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

# Milestone `v0.7.0` — Interactive Core & `rd-` Migration Start

**Goal:** start the `rd-` era. The phased namespace migration begins (`CSS-133`: slice map + slice 1, with `CSS-141`), and the two biggest functional holes in the library — a real button system and form elements — are built **`rd-`-native in the same release**, so new API never ships under old names and never needs a second migration. Semantic color tokens and the accessibility/focus base land here as enablers: button and form states consume both. **Breaking (slice-sized)**; per decision `Q-11` the migration proceeds as a gradual cut across the `0.7.X` series — each release migrates its module-group slice and removes the old names in the same release.

**Version-number note:** `v0.7.0` was retired on 2026-07-12 when its original scope (Namespace Foundations, `CSS-060..063`) was consumed by `v0.6.17`. Revived by maintainer decision on 2026-07-13 for the release series that completes the namespace story — the number returns to its original theme. Sequence: `v0.6.23` → `v0.6.24` → `v0.7.0` → `v0.7.1` → `v0.7.2` → `v0.7.3` (npm Delivery, moved behind the series on 2026-07-17) → …

## Namespace migration (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-133` | chore | **Complete `rd-` namespace adoption.** Prefix decision was taken in `v0.6.17` (`CSS-067`, consuming `CSS-060..063` — `rd-` namespace, `rd-is-*` state prefix, `rd-js-*` JS-hook prefix). This task finalizes the migration: audit existing component/utility classes (e.g. `.card`, `.tag`, `.sidebar`, `.note`, `.warning`, `.lead`) and decide per-class whether to prefix, alias, or leave as-is. Coordinates with `CSS-141`. Moved from `0.8.1` and upgraded from an audit/decision task to the actual migration (2026-07-13). Per `Q-11` (gradual cut): this release delivers the **slice map** — module groups × `0.7.X` releases — plus slice 1; every subsequent `0.7.X` release carries its slice and removes the old names in the same release. | L |
| `CSS-141` | chore | Audit collision-prone names: `.left`, `.right`, `.top`, `.bottom`, `.bold`, `.italic`, `.note`, `.warning`, `.lead`. Resolve together with `CSS-133`. | S |

## Buttons (P0) — moved from `v0.7.1` (2026-07-13)

The current `_buttons.scss` is a single style with no variants. Turn it into a proper button system — built `rd-`-native, alongside forms in this same release. Element-vs-class stance is `Q-04`.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-040` | feat | `_buttons.scss`: variants `primary` / `secondary` / `ghost` / `danger` / `link`. | M |
| `CSS-041` | feat | Sizes: `button-sm` / `button-md` (default) / `button-lg`. Driven by `--button-padding` and `--button-font-size` tokens. | S |
| `CSS-042` | feat | Icon buttons (`button-icon`), buttons with leading/trailing icons, button-only-icon-square. | M |
| `CSS-043` | feat | States: `:hover`, `:active`, `:focus-visible`, `:disabled`, `[aria-busy="true"]` (loading spinner). | M |
| `CSS-044` | feat | `button-group` — segmented horizontal group with shared borders. | S |
| `CSS-045` | feat | `button-block` modifier (full-width). | S |
| `CSS-046` | feat | Token surface: `--button-radius`, `--button-padding-x/y`, `--button-font-weight`, `--button-transition`. | S |

## Forms (P0) — moved from `0.8.1` (2026-07-13), built `rd-`-native

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-100` | feat | `modules/elements/_forms.scss`: base styles for `input[type=text/email/password/search/tel/url/number]`, `textarea`, `select`. | M |
| `CSS-101` | feat | Custom-styled `checkbox` and `radio` via `appearance: none`. | M |
| `CSS-102` | feat | `<label>`, `.form-group`, `.form-row`, `.form-help`, `.form-error`. | S |
| `CSS-103` | feat | States: `:focus`, `:focus-visible`, `:disabled`, `:invalid`, `:valid`, `[aria-invalid]`. | M |
| `CSS-104` | feat | `fieldset` / `legend` reset and styling. | S |
| `CSS-105` | feat | `range`, `color`, `file` inputs — minimal styling. | S |

## Enablers — semantic tokens & focus base (P0)

Button and form states depend on both: `:invalid` needs `--color-danger`, `button-primary` needs `--signal`, and every interactive state needs the global focus story. Pulled from `0.8.0` (tokens) and `v0.7.1` (a11y base).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-121` | feat | Semantic color layer on top of base palette: `--color-success` / `--color-danger` / `--color-warning` / `--color-info`. Migrate components to semantic tokens. | M |
| `CSS-124` | feat | **`--signal` token** separate from `--brand-color`. `--brand-color` stays for brand identity (link highlights, decorative brand marks). `--signal` is reserved for attention/action-driving accents (primary buttons, critical-state indicators, threshold violations, focus-visible). Migrate `button-primary`, `:focus-visible` outline, status-critical, KPI-delta-up/down to `--signal`. Codifies the Rareism distinction between identity and signal in the token layer itself. | M |
| `CSS-110` | a11y | Global `:focus-visible` style (2px solid `var(--brand-color)`, 2px offset). Audit and remove any stray `outline: none` (one known: `_search.scss:23`, already paired with a `:focus-visible` rule). Audit 2026-07-13 widened the scope: `:focus-visible` currently exists only in the Pagefind widget — the sweep must cover every interactive surface (buttons, links, tags, carousel arrows/dots, collapsible triggers, hamburger), all hover-only today. | S |
| `CSS-111` | a11y | `.sr-only` / `.visually-hidden` utilities (a11y-project recipe). | S |

## Documentation-driven audit — first-pass `/styles/elements/` (P1)

Per the docs-audit policy: buttons and forms are documented in the milestone that builds them.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-086` | docs | First-pass write of `/styles/elements/buttons/` covering variants, sizes, states, button-group, button-block. Depends on `CSS-040..046`. Finalized in `CSS-287` (forms section `CSS-091` lands in this same release). | M |
| `CSS-091` | docs | First-pass write of forms section on `/styles/elements/`. Depends on `CSS-100..105`. Joined with the buttons section already drafted in `CSS-086`. Finalized in `CSS-287`. | M |

---

# Milestone `v0.7.1` — Stabilization

**Goal:** zero invalid CSS in the codebase, linter in place, and the module surface cleaned up and finished after the `v0.7.0` breaking pass. (Buttons and the a11y focus base moved to `v0.7.0` on 2026-07-13 — they ship with the namespace migration.) Carries its `rd-` migration slice per the `CSS-133` map.

## Quality infrastructure (P0–P1)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-020` | dx | Keep **Stylelint** on a Node-18-compatible stack: `stylelint@16`, `stylelint-config-standard-scss`, `postcss-scss`. Document `npm run lint:css` as the canonical CSS check. | M |
| `CSS-021` | dx | Make `npm run lint:css` the stable team entry point, run `stylelint --fix` where safe, and document when linting is required in day-to-day work and before release. | S |
| `CSS-022` | dx | Document the build pipeline: how `rare.css` / `rare.min.css` are produced, how linting fits into the release flow, and which `package.json` scripts are canonical (`build:css`, `watch:css`, `lint:css`). | M |
| `CSS-023` | chore | Sweep low-risk Stylelint cleanup that is mostly mechanical: modern `rgb(... / ... )` notation, alpha percentages, hex shortening, empty-line normalization, operator spacing, argumentless mixin call style. | M |
| `CSS-024` | chore | Triage duplicate/dead declarations reported by Stylelint and either remove them or document intent: `_icons.scss`, `_tags.scss`, `_header-container.scss`, `_grid.scss`, `_sidenotes.scss`. Note: `_icons.scss` was already simplified in `v0.6.16` (legacy Material Icons selectors removed) and `_sidenotes.scss` touched (marker `font-variation-settings`) — re-triage those two against their current state. | S |
| `CSS-025` | chore | Clean up module hygiene issues reported by Stylelint: `@forward` without `.scss` extension in `navigation/_index.scss`, decide whether empty `special/_rare.scss` should be removed or kept as an intentional staging file. Audit 2026-07-13 adds: `utilities/_index.scss` forwards only display+resets while breakpoints/states/symbols are wired ad hoc elsewhere — make "utilities" one coherent forwarding surface. | S |
| `CSS-087` | chore | ~~**Migrate remaining markup off the vendor `.material-symbols-outlined` class.**~~ **Closed 2026-07-14 — fully absorbed by `v0.6.18` (Icon Strategy):** the sweep of the remaining markup usages, the per-surface migration to the `.rd-icon-<name>` class API, the bare `.material-symbols-outlined` selector drop, and the dead `.sidebar-icon` rule removal all shipped there. Nothing remains. | M |
| `CSS-026` | chore | Audit the floating WhatsApp/contact button pattern as a reusable library primitive. Keep it in the library if it is genuinely cross-project, but clarify whether the API is brand-specific (`wa`) or a more general floating contact / floating action pattern. | S |

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
| `CSS-079` | perf | **Moved to `v0.6.22` — Lean Delivery** (2026-07-13). Pulled forward as the main bundle-weight driver; the full spec lives there, informed by the `CSS-097` coverage data. | — |

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

## Typographic & utility finishing (P1) — routed from the 2026-07-13 audit

Cheap, high-impact completeness for the longread core and the utility system. All S-sized.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-125` | feat | `text-wrap: balance` for headings/`.lead`, `text-wrap: pretty` for body prose — zero usage today. | S |
| `CSS-126` | bug | h5/h6 carry no margins — no vertical rhythm below h4 (`typography/_headings.scss:25-32`). Define their spacing. | S |
| `CSS-127` | feat | Style semantic `figure`/`figcaption` — today only class-based `.caption` exists (`typography/_text-content.scss`). | S |
| `CSS-128` | feat | Inline semantics: `kbd`, `abbr`, `sub`/`sup` (also needed by the `CSS-165` footnote system); small-caps utility as the P2 slice. | S |
| `CSS-129` | feat | `scroll-margin-top` under the fixed header — anchor jumps currently land beneath it despite `--header-height` existing (`layout/_containers.scss:12,42`). | S |
| `CSS-138` | feat | `position: sticky` utility — components hand-roll it today (`align/_position.scss:1-11` vs `navigation/_sidebar.scss:10`). | S |
| `CSS-139` | chore | z-index token scale — utilities cap at `z-index-5` while components use ad-hoc `99/100/102/1000` (`utilities/_display.scss:44-65` vs `layout/_containers.scss:45`); one scale, components migrate onto it. | S |
| `CSS-144` | feat | Flex `justify-content`/`align-items` utility family — today grid-semantic `.items-*` is borrowed instead (`align/_flex.scss`, `layout/_grid.scss:210-218`). | S |
| `CSS-145` | feat | Expose breakpoints as CSS custom properties for consumers of the compiled CSS — today Sass-only vars (`utilities/_breakpoints.scss:1-4`). | S |
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

`CSS-T00` moved to `v0.6.23` — CDN Migration & Pages Sunset (2026-07-13), consolidated with the rest of the Pages-sunset scope.

---

# Milestone `v0.7.2` — Data-View Primitives

**Goal:** make the "decision-first data views" half of the positioning real. The minimal data-view core ships `rd-`-native on the `v0.7.0` semantic tokens — pulled forward from `0.8.0` (2026-07-13): these primitives are layout-agnostic, harvest-ready on client projects, and should not wait for the layout modes. Carries its `rd-` migration slice per the `CSS-133` map.

**Minimal core (this release):** panel family, stat/KPI, status indicators + badges, dense table, toolbar, alert severity variants — plus the dashboard example as the proof artifact.

**Extended set (added 2026-07-13):** all five discussion candidates are included as P2 tasks so they don't get lost — see the extended-set table at the bottom of this milestone; triage on the spot when the release is being cut.

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

---

# Milestone `v0.7.3` — npm Delivery

**Goal:** make Rare Styles installable as `@raredigits/rare-styles@0.7.3` without turning the `raredigits.art` site package into the library package. `raredigits.art` remains the canonical source; `raredigits/rare-styles` remains the clean distribution repository. One immutable build artifact must feed npm, the GitHub tag/Release, jsDelivr and unpkg so the same version cannot resolve to different bytes on different channels.

**Scope rule:** this is a delivery release, not an API-stability release. It may package the existing public CSS/SCSS/assets contract and improve release infrastructure; it must not introduce new selectors, rename public API, or bundle the companion scripts. npm ships the library at `0.x`; the `1.0.0` semver promise remains a later milestone.

**Depends on:** `v0.6.23` complete; legacy Pages delivery retired; canonical CDN paths and the `rare-styles` distribution repository verified. Before implementation, verify ownership/availability of the `@raredigits` npm scope and package name.

| ID | Type | Task | Priority | Estimate |
|---|---|---|---|---|
| `CSS-T01.1` | feat | **Define the package artifact and build it reproducibly.** Add a clean staging/build command that creates `dist/rare.css`, `dist/rare.min.css`, source maps, `dist/scss/**`, `dist/fonts/**`, `dist/images/**`, plus the package metadata/docs required at the package root. Preserve package-local relative asset URLs. The command must start from a clean staging directory so removed source files cannot survive in a release. | P0 | M |
| `CSS-T01.2` | feat | **Create the public manifest for `@raredigits/rare-styles`.** Keep the site root package private; generate or maintain a separate distribution `package.json` with `style`, `sass`, explicit `exports`, `files`, `sideEffects` for CSS, `license`, `repository`, `engines`, Sass peer dependency metadata, and `publishConfig.access: public`. Support the documented root CSS import, explicit minified CSS import, and SCSS entry point; do not advertise a nonexistent JavaScript `main`. | P0 | M |
| `CSS-T01.3` | dx | **Single-source the styles version.** Add a styles `version.json` analogous to Rare Charts; derive `_data/versions.js`, the distribution manifest, banners, tag and release title from it. Validate exact mapping between npm `0.7.3` and git/CDN tag `v0.7.3`; fail the release on version drift or an already-published version. Supersedes the old placement of `CSS-T01.8`. | P0 | S |
| `CSS-T01.4` | feat | **Replace the mutable CSS sync with a release-gated pipeline.** On a new version: install from lockfile, lint, test, build, assemble the clean package, validate it, sync the exact artifact to `raredigits/rare-styles`, commit/tag `v0.7.3`, create the GitHub Release, then publish that same artifact to npm. Normal `main` pushes between version bumps must not alter consumer-visible distribution. Use npm trusted publishing/OIDC with provenance if the registry/account supports it; otherwise use a narrowly scoped automation token. | P0 | L |
| `CSS-T01.5` | dx | **Verify the packed consumer experience before publish.** Run `npm pack --dry-run`, inspect the allowlisted file inventory, enforce no `node_modules`/site/Eleventy/chart leakage, check license and asset presence, and assert the bundle budget still holds at publish time (`CSS-330` owns the budget itself; this is the last gate before bytes go out). Install the generated `.tgz` into a temporary fixture and compile both `import "@raredigits/rare-styles"` and `@use "@raredigits/rare-styles/scss"`; verify referenced fonts/images resolve from the installed package. | P0 | M |
| `CSS-T01.6` | docs | **Document the three supported installation paths.** README and `/styles/usage/`: versioned jsDelivr `<link>`, `npm install @raredigits/rare-styles`, and Sass `@use`. State that `0.x` may contain breaking changes, recommend exact version pins, document exported subpaths/assets, and keep companion scripts explicitly separate. | P1 | S |
| `CSS-T01.7` | feat | **Publish integrity metadata for the browser/CDN flavor.** Generate SHA-384 SRI values for `rare.css` and `rare.min.css` from the final artifact and attach them to the GitHub Release (and documentation where maintainable). The hash must be computed after the final build, from the exact bytes published. | P1 | S |
| `CSS-T01.8` | chore | **Run a `0.7.3` release rehearsal, then publish.** Exercise the pipeline without registry mutation, inspect the tarball and release notes, then publish the real version. Verify from a clean external fixture that npm install, root CSS import, minified subpath, SCSS compilation, npm metadata, GitHub tag/Release, jsDelivr and unpkg all resolve to `0.7.3`; record hashes/URLs and add the release entry to `Changelog.md`. | P0 | M |

## Release order

1. Package boundary and single-source version (`CSS-T01.1`–`.3`).
2. Pack/install verification and documentation (`CSS-T01.5`–`.7`).
3. Release-gated automation (`CSS-T01.4`).
4. Dry rehearsal, real publication and cross-channel verification (`CSS-T01.8`).

## Exit criteria

- [ ] `npm install @raredigits/rare-styles@0.7.3` works in a clean project
- [ ] Root CSS, explicit minified CSS and SCSS `@use` entry points are covered by fixture tests
- [ ] Fonts, images and source maps referenced by the package resolve without site-root assumptions
- [ ] The npm tarball contains only the intentional library artifact, metadata, documentation and licenses; no site/build/chart leakage
- [ ] `raredigits.art` remains `private: true`; the public manifest belongs only to the distribution artifact
- [ ] One version source drives docs, manifest, tag and pipeline; npm `0.7.3` maps to git/CDN `v0.7.3`
- [ ] Ordinary `main` pushes cannot mutate released distribution; only a new version triggers a release
- [ ] npm, GitHub Release, jsDelivr and unpkg serve the same final CSS bytes; SHA-384 values are recorded
- [ ] Install docs cover CDN, npm and SCSS, exact pins, `0.x` compatibility expectations and separate companion scripts
- [ ] `npm run lint:css`, `npm run test:run`, CSS build and the packed-fixture smoke test pass in CI

---

# Milestone `0.8.0` — Layouts & Components Harvest

**Goal:** ship the two opt-in body-level layout modes (`.layout-story`, `.layout-dashboard`) and the remaining harvested components (app-shell, tabs, TOC, card variants, skeleton). This is primarily a **harvest**: the layouts and components are already nearly built on client projects — the work is normalizing them into library API (naming, tokens, structural contract, docs), not designing from scratch. The data-view primitives moved earlier, to `v0.7.2`, and the semantic-token enablers to `v0.7.0` (both 2026-07-13). Split out of the old monolithic `0.8.0` — Completeness on 2026-07-13; the a11y/architecture half is `0.8.1`. Carries its `rd-` migration slice per the `CSS-133` map.

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
| `CSS-188` | feat | `modules/layout/_shell.scss`: `.app-shell` — opt-in layout shell with topbar + main + optional sidebar. Used by dashboard pages but not gated by `layout-dashboard`. | M |

## Harvest additions (P1) — routed from the 2026-07-13 audit

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-149` | feat | **Tabs** (decision `Q-08`: pulled forward from post-1.0 `CSS-305`). Harvest from client projects where already built; `rd-js-tabs` companion per the scripts contract, `tablist`/`aria-selected` roles, keyboard navigation. Accordion/stepper stay post-1.0. | M |
| `CSS-157` | feat | **Card variant coverage.** Media/thumbnail card, clickable-card `:focus-within` affordance, `.card-inverted` hover/focus parity on the dark surface (`bricks/_cards.scss:20,72`). | M |
| `CSS-158` | feat | **Table-of-contents component** with scroll-spy/active-section state for longreads — `.sidebar-nav` today is generic navigation (`navigation/_sidebar.scss`). Harvest candidate: article sidebars already exist on consumer sites. | M |
| `CSS-163` | feat | **Skeleton becomes loading-grade**: shimmer/pulse (respecting `prefers-reduced-motion`, `CSS-112`) + `aria-busy` pairing (`decorations/_skeleton.scss`). | S |

## Documentation-driven audit — first-pass `/styles/` pages (P0)

Continuation of the docs-audit policy (top of this file). Each page below depends on the corresponding feature work landing in this milestone; finalization happens later via the continuous docs track (KSS extraction).

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-092` | docs | First-pass write of `/styles/components/` (renames `/styles/bricks/`): Cards + Panels decision rule, stats, status indicators, badges, dense tables. Depends on `CSS-180..188`. Expected to surface: leftover `.card-*` patterns that are really panels (feeds `CSS-181`, `CSS-183a`). Finalized in `CSS-288`. | M |
| `CSS-093` | docs | First-pass write of `/styles/layouts/`: when `.layout-story` / `.layout-dashboard` apply, what changes vs the defaults, mixed-content examples. Depends on `CSS-150..172`. Finalized in `CSS-292a`. | M |

---

# Milestone `0.8.1` — Completeness: A11y & Architecture

**Goal:** close the remaining functional gaps for the core Rareism use cases: the accessibility batch, the rest of the token system (surfaces, motion), and the architectural pass (`@layer`, logical properties). Second half of the old monolithic `0.8.0` — Completeness (split 2026-07-13); the layouts/components half ships first as `0.8.0`. Forms and the namespace finalization (`CSS-100..105`, `CSS-133`, `CSS-141`) moved to `v0.7.0` on 2026-07-13.

## Accessibility (P0)

`CSS-110` / `CSS-111` moved up to the `0.7.0` accessibility-base section.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-112` | a11y | `@media (prefers-reduced-motion: reduce)` — neutralize transitions / animations. | S |
| `CSS-113` | a11y | Skip-link styles (`.skip-to-content`). | S |
| `CSS-114` | a11y | Contrast audit: `--gray-trans` (#888) on `--bg-color` (#f0f0f0) is ~3.5:1, fails WCAG AA for body text. Adjust `--text-color-light`. Audit 2026-07-13 adds two cases: `--text-color-lightest` maps to `--gray` (#ccc) — fails for any text on white; `mark` (`--yellow` bg + `--primary-color` text) is borderline. | M |
| `CSS-167` | a11y | **Base print stylesheet** — zero `@media print` library-wide (audit 2026-07-13); hide chrome (header/sidebar/cookie-notice), link/URL treatment, page-break hygiene for prose and tables. Post-1.0 `CSS-308` `.layout-print` is a full mode; this is the hygiene slice. | M |
| `CSS-168` | a11y | **`prefers-contrast` / `forced-colors` support** — none today (audit 2026-07-13); verify tokens and key components under Windows High Contrast, add minimal overrides. | S |

## Typography completeness (P1) — routed from the 2026-07-13 audit

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-164` | feat | **Fluid type scale.** Zero `clamp()` today — the whole scale is fixed rem/em (`typography/_fonts.scss:11-17`). Introduce fluid sizing for the heading/display end of the scale (body stays stable); coordinate with the `CSS-136` token renames. | M |
| `CSS-165` | feat | **True footnote/reference system.** `.footnote` is a styled block only — no numbered refs (`sup`/counters), no backlink navigation (`typography/_text-content.scss:184`). Design the footnote contract alongside the existing sidenote system: complementary, not duplicates. Depends on `sub`/`sup` from `CSS-128`. | M |
| `CSS-166` | feat | **Table completeness for data views:** `caption`/`caption-side`, `tfoot` (totals rows), a stacked responsive mode besides `.table-scroll`, and a counter-utility for the global `th { white-space: nowrap }` (`typography/_tables.scss:13,20`). | M |

## Token system (P1)

`CSS-121` (semantic color layer) and `CSS-124` (`--signal`) moved to `v0.7.0` (2026-07-13) as button/form-state enablers; the `v0.7.2` primitives consume them as released tokens.

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

Continuation of the docs-audit policy (top of this file). Each page below depends on the corresponding feature work landing in this milestone; finalization happens later via the continuous docs track. `CSS-092` / `CSS-093` moved to `0.8.0` and `CSS-091` to `v0.7.0` with their features.

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

---

# Milestone `0.9.0` — Release Prep

**Goal:** everything the `1.0.0` API promise needs — identity docs (README, STYLEGUIDE, CONTRIBUTING, LICENSE, THEMING, CHANGELOG, Code of Conduct), the demo page, sibling-library integration, tagging and basic CI. Slimmed on 2026-07-13: the docs-site infrastructure, KSS annotation, and token pipeline moved to the **Continuous Tracks** section — they are maintainer infrastructure, not consumer contract (see Key milestones). `CSS-210` (purge) moved much earlier, to `v0.6.22`.

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
| `CSS-207` | docs | **Theming guide** (`THEMING.md`): how to override base tokens for a constrained brand context. Show a worked dark-mode example via `:root { --bg-color: #111; --primary-color: #f0f0f0; ... }` overrides — no built-in dark mode, just a recipe. **Distinct from layouts**: this is the brand-override path (color/token overrides), not the Story/Dashboard mechanism (page-level shell). Cross-link to `/styles/themes/` for the no-theme-switching stance. Decision `Q-07` (2026-07-13): the token layer goes dark-ready in `0.8.1` (`CSS-169`) with an official opt-in dark set — this guide documents that path; still no built-in switching. | M |
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
| `CSS-240` | feat | `modules/charts/_index.scss` — base tokens for charts: `--chart-axis-color`, `--chart-grid-color`, `--chart-label-color`, `--chart-tooltip-bg`, `--chart-series-1..8`. Sourced from semantic tokens. An early slice may ship in `v0.7.2` (`CSS-176`) — this task then shrinks to the remainder. | M |
| `CSS-241` | feat | Common chart chrome styles: axis, gridlines, legend, tooltip, data labels. Used by every chart type in `charts/`. Audit 2026-07-13: legend/sparkline/gauge/meter/progress chrome currently exists only inside the charts bundle (`rare-charts.css`) — move the shared pieces into library CSS here. | M |
| `CSS-242` | feat | Map chart styles (`charts/map`): land/water fills, hover state, choropleth scale tokens. | M |
| `CSS-243` | feat | Layout-aware chart palette: `.layout-story` uses muted/editorial palette; `.layout-dashboard` uses high-contrast functional palette. Default (no layout class) uses the high-contrast functional palette as well. | M |
| `CSS-244` | docs | “Charts integration” doc: how to wire any chart to the token system, how to override per-instance via CSS variables. | S |
| `CSS-173` | feat | **Charts read colors from CSS custom properties** (audit 2026-07-13). Today the series palette, positive/negative and the dark theme are hardcoded in `src/core/theme.js` (`rare-charts.css:4`: "Colors — via theme (JS), not CSS") — consumers cannot retheme charts via CSS. Make the JS theme read the `CSS-240` tokens, keeping current values as fallbacks. Charts-side change, paired with `CSS-240`. | M |

## Distribution (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-211` | feat | Tag releases in git (`v0.6.12`, `v0.6.13`, `v0.7.0`, `v0.8.0`, `v0.9.0`). Use semver strictly. | S |
| `CSS-213` | feat | Validate source maps shipped with `rare.min.css`. | S |
| `CSS-250` | feat | **CDN + npm package** — see the `v0.7.3` npm Delivery milestone (`CSS-T01`). `v0.6.23` unblocks it; it ships at the end of `0.7.X` (2026-07-17). | L |

## Build / performance (P0)

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-210` | perf | **Moved to `v0.6.22` — Lean Delivery** (2026-07-13): the downstream purge path ships much earlier, with the `.rd-is-*` / `.rd-js-*` safelist contract. | — |
| `CSS-220` | dx | GitHub Actions workflow: lint + build on every PR. (Visual regression joins later from the maintainer-infra track — `CSS-218`.) | M |

---

# Milestone `1.0.0` — Public Release

`1.0.0` is the **API promise**, not a feature checklist (see Key milestones): from this tag on, the public API is stable and breaking changes require a major bump.

**Definition of done:**

- [ ] All P0/P1 tasks from `v0.7.0` / `v0.7.1` / `0.8.0` / `0.8.1` / `0.9.0` are closed
- [ ] Zero invalid CSS values (stylelint clean); cascade layers in place, no `!important`
- [ ] Forms, buttons, focus-visible, sr-only, reduced-motion all shipped
- [ ] Semantic tokens (success/danger/warning/info, surfaces, motion) + `--signal` separate from `--brand-color`
- [ ] `.layout-story` and `.layout-dashboard` documented and demoed against the no-layout default state; layout-agnostic primitives (panel, stat, table-dense, toolbar, app-shell) work in either layout and without any layout class
- [ ] Sibling-library integration finalized for `scripts/` and `charts/`
- [ ] Zero third-party requests in the shipped CSS (fonts self-hosted since `v0.6.16`, icons via the `v0.6.18` SVG set)
- [ ] The downstream purge path (`v0.6.22`) is documented with its safelist contract — consumers can ship 15–30 KB
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

The documentation-driven audit policy (top of this file) stays the working method: first-pass docs tasks remain attached to their milestones (`CSS-080..085` in `v0.7.1`, `CSS-086`/`CSS-091` in `v0.7.0`, `CSS-090`/`CSS-092..094` across `0.8.0` / `0.8.1`) because writing them *is* the audit. Everything below is pace-free — no release waits for it.

| ID | Type | Task | Estimate |
|---|---|---|---|
| `CSS-039` | docs | **(was the dissolved `v0.6.19` Documentation Skeleton Pressure milestone, 2026-07-13 — that number is now Auto-Shop Harvest & Examples.)** Keep stub and draft `/styles/` pages as intentional skeletons rather than hiding them. Formalize the policy for "SECTION ON RECONSTRUCTION" pages, decide the minimum honest content each skeleton must carry, and fix dead-nav edges such as `_data/tableOfContents.json` anchors pointing to sections that do not exist yet (for example `/styles/typography/interactive/#forms`). The goal is making unfinished docs usable as pressure/backlog surfaces, not about fully writing the pages. | S |
| `CSS-209` | docs | **(moved from `0.9.0`, 2026-07-13.)** **Module inventory + documentation audit.** Compile the canonical list of every CSS/SCSS module in the library, audit each one for current purpose / ownership / public API surface, and verify that each module is documented somewhere appropriate (`/styles/`, `STYLEGUIDE.md`, KSS reference, or maintainer docs). Audit the current docs structure too: identify missing module coverage, stale sections, modules documented in the wrong place, and pages that describe code no longer present. This is an intentionally long-running task: it can advance incrementally alongside other backlog work and should be updated whenever a module changes or a docs page is written. | L |

### `/styles/` content structure — finalization set (moved from `0.9.0`, 2026-07-13)

Public docs live under `/styles/` on raredigits.art. Organized **by user task**, not by SCSS file structure — readers shouldn’t need to know that `align/_align.scss` and `align/_flex.scss` are separate files. Each page combines: hand-written narrative (the *why*) + KSS-extracted class reference (the *what*) + live HTML examples (the *how*) + “see also” links to related tokens, components and integrations.

**First-pass write-ups happen earlier** — per the **Documentation-driven audit policy**, `CSS-080..086` (`v0.7.1`) and `CSS-090..094` (`0.8.0` / `0.8.1`) cover the initial drafts. The `CSS-282..295` tasks below are **finalization**: integrate the KSS-extracted reference, fill the remaining edge pages (`getting-started`, `integration`, `reference`), and clean up anything still open from the earlier docs-audit passes.

**Existing folder reconciliation** — current `/styles/` already has stub folders that mostly map to this plan. The mapping below notes renames (`usage` → `getting-started`, `bricks` → `components`) and merges (`alignment` + `spaces` → `utilities`/`layout`). `/styles/idea/` and `/styles/modules/` are evaluated in `CSS-280`.

| ID | Path | Replaces / merges | Scope | Estimate |
|---|---|---|---|---|
| `CSS-280` | — | — | **Moved to `v0.6.24` Docs Site Restructure** (2026-07-17) — the IA decision now gates the docs-driven audit policy, so it is release-scheduled rather than pace-free. | — |
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

## Maintainer infrastructure — mostly post-1.0

Improves maintainer velocity and confidence, not the consumer contract. Lands whenever it pays for itself.

### KSS + auto-extracted reference (moved from `0.9.0`, 2026-07-13)

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
| `Q-04` | Element-vs-class stance for buttons | `_buttons.scss` styles every native `button` globally (`display: block`, `width: fit-content`) — aggressive for embedded/consumer contexts. Decide whether the button system targets elements or only `.button` classes before building variants. | `CSS-040..046` |
| `Q-05` | Font-loading philosophy after killing `@import` (`CSS-030`) | **Decided (2026-07-12): (a) batteries-included, self-hosted.** `rare.min.css` keeps `@font-face` pointing at self-hosted woff2 in `fonts/`; consumers bump the version and get the same families minus Google/waterfall, mitigated by `unicode-range` + shipping only the token-declared weights. Rejected (b) agnostic core + optional pack (breaking, silent system-font fallback). | ✅ `CSS-030` / `v0.6.16` |
| `Q-06` | Scope/sequencing of icon consolidation (`CSS-032`) | **Decided (2026-07-12): keep Material Symbols as one scoped `@import`** (weights 200/400), self-host only the text families, drop legacy `Material Icons` + `Material Icons Outlined`. Symbols stays Google-hosted → zero consumer icon migration. In-repo cut is clean (0 usages); the downstream `.material-icons` break (schnellreich.ru) is staged via `CSS-032a` and lands together with `CSS-030` in one release. | ✅ `CSS-032` / `v0.6.16` |
| `Q-07` | Dark-mode stance | **Decided (2026-07-13): dark-ready tokens, no switching.** Components move onto semantic/surface tokens and an official opt-in dark set ships (`CSS-169`); the library still ships no switcher; `THEMING.md` (`CSS-207`) documents the path. | ✅ `CSS-169` / `0.8.1` |
| `Q-08` | Tabs before 1.0? | **Decided (2026-07-13): harvest.** Tabs pulled from post-1.0 `CSS-305` into `0.8.0` as `CSS-149` — client projects already have them; accordion/stepper stay post-1.0. | ✅ `CSS-149` / `0.8.0` |
| `Q-09` | Site-only JS packaging | **Decided (2026-07-13): exclude.** `themeSwitcher`/`header-scroll`/`gridDisplay` are site glue, not companions; `themeSwitcher` may return after `CSS-169`. | ✅ `CSS-148` / `v0.7.1` |
| `Q-10` | `special/` library boundary | **Decided (2026-07-13): evict.** Mockups + construction leave the library, cookie-consent is tokenized, `.wa-button` per `CSS-026`. | ✅ `CSS-147` / `v0.7.1` |
| `Q-11` | `rd-` migration strategy | **Decided (2026-07-13): gradual cut across `0.7.X`.** Neither one big hard cut nor a long-lived alias layer: the migration proceeds in module-group slices — each `0.7.X` release migrates its slice and removes the old names in the same release (consumers stay on version pins, bundle stays lean). The slice map is the first deliverable of `CSS-133` in `v0.7.0`. | ✅ `CSS-133` / `0.7.X` |
| `Q-12` | Quick-start opt-in: name and granularity | `v0.6.21` moves the theme layer and the global containers out of the unavoidable baseline; something has to turn them back on. Provisionally `<html class="rd">`, but undecided (2026-07-17): one switch or two (theme vs page shell — a consumer may want the typography without the containers), and whether the hook is a class, a data attribute, or a separate stylesheet (`rare-quickstart.css`) — a separate file is the only form an embedded consumer can avoid downloading at all. Whatever is chosen becomes public API in the same release, so decide before `CSS-320` is implemented. Must be settled together with the `0.8.0` layout gates (`CSS-150`/`CSS-160`): those also key off a class on `<html>`/`<body>`, so the two mechanisms either compose deliberately or collide by accident. | `CSS-320` / `v0.6.21` |

---

# Post-1.0 Backlog

| ID | Type | Task | Notes |
|---|---|---|---|
| `CSS-300` | feat | Container queries (`@container`) for adaptive components | Currently everything is `@media`; CQ is more useful for a component library |
| `CSS-301` | feat | Animation library: `.fade-in`, `.slide-up`, micro-interactions | Built on the `--ease-*` / `--duration-*` tokens |
| `CSS-302` | feat | Extended color palette: 50–950 ramp per hue | Currently flat: light/base/dark |
| `CSS-303` | feat | Bundled icon set (or adapter for Lucide / Heroicons) | Since `v0.6.16` the library loads a single scoped Material Symbols import (weights 200/400); a bundled/self-hosted icon set or Lucide/Heroicons adapter is the post-1.0 evolution of that |
| `CSS-304` | feat | Toast / Modal / Tooltip / Dropdown components | HTML-only via `<dialog>` and `:popover-open` where possible |
| `CSS-305` | feat | Accordion / Stepper — Tabs pulled forward to `0.8.0` as `CSS-149` (decision `Q-08`, 2026-07-13) | Same |
| `CSS-306` | feat | RTL demo and tests after `CSS-135` | |
| `CSS-307` | dx | Figma plugin or `tokens.json` export (W3C Design Tokens) | Designer round-trip |
| `CSS-308` | feat | Additional layouts: `.layout-print`, `.layout-presentation`, `.layout-zen` | Built on the same layout infrastructure as Story / Dashboard |
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
| `v0.6.19` | _current_ — Rare Scripts Polish & Copy Primitives | The companion Rare Scripts' polish pass: carousel `v1.1.0` (`CSS-325`) and `copy-to-clipboard` `v3.2.0` with the new `data-copy-text` payload + `.rd-is-copied` (`CSS-326`), distributed via the `rare-scripts@v3.2.0` tag (`CSS-327`, shipped scripts-first). Plus icon set 137→143 + copied-state check (`CSS-328`), the **breaking** `.copy-data-icon-inverted` → `--light` rename + `--pinned` (`CSS-329`), and the first worked example (`CSS-317`) at `/examples/styles/hetke/` — a demonstration on the library's existing primitives |
| `v0.6.20` | Auto-Shop Harvest & Examples | **Open** — the actual harvest is not done: `CSS-316` (promote the auto-shop's reusable patterns *into* the library) is unstarted; the `v0.6.19` example rode existing primitives only. Site-specific patterns filed `CSS-331..336`; `CSS-333` re-lays the example onto them; `CSS-337` starts the `<body>` / `<header>` / `<section>` site-shell extraction |
| `v0.6.21` | Embedded Library | **Breaking.** Theme layer (`CSS-318`) and global containers (`CSS-319`) move out of the unavoidable baseline behind an opt-in quick-start set (`CSS-320`, naming open per `Q-12`): embedded by default, page framework on request. Proved by rebuilding the `v0.6.20` auto-shop site |
| `v0.6.22` | Lean Delivery | Consumer coverage measurement (`CSS-097`), downstream purge path with the `.rd-is-*`/`.rd-js-*` safelist contract (`CSS-210`), spacing-utility matrix prune (`CSS-079`), icon-set revision against the coverage data (`CSS-324`) |
| `v0.6.23` | CDN Migration & Pages Sunset Prep | Move docs/examples and downstream consumers off GitHub Pages URLs to versioned jsDelivr targets (`CSS-T00` umbrella included), then clear the path for Pages unpublish and legacy cleanup |
| `v0.6.24` | Docs Site Restructure | Settle and land the `/styles/` IA before `v0.7.0` starts filling it: restructure plan (`CSS-280`, promoted out of Continuous Tracks), execution incl. nav/TOC repair (`CSS-322`), benchmarked against the documentation hamburger drafts (`CSS-323`) |
| `v0.7.0` | Interactive Core & `rd-` Migration Start | **Breaking (slice 1).** `rd-` slice map + first migration slice (`CSS-133`/`CSS-141`, gradual cut per `Q-11`), button system (`CSS-040..046`) and forms (`CSS-100..105`) built `rd-`-native, semantic tokens (`CSS-121`/`CSS-124`) + focus base (`CSS-110`/`CSS-111`) as enablers. (Number revived 2026-07-13; the original Namespace Foundations scope was consumed by `v0.6.17` — see archive) |
| `v0.7.1` | Stabilization | Search tooling overhaul, quality-infra cleanup, remaining stabilization work after the `v0.7.0` breaking pass, plus its `rd-` migration slice; audit additions (2026-07-13): typographic/utility finishing (`CSS-125..146`) and the library-boundary pass (`CSS-147`/`CSS-148`) |
| `v0.7.2` | Data-View Primitives | Minimal data-view core pulled from `0.8.0` (2026-07-13): panel family (`CSS-180..183a`), stat (`CSS-184`), dense table (`CSS-185`), status/badges (`CSS-186`), toolbar (`CSS-187`), alert variants (`CSS-156`), dashboard example (`CSS-159`); plus its `rd-` migration slice and the extended-set candidates (`CSS-174..178`: meter/progress, sparkline container, chart-token slice, delta chip, legend — P2, triage at release cut) |
| `v0.7.3` | npm Delivery | **Finalizes `0.7.X`** (moved from the `0.6.x` run, 2026-07-17). Publish `@raredigits/rare-styles@0.7.3` from a clean, tested package artifact; one release-gated pipeline feeds npm, GitHub Releases, jsDelivr and unpkg (`CSS-T01`) |
| `0.8.0` | Layouts & Components Harvest | Harvest `.layout-story` / `.layout-dashboard` and the remaining components (app-shell, tabs, TOC, card variants, skeleton — `CSS-188`, `CSS-149`/`CSS-157`/`CSS-158`/`CSS-163`) from client projects, plus its `rd-` migration slice; data-view primitives moved earlier, to `v0.7.2` |
| `0.8.1` | Completeness: A11y & Architecture | A11y batch, surface/motion tokens, `@layer`, logical properties; audit additions (2026-07-13): fluid type, footnotes, table completeness, print, contrast modes, dark-ready tokens (`CSS-164..169`); forms and namespace finalization moved to `v0.7.0` |
| `0.9.0` | Release Prep (slim) | Identity docs (README / STYLEGUIDE / CONTRIBUTING / LICENSE / THEMING), demo page, scripts/charts integration, tagging + basic CI — docs site and token pipeline moved to Continuous Tracks |
| `1.0.0` | Public Release | Stable public API |

---

Dissolved planning-stage milestones (2026-07-13, never shipped): Documentation Skeleton Pressure (was `v0.6.19`) → `CSS-039` in the Documentation continuous track; Rare Digits Media Kit Prep (was `v0.6.23`) → `CSS-066`, parked.

---

# Shipped Milestones — archive

Reverse-chronological record of completed releases (newest first). Nothing here is planned work — the active roadmap lives above. Kept for task-ID lookups, decision history, and migration notes.

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
