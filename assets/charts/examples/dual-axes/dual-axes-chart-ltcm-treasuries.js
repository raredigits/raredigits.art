(function () {
  const d3 = RareCharts.d3;

  const dates = [
    '1998-06-01','1998-06-08','1998-06-15','1998-06-22','1998-06-29',
    '1998-07-06','1998-07-13','1998-07-20','1998-07-27',
    '1998-08-03','1998-08-10','1998-08-17','1998-08-24','1998-08-31',
    '1998-09-07','1998-09-14','1998-09-21','1998-09-28','1998-10-05'
  ].map(d => new Date(d));

  // Fixed demo “price index” (not returns)
  const onTheRun  = [100.0,100.4,100.9,101.3,101.0,100.6,100.2, 99.8, 99.6, 99.7, 99.9,100.2,100.6,100.9,101.1,101.2,101.25,101.30,101.35];
  const offTheRun = [100.0, 99.7, 99.2, 98.6, 98.4, 98.7, 99.1, 99.5, 99.8,100.0,100.1,100.25,100.50,100.75,100.95,101.05,101.15,101.22,101.28];

  const spread = onTheRun.map((v, i) => +(v - offTheRun[i]).toFixed(2));

  const series = [
    {
      name: 'UST 10Y (on-the-run)',
      axis: 'y1',
      type: 'line',
      color: '#00aaff',
      values: dates.map((dt, i) => ({ date: dt, value: onTheRun[i] })),
    },
    {
      name: 'UST 10Y (off-the-run)',
      axis: 'y1',
      type: 'line',
      color: '#ff3b5c',
      values: dates.map((dt, i) => ({ date: dt, value: offTheRun[i] })),
    },
    {
      name: 'Spread',
      axis: 'y2',
      type: 'line',
      area: true,
      areaBaseline: 0,
      color: '#000000',
      values: dates.map((dt, i) => ({ date: dt, value: spread[i] })),
    },
  ];

  new RareCharts.DualAxes('#dual-chart-ltcm-treasuries', {
    height: 380,
    title: 'Treasury Bills Convergence',
    subtitle: 'On-the-run vs off-the-run: prices converge, spread mean-reverts',
    source: 'Source: Synthetic Demo Data',

    legend: [
      { label: 'UST 10Y (on-the-run)', color: '#00aaff' },
      { label: 'UST 10Y (off-the-run)', color: '#ff3b5c' },
      { label: 'Spread', color: '#000000' },
    ],

    curve: 'linear',
    crosshair: true,
    endLabels: false,

    y1Title: 'Price',
    y2Title: 'Spread',

    // Force visual range for spread axis
    y1Domain: [97, 103],
    y2Domain: [-1, 3],

    // Price axis (right)
    y1TickFormat: v => d3.format(',.2f')(v),

    // Spread axis (left) formatted as basis points with clean zero
    y2TickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('+.2f')(v);
    },

    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    tooltipFormat: ({ date, points }) => `
      <div style="color:#555">${d3.timeFormat('%b %d, %Y')(date)}</div>
      ${points.map(p => `
        <div style="color:${p.color}">
          ${p.name}: ${p.fmt}
        </div>
      `).join('')}
    `,
  }).setData(series);
})();