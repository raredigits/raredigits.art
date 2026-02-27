(function () {
  const d3 = RareCharts.d3;

  const series = [
    {
      name: 'A',
      color: '#00aaff',
      values: [
        { date: '2025-02-01', value: 3.2 },
        { date: '2025-02-05', value: 4.1 },
        { date: '2025-02-10', value: 5.6 },
        { date: '2025-02-14', value: 4.8 },
        { date: '2025-02-18', value: 5.0 },
        { date: '2025-02-23', value: 4.0 },
        { date: '2025-03-02', value: 3.6 },
        { date: '2025-03-06', value: 3.9 },
      ],
    },
    {
      name: 'B',
      color: '#ff3b5c',
      values: [
        { date: '2025-02-01', value: 0.4 },
        { date: '2025-02-05', value: 1.0 },
        { date: '2025-02-10', value: 1.8 },
        { date: '2025-02-14', value: 2.0 },
        { date: '2025-02-18', value: 1.6 },
        { date: '2025-02-23', value: 0.9 },
        { date: '2025-03-02', value: -1.2 },
        { date: '2025-03-06', value: -3.6 },
      ],
    },
    {
      name: 'C',
      color: '#000000',
      values: [
        { date: '2025-02-01', value: 0.1 },
        { date: '2025-02-05', value: -0.6 },
        { date: '2025-02-10', value: -1.8 },
        { date: '2025-02-14', value: -1.3 },
        { date: '2025-02-18', value: -1.5 },
        { date: '2025-02-23', value: -0.8 },
        { date: '2025-03-02', value: -0.3 },
        { date: '2025-03-06', value: -0.5 },
      ],
    },
  ];

  new RareCharts.Line('#line-chart-demo', {
    height: 320,
    title: 'SYNTHETIC PRICE',
    subtitle: 'Fixed demo data',
    legend: [
      { label: 'A', color: '#00aaff' },
      { label: 'B', color: '#ff3b5c' },
      { label: 'C', color: '#000000' },
    ],
    source: 'Source: Internal accounting',

    endLabels: false,
    yLabelsOnly: true,
    crosshair: true,

    yTickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('+.2f')(v) + '%';
    },
    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    curve: 'linear', // см. ниже
  }).setData(series);
})();