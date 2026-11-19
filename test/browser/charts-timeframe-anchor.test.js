// RC-001 in a real engine: with timeframeAnchor 'now' the lit button stays
// lit while the card is resized — the real ResizeObserver, the frame it
// renders in, the fonts settling — because "now" is read at a data or
// selection change and not at a render. jsdom checks the rule itself
// (test/timeframe-anchor.test.js); here, the renders a page really gets.
//
// The clock is the browser's own, fixed by Playwright (page.clock: Date is
// fixed, timers run). A TimeSeries is added to the time series docs page,
// so the bundle and the stylesheet are the site's. Needs a built site:
// `npm run test:browser` runs Eleventy first.
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

describe('TimeSeries, timeframeAnchor \'now\'', () => {
  it('TODAY stays lit across resizes while the clock moves; a click reads the clock again', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e));
    // Wednesday 12 June 2024, 11:21 in the browser's zone
    await page.clock.setFixedTime(new Date(2024, 5, 12, 11, 21));
    await page.goto(origin + '/charts/line/time-series/');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      document.querySelector('.cookie-notice')?.remove();
      const el = document.createElement('div');
      el.id = 'anchor-now';
      document.querySelector('#timeseriesChart').before(el);
      const rows = [];
      for (let t = +new Date(2024, 5, 10); t <= +new Date(2024, 5, 12, 9); t += 36e5) rows.push({ date: new Date(t), value: 10 + (rows.length % 7) });
      window.__anchorChart = new RareCharts.TimeSeries(el, {
        timeframes: ['TODAY', '24H', 'ALL'], timeframeAnchor: 'now', navigator: true,
      }).setData(rows);
    });
    const read = () => page.evaluate(() => ({
      view: window.__anchorChart.getView().map(Number),
      pressed: [...document.querySelectorAll('#anchor-now .rc-range-btn[aria-pressed="true"]')].map(b => b.textContent),
    }));
    const at = (h, m) => +new Date(2024, 5, 12, h, m);

    await page.click('#anchor-now .rc-range-btn[data-timeframe="TODAY"]');
    expect(await read()).toEqual({ view: [+new Date(2024, 5, 12), at(11, 21)], pressed: ['TODAY'] });

    await page.clock.setFixedTime(new Date(2024, 5, 12, 11, 40));
    for (const width of [375, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await sleep(300);                                  // the observer, then the frame it renders in
      expect(await read()).toEqual({ view: [+new Date(2024, 5, 12), at(11, 21)], pressed: ['TODAY'] });
    }

    await page.click('#anchor-now .rc-range-btn[data-timeframe="TODAY"]');
    expect(await read()).toEqual({ view: [+new Date(2024, 5, 12), at(11, 40)], pressed: ['TODAY'] });
    // the axis and the strip run to the moment read
    const ends = await page.evaluate(() => {
      const c = window.__anchorChart;
      return { axis: +c.xScale.domain()[1], full: +c._getDataExtent()[1] };
    });
    expect(ends).toEqual({ axis: at(11, 40), full: at(11, 40) });
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
