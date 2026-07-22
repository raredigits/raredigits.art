/**
 * RareCharts — Donut drill-down example
 * Bloomberg's Trump crypto portfolio: a tree with a remainder surfaced at the
 * WLF level and two named-but-undisclosed items (value: null).
 */

(function () {
  const { Donut } = RareCharts;

  const portfolio = {
    label: 'Trump crypto businesses',
    value: 1400,
    children: [
      { label: 'World Liberty Financial', value: 536.4, remainderLabel: 'Other token & equity sales', children: [
        { label: 'Ethereum Key', value: 106 },
        { label: 'USDC Key',     value: 56 },
        { label: 'USD Key',      value: 42.3 },
        { label: 'Bitcoin Key',  value: 33.5 },
        { label: 'Link Key',     value: 2.8 },
        { label: 'AAVE Key',     value: 2.6 },
      ] },
      { label: 'Celebration Coins',   value: 636 },
      { label: 'Stablecoin proceeds', value: 196.9 },
      { label: 'Stablecoin business', value: 8.3 },
      { label: 'CIC Digital (NFTs, meme coins)', value: null },
      { label: 'NFT INT, LLC',        value: null },
    ],
  };

  new Donut('#chart-donut-drilldown', {
    title:         'Trump crypto businesses',
    subtitle:      'Click a slice to drill in · click the center to go back',
    source:        'Source: US Office of Government Ethics',
    height:        420,
    showLabels:    true,
    showRemainder: true,
    valueFormat:   v => '$' + (Math.round(v * 10) / 10) + 'M',
  }).setData(portfolio);
})();
