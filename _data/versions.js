// Version labels surfaced in the docs (version pill, CDN pin on /charts/).
// The charts version has a single source of truth in
// assets/charts/src/version.json — derive it here so the docs label, the
// runtime RareCharts.VERSION, and the build banner can never drift apart.
const { version: charts } = require('../assets/charts/src/version.json');

module.exports = {
  styles: 'v0.6.16',
  charts,
};
