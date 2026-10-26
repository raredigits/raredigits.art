import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

// The shipped bundles, as a page gets them (S-03). Built by the real CLI into
// a temp dir — the bundles are not in git, and CI runs the tests before
// charts:build — then evaluated in a fresh JSDOM window each. esbuild's API
// does not load under the jsdom environment, hence the child process.
// The source tests import index.js, where the stylesheet resolves to '', so
// only this file proves that the CSS reaches the page.

const SOURCE_CSS = readFileSync('assets/charts/rare-charts.css', 'utf8');
const { version } = JSON.parse(readFileSync('assets/charts/src/version.json', 'utf8'));
const classes = css => new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.rc-[\w-]+/g));

let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rc-bundle-'));
  execFileSync(process.execPath, ['scripts/build-charts.mjs', '--outdir', dir], { stdio: 'pipe' });
}, 60000);
afterAll(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

const windows = [];
afterEach(() => { windows.splice(0).forEach(w => w.close()); });

// A page with the bundle in a <script> — `times: 2` includes it twice. The
// window gets the shims test/setup.js gives the test window: a box for every
// element, no-op ResizeObserver and SVG measuring.
function load(file, { times = 1 } = {}) {
  const { window: w } = new JSDOM('<!doctype html><html><head></head><body><div id="c"></div></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true });
  windows.push(w);
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  for (const [key, value] of [['clientWidth', 800], ['clientHeight', 400], ['offsetWidth', 800]]) {
    Object.defineProperty(w.HTMLElement.prototype, key, { configurable: true, get: () => value });
  }
  Object.assign(w.SVGElement.prototype, {
    getBBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    getComputedTextLength: () => 0,
    getTotalLength: () => 0,
  });
  const code = readFileSync(join(dir, file), 'utf8');
  for (let i = 0; i < times; i++) w.eval(code);
  const styles = w.document.querySelectorAll('style#rc-base-styles');
  return { w, code, styles, css: styles[0]?.textContent ?? '' };
}

describe.each(['rare-charts.js', 'rare-charts.min.js'])('%s (S-03)', (file) => {
  it('opens with the banner and defines the RareCharts global', () => {
    const { w, code } = load(file);
    expect(code.startsWith(`/*! RareCharts ${version} |`)).toBe(true);
    expect(w.RareCharts.VERSION).toBe(version);
  });

  it('injects a non-empty stylesheet once, even when included twice', () => {
    const { styles, css } = load(file, { times: 2 });
    expect(styles).toHaveLength(1);
    expect(css).toMatch(/\.rc-chart\s*\{/);
  });

  it('draws a chart', () => {
    const { w } = load(file);
    new w.RareCharts.Line('#c', { title: 'Smoke', animate: false })
      .setData([{ date: '2026-01-01', value: 1 }, { date: '2026-02-01', value: 2 }]);
    expect(w.document.querySelector('#c svg').getAttribute('aria-label')).toBe('Smoke');
    expect(w.document.querySelector('#c path.rc-line').getAttribute('d')).toMatch(/^M/);
  });

  it('Pie draws a pie (C-05)', () => {
    const { w } = load(file);
    new w.RareCharts.Pie('#c', { animate: false })
      .setData([{ label: 'A', value: 3 }, { label: 'B', value: 2 }]);
    const ds = [...w.document.querySelectorAll('#c path.rc-donut-slice')].map(p => p.getAttribute('d'));
    expect(ds).toHaveLength(2);
    expect(ds.every(d => /L0,0Z$/.test(d))).toBe(true);
  });
});

describe('the stylesheet in each bundle (X-10)', () => {
  it('rare-charts.js carries rare-charts.css as written', () => {
    expect(load('rare-charts.js').css).toBe(SOURCE_CSS);
  });

  it('rare-charts.min.js carries it minified: no comments, the same .rc-* classes', () => {
    const { css } = load('rare-charts.min.js');
    expect(css).not.toContain('/*');
    expect(css.length).toBeLessThan(SOURCE_CSS.length * 0.7);
    expect(classes(css)).toEqual(classes(SOURCE_CSS));
  });
});
