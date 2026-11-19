// Entry animations are seen in a real browser (C-16). In Chrome the renders
// that follow setData — document.fonts.ready, the first ResizeObserver
// callback — land in the first frame. They used to finalise Bar and
// HierarchicalBar before a single frame of growth showed, and to restart or
// re-time the others. Each chart is built on the fixture page and sampled on
// every animation frame; a second run narrows the host 250 ms in, mid-entry.
// Needs the bundle: node scripts/build-charts.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/charts-entry-motion.html';
const DURATION = 600;

let browser;
let server;
let page;

beforeAll(async () => {
  if (!existsSync('assets/charts/rare-charts.js')) throw new Error('No bundle — run `node scripts/build-charts.mjs` first.');
  let origin;
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => { throw e; });
  await page.goto(origin + FIXTURE);
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

const run = (name, opts = {}) => page.evaluate(([n, o]) => window.run(n, o), [name, opts]);

// Frames strictly between the first value and the last: the motion on screen.
const between = s => {
  const first = s[0][1], last = s.at(-1)[1];
  return s.filter(([, v]) => Math.abs(v - first) > 1e-3 && Math.abs(v - last) > 1e-3);
};
const nonDecreasing = s => s.every(([, v], i) => i === 0 || v >= s[i - 1][1] - 1e-3);
const settledBy = s => s.find(([, v]) => Math.abs(v - s.at(-1)[1]) <= 1e-3)[0];

describe('C-16: the entry animation plays through the renders that follow setData', () => {
  it.each(['bar', 'hbar', 'hierarchical', 'dual', 'line', 'donut', 'gauge', 'sankey'])('%s: grows over the frames, ends on time', async (name) => {
    const s = await run(name);
    expect(between(s).length).toBeGreaterThanOrEqual(10);   // was 0 for bar, hbar, hierarchical, sankey
    expect(nonDecreasing(s)).toBe(true);
    expect(settledBy(s)).toBeLessThanOrEqual(DURATION + 100);
  });

  it.each(['bar', 'hbar', 'hierarchical', 'dual', 'line', 'sankey'])('%s: a resize mid-entry retargets — no jump to the end, no restart, no re-timing', async (name) => {
    const s = await run(name, { resizeAt: 250 });
    expect(between(s).length).toBeGreaterThanOrEqual(10);
    // after the resize, still in motion towards the new size for a while
    const after = s.filter(([t]) => t > 280 && t < 500);
    expect(after.some(([, v]) => Math.abs(v - s.at(-1)[1]) > 1e-3)).toBe(true);
    // never back to the start once under way
    const started = s.findIndex(([, v]) => Math.abs(v - s[0][1]) > 1e-3);
    expect(s.slice(started).every(([, v]) => Math.abs(v - s[0][1]) > 1e-3)).toBe(true);
    expect(settledBy(s)).toBeLessThanOrEqual(DURATION + 100);
  });

  it('line: the share drawn never drops when the host narrows', async () => {
    expect(nonDecreasing(await run('line', { resizeAt: 250 }))).toBe(true);
  });
});

// K-08: a chart left without `duration` takes the one entry duration, 650 ms
// (Bar was 500, Gauge 800). The fixture's charts all pass 600, so these two
// are built here on the same page and sampled the same way, on every frame.
const runDefault = name => page.evaluate(n => new Promise(done => {
  const cats = [{ label: 'Alpha', value: 40 }, { label: 'Beta', value: 75 }, { label: 'Gamma', value: 60 }];
  const charts = {
    bar:   [el => new RareCharts.Bar(el).setData(cats),
            el => +el.querySelector('rect.rc-bar:nth-of-type(2)')?.getAttribute('height')],
    gauge: [el => new RareCharts.Gauge(el, { needle: true }).setData(70),
            el => parseFloat(((el.querySelector('.rc-gauge-needle-pointer')?.getAttribute('transform') ?? '')
              .match(/rotate\(([-\d.e]+)/) ?? [])[1])],
  };
  const [build, read] = charts[n];
  const host = document.createElement('div');
  host.className = 'host';
  document.getElementById('stage').replaceChildren(host);
  const t0 = performance.now();
  build(host);
  const samples = [[0, read(host)]];
  const frame = () => {
    const t = performance.now() - t0;
    samples.push([Math.round(t), read(host)]);
    if (t < 1100) requestAnimationFrame(frame); else done(samples);
  };
  requestAnimationFrame(frame);
}), name);

describe('K-08: without `duration` the entry runs 650 ms', () => {
  const ENTRY = 650;
  const FRAME = 17;   // one frame at 60 Hz, rounded up

  // Measured in headless Chrome: the last frame in motion at 626-637 ms, the
  // first at rest at 643-654 ms; a frame or two of slack either way.
  it.each(['bar', 'gauge'])('%s: the entry ends at 650 ms', async (name) => {
    const s = await runDefault(name);
    const moving = between(s);
    expect(moving.length).toBeGreaterThanOrEqual(10);
    expect(nonDecreasing(s)).toBe(true);
    expect(moving.at(-1)[0]).toBeGreaterThanOrEqual(ENTRY - 2 * FRAME);   // Bar's old 500 ends far sooner
    expect(settledBy(s)).toBeLessThanOrEqual(ENTRY + 2 * FRAME);          // Gauge's old 800 far later
  });
});
