// The `.rd` scope gate config (CSS-337, v0.7.0 — model decided in Q-14).
//
// Output of the global-rule inventory: every selector in the compiled CSS
// that targets bare elements (no class, attribute or id anywhere in it) is
// classified here by hand, so a new global rule can never slip past the gate
// unreviewed — scripts/rd-gate.mjs fails the build on an unclassified one.
// Everything else (class/attribute/id selectors) is island-gated by default.
//
// Exclusions do not make a selector a class context (v0.7.2): a class,
// attribute or id inside `:not()` only takes elements out, so
// `button:not(:where(.rc-chart *))` is a bare-element rule all the same. It
// is listed by its key, the selector without its `:not()` parts (`button`):
// the entry stays valid when a list of excluded components grows. See
// `inventoryKey()` in scripts/rd-gate.mjs; the build error names the keys.
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
  // the prose measure, minus the components that set their own (CSS-374)
  'article :is(p, ul, ol)',
  // figures (CSS-127), minus the carousel's and the epigraph's
  'article figure', 'article figure > img', 'article figure > picture img',
  'article figcaption',
  'mark', 'blockquote', 'blockquote p:first-of-type',
  ':where(blockquote) > cite', // the attribution look (CSS-379)
  'sup > a', // note reference marks (CSS-128)
  'dl', 'dt', 'dd + dt',
  'pre', 'code', 'pre code',
  // tables
  'table', 'th', 'td', 'td:first-child', 'th:first-child',
  // links
  'a', 'a:hover', 'a img', 'h1 a', 'h2 a', 'h3 a', 'h4 a',
  // interactive
  'details summary',
  // the button and form-field defaults (elements/_buttons.scss,
  // elements/_forms.scss, v0.7.2), minus a RareCharts card's controls; their
  // base rules are the normalize entries above (`button`, `select`,
  // `textarea`, `fieldset`, `legend`). Rules scoped by an attribute
  // (`input:where([type="text"], …)`, `button:where(:disabled,
  // [aria-disabled="true"])`) are class context and need no entry.
  'button:where(:hover)', 'button:where(:active)',
  'textarea::placeholder', 'select::placeholder',
  'label:where(:has(> :disabled))',
  // focus ring (CSS-110)
  ':focus-visible', 'button:focus-visible',
  // print hygiene (CSS-167) — inside @media print only
  'figure', 'tr', 'svg',
];
