# Rare Styles — Size Baseline

Owner: `CSS-339`. `CSS-330` (`v0.7.5`) builds the transferred-size budget on this table. Every size claim in the backlog and changelog cites a row here.

## Method

- Produced by `node scripts/size-report.mjs <git-ref|--working> <label>`. `node scripts/size-report.mjs --check` (also run by `test/size-baseline.test.js`) recomputes every row that names a git ref and fails on any mismatch, so the table stays reproducible.
- Bytes exclude the trailing `/*# sourceMappingURL=… */` comment.
- gzip: Node `zlib` default (level 6). Brotli: Node `zlib` default (quality 11, window 22). This reproduces the September 2026 pre-gate figures exactly.
- Rules, selectors and media blocks are counted in `rare.min.css` with PostCSS. Style rules include those nested in `@media`; `@keyframes` frames are excluded.
- Fonts = `fonts/*.woff2`, icons = `images/icons/**/*.svg`, images = the other raster/SVG files under `images/`. All are raw bytes on disk.
- These are local file measurements, not transferred CDN sizes and not speed evidence.

## Rows

Sizes in bytes. Each asset column is count / bytes.

| Date | Label | Source | min | min gzip | min Brotli | readable | readable gzip | readable Brotli | rules | selectors | media | fonts | icons | images |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-16 | v0.6.19 | `e76bb78` | 363,483 | 32,884 | 22,115 | 435,841 | 35,373 | 23,293 | 4,286 | 4,398 | 2,308 | 32 / 469,036 | 286 / 151,485 | 8 / 23,048 |
| 2026-10-16 | v0.7.0 in progress | `da44e37` | 432,274 | 34,773 | 22,678 | 508,548 | 37,114 | 23,874 | 4,273 | 4,402 | 2,295 | 32 / 469,036 | 286 / 151,485 | 8 / 23,048 |
| 2026-10-17 | v0.7.0 | `3d104df` | 418,005 | 35,112 | 22,533 | 493,709 | 37,442 | 23,856 | 4,281 | 4,410 | 2,298 | 32 / 469,036 | 286 / 151,485 | 8 / 23,048 |
| 2026-10-19 | v0.7.1 in progress | `39a63e9` | 421,792 | 35,749 | 23,057 | 498,181 | 38,181 | 24,535 | 4,308 | 4,470 | 2,302 | 32 / 469,036 | 286 / 151,485 | 8 / 23,048 |
| 2026-10-20 | v0.7.1 | `d6ae6bb` | 421,076 | 35,544 | 23,045 | 497,303 | 37,918 | 24,386 | 4,302 | 4,443 | 2,303 | 32 / 469,036 | 286 / 151,485 | 8 / 23,048 |

## Notes

- **`v0.6.19` → `v0.7.0` in progress:** the `.rd` gate (`CSS-343`) costs **+68,791 B minified raw, but only +1,889 B gzip (+5.7%) and +563 B Brotli (+2.5%)**. The repeated `:where(.rd,.rd *)` compresses almost entirely. The bug-closure removals (`CSS-346`: −28 classes) and additions (`CSS-110..113`) are inside that delta. Rules −13 and media −13 are a net figure: the removed `padding*-auto` utilities account for −28 rules and −21 media blocks, offset by the new focus, a11y and card-reset rules, 6 `motion-safe` media blocks (`CSS-112`) and 2 mobile blocks from `CSS-354` (`.card-row-bordered`, `.dl-grid`).
- **`v0.7.0` (release):** min 418,005 B (+15.0% vs `v0.6.19`), gzip 35,112 B (+6.8%), Brotli 22,533 B (+1.9%). It is smaller than the in-progress row because the gap-free range-syntax media queries (`CSS-355`) are shorter strings across about 2,300 media blocks.
- **`v0.7.0` → `v0.7.1` in progress:** min 418,005 → 421,792 B (+0.9%), gzip 35,112 → 35,749 B (+1.8%), Brotli 22,533 → 23,057 B (+2.3%) — the first release-ready build, before the review.
- **`v0.7.0` → `v0.7.1` (release):** min 418,005 → 421,076 B (+3,071 B, +0.7%), gzip 35,112 → 35,544 B (+432 B, +1.2%), Brotli 22,533 → 23,045 B (+512 B, +2.3%). Additions: article figures (`CSS-127`), note references (`CSS-128`), the print block (`CSS-167`), `.feed-list__clean`. The review then removed `kbd`/`abbr`, the `figure-*` width modifiers and five unused classes, and the cookie spacer, so the release is smaller than the first build: +21 rules, +33 selectors, +5 media blocks.
