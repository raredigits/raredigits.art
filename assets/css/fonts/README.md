# Self-hosted fonts

The four Rare Styles text families, self-hosted as woff2 to remove the
render-blocking Google Fonts `@import` waterfall (`CSS-030`). The `@font-face`
declarations live in `../modules/typography/_font-faces.scss` and reference
these files with a relative `url('fonts/…')` path, so they resolve identically
on the local site (`/assets/css/fonts/…`) and on jsDelivr
(`rare-styles@<ver>/fonts/…`): the `fonts/` directory ships in the release
artifact that `.github/workflows/release-css.yml` publishes to the `rare-styles`
repo root.

Regenerate with `scripts/fetch-fonts.py` (fetches the latin + cyrillic subsets
from Google Fonts and rewrites the `@font-face` block). Icons are not a font:
since `v0.6.18` they ship as SVG files under `../images/icons/`.

## Families

| Family | Token | Weights (subsets: latin + cyrillic) | License | Source |
|---|---|---|---|---|
| Playfair Display | `--heading-font` | variable 400–900 | OFL-1.1 (`OFL-PlayfairDisplay.txt`) | https://fonts.google.com/specimen/Playfair+Display |
| Fira Sans | `--primary-font` | 100/200/400/700/900 + italics | OFL-1.1 (`OFL-FiraSans.txt`) | https://fonts.google.com/specimen/Fira+Sans |
| Cousine | `--code-font` | 400/700 + italics | OFL-1.1 (`OFL-Cousine.txt`) | https://fonts.google.com/specimen/Cousine |
| Caveat | `--script-font` | 400 | OFL-1.1 (`OFL-Caveat.txt`) | https://fonts.google.com/specimen/Caveat |

All four are licensed under the SIL Open Font License 1.1. The full license text
(including the required copyright and Reserved Font Name notices) ships next to
the woff2 in the `OFL-*.txt` files and must travel with the fonts on
redistribution.
