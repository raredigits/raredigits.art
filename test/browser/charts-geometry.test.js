// What the jsdom tests set by hand, in a real engine (S-18). jsdom has no
// layout: setup.js gives every element an 800×400 box and every text a zero
// length, and the geometry tests set their own sizes (test/helpers.js). Here
// Chrome lays the card out: the tooltip's place near the plot's edges, the
// right-hand legend beside a narrower plot, and the chart's type sizes from
// its three variables. Headless Google Chrome via playwright-core; needs the
// bundle (`node scripts/build-charts.mjs`). The fixture loads the bundle and
// assets/charts/rare-charts.css, no Rare Styles.
//
// Not repeated here: the 16px title, the 13px tooltip and the chart's font
// stack on a bare page (charts-standalone), the right-hand legend with a
// navigator and controls (K-19) and the header at 460px (K-17,
// charts-card-layout).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

let browser;
let server;
let origin;
let page;
const errors = [];

beforeAll(async () => {
  if (!existsSync('assets/charts/rare-charts.js')) throw new Error('No bundle — run `node scripts/build-charts.mjs` first.');
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e));
  await page.goto(origin + '/test/browser/fixtures/charts-geometry.html');
  await page.evaluate(() => document.fonts.ready);
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

const rect = selector => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}, selector);
const style = (selector, props) => page.evaluate(([s, ps]) => {
  const cs = getComputedStyle(document.querySelector(s));
  return Object.fromEntries(ps.map(p => [p, cs.getPropertyValue(p)]));
}, [selector, props]);
// a inside b, to half a pixel
const inside = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;

describe('the fixture', () => {
  it('loads without errors, on rare-charts.css from the repository', async () => {
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.getElementById('rc-base-styles').tagName)).toBe('LINK');
    expect(await page.evaluate(() => document.querySelectorAll('style#rc-base-styles').length)).toBe(0);
  });
});

// ─── The tooltip near the plot's edges ─────────────────────────────────────────
// A Line tooltip follows the pointer: 12px right of it, 20px above, clamped to
// the card (core/Tooltip.js). The card clips what runs past it.

describe('the tooltip near the edges of the plot', () => {
  // Move the pointer to (fx, fy) of the plot — 3px inside an edge — and read
  // where the tooltip is.
  const hoverAt = async (fx, fy) => {
    const plot = await rect('#tip rect.rc-overlay');
    const x = fx === 'left' ? plot.left + 3 : fx === 'right' ? plot.right - 3 : (plot.left + plot.right) / 2;
    const y = fy === 'bottom' ? plot.bottom - 3 : (plot.top + plot.bottom) / 2;
    await page.mouse.move(x, y);
    const tip = await rect('#tip .rc-tooltip');
    const visible = await page.evaluate(() => document.querySelector('#tip .rc-tooltip').classList.contains('is-visible'));
    const viewport = await page.evaluate(() => ({ left: 0, top: 0, right: innerWidth, bottom: innerHeight }));
    return { x, y, tip, visible, card: await rect('#tip'), viewport };
  };
  const covers = ({ x, y, tip }) => x >= tip.left && x <= tip.right && y >= tip.top && y <= tip.bottom;

  it.each([
    ['left', 'middle'],
    ['right', 'middle'],
    ['middle', 'bottom'],
    ['right', 'bottom'],
  ])('at the %s, %s: inside the card and the window', async (fx, fy) => {
    const at = await hoverAt(fx, fy);
    expect(at.visible).toBe(true);
    expect(at.tip.width).toBeGreaterThan(100);              // a real box, two series in it
    expect(inside(at.tip, at.card)).toBe(true);
    expect(inside(at.tip, at.viewport)).toBe(true);
  });

  it.each([
    ['left', 'middle'],
    ['middle', 'bottom'],
  ])('at the %s, %s: clear of the point under the pointer', async (fx, fy) => {
    const at = await hoverAt(fx, fy);
    expect(at.tip.left).toBeGreaterThan(at.x);               // to the right of it
    expect(covers(at)).toBe(false);
  });

  // Defect found by S-18: near the right edge the clamp moves the tooltip
  // left until it fits the card, over the pointer — it hides the point being
  // read (the bottom edge does not: there the tooltip stays to the right).
  // The fix that puts it on the pointer's left there flips this to it().
  it('at the right edge: clear of the point under the pointer (RC-070)', async () => {
    for (const fy of ['middle', 'bottom']) expect(covers(await hoverAt('right', fy))).toBe(false);
  });
});

// ─── The legend on the right ───────────────────────────────────────────────────
// legendPosition: 'right' puts the legend in a column of its own beside the
// drawing; the plot gives up the column's width (Chart.width subtracts it).
// The same chart without the legend, at the same width, is the reference. The
// narrow card is under the 460px at which the header stacks (K-17).

