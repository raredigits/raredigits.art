// core/paint.js — how a theme reaches the page (RC-014, K-14, RC-013).
//   ownColors     a theme's own colour paths: set and not the default
//   publishTheme  own values inline on the card as --rc-*, the derived rows,
//                 the tooltip's null / '' rule (B-03); destroy() restores
//   paintOf       the object charts draw with, marked PAINT: role colours
//                 as var(--rc-…) references, accent and colors as hex
//   readDataColors  the accent and the series read at the card, in place
//   toHex, hex()  colours that leave the chart
// What leaves the chart (payloads, tooltip HTML): paint-boundaries.test.js.
// The look in an engine, on three hosts: test/browser/charts-hosts.test.js.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { defaultTheme, darkTheme, createTheme } from '../assets/charts/src/core/theme.js';
import {
  PAINT, ownColors, publishTheme, restoreStyle, paintOf, readDataColors, makeHex, hexOf, toHex, chainLiteral,
} from '../assets/charts/src/core/paint.js';
import { Chart } from '../assets/charts/src/core/Chart.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track } from './helpers.js';

class Blank extends Chart { render() {} }

const DAY = 864e5;
const days = n => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2025, 0, 1) + i * DAY), value: 10 + i }));
const inline = el => [...el.style].filter(n => n.startsWith('--rc-')).sort();

afterEach(() => vi.restoreAllMocks());

describe('ownColors: a key is own when set and not the default', () => {
  it('the default theme owns nothing; createTheme({}) neither', () => {
    expect(ownColors(defaultTheme)).toEqual([]);
    expect(ownColors(createTheme({}))).toEqual([]);
  });

  it('darkTheme owns its roles, accent, tooltip and map colours — not the inherited ones', () => {
    expect(ownColors(darkTheme)).toEqual([
      'bg', 'surface', 'grid', 'border', 'crosshair', 'text', 'muted', 'accent',
      'tooltip.bg', 'tooltip.border', 'tooltip.text', 'tooltip.muted', 'tooltip.shadow',
      'map.unmatchedFill', 'map.border', 'map.graticule',
    ]);
  });

  it('createTheme({ accent }), { ...defaultTheme, accent } and { ...darkTheme, x }', () => {
    expect(ownColors(createTheme({ accent: 'red' }))).toEqual(['accent']);
    expect(ownColors({ ...defaultTheme, accent: 'red' })).toEqual(['accent']);
    expect(ownColors({ ...darkTheme, text: '#ffffff' })).toEqual(ownColors(darkTheme));
    expect(ownColors({ ...darkTheme, bg: defaultTheme.bg })).not.toContain('bg');
  });

  it('a value equal to the default is not own; any other is, a page chain too', () => {
    expect(ownColors(createTheme({ text: defaultTheme.text }))).toEqual([]);
    expect(ownColors(createTheme({ text: '#010101' }))).toEqual(['text']);
    // the default is the page's chain: the literal is the theme's own word
    // (RC-014 rule 1), so it stays black on a dark card
    expect(ownColors(createTheme({ text: '#000000' }))).toEqual(['text']);
    expect(ownColors(createTheme({ colors: defaultTheme.colors.map(chainLiteral) }))).toEqual(['colors']);
    expect(ownColors(createTheme({ accent: 'var(--brand, #c00)' }))).toEqual(['accent']);
  });

  it('colors counts as a whole array', () => {
    expect(ownColors(createTheme({ colors: [...defaultTheme.colors] }))).toEqual([]);
    expect(ownColors(createTheme({ colors: ['#111111'] }))).toEqual(['colors']);
  });

  it('a tooltip key that is null or \'\' is not own; header colours are when set', () => {
    expect(ownColors(createTheme({ tooltip: { text: null, bg: '' } }))).toEqual([]);
    expect(ownColors(createTheme({ tooltip: { header: { text: '#123456', bg: '' } } }))).toEqual(['tooltip.header.text']);
  });
});

