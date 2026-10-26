// A small two-community graph, shared by graph-model.test.js (the model and
// the layouts) and graph.test.js (the Graph chart in the DOM).
//
//   a ─ b ─ c ─ d        left chain into right triangle
//   a ─ e                e hangs off the root
//   c ─ f, d ─ f         f closes the triangle
//
export const fixture = {
  nodes: [
    { id: 'a', label: 'A', group: 'g1' },
    { id: 'b', label: 'B', group: 'g1' },
    { id: 'c', label: 'C', group: 'g2' },
    { id: 'd', label: 'D', group: 'g2' },
    { id: 'e', label: 'E', group: 'g1' },
    { id: 'f', label: 'F', group: 'g2' },
  ],
  links: [
    { source: 'a', target: 'b', type: 'professional', weight: 0.9 },
    { source: 'b', target: 'c', type: 'investment',   weight: 0.5 },
    { source: 'c', target: 'd', type: 'investment',   weight: 0.7 },
    { source: 'a', target: 'e', type: 'family',       weight: 0.8 },
    { source: 'c', target: 'f', type: 'professional', weight: 0.4 },
    { source: 'd', target: 'f', type: 'professional', weight: 0.6 },
  ],
};
