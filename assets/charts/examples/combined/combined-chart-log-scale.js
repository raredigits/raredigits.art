(function () {
  // A synthetic equity index over 45 years (Y1, log by default) and its
  // yearly change in percent (Y2, bars). The index grows from 100 to over 20k, so a
  // linear Y1 flattens everything before the last ten years; the change can
  // be negative, so Y2 stays linear. The Lin/Log button drives Y1 only.
  const index  = [];
  const change = [];
  let level = 100;
  for (let year = 1981; year <= 2025; year++) {
    const r = 0.15 + 0.16 * Math.sin(year * 1.7) * Math.cos(year / 5)
            - (year === 2001 || year === 2002 ? 0.25 : 0)
            - (year === 2008 ? 0.45 : 0);
    level *= 1 + r;
    const date = `${year}-12-31`;
    index.push({ date, value: +level.toFixed(1) });
    change.push({ date, value: +(r * 100).toFixed(1) });
  }

  new RareCharts.DualAxes('#combined-chart-log-scale', {
    height: 340,
    title: 'Index and yearly change',
    subtitle: 'Perception differences example',
    y1Scale: 'log',
    scaleToggle: true,
    y1Title: 'INDEX',
    y2Title: '% Y/Y',
    xTickFormat: d => d.getFullYear(),
    y1TickFormat: v => v.toLocaleString('en-US'),
    y2TickFormat: v => (v > 0 ? '+' : '') + v + '%',
    barOpacity: 0.3,
    endLabels: false,
  }).setData([
    { name: 'Index',         axis: 'y1', type: 'line', values: index },
    { name: 'Yearly change', axis: 'y2', type: 'bar',  values: change },
  ]);
})();
