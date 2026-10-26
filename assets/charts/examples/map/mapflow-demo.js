// MapFlow demos — illustrative data, not measurements.
//   #mapflow-triangle — three flows, two types, static
//   #mapflow-eurodollar — five centres on a time scale: era buttons in the
//                         header and a brushable navigator under the map
(function () {
  if (!window.RareCharts) return;
  const TOPO = '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json';

  if (document.getElementById('mapflow-triangle')) {
    new RareCharts.MapFlow('#mapflow-triangle', {
      title: 'The opium triangle',
      subtitle: 'India → China → Britain → India, XIX century',
      source: 'Illustrative data',
      topoUrl: TOPO,
      topoObject: 'countries',
      fitTo: 'links',
      fitPadding: 60,
      height: 420,
      linkTypes: {
        goods:  { color: '#8a5a2b', label: 'goods' },
        silver: { color: '#5b6b7d', label: 'silver', dash: '6 4' },
      },
      nodes: [
        { id: 'IN', label: 'India', country: '356' },      // centroid of the country
        { id: 'CN', label: 'China', country: '156' },
        { id: 'LDN', label: 'London', coords: [-0.13, 51.51] },
      ],
      links: [
        { from: 'IN', to: 'CN', type: 'goods', value: 3, label: 'opium from Bengal', start: 1773, end: 1860 },
        { from: 'CN', to: 'LDN', type: 'silver', value: 2, label: 'silver and tea', start: 1800, end: 1860 },
        { from: 'LDN', to: 'IN', type: 'goods', value: 2, label: 'cotton textiles', start: 1813, end: 1860 },
      ],
    });
  }

  const euroEl = document.getElementById('mapflow-eurodollar');
  if (euroEl) {
    const era = year => ({ key: String(year), label: String(year), range: [`${year}-01-01`, `${year}-12-31`] });
    new RareCharts.MapFlow('#mapflow-eurodollar', {
      title: 'Dollars outside America',
      subtitle: 'Where dollar deposits and lending ran, by era',
      source: 'Illustrative data',
      topoUrl: TOPO,
      topoObject: 'countries',
      fitTo: 'links',
      fitPadding: 50,
      height: 500,
      timeframes: [era(1957), era(1968), era(2025), { key: 'ALL', label: 'All' }],
      defaultView: ['1957-01-01', '1957-12-31'],
      navigator: true,
      linkTypes: {
        deposits: { color: '#2c5d8f', label: 'dollar deposits' },
        lending:  { color: '#a33d36', label: 'dollar lending' },
      },
      nodes: [
        { id: 'MOW', label: 'Moscow',    coords: [37.62, 55.75] },
        { id: 'LDN', label: 'London',    coords: [-0.13, 51.51] },
        { id: 'PAR', label: 'Paris',     coords: [2.35, 48.86] },
        { id: 'NYC', label: 'New York',  coords: [-74.0, 40.71] },
        { id: 'SIN', label: 'Singapore', coords: [103.82, 1.35] },
      ],
      links: [
        { from: 'MOW', to: 'LDN', type: 'deposits', value: 2, label: 'Soviet dollar deposits', start: 1957, end: 2022 },
        { from: 'MOW', to: 'PAR', type: 'deposits', value: 2, label: 'Soviet dollar deposits', start: 1957, end: 2022 },
        { from: 'NYC', to: 'LDN', type: 'deposits', value: 4, label: 'US bank branches fund in London', start: 1960, end: 2025 },
        { from: 'LDN', to: 'NYC', type: 'lending',  value: 3, label: 'eurodollar loans back home', start: 1966, end: 2025 },
        { from: 'LDN', to: 'SIN', type: 'lending',  value: 2, label: 'Asian dollar market', start: 1968, end: 2025 },
        { from: 'SIN', to: 'LDN', type: 'deposits', value: 1, label: 'regional deposits', start: 1970, end: 2025 },
      ],
    });
  }
})();