describe('publishTheme: own values inline on the card', () => {
  const publish = theme => {
    const el = document.createElement('div');
    return { el, names: publishTheme(el, createTheme(theme)) };
  };

  it('a default theme writes nothing', () => {
    const { el, names } = publish({});
    expect(names).toEqual([]);
    expect(el.getAttribute('style')).toBeNull();
  });

  it('darkTheme: its own values, the controls and the map derived from its roles', () => {
    const el = document.createElement('div');
    const names = publishTheme(el, darkTheme);
    expect(names).toHaveLength(21);   // 22 before --rc-control-fill went (RC-083)
    expect(inline(el)).toEqual([...names].sort());
    const v = n => el.style.getPropertyValue(n);
    expect([v('--rc-bg'), v('--rc-text'), v('--rc-muted'), v('--rc-accent')]).toEqual(['#0a0a0a', '#e8e8e8', '#888888', '#ff6200']);
    expect(v('--rc-surface')).toBe('#141414');                                 // own, not derived
    expect(v('--rc-control-text')).toBe('var(--rc-muted)');
    expect(v('--rc-control-border')).toBe('var(--rc-border)');
    expect(v('--rc-control-hover-border')).toBe('var(--rc-text)');
    expect(v('--rc-control-active-text')).toBe('var(--rc-text)');
    expect(v('--rc-control-active-bg')).toBe('var(--rc-bg)');
    expect(v('--rc-control-fill')).toBe('');                                   // gone with the Lin/Log fill (RC-083)
    expect(v('--rc-map-unmatched-fill')).toBe('#1e1e2e');                      // own map keys win
    expect(v('--rc-tooltip-bg')).toBe('#1a1a1a');
    expect(v('--rc-tooltip-shadow')).toBe('0 2px 12px rgba(0,0,0,0.55)');
    expect(names).not.toContain('--rc-map-match-fill');
  });

  it('the controls follow an own background only; text alone derives the surface and graticule', () => {
    const text = publish({ text: '#123456' });
    expect(text.names.sort()).toEqual(['--rc-map-graticule', '--rc-surface', '--rc-text']);
    expect(text.el.style.getPropertyValue('--rc-surface')).toBe('color-mix(in srgb, var(--rc-bg) 96%, var(--rc-text))');
    expect(text.el.style.getPropertyValue('--rc-map-graticule')).toBe('color-mix(in srgb, var(--rc-text) 8%, transparent)');

    const bg = publish({ bg: '#101010' });
    expect(bg.names).toEqual([
      '--rc-bg', '--rc-surface',
      '--rc-control-text', '--rc-control-border', '--rc-control-hover-border',
      '--rc-control-active-text', '--rc-control-active-bg',
      '--rc-map-border',
    ]);
    expect(bg.el.style.getPropertyValue('--rc-map-border')).toBe('var(--rc-bg)');

    const grid = publish({ grid: '#333333' });
    expect(grid.names).toEqual(['--rc-grid', '--rc-map-unmatched-fill']);
    expect(grid.el.style.getPropertyValue('--rc-map-unmatched-fill')).toBe('var(--rc-grid)');
  });

  it('tooltip null takes the chart\'s role (shadow: none); \'\' leaves the CSS fallback (B-03)', () => {
    const { el, names } = publish({ tooltip: { text: null, muted: null, bg: null, border: null, shadow: null } });
    const v = n => el.style.getPropertyValue(n);
    expect([v('--rc-tooltip-text'), v('--rc-tooltip-muted'), v('--rc-tooltip-bg'), v('--rc-tooltip-border'), v('--rc-tooltip-shadow')])
      .toEqual(['var(--rc-text)', 'var(--rc-muted)', 'var(--rc-bg)', 'var(--rc-border)', 'none']);
    expect(names).toHaveLength(5);
    expect(publish({ tooltip: { bg: '', shadow: '' } }).names).toEqual([]);
  });

  // K-15: `font` sets the tooltip's words, `numericFont` its figures (.rc-num).
  it('the tooltip fonts: an own font for the words, an own numericFont for the figures', () => {
    const own = publish({ font: 'serif', numericFont: 'monospace' });
    expect(own.el.style.getPropertyValue('--rc-tooltip-font')).toBe('serif');
    expect(own.el.style.getPropertyValue('--rc-tooltip-font-numeric')).toBe('monospace');
    expect(publish({ numericFont: 'monospace' }).names).toEqual(['--rc-tooltip-font-numeric']);
    expect(publish({ font: 'serif' }).names).toEqual(['--rc-tooltip-font']);
    expect(publish({ numericFont: null }).names).toEqual([]);                 // unset: the CSS stacks
    expect(publish({ font: defaultTheme.font, numericFont: defaultTheme.numericFont }).names).toEqual([]);
  });

  it('saves the page\'s inline values first; restoreStyle puts them back and drops an empty style', () => {
    const el = document.createElement('div');
    el.style.setProperty('--rc-text', 'red', 'important');
    const saved = {};
    publishTheme(el, createTheme({ text: '#123456', accent: '#ff0000' }), saved);
    expect(el.style.getPropertyValue('--rc-text')).toBe('#123456');
    restoreStyle(el, saved);
    expect(el.style.getPropertyValue('--rc-text')).toBe('red');
    expect(el.style.getPropertyPriority('--rc-text')).toBe('important');
    expect(inline(el)).toEqual(['--rc-text']);

    const bare = document.createElement('div');
    const s2 = {};
    publishTheme(bare, darkTheme, s2);
    restoreStyle(bare, s2);
    expect(bare.hasAttribute('style')).toBe(false);
  });
});

