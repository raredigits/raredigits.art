# Rare Styles — Harvest Candidates `v0.6.14`

**Source:** `assets/css/move-in.css` — harvested from sibling projects `SCHNELLREICH` and `RARE_IO`.
**Note:** the source file contains two identical sections (one per project). Identity across two consumers is the reuse evidence required by `v0.6.14`.

This document is the working manifest for the Cross-Project Enrichment release. It freezes the candidate list, target modules, open forks, and source-side bugs that need fixing before integration.

---

## Legend

- **Status:** `todo` · `in-progress` · `done` · `deferred` · `dropped`
- **Action:**
  - `new` — new class/module in the library
  - `patch` — extends or overrides an existing module
  - `rename` — accepted but renamed to fit library conventions
  - `fork` — outstanding design decision; resolution path noted

---

## 1. New components — `bricks/`

| Class / family | Target | Action | Status | Notes |
|---|---|---|---|---|
| `.card-grid` + `.card-grid__item` + `--cards` / `--gallery` + `.cols-2/3/4` | `bricks/_cards.scss` (card special case) | new + fork | **done** | Landed as a **self-contained tile component**, in `_cards.scss` as the repeated-card special case (decision: card-grid owns its items, not a transparent wrapper around `.card`). Normalized to hybrid BEM: generic `.cols-2/3/4` → `.card-grid--cols-N` modifiers (the bare `.cols-N` were collision-prone, `CSS-141`), backed by a `--card-grid-cols` custom property (default 5); `.gallery-item` / `.galery-title` / `.item-title` → `.card-grid__item` / `.card-grid__title`. Bugs fixed: `.galery-title` typo (**Source bug 4**), `padding-top: var(--shadow-md)` (shadow token used as spacing) → `var(--space-sm)`. `@media (width <= 1023px)` → `bp.multi-breakpoint("mobile","tablet")`. Docs positioning on `/styles/bricks/` reconciled (card-grid owns tile treatments via `--cards` / `--gallery`). See **Fork 3**. |
| `.group-list` + `.group-list__item` + `--tree` | `typography/_lists.scss` | new + rename | done | **Renamed to `.catalog-list`** (briefly `.directory-list` during the harvest pass) with a deliberately minimal BEM API: `.catalog-list__item`, `.catalog-list__title`, `.catalog-list__meta`. The harvested `__tags` / `__description` elements were dropped as over-specification — tags sit inline in the meta line, summaries are host content. `--tree` renamed to **`--nest`**: it indents everything under the title, reading as the nested children/contents of the parent named in the title. Generic source descendants (`.item-title`, `.item-meta`, `.tags`, `.item-description`) normalized away. Landed next to `.feed-list`. Name chosen so the application area (catalog / KB index / portfolio / search results) reads from the class. |
| `.list-grid` + `--toc` | `typography/_lists.scss` | new + rename | done | **Renamed to `.list-fixed-rows` + `.list-fixed-rows-2col`** (grid-based, explicit `--list-rows`, auto columns). Variants flattened per hybrid policy. The `-toc` use-case suffix was replaced with the structural `-2col` during the naming pass; TOC stays documented as the primary use case. |

## 2. New typography components

| Class / family | Target | Action | Status | Notes |
|---|---|---|---|---|
| `figure.epigraph` | ~~`typography/_epigraph.scss` (new)~~ → `typography/_text-content.scss` | new | done | Right-aligned italic attributed block. **Placed in `_text-content.scss` next to `blockquote`** rather than a new one-rule file — it is a special text element, same family as blockquote / dl (consistent with the `dl` placement decision). Duplicate `margin` removed (Source bug 2); magic `3em` gap → `var(--space-xl)`, `line-height: 1.3` → `var(--line-height-sm)`. Documented in the Special Text Elements section of `/styles/typography/text-content/`. |
| `.table-horizontal-borders` | `typography/_tables.scss` | new + rename | done | Shipped with the spelling corrected (Source bug 3). Harvested `tr:hover` was `var(--white)`; kept as `var(--white)` when table hover treatment was unified across presets. |
| `.table-comparison` | `typography/_tables.scss` | new | done | Centers all columns except the first. Decision: kept as an **independent preset** alongside `.table-terminal` (both center non-first columns) — no shared alignment modifier extracted. Documented on `/styles/typography/tables/` with the terminal-vs-comparison rule. |

