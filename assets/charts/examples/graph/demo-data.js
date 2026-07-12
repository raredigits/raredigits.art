// RareCharts demo — synthetic "world of Peter Thiel" network (~300 nodes).
// Simulates what a graph database would hold: a curated, real first circle
// around Thiel plus procedurally generated (fictional) outer communities —
// portfolio startups, Asian and European funds, a crypto cluster, politics.
//
// Deterministic: seeded PRNG, so every page load (and screenshot) is identical.
// Deliberately planted routes for the path demo:
//   thiel → Founders Fund → SEA Growth Fund      → Jakarta Sovereign Fund
//   thiel → Mithril       → Straits Capital      → Jakarta Sovereign Fund
//   thiel → Reid Hoffman  → Zurich Deep Tech Fund → Alpine Robotics
//
// Exposes window.RareGraphDemo = { data: { nodes, links } }.

(function () {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260703);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const weight = () => +(0.3 + rand() * 0.6).toFixed(2);

  const nodes = [];
  const links = [];
  const ids = new Set();

  function addNode(n) {
    if (ids.has(n.id)) return n.id;
    ids.add(n.id);
    nodes.push(n);
    return n.id;
  }
  function addLink(source, target, type, w) {
    if (source === target) return;
    links.push({ source, target, type, weight: w ?? weight() });
  }

  // ─── Curated core: Thiel's real first and second circle ────────────────────

  [
    { id: 'thiel',      label: 'Peter Thiel',       group: 'person',    size: 3   },
    { id: 'musk',       label: 'Elon Musk',         group: 'person',    size: 2.5 },
    { id: 'levchin',    label: 'Max Levchin',       group: 'person',    size: 1.5 },
    { id: 'hoffman',    label: 'Reid Hoffman',      group: 'person',    size: 1.8 },
    { id: 'sacks',      label: 'David Sacks',       group: 'person',    size: 1.5 },
    { id: 'rabois',     label: 'Keith Rabois',      group: 'person',    size: 1.3 },
    { id: 'masters',    label: 'Blake Masters',     group: 'person',    size: 1.2 },
    { id: 'karp',       label: 'Alex Karp',         group: 'person',    size: 1.5 },
    { id: 'zuck',       label: 'Mark Zuckerberg',   group: 'person',    size: 2   },
    { id: 'girard',     label: 'René Girard',       group: 'person',    size: 1   },
    { id: 'partner',    label: 'Matt Danzeisen',    group: 'person',    size: 1   },
    { id: 'palantir',   label: 'Palantir',          group: 'company',   size: 2   },
    { id: 'spacex',     label: 'SpaceX',            group: 'company',   size: 1.8 },
    { id: 'meta',       label: 'Meta',              group: 'company',   size: 1.8 },
    { id: 'stripe',     label: 'Stripe',            group: 'company',   size: 1.5 },
    { id: 'airbnb',     label: 'Airbnb',            group: 'company',   size: 1.2 },
    { id: 'anduril',    label: 'Anduril',           group: 'company',   size: 1.3 },
    { id: 'ff',         label: 'Founders Fund',     group: 'fund',      size: 2   },
    { id: 'msif',       label: 'Mithril Capital',   group: 'fund',      size: 1.2 },
    { id: 'tsf',        label: 'Thiel Foundation',  group: 'org',       size: 1.3 },
    { id: 'fellowship', label: 'Thiel Fellowship',  group: 'org',       size: 1.2 },
    { id: 'stanford',   label: 'Stanford',          group: 'education', size: 1.5 },
    { id: 'trump',      label: 'Donald Trump',      group: 'politics',  size: 2.5 },
    { id: 'vance',      label: 'J.D. Vance',        group: 'politics',  size: 1.5 },
  ].forEach(addNode);

  [
    ['thiel', 'musk',       'professional', 0.9],
    ['thiel', 'levchin',    'professional', 0.9],
    ['thiel', 'hoffman',    'professional', 0.8],
    ['thiel', 'sacks',      'professional', 0.8],
    ['thiel', 'rabois',     'professional', 0.7],
    ['thiel', 'masters',    'professional', 0.8],
    ['thiel', 'karp',       'friendship',   0.6],
    ['thiel', 'zuck',       'professional', 0.7],
    ['thiel', 'girard',     'education',    0.7],
    ['thiel', 'partner',    'family',       0.9],
    ['thiel', 'palantir',   'investment',   0.9],
    ['thiel', 'meta',       'investment',   0.8],
    ['thiel', 'ff',         'investment',   0.9],
    ['thiel', 'msif',       'investment',   0.7],
    ['thiel', 'tsf',        'philanthropy', 0.8],
    ['thiel', 'fellowship', 'philanthropy', 0.8],
    ['thiel', 'stanford',   'education',    0.7],
    ['thiel', 'trump',      'professional', 0.8],
    ['thiel', 'vance',      'professional', 0.9],
    ['karp',  'palantir',   'professional', 0.9],
    ['karp',  'stanford',   'education',    0.6],
    ['zuck',  'meta',       'professional', 0.9],
    ['musk',  'spacex',     'professional', 0.9],
    ['musk',  'trump',      'professional', 0.8],
    ['girard','stanford',   'professional', 0.6],
    ['ff',    'spacex',     'investment',   0.7],
    ['ff',    'stripe',     'investment',   0.7],
    ['ff',    'airbnb',     'investment',   0.6],
    ['ff',    'anduril',    'investment',   0.7],
    ['hoffman','meta',      'investment',   0.5],
    ['hoffman','stripe',    'investment',   0.5],
    ['rabois','stripe',     'professional', 0.6],
    ['sacks', 'ff',         'investment',   0.4],
    ['sacks', 'trump',      'professional', 0.6],
    ['masters','trump',     'professional', 0.6],
    ['trump', 'vance',      'professional', 0.9],
  ].forEach(([s, t, type, w]) => addLink(s, t, type, w));

  // ─── Fictional name generators ──────────────────────────────────────────────

  const FIRST = ['Anna', 'Marc', 'Priya', 'Chen', 'Lukas', 'Sofia', 'Ivan', 'Maya',
    'Tomas', 'Elena', 'Raj', 'Nina', 'Omar', 'Kai', 'Lena', 'Jonas', 'Aisha', 'Diego'];
  const LAST = ['Berg', 'Tanaka', 'Silva', 'Novak', 'Haas', 'Okafor', 'Lind', 'Mercer',
    'Vogel', 'Aris', 'Kade', 'Moreau', 'Stein', 'Barros', 'Iyer', '康', 'Widodo', 'Larsen'];
  const FUND_A = ['Meridian', 'Northgate', 'Quantara', 'Helios', 'Verdant', 'Bluepeak',
    'Ironwood', 'Silverline', 'Crescent', 'Halcyon', 'Pacific Rim', 'Sunda', 'Mekong', 'Baltic'];
  const FUND_B = ['Capital', 'Partners', 'Ventures', 'Fund', 'Holdings', 'Group'];
  const CO_A = ['Nimbus', 'Vertex', 'Quanta', 'Orbital', 'Lumen', 'Cobalt', 'Atlas',
    'Nova', 'Echo', 'Pulse', 'Glacier', 'Krypton', 'Argon', 'Delta'];
  const CO_B = ['Labs', 'AI', 'Robotics', 'Systems', 'Bio', 'Works', 'Dynamics', 'Analytics'];

  const person  = () => `${pick(FIRST)} ${pick(LAST)}`;
  const fund    = () => `${pick(FUND_A)} ${pick(FUND_B)}`;
  const startup = () => `${pick(CO_A)} ${pick(CO_B)}`;
  const wallet  = () => '0x' + Array.from({ length: 8 },
    () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('') + '…';

  // ─── Procedural communities ─────────────────────────────────────────────────
  // Each community: a hub bridged to the curated core, plus members hanging off
  // the hub (with a few intra-community cross-links so clusters feel organic).

  function community({ key, hub, bridges, count, makeLabel, group, type }) {
    const hubId = addNode({ id: `${key}-hub`, label: hub.label, group: hub.group, size: 1.6 });
    bridges.forEach(([b, t, w]) => addLink(b, hubId, t, w));

    const members = [];
    for (let i = 0; i < count; i++) {
      const id = addNode({ id: `${key}-${i}`, label: makeLabel(), group, size: 0.8 + rand() * 0.6 });
      members.push(id);
      // attach to the hub or to an earlier member — trees with occasional depth
      const parent = rand() < 0.6 || !members.length ? hubId : pick(members);
      addLink(id, parent === id ? hubId : parent, type);
    }
    // a few cross-links inside the community
    for (let i = 0; i < count * 0.25; i++) {
      addLink(pick(members), pick(members), type);
    }
    return { hubId, members };
  }

  // US portfolio startups around Founders Fund
  community({
    key: 'usco', count: 55,
    hub: { label: 'FF Portfolio', group: 'fund' },
    bridges: [['ff', 'investment', 0.8]],
    makeLabel: startup, group: 'company', type: 'investment',
  });

  // Southeast Asia funds — the deliberate Jakarta route
  const sea = community({
    key: 'asia', count: 50,
    hub: { label: 'SEA Growth Fund', group: 'fund' },
    bridges: [['ff', 'investment', 0.7]],
    makeLabel: fund, group: 'fund', type: 'investment',
  });
  const jakarta = addNode({ id: 'jakarta-fund', label: 'Jakarta Sovereign Fund', group: 'fund', size: 1.6 });
  addLink(sea.hubId, jakarta, 'investment', 0.8);
  // second and third edge-disjoint routes for the k-paths demo — both one
  // hop longer than the Founders Fund route, so "shortest" means something
  const straits = addNode({ id: 'straits', label: 'Straits Capital', group: 'fund', size: 1.2 });
  const harbour = addNode({ id: 'harbour', label: 'Harbour Front Capital', group: 'fund', size: 1 });
  addLink('msif', harbour, 'investment', 0.7);
  addLink(harbour, straits, 'investment', 0.7);
  addLink(straits, jakarta, 'investment', 0.7);
  const pbp = addNode({ id: 'pbp', label: 'Pacific Bridge Partners', group: 'fund', size: 1.2 });
  const nusantara = addNode({ id: 'nusantara', label: 'Nusantara Holdings', group: 'fund', size: 1 });
  addLink('hoffman', pbp, 'investment', 0.6);
  addLink(pbp, nusantara, 'investment', 0.6);
  addLink(nusantara, jakarta, 'investment', 0.6);
  // extra ties so Jakarta reads as well-connected in the path view
  addLink(jakarta, pick(sea.members), 'investment');
  addLink(jakarta, pick(sea.members), 'investment');
  addLink(jakarta, pick(sea.members), 'investment');

  // European deep tech — the Swiss startup route
  const eu = community({
    key: 'eu', count: 45,
    hub: { label: 'Zurich Deep Tech Fund', group: 'fund' },
    bridges: [['hoffman', 'investment', 0.6]],
    makeLabel: startup, group: 'company', type: 'investment',
  });
  const alpine = addNode({ id: 'alpine', label: 'Alpine Robotics', group: 'company', size: 1.4 });
  addLink(eu.hubId, alpine, 'investment', 0.8);

  // Crypto cluster — wallets and protocols
  community({
    key: 'crypto', count: 45,
    hub: { label: 'Pacific Digital Assets', group: 'crypto' },
    bridges: [['ff', 'investment', 0.5], ['musk', 'professional', 0.4]],
    makeLabel: wallet, group: 'crypto', type: 'investment',
  });

  // Political and media orbit
  community({
    key: 'pol', count: 40,
    hub: { label: 'Beltway Network', group: 'politics' },
    bridges: [['trump', 'professional', 0.7], ['vance', 'professional', 0.6]],
    makeLabel: person, group: 'politics', type: 'professional',
  });

  // Academic circle around Stanford
  community({
    key: 'edu', count: 30,
    hub: { label: 'Hoover Circle', group: 'education' },
    bridges: [['stanford', 'professional', 0.6], ['girard', 'education', 0.5]],
    makeLabel: person, group: 'education', type: 'education',
  });

  window.RareGraphDemo = { data: { nodes, links } };
})();
