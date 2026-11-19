// RareCharts on hostile hosts (X-08, RC-032): every control and text part a
// chart writes in HTML, at rest, hovered, pressed and focused, under
//   hostile  fixtures/hostile.css: a reset, element rules (button, h5, p,
//            cite, h4, dl/dt, a, an inherited line height), element + state
//            and attribute rules (button:hover, input:focus,
//            input[type="date"]) — the generic guards of section H
//   v071     Rare Styles v0.7.1, the host the 2026-11-17 rule keeps
//            supported (no minimum Rare Styles version)
//   v072     Rare Styles v0.7.2
// must look as on the same page with no stylesheet (bare): RareCharts alone.
// A specificity boost in rare-charts.css stays where this file fails
// without it; the reason is written beside each guard.
//
// Needs the RareCharts bundle (`npm run test:browser` builds it first).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.js';
import { openHost } from './hosts.js';

const FIXTURE = '/test/browser/fixtures/charts-hostile.html';

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

async function open(host) {
  const { page, errors } = await openHost(browser, origin, FIXTURE, host, { width: 1280, height: 1200 });
  await page.evaluate(async () => { await window.ready; await document.fonts.ready; });
  await page.waitForTimeout(150);
  return { page, errors };
}

// The look of a control: frame, fill, spacing, shape, pointer and type.
const CONTROL = [
  'display', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-left-radius', 'border-bottom-right-radius', 'background-color', 'background-image', 'box-shadow',
  'text-decoration-line', 'cursor', 'opacity', 'appearance', 'color',
  'font-size', 'font-style', 'font-weight', 'line-height', 'font-family',
];
// The look of a text part: its box, type and fill.
const TEXT = [
  'display', 'margin-top', 'margin-bottom', 'font-size', 'font-style', 'font-weight', 'line-height', 'font-family',
  'background-color',
];
const RING = ['outline-style', 'outline-width', 'outline-offset'];

const line = s => `#line ${s}`;
const graph = s => `#graph ${s}`;
// [selector, properties]; the controls take each forced state
const CONTROLS = {
  legendOn: [line('button.rc-legend-item[aria-pressed="true"]'), CONTROL],
  legendOff: [line('button.rc-legend-item[aria-pressed="false"]'), CONTROL],
  showAll: [line('.rc-legend-reset'), CONTROL],
  range: [line('.rc-range-btn:not(.rc-scale-btn)'), CONTROL],
  scale: [line('.rc-scale-btn'), CONTROL],
  input: [line('.rc-range-input'), [...CONTROL, 'width', 'height']],
  apply: [line('.rc-range-apply'), [...CONTROL, 'height']],
  graphLegend: [graph('.rc-legend-item'), CONTROL],
  crumbs: [graph('.rc-graph-breadcrumbs button'), CONTROL],
  tools: [graph('.rc-graph-tool'), CONTROL],
  note: [graph('.rc-graph-note'), CONTROL],
  hiddenNote: [graph('.rc-graph-hidden-note'), CONTROL],
  overflowItem: [graph('.rc-graph-overflow-item'), CONTROL],
  overflowClose: [graph('.rc-graph-overflow-close'), CONTROL],
};
// read at rest only
const PARTS = {
  title: [line('.rc-chart-title'), TEXT],
  subtitle: [line('.rc-chart-subtitle'), TEXT],
  source: [line('.rc-chart-source'), TEXT],
  sourceLink: [line('.rc-chart-source a'), TEXT],
  note: [line('.rc-chart-note'), TEXT],
  legend: [line('.rc-legend'), TEXT],
  panel: [line('.rc-range-panel'), CONTROL],
  label: [line('.rc-range-label'), CONTROL],
  detailsTitle: [graph('.rc-graph-details h4'), TEXT],
  detailsTerm: [graph('.rc-graph-details dt'), TEXT],
  detailsList: [graph('.rc-graph-details dl'), TEXT],
};

// Only the face of a family: Rare Styles names its own stack for the chart
// font (--chart-font-family, RC-014), Fira Sans first as RareCharts'.
const face = v => v.split(',')[0].replace(/"/g, '').trim();
const read = (page, selector, props) => page.evaluate(([s, ps]) => [...document.querySelectorAll(s)].map((el) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(ps.map(p => [p, cs.getPropertyValue(p)]));
}), [selector, props]).then(rows => rows.map(r => ('font-family' in r ? { ...r, 'font-family': face(r['font-family']) } : r)));

const sessions = new WeakMap();
async function force(page, selector, pseudo) {
  if (!sessions.has(page)) {
    const s = await page.context().newCDPSession(page);
    await s.send('DOM.enable');
    await s.send('CSS.enable');
    sessions.set(page, s);
  }
  const cdp = sessions.get(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  for (const nodeId of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudo ? [pseudo] : [] });
  await page.waitForTimeout(150);   // RareCharts' own 0.1 s transitions end first
  return nodeIds.length;
}

