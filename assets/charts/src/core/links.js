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
import { calendarMidnight, parseDate, timeKit } from './utils.js';
import { hexOf } from './paint.js';

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

// The time of a tie — its start or end, and a window's bounds — as epoch
// ms, read in the chart's timeZone, 'local' (default) or 'UTC' (RC-006, the
// T-10 policy; Chart reads the option, the table for dates is at parseDate
// in core/utils.js):
//
//   input                             start                     end ({ end: true })
//   a number below 10000, or 'YYYY'   midnight, 1 January       the year's last ms
//     (one to four digits, a minus
//     allowed)
//   'YYYY-MM'                         midnight on the 1st       the month's last ms
//   'YYYY-MM-DD', a wall time or not  that day and time         the same: a day is a point
//   an ISO string with Z or ±hh:mm,   that instant              that instant
//     a number from 10000 (epoch ms),
//     a Date
//   any other text                    as the browser's Date reads it
//
// Midnight and the 1st are the zone's; any other calendar string is read
// by parseDate in the zone. A year or a month is a period: as an end it
// runs to its last millisecond, so a window ending at '2024-01' holds the
// whole of January. Before RC-006 the years, months and days were UTC
// whatever the zone, and a wall time local.
export function parseTime(v, { end = false, timeZone = 'local' } = {}) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(+v) ? null : +v;

  const at = (y, m) => +calendarMidnight(y, m, 1, timeZone);
  const period = (y, m = null) => {
    if (!end) return at(y, m ?? 0);
    return m == null ? at(y + 1, 0) - 1 : at(y, m + 1) - 1;
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
  const d = parseDate(s, timeZone);
  return d == null ? null : +d;
}

// Does the link's [start, end] interval meet the window [from, to]?
// Missing bounds are open on either side; a link with no time at all is
// timeless and always in the window. Both are read in `timeZone`.
export function linkInWindow(link, from, to, timeZone = 'local') {
  const ls = parseTime(link.start, { timeZone });
  const le = parseTime(link.end, { end: true, timeZone });
  const ws = parseTime(from, { timeZone });
  const we = parseTime(to, { end: true, timeZone });
  if (we != null && ls != null && ls > we) return false;
  if (ws != null && le != null && le < ws) return false;
  return true;
}

// Split links by a time window. mode 'hide' drops out-of-window links;
// 'dim' keeps them and marks them `_dim: true` for the renderer. The
// window and the ties are read in `timeZone`.
export function applyTimeWindow(links, window, mode = 'hide', timeZone = 'local') {
  if (!window || (window.from == null && window.to == null)) return links;
  const inside = l => linkInWindow(l, window.from, window.to, timeZone);
  if (mode === 'dim') {
    return links.map(l => inside(l) ? l : { ...l, _dim: true });
  }
  return links.filter(inside);
}

