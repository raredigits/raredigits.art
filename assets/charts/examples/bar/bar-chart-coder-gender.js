(function() {
  const data = [
    { label: 'Men',                  value: 92.1 },
    { label: 'Women',                value: 5.7  },
    { label: 'Prefer not to disclose', value: 1.7 },
    { label: 'Other',                value: 0.5  },
  ];

  new RareCharts.Bar('#bar-chart-coder-gender', {
    title: 'Coder gender',
    subtitle: 'Gender distribution among software developers',
    height: 300,
    source: 'Source: Stack Overflow’s 2015 developer survey',
    orientation: 'horizontal',
    labelMaxLength: 8,
    showValues: true,
    valueFormat: d => `${d.value}%`,
    tooltipFormat: d => `
      <div>${d.label}</div>
      <div>${d.value}%</div>
    `,
  }).setData(data);
})();