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
    margin: { top: 0, right: 0, bottom: 8 },
    // A sidenote is narrow: the name rides with the value at the bar end
    // (inside the bar when it runs long), not in a column of its own.
    showYAxis: false,
    showValues: true,
    valueFormat: d => `${d.label} ${d.value}`,
    xTickValues: [0, 40, 80],
    xTickFormat: d => d === 0 ? '0' : d,
    // The default row with a unit: the bar's dot, its label, its value.
    tooltipFormat: (d, { color }) => `
      <div class="rc-tooltip-row">
        <span class="rc-tooltip-swatch rc-tooltip-swatch--dot" style="--rc-swatch-color:${color}"></span>
        <span class="rc-tooltip-label">${d.label}</span>
        <span class="rc-tooltip-value rc-num">${d.value} sec</span>
      </div>
    `,
  }).setData(data);
})();