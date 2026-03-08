(function () {
  const d3 = RareCharts.d3;

  const series = [
    {
      name: 'Revenue',
      color: '#00aaff',
      values: [
        { date: '2023-02-01', value: 1.2 },
        { date: '2023-03-01', value: 1.35 },
        { date: '2023-04-01', value: 0.7 },
        { date: '2023-05-01', value: 0.75 },
        { date: '2023-06-01', value: 0.95 },
        { date: '2023-07-01', value: 1.0 },
        { date: '2023-08-01', value: 1.2 },
        { date: '2023-09-01', value: 1.4 },
        { date: '2023-10-01', value: 2.0 },
        { date: '2023-11-01', value: 2.5 },
        { date: '2023-12-01', value: 2.7 },
        { date: '2024-01-01', value: 2.8 },
      ],
    }
  ];

  new RareCharts.Line('#line-chart-demo-revenue', {
    height: 320,
    title: 'Revenue Performance',
    subtitle: 'Total revenue growth over 2024',
    legend: [
      { label: 'Revenue, millions USD', color: '#00aaff' },
    ],
    source: 'Source: Internal accounting data',

    endLabels: false,
    yTickValues: [1, 2, 3],

    yTickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('.1f')(v) + 'M';
    },
    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    curve: 'linear', // см. ниже
  }).setData(series);
})();