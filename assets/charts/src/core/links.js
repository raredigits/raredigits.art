// RareCharts — core/links.js
// Shared link layer for the relation charts (Graph, Sankey, MapFlow).
// No DOM. One vocabulary for every class that draws ties between nodes:
//
//   { nodes, links: [{ id?, source, target, type?, value?, start?, end?, label?, ... }] }
//
// Accepted on input, never emitted: `from`/`to` for the endpoints and `flows`
// for the collection (the MapFlow draft and the data-project mock-up use
// them). Everything leaving the library — events, tooltips — carries the
// canonical `source`/`target`.
//
// Time on a link is `start`/`end` — not `from`/`to`, which are taken twice
// over (endpoint aliases, and the `{ from, to }` vertical annotations).

import * as d3 from 'd3';

// ─── Normalization ───────────────────────────────────────────────────────────

// Canonical endpoints for one raw link; null when an endpoint is missing.
function endpoints(raw) {
  const source = raw.source ?? raw.from;
  const target = raw.target ?? raw.to;
  if (source == null || target == null) return null;
  return { source: String(source), target: String(target) };
}

// Normalize a links array: resolve aliases, drop malformed entries (with a
// warning), and give every link a stable `id`. A caller-supplied `id` wins;
// otherwise `source→target#n`, where n counts earlier links of the same
// ordered pair — stable across re-renders of the same payload.
export function normalizeLinks(list, { warn = true } = {}) {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  const out = [];
  list.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const ends = endpoints(raw);
    if (!ends) {
      if (warn) console.warn(`RareCharts: link #${i} has no source/target — dropped`);
      return;
    }
    const { from, to, ...rest } = raw;
    const link = { ...rest, ...ends };
    if (link.id == null) {
      const pair = `${ends.source}→${ends.target}`;
      const n = seen.get(pair) ?? 0;
      seen.set(pair, n + 1);
      link.id = `${pair}#${n}`;
    } else {
      link.id = String(link.id);
    }
    out.push(link);
  });
  return out;
}

// Normalize a whole payload: `links` or its `flows` alias; nodes untouched.
export function normalizeLinkData(data = {}, opts) {
  return {
    ...data,
    nodes: data.nodes ?? [],
    links: normalizeLinks(data.links ?? data.flows ?? [], opts),
  };
}

// ─── Time ────────────────────────────────────────────────────────────────────

// Parse a time value to epoch ms. Accepts Date, numbers, and strings.
// Numbers below 10000 are years (1773 is a year, not 1.773 s after 1970);
// 'YYYY' and 'YYYY-MM' are calendar periods. With { end: true } a period
// resolves to its last millisecond — so a window ending at '2024-01'
// includes the whole of January.
export function parseTime(v, { end = false } = {}) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(+v) ? null : +v;

  const period = (y, m = null) => {
    if (!end) return Date.UTC(y, m ?? 0, 1);
    return m == null ? Date.UTC(y + 1, 0, 1) - 1 : Date.UTC(y, m + 1, 1) - 1;
  };

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    return Math.abs(v) < 10000 ? period(Math.trunc(v)) : v;
  }

  const s = String(v).trim();
  let m = /^(-?\d{1,4})$/.exec(s);
  if (m) return period(+m[1]);
  m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return period(+m[1], +m[2] - 1);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

// Does the link's [start, end] interval meet the window [from, to]?
// Missing bounds are open on either side; a link with no time at all is
// timeless and always in the window.
export function linkInWindow(link, from, to) {
  const ls = parseTime(link.start);
  const le = parseTime(link.end, { end: true });
  const ws = parseTime(from);
  const we = parseTime(to, { end: true });
  if (we != null && ls != null && ls > we) return false;
  if (ws != null && le != null && le < ws) return false;
  return true;
}

// Split links by a time window. mode 'hide' drops out-of-window links;
// 'dim' keeps them and marks them `_dim: true` for the renderer.
export function applyTimeWindow(links, window, mode = 'hide') {
  if (!window || (window.from == null && window.to == null)) return links;
  if (mode === 'dim') {
    return links.map(l => linkInWindow(l, window.from, window.to) ? l : { ...l, _dim: true });
  }
  return links.filter(l => linkInWindow(l, window.from, window.to));
}

// ─── Width ───────────────────────────────────────────────────────────────────

// Stroke-width accessor from a value field. `null`/non-numeric values get the
// minimum width (a tie without a known amount is still a tie). sqrt by
// default: perceived thickness should track magnitude, and a few huge flows
// must not flatten everything else to hairlines.
export function linkWidthScale(links, {
  by = 'value', scale = 'sqrt', min = 1, max = 12,
} = {}) {
  const val = l => {
    const v = typeof by === 'function' ? by(l) : l?.[by];
    return Number.isFinite(+v) && v !== null && v !== '' ? Math.max(0, +v) : null;
  };
  const top = d3.max(links ?? [], val) ?? 0;
  const s = (scale === 'linear' ? d3.scaleLinear() : d3.scaleSqrt())
    .domain([0, top || 1])
    .range([min, max])
    .clamp(true);
  return l => {
    const v = val(l);
    return v == null ? min : s(v);
  };
}

// ─── Pairs ───────────────────────────────────────────────────────────────────

// Unordered pair key — the identity of a tie in views that ignore direction.
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Collapse links that are the same tie in an undirected view: same unordered
// pair and same type. First occurrence wins. Different types between one
// pair stay separate — they are parallel ties, not duplicates.
export function dedupeUndirected(links) {
  const seen = new Set();
  return links.filter(l => {
    const key = `${pairKey(l.source, l.target)}|${l.type ?? 'default'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Index parallel links within each unordered pair: { index, count } per link
// id, in input order. Renderers fan parallel ties out by index.
export function parallelIndex(links) {
  const groups = new Map();
  links.forEach(l => {
    const k = pairKey(l.source, l.target);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  });
  const out = new Map();
  groups.forEach(group => {
    group.forEach((l, index) => out.set(l.id, { index, count: group.length }));
  });
  return out;
}
