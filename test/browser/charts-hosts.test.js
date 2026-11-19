// RareCharts on three hosts — bare, Rare Styles v0.7.1 and v0.7.2 (hosts.js)
// — on every surface a chart sits on (RC-014, K-14). The chart tokens live
// on the card: rare-charts.css declares the defaults on .rc-chart, a theme's
// own values are published inline there (core/paint.js), the tooltip
// inherits them. Needs the bundle, which is gitignored:
//   node scripts/build-charts.mjs   (npm run test:browser builds it)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';
import { HOSTS, openHost } from './hosts.js';

const FIXTURE = '/test/browser/fixtures/charts-hosts.html';
const LIGHT = ['page', 'card', 'inverted', 'inverted-card'];
const DARK = ['dark', 'dark-inverted'];
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

// RC-064 (spec §5): the SVG role colours each surface computes to. On a bare
// page and on v0.7.1 only the decided changes show (grid #e4e4e4); v0.7.2's
// --chart-* tokens restate them per surface; darkTheme keeps its own.
const LOOK = {
  bare: { bg: '#ffffff', muted: '#666666', border: '#cccccc', grid: '#e4e4e4', surface: '#f5f5f5', unmatched: '#e8e8e8', mapBorder: '#ffffff' },
  // v0.7.1's --bg-color (#f0f0f0, :root) reaches bg only; the map border reads --chart-bg
  v071: { bg: '#f0f0f0', muted: '#666666', border: '#cccccc', grid: '#e4e4e4', surface: '#f5f5f5', unmatched: '#e8e8e8', mapBorder: '#ffffff' },
};
const SURFACES = {
  bare: { page: LOOK.bare, card: LOOK.bare, inverted: LOOK.bare },
  v071: { page: LOOK.v071, card: LOOK.v071, inverted: LOOK.v071 },
  v072: {
    page:     { bg: '#f0f0f0', muted: '#666666', border: '#cccccc', grid: '#e4e4e4', surface: '#e6e6e6', unmatched: '#e4e4e4', mapBorder: '#f0f0f0' },
    card:     { bg: '#fafafa', muted: '#666666', border: '#cccccc', grid: '#e4e4e4', surface: '#f0f0f0', unmatched: '#e4e4e4', mapBorder: '#fafafa' },
    inverted: { bg: '#333333', muted: '#cccccc', border: '#666666', grid: '#4d4d4d', surface: '#3b3b3b', unmatched: '#4d4d4d', mapBorder: '#333333' },
  },
};
const DARK_LOOK = { bg: '#0a0a0a', muted: '#888888', border: '#888888', grid: '#666666', surface: '#141414', unmatched: '#1e1e2e', mapBorder: '#444455' };

