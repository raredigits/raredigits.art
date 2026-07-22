(function() {
  // Percent mode — each bar normalizes to 100%, so the story is the shifting
  // share, not the absolute total.
  const data = [
    { name: 'Renewables', values: [{ label: '2019', value: 22 }, { label: '2021', value: 29 }, { label: '2023', value: 38 }] },
    { name: 'Gas',        values: [{ label: '2019', value: 38 }, { label: '2021', value: 36 }, { label: '2023', value: 34 }] },
    { name: 'Coal',       values: [{ label: '2019', value: 40 }, { label: '2021', value: 35 }, { label: '2023', value: 28 }] },
  ];

  new RareCharts.Bar('#stacked-energy', {
    title: 'Electricity generation mix',
    subtitle: 'Share by source',
    height: 320,
    stacked: 'percent',
    orientation: 'horizontal',
  }).setData(data);
})();
