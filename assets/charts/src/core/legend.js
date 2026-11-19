// RareCharts — core/legend.js
// The one legend builder (D-04): the header legend, the Graph ego and path
// legends, the flow view's, MapFlow's, Sankey's and MultiChart's all draw
// their items here. It knows no chart — no theme, no data, no series: the
// caller hands it items and options, and hears back through onToggle.
//
//   <div class="rc-legend" role="group" aria-label="Legend">   role and label only with a toggle
//     <button type="button" class="rc-legend-item" data-key="Alice" aria-pressed="true">
//       <span class="rc-legend-line" aria-hidden="true" style="--rc-swatch-color: …"></span><span>Alice</span>
//     </button>
//     <div class="rc-legend-item"><span class="rc-legend-band" aria-hidden="true" …></span><span>Recession</span></div>
//     <button type="button" class="rc-legend-reset" hidden><span>Show all</span></button>
//   </div>
//
// State lives in aria-pressed (K-06): no state class. A toggle is a <button>,
// a static item a <div>; the label is the last child <span>. The swatch
// takes its colour from --rc-swatch-color (no inline background), a dashed
// one its dash from --rc-swatch-dash / --rc-swatch-gap.
//
// Gestures (spec decision 3): a click, Enter or Space toggles; a double click
// keeps only that item, and a double click on the only one shown brings all
// back; "Show all" shows everything. A pointer click that hides waits
// HIDE_DELAY_MS, so the second click of a double click can cancel it: the
// item you double-click to keep never disappears, and a double click is one
// commit. A click that shows, and every keyboard, screen-reader or scripted
// click (event.detail 0), act at once. A dblclick is the fallback for an
// engine that does not count event.detail.
//
// Updates happen in place: toggles are joined by key, static items by their
// position, and nothing is written that has not changed — the caller syncs
// the legend before every render, resize and brush frames included. An
// element that stays keeps focus (R-16); when the focused one goes, focus
// moves to the toggle before it, then the one after, then the group.

import { resolveStrokeDash } from './utils.js';

// How long a pointer click that hides waits for a second click (internal).
export const HIDE_DELAY_MS = 250;

// Class names, written in one place. (The S-16 contract test reads class
// literals where the code writes a class; these reach it through its runtime
// pass, which renders the charts that use this builder.)
const CLS = {
  item:   'rc-legend-item',
  reset:  'rc-legend-reset',
  line:   'rc-legend-line',
  dashed: 'rc-legend-line rc-legend-line--dashed',
  dot:    'rc-legend-dot',
  band:   'rc-legend-band',
};
const MARKS = new Set(['line', 'dashed', 'dot', 'band', 'shape', 'width']);
const DEFAULT_DASH = [5, 3];          // the CSS fallbacks of --rc-swatch-dash / -gap
const SHAPES = ['circle', 'square', 'diamond', 'stack'];
const SHAPE_RADIUS = 18;              // the flow view's default nodeRadius
const SVG_NS = 'http://www.w3.org/2000/svg';
const RESET_TEXT = 'Show all';
const GROUP_LABEL = 'Legend';

// ─── Pure parts ──────────────────────────────────────────────────────────────

// A header legend item's key (decision 13): `series: false` is a caption
// (null); otherwise series ?? name ?? label, as a string. Whether that key
// names a series in the data is the chart's question.
export function legendKey(item) {
  if (item == null || typeof item !== 'object' || item.series === false) return null;
  const key = item.series ?? item.name ?? item.label;
  return key == null ? null : String(key);
}

