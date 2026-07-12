// RareCharts — graph/source.js
// Data-source contract for Graph. A source answers three queries:
//
//   neighbors(id, { depth, types })  →  { nodes, links }        (ego view)
//   paths(a, b, { k })               →  { paths, nodes, links } (path view)
//   aggregates()                     →  { communities, links }  (cluster view)
//
// All queries are async — a real backend implements the same contract
// server-side. memorySource() adapts a static { nodes, links } payload,
// simulating that backend over a full in-memory graph: swap it for a real
// adapter later without touching the Graph class.

import { bidirectional } from 'graphology-shortest-path/unweighted.js';
import { GraphModel } from './model.js';

export function memorySource(data = {}) {
  const model = new GraphModel(data);

  return {
    async neighbors(id, { depth = 1, types = null } = {}) {
      return model.neighborhood(id, depth, { types });
    },

    // Up to k successively edge-disjoint shortest paths between a and b:
    // find the shortest route, drop its edges from a working copy, repeat.
    // Good enough to answer "how are these two connected" for a demo backend.
    async paths(a, b, { k = 3 } = {}) {
      if (!model.has(a) || !model.has(b)) return { paths: [], nodes: [], links: [] };

      const work = model.g.copy();
      const paths = [];
      for (let i = 0; i < k; i++) {
        const p = bidirectional(work, a, b);
        if (!p) break;
        paths.push(p);
        for (let j = 0; j < p.length - 1; j++) work.dropEdge(p[j], p[j + 1]);
      }

      const ids = [...new Set(paths.flat())];
      const nodes = ids.map(id => model.node(id));
      const seen = new Set();
      const links = [];
      paths.forEach(p => {
        for (let j = 0; j < p.length - 1; j++) {
          const key = p[j] < p[j + 1] ? `${p[j]}|${p[j + 1]}` : `${p[j + 1]}|${p[j]}`;
          if (seen.has(key)) continue;
          seen.add(key);
          links.push(model.link(p[j], p[j + 1]));
        }
      });
      return { paths, nodes, links };
    },

    async aggregates() {
      const { communities, links } = model.communitySummary();
      return { communities, links };
    },
  };
}
