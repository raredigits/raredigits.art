import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// X-03: every /assets/charts/data/… path a docs page or an example names
// exists in the repo (scripts/check-links.mjs sees only href/src, not code
// snippets or fetch() strings), and no data file under assets/charts/data/
// ships unreferenced — the folder is published to raredigits.art and to the
// rare-charts repo as it is.

const ROOT = process.cwd();
const SOURCES = ['charts', '_posts', 'examples', 'assets/charts/examples', 'assets/charts/README.md'];
const DATA_PATH = /\/assets\/charts\/data\/[^'"`\s<>)]+/g;
const onDisk = url => resolve(ROOT, '.' + url);

function files(entry) {
  const abs = resolve(ROOT, entry);
  if (!statSync(abs).isDirectory()) return [entry];
  return readdirSync(abs, { recursive: true }).map(f => join(entry, f))
    .filter(f => /\.(md|njk|html|js)$/.test(f) && statSync(resolve(ROOT, f)).isFile());
}

const refs = SOURCES.flatMap(files).flatMap(f =>
  readFileSync(resolve(ROOT, f), 'utf8').split('\n').flatMap((line, i) =>
    [...line.matchAll(DATA_PATH)].map(m => ({ at: `${f}:${i + 1}`, url: m[0] }))));

// Data files only: a LICENSE beside vendored data ships with it on purpose.
const shipped = readdirSync(resolve(ROOT, 'assets/charts/data'), { recursive: true })
  .map(f => '/assets/charts/data/' + f.split('\\').join('/'))
  .filter(u => u.endsWith('.json') && statSync(onDisk(u)).isFile());

describe('data paths in docs and examples (X-03)', () => {
  it('the scan sees the known references', () => {
    expect(refs.some(r => r.at.startsWith('assets/charts/examples/map/mapflow-demo.js:'))).toBe(true);
    expect(refs.some(r => r.at.startsWith('charts/map/index.md:'))).toBe(true);
  });

  it('every referenced data file exists', () => {
    expect(refs.filter(r => !existsSync(onDisk(r.url))).map(r => `${r.at} ${r.url}`)).toEqual([]);
  });

  it('every shipped data file is referenced', () => {
    const used = new Set(refs.map(r => r.url));
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped.filter(u => !used.has(u))).toEqual([]);
  });

  it('the vendored world-atlas maps ship with their ISC notice', () => {
    const dir = 'assets/charts/data/maps/world/level-0/world-atlas';
    expect(shipped.some(u => u.includes('/world-atlas/'))).toBe(true);
    expect(readFileSync(resolve(ROOT, dir, 'LICENSE'), 'utf8')).toMatch(/Copyright .* Michael Bostock/);
  });
});
