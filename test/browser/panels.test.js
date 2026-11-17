// The panel family and the legend primitive in a real engine (v0.7.2).
//
//   CSS-180  a panel on the chart element itself: the chart keeps its own
//            layout (flex column; a grid with the legend on the right), its
//            clipping and positioning, whatever order the two stylesheets
//            load in; the drawing gets the panel's content box
//   CSS-183a the chart's `height` with a frame: on the chart element (the
//            site's recipe) it includes the panel's padding and border; a
//            chart inside a composite panel keeps the unframed plot
//   CSS-181  a panel is a block, the drop-in for `.card-dashboard-bordered`:
//            inline runs stay on one line, paragraph margins collapse; a
//            panel opening an article block keeps its padding; a panel in a
//            collapsible's content takes an even 16px
//   CSS-376  one padding on every width (the phone step dropped in v0.7.2)
//   CSS-183  .panel--flush
//   CSS-371  the panel row's stacking mode and neutral alignment
//   CSS-178  the legend: swatch colour, shapes, button chrome, off state
//
// Needs the RareCharts bundle (`npm run test:browser` builds it first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/panels.html';

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
  const page = await browser.newPage({ viewport: { width, height: 900 }, timezoneId: 'UTC' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(origin + FIXTURE + query);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  return { page, errors };
}

const chartBox = (page, id) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const svg = el.querySelector(':scope > svg').getBoundingClientRect();
  const header = el.querySelector('.rc-chart-header').getBoundingClientRect();
  const footer = el.querySelector('.rc-chart-footer').getBoundingClientRect();
  return {
    isChart: el.classList.contains('rc-chart'),
    display: cs.display, direction: cs.flexDirection, overflow: cs.overflow, position: cs.position,
    gap: cs.rowGap, padding: cs.padding, border: cs.borderTopWidth,
    left: r.left, right: r.right, top: r.top, bottom: r.bottom,
    svgLeft: svg.left, svgWidth: svg.width, headerLeft: header.left, headerTop: header.top, footerBottom: footer.bottom,
  };
}, id);

describe('CSS-180: a panel on the chart element itself', () => {
  it.each([[1280, ''], [1280, '?css-first'], [375, ''], [375, '?css-first']])(
    'keeps the chart\'s layout and gives the drawing the content box at %ipx %s',
    async (width, query) => {
      const { page, errors } = await open(width, query);
      const sheets = await page.evaluate(() => ({
        injected: !!document.getElementById('rc-base-styles'),
        first: document.styleSheets[0].href,
      }));
      if (query) expect(sheets).toEqual({ injected: false, first: expect.stringMatching(/rare-charts\.css$/) });
      else expect(sheets.injected).toBe(true); // appended after rare.css
      // a caption-width frame: its sides step in by the outdent (16px on a phone)
      const pad = width < 769 ? 16 : 32;
      const top = 16;
      const c = await chartBox(page, '#chart');
      expect(c.isChart).toBe(true);
      expect([c.display, c.direction, c.overflow, c.position]).toEqual(['flex', 'column', 'hidden', 'relative']);
      expect(c.gap).toBe('normal'); // the chart spaces its parts itself
      expect(c.padding).toBe(width < 769 ? '16px' : '16px 32px');
      expect(c.svgLeft).toBeCloseTo(c.left + 1 + pad, 0);
      expect(c.svgWidth).toBeCloseTo(c.right - c.left - 2 - 2 * pad, 0);
      expect(c.headerLeft).toBeCloseTo(c.left + 1 + pad, 0);
      expect(c.headerTop).toBeCloseTo(c.top + 1 + top, 0);
      expect(c.footerBottom).toBeLessThanOrEqual(c.bottom - 1 - top + 0.5); // nothing clipped
      const right = await page.evaluate(() => getComputedStyle(document.getElementById('chart-legend-right')).display);
      expect(right).toBe('grid'); // .rc-chart--legend-right wins over the panel's flex
      expect(errors).toEqual([]);
      await page.close();
    },
  );

  it('a layout utility on the panel wins over its defaults; the reset does not erase its padding', async () => {
    const { page } = await open(1280);
    const r = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return { utility: cs('utility').display, kpiPadding: cs('kpi').padding };
    });
    expect(r.utility).toBe('grid');
    expect(r.kpiPadding).toBe('16px');
    await page.close();
  });
});

