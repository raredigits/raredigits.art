// RareCharts demo — Graph ego view.
// Peter Thiel's neighborhood, two degrees deep. Click any node to recenter:
// the chart queries the source for that node's neighborhood and shared nodes
// travel to their new positions. Zoom out to switch to the cluster overview.
(function () {
  const { Graph, memorySource, linkPresets } = RareCharts;

  new Graph('#graph-ego', {
    title:    'Peter Thiel — Network of Influence',
    subtitle: 'Ego view: categories anchor to the corners, the focused node holds the center. Click a node to recenter, zoom out for the cluster overview.',
    dataSource: memorySource(RareGraphDemo.data),
    source:   'Synthetic demo data (seeded generator)',
    view:     'ego',
    depth:    2,
    height:   680,
    nodeRadius: 10,
    linkTypes: linkPresets.personal,
  }).focus('thiel');
})();
