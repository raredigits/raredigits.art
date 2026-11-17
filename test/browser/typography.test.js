// Typography and colour checks for Rare Styles v0.7.2, in a real engine:
// computed colours, grid placement, wrapping and layout that jsdom cannot
// show. Headless Google Chrome via playwright-core; reads the committed
// `/assets/css/rare.css`.   npm run test:browser
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

const FIXTURE = '/test/browser/fixtures/typography.html';

async function open(path = FIXTURE, { width = 1440, height = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(origin + path);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const css = (page, selector, props) => page.evaluate(([s, ps]) => {
  const cs = getComputedStyle(document.querySelector(s));
  return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
}, [selector, props]);

describe('CSS-124: --signal, and the focus ring that follows it', () => {
  it('--signal is blue; the ring follows a re-mapped --signal; an own --focus-ring-color still wins', async () => {
    const page = await open(FIXTURE);
    const ring = () => page.evaluate(() => {
      const b = document.createElement('button'); b.textContent = 'x'; b.id = 'sig-probe';
      document.querySelector('article, main, body').appendChild(b);
      return true;
    });
    await ring();
    const outline = async () => {
      await page.focus('#sig-probe');
      // :focus-visible after a keyboard-initiated focus
      await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
      return page.evaluate(() => getComputedStyle(document.activeElement).outlineColor);
    };
    const signal = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--signal').trim());
    expect(signal).toBe('#1677ff');
    expect(await outline()).toBe('rgb(22, 119, 255)');
    await page.evaluate(() => document.documentElement.style.setProperty('--signal', 'rgb(200, 0, 0)'));
    expect(await outline()).toBe('rgb(200, 0, 0)');
    await page.evaluate(() => document.documentElement.style.setProperty('--focus-ring-color', 'rgb(0, 128, 0)'));
    expect(await outline()).toBe('rgb(0, 128, 0)');
    await page.close();
  });
});

describe('CSS-121 / CSS-156: callout variants on the semantic roles', () => {
  const ROLES = ['signal', 'success', 'warning', 'danger'];
  const ALIASES = { positive: 'success', negative: 'danger', neutral: 'warning', fail: 'danger' };

  it('each variant draws a stripe (a state: its role colour over its -bg fill), keeps the text in the body colour', async () => {
    const page = await open();
    const roles = await page.evaluate((names) => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const resolve = (token) => { probe.style.color = `var(${token})`; return getComputedStyle(probe).color; };
      const fill = (token) => { probe.style.backgroundColor = `var(${token})`; return getComputedStyle(probe).backgroundColor; };
      return Object.fromEntries(names.map((n) => [n, { color: resolve(`--${n}`), bg: fill(`--${n}-bg`) }]));
    }, [...ROLES, ...Object.keys(ALIASES)]);
    expect(roles.signal.color).toBe('rgb(22, 119, 255)'); // --blue
    expect(roles.success.color).toBe('rgb(56, 158, 13)'); // --green
    expect(roles.warning.color).toBe('rgb(255, 224, 0)'); // --yellow
    expect(roles.danger.color).toBe('rgb(255, 0, 0)'); // --red
    // the financial and outcome aliases are their role, fill included
    for (const [alias, role] of Object.entries(ALIASES)) expect(roles[alias]).toEqual(roles[role]);
    // the -bg twin is the role colour, translucent, at one alpha for every role
    const alpha = (c) => Number((c.match(/\/ ([\d.]+)\)$/) || [])[1]);
    const alphas = new Set(ROLES.map((v) => alpha(roles[v].bg)));
    expect(alphas.size).toBe(1);
    const [a] = alphas;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    for (const v of ROLES) {
      const s = await css(page, `#callout-${v}`, ['border-left-color', 'border-left-width', 'color', 'text-align', 'background-color']);
      expect(s['border-left-width']).toBe('4px');
      expect(s.color).toBe('rgb(51, 51, 51)'); // --text-color-dark
      expect(s['text-align']).toBe('left');
      if (v === 'signal') {
        // plain information: a black stripe, no fill
        expect(s['border-left-color']).toBe('rgb(0, 0, 0)');
        expect(s['background-color']).toBe('rgba(0, 0, 0, 0)');
      } else {
        expect(s['border-left-color']).toBe(roles[v].color);
        expect(s['background-color']).toBe(roles[v].bg);
      }
    }
    // the plain callout sits between two thin rules, no side frame
    const plain = await css(page, '#callout-plain', ['border-top-width', 'border-left-width', 'text-align', 'color']);
    expect(plain).toEqual({ 'border-top-width': '1px', 'border-left-width': '0px', 'text-align': 'center', color: 'rgb(102, 102, 102)' });
    await page.close();
  });

  it('the signal stripe is the text colour: black on the page, light on a dark card', async () => {
    const page = await open();
    expect((await css(page, '#callout-signal', ['border-left-color']))['border-left-color']).toBe('rgb(0, 0, 0)');
    const card = (await css(page, '#callout-dark-card', ['color', 'background-color']));
    const stripe = (await css(page, '#callout-signal-dark', ['border-left-color']))['border-left-color'];
    expect(stripe).toBe(card.color);
    expect(stripe).not.toBe(card['background-color']);
    await page.close();
  });

  it('re-mapping the role on a surface re-colours the variant', async () => {
    const page = await open();
    expect((await css(page, '#callout-remapped', ['border-left-color']))['border-left-color']).toBe('rgb(250, 140, 22)');
    // the fill follows too: the role at 25%, mixed on the callout (was the page's yellow)
    const fill = (await css(page, '#callout-remapped', ['background-color']))['background-color'];
    const page2 = (await css(page, '#callout-warning', ['background-color']))['background-color'];
    expect(fill).not.toBe(page2);
    expect(fill).toMatch(/0\.98|250|0\.25/);
    await page.close();
  });
});