## 3. New layout / utilities

| Class / family | Target | Action | Status | Notes |
|---|---|---|---|---|
| `.list-columns` + `-3/4/5` | `typography/_lists.scss` | new + rename | done | Variants flattened per hybrid policy. `.columns` renamed to `.prose-columns` in lock-step. **`-nav` / `-toc` variants dropped** — navigation and TOC have dedicated solutions (`.list-fixed-rows-2col` covers the two-column TOC case). See **Fork 1** (resolved). |
| `.wide-background` + `.wide-section` + `.wide-background-text-content-wrapper` | `bricks/_sections.scss` | new | done | Landed as a reusable full-bleed section pattern: the outer block breaks out of the normal content track to the viewport edge, while the inner wrapper returns prose/content to the canonical reading line. The harvested calc was kept, but the missing token gap is now closed in the library shell with `--field-width: max(0px, calc(50vw - (var(--site-max-width) / 2)))` in `layout/_containers.scss`; the pattern also consumes the existing `--sidebar-width` and `--grid-gap-global`. Documented with an example on `/styles/bricks/`. |
| `.scroll-container` | `utilities/_display.scss` | new | done | Landed as a minimal opt-in overflow wrapper: `overflow: auto` and nothing else. Placed in the display/overflow utility layer so consumers have a neutral scroll-enabling helper without introducing a component. |
| `.center` | `align/_align.scss` | new | done | Landed as a lightweight text/content alignment helper: `text-align: center` only. Kept distinct from the existing flex/grid centering helpers (`.center-center`, `.center-x`, `.grid-center`) so the API has a plain content-alignment option without introducing a layout mode. |
| `.paper-sheet` | `bricks/_cards.scss` | new | done | Landed as a narrow card-like surface for document-style inserts: fixed paper aspect ratio, white background, `var(--shadow-md)`, and generous inner padding. Placed with the card/bricks family rather than `special/` so it reads as a reusable content surface, not a one-off page gimmick. |

## 4. The `.lead` decision

| Class | Source intent | Library action | Status |
|---|---|---|---|
| `.lead { margin-left: calc(-1 * var(--space-lg)) }` | Typographic lead paragraph with the same outdent treatment used by neighboring special text elements | `.lead` kept as the typographic lead and updated to include `@mixin outdent` in `typography/_text-content.scss`, so it now pulls past the text column on the same rhythm as `.highlight`, `.text-content-caption`, and `.caption`. | done |

## 5. Patches to existing modules

These are not new classes — they extend or override behavior in modules already in the library. Each one needs to be evaluated against the existing rule.

