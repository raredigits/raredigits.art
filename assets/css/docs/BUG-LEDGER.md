# Rare Styles — Bug Ledger

Owner task: `CSS-345` (`v0.7.0` Scope Gate & Bug Closure). One row per claimed defect, with reproduction, owner task, regression evidence and closure status. A claim is not counted as a defect until it is reproduced. Measurements are on the gated build in page mode (`<html class="rd">`) unless noted.

**Ledger cut: 2026-10-16**, branch `scope-gate-v0.7.0`, built from `assets/css/rare.scss`.

## Status legend

- **fixed**: reproduced, fixed in this release, with evidence.
- **open**: reproduced or verified by inspection, not yet fixed. Blocks the `v0.7.0` exit criterion "no unresolved confirmed defects". (As of 2026-10-16 the only open row is the gate × consumers check, which `CSS-340` closed: see `MIGRATION.md`.)
- **hypothesis**: plausible by spec but not reproduced yet. Tracked, does not block.
- **not a defect**: checked, and the behavior is intended or the claim is false. The reason is recorded.

## Seeded defects

| ID | Claim | Reproduction | Owner | Regression evidence | Status |
|---|---|---|---|---|---|
| `CSS-346` | Generated `padding*: auto` utilities are invalid | 36 declarations in 28 classes; in the browser, `.padding-lg.padding-auto` computes `padding: 0` | `CSS-346` | `test/spacing-matrix.test.js` (fails on the pre-fix build) | fixed |
| `CSS-347` | `/styles/usage/` quick start uses API that does not exist | `--color-primary`, `--font-heading`, `.btn` are not library API; copying the example changed nothing | `CSS-347` | `test/usage-example.test.js` (fails on the old page); browser render of the copied example | fixed |
| `CSS-348` | Publication can bypass checks | Inspected: `.github/workflows/sync-css.yml` copied `assets/css/*` to `rare-styles` on every push to `main`, with no install, lint, test or build | `CSS-348` | `release-css.yml` (verify → publish → verify-cdn) and `test/release-css.test.js`; a local `v0.6.19` artifact matches jsDelivr byte for byte | fixed (the first live run is the next release) |
| `CSS-126` | `h5`/`h6` have no vertical rhythm | `h5` followed by `h6`: 0 px gap; outside a margin-collapsing flow they had no separation | `CSS-126` | Browser before/after measurements; a 26-page × 2-width shift scan showed 0 px movement on existing pages | fixed |
| `CSS-129` | Anchor targets hide under the fixed header | `#solution` and hetke `#prices` land at `top: 0` under a 48/64/54 px header | `CSS-129` | Browser: targets now 8 px below the header at 1280 and 375 px; focus scroll checked | fixed |
| `CSS-110` | No visible keyboard focus | No `:focus-visible` style; search ring at 1.2:1 | `CSS-110` | Real Tab presses: every interactive component shows the 2 px `#1677ff` ring | fixed |
| `CSS-111` | No accessible hiding utility | None shipped | `CSS-111` | Browser: idle 1×1 px, revealed on `:focus-within` | fixed |
| `CSS-112` | Motion ignores reduced-motion preference | 6 unconditional transitions | `CSS-112` | `test/motion-policy.test.js` (fails on the pre-fix build) | fixed |
| `CSS-113` | No skip link | None in markup or CSS | `CSS-113` | Real keys: link shown above the header; target clears it; next Tab lands in `article` | fixed |
| `CSS-114` | Readable text below WCAG AA | `#888` text 3.11:1 on `--bg-color` and 3.40:1 in the footer; `#ccc` submenu 1.41:1 | `CSS-114` | 14-page contrast scan: no readable role below 4.5:1 | fixed |
| `CSS-114` (mark) | `mark` contrast is borderline | Measured: black on `#ffe000` = 15.91:1 | — | — | not a defect |
| `CSS-354` | Header overflows narrow viewports | The header was not the cause. Wide article tables, the stats row, inline `code` and `.dl-grid` were | `CSS-354` | 61-page scan: 0 overflowing pages at 375 / 414 px | fixed; 320 px deferred to `CSS-164` |
| gate × consumers | The `.rd` gate breaks live consumers | Computed-style diff of schnellreich.ru (9 pages) and raredigits.io (12 pages) at 1280/375, `v0.6.19` vs the gated build + `<html class="rd">`: only the expected deltas | `CSS-340` | `MIGRATION.md` ("Live consumers — verified 2026-10-16") | fixed (no breakage) |

