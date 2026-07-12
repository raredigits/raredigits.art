# Rare Styles ↔ Rare Scripts — Contract

**Release:** `v0.6.17` (`CSS-064` audit / `CSS-065` target contract). Implemented by `CSS-068` (JS rewrite) and `CSS-069` (CSS follow-through); `carousel` joined via the `CSS-088` harvest.
**Scope:** the five original companion scripts — `collapsible`, `cookie-consent`, `copy-to-clipboard`, `hamburger`, `search` — plus `carousel`, harvested from schnellreich.ru into the collection in `v0.6.17` and born on the contract (no as-was pass; see the harvest note below the target table). Undocumented site scripts (`header-scroll.js`, `gridDisplay.js`, `themeSwitcher.js`) are out of contract — see Findings.

This document has two halves: the **as-was audit** (what each script actually read and wrote before the rewrite — from the JS in `assets/js/`, not the `/scripts/` doc pages) and the **target contract** every script conforms to from `v0.6.17` on.

The target contract is regression-tested: [`test/scripts-contract.test.js`](../../../test/scripts-contract.test.js) evals each real script inside an isolated JSDOM window and asserts hooks, state classes, ARIA, guards, and per-script behavior (run via `npx vitest run`).

---

## Distribution map (audited 2026-07-12)

| Script | Loaded on this site from | Reaches consumers via |
|---|---|---|
| `collapsible.js` | `_includes/scripts.njk` (single include shared by all layouts since `v0.6.17` — previously per-layout lists, and `main.njk` was silently missing `search.js`) | Hand-copy / download link on `/scripts/collapsible/` |
| `cookie-consent.js` | **CDN**: `rare-scripts@v3.0.0/simple-cookie-notice/cookie-consent.min.js` (`_includes/special/cookie-consent.njk`) — re-pinned to the rewritten build once `rare-scripts@v3.0.0` was published; local `assets/js/cookie-consent.js` remains the unminified source of truth | Versioned jsDelivr pin on the `raredigits/rare-scripts` repo |
| `copy-to-clipboard.js` | `_includes/scripts.njk` (plus a `copy-to-clipboard.min.js` alongside — the only min variant in `assets/js/`) | Hand-copy / download link |
| `hamburger.js` | `_includes/scripts.njk` (was duplicated across `footer.njk` and `main.njk` before the shared include) | Hand-copy / download link |
| `search.js` | `_includes/scripts.njk` | Site-specific (Pagefind); unlikely copied as-is |
| `carousel.js` | Per-page via front matter (`scripts: [carousel]`), not in the global `scripts.njk` — only pages with a carousel load it | Hand-copy / download link on `/scripts/carousel/` |

**Consequence for the `v0.6.17` hard cut:** script consumers are naturally version-gated — CDN pins (`@v1.0.0`) and hand-copied files keep working unchanged. The theoretical un-gated surface is **CSS** via `sync-css.yml`; however both known downstream consumers **pin the CSS by version**, so the hard cut does not break either on merge (audited 2026-07-12/13):
- **schnellreich.ru** — `rare-styles@v0.6.16`. Migration surface: JS copies of `hamburger`/`cookie-consent`/`search`/`carousel`, markup hooks in `header.njk` / `hamburger.njk` / `cookie-consent.njk` / `main-header.njk`, one legacy `collapsible-trigger`, and old `.carousel-img`/`.carousel-arrow.left` carousel markup in 5 posts.
- **raredigits.io** — `rare-styles@v0.6.16` (plus one corsair demo on `@v0.6.15`) and a local layered `/assets/css/rare.css`. Narrower surface: only `hamburger` + `cookie-consent` (JS copies + old markup: `.material-symbols-outlined icon-menu/icon-close`, `#cookie-notice`/`#cookie-notice-accept`). No carousel/collapsible/copy/search usage. Note: `_editorial/prompts/markup.md` references old hooks but is editorial reference, not live markup.

Each consumer's migration must land **in the same commit as its pin bump** to `@v0.6.17` — that is the `CSS-071` deliverable.

---

## As-was contract (pre-`v0.6.17` audit)

### `collapsible.js`

