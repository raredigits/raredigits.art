// Inline the first-screen glyphs into the stylesheet (CSS-419, v0.7.2).
//
// A glyph is a mask: `url("images/icons/<name>-<weight>.svg")`. The browser
// asks for that file only after it has the stylesheet, has laid the page out
// and has met an element that shows the glyph — and it asks in CORS mode, so
// from a CDN it opens a second connection. A consumer's hamburger appeared a
// second or more after its header; the close glyph, hidden until the menu
// opens, started loading at the click.
//
// The glyphs below are the ones a page shows at once or on the first click:
// the header (menu, close, search), the copy control with its answer
// (content_copy, check; the thin check answers a thin glyph) and the refresh
// button of a data view. Every rule that
// draws one — the component's own and the public `.rd-icon-<name>` class —
// carries the drawing as a data URI, so it arrives with the stylesheet.
// About 200–350 B per use; the other glyphs stay files, or the stylesheet
// would grow by a third.
//
// The SVG files stay in the set: a build from the SCSS source without this
// step, and markup that points at a file, still work.
//
// A page with a Content-Security-Policy needs `data:` in `img-src` for these
// glyphs (masks are images to CSP).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const INLINE_ICONS = ['menu-400', 'close-400', 'search-400', 'content_copy-400', 'check-400', 'check-200', 'refresh-400'];

// Only what a quoted CSS url() and a URL need escaped: the SVGs are one line
// of markup with double-quoted attributes.
const dataUri = (svg) =>
  `data:image/svg+xml,${svg.trim().replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}`;

export default function inlineIcons({ iconDir }) {
  const uris = new Map(INLINE_ICONS.map((name) => [name, dataUri(readFileSync(resolve(iconDir, `${name}.svg`), 'utf8'))]));
  const pattern = /url\((["']?)images\/icons\/([a-z0-9_]+-(?:200|400))\.svg\1\)/g;
  return {
    postcssPlugin: 'rd-inline-icons',
    Declaration(decl) {
      if (!decl.value.includes('images/icons/')) return;
      decl.value = decl.value.replace(pattern, (whole, _quote, name) => (uris.has(name) ? `url("${uris.get(name)}")` : whole));
    },
  };
}
inlineIcons.postcss = true;