## Sweep findings (2026-10-16)

| ID | Area | Finding | Owner | Regression evidence | Status |
|---|---|---|---|---|---|
| `CSS-357` | Outdents in padded cards | `pre` (−32 px), `blockquote` (−16), `.card-caption`, `.full-width-caption`, `.text-content-caption`, `.lead`, `.caption`, `.highlight`, `.collapsible-container` and `.teaser-bottom` poked past a `.card` whose padding was smaller than the outdent. At 375 px this widened the page to 395 px | `CSS-357` | `test/layout-contracts.test.js`: every outdent must be reset in `.card` or explicitly exempt. Browser matrix of 4 paddings × 8 blocks × 2 widths: 0 overflow | fixed |
| `CSS-358` | Breakpoint boundary drift | Sidenotes and `.teaser-bottom` switched at `width <= 1024px` while desktop starts at `min-width: 1024px`, so at exactly 1024 px (iPad landscape) the desktop grid showed collapsed sidenotes | `CSS-358` | `test/layout-contracts.test.js`: media queries limited to the shared boundary set. Browser: 1024 px now matches 1025 px | fixed |
| `CSS-355` | Fractional viewport gap | **Reproduced 2026-10-16 in headless Chrome** (`--force-device-scale-factor` 1.1/1.25): at 768.18 px and 1023.2–1023.6 px no layer applied (`CSS-118` browser suite). The `bp.*` mixins now use gap-free range syntax | `CSS-355` | `test/browser/rendering.test.js` (fractional viewports; fails on the pre-fix build) and `test/layout-contracts.test.js` (allowed boundaries) | fixed |
| `CSS-356` | Build dependency advisories | `npm audit` 2026-10-16: 30 advisories (1 critical). Refreshed on Node 24 / npm 11.19 with `npm audit fix`, leaving 10: one `stylelint` → `braces` chain with **no upstream fix** (`braces` ≤ 3.0.3 affected, 3.0.3 is the latest release). It only ever sees our fixed glob, so the risk is accepted | `CSS-356` | Outputs byte-identical after the update; clean `npm ci` and the full check suite pass on Node 24 | fixed (10 high accepted, see the task) |
| `CSS-359` | Hidden state vs component states | **Found by the `CSS-118` browser suite:** `.rd-is-hidden` (0,1,0) lost to `.searchbar.rd-is-open`, `.collapsible-content.rd-is-open` and `.carousel-slide.rd-is-active` (0,2,0), so "hidden" elements stayed visible. The earlier sweep only checked `.rd-is-hidden` on the cookie notice. Now `display: none !important` | `CSS-359` | `test/browser/rendering.test.js` (`.rd-is-hidden` × component states; fails on the pre-fix build) | fixed |
| — | Property × value validity | css-tree lexer over every declaration, with `var()` resolved through the `:root` tokens: **0 invalid** (the validator does flag `padding: auto` and `gap: auto`) | — | `test/spacing-matrix.test.js` covers the generated families | not a defect |
| — | Unresolved variables | The only `var()` without a fallback and without a declaration is `--list-rows` in `.list-fixed-rows`. It is a required, documented parameter, and every known usage sets it (raredigits.art, schnellreich.ru) | — | — | not a defect |
| — | Asset paths | 322 `url()` references in `rare.css`, all present relative to `assets/css/` | — | — | not a defect |
| — | Hidden-state specificity | `.carousel-arrow { display: flex }` vs `[hidden]`: a paired `.carousel-arrow[hidden]` rule exists; single-slide arrows verified hidden. `.rd-is-hidden` on the cookie notice verified at 1280 and 375 px | — | `test/scripts-contract.test.js` | superseded by `CSS-359` |
| — | Keyboard controls | Collapsible non-button triggers (Enter/Space), carousel arrows, hamburger and search (Escape) are covered by contract tests. Focus is visible since `CSS-110` | — | `test/scripts-contract.test.js` | not a defect |
| — | Hamburger icon contrast | **Corrected claim.** The rendered icon is black on `#f0f0f0` (≈ 18:1). The `#ccc` rule belongs to `.hamburger-img`, which no repository uses | `v0.7.6` Prune | — | not a defect (dead CSS) |
| — | Dead declarations | Same selector and context, later value wins: `article { display: flex }` (shipped behavior `block`), `th { vertical-align: bottom }` (dead since `a0d3633`, shipped `top`), `.remark { line-height: 1.2em }`. Shipped rendering is kept; the dead lines are cut-list candidates | `v0.7.6` Prune | — | not a defect (dead CSS) |

