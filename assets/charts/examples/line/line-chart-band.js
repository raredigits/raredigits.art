(function () {
  const d3 = RareCharts.d3;

  // Illustrative data — not real figures.
  // A single estimate line wrapped in a symmetric confidence band. This is the
  // band primitive on its own: a filled ribbon between `lower` and `upper`,
  // with an ordinary line series drawn on top as the central estimate.

  const ACCENT = '#00aaff';

  const estimate = [
    { date: '2025-01-01', value: 100 },
    { date: '2025-02-01', value: 118 },
    { date: '2025-03-01', value: 112 },
    { date: '2025-04-01', value: 135 },
    { date: '2025-05-01', value: 150 },
    { date: '2025-06-01', value: 162 },
    { date: '2025-07-01', value: 158 },
    { date: '2025-08-01', value: 178 },
  ];

  // Confidence interval — here a fixed ±14% around the estimate.
  const band = estimate.map(d => ({
    date:  d.date,
    lower: Math.round(d.value * 0.86),
    upper: Math.round(d.value * 1.14),
  }));

  new RareCharts.Line('#line-chart-demo-band', {
    height: 320,
    title: 'Estimate with Confidence Band',
    subtitle: 'Central estimate ±14%',
    legend: [
      { label: 'Estimate', color: ACCENT },
      { label: 'Confidence range', color: ACCENT, type: 'band' },
    ],

    curve: 'monotone',
    endLabels: false,

    yTickFormat: v => d3.format(',')(v),
    xTickFormat: d => d3.timeFormat('%b')(d),
  }).setData([
    { name: 'Confidence range', type: 'band', color: ACCENT, fillOpacity: 0.15, values: band },
    { name: 'Estimate',         color: ACCENT, strokeWidth: 2.5, values: estimate },
  ]);
})();
