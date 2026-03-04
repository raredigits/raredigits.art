/**
 * RareCharts — Circular Charts examples
 * Covers: Donut, Pie (alias with innerRadius:0), Gauge
 */

(function () {
  const { Donut, Pie, Gauge, d3 } = RareCharts;

  const segments = [
    { label: 'Atlas ERP',    value: 42 },
    { label: 'Corsair HQ',   value: 28 },
    { label: 'Jeeves GPT',   value: 18 },
    { label: 'Consulting',   value: 8  },
    { label: 'Other',        value: 4  },
  ];

  // ── Donut (default) ────────────────────────────────────────────────────────
  new Donut('#chart-donut', {
    title:       'Revenue by Product',
    subtitle:    'Share of total revenue, 2024',
    source:      'Source: Internal Accounting',
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

  // ── Donut with legend on the right ────────────────────────────────────────
  new Donut('#chart-donut-legend-right', {
    title:          'Revenue by Product',
    subtitle:       'Legend positioned to the right',
    source:         'Source: Internal Accounting',
    legend:         segments.map(d => ({ label: d.label, type: 'bar' })),
    legendPosition: 'right',
    height:         340,
    centerText:     data => '$' + d3.format(',.0f')(d3.sum(data, d => d.value)) + 'K',
    centerLabel:    'Revenue',
  }).setData(segments);

  // ── Pie ───────────────────────────────────────────────────────────────────
  new Pie('#chart-pie', {
    title:       'Revenue by Product',
    subtitle:    'Same data as Pie (innerRadius: 0)',
    source:      'Source: Internal Accounting',
    height:      300,
    innerRadius: 0,
    showLabels:  true,
    valueFormat: v => '$' + d3.format(',.0f')(v) + 'K',
  }).setData(segments);

  // ── Gauge: goal progress ──────────────────────────────────────────────────
  new Gauge('#chart-gauge-progress', {
    title:       'Goal Progress',
    height:      220,
    centerLabel: 'Complete',
  }).setData(73);

  // ── Gauge: value vs target ────────────────────────────────────────────────
  // Plan: 80, Achieved: 50 — arc fills to 50/80 = 62.5%
  new Gauge('#chart-gauge-target', {
    title:       'Budget Execution',
    subtitle:    'Achieved vs Plan',
    height:      220,
    max:         80,
    color:       '#00c97a',
    centerText:  (value, max) => `${value}/${max}`,
    centerLabel: 'Achieved',
  }).setData(50);

  // ── Gauge: thin ring, custom angles ───────────────────────────────────────
  new Gauge('#chart-gauge-thin', {
    title:       'Disk Usage',
    height:      200,
    thickness:   0.10,
    cornerRadius: 8,
    color:       '#ff3b5c',
    centerText:  v => d3.format('.0%')(v / 100),
    centerLabel: 'Used',
  }).setData(78);

})();
