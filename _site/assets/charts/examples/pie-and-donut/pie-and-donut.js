/**
 * RareCharts — Donut & Pie examples
 *
 * Donut:  new RareCharts.Donut(...)  — innerRadius: 0.58 по умолчанию
 * Pie:    new RareCharts.Pie(...)    — алиас Donut с innerRadius: 0
 */

(function () {
  const { Donut, Pie, d3 } = RareCharts;

  const segments = [
    { label: 'Atlas ERP',    value: 42 },
    { label: 'Corsair HQ',   value: 28 },
    { label: 'Jeeves GPT',   value: 18 },
    { label: 'Consulting',   value: 8  },
    { label: 'Other',        value: 4  },
  ];

  // ── Donut (default) ──────────────────────────────────────────────────────
  new Donut('#chart-donut', {
    title:       'Revenue by Product',
    subtitle:    'Share of total revenue, 2024',
    source:      'Source: Internal accounting',
    legend:      segments.map(d => ({ label: d.label, type: 'bar' })),
    height:      300,
    centerText:  data => '$' + d3.format(',.0f')(d3.sum(data, d => d.value)) + 'K',
    centerLabel: 'Revenue',
    valueFormat: v => '$' + d3.format(',.0f')(v) + 'K',
    tooltipFormat: ({ label, value, percent, color }) => `
      <div style="color:${color}">${label}</div>
      <div>$${d3.format(',.0f')(value)}K</div>
      <div style="color:#888">${d3.format('.1%')(percent)}</div>
    `,
  }).setData(segments);

  // ── Pie ──────────────────────────────────────────────────────────────────
  new Pie('#chart-pie', {
    title:       'Revenue by Product',
    subtitle:    'Same data as Pie (innerRadius: 0)',
    height:      300,
    innerRadius: 0,      // ← это и делает его pie
    showLabels:  true,   // подписи снаружи
    valueFormat: v => '$' + d3.format(',.0f')(v) + 'K',
  }).setData(segments);

  // ── Donut с кастомным центром ─────────────────────────────────────────────
  new Donut('#chart-donut-custom', {
    title:       'Goal Progress',
    height:      260,
    innerRadius: 0.65,   // тонкое кольцо
    padAngle:    0.03,
    cornerRadius: 4,
    centerText:  '73%',
    centerLabel: 'Complete',
  }).setData([
    { label: 'Done',      value: 73, color: '#00c97a' },
    { label: 'Remaining', value: 27, color: '#e8e8e8' },
  ]);

})();
