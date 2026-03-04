(function () {
  const { Graph, linkPresets } = RareCharts;

  const data = {
    nodes: [
      { id: 'thiel',      label: 'Peter Thiel',        group: 'person',    size: 3   },

      // PayPal Mafia
      { id: 'musk',       label: 'Elon Musk',          group: 'person',    size: 2.5 },
      { id: 'levchin',    label: 'Max Levchin',        group: 'person',    size: 1.5 },
      { id: 'hoffman',    label: 'Reid Hoffman',       group: 'person',    size: 1.8 },
      { id: 'sacks',      label: 'David Sacks',        group: 'person',    size: 1.5 },
      { id: 'rabois',     label: 'Keith Rabois',       group: 'person',    size: 1.3 },
      { id: 'masters',    label: 'Blake Masters',      group: 'person',    size: 1.2 },

      // Companies
      { id: 'palantir',   label: 'Palantir',           group: 'company',   size: 2   },
      { id: 'spacex',     label: 'SpaceX',             group: 'company',   size: 1.8 },
      { id: 'meta',       label: 'Meta',               group: 'company',   size: 1.8 },
      { id: 'stripe',     label: 'Stripe',             group: 'company',   size: 1.5 },
      { id: 'airbnb',     label: 'Airbnb',             group: 'company',   size: 1.2 },
      { id: 'anduril',    label: 'Anduril',            group: 'company',   size: 1.3 },
      { id: 'lyft',       label: 'Lyft',               group: 'company',   size: 1.1 },

      // Funds / orgs
      { id: 'ff',         label: 'Founders Fund',      group: 'fund',      size: 2   },
      { id: 'tsf',        label: 'Thiel Foundation',   group: 'org',       size: 1.3 },
      { id: 'fellowship', label: 'Thiel Fellowship',   group: 'org',       size: 1.2 },
      { id: 'seasteading',label: 'Seasteading Inst.',  group: 'org',       size: 1   },
      { id: 'msif',       label: 'Mithril Capital',    group: 'fund',      size: 1.2 },

      // People
      { id: 'karp',       label: 'Alex Karp',          group: 'person',    size: 1.5 },
      { id: 'zuck',       label: 'Mark Zuckerberg',    group: 'person',    size: 2   },
      { id: 'girard',     label: 'René Girard',        group: 'person',    size: 1   },

      // Politics
      { id: 'trump',      label: 'Donald Trump',       group: 'politics',  size: 2.5 },
      { id: 'vance',      label: 'J.D. Vance',         group: 'politics',  size: 1.5 },
      { id: 'doge',       label: 'DOGE',               group: 'politics',  size: 1.5 },

      // Education
      { id: 'stanford',   label: 'Stanford',           group: 'education', size: 1.5 },

      // Family
      { id: 'partner',    label: 'Matt Danzeisen',     group: 'person',    size: 1   },
    ],

    links: [
      // PayPal
      { source: 'thiel',    target: 'musk',      type: 'professional', strength: 0.9 },
      { source: 'thiel',    target: 'levchin',   type: 'professional', strength: 0.9 },
      { source: 'thiel',    target: 'hoffman',   type: 'professional', strength: 0.8 },
      { source: 'thiel',    target: 'sacks',     type: 'professional', strength: 0.8 },
      { source: 'thiel',    target: 'rabois',    type: 'professional', strength: 0.7 },
      { source: 'thiel',    target: 'masters',   type: 'professional', strength: 0.8 },

      // Palantir
      { source: 'thiel',    target: 'palantir',  type: 'investment',   strength: 0.9 },
      { source: 'karp',     target: 'palantir',  type: 'professional', strength: 0.9 },
      { source: 'thiel',    target: 'karp',      type: 'friendship',   strength: 0.6 },

      // Founders Fund
      { source: 'thiel',    target: 'ff',        type: 'investment',   strength: 0.9 },
      { source: 'ff',       target: 'spacex',    type: 'investment',   strength: 0.7 },
      { source: 'ff',       target: 'airbnb',    type: 'investment',   strength: 0.6 },
      { source: 'ff',       target: 'stripe',    type: 'investment',   strength: 0.7 },
      { source: 'ff',       target: 'lyft',      type: 'investment',   strength: 0.5 },
      { source: 'ff',       target: 'anduril',   type: 'investment',   strength: 0.7 },
      { source: 'musk',     target: 'spacex',    type: 'professional', strength: 0.9 },
      { source: 'sacks',    target: 'ff',        type: 'investment',   strength: 0.4 },

      // Meta
      { source: 'thiel',    target: 'meta',      type: 'investment',   strength: 0.8 },
      { source: 'zuck',     target: 'meta',      type: 'professional', strength: 0.9 },
      { source: 'thiel',    target: 'zuck',      type: 'professional', strength: 0.7 },
      { source: 'hoffman',  target: 'meta',      type: 'investment',   strength: 0.5 },
      { source: 'hoffman',  target: 'stripe',    type: 'investment',   strength: 0.5 },
      { source: 'rabois',   target: 'stripe',    type: 'professional', strength: 0.6 },

      // Stanford / education
      { source: 'thiel',    target: 'stanford',  type: 'education',    strength: 0.7 },
      { source: 'karp',     target: 'stanford',  type: 'education',    strength: 0.6 },
      { source: 'thiel',    target: 'girard',    type: 'education',    strength: 0.7 },
      { source: 'girard',   target: 'stanford',  type: 'professional', strength: 0.6 },

      // Politics
      { source: 'thiel',    target: 'trump',     type: 'professional', strength: 0.8 },
      { source: 'thiel',    target: 'vance',     type: 'professional', strength: 0.9 },
      { source: 'masters',  target: 'trump',     type: 'professional', strength: 0.6 },
      { source: 'trump',    target: 'vance',     type: 'professional', strength: 0.9 },
      { source: 'musk',     target: 'trump',     type: 'professional', strength: 0.8 },
      { source: 'musk',     target: 'doge',      type: 'professional', strength: 0.9 },
      { source: 'trump',    target: 'doge',      type: 'professional', strength: 0.9 },
      { source: 'sacks',    target: 'trump',     type: 'professional', strength: 0.6 },

      // Philanthropy
      { source: 'thiel',    target: 'tsf',       type: 'philanthropy', strength: 0.8 },
      { source: 'thiel',    target: 'fellowship',type: 'philanthropy', strength: 0.8 },
      { source: 'thiel',    target: 'seasteading',type:'philanthropy', strength: 0.6 },
      { source: 'thiel',    target: 'msif',      type: 'investment',   strength: 0.7 },

      // Family
      { source: 'thiel',    target: 'partner',   type: 'family',       strength: 0.9 },
    ],
  };

  new Graph('#thiel-graph', {
    title:    'Peter Thiel — Network of Influence',
    subtitle: 'Professional, investment, political, educational and family connections',
    source:   'Source: Public records, press reports',
    height:   600,
    linkTypes: linkPresets.personal,

    nodeRadius:     18,
    linkDistance:   110,
    chargeStrength: -680,

    tooltipFormat: ({ node, links }) => {
      const COLORS = {
        professional: '#00aaff', family: '#00c97a', friendship: '#ffcc00',
        investment:   '#ff6200', philanthropy: '#cc44ff', education: '#aaaaaa',
      };

      // Count connections per type
      const counts = {};
      links.forEach(l => {
        const type = l.type ?? 'professional';
        counts[type] = (counts[type] ?? 0) + 1;
      });

      const rows = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, n]) =>
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:2px">
            <span style="color:${COLORS[type] ?? '#888'}">${type}</span>
            <span style="font-weight:600">${n}</span>
           </div>`
        ).join('');

      const groupLabel = node.group
        ? `<div style="color:#888;font-size:10px;text-transform:uppercase;
                       letter-spacing:0.07em;margin-bottom:6px">${node.group}</div>`
        : '';

      const total = links.length;

      return `
        <div style="font-weight:bold;font-size:13px;margin-bottom:2px">${node.label}</div>
        ${groupLabel}
        <div style="color:#888;font-size:11px;margin-bottom:6px">
          ${total} connection${total !== 1 ? 's' : ''}
        </div>
        ${rows}
      `;
    },
  }).setData(data);

})();
