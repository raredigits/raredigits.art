// RareCharts — Graph Link Presets
// Ready-made collections of link types for common graph use cases.
//
// Usage:
//   import { linkPresets } from '../core/linkPresets.js';
//   new Graph('#el', { linkTypes: linkPresets.personal })
//
// Or mix presets with overrides:
//   new Graph('#el', {
//     linkTypes: {
//       ...linkPresets.knowledge,
//       contradicts: { color: '#ff3b5c', dash: '2,3', label: 'Contradicts' },
//     }
//   })
//
// Each entry: { color, dash, label }
//   color — stroke color
//   dash  — SVG stroke-dasharray string or null for solid
//   label — shown in legend

// ─── Personal / social connections ───────────────────────────────────────────

export const personal = {
  professional: { color: '#00aaff', dash: null,  label: 'Professional' },
  family:       { color: '#00c97a', dash: null,  label: 'Family'       },
  friendship:   { color: '#ffcc00', dash: '5,4', label: 'Friendship'   },
  investment:   { color: '#ff6200', dash: null,  label: 'Investment'   },
  philanthropy: { color: '#cc44ff', dash: '2,4', label: 'Philanthropy' },
  education:    { color: '#aaaaaa', dash: '8,4', label: 'Education'    },
};

// ─── Knowledge graph ──────────────────────────────────────────────────────────
// Concepts, topics, ideas and their relationships.

export const knowledge = {
  partOf:       { color: '#00c97a', dash: null,  label: 'Part of'      },
  causes:       { color: '#333333', dash: null,  label: 'causes'       },
  related:      { color: '#00aaff', dash: '5,4', label: 'Related'      },
  example:      { color: '#ffcc00', dash: '2,4', label: 'Example'      },
  contradicts:  { color: '#ff3b5c', dash: '3,3', label: 'Contradicts'  },
  prerequisite: { color: '#ff6200', dash: null,  label: 'Prerequisite' },
  extends:      { color: '#cc44ff', dash: null,  label: 'Extends'      },
};

// ─── Org / corporate structure ────────────────────────────────────────────────
// Companies, subsidiaries, investors, board members.

export const org = {
  subsidiary:   { color: '#00aaff', dash: null,  label: 'Subsidiary'   },
  investment:   { color: '#ff6200', dash: null,  label: 'Investment'   },
  board:        { color: '#00c97a', dash: '5,4', label: 'Board member' },
  partnership:  { color: '#ffcc00', dash: null,  label: 'Partnership'  },
  acquisition:  { color: '#cc44ff', dash: null,  label: 'Acquisition'  },
  competitor:   { color: '#ff3b5c', dash: '3,3', label: 'Competitor'   },
};

// ─── Tech / system dependencies ───────────────────────────────────────────────
// Microservices, modules, APIs, data flows.

export const tech = {
  depends:      { color: '#00aaff', dash: null,  label: 'Depends on'   },
  calls:        { color: '#ff6200', dash: null,  label: 'Calls'        },
  dataFlow:     { color: '#00c97a', dash: '5,4', label: 'Data flow'    },
  inherits:     { color: '#cc44ff', dash: null,  label: 'Inherits'     },
  optional:     { color: '#aaaaaa', dash: '3,3', label: 'Optional dep' },
};

// ─── Influence / causal ───────────────────────────────────────────────────────
// Ideas, decisions, events — cause and effect.

export const causal = {
  causes:       { color: '#ff6200', dash: null,  label: 'Causes'       },
  enables:      { color: '#00c97a', dash: null,  label: 'Enables'      },
  blocks:       { color: '#ff3b5c', dash: '4,3', label: 'Blocks'       },
  correlates:   { color: '#00aaff', dash: '5,4', label: 'Correlates'   },
  weakens:      { color: '#ffcc00', dash: '2,3', label: 'Weakens'      },
};

// ─── Convenience export ───────────────────────────────────────────────────────

export const linkPresets = { personal, knowledge, org, tech, causal };