// The visible keys after a gesture. keys: the legend's toggle keys in order;
// visible: the keys shown now (a Set or an array; keys outside `keys` are
// ignored).
//   'toggle'  → flip `key`
//   'double'  → only `key` shown already: all keys ('restore'); else only
//               `key` ('isolate')
//   'showAll' → all keys
// Returns { visible: string[] in key order, kind: 'toggle' | 'isolate' |
// 'restore' | 'showAll' }. A key outside `keys` changes nothing.
export function nextVisible(keys, visible, action, key) {
  const all = [...keys];
  const on = new Set(visible ?? []);
  const shown = all.filter(k => on.has(k));
  if (action === 'showAll') return { visible: all, kind: 'showAll' };
  const known = all.includes(key);
  if (action === 'double') {
    if (shown.length === 1 && shown[0] === key) return { visible: all, kind: 'restore' };
    return { visible: known ? [key] : shown, kind: 'isolate' };
  }
  return { visible: all.filter(k => (k === key ? !on.has(k) : on.has(k))), kind: 'toggle' };
}

// The parts of a node shape, centred on 0,0 at radius R, as the flow view
// draws its nodes (graph/views/flow.js): 'circle' | 'square' | 'diamond' |
// 'stack', or an SVG path ('M…'); anything else is a circle.
// Returns [[tag, attributes], …].
export function shapeParts(shape, R = SHAPE_RADIUS) {
  if (shape === 'square') return [['rect', { x: -R + 1, y: -R + 1, width: 2 * R - 2, height: 2 * R - 2, rx: 6 }]];
  if (shape === 'diamond') return [['path', { d: `M0,${-R - 3}L${R + 3},0L0,${R + 3}L${-R - 3},0z` }]];
  if (shape === 'stack') return [['circle', { cx: 6, cy: -5, r: R - 2, opacity: 0.55 }], ['circle', { r: R }]];
  if (!SHAPES.includes(shape) && /^[Mm]/.test(String(shape))) return [['path', { d: String(shape) }]];
  return [['circle', { r: R }]];
}

// [dash, gap] in px from [d, g], a number, or an SVG dash array ('6 5',
// '6,5', or a resolveStrokeDash name); the first pair of a longer list.
function dashPair(dash) {
  let list = dash;
  if (typeof dash === 'number') list = [dash];
  else if (typeof dash === 'string') list = (resolveStrokeDash(dash) ?? '').split(/[\s,]+/);
  if (!Array.isArray(list)) return DEFAULT_DASH;
  const n = list.filter(v => v !== '' && v != null).map(Number).filter(v => Number.isFinite(v) && v >= 0);
  if (!n.length) return DEFAULT_DASH;
  return [n[0], n.length > 1 ? n[1] : n[0]];
}

// ─── The builder ─────────────────────────────────────────────────────────────

const STATE = new WeakMap();   // legend element → join and gesture state
const META = new WeakMap();    // item element → what was last written to it

/**
 * Draws or updates `el` in place. Toggles are keyed by `key`, static items by
 * their position. An element is replaced only when it switches between a
 * toggle and a label. Children the builder did not make are removed.
 *
 * items: [{ key?, label, color?, mark?, dash?, shape?, radius?, on?, alias? }]
 *   key    string → a toggle (when interactive); null → a static label. A key
 *          repeated later in the list is a label there (the first is the toggle).
 *          A static item with a key carries it in data-key.
 *   label  text (default: the key)
 *   color  → --rc-swatch-color on the swatch (none: the CSS falls back to currentColor)
 *   mark   'line' (default) | 'dashed' | 'dot' | 'band' | 'shape' | 'width'
 *   dash   for 'dashed': [dash, gap] px, or an SVG dash array — its first pair
 *          (default [5, 3], which writes no custom property)
 *   shape  for 'shape': 'circle' | 'square' | 'diamond' | 'stack' | an SVG path,
 *          drawn as the flow view draws nodes (shapeParts)
 *   radius for 'shape': the node radius a custom path is drawn at (default 18)
 *   on     shown (default true) → aria-pressed
 *   alias  class(es) for this item in place of opts.alias.item ('' for none)
 *
 * opts:
 *   interactive  false → every item a label, no Show all (default true)
 *   anyHidden    the chart hides something, listed or not → Show all visible
 *                (also visible while a toggle is off)
 *   onToggle     ({ kind, key, visibleKeys, replaces }) => void
 *                once per committed gesture; the caller stores it and re-renders
 *                (which calls renderLegendItems again). key is null for Show all.
 *                replaces: this commit completes a double click whose first
 *                click already committed.
 *   alias        { item?, reset?, dataType? } — K-06 aliases until 0.9.9 (Graph,
 *                flow, MapFlow): item — class(es) added to every item; reset —
 *                to Show all; dataType — data-type beside data-key
 *   busy         aria-busy on the group (Graph ego fetch in flight)
 *   labelStyle   inline style for the label span, { property: value }; the
 *                chart's header passes none: the label takes the card's text
 *                from rare-charts.css (K-14)
 *
 * Show all exists while the legend holds a toggle; it is `hidden` while
 * nothing is off. Returns `el`.
 */
