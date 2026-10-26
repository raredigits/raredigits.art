import { describe, it, expect } from 'vitest';
import { defaultTheme, darkTheme, createTheme } from '../assets/charts/src/core/theme.js';

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
    expect(defaultTheme.tooltip.muted).toBe('#666666');
    expect(defaultTheme.tooltip.muted).toBe(defaultTheme.muted);
    expect(darkTheme.tooltip.muted).toBe(darkTheme.muted);
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
