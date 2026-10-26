// RareCharts — graph/model.js
// Headless graph model: accumulates fetched subgraphs and runs analytics.
// No DOM. Wraps graphology; consumed by the Graph viewport and memorySource.
//
// Node shape: { id, label, group?, size?, color?, image?, ... }
// Link shape: { id?, source, target, type?, weight?, strength?, ... }
//             (`from`/`to` accepted as endpoint aliases, `flows` for
//             `links`) — read once by core/links.js normalizeRelationData
//             with the model's rules (INPUT below); storage takes the
//             canonical result (mergeCanonical) and never re-reads it.
//
// Two graphs, one truth (decision 2026-10-07, API-INVENTORY → "Flows"):
// - storage `g` is a directed multigraph — every tie is kept as given, so a
//   pair can carry several typed ties and both directions (A2);
// - analytics (degree, Louvain, shortest paths) run on an undirected simple
//   projection built lazily from storage. Louvain does not support true mixed
//   graphs, and directed paths would change what the ego/path/cluster views
//   show. The projection keeps them exact.

import Graphology from 'graphology';
import louvain from 'graphology-communities-louvain';
import { normalizeRelationData, tieKey } from '../core/links.js';

// Deterministic PRNG — Louvain uses randomness internally; a fixed seed keeps
// community assignments (and therefore cluster views) stable between renders.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const edgeWeight = (edge, attrs) => attrs.weight ?? attrs.strength ?? 1;

// How the model reads a raw payload (core/links.js normalizeRelationData):
// quietly — a link without both ends is dropped without a warning; no tie
// from a node to itself, and no node for one; an end that names no node
// gets an endpoint-only node; a tie without a caller id is keyed by tieKey —
// ordered pair + type. Re-merging the same payload updates in place;
// another type between the same pair, or the reverse direction, is a
// separate tie.
const INPUT = {
  unknownEndpoints: 'create',
  accept: l => (l.source === l.target ? null : l),
  ids: 'tie',
  warn: false,
};

export class GraphModel {
  // A raw payload in the model's canonical form — what merge() stores.
  static normalize(data = {}) {
    return normalizeRelationData(data, INPUT);
  }

  constructor(data = null) {
    this.g = new Graphology({ type: 'directed', multi: true });
    this._proj = null;   // undirected simple projection, rebuilt lazily
    if (data) this.merge(data);
  }

  // Undirected simple view of storage for analytics. Parallel and reversed
  // ties collapse to one edge carrying the first tie's attributes — exactly
  // what the pre-multigraph model stored.
  projection() {
    if (this._proj) return this._proj;
    const p = new Graphology({ type: 'undirected', multi: false });
    this.g.forEachNode(id => p.addNode(id));
    this.g.forEachEdge((edge, attrs, s, t) => {
      if (!p.hasEdge(s, t)) p.addEdge(s, t, attrs);
    });
    this._proj = p;
    return p;
  }

  get order() { return this.g.order; }

  has(id) { return this.g.hasNode(id); }

  // Ids are strings inside the model (graphology keys); a number given by a
  // caller is read as its string, so 1 and '1' are the same node.
  node(id) {
    id = String(id);
    return this.g.hasNode(id) ? { id, ...this.g.getNodeAttributes(id) } : null;
  }

  // Number of distinct neighbors (projection): parallel ties don't inflate it.
  degree(id) { return this.g.hasNode(id) ? this.projection().degree(id) : 0; }

  // Every tie between a and b, both directions, in canonical link shape.
  links(a, b) {
    if (!this.g.hasNode(a) || !this.g.hasNode(b)) return [];
    const keys = new Set();
    this.g.forEachEdge(a, (key, attrs, s, t) => {
      if ((s === a && t === b) || (s === b && t === a)) keys.add(key);
    });
    return [...keys].map(key => this._linkOf(key));
  }

  // Merge a { nodes, links } payload into the accumulated graph.
  // Repeated merges are how the user "walks" the graph: each recenter adds
  // its neighborhood on top of what is already loaded.
  merge(data = {}) {
    return this.mergeCanonical(GraphModel.normalize(data));
  }