export function renderLegendItems(el, items, opts = {}) {
  const s = stateOf(el);
  const doc = el.ownerDocument;
  const interactive = opts.interactive !== false;
  const alias = opts.alias ?? {};
  const ctx = { alias, labelStyle: opts.labelStyle ?? null };
  s.opts = opts;

  const active = doc.activeElement;
  const focused = active && active !== el && el.contains(active) ? active : null;
  const before = [...el.children];

  // ── the join ──
  const specs = specsOf(items, interactive);
  const toggles = new Map();
  const labels = [];
  const desired = [];
  let nextLabel = 0;
  for (const sp of specs) {
    let node;
    if (sp.toggle) {
      node = s.toggles.get(sp.key) ?? makeItem(doc, true);
      toggles.set(sp.key, node);
    } else {
      node = s.labels[nextLabel++] ?? makeItem(doc, false);
      labels.push(node);
    }
    updateItem(node, sp, ctx);
    desired.push(node);
  }
  let reset = null;
  if (interactive && toggles.size) {
    reset = s.reset ?? makeReset(doc);
    const cls = classes(CLS.reset, alias.reset);
    if (reset.className !== cls) reset.className = cls;
    const show = !!opts.anyHidden || specs.some(sp => sp.toggle && !sp.on);
    if (reset.hidden === show) reset.hidden = !show;
    desired.push(reset);
  }

  // ── place: drop what goes, then put each element in its slot ──
  const keep = new Set(desired);
  [...el.childNodes].forEach(n => { if (!keep.has(n)) n.remove(); });
  desired.forEach((n, i) => { if (el.childNodes[i] !== n) el.insertBefore(n, el.childNodes[i] ?? null); });

  // ── the group ──
  if (toggles.size) {
    setAttr(el, 'role', 'group');
    setAttr(el, 'aria-label', GROUP_LABEL);
    s.grouped = true;
  } else if (s.grouped) {
    setAttr(el, 'role', null);
    setAttr(el, 'aria-label', null);
    s.grouped = false;
  }
  setAttr(el, 'aria-busy', opts.busy ? 'true' : null);

  s.toggles = toggles;
  s.labels = labels;
  s.reset = reset;
  s.keys = [...toggles.keys()];
  s.visible = new Set(specs.filter(sp => sp.toggle && sp.on).map(sp => sp.key));
  if (s.pending && !toggles.has(s.pending.key)) cancelPending(s);

  if (focused) keepFocus(el, s, focused, before);
  return el;
}

function stateOf(el) {
  let s = STATE.get(el);
  if (s) return s;
  s = {
    opts: {},
    keys: [],              // toggle keys, in order
    visible: new Set(),    // the toggle keys shown (the `on` flags last written)
    toggles: new Map(),    // key → button
    labels: [],            // static items, in order
    reset: null,           // Show all
    pending: null,         // { key, timer }: a pointer hide waiting HIDE_DELAY_MS
    snap: null,            // the last pointer click: { key, visible, committed, doubled, prior }
    grouped: false,
  };
  STATE.set(el, s);
  el.addEventListener('click', e => onClick(el, s, e));
  el.addEventListener('dblclick', e => onDblClick(el, s, e));
  return s;
}

