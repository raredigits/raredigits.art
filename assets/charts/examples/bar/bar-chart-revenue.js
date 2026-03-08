(function() {
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
    { label: 'Dec', value: 156000 },
  ];

  new RareCharts.Bar('#bar-chart-revenue', {
    title:    'Revenue Performance',
    subtitle: 'Total monthly revenue gained in 2024, USD',
    legend: [
      { label: 'Revenue', color: '#00aaff', type: 'bar' },
    ],
    source:   'Source: Internal accounting',
    height:   420,
    barColor: '#00aaff',
    yTickFormat: d => '$' + Number(d).toLocaleString('en-US'),
    tooltipFormat: d => `
      <div style="color:#555">${d.label} 2025</div>
      <div style="color:#00aaff">$${(d.value / 1000).toFixed(0)}K</div>
    `,
  }).setData(data);
})();
