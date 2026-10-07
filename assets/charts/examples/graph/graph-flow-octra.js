// Graph flow view — "The road to Octra".
// Data: the data project's public on-chain trace (mock-up
// _drafts/address-graph-octra.html, 2026-10-07), converted to the
// RareCharts link contract: lane = network, row = vertical slot (0 = the
// main line), col = sub-column of a wide lane, value = USD at the day's close,
// start = month the flow begins.
(function () {
  const el = document.getElementById('graph-flow-octra');
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
    { id: 'validator', label: 'TheChurch', sub: 'validator', group: 'church', kind: 'contract', net: 'bostrom', row: -2,
      addr: 'bostromvaloper1uvkv59…h8wz6x', note: 'The Church validator on Bostrom since 2022-08-06. Commission not withdrawn on 2026-10-07: 57.8 bn BOOT.' },
    { id: 'bostrom', label: 'Bostrom main', sub: 'bostrom1uvkv…afa29', group: 'church', kind: 'wallet', net: 'bostrom', row: 0, cluster: true,
      addr: 'bostrom1uvkv59tsqqugezwq2gn2pytz8uzk2uy40afa29', note: 'The validator operator. Every week it withdrew the commission and rewards, swapped BOOT and HYDROGEN to ATOM and sent the ATOM over IBC.' },
    { id: 'gravity', label: 'Gravity DEX', sub: 'Bostrom pools', group: 'protocol', kind: 'contract', net: 'bostrom', row: 2,
      note: 'The Bostrom liquidity module (MsgSwapWithinBatch). A batch swap pays out in a block, not in a transaction, so the ATOM arrivals are derived from the outgoing IBC sends.' },
    { id: 'hub', label: 'Cosmos Hub main', sub: 'cosmos1uvkv…w5z', group: 'church', kind: 'wallet', net: 'cosmoshub', row: 0, cluster: true,
      addr: 'cosmos1uvkv59tsqqugezwq2gn2pytz8uzk2uy4vwaw5z', note: 'ATOM in transit: arrives from Bostrom and leaves for Osmosis 1–3 minutes later.' },
    { id: 'osmo', label: 'Osmosis main', sub: 'osmo1uvkv…w7zs', group: 'church', kind: 'wallet', net: 'osmosis', row: 0, cluster: true,
      addr: 'osmo1uvkv59tsqqugezwq2gn2pytz8uzk2uy4y4w7zs', note: 'Swaps ATOM to axlWETH, provides liquidity on Levana, sends to Kujira.' },
    { id: 'pools', label: 'Osmosis pools', sub: 'poolmanager', group: 'protocol', kind: 'contract', net: 'osmosis', row: 2,
      note: '15 swaps ATOM → axlWETH, 2023-09-26 … 2023-12-27.' },
    { id: 'levana', label: 'Levana Perps', sub: 'axlETH/USD', group: 'protocol', kind: 'contract', net: 'osmosis', row: -2,
      addr: 'osmo19c7hdlfvu7cddr0smfz9luaj8375qhfr3s0gtsk087laqfzxlu3qsnk47e', note: 'A perpetuals market. The wallet was a liquidity provider (LP); yield over the whole period: +0.000236 ETH.' },
    { id: 'neutron', label: 'Neutron', sub: 'neutron1uvkv…5vw9', group: 'church', kind: 'wallet', net: 'neutron', row: -1, cluster: true,
      addr: 'neutron1uvkv59tsqqugezwq2gn2pytz8uzk2uy4g35vw9', note: 'A round trip 2023-10-10 → 2023-10-31; 0.00117 ETH more came back. Not a treasury account.' },
    { id: 'kujira', label: 'Kujira main', sub: 'kujira1uvkv…lkeg', group: 'church', kind: 'wallet', net: 'kujira', row: 0, cluster: true,
      addr: 'kujira1uvkv59tsqqugezwq2gn2pytz8uzk2uy4axlkeg', note: 'Sent the axlWETH over Axelar to Ethereum. Kujira history is unavailable: Mintscan does not serve it and the nodes do not answer.' },
    { id: 'axelar', label: 'Axelar', sub: 'bridge', group: 'protocol', kind: 'contract', net: 'axelar', row: 0,
      note: 'Transfer 597666: Kujira → Ethereum; AxelarDepositService unwraps WETH to ETH.' },
    { id: 'axfee', label: 'Axelar fee', sub: 'fee', group: 'fee', kind: 'contract', net: 'axelar', row: 2 },
    { id: 'eth', label: 'Church ETH wallet', sub: '0x2b48…3248', group: 'church', kind: 'wallet', net: 'ethereum', col: 0, row: 0,
      addr: '0x2b48aF8Cd710BE6B019D105CA442471b55E23248', note: 'Paid 0.245 ETH into Juicebox #631; received 11 448.9 OCTRA on 2026-04-22.' },
    { id: 'jb', label: 'Juicebox #631', sub: 'Octra crowdsale', group: 'protocol', kind: 'contract', net: 'ethereum', col: 1, row: 0,
      addr: '0x1d9619e10086fdc1065b114298384aae3f680cc0', note: 'Juicebox v3 terminal. 228 payments, 107.17 ETH, 2024-01-30 12:19 … 2024-02-01 21:33 UTC. Confirmed on chain as the Octra sale.' },
    // crowdsale side
    { id: 'crowd', label: 'Participants', sub: '206 addresses', group: 'unknown', kind: 'crowd', net: 'ethereum', col: 1, row: -2, crowd: true,
      note: 'The other crowdsale participants (without the Church and the largest participant).' },
    { id: 'c6de', label: '0xc6de…69d4', sub: '10 ETH, refunded', group: 'unknown', kind: 'wallet', net: 'ethereum', col: 2, row: -2, crowd: true,
      addr: '0xc6de698d90598b8fe60e0d8c7c674f2d839769d4', note: 'The largest payment (10 ETH). Two days later the owner sent the 10 ETH back directly; no wOCT.' },
    { id: 'owner', label: 'Project owner', sub: '0xd2b4…83bc', group: 'unknown', kind: 'wallet', net: 'ethereum', col: 2, row: 0, crowd: true,
      addr: '0xd2b4869ec4d4ba75cd59dac85a4bd882205b83bc', note: 'ownerOf(631). Gas came from Binance 18 a minute before the project launch. Received 100 % of the payouts.' },
    { id: 'jbfee', label: 'Juicebox fee', sub: '2.5 %', group: 'fee', kind: 'contract', net: 'ethereum', col: 1, row: 2, crowd: true },
    { id: 'team', label: 'Octra team', sub: '0x33f6…7a51', group: 'external', kind: 'wallet', net: 'ethereum', col: 3, row: -1, crowd: true,
      addr: '0x33f61fd783a92f04352eed64c43219ef1e327a51', note: 'Got 47.42 ETH from the owner and sent it on to Binance. In 2026 funded the wOCT distributor.' },
    { id: 'binance', label: 'Binance', sub: 'hot wallet 14', group: 'exchange', kind: 'exchange', net: 'ethereum', col: 3, row: 1, crowd: true, terminal: true,
      addr: '0x28c6c06298d514db089934071355e5743bf21d60', note: 'End node: an exchange is not expanded. 96.48 ETH arrived here through two deposit addresses within 8 days.' },
    { id: 'dist', label: 'wOCT distributor', sub: '0xe42b…ff06', group: 'external', kind: 'contract', net: 'ethereum', col: 2, row: 3, crowd: true,
      addr: '0xe42b8c6b05a7be0bb1dbf47c402eefe06256ff06', note: 'batchClaim contract, 2026-04-22 01:27: 4 516 635 wOCT to 207 addresses.' },
    // noise
    { id: 'poison', label: '0x33f2…7a51', sub: 'address poisoning', group: 'noise', kind: 'wallet', net: 'ethereum', col: 3, row: 3, crowd: true, noise: true,
      addr: '0x33f236f5c34e1f04d7903939209fc55655327a51', note: 'Looks like the team wallet. A fake «ЕTН» token (Cyrillic Е) was logged «from the owner»; no real money went here.' },
  ];

  // Months from 2023-09 (index 0) to 2026-04 (index 31), as in the mock-up.
  const MONTHS = Array.from({ length: 32 }, (_, i) =>
    new Date(Date.UTC(2023, 8 + i, 1)).toISOString().slice(0, 7));

  const E = (from, to, asset, kind, amount, usd, count, period, t0, basis, label, extra = {}) =>
    ({ from, to, asset, kind, amount, value: usd, count, period, start: MONTHS[t0], basis, label, ...extra });
  const links = [
    E('validator', 'bostrom', 'BOOT', 'income', '≈ 1.1 bn BOOT a week', null, 'weekly', '2023-09 … 2024-08', 0, 'exact', 'commission'),
    E('bostrom', 'gravity', 'BOOT', 'swap', 'BOOT, HYDROGEN', null, '187 swaps', '2023-09 … 2024-08', 0, 'exact', 'BOOT, H'),
    E('gravity', 'bostrom', 'ATOM', 'swap', '≥ 71.88 ATOM', 627, '—', '2023-09 … 2024-08', 0, 'derived', 'ATOM'),
    E('bostrom', 'hub', 'ATOM', 'transfer', '71.881632 ATOM', 627, 22, '2023-09-26 … 2024-08-27', 0, 'exact', '71.88 ATOM'),
    E('hub', 'osmo', 'ATOM', 'transfer', '69.50 ATOM', 608, 21, '2023-09-26 … 2024-04-10', 0, 'exact', '69.50 ATOM'),
    E('osmo', 'pools', 'ATOM', 'swap', '61.38 ATOM', 530, 15, '2023-09-26 … 2023-12-27', 0, 'exact', '61.38 ATOM'),
    E('pools', 'osmo', 'ETH', 'swap', '0.27411194 axlWETH', 517, 15, '2023-09-26 … 2023-12-27', 0, 'exact', '0.274 ETH'),
    E('osmo', 'levana', 'ETH', 'deposit', '0.692319 axlWETH', 1381, 10, '2023-09-26 … 2023-12-05', 0, 'exact', '0.692 in'),
    E('levana', 'osmo', 'ETH', 'withdraw', '0.69231905 + yield 0.00023598 axlWETH', 1438, 8, '2023-09-30 … 2023-12-12', 0, 'exact', '0.693 out'),
    E('osmo', 'neutron', 'ETH', 'transfer', '0.11566675 axlWETH', 181, 1, '2023-10-10', 1, 'exact', '0.1157'),
    E('neutron', 'osmo', 'ETH', 'transfer', '0.11683505 axlWETH', 212, 1, '2023-10-31', 1, 'exact', '0.1168'),
    E('osmo', 'kujira', 'ETH', 'transfer', '0.27551622 axlWETH', 686, 1, '2024-01-19', 4, 'exact', '0.2755 ETH'),
    E('kujira', 'axelar', 'ETH', 'bridge', '0.27669243 axlWETH', 632, 1, '2024-01-31', 4, 'exact', '0.2767 ETH'),
    E('axelar', 'axfee', 'ETH', 'fee', '0.025062 ETH', 57, 1, '2024-01-31', 4, 'exact', '0.0251'),
    E('axelar', 'eth', 'ETH', 'bridge', '0.25163043 ETH', 575, 1, '2024-01-31', 4, 'exact', '0.2516 ETH'),
    E('eth', 'jb', 'ETH', 'payment', '0.245 ETH → 245 000 project tokens', 560, 1, '2024-01-31', 4, 'exact', '0.245 ETH'),
    // crowdsale
    E('crowd', 'jb', 'ETH', 'payment', '96.92122755 ETH', 224847, 226, '2024-01-30 … 2024-02-01', 4, 'exact', '96.92 ETH', { crowd: true }),
    E('c6de', 'jb', 'ETH', 'payment', '10 ETH', 23462, 1, '2024-01-30', 4, 'exact', '10 ETH', { crowd: true }),
    E('jb', 'jbfee', 'ETH', 'fee', '2.62844457 ETH', 6108, 6, '2024-01-30 … 2024-02-01', 4, 'exact', '2.63 ETH', { crowd: true }),
    E('jb', 'owner', 'ETH', 'payout', '105.13778298 ETH (after 2.5 %)', 244325, 6, '2024-01-30 … 2024-02-01', 4, 'exact', '105.14 ETH', { crowd: true }),
    E('owner', 'c6de', 'ETH', 'refund', '10 ETH', 23034, 1, '2024-02-01', 5, 'exact', '10 ETH back', { crowd: true }),
    E('owner', 'team', 'ETH', 'transfer', '47.41685 ETH', 110289, 2, '2024-01-30 … 2024-02-01', 4, 'exact', '47.42 ETH', { crowd: true }),
    E('owner', 'binance', 'ETH', 'transfer', '49.142107 ETH via 0xe5ca…ab96', 114447, 4, '2024-01-30 … 2024-02-07', 4, 'exact', '49.14 ETH', { crowd: true }),
    E('team', 'binance', 'ETH', 'transfer', '47.37678 ETH via 0x054c…1459', 110286, 2, '2024-01-30 … 2024-02-02', 4, 'exact', '47.38 ETH', { crowd: true }),
    E('team', 'dist', 'OCTRA', 'distribution', '4 516 635.21 wOCT', 103135, 1, '2026-04-22', 31, 'exact', '4.52 M OCT', { crowd: true }),
    E('dist', 'crowd', 'OCTRA', 'distribution', '4 505 186.30 wOCT, 206 addresses', 102874, 206, '2026-04-22', 31, 'exact', '4.51 M OCT', { crowd: true }),
    E('dist', 'eth', 'OCTRA', 'distribution', '11 448.90771 OCTRA', 261, 1, '2026-04-22', 31, 'exact', '11 449 OCT'),
    // noise
    E('owner', 'poison', 'ETH', 'noise', 'fake «ЕTН» 25 and 22.4', null, 2, '2024-01-30 … 2024-02-01', 4, 'exact', 'fake ЕTН', { crowd: true, noise: true }),
  ];

  const GROUPS = {
    church:   { color: '#2c5d8f', label: 'Church' },
    protocol: { color: '#3f7a55', label: 'protocol / pool / bridge' },
    external: { color: '#9a6a1c', label: 'known external' },
    unknown:  { color: '#7c838b', label: 'unknown' },
    exchange: { color: '#a33d36', label: 'exchange' },
    fee:      { color: '#a9afb6', label: 'fee' },
    noise:    { color: '#c2410c', label: 'noise' },
  };
  const ASSETS = {
    ATOM:  { color: '#6c58b5', label: 'ATOM' },
    ETH:   { color: '#3d4a5c', label: 'ETH' },
    OCTRA: { color: '#138a8a', label: 'OCTRA' },
    BOOT:  { color: '#8a5a2b', label: 'BOOT' },
    noise: { color: '#c2410c', label: 'address poisoning' },
  };
  const OWNER_HULL = [{ id: 'owner', label: 'one key uvkv59… on five networks', members: n => n.cluster, color: '#2c5d8f' }];

  const state = { crowd: false, noise: false };
  const panel = document.getElementById('graph-flow-octra-panel');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  function renderPanel({ node, link } = {}) {
    if (!panel) return;
    const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
    if (node) {
      const ins = links.filter(l => l.to === node.id).map(l => `${esc(byId[l.from].label)} — ${esc(l.amount)}`);
      const outs = links.filter(l => l.from === node.id).map(l => `${esc(byId[l.to].label)} — ${esc(l.amount)}`);
      panel.innerHTML = `<p class="caption">${esc(GROUPS[node.group]?.label ?? node.group)} · ${esc(node.net)}</p>
        <h4>${esc(node.label)}</h4>
        <dl>${node.addr ? row('Address', `<code>${esc(node.addr)}</code>`) : ''}${row('Incoming', ins.join('<br>') || '—')}${row('Outgoing', outs.join('<br>') || '—')}</dl>
        ${node.note ? `<p>${esc(node.note)}</p>` : ''}`;
    } else if (link) {
      panel.innerHTML = `<p class="caption">${esc(link.kind)} · ${esc(link.asset)}</p>
        <h4>${esc(byId[link.source].label)} → ${esc(byId[link.target].label)}</h4>
        <dl>${row('Amount', esc(link.amount))}${row('In USD', link.value == null ? 'not valued' : '≈ ' + link.value.toLocaleString('en-US'))}${row('Transfers', esc(link.count))}${row('Period', esc(link.period))}${row('Basis', link.basis === 'derived' ? 'derived (block events)' : 'chain transactions')}</dl>`;
    } else {
      panel.innerHTML = `<p class="caption">Hint</p><h4>Nothing selected</h4>
        <p>Select a node to see its address and flows, or a tie to see amount, USD, transfers and period.</p>`;
    }
  }

  const graph = new RareCharts.Graph('#graph-flow-octra', {
    view: 'flow',
    height: 780,
    minWidth: 1180,
    title: 'The road to Octra',
    subtitle: 'The Church’s money on its way to Octra, and where the crowdsale money went',
    source: 'Public on-chain data; trace by the data project, 2026-10-07',
    lanes,
    laneBy: 'net',
    nodeGroups: GROUPS,
    nodeShapes: { wallet: 'circle', contract: 'square', exchange: 'diamond', crowd: 'stack' },
    linkColorBy: l => (l.kind === 'noise' ? 'noise' : l.asset),
    linkTypes: ASSETS,
    linkWidth: { by: 'value', scale: 'sqrt', min: 1.6, max: 22 },
    linkDash: l => l.basis === 'derived' || l.kind === 'noise',
    hulls: OWNER_HULL,
    onSelect: renderPanel,
  }).setData({ nodes, links });

  const applyFilter = () => graph.setFilter(item =>
    (state.crowd || !item.crowd) && (state.noise || !item.noise));
  applyFilter();
  renderPanel();

  const on = (id, fn) => document.getElementById(id)?.addEventListener('change', e => fn(e.target));
  on('flow-opt-crowd', t => { state.crowd = t.checked; applyFilter(); });
  on('flow-opt-noise', t => {
    state.noise = t.checked;
    if (state.noise && !state.crowd) {
      state.crowd = true;
      document.getElementById('flow-opt-crowd').checked = true;
    }
    applyFilter();
  });
  on('flow-opt-cluster', t => graph.setHulls(t.checked ? OWNER_HULL : []));
  on('flow-opt-labels', t => graph.setLinkLabels(t.checked));
  const range = document.getElementById('flow-opt-time');
  const out = document.getElementById('flow-opt-time-out');
  range?.addEventListener('input', () => {
    const m = MONTHS[+range.value];
    out.textContent = m;
    graph.setTimeWindow(null, +range.value === MONTHS.length - 1 ? null : m);
  });
})();