describe('CSS-372: a sidenote wrapper places its own children only', () => {
  const layout = (page) => page.evaluate(() => {
    const box = (id) => document.getElementById(id).getBoundingClientRect();
    const wrapper = document.getElementById('sn');
    const nested = [...wrapper.querySelectorAll(':scope > * *')]
      .filter((el) => { const cs = getComputedStyle(el); return cs.gridColumnStart === '1' && cs.gridColumnEnd === 'span 6'; })
      .map((el) => el.id || el.className);
    const col = (id) => { const cs = getComputedStyle(document.getElementById(id)); return `${cs.gridColumnStart} / ${cs.gridColumnEnd}`; };
    const title = document.getElementById('sn-title');
    const cardTitle = document.getElementById('sn-card-title');
    const cells = [...document.querySelectorAll('#sn-multi > .fx-cell')].map((c) => c.getBoundingClientRect());
    const [dt, dd] = [...document.querySelectorAll('#sn-dl > dt, #sn-dl > dd')].map((c) => c.getBoundingClientRect());
    return {
      display: getComputedStyle(wrapper).display,
      nested,
      first: col('sn-first'), second: col('sn-second'), note: col('sn-note'),
      headerColumns: getComputedStyle(document.getElementById('sn-header')).gridTemplateColumns.split(' ').length,
      titleBesideRange: box('sn-range').left >= box('sn-title').right - 0.5 && Math.abs(box('sn-range').top - box('sn-title').top) < 1,
      titleCut: title.scrollWidth > title.clientWidth || cardTitle.scrollWidth > cardTitle.clientWidth,
      legendBesidePlot: box('sn-legend').left >= box('sn-plot').right - 0.5,
      cellsSideBySide: Math.abs(cells[0].top - cells[1].top) < 1 && cells[1].left > cells[0].right,
      dlSideBySide: Math.abs(dt.top - dd.top) < 1 && dd.left > dt.right,
      noteLink: getComputedStyle(document.getElementById('sn-note-link')).color,
      chartLink: getComputedStyle(document.getElementById('sn-chart-link')).color,
      noteFirstMargin: getComputedStyle(document.getElementById('sn-note-p')).marginTop,
      // a paragraph that opens a block inside the chart keeps the chart's own margin
      chartNoteMargin: getComputedStyle(document.getElementById('sn-chart-note')).marginTop,
      // a `.sidenote` nested in the second child is not placed or restyled as the note
      nestedNote: (() => {
        const el = document.getElementById('sn-nested-note');
        const cs = getComputedStyle(el);
        return { col: `${cs.gridColumnStart} / ${cs.gridColumnEnd}`, fontSize: cs.fontSize, parentFontSize: getComputedStyle(el.parentElement).fontSize };
      })(),
    };
  });

  it.each([1440, 800, 375])('nested grids keep their own layout at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await layout(page);
    expect(r.nested).toEqual([]);
    expect(r.headerColumns).toBe(2);
    expect(r.titleBesideRange).toBe(true);
    expect(r.titleCut).toBe(false);
    expect(r.legendBesidePlot).toBe(true);
    expect(r.cellsSideBySide).toBe(true);
    expect(r.dlSideBySide).toBe(true);
    // links in the note are muted; a link inside an embedded chart keeps its own colour
    expect(r.noteLink).toBe('rgb(102, 102, 102)');
    expect(r.chartLink).toBe('rgb(0, 0, 238)');
    expect(r.chartNoteMargin).toBe('4px'); // not 0 (desktop) or 8px (phone) from the note's own first-child rule
    expect(r.nestedNote.col).not.toBe('8 / span 2');
    expect(r.nestedNote.fontSize).toBe(r.nestedNote.parentFontSize);
    await page.close();
  });

  it('the wrapper still places text and note side by side on desktop, stacked on a phone', async () => {
    const desk = await open(FIXTURE, { width: 1440 });
    expect(await layout(desk)).toMatchObject({
      display: 'grid', first: '1 / span 6', second: '1 / span 6', note: '8 / span 2', noteFirstMargin: '0px',
    });
    await desk.close();
    const phone = await open(FIXTURE, { width: 375 });
    expect(await layout(phone)).toMatchObject({ display: 'flex', noteFirstMargin: '8px' });
    await phone.close();
    // a RareCharts chart in the note: the row stacks on a tablet too, in its
    // grid: every child across the row
    const tablet = await open(FIXTURE, { width: 800 });
    expect(await layout(tablet)).toMatchObject({ display: 'grid', note: '1 / -1', noteFirstMargin: '8px' });
    await tablet.close();
  });
});

