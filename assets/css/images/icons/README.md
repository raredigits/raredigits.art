# Rare Styles icon set

Static SVG cuts of [Material Symbols Outlined](https://fonts.google.com/icons)
(Google, [Apache-2.0](./LICENSE)), shipped with the library so `rare.css`
carries **zero third-party font requests** (milestone `v0.6.18`, `CSS-095`/`CSS-096`).

Every glyph exists in two weights — `<name>-200.svg` (thin) and
`<name>-400.svg` (regular). The CSS consumes them via `mask-image` with
`background-color: currentColor` (see `modules/decorations/_icons.scss`), so
the SVG fill color is irrelevant — only the path alpha matters — and icons
recolor through normal `color` / token cascade.

Each glyph becomes **one self-contained class per weight**: `.rd-icon-<name>`
(400) and `.rd-icon-<name>-thin` (200). That is the public markup API — the
glyph name is the class, there is no `data-icon` authoring attribute.

## Updating or extending the set

1. Edit the `ICONS` list in [`scripts/fetch-icons.py`](../../../../scripts/fetch-icons.py)
   (repo root). Glyph names are the Material Symbols names as shown on
   [fonts.google.com/icons](https://fonts.google.com/icons) (e.g. `star_half`).
   For an axis variant of an existing glyph (a FILL/GRAD cut the CDN serves
   under an alternate URL segment, not a distinct name — e.g. the solid
   `star_fill`), add a `VARIANTS` entry instead: a logical name, its `src`
   glyph, and the per-weight CDN segments.
2. From the repo root run:

   ```sh
   python3 scripts/fetch-icons.py
   ```

   The script fetches both weights for every listed glyph from Google's icon
   CDN and overwrites the files here. It exits non-zero if any glyph fails
   (usually a misspelled name — check the exact spelling on fonts.google.com).
3. Mirror the change in the `$icons` list in
   `assets/css/modules/decorations/_icons.scss` — that list generates the
   per-glyph `.rd-icon-<name>` / `.rd-icon-<name>-thin` classes, so a glyph
   missing there has no class and will not render.
4. Review the git diff, rebuild the CSS (`npm run build:css`), and record the
   set change in `assets/css/docs/Changelog.md`.

Do not hand-edit the SVGs — they are generated artifacts; re-run the script
instead. New glyphs must be Material Symbols (the whole set is covered by the
single Apache-2.0 license in this directory).
