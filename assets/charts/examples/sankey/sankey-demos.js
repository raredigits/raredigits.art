(function () {
  const { Sankey } = RareCharts;

  // 1. Budget — two columns: where the money comes from, where it goes.
  //    Synthetic figures, billions.
  new Sankey('#sankey-budget', {
    title: 'City budget, 2026',
    subtitle: 'Revenue sources and spending lines, bn',
    source: 'Synthetic demo data',
    valueFormat: v => `${v.toFixed(1)}`,
  }).setData({
    nodes: [
      { id: 'income-tax',  label: 'Income tax' },
      { id: 'property',    label: 'Property tax' },
      { id: 'transfers',   label: 'Federal transfers' },
      { id: 'fees',        label: 'Fees' },
      { id: 'borrowing',   label: 'Borrowing' },
      { id: 'health',      label: 'Health' },
      { id: 'schools',     label: 'Schools' },
      { id: 'transport',   label: 'Transport' },
      { id: 'housing',     label: 'Housing' },
      { id: 'debt',        label: 'Debt service' },
    ],
    links: [
      { source: 'income-tax', target: 'health',    value: 9.4 },
      { source: 'income-tax', target: 'schools',   value: 7.1 },
      { source: 'income-tax', target: 'housing',   value: 2.2 },
      { source: 'property',   target: 'schools',   value: 4.8 },
      { source: 'property',   target: 'transport', value: 2.5 },
      { source: 'transfers',  target: 'health',    value: 3.9 },
      { source: 'transfers',  target: 'housing',   value: 2.6 },
      { source: 'fees',       target: 'transport', value: 1.9 },
      { source: 'borrowing',  target: 'transport', value: 3.1 },
      { source: 'borrowing',  target: 'debt',      value: 2.0 },
    ],
  });

  // 2. Money trail — three columns, bands colored by type, pinnable
  //    tooltips with the tie's label. Synthetic, USD m.
  new Sankey('#sankey-trail', {
    title: 'Where the fund’s money went',
    subtitle: 'Investors → vehicles → recipients, USD m',
    source: 'Synthetic demo data',
    linkColor: 'type',
    linkTypes: {
      equity:  { color: '#00aaff', label: 'Equity' },
      loan:    { color: '#fa8c16', label: 'Loan' },
      payout:  { color: '#00c97a', label: 'Payout' },
    },
  }).setData({
    links: [
      { from: 'Pension fund',  to: 'Holding A',  value: 140, type: 'equity', label: 'Series B, 2021' },
      { from: 'Pension fund',  to: 'Holding B',  value: 60,  type: 'equity' },
      { from: 'Family office', to: 'Holding A',  value: 45,  type: 'loan',   label: 'Bridge loan, 8%' },
      { from: 'Family office', to: 'Holding B',  value: 30,  type: 'equity' },
      { from: 'Sovereign fund',to: 'Holding B',  value: 90,  type: 'equity' },
      { from: 'Holding A',     to: 'Operating co', value: 120, type: 'equity' },
      { from: 'Holding A',     to: 'Founders',   value: 40,  type: 'payout', label: 'Secondary sale' },
      { from: 'Holding B',     to: 'Operating co', value: 95,  type: 'loan' },
      { from: 'Holding B',     to: 'Advisers',   value: 18,  type: 'payout' },
      { from: 'Holding B',     to: 'Founders',   value: 50,  type: 'payout' },
    ],
  });

  // 3. Energy balance — five columns, the recommended upper limit.
  //    Synthetic, TWh.
  new Sankey('#sankey-energy', {
    title: 'Energy balance',
    subtitle: 'Primary sources → conversion → carriers → sectors → useful/lost, TWh',
    source: 'Synthetic demo data',
    linkColor: 'gradient',
    height: 460,
  }).setData({
    links: [
      { from: 'Gas',        to: 'Power plants', value: 180 },
      { from: 'Gas',        to: 'Boilers',      value: 140 },
      { from: 'Coal',       to: 'Power plants', value: 90 },
      { from: 'Nuclear',    to: 'Power plants', value: 110 },
      { from: 'Wind & solar', to: 'Grid',       value: 85 },
      { from: 'Oil',        to: 'Refineries',   value: 260 },
      { from: 'Power plants', to: 'Grid',       value: 190 },
      { from: 'Power plants', to: 'Heat network', value: 40 },
      { from: 'Power plants', to: 'Conversion losses', value: 150 },
      { from: 'Boilers',    to: 'Heat network', value: 120 },
      { from: 'Boilers',    to: 'Conversion losses', value: 20 },
      { from: 'Refineries', to: 'Fuels',        value: 235 },
      { from: 'Refineries', to: 'Conversion losses', value: 25 },
      { from: 'Grid',       to: 'Industry',     value: 120 },
      { from: 'Grid',       to: 'Homes',        value: 95 },
      { from: 'Grid',       to: 'Transport',    value: 15 },
      { from: 'Grid',       to: 'Grid losses',  value: 45 },
      { from: 'Heat network', to: 'Homes',      value: 110 },
      { from: 'Heat network', to: 'Industry',   value: 50 },
      { from: 'Fuels',      to: 'Transport',    value: 190 },
      { from: 'Fuels',      to: 'Industry',     value: 45 },
      { from: 'Industry',   to: 'Useful',       value: 140 },
      { from: 'Industry',   to: 'Lost',         value: 75 },
      { from: 'Homes',      to: 'Useful',       value: 150 },
      { from: 'Homes',      to: 'Lost',         value: 55 },
      { from: 'Transport',  to: 'Useful',       value: 60 },
      { from: 'Transport',  to: 'Lost',         value: 145 },
    ],
  });
})();
