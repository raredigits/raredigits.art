(function () {
  const d3 = RareCharts.d3;

  // Fixed demo dates (weekly-ish)
  const dates = [
    '1998-06-01','1998-06-08','1998-06-15','1998-06-22','1998-06-29',
    '1998-07-06','1998-07-13','1998-07-20','1998-07-27',
    '1998-08-03','1998-08-10','1998-08-17','1998-08-24','1998-08-31',
    '1998-09-07','1998-09-14','1998-09-21','1998-09-28','1998-10-05'
  ].map(d => new Date(d));

  // “Price index” so both series share a scale (start at 100)
  // A and B diverge, then converge.
  const A = [100.0, 100.4, 100.9, 101.3, 101.0, 100.6, 100.2,  99.8,  99.6,  99.7,  99.9, 100.2, 100.6, 100.9, 101.1, 101.2, 101.25, 101.3, 101.35];
  const B = [100.0,  99.7,  99.2,  98.6,  98.4,  98.7,  99.1,  99.5,  99.8, 100.0, 100.1, 100.25,100.5, 100.75,100.95,101.05,101.15,101.22,101.28];

  const seriesIndexed = [
    {
      name: 'Instrument A (rich)',
      color: '#ff3b5c',
      values: dates.map((dt, i) => ({ date: dt, value: A[i] })),
    },
    {
      name: 'Instrument B (cheap)',
      color: '#00aaff',
      values: dates.map((dt, i) => ({ date: dt, value: B[i] })),
    },
  ];

  // Spread (A - B) in “index points” (can be read as relative mispricing)
  const spread = dates.map((dt, i) => ({ date: dt, value: +(A[i] - B[i]).toFixed(2) }));

  // Chart 1: convergence
  new RareCharts.Line('#line-chart-ltcm-convergence', {
    height: 320,
    title: 'LTCM-STYLE CONVERGENCE (DEMO)',
    subtitle: 'Two similar instruments diverge, then converge over time',
    source: 'Source: synthetic demo data',

    legend: [
      { label: 'Instrument A (rich)', color: '#ff3b5c' },
      { label: 'Instrument B (cheap)', color: '#00aaff' },
    ],

    endLabels: true,
    yLabelsOnly: true,
    crosshair: true,
    curve: 'linear',

    // These are plain numbers (index), not percent
    yFormat: 'number',
    yTickFormat: v => d3.format(',.1f')(v),

    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    tooltipFormat: ({ date, points }) => `
      <div style="color:#555">${d3.timeFormat('%b %d, %Y')(date)}</div>
      ${points.map(p => `
        <div style="color:${p.color}">
          ${p.name}: ${d3.format(',.2f')(p.value)}
        </div>
      `).join('')}
    `,
  }).setData(seriesIndexed);

  // Chart 2: spread to zero (the “trade thesis”)
  new RareCharts.Line('#line-chart-ltcm-spread', {
    height: 200,
    title: 'SPREAD (A − B)',
    subtitle: 'The bet: spread mean-reverts toward 0',
    source: 'Source: synthetic demo data',

    legend: [
      { label: 'Spread', color: '#000000' },
    ],

    endLabels: true,
    yLabelsOnly: true,
    crosshair: true,
    curve: 'linear',

    // Make zero obvious
    // (If you added rc-zero-line in Line.js, it will highlight y=0 automatically)
    yFormat: 'number',
    yTickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('+.2f')(v);
    },

    xTickFormat: d => d3.timeFormat('%m/%d')(d),

    tooltipFormat: ({ date, points }) => `
      <div style="color:#555">${d3.timeFormat('%b %d, %Y')(date)}</div>
      <div style="color:${points[0].color}">Spread: ${d3.format('+.2f')(points[0].value)}</div>
    `,
  }).setData([
    { name: 'Spread', color: '#000000', values: spread }
  ]);
})();