function specsOf(items, interactive) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).map(it => {
    const item = it ?? {};
    const given = item.key == null ? null : String(item.key);
    const key = given != null && !seen.has(given) ? given : null;
    if (key != null) seen.add(key);
    const mark = MARKS.has(item.mark) ? item.mark : 'line';
    return {
      key,
      toggle: interactive && key != null,
      label: String(item.label ?? given ?? ''),
      color: item.color ?? null,
      mark,
      dash: mark === 'dashed' ? dashPair(item.dash) : null,
      shape: mark === 'shape' ? (item.shape ?? 'circle') : null,
      radius: mark === 'shape' && Number.isFinite(item.radius) && item.radius > 0 ? item.radius : SHAPE_RADIUS,
      on: item.on !== false,
      alias: item.alias,
    };
  });
}

const classes = (...list) => list.filter(Boolean).join(' ');

function setAttr(node, name, value) {
  if (value == null) {
    if (node.hasAttribute(name)) node.removeAttribute(name);
  } else if (node.getAttribute(name) !== value) {
    node.setAttribute(name, value);
  }
}

function setStyle(node, prop, value) {
  if (value == null) {
    if (node.style.getPropertyValue(prop) !== '') node.style.removeProperty(prop);
  } else if (node.style.getPropertyValue(prop) !== value) {
    node.style.setProperty(prop, value);
  }
}

function makeItem(doc, toggle) {
  const node = doc.createElement(toggle ? 'button' : 'div');
  if (toggle) node.type = 'button';
  return node;
}

function makeReset(doc) {
  const node = doc.createElement('button');
  node.type = 'button';
  const text = doc.createElement('span');
  text.textContent = RESET_TEXT;
  node.appendChild(text);
  return node;
}

function updateItem(node, sp, ctx) {
  let meta = META.get(node);
  if (!meta) META.set(node, meta = {});
  const cls = classes(CLS.item, sp.alias ?? ctx.alias.item);
  if (node.className !== cls) node.className = cls;
  setAttr(node, 'data-key', sp.key);
  setAttr(node, 'data-type', ctx.alias.dataType ? sp.key : null);
  if (sp.toggle) setAttr(node, 'aria-pressed', String(sp.on));
  updateLabel(node, sp, meta, ctx.labelStyle);
  updateSwatch(node, sp, meta);
}

