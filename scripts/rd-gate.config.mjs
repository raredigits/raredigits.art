// The `.rd` scope gate config (CSS-337, v0.7.0 — model decided in Q-14).
//
// Output of the global-rule inventory: every selector in the compiled CSS
// that targets bare elements (no class, attribute or id anywhere in it) is
// classified here by hand, so a new global rule can never slip past the gate
// unreviewed — scripts/rd-gate.mjs fails the build on an unclassified one.
// Everything else (class/attribute/id selectors) is island-gated by default.
//
// Three gate kinds:
//   ungated — emitted as is: `:root` tokens, `@font-face`, `@keyframes`, and
//             the self-contained `rd-icon-*` compounds (icons work anywhere).
//   page    — page-shell rules, active only when `.rd` sits on <html> (or
//             <body>): `html`/`body` sizing, flex and base typography, the
//             fixed `header`, `main` padding, `article` grid placement,
//             `section`, `footer`, `nav` chrome. An island never gets these.
//   island  — tag styles, active on the `.rd` element and inside it:
//             `x` → `x:where(.rd, .rd *)`. Zero added specificity.
//
// Selectors are compared after whitespace normalization, so the same list
// serves the expanded and the compressed build. Inventory on v0.6.19:
// 4 398 selectors, 77 distinct bare selectors (listed below), 79 distinct
// class-context selectors with an element target (island by default).

export const UNGATED_SELECTORS = [':root'];

export const UNGATED_AT_RULES = ['charset', 'font-face', 'keyframes'];

// Page-shell rules — `.rd` on <html> / <body> only.
export const PAGE = [
  // document box
  'html',
  'body',
  // shell regions
  'header',
  'main',
  'article',
  'section',
  'footer',
  // shell navigation & footer chrome
  'nav a',
  'nav a:hover',
  'nav ul',
  'nav li',
  'footer a',
  'footer a:hover',
  'footer a::before',
  'footer a:hover::before',
];

// Tag styles — the `.rd` element and its descendants (islands and page mode).
export const ISLAND = [
  // reset (CSS-078: an island zeroes margins of everything inside it)
  '*',
  // vendor/normalize
  'hr', 'b', 'strong', 'kbd', 'samp', 'small', 'sub', 'sup', 'img',
  'button', 'input', 'optgroup', 'select', 'textarea',
  'button::-moz-focus-inner', 'button:-moz-focusring',
  'fieldset', 'legend', 'progress', '::-webkit-file-upload-button',
  'details', 'summary', 'template',
  // typography
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'article > :is(h2, h3):first-child',
  'p', 'ul', 'ol',
  'article p', 'article ul', 'article ol',
  'mark', 'cite', 'blockquote', 'blockquote p:first-of-type',
  'dl', 'dt', 'dd + dt',
  'pre', 'code', 'pre code',
  // tables
  'table', 'th', 'td', 'td:first-child', 'th:first-child',
  // links
  'a', 'a:hover', 'a img', 'h1 a', 'h2 a', 'h3 a', 'h4 a',
  // interactive
  'button:hover', 'details summary',
  // focus ring (CSS-110)
  ':focus-visible', 'button:focus-visible',
];
