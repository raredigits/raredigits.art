// The interactive legend in a real browser (legend spec §13, S11; RC-054).
// jsdom checks the gesture rules with synthetic events (test/legend.test.js);
// here the browser makes the events: a real double click and a double tap,
// Enter and Space, the hit area, the boxes the items keep while "Show all"
// comes and goes, a hide in every class with a series legend, and — the
// RC-063 targets — the item and Show all under Rare Styles v0.7.1 and
// v0.7.2 against the bare page, at rest, hovered, pressed and focused.
//
// Needs the RareCharts bundle (`npm run test:browser` builds it first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';
import { openHost } from './hosts.js';

const FIXTURE = '/test/browser/fixtures/charts-legend.html';
const HIDE_DELAY_MS = 250;   // src/core/legend.js

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

async function settle(page) {
  await page.evaluate(async () => { await window.ready; await document.fonts.ready; });
  await page.waitForTimeout(150);
}

async function open(host = 'bare', options) {
  const { page, errors } = await openHost(browser, origin, FIXTURE, host, options);
  await settle(page);
  return { page, errors };
}

const item = (id, key) => `#${id} button.rc-legend-item[data-key="${key}"]`;
const reset = id => `#${id} .rc-legend-reset`;
// A single click, committed: past the hide delay and the system's double
// click interval, so the next click is a click of its own.
const clickOnce = async (page, selector) => {
  await page.click(selector);
  await page.waitForTimeout(600);
};

// What a chart shows: its toggles' pressed states, Show all's, and how many
// of the given marks it draws.
const state = (page, id, marks = 'path.rc-line') => page.evaluate(([id, marks]) => {
  const root = document.getElementById(id);
  const showAll = root.querySelector('.rc-legend-reset');
  return {
    pressed: [...root.querySelectorAll('button.rc-legend-item[data-key]')]
      .map(b => `${b.dataset.key}:${b.getAttribute('aria-pressed')}`),
    showAll: showAll ? !showAll.hidden : null,
    marks: root.querySelectorAll(marks).length,
  };
}, [id, marks]);

// Every render of a chart from now on, with the lines it then draws.
const countRenders = (page, id) => page.evaluate((id) => {
  const chart = window.charts[id];
  const render = chart.render;
  window.frames = [];
  chart.render = (...args) => {
    const out = render.apply(chart, args);
    window.frames.push(chart.container.querySelectorAll('path.rc-line').length);
    return out;
  };
}, id);
const frames = page => page.evaluate(() => window.frames);

// The boxes of a legend's items, rounded to 0.1px.
const boxes = (page, id) => page.evaluate((id) => [...document.querySelectorAll(`#${id} .rc-legend-item`)].map((el) => {
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 10) / 10);
}), id);

