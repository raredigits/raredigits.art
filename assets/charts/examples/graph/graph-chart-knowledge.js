/**
 * RareCharts — Knowledge Graph Demo
 * Граф понятий теории систем (Systems Thinking).
 * Использует linkPresets.knowledge — без кастомных стилей.
 */

(function () {
  const { Graph, linkPresets } = RareCharts;

  const data = {
    nodes: [

      // ── Core ──
      { id: 'system',       label: 'System',              group: 'core',      size: 3   },
      { id: 'feedback',     label: 'Feedback Loop',       group: 'core',      size: 2.5 },
      { id: 'emergence',    label: 'Emergence',           group: 'core',      size: 2   },
      { id: 'complexity',   label: 'Complexity',          group: 'core',      size: 2   },

      // ── Feedback types ──
      { id: 'reinforcing',  label: 'Reinforcing Loop',    group: 'dynamics',  size: 1.8 },
      { id: 'balancing',    label: 'Balancing Loop',      group: 'dynamics',  size: 1.8 },
      { id: 'delay',        label: 'Delay',               group: 'dynamics',  size: 1.3 },
      { id: 'oscillation',  label: 'Oscillation',         group: 'dynamics',  size: 1.3 },
      { id: 'overshoot',    label: 'Overshoot',           group: 'dynamics',  size: 1.2 },
      { id: 'collapse',     label: 'Collapse',            group: 'dynamics',  size: 1.2 },

      // ── Structure ──
      { id: 'stock',        label: 'Stock',               group: 'structure', size: 1.5 },
      { id: 'flow',         label: 'Flow',                group: 'structure', size: 1.5 },
      { id: 'leverage',     label: 'Leverage Point',      group: 'structure', size: 1.5 },
      { id: 'boundary',     label: 'System Boundary',     group: 'structure', size: 1.2 },
      { id: 'hierarchy',    label: 'Hierarchy',           group: 'structure', size: 1.3 },

      // ── Behaviours ──
      { id: 'resilience',   label: 'Resilience',          group: 'behaviour', size: 1.5 },
      { id: 'selforg',      label: 'Self-organisation',   group: 'behaviour', size: 1.5 },
      { id: 'adaptation',   label: 'Adaptation',          group: 'behaviour', size: 1.3 },
      { id: 'traps',        label: 'System Traps',        group: 'behaviour', size: 1.3 },
      { id: 'drift',        label: 'Policy Resistance',   group: 'behaviour', size: 1.2 },

      // ── Mental models ──
      { id: 'mental',       label: 'Mental Models',       group: 'meta',      size: 1.5 },
      { id: 'nonlinear',    label: 'Non-linearity',       group: 'meta',      size: 1.3 },
      { id: 'unintended',   label: 'Unintended Consequences', group: 'meta', size: 1.3 },
      { id: 'goals',        label: 'Goals',               group: 'meta',      size: 1.2 },
    ],

    links: [

      // System → foundations
      { source: 'system',      target: 'feedback',    type: 'partOf',       strength: 0.9 },
      { source: 'system',      target: 'stock',       type: 'partOf',       strength: 0.8 },
      { source: 'system',      target: 'flow',        type: 'partOf',       strength: 0.8 },
      { source: 'system',      target: 'boundary',    type: 'partOf',       strength: 0.7 },
      { source: 'system',      target: 'emergence',   type: 'causes',       strength: 0.8 },
      { source: 'system',      target: 'complexity',  type: 'causes',       strength: 0.7 },
      { source: 'system',      target: 'hierarchy',   type: 'partOf',       strength: 0.6 },

      // Feedback types
      { source: 'feedback',    target: 'reinforcing', type: 'partOf',       strength: 0.9 },
      { source: 'feedback',    target: 'balancing',   type: 'partOf',       strength: 0.9 },
      { source: 'feedback',    target: 'delay',       type: 'partOf',       strength: 0.7 },

      // Dynamics
      { source: 'reinforcing', target: 'overshoot',   type: 'causes',       strength: 0.7 },
      { source: 'reinforcing', target: 'collapse',    type: 'causes',       strength: 0.6 },
      { source: 'balancing',   target: 'oscillation', type: 'causes',       strength: 0.7 },
      { source: 'delay',       target: 'oscillation', type: 'causes',       strength: 0.8 },
      { source: 'delay',       target: 'overshoot',   type: 'causes',       strength: 0.7 },
      { source: 'overshoot',   target: 'collapse',    type: 'causes',       strength: 0.8 },

      // Stock & flow
      { source: 'stock',       target: 'flow',        type: 'related',      strength: 0.9 },
      { source: 'flow',        target: 'feedback',    type: 'related',      strength: 0.7 },
      { source: 'stock',       target: 'resilience',  type: 'causes',       strength: 0.6 },

      // Leverage
      { source: 'leverage',    target: 'goals',       type: 'example',      strength: 0.7 },
      { source: 'leverage',    target: 'feedback',    type: 'example',      strength: 0.7 },
      { source: 'leverage',    target: 'mental',      type: 'example',      strength: 0.8 },
      { source: 'leverage',    target: 'selforg',     type: 'example',      strength: 0.6 },

      // Behaviours
      { source: 'complexity',  target: 'emergence',   type: 'causes',       strength: 0.8 },
      { source: 'complexity',  target: 'nonlinear',   type: 'causes',       strength: 0.8 },
      { source: 'complexity',  target: 'unintended',  type: 'causes',       strength: 0.7 },
      { source: 'emergence',   target: 'selforg',     type: 'related',      strength: 0.7 },
      { source: 'selforg',     target: 'adaptation',  type: 'related',      strength: 0.7 },
      { source: 'adaptation',  target: 'resilience',  type: 'causes',       strength: 0.7 },
      { source: 'resilience',  target: 'traps',       type: 'contradicts',  strength: 0.6 },
      { source: 'traps',       target: 'drift',       type: 'related',      strength: 0.7 },
      { source: 'drift',       target: 'unintended',  type: 'causes',       strength: 0.7 },
      { source: 'unintended',  target: 'traps',       type: 'causes',       strength: 0.6 },

      // Mental models
      { source: 'mental',      target: 'goals',       type: 'partOf',       strength: 0.7 },
      { source: 'mental',      target: 'nonlinear',   type: 'prerequisite', strength: 0.6 },
      { source: 'nonlinear',   target: 'unintended',  type: 'causes',       strength: 0.7 },
      { source: 'goals',       target: 'leverage',    type: 'related',      strength: 0.6 },
      { source: 'hierarchy',   target: 'boundary',    type: 'related',      strength: 0.6 },
    ],
  };

  new Graph('#knowledge-graph', {
    title:    'Systems Thinking',
    subtitle: 'Core concepts and their relationships',
    source:   'Source: Meadows, D. — Thinking in Systems (2008)',
    height:   580,
    linkTypes: linkPresets.knowledge,

    nodeRadius:     18,
    linkDistance:   115,
    chargeStrength: -620,
  }).setData(data);

})();
