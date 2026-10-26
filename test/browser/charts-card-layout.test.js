// The chart card in a real engine — what jsdom cannot show (no layout, no
// :hover, no Content Security Policy). Headless Google Chrome via
// playwright-core; needs the bundle (`node scripts/build-charts.mjs`).
//
//   C-24  a host button:hover background does not reach the range buttons
//   C-32  a narrow card whose header and footer wrap keeps an 80px plot
//   K-17  the header stacks by the card's width, not the window's
//   K-19  legendPosition: 'right' with a navigator keeps the controls above
//         the source line
//   K-18  under a strict CSP: the page's own stylesheet and
//         RareChartsConfig.injectStyles = false
//         the Lin/Log button keeps one width in both states, and the x-axis
//         labels at the plot's edges stay inside the svg (owner, 2026-10-26)
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
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'UTC' });
  page.on('pageerror', e => errors.push(e));
  await page.goto(origin + '/test/browser/fixtures/charts-card-layout.html');
  await page.evaluate(() => document.fonts.ready);
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

const box = selector => page.evaluate(s => {
  const r = document.querySelector(s).getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
}, selector);
const style = (selector, props) => page.evaluate(([s, ps]) => {
  const cs = getComputedStyle(document.querySelector(s));
  return Object.fromEntries(ps.map(p => [p, cs.getPropertyValue(p)]));
}, [selector, props]);

describe('the fixture', () => {
  it('loads without errors', () => {
    expect(errors).toEqual([]);
  });
});

