// CSS-381 (v0.7.2): RareCharts in the hostile-host fixture — a chart page
// under the gated library (`<html class="rd">`), after the button system and
// the `appearance: none` forms of Part C1 landed. RareCharts' own controls
// (range buttons, the Lin/Log switch, the Graph legend, breadcrumbs and
// tools) and the page controls a chart moves into its `controls:` row must
// look exactly as RareCharts sets them: the library's button and form
// defaults stop at `.rc-chart` (elements/_buttons.scss, _forms.scss).
//
// The oracle is the same page with rare.css switched off: every chrome
// property of every chart control, at rest, hovered and pressed, must not
// change. Two things the library does reach on purpose stay out of the
// comparison: normalize's `-webkit-appearance: button` on a <button> (since
// v0.7.0) and the keyboard focus ring (CSS-110). The same controls outside
// the chart (#ref) do take the library look, which proves the gate is live.
//
// Needs the RareCharts bundle (`npm run test:browser` builds it first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/charts-rd-host.html';

let browser;
let server;
let origin;

beforeAll(async () => {
  if (!existsSync('assets/charts/rare-charts.js')) throw new Error('No bundle — run `node scripts/build-charts.mjs` first.');
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

async function open(width, query = '') {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, timezoneId: 'UTC' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(origin + FIXTURE + query);
  await page.evaluate(async () => { await window.ready; await document.fonts.ready; });
  await page.waitForTimeout(150);
  return { page, errors };
}

// The look of a control: frame, fill, spacing, shape and pointer.
const CHROME = [
  'display', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-left-radius', 'border-bottom-right-radius', 'background-color', 'background-image', 'box-shadow',
  'text-decoration-line', 'cursor', 'opacity', 'vertical-align', 'transition-property', 'accent-color',
];
const without = (list, ...drop) => list.filter((p) => !drop.includes(p));

// Per target, what may not change. Two exclusions are not the button or
// form system: the Graph tools (.rc-graph-tool, X-11) take the card's
// background, the page's --chart-bg (CSS-380), and a select's box
// follows the font size normalize lets it inherit (14px in the controls
// row, 13.33px without the library).
const TARGETS = {
  range: ['#line .rc-range-btn:not(.rc-scale-btn)', CHROME],
  scale: ['#line .rc-scale-btn', CHROME],
  legend: ['#graph .rc-graph-legend-item', CHROME],
  breadcrumbs: ['#graph .rc-graph-breadcrumbs button', CHROME],
  tools: ['#graph .rc-graph-tools button:not([hidden])', without(CHROME, 'background-color')],
  checkbox: ['#ctl-chart .rc-chart-controls input[type="checkbox"]', [...CHROME, 'appearance', 'width', 'height']],
  select: ['#ctl-chart .rc-chart-controls select', [...CHROME, 'appearance']],
  // RC-003: the custom range's button and its open panel (a date field's
  // width follows the face, so its height only)
  custom: ['#custom .rc-range-custom', CHROME],
  customPanel: ['#custom .rc-range-panel', CHROME],
  customLabel: ['#custom .rc-range-label', CHROME],
  customInput: ['#custom .rc-range-input', [...CHROME, 'appearance', 'height']],
  customApply: ['#custom .rc-range-apply', [...CHROME, 'appearance', 'height']],
};

// The custom range panel wears the tooltip's tokens (RC-014): on the
// library, its --chart-tooltip-shadow, a color-mix() — the same black at 10%,
// serialised as color(srgb …); read here as the rgba() it equals.
const srgb = (v) => v.replace(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g,
  (_, r, g, b, a) => `rgba(${[r, g, b].map((c) => Math.round(c * 255)).join(', ')}, ${+a})`);
const read = async (page, selector, props) => (await page.evaluate(([s, ps]) => [...document.querySelectorAll(s)].map((el) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
}), [selector, props])).map((o) => ('box-shadow' in o ? { ...o, 'box-shadow': srgb(o['box-shadow']) } : o));

// A state forced through the DevTools protocol on every match of a target:
// no pointer to move, no press that would click.
const sessions = new WeakMap(); // a forced state belongs to the session that set it
async function force(page, selector, state) {
  if (!sessions.has(page)) {
    const s = await page.context().newCDPSession(page);
    await s.send('DOM.enable');
    await s.send('CSS.enable');
    sessions.set(page, s);
  }
  const cdp = sessions.get(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: state ? [state] : [] });
  // RareCharts' own 0.1s transitions (and the library's, if it leaked) end first
  await page.waitForTimeout(350);
  return nodeIds.length;
}

// The fixture with the library (`<html class="rd">` + rare.css) against the
// same fixture without rare.css (`?bare`): RareCharts alone.
async function pair(width) {
  return [(await open(width)).page, (await open(width, '?bare')).page];
}