  // Store a payload already in canonical form — GraphModel.normalize(), or
  // normalizeRelationData with unknownEndpoints: 'create' (the flow view
  // reads its trace once and hands it over): every link has a string id and
  // string ends, and every end is in `nodes` or already stored.
  mergeCanonical({ nodes = [], links = [] } = {}) {
    nodes.forEach(n => {
      const { id, ...attrs } = n;
      delete attrs.depth;  // depth is per-query, not a stored property
      this.g.mergeNode(id, attrs);
    });
    links.forEach(l => {
      const { source, target, id, ...attrs } = l;
      // no tie from a node to itself — the flow view's trace may hold one
      if (source === target) return;
      let key = id;
      if (id === tieKey(source, target, attrs.type)) {
        // The readable key can repeat for different pairs when ids contain
        // '→' or '|' — such a tie takes a numbered key instead of merging
        // into a stranger's.
        const base = key;
        for (let n = 1; this.g.hasEdge(key)
          && (this.g.source(key) !== source || this.g.target(key) !== target); n++) {
          key = `${base}#${n}`;
        }
      }
      if (this.g.hasEdge(key)) this.g.mergeEdgeAttributes(key, attrs);
      else this.g.addEdgeWithKey(key, source, target, attrs);
    });
    this._proj = null;
    return this;
  }

  // BFS neighborhood: all nodes within `depth` hops of rootId (nodes annotated
  // with their depth) plus every link between included nodes.
  // `types` filters both the traversal and the induced links — an off-type tie
  // between two reached nodes stays out of the result. Untyped links count as
  // 'default', matching how the Graph legend names them.
  neighborhood(rootId, depth = 1, { types = null } = {}) {
    rootId = String(rootId);
    if (!this.g.hasNode(rootId)) return { nodes: [], links: [] };

    const allow = types ? new Set(types.map(String)) : null;
    const pass  = attrs => !allow || allow.has(String(attrs.type ?? 'default'));

    const depths = new Map([[rootId, 0]]);
    let frontier = [rootId];
    for (let d = 1; d <= depth && frontier.length; d++) {
      const next = [];
      frontier.forEach(id => {
        this.g.forEachEdge(id, (edge, attrs, s, t) => {
          if (!pass(attrs)) return;
          const other = s === id ? t : s;
          if (!depths.has(other)) {
            depths.set(other, d);
            next.push(other);
          }
        });
      });
      frontier = next;
    }
    return this._induced(depths, pass);
  }

  // Louvain communities collapsed into meta-nodes + inter-community links.
  // Each community is labelled after its highest-degree member.
  communitySummary() {
    if (!this.g.order) return { communities: [], links: [], assignment: {} };

    const p = this.projection();
    const assignment = louvain(p, { getEdgeWeight: edgeWeight, rng: mulberry32(42) });

    const members = new Map();
    p.forEachNode(id => {
      const c = assignment[id];
      if (!members.has(c)) members.set(c, []);
      members.get(c).push(id);
    });

    const communities = [...members.entries()].map(([c, ids]) => {
      const top = ids.slice().sort((x, y) =>
        (p.degree(y) - p.degree(x)) || (x < y ? -1 : 1))[0];
      return {
        id: `c${c}`,
        size: ids.length,
        top,
        label: this.g.getNodeAttribute(top, 'label') ?? top,
        members: ids,
      };
    }).sort((a, b) => (b.size - a.size) || (a.id < b.id ? -1 : 1));

    const counts = new Map();
    p.forEachEdge((edge, attrs, s, t) => {
      const cs = assignment[s], ct = assignment[t];
      if (cs === ct) return;
      const key = cs < ct ? `c${cs}|c${ct}` : `c${ct}|c${cs}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const links = [...counts.entries()].map(([key, weight]) => {
      const [source, target] = key.split('|');
      return { source, target, weight };
    });

    return { communities, links, assignment };
  }

  // Full accumulated graph in RareCharts { nodes, links } shape.
  toData() {
    const nodes = this.g.mapNodes((id, attrs) => ({ id, ...attrs }));
    const links = this.g.mapEdges(key => this._linkOf(key));
    return { nodes, links };
  }

  _induced(depths, pass = null) {
    const nodes = [...depths.entries()].map(([id, depth]) =>
      ({ id, ...this.g.getNodeAttributes(id), depth }));
    const links = [];
    const seen = new Set();
    depths.forEach((_, id) => {
      this.g.forEachEdge(id, (edge, attrs, s, t) => {
        if (seen.has(edge) || !depths.has(s) || !depths.has(t)) return;
        if (pass && !pass(attrs)) return;
        seen.add(edge);
        links.push(this._linkOf(edge));
      });
    });
    return { nodes, links };
  }

  // Canonical link object for a storage edge: the key doubles as the id.
  _linkOf(key) {
    return {
      id: key,
      source: this.g.source(key),
      target: this.g.target(key),
      ...this.g.getEdgeAttributes(key),
    };
  }
}