describe('C-24: hover keeps the buttons\' own background', () => {
  // the buttons fade their background in 0.1s: read it once that is over
  const hover = async selector => { await page.hover(selector); await page.waitForTimeout(300); };

  it('a timeframe button stays clear, not the host\'s red', async () => {
    await hover('#wide .rc-range-btn:not(.active)');
    expect(await style('#wide .rc-range-btn:not(.active):hover', ['background-color', 'background-image']))
      .toEqual({ 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none' });
  });

  it('the Lin/Log button keeps its diagonal fill — linear state', async () => {
    await hover('#wide .rc-scale-btn');
    const s = await style('#wide .rc-scale-btn', ['background-color', 'background-image']);
    expect(s['background-color']).toBe('rgba(0, 0, 0, 0)');
    expect(s['background-image']).toMatch(/^linear-gradient\(135deg, rgb\(204, 204, 204\) 50%, rgba\(0, 0, 0, 0\) 50%\)$/);
  });

  it('…and log state', async () => {
    await page.evaluate(() => window.charts.wide.setYScale('log'));
    await hover('#wide .rc-scale-btn');
    const s = await style('#wide .rc-scale-btn', ['background-image']);
    expect(s['background-image']).toMatch(/^linear-gradient\(135deg, rgba\(0, 0, 0, 0\) 50%, rgb\(204, 204, 204\) 50%\)$/);
    await page.evaluate(() => window.charts.wide.setYScale('linear'));
  });
});

describe('the Lin/Log button and the x-axis edges (owner, 2026-10-26)', () => {
  it('the Lin/Log button is as wide on the log scale as on the linear one', async () => {
    const lin = await box('#wide .rc-scale-btn');
    await page.evaluate(() => window.charts.wide.setYScale('log'));
    const log = await box('#wide .rc-scale-btn');
    await page.evaluate(() => window.charts.wide.setYScale('linear'));
    expect(log.right - log.left).toBeCloseTo(lin.right - lin.left, 1);
    expect(log.right).toBeCloseTo(lin.right, 1);
  });

  it('a 1M view keeps its first and last x labels inside the svg', async () => {
    const { svg, labels } = await page.evaluate(() => {
      const svg = [...document.querySelectorAll('#ts-month svg')]
        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
      const r = svg.getBoundingClientRect();
      const labels = [...svg.querySelectorAll('.rc-axis text')]
        .filter(t => !t.textContent.startsWith('$') && t.getAttribute('display') !== 'none')
        .map(t => { const b = t.getBoundingClientRect(); return { text: t.textContent, left: b.left, right: b.right }; });
      return { svg: { left: r.left, right: r.right }, labels };
    });
    expect(labels[0].text).toBe('Jan 04');
    labels.forEach(l => {
      expect(l.left).toBeGreaterThanOrEqual(svg.left - 0.5);
      expect(l.right).toBeLessThanOrEqual(svg.right + 0.5);
    });
  });
});

describe('K-17: the header follows the card, not the window', () => {
  it('a 900px card on a 1280px window: buttons beside the title', async () => {
    const [title, row] = await Promise.all([box('#wide .rc-chart-title'), box('#wide .rc-chart-range-row')]);
    expect(row.left).toBeGreaterThanOrEqual(title.right);
    expect(row.top).toBeLessThan(title.bottom);
  });

  it('a 420px card on the same window: stacked, buttons under the subtitle', async () => {
    const [subtitle, row] = await Promise.all([box('#narrow .rc-chart-subtitle'), box('#narrow .rc-chart-range-row')]);
    expect(row.top).toBeGreaterThanOrEqual(subtitle.bottom);
  });

  it('the title is not squeezed: it gets the narrow card\'s full width', async () => {
    const [card, title] = await Promise.all([box('#narrow'), box('#narrow .rc-chart-title')]);
    expect(title.right - title.left).toBeCloseTo(card.right - card.left, 0);
  });
});

describe('K-19: legend on the right, with a navigator and controls', () => {
  it('the controls sit under the navigator and above the source line', async () => {
    const [nav, controls, footer] = await Promise.all(
      ['#legend-right .rc-chart-navigator', '#legend-right .rc-chart-controls', '#legend-right .rc-chart-footer'].map(box));
    expect(controls.top).toBeGreaterThanOrEqual(nav.bottom - 0.5);
    expect(controls.bottom).toBeLessThanOrEqual(footer.top + 0.5);
  });

  it('the legend column still runs the card\'s whole height, beside them', async () => {
    const [aside, footer, controls] = await Promise.all(
      ['#legend-right .rc-chart-legend-aside', '#legend-right .rc-chart-footer', '#legend-right .rc-chart-controls'].map(box));
    expect(aside.left).toBeGreaterThanOrEqual(controls.right);
    expect(aside.bottom).toBeGreaterThanOrEqual(footer.bottom - 0.5);
  });
});

describe('C-32: a narrow card keeps an 80px plot', () => {
  it('the header and footer wrap; the card grows past `height` and the plot keeps 80px', async () => {
    const r = await page.evaluate(() => {
      const c = window.charts.tight;
      const overlay = c.container.querySelector('rect.rc-overlay');
      return {
        card: c.container.getBoundingClientRect().height,
        plot: +overlay.getAttribute('height'),
        drawn: overlay.getBoundingClientRect().height,
        header: c._headerEl.offsetHeight,
      };
    });
    expect(r.header).toBeGreaterThan(150);          // it did wrap: most of the 220px
    expect(r.plot).toBe(80);
    expect(r.drawn).toBeCloseTo(80, 0);
    expect(r.card).toBeGreaterThan(220);
  });

  it('…and goes back to `height` once a wider card lets the parts fit', async () => {
    const measure = () => page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const c = window.charts.grows;
      return {
        card: c.container.getBoundingClientRect().height,
        plot: +c.container.querySelector('rect.rc-overlay').getAttribute('height'),
      };
    });
    const resize = w => page.evaluate(width => { document.querySelector('#grows').style.width = width; }, w);
    // window 'error' — where a ResizeObserver loop is reported; pageerror misses it
    await page.evaluate(() => { window.__winErrors = []; addEventListener('error', e => window.__winErrors.push(e.message)); });
    const narrow = await measure();
    expect(narrow.plot).toBe(80);
    expect(narrow.card).toBeGreaterThan(240);
    await resize('900px');
    const wide = await measure();
    expect(wide.card).toBe(240);
    expect(wide.plot).toBeGreaterThan(80);
    await resize('260px');
    expect(await measure()).toEqual(narrow);
    expect(await page.evaluate(() => window.__winErrors)).toEqual([]);
  });
});

describe('K-18: a strict Content Security Policy', () => {
  let csp;
  beforeAll(async () => { csp = await browser.newPage({ viewport: { width: 800, height: 600 } }); });
  afterAll(async () => { await csp?.close(); });

  it('the injected <style> is what the policy blocks', async () => {
    await csp.goto(origin + '/test/browser/fixtures/csp/index.html?inject');
    const v = await csp.evaluate(() => window.violations);
    expect(v.some(x => x.directive.startsWith('style-src') && x.blocked === 'inline')).toBe(true);
  });

  it('with injectStyles: false and the page\'s own stylesheet: no violation, the chart is styled', async () => {
    await csp.goto(origin + '/test/browser/fixtures/csp/index.html');
    const r = await csp.evaluate(() => ({
      violations: window.violations,
      injected: !!document.querySelector('style#rc-base-styles'),
      display: getComputedStyle(document.querySelector('#chart')).display,
      header: getComputedStyle(document.querySelector('#chart .rc-chart-header')).display,
      buttons: document.querySelectorAll('#chart .rc-range-btn').length,
      plot: +document.querySelector('#chart rect.rc-overlay').getAttribute('height'),
    }));
    expect(r).toMatchObject({ violations: [], injected: false, display: 'flex', header: 'grid', buttons: 2 });
    expect(r.plot).toBeGreaterThan(100);
  });
});
