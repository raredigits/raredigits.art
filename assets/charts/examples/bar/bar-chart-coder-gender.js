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
    // The default row with a unit: the bar's dot, its label, its value.
    tooltipFormat: (d, { color }) => `
      <div class="rc-tooltip-row">
        <span class="rc-tooltip-swatch rc-tooltip-swatch--dot" style="--rc-swatch-color:${color}"></span>
        <span class="rc-tooltip-label">${d.label}</span>
        <span class="rc-tooltip-value rc-num">${d.value}%</span>
      </div>
    `,
  }).setData(data);
})();