describe('CSS-183a: a chart\'s height with a frame', () => {
  it.each([1280, 375])('on the element it includes the padding and border; inside a composite it is the chart\'s at %ipx', async (width) => {
    // The trade-off recorded for RareCharts (RC-058): a chart that moves
    // into a frame on its element loses 2 × 16px padding + 2 × 1px border
    // of plot unless its `height` grows by 34.
    const { page, errors } = await open(width);
    const r = await page.evaluate(() => Object.fromEntries(['chart-framed', 'chart-wrapped', 'chart-bare'].map((id) => {
      const el = document.getElementById(id);
      return [id, { h: el.getBoundingClientRect().height, styleH: el.style.height, svg: el.querySelector(':scope > svg').getBoundingClientRect().height }];
    })));
    for (const c of Object.values(r)) {
      expect(c.h).toBeCloseTo(320, 0);
      expect(c.styleH).toBe('320px'); // at `height`, not grown past it
    }
    expect(r['chart-framed'].svg).toBeCloseTo(r['chart-bare'].svg - (2 * 16 + 2), 0);
    expect(r['chart-wrapped'].svg).toBeCloseTo(r['chart-bare'].svg, 0);
    expect(errors).toEqual([]);
    await page.close();
  });
});

describe('CSS-181: a panel is a block, the drop-in for the old class', () => {
  it.each([1280, 375])('inline runs stay on one line, paragraph margins collapse at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      const panel = document.getElementById('inline-mixed');
      const range = document.createRange();
      range.selectNodeContents(panel);
      const lines = new Set([...range.getClientRects()].map((b) => Math.round(b.top)));
      const p1 = document.getElementById('para-1');
      const p2 = document.getElementById('para-2');
      const gap = p2.getBoundingClientRect().top - p1.getBoundingClientRect().bottom;
      const margins = [parseFloat(getComputedStyle(p1).marginBottom), parseFloat(getComputedStyle(p2).marginTop)];
      return { display: getComputedStyle(panel).display, lines: lines.size, gap, margins };
    });
    expect(r.display).toBe('block');
    expect(r.lines).toBe(1);
    expect(Math.max(...r.margins)).toBeGreaterThan(0);
    expect(r.gap).toBeCloseTo(Math.max(...r.margins), 0); // collapsed, not summed
    await page.close();
  });

  it.each([1280, 375])('a panel opening an article block keeps its padding at %ipx', async (width) => {
    // `article .text-content-caption:first-child` (0,2,1) used to zero a
    // caption's padding and beat `.panel` (0,1,0); removed in v0.7.2, so a
    // caption that opens a block keeps whatever padding it is given.
    const { page } = await open(width);
    const r = await page.evaluate(() => ({
      frame: getComputedStyle(document.getElementById('first-frame')).padding,
      caption: getComputedStyle(document.getElementById('first-caption')).padding,
    }));
    expect(r.frame).toBe(width < 769 ? '16px' : '16px 32px');
    expect(r.caption).toBe('0px');
    await page.close();
  });

  it('a panel directly in a collapsible\'s content takes an even 16px; a flush one stays flush', async () => {
    const { page } = await open(1280);
    const r = await page.evaluate(() => ({
      plain: getComputedStyle(document.getElementById('in-collapsible')).padding,
      flush: getComputedStyle(document.getElementById('in-collapsible-flush')).padding,
    }));
    expect(r).toEqual({ plain: '16px', flush: '0px' });
    await page.close();
  });
});