## Backlog scan and second sweep (2026-10-16, later)

Found while the maintainer reviewed the session; **recorded, not fixed yet**.

| ID | Area | Finding | Owner | Status |
|---|---|---|---|---|
| `CSS-360` | Keyboard: closed hamburger menu | Headless-Chrome Tab sweep (7 pages × 1280/375): on **every page** the 13 links of the closed `.nav-hamburger` take focus while invisible (off-screen at `top: -100%`, y ≈ −845). `hamburger.js` toggles only `.rd-is-active`/`aria-expanded`, and nothing removes the closed menu from the tab order (no `visibility: hidden`, no `inert`). WCAG 2.4.3 / 2.4.7 | `CSS-360` | **open** |
| `CSS-361` | Focus hidden by the cookie banner | While consent is pending, the fixed `.cookie-notice` covers focused elements near the bottom of the viewport (collapsible summary, carousel arrow, copy button, footer links), seen on 5 of 7 pages. WCAG 2.4.11 Focus Not Obscured. Candidate fix: `scroll-padding-bottom` while the notice is visible | `CSS-361` | **open** |
| `CSS-364` | Text roles on `.card-inverted` | `.card-inverted` (`--gray-dark` background) re-colours only itself and `a`. Elements with their own role colour stay dark: `cite` 1.00:1 (the `.card-inverted` label on `/styles/bricks/` is invisible), `.meta-info`/`.note`/`.callout`/`.remark`/`.footnote` 2.20:1, heading links 1.66:1. Fix: re-map the text-role tokens inside inverted surfaces, and make `cite` use a role token instead of `--gray-dark` | `CSS-364` | **open** |
| `CSS-362` | Docs: table of contents | `/styles/modules/table-of-contents/` (`_data/tableOfContents.json`): **all 27 section anchors are dead**. They are written with a trailing slash (`#grid/`), and the target pages give their headings no `id` at all (only `#typeface-101` exists). The `CSS-039` dead-nav class of bug, ahead of its `v0.7.8` exit criterion | `CSS-362` | **open** (site docs) |
| `CSS-363` | Docs: broken internal links | Link check over 80 built pages: the **Download** button on `/styles/` → `/assets/css/rare.min.css` (404: Eleventy passes through `rare.css` only); "Mark-Up 101" in the hamburger menu → `/101/` (no such page, on every page); `/charts/data-import/` → two `examples/dual-axes/*.js` files (404); `/kb/new-project-workflow/` → 8 relative `guides/project-launch/*` links (404); icons README → `LICENSE` and `fetch-icons.py` paths; `/charts/combined/` → `/charts/dual-axes/#options-reference` (no such id). `/old/` is legacy and ignored | `CSS-363` | **open** (site docs) |
| — | Token typos behind fallbacks (`CSS-272` class) | Only two undeclared `var()`s have fallbacks, `--grid-min-col` and `--list-group-pack-min`, and both are intentional consumer hooks with defaults | — | not a defect |
| — | Short-name collisions (`CSS-141`) | `.left/.right/.top/.bottom/.bold/.note/.warning` are not defined as bare single-class rules. `.lead/.highlight/.caption` repeat across layout and typography modules, but as one component split across modules, not conflicting meanings | — | not a defect |
| — | Raw colours bypassing tokens | Only `.cookie-notice` (`#f0f0f0`, `#000`) and the WhatsApp brand green. Cookie tokenization is already planned (`CSS-147`) | `CSS-147` | not new |

## Archive reconciliation

The shipped archive's defect records (`CSS-020..026`, `CSS-034`, the `v0.6.15` and `v0.6.17_2` audit batches) are not reopened: no sweep check above reproduces any of them. Open bug and a11y rows outside `v0.7.0` are missing features, not defects: `CSS-167` (print) and `CSS-168` (`forced-colors`).
