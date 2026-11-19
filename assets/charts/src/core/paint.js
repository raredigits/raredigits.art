// RareCharts — Paint (internal)
// How a theme reaches the page (RC-014, K-14). A chart has two kinds of
// colour:
//   - role colours (bg, surface, grid, border, crosshair, text, muted, the
//     controls, the tooltip, the map's unmatched fill / border / graticule)
//     live in CSS: rare-charts.css declares them on .rc-chart (and a
//     standalone .rc-overview) as --rc-*, each a chain of the page's
//     --chart-* token and a literal;
//   - data colours (accent, the series palette, colours the page passes)
//     are resolved to hex where they leave the chart.
// A theme key is the chart's own when its value is not the library default:
// publishTheme writes the own values inline on the container, and inline
// beats the stylesheet — an explicit theme or darkTheme wins over the page.
//
//   ownColors(spec)          the own colour paths ('bg', 'colors', 'tooltip.bg', 'map.border'…)
//   publishTheme(el, spec)   writes them as --rc-* on el; returns the names it set
//   paintOf(spec, { hex })   the object charts draw with (chart.theme)
//   readDataColors(…)        resolves accent and colors at a render
//   makeHex(el)              hex(c): a colour as a payload or colour maths can use it
//   hexOf(paint)             the hex() a chart gave its paint object
//   toHex(computed)          a computed colour string → '#rrggbb' / '#rrggbbaa'
//   chainLiteral(v)          the literal at the end of a var() chain

import * as d3 from 'd3';
import { defaultTheme } from './theme.js';

// Marks the object a chart draws with, so an Overview under a chart keeps
// the chart's own (by reference) instead of making a copy.
export const PAINT = Symbol('rc.paint');
// The chart's hex() on its paint object, for helpers that get only the
// theme (Crosshair, the custom range panel).
const HEX = Symbol('rc.hex');

// The colour keys of a theme, by group.
const ROLE_KEYS    = ['bg', 'surface', 'grid', 'border', 'crosshair', 'text', 'muted', 'accent'];
const TOOLTIP_KEYS = ['bg', 'border', 'text', 'muted', 'shadow'];
const HEADER_KEYS  = ['text', 'bg'];
const MAP_KEYS     = ['matchFill', 'unmatchedFill', 'ocean', 'border', 'graticule'];

const set = v => v != null && v !== '';
const sameColors = (a, b) => Array.isArray(a) && Array.isArray(b)
  && a.length === b.length && a.every((c, i) => c === b[i]);

// A value is own when it is set (not null, not '') and is not the default.
// `colors` counts as a whole array.
const own = (v, d) => set(v) && (Array.isArray(v) ? !sameColors(v, d) : v !== d);

/**
 * The colour paths a theme owns: its value is not null, not '' and differs
 * from defaultTheme's. `createTheme({ text: '#000000' })` owns `text` — the
 * page's chain is the default, a literal is the theme's word.
 *
 * @param {object} spec  a merged theme (createTheme)
 * @returns {string[]}  paths: 'accent', 'colors', 'tooltip.bg', 'tooltip.header.text', 'map.border'…
 */
export function ownColors(spec) {
  const d = defaultTheme;
  const out = [];
  for (const k of ROLE_KEYS) if (own(spec[k], d[k])) out.push(k);
  if (own(spec.colors, d.colors)) out.push('colors');
  for (const k of TOOLTIP_KEYS) if (own(spec.tooltip?.[k], d.tooltip[k])) out.push(`tooltip.${k}`);
  for (const k of HEADER_KEYS) if (own(spec.tooltip?.header?.[k], d.tooltip.header[k])) out.push(`tooltip.header.${k}`);
  for (const k of MAP_KEYS) if (own(spec.map?.[k], d.map[k])) out.push(`map.${k}`);
  return out;
}

