// RC-003 in a real engine: the custom range panel (analytics spec §6). jsdom
// checks the rule, the DOM and the keyboard (test/custom-range.test.js) and
// reads the stylesheet (test/charts-css.test.js); here, the panel's box and
// look on the three pages RareCharts must stand on (C-13, RC-032): a bare
// page, a Rare Styles v0.7.1 host and a v0.7.2 host, at 320 and 375 px (a
// phone: touch, coarse pointer) and at 1440.
//
// v0.7.1 is the published rare.css, read from git at its release commit
// (the v0.7.1 row of assets/css/docs/SIZE-BASELINE.md; the workflows check
// out the whole history) and served beside v0.7.2's, so both load the same
// fonts. The fixture: test/browser/fixtures/charts-custom-range.html.
//
// Needs the RareCharts bundle (`npm run test:browser` builds it first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

// The same look written two ways is the same look: since K-15 the font
// family reads the page's token (Rare Styles' stack, Fira Sans first), and
// Chrome writes a shadow colour from a color-mix as color(srgb …).
const srgb = v => v.replace(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g,
  (_, r, g, b, a) => `rgba(${[r, g, b].map(c => Math.round(c * 255)).join(', ')}, ${+a})`);
const norm = x => (Array.isArray(x) ? x.map(norm)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k,
    k === 'font-family' ? v.split(',')[0].replace(/"/g, '').trim()
      : typeof v === 'string' ? srgb(v) : norm(v)]))
  : x);

const FIXTURE = '/test/browser/fixtures/charts-custom-range.html';
const V071 = 'd6ae6bb';
const HOSTS = ['bare', 'v0.7.1', 'v0.7.2'];
const WIDTHS = [320, 375, 1440];
const CHARTS = ['ts', 'flow', 'dark', 'short'];

let browser;
let server;
let origin;
let css071;

beforeAll(async () => {
  if (!existsSync('assets/charts/rare-charts.js')) throw new Error('No bundle — run `node scripts/build-charts.mjs` first.');
  css071 = execFileSync('git', ['show', `${V071}:assets/css/rare.css`], { maxBuffer: 1 << 26 });
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

async function open(host, width) {
  const phone = width < 768;
  const context = await browser.newContext({ viewport: { width, height: 1100 }, isMobile: phone, hasTouch: phone, timezoneId: 'UTC' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  await page.route('**/assets/css/rare-v0.7.1.css', r => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: css071 }));
  await page.goto(`${origin}${FIXTURE}?host=${host}`);
  await page.evaluate(async () => { await window.ready; });
  await page.waitForTimeout(150);
  return { context, page, errors };
}

// The panel's parts, each a box in the page and the properties that make
// its look. The font family is the chart's stack on every host; whether
// that face is installed is the machine's, so widths are compared only
// where both pages load the same webfont (the two Rare Styles hosts).
const LOOK = [
  'display', 'box-sizing', 'appearance', 'position', 'font-size', 'font-weight', 'font-family', 'line-height',
  'letter-spacing', 'text-transform', 'text-align', 'color', 'background-color', 'background-image', 'box-shadow',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-left',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-left-radius', 'border-bottom-right-radius', 'min-height', 'opacity', 'cursor', 'vertical-align', 'color-scheme',
];
const PARTS = { panel: '.rc-range-panel', label: '.rc-range-label', input: '.rc-range-input', apply: '.rc-range-apply' };

// Open a chart's panel and read it.
async function readPanel(page, id) {
  await page.click(`#${id} .rc-range-custom`);
  return page.evaluate(([chart, parts, props]) => {
    const card = document.getElementById(chart);
    const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const cs = getComputedStyle(card);
    const c = box(card);
    const look = {};
    const boxes = {};
    for (const [name, sel] of Object.entries(parts)) {
      const els = [...card.querySelectorAll(sel)];
      look[name] = els.map(el => { const s = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, s.getPropertyValue(p)])); });
      boxes[name] = els.map(box);
    }
    return {
      content: {
        left: c.left + card.clientLeft + parseFloat(cs.paddingLeft),
        right: c.left + card.clientLeft + card.clientWidth - parseFloat(cs.paddingRight),
        top: c.top + card.clientTop + parseFloat(cs.paddingTop),
        bottom: c.top + card.clientTop + card.clientHeight - parseFloat(cs.paddingBottom),
      },
      button: box(card.querySelector('.rc-range-custom')),
      boxes,
      look,
      focus: document.activeElement === card.querySelector('.rc-range-input'),
    };
  }, [id, PARTS, LOOK]);
}