describe('panel parts', () => {
  it.each([1280, 375])('one padding on every width, and flush, at %ipx (CSS-376, CSS-183)', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return { kpi: cs('kpi').padding, flush: cs('flush').padding, border: cs('flush').borderTopWidth };
    });
    expect(r.kpi).toBe('16px');
    expect(r.flush).toBe('0px');
    expect(r.border).toBe('1px');
    await page.close();
  });

  it('header, body and footer: the title on the header baseline, the footer muted and last', async () => {
    const { page } = await open(1280);
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const cs = (s) => getComputedStyle(q(s));
      return {
        h4Margin: cs('#kpi .panel__header h4').margin,
        headerBorder: cs('#kpi .panel__header').borderBottomWidth,
        footerBorder: cs('#kpi .panel__footer').borderTopWidth,
        footerColor: cs('#kpi .panel__footer').color,
        textLight: getComputedStyle(document.documentElement).getPropertyValue('--gray-mid-dark').trim(),
      };
    });
    expect(r.h4Margin).toBe('0px');
    expect(r.headerBorder).toBe('1px');
    expect(r.footerBorder).toBe('1px');
    expect(r.footerColor).toBe('rgb(102, 102, 102)'); // --text-color-light → --gray-mid-dark #666
    await page.close();
  });

  it.each([1280, 375])('a panel grid: equal heights, footers in line, one column on a phone at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => [...document.querySelectorAll('#grid > .panel')].map((p) => {
      const b = p.getBoundingClientRect();
      return { top: Math.round(b.top), height: Math.round(b.height), left: Math.round(b.left), footer: Math.round(p.querySelector('.panel__footer').getBoundingClientRect().bottom) };
    }));
    if (width < 769) {
      expect(new Set(r.map((p) => p.left)).size).toBe(1);
    } else {
      expect(new Set(r.map((p) => p.top)).size).toBe(1);
      expect(new Set(r.map((p) => p.height)).size).toBe(1);
      expect(new Set(r.map((p) => p.footer)).size).toBe(1);
    }
    await page.close();
  });

  it.each([900, 1100, 1300, 1440])('a panel with the caption width puts its content on the measure at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').appendChild(probe);
      const measure = probe.getBoundingClientRect();
      const panel = document.getElementById('frame-wrapped');
      const cs = getComputedStyle(panel);
      const b = panel.getBoundingClientRect();
      // how far the content box sits inside the measure on each side: the
      // panel's 1px frame, the same on both
      return {
        frame: parseFloat(cs.borderLeftWidth),
        left: b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) - measure.left,
        right: measure.right - (b.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight)),
      };
    });
    expect(r.left).toBeCloseTo(r.frame, 1);
    expect(r.right).toBeCloseTo(r.frame, 1); // was 15px past the measure at 769–1279px
    await page.close();
  });

  it.each([1300, 800, 375])('a table in a box with an outdent puts its labels on the text edge, once, at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').appendChild(probe);
      const measure = probe.getBoundingClientRect().left;
      const label = (id) => { const td = document.getElementById(id); return td.getBoundingClientRect().left + parseFloat(getComputedStyle(td).paddingLeft); };
      const card = document.getElementById('tbl-card');
      const cardContent = card.getBoundingClientRect().left + parseFloat(getComputedStyle(card).paddingLeft);
      return {
        box: label('tbl-box-td') - measure, // was 24px inside the text on a phone
        panel: label('tbl-panel-td') - measure, // the panel's 1px frame; was +32 (stepped back twice)
        card: label('tbl-card-td') - cardContent, // a card holds the outdent; was +32
      };
    });
    expect(r.box).toBeCloseTo(0, 0);
    // on a phone the outdent (8px) is below the panel's own padding, which stays
    expect(r.panel).toBeCloseTo(width < 769 ? 1 + 16 - 8 : 1, 0);
    expect(r.card).toBeCloseTo(0, 0);
    await page.close();
  });

  it('the cells of a hanging grid are padded alike on both sides', async () => {
    const { page } = await open(1300);
    const pad = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('hang-first')); return [cs.paddingLeft, cs.paddingRight]; });
    expect(pad[0]).toBe(pad[1]); // was 32/16: a centred figure sat 8px off
    await page.close();
  });

  it.each([1300, 375])('the panels of a hanging grid put their text on the text edge at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').appendChild(probe);
      const p = document.getElementById('hang-first');
      const cs = getComputedStyle(p);
      return { text: p.getBoundingClientRect().left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), measure: probe.getBoundingClientRect().left, frame: parseFloat(cs.borderLeftWidth) };
    });
    // on a phone the outdent (8px) is below the panel's own padding, which stays
    expect(r.text - r.measure).toBeCloseTo(width < 769 ? r.frame + 16 - 8 : r.frame, 0); // was 16px left of the text edge
    await page.close();
  });

  it('on paper a panel with the caption width takes its own padding: there is no outdent', async () => {
    const { page } = await open(1100);
    await page.emulateMedia({ media: 'print' });
    const pad = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('frame-wrapped')); return [cs.paddingLeft, cs.paddingRight]; });
    expect(pad).toEqual(['16px', '16px']);
    await page.close();
  });

  it.each([1280, 375])('outdents stay inside a panel, a dark card and a collapsible box at %ipx', async (width) => {
    const { page } = await open(width);
    const r = await page.evaluate(() => {
      // Against the content box: an outdent that is not contained hangs into
      // the padding or past the frame (the dark card held none: its `pre`
      // and `.highlight` poked out by 16px).
      const poking = [];
      for (const id of ['outdents', 'outdents-inv', 'outdents-coll']) {
        const surface = document.getElementById(id);
        const cs = getComputedStyle(surface);
        const box = surface.getBoundingClientRect();
        const left = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
        const right = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
        for (const el of surface.children) {
          const b = el.getBoundingClientRect();
          if (b.left < left - 0.5 || b.right > right + 0.5) poking.push(`#${id} > ${el.tagName}.${el.className}`);
        }
      }
      return { poking, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(r.poking).toEqual([]);
    expect(r.overflow).toBeLessThanOrEqual(0);
    await page.close();
  });
});

describe('CSS-371: the panel row', () => {
  const rows = (page) => page.evaluate(() => {
    const items = (id) => [...document.querySelectorAll(`#${id} > .panel__row-item`)].map((el) => {
      const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { top: Math.round(b.top), left: Math.round(b.left), width: Math.round(b.width), right: cs.borderRightWidth, bottom: cs.borderBottomWidth, align: cs.textAlign };
    });
    const row = (id) => { const el = document.getElementById(id); return { overflowX: getComputedStyle(el).overflowX, sw: el.scrollWidth, cw: el.clientWidth }; };
    const gauge = document.querySelector('#gauge-a > svg').getBoundingClientRect().width;
    return { stack: items('row-stack'), scroll: items('row-scroll'), stackRow: row('row-stack'), scrollRow: row('row-scroll'), gauge, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

  it('side by side from tablet up, dividers between cells; the neutral option aligns to the start', async () => {
    const { page } = await open(1280);
    const r = await rows(page);
    expect(new Set(r.stack.map((c) => c.top)).size).toBe(1);
    expect(new Set(r.stack.map((c) => c.width)).size).toBeLessThanOrEqual(2); // equal shares (±1px rounding)
    expect(r.stack.map((c) => c.right)).toEqual(['1px', '1px', '0px']);
    expect(r.stack.map((c) => c.align)).toEqual(['start', 'start', 'start']);
    expect(r.scroll.every((c) => c.align === 'center')).toBe(true);
    await page.close();
  });

  it('stacks on a phone, dividers top to bottom; the default row scrolls inside its border instead', async () => {
    const { page } = await open(375);
    const r = await rows(page);
    expect(new Set(r.stack.map((c) => c.left)).size).toBe(1);
    expect(r.stack[0].top).toBeLessThan(r.stack[1].top);
    expect(r.stack.map((c) => c.right)).toEqual(['0px', '0px', '0px']);
    expect(r.stack.map((c) => c.bottom)).toEqual(['1px', '1px', '0px']);
    expect(r.stackRow.overflowX).toBe('visible');
    expect(r.gauge).toBeGreaterThan(250); // a full-width cell, not a third
    expect(r.scrollRow.overflowX).toBe('auto');
    expect(r.scrollRow.sw).toBeGreaterThan(r.scrollRow.cw);
    expect(r.page).toBeLessThanOrEqual(0);
    await page.close();
  });
});

describe('CSS-178: the legend primitive', () => {
  it('swatch colour from --swatch-color (swatch or item), shapes, and the text colour by default', async () => {
    const { page } = await open(1280);
    const r = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return {
        line: [cs('sw-line').backgroundColor, cs('sw-line').width, cs('sw-line').height],
        dashed: cs('sw-dashed').backgroundImage,
        dot: [cs('sw-dot').backgroundColor, cs('sw-dot').borderRadius],
        band: [cs('sw-band').backgroundColor, cs('sw-band').opacity],
        text: getComputedStyle(document.getElementById('sw-band').parentElement).color,
        row: [cs('legend').display, cs('legend').listStyleType, cs('legend').paddingLeft],
      };
    });
    expect(r.line).toEqual(['rgb(0, 170, 255)', '16px', '2px']);
    expect(r.dashed).toMatch(/^repeating-linear-gradient\(90deg, rgb\(250, 140, 22\) 0px, rgb\(250, 140, 22\) 5px, rgba\(0, 0, 0, 0\) 5px, rgba\(0, 0, 0, 0\) 8px\)$/);
    expect(r.dot).toEqual(['rgb(0, 201, 122)', '50%']);
    expect(r.band).toEqual([r.text, '0.85']);
    expect(r.row).toEqual(['flex', 'none', '0px']);
    await page.close();
  });

  it('a toggle item drops the button chrome, also on hover; aria-pressed="false" is the off state', async () => {
    const { page } = await open(1280);
    await page.hover('#toggle-on');
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      const on = cs('toggle-on');
      return {
        on: [on.backgroundColor, on.borderTopWidth, on.paddingLeft, on.display, on.cursor, on.opacity],
        off: cs('toggle-off').opacity,
      };
    });
    // inline-flex, blockified to flex as an item of the legend's flex row —
    // not the `display: block` of the library's button default
    expect(r.on).toEqual(['rgba(0, 0, 0, 0)', '0px', '0px', 'flex', 'pointer', '1']);
    expect(r.off).toBe('0.35');
    await page.close();
  });
});
