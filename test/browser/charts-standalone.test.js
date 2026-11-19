// RareCharts on a bare page: the bundle only, no Rare Styles (C-13, C-14,
// K-01, B-03). jsdom can read the stylesheet (test/charts-css.test.js); only a
// rendering engine shows what a missing host variable does to a box. Headless
// Google Chrome via playwright-core. Needs the bundle, which is gitignored:
//   node scripts/build-charts.mjs   (npm run test:browser builds it)
//
// Fonts are compared as computed font-family strings, never by eye: a
// machine with Fira Sans / Cousine installed renders them with or without a
// webfont.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/charts-standalone.html';
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

let browser;
let server;
let origin;
let page;
const requests = [];

beforeAll(async () => {
  if (!existsSync('assets/charts/rare-charts.js')) throw new Error('No bundle — run `node scripts/build-charts.mjs` first.');
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => { throw e; });
  await page.goto(origin + FIXTURE);
  await page.evaluate(async () => {
    await window.charts.graph.whenReady();
    await window.charts.tipLong.whenReady();
    await document.fonts.ready;
  });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

const css = (selector, props) => page.evaluate(([s, ps]) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return Object.fromEntries(ps.map(p => [p, cs.getPropertyValue(p)]));
}, [selector, props]);

describe('C-13: spacing and boxes without host variables', () => {
  it('legend dots and bands are 8×8', async () => {
    const box = s => page.evaluate(sel => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return [r.width, r.height];
    }, s);
    expect(await box('#line .rc-legend-dot')).toEqual([8, 8]);
    expect(await box('#line .rc-legend-band')).toEqual([8, 8]);
  });

  it('header, legend, source and note keep their gaps and margins', async () => {
    expect(await css('#line .rc-chart-header', ['column-gap', 'row-gap'])).toEqual({ 'column-gap': '16px', 'row-gap': '4px' });
    expect(await css('#line .rc-legend', ['column-gap'])).toEqual({ 'column-gap': '16px' });
    expect(await css('#line .rc-chart-source', ['display', 'margin-top', 'margin-bottom']))
      .toEqual({ display: 'block', 'margin-top': '8px', 'margin-bottom': '8px' });
    expect(await css('#line .rc-chart-note', ['margin-top', 'margin-bottom'])) // right under the source
      .toEqual({ 'margin-top': '0px', 'margin-bottom': '8px' });
  });

  it('the tooltip has its padding', async () => {
    expect(await css('#line .rc-tooltip', ['padding-top', 'padding-left'])).toEqual({ 'padding-top': '8px', 'padding-left': '16px' });
  });

  it('timeframe buttons keep border, padding and line-height', async () => {
    expect(await css('#timeseries .rc-range-btn', ['border-top-width', 'border-top-style', 'border-top-color', 'padding-top', 'padding-left', 'border-top-left-radius', 'line-height']))
      .toEqual({
        'border-top-width': '1px', 'border-top-style': 'solid', 'border-top-color': 'rgb(204, 204, 204)',
        'padding-top': '8px', 'padding-left': '16px', 'border-top-left-radius': '4px',
        'line-height': '16.1px', // 14px × 1.15, not the page's line-height
      });
    expect(await css('#timeseries .rc-chart-range-bar', ['column-gap'])).toEqual({ 'column-gap': '4px' });
  });

  // X-11: the look moved from an inline style to .rc-graph-tool; the box and
  // the colours are those the inline style drew (K-14: none inline now)
  it('the Graph tool buttons keep their box and colours from a class', async () => {
    const props = ['height', 'min-width', 'padding-left', 'border-top-width', 'border-top-color', 'border-top-left-radius',
      'background-color', 'color', 'font-size', 'line-height', 'cursor'];
    for (const sel of ['#graph .rc-graph-zoom-controls button', '#graph .rc-graph-fullscreen']) {
      expect(await css(sel, props), sel).toEqual({
        height: '26px', 'min-width': '26px', 'padding-left': '6px', 'border-top-width': '1px', 'border-top-color': 'rgb(204, 204, 204)',
        'border-top-left-radius': '4px', 'background-color': 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)', 'font-size': '14px',
        'line-height': '14px', cursor: 'pointer',
      });
    }
    expect(await page.evaluate(() => [...document.querySelectorAll('#graph .rc-graph-tools button, #line .rc-chart-header *, #line .rc-chart-footer *')]
      .filter(el => el.style.color !== '' || (el.closest('.rc-graph-tools') && el.hasAttribute('style'))).length)).toBe(0);
  });

  it('the title is 16px and MultiChart cells are 32px apart', async () => {
    expect(await css('#line .rc-chart-title', ['font-size'])).toEqual({ 'font-size': '16px' });
    expect(await css('#multi .rc-multichart-grid', ['column-gap'])).toEqual({ 'column-gap': '32px' });
  });

  // theme.bg is SVG fill here: a bare var(--bg-color) painted it black.
  it('annotation label backdrops are not black', async () => {
    expect(await css('#line .rc-annotation-label-bg', ['fill'])).toEqual({ fill: 'rgb(255, 255, 255)' });
  });
});

