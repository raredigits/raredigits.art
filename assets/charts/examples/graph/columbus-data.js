// RareCharts demo — Columbus CRM: a sales rep's relationship graph.
// Curated, human-scale dataset (~45 nodes): the rep's team, live customers
// with their champions, delivery partners — and target leads (group 'lead')
// that are deliberately NOT connected to the rep directly. The interesting
// question is the warm-intro route: who can introduce the rep to the lead.
//
// Planted intro routes:
//   Anna → Elena Stein (client champion)   → Diego Barros (ex-colleagues at Crescent)
//   Anna → Sofia Moreau (partner)          → Priya Iyer  (consulting project)
//   Anna → Raj Iyer (CSM) → Omar Kade      → Priya Iyer  (industry community)
//   Anna → Marc Vogel (VP) → Kai Larsen    → Chen Tanaka (integration partner)
//
// Exposes window.ColumbusDemo = { data: { nodes, links } }.

(function () {
  const nodes = [
    // The rep
    { id: 'anna',     label: 'Anna Berg · AE',            group: 'person' },

    // Columbus team
    { id: 'marc',     label: 'Marc Vogel · VP Sales',     group: 'person' },
    { id: 'nina',     label: 'Nina Lind · SDR',           group: 'person' },
    { id: 'raj',      label: 'Raj Iyer · CSM',            group: 'person' },
    { id: 'tomas',    label: 'Tomas Haas · SE',           group: 'person' },
    { id: 'columbus', label: 'Columbus CRM',              group: 'company' },

    // Customers and their champions
    { id: 'northgate', label: 'Northgate Logistics',      group: 'company' },
    { id: 'elena',     label: 'Elena Stein · Ops Dir',    group: 'person' },
    { id: 'bluepeak',  label: 'Bluepeak Retail',          group: 'company' },
    { id: 'omar',      label: 'Omar Kade · CIO',          group: 'person' },
    { id: 'verdant',   label: 'Verdant Foods',            group: 'company' },
    { id: 'maya',      label: 'Maya Silva · RevOps',      group: 'person' },
    { id: 'ironwood',  label: 'Ironwood Mfg',             group: 'company' },
    { id: 'lukas',     label: 'Lukas Novak · Sales Dir',  group: 'person' },

    // Delivery / integration partners
    { id: 'meridian',  label: 'Meridian Consulting',      group: 'org' },
    { id: 'sofia',     label: 'Sofia Moreau · Partner',   group: 'person' },
    { id: 'atlas',     label: 'Atlas Integrators',        group: 'org' },
    { id: 'kai',       label: 'Kai Larsen · CEO',         group: 'person' },

    // Community / events
    { id: 'saascon',   label: 'SaaSCon Community',        group: 'org' },

    // ── Target leads (★) — no direct tie to Anna by design
    { id: 'diego',     label: 'Diego Barros · CFO',       group: 'lead' },
    { id: 'crescent',  label: 'Crescent Airlines',        group: 'company' },
    { id: 'priya',     label: 'Priya Iyer · COO',         group: 'lead' },
    { id: 'halcyon',   label: 'Halcyon Health',           group: 'company' },
    { id: 'chen',      label: 'Chen Tanaka · CTO',        group: 'lead' },
    { id: 'silverline',label: 'Silverline Bank',          group: 'company' },
  ];

  const links = [
    // Team
    { source: 'anna',  target: 'marc',      type: 'colleague', weight: 0.9 },
    { source: 'anna',  target: 'nina',      type: 'colleague', weight: 0.8 },
    { source: 'anna',  target: 'raj',       type: 'colleague', weight: 0.8 },
    { source: 'anna',  target: 'tomas',     type: 'colleague', weight: 0.7 },
    { source: 'anna',  target: 'columbus',  type: 'colleague', weight: 0.9 },
    { source: 'marc',  target: 'columbus',  type: 'colleague', weight: 0.9 },
    { source: 'nina',  target: 'columbus',  type: 'colleague', weight: 0.8 },
    { source: 'raj',   target: 'columbus',  type: 'colleague', weight: 0.8 },
    { source: 'tomas', target: 'columbus',  type: 'colleague', weight: 0.8 },

    // Customers: rep ↔ champion ↔ their company
    { source: 'anna',  target: 'elena',     type: 'client',    weight: 0.9 },
    { source: 'elena', target: 'northgate', type: 'works',     weight: 0.9 },
    { source: 'anna',  target: 'omar',      type: 'client',    weight: 0.7 },
    { source: 'raj',   target: 'omar',      type: 'client',    weight: 0.8 },
    { source: 'omar',  target: 'bluepeak',  type: 'works',     weight: 0.9 },
    { source: 'anna',  target: 'maya',      type: 'client',    weight: 0.8 },
    { source: 'maya',  target: 'verdant',   type: 'works',     weight: 0.9 },
    { source: 'raj',   target: 'lukas',     type: 'client',    weight: 0.7 },
    { source: 'lukas', target: 'ironwood',  type: 'works',     weight: 0.9 },

    // Partners
    { source: 'anna',  target: 'sofia',     type: 'partner',   weight: 0.7 },
    { source: 'sofia', target: 'meridian',  type: 'works',     weight: 0.9 },
    { source: 'marc',  target: 'kai',       type: 'partner',   weight: 0.7 },
    { source: 'kai',   target: 'atlas',     type: 'works',     weight: 0.9 },
    { source: 'tomas', target: 'atlas',     type: 'partner',   weight: 0.5 },

    // Community
    { source: 'anna',  target: 'saascon',   type: 'community', weight: 0.4 },
    { source: 'omar',  target: 'saascon',   type: 'community', weight: 0.5 },
    { source: 'maya',  target: 'saascon',   type: 'community', weight: 0.4 },

    // ── Warm-intro edges to leads
    // Elena worked with Diego at Crescent
    { source: 'elena', target: 'diego',     type: 'alumni',    weight: 0.8 },
    { source: 'diego', target: 'crescent',  type: 'works',     weight: 0.9 },
    // Meridian ran a project at Halcyon; Omar knows Priya from SaaSCon
    { source: 'sofia', target: 'priya',     type: 'partner',   weight: 0.6 },
    { source: 'omar',  target: 'priya',     type: 'community', weight: 0.5 },
    { source: 'priya', target: 'halcyon',   type: 'works',     weight: 0.9 },
    // Atlas integrates Silverline's stack
    { source: 'kai',   target: 'chen',      type: 'partner',   weight: 0.7 },
    { source: 'chen',  target: 'silverline',type: 'works',     weight: 0.9 },
    // extra texture between lead companies and the world
    { source: 'crescent', target: 'northgate', type: 'works',  weight: 0.3 },
    { source: 'halcyon',  target: 'meridian',  type: 'partner', weight: 0.4 },
  ];

  window.ColumbusDemo = { data: { nodes, links } };
})();
