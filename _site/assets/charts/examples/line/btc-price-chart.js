(async function () {
  const d3 = RareCharts.d3;

  // 2025 — real daily close from the mining pool dataset.
  // 2024 — synthetic daily prices, linearly interpolated between real monthly
  // anchors with deterministic noise. This keeps the line visually consistent
  // (no sparse/dense seam at the year boundary) while preserving the real
  // shape of the post-halving cycle.
  const anchors2024 = [
    { date: '2024-01-01', value:  42_300 },
    { date: '2024-02-01', value:  42_500 },
    { date: '2024-03-01', value:  62_400 },
    { date: '2024-04-01', value:  71_300 },
    { date: '2024-04-19', value:  63_800 }, // halving day
    { date: '2024-05-01', value:  60_000 },
    { date: '2024-06-01', value:  67_500 },
    { date: '2024-07-01', value:  62_800 },
    { date: '2024-08-01', value:  64_600 },
    { date: '2024-09-01', value:  58_900 },
    { date: '2024-10-01', value:  63_300 },
    { date: '2024-11-01', value:  70_200 },
    { date: '2024-12-01', value:  96_400 },
    { date: '2025-01-01', value:  94_000 },
  ];

  const rand = (() => { let s = 1234567; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const synth = [];
  for (let i = 0; i < anchors2024.length - 1; i++) {
    const a = anchors2024[i], b = anchors2024[i + 1];
    const da = new Date(a.date), db = new Date(b.date);
    const days = Math.max(1, Math.round((db - da) / 86400000));
    const vol = Math.max(Math.abs(b.value - a.value) * 0.05, a.value * 0.012);
    for (let k = 0; k < days; k++) {
      const t = k / days;
      const trend = a.value + (b.value - a.value) * t;
      const noise = (rand() - 0.5) * 2 * vol;
      const d = new Date(da);
      d.setDate(d.getDate() + k);
      synth.push({ date: d, value: Math.round(trend + noise) });
    }
  }

  const recent = await RareCharts.fromJson(
    '/assets/charts/data/examples/btc_mining.json',
    {
      date:  row => new Date(row.date),
      value: row => +row.price_usd,
    }
  );

  const values = synth.concat(recent).sort((a, b) => a.date - b.date);

  new RareCharts.Line('#btc-price-chart', {
    height:   360,
    margin:   { right: 72 },
    title:    'BTC / USD',
    subtitle: 'Daily close, 2024 — 2025',
    source:   'Source: 2025 — mining pool daily; 2024 — monthly close, daily interpolation',

    seriesName: 'BTC',
    lineColor:  '#f7931a',

    endLabels: true,
    crosshair: true,
    curve:     'linear',

    xTicks:      d3.timeMonth.every(6),
    yTickValues: [50_000, 75_000, 100_000, 125_000],
    yTickFormat: v => '$' + d3.format(',.0f')(v / 1000) + 'k',
    xTickFormat: d => d3.timeFormat('%b %Y')(d),

    annotations: [
      {
        date:  '2024-04-19',
        label: '4th Halving',
        color: '#888888',
      },
      {
        from:        '2024-11-05',
        to:          '2025-01-20',
        label:       'Post-election rally',
        color:       '#00c97a',
        fillOpacity: 0.06,
      },
      {
        value:         100_000,
        label:         '$100k',
        color:         '#fa8c16',
        labelPosition: 'left',
      },
    ],

    tooltipFormat: ({ date, points }) => {
      const p = points[0];
      return `
        <div style="color:#888;margin-bottom:4px">${d3.timeFormat('%b %d, %Y')(date)}</div>
        <div style="color:${p.color}">BTC: $${d3.format(',.0f')(p.value)}</div>
      `;
    },
  }).setData(values);
})();