describe('the legend gestures in a real browser', () => {
  it('a double click keeps one series in one render; a second brings all back with no empty frame', async () => {
    const { page, errors } = await open();
    await countRenders(page, 'line');
    await page.dblclick(item('line', 'Bob'));
    await page.waitForTimeout(HIDE_DELAY_MS + 100);
    expect(await frames(page)).toEqual([1]);
    expect((await state(page, 'line')).pressed).toEqual(['Alice:false', 'Bob:true', 'Carol:false']);

    await page.evaluate(() => { window.frames = []; });
    await page.dblclick(item('line', 'Bob'));
    await page.waitForTimeout(HIDE_DELAY_MS + 100);
    expect(await frames(page)).toEqual([3]);
    expect(await state(page, 'line')).toEqual({ pressed: ['Alice:true', 'Bob:true', 'Carol:true'], showAll: false, marks: 3 });
    expect(errors).toEqual([]);
    await page.close();
  });

  it('a click hides after the double-click delay, and only then', async () => {
    const { page } = await open();
    await page.click(item('line', 'Bob'));
    expect((await state(page, 'line')).marks).toBe(3);
    await page.waitForTimeout(HIDE_DELAY_MS + 100);
    expect(await state(page, 'line')).toEqual({ pressed: ['Alice:true', 'Bob:false', 'Carol:true'], showAll: true, marks: 2 });
    await page.close();
  });

  it('a double tap on a touch screen keeps one series, as a double click does', async () => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 1000, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}${FIXTURE}?host=bare`);
    await settle(page);
    await page.tap(item('line', 'Carol'));
    await page.tap(item('line', 'Carol'));
    await page.waitForTimeout(HIDE_DELAY_MS + 100);
    expect((await state(page, 'line')).pressed).toEqual(['Alice:false', 'Bob:false', 'Carol:true']);
    await context.close();
  });

  it('Enter and Space toggle at once; Show all by the keyboard hands focus to the toggle before it', async () => {
    const { page } = await open();
    await page.focus(item('line', 'Alice'));
    await page.keyboard.press('Enter');
    expect((await state(page, 'line')).pressed).toEqual(['Alice:false', 'Bob:true', 'Carol:true']);
    await page.keyboard.press('Space');
    expect((await state(page, 'line')).pressed).toEqual(['Alice:true', 'Bob:true', 'Carol:true']);

    await page.keyboard.press('Enter');
    await page.focus(reset('line'));
    await page.keyboard.press('Enter');
    expect(await state(page, 'line')).toMatchObject({ pressed: ['Alice:true', 'Bob:true', 'Carol:true'], showAll: false });
    expect(await page.evaluate(() => document.activeElement?.dataset.key)).toBe('Carol');
    expect(await page.evaluate(() => document.activeElement.matches(':focus-visible'))).toBe(true);
    await page.close();
  });

  it('the hit area reaches 2px above and below an item', async () => {
    const { page } = await open();
    const box = await page.locator(item('line', 'Alice')).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y - 2);
    await page.waitForTimeout(600);
    expect((await state(page, 'line')).pressed).toEqual(['Alice:false', 'Bob:true', 'Carol:true']);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 2);
    await page.waitForTimeout(600);
    expect((await state(page, 'line')).pressed).toEqual(['Alice:true', 'Bob:true', 'Carol:true']);
    await page.close();
  });

  it.each(['line', 'right'])('#%s: the items keep their boxes while Show all comes and goes; the card keeps its height', async (id) => {
    const { page } = await open();
    const card = () => page.evaluate(id => document.getElementById(id).getBoundingClientRect().height, id);
    const [items0, height0] = [await boxes(page, id), await card()];
    await clickOnce(page, item(id, 'Carol'));
    expect((await state(page, id)).showAll).toBe(true);
    expect(await boxes(page, id)).toEqual(items0);
    expect(await card()).toBe(height0);
    await clickOnce(page, item(id, 'Carol'));
    expect((await state(page, id)).showAll).toBe(false);
    expect(await boxes(page, id)).toEqual(items0);
    await page.close();
  });

  // F1: in the right-hand column Show all is laid out while hidden, so the
  // centred items do not move when it shows; it is not an item.
  it('Show all in the column is laid out while hidden and carries no item class', async () => {
    const { page } = await open();
    const look = await page.evaluate(() => {
      const el = document.querySelector('#right .rc-chart-legend-aside .rc-legend-reset');
      const cs = getComputedStyle(el);
      return { hidden: el.hidden, display: cs.display, visibility: cs.visibility, item: el.classList.contains('rc-legend-item') };
    });
    expect(look).toMatchObject({ hidden: true, visibility: 'hidden', item: false });
    expect(look.display).not.toBe('none');
    await page.close();
  });
});

describe('a hide and Show all in every class with a series legend', () => {
  it('each chart hides the series of the item and brings it back', async () => {
    const { page, errors } = await open();
    const cases = await page.evaluate(() => window.cases);
    for (const [id, key, marks] of cases) {
      const before = await state(page, id, marks);
      expect(before.pressed, id).toContain(`${key}:true`);
      expect(before.showAll, id).toBe(false);
      await clickOnce(page, item(id, key));
      const off = await state(page, id, marks);
      expect(off.pressed, id).toContain(`${key}:false`);
      expect(off.showAll, id).toBe(true);
      expect(off.marks, id).toBeLessThan(before.marks);
      await clickOnce(page, reset(id));
      expect(await state(page, id, marks), id).toEqual(before);
    }
    expect(errors).toEqual([]);
    await page.close();
  });

  it("the shared legend of a MultiChart hides the name in every cell, and the grid's group has a name", async () => {
    const { page } = await open();
    const lines = () => page.evaluate(() => [...document.querySelectorAll('#multi .rc-multichart-cell')]
      .map(cell => cell.querySelectorAll('path.rc-line').length));
    expect(await lines()).toEqual([2, 1]);
    await clickOnce(page, item('multi', 'Bob'));
    expect(await lines()).toEqual([1, 0]);
    const grid = await page.evaluate(() => {
      const el = document.querySelector('#multi .rc-multichart-grid');
      return [el.getAttribute('role'), el.getAttribute('aria-label')];
    });
    expect(grid).toEqual(['group', 'Shared']);
    await page.close();
  });
});

// ─── The host comparison (RC-063) ──────────────────────────────────────────

// The look of a control: frame, fill, spacing, shape and pointer, as in
// charts-rd-host.test.js; the focus ring's width and style (its colour is
// the page's --chart-focus-ring on Rare Styles, on purpose: RC-014).
const CHROME = [
  'display', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-left-radius', 'border-bottom-right-radius', 'background-color', 'background-image', 'box-shadow',
  'text-decoration-line', 'cursor', 'opacity', 'vertical-align', 'transition-property', 'appearance',
  'height', 'line-height', 'gap',
];
const RING = ['outline-style', 'outline-width', 'outline-offset'];
// The three controls take the forced state; their parts are read under it.
const CONTROLS = [item('chrome', 'Alice'), item('chrome', 'Carol'), reset('chrome')];
const TARGETS = {
  on: `${item('chrome', 'Alice')}`,
  off: `${item('chrome', 'Carol')}`,
  offLabel: `${item('chrome', 'Carol')} > span:last-child`,
  swatch: `${item('chrome', 'Alice')} > span:first-child`,
  showAll: reset('chrome'),
  showAllText: `${reset('chrome')} > span`,
};

const read = (page, selector, props) => page.evaluate(([s, ps]) => [...document.querySelectorAll(s)].map((el) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(ps.map(p => [p, cs.getPropertyValue(p)]));
}), [selector, props]);

const sessions = new WeakMap();
async function force(page, selector, pseudo) {
  if (!sessions.has(page)) {
    const s = await page.context().newCDPSession(page);
    await s.send('DOM.enable');
    await s.send('CSS.enable');
    sessions.set(page, s);
  }
  const cdp = sessions.get(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudo ? [pseudo] : [] });
  await page.waitForTimeout(50);
  return nodeIds.length;
}

describe('RC-063: the legend item and Show all under Rare Styles look as on a bare page', () => {
  it.each(['v071', 'v072'])('the fixture has the targets on %s', async (host) => {
    const { page, errors } = await open(host);
    const count = await page.evaluate(([targets]) => ({
      ...Object.fromEntries(Object.entries(targets).map(([k, s]) => [k, document.querySelectorAll(s).length])),
      showAllShown: !document.querySelector('#chrome .rc-legend-reset').hidden,
      rare: !!document.getElementById('rare'),
    }), [TARGETS]);
    expect(count).toEqual({ on: 1, off: 1, offLabel: 1, swatch: 1, showAll: 1, showAllText: 1, showAllShown: true, rare: true });
    expect(errors).toEqual([]);
    await page.close();
  });

  it.each([
    ['v072', null], ['v072', 'hover'], ['v072', 'active'], ['v072', 'focus-visible'],
    ['v071', null], ['v071', 'hover'], ['v071', 'active'], ['v071', 'focus-visible'],
  ])('on %s, state %s', async (host, pseudo) => {
    const [rare, bare] = [(await open(host)).page, (await open('bare')).page];
    if (pseudo) {
      for (const sel of CONTROLS) {
        expect(await force(rare, sel, pseudo), sel).toBe(1);
        await force(bare, sel, pseudo);
      }
    }
    const props = pseudo === 'focus-visible' ? [...CHROME, ...RING] : CHROME;
    for (const [name, sel] of Object.entries(TARGETS)) {
      expect.soft(await read(rare, sel, props), `${name}${pseudo ? `:${pseudo}` : ''}`).toEqual(await read(bare, sel, props));
    }
    await rare.close();
    await bare.close();
  });

  it('the focus ring is 2px solid, 2px off the item, on every host', async () => {
    for (const host of ['bare', 'v071', 'v072']) {
      const { page } = await open(host);
      await page.focus(item('chrome', 'Alice'));
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      expect(await read(page, item('chrome', 'Alice'), RING), host)
        .toEqual([{ 'outline-style': 'solid', 'outline-width': '2px', 'outline-offset': '2px' }]);
      await page.close();
    }
  });
});
