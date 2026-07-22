(function() {
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
      { label: 'License agreement with Celebration Coins', value: 636 },
      { label: 'Stablecoin proceeds', value: 196.9 },
      { label: 'Stablecoin business', value: 8.3 },
      { label: 'License agreement with CIC Digital LLC for NFTs and meme coins', value: null },
      { label: 'License agreement with NFT INT, LLC', value: null },
    ],
  };

  const money = v => '$' + (Math.round(v * 10) / 10) + 'M';

  new RareCharts.HierarchicalBar('#hbar-portfolio', {
    title: 'Trump Earned At Least $1.4B with Crypto Businesses in 2025',
    subtitle: 'Crypto-related assets and income',
    valueFormat: n => money(n.value),
    source: 'Source: US Office of Government Ethics',
    note: "Values marked “?” are not disclosed.",
  }).setData(portfolio);
})();
