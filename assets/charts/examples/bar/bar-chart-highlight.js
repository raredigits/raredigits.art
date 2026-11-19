(function() {
  // Fixed-width bars (barWidth), one bar in its own colour (a row's color) and
  // the values over the bars (showValues), in thousands like the axis; a
  // negative month hangs below zero with its label under it.
  const money = v => (v < 0 ? '−$' : '$') + Math.round(Math.abs(v) / 1000) + (v ? 'K' : '');
  const data = [
    { label: 'Jan', value: 84000  },
    { label: 'Feb', value: 91000  },
    { label: 'Mar', value: 78000  },
    { label: 'Apr', value: 105000 },
    { label: 'May', value: 112000 },
    { label: 'Jun', value: -42000 },
    { label: 'Jul', value: 87000  },
    { label: 'Aug', value: 119000 },
    { label: 'Sep', value: 134000 },
    { label: 'Oct', value: 128000 },
    { label: 'Nov', value: 141000 },
    { label: 'Dec', value: 156000, color: '#1677ff' },
  ];

  new RareCharts.Bar('#bar-chart-highlight', {
    title:    'December sets the record',
    subtitle: 'Monthly net revenue in 2024, USD',
    legend: [
      { label: 'Record month', color: '#1677ff', type: 'bar' },
      { label: 'Other months', color: '#cccccc', type: 'bar' },
    ],
    source:   'Source: Internal accounting',
    height:   400,
    barWidth: 18,
    barColor: '#cccccc',
    yTickFormat: d => money(d),
    showValues:  true,
    valueFormat: d => money(d.value),
  }).setData(data);
})();