describe('C-14: every piece of chart text takes the chart font', () => {
  it.each([
    ['#line', '.rc-chart-title'],
    ['#line', '.rc-chart-subtitle'],
    ['#line', '.rc-legend-item span:last-child'],
    ['#line', '.rc-chart-source'],
    ['#line', '.rc-chart-note'],
    ['#timeseries', '.rc-range-btn'],
    ['#graph', '.rc-graph-zoom-controls button'],
    ['#graph', '.rc-graph-fullscreen'],
    ['#graph', '.rc-graph-note'],
    ['#multi', '.rc-multichart-cell-title'],
  ])('%s %s', async (chart, selector) => {
    const [own, text] = await Promise.all([
      css(chart, ['font-family']),
      css(`${chart} ${selector}`, ['font-family']),
    ]);
    expect(text).toEqual(own);
  });

  it('…which is the chart stack, not the page font', async () => {
    const [chart, body] = await Promise.all([css('#line', ['font-family']), css('body', ['font-family'])]);
    expect(chart['font-family']).toMatch(/^"Fira Sans", system-ui, .*sans-serif$/);
    expect(chart['font-family']).not.toBe(body['font-family']);
  });
});

// B-03: theme.tooltip arrives as --rc-tooltip-*, the typography is CSS. jsdom
// sees only the classes and properties (test/tooltip.test.js); the look is here.
describe('B-03: the tooltip', () => {
  // Hover a Line's plot at 1/4 of its width; the tooltip is the chart's own.
  const hoverLine = id => page.evaluate(chartId => {
    const overlay = document.querySelector(`#${chartId} rect.rc-overlay`);
    const r = overlay.getBoundingClientRect();
    overlay.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width / 4, clientY: r.top + 20 }));
  }, id);
  const TIP = ['font-size', 'font-family', 'color', 'background-color', 'border-top-color', 'box-shadow'];

  it('light: the default look, from the CSS fallbacks and the theme', async () => {
    await hoverLine('line');
    const tip = await css('#line .rc-tooltip', TIP);
    expect(tip['font-size']).toBe('14px');
    expect(tip['font-family']).toMatch(/^"Fira Sans", system-ui, .*sans-serif$/);   // words in the chart's font (K-15)
    expect(tip).toMatchObject({
      color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(228, 228, 228)',
      'box-shadow': 'rgba(0, 0, 0, 0.1) 0px 2px 8px 0px',
    });
    expect(await css('#line .rc-tooltip-header', ['color', 'font-size'])).toEqual({ color: 'rgb(102, 102, 102)', 'font-size': '13px' });
  });

  // RC-082 (variant A, 14px): opaque; a 24px line; the name in Fira, the
  // value in Cousine, right-aligned; the series' mark a 12×2 line.
  it('RC-082: 14px on a 24px line, opaque; names and the date in Fira, values in Cousine', async () => {
    await hoverLine('line');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#line .rc-tooltip')).opacity === '1');
    const got = await page.evaluate(() => {
      const tip = document.querySelector('#line .rc-tooltip');
      const row = tip.querySelector('.rc-tooltip-row');
      const cs = el => getComputedStyle(el);
      const value = row.querySelector('.rc-tooltip-value');
      const mark = row.querySelector('.rc-tooltip-swatch').getBoundingClientRect();
      return {
        size: cs(tip).fontSize, line: cs(tip).lineHeight, opacity: cs(tip).opacity,
        label: cs(row.querySelector('.rc-tooltip-label')).fontFamily,
        value: cs(value).fontFamily, digits: cs(value).fontVariantNumeric,
        flush: Math.round(tip.getBoundingClientRect().right - value.getBoundingClientRect().right),
        mark: [mark.width, mark.height], date: cs(tip.querySelector('.rc-tooltip-header .rc-num')).fontFamily,
      };
    });
    expect(got).toMatchObject({ size: '14px', line: '24px', opacity: '1', digits: 'tabular-nums', mark: [12, 2] });
    expect(got.label).toMatch(/^"Fira Sans", system-ui,/);
    expect(got.value).toMatch(/^"?Cousine"?, ui-monospace,/);
    // the date on top reads as words, in the text font (the mock-up, 2026-11-18)
    expect(got.date).toMatch(/^"Fira Sans", system-ui,/);
    expect(got.flush).toBe(17);                     // the right padding and the border: the value ends the row
  });

  it('darkTheme: the dark tooltip, its date header in tooltip.muted', async () => {
    await hoverLine('tip-dark');
    expect(await css('#tip-dark .rc-tooltip', ['color', 'background-color', 'border-top-color']))
      .toEqual({ color: 'rgb(232, 232, 232)', 'background-color': 'rgb(26, 26, 26)', 'border-top-color': 'rgb(46, 46, 46)' });
    expect(await css('#tip-dark .rc-tooltip-header', ['color'])).toEqual({ color: 'rgb(136, 136, 136)' });
  });

  // C-23: the inline 13px beat the documented override.
  it('a page rule that outranks .rc-tooltip restyles it', async () => {
    await hoverLine('tip-restyled');
    expect(await css('#tip-restyled .rc-tooltip', ['font-size', 'background-color']))
      .toEqual({ 'font-size': '15px', 'background-color': 'rgb(255, 255, 0)' });
  });

  it('tooltip.header: its colour, and bg as a band inside the border', async () => {
    await hoverLine('tip-band');
    expect(await css('#tip-band .rc-tooltip-header', ['color', 'background-color']))
      .toEqual({ color: 'rgb(255, 0, 0)', 'background-color': 'rgb(238, 238, 238)' });
    const band = await page.evaluate(() => {
      const tip = document.querySelector('#tip-band .rc-tooltip').getBoundingClientRect();
      const h = document.querySelector('#tip-band .rc-tooltip-header').getBoundingClientRect();
      return { left: h.left - tip.left, top: h.top - tip.top, width: tip.width - h.width };
    });
    expect(band).toEqual({ left: 1, top: 1, width: 2 });   // the 1px border on each side
  });

  // C-29: the tooltip is nowrap; a name past the 280px cap ran out of the box.
  // A tiny tooltip first, at the chart's right edge: the long one opens there
  // and must not shrink into the space that is left.
  it('a long Graph node name wraps inside the box, at the right edge too', async () => {
    const fits = await page.evaluate(() => {
      const chart = window.charts.tipLong;
      const host = chart.container.getBoundingClientRect();
      const node = [...chart.container.querySelectorAll('.rc-graph-node')].find(n => n.textContent.startsWith('A very'));
      return [200, 860].map(x => {
        chart.tooltip.show(x, 100, 'x');
        node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: host.left + x, clientY: host.top + 100 }));
        const tip = chart.container.querySelector('.rc-tooltip').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(chart.container.querySelector('.rc-tooltip-title'));
        const text = range.getBoundingClientRect();
        return { width: tip.width, inside: text.right <= tip.right - 16 && text.left >= tip.left };
      });
    });
    expect(fits).toEqual([{ width: 314, inside: true }, { width: 314, inside: true }]);   // 280 + padding + border
  });
});

