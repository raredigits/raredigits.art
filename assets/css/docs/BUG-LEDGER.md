# Rare Styles — Bug Ledger

Owner task: `CSS-345` (`v0.7.0` Scope Gate & Bug Closure). One row per claimed defect, with reproduction, owner task, regression evidence and closure status. A claim is not counted as a defect until it is reproduced. Measurements are on the gated build in page mode (`<html class="rd">`) unless noted.

**Ledger cut: 2026-10-16**, branch `scope-gate-v0.7.0`, built from `assets/css/rare.scss`.

## Status legend

- **fixed**: reproduced, fixed in this release, with evidence.
- **open**: reproduced or verified by inspection, not yet fixed. Blocks the `v0.7.0` exit criterion "no unresolved confirmed defects".
- **hypothesis**: plausible by spec but not reproduced yet. Tracked, does not block.
- **not a defect**: checked, and the behavior is intended or the claim is false. The reason is recorded.

## Seeded defects

| ID | Claim | Reproduction | Owner | Regression evidence | Status |
|---|---|---|---|---|---|
| `CSS-346` | Generated `padding*: auto` utilities are invalid | 36 declarations in 28 classes; in the browser, `.padding-lg.padding-auto` computes `padding: 0` | `CSS-346` | `test/spacing-matrix.test.js` (fails on the pre-fix build) | fixed |
| `CSS-347` | `/styles/usage/` quick start uses API that does not exist | `--color-primary`, `--font-heading`, `.btn` are not library API; copying the example changed nothing | `CSS-347` | `test/usage-example.test.js` (fails on the old page); browser render of the copied example | fixed |
| `CSS-348` | Publication can bypass checks | Inspected: `.github/workflows/sync-css.yml` copies `assets/css/*` to `rare-styles` on every push to `main`, with no install, lint, test or build | `CSS-348` | n/a | **open** |
| `CSS-126` | `h5`/`h6` have no vertical rhythm | `h5` followed by `h6`: 0 px gap; outside a margin-collapsing flow they had no separation | `CSS-126` | Browser before/after measurements; a 26-page × 2-width shift scan showed 0 px movement on existing pages | fixed |
| `CSS-129` | Anchor targets hide under the fixed header | `#solution` and hetke `#prices` land at `top: 0` under a 48/64/54 px header | `CSS-129` | Browser: targets now 8 px below the header at 1280 and 375 px; focus scroll checked | fixed |
| `CSS-110` | No visible keyboard focus | No `:focus-visible` style; search ring at 1.2:1 | `CSS-110` | Real Tab presses: every interactive component shows the 2 px `#1677ff` ring | fixed |
| `CSS-111` | No accessible hiding utility | None shipped | `CSS-111` | Browser: idle 1×1 px, revealed on `:focus-within` | fixed |
| `CSS-112` | Motion ignores reduced-motion preference | 6 unconditional transitions | `CSS-112` | `test/motion-policy.test.js` (fails on the pre-fix build) | fixed |
| `CSS-113` | No skip link | None in markup or CSS | `CSS-113` | Real keys: link shown above the header; target clears it; next Tab lands in `article` | fixed |
| `CSS-114` | Readable text below WCAG AA | `#888` text 3.11:1 on `--bg-color` and 3.40:1 in the footer; `#ccc` submenu 1.41:1 | `CSS-114` | 14-page contrast scan: no readable role below 4.5:1 | fixed |
| `CSS-114` (mark) | `mark` contrast is borderline | Measured: black on `#ffe000` = 15.91:1 | — | — | not a defect |
| `CSS-354` | Header overflows narrow viewports | The header was not the cause. Wide article tables, the stats row, inline `code` and `.dl-grid` were | `CSS-354` | 61-page scan: 0 overflowing pages at 375 / 414 px | fixed; 320 px deferred to `CSS-164` |
| gate × consumers | The `.rd` gate breaks live consumers | Consumers are version-pinned; verifying them against the gated build is part of `CSS-340` | `CSS-340` | n/a | **open** (pending `CSS-340`) |

## Sweep findings (2026-10-16)