// The custom properties a theme publishes, as [name, value] pairs.
//   own role key                 → --rc-<key>: the value
//   own bg or text, surface not  → --rc-surface derived from them
//   own bg (its own background)  → the controls derived from the theme's roles
//   map key own, or derived when grid / bg / text is own
//   tooltip key own              → the value; null → the chart's role
//                                  (B-03: none for the shadow); '' → the CSS fallback
//   tooltip.header text / bg     → when set
//   font / numericFont           → when not the default: the tooltip's words
//                                  (--rc-tooltip-font) / figures (-font-numeric, K-15)
function themeProperties(spec) {
  const owned = new Set(ownColors(spec));
  const out = [];
  const put = (name, value) => out.push([name, String(value)]);

  for (const k of ROLE_KEYS) if (owned.has(k)) put(`--rc-${k}`, spec[k]);
  const bg = owned.has('bg'), text = owned.has('text');
  if (!owned.has('surface') && (bg || text)) put('--rc-surface', 'color-mix(in srgb, var(--rc-bg) 96%, var(--rc-text))');
  if (bg) {
    put('--rc-control-text',         'var(--rc-muted)');
    put('--rc-control-border',       'var(--rc-border)');
    put('--rc-control-hover-border', 'var(--rc-text)');
    put('--rc-control-active-text',  'var(--rc-text)');
    put('--rc-control-active-bg',    'var(--rc-bg)');
  }

  const map = spec.map ?? {};
  if (owned.has('map.unmatchedFill')) put('--rc-map-unmatched-fill', map.unmatchedFill);
  else if (owned.has('grid'))         put('--rc-map-unmatched-fill', 'var(--rc-grid)');
  if (owned.has('map.border'))        put('--rc-map-border', map.border);
  else if (bg)                        put('--rc-map-border', 'var(--rc-bg)');
  if (owned.has('map.graticule'))     put('--rc-map-graticule', map.graticule);
  else if (text)                      put('--rc-map-graticule', 'color-mix(in srgb, var(--rc-text) 8%, transparent)');

  const tip = spec.tooltip ?? {};
  for (const k of TOOLTIP_KEYS) {
    if (tip[k] === null) put(`--rc-tooltip-${k}`, k === 'shadow' ? 'none' : `var(--rc-${k})`);
    else if (owned.has(`tooltip.${k}`)) put(`--rc-tooltip-${k}`, tip[k]);
  }
  for (const k of HEADER_KEYS) if (owned.has(`tooltip.header.${k}`)) put(`--rc-tooltip-header-${k}`, tip.header[k]);

  // The tooltip's families (K-15): `font` sets its words, `numericFont` its
  // figures (.rc-num).
  if (set(spec.font) && spec.font !== defaultTheme.font) put('--rc-tooltip-font', spec.font);
  if (set(spec.numericFont) && spec.numericFont !== defaultTheme.numericFont) put('--rc-tooltip-font-numeric', spec.numericFont);
  return out;
}

/**
 * Write a theme's own values on `el` as inline --rc-* custom properties.
 * With `saved`, the page's own inline value and priority of each name are
 * recorded there first ({ name: [value, priority] }), for restoreStyle().
 * A theme with nothing of its own writes nothing.
 *
 * @param {HTMLElement} el
 * @param {object} spec      a merged theme (createTheme)
 * @param {object} [saved]
 * @returns {string[]}  the names set
 */
export function publishTheme(el, spec, saved = null) {
  const props = themeProperties(spec);
  for (const [name, value] of props) {
    if (saved && !(name in saved)) saved[name] = [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)];
    el.style.setProperty(name, value);
  }
  return props.map(([name]) => name);
}

/**
 * Put back what `saved` recorded: the page's own inline values, or no
 * property where it had none; an empty style attribute goes.
 *
 * @param {HTMLElement} el
 * @param {object} saved  { name: [value, priority] }
 */
export function restoreStyle(el, saved) {
  for (const [name, [value, priority]] of Object.entries(saved)) {
    if (value) el.style.setProperty(name, value, priority);
    else el.style.removeProperty(name);
  }
  if (!el.getAttribute('style')) el.removeAttribute('style');
}

