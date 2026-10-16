// Rare Styles build: sass → rd-gate (CSS-343) → rare.css / rare.min.css.
// Replaces the bare `sass` CLI calls so the `.rd` scope gate can never be
// skipped. Source maps are chained (Sass → PostCSS) and stay relative to
// assets/css/, as the Sass CLI wrote them.
//
//   node scripts/build-css.mjs           build rare.css + rare.min.css
//   node scripts/build-css.mjs --watch   rebuild both on any .scss change

import * as sass from 'sass';
import postcss from 'postcss';
import { watch, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import rdGate from './rd-gate.mjs';

const CSS_DIR = resolve(fileURLToPath(new URL('../assets/css/', import.meta.url)));
const ENTRY = resolve(CSS_DIR, 'rare.scss');

const TARGETS = [
  { file: 'rare.css', style: 'expanded', compact: false },
  { file: 'rare.min.css', style: 'compressed', compact: true },
];

async function buildOne({ file, style, compact }) {
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
  for (const w of result.warnings()) console.warn(w.toString());

  writeFileSync(out, result.css);
  writeFileSync(`${out}.map`, result.map.toString());
  return result.messages.find((m) => m.type === 'rd-gate-stats')?.stats;
}

async function buildAll() {
  const started = Date.now();
  let stats;
  for (const t of TARGETS) stats = await buildOne(t);
  console.log(
    `rare.css + rare.min.css: gated in ${Date.now() - started} ms ` +
      `(island ${stats.island}, page ${stats.page}, ungated ${stats.ungated})`,
  );
}

if (process.argv.includes('--watch')) {
  const safeBuild = () => buildAll().catch((e) => console.error(e.message ?? e));
  await safeBuild();
  let timer;
  watch(CSS_DIR, { recursive: true }, (_event, name) => {
    if (!name || !name.endsWith('.scss')) return;
    clearTimeout(timer);
    timer = setTimeout(safeBuild, 100);
  });
  console.log('Rare Styles: watching assets/css/**/*.scss…');
} else {
  await buildAll();
}
