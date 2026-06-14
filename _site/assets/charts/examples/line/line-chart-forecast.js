(function () {
  const d3 = RareCharts.d3;

  // Illustrative data — not real figures.
  // Story: we are in June 2024. Actuals exist for H1 2024; everything from
  // June onward is a forecast — a P50 central path plus a P10–P90 range that
  // widens as uncertainty grows further out.

  // One hue throughout — the canonical forecast convention: the past is a solid
  // line, the future continues dashed, and the P10–P90 cone is the same hue
  // shaded. Reads cleanly on both light and dark themes.
  const ACTUAL  = '#00aaff'; // realized revenue — solid
  const FCAST   = '#00aaff'; // forecast — dashed P50 + shaded band

  const actuals = [
    { date: '2024-01-01', value: 1.00 },
    { date: '2024-02-01', value: 1.15 },
    { date: '2024-03-01', value: 1.05 },
    { date: '2024-04-01', value: 1.30 },
    { date: '2024-05-01', value: 1.45 },
    { date: '2024-06-01', value: 1.60 }, // last actual = forecast anchor
  ];

  // P50 central path. Starts at the June anchor so the lines connect cleanly.
  const p50 = [
    { date: '2024-06-01', value: 1.60 },
    { date: '2024-07-01', value: 1.75 },
    { date: '2024-08-01', value: 1.90 },
    { date: '2024-09-01', value: 2.05 },
    { date: '2024-10-01', value: 2.25 },
    { date: '2024-11-01', value: 2.45 },
    { date: '2024-12-01', value: 2.60 },
    { date: '2025-01-01', value: 2.80 },
  ];

  // P10–P90 range — zero width at the anchor, fanning out over the horizon.
  const band = [
    { date: '2024-06-01', lower: 1.60, upper: 1.60 },
    { date: '2024-07-01', lower: 1.60, upper: 1.90 },
    { date: '2024-08-01', lower: 1.65, upper: 2.15 },
    { date: '2024-09-01', lower: 1.70, upper: 2.40 },
    { date: '2024-10-01', lower: 1.80, upper: 2.70 },
    { date: '2024-11-01', lower: 1.85, upper: 3.05 },
    { date: '2024-12-01', lower: 1.90, upper: 3.35 },
    { date: '2025-01-01', lower: 1.95, upper: 3.65 },
  ];

  new RareCharts.Line('#line-chart-demo-forecast', {
    height: 340,
    title: 'Revenue Forecast',
    subtitle: 'H1 2024 actuals with a P50 path and P10–P90 range',
    legend: [
      { label: 'Actuals', color: ACTUAL },
      { label: 'Forecast (P50)', color: FCAST, type: 'dashed' },
      { label: 'P10–P90 range', color: FCAST, type: 'band' },
    ],
    source: 'Source: Acme Corp. internal calculations',

    curve: 'monotone',
    endLabels: false, // series end at different x — labels at the right edge would mislead

    yTickValues: [1, 2, 3],
    yTickFormat: v => (Math.abs(v) < 1e-6 ? '$0' : '$' + d3.format('.1f')(v) + 'M'),
    xTicks: 7,
    xTickFormat: d => d3.timeFormat('%b')(d),

    // Vertical reference at the forecast cut-over.
    annotations: [
      { date: '2024-06-01', label: 'Forecast →', color: FCAST, strokeDash: '4,3' },
    ],
  }).setData([
    { name: 'P10–P90 range', type: 'band', color: FCAST, fillOpacity: 0.16, values: band },
    { name: 'Actuals',        color: ACTUAL, strokeWidth: 2.5, values: actuals },
    { name: 'Forecast (P50)', color: FCAST,  strokeDash: '5,4', values: p50 },
  ]);
})();
