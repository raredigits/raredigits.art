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