describe('Sidenote rows: a chart in a note, the note width, wide blocks, the banner, the bottom edge', () => {
  const read = (page) => page.evaluate(() => {
    const el = (id) => document.getElementById(id);
    const box = (id) => el(id).getBoundingClientRect();
    const cs = (id) => getComputedStyle(el(id));
    const col = (id) => `${cs(id).gridColumnStart} / ${cs(id).gridColumnEnd}`;
    return {
      // the chart row stacked: the note under the text, from the same edge
      chartStacked: box('snc-note').top >= box('snc-first').bottom - 0.5 && Math.abs(box('snc-note').left - box('snc-first').left) < 0.5,
      plainRow: cs('snp').display,
      // a second note in a row goes under the first
      notesApart: box('sn2-n2').top >= box('sn2-n1').bottom - 0.5,
      // a wide block nested in a text block ends at its column
      nestedGap: box('snn-note').left - box('snn-wide').right,
      // on a phone a long first line of a marked note starts after the marker
      firstLineClear: (() => {
        const note = el('snl-note'); const m = getComputedStyle(note, '::before');
        const markerRight = note.getBoundingClientRect().left + parseFloat(m.left) + parseFloat(m.width);
        const r = document.createRange(); r.selectNodeContents(el('snl-p'));
        return r.getClientRects()[0].left >= markerRight - 0.5;
      })(),
      // the stacked note is as wide as the text above it (the measure; the whole row on a phone)
      noteAsText: Math.abs(box('snc-note').left - box('snc-first').left) < 0.5 && Math.abs(box('snc-note').right - box('snc-first').right) < 0.5,
      // a chart that opens a marked note starts under the marker
      markerClear: (() => {
        const note = el('snm-note'); const m = getComputedStyle(note, '::before');
        const bottom = note.getBoundingClientRect().top + parseFloat(getComputedStyle(note).borderTopWidth) + parseFloat(m.top) + parseFloat(m.height);
        return box('snm-chart').top >= bottom - 0.5;
      })(),
      noteText: cs('snc-note-p').textAlign, chartAlign: cs('snc-chart').textAlign, chartTitle: cs('snc-chart-title').textAlign,
      chartMarker: getComputedStyle(el('snc-note'), '::before').top, plainMarker: getComputedStyle(el('snp-note'), '::before').top,
      noteToEdge: Math.abs(box('snp-note').right - box('snp').right) < 0.5,
      noteWidth: box('snw-note').width,
      wideGap: box('snw-note').left - box('snw-wide').right,
      wideWidth: box('snw-wide').width, aloneWidth: box('hl-alone').width,
      banner: col('snb-note'), bannerWide: col('snbw-note'),
      bannerWideBeside: box('snbw-wide').top < box('snbw-note').bottom && box('snbw-wide').right <= box('snbw-note').left,
      leadLast: cs('sne-lead-last').marginBottom, utilLast: cs('sne-util-last').marginBottom, outLast: cs('sne-out-last').marginBottom,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  it('desktop: side by side; the note fills its columns; a wide block keeps the caption width', async () => {
    const page = await open(FIXTURE, { width: 1440 });
    const r = await read(page);
    expect(r).toMatchObject({
      chartStacked: false, plainRow: 'grid', chartAlign: 'start', chartMarker: '-8px', plainMarker: '-8px',
      noteToEdge: true, banner: '8 / span 2', bannerWide: '8 / span 2', pageOverflow: false,
      notesApart: true,
    });
    expect(r.nestedGap).toBeGreaterThanOrEqual(16 - 0.5);
    expect(r.wideWidth).toBeCloseTo(r.aloneWidth, 1);
    expect(r.wideGap).toBeGreaterThanOrEqual(16 - 0.5);
    await page.close();
  });

  it.each([800, 900, 1100])('tablet and narrow desktop at %ipx: a chart row stacks, other rows keep the note column', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await read(page);
    expect(r).toMatchObject({
      chartStacked: true, noteAsText: true, markerClear: true, plainRow: 'grid', notesApart: true,
      // the note's text to the right edge, the chart keeps its own alignment
      noteText: 'right', chartAlign: 'start', chartTitle: 'start',
      chartMarker: '4px', plainMarker: '-8px', noteToEdge: true,
      pageOverflow: false,
    });
    // a banner takes a column more on a tablet, unless a wide block holds it
    if (width < 1024) expect(r).toMatchObject({ banner: '7 / span 3', bannerWide: '8 / span 2', bannerWideBeside: true });
    // a wide block ends at its columns, a nested one too: the column gap stays, the note keeps its two columns
    expect(r.wideGap).toBeGreaterThanOrEqual(16 - 0.5);
    expect(r.nestedGap).toBeGreaterThanOrEqual(16 - 0.5);
    expect(r.noteWidth).toBeGreaterThan(100);
    await page.close();
  });

  it('phone: every row stacks; the chart keeps its own alignment in the right-aligned note', async () => {
    const page = await open(FIXTURE, { width: 375 });
    const r = await read(page);
    expect(r).toMatchObject({
      chartStacked: true, plainRow: 'flex', noteAsText: true, markerClear: true, noteText: 'right', chartAlign: 'start', chartTitle: 'start',
      chartMarker: '4px', plainMarker: '4px', pageOverflow: false, firstLineClear: true,
    });
    expect(r.wideWidth).toBeCloseTo(r.aloneWidth, 1);
    await page.close();
  });

  it('on paper a wide block in a row fills its columns again (the print reset decides)', async () => {
    const page = await open(FIXTURE, { width: 800 });
    await page.emulateMedia({ media: 'print' });
    const gap = await page.evaluate(() => document.getElementById('snw-note').getBoundingClientRect().left - document.getElementById('snw-wide').getBoundingClientRect().right);
    expect(gap).toBeCloseTo(16, 0);
    await page.close();
  });

  it.each([800, 1440])('on paper a row with a chart in its note stacks at %ipx; other rows keep the grid', async (width) => {
    const page = await open(FIXTURE, { width });
    await page.emulateMedia({ media: 'print' });
    const r = await read(page);
    expect(r).toMatchObject({ chartStacked: true, noteAsText: true, plainRow: 'grid', chartAlign: 'start' });
    await page.close();
  });

  it.each([1440, 375])('the bottom edge at %ipx: flush in the article flow, whatever the block; the margin stays elsewhere', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await read(page);
    expect(r.leadLast).toBe('0px'); // .lead's own margin-bottom does not win
    expect(r.utilLast).toBe('0px'); // nor does a margin utility
    expect(r.outLast).not.toBe('0px'); // a row outside the article flow has no block gap: the margin stays
    await page.close();
  });
});

describe('surfaces, presets and a project measure', () => {
  it('a quote in a dark card or a collapsible keeps the measure of the paragraph beside it', async () => {
    const page = await open(FIXTURE, { width: 1300 });
    const r = await page.evaluate(() => Object.fromEntries(['inv-p', 'inv-bq', 'coll-p', 'coll-bq'].map((id) => [id, getComputedStyle(document.getElementById(id)).maxWidth])));
    expect(r['inv-bq']).toBe(r['inv-p']); // was 100%: the surface's reset beat the quote's measure
    expect(r['coll-bq']).toBe(r['coll-p']);
    expect(r['inv-p']).toMatch(/px$/);
    await page.close();
  });

  it('a striped terminal table keeps the padding of a preset on it', async () => {
    const page = await open(FIXTURE, { width: 1300 });
    const pad = (id) => page.evaluate((i) => { const cs = getComputedStyle(document.getElementById(i)); return `${cs.paddingTop} ${cs.paddingBottom}`; }, id);
    expect(await pad('tt-sb-td')).toBe(await pad('tt-b-td'));
    await page.close();
  });

  it('on a phone a project measure set on :root does not widen the page through the wide blocks', async () => {
    const page = await open(FIXTURE, { width: 375 });
    const r = await page.evaluate(() => {
      document.documentElement.style.setProperty('--text-content-width', '36rem');
      const hl = document.getElementById('hl-alone').getBoundingClientRect();
      return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, hlRight: hl.right, cw: document.documentElement.clientWidth };
    });
    expect(r.hlRight).toBeLessThanOrEqual(r.cw + 0.5);
    expect(r.over).toBeLessThanOrEqual(0);
    await page.close();
  });
});

