(async function () {
  const d3 = RareCharts.d3;

  const raw = await RareCharts.fromJson(
    '/assets/charts/data/examples/btc_mining.json',
    {
      date:       row => new Date(row.date),
      profit_usd: row => +row.profit_usd,
      price_usd:  row => +row.price_usd,
    }
  );

  // Keep only fully active mining days (> $5/day).
  // This excludes the partial-shutdown tail (Dec 22+ when hashrate was cut to ~25%).
  const active = raw.filter(r => r.profit_usd > 5.0);

  // 7-day rolling average on USD profit — smooths daily settlement noise
  const MA_WINDOW = 7;

  const profitMA = active.map((_, i) => {
    const slice = active.slice(Math.max(0, i - MA_WINDOW + 1), i + 1);
    return slice.reduce((sum, r) => sum + r.profit_usd, 0) / slice.length;
  });

  // Normalize both series to 100 at the start
  const BASE_PRICE  = active[0].price_usd;
  const BASE_PROFIT = profitMA[0];

  const priceIndex = active.map(r =>
    (r.price_usd / BASE_PRICE) * 100
  );

  const profitIndex = active.map((r, i) =>
    (profitMA[i] / BASE_PROFIT) * 100
  );

  // Divergence: how much price outperforms miner earnings
  const divergence = active.map((r, i) => ({
    date:  r.date,
    value: priceIndex[i] - profitIndex[i],
  }));

  const series = [
    {
      name:        'BTC Price',
      axis:        'y2',
      type:        'line',
      color:       '#f7931a',
      strokeWidth: 1.5,
      values: active.map((r, i) => ({
        date:  r.date,
        value: priceIndex[i],
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
        value: profitIndex[i],
      })),
    },
    {
      name:  'Divergence',
      axis:  'y1',
      type:  'bar',
      color: '#cccccc',
      values: divergence,
    },
  ];

  new RareCharts.DualAxes('#mining-index', {
    // new Date('2025-02-01') is UTC midnight: name the days in UTC (T-10).
    timeZone: 'UTC',
    height:   500,
    title:    'Price Goes Up. Earnings Lag.',
    subtitle: 'Feb–Dec 2025 mining revenue vs price index',
    source:   'Source: Mining pool daily summary export',

    legend: [
      { label: 'BTC Price',            color: '#f7931a' },
      { label: 'USD Earnings (7d avg)',color: '#00c97a' },
      { label: 'Divergence',           color: '#cccccc' },
    ],

    curve:     'monotone',
    crosshair: true,
    endLabels: false,

    y1Title: 'Gap',   // the Divergence series: 'DIVERGENCE' is wider than its axis gutter
    y1TickFormat: v => {
      if (Math.abs(v) < 1e-6) return '0';
      return d3.format('+.0f')(v);
    },

    y2Title: 'Index',
    y2Domain: [40, 145],
    y2TickFormat: v => d3.format('.0f')(v),

    xTickFormat: d => d3.timeFormat('%b')(d),

    // The tooltip's own rows (/charts/settings/#custom-tooltip): every value
    // to one decimal, where the axes round to whole numbers.
    tooltipFormat: ({ date, points }) => {
      return `<div class="rc-tooltip-header rc-tooltip-muted">${d3.timeFormat('%b %d, %Y')(date)}</div>` +
        points.map(p => `
          <div class="rc-tooltip-row">
            <span class="rc-tooltip-swatch${p.type === 'bar' ? ' rc-tooltip-swatch--dot' : ''}" style="--rc-swatch-color:${p.color}"></span>
            <span class="rc-tooltip-label">${p.name}</span>
            <span class="rc-tooltip-value rc-num">${d3.format('.1f')(p.value)}</span>
          </div>`).join('');
    },

  }).setData(series);

})();