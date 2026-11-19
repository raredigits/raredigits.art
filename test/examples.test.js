import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as RareCharts from '../assets/charts/src/index.js';

// Every published demo script runs (S-19): each file under
// assets/charts/examples/, as the docs pages load it — the RareCharts global,
// the elements it looks up by id, the data files it fetches from
// /assets/charts/data/ served from disk. A demo must draw its charts without
// a throw, a console error or a RareCharts warning. The scripts are only read
// here, never changed; the data-only files (they set a window global for the
// graph demos) load first, as their pages load them.

const ROOT = process.cwd();
const DIR = 'assets/charts/examples';
const DATA_ONLY = ['graph/demo-data.js', 'graph/columbus-data.js'];
const scripts = readdirSync(resolve(ROOT, DIR), { recursive: true })
  .map(f => f.split('\\').join('/'))
  .filter(f => f.endsWith('.js') && !DATA_ONLY.includes(f))
  .sort();
const source = f => readFileSync(resolve(ROOT, DIR, f), 'utf8');
const run = f => new Function(source(f))();

// The ids a script reaches for: chart mounts ('#id') and page elements
// (getElementById), each made as an empty div, as the docs page has it —
// unless the page gives the element children the script fills (MARKUP).
const MARKUP = {
  // the day's change: a Rare Styles stat whose value the script writes (RC-058)
  'line/line-chart-time-series.js': { 'hd-change': '<span class="stat__value"></span>' },
};
const idsOf = code => [...new Set([
  ...[...code.matchAll(/['"`]#([\w-]+)['"`]/g)].map(m => m[1]),
  ...[...code.matchAll(/getElementById\(\s*['"`]([\w-]+)['"`]\s*\)/g)].map(m => m[1]),
])];

// A fetch that serves the repository's data files, and nothing else.
function serveData() {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = String(url);
    if (!path.startsWith('/assets/charts/data/')) return new Response('not served', { status: 404, statusText: 'Not Found' });
    return new Response(readFileSync(join(ROOT, path)), { headers: { 'Content-Type': 'application/json' } });
  }));
}

// A card has drawn: an svg, and on a map (its clip path says so) the
// regions of the geometry it fetched.
const drawn = c => !!c.querySelector('svg')
  && (!c.querySelector('clipPath[id$="-map-clip"]') || !!c.querySelector('.rc-map-feature'));

// Until every chart the script made has drawn, or five seconds have passed:
// the fetching demos draw when their data arrives.
async function settle() {
  for (let i = 0; i < 500; i++) {
    await new Promise(r => setTimeout(r, 10));
    const cards = [...document.querySelectorAll('.rc-chart')];
    if (cards.length && cards.every(drawn)) return cards;
  }
  return [...document.querySelectorAll('.rc-chart')];
}

describe('every published demo script runs (S-19)', () => {
  let errors;
  let warnings;
  beforeEach(() => {
    globalThis.RareCharts = RareCharts;
    serveData();
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    DATA_ONLY.forEach(run);
  });
  afterEach(() => {
    document.body.innerHTML = '';
    delete globalThis.RareCharts;
    delete window.RareGraphDemo;
    delete window.ColumbusDemo;
  });

  it('finds the demos', () => {
    expect(scripts.length).toBeGreaterThanOrEqual(40);
  });

  it.each(scripts)('%s', async (file) => {
    idsOf(source(file)).forEach((id) => {
      const el = document.createElement('div');
      el.id = id;
      el.innerHTML = MARKUP[file]?.[id] ?? '';
      document.body.appendChild(el);
    });
    expect(() => run(file)).not.toThrow();
    const cards = await settle();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.filter(c => !drawn(c)).map(c => c.id || c.className)).toEqual([]);
    expect(errors.mock.calls).toEqual([]);
    expect(warnings.mock.calls.filter(args => String(args[0]).startsWith('RareCharts'))).toEqual([]);
  });
});