describe('the caption width stops at a narrow container', () => {
  // In an article a caption-width block is the measure plus the outdents; in
  // a container narrower than that (a grid cell, a half-width block) it is
  // the container plus `--outdent` on the left and `--outdent-end` on the
  // right, the room there is (CSS-367), as in v0.7.1. Without the cap a box
  // in a half-width block passed it by up to 300px, a highlight took most of
  // its grid, and a lead in a grid's left cell scrolled the page at 800–900px.
  it.each([1440, 1100, 900, 800, 375])('hangs by the outdent and no further at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      const probe = document.createElement('div');
      document.getElementById('hl-alone').before(probe);
      const px = (v) => { probe.style.width = v; return probe.getBoundingClientRect().width; };
      const caption = px('var(--text-content-caption)');
      const od = px('var(--outdent)');
      const odEnd = px('var(--outdent-end)');
      probe.remove();
      const cap = box('cw-cap'), half = box('cw-half');
      return {
        past: [half.left - cap.left, cap.right - half.right], od, odEnd,
        cells: [...document.getElementById('cw-grid').children].map((c) => c.getBoundingClientRect().width),
        alone: [box('hl-alone').width, caption],
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(r.past[0]).toBeLessThanOrEqual(r.od + 0.5); // the outdent, not 184–303px
    expect(r.past[1]).toBeLessThanOrEqual(r.odEnd + 0.5); // on the right only the room there is
    // equal tracks; on a phone a third of the screen is narrower than the
    // highlight's longest word, and the track grows to it (as in v0.7.1)
    if (width > 768) expect(Math.max(...r.cells) - Math.min(...r.cells)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.alone[0] - r.alone[1])).toBeLessThanOrEqual(0.5); // in the article: the caption width
    expect(r.over).toBeLessThanOrEqual(0);
    await page.close();
  });
});

