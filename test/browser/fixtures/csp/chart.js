const DAY = 864e5;
window.chart = new RareCharts.Line('#chart', {
  height: 300,
  animate: false,
  title: 'Under a strict CSP',
  timeframes: ['3M', 'ALL'],
  source: 'Source: fixture',
}).setData(Array.from({ length: 200 }, (_, i) => ({
  date: new Date(Date.UTC(2025, 0, 1) + i * DAY),
  value: 100 + 10 * Math.sin(i / 9),
})));