async function readAll(host, width) {
  const { context, page, errors } = await open(host, width);
  const out = {};
  for (const id of CHARTS) {
    out[id] = await readPanel(page, id);
    await page.keyboard.press('Escape');
  }
  out.sheet = await page.evaluate(() => {
    const el = document.getElementById('rare');
    if (!el) return null;
    const rules = [...el.sheet.cssRules];
    return { rules: rules.length, gatesCharts: rules.some(r => r.selectorText?.includes('.rc-chart')) };
  });
  expect(errors).toEqual([]);
  await context.close();
  return out;
}

const near = (a, b) => Math.abs(a - b) <= 0.5;

describe('RC-003: the custom range panel on a bare page and on Rare Styles v0.7.1 and v0.7.2', () => {
  const seen = {};
  beforeAll(async () => {
    for (const host of HOSTS) for (const width of WIDTHS) seen[`${host}@${width}`] = await readAll(host, width);
  });

  it('the hosts are what they say: no sheet, v0.7.1 (charts not gated out yet), v0.7.2 (gated out)', () => {
    for (const width of WIDTHS) {
      expect(seen[`bare@${width}`].sheet).toBeNull();
      expect(seen[`v0.7.1@${width}`].sheet).toMatchObject({ gatesCharts: false });
      expect(seen[`v0.7.1@${width}`].sheet.rules).toBeGreaterThan(1000);
      expect(seen[`v0.7.2@${width}`].sheet).toMatchObject({ gatesCharts: true });
    }
  });

  it.each(HOSTS.flatMap(host => WIDTHS.map(width => [host, width])))(
    '%s at %ipx: under its button, inside the card, its parts inside it, focus on From',
    (host, width) => {
      for (const id of CHARTS) {
        const { content, button, boxes, focus } = seen[`${host}@${width}`][id];
        const [panel] = boxes.panel;
        const at = `${id}`;
        // 4px under the button; a card too short for that lifts it to fit
        if (button.bottom + 4 + panel.height <= content.bottom + 0.5) expect(near(panel.top, button.bottom + 4), `${at}: 4px under the button`).toBe(true);
        else expect(near(panel.bottom, content.bottom), `${at}: lifted to the card's bottom`).toBe(true);
        expect(panel.top, `${at}: inside the card (top)`).toBeGreaterThanOrEqual(content.top - 0.5);
        expect(panel.left, `${at}: inside the card (left)`).toBeGreaterThanOrEqual(content.left - 0.5);
        expect(panel.right, `${at}: inside the card (right)`).toBeLessThanOrEqual(content.right + 0.5);
        expect(panel.bottom, `${at}: inside the card (bottom)`).toBeLessThanOrEqual(content.bottom + 0.5);
        // its right edge on the button's, unless that would leave the card
        if (button.right - panel.width >= content.left) expect(near(panel.right, button.right), `${at}: right-aligned`).toBe(true);
        else expect(near(panel.left, content.left), `${at}: held at the card's left`).toBe(true);
        for (const part of [...boxes.label, ...boxes.input, ...boxes.apply]) {
          expect(part.left).toBeGreaterThanOrEqual(panel.left);
          expect(part.right).toBeLessThanOrEqual(panel.right);
          expect(part.bottom).toBeLessThanOrEqual(panel.bottom);
        }
        // a date fits: the fields are the panel's widest part
        boxes.input.forEach(f => expect(f.width, `${at}: field width`).toBeGreaterThan(110));
        expect(near(boxes.input[0].width, boxes.input[1].width)).toBe(true);
        expect(boxes.apply[0].top).toBeGreaterThan(boxes.input[1].bottom);
        expect(focus, `${at}: focus on From`).toBe(true);
      }
    },
  );

  // #short at 170px: on a phone its header wraps and leaves 118px under the
  // button for a 123px panel
  it('on a phone the short card has no room under the button: the panel is lifted there, and only there', () => {
    for (const host of HOSTS) {
      for (const width of WIDTHS) {
        const { short, ts } = seen[`${host}@${width}`];
        if (width < 768) expect(short.boxes.panel[0].top, `${host}@${width}`).toBeLessThan(short.button.bottom + 4 - 0.5);
        expect(near(ts.boxes.panel[0].top, ts.button.bottom + 4), `${host}@${width}`).toBe(true);
      }
    }
  });

  it.each(['v0.7.1', 'v0.7.2'])('%s: every part looks as RareCharts alone draws it, at every width', host => {
    for (const width of WIDTHS) {
      for (const id of CHARTS) {
        const [withHost, alone] = [seen[`${host}@${width}`][id], seen[`bare@${width}`][id]];
        expect.soft(norm(withHost.look), `${id} at ${width}`).toEqual(norm(alone.look));
        // heights are the type's and the spacing's, the same whatever face
        for (const part of Object.keys(PARTS)) {
          withHost.boxes[part].forEach((b, i) => expect.soft(near(b.height, alone.boxes[part][i].height), `${id} ${part} height at ${width}`).toBe(true));
        }
      }
    }
  });

  it('v0.7.1 and v0.7.2 draw the same boxes (the same webfont)', () => {
    for (const width of WIDTHS) {
      for (const id of CHARTS) {
        const [a, b] = [seen[`v0.7.1@${width}`][id].boxes, seen[`v0.7.2@${width}`][id].boxes];
        for (const part of Object.keys(PARTS)) {
          a[part].forEach((box, i) => expect.soft(near(box.width, b[part][i].width) && near(box.height, b[part][i].height), `${id} ${part} at ${width}`).toBe(true));
        }
      }
    }
  });

  it('the look: 14px (16px on a phone), the tooltip\'s colours, theme.border fields, an Apply framed in the text colour', () => {
    const desk = seen['bare@1440'];
    const phone = seen['bare@320'];
    expect(desk.ts.look.panel[0]).toMatchObject({
      'font-size': '14px', 'line-height': '16.1px', color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)',
      'border-top-color': 'rgb(228, 228, 228)', 'box-shadow': 'rgba(0, 0, 0, 0.1) 0px 2px 8px 0px', 'color-scheme': 'light',
    });
    expect(phone.ts.look.panel[0]['font-size']).toBe('16px');
    expect(phone.ts.look.input[0]['font-size']).toBe('16px');
    expect(desk.ts.look.label[0]).toMatchObject({ color: 'rgb(102, 102, 102)', 'font-size': '14px' });
    expect(desk.ts.look.input[0]).toMatchObject({
      appearance: 'none', 'border-top-color': 'rgb(204, 204, 204)', 'border-top-width': '1px', 'border-top-left-radius': '4px',
      'background-color': 'rgba(0, 0, 0, 0)', 'padding-top': '4px', 'padding-left': '8px', 'font-size': '14px',
    });
    expect(desk.ts.look.apply[0]).toMatchObject({
      appearance: 'none', 'border-top-color': 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)',
      'padding-left': '16px', cursor: 'pointer', opacity: '1',
    });
    // darkTheme: the dark tooltip's colours, theme.border #888, a dark picker
    expect(desk.dark.look.panel[0]).toMatchObject({
      color: 'rgb(232, 232, 232)', 'background-color': 'rgb(26, 26, 26)', 'border-top-color': 'rgb(46, 46, 46)', 'color-scheme': 'dark',
    });
    expect(desk.dark.look.label[0].color).toBe('rgb(136, 136, 136)');
    expect(desk.dark.look.input[0]).toMatchObject({ color: 'rgb(232, 232, 232)', 'border-top-color': 'rgb(136, 136, 136)' });
  });
});