// The role keys a chart draws with as references to its --rc-* tokens, and
// the literal of each derived key (null in the theme), which the
// stylesheet's @supports fallback repeats.
const PAINT_ROLES = ['bg', 'surface', 'grid', 'border', 'crosshair', 'text', 'muted'];
const PAINT_MAP   = { unmatchedFill: 'map-unmatched-fill', border: 'map-border', graticule: 'map-graticule' };
export const DERIVED_LITERALS = { surface: '#f5f5f5', 'map.graticule': 'rgba(0,0,0,0.08)' };

const at = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

/**
 * The object a chart draws with (chart.theme), marked with PAINT; the same
 * shape as the theme, so every class reads t.muted, t.bg… as before.
 *   - role keys (bg, surface, grid, border, crosshair, text, muted, and
 *     map.unmatchedFill / border / graticule) are 'var(--rc-<k>, <literal>)':
 *     the browser resolves them on every surface, page theme and on paper.
 *     The literal is the theme's own value, else the default's;
 *   - accent and colors are the theme's until readDataColors() writes their
 *     hex in place (colors keeps its array identity);
 *   - map.matchFill is the theme's own, else null (regions take the accent);
 *   - everything else (sizes, fonts, tooltip) is the theme's.
 * With `hex` (makeHex), the object carries it for hexOf().
 *
 * @param {object} spec  a merged theme (createTheme)
 * @param {{ hex?: Function }} [opts]
 * @returns {object}
 */
export function paintOf(spec, { hex = null } = {}) {
  const owned = new Set(ownColors(spec));
  const literal = path => (owned.has(path) ? at(spec, path)
    : chainLiteral(at(defaultTheme, path)) ?? DERIVED_LITERALS[path]);
  const p = { ...spec };
  for (const k of PAINT_ROLES) p[k] = `var(--rc-${k}, ${literal(k)})`;
  p.map = { ...spec.map };
  for (const [k, name] of Object.entries(PAINT_MAP)) p.map[k] = `var(--rc-${name}, ${literal(`map.${k}`)})`;
  p.map.matchFill = owned.has('map.matchFill') ? spec.map.matchFill : null;
  p.colors = Array.isArray(spec.colors) ? [...spec.colors] : [];
  Object.defineProperty(p, PAINT, { value: true });
  if (hex) Object.defineProperty(p, HEX, { value: hex });
  return p;
}

/**
 * The hex() a chart's paint object carries; a plain theme gets one that
 * returns colours as they are.
 *
 * @param {object} paint
 * @returns {(c: any) => any}
 */
export function hexOf(paint) {
  return paint?.[HEX] ?? (c => c);
}

/**
 * Resolve the data colours of `paint` for a render, in place: accent and
 * the series palette become hex, read at `el` — the page's
 * --chart-series-* there, or the theme's own values. One probe box reads
 * them all (one style recalc). The paint's hex() starts a new cache.
 *   accent  own: hex(accent); else var(--rc-accent, <the default chain>)
 *   colors  own: each hex(c); else the default chains
 *
 * @param {HTMLElement} el
 * @param {object} spec   a merged theme (createTheme)
 * @param {object} paint  paintOf(spec)
 * @returns {object} paint
 */
export function readDataColors(el, spec, paint) {
  const hex = paint[HEX] ?? makeHex(el);
  hex.reset();
  const owned = new Set(ownColors(spec));
  const accent = owned.has('accent') ? spec.accent : `var(--rc-accent, ${defaultTheme.accent})`;
  const colors = owned.has('colors') ? spec.colors : defaultTheme.colors;
  const [a, ...cs] = hex.many([accent, ...colors]);
  paint.accent = a;
  if (!Array.isArray(paint.colors)) paint.colors = [];
  paint.colors.splice(0, paint.colors.length, ...cs);
  return paint;
}

// ─── Colours as values ────────────────────────────────────────────────────

const byte = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

// One channel of rgb(): a number 0–255 or a percentage.
const channel = s => (s.endsWith('%') ? parseFloat(s) * 2.55 : parseFloat(s));
// An alpha: a number 0–1 or a percentage.
const alphaOf = s => (s == null ? 1 : s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s));

