// RareCharts — graph/views/flowFold.js
// Folds and aggregation for the flow view (stage 2, 0.9.8_6). Pure, no DOM.
//
// A fold is a set of nodes that can collapse into one meta-node:
//   { id, label?, members: ids | node => bool, anchor?, collapsed?, sub?, group? }
// Collapsed, its members leave the drawing and a meta-node takes the anchor's
// place (the anchor is the node that carries the +/− switch; by default the
// first member in the order of `nodes`). Ties with one end inside are
// re-pointed to the meta-node and summed per pair and category; ties inside
// the fold disappear with it.
//
// Ties can also be aggregated without folding (option aggregateLinks): one
// tie per pair and category, `value` summed, the originals in `links`.

import { parseTime } from '../../core/links.js';

export const META_PREFIX = 'fold:';
export const metaId = foldId => `${META_PREFIX}${foldId}`;

// Normalize the fold list against the nodes: membership is resolved once, a
// node belongs to the first fold that claims it, folds without members drop.
export function resolveFolds(nodes, folds = []) {
  const claimed = new Set();
  const out = [];
  (folds ?? []).forEach(f => {
    if (!f || f.id == null) return;
    const id = String(f.id);
    const listed = Array.isArray(f.members) ? new Set(f.members.map(String)) : null;
    const members = nodes
      .filter(n => !claimed.has(n.id) && (typeof f.members === 'function' ? f.members(n) : listed?.has(n.id)))
      .map(n => n.id);
    if (!members.length) return;
    members.forEach(m => claimed.add(m));
    const anchor = f.anchor != null && members.includes(String(f.anchor)) ? String(f.anchor) : members[0];
    out.push({ ...f, id, members, anchor });
  });
  return out;
}

// Caption under a meta-node: the fold's `sub` (a string, where {n} is the
// member count, or n => string), "N nodes" by default.
export function foldSub(fold, n) {
  if (typeof fold.sub === 'function') return fold.sub(n);
  if (typeof fold.sub === 'string') return fold.sub.replace(/\{n\}/g, String(n));
  return `${n} node${n === 1 ? '' : 's'}`;
}

// Apply the collapsed folds to a { nodes, links } payload.
//   keyOf(link)  — the tie's category (linkColorBy); ties merge within one
//   aggregate    — also merge parallel ties that no fold touches
// Returns the folded payload plus `metaOf` (member id → meta id) and
// `metas` (meta id → fold).
//   laneOf(node) — the anchor's lane, which the meta-node takes as `_lane`
export function foldGraph({ nodes, links }, folds, collapsed, {
  keyOf = l => String(l.type ?? 'default'), aggregate = false, laneOf = n => n.lane,
} = {}) {
  const metaOf = new Map();
  const metas = new Map();
  const present = new Set(nodes.map(n => n.id));
  const byId = new Map(nodes.map(n => [n.id, n]));

  folds.forEach(f => {
    if (!collapsed.has(f.id)) return;
    const inside = f.members.filter(m => present.has(m));
    if (!inside.length) return;
    const mid = metaId(f.id);
    inside.forEach(m => metaOf.set(m, mid));
    metas.set(mid, { ...f, visibleMembers: inside });
  });

  const outNodes = [];
  const emitted = new Set();
  nodes.forEach(n => {
    const mid = metaOf.get(n.id);
    if (!mid) { outNodes.push(n); return; }
    if (emitted.has(mid)) return;
    emitted.add(mid);
    const f = metas.get(mid);
    // The meta-node stands where the anchor stood (or the first member still
    // drawn) and inherits its lane and position hints — nothing else, so a
    // page reading `node.addr` never mistakes the fold for its anchor.
    const base = byId.get(f.anchor) ?? byId.get(f.visibleMembers[0]);
    const meta = {
      id: mid,
      label: f.label ?? base.label ?? f.id,
      sub: foldSub(f, f.visibleMembers.length),
      group: f.group ?? base.group,
      fold: f.id,
      members: f.visibleMembers.map(m => byId.get(m)),
      _base: base,
      _lane: laneOf(base),
    };
    ['row', 'col', 'x', 'y'].forEach(k => { if (Number.isFinite(base[k])) meta[k] = base[k]; });
    outNodes.push(meta);
  });

  const bucket = new Map();
  const outLinks = [];
  links.forEach(l => {
    const s = metaOf.get(l.source) ?? l.source;
    const t = metaOf.get(l.target) ?? l.target;
    const touched = s !== l.source || t !== l.target;
    if (touched && s === t) return;            // inside one fold
    if (!touched && !aggregate) { outLinks.push(l); return; }
    // an unambiguous key: ids and categories may contain any character
    const key = JSON.stringify([s, t, keyOf(l)]);
    if (!bucket.has(key)) {
      const entry = { key, source: s, target: t, links: [] };
      bucket.set(key, entry);
      outLinks.push(entry);
    }
    bucket.get(key).links.push(l);
  });

  return {
    nodes: outNodes,
    links: outLinks.map(l => (l.links && l.key ? mergeTies(l) : l)),
    metaOf,
    metas,
  };
}

// One tie standing for several: the first original's fields (so field-based
// colour and dash still resolve), value summed, time spanning all of them.
// A single original keeps its own id and label.
function mergeTies({ key, source, target, links }) {
  const first = links[0];
  if (links.length === 1) return { ...first, source, target, links, aggregate: true };
  // In the time window's dim mode, the ties outside the window (_dim) must
  // not swell an active tie: value — and so width — counts the ones in it;
  // the merged tie dims only when all of them are out.
  const live = links.filter(l => !l._dim);
  const counted = live.length ? live : links;
  const vals = counted.map(l => l.value).filter(v => v != null && v !== '' && Number.isFinite(+v));
  const starts = links.map(l => [l.start, parseTime(l.start)]);
  const ends = links.map(l => [l.end, parseTime(l.end, { end: true })]);
  const earliest = starts.some(s => s[1] == null) ? null
    : starts.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const latest = ends.some(e => e[1] == null) ? null
    : ends.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return {
    ...first,
    id: `agg:${key}`,
    source,
    target,
    value: vals.length ? vals.reduce((s, v) => s + +v, 0) : null,
    label: `${links.length} ties`,
    start: earliest,
    end: latest,
    links,
    aggregate: true,
    _dim: links.every(l => l._dim) || undefined,
  };
}