// A state forced through the DevTools protocol on every match: no pointer
// to move, no press that would click (as test/browser/charts-rd-host.test.js).
// One session per page: a forced state belongs to the session that set it,
// and the next call replaces it.
const sessions = new WeakMap();
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
  for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [state] });
  return nodeIds.length;
}

describe('RC-003: hovered, pressed and focused, the fields and Apply still look as RareCharts alone draws them', () => {
  // v0.7.1's `button:hover` reaches into a chart (v0.7.2's stops at it)
  it.each(['v0.7.1', 'v0.7.2'])('%s', async host => {
    const looks = {};
    for (const h of [host, 'bare']) {
      const { context, page } = await open(h, 1440);
      await page.click('#ts .rc-range-custom');
      looks[h] = {};
      for (const state of ['hover', 'active', 'focus']) {
        for (const sel of ['#ts .rc-range-input', '#ts .rc-range-apply']) {
          expect(await force(page, sel, state)).toBeGreaterThan(0);
        }
        looks[h][state] = await page.evaluate(props => [...document.querySelectorAll('#ts .rc-range-input, #ts .rc-range-apply')]
          .map(el => { const s = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, s.getPropertyValue(p)])); }),
        LOOK);
      }
      await context.close();
    }
    for (const state of ['hover', 'active', 'focus']) expect.soft(norm(looks[host][state]), state).toEqual(norm(looks.bare[state]));
  });
});

