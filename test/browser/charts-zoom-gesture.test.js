// T-09 in a real engine, on the docs pages that use each zooming class: the
// wheel zooms only with Ctrl or ⌘, a plain wheel scrolls the page; on a phone
// one finger scrolls the page and two fingers pan and pinch the chart. jsdom
// checks the rule itself (test/zoom-gesture.test.js); only a browser scrolls
// a page, and only Chrome's input pipeline decides what a touch does.
//
// Phones: a context with hasTouch and isMobile, the touches sent through the
// DevTools protocol (Input.dispatchTouchEvent), which goes through the same
// path as a finger: touch-action, the compositor's scroll and the
// cancelable flag of touchmove (core/zoomGesture.js says why it matters).
//
// Needs a built site: `npm run test:browser` runs Eleventy first. The pages
// are served from _site; nothing outside this machine resolves (as in
// reference-pages.test.js), and the cookie notice, which stays up offline,
// is taken off so no touch lands on it.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const SITE = resolve('_site');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const OFFLINE = '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1';

let server;
let origin;
let browser;

beforeAll(async () => {
  if (!existsSync(join(SITE, 'index.html'))) throw new Error('No _site/ — run `npm run test:browser` (it builds the site first).');
  server = createServer(async (req, res) => {
    let p = join(SITE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    try {
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(await readFile(p));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: [OFFLINE] });
});
afterAll(async () => { await browser?.close(); server?.close(); });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── The pages ───────────────────────────────────────────────────────────────

// Each zooming class on its page: the card, what its view is, and what is
// drawn once it is ready.
const TS = '#timeseriesChart';
const CHARTS = {
  TimeSeries: { path: '/charts/line/time-series/', card: TS, ready: `${TS} .rc-chart-navigator .selection` },
  Map:        { path: '/charts/map/', card: '#map-europe-visited', ready: '#map-europe-visited .rc-map-feature' },
  MapFlow:    { path: '/charts/map/flow/', card: '#mapflow-zoom', ready: '#mapflow-zoom .rc-map-feature' },
  Graph:      { path: '/charts/graph/', card: '#graph-ego', ready: '#graph-ego .rc-graph-node' },
};

// No docs page has a zoomable MapFlow: one is added beside the first demo,
// with the demo's geometry and its three places.
async function addMapFlow(page) {
  await page.evaluate(async () => {
    const el = document.createElement('div');
    el.id = 'mapflow-zoom';
    document.getElementById('mapflow-triangle').after(el);
    await new RareCharts.MapFlow(el, {
      topoUrl: '/assets/charts/data/maps/world/level-0/world-atlas/countries-110m.json',
      topoObject: 'countries',
      height: 380,
      zoom: true,
      nodes: [
        { id: 'IN', label: 'India', country: '356' },
        { id: 'CN', label: 'China', country: '156' },
        { id: 'LDN', label: 'London', coords: [-0.13, 51.51] },
      ],
      links: [
        { from: 'IN', to: 'CN', value: 3 },
        { from: 'CN', to: 'LDN', value: 2 },
        { from: 'LDN', to: 'IN', value: 2 },
      ],
    }).whenReady();
  });
}

const DESKTOP = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

// Open the class's page in a new context, its card 60px below the top of
// the viewport, with room to scroll on both sides.
async function open(name, contextOptions) {
  const { path, card, ready } = CHARTS[name];
  const ctx = await browser.newContext(contextOptions);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  await page.goto(origin + path);
  if (name === 'MapFlow') await addMapFlow(page);
  await page.waitForSelector(ready, { state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(name === 'Graph' ? 1200 : 300);   // the Graph's entry transition
  await page.evaluate(sel => {
    document.querySelector('.cookie-notice')?.remove();
    const el = document.querySelector(sel);
    scrollTo(0, el.getBoundingClientRect().top + scrollY - 60);
  }, card);
  await sleep(200);
  const cdp = contextOptions.hasTouch ? await ctx.newCDPSession(page) : null;
  return { ctx, page, cdp, errors, card };
}

// What the test reads: the page's scroll, the chart's view, the hint.
// TimeSeries: its navigator's brush (it follows the view); the others: their
// zoom group's transform.
async function state(page, card) {
  return page.evaluate(sel => {
    const c = document.querySelector(sel);
    const brush = c.querySelector('.rc-chart-navigator .selection');
    const zoomed = c.querySelector('.rc-map-zoom, .rc-graph-zoom');
    const hint = c.querySelector('.rc-zoom-hint');
    return {
      scrollY,
      view: brush ? `${brush.getAttribute('x')} ${brush.getAttribute('width')}` : zoomed.getAttribute('transform'),
      hint: hint && hint.classList.contains('is-visible') ? hint.textContent : null,
      tooltip: !!c.querySelector('.rc-tooltip.is-visible'),
    };
  }, card);
}

// A point of the drawing with nothing on it (no node, tie or region), in the
// middle band of the plot: where a finger or the pointer starts.
async function emptyPoint(page, card) {
  return page.evaluate(sel => {
    const c = document.querySelector(sel);
    const svg = c.querySelector('.rc-map-zoom, .rc-graph-zoom')?.ownerSVGElement ?? c.querySelector(':scope > svg');
    const r = svg.getBoundingClientRect();
    for (let fy = 0.4; fy <= 0.6; fy += 0.05) {
      for (let fx = 0.15; fx <= 0.85; fx += 0.05) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const hit = document.elementFromPoint(x, y);
        if (hit && svg.contains(hit) && !hit.closest('.rc-graph-node, .rc-graph-link-hit, .rc-map-feature, .rc-mapflow-node, .rc-mapflow-link-hit')) return [x, y];
      }
    }
    return null;
  }, card);
}

// Touches through the DevTools protocol. Points are viewport px; each move
// is a frame apart, as a finger's are.
const touches = (cdp, type, points) => cdp.send('Input.dispatchTouchEvent', {
  type, touchPoints: points.map(([x, y], id) => ({ x, y, id })),
});
async function drag(cdp, starts, [dx, dy], steps = 10) {
  await touches(cdp, 'touchStart', starts);
  for (let i = 1; i <= steps; i++) {
    await touches(cdp, 'touchMove', starts.map(([x, y]) => [x + dx * i / steps, y + dy * i / steps]));
    await sleep(16);
  }
  await touches(cdp, 'touchEnd', []);
  await sleep(400);
}
async function pinch(cdp, [x, y], from, to, steps = 10) {
  const at = d => [[x - d / 2, y], [x + d / 2, y]];
  await touches(cdp, 'touchStart', at(from));
  for (let i = 1; i <= steps; i++) {
    await touches(cdp, 'touchMove', at(from + (to - from) * i / steps));
    await sleep(16);
  }
  await touches(cdp, 'touchEnd', []);
  await sleep(400);
}
async function tap(cdp, [x, y]) {
  await touches(cdp, 'touchStart', [[x, y]]);
  await sleep(50);
  await touches(cdp, 'touchEnd', []);
}

// ─── The wheel ───────────────────────────────────────────────────────────────

describe.each(Object.keys(CHARTS))('%s: the wheel', name => {
  it('a plain wheel scrolls the page and leaves the view; the hint shows, then fades', async () => {
    const { ctx, page, errors, card } = await open(name, DESKTOP);
    const apple = await page.evaluate(() => /mac|iphone|ipad|ipod|ios/i.test(navigator.userAgentData?.platform || navigator.platform));
    const before = await state(page, card);
    expect(before.hint).toBeNull();
    expect(await page.evaluate(sel => document.querySelector(`${sel} .rc-zoom-hint`), card)).toBeNull();   // made on first need
    // upwards: a chart that took it would zoom in (zooming out stops at
    // the scale's floor, where d3 leaves the wheel to the page anyway)
    expect(before.scrollY).toBeGreaterThan(40);
    await page.mouse.move(...await emptyPoint(page, card));
    await page.mouse.wheel(0, -150);
    await sleep(400);
    const after = await state(page, card);
    expect(after.scrollY).toBeLessThan(before.scrollY - 30);
    expect(after.view).toBe(before.view);
    expect(after.hint).toBe(apple ? 'Hold ⌘ to zoom' : 'Hold Ctrl to zoom');
    await sleep(1500);   // 1.2 s, then the 0.2 s fade
    expect((await state(page, card)).hint).toBeNull();
    expect(await page.evaluate(sel => getComputedStyle(document.querySelector(`${sel} .rc-zoom-hint`)).opacity, card)).toBe('0');
    expect(errors).toEqual([]);
    await ctx.close();
  });

  it.each(['Control', 'Meta'])('%s + wheel zooms; the page stays', async key => {
    const { ctx, page, errors, card } = await open(name, DESKTOP);
    const before = await state(page, card);
    await page.mouse.move(...await emptyPoint(page, card));
    await page.keyboard.down(key);
    await page.mouse.wheel(0, -150);
    await page.keyboard.up(key);
    await sleep(400);
    const after = await state(page, card);
    expect(after.scrollY).toBe(before.scrollY);
    expect(after.view).not.toBe(before.view);
    expect(after.hint).toBeNull();
    expect(errors).toEqual([]);
    await ctx.close();
  });
});

describe('the hint', () => {
  it('centred on the plot, in the tooltip\'s look, takes no pointer, moves nothing, hidden in print', async () => {
    const { ctx, page, card } = await open('TimeSeries', DESKTOP);
    const box = () => page.evaluate(sel => {
      const c = document.querySelector(sel);
      const r = el => el.getBoundingClientRect();
      return { card: r(c).height, svg: r(c.querySelector(':scope > svg')).height };
    }, card);
    const rest = await box();
    // the tooltip first, for its look
    const plot = await page.evaluate(sel => document.querySelector(`${sel} > svg > g > rect[pointer-events="all"]`).getBoundingClientRect().toJSON(), card);
    await page.mouse.move(plot.x + plot.width / 2, plot.y + plot.height / 2);
    await page.mouse.wheel(0, 40);
    await sleep(400);
    const got = await page.evaluate(sel => {
      const c = document.querySelector(sel);
      const hint = c.querySelector('.rc-zoom-hint');
      const plotNow = c.querySelector(':scope > svg > g > rect[pointer-events="all"]').getBoundingClientRect();
      const h = hint.getBoundingClientRect();
      const cs = getComputedStyle(hint), tt = getComputedStyle(c.querySelector('.rc-tooltip'));
      const pick = s => ({ background: s.backgroundColor, border: s.borderTopColor, shadow: s.boxShadow, color: s.color, fontSize: s.fontSize });
      return {
        dx: (h.left + h.width / 2) - (plotNow.left + plotNow.width / 2),
        dy: (h.top + h.height / 2) - (plotNow.top + plotNow.height / 2),
        position: cs.position, pointerEvents: cs.pointerEvents, ariaHidden: hint.getAttribute('aria-hidden'),
        hint: pick(cs), tooltip: pick(tt), fontFamily: cs.fontFamily, cardFont: getComputedStyle(c).fontFamily,
      };
    }, card);
    expect(Math.abs(got.dx)).toBeLessThan(1);
    expect(Math.abs(got.dy)).toBeLessThan(1);
    expect(got.position).toBe('absolute');
    expect(got.pointerEvents).toBe('none');
    expect(got.ariaHidden).toBe('true');
    expect(got.hint).toEqual(got.tooltip);
    expect(got.fontFamily).toBe(got.cardFont);   // a sentence: the chart's text font
    expect(await box()).toEqual(rest);           // no layout shift
    await page.emulateMedia({ media: 'print' });
    expect(await page.evaluate(sel => getComputedStyle(document.querySelector(`${sel} .rc-zoom-hint`)).display, card)).toBe('none');
    await ctx.close();
  });
});

// ─── Phones ──────────────────────────────────────────────────────────────────

describe.each(Object.keys(CHARTS))('%s on a phone', name => {
  it('one finger scrolls the page and leaves the view, with "Use two fingers to move"', async () => {
    const { ctx, page, cdp, errors, card } = await open(name, PHONE);
    expect(await page.evaluate(sel => {
      const c = document.querySelector(sel);
      return getComputedStyle(c.querySelector('.rc-map-zoom, .rc-graph-zoom')?.ownerSVGElement ?? c.querySelector(':scope > svg')).touchAction;
    }, card)).toBe('pan-x pan-y');
    const before = await state(page, card);
    await drag(cdp, [await emptyPoint(page, card)], [0, -100]);
    const after = await state(page, card);
    expect(after.scrollY).toBeGreaterThan(before.scrollY + 50);
    expect(after.view).toBe(before.view);
    expect(after.hint).toBe('Use two fingers to move');
    expect(errors).toEqual([]);
    await ctx.close();
  });

  it('two fingers pan the chart and the page stays', async () => {
    const { ctx, page, cdp, errors, card } = await open(name, PHONE);
    const before = await state(page, card);
    const [x, y] = await emptyPoint(page, card);
    await drag(cdp, [[x - 30, y], [x + 30, y]], [40, 20]);
    const after = await state(page, card);
    expect(after.scrollY).toBe(before.scrollY);
    expect(after.view).not.toBe(before.view);
    expect(after.hint).toBeNull();
    expect(errors).toEqual([]);
    await ctx.close();
  });

  it('a pinch zooms the chart, not the page', async () => {
    const { ctx, page, cdp, card } = await open(name, PHONE);
    const before = await state(page, card);
    await pinch(cdp, await emptyPoint(page, card), 40, 120);
    const after = await state(page, card);
    expect(after.scrollY).toBe(before.scrollY);
    expect(after.view).not.toBe(before.view);
    expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
    await ctx.close();
  });
});

describe('taps and the navigator on a phone', () => {
  it('TimeSeries: a tap shows the crosshair', async () => {
    const { ctx, page, cdp, card } = await open('TimeSeries', PHONE);
    await tap(cdp, await emptyPoint(page, card));
    await sleep(300);
    expect((await state(page, card)).tooltip).toBe(true);
    await ctx.close();
  });

  it('TimeSeries: the navigator\'s brush keeps one-finger dragging', async () => {
    const { ctx, page, cdp, card } = await open('TimeSeries', PHONE);
    const before = await state(page, card);
    const sel = await page.evaluate(s => document.querySelector(`${s} .rc-chart-navigator .selection`).getBoundingClientRect().toJSON(), card);
    await drag(cdp, [[sel.x + sel.width / 2, sel.y + sel.height / 2]], [-50, -5]);
    const after = await state(page, card);
    expect(after.scrollY).toBe(before.scrollY);
    expect(after.view).not.toBe(before.view);
    expect(after.hint).toBeNull();
    await ctx.close();
  });

  it('Map: a tap reaches the region (its click and its tooltip)', async () => {
    const { ctx, page, cdp, card } = await open('Map', PHONE);
    const at = await page.evaluate(sel => {
      const c = document.querySelector(sel);
      window.__clicks = [];
      // the class list may also carry rc-map-feature--clickable (B-06): read the base class
      c.addEventListener('click', e => window.__clicks.push(e.target.classList.contains('rc-map-feature') ? 'rc-map-feature' : e.target.getAttribute('class')), true);
      const svg = c.querySelector('svg').getBoundingClientRect();
      for (const el of c.querySelectorAll('.rc-map-feature')) {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (x > svg.left + 10 && x < svg.right - 10 && y > svg.top + 10 && y < svg.bottom - 10 && el.contains(document.elementFromPoint(x, y))) return [x, y];
      }
      return null;
    }, card);
    await tap(cdp, at);
    await sleep(300);
    expect(await page.evaluate(() => window.__clicks)).toContain('rc-map-feature');
    expect((await state(page, card)).tooltip).toBe(true);
    await ctx.close();
  });

  it('Graph: a tap on a node recenters on it; the zoom buttons still zoom', async () => {
    const { ctx, page, cdp, card } = await open('Graph', PHONE);
    // a recenter adds a step to the breadcrumbs: the current one names the node
    const crumb = () => page.evaluate(sel => {
      const nav = document.querySelector(`${sel} .rc-graph-breadcrumbs`);
      return nav.hidden ? null : nav.querySelector('button:disabled')?.textContent;
    }, card);
    expect(await crumb()).toBeNull();
    // a node other than the focused one (which ignores a click; it alone is
    // filled and stroked in the text colour), fully in view, its label not cut
    const target = await page.evaluate(sel => {
      const c = document.querySelector(sel);
      const svg = c.querySelector('svg').getBoundingClientRect();
      for (const el of c.querySelectorAll('.rc-graph-node')) {
        const circle = el.querySelector('.rc-graph-node-circle');
        const label = el.querySelector('.rc-graph-node-label')?.textContent ?? '';
        const r = circle.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        if (circle.getAttribute('fill') !== circle.getAttribute('stroke') && label && !label.endsWith('…')
          && x > svg.left + 20 && x < svg.right - 20 && y > svg.top + 20 && y < svg.bottom - 20
          && el.contains(document.elementFromPoint(x, y))) return [x, y, label];
      }
      return null;
    }, card);
    await tap(cdp, target);
    await sleep(1500);   // the query and the move to the new layout
    expect(await crumb()).toBe(target[2]);

    const before = (await state(page, card)).view;
    // the ego card is 714px tall since RC-058 (+34): on a 740px phone the
    // tools sit at the viewport's edge — bring the button into view first
    const zoomIn = await page.evaluate(sel => {
      const btn = document.querySelector(`${sel} button[aria-label="Zoom in"]`);
      btn.scrollIntoView({ block: 'center' });
      const b = btn.getBoundingClientRect();
      return [b.left + b.width / 2, b.top + b.height / 2];
    }, card);
    await tap(cdp, zoomIn);
    await sleep(600);
    expect((await state(page, card)).view).not.toBe(before);
    await ctx.close();
  });
});