describe('Chart: publishes at construction, destroy() restores', () => {
  it('a chart with no theme publishes nothing', () => {
    const c = track(new Line(mount(null), { animate: false }));
    expect(inline(c.container)).toEqual([]);
  });

  it('a darkTheme chart publishes on its card; destroy() leaves no --rc-* and drops the empty style', () => {
    const c = new Blank(mount(null), { theme: darkTheme });
    expect(inline(c.container)).toHaveLength(21);
    expect(c.container.style.getPropertyValue('--rc-bg')).toBe('#0a0a0a');
    c.destroy();
    expect(inline(c.container)).toEqual([]);
    expect(c.container.hasAttribute('style')).toBe(false);
  });

  it('a page\'s own inline --rc-text comes back after destroy()', () => {
    const el = mount(null);
    el.style.setProperty('--rc-text', 'red');
    const c = new Blank(el, { theme: { text: '#123456' } });
    expect(el.style.getPropertyValue('--rc-text')).toBe('#123456');
    c.destroy();
    expect(el.style.getPropertyValue('--rc-text')).toBe('red');
    expect(inline(el)).toEqual(['--rc-text']);
  });

  it('chart.theme is the paint object, marked PAINT; _theme is the spec', () => {
    const c = track(new Blank(mount(null), { theme: { accent: '#ff0000', tooltip: { bg: '#123456' } } }));
    expect(c.theme[PAINT]).toBe(true);
    expect(c._theme[PAINT]).toBeUndefined();
    expect(c._theme).toEqual(createTheme({ accent: '#ff0000', tooltip: { bg: '#123456' } }));
    expect(c.theme).toEqual(readDataColors(c.container, c._theme, paintOf(c._theme, { hex: c._hex })));
    expect(Object.keys(c.theme)).toEqual(Object.keys(c._theme));
    expect(hexOf(c.theme)).toBe(c._hex);
  });

  // RC-014: the data colours are hex from the constructor on (a legend or a
  // subclass may build with them before the first render), and again at
  // every render — a page that changed its --chart-series-* sees it there.
  it('the accent and the series are read at construction and at every render', () => {
    const root = document.documentElement;
    root.style.setProperty('--chart-series-1', '#123456');
    try {
      const c = track(new Blank(mount(null)));
      expect(c.theme.accent).toBe('#123456');
      expect(c.theme.colors).toEqual(['#123456', '#fa8c16', '#00c97a', '#ffcc00', '#cc44ff', '#ff0000']);
      const colors = c.theme.colors;
      root.style.setProperty('--chart-series-1', '#654321');
      expect(c.theme.accent).toBe('#123456');               // no render yet
      c.render();
      expect(c.theme.accent).toBe('#654321');
      expect(c.theme.colors).toBe(colors);                  // in place: closures stay current
      expect(colors[0]).toBe('#654321');
    } finally {
      root.style.removeProperty('--chart-series-1');
    }
  });

  // Line gives each series its colour as it takes the data: setData reads first.
  it('setData reads the colours before the class takes the data', () => {
    const root = document.documentElement;
    const c = track(new Line(mount(null), { animate: false })).setData(days(5));
    const stroke = () => c.container.querySelector('path.rc-line').getAttribute('stroke');
    expect(stroke()).toBe('#1677ff');
    root.style.setProperty('--chart-series-1', '#123456');
    try {
      c.setData(days(5));
      expect(stroke()).toBe('#123456');
    } finally {
      root.style.removeProperty('--chart-series-1');
    }
  });

  it('darkTheme keeps its accent; the series follow the palette', () => {
    const c = track(new Blank(mount(null), { theme: darkTheme }));
    expect(c.theme.accent).toBe('#ff6200');
    expect(c.theme.colors[0]).toBe('#1677ff');
    expect(c.theme.bg).toBe('var(--rc-bg, #0a0a0a)');
  });

  it('a destroyed chart reads nothing at render', () => {
    const c = new Blank(mount(null));
    const spy = vi.spyOn(c, '_readDataColors');
    c.destroy();
    c.render();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Overview (RC-013)', () => {
  const strips = [];
  afterEach(() => { strips.splice(0).forEach(s => s.destroy()); });

  it('under a chart it keeps the chart\'s theme object, by reference', () => {
    const c = track(new Line(mount(null, { width: 600, height: 300 }), { animate: false, navigator: true }));
    c.setData(days(30));
    expect(c._navigator).toBeTruthy();
    expect(c._navigator.theme).toBe(c.theme);
    expect(c._navigatorEl.classList.contains('rc-overview')).toBe(false);
    expect(inline(c._navigatorEl)).toEqual([]);
  });

  it('standalone it merges like a chart, is an .rc-overview and publishes its own values; destroy() takes both away', () => {
    const el = mount(null, { width: 400 });
    el.style.setProperty('--rc-accent', 'green');
    const ov = new Overview(el, { theme: { accent: '#ff0000', tooltip: { bg: '#123456' } } });
    expect(ov.theme[PAINT]).toBe(true);
    expect(ov.theme.tooltip.text).toBe(defaultTheme.tooltip.text);           // deep merge, as createTheme
    expect(el.classList.contains('rc-overview')).toBe(true);
    expect(el.style.getPropertyValue('--rc-accent')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--rc-tooltip-bg')).toBe('#123456');
    ov.destroy();
    expect(el.hasAttribute('class')).toBe(false);
    expect(el.style.getPropertyValue('--rc-accent')).toBe('green');
    expect(el.style.getPropertyValue('--rc-tooltip-bg')).toBe('');
  });

  it('a standalone strip without a theme publishes nothing', () => {
    const el = mount(null, { width: 400 });
    const ov = new Overview(el);
    strips.push(ov);
    expect(el.classList.contains('rc-overview')).toBe(true);
    expect(inline(el)).toEqual([]);
  });
});

describe('paintOf', () => {
  it('carries PAINT (not enumerable) and the spec\'s shape', () => {
    const spec = createTheme({ accent: '#ff0000' });
    const p = paintOf(spec);
    expect(p).not.toBe(spec);
    expect(p[PAINT]).toBe(true);
    expect(Object.keys(p)).toEqual(Object.keys(spec));
    expect(p.accent).toBe('#ff0000');
  });

  it('role keys are references to the card\'s tokens, with the default\'s literal', () => {
    const p = paintOf(defaultTheme);
    expect([p.bg, p.surface, p.grid, p.border, p.crosshair, p.text, p.muted]).toEqual([
      'var(--rc-bg, #ffffff)', 'var(--rc-surface, #f5f5f5)', 'var(--rc-grid, #e4e4e4)', 'var(--rc-border, #cccccc)',
      'var(--rc-crosshair, #aaaaaa)', 'var(--rc-text, #000000)', 'var(--rc-muted, #666666)',
    ]);
    expect(p.map).toEqual({
      matchFill: null, unmatchedFill: 'var(--rc-map-unmatched-fill, #e8e8e8)', ocean: 'transparent',
      border: 'var(--rc-map-border, #ffffff)', hoverBrighten: 1.3, graticule: 'var(--rc-map-graticule, rgba(0,0,0,0.08))',
    });
    // the rest is the spec's: sizes, fonts, the tooltip
    expect(p.tooltip).toBe(defaultTheme.tooltip);
    expect([p.font, p.strokeWidth]).toEqual([defaultTheme.font, defaultTheme.strokeWidth]);
  });

  it('an own value is the reference\'s literal; an own matchFill stays, colors is a copy', () => {
    const spec = createTheme({ text: '#123456', map: { matchFill: '#abcdef', border: '#111111' } });
    const p = paintOf(spec);
    expect(p.text).toBe('var(--rc-text, #123456)');
    expect(p.map.border).toBe('var(--rc-map-border, #111111)');
    expect(p.map.matchFill).toBe('#abcdef');
    expect(p.colors).toEqual(spec.colors);
    expect(p.colors).not.toBe(spec.colors);
    expect(paintOf(darkTheme).surface).toBe('var(--rc-surface, #141414)');
  });
});

describe('readDataColors', () => {
  it('writes hex in place: the default chains read at the card, own values through hex()', () => {
    const el = mount(null);
    const spec = createTheme({});
    const p = paintOf(spec);
    const colors = p.colors;
    el.style.setProperty('--chart-series-2', '#222222');
    readDataColors(el, spec, p);
    expect(p.accent).toBe('#1677ff');
    expect(p.colors).toBe(colors);
    expect(colors.slice(0, 2)).toEqual(['#1677ff', '#222222']);

    const own = createTheme({ accent: 'steelblue', colors: ['var(--brand, #0000ff)', '#123456'] });
    const q = paintOf(own);
    readDataColors(el, own, q);
    expect(q.accent).toBe('steelblue');                     // a colour d3 reads: as written
    expect(q.colors).toEqual(['#0000ff', '#123456']);
  });

  it('an accent of the card\'s own (--rc-accent) wins over the series token', () => {
    const el = mount(null);
    el.style.setProperty('--rc-accent', '#ff6200');
    const p = paintOf(defaultTheme);
    readDataColors(el, defaultTheme, p);
    expect(p.accent).toBe('#ff6200');
    expect(p.colors[0]).toBe('#1677ff');
  });
});

describe('toHex: computed colours', () => {
  it.each([
    ['rgb(22, 119, 255)', '#1677ff'],
    ['rgb(22 119 255)', '#1677ff'],
    ['rgba(0, 0, 0, 0.5)', '#00000080'],
    ['rgba(0, 0, 0, 1)', '#000000'],
    ['rgb(0 0 0 / 25%)', '#00000040'],
    ['color(srgb 1 0.5 0)', '#ff8000'],
    ['color(srgb 0.0862745 0.466667 1 / 0.5)', '#1677ff80'],
  ])('%s → %s', (input, out) => {
    expect(toHex(input)).toBe(out);
  });

  it('anything else is null', () => {
    for (const s of ['', 'red', '#fff', 'oklch(0.6 0.2 250)', 'color(display-p3 1 0 0)', 'rgb(1, 2)', null]) expect(toHex(s), s).toBeNull();
  });
});

describe('chainLiteral', () => {
  it('the innermost literal of a var() chain', () => {
    expect(chainLiteral('var(--chart-bg, var(--bg-color, #ffffff))')).toBe('#ffffff');
    expect(chainLiteral('var(--a, rgba(0,0,0,0.1))')).toBe('rgba(0,0,0,0.1)');
    expect(chainLiteral('#123456')).toBe('#123456');
    expect(chainLiteral('var(--a)')).toBeNull();
  });
});

describe('hex(): a colour as it leaves the chart', () => {
  it('passes non-colours and plain colours through, as written', () => {
    const hex = makeHex(mount(null));
    expect(hex(undefined)).toBeUndefined();
    expect(hex('none')).toBe('none');
    expect(hex('transparent')).toBe('transparent');
    expect(hex('url(#g)')).toBe('url(#g)');
    expect(hex('steelblue')).toBe('steelblue');
    expect(hex('#1677ff')).toBe('#1677ff');
  });

  it('a var() chain the engine cannot resolve falls to its literal', () => {
    const hex = makeHex(mount(null));
    expect(hex('var(--chart-series-1, #1677ff)')).toBe('#1677ff');
  });

  // No engine (jsdom): the references are put in by hand from the custom
  // properties at the card, which inherit from the page.
  it('without an engine, var() is resolved from the custom properties at the card', () => {
    const root = document.documentElement;
    const el = mount(null);
    el.style.setProperty('--rc-accent', '#ff6200');
    root.style.setProperty('--chart-series-1', '#123456');
    root.style.setProperty('--bg-color', '#f0f0f0');
    try {
      const hex = makeHex(el);
      expect(hex('var(--rc-accent, #1677ff)')).toBe('#ff6200');
      expect(hex('var(--chart-series-1, #1677ff)')).toBe('#123456');
      expect(hex('var(--chart-bg, var(--bg-color, #ffffff))')).toBe('#f0f0f0');
      root.style.setProperty('--chart-bg', '#fafafa');
      hex.reset();
      expect(hex('var(--chart-bg, var(--bg-color, #ffffff))')).toBe('#fafafa');
      // a token that holds a chain is followed; translucent gives #rrggbbaa
      el.style.setProperty('--x', 'var(--y, rgba(0, 0, 0, 0.5))');
      expect(hex('var(--x)')).toBe('#00000080');
    } finally {
      for (const n of ['--chart-series-1', '--bg-color', '--chart-bg']) root.style.removeProperty(n);
    }
  });

  it('hex.many reads a list with one probe box', () => {
    const el = mount(null);
    const append = vi.spyOn(el, 'appendChild');
    const hex = makeHex(el);
    expect(hex.many(['#123456', 'var(--a, #000000)', 'var(--b, #ffffff)', 'none'])).toEqual(['#123456', '#000000', '#ffffff', 'none']);
    expect(append).toHaveBeenCalledTimes(1);
  });

  it('reads what an engine computes, through a probe it removes again', () => {
    const el = mount(null);
    const before = el.childNodes.length;
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ color: 'rgb(255, 98, 0)' });
    const hex = makeHex(el);
    expect(hex('var(--rc-accent, #1677ff)')).toBe('#ff6200');
    expect(el.childNodes.length).toBe(before);
    // cached until reset
    window.getComputedStyle.mockReturnValue({ color: 'rgb(0, 0, 0)' });
    expect(hex('var(--rc-accent, #1677ff)')).toBe('#ff6200');
    hex.reset();
    expect(hex('var(--rc-accent, #1677ff)')).toBe('#000000');
  });

  it('an unreadable page value stays as written, with one warning per chart', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hex = makeHex(mount(null));
    expect(hex('var(--brand)')).toBe('var(--brand)');
    expect(hex('var(--other)')).toBe('var(--other)');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