describe('CSS-381: RareCharts controls under the gated library', () => {
  it.each([1440, 375])('the fixture has every control the case needs at %ipx', async (width) => {
    const { page, errors } = await open(width);
    const count = await page.evaluate(() => ({
      range: document.querySelectorAll('#line .rc-range-btn:not(.rc-scale-btn)').length,
      scale: document.querySelectorAll('#line .rc-scale-btn').length,
      legend: document.querySelectorAll('#graph .rc-graph-legend-item').length,
      breadcrumbs: document.querySelectorAll('#graph .rc-graph-breadcrumbs button').length,
      disabledCrumb: document.querySelectorAll('#graph .rc-graph-breadcrumbs button:disabled').length,
      tools: document.querySelectorAll('#graph .rc-graph-tools button:not([hidden])').length,
      checkbox: document.querySelectorAll('#ctl-chart .rc-chart-controls input[type="checkbox"]').length,
      select: document.querySelectorAll('#ctl-chart .rc-chart-controls select').length,
      customInput: document.querySelectorAll('#custom .rc-range-panel .rc-range-input').length,
      customApply: document.querySelectorAll('#custom .rc-range-panel .rc-range-apply').length,
      rd: document.documentElement.classList.contains('rd') && !!document.getElementById('rare'),
    }));
    expect(count).toMatchObject({ range: 4, scale: 1, breadcrumbs: 2, checkbox: 1, select: 1, customInput: 2, customApply: 1, rd: true });
    expect(count.disabledCrumb).toBe(1); // the current view: RareCharts' own disabled look
    expect(count.legend).toBeGreaterThanOrEqual(2);
    expect(count.tools).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
    await page.close();
  });

  it.each([
    [1440, null], [375, null], [1440, 'hover'], [375, 'hover'], [1440, 'active'],
  ])('at %ipx, state %s: every chart control looks as RareCharts alone draws it', async (width, state) => {
    const [rd, bare] = await pair(width);
    for (const [name, [sel, props]] of Object.entries(TARGETS)) {
      if (state) {
        expect(await force(rd, sel, state), name).toBeGreaterThan(0);
        await force(bare, sel, state);
      }
      expect.soft(await read(rd, sel, props), `${name}${state ? `:${state}` : ''}`).toEqual(await read(bare, sel, props));
      if (state) { await force(rd, sel, null); await force(bare, sel, null); }
    }
    await rd.close();
    await bare.close();
  });

  // RC-002: the loading bar is a plain div — the library's element rules
  // must not reach it either
  it.each([1440, 375])('at %ipx the loading bar looks and sits as RareCharts alone draws it', async (width) => {
    const [rd, bare] = await pair(width);
    const BAR = [...CHROME, 'position', 'font-size', 'font-family', 'line-height', 'color', 'text-align', 'margin-top', 'margin-left'];
    const look = page => page.evaluate((props) => {
      window.charts.line.setLoading(true);
      const el = document.querySelector('#line .rc-chart-loading');
      const cs = getComputedStyle(el);
      const card = document.querySelector('#line').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        style: Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])),
        box: [r.left - card.left, r.top - card.top, r.width, r.height].map(v => Math.round(v * 10) / 10),
      };
    }, BAR);
    const [withLibrary, alone] = [await look(rd), await look(bare)];
    // the family reads the page's font token since K-15 (Rare Styles' own
    // stack, Fira Sans first): the same face, a different fallback list
    const face = st => ({ ...st, 'font-family': st['font-family'].split(',')[0].replace(/"/g, '').trim() });
    expect(face(withLibrary.style)).toEqual(face(alone.style));
    expect(withLibrary.box[2]).toBeGreaterThan(0);
    expect(withLibrary.box[3]).toBeCloseTo(alone.box[3], 1);
    await rd.close();
    await bare.close();
  });

  it("the range buttons keep RareCharts' own look in every state; the Log toggle keeps its look under hover", async () => {
    const { page } = await open(1440);
    const props = ['border-top-color', 'border-top-width', 'border-top-left-radius', 'padding-top', 'padding-left', 'background-color', 'background-image'];
    const [rest] = await read(page, '#line .rc-range-btn:not(.active):not(.rc-scale-btn)', props);
    expect(rest).toMatchObject({
      'border-top-color': 'rgb(204, 204, 204)', 'border-top-width': '1px', 'border-top-left-radius': '4px',
      'padding-top': '8px', 'padding-left': '16px', 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none',
    });
    await force(page, '#line .rc-scale-btn', 'hover');
    const [scale] = await read(page, '#line .rc-scale-btn', props);
    // the Log toggle, off: no fill, under the host's hover too (RC-083; it was the diagonal fill)
    expect(scale['background-image']).toBe('none');
    expect(scale['background-color']).toBe('rgba(0, 0, 0, 0)');
    expect(scale['border-top-color']).toBe('rgb(0, 0, 0)');
    await page.close();
  });

  it('the same controls outside the chart do take the library look (the gate is live)', async () => {
    const { page } = await open(1440);
    const [check] = await read(page, '#ref-check', ['appearance', 'border-top-color']);
    const [select] = await read(page, '#ref-select', ['appearance', 'background-image']);
    const [button] = await read(page, '#ref-button', ['border-top-color', 'border-top-left-radius', 'background-color']);
    expect(check.appearance).toBe('none');
    expect(select.appearance).toBe('none');
    expect(select['background-image']).toMatch(/linear-gradient/);
    expect(button).toEqual({ 'border-top-color': 'rgb(204, 204, 204)', 'border-top-left-radius': '32px', 'background-color': 'rgb(250, 250, 250)' });
    await page.close();
  });
});
