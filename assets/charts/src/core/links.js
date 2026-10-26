// RareCharts — core/links.js
// Shared link layer for the relation charts (Graph, Sankey, MapFlow).
// No DOM. One vocabulary for every class that draws ties between nodes:
//
//   { nodes, links: [{ id?, source, target, type?, value?, start?, end?, label?, ... }] }
//
// Accepted on input, never emitted: `from`/`to` for the endpoints and `flows`
// for the collection (the MapFlow draft and the data-project mock-up use
// them). Everything leaving the library — events, tooltips — carries the
// canonical `source`/`target`. Every class reads its data through
// normalizeRelationData() below, each with its own endpoint policy.
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

// The derived id of a tie in Graph's accumulating model (ego / path /
// cluster): ordered pair + category, so loading the same tie again finds it.
export const tieKey = (source, target, type) => `${source}→${target}|${type ?? 'default'}`;

// Normalize a links array: resolve aliases, drop malformed entries (with a
// warning), and give every link an `id` (see normalizeRelationData). A
// caller-supplied `id` wins; otherwise, ids: 'payload' (default) gives
// `source→target#n`, where n counts earlier links of the same ordered pair —
// stable across re-renders of the same payload; ids: 'tie' gives tieKey().
export function normalizeLinks(list, { warn = true, ids = 'payload' } = {}) {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  const used = new Set(list.filter(l => l?.id != null).map(l => String(l.id)));
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
    if (link.id == null && ids === 'tie') {
      link.id = tieKey(ends.source, ends.target, link.type);
    } else if (link.id == null) {
      // Count per pair by an unambiguous key; the readable id could still
      // repeat when node ids contain '→' ('a→b'+'c' vs 'a'+'b→c'), so an id
      // already given out takes the next free number.
      const pairId = JSON.stringify([ends.source, ends.target]);
      const pair = `${ends.source}→${ends.target}`;
      let n = seen.get(pairId) ?? 0;
      while (used.has(`${pair}#${n}`)) n++;
      seen.set(pairId, n + 1);
      link.id = `${pair}#${n}`;
    } else {
      link.id = String(link.id);
    }
    used.add(link.id);
    out.push(link);
  });
  return out;
}

// Relation data in canonical form — the one way links enter the library:
// Graph (every view, and its model), MapFlow and Sankey (K-07). Returns
// { ...data, nodes, links } with, in this order:
//   1. nodes: `nodes`, ids as strings; links: `links` or its `flows` alias;
//   2. endpoints `source`/`target` (or `from`/`to`) as strings; a link
//      without both is dropped — with a warning, unless warn: false;
//   3. an `id` on every link (below);
//   4. accept(link) → link | null: the chart's own rule per link, before
//      the endpoint policy, so a link it drops creates no node (Sankey: a
//      positive value; Graph's model: no tie from a node to itself);
//   5. unknownEndpoints — a link with an end that names no node:
//      'keep' (default) leaves it; 'create' appends an endpoint-only node
//      { id }, in order of appearance (Graph); 'drop' removes the link and
//      passes it to onUnknown(link) (MapFlow; Sankey when given nodes).
// Link ids — the public format, frozen for 1.0: a caller `id` wins, as a
// string. Without one: ids: 'payload' (default; MapFlow, Sankey, the
// Graph flow view) — `source→target#n`, n counting earlier links of the
// same ordered pair in this payload; ids: 'tie' (Graph's model, ego / path
// / cluster) — `source→target|type`, `type` 'default' when absent: the same
// pair and type is one tie across loads, and the model numbers (`#1`, …) a
// key another pair already holds.
export function normalizeRelationData(data = {}, {
  unknownEndpoints = 'keep', onUnknown = null, accept = null, ids = 'payload', warn = true,
} = {}) {
  const nodes = (data.nodes ?? []).map(n => ({ ...n, id: String(n.id) }));
  let links = normalizeLinks(data.links ?? data.flows ?? [], { warn, ids });
  if (accept) links = links.map(l => accept(l)).filter(l => l != null);
  if (unknownEndpoints === 'create' || unknownEndpoints === 'drop') {
    const known = new Set(nodes.map(n => n.id));
    if (unknownEndpoints === 'create') {
      links.forEach(l => [l.source, l.target].forEach(id => {
        if (!known.has(id)) { known.add(id); nodes.push({ id }); }
      }));
    } else {
      links = links.filter(l => {
        if (known.has(l.source) && known.has(l.target)) return true;
        onUnknown?.(l);
        return false;
      });
    }
  }
  return { ...data, nodes, links };
}

