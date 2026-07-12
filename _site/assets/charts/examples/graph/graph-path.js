// RareCharts demo — Graph path view.
// "How is Peter Thiel connected to the Jakarta Sovereign Fund?" — the source
// answers with up to k edge-disjoint routes (server-side on a real backend),
// laid out left to right like a route map.
(function () {
  const { Graph, memorySource, linkPresets } = RareCharts;

  new Graph('#graph-path', {
    title:    'Thiel ↔ Jakarta Sovereign Fund',
    subtitle: 'Both endpoints have many ties and several routes exist — the shortest is highlighted. Click a node to explore its neighborhood.',
    dataSource: memorySource(RareGraphDemo.data),
    source:   'Synthetic demo data (seeded generator)',
    height:   460,
    nodeRadius: 14,
    pathCount: 4,
    linkTypes: linkPresets.personal,
  }).connect('thiel', 'jakarta-fund');
})();
