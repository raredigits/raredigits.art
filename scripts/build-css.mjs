// Rare Styles build: sass → rd-gate (CSS-343) → rare.css / rare.min.css.
// Replaces the bare `sass` CLI calls so the `.rd` scope gate can never be
// skipped. Source maps are chained (Sass → PostCSS) and stay relative to
// assets/css/, as the Sass CLI wrote them.
//
//   node scripts/build-css.mjs           build rare.css + rare.min.css
//   node scripts/build-css.mjs --watch   rebuild both on any .scss change
//
// `compile()` is exported so tests can compare a fresh in-memory build with
// the committed artifacts (CSS-118 source/artifact agreement).

import * as sass from 'sass';
import postcss from 'postcss';
import { watch, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import rdGate from './rd-gate.mjs';

// Under test runners `import.meta.url` is not always a file: URL; fall back
// to the repository root, which is where the scripts are run from.
const HERE = import.meta.url.startsWith('file:') ? dirname(fileURLToPath(import.meta.url)) : resolve('scripts');
const CSS_DIR = resolve(HERE, '../assets/css');
const ENTRY = resolve(CSS_DIR, 'rare.scss');

export const TARGETS = [
  { file: 'rare.css', style: 'expanded', compact: false },
  { file: 'rare.min.css', style: 'compressed', compact: true },
];

export async function compile({ file, style, compact }) {
  const out = resolve(CSS_DIR, file);
  const { css, sourceMap } = sass.compile(ENTRY, { style, sourceMap: true });
  sourceMap.sources = sourceMap.sources.map((s) =>
    s.startsWith('file:') ? relative(dirname(out), fileURLToPath(s)) : s,
  );
  sourceMap.sourceRoot = '';

  const result = await postcss([rdGate({ compact })]).process(css, {
    from: ENTRY,
    to: out,
    map: { prev: sourceMap, inline: false, annotation: `${file}.map`, sourcesContent: false },
  });
  return {
    out,
    css: result.css,
    map: result.map.toString(),
    warnings: result.warnings(),
    stats: result.messages.find((m) => m.type === 'rd-gate-stats')?.stats,
  };
}

async function buildAll() {
  const started = Date.now();
  let stats;
  for (const t of TARGETS) {
    const r = await compile(t);
    for (const w of r.warnings) console.warn(w.toString());
    writeFileSync(r.out, r.css);
    writeFileSync(`${r.out}.map`, r.map);
    stats = r.stats;
  }
  console.log(
    `rare.css + rare.min.css: gated in ${Date.now() - started} ms ` +
      `(island ${stats.island}, page ${stats.page}, ungated ${stats.ungated})`,
  );
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(HERE, 'build-css.mjs');
if (isMain && process.argv.includes('--watch')) {
  const safeBuild = () => buildAll().catch((e) => console.error(e.message ?? e));
  await safeBuild();
  let timer;
  watch(CSS_DIR, { recursive: true }, (_event, name) => {
    if (!name || !name.endsWith('.scss')) return;
    clearTimeout(timer);
    timer = setTimeout(safeBuild, 100);
  });
  console.log('Rare Styles: watching assets/css/**/*.scss…');
} else if (isMain) {
  await buildAll();
}
