// The tokens stream of v0.7.2 in a real engine: resolved custom properties,
// contrast on the surfaces, layout and print that jsdom cannot show.
//
//   CSS-380 / CSS-240 / CSS-176  the chart tokens on :root (ungated), their
//            series equal to RareCharts' palette; `--surface-current` on
//            `.card` and `.card-inverted`, `--chart-bg` following it, a panel
//            passing it through; `.card-inverted` re-mapping the border roles
//            and the chart tokens so a chart or a panel divider on it reads,
//            and a `.card` nested in it restoring them; the page surface
//            white on paper; the tooltip size fixed at RareCharts' 13px
//   CSS-184  `.stat`: label over value, tabular numerals, the delta marks
//            and the signal emphasis, inside a `.panel__row`; a figure that
//            never wraps
//   CSS-384  `dl`, `blockquote` and `figure` leave the measure inside data
//            components, keep it in prose, and keep their weight
//   CSS-385  in print every outdent folds back to the column
//
// Headless Google Chrome via playwright-core; reads the working copy's
// `/assets/css/rare.css`.   npm run test:browser
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';

const FIXTURE = '/test/browser/fixtures/tokens.html';

// The series, pinned: `--signal` (#1677ff) first, the main chart colour; then
// RareCharts' palette (`defaultTheme.colors` in assets/charts/src/core/theme.js,
// 0.9.8_6) without its light blue #00aaff — #fa8c16, #00c97a, #ffcc00,
// #cc44ff, #ff0000. Not imported: RareCharts is a separate library, and its
// RC-014 turns theme values into var() chains, which must not turn this suite
// red.
const SERIES = [
  'rgb(22, 119, 255)', 'rgb(250, 140, 22)', 'rgb(0, 201, 122)',
  'rgb(255, 204, 0)', 'rgb(204, 68, 255)', 'rgb(255, 0, 0)',
];

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

async function open(width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(origin + FIXTURE);
  await page.evaluate(() => document.fonts.ready);
  // Colour helpers in the page: resolve a token where it is inherited, parse
  // a computed colour (rgb() or the color(srgb …) of a color-mix), contrast.
  await page.evaluate(() => {
    window.rgb = (c) => {
      const srgb = c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
      if (srgb) return srgb.slice(1, 4).map((v) => Math.round(v * 255));
      return c.match(/[\d.]+/g).slice(0, 3).map(Number);
    };
    window.resolve = (host, token, prop = 'color') => {
      const probe = document.createElement('span');
      probe.style.setProperty(prop, `var(${token})`);
      (typeof host === 'string' ? document.querySelector(host) : host).append(probe);
      const v = getComputedStyle(probe).getPropertyValue(prop);
      probe.remove();
      return v;
    };
    const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    window.contrast = (a, b) => {
      const [x, y] = [lum(window.rgb(a)), lum(window.rgb(b))];
      return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
    };
  });
  return page;
}

