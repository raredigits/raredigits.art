import { describe, it, expect } from 'vitest';
import { defaultTheme, darkTheme, createTheme } from '../assets/charts/src/core/theme.js';
import { linkPresets } from '../assets/charts/src/charts/presets/linkPresets.js';
import { chainLiteral } from '../assets/charts/src/core/paint.js';

describe('createTheme', () => {
  it('returns the defaults when given no overrides', () => {
    const t = createTheme();
    expect(t.text).toBe(defaultTheme.text);
    expect(t.strokeWidth).toBe(defaultTheme.strokeWidth);
    expect(t.tooltip.bg).toBe(defaultTheme.tooltip.bg);
  });

  it('overrides a top-level token', () => {
    const t = createTheme({ text: '#123456' });
    expect(t.text).toBe('#123456');
    expect(t.muted).toBe(defaultTheme.muted); // others untouched
  });

  it('deep-merges tooltip — a partial override keeps the other tooltip keys', () => {
    const t = createTheme({ tooltip: { bg: '#000' } });
    expect(t.tooltip.bg).toBe('#000');
    expect(t.tooltip.text).toBe(defaultTheme.tooltip.text);
    expect(t.tooltip.shadow).toBe(defaultTheme.tooltip.shadow);
    expect(t.tooltip.header).toEqual({ text: null, bg: null });
  });

  // B-03: tooltip.header is one level deeper; a string there is not an object
  // to spread ({0:'#',1:'f',…}) and is ignored.
  it('deep-merges tooltip.header and ignores a non-object header', () => {
    const t = createTheme({ tooltip: { header: { bg: '#eeeeee' } } });
    expect(t.tooltip.header).toEqual({ text: null, bg: '#eeeeee' });
    expect(t.tooltip.text).toBe(defaultTheme.tooltip.text);
    expect(createTheme({ tooltip: { header: '#f00' } }).tooltip.header).toEqual({ text: null, bg: null });
    expect(createTheme({ tooltip: { header: null } }).tooltip.header).toEqual({ text: null, bg: null });
  });

  // B-03: { ...darkTheme, tooltip: { bg } } merges onto the light defaults —
  // black text on a black tooltip. The base argument keeps the dark values.
  it('merges onto a given base: a partial tooltip override of darkTheme stays dark', () => {
    const t = createTheme({ tooltip: { bg: '#000000' } }, darkTheme);
    expect(t.tooltip.bg).toBe('#000000');
    expect(t.tooltip.text).toBe(darkTheme.tooltip.text);
    expect(t.tooltip.border).toBe(darkTheme.tooltip.border);
    expect(t.tooltip.shadow).toBe(darkTheme.tooltip.shadow);
    expect(t.bg).toBe(darkTheme.bg);
    expect(t.map.ocean).toBe(darkTheme.map.ocean);
    expect(createTheme({}, darkTheme)).toEqual(darkTheme);
    expect(createTheme(null)).toEqual(createTheme());
  });

  it('deep-merges map — a partial override keeps the other map keys', () => {
    const t = createTheme({ map: { matchFill: '#abcabc' } });
    expect(t.map.matchFill).toBe('#abcabc');
    expect(t.map.ocean).toBe(defaultTheme.map.ocean);
  });

  it('replaces the colors palette wholesale (shallow)', () => {
    const t = createTheme({ colors: ['#111', '#222'] });
    expect(t.colors).toEqual(['#111', '#222']);
  });

  it('does not mutate defaultTheme', () => {
    const before = defaultTheme.text;
    createTheme({ text: '#999999', tooltip: { bg: '#999' } });
    expect(defaultTheme.text).toBe(before);
    expect(defaultTheme.tooltip.bg).not.toBe('#999');
  });
});

describe('darkTheme', () => {
  it('applies dark overrides', () => {
    expect(darkTheme.bg).toBe('#0a0a0a');
    expect(darkTheme.tooltip.text).toBe('#e8e8e8');
  });
  it('inherits unspecified sizing defaults from the base theme', () => {
    expect(darkTheme.strokeWidth).toBe(defaultTheme.strokeWidth);
    expect(darkTheme.dotRadius).toBe(defaultTheme.dotRadius);
  });
  it('inherits the fonts from the base theme', () => {
    expect(darkTheme.font).toBe(defaultTheme.font);
    expect(darkTheme.numericFont).toBe(defaultTheme.numericFont);
  });
});

// B-03: tooltip.muted is what the secondary rows read now (before, they read
// theme.muted); the light default moved #888888 → #666666 so they look the
// same, and the chart and its tooltip agree in both presets.
describe('tooltip.muted', () => {
  it('equals the chart muted in the light and the dark preset', () => {
    expect(chainLiteral(defaultTheme.tooltip.muted)).toBe('#666666');
    expect(chainLiteral(defaultTheme.tooltip.muted)).toBe(chainLiteral(defaultTheme.muted));
    expect(darkTheme.tooltip.muted).toBe(darkTheme.muted);
  });
});