// K-14, RC-061, X-11 (spec §4.9): the HTML chrome each surface computes to.
//   text      title, subtitle, legend label, source, the Graph's breadcrumbs
//             (inherited from the card), a MultiChart cell title
//   note      the note (muted)
//   rest      a timeframe at rest: colour, border
//   hover     hovered: colour, border
//   pressed   the pressed timeframe: colour, background, border
//   log       the Log toggle at rest (a linear axis): colour, background —
//             muted text on no fill (RC-083; it was the Lin/Log diagonal fill)
//   tool      a Graph tool button: border, background, colour
//   panel     the "+N more" panel, drawn like the tooltip: background, colour, border
//   full      the full-screen card's background
const chromeLook = ({ text, muted, ctrl, ctrlBorder, active, activeBg, hoverBorder, bg, toolBorder = ctrlBorder, panel }) => ({
  text, note: muted, rest: [ctrl, ctrlBorder], hover: [active, hoverBorder], pressed: [active, activeBg, hoverBorder],
  log: [muted, 'transparent'], tool: [toolBorder, bg, text], panel, full: bg,
});
const LIGHT_TIP = ['#ffffff', '#000000', '#e4e4e4'];
const BARE_CHROME = chromeLook({
  text: '#000000', muted: '#666666', ctrl: '#666666', ctrlBorder: '#cccccc', active: '#000000', activeBg: '#ffffff',
  hoverBorder: '#000000', bg: '#ffffff', panel: LIGHT_TIP,
});
const CHROME = {
  bare: { page: BARE_CHROME, card: BARE_CHROME, inverted: BARE_CHROME },
  // v0.7.1 has no --chart-* tokens: the controls read its old tokens (its
  // .card-inverted restates two of them), the background its --bg-color,
  // everything else the chart's literals, as in 0.9.8_6
  v071: Object.fromEntries(['page', 'card', 'inverted'].map(s => [s, chromeLook({
    text: '#000000', muted: '#666666', ctrlBorder: '#cccccc', activeBg: '#ffffff', hoverBorder: '#000000',
    bg: '#f0f0f0', panel: LIGHT_TIP,
    ...(s === 'inverted' ? { ctrl: '#cccccc', active: '#f0f0f0' } : { ctrl: '#666666', active: '#000000' }),
  })])),
  v072: {
    page: chromeLook({
      text: '#000000', muted: '#666666', ctrl: '#666666', ctrlBorder: '#cccccc', active: '#000000', activeBg: '#ffffff',
      hoverBorder: '#000000', bg: '#f0f0f0', panel: LIGHT_TIP,
    }),
    card: chromeLook({
      text: '#000000', muted: '#666666', ctrl: '#666666', ctrlBorder: '#cccccc', active: '#000000', activeBg: '#ffffff',
      hoverBorder: '#000000', bg: '#fafafa', panel: LIGHT_TIP,
    }),
    // RC-061's acceptance: a light chart on a dark card reads light; the
    // "+N" panel stays a light popover, as the tooltip does
    inverted: chromeLook({
      text: '#f0f0f0', muted: '#cccccc', ctrl: '#cccccc', ctrlBorder: '#666666', active: '#f0f0f0', activeBg: '#191919',
      hoverBorder: '#f0f0f0', bg: '#333333', panel: LIGHT_TIP,
    }),
  },
};
// darkTheme keeps its own on any host and card: controls derived from its roles
const DARK_CHROME = chromeLook({
  text: '#e8e8e8', muted: '#888888', ctrl: '#888888', ctrlBorder: '#888888', active: '#e8e8e8', activeBg: '#0a0a0a',
  hoverBorder: '#e8e8e8', bg: '#0a0a0a', panel: ['#1a1a1a', '#e8e8e8', '#2e2e2e'],
});

// In the page: a computed colour (rgb(), color(srgb …)) as hex, through a canvas.
const HEX_IN_PAGE = `window.__hex = v => {
  const c = (window.__ctx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }));
  c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = v; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
};`;

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