describe('CSS-380 / CSS-240 / CSS-176: chart tokens', () => {
  it('six series: --signal first, then RareCharts\' hues in its order', async () => {
    const page = await open();
    const series = await page.evaluate(() => [1, 2, 3, 4, 5, 6, 7].map((n) => window.resolve('#tok-page', `--chart-series-${n}`)));
    expect(series.slice(0, 6)).toEqual(SERIES);
    expect(series[6]).toBe('rgb(0, 0, 0)'); // no 7th: the probe keeps the inherited text colour
    await page.close();
  });

  it('the tooltip size is RareCharts\' 13px, whatever the root font size', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const read = () => window.resolve('#tok-page', '--chart-tooltip-font-size', 'font-size');
      const site = read();
      document.documentElement.style.fontSize = '20px'; // a host with a larger root
      return [site, read()];
    });
    expect(r).toEqual(['13px', '13px']);
    await page.close();
  });

  it('every token resolves on the page, with or without .rd (ungated :root tokens)', async () => {
    const page = await open();
    const read = () => page.evaluate(() => {
      const c = (t) => window.resolve('#tok-page', t);
      return {
        bg: c('--chart-bg'), text: c('--chart-text-color'), label: c('--chart-label-color'),
        axis: c('--chart-axis-color'), grid: c('--chart-grid-color'),
        controlText: c('--chart-control-text'), controlBorder: c('--chart-control-border'),
        hoverBorder: c('--chart-control-hover-border'), activeBg: c('--chart-control-active-bg'),
        activeText: c('--chart-control-active-text'), fill: c('--chart-control-fill'),
        tipBg: c('--chart-tooltip-bg'), tipBorder: c('--chart-tooltip-border'),
        tipText: c('--chart-tooltip-text'), tipMuted: c('--chart-tooltip-muted'),
        tipShadow: window.resolve('#tok-page', '--chart-tooltip-shadow', 'box-shadow'),
        tipSize: window.resolve('#tok-page', '--chart-tooltip-font-size', 'font-size'),
        font: window.resolve('#tok-page', '--chart-font-family', 'font-family'),
        numeric: window.resolve('#tok-page', '--chart-font-family-numeric', 'font-family'),
        focus: c('--chart-focus-ring'), surface: c('--surface-current'),
      };
    });
    const expected = {
      // the page surface and RareCharts' light theme, through the roles
      bg: 'rgb(240, 240, 240)', text: 'rgb(0, 0, 0)', label: 'rgb(102, 102, 102)',
      axis: 'rgb(204, 204, 204)', grid: 'rgb(228, 228, 228)',
      controlText: 'rgb(102, 102, 102)', controlBorder: 'rgb(204, 204, 204)',
      hoverBorder: 'rgb(0, 0, 0)', activeBg: 'rgb(255, 255, 255)', activeText: 'rgb(0, 0, 0)',
      fill: 'rgb(204, 204, 204)',
      tipBg: 'rgb(255, 255, 255)', tipBorder: 'rgb(228, 228, 228)', tipText: 'rgb(0, 0, 0)', tipMuted: 'rgb(102, 102, 102)',
      tipShadow: 'color(srgb 0 0 0 / 0.1) 0px 2px 8px 0px', tipSize: '13px', // black at 10%, 13px: as RareCharts'
      font: '"Fira Sans", sans-serif', numeric: 'Cousine, monospace',
      focus: 'rgb(22, 119, 255)', surface: 'rgb(240, 240, 240)',
    };
    expect(await read()).toEqual(expected);
    await page.evaluate(() => document.documentElement.classList.remove('rd'));
    const ungated = await read();
    // without .rd the page keeps the UA text colour, every token is the same.
    // `--chart-bg` too, although nothing paints the grey page then: a token
    // cannot see the host's background, so an island or a page without .rd
    // sets `--surface-current` itself (/styles/colors/chart-tokens/#host-surface).
    expect(ungated).toEqual(expected);
    await page.close();
  });

  it('a card is a surface: its background is --surface-current, and --chart-bg follows', async () => {
    const page = await open();
    const r = await page.evaluate(() => ({
      card: getComputedStyle(document.getElementById('tok-card')).backgroundColor,
      surface: window.resolve('#tok-card-probe', '--surface-current'),
      bg: window.resolve('#tok-card-probe', '--chart-bg'),
      repainted: getComputedStyle(document.getElementById('tok-card-repaint')).backgroundColor,
      repaintedBg: window.resolve('#tok-card-repaint-probe', '--chart-bg'),
      inverted: getComputedStyle(document.getElementById('tok-inv')).backgroundColor,
      invertedBg: window.resolve('#tok-inv-probe', '--chart-bg'),
    }));
    expect(r).toEqual({
      card: 'rgb(250, 250, 250)', surface: 'rgb(250, 250, 250)', bg: 'rgb(250, 250, 250)',
      repainted: 'rgb(200, 210, 220)', repaintedBg: 'rgb(200, 210, 220)',
      inverted: 'rgb(51, 51, 51)', invertedBg: 'rgb(51, 51, 51)',
    });
    await page.close();
  });

  it('a panel paints no background and passes the surface behind it through', async () => {
    const page = await open();
    const r = await page.evaluate(() => ({
      panel: getComputedStyle(document.getElementById('tok-card-panel')).backgroundColor,
      inCard: window.resolve('#tok-card-panel-probe', '--chart-bg'),
      inInverted: window.resolve('#tok-inv-panel-probe', '--chart-bg'),
      invertedText: window.resolve('#tok-inv-panel-probe', '--chart-text-color'),
    }));
    expect(r).toEqual({
      panel: 'rgba(0, 0, 0, 0)', inCard: 'rgb(250, 250, 250)', inInverted: 'rgb(51, 51, 51)', invertedText: 'rgb(240, 240, 240)',
    });
    await page.close();
  });

  it('on .card-inverted a chart and a panel read: chart roles and border roles re-mapped', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const t = (token) => window.resolve('#tok-inv-probe', token);
      const bg = t('--chart-bg');
      const on = (token) => window.contrast(t(token), bg);
      const pageBg = window.resolve('#tok-page', '--chart-bg');
      const onPage = (token) => window.contrast(window.resolve('#tok-page', token), pageBg);
      const cs = (id) => getComputedStyle(document.getElementById(id));
      return {
        text: on('--chart-text-color'), label: on('--chart-label-color'), controlText: on('--chart-control-text'),
        // the bug RC-014 names: the active timeframe was #f0f0f0 on #fff
        active: window.contrast(t('--chart-control-active-text'), t('--chart-control-active-bg')),
        activeBorder: on('--chart-control-hover-border'),
        fillUnderLabel: window.contrast(t('--chart-control-text'), t('--chart-control-fill')),
        fillOnPage: window.contrast(window.resolve('#tok-page', '--chart-control-text'), window.resolve('#tok-page', '--chart-control-fill')),
        axis: on('--chart-axis-color'), axisOnPage: onPage('--chart-axis-color'),
        grid: on('--chart-grid-color'),
        controlBorder: on('--chart-control-border'),
        tooltipBg: t('--chart-tooltip-bg'),
        frame: window.contrast(cs('tok-inv-panel').borderTopColor, bg),
        divider: window.contrast(cs('tok-inv-panel-header').borderBottomColor, bg),
        footerDivider: cs('tok-inv-panel-footer').borderTopColor === cs('tok-inv-panel-header').borderBottomColor,
        // a card's header line, `.border-bottom`, in the dark card's role
        cardHeader: cs('tok-inv-card-header').borderBottomColor,
        strongLine: window.contrast(t('--border-color-dark'), bg),
        // the same tokens on the page are untouched by the dark card
        pageAxis: window.resolve('#tok-page', '--chart-axis-color'),
      };
    });
    for (const k of ['text', 'label', 'controlText', 'active']) expect(r[k], k).toBeGreaterThanOrEqual(4.5);
    expect(r.activeBorder).toBeGreaterThanOrEqual(3); // the selected control's cue
    expect(r.fillUnderLabel).toBeGreaterThanOrEqual(r.fillOnPage); // the Lin/Log label reads as on the page
    // lines: visible, at least as clear as on the light page, and quiet —
    // nothing glares as the light values did on #333 (7.9:1)
    expect(r.axis).toBeGreaterThanOrEqual(r.axisOnPage);
    expect(r.axis).toBeLessThan(3);
    expect(r.controlBorder).toBe(r.axis);
    expect(r.grid).toBeGreaterThan(1.2);
    expect(r.grid).toBeLessThan(r.axis); // gridlines quieter than the axis
    expect(r.frame).toBe(r.axis);
    expect(r.divider).toBe(r.grid);
    expect(r.divider).toBeGreaterThan(1.2);
    expect(r.divider).toBeLessThan(r.frame);
    expect(r.footerDivider).toBe(true);
    expect(r.cardHeader).toBe('rgb(102, 102, 102)'); // --gray-mid-dark #666; the page's line is #ccc
    expect(r.strongLine).toBeGreaterThanOrEqual(4.5); // was #333 on #333
    expect(r.tooltipBg).toBe('rgb(255, 255, 255)'); // the popover stays light
    expect(r.pageAxis).toBe('rgb(204, 204, 204)');
    await page.close();
  });

  it('a light card inside .card-inverted is a light surface again: its roles and chart tokens are those of a card on the page', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const TOKENS = [
        '--primary-text-color', '--text-color-dark', '--text-color-light', '--text-color-lightest',
        '--link-color', '--link-color-secondary', '--link-color-light',
        '--border-color', '--border-color-light', '--border-color-dark',
        '--chart-bg', '--chart-text-color', '--chart-label-color', '--chart-axis-color', '--chart-grid-color',
        '--chart-control-text', '--chart-control-border', '--chart-control-hover-border',
        '--chart-control-active-bg', '--chart-control-active-text', '--chart-control-fill',
      ];
      const cs = (sel) => getComputedStyle(document.querySelector(sel));
      const read = (card) => ({
        ...Object.fromEntries(TOKENS.map((t) => [t, window.resolve(`${card}-probe`, t)])),
        bg: cs(card).backgroundColor,
        text: cs(`${card}-probe`).color,
        link: cs(`${card}-link`).color,
        frame: cs(`${card}-panel`).borderTopColor,
      });
      const nested = read('#tok-inv-card');
      return {
        nested, onPage: read('#tok-card'),
        textContrast: window.contrast(nested['--chart-text-color'], nested['--chart-bg']),
        labelContrast: window.contrast(nested['--chart-label-color'], nested['--chart-bg']),
        // the dark card around it keeps its own
        outer: { text: window.resolve('#tok-inv-probe', '--chart-text-color'), link: cs('#tok-inv-link').color, border: window.resolve('#tok-inv-probe', '--border-color') },
      };
    });
    expect(r.nested).toEqual(r.onPage);
    expect(r.nested.bg).toBe('rgb(250, 250, 250)');
    expect(r.nested.text).toBe('rgb(0, 0, 0)');
    expect(r.textContrast).toBeGreaterThanOrEqual(4.5);
    expect(r.labelContrast).toBeGreaterThanOrEqual(4.5);
    expect(r.outer).toEqual({ text: 'rgb(240, 240, 240)', link: 'rgb(240, 240, 240)', border: 'rgb(102, 102, 102)' });

    // a project that re-maps a role on :root gets its own value back in the
    // nested light card, not the library default (and the chart token that
    // derives from it follows); the dark card keeps its own
    const remapped = await page.evaluate(() => {
      document.documentElement.style.setProperty('--border-color', 'rgb(1, 2, 3)');
      document.documentElement.style.setProperty('--text-color-light', 'rgb(4, 5, 6)');
      const out = {
        border: window.resolve('#tok-inv-card-probe', '--border-color'),
        axis: window.resolve('#tok-inv-card-probe', '--chart-axis-color'),
        label: window.resolve('#tok-inv-card-probe', '--text-color-light'),
        frame: getComputedStyle(document.querySelector('#tok-inv-card-panel')).borderTopColor,
        outer: window.resolve('#tok-inv-probe', '--border-color'),
      };
      document.documentElement.style.removeProperty('--border-color');
      document.documentElement.style.removeProperty('--text-color-light');
      return out;
    });
    expect(remapped).toEqual({ border: 'rgb(1, 2, 3)', axis: 'rgb(1, 2, 3)', label: 'rgb(4, 5, 6)', frame: 'rgb(1, 2, 3)', outer: 'rgb(102, 102, 102)' });
    await page.close();
  });

  it('on paper a dark card prints as a light one: no light text on the white sheet', async () => {
    const page = await open();
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => {
      const card = document.getElementById('tok-inv');
      const cs = getComputedStyle(card);
      return { bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth };
    });
    expect(r.bg).toBe('rgb(255, 255, 255)');
    expect(r.color).toBe('rgb(0, 0, 0)'); // was #f0f0f0 on white
    expect(r.border).toBe('1px');
    await page.close();
  });

  it('on paper the page surface is white: label plates do not print as grey boxes', async () => {
    const page = await open();
    const screen = await page.evaluate(() => window.resolve('#tok-page', '--chart-bg'));
    await page.emulateMedia({ media: 'print' });
    const paper = await page.evaluate(() => ({
      surface: window.resolve('#tok-page', '--surface-current'),
      bg: window.resolve('#tok-page', '--chart-bg'),
      body: getComputedStyle(document.body).backgroundColor,
      card: window.resolve('#tok-card-probe', '--chart-bg'), // #fafafa on white paper does not show
    }));
    expect(screen).toBe('rgb(240, 240, 240)');
    expect(paper).toEqual({ surface: 'rgb(255, 255, 255)', bg: 'rgb(255, 255, 255)', body: 'rgba(0, 0, 0, 0)', card: 'rgb(250, 250, 250)' });
    await page.close();
  });
});