// The earlier name (0.9.8_3): payload ids, no endpoint policy.
export function normalizeLinkData(data = {}, opts) {
  return normalizeRelationData(data, opts);
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

  // Date.UTC reads years 0–99 as 1900–1999; set the full year explicitly.
  const utc = (y, m) => {
    const d = new Date(Date.UTC(2000, 0, 1));
    d.setUTCFullYear(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1);
    return +d;
  };
  const period = (y, m = null) => {
    if (!end) return utc(y, m ?? 0);
    return m == null ? utc(y + 1, 0) - 1 : utc(y, m + 1) - 1;
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

// Time span of a set of links as [Date, Date] — every start and end that
// parses; null when no link carries time.
export function linkTimeExtent(links) {
  let lo = Infinity, hi = -Infinity;
  (links ?? []).forEach(l => {
    const s = parseTime(l.start), e = parseTime(l.end, { end: true });
    [s, e].forEach(v => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  });
  return Number.isFinite(lo) ? [new Date(lo), new Date(hi)] : null;
}

// Links active per period over `extent` — the series a navigator draws.
// Days for a span under four months, months up to fifty years, years beyond.
// Open bounds count as linkInWindow reads them: a link without an end is
// still running, one without a start has always been.
export function activeLinkSeries(links, extent = linkTimeExtent(links)) {
  if (!extent) return null;
  const span = +extent[1] - +extent[0];
  const DAY = 864e5;
  const interval = span < 120 * DAY ? d3.utcDay : span < 50 * 365 * DAY ? d3.utcMonth : d3.utcYear;
  const ticks = interval.range(interval.floor(extent[0]), interval.offset(interval.floor(extent[1]), 1));
  if (ticks.length < 2) ticks.push(interval.offset(ticks[0] ?? interval.floor(extent[0]), 1));
  const spans = (links ?? []).map(l => [
    parseTime(l.start) ?? -Infinity,
    parseTime(l.end, { end: true }) ?? Infinity,
  ]);
  const series = ticks.map(date => {
    const a = +date, b = +interval.offset(date, 1) - 1;
    return { date, value: spans.filter(([s, e]) => s <= b && e >= a).length };
  });
  // The strip spans exactly the data — first to last date, not period
  // starts — so a view of the whole extent ends at the strip's right edge.
  series[0] = { ...series[0], date: new Date(Math.max(+series[0].date, +extent[0])) };
  const last = series[series.length - 1];
  if (+extent[1] > +last.date) series.push({ date: new Date(+extent[1]), value: last.value });
  return series;
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

// ─── Categories ──────────────────────────────────────────────────────────────

// A tie's category → { key, color, dash, label }, the same rule in every
// relation chart (ego/path/cluster, the flow view, MapFlow, Sankey):
// a category described in `types` uses its own color/dash/label; an untyped
// tie ('default') without a description is muted; any other category
// without one takes the palette color of its position in `keys` (the
// categories in use, in a stable order).
export function resolveLinkType(types, key, { keys = [], theme = {} } = {}) {
  const k = key == null || key === '' ? 'default' : String(key);
  const cfg = types?.[k] ?? null;
  const muted = theme.muted ?? '#888888';
  // Undescribed categories share out the palette colours no described type
  // uses — never one that would read as a described category — and turn
  // muted once those run out.
  const taken = new Set(Object.values(types ?? {}).map(c => c?.color).filter(Boolean));
  const free = (theme.colors ?? []).filter(c => !taken.has(c));
  const undescribed = keys.filter(x => x !== 'default' && !types?.[x]);
  const i = undescribed.indexOf(k);
  return {
    key: k,
    color: cfg?.color ?? (k === 'default' || i < 0 ? muted : free[i] ?? muted),
    dash: cfg?.dash ?? null,
    label: cfg?.label ?? (k === 'default' ? 'connection' : k),
  };
}

// ─── Pairs ───────────────────────────────────────────────────────────────────

// Unordered pair key — the identity of a tie in views that ignore direction.
// Readable ('a|b'); used as an id. For grouping, upairKey is unambiguous
// even when ids contain '|'.
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const upairKey = (a, b) => JSON.stringify(a < b ? [String(a), String(b)] : [String(b), String(a)]);

// Collapse links that are the same tie in an undirected view: same unordered
// pair and same type. First occurrence wins. Different types between one
// pair stay separate — they are parallel ties, not duplicates.
export function dedupeUndirected(links) {
  const seen = new Set();
  return links.filter(l => {
    const key = JSON.stringify([upairKey(l.source, l.target), String(l.type ?? 'default')]);
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
    const k = upairKey(l.source, l.target);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  });
  const out = new Map();
  groups.forEach(group => {
    group.forEach((l, index) => out.set(l.id, { index, count: group.length }));
  });
  return out;
}
