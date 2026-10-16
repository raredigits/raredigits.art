// Reference-page matrix (v0.7.0 exit criterion): real pages of the built
// site, in page mode, at 375 / 768 / 769 / 1024 / 1440px, at fractional
// widths, and at 200% zoom (720 / 640 CSS px = 1440 / 1280 windows zoomed).
// Checks: no horizontal page overflow, no keyboard focus hidden under the
// cookie notice or invisible, anchor targets clear of the fixed header.
// Needs a built site: `npm run test:browser` runs Eleventy first.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const SITE = resolve('_site');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

const PAGES = [
  '/', '/styles/', '/styles/getting-started/', '/styles/typography/', '/styles/typography/lists/',
  '/styles/typography/tables/', '/styles/typography/sidenotes/', '/styles/layout/spacing/', '/styles/utilities/',
  '/charts/line/', '/charts/sankey/', '/scripts/carousel/', '/kb/taming-lesspregreater/', '/examples/styles/hetke/landing/',
];
const WIDTHS = [375, 640, 720, 768, 769, 1024, 1440];
const TAB_WIDTHS = [375, 768, 1440];
const ANCHORS = ['/kb/taming-lesspregreater/#solution', '/styles/typography/#main-content', '/charts/dual-axes/#options-reference'];

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
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});
afterAll(async () => { await browser?.close(); server?.close(); });

async function open(path, width, height = 800) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(origin + path);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

describe('no horizontal page overflow', () => {
  it.each(WIDTHS)('at %ipx', async (width) => {
    const bad = [];
    for (const p of PAGES) {
      const page = await open(p, width);
      const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (r.sw > r.cw) bad.push(`${p} ${r.sw}>${r.cw}`);
      await page.close();
    }
    expect(bad).toEqual([]);
  });

  it.each([[768, 1.1], [1023, 1.1]])('at a fractional viewport (window %ipx × %f scale)', async (win, scale) => {
    const b = await chromium.launch({ channel: 'chrome', headless: true, args: [`--force-device-scale-factor=${scale}`, `--window-size=${win},900`] });
    const ctx = await b.newContext({ viewport: null });
    const bad = [];
    for (const p of PAGES) {
      const page = await ctx.newPage();
      await page.goto(origin + p);
      const r = await page.evaluate(() => ({ w: visualViewport.width, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (Number.isInteger(r.w)) bad.push(`${p}: viewport not fractional (${r.w})`);
      if (r.sw > r.cw) bad.push(`${p} ${r.sw}>${r.cw}`);
      await page.close();
    }
    await b.close();
    expect(bad).toEqual([]);
  });
});

describe('every built page fits phone widths (not just the reference set)', () => {
  // The 14 reference pages missed rendered READMEs and the RareCharts
  // changelog (release audit 2026-10-17). 320px is excluded on purpose: single
  // long h1 words are deferred to fluid type, CSS-164.
  const allPages = () => {
    const out = [];
    const walk = (d) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, f.name);
        if (f.isDirectory()) { if (f.name !== 'pagefind' && f.name !== 'old') walk(p); }
        else if (f.name === 'index.html') out.push('/' + p.slice(SITE.length + 1).split('\\').join('/').replace(/index\.html$/, ''));
      }
    };
    walk(SITE);
    return out;
  };

  // ~77 pages per width: one context, one tab, own timeout.
  it.each([375, 414])('at %ipx', async (width) => {
    const pages = allPages();
    expect(pages.length).toBeGreaterThan(60);
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    const bad = [];
    for (const p of pages) {
      await page.goto(origin + p, { waitUntil: 'load' });
      const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (r.sw > r.cw) bad.push(`${p} ${r.sw}>${r.cw}`);
    }
    await ctx.close();
    expect(bad).toEqual([]);
  }, 300000);
});

describe('keyboard focus is visible and not covered (cookie notice shown)', () => {
  it.each(TAB_WIDTHS)('at %ipx', async (width) => {
    const bad = [];
    for (const p of PAGES) {
      const page = await open(p, width, 700);
      const seen = new Set();
      for (let i = 0; i < 90; i++) {
        await page.keyboard.press('Tab');
        const s = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const r = el.getBoundingClientRect();
          const notice = [...document.querySelectorAll('.cookie-notice')].find((n) => getComputedStyle(n).display !== 'none');
          const nr = notice?.getBoundingClientRect();
          // WCAG 2.4.11 (AA): a focused element must not be entirely hidden. Any
          // overlap fails for elements that fit above the notice; a taller one
          // (a long scrollable table) only fails if none of it shows.
          const overlap = !!notice && !notice.contains(el) && r.bottom > nr.top && r.top < nr.bottom && r.right > nr.left && r.left < nr.right;
          const fitsAbove = notice ? r.height <= nr.top - (document.querySelector('header')?.getBoundingClientRect().bottom || 0) : true;
          const visibleTop = Math.max(r.top, 0), visibleBottom = Math.min(r.bottom, innerHeight);
          const entirelyUnder = notice && visibleTop >= nr.top && visibleBottom <= nr.bottom;
          const covered = overlap && (fitsAbove || entirelyUnder);
          let hidden = r.width < 1 || r.height < 1;
          for (let x = el; x; x = x.parentElement) if (getComputedStyle(x).visibility === 'hidden') hidden = true;
          const offscreen = r.bottom < 0 || r.top > innerHeight;
          return { key: `${el.tagName}.${el.className}:${(el.textContent || '').trim().slice(0, 24)}:${Math.round(r.left)}`, covered, hidden, offscreen };
        });
        if (!s || seen.has(s.key)) break;
        seen.add(s.key);
        if (s.covered || s.hidden || s.offscreen) bad.push(`${p} ${s.key} ${s.covered ? 'covered' : s.hidden ? 'hidden' : 'offscreen'}`);
      }
      await page.close();
    }
    expect(bad).toEqual([]);
  });
});

describe('anchor targets clear the fixed header', () => {
  it.each([1440, 375])('at %ipx', async (width) => {
    const bad = [];
    for (const a of ANCHORS) {
      const page = await open(a, width);
      const r = await page.evaluate((id) => {
        const t = document.getElementById(id);
        const target = t.getBoundingClientRect().height ? t : (t.closest('p') || t);
        return { gap: target.getBoundingClientRect().top - document.querySelector('header').getBoundingClientRect().bottom, atEnd: Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1 };
      }, a.split('#')[1]);
      if (r.gap < 0 || (r.gap > 16 && !r.atEnd)) bad.push(`${a} gap=${Math.round(r.gap)}`);
      await page.close();
    }
    expect(bad).toEqual([]);
  });
});