describe('callouts, floats, notes and a shrink-to-fit parent', () => {
  it('a state callout in an information notice keeps its fill', async () => {
    const page = await open(FIXTURE, { width: 1300 });
    const [nested, alone] = [(await css(page, '#callout-nested', ['background-color']))['background-color'], (await css(page, '#callout-warning', ['background-color']))['background-color']];
    expect(nested).toBe(alone); // was transparent: the signal's slot reached it
    await page.close();
  });

  it.each([1024, 1100, 1440])('an inline note floats clear of the measure at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const probe = document.createElement('div'); probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').append(probe);
      return document.getElementById('float-note').getBoundingClientRect().left - probe.getBoundingClientRect().right;
    });
    expect(r).toBeGreaterThanOrEqual(0); // was 77px over the text at 1024
    await page.close();
  });

  it('a link in a note heading is muted with the note', async () => {
    const page = await open(FIXTURE, { width: 1300 });
    expect((await css(page, '#sn-head-a', ['color'])).color).toBe((await css(page, '#sn-p-a', ['color'])).color);
    await page.close();
  });

  it.each([375, 1300])('a chart row in a flex item that sizes to its content keeps its width at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const w = await page.evaluate(() => document.getElementById('shrink-row').getBoundingClientRect().width);
    expect(w).toBeGreaterThan(150); // a query container collapsed it to 0–128px
    await page.close();
  });
});

describe('the caption-width aliases and the small utilities', () => {
  it('.card-caption is .full-width-caption under its older name', async () => {
    const page = await open(FIXTURE, { width: 1300 });
    const w = (id) => page.evaluate((i) => document.getElementById(i).getBoundingClientRect().width, id);
    expect(await w('cc-p')).toBeCloseTo(await w('fwc-p'), 0); // was 505px, on the measure
    await page.close();
  });

  it.each([[1300, '19.2px'], [375, '14.4px']])('a breakpoint size and an opacity step at %ipx', async (width, size) => {
    const page = await open(FIXTURE, { width });
    expect(await css(page, '#util-p', ['font-size', 'opacity'])).toEqual({ 'font-size': size, opacity: '0.5' });
    await page.close();
  });
});

describe('the measure stops at a caption', () => {
  it('a paragraph, a definition list and a quote in .caption run its full width', async () => {
    const page = await open(FIXTURE, { width: 1440 });
    const r = await page.evaluate(() => ['cap-p', 'cap-dl', 'cap-bq'].map((id) => getComputedStyle(document.getElementById(id)).maxWidth));
    expect(r).toEqual(['none', 'none', 'none']); // the list and the quote kept the 505px measure
    await page.close();
  });
});

describe('CSS-373: code in a scrolling table keeps its shape', () => {
  it('at 375px option names do not break mid-word; the box scrolls, the page does not', async () => {
    const page = await open(FIXTURE, { width: 375 });
    const r = await page.evaluate(() => {
      const wrap = document.getElementById('opt-scroll');
      const tokens = [...wrap.querySelectorAll('td code')].filter((c) => !/\s/.test(c.textContent.trim()));
      return {
        tokens: tokens.length,
        broken: tokens.filter((c) => c.getClientRects().length > 1).map((c) => c.textContent),
        scrolls: wrap.scrollWidth > wrap.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        inlineWraps: document.querySelector('#inline-code code').getClientRects().length > 1,
      };
    });
    expect(r.tokens).toBeGreaterThan(5);
    expect(r.broken).toEqual([]);
    expect(r.scrolls).toBe(true);
    expect(r.pageOverflow).toBe(false);
    expect(r.inlineWraps).toBe(true); // CSS-354 still holds outside the table
    await page.close();
  });

  it.each([375, 600])('in print the table fits the page again at %ipx: paper does not scroll', async (width) => {
    const page = await open(FIXTURE, { width });
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => {
      const box = document.getElementById('opt-scroll').getBoundingClientRect();
      const table = document.getElementById('opt-table').getBoundingClientRect();
      const keys = [...document.querySelectorAll('#opt-table td:first-child > code')];
      return {
        over: table.right - box.right,
        wrap: getComputedStyle(document.querySelector('#opt-table td:nth-child(2) code')).overflowWrap,
        keyWhiteSpace: getComputedStyle(keys[0]).whiteSpace,
        // a name without a hyphen stays whole on paper (`cont` / `rols` on A4)
        keysBroken: keys.filter((c) => !c.textContent.includes('-') && c.getClientRects().length > 1).map((c) => c.textContent),
        keys: keys.length,
      };
    });
    expect(r.wrap).toBe('anywhere');
    expect(r.keyWhiteSpace).toBe('normal');
    expect(r.keys).toBeGreaterThan(3);
    expect(r.keysBroken).toEqual([]);
    expect(r.over).toBeLessThanOrEqual(0.5);
    await page.close();
  });
});

