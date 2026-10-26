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

describe('CSS-121 / CSS-156: callout severity variants on the semantic tokens', () => {
  it('each variant draws its role colour as a stripe, keeps the text in the body colour', async () => {
    const page = await open();
    const roles = await page.evaluate(() => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const resolve = (token) => { probe.style.color = `var(${token})`; return getComputedStyle(probe).color; };
      return {
        info: resolve('--color-info'), success: resolve('--color-success'),
        warning: resolve('--color-warning'), error: resolve('--color-danger'),
      };
    });
    expect(roles.info).toBe('rgb(22, 119, 255)'); // --blue
    expect(roles.success).toBe('rgb(56, 158, 13)'); // --green
    expect(roles.warning).toBe('rgb(255, 224, 0)'); // --yellow
    expect(roles.error).toBe('rgb(255, 0, 0)'); // --red
    for (const v of ['info', 'success', 'warning', 'error']) {
      const s = await css(page, `#callout-${v}`, ['border-left-color', 'border-left-width', 'color', 'text-align', 'background-color']);
      expect(s['border-left-color']).toBe(roles[v]);
      expect(s['border-left-width']).toBe('4px');
      expect(s.color).toBe('rgb(51, 51, 51)'); // --text-color-dark
      expect(s['text-align']).toBe('left');
      expect(s['background-color']).not.toBe('rgba(0, 0, 0, 0)');
    }
    const plain = await css(page, '#callout-plain', ['border-left-width', 'text-align', 'color']);
    expect(plain).toEqual({ 'border-left-width': '1px', 'text-align': 'center', color: 'rgb(102, 102, 102)' });
    await page.close();
  });

  it('re-mapping the role on a surface re-colours the variant', async () => {
    const page = await open();
    expect((await css(page, '#callout-remapped', ['border-left-color']))['border-left-color']).toBe('rgb(250, 140, 22)');
    await page.close();
  });
});

describe('CSS-372: a sidenote wrapper places its own children only', () => {
  const layout = (page) => page.evaluate(() => {
    const box = (id) => document.getElementById(id).getBoundingClientRect();
    const wrapper = document.getElementById('sn');
    const nested = [...wrapper.querySelectorAll(':scope > * *')]
      .filter((el) => { const cs = getComputedStyle(el); return cs.gridColumnStart === '1' && cs.gridColumnEnd === 'span 5'; })
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

  it.each([1440, 375])('nested grids keep their own layout at %ipx', async (width) => {
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
    expect(r.chartNoteMargin).toBe('4px'); // not 0 (desktop) or 16px (phone) from the note's own first-paragraph rule
    expect(r.nestedNote.col).not.toBe('7 / span 2');
    expect(r.nestedNote.fontSize).toBe(r.nestedNote.parentFontSize);
    await page.close();
  });

  it('the wrapper still places text and note side by side on desktop, stacked on a phone', async () => {
    const desk = await open(FIXTURE, { width: 1440 });
    expect(await layout(desk)).toMatchObject({
      display: 'grid', first: '1 / span 5', second: '1 / span 5', note: '7 / span 2', noteFirstMargin: '0px',
    });
    await desk.close();
    const phone = await open(FIXTURE, { width: 375 });
    expect(await layout(phone)).toMatchObject({ display: 'flex', noteFirstMargin: '16px' });
    await phone.close();
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
      return { over: table.right - box.right, wrap: getComputedStyle(document.querySelector('#opt-table td code')).overflowWrap };
    });
    expect(r.wrap).toBe('anywhere');
    expect(r.over).toBeLessThanOrEqual(0.5);
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
        free: ['m-chart-subtitle', 'm-chart-list', 'm-panel', 'm-table-section', 'm-td', 'm-bordered-td'].map((id) => [id, w(id) > measure + 50]),
        // a prose table's label column is not squeezed to its longest word
        labelOneLine: (() => { const p = document.querySelector('#m-layout-label p'); return Math.round(p.getBoundingClientRect().height) <= Math.round(parseFloat(getComputedStyle(p).lineHeight)); })(),
      };
    });
    expect(r.article).toBeGreaterThan(r.measure + 50);
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
        // sidenote rows are prose: row after row reads as paragraph after paragraph
        rowRow: g('r-row1', 'r-row2'), rowRowText: g('r-row1-p', 'r-row2-p'), paragraphText: g('r-pp1', 'r-pp2'),
        sectionRowRow: g('r-sec-row1', 'r-sec-row2'), sectionRowRowText: g('r-sec-row1-p', 'r-sec-row2-p'),
        // the panel family and the legend are blocks too (integration of the two streams)
        panelRowPre: g('r-prow', 'r-pre8'), preGrid: g('r-pre8', 'r-pgrid'), gridLegend: g('r-pgrid', 'r-legend'), legendPre: g('r-legend', 'r-pre9'),
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
      rowRow: 0, rowRowText: gap.rowRowText, paragraphText: 8,
      sectionRowRow: 0, sectionRowRowText: gap.sectionRowRowText,
      panelRowPre: 16, preGrid: 16, gridLegend: 16, legendPre: 16,
    });
    // side by side, the text of the next row sits a paragraph gap below (on a
    // phone the note stacks between the two paragraphs)
    if (width === 1440) {
      expect(gap.rowRowText).toBe(gap.paragraphText);
      expect(gap.sectionRowRowText).toBe(gap.paragraphText);
    }
    await page.close();
  });
});

describe('CSS-379: the attribution look is scoped', () => {
  it('a bare cite stays inline; the cite closing a blockquote and .attribution get the look', async () => {
    const page = await open(FIXTURE);
    const r = await page.evaluate(() => {
      const look = (el) => { const cs = getComputedStyle(el); return [cs.display, cs.textAlign, cs.fontSize]; };
      return {
        bare: look(document.getElementById('c-bare')),
        bareStyle: getComputedStyle(document.getElementById('c-bare')).fontStyle,
        chartSource: getComputedStyle(document.querySelector('#sn-chart cite')).display,
        quote: look(document.getElementById('c-quote')),
        cls: look(document.getElementById('c-class')),
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
    for (const k of ['quote', 'cls']) expect(r[k]).toEqual(['block', 'right', '14.4px']);
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