describe.each(HOSTS)('on %s', host => {
  let page;
  let errors;
  beforeAll(async () => {
    ({ page, errors } = await openHost(browser, origin, FIXTURE, host));
    await page.evaluate(() => document.fonts.ready);
  });
  afterAll(() => page?.close());

  const inlineTokens = id => page.evaluate(sel => [...document.querySelector(sel).style]
    .filter(n => n.startsWith('--rc-')).length, `#${id}`);

  // Hover the plot at 1/4 of its width and read the tooltip's computed look.
  const tooltip = id => page.evaluate(chartId => {
    const overlay = document.querySelector(`#${chartId} rect.rc-overlay`);
    const r = overlay.getBoundingClientRect();
    overlay.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width / 4, clientY: r.top + 20 }));
    const tip = document.querySelector(`#${chartId} .rc-tooltip`);
    const cs = getComputedStyle(tip);
    return {
      visible: tip.classList.contains('is-visible'),
      inline: [...tip.style].filter(n => n.startsWith('--rc-')),
      color: cs.color,
      background: cs.backgroundColor,
      border: cs.borderTopColor,
      shadow: cs.boxShadow,
      header: getComputedStyle(tip.querySelector('.rc-tooltip-header')).color,
    };
  }, id);

  it('loads its stylesheet, and no page error', async () => {
    const loaded = await page.evaluate(() => ({
      link: document.getElementById('rare')?.sheet != null,
      tokens: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-bg').trim() !== '',
    }));
    expect(loaded).toEqual({ link: host !== 'bare', tokens: host === 'v072' });
    expect(errors).toEqual([]);
  });

  it('a chart without a theme publishes nothing; darkTheme publishes its own values on its card', async () => {
    for (const id of LIGHT) expect(await inlineTokens(id), id).toBe(0);
    for (const id of DARK) expect(await inlineTokens(id), id).toBe(21);   // 22 before --rc-control-fill went
    const own = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#dark-inverted'));
      return ['--rc-bg', '--rc-text', '--rc-muted', '--rc-accent', '--rc-tooltip-bg']
        .map(n => cs.getPropertyValue(n).trim());
    });
    expect(own).toEqual(['#0a0a0a', '#e8e8e8', '#888888', '#ff6200', '#1a1a1a']);   // the dark card does not win
  });

  // The tooltip is a light popover on every surface, a dark card included:
  // Rare Styles keeps its --chart-tooltip-* light there.
  it.each(LIGHT)('the default tooltip on %s', async id => {
    expect(await tooltip(id)).toEqual({
      visible: true,
      inline: [],
      color: 'rgb(0, 0, 0)',
      background: 'rgb(255, 255, 255)',
      border: 'rgb(228, 228, 228)',
      // v0.7.2's --chart-tooltip-shadow is a color-mix(): the same black at 10%
      shadow: expect.stringMatching(/^(rgba\(0, 0, 0, 0\.1\)|color\(srgb 0 0 0 \/ 0\.1\)) 0px 2px 8px 0px$/),
      header: 'rgb(102, 102, 102)',
    });
  });

  it.each(DARK)('the darkTheme tooltip on %s', async id => {
    expect(await tooltip(id)).toEqual({
      visible: true,
      inline: [],
      color: 'rgb(232, 232, 232)',
      background: 'rgb(26, 26, 26)',
      border: 'rgb(46, 46, 46)',
      shadow: 'rgba(0, 0, 0, 0.55) 0px 2px 12px 0px',
      header: 'rgb(136, 136, 136)',
    });
  });

  // ─── K-15, RC-082: line heights and the tooltip's type, on every host ───────
  // §7 of the theme spec: the chart's own line heights whatever the host
  // gives an h5, a cite or the body; the tooltip at 14px on a 24px line,
  // opaque, its names in the chart's font and its figures in the numeric one.
  it('K-15: title 24px, source 1.3, the MultiChart cell title 24px', async () => {
    const lh = await page.evaluate(() => {
      const of = sel => getComputedStyle(document.querySelector(sel)).lineHeight;
      return [of('#page .rc-chart-title'), of('#page .rc-chart-source'), of('#c-page-multi .rc-multichart-cell-title')];
    });
    expect(lh[0]).toBe('24px');
    expect(parseFloat(lh[1])).toBeCloseTo(18.2, 1);
    expect(lh[2]).toBe('24px');
  });

  it.each(['page', 'inverted', 'dark'])('RC-082: the tooltip\'s type on %s', async id => {
    await tooltip(id);
    await page.waitForFunction(sel => getComputedStyle(document.querySelector(sel)).opacity === '1', `#${id} .rc-tooltip`);
    const got = await page.evaluate(chartId => {
      const tip = document.querySelector(`#${chartId} .rc-tooltip`);
      const cs = el => getComputedStyle(el);
      return {
        size: cs(tip).fontSize, line: cs(tip).lineHeight,
        header: cs(tip.querySelector('.rc-tooltip-header')).fontSize,
        label: cs(tip.querySelector('.rc-tooltip-label')).fontFamily,
        value: cs(tip.querySelector('.rc-tooltip-value')).fontFamily,
        chart: cs(document.querySelector(`#${chartId}`)).fontFamily,
      };
    }, id);
    expect(got).toMatchObject({ size: '14px', line: '24px', header: '13px' });
    expect(got.label).toBe(got.chart);
    expect(got.label).toMatch(/Fira Sans/);
    expect(got.value).toMatch(/Cousine/);
  });

  // ─── RC-014 step 4: the SVG roles, live and on paper; payloads ─────────────

  // The look of the line chart `line` and the Graph and Map of `surface`
  // (the border is a Graph node's outline: the line chart draws no axis line):
  // each role read where the chart draws it, as the browser computes it.
  const look = (line, surface) => page.evaluate(async ([lineId, s]) => {
    await Promise.all([window.roles[`g-${s}`].whenReady(), window.roles[`m-${s}`].whenReady()]);
    const h = window.__hex;
    const one = (root, sel, prop) => {
      const el = document.querySelector(`#${root}`).querySelector(sel);
      return el ? h(getComputedStyle(el)[prop]) : `none: ${sel}`;
    };
    const bb = [...document.querySelectorAll(`#m-${s} .rc-map-feature`)].find(f => f.__data__.id === 'BB');
    return {
      bg:        one(lineId, '.rc-end-label-bg', 'fill'),
      muted:     one(lineId, '.rc-axis text', 'fill'),
      border:    one(`g-${s}`, '[stroke^="var(--rc-border"]', 'stroke'),     // node outlines
      grid:      one(lineId, '[stroke^="var(--rc-grid"]', 'stroke'),
      surface:   one(`g-${s}`, '[fill^="var(--rc-surface"]', 'fill'),
      unmatched: h(getComputedStyle(bb).fill),
      mapBorder: h(getComputedStyle(bb).stroke),
    };
  }, [line, surface]);

  it.each(['page', 'card', 'inverted'])('the SVG roles on %s (RC-064)', async surface => {
    await page.evaluate(HEX_IN_PAGE);
    expect(await look(surface, surface)).toEqual(SURFACES[host][surface]);
  });

  it('darkTheme keeps its own roles on a .card-inverted', async () => {
    await page.evaluate(HEX_IN_PAGE);
    expect(await look('dark-inverted', 'dark')).toEqual(DARK_LOOK);
  });

  it('every role attribute is a var(--rc-…) reference', async () => {
    const plain = await page.evaluate(() => {
      const ROLE = /^(var\(--rc-|none$|transparent$|url\()/;
      const bad = [];
      for (const sel of ['.rc-end-label-bg', '.rc-axis text', '#roles .rc-map-feature']) {
        document.querySelectorAll(sel).forEach(el => {
          for (const a of ['fill', 'stroke']) {
            const v = el.getAttribute(a);
            if (v && !ROLE.test(v) && !(a === 'fill' && el.__data__?.id === 'AA')) bad.push(`${sel} ${a}=${v}`);
          }
        });
      }
      return bad;
    });
    expect(plain).toEqual([]);
  });

  // The page's tokens change with no render: the browser re-resolves the
  // references; the series (read as hex) follow at the next render.
  it('a page theme switch re-colours the roles with no render; the series at the next setData', async () => {
    const out = await page.evaluate(() => {
      const h = window.__hex;
      const c = window.charts.page;
      let renders = 0;
      const render = c.render;
      c.render = (...a) => { renders++; return render.apply(c, a); };
      const style = document.head.appendChild(document.createElement('style'));
      style.textContent = 'html.rc-live { --chart-label-color: #ff0000; }';
      document.documentElement.classList.add('rc-live');
      const label = h(getComputedStyle(c.container.querySelector('.rc-axis text')).fill);
      const before = renders;
      document.documentElement.style.setProperty('--chart-series-1', '#123456');
      const lineStroke = () => h(getComputedStyle(c.container.querySelector('path.rc-line')).stroke);
      const stale = lineStroke();
      c.setData(days(60));
      const fresh = lineStroke();
      document.documentElement.classList.remove('rc-live');
      document.documentElement.style.removeProperty('--chart-series-1');
      style.remove();
      c.render = render;
      c.render();
      return { label, before, stale, fresh, after: h(getComputedStyle(c.container.querySelector('.rc-axis text')).fill) };
    });
    expect(out.label).toBe('#ff0000');
    expect(out.before).toBe(0);
    expect(out.stale).not.toBe('#123456');
    expect(out.fresh).toBe('#123456');
    expect(out.after).toBe(SURFACES[host].page.muted);
  });

  it('every payload colour is hex, on the page and on a .card-inverted; a Map region lightens on hover', async () => {
    const hovered = await page.evaluate(async () => {
      await Promise.all(Object.values(window.payloadCharts).map(c => c.whenReady?.()));
      const at = (el, type) => {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent(type, { bubbles: type !== 'mouseenter', clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
      };
      const lighter = [];
      for (const where of ['page', 'inverted']) {
        const q = (name, sel) => [...document.querySelectorAll(`#p-${name}-${where} ${sel}`)];
        q('line', 'rect.rc-overlay').forEach(el => at(el, 'mousemove'));
        q('ts', 'rect[pointer-events="all"]').forEach(el => at(el, 'mousemove'));
        q('bar', 'rect.rc-bar').forEach(el => at(el, 'mouseover'));
        q('donut', 'path.rc-donut-slice').forEach(el => at(el, 'mouseover'));
        q('gauge', '.rc-gauge-arc path').forEach(el => at(el, 'mousemove'));
        q('hbar', '.rc-hbar-row').forEach(el => at(el, 'mouseenter'));
        for (const el of q('map', '.rc-map-feature')) {
          const rest = el.getAttribute('fill');
          at(el, 'mouseover');
          if (el.__data__.id === 'AA') lighter.push([rest, el.getAttribute('fill')]);
        }
      }
      return { payloads: window.payloads, lighter };
    });
    const keys = Object.keys(hovered.payloads).sort();
    expect(keys).toEqual(['bar', 'donut', 'gauge', 'hbar', 'line', 'map', 'ts']
      .flatMap(n => [`${n}-inverted`, `${n}-page`]).sort());
    for (const [key, colors] of Object.entries(hovered.payloads)) {
      expect(colors.length, key).toBeGreaterThan(0);
      for (const c of colors) expect(c, key).toMatch(HEX);
    }
    // the remainder and the root: the chart's muted, read where they sit
    const muted = SURFACES[host].inverted.muted;
    expect(hovered.payloads['donut-inverted']).toContain(muted);
    expect(hovered.payloads['hbar-inverted']).toContain(muted);
    expect(hovered.payloads['line-page']).toEqual(expect.arrayContaining(['#1677ff', '#00c97a']));
    expect(hovered.payloads['map-page']).toEqual(['#1677ff', SURFACES[host].page.unmatched]);
    for (const [rest, hover] of hovered.lighter) {
      expect(rest).toBe('#1677ff');
      expect(hover).not.toBe(rest);
    }
    expect(hovered.lighter).toHaveLength(2);
  });

  // ─── K-14, RC-061, X-11 step 5: the HTML chrome in the card's tokens ───────

  // The chrome of c-<where>-{line,graph,multi}, as the browser computes it.
  const chrome = async where => {
    await page.evaluate(HEX_IN_PAGE);
    // the buttons' 0.1s colour transition would be read half way
    await page.addStyleTag({ content: '.rc-range-btn { transition: none !important; }' });
    const hoverBtn = `#c-${where}-line .rc-range-btn[aria-pressed="false"]:not(.rc-scale-btn)`;
    await page.hover(hoverBtn);
    const hover = await page.evaluate(sel => {
      const cs = getComputedStyle(document.querySelector(sel));
      return [window.__hex(cs.color), window.__hex(cs.borderTopColor)];
    }, hoverBtn);
    await page.mouse.move(0, 0);
    const rest = await page.evaluate(async w => {
      const h = window.__hex;
      await window.chrome[w].graph.whenReady?.();
      const at = id => document.querySelector(`#c-${w}-${id}`);
      const [line, graph, multi] = ['line', 'graph', 'multi'].map(at);
      const cs = (el, p) => h(getComputedStyle(el)[p]);
      const btn = line.querySelector('.rc-range-btn[aria-pressed="false"]:not(.rc-scale-btn)');
      const pressed = line.querySelector('.rc-range-btn[aria-pressed="true"]');
      const log = line.querySelector('.rc-scale-btn');
      const clear = el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)';
      const tool = graph.querySelector('.rc-graph-tools .rc-graph-tool');
      const panel = graph.querySelector('.rc-graph-overflow');
      graph.classList.add('rc-graph--fullscreen');
      const full = cs(graph, 'backgroundColor');
      graph.classList.remove('rc-graph--fullscreen');
      const texts = [
        ...['.rc-chart-title', '.rc-chart-subtitle', '.rc-legend-item > span:last-child', '.rc-chart-source'].map(s => line.querySelector(s)),
        graph.querySelector('.rc-graph-breadcrumbs'), multi.querySelector('.rc-multichart-cell-title'),
      ];
      const note = line.querySelector('.rc-chart-note');
      return {
        text: [...new Set(texts.map(el => cs(el, 'color')))].join(' '),
        note: cs(note, 'color'),
        rest: [cs(btn, 'color'), cs(btn, 'borderTopColor')],
        pressed: [cs(pressed, 'color'), cs(pressed, 'backgroundColor'), cs(pressed, 'borderTopColor')],
        log: [cs(log, 'color'), clear(log) ? 'transparent' : cs(log, 'backgroundColor')],
        tool: [cs(tool, 'borderTopColor'), cs(tool, 'backgroundColor'), cs(tool, 'color')],
        panel: [cs(panel, 'backgroundColor'), cs(panel, 'color'), cs(panel, 'borderTopColor')],
        full,
        // nothing of it is written inline (a strict CSP blocks style="")
        inline: [...texts, note].filter(el => el.style.color !== '').length
          + [...graph.querySelectorAll('.rc-graph-tools button')].filter(b => b.hasAttribute('style')).length,
      };
    }, where);
    return { ...rest, hover };
  };

  it.each(['page', 'card', 'inverted'])('the HTML chrome on %s takes the card\'s tokens, none inline', async where => {
    expect(await chrome(where)).toEqual({ ...CHROME[host][where], inline: 0 });
  });

  it('darkTheme\'s chrome on a .card-inverted is its own', async () => {
    expect(await chrome('dark')).toEqual({ ...DARK_CHROME, inline: 0 });
  });

  it('the Graph tool buttons are one class (X-11)', async () => {
    const tools = await page.evaluate(() => [...document.querySelectorAll('#c-page-graph .rc-graph-tools button:not(.rc-graph-note, .rc-graph-hidden-note)')]
      .map(b => b.className));
    expect(tools).toEqual(['rc-graph-tool', 'rc-graph-tool', 'rc-graph-tool', 'rc-graph-tool rc-graph-fullscreen']);
  });

  // RC-061: a control colour reads the page's --chart-control-* first, then
  // the old token 0.9.8_6 read, then the literal; the focus ring the page's
  // --chart-focus-ring (v0.7.2: its --focus-ring-color), else the element's
  // own colour.
  it('the control tokens\' precedence; the focus ring', async () => {
    const out = await page.evaluate(() => {
      const h = window.__hex;
      const wrap = document.getElementById('c-prec-wrap');
      const btn = () => h(getComputedStyle(document.querySelector('#c-prec .rc-range-btn[aria-pressed="false"]')).color);
      const ring = () => getComputedStyle(document.querySelector('#c-prec')).getPropertyValue('--rc-focus-ring').trim().toLowerCase();
      wrap.style.setProperty('--text-color-light', '#ff0000');
      wrap.style.setProperty('--chart-control-text', '#0000ff');
      wrap.style.setProperty('--chart-focus-ring', '#00ff00');
      const both = [btn(), ring()];
      wrap.style.removeProperty('--chart-control-text');
      wrap.style.removeProperty('--chart-focus-ring');
      const old = [btn(), ring()];
      wrap.removeAttribute('style');
      return { both, old, neither: btn() };
    });
    expect(out).toEqual({
      both: ['#0000ff', '#00ff00'],
      // v0.7.2 sets --chart-control-text on :root: the old token below it is not read
      old: host === 'v072' ? ['#666666', '#1677ff'] : ['#ff0000', 'currentcolor'],
      neither: '#666666',
    });
    // a keyboard-focused Graph node draws its ring in the page's focus colour,
    // else the card's text colour
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const node = document.querySelector('#c-inverted-graph .rc-graph-node');
      node.focus();
      return { visible: node.matches(':focus-visible'), color: window.__hex(getComputedStyle(node).outlineColor) };
    });
    expect(focus).toEqual({ visible: true, color: host === 'v072' ? '#1677ff' : CHROME[host].inverted.text });
  });

  it('destroy() leaves no inline --rc-* and no style attribute it made', async () => {
    const after = await page.evaluate(() => {
      const c = window.charts.darkInverted;
      c.destroy();
      return { tokens: [...c.container.style].filter(n => n.startsWith('--rc-')), style: c.container.getAttribute('style') };
    });
    expect(after).toEqual({ tokens: [], style: null });
  });
});