/**
 * A computed colour as hex: 'rgb(…)', 'rgba(…)' (comma or space syntax) and
 * 'color(srgb r g b[ / a])', what engines return for a colour property.
 * Opaque gives '#rrggbb', translucent '#rrggbbaa'; anything else null.
 *
 * @param {string} computed
 * @returns {string|null}
 */
export function toHex(computed) {
  if (typeof computed !== 'string') return null;
  const s = computed.trim().toLowerCase();
  let rgb, a;
  let m = s.match(/^rgba?\(\s*([^)]*)\)$/);
  if (m) {
    const parts = m[1].split(/\s*[,/]\s*|\s+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    rgb = parts.slice(0, 3).map(channel);
    a = alphaOf(parts[3]);
  } else if ((m = s.match(/^color\(\s*srgb\s+([^)]*)\)$/))) {
    const [body, alpha] = m[1].split('/').map(p => p.trim());
    const parts = body.split(/\s+/).filter(Boolean);
    if (parts.length !== 3) return null;
    rgb = parts.map(p => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p)) * 255);
    a = alphaOf(alpha);
  } else return null;
  if (![...rgb, a].every(Number.isFinite)) return null;
  const hex = `#${rgb.map(byte).join('')}`;
  return a >= 1 ? hex : hex + byte(a * 255);
}

/**
 * The literal at the end of a var() chain: 'var(--a, var(--b, #fff))' →
 * '#fff'; a value without var() is itself; a var() with no fallback, null.
 *
 * @param {string} v
 * @returns {string|null}
 */
export function chainLiteral(v) {
  let s = typeof v === 'string' ? v.trim() : v;
  while (typeof s === 'string' && s.startsWith('var(') && s.endsWith(')')) {
    let depth = 0, comma = -1;
    for (let i = 3; i < s.length - 1; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') depth--;
      else if (s[i] === ',' && depth === 1) { comma = i; break; }
    }
    if (comma < 0) return null;
    s = s.slice(comma + 1, -1).trim();
  }
  return s;
}

// The var() references of a value: [start, end, name, fallback] at the top
// level of each var(…), fallback null when there is none.
function varRefs(s) {
  const out = [];
  let i = 0;
  while ((i = s.indexOf('var(', i)) > -1) {
    let depth = 0, comma = -1, j = i + 3;
    for (; j < s.length; j++) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')' && --depth === 0) break;
      else if (s[j] === ',' && depth === 1 && comma < 0) comma = j;
    }
    if (j >= s.length) return null;                         // unbalanced
    const name = s.slice(i + 4, comma > -1 ? comma : j).trim();
    out.push([i, j + 1, name, comma > -1 ? s.slice(comma + 1, j).trim() : null]);
    i = j + 1;
  }
  return out;
}

// A value with its var() references put in by hand, as an engine would:
// each custom property as computed at `el` (custom properties inherit),
// else its fallback; 8 levels deep. null when a reference has neither.
function substitute(el, s, depth = 0) {
  if (depth > 8) return null;
  const refs = varRefs(s);
  if (refs == null) return null;
  if (!refs.length) return s;
  let cs = null;
  try { cs = el && typeof getComputedStyle === 'function' ? getComputedStyle(el) : null; } catch { cs = null; }
  let out = '', from = 0;
  for (const [a, b, name, fb] of refs) {
    const own = cs?.getPropertyValue?.(name)?.trim() || '';
    const v = substitute(el, own || fb || '', depth + 1);
    if (!v) return null;
    out += s.slice(from, a) + v;
    from = b;
  }
  return out + s.slice(from);
}

// A colour d3 reads, as hex ('#rrggbb', '#rrggbbaa' when translucent).
const d3Hex = s => {
  const c = s ? d3.color(s) : null;
  return c ? (c.opacity < 1 ? c.formatHex8() : c.formatHex()) : null;
};

