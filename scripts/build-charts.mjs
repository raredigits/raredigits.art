// RareCharts bundle build.
// Single source of truth for the version is assets/charts/src/version.json —
// read here to compose the banner once (no more triplicated banner strings in
// package.json). Produces both the readable and minified IIFE bundles.
//
//   node scripts/build-charts.mjs                build rare-charts.js + .min.js
//   node scripts/build-charts.mjs --watch         rebuild rare-charts.js on change
//   node scripts/build-charts.mjs --outdir <dir>  write the bundles to <dir>
//                                                 (default assets/charts)
//
// d3 and rare-charts.css are bundled in (CSS via the text loader). The
// readable bundle keeps the stylesheet as written; the minified one gets it
// minified, comments and all whitespace gone (X-10).

import { build, context, transform } from 'esbuild';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { version } = JSON.parse(
  readFileSync(new URL('../assets/charts/src/version.json', import.meta.url)),
);

// Machine-readable header for anyone — human or LLM — handed only the bundle.
// Keep this in sync with the public API surface (chart classes, adapters,
// construction pattern). The version is interpolated from version.json.
const banner = `/*! RareCharts ${version} | Docs: https://raredigits.art/charts | Global: RareCharts; d3 and CSS are bundled in (no extra script/link); no fonts are loaded - Fira Sans/Cousine when the page has them, system fonts otherwise. Usage: new RareCharts.<Type>(selector, options).setData(data) - the container element must already exist. Types: Line, TimeSeries, Overview, Bar, HierarchicalBar, DualAxes, Donut, Pie, Gauge, Graph (views ego|path|cluster|flow), MultiChart, Map, MapFlow, Sankey. Relation charts (Graph, Sankey, MapFlow) share { nodes, links: [{ source, target, ... }] } (from/to accepted). Graph flow: nodes without row/col/x/y hints are laid out automatically (layout: 'auto'); folds collapse node sets into +/- meta-nodes (collapse/expand(id)); timeframes and navigator pick a period over the ties' start/end; ties outside it dim (timeWindowMode: 'hide' hides them). MapFlow nodes: coords [lon, lat] or country (feature id); setTimeWindow(from, to). Data shape is per-type (see docs); load or remap external data with RareCharts.fromJson|fromCsv|fromApi|fromArray. Text slots title/subtitle/legend/source/note are options - feed them, don't hardcode; put your own inputs inside the card with the controls option (element or selector), and use Graph's details option for a node/tie details panel: https://raredigits.art/charts/settings/. Log Y scale: yScale: 'log' (Line, TimeSeries) or y1Scale/y2Scale (DualAxes); switch with setYScale() or the built-in Lin/Log button (scaleToggle), listen with onScaleChange(fn). Every chart class except the standalone Overview has whenReady(), a promise resolved with the chart once it has drawn what it loads (Graph requests and layout, Map/MapFlow geometry; others at once). Strict CSP: set window.RareChartsConfig = { injectStyles: false } before the bundle and link rare-charts.css. Runtime version: RareCharts.VERSION */`;

// The text loader ships a .css file verbatim — esbuild's minify touches JS
// only, so the stylesheet goes through its CSS minifier here before it
// becomes a string.
const minifyCssText = {
  name: 'minify-css-text',
  setup(b) {
    b.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const { code } = await transform(await readFile(path, 'utf8'), { loader: 'css', minify: true, sourcefile: path });
      return { contents: code, loader: 'text' };
    });
  },
};

// Paths in the config resolve from the repo root, whatever the cwd.
const base = {
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  entryPoints: ['assets/charts/src/index.js'],
  bundle:      true,
  format:      'iife',
  globalName:  'RareCharts',
  loader:      { '.css': 'text' },
  banner:      { js: banner },
};

// --outdir (relative to the cwd): test/bundle-smoke.test.js builds the real
// bundles into a temp dir.
const at = process.argv.indexOf('--outdir');
const outdir = at > -1 ? resolve(process.argv[at + 1]) : 'assets/charts';

if (process.argv.includes('--watch')) {
  const ctx = await context({ ...base, outfile: join(outdir, 'rare-charts.js') });
  await ctx.watch();
  console.log(`RareCharts ${version}: watching for changes…`);
} else {
  await build({ ...base, outfile: join(outdir, 'rare-charts.js') });
  await build({ ...base, minify: true, plugins: [minifyCssText], outfile: join(outdir, 'rare-charts.min.js') });
  console.log(`RareCharts ${version}: built rare-charts.js + rare-charts.min.js`);
}
