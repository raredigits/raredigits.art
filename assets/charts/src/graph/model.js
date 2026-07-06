// RareCharts — graph/model.js
// Headless graph model: accumulates fetched subgraphs and runs analytics.
// No DOM. Wraps graphology; consumed by the Graph viewport and memorySource.
//
// Node shape: { id, label, group?, size?, color?, image?, ... }
// Link shape: { source, target, type?, weight?, strength?, ... }

import Graphology from 'graphology';
import louvain from 'graphology-communities-louvain';
import { degreeCentrality } from 'graphology-metrics/centrality/degree.js';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness.js';

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

export class GraphModel {
  constructor(data = null) {
    this.g = new Graphology({ type: 'undirected', multi: false });
    if (data) this.merge(data);
  }

  get order() { return this.g.order; }

  has(id) { return this.g.hasNode(id); }

  node(id) {
    return this.g.hasNode(id) ? { id, ...this.g.getNodeAttributes(id) } : null;
  }

  degree(id) { return this.g.hasNode(id) ? this.g.degree(id) : 0; }

  link(a, b) {
    const edge = this.g.hasNode(a) && this.g.hasNode(b) ? this.g.edge(a, b) : undefined;
    return edge === undefined ? null
      : { source: a, target: b, ...this.g.getEdgeAttributes(edge) };
  }

  // Merge a { nodes, links } payload into the accumulated graph.
  // Repeated merges are how the user "walks" the graph: each recenter adds
  // its neighborhood on top of what is already loaded.
  merge({ nodes = [], links = [] } = {}) {
    nodes.forEach(n => {
      const { id, ...attrs } = n;
      delete attrs.depth;  // depth is per-query, not a stored property
      this.g.mergeNode(id, attrs);
    });
    links.forEach(l => {
      const { source, target, ...attrs } = l;
      if (source === target) return;
      if (!this.g.hasNode(source)) this.g.addNode(source);
      if (!this.g.hasNode(target)) this.g.addNode(target);
      if (!this.g.hasEdge(source, target)) this.g.addEdge(source, target, attrs);
    });
    return this;
  }

  // BFS neighborhood: all nodes within `depth` hops of rootId (nodes annotated
  // with their depth) plus every link between included nodes.
  // `types` restricts which link types the traversal may walk through.
  neighborhood(rootId, depth = 1, { types = null } = {}) {
    if (!this.g.hasNode(rootId)) return { nodes: [], links: [] };

    const depths = new Map([[rootId, 0]]);
    let frontier = [rootId];
    for (let d = 1; d <= depth && frontier.length; d++) {
      const next = [];
      frontier.forEach(id => {
        this.g.forEachEdge(id, (edge, attrs, s, t) => {
          if (types && !types.includes(attrs.type)) return;
          const other = s === id ? t : s;
          if (!depths.has(other)) {
            depths.set(other, d);
            next.push(other);
          }
        });
      });
      frontier = next;
    }
    return this._induced(depths);
  }

  // Centrality measures over the accumulated graph.
  // degree ~ "who has the most connections"; betweenness ~ "who do the
  // shortest paths run through" (finds brokers invisible to the eye).
  centrality() {
    return {
      degree: degreeCentrality(this.g),
      betweenness: betweennessCentrality(this.g, { getEdgeWeight: null }),
    };
  }

  // Louvain communities collapsed into meta-nodes + inter-community links.
  // Each community is labelled after its highest-degree member.
  communitySummary() {
    if (!this.g.order) return { communities: [], links: [], assignment: {} };

    const assignment = louvain(this.g, { getEdgeWeight: edgeWeight, rng: mulberry32(42) });

    const members = new Map();
    this.g.forEachNode(id => {
      const c = assignment[id];
      if (!members.has(c)) members.set(c, []);
      members.get(c).push(id);
    });

    const communities = [...members.entries()].map(([c, ids]) => {
      const top = ids.slice().sort((x, y) =>
        (this.g.degree(y) - this.g.degree(x)) || (x < y ? -1 : 1))[0];
      return {
        id: `c${c}`,
        size: ids.length,
        top,
        label: this.g.getNodeAttribute(top, 'label') ?? top,
        members: ids,
      };
    }).sort((a, b) => (b.size - a.size) || (a.id < b.id ? -1 : 1));

    const counts = new Map();
    this.g.forEachEdge((edge, attrs, s, t) => {
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
    const links = this.g.mapEdges((edge, attrs, s, t) => ({ source: s, target: t, ...attrs }));
    return { nodes, links };
  }

  _induced(depths) {
    const nodes = [...depths.entries()].map(([id, depth]) =>
      ({ id, ...this.g.getNodeAttributes(id), depth }));
    const links = [];
    const seen = new Set();
    depths.forEach((_, id) => {
      this.g.forEachEdge(id, (edge, attrs, s, t) => {
        if (seen.has(edge) || !depths.has(s) || !depths.has(t)) return;
        seen.add(edge);
        links.push({ source: s, target: t, ...attrs });
      });
    });
    return { nodes, links };
  }
}