// A computed colour in a format toHex does not read (oklch(), lab(),
// color(display-p3 …)): painted into a 1×1 canvas and read back. Alpha from
// the string's "/ a", which the canvas bytes round.
let canvasCtx;
function canvasHex(computed) {
  try {
    canvasCtx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 })
      .getContext('2d', { willReadFrequently: true }) ?? null;
  } catch { canvasCtx = null; }
  if (!canvasCtx) return null;
  canvasCtx.clearRect(0, 0, 1, 1);
  canvasCtx.fillStyle = '#000';
  canvasCtx.fillStyle = computed;
  canvasCtx.fillRect(0, 0, 1, 1);
  const [r, g, b, a8] = canvasCtx.getImageData(0, 0, 1, 1).data;
  const m = computed.match(/\/\s*([\d.]+%?)\s*\)\s*$/);
  const a = m ? alphaOf(m[1]) : a8 / 255;
  const hex = `#${[r, g, b].map(byte).join('')}`;
  return a >= 1 ? hex : hex + byte(a * 255);
}

const PROBE_CSS = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';

/**
 * hex(c) for colours that leave the chart (payloads) or meet colour maths.
 *   1. not a string, 'none', 'transparent', url(…): unchanged
 *   2. a colour d3 reads, with no var(): as written ('steelblue' stays)
 *   3. anything else (var(), color-mix(), oklch(), currentColor…): resolved
 *      in a hidden probe inside `el` and read back as hex (toHex; a canvas
 *      for formats it does not read)
 *   4. no engine (jsdom, a detached card): the var() references put in by
 *      hand from the custom properties at `el`, then read by d3
 *   5. unreadable: a chain's literal; else as written, with one warning
 * Results are cached until hex.reset(). hex.many(list) resolves a list
 * with one probe box (one style recalc).
 *
 * @param {HTMLElement} el
 * @returns {(c: any) => any}
 */
export function makeHex(el) {
  const cache = new Map();
  let warned = false;

  const passes = c => {
    if (typeof c !== 'string') return true;
    const s = c.trim();
    return s === 'none' || s === 'transparent' || /^url\(/i.test(s);
  };
  const plain = s => !s.includes('var(') && d3.color(s) != null;

  // What the engine computes for each value, through one box of probes
  // inside the card; null where it cannot tell.
  const probe = list => {
    const out = list.map(() => null);
    if (!el?.isConnected || typeof getComputedStyle !== 'function') return out;
    const box = document.createElement('i');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = PROBE_CSS;
    const kids = list.map(c => {
      const i = document.createElement('i');
      i.style.color = c;
      return box.appendChild(i);
    });
    el.appendChild(box);
    try {
      kids.forEach((i, k) => {
        if (!i.style.color) return;                         // the engine does not take it
        const v = getComputedStyle(i).color;
        if (!v || v.includes('var(')) return;               // no engine: resolved by hand
        out[k] = toHex(v) ?? canvasHex(v);
      });
    } finally {
      box.remove();
    }
    return out;
  };

  const settle = (c, read) => {
    const s = c.trim();
    const out = read ?? d3Hex(substitute(el, s));
    if (out != null) return out;
    const lit = chainLiteral(s);
    if (lit != null && lit !== s && d3.color(lit)) return lit;
    if (!warned) { warned = true; console.warn(`RareCharts: cannot read the colour "${c}"`); }
    return c;
  };

  const many = list => {
    const todo = [...new Set(list.filter(c => !passes(c) && !cache.has(c) && !plain(c.trim())))];
    if (todo.length) {
      const read = probe(todo.map(c => c.trim()));
      todo.forEach((c, k) => cache.set(c, settle(c, read[k])));
    }
    return list.map(hex);
  };

  const hex = c => {
    if (passes(c)) return c;
    if (cache.has(c)) return cache.get(c);
    if (plain(c.trim())) { cache.set(c, c); return c; }
    return many([c])[0];
  };
  hex.many = many;
  hex.reset = () => cache.clear();
  return hex;
}