describe('Hand review, second pass: pre on a tablet, the footnote list', () => {
  it.each([[1440, 32, 0], [900, 32, 0], [375, 16, 8]])('at %ipx pre has %ipx side padding; its code starts %ipx in from the text edge', async (width, padding, inset) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const pre = document.getElementById('lh-pre');
      const cs = getComputedStyle(pre);
      const text = document.getElementById('m-prose').getBoundingClientRect().left;
      return { left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight), inset: pre.getBoundingClientRect().left + parseFloat(cs.paddingLeft) - text };
    });
    expect(r).toEqual({ left: padding, right: padding, inset });
    await page.close();
  });

  it('the list in a footnote starts on the block\'s text edge', async () => {
    const page = await open(FIXTURE);
    const r = await page.evaluate(() => {
      const box = document.getElementById('fn-box');
      return {
        padding: getComputedStyle(document.getElementById('fn-list')).paddingLeft,
        inset: document.getElementById('fn-li').getBoundingClientRect().left - box.getBoundingClientRect().left - parseFloat(getComputedStyle(box).paddingLeft),
      };
    });
    expect(r).toEqual({ padding: '0px', inset: 0 });
    await page.close();
  });
});

describe('CSS-374: the prose measure stops at a data component', () => {
  it.each([1440, 900])('prose keeps the measure, a chart, a panel or a data table does not, at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').append(probe);
      const measure = probe.getBoundingClientRect().width;
      const article = document.querySelector('article').getBoundingClientRect().width;
      const w = (id) => document.getElementById(id).getBoundingClientRect().width;
      return {
        measure, article,
        prose: ['m-prose', 'm-list', 'm-section', 'm-card'].map((id) => [id, Math.abs(w(id) - measure) < 1]),
        // a plain table setting prose in columns keeps the measure on its cells
        layoutCapped: Math.abs(parseFloat(getComputedStyle(document.getElementById('m-layout-td')).maxWidth) - measure) < 1,
        // free of the measure: no max-width at all (a capped block carries the
        // measure); its width is then its own box's, which on a tablet (the
        // measure is 8 of the article's 9 columns) can be the narrower one
        free: ['m-chart-subtitle', 'm-chart-list', 'm-panel', 'm-table-section', 'm-td', 'm-bordered-td'].map((id) => [id, getComputedStyle(document.getElementById(id)).maxWidth === 'none']),
        // a prose table's label column is not squeezed to its longest word
        labelOneLine: (() => { const p = document.querySelector('#m-layout-label p'); return Math.round(p.getBoundingClientRect().height) <= Math.round(parseFloat(getComputedStyle(p).lineHeight)); })(),
      };
    });
    expect(r.article).toBeGreaterThan(r.measure + 20);
    expect(r.prose).toEqual(r.prose.map(([id]) => [id, true]));
    expect(r.free).toEqual(r.free.map(([id]) => [id, true]));
    expect(r.layoutCapped).toBe(true);
    if (width === 1440) expect(r.labelOneLine).toBe(true);
    await page.close();
  });
});

