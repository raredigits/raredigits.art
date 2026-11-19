(async function () {
  const d3 = RareCharts.d3;

  // Daily electricity cost by month ($/day, actual billed consumption)
  const ELEC = {
     2: 10.936,  3: 10.877,  4: 12.180,  5: 12.577,
     6: 12.680,  7: 12.419,  8: 12.577,  9: 12.077,
    10: 12.577, 11: 12.270, 12: 12.423,
  };

  const raw = await RareCharts.fromJson(
    '/assets/charts/data/examples/btc_mining.json',
    {
      date:       row => new Date(row.date),
      profit_usd: row => +row.profit_usd,
    }
  );

  // Enrich: attach electricity cost and compute daily net profit
  const data = raw.map(r => {
    const elec = ELEC[r.date.getMonth() + 1] ?? 0;
    return { date: r.date, revenue: r.profit_usd, elec, net: r.profit_usd - elec };
  });

  const series = [
    // Profitable days — green bars above zero
    {
      name:  'Gain',
      axis:  'y1',
      type:  'bar',
      color: '#00c97a',
      values: data.map(r => ({ date: r.date, value: Math.max(0, r.net) })),
    },
    // Loss days — red bars below zero
    {
      name:  'Loss',
      axis:  'y1',
      type:  'bar',
      color: '#ff4455',
      values: data.map(r => ({ date: r.date, value: Math.min(0, r.net) })),
    },
    // Mining revenue line
    {
      name:        'Revenue',
      axis:        'y1',
      type:        'line',
      color:       '#1677ff',
      strokeWidth: 1.5,
      values: data.map(r => ({ date: r.date, value: r.revenue })),
    },
    // Electricity cost — step curve, changes once per month
    {
      name:        'Electricity',
      axis:        'y1',
      type:        'line',
      area:         true,
      color:       '#ff00f5',
      curve:       'stepAfter',
      strokeWidth: 3,
      values: data.map(r => ({ date: r.date, value: r.elec })),
    },
  ];

  new RareCharts.DualAxes('#mining-net-profit', {
    // new Date('2025-02-01') is UTC midnight: name the days in UTC (T-10).
    timeZone: 'UTC',
    height:   450,
    title:    'Mining vs the Electric Bills',
    subtitle: 'Compounding revenue with electricity costs to find net profit/loss per day',
    source:   'Source: Mining pool summary export, Electricity bills',

    // The label differs from the series name: `series` maps the item to it.
    legend: [
      { label: 'Electricity Cost', series: 'Electricity', color: '#ff00f5' },
      { label: 'Revenue',     color: '#1677ff' },
      { label: 'Gain',        color: '#00c97a', type: 'bar' },
      { label: 'Loss',        color: '#ff4455', type: 'bar' },
    ],

    margin:        { left: 0 },

    curve:         'linear',
    crosshair:     true,
    endLabels:     false,
    barOpacity:    0.65,
    barWidthRatio: 0.85,

    y1Title: '$/day',

    // Single axis: all series on y1. y2 mirrors y1 domain so grid lines align;
    // labels suppressed with empty formatter.
    y1Domain: [-5, 16],
    y2Domain: [-5, 16],
    y2TickFormat: () => '',

    y1TickFormat: v => '$' + d3.format(',.0f')(v),

    xTickFormat: d => d3.timeFormat('%b')(d),

    // The tooltip's own rows (/charts/settings/#custom-tooltip): revenue and
    // electricity, then a row the chart does not draw — the day's net, with
    // the dot of the Gain or Loss bar.
    tooltipFormat: ({ date, points }) => {
      const get   = name => points.find(p => p.name === name)?.value ?? 0;
      const color = name => series.find(s => s.name === name).color;
      const usd   = v => '$' + d3.format(',.2f')(v) + '/day';
      const row   = (mark, name, value) => `
        <div class="rc-tooltip-row">
          <span class="rc-tooltip-swatch${mark}" style="--rc-swatch-color:${color(name)}"></span>
          <span class="rc-tooltip-label">${name === 'Gain' || name === 'Loss' ? 'Net' : name}</span>
          <span class="rc-tooltip-value rc-num">${value}</span>
        </div>`;

      const revenue = get('Revenue');
      const elec    = get('Electricity');
      const net     = revenue - elec;

      return `<div class="rc-tooltip-header rc-tooltip-muted">${d3.timeFormat('%b %d, %Y')(date)}</div>`
        + row('', 'Revenue', usd(revenue))
        + row('', 'Electricity', usd(elec))
        + row(' rc-tooltip-swatch--dot', net >= 0 ? 'Gain' : 'Loss', (net >= 0 ? '+' : '-') + usd(Math.abs(net)));
    },
  }).setData(series);

})();