// Time span of a set of links as [Date, Date] — every start and end that
// parses in `timeZone`; null when no link carries time.
export function linkTimeExtent(links, timeZone = 'local') {
  let lo = Infinity, hi = -Infinity;
  (links ?? []).forEach(l => {
    const s = parseTime(l.start, { timeZone }), e = parseTime(l.end, { end: true, timeZone });
    [s, e].forEach(v => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  });
  return Number.isFinite(lo) ? [new Date(lo), new Date(hi)] : null;
}

// Links active per period over `extent` — the series a navigator draws.
// Days for a span under four months, months up to fifty years, years
// beyond: the days, months and years of `timeZone`, the ties read in it
// too. Without an extent (undefined), the ties' own in that zone.
// Open bounds count as linkInWindow reads them: a link without an end is
// still running, one without a start has always been.
export function activeLinkSeries(links, extent, timeZone = 'local') {
  if (extent === undefined) extent = linkTimeExtent(links, timeZone);
  if (!extent) return null;
  const span = +extent[1] - +extent[0];
  const DAY = 864e5;
  const tz = timeKit(timeZone);
  const interval = span < 120 * DAY ? tz.day : span < 50 * 365 * DAY ? tz.month : tz.year;
  const ticks = interval.range(interval.floor(extent[0]), interval.offset(interval.floor(extent[1]), 1));
  if (ticks.length < 2) ticks.push(interval.offset(ticks[0] ?? interval.floor(extent[0]), 1));
  const spans = (links ?? []).map(l => [
    parseTime(l.start, { timeZone }) ?? -Infinity,
    parseTime(l.end, { end: true, timeZone }) ?? Infinity,
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

// ─── Amounts ─────────────────────────────────────────────────────────────────

// A tie's amount: its `value` (or the field / accessor `by`) as a number, or
// null when it has none — null, undefined, '' and anything that is not a
// finite number ('abc', NaN, ±Infinity); a numeric string counts. Never
// below `min`: a flow does not run backwards, so a negative amount reads as
// 0 — min: -Infinity keeps the sign (a fold's sum). A caller that needs a
// number writes `linkValue(l) ?? 0`.
export function linkValue(link, { by = 'value', min = 0 } = {}) {
  const v = typeof by === 'function' ? by(link) : link?.[by];
  return v == null || v === '' || !Number.isFinite(+v) ? null : Math.max(min, +v);
}

// A tie's value as text, the one rule for every place that prints it
// (RC-079: the details panel and the tie tooltip): an amount (linkValue,
// sign kept) through the chart's `valueFormat` (v => string, as on Sankey;
// maintainer, 2026-11-19: '$627', not a bare '627'), else in the reader's
// locale, `1200` and `'1200'` alike → '1,200'; any other text as given
// ('abc', '≈ 5 M'); null and '' → '' (nothing shown).
export function linkValueText(link, format) {
  const v = linkValue(link, { min: -Infinity });
  if (v != null) return typeof format === 'function' ? String(format(v) ?? '') : v.toLocaleString();
  return link?.value == null ? '' : String(link.value);
}

// A tie's strength in ego / path / cluster: `weight`, else its legacy alias
// `strength`, else `fallback` — 0.5 where the views sort and draw by it, 1
// for community detection. Returned as given, not parsed.
export const linkWeight = (link, fallback = 0.5) => link.weight ?? link.strength ?? fallback;

// ─── Width ───────────────────────────────────────────────────────────────────

// Stroke-width accessor from a value field. `null`/non-numeric values get the
// minimum width (a tie without a known amount is still a tie). sqrt by
// default: perceived thickness should track magnitude, and a few huge flows
// must not flatten everything else to hairlines.
export function linkWidthScale(links, {
  by = 'value', scale = 'sqrt', min = 1, max = 12,
} = {}) {
  const val = l => linkValue(l, { by });
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
  // muted once those run out. The palette is hex (core/paint.js); a type's
  // colour is compared as hex too, so a token chain (defaultTheme.colors[0])
  // takes its palette colour out.
  const hex = hexOf(theme);
  const taken = new Set(Object.values(types ?? {}).map(c => c?.color).filter(Boolean).map(hex));
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

// Index parallel links: { index, count, offset } per link id. Parallel ties
// share an unordered pair (the views that ignore direction) or, with
// directed: true, an ordered one — A → B and B → A are then two fans, and
// each bows to its own side by its own normal (MapFlow). `index` counts the
// group in input order. `offset` is the link's place in its fan, centred on
// 0 (index − (count − 1) / 2), along the link's own normal (see chord): in
// an undirected group the slots are laid out on the pair's canonical
// direction, lower id → higher, so a link that runs the other way takes the
// opposite sign and ties listed both ways never land on top of each other.
// A renderer multiplies offset by its own spacing.
export function parallelIndex(links, { directed = false } = {}) {
  const groups = new Map();
  links.forEach(l => {
    const k = directed
      ? JSON.stringify([String(l.source), String(l.target)])
      : upairKey(l.source, l.target);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  });
  const out = new Map();
  groups.forEach(group => {
    const count = group.length, centre = (count - 1) / 2;
    group.forEach((l, index) => {
      const against = !directed && l.source > l.target;
      out.set(l.id, { index, count, offset: against ? centre - index : index - centre });
    });
  });
  return out;
}

// Ties that are one in a view — the same ordered pair and category — as one
// group each. tie(link) → [source, target, category]: the ends as the view
// draws them (a fold re-points them) and what it merges by; null leaves the
// link apart, as itself. Returns the links in input order, each group in
// the place of its first member: { key, source, target, links }, key =
// JSON.stringify([source, target, category]) — unambiguous whatever the ids
// contain. onRepeat(link, group) runs as a link joins a group already begun.
export function groupTies(links, {
  tie = l => [l.source, l.target, String(l.type ?? 'default')], onRepeat = null,
} = {}) {
  const groups = new Map();
  const out = [];
  (links ?? []).forEach(l => {
    const ends = tie(l);
    if (ends == null) { out.push(l); return; }
    const key = JSON.stringify(ends);
    const group = groups.get(key);
    if (group) {
      group.links.push(l);
      onRepeat?.(l, group);
      return;
    }
    const fresh = { key, source: ends[0], target: ends[1], links: [l] };
    groups.set(key, fresh);
    out.push(fresh);
  });
  return out;
}

// ─── Curves ──────────────────────────────────────────────────────────────────
// A tie bows sideways off the straight line between its ends, along that
// line's normal, by `bow` px: a number, or a function of the line's length.
// A positive bow goes to the normal's side, a negative one to the other;
// since A → B and B → A have opposite normals, the same bow parts them.

// The straight line from p0 to p1 ({ x, y }): its length — 1 when the points
// coincide, so nothing divides by zero — its unit direction u, and its unit
// normal n = (−u.y, u.x), u turned a quarter clockwise on screen (y down).
export function chord(p0, p1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  return { len, u: { x: ux, y: uy }, n: { x: -uy, y: ux } };
}

// A tie from a to b as one quadratic curve (Graph's views). Its ends lie on
// the centre line a → b: `from` px past a and `to` px short of b (a node's
// rim, room for an arrowhead); 0 leaves an end where it is. The control
// point stands `bow` px off the middle of those ends along the centre
// line's normal; bow: 0 puts it on the line. Returns { s, e, c, off, len,
// u, n, d }: the ends, the control point, the bow in px, chord(a, b), and
// the SVG path 'M s Q c e'.
export function quadBow(a, b, { from = 0, to = 0, bow = 0 } = {}) {
  const { len, u, n } = chord(a, b);
  const off = typeof bow === 'function' ? bow(len) : bow;
  // k !== 0, not a truthy test: a NaN trim (a node radius that is not a
  // number) keeps the end NaN, so that tie is not drawn, as before.
  const along = (p, k) => (k !== 0 ? { x: p.x + u.x * k, y: p.y + u.y * k } : { x: p.x, y: p.y });
  const s = along(a, from), e = along(b, -to);
  const c = { x: (s.x + e.x) / 2 + n.x * off, y: (s.y + e.y) / 2 + n.y * off };
  return { s, e, c, off, len, u, n, d: `M${s.x},${s.y}Q${c.x},${c.y} ${e.x},${e.y}` };
}

// The point at t (0 at s, 1 at e) along a quadratic curve { s, c, e } —
// quadBow's, say; t = 0.5 is the middle of the bow.
export function quadPoint({ s, c, e }, t) {
  return {
    x: (1 - t) ** 2 * s.x + 2 * (1 - t) * t * c.x + t ** 2 * e.x,
    y: (1 - t) ** 2 * s.y + 2 * (1 - t) * t * c.y + t ** 2 * e.y,
  };
}

// A polyline ([[x, y], …]) bowed sideways by a sine over its length
// (MapFlow's arcs, which follow a great circle and so have many points):
// each point moves along the normal of the line from the first point to
// the last by sin(π · its share of the length) × bow — `bow` px at the
// middle, nothing at the ends, which stay where they are.
export function sineBow(pts, bow) {
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
  const { len, n } = chord({ x: x0, y: y0 }, { x: x1, y: y1 });
  const amp = typeof bow === 'function' ? bow(len) : bow;
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = s[s.length - 1] || 1;
  return pts.map(([x, y], i) => {
    const k = Math.sin(Math.PI * (s[i] / total)) * amp;
    return [x + n.x * k, y + n.y * k];
  });
}