describe('CSS-375: line-heights are ratios of each element\'s own font size', () => {
  it.each([1440, 375])('nothing inherits a fixed length at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await page.evaluate(() => {
      const ratio = (id) => {
        const cs = getComputedStyle(document.getElementById(id));
        return +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2);
      };
      const root = getComputedStyle(document.documentElement);
      return {
        tokens: ['--line-height', '--line-height-xs', '--line-height-sm', '--line-height-md', '--line-height-lg']
          .map((t) => root.getPropertyValue(t).trim()),
        xs: ratio('lh-xs'), label: ratio('lh-11'), noteBig: ratio('lh-note-big'), sidenoteLabel: ratio('lh-sidenote-11'),
        h1: ratio('title'), h2: ratio('lh-h2'), code: ratio('lh-code'), pre: ratio('lh-pre'),
        // the line pitch of a code block: its height over its lines, per pre font size
        pitch: (() => {
          const pre = document.getElementById('lh-pre'); const cs = getComputedStyle(pre);
          const inner = pre.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
          return +(inner / 4 / parseFloat(cs.fontSize)).toFixed(3);
        })(),
        // a child with another font size in each place that had an `em` value
        footnote: ratio('lh-footnote-big'), footnoteInText: ratio('lh-fit-big'), asideFooter: ratio('lh-aside-big'),
        sidebarMeta: ratio('lh-meta-big'), cite: ratio('lh-cite-big'),
      };
    });
    expect(r.tokens).toEqual(['1.5', '1', '1.2', '1.7', '2']);
    expect(r.xs).toBe(1.5); // body text ratio, not body's 24px
    expect(r.label).toBe(1.5);
    expect(r.noteBig).toBe(1.3); // .note's ratio, not its 18.72px
    expect(r.sidenoteLabel).toBe(1.4);
    expect(r.h1).toBe(1.2);
    expect(r.h2).toBe(1.2); // display leading for headings
    expect(r.pre).toBe(1.2); // the block's own leading, as in `em`
    expect(r.code).toBe(1.2); // the ratio, inherited
    // the block's strut sets the pitch: 19.2px, not the 24px of the body ratio
    // (the `em` value gave 20.2px, the code font's box sticking out by 1px)
    expect(r.pitch).toBeGreaterThan(1.15);
    expect(r.pitch).toBeLessThan(1.27);
    expect(r.footnote).toBe(1.3);
    expect(r.footnoteInText).toBe(1.2);
    expect(r.asideFooter).toBe(1.2);
    expect(r.sidebarMeta).toBe(1.3);
    expect(r.cite).toBe(1.3);
    await page.close();
  });
});

describe('CSS-377: a block that follows a block keeps a gap', () => {
  it.each([1440, 375])('gaps in the article flow at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    const gap = await page.evaluate(() => {
      const g = (a, b) => Math.round(document.getElementById(b).getBoundingClientRect().top - document.getElementById(a).getBoundingClientRect().bottom);
      return {
        cardPre: g('r-card1', 'r-pre1'), preList: g('r-pre1', 'r-ul1'), listCard: g('r-ul1', 'r-card2'),
        cardChart: g('r-card2', 'r-chart'), chartGrid: g('r-chart', 'r-grid'), gridRow: g('r-grid', 'r-sn'), rowPre: g('r-sn', 'r-pre2'),
        sectionCardPre: g('r-sec-card', 'r-sec-pre'),
        paragraphCard: g('r-p', 'r-card1'),
        spacer: g('r-card3', 'r-pre3'), tableBox: g('r-scroll', 'r-pre4'), utility: g('r-card4', 'r-pre5'),
        marginBottomFirst: g('r-card5', 'r-pre6'), marginTopSecond: g('r-card6', 'r-pre7'),
        // v0.7.2: the row owns its gap (the block gap), the last text block is
        // flush, so the gap holds beside a note taller than its text too
        rowRow: g('r-row1', 'r-row2'), rowRowText: g('r-row1-p', 'r-row2-p'), paragraphText: g('r-pp1', 'r-pp2'),
        tallNoteRow: g('r-row3-note', 'r-row4'),
        sectionRowRow: g('r-sec-row1', 'r-sec-row2'), sectionRowRowText: g('r-sec-row1-p', 'r-sec-row2-p'),
        // the panel family and the legend are blocks too (integration of the two streams)
        panelRowPre: g('r-prow', 'r-pre8'), preGrid: g('r-pre8', 'r-pgrid'), gridLegend: g('r-pgrid', 'r-legend'), legendPre: g('r-legend', 'r-pre9'),
        // phase-2 blocks: KPI figures, a button group, a fieldset
        preStat: g('r-pre9', 'r-stat'), statGroup: g('r-stat', 'r-bgroup'), groupFieldset: g('r-bgroup', 'r-fs'), fieldsetPre: g('r-fs', 'r-pre10'),
      };
    });
    expect(gap).toEqual({
      cardPre: 16, preList: 16, listCard: 16, cardChart: 16, chartGrid: 16, gridRow: 16, rowPre: 16,
      sectionCardPre: 16,
      paragraphCard: 8, // the paragraph's own margin, unchanged
      spacer: 16, // the spacer's height only: no double gap while the docs still use .air-*
      tableBox: 0, // the box holds the table's 32px margin inside it
      utility: 32, // .margin-t-lg wins
      marginBottomFirst: 16, // collapses with the gap: a margin-bottom on the first block cannot shrink it
      marginTopSecond: 0, // a margin-top utility on the second block decides
      rowRow: gap.rowRow, rowRowText: gap.rowRowText, paragraphText: 8, tallNoteRow: gap.tallNoteRow,
      sectionRowRow: gap.sectionRowRow, sectionRowRowText: gap.sectionRowRowText,
      panelRowPre: 16, preGrid: 16, gridLegend: 16, legendPre: 16,
      preStat: 16, statGroup: 16, groupFieldset: 16, fieldsetPre: 16,
    });
    // side by side, row to row is the block gap, from the text and from a
    // note taller than its text alike (on a phone the note stacks between the
    // two rows and carries its own spacing)
    if (width === 1440) {
      expect(gap.rowRow).toBe(16);
      expect(gap.rowRowText).toBe(16);
      expect(gap.sectionRowRow).toBe(16);
      expect(gap.sectionRowRowText).toBe(16);
      expect(gap.tallNoteRow).toBe(16);
    }
    await page.close();
  });
});