// On paper (RC-064 amendment, spec §5): Rare Styles turns the page and a
// dark card white, a light .card stays #fafafa; the references follow with
// no render; darkTheme keeps its own.
describe('on v072, printed', () => {
  let page;
  beforeAll(async () => {
    ({ page } = await openHost(browser, origin, FIXTURE, 'v072'));
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(HEX_IN_PAGE);
  });
  afterAll(() => page?.close());

  it('plates, labels and node fills take the paper roles; no render runs', async () => {
    await page.evaluate(() => {
      window.__renders = 0;
      for (const c of Object.values(window.charts)) {
        const render = c.render;
        c.render = (...a) => { window.__renders++; return render.apply(c, a); };
      }
    });
    await page.emulateMedia({ media: 'print' });
    const paper = await page.evaluate(() => {
      const h = window.__hex;
      const read = (id, sel, prop) => h(getComputedStyle(document.querySelector(`#${id} ${sel}`))[prop]);
      return {
        page:     [read('page', '.rc-end-label-bg', 'fill'), read('page', '.rc-axis text', 'fill')],
        card:     [read('card', '.rc-end-label-bg', 'fill'), read('card', '.rc-axis text', 'fill')],
        inverted: [read('inverted', '.rc-end-label-bg', 'fill'), read('inverted', '.rc-axis text', 'fill')],
        dark:     [read('dark-inverted', '.rc-end-label-bg', 'fill'), read('dark-inverted', '.rc-axis text', 'fill')],
        renders:  window.__renders,
      };
    });
    await page.emulateMedia({ media: null });
    expect(paper).toEqual({
      page:     ['#ffffff', '#666666'],
      card:     ['#fafafa', '#666666'],
      inverted: ['#ffffff', '#666666'],
      dark:     ['#0a0a0a', '#888888'],
      renders:  0,
    });
  });
});
