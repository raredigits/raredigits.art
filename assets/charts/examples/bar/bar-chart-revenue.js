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
      { label: 'Revenue', color: '#1677ff', type: 'bar' },
    ],
    source:   'Source: Internal accounting',
    height:   420,
    barColor: '#1677ff',
    yTickFormat: d => '$' + Number(d).toLocaleString('en-US'),
    // The tooltip's own rows (/charts/settings/#custom-tooltip): the month
    // on top, small and muted, then the bar's dot, its name and its value.
    tooltipFormat: (d, { color }) => `
      <div class="rc-tooltip-header rc-tooltip-muted">${d.label} 2024</div>
      <div class="rc-tooltip-row">
        <span class="rc-tooltip-swatch rc-tooltip-swatch--dot" style="--rc-swatch-color:${color}"></span>
        <span class="rc-tooltip-label">Revenue</span>
        <span class="rc-tooltip-value rc-num">$${(d.value / 1000).toFixed(0)}K</span>
      </div>
    `,
  }).setData(data);
})();