| Patch | Existing module | Action | Status | Notes |
|---|---|---|---|---|
| `html, .main-body { height: 100%; min-height: 100vh; margin: 0 }` | `layout/_containers.scss` | patch | **done** | The consumer-only `.main-body` class was dropped, but the repeated shell intent across recipient projects was accepted into the library and normalized as a document/page contract: `html, body { height: 100%; min-height: 100vh; }`, `body { display: flex; flex-direction: column; ... }`, and `main { flex: 1 0 auto; ... }`. In other words, the site-specific class was not pulled in, but the full-height shell behavior was. |
| `.sidebar { overflow-y, scrollbar-width, scrollbar-color, scrollbar-gutter }` | `navigation/_sidebar.scss` | patch | **done** | Sticky-sidebar internal-scroll affordance added to the desktop `.sidebar` (`max-height: calc(100vh - header - space-lg)`, `overflow-y: auto`, thin scrollbar, `scrollbar-gutter: stable`), reset on mobile (`max-height: none; overflow-y: visible`) where the sidebar is a horizontal bar. Source `overflow-x: hidden` deliberately **not** pulled in — it risks clipping the mobile horizontal nav. |
| `.sidebar select` | `navigation/sidebar` → forms in `v0.8.0` (`CSS-100`) | patch | **deferred** | Not shipped: no `<select>` exists in any sidebar today, and the source rule references `var(--border-radius)`, which is **undeclared** in the library. Belongs with the forms module (`CSS-100`, `v0.8.0`); ship it there with a real radius token. |
| `article .text-content-caption:first-child { padding }` | `typography/_text-content.scss` | patch | **done** | First-child caption gets `padding: 0 0 var(--space-sm)`. |
| `.sidenote-wrapper > .highlight, .sidenote-wrapper > .text-content-caption { grid-column: 1 / span 6 }` | `typography/_sidenotes.scss` | patch | **done** | Verified against the 9-column sidenote grid: content spans 5, the sidenote starts at column 7, so `span 6` (cols 1–6) widens emphatic blocks without overlapping the sidenote. Placed after the `:not(:first-child, .sidenote)` rule so it wins on equal specificity. |
| `ol { margin: var(--space-sm) 0 }` | `typography/_lists.scss` | patch | dropped | Dropped during the lists rewrite — keep UA default `<ol>` margin; no library override. |
| `.highlight { margin-bottom: var(--space-md) }` | existing `.highlight` | patch | **done** | Added as a dedicated `.highlight, p.highlight { margin-bottom }` rule after the `@include outdent` block, so it wins for both `<div>` and `<p>` highlights (the outdent mixin's `margin` shorthand would otherwise zero the bottom). |
| `blockquote { background-image: url(...) }` | `typography/_text-content.scss` | patch | **done** | The existing live rule (not the redundant move-in copy) was the real target. CDN-pinned URL replaced with the relative `url('images/common/mark-quote.svg')`, which resolves both on this site and in the published package. Closes **Source bug 5** / **F7**. |
| `.cookie-notice__content button { margin-top: 0 }` | `special/_cookie-consent.scss` | patch | **dropped** | The library already sets `.cookie-notice__content button { margin-top: var(--space-md) }` intentionally; the source's `margin-top: 0` is a context-specific override that would just contradict the library default. Not pulled in — library default kept. |

## 6. Source-side bugs to fix during integration

Found in `assets/css/move-in.css`. Each must be corrected before the class lands in the library.

| # | Location | Bug | Fix |
|---|---|---|---|
| 1 | `button, .button { color: (--primary-color) }` (lines 199, 541) | Missing `var()` — declaration is invalid, color is never applied. **Not imported**: the button module already owns the intended color behavior, so this source bug does not block harvest integration. | No action in the library harvest; keep button color ownership in `elements/_buttons.scss`. |
| 2 | `figure.epigraph` (lines 206–207, 548–549) | `margin: 0 auto 3em 0` duplicated | **Fixed** — single `margin: 0 0 var(--space-xl)` (tokenized). |
| 3 | `.table-horisontal-borders` (lines 247, 589) | Misspelled `horisontal` | **Fixed** — shipped as `.table-horizontal-borders`. |
| 4 | `.galery-title` (lines 84, 426) | Misspelled `galery` | **Fixed** — the class was BEM-normalized to `.card-grid__title`, so the typo is gone entirely. |
| 5 | `blockquote { background-image: url('https://cdn.jsdelivr.net/gh/raredigits/rare-styles@v0.6.13/...') }` (lines 268, 610) | Library hardcodes its own CDN — it is the source, not a consumer. **Already live in the library too**: `typography/_text-content.scss:142` pinned the same versioned URL (see **F7**). | **Fixed** — the live module rule now uses the relative `url('images/common/mark-quote.svg')`, which resolves both on this site and in the published package. |

---

## Decision log

Harvest forks resolved during integration and kept here as a decision record.

### Fork 1 — `.list-columns` vs `.columns` — **resolved**

**Decision:** keep both, rename one for clarity.

- The two utilities solve different problems despite sharing the CSS `columns` mechanism. `.columns` was a generic columniser for prose; `.list-columns` is a specialised packer for plain lists with `list-style: none`, smart break-inside rules, and automatic mobile collapse. Merging either way would either complicate the prose utility with list-specific defaults or lose the list-specific break behaviour.
- `.columns` → **`.prose-columns`** (briefly `.text-columns` during the harvest pass) to make the prose-vs-list split explicit at the API surface and name the actual use case. The full generated family is renamed in lock-step (`prose-columns-1..6`, `mobile:prose-columns-N`, `tablet:`, `desktop:`). No alias kept — the only consumers were three `_drafts/` occurrences, already updated. Marked BREAKING in `Changelog.md`. Closes `CSS-077` early.
- `.list-columns` landed in `_lists.scss` with flat-modifier naming per the hybrid BEM policy: `.list-columns-3/4/5`. Modifier classes chain with the base (`<ul class="list-columns list-columns-3">`).
- The harvested `-nav` / `-toc` variants were **dropped**: navigation and table-of-contents have dedicated solutions. The common two-column TOC case is covered by `.list-fixed-rows-2col`.
- Both column utilities will be re-released under the `rd-` namespace in `v0.6.15` (`CSS-060..063`) as `.rd-prose-columns` and `.rd-list-columns`.

**Final lists taxonomy** (after the second normalization pass):

| Class | Mechanism | Lever | Use case |
|---|---|---|---|
| `.list-columns` (+ `-3/4/5`) | CSS `columns`, balanced | column-count | A single long flat list, mechanical balancing is fine |
| `.list-group-pack` (renamed from `.list-pack`; briefly `.list-multigroup`) | CSS `columns`, `column-fill: auto` | min column width + height | Several grouped sublists with subheadings that must not split |
| `.list-fixed-rows` (+ `-2col`, renamed from harvested `.list-grid`) | CSS `grid` | explicit `--list-rows` | Precise row count, auto column count (two-column TOC) |
| `.prose-columns` (renamed from `.columns`; briefly `.text-columns`) | CSS `columns` | column-count | The rare prose-into-columns case; kept but not featured on the lists page |

Status of source classes: `.cols-3/4/5` → `.list-columns-3/4/5`; `.list-columns--nav` / `--toc` → dropped; `.list-grid` / `--toc` → `.list-fixed-rows` / `.list-fixed-rows-2col`.

### Fork 2 — `.lead` — **resolved**

**Decision:** keep `.lead` as the typographic lead paragraph and give it the same outdent treatment used by neighboring special text elements.

- The library already owns `.lead` as a typographic pattern in `typography/_text-content.scss`; the harvest question was not naming, but whether the lead should also break out of the text column like other emphatic text blocks.
- The answer is yes: `.lead` now includes the shared `@mixin outdent`, so it inherits the same left/right breakout rhythm already used by `.highlight`, `.text-content-caption`, and `.caption`.
- No rename introduced. Public naming stays aligned with the content role; the visual breakout is treated as part of that role.

### Fork 3 — `.card-grid` BEM convention — **resolved**

**Decision:** hybrid convention.

- **BEM** (`block__element`, `block--modifier`) — for **component classes** in `bricks/` and `elements/`. A component is a block with internal structural elements (`__header`, `__item`) and/or named variants (`--bordered`, `--gallery`).
- **Flat hyphen** (`block-modifier`) — for utilities, layout primitives, decorations, and everything else.

**Application to harvested classes:**

| Source name | Module | Final name | Why |
|---|---|---|---|
| `.card-grid` + `__item` + `--cards` / `--gallery` | `bricks/` | `.card-grid` + `__item` + `__title` + `--cards` / `--gallery` + `--cols-N` (BEM) | Component with internal structure; shipped as a self-contained tile component. Generic `.cols-N` → BEM `--cols-N` modifier. |
| `.group-list` + `__item` + `--tree` | `typography/_lists.scss` | `.catalog-list` + `__item` + `--nest` | Renamed and repositioned as a typography list pattern rather than kept as a bricks component |
| `.list-grid` + `--toc` | `bricks/` if it keeps `__` internals, else `layout/` | TBD after module placement decision | Boundary case |
| `.list-columns` + `--nav` / `--toc` | `layout/` (utility) | `.list-columns-nav`, `.list-columns-toc` (flat) | Layout/list utility, not a component |
| `.wide-background`, `.wide-section` | `layout/` | unchanged (flat) | Layout primitive |
| `.scroll-container`, `.center`, `.paper-sheet` | utilities / decorations | unchanged (flat) | Not components |

**Precedent already in backlog:** `CSS-180..183a` in `0.8.0` previously specified `.panel-header`, `.panel-body`, `.panel-footer`, `.panel-bordered`, `.panel-flush` (flat). Under the hybrid policy these become `.panel__header`, `.panel__body`, `.panel__footer`, `.panel--bordered`, `.panel--flush` — updated in `BACKLOG.md`.

**Scope of this decision:** applies to **new code only**. Existing `.card-*` family stays as is; migration to BEM (`card__row`, `card--dashboard-bordered`) is not in scope for `v0.6.14`. Revisit before `1.0.0`.

---

## Integration order (when forks are resolved)

1. Fix source bugs (Section 6) in `assets/css/move-in.css` — or skip the file entirely and write corrected versions directly into modules.
2. Apply recorded fork decisions from the decision log below.
3. Patches first (Section 5) — they are small, scoped, and de-risk the rest.
4. New components / utilities (Sections 1–4).
5. Final pass: verify nothing in `move-in.css` is left unaccounted for, then delete `move-in.css`.

---

## Findings during integration

Things noticed while harvesting; not blockers, but logged so they are not lost.

| # | What | Where | Status |
|---|---|---|---|
| F1 | `.collapsible-content` overrides outdent `margin-left` (`calc(-1 * (var(--space-md) + var(--space-sm)))`) on `.caption`, `.highlight`, `pre`, `.text-content-caption`, `.card-caption` — but leaves `margin-right` at the default. After `@mixin outdent` lands with symmetric mobile, this asymmetry is more visible. | `assets/css/modules/special/_collapsible.scss:33-44`, `:46-56` | Logged — out of scope for this release; candidate for `v0.6.14_1` audit hotfix bundle (`CSS-047`). |
| F2 | `.nav-list` was split across two modules: a list-reset copy in `_lists.scss` plus a `margin-bottom` copy in `navigation/_navigation.scss` — and the reset duplicated `.list-unstyled`. | `_lists.scss`, `navigation/_navigation.scss` | **Resolved** — consolidated into a single self-contained `.nav-list` in `navigation/_navigation.scss`; reset dropped from `_lists.scss`. |
| F3 | `.prose-columns .list` rule lived in `_lists.scss` although `.prose-columns` is defined in `_text-content.scss` (cross-module placement); `.list` is a generic marker. | `_lists.scss` → `_text-content.scss` | **Resolved** — rule moved next to `.prose-columns` in `_text-content.scss`. |
| F4 | `.index-list` used tag selectors (`.index-list h4`, `.index-list ul li`), inconsistent with the BEM siblings `.feed-list` / `.catalog-list`. | `_lists.scss`, `styles/modules/table-of-contents/index.njk` | **Resolved** — BEM-normalized to `.index-list__title` / `.index-list__item`; the `<ul>` reset now reuses `.list-unstyled` in markup. `.feed-list` itself was BEM-normalized in the same pass (`__title`, `__meta`). Superseded within the release: `.index-list__title` was later retired in favor of the shared `.list-title` utility, and `.index-list__item` in favor of the component styling its canonical inner `ul`/`li` via child combinators (BEM elements stay reserved for role-ambiguous containers like `div`/`span`). |
| F5 | `.index-list` and `dl` / `.dl-inline` are not yet documented on `/styles/typography/lists/` (index-list's live example is the ToC page). | docs | **Resolved** — `.index-list` documented on the lists page; definition lists documented in the Special Text Elements section of `/styles/typography/text-content/` after the `dl` styles moved to `_text-content.scss` (`.dl-inline` renamed to `.dl-grid` along the way). |
| F6 | `.wide-background` token wiring: the harvested calc consumes `--sidebar-width` (declared in `navigation/_sidebar.scss:4`, currently unused by the library — wire it) and `--field-width` (declared nowhere — the `margin-left` calc breaks silently without it). | `move-in.css:203-234`, `navigation/_sidebar.scss:4` | **Resolved** — `--field-width: max(0px, calc(50vw - (var(--site-max-width) / 2)))` is now declared in `layout/_containers.scss`, and the harvested breakout pattern landed in `bricks/_sections.scss` consuming both shell tokens. |
| F7 | Harvest source bug 5 is already live in the library: `blockquote` in `typography/_text-content.scss:142` hardcodes the versioned jsDelivr URL for `mark-quote.svg`. Circular self-reference (the source points at its own release), breaks offline dev, requires a manual bump every release. | `typography/_text-content.scss:142` | **Resolved** — replaced with the relative `url('images/common/mark-quote.svg')` during the Section 5 blockquote patch. |

---

## Acceptance for this manifest

- [x] Every entry in Sections 1–5 has a final status of `done`, `deferred` (with target milestone), or `dropped` (with reason).
- [x] All source bugs in Section 6 are corrected at integration time.
- [x] All forks in Section 7 are resolved with the decision noted in this file.
- [x] `assets/css/move-in.css` is deleted.
- [x] `CSS-038` (fate of `move-in.css`) in `BACKLOG.md` is closed.
