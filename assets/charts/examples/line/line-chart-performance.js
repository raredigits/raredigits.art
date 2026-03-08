(function () {
  const d3 = RareCharts.d3;

  const series = [
    {
      name: 'Alice',
      color: '#00aaff',
      values: [
        { date: '2025-02-01', value: 3.2 },
        { date: '2025-02-05', value: 4.1 },
        { date: '2025-02-10', value: 5.6 },
        { date: '2025-02-14', value: -2.8 },
        { date: '2025-02-18', value: 5.0 },
        { date: '2025-02-23', value: 4.0 },
        { date: '2025-03-02', value: -1.6 },
        { date: '2025-03-06', value: 3.9 },
      ],
    },
    {
      name: 'Bob',
      color: '#ff3b5c',
      values: [
        { date: '2025-02-01', value: -4.4 },
        { date: '2025-02-05', value: -1.0 },
        { date: '2025-02-10', value: 3.8 },
        { date: '2025-02-14', value: 2.0 },
        { date: '2025-02-18', value: 1.6 },
        { date: '2025-02-23', value: -3.9 },
        { date: '2025-03-02', value: 1.2 },
        { date: '2025-03-06', value: -3.6 },
      ],
    },
    {
      name: 'Charlie',
      color: '#00c97a',
      values: [
        { date: '2025-02-01', value: 0.1 },
        { date: '2025-02-05', value: -7.6 },
        { date: '2025-02-10', value: -1.8 },
        { date: '2025-02-14', value: 4.3 },
        { date: '2025-02-18', value: 3.5 },
        { date: '2025-02-23', value: 7.8 },
        { date: '2025-03-02', value: 5.3 },
        { date: '2025-03-06', value: -7.5 },
      ],
    },
  ];

  new RareCharts.Line('#line-chart-demo', {
    height: 320,
    title: 'Sales Reps Performance',
    subtitle: 'Values relative to the previous period',
    legend: [
      { label: 'Alice', color: '#00aaff' },
      { label: 'Bob', color: '#ff3b5c' },
      { label: 'Charlie', color: '#00c97a' },
    ],
    source: 'Source: Internal CRM Data',

    endLabels: false,
    yLabelsOnly: true,
    crosshair: true,

    yTickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('+.0f')(v) + '%';
    },
    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    curve: 'linear',
  }).setData(series);
})();