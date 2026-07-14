// Icon names derived from the shipped SVG set, so the docs grid on
// /styles/icons/ always matches assets/css/images/icons/ without a
// hand-maintained list. One entry per glyph (the -400 cut is the marker;
// every glyph ships -200 as well).
const fs = require('fs');
const path = require('path');

module.exports = fs
  .readdirSync(path.join(__dirname, '../assets/css/images/icons'))
  .filter((f) => f.endsWith('-400.svg'))
  .map((f) => f.replace(/-400\.svg$/, ''))
  .sort();
