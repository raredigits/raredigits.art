// RareCharts demo — Columbus CRM: warm-intro routing.
// Ego view around the sales rep; target leads are marked with a star icon.
// Clicking a lead switches to the path view — the warm-intro routes from the
// rep to that lead. Clicking the rep brings the ego view back; clicking
// anyone else explores their network.
(function () {
  const { Graph, memorySource } = RareCharts;

  const REP = 'anna';

  const chart = new Graph('#graph-columbus', {
    title:    'Columbus CRM — Warm Intro Routing',
    subtitle: 'Your network as a sales rep. Click a ★ lead to see who can introduce you; click yourself to come back.',
    dataSource: memorySource(ColumbusDemo.data),
    source:   'Synthetic demo data',
    height:   560,
    depth:    3,          // the whole human-scale network, all three ★ leads visible
    nodeRadius: 13,
    semanticZoom: false,          // small graph — keep the zoom literal
    linkTypes: {
      colleague: { color: '#00aaff', dash: null,  label: 'Colleague'       },
      client:    { color: '#00c97a', dash: null,  label: 'Client'          },
      works:     { color: '#aaaaaa', dash: null,  label: 'Works at'        },
      partner:   { color: '#ffcc00', dash: null,  label: 'Partner'         },
      alumni:    { color: '#cc44ff', dash: '5,4', label: 'Worked together' },
      community: { color: '#888888', dash: '2,4', label: 'Community'       },
    },
    onNodeClick: ({ node }) => {
      if (node.group === 'lead') chart.connect(REP, node.id);
      else chart.focus(node.id);
    },
  }).focus(REP);
})();
