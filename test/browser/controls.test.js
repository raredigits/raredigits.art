// The button system, the forms and the legend toggles in a real engine
// (Rare Styles v0.7.2, Part C1). Headless Google Chrome via playwright-core;
// reads the built `/assets/css/rare.css`.   npm run test:browser
//
//   Q-04     a bare <button> inside `.rd` gets the default look and is inline
//   CSS-040  variants on the colour slots; primary and danger labels ≥ 4.5:1
//   CSS-041  sizes; the default button is as tall as a text field
//   CSS-042  glyph + label at an even gap, on the text line; square icon-only
//   CSS-043  hover, active, focus ring, disabled, busy (motion-safe spinner)
//   CSS-044  a segmented group with shared borders
//   CSS-045  full width
//   CSS-046  the token surface
//   (all)    the element defaults have type weight in every state; the
//            legend toggles, header icons and copy icons keep their look
//   CSS-100…105  fields, checkbox and radio, states after interaction,
//            range / colour / file, fieldset, groups and rows, help, error
//   gate     nothing reaches a host's controls outside `.rd`
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/controls.html';

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

async function open({ width = 1440, query = '', reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
  await page.goto(origin + FIXTURE + query);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const css = (page, id, props, pseudo = null) => page.evaluate(([i, ps, pe]) => {
  const cs = getComputedStyle(document.getElementById(i), pe);
  return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
}, [id, props, pseudo]);

const box = (page, id) => page.evaluate((i) => {
  const r = document.getElementById(i).getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
}, id);

// A pseudo-class forced through the DevTools protocol (no pointer, no click).
// One session per page: a forced state belongs to the session that set it.
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

// Relative luminance contrast of two computed colours (rgb() or color(srgb)).
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

describe('Q-04: the default look of a bare <button> and of .button', () => {
  it('a bare button is inline, white, framed, on the tokens; a link with .button matches it', async () => {
    const page = await open();
    const props = ['display', 'background-color', 'border-top-color', 'border-top-width', 'border-top-left-radius',
      'padding-top', 'padding-left', 'font-size', 'line-height', 'color', 'text-decoration-line', 'cursor'];
    const look = await css(page, 'b-default', props);
    expect(look).toEqual({
      display: 'inline-block', 'background-color': 'rgb(255, 255, 255)', 'border-top-color': 'rgb(204, 204, 204)',
      'border-top-width': '1px', 'border-top-left-radius': '4px', 'padding-top': '8px', 'padding-left': '16px',
      'font-size': '16px', 'line-height': '19.2px', color: 'rgb(0, 0, 0)', 'text-decoration-line': 'none', cursor: 'pointer',
    });
    expect(await css(page, 'b-link-default', props)).toEqual(look);
    expect((await css(page, 'b-link-default', ['background-image']))['background-image']).toBe('none'); // no link fill
    // inline: two buttons and a field share one line, equally tall (CSS-041)
    const [a, b, f] = [await box(page, 'b-default'), await box(page, 'b-link-default'), await box(page, 'f-beside')];
    expect(b.y).toBeCloseTo(a.y, 1);
    expect(f.y).toBeCloseTo(a.y, 1);
    expect(f.h).toBeCloseTo(a.h, 1);
    await page.close();
  });

  it('hover darkens the frame, active fills grey, and the focus ring is the signal', async () => {
    const page = await open();
    await force(page, 'b-default', 'hover');
    expect(await css(page, 'b-default', ['border-top-color', 'background-color']))
      .toEqual({ 'border-top-color': 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)' });
    await force(page, 'b-default', 'active');
    expect((await css(page, 'b-default', ['background-color']))['background-color']).toBe('rgb(240, 240, 240)');
    await force(page, 'b-default', 'focus-visible');
    expect(await css(page, 'b-default', ['outline-style', 'outline-color', 'outline-width']))
      .toEqual({ 'outline-style': 'solid', 'outline-color': 'rgb(22, 119, 255)', 'outline-width': '2px' });
    await page.close();
  });

  it('on a dark card the default button keeps dark text on white', async () => {
    const page = await open();
    expect(await css(page, 'b-inverted', ['color', 'background-color']))
      .toEqual({ color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)' });
    await page.close();
  });
});

describe('CSS-040: variants', () => {
  it('primary and danger fill with the shaded role colour; white labels reach AA', async () => {
    const page = await open();
    for (const [id, hue] of [['b-primary', 'blue'], ['b-danger', 'red']]) {
      const s = await css(page, id, ['background-color', 'color', 'border-top-color']);
      expect(s.color).toBe('rgb(255, 255, 255)');
      expect(s['border-top-color']).toBe('rgba(0, 0, 0, 0)');
      expect(contrast(s['background-color'], s.color), `${id} label`).toBeGreaterThanOrEqual(4.5);
      await force(page, id, 'hover');
      const h = await css(page, id, ['background-color']);
      expect(h['background-color'], `${id} (${hue}) hover`).not.toBe(s['background-color']);
      await force(page, id, null);
    }
    // the primary follows --signal: re-mapped, it fills with the new signal, shaded the same way
    const expected = await page.evaluate(() => {
      document.documentElement.style.setProperty('--signal', 'rgb(0, 128, 0)');
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'color-mix(in srgb, rgb(0, 128, 0) 85%, black)';
      document.body.append(probe);
      return getComputedStyle(probe).backgroundColor;
    });
    await page.waitForTimeout(250); // the fill fades to the new colour
    expect((await css(page, 'b-primary', ['background-color']))['background-color']).toBe(expected);
    await page.close();
  });

  it('secondary is the default look; ghost has no frame until hover; link reads as a link', async () => {
    const page = await open();
    const look = ['background-color', 'border-top-color', 'color'];
    expect(await css(page, 'b-secondary', look)).toEqual(await css(page, 'b-default', look));
    expect(await css(page, 'b-ghost', ['background-color', 'border-top-color']))
      .toEqual({ 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-color': 'rgba(0, 0, 0, 0)' });
    await force(page, 'b-ghost', 'hover');
    expect((await css(page, 'b-ghost', ['background-color']))['background-color']).not.toBe('rgba(0, 0, 0, 0)');
    expect(await css(page, 'b-link', ['background-color', 'text-decoration-line', 'text-decoration-color']))
      .toEqual({ 'background-color': 'rgba(0, 0, 0, 0)', 'text-decoration-line': 'underline', 'text-decoration-color': 'rgb(0, 179, 0)' });
    await page.close();
  });
});

describe('CSS-041 / CSS-046: sizes and tokens', () => {
  it('sm < md = default < lg; the size classes set the tokens', async () => {
    const page = await open();
    const [sm, md, lg, def] = [await box(page, 'b-sm'), await box(page, 'b-md'), await box(page, 'b-lg'), await box(page, 'b-default')];
    expect(sm.h).toBeLessThan(md.h);
    expect(md.h).toBeCloseTo(def.h, 1);
    expect(lg.h).toBeGreaterThan(md.h);
    expect(await css(page, 'b-sm', ['font-size', 'padding-top', 'padding-left'])).toEqual({ 'font-size': '14.4px', 'padding-top': '4px', 'padding-left': '8px' });
    expect(await css(page, 'b-lg', ['font-size', 'padding-top', 'padding-left'])).toEqual({ 'font-size': '19.2px', 'padding-top': '12px', 'padding-left': '24px' });
    // the token surface on :root
    const tokens = await page.evaluate(() => ['--button-radius', '--button-padding-x', '--button-padding-y', '--button-font-size',
      '--button-font-weight', '--button-transition'].map((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim()));
    expect(tokens.every(Boolean)).toBe(true);
    await page.evaluate(() => document.documentElement.style.setProperty('--button-radius', '999px'));
    expect((await css(page, 'b-default', ['border-top-left-radius']))['border-top-left-radius']).toBe('999px');
    await page.close();
  });
});

describe('CSS-042: icons', () => {
  it('a glyph before or after the label: even gap, centred, and the button stays on the text line', async () => {
    const page = await open();
    expect(await css(page, 'b-lead', ['display', 'column-gap', 'align-items']))
      .toEqual({ display: 'inline-flex', 'column-gap': '8px', 'align-items': 'center' });
    const plain = await box(page, 'b-plain2');
    for (const [btn, glyph] of [['b-lead', 'b-lead-icon'], ['b-trail', 'b-trail-icon']]) {
      const b = await box(page, btn);
      expect(b.y, `${btn} top`).toBeCloseTo(plain.y, 1); // same line as a text button
      expect(b.h, `${btn} height`).toBeCloseTo(plain.h, 1);
      const g = await page.evaluate((i) => {
        const el = document.getElementById(i); const r = el.getBoundingClientRect();
        return { mid: r.y + parseFloat(getComputedStyle(el, '::before').top) + 8 };
      }, glyph);
      expect(g.mid, `${glyph} centred`).toBeCloseTo(b.y + b.h / 2, 0);
    }
    // the trailing glyph sits after its label
    expect((await box(page, 'b-trail-icon')).x).toBeGreaterThan((await box(page, 'b-trail')).x + 20);
    await page.close();
  });

  it('.button-icon is a square as tall as a text button of its size', async () => {
    const page = await open();
    const [icon, plain, iconSm, sm] = [await box(page, 'b-icon'), await box(page, 'b-plain2'), await box(page, 'b-icon-sm'), await box(page, 'b-sm')];
    expect(icon.w).toBeCloseTo(icon.h, 1);
    expect(icon.h).toBeCloseTo(plain.h, 1);
    expect(icon.y).toBeCloseTo(plain.y, 1);
    expect(iconSm.w).toBeCloseTo(iconSm.h, 1);
    expect(iconSm.h).toBeCloseTo(sm.h, 1);
    await page.close();
  });
});

describe('CSS-043: states', () => {
  it('disabled: faded, default pointer, no hover change; aria-disabled on a link too', async () => {
    const page = await open();
    expect(await css(page, 'b-disabled', ['opacity', 'cursor'])).toEqual({ opacity: '0.5', cursor: 'default' });
    expect(await css(page, 'a-disabled', ['opacity', 'cursor'])).toEqual({ opacity: '0.5', cursor: 'default' });
    await force(page, 'b-disabled', 'hover');
    expect((await css(page, 'b-disabled', ['border-top-color']))['border-top-color']).toBe('rgb(204, 204, 204)');
    await page.close();
  });

  it('busy: the label hides, a ring in the label colour spins — and stands still with reduced motion', async () => {
    let page = await open();
    expect(await css(page, 'b-busy', ['color', 'cursor', 'position'])).toEqual({ color: 'rgba(0, 0, 0, 0)', cursor: 'progress', position: 'relative' });
    const ring = await css(page, 'b-busy', ['content', 'width', 'height', 'border-top-color', 'border-right-color', 'animation-name'], '::after');
    expect(ring).toEqual({ content: '""', width: '16px', height: '16px', 'border-top-color': 'rgb(255, 255, 255)', 'border-right-color': 'rgba(0, 0, 0, 0)', 'animation-name': 'button-busy-spin' });
    await page.close();
    page = await open({ reducedMotion: 'reduce' });
    expect(await css(page, 'b-busy', ['content', 'animation-name'], '::after')).toEqual({ content: '""', 'animation-name': 'none' });
    expect((await css(page, 'b-default', ['transition-property']))['transition-property']).toBe('all'); // no fade either
    await page.close();
  });
});

describe('CSS-044 / CSS-045: group and full width', () => {
  it('a group shares borders, rounds only its outer corners, lifts the pressed button', async () => {
    const page = await open();
    const [g1, g2, g3] = [await box(page, 'g1'), await box(page, 'g2'), await box(page, 'g3')];
    expect(g2.x).toBeCloseTo(g1.right - 1, 1);
    expect(g3.x).toBeCloseTo(g2.right - 1, 1);
    const radii = ['border-top-left-radius', 'border-top-right-radius'];
    expect(await css(page, 'g1', radii)).toEqual({ 'border-top-left-radius': '4px', 'border-top-right-radius': '0px' });
    expect(await css(page, 'g2', radii)).toEqual({ 'border-top-left-radius': '0px', 'border-top-right-radius': '0px' });
    expect(await css(page, 'g3', radii)).toEqual({ 'border-top-left-radius': '0px', 'border-top-right-radius': '4px' });
    expect(await css(page, 'g2', ['background-color', 'border-top-color', 'z-index']))
      .toEqual({ 'background-color': 'rgb(240, 240, 240)', 'border-top-color': 'rgb(0, 0, 0)', 'z-index': '1' });
    await page.close();
  });

  it('.button-block takes the container width and keeps a glyph centred with its label', async () => {
    const page = await open();
    expect((await box(page, 'b-block')).w).toBeCloseTo((await box(page, 'block-box')).w, 1);
    expect(await css(page, 'b-block-icon', ['display', 'justify-content', 'column-gap']))
      .toEqual({ display: 'flex', 'justify-content': 'center', 'column-gap': '8px' });
    await page.close();
  });
});

describe('the specificity contract', () => {
  it("a page's own class beats the element defaults in every state", async () => {
    const page = await open();
    const look = ['background-color', 'border-top-width'];
    const rest = await css(page, 'b-classed', look);
    expect(rest).toEqual({ 'background-color': 'rgb(1, 2, 3)', 'border-top-width': '0px' });
    for (const state of ['hover', 'active']) {
      await force(page, 'b-classed', state);
      expect(await css(page, 'b-classed', look), state).toEqual(rest);
    }
    await page.close();
  });

  it('a link-button in a nav keeps its frame on hover (it outranks `nav a:hover`)', async () => {
    const page = await open();
    await force(page, 'b-nav', 'hover');
    expect(await css(page, 'b-nav', ['border-bottom-width', 'border-bottom-color', 'background-image']))
      .toEqual({ 'border-bottom-width': '1px', 'border-bottom-color': 'rgb(0, 0, 0)', 'background-image': 'none' });
    await page.close();
  });
});

describe('legend toggles and the site widgets that are buttons', () => {
  it('a legend toggle has no button chrome in any state; disabled stays on, busy shows no spinner', async () => {
    const page = await open();
    const chrome = ['padding-top', 'border-top-width', 'background-color', 'border-top-left-radius', 'color'];
    const rest = await css(page, 'lg-on', chrome);
    expect(rest).toEqual({ 'padding-top': '0px', 'border-top-width': '0px', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-left-radius': '0px', color: 'rgb(0, 0, 0)' });
    for (const state of ['hover', 'active']) {
      await force(page, 'lg-on', state);
      expect(await css(page, 'lg-on', chrome), state).toEqual(rest);
      await force(page, 'lg-on', null);
    }
    expect(await css(page, 'lg-dis', [...chrome, 'opacity', 'cursor'])).toEqual({ ...rest, opacity: '1', cursor: 'default' });
    expect((await css(page, 'lg-dis-off', ['opacity'])).opacity).toBe('0.35'); // off still dims
    expect((await css(page, 'lg-off', ['opacity'])).opacity).toBe('0.35');
    expect(await css(page, 'lg-busy', [...chrome, 'cursor'])).toEqual({ ...rest, cursor: 'progress' });
    expect((await css(page, 'lg-busy', ['content'], '::after')).content).toBe('none');
    await force(page, 'lg-on', 'focus-visible');
    expect((await css(page, 'lg-on', ['outline-style']))['outline-style']).toBe('solid'); // the ring stays
    await page.close();
  });

  it('header and copy icons are sized by their context, not by the button font size', async () => {
    const page = await open();
    expect((await css(page, 'hdr-search', ['font-size']))['font-size']).toBe('24px');
    expect((await css(page, 'copy-in-p', ['font-size']))['font-size']).toBe('14px');
    await page.close();
  });
});

describe('CSS-100…105: forms', () => {
  it('every text type, textarea and select share the field look; a field is as tall as a button', async () => {
    const page = await open();
    const look = ['border-top-color', 'border-top-width', 'border-top-left-radius', 'padding-top', 'padding-left', 'font-size', 'background-color'];
    const text = await css(page, 'f-text', look);
    expect(text).toEqual({
      'border-top-color': 'rgb(136, 136, 136)', 'border-top-width': '1px', 'border-top-left-radius': '4px',
      'padding-top': '8px', 'padding-left': '12px', 'font-size': '16px', 'background-color': 'rgb(255, 255, 255)',
    });
    for (const id of ['f-notype', 'f-email', 'f-password', 'f-search', 'f-tel', 'f-url', 'f-number', 'f-area', 'f-select']) {
      expect(await css(page, id, look), id).toEqual(text);
    }
    expect((await box(page, 'f-text')).h).toBeCloseTo((await box(page, 'b-default')).h, 1);
    expect((await box(page, 'f-select')).h).toBeCloseTo((await box(page, 'b-default')).h, 1);
    expect((await css(page, 'f-text', ['color'], '::placeholder')).color).toBe('rgb(102, 102, 102)');
    expect(await css(page, 'f-select', ['appearance'])).toEqual({ appearance: 'none' });
    expect((await css(page, 'f-select', ['background-image']))['background-image']).toMatch(/linear-gradient/);
    expect(await css(page, 'f-multi', ['appearance', 'background-image'])).toEqual({ appearance: 'auto', 'background-image': 'none' });
    expect(await css(page, 'f-area', ['resize', 'vertical-align'])).toEqual({ resize: 'vertical', 'vertical-align': 'top' });
    await page.close();
  });

  it('hover, focus and disabled', async () => {
    const page = await open();
    await force(page, 'f-text', 'hover');
    expect((await css(page, 'f-text', ['border-top-color']))['border-top-color']).toBe('rgb(0, 0, 0)');
    await force(page, 'f-text', null);
    await page.focus('#f-text');
    await page.waitForTimeout(250); // the 0.15s frame fade
    expect(await css(page, 'f-text', ['border-top-color', 'outline-color']))
      .toEqual({ 'border-top-color': 'rgb(22, 119, 255)', 'outline-color': 'rgb(22, 119, 255)' });
    expect(await css(page, 'f-dis', ['background-color', 'color', 'cursor']))
      .toEqual({ 'background-color': 'rgb(240, 240, 240)', color: 'rgb(136, 136, 136)', cursor: 'default' });
    await page.close();
  });

  it('validity shows only after interaction, or with aria-invalid', async () => {
    const page = await open();
    const border = async (id) => {
      await page.waitForTimeout(250); // the 0.15s frame fade
      return (await css(page, id, ['border-top-color']))['border-top-color'];
    };
    expect(await border('f-req')).toBe('rgb(136, 136, 136)'); // :invalid but untouched
    expect(await border('f-aria-invalid')).toBe('rgb(255, 0, 0)');
    await page.fill('#f-req', 'x');
    await page.fill('#f-req', '');
    await page.focus('#f-plain'); // :user-invalid applies once the edit is committed
    expect(await border('f-req')).toBe('rgb(255, 0, 0)');
    await page.fill('#f-req-valid', 'filled');
    await page.focus('#f-plain');
    expect(await border('f-req-valid')).toBe('rgb(56, 158, 13)'); // --color-success
    await page.fill('#f-plain', 'no constraint');
    await page.focus('#f-text');
    expect(await border('f-plain')).toBe('rgb(136, 136, 136)'); // asked for nothing: no success colour
    await page.close();
  });

  it('checkbox and radio are drawn by the library: a 1em box on the text line, the accent when checked', async () => {
    const page = await open();
    expect(await css(page, 'f-check', ['appearance', 'width', 'height', 'border-top-color', 'background-color', 'vertical-align', 'cursor']))
      .toEqual({ appearance: 'none', width: '16px', height: '16px', 'border-top-color': 'rgb(136, 136, 136)', 'background-color': 'rgb(255, 255, 255)', 'vertical-align': '-3.2px', cursor: 'pointer' });
    const on = await css(page, 'f-check-on', ['background-color', 'background-image']);
    expect(on['background-color']).toBe('rgb(22, 119, 255)');
    expect(on['background-image']).toMatch(/^url\("data:image\/svg\+xml/);
    expect((await css(page, 'f-check-ind', ['background-image']))['background-image']).toMatch(/^linear-gradient/);
    expect(await css(page, 'f-check-dis', ['background-color', 'cursor'])).toEqual({ 'background-color': 'rgb(136, 136, 136)', cursor: 'default' });
    expect((await css(page, 'f-radio', ['border-top-left-radius']))['border-top-left-radius']).toBe('50%');
    expect((await css(page, 'f-radio-on', ['box-shadow']))['box-shadow']).toMatch(/inset/);
    expect((await css(page, 'lbl-check', ['cursor'])).cursor).toBe('pointer');
    expect(await css(page, 'lbl-dis', ['color', 'cursor'])).toEqual({ color: 'rgb(136, 136, 136)', cursor: 'default' });
    // on the text line: the box centre near the label's x-height middle
    const mid = await page.evaluate(() => {
      const b = document.getElementById('f-check').getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(document.getElementById('lbl-check'));
      const t = [...range.getClientRects()].at(-1);
      return [b.y + b.height / 2, t.y + t.height / 2];
    });
    expect(Math.abs(mid[0] - mid[1])).toBeLessThan(3);
    await page.close();
  });

  it('range, colour and file: accent, field height, a small default button', async () => {
    const page = await open();
    expect((await css(page, 'f-range', ['accent-color']))['accent-color']).toBe('rgb(22, 119, 255)');
    expect((await box(page, 'f-color')).h).toBeCloseTo((await box(page, 'f-text')).h, 1);
    expect(await css(page, 'f-file', ['border-top-color', 'border-top-left-radius', 'background-color', 'padding-top'], '::file-selector-button'))
      .toEqual({ 'border-top-color': 'rgb(204, 204, 204)', 'border-top-left-radius': '4px', 'background-color': 'rgb(255, 255, 255)', 'padding-top': '4px' });
    await page.close();
  });

  it('fieldset and legend', async () => {
    const page = await open();
    expect(await css(page, 'fs', ['border-top-color', 'border-top-left-radius', 'min-width']))
      .toEqual({ 'border-top-color': 'rgb(204, 204, 204)', 'border-top-left-radius': '4px', 'min-width': '0px' });
    expect((await css(page, 'lg', ['font-weight']))['font-weight']).toBe('700');
    await page.close();
  });

  it.each([1440, 375])('groups stack, a row sits side by side and stacks on a phone (%ipx)', async (width) => {
    const page = await open({ width });
    expect(await css(page, 'fg', ['display', 'flex-direction', 'row-gap'])).toEqual({ display: 'flex', 'flex-direction': 'column', 'row-gap': '4px' });
    expect((await box(page, 'fg-input')).w).toBeCloseTo((await box(page, 'fg')).w, 1);
    const [a, b, btn, input] = [await box(page, 'fr-a'), await box(page, 'fr-b'), await box(page, 'fr-btn'), await box(page, 'fr-a-in')];
    if (width === 1440) {
      expect(b.y).toBeCloseTo(a.y, 1);
      expect(btn.bottom).toBeCloseTo(input.bottom, 1); // the button lines up with the fields
    } else {
      expect(b.y).toBeGreaterThan(a.bottom - 1);
      expect(a.h).toBeLessThan(80); // a stacked group is as tall as its content
      expect(btn.y).toBeGreaterThan(b.bottom - 1);
    }
    expect(await css(page, 'fh', ['color', 'font-size'])).toEqual({ color: 'rgb(102, 102, 102)', 'font-size': '14.4px' });
    const err = await css(page, 'fe', ['content', 'background-color', 'mask-image'], '::before');
    expect(err.content).toBe('""');
    expect(err['background-color']).toBe('rgb(255, 0, 0)');
    expect(err['mask-image']).toMatch(/error-400\.svg/);
    expect((await css(page, 'fe', ['color'])).color).toBe('rgb(51, 51, 51)');
    await page.close();
  });
});

describe('the gate: a host page', () => {
  it('outside `.rd` no control is touched; the island gets the library look', async () => {
    const page = await open({ query: '?host' });
    expect(await page.evaluate(() => document.documentElement.classList.contains('rd'))).toBe(false);
    expect((await css(page, 'b-default', ['border-top-left-radius']))['border-top-left-radius']).toBe('0px');
    expect((await css(page, 'b-primary', ['background-color']))['background-color']).not.toMatch(/srgb/);
    expect((await css(page, 'f-check', ['appearance'])).appearance).toBe('auto');
    expect((await css(page, 'f-select', ['appearance'])).appearance).not.toBe('none');
    expect((await css(page, 'f-text', ['padding-left']))['padding-left']).not.toBe('12px');
    // the glyph layout names the icon set inside :has(); it is gated all the same
    expect((await css(page, 'b-lead', ['display'])).display).toBe('inline-block');
    expect((await css(page, 'i-button', ['border-top-left-radius', 'background-color'])))
      .toEqual({ 'border-top-left-radius': '4px', 'background-color': 'rgb(255, 255, 255)' });
    expect((await css(page, 'i-check', ['appearance'])).appearance).toBe('none');
    await page.close();
  });
});