describe('CSS-379: the attribution look is scoped', () => {
  it('a bare cite stays inline; only the cite closing a blockquote gets the look', async () => {
    const page = await open(FIXTURE);
    const r = await page.evaluate(() => {
      const look = (el) => { const cs = getComputedStyle(el); return [cs.display, cs.textAlign, cs.fontSize]; };
      return {
        bare: look(document.getElementById('c-bare')),
        bareStyle: getComputedStyle(document.getElementById('c-bare')).fontStyle,
        chartSource: getComputedStyle(document.querySelector('#sn-chart cite')).display,
        quote: look(document.getElementById('c-quote')),
        // titles of works: inside the quoted prose, in a caption, in a quote's figcaption
        inQuote: look(document.getElementById('c-inquote')),
        caption: look(document.getElementById('c-fig')),
        figWork: look(document.getElementById('c-fig-work')),
        figWorkColor: getComputedStyle(document.getElementById('c-fig-work')).color,
        figcapColor: getComputedStyle(document.getElementById('c-figcap')).color,
      };
    });
    expect(r.bare).toEqual(['inline', 'start', '16px']);
    expect(r.bareStyle).toBe('italic'); // the browser's own title style
    expect(r.chartSource).toBe('inline'); // an embedded chart's <cite> source line is left alone
    expect(r.quote).toEqual(['block', 'right', '14.4px']);
    for (const k of ['inQuote', 'caption', 'figWork']) expect(r[k][0]).toBe('inline');
    expect(r.figWorkColor).toBe(r.figcapColor); // the title keeps its caption's colour
    await page.close();
  });
});

describe('CSS-382: one long word in the page title', () => {
  const title = (page, text) => page.evaluate((t) => {
    const h = document.getElementById('title');
    h.textContent = t;
    const r = h.getBoundingClientRect();
    // a word broken across two lines has characters on two line tops
    const broken = [];
    const node = h.firstChild; const re = /\S+/g; let m;
    while ((m = re.exec(t))) {
      const tops = new Set();
      for (let i = 0; i < m[0].length; i++) {
        const rg = document.createRange(); rg.setStart(node, m.index + i); rg.setEnd(node, m.index + i + 1);
        tops.add(Math.round(rg.getClientRects()[0].top));
      }
      if (tops.size > 1) broken.push(m[0]);
    }
    return {
      right: r.right, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth,
      fontSize: getComputedStyle(h).fontSize, broken,
      lines: Math.round(r.height / parseFloat(getComputedStyle(h).lineHeight)),
    };
  }, text);

  // the widest title words on the site: "Development" (342px at 56px), "Hierarchical" (325px)
  it.each([320, 360, 375])('shrinks before it breaks: no page overflow, no word cut, at %ipx', async (width) => {
    const page = await open(FIXTURE, { width });
    for (const text of ['Hierarchical Bar', 'Disabling GA Tags in Development', 'Installation']) {
      const r = await title(page, text);
      expect(r.sw).toBeLessThanOrEqual(r.vw);
      expect(r.right).toBeLessThanOrEqual(r.vw);
      expect(r.broken).toEqual([]);
      expect(parseFloat(r.fontSize)).toBeCloseTo(Math.min(56, width * 0.14), 1);
    }
    await page.close();
  });

  it('a word wider than the column still breaks rather than widen the page (320px)', async () => {
    const page = await open(FIXTURE, { width: 320 });
    const r = await title(page, 'Pneumonoultramicroscopic');
    expect(r.sw).toBeLessThanOrEqual(r.vw);
    expect(r.right).toBeLessThanOrEqual(r.vw);
    await page.close();
  });

  it.each([414, 1440])('the display size from 400px up (%ipx), a title that fits on one line', async (width) => {
    const page = await open(FIXTURE, { width });
    const r = await title(page, 'Hierarchical Bar');
    expect(r.fontSize).toBe('56px');
    if (width === 1440) expect(r.lines).toBe(1);
    await page.close();
  });
});

describe('CSS-383: print shows prose link addresses, not chart ones', () => {
  it('in print media only the external prose link gets its address', async () => {
    const page = await open(FIXTURE);
    await page.emulateMedia({ media: 'print' });
    const after = await page.evaluate(() => Object.fromEntries(['pr-prose', 'pr-anchor', 'pr-chart-note', 'pr-chart-li']
      .map((id) => [id, getComputedStyle(document.getElementById(id), '::after').content])));
    expect(after['pr-prose']).toBe('" (https://example.com/report)"');
    expect(after['pr-anchor']).toBe('none');
    expect(after['pr-chart-note']).toBe('none');
    expect(after['pr-chart-li']).toBe('none');
    await page.close();
  });
});