// What a host may change on purpose: the token chain (RC-014, RC-061) —
// Rare Styles restates the chart's colours, which charts-hosts.test.js
// checks surface by surface — and normalize's `-webkit-appearance: button`
// on a <button> (Rare Styles since v0.7.0; with RareCharts' own border and
// fill it draws nothing of its own, as charts-rd-host.test.js notes).
const COLOURS = ['color', 'border-top-color', 'background-color'];
// The custom range's date fields size to their text, and on Rare Styles the
// chart's words are in the page's font (K-15): a host with Fira sets them
// narrower than a bare page without it (126 vs 133 px on the Linux CI, where
// no Fira is installed; equal on a machine that has it). Their width is the
// font's, not a leak, as the legend items' widths are left out for S11.
const FONT_SIZED = /^input(:|$)/;
const allowed = (host, prop, name = '') => host !== 'hostile'
  && (COLOURS.includes(prop) || prop === 'appearance' || (prop === 'width' && FONT_SIZED.test(name)));

// What no guard covered on 2026-11-19 — a host's margin, shadow and
// :active / :focus fill on the range buttons, the Log toggle, the Graph tools
// and the "+N" list, the "+N" close's radius, the notes' focus ring — is
// guarded since (maintainer, 2026-11-19). An entry here,
// `target[:state].property`, would excuse a known gap; there is none.
const KNOWN = { hostile: [], v071: [], v072: [] };
const known = (host, key) => (KNOWN[host] ?? []).some(re => re.test(key));

// The panel's shadow on Rare Styles is its --chart-tooltip-shadow, a
// color-mix(): the same black at 10%, serialised as color(srgb …).
const srgb = v => v.replace(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g,
  (_, r, g, b, a) => `rgba(${[r, g, b].map(c => Math.round(c * 255)).join(', ')}, ${+a})`);

// Every property of every match that differs from the bare page.
function diff(host, name, got, want) {
  const out = [];
  if (got.length !== want.length) return [`${name}: ${got.length} matches, bare ${want.length}`];
  got.forEach((row, i) => Object.keys(row).forEach((p) => {
    const [a, b] = [srgb(row[p]), srgb(want[i][p])];
    if (a !== b && !allowed(host, p, name) && !known(host, `${name}.${p}`)) out.push(`${name}[${i}].${p}: ${a} (bare ${b})`);
  }));
  return out;
}

describe('X-08: RareCharts on hostile hosts looks as it does alone', () => {
  it.each(['bare', 'hostile', 'v071', 'v072'])('the fixture has every target on %s, and no page error', async (host) => {
    const { page, errors } = await open(host);
    const counts = await page.evaluate(([targets]) => Object.fromEntries(
      Object.entries(targets).map(([k, [s]]) => [k, document.querySelectorAll(s).length]),
    ), [{ ...CONTROLS, ...PARTS }]);
    Object.entries(counts).forEach(([k, n]) => expect(n, k).toBeGreaterThan(0));
    expect(counts).toMatchObject({ legendOn: 2, legendOff: 1, showAll: 1, scale: 1, input: 2, apply: 1, label: 2 });
    expect(counts.crumbs).toBeGreaterThanOrEqual(2);
    expect(await page.evaluate(() => !!document.getElementById('host'))).toBe(host !== 'bare');
    expect(errors).toEqual([]);
    await page.close();
  });

  it.each(['hostile', 'v071', 'v072'])('%s: every part at rest', async (host) => {
    const [hosted, bare] = [(await open(host)).page, (await open('bare')).page];
    const out = [];
    for (const [name, [sel, props]] of Object.entries({ ...CONTROLS, ...PARTS })) {
      out.push(...diff(host, name, await read(hosted, sel, props), await read(bare, sel, props)));
    }
    expect(out.join('\n')).toBe('');
    await hosted.close();
    await bare.close();
  });

  it.each([
    ['hostile', 'hover'], ['hostile', 'active'], ['hostile', 'focus'],
    ['v071', 'hover'], ['v071', 'active'],
    ['v072', 'hover'], ['v072', 'active'],
  ])('%s: every control %s', async (host, pseudo) => {
    const [hosted, bare] = [(await open(host)).page, (await open('bare')).page];
    const out = [];
    for (const [name, [sel, props]] of Object.entries(CONTROLS)) {
      expect(await force(hosted, sel, pseudo), name).toBeGreaterThan(0);
      await force(bare, sel, pseudo);
      out.push(...diff(host, `${name}:${pseudo}`, await read(hosted, sel, props), await read(bare, sel, props)));
      await force(hosted, sel, null);
      await force(bare, sel, null);
    }
    expect(out.join('\n')).toBe('');
    await hosted.close();
    await bare.close();
  });

  it.each(['hostile', 'v071', 'v072'])('%s: the keyboard ring is RareCharts\' own, 2px solid', async (host) => {
    const [hosted, bare] = [(await open(host)).page, (await open('bare')).page];
    const out = [];
    for (const [name, [sel]] of Object.entries(CONTROLS)) {
      await force(hosted, sel, 'focus-visible');
      await force(bare, sel, 'focus-visible');
      out.push(...diff(host, `${name}:focus-visible`, await read(hosted, sel, RING), await read(bare, sel, RING)));
    }
    expect(out.join('\n')).toBe('');
    await hosted.close();
    await bare.close();
  });
});
