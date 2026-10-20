(function () {
  // One index, two crashes of the same size: −50% in 2000–2002 and −50% in
  // 2022–2023. On a linear axis the first one is a ripple near the floor and
  // the second looks like a collapse; on a log axis equal percentage moves
  // get equal height, so the two crashes look alike — because they are.
  const segments = [
    // [months, total multiplier]
    [60,  4],     // 1995 → 2000: 100 → 400
    [30,  0.5],   // 2000 → mid-2002: −50%
    [233, 60],    // → end of 2021: 200 → 12,000
    [18,  0.5],   // → mid-2023: −50%
    [40,  1.8],   // → 2026
  ];
  const data = [];
  let base = 100, i = 0;
  data.push({ date: new Date(Date.UTC(1995, 0, 1)), value: base });
  for (const [months, mult] of segments) {
    const step = Math.pow(mult, 1 / months);
    for (let m = 0; m < months; m++) {
      base *= step;
      i++;
      const wobble = 1 + 0.03 * Math.sin(i / 3.1) * Math.cos(i / 11);
      data.push({ date: new Date(Date.UTC(1995, i, 1)), value: +(base * wobble).toFixed(2) });
    }
  }

  new RareCharts.Line('#line-chart-log-demo', {
    height: 340,
    title: 'Performance Visualization',
    subtitle: 'Linear and logarithmic scales',
    note: 'Try the Lin/Log button to see the effect.',
    yScale: 'log',
    scaleToggle: true,
    yFormat: 'number',
    seriesName: 'Index',
    xTickFormat: d => d.getUTCFullYear(),
    annotations: [
      { from: '2000-01-01', to: '2002-07-01', label: '−50%' },
      { from: '2021-12-01', to: '2023-06-01', label: '−50%' },
    ],
  }).setData(data);
})();
