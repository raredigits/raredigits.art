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
});
