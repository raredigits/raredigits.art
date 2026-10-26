(function() {
  // Fixed-width bars (barWidth) and one bar in its own colour (a row's color).
  const data = [
    { label: 'Jan', value: 84000  },
    { label: 'Feb', value: 91000  },
    { label: 'Mar', value: 78000  },
    { label: 'Apr', value: 105000 },
    { label: 'May', value: 112000 },
    { label: 'Jun', value: 98000  },
    { label: 'Jul', value: 87000  },
    { label: 'Aug', value: 119000 },
    { label: 'Sep', value: 134000 },
    { label: 'Oct', value: 128000 },
    { label: 'Nov', value: 141000 },
    { label: 'Dec', value: 156000, color: '#00aaff' },
  ];

  new RareCharts.Bar('#bar-chart-highlight', {
    title:    'December sets the record',
    subtitle: 'Monthly revenue in 2024, USD',
    legend: [
      { label: 'Record month', color: '#00aaff', type: 'bar' },
      { label: 'Other months', color: '#cccccc', type: 'bar' },
    ],
    source:   'Source: Internal accounting',
    height:   320,
    barWidth: 18,
    barColor: '#cccccc',
    yTickFormat: d => (d ? '$' + d / 1000 + 'K' : '$0'),
  }).setData(data);
})();