// The label: the last child <span>.
function updateLabel(node, sp, meta, labelStyle) {
  let span = meta.label;
  if (!span || span.parentNode !== node) {
    span = node.ownerDocument.createElement('span');
    node.appendChild(span);
    meta.label = span;
    meta.styleSig = undefined;
    meta.styleProps = [];
  }
  if (span.textContent !== sp.label) span.textContent = sp.label;
  const sig = labelStyle ? JSON.stringify(labelStyle) : '';
  if (meta.styleSig === sig) return;
  const props = labelStyle
    ? Object.keys(labelStyle).map(k => [k.startsWith('--') ? k : k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`), labelStyle[k]])
    : [];
  meta.styleProps.filter(p => !props.some(([q]) => q === p)).forEach(p => setStyle(span, p, null));
  props.forEach(([p, v]) => setStyle(span, p, v == null ? null : String(v)));
  meta.styleProps = props.map(([p]) => p);
  meta.styleSig = sig;
}

// The swatch: the first child — a <span> for line, dashed, dot and band, an
// inline <svg> for the RC-053 marks (shape, width). Colour and dash through
// custom properties.
function updateSwatch(node, sp, meta) {
  const glyph = sp.mark === 'shape' || sp.mark === 'width';
  const sig = sp.mark === 'shape' ? `shape|${sp.shape}|${sp.radius}` : glyph ? 'width' : 'span';
  let sw = meta.swatch;
  if (!sw || sw.parentNode !== node || meta.swatchSig !== sig) {
    const fresh = glyph ? makeGlyph(node.ownerDocument, sp) : makeSpanSwatch(node.ownerDocument, sp.mark);
    if (sw && sw.parentNode === node) node.replaceChild(fresh, sw);
    else node.insertBefore(fresh, meta.label);
    sw = meta.swatch = fresh;
    meta.swatchSig = sig;
  }
  if (!glyph) {
    const cls = CLS[sp.mark] ?? CLS.line;
    if (sw.className !== cls) sw.className = cls;
  }
  setStyle(sw, '--rc-swatch-color', sp.color == null ? null : String(sp.color));
  const custom = sp.dash && !(sp.dash[0] === DEFAULT_DASH[0] && sp.dash[1] === DEFAULT_DASH[1]);
  setStyle(sw, '--rc-swatch-dash', custom ? `${sp.dash[0]}px` : null);
  setStyle(sw, '--rc-swatch-gap', custom ? `${sp.dash[1]}px` : null);
}

function makeSpanSwatch(doc, mark) {
  const span = doc.createElement('span');
  span.className = CLS[mark] ?? CLS.line;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

// 'shape': 12×12, the node shape scaled down; 'width': 16×12, a wedge from
// 2px at the left to 8px at the right. No class: the CSS reaches them as
// `.rc-legend-item > svg`; the fill comes from --rc-swatch-color.
function makeGlyph(doc, sp) {
  const width = sp.mark === 'width' ? 16 : 12;
  const holder = doc.createElement('span');
  holder.innerHTML = `<svg width="${width}" height="12" aria-hidden="true"></svg>`;
  const svg = holder.firstChild;
  const parts = sp.mark === 'width'
    ? [['path', { d: 'M0,5L16,2L16,10L0,7Z' }]]
    : shapeParts(sp.shape, sp.radius);
  if (sp.mark === 'shape') {
    const half = sp.radius + 4;   // room for every built-in shape at this radius
    svg.setAttribute('viewBox', `${-half} ${-half} ${2 * half} ${2 * half}`);
  }
  parts.forEach(([tag, attrs]) => {
    const part = doc.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => part.setAttribute(k, String(v)));
    svg.appendChild(part);
  });
  return svg;
}

// ─── Focus ───────────────────────────────────────────────────────────────────

// `focused` was inside the legend before an update. If it is still a toggle
// (or a visible Show all) it keeps focus — a moved element is focused again;
// otherwise focus goes to the toggle before it, then the one after, then
// the group itself (tabindex -1, set only then).
function keepFocus(el, s, focused, before) {
  const toggles = new Set(s.toggles.values());
  const stays = focused.parentNode === el && (toggles.has(focused) || (focused === s.reset && !focused.hidden));
  if (stays) {
    if (el.ownerDocument.activeElement !== focused) focused.focus({ preventScroll: true });
    return;
  }
  const at = before.indexOf(focused);
  let target = null;
  for (let k = at - 1; k >= 0 && !target; k--) if (toggles.has(before[k])) target = before[k];
  for (let k = at + 1; k < before.length && !target; k++) if (toggles.has(before[k])) target = before[k];
  if (!target) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    target = el;
  }
  target.focus({ preventScroll: true });
}

// ─── Gestures ────────────────────────────────────────────────────────────────

// The legend's own button under the event — a toggle or Show all — or null
// (a gap, a static item, anything outside).
function buttonOf(el, event) {
  const node = event.target?.closest?.('button');
  return node && node.parentNode === el ? node : null;
}

function onClick(el, s, event) {
  const node = buttonOf(el, event);
  if (!node) return;
  if (node === s.reset) {
    cancelPending(s);
    s.snap = null;
    commit(el, s, nextVisible(s.keys, s.visible, 'showAll'), null, false);
    return;
  }
  const key = node.getAttribute('data-key');
  if (key == null) return;
  const detail = event.detail || 0;
  if (detail >= 3) return;
  // the second click of a double click on the same item
  if (detail === 2 && s.snap?.key === key) {
    if (!s.snap.doubled) double(el, s, key, s.snap, s.snap.committed);
    return;
  }
  // keyboard, screen reader, element.click(): at once
  if (detail === 0) {
    flushPending(el, s);
    s.snap = null;
    if (s.toggles.has(key)) commit(el, s, nextVisible(s.keys, s.visible, 'toggle', key), key, false);
    return;
  }
  // A pointer click (or a detail-2 click on another item: a single click).
  // Two quick clicks on one item that the engine did not count as a double
  // click cancel out; a dblclick that follows still sees the first.
  if (s.pending?.key === key) {
    cancelPending(s);
    if (s.snap) s.snap.prior = null;
    return;
  }
  flushPending(el, s);
  if (!s.toggles.has(key)) return;
  const last = s.snap;
  const snap = {
    key,
    visible: new Set(s.visible),
    committed: false,
    doubled: false,
    // the click before, on this item: the first of a pair for the dblclick fallback
    prior: last && last.key === key && !last.doubled ? last : null,
  };
  s.snap = snap;
  if (s.visible.has(key)) {
    const timer = setTimeout(() => {
      s.pending = null;
      snap.committed = true;
      hideNow(el, s, key);
    }, HIDE_DELAY_MS);
    s.pending = { key, timer };
  } else {
    snap.committed = true;
    commit(el, s, nextVisible(s.keys, s.visible, 'toggle', key), key, false);
  }
}

// The fallback for an engine that does not count event.detail: the double
// click pairs the last two clicks.
function onDblClick(el, s, event) {
  const key = buttonOf(el, event)?.getAttribute('data-key');
  const snap = s.snap;
  if (key == null || !snap || snap.key !== key || snap.doubled) return;
  const first = snap.prior ?? snap;
  double(el, s, key, first, first.committed || snap.committed);
}

// Computed from the state before the first click of the pair.
function double(el, s, key, first, replaces) {
  cancelPending(s);
  if (s.snap) s.snap.doubled = true;
  first.doubled = true;
  commit(el, s, nextVisible(s.keys, first.visible, 'double', key), key, replaces);
}

// A pointer hide, when it is due. Nothing when the item was hidden meanwhile
// or is no longer a toggle (s.visible holds toggle keys only).
function hideNow(el, s, key) {
  if (!s.visible.has(key)) return;
  commit(el, s, nextVisible(s.keys, s.visible, 'toggle', key), key, false);
}

function cancelPending(s) {
  if (!s.pending) return;
  clearTimeout(s.pending.timer);
  s.pending = null;
}

// A pending hide commits now (another click came; its snap is replaced).
function flushPending(el, s) {
  if (!s.pending) return;
  const { key } = s.pending;
  cancelPending(s);
  hideNow(el, s, key);
}

// The state is written at once — it stays right while a caller re-queries
// (Graph ego) — then the caller hears it.
function commit(el, s, result, key, replaces) {
  s.visible = new Set(result.visible);
  for (const [k, node] of s.toggles) setAttr(node, 'aria-pressed', String(s.visible.has(k)));
  if (s.reset) {
    if (result.kind === 'showAll') {
      const doc = el.ownerDocument;
      const hadFocus = doc.activeElement === s.reset;
      const before = [...el.children];
      if (!s.reset.hidden) s.reset.hidden = true;
      if (hadFocus) keepFocus(el, s, s.reset, before);
    } else if (s.reset.hidden && s.keys.some(k => !s.visible.has(k))) {
      s.reset.hidden = false;
    }
  }
  s.opts.onToggle?.({ kind: result.kind, key, visibleKeys: [...result.visible], replaces: !!replaces });
}
