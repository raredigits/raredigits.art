// RareCharts demo — Graph cluster view.
// The whole ~300-node network collapsed into Louvain communities. Meta-node
// size ∝ community size, link width ∝ number of real edges between groups.
// Click a community to dive into the ego view of its best-connected member.
(function () {
  const { Graph, memorySource } = RareCharts;

  new Graph('#graph-cluster', {
    title:    'Network Overview — Communities',
    subtitle: 'Cluster view: each node is a community labelled by its most-connected member. Click to explore, zoom in to dive back to the ego view.',
    dataSource: memorySource(RareGraphDemo.data),
    source:   'Synthetic demo data (seeded generator)',
    height:   540,
    nodeRadius: 15,
  }).overview();
})();
