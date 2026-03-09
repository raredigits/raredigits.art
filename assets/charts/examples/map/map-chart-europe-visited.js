(function () {
  const { Map: RareMap } = RareCharts;

  const visited = [
    { id: '250', label: 'France' },
    { id: '276', label: 'Germany' },
    { id: '380', label: 'Italy' },
    { id: '724', label: 'Spain' },
    { id: '826', label: 'United Kingdom' },
    { id: '528', label: 'Netherlands' },
    { id: '756', label: 'Switzerland' },
    { id: '040', label: 'Austria' },
    { id: '620', label: 'Portugal' },
    { id: '208', label: 'Denmark' },
    { id: '752', label: 'Sweden' },
    { id: '578', label: 'Norway' },
    { id: '300', label: 'Greece' },
    { id: '203', label: 'Czechia' },
    { id: '616', label: 'Poland' }
  ];

  const europeIds = new Set([
    8, 20, 40, 56, 70, 100, 112, 191, 203, 208,
    233, 246, 250, 276, 300, 348, 352, 372, 380,
    428, 440, 442, 470, 498, 499, 528, 578, 616, 620,
    642, 688, 703, 705, 724, 752, 756, 804, 807, 826
  ]);

  new RareMap('#map-europe-visited', {
    title: 'Visited Countries in Europe',
    subtitle: '15 countries across Europe',
    source: 'Source: Personal travel log',

    topoUrl: '/assets/charts/data/countries-50m.json',
    topoObject: 'countries',

    featureFilter: feature => europeIds.has(+feature.id),
    clipExtent: [[-25, 34], [45, 72]],

    height: 440,
    projection: 'naturalEarth1',
    fitPadding: 16,

    zoom: true,
    zoomExtent: [1, 12],

    borderWidth: 0.5,

    tooltipFormat: ({ feature, item }) => {
      const name =
        item?.label ??
        feature.properties?.name ??
        feature.properties?.NAME ??
        '—';

      return `
        <div style="font-weight:600">${name}</div>
        <div style="color:#666;font-size:11px;margin-top:2px">
          ${item ? 'Visited' : 'Not visited'}
        </div>
      `;
    },
  }).setData(visited);
})();