| | |
|---|---|
| **Hooks (reads)** | `.collapsible-trigger` (all), content resolved structurally: trigger's `nextElementSibling.collapsible-content`, else trigger's parent's `nextElementSibling.collapsible-content`; optional `.collapsible-icon` inside the trigger; computed `display` of content |
| **Writes** | `content.style.display` = `'none'` / `'block'` (inline); `icon.textContent` = `keyboard_arrow_down` / `keyboard_arrow_up` (Material Symbols glyph names) |
| **State mechanism** | Inline `display`; initial hidden state from CSS `.collapsible-content { display: none }` |
| **ARIA** | None — no `aria-expanded`, no `aria-controls` |
| **Keyboard** | None — click only; triggers are `<span>`/`<div>` in practice, not focusable |
| **CSS side** | `special/_collapsible.scss`: `.collapsible-container` (style-only, JS never touches), `.collapsible-trigger` (dashed underline), `.collapsible-content` (hidden default + outdent overrides — see `CSS-047`), `.collapsible-icon` |

### `cookie-consent.js`

| | |
|---|---|
| **Hooks (reads)** | `#cookie-notice`, `#cookie-notice-accept` (IDs); cookie `cookie-notice-dismissed` |
| **Writes** | `cookieNotice.style.display` = `'none'` / `'block'` (inline); cookie (31 days, `Path=/`, `SameSite=Lax`, `Secure` on https) |
| **State mechanism** | Inline `display` + persistent cookie |
| **ARIA** | None |
| **CSS side** | `special/_cookie-consent.scss`: `.cookie-notice` (BEM family `__content`, `__button`) — **`display: block` by default**, so dismissed users get a paint-then-hide flash (see Findings) |

### `copy-to-clipboard.js`

