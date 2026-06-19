// RareCharts bundle build.
// Single source of truth for the version is assets/charts/src/version.json —
// read here to compose the banner once (no more triplicated banner strings in
// package.json). Produces both the readable and minified IIFE bundles.
//
//   node scripts/build-charts.mjs           build rare-charts.js + .min.js
//   node scripts/build-charts.mjs --watch    rebuild rare-charts.js on change
//
// d3 and rare-charts.css are bundled in (CSS via the text loader).

import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('../assets/charts/src/version.json', import.meta.url)),
);

// Machine-readable header for anyone — human or LLM — handed only the bundle.
// Keep this in sync with the public API surface (chart classes, adapters,
// construction pattern). The version is interpolated from version.json.
const banner = `/*! RareCharts ${version} | Docs: https://raredigits.art/charts | Global: RareCharts; d3 and CSS are bundled in (no extra script/link). Usage: new RareCharts.<Type>(selector, options).setData(data) - the container element must already exist. Types: Line, TimeSeries, Overview, Bar, DualAxes, Donut, Pie, Gauge, Graph, MultiChart, Map. Data shape is per-type (see docs); load or remap external data with RareCharts.fromJson|fromCsv|fromApi|fromArray. Text slots title/subtitle/legend/source/note are options - feed them, don't hardcode: https://raredigits.art/charts/settings/. Runtime version: RareCharts.VERSION */`;

const base = {
  entryPoints: ['assets/charts/src/index.js'],
  bundle:      true,
  format:      'iife',
  globalName:  'RareCharts',
  loader:      { '.css': 'text' },
  banner:      { js: banner },
};

if (process.argv.includes('--watch')) {
  const ctx = await context({ ...base, outfile: 'assets/charts/rare-charts.js' });
  await ctx.watch();
  console.log(`RareCharts ${version}: watching for changes…`);
} else {
  await build({ ...base, outfile: 'assets/charts/rare-charts.js' });
  await build({ ...base, minify: true, outfile: 'assets/charts/rare-charts.min.js' });
  console.log(`RareCharts ${version}: built rare-charts.js + rare-charts.min.js`);
}