| ID | Area | Finding | Owner | Regression evidence | Status |
|---|---|---|---|---|---|
| `CSS-357` | Outdents in padded cards | `pre` (−32 px), `blockquote` (−16), `.card-caption`, `.full-width-caption`, `.text-content-caption`, `.lead`, `.caption`, `.highlight`, `.collapsible-container` and `.teaser-bottom` poked past a `.card` whose padding was smaller than the outdent. At 375 px this widened the page to 395 px | `CSS-357` | `test/layout-contracts.test.js`: every outdent must be reset in `.card` or explicitly exempt. Browser matrix of 4 paddings × 8 blocks × 2 widths: 0 overflow | fixed |
| `CSS-358` | Breakpoint boundary drift | Sidenotes and `.teaser-bottom` switched at `width <= 1024px` while desktop starts at `min-width: 1024px`, so at exactly 1024 px (iPad landscape) the desktop grid showed collapsed sidenotes | `CSS-358` | `test/layout-contracts.test.js`: media queries limited to the shared boundary set. Browser: 1024 px now matches 1025 px | fixed |
| `CSS-355` | Fractional viewport gap | **Reproduced 2026-10-16 in headless Chrome** (`--force-device-scale-factor` 1.1/1.25): at 768.18 px and 1023.2–1023.6 px no layer applied (`CSS-118` browser suite). The `bp.*` mixins now use gap-free range syntax | `CSS-355` | `test/browser/rendering.test.js` (fractional viewports; fails on the pre-fix build) and `test/layout-contracts.test.js` (allowed boundaries) | fixed |
| `CSS-356` | Build dependency advisories | `npm audit` (2026-10-16): 30 advisories, 1 critical (`shell-quote`, transitive), 23 high. Direct packages affected: `postcss` (source-map path traversal; our build passes the previous map as an object), `@11ty/eleventy`, `stylelint`, `vitest`. All are dev dependencies; none ships in `rare.css`. `npm audit fix` and `npm update` fail locally with an npm 11.4.2 arborist error (`edgesOut`); local Node is 22 against `engines` 24 | `CSS-356` | n/a | **open** |
| `CSS-359` | Hidden state vs component states | **Found by the `CSS-118` browser suite:** `.rd-is-hidden` (0,1,0) lost to `.searchbar.rd-is-open`, `.collapsible-content.rd-is-open` and `.carousel-slide.rd-is-active` (0,2,0), so "hidden" elements stayed visible. The earlier sweep only checked `.rd-is-hidden` on the cookie notice. Now `display: none !important` | `CSS-359` | `test/browser/rendering.test.js` (`.rd-is-hidden` × component states; fails on the pre-fix build) | fixed |
| — | Property × value validity | css-tree lexer over every declaration, with `var()` resolved through the `:root` tokens: **0 invalid** (the validator does flag `padding: auto` and `gap: auto`) | — | `test/spacing-matrix.test.js` covers the generated families | not a defect |
| — | Unresolved variables | The only `var()` without a fallback and without a declaration is `--list-rows` in `.list-fixed-rows`. It is a required, documented parameter, and every known usage sets it (raredigits.art, schnellreich.ru) | — | — | not a defect |
| — | Asset paths | 322 `url()` references in `rare.css`, all present relative to `assets/css/` | — | — | not a defect |
| — | Hidden-state specificity | `.carousel-arrow { display: flex }` vs `[hidden]`: a paired `.carousel-arrow[hidden]` rule exists; single-slide arrows verified hidden. `.rd-is-hidden` on the cookie notice verified at 1280 and 375 px | — | `test/scripts-contract.test.js` | superseded by `CSS-359` |
| — | Keyboard controls | Collapsible non-button triggers (Enter/Space), carousel arrows, hamburger and search (Escape) are covered by contract tests. Focus is visible since `CSS-110` | — | `test/scripts-contract.test.js` | not a defect |
| — | Hamburger icon contrast | **Corrected claim.** The rendered icon is black on `#f0f0f0` (≈ 18:1). The `#ccc` rule belongs to `.hamburger-img`, which no repository uses | `v0.7.6` Prune | — | not a defect (dead CSS) |
| — | Dead declarations | Same selector and context, later value wins: `article { display: flex }` (shipped behavior `block`), `th { vertical-align: bottom }` (dead since `a0d3633`, shipped `top`), `.remark { line-height: 1.2em }`. Shipped rendering is kept; the dead lines are cut-list candidates | `v0.7.6` Prune | — | not a defect (dead CSS) |

## Archive reconciliation

The shipped archive's defect records (`CSS-020..026`, `CSS-034`, the `v0.6.15` and `v0.6.17_2` audit batches) are not reopened: no sweep check above reproduces any of them. Open bug and a11y rows outside `v0.7.0` are missing features, not defects: `CSS-167` (print) and `CSS-168` (`forced-colors`).