describe('RC-003: the panel at work', () => {
  it.each(HOSTS)('%s: fill, Enter applies; the button is pressed, titled, focused', async host => {
    const { context, page, errors } = await open(host, 1440);
    await page.click('#ts .rc-range-custom');
    await page.fill('#ts .rc-range-input >> nth=0', '2024-03-01');
    await page.fill('#ts .rc-range-input >> nth=1', '2024-03-31');
    await page.keyboard.press('Enter');
    const state = await page.evaluate(() => {
      const btn = document.querySelector('#ts .rc-range-custom');
      return {
        view: window.charts.ts.getView().map(d => d.toISOString()),
        open: !!document.querySelector('#ts .rc-range-panel'),
        pressed: btn.getAttribute('aria-pressed'),
        title: btn.title,
        focus: document.activeElement === btn,
      };
    });
    expect(state).toEqual({
      view: ['2024-03-01T00:00:00.000Z', '2024-03-31T23:59:59.999Z'],
      open: false, pressed: 'true', title: 'Mar 1, 2024 – Mar 31, 2024', focus: true,
    });
    expect(errors).toEqual([]);
    await context.close();
  });

  it('an empty field dims Apply; a press on the plot closes the panel and the focus comes back to the button', async () => {
    const { context, page } = await open('v0.7.1', 1440);
    await page.click('#ts .rc-range-custom');
    await page.fill('#ts .rc-range-input >> nth=1', '');
    expect(await page.evaluate(() => {
      const apply = document.querySelector('#ts .rc-range-apply');
      return [apply.disabled, getComputedStyle(apply).opacity, getComputedStyle(apply).cursor];
    })).toEqual([true, '0.45', 'default']);
    const plot = await page.evaluate(() => {
      const r = document.querySelector('#ts svg').getBoundingClientRect();
      return [r.left + r.width / 4, r.top + r.height / 2];
    });
    await page.mouse.click(plot[0], plot[1]);
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => [
      !!document.querySelector('#ts .rc-range-panel'),
      document.activeElement === document.querySelector('#ts .rc-range-custom'),
    ])).toEqual([false, true]);
    await context.close();
  });

  it('Tab runs from the button into the panel and out of it, which closes it; Escape returns to the button', async () => {
    const { context, page } = await open('v0.7.2', 1440);
    await page.click('#ts .rc-range-custom');
    const active = () => page.evaluate(() => document.activeElement?.className ?? null);
    await page.keyboard.press('Shift+Tab');                  // From → the button: still open
    expect(await active()).toBe('rc-range-btn rc-range-custom');
    expect(await page.$('#ts .rc-range-panel')).not.toBeNull();
    await page.keyboard.press('Escape');
    expect(await page.$('#ts .rc-range-panel')).toBeNull();
    await page.click('#ts .rc-range-custom');
    await page.focus('#ts .rc-range-apply');
    await page.keyboard.press('Tab');                        // out of the panel
    expect(await page.$('#ts .rc-range-panel')).toBeNull();
    expect(await active()).not.toMatch(/rc-range-(input|apply)/);
    await page.click('#ts .rc-range-custom');
    await page.keyboard.press('Escape');
    expect(await active()).toBe('rc-range-btn rc-range-custom');
    await context.close();
  });

  it('a resize keeps it under its button, inside the card; print hides it', async () => {
    const { context, page } = await open('bare', 1440);
    await page.click('#ts .rc-range-custom');
    // the header stacks and the buttons wrap: Custom moves to a second row
    await page.setViewportSize({ width: 320, height: 1100 });
    await page.waitForTimeout(200);                          // the ResizeObserver's frame
    const fit = await page.evaluate(() => {
      const card = document.getElementById('ts');
      const c = card.getBoundingClientRect();
      const p = document.querySelector('#ts .rc-range-panel').getBoundingClientRect();
      const b = document.querySelector('#ts .rc-range-custom').getBoundingClientRect();
      return { top: Math.round((p.top - b.bottom) * 10) / 10, inside: p.left >= c.left + 17 - 0.5 && p.right <= c.right - 17 + 0.5 };
    });
    expect(fit).toEqual({ top: 4, inside: true });
    await page.emulateMedia({ media: 'print' });
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#ts .rc-range-panel')).display)).toBe('none');
    await context.close();
  });
});