| | |
|---|---|
| **Hooks (reads)** | `.copy-data-icon` (delegated document click); `data-copy-target` (CSS selector → element text), else nearest `[data-copy]` (closest ancestor or a sibling-descendant) → `href` or trimmed text; `data-copy-busy` re-entry flag |
| **Writes** | `data-icon` attr (`content_copy` ↔ `check`, reset after 1200 ms); `data-copy-busy`; `_copyTimer` expando; clipboard via `navigator.clipboard` with `execCommand('copy')` textarea fallback |
| **State mechanism** | `data-*` attributes; glyph rendered by CSS `content: attr(data-icon)` |
| **ARIA** | None — success is visual-only, no live-region announcement |
| **CSS side** | `decorations/_icons.scss:26-50`: `.copy-data-icon` + `::before { content: attr(data-icon) }` (note: `CSS-231`'s "no companion CSS module" claim refers to button/toast styling; the icon rendering itself *is* CSS-backed) |

### `hamburger.js`

| | |
|---|---|
| **Hooks (reads)** | `.hamburger` (first), `.nav-hamburger` (first) |
| **Writes** | Toggles class `.active` on both; document-level click-outside closes |
| **State mechanism** | `.active` class (the only script already using class-based state) |
| **ARIA** | None — trigger is a `<button aria-label>` (`_includes/header.njk:26`) but never gets `aria-expanded` |
| **Bugs** | No guard: throws `TypeError` on any page without `.hamburger` (script is loaded globally from `footer.njk` *and* `main.njk`) |
| **CSS side** | `navigation/header/_hamburger.scss`: `.hamburger.active .icon-menu/.icon-close` (icon swap), `.nav-hamburger.active` (slide-in) — the legacy state selectors removed in `CSS-069` |

### `search.js`

| | |
|---|---|
| **Hooks (reads)** | Bails on `body.page-search`; `#search-button`, `#searchbar`, `#search` (IDs); `window.PagefindUI`; first `input` inside the container |
| **Writes** | `bar.hidden` (native attr); `.has-query` class on the bar; instantiates `PagefindUI` into `#search`; `Escape` key listener while open |
| **State mechanism** | `hidden` attribute + `.has-query` class |
| **ARIA** | None of its own (`aria-label` on the button is markup; Pagefind UI ships its own internals) |
| **CSS side** | `navigation/header/_search.scss`: `.searchbar` + Pagefind adapter rules. **`.has-query` is styled nowhere** — a dead write (see Findings) |

---

## Systemic findings (feed the target contract)

1. **Selector strategy diverges** — three scripts hook by class, two (`cookie-consent`, `search`) by ID. IDs conflate the JS hook with markup identity and forbid multiple instances.
2. **State is expressed four different ways** — inline `display` (`collapsible`, `cookie-consent`), `.active` (`hamburger`), `hidden` + `.has-query` (`search`), `data-*` (`copy`). CSS cannot style states it does not own; inline styles win specificity wars invisibly.
3. **ARIA is absent everywhere** — no `aria-expanded` / `aria-controls` on any toggle. Routed: baseline mechanical ARIA lands in `CSS-068`; the deeper a11y story (focus, live regions) stays with `CSS-050` / `CSS-110..114`.
4. **No missing-element guards** — `hamburger.js` throws on pages without a hamburger.
5. **Dead state write** — `.has-query` is set/removed by `search.js` but styled by nothing. Either style it or stop writing it (`CSS-069` decision).
6. **Cookie-notice FOUC** — `.cookie-notice` is `display: block` in CSS; dismissed users could see a paint-then-hide flash while the script waited for `DOMContentLoaded`. **Resolved in `v0.6.17`:** the script initializes immediately when the notice markup is already parsed (`readyState` pattern shared with `search.js`), so a synchronous include right after the markup hides a dismissed notice before paint; an optional inline guard is documented on `/scripts/cookies/` for `defer`/CDN setups. The visible-by-default CSS is kept deliberately — hiding by default would make the notice invisible to no-JS visitors and delay it for first-time visitors.
7. **Keyboard access** — collapsible triggers are non-focusable inline elements. The contract below makes `<button>` the canonical trigger markup; existing content migrates in `CSS-070`.
8. **Undocumented companions** — `header-scroll.js`, `gridDisplay.js`, `themeSwitcher.js` load on the site but have no `/scripts/` page and no contract. Route: file for triage in the next backlog pass (contract them or mark site-internal).

---

## Target contract (from `v0.6.17`)

### Rules

1. **Hooks:** JS finds DOM **only** via `.rd-js-*` classes. No ID hooks, no styled-class hooks. `.rd-js-*` selectors are never styled by CSS (`CSS-067` / namespace policy in `STYLEGUIDE.md`).
2. **Separation of concerns:** every interactive element carries up to three orthogonal class families — presentational (`.collapsible-trigger`, `.hamburger`, … — styled, never read by JS), hook (`.rd-js-*` — read by JS, never styled), state (`.rd-is-*` — written by JS, styled by CSS).
3. **State:** JS expresses state **only** by toggling `.rd-is-open` (disclosure surfaces), `.rd-is-active` (toggles/menus), `.rd-is-hidden` (dismissed surfaces). Zero inline `style.*` writes **for UI state** — transient utility elements that never render as UI are mechanism, not state, and are exempt (the one existing case: the clipboard fallback's off-screen `textarea` in `copy-to-clipboard.js`). `data-*` remains legitimate for *payload* (what to copy), not for visual state.
4. **ARIA:** any trigger that toggles content carries `aria-expanded` (mirrored on every toggle) and, when the content is not its sibling, `aria-controls` pointing at the content's `id`. Styling MAY key off ARIA (`[aria-expanded="true"]`) — that is state, not hook.
5. **Canonical trigger markup is `<button>`** — focusable, keyboard-operable for free.
6. **Guards:** every script no-ops gracefully when its hooks are absent.
7. **Doc pages** under `/scripts/` show canonical markup and are regenerated whenever a script's contract changes (`CSS-070`).

### Per-script mapping

| Script | Hook(s) | State | ARIA | Removed (hard cut) |
|---|---|---|---|---|
| `collapsible` | `.rd-js-collapsible` on the trigger; content via `aria-controls` id, else structural fallback: nearest sibling `.rd-js-collapsible-content` (trigger's or trigger's parent's next sibling) — the fallback recognizes content by its hook class, never by the presentational `.collapsible-content` | `.rd-is-open` on trigger + content; open state styled by CSS (`display`), icon rotation via `[aria-expanded="true"] .collapsible-icon` (no `textContent` swap) | `aria-expanded`, `aria-controls`; non-`<button>` triggers get `tabindex="0"` + `role="button"` and toggle on Enter/Space | JS reads of `.collapsible-trigger` / `.collapsible-content` as hooks; inline `display`; glyph swapping |
| `cookie-consent` | `.rd-js-cookie-consent` on the notice, `.rd-js-cookie-accept` on the button | `.rd-is-hidden` on the notice (CSS: `display: none`) | — (dialog semantics deferred with the UX pass) | `#cookie-notice` / `#cookie-notice-accept` as JS hooks; inline `display` |
| `copy-to-clipboard` | `.rd-js-copy` (delegated); `data-copy` / `data-copy-target` stay as payload API | `data-icon` stays (rendered glyph = payload, not layout state); `data-copy-busy` stays internal | — (live-region announcement deferred to `CSS-231`) | JS reads of `.copy-data-icon` as hook (class stays presentational) |
| `hamburger` | `.rd-js-hamburger` on the trigger, `.rd-js-hamburger-nav` on the panel | `.rd-is-active` on both (replaces `.active`); Escape and outside-click close (listeners attached only while open); icon swap is presentational BEM (`.hamburger__icon-menu` / `.hamburger__icon-close`, renamed from the collision-prone `.icon-menu` / `.icon-close`) | `aria-expanded` on the trigger; `aria-controls` when the panel has an `id` | `.active` state selectors in `_hamburger.scss`; unguarded querySelector |
| `search` | `.rd-js-search` on the toggle button, `.rd-js-search-bar` on the bar, `.rd-js-search-ui` on the Pagefind mount | `.rd-is-open` on the bar (replaces raw `hidden` toggling); `.has-query` dropped (was styled nowhere) | `aria-expanded` on the toggle; `aria-controls` when the bar has an `id` (ids stay in markup as ARIA/anchor identity — they are just never used as JS hooks) | `#search-button` / `#searchbar` / `#search` as JS hooks |
| `carousel` | `.rd-js-carousel` on the root (scope), `.rd-js-carousel-track` (its **element children are the slides** — the script never reads the `.carousel-slide` styling class), `.rd-js-carousel-prev` / `-next` on the arrow buttons, `.rd-js-carousel-dots` on the container the script fills | `.rd-is-active` on the current slide and its generated dot | `role="group"` + `aria-roledescription="carousel"` on the root; arrows/dots are real `<button>`s with labels; `aria-hidden` on inactive slides; `aria-current` on the active dot; `←`/`→` keys | (harvest — no legacy hooks to remove; see note) |

**Harvest note — `carousel` (`v0.6.17`).** Not part of the original five-script audit. Taken from schnellreich.ru (`assets/js/carousel.js` + `.carousel*` rules in `sch_styles.css`) and rebuilt directly on the contract, so there is no as-was pass — the pre-harvest source and its defects are recorded on `/scripts/carousel/` (changelog) and here:
- **Multi-instance bug (real):** the source collected every `.carousel-img` on the page into one flat list with one shared `idx` and the first arrows — a second carousel on a page broke both. The rewrite scopes all queries to each `.rd-js-carousel` root.
- Hooks were styling classes (`.carousel-arrow.left`), state was `.active`, arrows were non-focusable `<div>`s, no ARIA — all replaced per the mapping row above.
- Captions did not travel: a single `<cite>` sat outside the carousel. A slide is now a `<figure>` holding the image + optional `<figcaption class="carousel-caption">`, so the caption moves with its image.
- Styles were untokenized (hardcoded `rgb`/px, vendor `.material-symbols-outlined`, a dead `transform` transition on a `display`-toggled track). Rebuilt in `special/_carousel.scss` with `--space-*`, recolorable `--carousel-*` component tokens, and baked chevron glyphs via `symbol()`.

Reserved but not shipped: `.rd-js-dropdown` (documented reservation from `CSS-062`), `.rd-is-loading`, `.rd-is-disabled` (documented convention).

**Icon glyphs are CSS-owned.** All script-surface icons render through the `symbol()` mixin (`utilities/_symbols.scss`): the component class carries the Material Symbols font and draws the glyph via `::before` — baked (`.hamburger__icon-menu`, `.hamburger__icon-close`, `.collapsible-icon`, `.icon-search`) or from `data-icon` (`.copy-data-icon`). Markup never carries the vendor `.material-symbols-outlined` class or ligature text on these surfaces; the icon elements are empty. Inside a `button`-role element the glyph is a11y-neutral (children are presentational). The site-wide sweep of the remaining vendor-class usages is `CSS-087`.

---

## Doc-page drift log (`CSS-070` records here, does not silently patch)

- `/scripts/collapsible/` — raw-code block matched the shipped JS at audit time; page claims `max-height: 0` is a valid hidden default, but the JS toggle keys off computed `display` only. Superseded by the rewrite either way.
- `/scripts/` pages vs `assets/js/`: `cookie-consent` local source verified identical to the pinned CDN build (2026-07-12). No drift.
- `copy-to-clipboard.min.js` decision (`CSS-070`): kept and regenerated from the rewritten source via esbuild (`node_modules/.bin/esbuild assets/js/copy-to-clipboard.js --minify`) — it is downloadable and would otherwise have shipped the pre-contract hook.
- Doc pages carried NBSP (U+00A0) characters inside prose — cosmetic authoring artifact, left as-is.
- *(append findings during the `CSS-070` sweep)*
