// Public API snapshot of Rare Styles (CSS-340, v0.7.0 transition gate).
//
//   node scripts/api-snapshot.mjs <git-ref> <label>   snapshot a past release
//   node scripts/api-snapshot.mjs --working <label>   snapshot the working tree
//
// Writes assets/css/docs/api/<label>.json: every class the CSS styles, every
// custom property declared on top-level :root (with its value), the public
// SCSS entry points and the shipped artifacts. The `.rd` gate is stripped
// before extraction, so a gated and an ungated build compare class by class.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const [, , refArg, label] = process.argv;
if (!refArg || !label) {
  console.error('usage: node scripts/api-snapshot.mjs <git-ref|--working> <label>');
  process.exit(1);
}
const working = refArg === '--working';

const read = (path) =>
  working ? readFileSync(resolve(path), 'utf8') : execFileSync('git', ['show', `${refArg}:${path}`], { encoding: 'utf8' });
const list = (dir) =>
  working
    ? readdirSync(resolve(dir))
    : execFileSync('git', ['ls-tree', '--name-only', `${refArg}:${dir}`], { encoding: 'utf8' }).split('\n').filter(Boolean);

const GATE = /:where\((?:\.rd, ?\.rd \*|html\.rd, ?body\.rd|\.rd|\.rd, ?html\.rd ?> ?\*)\)\s?/g;

const root = postcss.parse(read('assets/css/rare.css'));
const classes = new Set();
const tokens = {};
root.walkRules((rule) => {
  const sel = rule.selector.replace(GATE, '');
  selectorParser((s) => s.walkClasses((c) => { classes.add(c.value); })).processSync(sel);
  if (rule.selector === ':root' && rule.parent.type === 'root') {
    rule.walkDecls(/^--/, (d) => { tokens[d.prop] = d.value.trim(); });
  }
});

const pkg = JSON.parse(read('package.json'));
const snapshot = {
  label,
  source: working ? 'working tree' : refArg,
  packageVersion: pkg.version,
  artifacts: list('assets/css').filter((f) => /^rare(\.min)?\.css(\.map)?$/.test(f)).sort(),
  assetDirs: list('assets/css').filter((f) => ['fonts', 'images'].includes(f)).sort(),
  scssEntryPoints: ['assets/css/rare.scss', ...list('assets/css/modules').filter((f) => f === '_index.scss').map((f) => `assets/css/modules/${f}`)],
  classes: [...classes].sort(),
  customProperties: Object.fromEntries(Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b))),
};

mkdirSync(resolve('assets/css/docs/api'), { recursive: true });
const out = resolve(`assets/css/docs/api/${label}.json`);
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`${label}: ${snapshot.classes.length} classes, ${Object.keys(tokens).length} custom properties → ${out}`);
