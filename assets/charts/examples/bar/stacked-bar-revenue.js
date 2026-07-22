(function() {
  const data = [
    { name: 'Cloud',    values: [{ label: 'Q1', value: 42 }, { label: 'Q2', value: 48 }, { label: 'Q3', value: 55 }, { label: 'Q4', value: 63 }] },
    { name: 'Licenses', values: [{ label: 'Q1', value: 30 }, { label: 'Q2', value: 29 }, { label: 'Q3', value: 31 }, { label: 'Q4', value: 34 }] },
    { name: 'Services', values: [{ label: 'Q1', value: 18 }, { label: 'Q2', value: 20 }, { label: 'Q3', value: 19 }, { label: 'Q4', value: 22 }] },
  ];

  new RareCharts.Bar('#stacked-revenue', {
    title: 'Revenue by product line',
    subtitle: 'Quarterly, $M',
    height: 320,
    yTickFormat: v => '$' + v + 'M',
    valueFormat: d => '$' + d.value + 'M',
  }).setData(data);
})();
