(function () {
  const d3 = RareCharts.d3;

  // Shared date range: Feb 2 – Mar 3
  const days = 20;
  const start = new Date('2025-02-02');
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  function walk(startVal, steps, volatility = 0.012) {
    const out = [startVal];
    for (let i = 1; i < steps; i++) {
      const prev = out[i - 1];
      out.push(+(prev * (1 + (Math.random() - 0.48) * volatility)).toFixed(2));
    }
    return out;
  }

  // Spike up at the end (day 18–19) — "selloff takes shape"
  function spikeUp(arr, strength = 1.06) {
    const copy = [...arr];
    copy[days - 2] = +(copy[days - 3] * strength).toFixed(2);
    copy[days - 1] = +(copy[days - 2] * 1.02).toFixed(2);
    return copy;
  }

  function spikeDown(arr, strength = 0.94) {
    const copy = [...arr];
    copy[days - 2] = +(copy[days - 3] * strength).toFixed(2);
    copy[days - 1] = +(copy[days - 2] * 0.98).toFixed(2);
    return copy;
  }

  const brentValues   = spikeUp(walk(67,  days, 0.014), 1.09);
  const dxyValues     = spikeUp(walk(97.4, days, 0.004), 1.018);
  const ftseValues    = spikeDown(walk(460, days, 0.008), 0.96);
  const goldValues    = spikeDown(walk(4800, days, 0.012), 0.958);

  const toPoints = arr => arr.map((v, i) => ({ date: dates[i], value: v }));

  new RareCharts.MultiChart('#multi-chart-market-overview', {
    title:    'A Selloff Takes Shape',
    subtitle: 'Selling intensified on the second day of trading',
    source:   'Source: Synthetic Demo Data',
    columns:  2,
    chartHeight: 200,
    charts: [
      {
        type:  'Line',
        title: 'Brent Crude',
        data:  toPoints(brentValues),
        options: {
          yPrefix: '$',
          lineColor: '#00aaff',
          curve: 'monotone',
          endLabels: true,
          crosshair: true,
          xTicks: 3,
          xTickFormat: d => d3.timeFormat('%b %d')(d),
        },
      },
      {
        type:  'Line',
        title: 'DXY Dollar Index',
        data:  toPoints(dxyValues),
        options: {
          lineColor: '#00aaff',
          curve: 'monotone',
          endLabels: true,
          crosshair: true,
          xTicks: 3,
          xTickFormat: d => d3.timeFormat('%b %d')(d),
          yTickFormat: v => d3.format('.1f')(v),
        },
      },
      {
        type:  'Line',
        title: 'FTSE All-World Excluding US',
        data:  toPoints(ftseValues),
        options: {
          lineColor: '#00aaff',
          curve: 'monotone',
          endLabels: true,
          crosshair: true,
          xTicks: 3,
          xTickFormat: d => d3.timeFormat('%b %d')(d),
          yTickFormat: v => d3.format('.0f')(v),
        },
      },
      {
        type:  'Bar',
        title: 'Monthly Volumes',
        data: [
          { label: 'Jan', value: 84000  },
          { label: 'Feb', value: 91000  },
          { label: 'Mar', value: 78000  },
          { label: 'Apr', value: 105000 },
          { label: 'May', value: 112000 },
        ],
        options: {
          barColor: '#00aaff',
          yTickFormat: d => '$' + d3.format('.2s')(d),
        },
      },
    ],
  });
})();
