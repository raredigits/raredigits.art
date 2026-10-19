(function () {
  // A long-horizon index: ~30% a year for three decades, with drawdowns. On a
  // linear axis the early years flatten into the floor; on a log axis equal
  // percentage moves get equal height.
  const monthly = [];
  let value = 10;
  for (let i = 0; i <= 31 * 12; i++) {
    const d = new Date(Date.UTC(1995, i, 1));
    monthly.push({ date: d, value: +value.toFixed(2) });
    value *= 1 + 0.022 + 0.07 * Math.sin(i / 7) * Math.cos(i / 19);
  }
  const lastYear = monthly.slice(-13);

  const controls = document.createElement('div');
  controls.innerHTML =
    '<label><input type="radio" name="log-demo-period" value="ALL" checked> ALL · log</label>' +
    '<label><input type="radio" name="log-demo-period" value="1Y"> 1Y · linear</label>';

  const chart = new RareCharts.Line('#line-chart-log-demo', {
    height: 320,
    yScale: 'log',
    yFormat: 'number',
    seriesName: 'Index',
    xTickFormat: d => d.getUTCFullYear(),
    controls,
  }).setData(monthly);

  controls.addEventListener('change', (e) => {
    const all = e.target.value === 'ALL';
    chart.options.xTickFormat = all ? (d => d.getUTCFullYear()) : RareCharts.d3.utcFormat('%b %Y');
    chart.setYScale(all ? 'log' : 'linear').setData(all ? monthly : lastYear);
  });
})();
