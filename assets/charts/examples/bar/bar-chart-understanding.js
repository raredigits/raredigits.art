(function() {
  const data = [
    { label: 'Text', value: 78 },
    { label: 'Table', value: 46  },
    { label: 'Chart', value: 19 },
  ];

  new RareCharts.Bar('#bar-chart-understanding', {
    title: 'Understanding Data',
    subtitle: 'Speed, seconds',
    source: 'Source: Rare Digits',
    orientation: 'horizontal',
    theme: { fontSize: '14px' },
    margin: { top: 0, right: 0, bottom: 8 },
    // A sidenote is narrow: the name rides with the value at the bar end
    // (inside the bar when it runs long), not in a column of its own.
    showYAxis: false,
    showValues: true,
    valueFormat: d => `${d.label} ${d.value}`,
    xTickValues: [0, 40, 80],
    xTickFormat: d => d === 0 ? '0' : d,
    tooltipFormat: d => `
      <div>${d.label}</div>
      <div>${d.value} sec</div>
    `,
  }).setData(data);
})();