// RC-002: setLoading(true) lays a slim bar over the top of the plot. jsdom
// checks the element, its tokens and aria-busy (test/chart-loading.test.js);
// the box, the colours and print are here. Each case takes it away again.
describe('RC-002: the loading bar', () => {
  const box = sel => page.evaluate(s => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, sel);
  const BAR = ['position', 'pointer-events', 'font-size', 'font-family', 'color', 'background-color', 'border-bottom-color', 'opacity', 'text-align', 'display'];

  it('it lies across the top of the plot, in the tooltip\'s colours, and lets the pointer through', async () => {
    await page.evaluate(() => window.charts.timeseries.setLoading(true));
    const plot = await box('#timeseries svg > g > rect');               // the crosshair overlay: the plot
    const bar = await box('#timeseries .rc-chart-loading');
    expect(bar.left).toBeCloseTo(plot.left, 1);
    expect(bar.top).toBeCloseTo(plot.top, 1);
    expect(bar.width).toBeCloseTo(plot.width, 1);
    expect(bar.height).toBeGreaterThan(15);
    expect(bar.height).toBeLessThan(30);
    const look = await css('#timeseries .rc-chart-loading', BAR);
    expect(look).toMatchObject({
      position: 'absolute', 'pointer-events': 'none', 'font-size': '12px', color: 'rgb(102, 102, 102)',
      'background-color': 'rgb(255, 255, 255)', 'border-bottom-color': 'rgb(228, 228, 228)', opacity: '0.9',
      'text-align': 'center', display: 'block',
    });
    expect(look['font-family']).toBe((await css('#timeseries', ['font-family']))['font-family']);   // the chart's text font
    expect(await page.evaluate(() => document.querySelector('#timeseries').getAttribute('aria-busy'))).toBe('true');
    await page.evaluate(() => window.charts.timeseries.setLoading(false));
    expect(await page.evaluate(() => document.querySelector('#timeseries .rc-chart-loading'))).toBeNull();
  });

  it('darkTheme: the dark tooltip\'s colours', async () => {
    await page.evaluate(() => window.charts.tipDark.setLoading(true));
    expect(await css('#tip-dark .rc-chart-loading', ['color', 'background-color', 'border-bottom-color']))
      .toEqual({ color: 'rgb(136, 136, 136)', 'background-color': 'rgb(26, 26, 26)', 'border-bottom-color': 'rgb(46, 46, 46)' });
    await page.evaluate(() => window.charts.tipDark.setLoading(false));
  });

  it('it follows the plot on a narrow card, and is hidden in print', async () => {
    await page.evaluate(() => window.charts.timeseries.setLoading(true));
    await page.setViewportSize({ width: 375, height: 900 });
    await page.waitForTimeout(150);                                    // the ResizeObserver's frame
    const plot = await box('#timeseries svg > g > rect');
    const bar = await box('#timeseries .rc-chart-loading');
    expect(plot.width).toBeLessThan(375);
    expect(bar.left).toBeCloseTo(plot.left, 1);
    expect(bar.width).toBeCloseTo(plot.width, 1);
    await page.emulateMedia({ media: 'print' });
    expect((await css('#timeseries .rc-chart-loading', ['display'])).display).toBe('none');
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => window.charts.timeseries.setLoading(false));
  });
});

describe('K-01: no webfont from the library', () => {
  it('the page makes no font-host request', () => {
    expect(requests.filter(u => FONT_HOSTS.test(u))).toEqual([]);
    expect(requests.some(u => u.endsWith('/assets/charts/rare-charts.js'))).toBe(true);
  });

  it('the injected stylesheet has no @import', async () => {
    const injected = await page.evaluate(() => document.getElementById('rc-base-styles')?.textContent ?? null);
    expect(injected).toContain('.rc-chart');
    expect(injected).not.toMatch(/@import/);
  });
});
