(function() {
  const d3 = RareCharts.d3;

  // Net subscriber change per month — dated bars, so the chart has a time axis
  // that annotations can sit on. Negative months hang below zero.
  const values = [
    310, 280, 345, 390, 420, 365, 240, 215, 330, 410, 455, 520,
    180, -60, -120, 140, 260, 470, 560, 610, 380, 340, 395, 430,
  ];
  const data = values.map((value, i) => {
    const year  = 2024 + Math.floor(i / 12);
    const month = String(i % 12 + 1).padStart(2, '0');
    return { date: `${year}-${month}-01`, value };
  });

  new RareCharts.Bar('#bar-chart-dated-annotations', {
    title:    'Subscriber Growth',
    subtitle: 'Net new subscribers per month, 2024–2025',
    source:   'Source: Illustrative data',
    height:   360,
    barColor: '#00aaff',
    timeframes: ['1Y', 'ALL'],
    defaultTimeframe: 'ALL',
    xTickFormat: d => d3.timeFormat('%b %y')(d),
    yTickFormat: d => d3.format(',')(d),
    annotations: [
      // Point — a line through the February bar
      { date: '2025-02-01', label: 'Price up', color: '#888888' },
      // Range — half a month out on each side, so the June–August bars are
      // shaded whole
      {
        from:        '2025-05-16',
        to:          '2025-08-16',
        label:       'Promo',
        color:       '#00c97a',
        fillOpacity: 0.08,
      },
      // Horizontal line — the monthly target on the value axis
      { value: 500, label: 'Target', color: '#fa8c16', labelPosition: 'left' },
    ],
  }).setData(data);
})();
