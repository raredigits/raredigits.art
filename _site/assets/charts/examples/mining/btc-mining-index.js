(async function () {
  const d3 = RareCharts.d3;

  const raw = await RareCharts.fromJson(
    '/assets/charts/data/btc_mining.json',
    {
      date:       row => new Date(row.date),
      value:      row => +row.profit_usd,
      profit_usd: row => +row.profit_usd,
      price_usd:  row => +row.price_usd,
    }
  );

  // Keep only fully active mining days (> $5/day).
  // This excludes the partial-shutdown tail (Dec 22+ when hashrate was cut to ~25%).
  const active = raw.filter(r => r.profit_usd > 5.0);

  // 7-day rolling average on USD profit — smooths out daily settlement noise
  const MA_WINDOW = 7;
  const profitMA = active.map((_, i) => {
    const slice = active.slice(Math.max(0, i - MA_WINDOW + 1), i + 1);
    return slice.reduce((sum, r) => sum + r.profit_usd, 0) / slice.length;
  });

  // Normalize both to 100 at the first active day.
  // After that: a value of 120 means +20%, a value of 80 means −20%.
  // The gap between the two lines is the difficulty adjustment eating into returns.
  const BASE_PRICE  = active[0].price_usd;
  const BASE_PROFIT = profitMA[0];

  const series = [
    {
      name:        'BTC Price',
      axis:        'y2',
      type:        'line',
      color:       '#f7931a',
      strokeWidth: 1.5,
      values: active.map(r => ({
        date:  r.date,
        value: (r.price_usd / BASE_PRICE) * 100,
      })),
    },
    {
      name:        'USD Earnings (7d avg)',
      axis:        'y2',
      type:        'line',
      color:       '#00c97a',
      strokeWidth: 2,
      values: active.map((r, i) => ({
        date:  r.date,
        value: (profitMA[i] / BASE_PROFIT) * 100,
      })),
    },
  ];

  new RareCharts.DualAxes('#mining-index', {
    height:   300,
    title:    'Price Goes Up. Earnings Don\'t.',
    subtitle: 'Feb–Dec 2025 · both indexed to 100 at start · earnings = 7-day rolling average · active days only (> $5/day)',
    source:   'Source: Mining pool daily summary export',

    legend: [
      { label: 'BTC Price',               color: '#f7931a' },
      { label: 'USD Earnings (7d avg)',    color: '#00c97a' },
    ],

    curve:     'monotoneX',
    crosshair: true,
    endLabels: false,

    y2Title: 'Index (start = 100)',
    y2Domain: [40, 145],

    y2TickFormat: v => d3.format('.0f')(v),
    xTickFormat:  d => d3.timeFormat('%b')(d),

    tooltipFormat: ({ date, points }) => {
      const rows = points.map(p => {
        const delta = p.value - 100;
        const sign  = delta >= 0 ? '+' : '';
        return `<div style="color:${p.color}">${p.name}: ${d3.format('.1f')(p.value)} (${sign}${d3.format('.1f')(delta)}%)</div>`;
      });
      return `
        <div style="color:#888;margin-bottom:4px">${d3.timeFormat('%b %d, %Y')(date)}</div>
        ${rows.join('')}
      `;
    },
  }).setData(series);
})();