// RC-014: a default colour is a chain — the page's --chart-* token, then the
// literal (rare-charts.css declares the same on .rc-chart, charts-css.test.js
// keeps them in step); null marks a derived one. darkTheme stays plain.
describe('RC-014: the default colours are token chains', () => {
  it('each role, the accent, the palette, the map and the tooltip behind its --chart-* token', () => {
    expect(defaultTheme).toMatchObject({
      bg:        'var(--chart-bg, var(--bg-color, #ffffff))',
      surface:   null,
      grid:      'var(--chart-grid-color, #e4e4e4)',
      border:    'var(--chart-axis-color, #cccccc)',
      crosshair: '#aaaaaa',
      text:      'var(--chart-text-color, #000000)',
      muted:     'var(--chart-label-color, #666666)',
      accent:    'var(--chart-series-1, #1677ff)',
    });
    expect(defaultTheme.colors).toEqual([1, 2, 3, 4, 5, 6].map((n, i) =>
      `var(--chart-series-${n}, ${['#1677ff', '#fa8c16', '#00c97a', '#ffcc00', '#cc44ff', '#ff0000'][i]})`));
    expect(defaultTheme.map).toEqual({
      matchFill: null, unmatchedFill: 'var(--chart-grid-color, #e8e8e8)', ocean: 'transparent',
      border: 'var(--chart-bg, #ffffff)', hoverBrighten: 1.3, graticule: null,
    });
    expect(defaultTheme.tooltip).toEqual({
      bg: 'var(--chart-tooltip-bg, #ffffff)', border: 'var(--chart-tooltip-border, #e4e4e4)',
      text: 'var(--chart-tooltip-text, #000000)', muted: 'var(--chart-tooltip-muted, #666666)',
      shadow: 'var(--chart-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.10))', header: { text: null, bg: null },
    });
  });

  it('the literals at their ends are the 0.9.8_7 look (RC-064)', () => {
    const lit = k => chainLiteral(defaultTheme[k]);
    expect(['bg', 'grid', 'border', 'crosshair', 'text', 'muted', 'accent'].map(lit))
      .toEqual(['#ffffff', '#e4e4e4', '#cccccc', '#aaaaaa', '#000000', '#666666', '#1677ff']);
    expect(chainLiteral(defaultTheme.map.unmatchedFill)).toBe('#e8e8e8');
    expect(chainLiteral(defaultTheme.map.border)).toBe('#ffffff');
  });

  it('darkTheme is plain colours, its surface its own; createTheme({}, darkTheme) is darkTheme', () => {
    for (const k of ['bg', 'surface', 'grid', 'border', 'crosshair', 'text', 'muted', 'accent']) {
      expect(darkTheme[k], k).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(darkTheme.surface).toBe('#141414');
    expect(Object.values(darkTheme.tooltip).filter(v => typeof v === 'string').join(' ')).not.toMatch(/var\(/);
    expect(darkTheme.map.graticule).toBe('rgba(255,255,255,0.06)');
    expect(darkTheme.colors).toBe(defaultTheme.colors);      // the palette chains, inherited
    expect(createTheme({}, darkTheme)).toEqual(darkTheme);
  });
});

describe('font fallbacks', () => {
  // The stacks of --rc-font-family(-numeric) in rare-charts.css: Fira Sans /
  // Cousine when the page has them, then the system's own faces.
  it('font falls back through system sans-serif faces', () => {
    expect(defaultTheme.font).toBe('var(--rc-font-family, "Fira Sans", system-ui, -apple-system, '
      + '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)');
  });
  it('numericFont falls back through system monospace faces', () => {
    expect(defaultTheme.numericFont).toBe('var(--rc-font-family-numeric, "Cousine", ui-monospace, '
      + 'SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)');
  });
});

// The palette agreed with Rare Styles (DECISIONS §7, 2026-11-17): #1677ff is
// series 1 and the accent, the light blue #00aaff is gone everywhere, and the
// orange #ff6200 stays only as the dark theme's accent (the owner, question 2:
// elsewhere it becomes the palette orange #fa8c16).
describe('the palette', () => {
  const PALETTE = ['#1677ff', '#fa8c16', '#00c97a', '#ffcc00', '#cc44ff', '#ff0000'];
  const text = o => JSON.stringify(o).toLowerCase();

  it('the series in order; series 1 is the accent', () => {
    expect(defaultTheme.colors.map(chainLiteral)).toEqual(PALETTE);
    expect(defaultTheme.accent).toBe(defaultTheme.colors[0]);
  });

  it('the grid and the tooltip border are #e4e4e4', () => {
    expect(chainLiteral(defaultTheme.grid)).toBe('#e4e4e4');
    expect(chainLiteral(defaultTheme.tooltip.border)).toBe('#e4e4e4');
  });

  it('map.matchFill is null in both presets: regions with data take the accent', () => {
    expect(defaultTheme.map.matchFill).toBeNull();
    expect(darkTheme.map.matchFill).toBeNull();
    expect(createTheme({ accent: '#123456' }).map.matchFill).toBeNull();
  });

  it('darkTheme keeps its orange accent and takes the palette', () => {
    expect(darkTheme.accent).toBe('#ff6200');
    expect(darkTheme.colors.map(chainLiteral)).toEqual(PALETTE);
  });

  it('no #00aaff in either preset; #ff6200 only as the dark accent', () => {
    expect(text(defaultTheme)).not.toMatch(/#00aaff|#ff6200/);
    expect(text({ ...darkTheme, accent: null })).not.toMatch(/#00aaff|#ff6200/);
  });

  it('each link preset has the palette blue and orange once, and no two types share a colour', () => {
    for (const [name, set] of Object.entries(linkPresets)) {
      const colors = Object.values(set).map(t => t.color.toLowerCase());
      expect(colors.filter(c => c === '#1677ff'), name).toHaveLength(1);
      expect(colors.filter(c => c === '#fa8c16'), name).toHaveLength(1);
      expect(new Set(colors).size, name).toBe(colors.length);
    }
    expect(text(linkPresets)).not.toMatch(/#00aaff|#ff6200/);
  });
});

// RC-011: the theme keys no chart read are gone.
describe('RC-011: positive, negative and fontSize', () => {
  it('are not in the presets or a created theme', () => {
    for (const t of [defaultTheme, darkTheme, createTheme()]) {
      for (const k of ['positive', 'negative', 'fontSize']) expect(t, k).not.toHaveProperty(k);
    }
  });
});
