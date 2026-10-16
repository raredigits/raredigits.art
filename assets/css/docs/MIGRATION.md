# Rare Styles — Migration 0.6 → 0.7

Opened by `CSS-340` (2026-10-16). `0.7.X` is a breaking-allowed series, and **every breaking release appends its rows here**. The baseline is the public API of `v0.6.19`, the last `0.6` release, snapshotted in [`api/v0.6.19.json`](./api/v0.6.19.json): 4 017 classes, 130 `:root` custom properties, `rare.css`/`rare.min.css` plus maps, and `fonts/` and `images/`. Regenerate a snapshot with `node scripts/api-snapshot.mjs <git-ref|--working> <label>`.

Consumers stay on version pins and migrate after the release ships. Nothing here changes a pinned site until its pin is bumped.

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

**Effective browser floor (first written down 2026-10-16):** Chrome / Edge 111, Safari 16.4, Firefox 113. `color-mix()` (36 uses since `0.6`) already required Chrome 111 / Safari 16.2 / Firefox 113; the range media syntax (row 21, and already used by sidenotes in `0.6`) adds Safari 16.4. Older engines lose the affected rules. If a consumer needs older Safari, the fallback is `max-width: 768.98px`-style bounds (tiny theoretical gap) instead of range syntax.

API diff, `v0.6.19` → working tree on 2026-10-16: −28 classes (row 7), +2 classes (rows 14–15), +3 custom properties (row 12), 1 changed value (row 8), no removed custom property, same artifact list.

## Live consumers — verified 2026-10-16

Method: each site's built `_site` was served locally. On every page, each element's computed styles (including `::before`/`::after`) were compared between `v0.6.19` without the gate and the `v0.7.0` working build with `<html class="rd">`. Transitions were disabled for the comparison, at 1280 and 375 px.

| Site | Pin today | Pages checked | Differences found | Verdict |
|---|---|---|---|---|
| schnellreich.ru | `v0.6.19` (`_includes/head.njk`) | 9 × 2 widths: `/`, `/journal/`, 2 journal posts, `/value/`, `/legacy/`, `/vault/`, `/author/`, `/search/` | Only rows 8/9 (`#888` → `#666`), row 10 (footer `h6` +16 px on journal pages) and row 11 (`scroll-padding-top`) | Gate OK |
| raredigits.io | `v0.6.18` (`_includes/head.html`, two demo heads); `v0.6.15` hard-coded in 10 `demo/*/index.html` pages | 12 × 2 widths: `/`, services, tools, about, pricing, a pressroom post, 4 demos | Only rows 8/9, row 10 (footer `h5` +16 px on all non-demo pages) and row 11. The `v0.6.15` demo pages showed no other difference | Gate OK |

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
