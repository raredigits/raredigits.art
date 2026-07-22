(function() {
  // A forest — three roots, no single total. Each department is a branch head;
  // its teams inherit the branch hue and fade one step by depth.
  const org = [
    { label: 'Engineering', value: 128, children: [
      { label: 'Platform',    value: 46 },
      { label: 'Product Eng', value: 52 },
      { label: 'Data & ML',   value: 30 },
    ] },
    { label: 'Go-to-Market', value: 74, children: [
      { label: 'Sales',            value: 41 },
      { label: 'Marketing',        value: 22 },
      { label: 'Customer Success', value: 11 },
    ] },
    { label: 'Operations', value: 33, children: [
      { label: 'Finance', value: 12 },
      { label: 'People',  value: 13 },
      { label: 'Legal',   value: 8  },
    ] },
  ];

  new RareCharts.HierarchicalBar('#hbar-org', {
    title: 'Headcount by organization',
    subtitle: 'Departments and their teams',
    valueFormat: n => n.value.toLocaleString(),
  }).setData(org);
})();
