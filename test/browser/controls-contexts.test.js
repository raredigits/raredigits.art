// The button system and the forms where a page puts them (Rare Styles v0.7.2,
// Part C1, review fixes). Headless Google Chrome via playwright-core; reads
// the built `/assets/css/rare.css`.   npm run test:browser
//
//   CSS-040  the ghost label follows the surface (dark card); a link-button
//            keeps its label in a dark card, a sidenote and the sidebar
//   Q-04     a button stays as wide as its label in a flex column
//   CSS-043  aria-disabled on a bare <button>; busy hides a link's underline
//   CSS-044  a pressed filled variant keeps its label on its own fill
//   CSS-100  the input button types are buttons; the date and time types
//            are fields as tall as the others
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/controls-contexts.html';

let browser;
let server;
let origin;

beforeAll(async () => {
  ({ server, origin } = await serve());
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
afterAll(async () => {
  await browser?.close();
  server?.close();
});

async function open({ width = 1440 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(origin + FIXTURE);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const css = (page, id, props, pseudo = null) => page.evaluate(([i, ps, pe]) => {
  const cs = getComputedStyle(document.getElementById(i), pe);
  return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
}, [id, props, pseudo]);

const box = (page, id) => page.evaluate((i) => {
  const r = document.getElementById(i).getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
}, id);

// The colour a CSS colour expression computes to, through a probe element.
const computed = (page, expr) => page.evaluate((e) => {
  const probe = document.createElement('div');
  probe.style.backgroundColor = e;
  document.body.append(probe);
  const c = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return c;
}, expr);

// A pseudo-class forced through the DevTools protocol; one session per page.
const sessions = new WeakMap();
async function force(page, id, state) {
  if (!sessions.has(page)) {
    const s = await page.context().newCDPSession(page);
    await s.send('DOM.enable');
    await s.send('CSS.enable');
    sessions.set(page, s);
  }
  const cdp = sessions.get(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `#${id}` });
  await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: state ? [state] : [] });
  await page.waitForTimeout(250); // the 0.15s colour fade
}

// WCAG contrast of two computed colours (rgb() or color(srgb …)).
function contrast(a, b) {
  const parse = (c) => {
    const srgb = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
    if (srgb) return srgb.slice(1, 4).map(Number);
    return c.match(/[\d.]+/g).slice(0, 3).map((v) => Number(v) / 255);
  };
  const lum = (c) => {
    const [r, g, bl] = parse(c).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const CARD_BG = 'rgb(51, 51, 51)';

describe('CSS-040: the ghost label follows the surface', () => {
  it.each([1440, 375])('on a dark card it is the card text colour, and so is its tint (%ipx)', async (width) => {
    const page = await open({ width });
    expect((await css(page, 'inv', ['background-color']))['background-color']).toBe(CARD_BG);
    const ghost = await css(page, 'inv-ghost', ['color', 'background-color']);
    expect(ghost).toEqual({ color: 'rgb(240, 240, 240)', 'background-color': 'rgba(0, 0, 0, 0)' });
    expect(contrast(ghost.color, CARD_BG)).toBeGreaterThanOrEqual(4.5);
    await force(page, 'inv-ghost', 'hover');
    expect((await css(page, 'inv-ghost', ['background-color']))['background-color'])
      .toBe(await computed(page, 'color-mix(in srgb, rgb(240, 240, 240) 8%, transparent)'));
    // the busy ring is drawn in the label colour as well
    expect((await css(page, 'inv-ghost-busy', ['border-top-color'], '::after'))['border-top-color']).toBe('rgb(240, 240, 240)');
    // on the light page it stays black
    expect((await css(page, 'page-ghost', ['color'])).color).toBe('rgb(0, 0, 0)');
    await page.close();
  });
});

describe('CSS-040: a link-button keeps its label where text links are re-coloured', () => {
  it('in a dark card: dark on the white default, white on the primary; text links stay light', async () => {
    const page = await open();
    const a = await css(page, 'inv-a', ['color', 'background-color']);
    expect(a).toEqual({ color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)' });
    expect(contrast(a.color, a['background-color'])).toBeGreaterThanOrEqual(4.5);
    const primary = await css(page, 'inv-a-primary', ['color', 'background-color']);
    expect(primary.color).toBe('rgb(255, 255, 255)');
    expect(contrast(primary.color, primary['background-color'])).toBeGreaterThanOrEqual(4.5);
    expect((await css(page, 'inv-text-link', ['color'])).color).toBe('rgb(240, 240, 240)');
    await page.close();
  });

  it('in a sidenote and in the sidebar: the button label and frame; text links stay muted', async () => {
    const page = await open();
    for (const id of ['note-a', 'side-a']) {
      expect(await css(page, id, ['color', 'border-bottom-width', 'border-bottom-color']), id)
        .toEqual({ color: 'rgb(0, 0, 0)', 'border-bottom-width': '1px', 'border-bottom-color': 'rgb(204, 204, 204)' });
    }
    expect((await css(page, 'note-text-link', ['color'])).color).toBe('rgb(102, 102, 102)');
    expect((await css(page, 'side-text-link', ['color'])).color).toBe('rgb(102, 102, 102)');
    await page.close();
  });
});

describe('Q-04: a button is as wide as its label in a flex column', () => {
  it.each([1440, 375])('in a card, a dark card, a panel and a form group (%ipx)', async (width) => {
    const page = await open({ width });
    const ref = await box(page, 'w-ref');
    for (const [id, box_] of [['w-card', 'card'], ['w-card-a', 'card'], ['w-card-inv', 'card-inv'], ['w-panel', 'panel'], ['w-fg', 'fg']]) {
      const b = await box(page, id);
      expect(b.w, `${id} width`).toBeCloseTo(ref.w, 0);
      expect(b.w, `${id} narrower than its container`).toBeLessThan((await box(page, box_)).w - 100);
    }
    // the field next to it still takes the group's width; .button-block the card's
    expect((await box(page, 'fg-in')).w).toBeCloseTo((await box(page, 'fg')).w, 0);
    const card = await page.evaluate(() => {
      const el = document.getElementById('card-block'); const cs = getComputedStyle(el);
      return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    });
    expect((await box(page, 'w-block')).w).toBeCloseTo(card, 0);
    await page.close();
  });
});

describe('CSS-044: a pressed toggle keeps its variant', () => {
  it('a pressed primary or danger takes its own pressed fill under its white label', async () => {
    const page = await open();
    const fills = {
      'g-primary': await computed(page, 'color-mix(in srgb, rgb(22, 119, 255) 60%, black)'),
      'g-danger': await computed(page, 'color-mix(in srgb, rgb(255, 0, 0) 60%, black)'),
    };
    for (const [id, fill] of Object.entries(fills)) {
      const s = await css(page, id, ['color', 'background-color', 'border-top-color']);
      expect(s, id).toEqual({ color: 'rgb(255, 255, 255)', 'background-color': fill, 'border-top-color': 'rgba(0, 0, 0, 0)' });
      expect(contrast(s.color, s['background-color']), `${id} label`).toBeGreaterThanOrEqual(4.5);
    }
    // the default pressed look is unchanged, and an unpressed primary keeps its rest fill
    expect(await css(page, 'g-default', ['background-color', 'border-top-color', 'color']))
      .toEqual({ 'background-color': 'rgb(240, 240, 240)', 'border-top-color': 'rgb(0, 0, 0)', color: 'rgb(0, 0, 0)' });
    expect((await css(page, 'g-primary-off', ['background-color']))['background-color'])
      .toBe(await computed(page, 'color-mix(in srgb, rgb(22, 119, 255) 85%, black)'));
    await page.close();
  });
});

describe('CSS-043: states on a bare <button>', () => {
  it('aria-disabled="true" fades it and stops the hover and press looks', async () => {
    const page = await open();
    expect(await css(page, 'b-aria-disabled', ['opacity', 'cursor'])).toEqual({ opacity: '0.5', cursor: 'default' });
    await force(page, 'b-aria-disabled', 'hover');
    expect((await css(page, 'b-aria-disabled', ['border-top-color']))['border-top-color']).toBe('rgb(204, 204, 204)');
    await force(page, 'b-aria-disabled', 'active');
    expect((await css(page, 'b-aria-disabled', ['background-color']))['background-color']).toBe('rgb(255, 255, 255)');
    // a legend toggle stays a plain label, as with `disabled`
    expect(await css(page, 'lg-aria-disabled', ['opacity', 'cursor', 'border-top-width']))
      .toEqual({ opacity: '1', cursor: 'default', 'border-top-width': '0px' });
    await page.close();
  });

  it('busy hides the underline of a bare .button-link with its label', async () => {
    const page = await open();
    expect(await css(page, 'b-link-busy', ['color', 'text-decoration-color']))
      .toEqual({ color: 'rgba(0, 0, 0, 0)', 'text-decoration-color': 'rgba(0, 0, 0, 0)' });
    await page.close();
  });
});

describe('CSS-100: input types', () => {
  it('submit, button and reset are default buttons, as tall as a text field', async () => {
    const page = await open();
    const look = ['display', 'background-color', 'border-top-color', 'border-top-width', 'border-top-left-radius',
      'padding-top', 'padding-left', 'font-size', 'line-height', 'color', 'cursor', 'width'];
    const plain = await css(page, 'b-plain', look);
    const field = await box(page, 'i-text');
    for (const id of ['i-submit', 'i-button', 'i-reset']) {
      const s = await css(page, id, look);
      expect({ ...s, width: null }, id).toEqual({ ...plain, width: null });
      expect((await box(page, id)).h, `${id} height`).toBeCloseTo(field.h, 1);
    }
    await force(page, 'i-submit', 'hover');
    expect((await css(page, 'i-submit', ['border-top-color']))['border-top-color']).toBe('rgb(0, 0, 0)');
    await page.close();
  });

  it('the date and time types take the field look and height', async () => {
    const page = await open();
    const look = ['border-top-color', 'border-top-width', 'border-top-left-radius', 'padding-top', 'padding-left', 'font-size', 'background-color'];
    const text = await css(page, 'i-text', look);
    const h = (await box(page, 'i-text')).h;
    for (const id of ['i-date', 'i-time', 'i-datetime', 'i-month', 'i-week']) {
      expect(await css(page, id, look), id).toEqual(text);
      expect((await box(page, id)).h, `${id} height`).toBeCloseTo(h, 1);
    }
    await page.close();
  });
});