describe.each([
  ['a 900px card', 'wide'],
  ['a 400px card', 'narrow'],
])('the legend on the right, on %s', (_, size) => {
  const id = `#legend-${size}`;
  const twin = `#plain-${size}`;

  it('sits beside the drawing, inside the card, its items stacked', async () => {
    const [card, svg, aside, legend] = await Promise.all([id, `${id} > svg`, `${id} .rc-chart-legend-aside`, `${id} .rc-legend`].map(rect));
    expect(aside.left).toBeGreaterThanOrEqual(svg.right - 0.5);
    expect(inside(aside, card)).toBe(true);
    expect(inside(legend, aside)).toBe(true);
    expect(legend.top).toBeLessThan(svg.bottom);              // beside the drawing, not under it
    expect(legend.bottom).toBeGreaterThan(svg.top);
    const items = await page.evaluate(s => [...document.querySelectorAll(`${s} .rc-legend-item`)]
      .map(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }), id);
    expect(items).toHaveLength(2);
    expect(items[1].top).toBeGreaterThanOrEqual(items[0].bottom);
  });

  it('the plot is narrower by the legend column\'s width', async () => {
    const [aside, svg, plot, twinSvg, twinPlot] = await Promise.all(
      [`${id} .rc-chart-legend-aside`, `${id} > svg`, `${id} rect.rc-overlay`, `${twin} > svg`, `${twin} rect.rc-overlay`].map(rect));
    expect(aside.width).toBeGreaterThan(32);                  // its 32px gap and the labels
    expect(twinSvg.width - svg.width).toBeCloseTo(aside.width, 0);
    expect(twinPlot.width - plot.width).toBeCloseTo(aside.width, 0);
    const key = size === 'wide' ? 'legendWide' : 'legendNarrow';
    expect(await page.evaluate(k => window.charts[k].width, key)).toBeCloseTo(plot.width, 0);
  });

  it('nothing reaches into the legend column: the drawing, its labels, the header, the footer', async () => {
    const aside = await rect(`${id} .rc-chart-legend-aside`);
    const reach = await page.evaluate(s => Math.max(...[
      ...document.querySelectorAll(`${s} > svg *`),
      document.querySelector(`${s} .rc-chart-header`),
      document.querySelector(`${s} .rc-chart-title`),
      document.querySelector(`${s} .rc-chart-footer`),
      document.querySelector(`${s} .rc-chart-source`),
    ].map(el => el.getBoundingClientRect()).filter(r => r.width > 0).map(r => r.right)), id);
    expect(reach).toBeLessThanOrEqual(aside.left + 0.5);
  });
});

// ─── Type ──────────────────────────────────────────────────────────────────────
// The chart's type comes from three variables on .rc-chart: --rc-font-family,
// --rc-font-size (the title) and --rc-font-size-sm (subtitle, legend, source,
// the svg and every SVG text in it). The tooltip keeps its own 14px (RC-082). #type-vars
// sets the three on the chart, as a page would.

const TYPE = [
  ['.rc-chart-subtitle', 'font-size'],
  ['.rc-legend-item span:last-child', 'font-size'],
  ['.rc-chart-source', 'font-size'],
  ['svg', 'font-size'],
  ['.rc-axis text', 'font-size'],
  ['.rc-axis-cat text', 'font-size'],
  ['.rc-bar-value', 'font-size'],
];
const typeOf = id => page.evaluate(([s, list]) => list.map(([sel, p]) => {
  const el = document.querySelector(`${s} ${sel}`);
  return `${sel} ${p}: ${el ? getComputedStyle(el).getPropertyValue(p) : 'missing'}`;
}), [id, TYPE]);

describe('type sizes from the chart\'s variables, without Rare Styles', () => {
  it('by default the small size is 14px: subtitle, legend, source, the svg and its text', async () => {
    expect(await typeOf('#type')).toEqual(TYPE.map(([sel, p]) => `${sel} ${p}: 14px`));
  });

  it('a page that sets the three variables on the chart sets every size and the family', async () => {
    expect(await typeOf('#type-vars')).toEqual(TYPE.map(([sel, p]) => `${sel} ${p}: 12px`));
    expect(await style('#type-vars .rc-chart-title', ['font-size', 'font-family']))
      .toEqual({ 'font-size': '20px', 'font-family': 'Georgia, serif' });
    for (const sel of ['.rc-legend-item span:last-child', '.rc-chart-source', '.rc-axis-cat text']) {
      expect((await style(`#type-vars ${sel}`, ['font-family']))['font-family'], sel).toBe('Georgia, serif');
    }
    // numbers keep the numeric family; the tooltip its own size
    expect((await style('#type-vars .rc-axis text', ['font-family']))['font-family']).toMatch(/^"?Cousine"?, ui-monospace,/);
    expect((await style('#type-vars .rc-bar-value', ['font-family']))['font-family']).toMatch(/^"?Cousine"?, ui-monospace,/);
    expect(await style('#type-vars .rc-tooltip', ['font-size'])).toEqual({ 'font-size': '14px' });
  });

  it('and the text is drawn at that size: a value label\'s box shrinks by 12/14', async () => {
    const h = id => page.evaluate(s => document.querySelector(`${s} .rc-bar-value`).getBBox().height, id);
    const [plain, vars] = [await h('#type'), await h('#type-vars')];
    expect(plain).toBeGreaterThan(vars);
    expect(plain / vars).toBeCloseTo(14 / 12, 1);
  });
});