describe('CSS-184: the stat', () => {
  it.each([1440, 375])('a small muted label over a value with tabular numerals, at %ipx', async (width) => {
    const page = await open(width);
    const r = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id));
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      return {
        display: cs('st-plain').display, direction: cs('st-plain').flexDirection,
        labelAbove: box('st-plain-label').bottom <= box('st-plain-value').top + 0.5,
        labelSize: cs('st-plain-label').fontSize, labelColor: cs('st-plain-label').color,
        valueSize: cs('st-plain-value').fontSize, numerals: cs('st-plain-value').fontVariantNumeric,
        valueColor: cs('st-plain-value').color,
      };
    });
    expect(r).toEqual({
      display: 'flex', direction: 'column', labelAbove: true,
      labelSize: '14.4px', labelColor: 'rgb(102, 102, 102)', // --font-size-sm, --text-color-light
      valueSize: '19.2px', numerals: 'tabular-nums', valueColor: 'rgb(0, 0, 0)',
    });
    await page.close();
  });

  it('a delta: an arrow in the role colour before the figure, the figure in the text colour', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const mark = (id) => {
        const cs = getComputedStyle(document.getElementById(id), '::before');
        return { content: cs.content, color: cs.backgroundColor, mask: cs.maskImage, width: cs.paddingLeft, display: cs.display };
      };
      return {
        up: mark('st-up-value'), down: mark('st-down-value'), remap: mark('st-remap-value'), plain: mark('st-plain-value'),
        upText: getComputedStyle(document.getElementById('st-up-value')).color,
        downText: getComputedStyle(document.getElementById('st-down-value')).color,
      };
    });
    // an inline box 1em wide, not an inline-block a line could break after
    expect(r.up).toMatchObject({ content: '""', color: 'rgb(56, 158, 13)', display: 'inline', width: '19.2px' });
    expect(r.up.mask).toMatch(/arrow_drop_up-400\.svg/);
    expect(r.down).toMatchObject({ content: '""', color: 'rgb(255, 0, 0)' });
    expect(r.down.mask).toMatch(/arrow_drop_down-400\.svg/);
    expect(r.remap.color).toBe('rgb(255, 0, 0)'); // a rise that is bad news
    expect(r.plain.content).toBe('none');
    expect(r.upText).toBe('rgb(0, 0, 0)');
    expect(r.downText).toBe('rgb(0, 0, 0)');
    await page.close();
  });

  it('emphasis: the value in --signal, bold, large text that meets 3:1 on the page and the dark card', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const v = (sel) => getComputedStyle(document.querySelector(sel));
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const invBg = getComputedStyle(document.getElementById('tok-inv')).backgroundColor;
      return {
        color: v('#st-signal-value').color, weight: v('#st-signal-value').fontWeight, size: parseFloat(v('#st-signal-value').fontSize),
        onPage: window.contrast(v('#st-signal-value').color, bodyBg),
        onInverted: window.contrast(v('#st-inv-signal .stat__value').color, invBg),
      };
    });
    expect(r.color).toBe('rgb(22, 119, 255)');
    expect(r.weight).toBe('700');
    expect(r.size).toBeGreaterThanOrEqual(18.66); // 14pt bold: large text
    expect(r.onPage).toBeGreaterThanOrEqual(3);
    expect(r.onInverted).toBeGreaterThanOrEqual(3);
    await page.close();
  });

  it.each([1440, 375])('stats as the cells of a panel row, and inside one, at %ipx', async (width) => {
    const page = await open(width);
    const r = await page.evaluate(() => {
      const row = document.getElementById('st-row');
      const cells = [...row.children];
      const boxes = cells.map((c) => c.getBoundingClientRect());
      // the text, and a delta's arrow before it, centred as one in the cell
      const centred = (el) => {
        const cell = el.closest('.panel__row-item').getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const before = getComputedStyle(el, '::before');
        const mark = before.content === 'none' ? 0 : parseFloat(before.paddingLeft);
        return Math.abs((t.left - mark + t.right) / 2 - (cell.left + cell.right) / 2) < 1.5;
      };
      return {
        oneLine: boxes.every((b) => Math.abs(b.top - boxes[0].top) < 0.5),
        overflowingCells: cells.filter((c) => c.scrollWidth > c.clientWidth + 0.5).length,
        rowScrolls: row.scrollWidth > row.clientWidth + 0.5,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        centred: [...row.querySelectorAll('.stat__label, .stat__value')].every(centred),
        // every figure on one line, a delta's arrow included (the cells are
        // as narrow as their content when the row scrolls)
        oneLineValues: [...row.querySelectorAll('.stat__value')].every((v) => {
          const cs = getComputedStyle(v);
          return v.getBoundingClientRect().height < parseFloat(cs.lineHeight) * 1.5;
        }),
        nestedAbove: document.getElementById('st-nested-label').getBoundingClientRect().bottom <= document.getElementById('st-nested-value').getBoundingClientRect().top + 0.5,
        // a label that wraps does not push its figure off the row's line
        pair: (() => {
          const [a, b] = [...document.querySelectorAll('#st-pair .stat__label')].map((l) => l.getBoundingClientRect().height);
          const [va, vb] = [...document.querySelectorAll('#st-pair .stat__value')].map((v) => v.getBoundingClientRect().top);
          return { labelsDiffer: Math.abs(a - b) > 1, valuesAligned: Math.abs(va - vb) < 0.5 };
        })(),
      };
    });
    expect(r.pair.valuesAligned).toBe(true);
    if (width === 375) expect(r.pair.labelsDiffer).toBe(true); // the case is real at this width
    expect(r.oneLine).toBe(true);
    expect(r.overflowingCells).toBe(0);
    expect(r.pageOverflow).toBe(false);
    expect(r.centred).toBe(true);
    expect(r.oneLineValues).toBe(true);
    expect(r.nestedAbove).toBe(true);
    // six figures do not fit 375px: the row scrolls inside its own border
    if (width === 375) expect(r.rowScrolls).toBe(true);
    else expect(r.rowScrolls).toBe(false);
    await page.close();
  });

  it.each([1440, 375])('a figure never wraps: not between digits in a box narrower than it, not at a space, at %ipx', async (width) => {
    const page = await open(width);
    const r = await page.evaluate(() => {
      const lines = (v) => Math.round(v.getBoundingClientRect().height / parseFloat(getComputedStyle(v).lineHeight));
      const row = document.getElementById('st-spaced');
      return {
        narrow: ['st-narrow', 'st-narrower'].map((id) => [id, lines(document.querySelector(`#${id} .stat__value`))]),
        spaced: [...row.querySelectorAll('.stat__value')].map((v) => [v.textContent, lines(v)]),
        rowScrolls: row.scrollWidth > row.clientWidth + 0.5,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(r.narrow).toEqual([['st-narrow', 1], ['st-narrower', 1]]);
    expect(r.spaced).toEqual(r.spaced.map(([text]) => [text, 1]));
    expect(r.pageOverflow).toBe(false);
    if (width === 375) expect(r.rowScrolls).toBe(true); // the row scrolls instead
    await page.close();
  });
});

describe('CSS-384: dl, blockquote and figure leave the measure inside data components', () => {
  it.each([1440, 900])('prose keeps the measure, a panel, a chart, a table or a stat does not, at %ipx', async (width) => {
    const page = await open(width);
    const r = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.width = 'var(--text-content-width)';
      document.querySelector('article').append(probe);
      const measure = probe.getBoundingClientRect().width;
      const maxW = (id) => getComputedStyle(document.getElementById(id)).maxWidth;
      const w = (id) => document.getElementById(id).getBoundingClientRect().width;
      return {
        measure,
        article: document.querySelector('article').getBoundingClientRect().width,
        prose: ['ms-dl', 'ms-bq', 'ms-fig'].map((id) => [id, Math.abs(parseFloat(maxW(id)) - measure) < 1]),
        // free of the measure (a quote in a panel is also reset by the
        // panel's outdent containment, to 100%); its width is then its own
        // box's, which on a tablet (the measure is 8 of the article's 9
        // columns) can be the narrower one
        free: ['ms-panel-dl', 'ms-panel-bq', 'ms-panel-fig', 'ms-chart-dl', 'ms-chart-fig', 'ms-scroll-dl', 'ms-bordered-bq', 'ms-stat-fig']
          .map((id) => [id, ['none', '100%'].includes(maxW(id))]),
      };
    });
    expect(r.article).toBeGreaterThan(r.measure + 20);
    expect(r.prose).toEqual(r.prose.map(([id]) => [id, true]));
    expect(r.free).toEqual(r.free.map(([id]) => [id, true]));
    await page.close();
  });

  it('the exclusion adds no weight: an equal-weight rule after the library still wins', async () => {
    const page = await open();
    const r = await page.evaluate(() => {
      const s = document.createElement('style');
      s.textContent = 'dl { max-width: 123px } blockquote { max-width: 124px } article figure { max-width: 125px } .figure { max-width: 126px }';
      document.head.append(s);
      const f = document.createElement('figure'); f.className = 'figure'; f.id = 'ms-class-fig';
      document.querySelector('article').append(f);
      const m = (id) => getComputedStyle(document.getElementById(id)).maxWidth;
      return [m('ms-dl'), m('ms-bq'), m('ms-fig'), m('ms-class-fig')];
    });
    expect(r).toEqual(['123px', '124px', '125px', '126px']);
    await page.close();
  });
});

describe('CSS-385: in print every outdent folds back to the column', () => {
  it.each([1440, 375])('no block hangs left or right of the paper column at %ipx', async (width) => {
    const page = await open(width);
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => {
      const col = document.querySelector('article').getBoundingClientRect();
      return ['pr-card-caption', 'pr-full-width-caption', 'pr-teaser', 'pr-collapsible', 'pr-text-content-caption', 'pr-pre']
        .map((id) => {
          const b = document.getElementById(id).getBoundingClientRect();
          return [id, Math.round(b.left - col.left), Math.round(col.right - b.right)];
        })
        .filter(([, left, right]) => left < 0 || right < 0);
    });
    expect(r).toEqual([]);
    await page.close();
  });
});
