// Graph flow view — demo: funds moving across networks.
// Based on a public on-chain trace (anonymised and generalised for the docs),
// in the RareCharts link contract: lane = network, row = vertical slot
// (0 = the main line), col = sub-column of a wide lane, value = USD at the
// day's close, start = month the flow begins.
(function () {
  const el = document.getElementById('graph-flow-demo');
  if (!el || !window.RareCharts) return;

  const lanes = [
    { id: 'bostrom',   label: 'Bostrom',    weight: 1.3 },
    { id: 'cosmoshub', label: 'Cosmos Hub', weight: 1 },
    { id: 'osmosis',   label: 'Osmosis',    weight: 1.3 },
    { id: 'neutron',   label: 'Neutron',    weight: 0.8 },
    { id: 'kujira',    label: 'Kujira',     weight: 0.9 },
    { id: 'axelar',    label: 'Axelar',     weight: 0.9 },
    { id: 'ethereum',  label: 'Ethereum',   weight: 3.8 },
  ];

  const nodes = [
    { id: 'validator', label: 'Validator', sub: 'staking rewards', group: 'tracked', kind: 'contract', net: 'bostrom', row: -2,
      addr: 'bostromvaloper1uvkv59…h8wz6x', note: 'A network validator. Its commission is the starting point of the trace.' },
    { id: 'bostrom', label: 'Owner wallet', sub: 'bostrom1uvkv…afa29', group: 'tracked', kind: 'wallet', net: 'bostrom', row: 0, cluster: true,
      addr: 'bostrom1uvkv59tsqqugezwq2gn2pytz8uzk2uy40afa29', note: 'The validator operator. Every week it withdrew the commission, swapped it to ATOM on a DEX and sent the ATOM to the next network.' },
    { id: 'batch-dex', label: 'DEX', sub: 'liquidity pools', group: 'protocol', kind: 'contract', net: 'bostrom', row: 2,
      note: 'A batch DEX: swaps pay out per block, not per transaction, so the amounts coming back are derived from what was sent on — hence the dashed line.' },
    { id: 'hub', label: 'Owner wallet', sub: 'cosmos1uvkv…w5z', group: 'tracked', kind: 'wallet', net: 'cosmoshub', row: 0, cluster: true,
      addr: 'cosmos1uvkv59tsqqugezwq2gn2pytz8uzk2uy4vwaw5z', note: 'A transit stop: funds arrive and leave for the next network within minutes.' },
    { id: 'osmo', label: 'Owner wallet', sub: 'osmo1uvkv…w7zs', group: 'tracked', kind: 'wallet', net: 'osmosis', row: 0, cluster: true,
      addr: 'osmo1uvkv59tsqqugezwq2gn2pytz8uzk2uy4y4w7zs', note: 'Swaps ATOM to wrapped ETH, provides liquidity on a derivatives DEX, sends the ETH on.' },
    { id: 'swap-dex', label: 'DEX', sub: 'swap pools', group: 'protocol', kind: 'contract', net: 'osmosis', row: 2,
      note: '15 swaps ATOM → wrapped ETH over three months.' },
    { id: 'perps-dex', label: 'DEX', sub: 'perpetuals', group: 'protocol', kind: 'contract', net: 'osmosis', row: -2,
      addr: 'osmo19c7hdlfvu7cddr0smfz9luaj8375qhfr3s0gtsk087laqfzxlu3qsnk47e', note: 'A derivatives DEX. The wallet provided liquidity and took it back with a small yield.' },
    { id: 'neutron', label: 'Owner wallet', sub: 'neutron1uvkv…5vw9', group: 'tracked', kind: 'wallet', net: 'neutron', row: -1, cluster: true,
      addr: 'neutron1uvkv59tsqqugezwq2gn2pytz8uzk2uy4g35vw9', note: 'A round trip: the funds came back three weeks later, slightly more than went out.' },
    { id: 'kujira', label: 'Owner wallet', sub: 'kujira1uvkv…lkeg', group: 'tracked', kind: 'wallet', net: 'kujira', row: 0, cluster: true,
      addr: 'kujira1uvkv59tsqqugezwq2gn2pytz8uzk2uy4axlkeg', note: 'Sends the ETH over a bridge to Ethereum.' },
    { id: 'bridge', label: 'Bridge', sub: 'cross-chain', group: 'protocol', kind: 'contract', net: 'axelar', row: 0,
      note: 'Moves the funds to Ethereum and unwraps them to native ETH, keeping a fee.' },
    { id: 'bridge-fee', label: 'Bridge fee', sub: 'fee', group: 'fee', kind: 'contract', net: 'axelar', row: 2 },
    { id: 'eth', label: 'Owner wallet', sub: '0x2b48…3248', group: 'tracked', kind: 'wallet', net: 'ethereum', col: 0, row: 0,
      addr: '0x2b48aF8Cd710BE6B019D105CA442471b55E23248', note: 'Buys into a token crowdfunding with 0.245 ETH; two years later receives the project tokens.' },
    { id: 'crowdfunding', label: 'Crowdfunding', sub: '− close', group: 'protocol', kind: 'contract', net: 'ethereum', col: 1, row: 0,
      addr: '0x1d9619e10086fdc1065b114298384aae3f680cc0', note: 'A token sale contract: 228 payments, 107.17 ETH in three days.' },
    // crowdsale side
    { id: 'crowd', label: 'Participants', sub: '206 addresses', group: 'unknown', kind: 'crowd', net: 'ethereum', col: 1, row: -2, crowd: true,
      note: 'Everyone else who paid into the sale.' },
    { id: 'largest-backer', label: 'Largest backer', sub: '10 ETH, refunded', group: 'unknown', kind: 'wallet', net: 'ethereum', col: 2, row: -2, crowd: true,
      addr: '0xc6de698d90598b8fe60e0d8c7c674f2d839769d4', note: 'The largest payment, 10 ETH — returned by the project owner two days later.' },
    { id: 'owner', label: 'Project owner', sub: '0xd2b4…83bc', group: 'unknown', kind: 'wallet', net: 'ethereum', col: 2, row: 0, crowd: true,
      addr: '0xd2b4869ec4d4ba75cd59dac85a4bd882205b83bc', note: 'Owns the sale contract and receives all of its payouts.' },
    { id: 'platform-fee', label: 'Platform fee', sub: '2.5 %', group: 'fee', kind: 'contract', net: 'ethereum', col: 1, row: 2, crowd: true },
    { id: 'team', label: 'Project team', sub: '0x33f6…7a51', group: 'external', kind: 'wallet', net: 'ethereum', col: 3, row: -1, crowd: true,
      addr: '0x33f61fd783a92f04352eed64c43219ef1e327a51', note: 'Gets about half of the sale money from the owner and sends it to an exchange; later funds the token distributor.' },
    { id: 'exchange', label: 'Exchange', sub: 'hot wallet', group: 'exchange', kind: 'exchange', net: 'ethereum', col: 3, row: 1, crowd: true, terminal: true,
      addr: '0x28c6c06298d514db089934071355e5743bf21d60', note: 'End of the trace: exchanges are not followed further. Most of the sale money ends up here within a week.' },
    { id: 'distributor', label: 'Token distributor', sub: '0xe42b…ff06', group: 'external', kind: 'contract', net: 'ethereum', col: 2, row: 3, crowd: true,
      addr: '0xe42b8c6b05a7be0bb1dbf47c402eefe06256ff06', note: 'Sends the project tokens to every participant in one batch.' },
    // noise
    { id: 'look-alike', label: 'Look-alike address', sub: 'address poisoning', group: 'noise', kind: 'wallet', net: 'ethereum', col: 3, row: 3, crowd: true, noise: true,
      addr: '0x33f236f5c34e1f04d7903939209fc55655327a51', note: 'Mimics the team wallet’s address. Fake token transfers were logged from the owner to trick copy-paste; no real money went here.' },
  ];

  // Months from 2023-09 (index 0) to 2026-04 (index 31), as in the mock-up.
  const MONTHS = Array.from({ length: 32 }, (_, i) =>
    new Date(Date.UTC(2023, 8 + i, 1)).toISOString().slice(0, 7));

  const E = (from, to, asset, kind, amount, usd, count, period, t0, basis, label, extra = {}) =>
    ({ from, to, asset, kind, amount, value: usd, count, period, start: MONTHS[t0], basis, label, ...extra });
  const links = [
    E('validator', 'bostrom', 'BOOT', 'income', '≈ 1.1 bn BOOT a week', null, 'weekly', '2023-09 … 2024-08', 0, 'exact', 'commission'),
    E('bostrom', 'batch-dex', 'BOOT', 'swap', 'staking rewards', null, '187 swaps', '2023-09 … 2024-08', 0, 'exact', 'swap'),
    E('batch-dex', 'bostrom', 'ATOM', 'swap', '≥ 71.88 ATOM', 627, '—', '2023-09 … 2024-08', 0, 'derived', 'ATOM'),
    E('bostrom', 'hub', 'ATOM', 'transfer', '71.881632 ATOM', 627, 22, '2023-09-26 … 2024-08-27', 0, 'exact', '71.88 ATOM'),
    E('hub', 'osmo', 'ATOM', 'transfer', '69.50 ATOM', 608, 21, '2023-09-26 … 2024-04-10', 0, 'exact', '69.50 ATOM'),
    E('osmo', 'swap-dex', 'ATOM', 'swap', '61.38 ATOM', 530, 15, '2023-09-26 … 2023-12-27', 0, 'exact', '61.38 ATOM'),
    E('swap-dex', 'osmo', 'ETH', 'swap', '0.27411194 wrapped ETH', 517, 15, '2023-09-26 … 2023-12-27', 0, 'exact', '0.274 ETH'),
    E('osmo', 'perps-dex', 'ETH', 'deposit', '0.692319 wrapped ETH', 1381, 10, '2023-09-26 … 2023-12-05', 0, 'exact', '0.692 in'),
    E('perps-dex', 'osmo', 'ETH', 'withdraw', '0.69231905 + yield 0.00023598 wrapped ETH', 1438, 8, '2023-09-30 … 2023-12-12', 0, 'exact', '0.693 out'),
    E('osmo', 'neutron', 'ETH', 'transfer', '0.11566675 wrapped ETH', 181, 1, '2023-10-10', 1, 'exact', '0.1157'),
    E('neutron', 'osmo', 'ETH', 'transfer', '0.11683505 wrapped ETH', 212, 1, '2023-10-31', 1, 'exact', '0.1168'),
    E('osmo', 'kujira', 'ETH', 'transfer', '0.27551622 wrapped ETH', 686, 1, '2024-01-19', 4, 'exact', '0.2755 ETH'),
    E('kujira', 'bridge', 'ETH', 'bridge', '0.27669243 wrapped ETH', 632, 1, '2024-01-31', 4, 'exact', '0.2767 ETH'),
    E('bridge', 'bridge-fee', 'ETH', 'fee', '0.025062 ETH', 57, 1, '2024-01-31', 4, 'exact', '0.0251'),
    E('bridge', 'eth', 'ETH', 'bridge', '0.25163043 ETH', 575, 1, '2024-01-31', 4, 'exact', '0.2516 ETH'),
    E('eth', 'crowdfunding', 'ETH', 'payment', '0.245 ETH → 245 000 project tokens', 560, 1, '2024-01-31', 4, 'exact', '0.245 ETH'),
    // crowdsale
    E('crowd', 'crowdfunding', 'ETH', 'payment', '96.92122755 ETH', 224847, 226, '2024-01-30 … 2024-02-01', 4, 'exact', '96.92 ETH', { crowd: true }),
    E('largest-backer', 'crowdfunding', 'ETH', 'payment', '10 ETH', 23462, 1, '2024-01-30', 4, 'exact', '10 ETH', { crowd: true }),
    E('crowdfunding', 'platform-fee', 'ETH', 'fee', '2.62844457 ETH', 6108, 6, '2024-01-30 … 2024-02-01', 4, 'exact', '2.63 ETH', { crowd: true }),
    E('crowdfunding', 'owner', 'ETH', 'payout', '105.13778298 ETH (after 2.5 %)', 244325, 6, '2024-01-30 … 2024-02-01', 4, 'exact', '105.14 ETH', { crowd: true }),
    E('owner', 'largest-backer', 'ETH', 'refund', '10 ETH', 23034, 1, '2024-02-01', 5, 'exact', '10 ETH back', { crowd: true }),
    E('owner', 'team', 'ETH', 'transfer', '47.41685 ETH', 110289, 2, '2024-01-30 … 2024-02-01', 4, 'exact', '47.42 ETH', { crowd: true }),
    E('owner', 'exchange', 'ETH', 'transfer', '49.142107 ETH via 0xe5ca…ab96', 114447, 4, '2024-01-30 … 2024-02-07', 4, 'exact', '49.14 ETH', { crowd: true }),
    E('team', 'exchange', 'ETH', 'transfer', '47.37678 ETH via 0x054c…1459', 110286, 2, '2024-01-30 … 2024-02-02', 4, 'exact', '47.38 ETH', { crowd: true }),
    E('team', 'distributor', 'TOKEN', 'distribution', '4 516 635.21 tokens', 103135, 1, '2026-04-22', 31, 'exact', '4.52 M tokens', { crowd: true }),
    E('distributor', 'crowd', 'TOKEN', 'distribution', '4 505 186.30 tokens, 206 addresses', 102874, 206, '2026-04-22', 31, 'exact', '4.51 M tokens', { crowd: true }),
    E('distributor', 'eth', 'TOKEN', 'distribution', '11 448.90771 tokens', 261, 1, '2026-04-22', 31, 'exact', '11 449 tokens'),
    // noise
    E('owner', 'look-alike', 'ETH', 'noise', 'fake token, 2 transfers', null, 2, '2024-01-30 … 2024-02-01', 4, 'exact', 'fake token', { crowd: true, noise: true }),
  ];

  const GROUPS = {
    tracked:  { color: '#2c5d8f', label: 'tracked wallets' },
    protocol: { color: '#3f7a55', label: 'DEX / bridge / contract' },
    external: { color: '#9a6a1c', label: 'known external' },
    unknown:  { color: '#7c838b', label: 'unknown' },
    exchange: { color: '#a33d36', label: 'exchange' },
    fee:      { color: '#a9afb6', label: 'fee' },
    noise:    { color: '#c2410c', label: 'noise' },
  };
  const ASSETS = {
    ATOM:  { color: '#6c58b5', label: 'ATOM' },
    ETH:   { color: '#3d4a5c', label: 'ETH' },
    TOKEN: { color: '#138a8a', label: 'project token' },
    BOOT:  { color: '#8a5a2b', label: 'BOOT' },
    noise: { color: '#c2410c', label: 'address poisoning' },
  };
  const OWNER_HULL = [{ id: 'owner', label: 'one key on five networks', members: n => n.cluster, color: '#2c5d8f' }];

  const state = { crowd: true };   // the crowdfunding side starts open
  const panel = document.getElementById('graph-flow-demo-panel');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  function renderPanel({ node, link } = {}) {
    if (!panel) return;
    const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    if (node) {
      // only ties the current switches show
      const shown = l => state.crowd || !l.crowd;
      const ins = links.filter(l => l.to === node.id && shown(l)).map(l => `${esc(byId[l.from].label)} — ${esc(l.amount)}`);
      const outs = links.filter(l => l.from === node.id && shown(l)).map(l => `${esc(byId[l.to].label)} — ${esc(l.amount)}`);
      panel.innerHTML = `<p class="rc-graph-details-kind">${esc(GROUPS[node.group]?.label ?? node.group)} · ${esc(node.net)}</p>
        <h4>${esc(node.label)}</h4>
        <dl>${node.addr ? row('Address', `<code>${esc(node.addr)}</code>`) : ''}${row('Incoming', ins.join('<br>') || '—')}${row('Outgoing', outs.join('<br>') || '—')}</dl>
        ${node.note ? `<p>${esc(node.note)}</p>` : ''}`;
    } else if (link) {
      panel.innerHTML = `<p class="rc-graph-details-kind">${esc(link.kind)} · ${esc(link.asset)}</p>
        <h4>${esc(byId[link.source].label)} → ${esc(byId[link.target].label)}</h4>
        <dl>${row('Amount', esc(link.amount))}${row('In USD', link.value == null ? 'not valued' : '≈ ' + link.value.toLocaleString('en-US'))}${row('Transfers', esc(link.count))}${row('Period', esc(link.period))}${row('Basis', link.basis === 'derived' ? 'derived (block events)' : 'chain transactions')}</dl>`;
    } else {
      panel.innerHTML = `<p class="rc-graph-details-kind">Hint</p><h4>Nothing selected</h4>
        <p>Select a node to see its address and flows, or a tie to see amount, USD, transfers and period.</p>`;
    }
  }

  function onSelect(sel) {
    renderPanel(sel);
    if (sel?.node?.id === 'crowdfunding') setCrowd(!state.crowd);
  }

  const graph = new RareCharts.Graph('#graph-flow-demo', {
    view: 'flow',
    height: 780,
    minWidth: 780,
    title: 'Following funds across networks',
    subtitle: 'From validator income through five networks into a token crowdfunding — and where the sale money went',
    source: 'Demo data based on a public on-chain trace',
    lanes,
    laneBy: 'net',
    nodeGroups: GROUPS,
    nodeShapes: { wallet: 'circle', contract: 'square', exchange: 'diamond', crowd: 'stack' },
    linkColorBy: l => (l.kind === 'noise' ? 'noise' : l.asset),
    linkTypes: ASSETS,
    linkWidth: { by: 'value', scale: 'sqrt', min: 1.6, max: 22 },
    linkDash: l => l.basis === 'derived' || l.kind === 'noise',
    hulls: OWNER_HULL,
    onSelect: onSelect,
    // The decoy's fake transfers start hidden; the legend's "address
    // poisoning" item reveals them (with the crowdfunding side open).
    hiddenLinkTypes: ['noise'],
    details: '#graph-flow-demo-panel',        // the page's details panel: beside the drawing when wide
  }).setData({ nodes, links });

  const applyFilter = () => graph.setFilter(item => state.crowd || !item.crowd);
  applyFilter();
  renderPanel();

  // The crowdfunding node opens and closes its side of the trace on click —
  // a page-level stand-in until collapsible groups land in the library
  // (0.9.8_4). Its caption says which way the next click goes.
  function setCrowd(open) {
    state.crowd = open;
    const hub = nodes.find(n => n.id === 'crowdfunding');
    hub.sub = open ? '− close' : '+ open';
    graph.setData({ nodes, links });   // same layout; filter and selection kept
    applyFilter();
  }

})();
