// Real-browser rendering checks for Rare Styles (CSS-118, v0.7.0).
// jsdom proves selector matching (CSS-338); only a rendering engine proves
// cascade, layout, media queries, focus and motion. Headless Google Chrome via
// playwright-core.   npm run test:browser
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

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

async function open(path, { width = 1280, height = 900, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
  await page.goto(origin + path);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const HOSTILE = '/test/fixtures/rd-gate/hostile-host.html';
const FIXTURE = '/test/browser/fixtures/rendering.html';

describe('gate: rendering, not just matching (CSS-338 in a real engine)', () => {
  it('without .rd, every computed style is identical with and without rare.css', async () => {
    const page = await open(HOSTILE);
    const snap = () => page.evaluate(() => [...document.querySelectorAll('html, body, body *')].map((el) => {
      const cs = getComputedStyle(el);
      return [...cs].filter((p) => !p.startsWith('--')).map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    }));
    const before = await snap();
    await page.addStyleTag({ url: `${origin}/assets/css/rare.css` });
    await page.evaluate(() => document.fonts.ready);
    expect(await snap()).toEqual(before);
    await page.close();
  });

  it('island: tag styles apply inside; host type rules still beat the reset (CSS-078)', async () => {
    const page = await open(HOSTILE);
    await page.addStyleTag({ url: `${origin}/assets/css/rare.css` });
    const r = await page.evaluate(() => {
      document.getElementById('island').classList.add('rd');
      const cs = (sel) => getComputedStyle(document.querySelector(sel));
      return {
        islandH1: cs('#island h1').fontFamily,
        hostH1: cs('main h1').fontFamily,
        islandSectionMarginBottom: cs('#island-section').marginBottom, // host `section {33px}` vs reset
        islandHeaderPosition: cs('#island-header').position,           // page shell must not apply
        islandRootFont: cs('#island').fontFamily,                      // no base typography
      };
    });
    expect(r.islandH1).toMatch(/Playfair Display/);
    expect(r.hostH1).toMatch(/Impact/);
    expect(r.islandSectionMarginBottom).toBe('33px');
    expect(r.islandHeaderPosition).not.toBe('fixed');
    expect(r.islandRootFont).toMatch(/Georgia/);
    await page.close();
  });
});

describe('states', () => {
  it('.rd-is-hidden hides every component, whatever state it is in', async () => {
    const page = await open(FIXTURE);
    const shown = await page.evaluate(() => [...document.querySelectorAll('[data-state]')]
      .filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.dataset.state));
    expect(shown).toEqual([]);
    await page.close();
  });
});

describe('anchors and focus', () => {
  it.each([1280, 375])('anchor target clears the fixed header at %ipx (CSS-129)', async (width) => {
    const page = await open(`${FIXTURE}#target`, { width });
    const r = await page.evaluate(() => ({
      target: document.getElementById('target').getBoundingClientRect().top,
      header: document.querySelector('header').getBoundingClientRect().bottom,
    }));
    expect(r.target - r.header).toBeGreaterThanOrEqual(0);
    expect(r.target - r.header).toBeLessThanOrEqual(16);
    await page.close();
  });

  it('Tab shows the skip link above the header, then the focus ring (CSS-110, CSS-113)', async () => {
    const page = await open(FIXTURE);
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => {
      const el = document.activeElement; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { cls: el.className, w: r.width, topmost: document.elementFromPoint(r.left + 4, r.top + 4) === el, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
    });
    expect(skip.cls).toBe('skip-to-content');
    expect(skip.w).toBeGreaterThan(50);
    expect(skip.topmost).toBe(true);
    expect(skip.outline).toBe('solid 2px rgb(22, 119, 255)');
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`; });
    expect(next).toBe('solid 2px rgb(22, 119, 255)');
    await page.close();
  });
});

describe('motion', () => {
  it('transitions run only without a reduced-motion preference (CSS-112)', async () => {
    const moving = await open(FIXTURE);
    const still = await open(FIXTURE, { reducedMotion: 'reduce' });
    const dur = (p) => p.evaluate(() => getComputedStyle(document.getElementById('first-link')).transitionDuration);
    expect(await dur(moving)).not.toMatch(/^0s(, 0s)*$/);
    expect(await dur(still)).toMatch(/^0s(, 0s)*$/);
    await moving.close();
    await still.close();
  });
});

describe('layout', () => {
  it.each([320, 375, 768, 1024, 1280])('no horizontal page overflow at %ipx; card outdents stay inside (CSS-354, CSS-357)', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const card = document.getElementById('card-outdents').getBoundingClientRect();
      const poking = [...document.querySelectorAll('#card-outdents > *')].filter((el) => {
        const b = el.getBoundingClientRect(); return b.left < card.left - 0.5 || b.right > card.right + 0.5;
      }).map((el) => el.tagName);
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, poking };
    });
    expect(r.sw).toBeLessThanOrEqual(r.cw);
    expect(r.poking).toEqual([]);
    await page.close();
  });

  it('sidenotes switch at the shared 1024px boundary (CSS-358)', async () => {
    const at = async (width) => {
      const page = await open(FIXTURE, { width });
      const d = await page.evaluate(() => getComputedStyle(document.getElementById('sidenote-case')).display);
      await page.close();
      return d;
    };
    expect(await at(1023)).toBe('flex');
    expect(await at(1024)).toBe('grid');
  });

  it.each([[768, 1.1], [1023, 1.25], [1023, 1.1]])(
    'exactly one breakpoint layer applies at a fractional viewport (window %ipx × %f scale, CSS-355)',
    async (win, scale) => {
      const b = await chromium.launch({ channel: 'chrome', headless: true, args: [`--force-device-scale-factor=${scale}`, `--window-size=${win},900`] });
      const page = await (await b.newContext({ viewport: null })).newPage();
      await page.goto(origin + FIXTURE);
      const r = await page.evaluate(() => {
        const layers = new Set();
        for (const sheet of document.styleSheets) {
          for (const rule of sheet.cssRules) {
            if (rule.media && /^screen and/.test(rule.media.mediaText)) layers.add(rule.media.mediaText);
          }
        }
        return { width: visualViewport.width, layers: [...layers], active: [...layers].filter((q) => matchMedia(q).matches) };
      });
      await b.close();
      expect(r.layers.length).toBe(3);
      expect(Number.isInteger(r.width)).toBe(false); // really fractional
      expect(r.active.length).toBe(1);
    },
  );
});
