(async function () {
  const d3 = RareCharts.d3;

  // BTC profit values are tiny (≈ 0.00014 BTC/day).
  // Scale by $100k to put them on the same axis as USD profit (≈ $14/day).
  // When BTC price equals exactly $100k, bars and line land at the same height.
  // The gap between them IS the price effect: line above bars → price > $100k.
  const BTC_SCALE = 100_000;

  const raw = await RareCharts.fromJson(
    '/assets/charts/data/examples/btc_mining.json',
    {
      date:       row => new Date(row.date),
      value:      row => +row.profit_usd,
      profit_usd: row => +row.profit_usd,
      profit_btc: row => +row.profit_btc,
      price_usd:  row => +row.price_usd,
    }
  );

  const series = [
    {
      name:        'BTC Price',
      axis:        'y1',
      type:        'line',
      color:       '#f7931a',
      strokeWidth: 1.5,
      values: raw.map(r => ({ date: r.date, value: r.price_usd })),
    },
    {
      name:  'BTC Output',
      axis:  'y2',
      type:  'bar',
      color: '#cccccc',
      values: raw.map(r => ({ date: r.date, value: r.profit_btc * BTC_SCALE })),
    },
    {
      name:        'Revenue, USD',
      axis:        'y2',
      type:        'line',
      color:       '#00c97a',
      strokeWidth: 2,
      values: raw.map(r => ({ date: r.date, value: r.profit_usd })),
    },
  ];

  new RareCharts.DualAxes('#mining-hashrate-profit', {
    height:   450,
    title:    'The Mining Profitability Rat Race',
    subtitle: 'Feb—Dec 2025 mining performance',
    source:   'Source: Mining pool daily summary export',

    legend: [
      { label: 'BTC Price', color: '#f7931a' },
      { label: 'BTC Output', color: '#cccccc' },
      { label: 'Revenue, USD', color: '#00c97a' },
    ],

    curve:         'linear',
    crosshair:     true,
    endLabels:     false,
    barOpacity:    0.45,
    barWidthRatio: 0.85,

    timeframes: ['3M', '6M', 'ALL'],
    defaultTimeframe: 'ALL',

    y1Title: 'BTC Price',
    y2Title: 'Revenue',

    y1TickFormat: v => '$' + d3.format(',.0f')(v),
    y2TickFormat: v => '$' + d3.format(',.0f')(v),
    xTickFormat:  d => d3.timeFormat('%b')(d),

    // Force visual range for spread axis
    y1Domain: [75000, 125000],
    y2Domain: [8, 15],

    tooltipFormat: ({ date, points }) => {
      const rows = points.map(p => {
        let display;
        if (p.name === 'BTC Price') {
          display = '$' + d3.format(',.0f')(p.value);
        } else if (p.name === 'Revenue, USD') {
          display = '$' + d3.format(',.2f')(p.value) + '/day';
        } else {
          // BTC Output: un-scale to show actual BTC
          display = '₿\u202f' + d3.format('.8f')(p.value / BTC_SCALE) + '/day';
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
