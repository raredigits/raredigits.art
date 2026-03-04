(async function () {
  const d3 = RareCharts.d3;

  // BTC profit values are tiny (≈ 0.00014 BTC/day). Multiply by 100,000 to bring
  // them onto the same numeric scale as USD profit (≈ $14/day when BTC ≈ $100k).
  // The two lines will visually track each other — divergence reveals price moves.
  const BTC_SCALE = 100_000;

  // Load data via fromJson. The file was converted from the provider's XLS export.
  // Fields used: date, hashrate_th, profit_btc, profit_usd.
  const raw = await RareCharts.fromJson(
    '/assets/charts/data/btc_mining.json',
    {
      date:         row => new Date(row.date),
      value:        row => +row.hashrate_th,   // primary value — needed by the adapter
      hashrate_th:  row => +row.hashrate_th,
      profit_usd:   row => +row.profit_usd,
      profit_btc:   row => +row.profit_btc,
    }
  );

  // Build three series from the same source array.
  const series = [
    {
      name:  'Hashrate',
      axis:  'y2',
      type:  'bar',
      color: '#cccccc',
      values: raw.map(r => ({ date: r.date, value: r.hashrate_th })),
    },
    {
      name:  'USD Profit',
      axis:  'y1',
      type:  'line',
      color: '#00c97a',
      strokeWidth: 2,
      values: raw.map(r => ({ date: r.date, value: r.profit_usd })),
    },
    {
      name:       'BTC Profit',
      axis:       'y1',
      type:       'line',
      color:      '#f7931a',
      strokeWidth: 1.5,
      strokeDash: '5,3',
      values: raw.map(r => ({ date: r.date, value: r.profit_btc * BTC_SCALE })),
    },
  ];

  new RareCharts.DualAxes('#mining-hashrate-profit', {
    height: 380,
    title:    'BTC Mining: Hashrate & Daily Profit',
    subtitle: 'Feb – Dec 2025 · bars = TH/s · lines = USD profit (solid) and BTC profit ×100k (dashed)',
    source:   'Source: Mining pool daily summary export',

    legend: [
      { label: 'Hashrate (TH/s)',         color: '#cccccc' },
      { label: 'USD Profit ($/day)',       color: '#00c97a' },
      { label: 'BTC Profit (×100k/day)',   color: '#f7931a' },
    ],

    curve:       'linear',
    crosshair:   true,
    endLabels:   false,
    barOpacity:  0.5,
    barWidthRatio: 0.85,

    y2Title: 'TH/s',
    y1Title: '$/day',

    y2Domain: [0, 280],
    y1Domain: [0, 16],

    y2TickFormat: v => d3.format('.0f')(v),
    y1TickFormat: v => '$' + d3.format(',.1f')(v),
    xTickFormat:  d => d3.timeFormat('%b')(d),

    tooltipFormat: ({ date, points }) => {
      const rows = points.map(p => {
        let display;
        if (p.name === 'Hashrate') {
          display = d3.format(',.3f')(p.value) + ' TH/s';
        } else if (p.name === 'USD Profit') {
          display = '$' + d3.format(',.2f')(p.value);
        } else {
          // BTC Profit: divide back out of the ×100k scaling
          display = '₿\u202f' + d3.format('.8f')(p.value / BTC_SCALE);
        }
        return `<div style="color:${p.color}">${p.name}: ${display}</div>`;
      });
      return `
        <div style="color:#888;margin-bottom:4px">${d3.timeFormat('%b %d, %Y')(date)}</div>
        ${rows.join('')}
      `;
    },
  }).setData(series);
})();
