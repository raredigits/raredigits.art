import { describe, it, expect } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { defaultTheme, darkTheme, createTheme } from '../assets/charts/src/core/theme.js';
import { mount, track } from './helpers.js';

// Fills that used to ignore the theme: the plate behind a last-value label
// (the undocumented theme.service, white in every theme) and the navigator's
// brush tints (hard-coded black) — C-12. And theme.bg / the map ocean, which
// read the host's --bg-color without a fallback — C-13 (every host variable
// in the themes is checked in charts-css.test.js).

const monthly = (year, months = 12) => Array.from({ length: months }, (_, i) => ({
  date: new Date(year, i, 15), value: 10 + i,
}));

describe('theme tokens (C-12, C-13)', () => {
  it('theme.service is gone', () => {
    expect(defaultTheme).not.toHaveProperty('service');
    expect(darkTheme).not.toHaveProperty('service');
    expect(createTheme()).not.toHaveProperty('service');
  });

  it('bg reads the page background and falls back to white without one', () => {
    expect(defaultTheme.bg).toBe('var(--bg-color, #ffffff)');
    expect(darkTheme.bg).toBe('#0a0a0a');
  });

  it('the map ocean is transparent in both built-in themes', () => {
    expect(defaultTheme.map.ocean).toBe('transparent');
    expect(darkTheme.map.ocean).toBe('transparent');
  });
});

// ─── End-label plates ──────────────────────────────────────────────────────────

const END_CHARTS = [
  ['Line', o => new Line(mount(null), { animate: false, ...o }), rows => rows],
  ['DualAxes', o => new DualAxes(mount(null), { animate: false, ...o }), rows => [{ name: 's', values: rows }]],
];
const plates = c => {
  const fills = [...c.container.querySelectorAll('.rc-end-label-bg')].map(r => r.getAttribute('fill'));
  expect(fills.length).toBeGreaterThan(0);
  return fills;
};

describe('the plate behind a last-value label is the chart background (C-12)', () => {
  it.each(END_CHARTS)('%s: darkTheme draws dark plates, not white ones', (_n, make, shape) => {
    const c = track(make({ theme: darkTheme })).setData(shape(monthly(2023)));
    plates(c).forEach(fill => expect(fill).toBe(darkTheme.bg));
  });

  it.each(END_CHARTS)('%s: a custom theme.bg paints the plates', (_n, make, shape) => {
    const c = track(make({ theme: { bg: '#123456' } })).setData(shape(monthly(2023)));
    plates(c).forEach(fill => expect(fill).toBe('#123456'));
  });

  it.each(END_CHARTS)('%s: the default theme plate is theme.bg, white without a host stylesheet', (_n, make, shape) => {
    const c = track(make({})).setData(shape(monthly(2023)));
    plates(c).forEach(fill => expect(fill).toBe('var(--bg-color, #ffffff)'));
  });
});

// ─── Navigator brush tints ─────────────────────────────────────────────────────

const NAV_CHARTS = [
  ...END_CHARTS,
  ['Bar (dates)', o => new Bar(mount(null), { animate: false, ...o }), rows => rows],
];
const brush = root => ({
  selection: root.querySelector('.selection'),
  overlay:   root.querySelector('.overlay'),
  handles:   [...root.querySelectorAll('.handle')],
});
const navOf = c => brush(c.container.querySelector('.rc-chart-navigator'));

describe('the navigator brush tints follow the theme (C-12)', () => {
  it.each(NAV_CHARTS)('%s: darkTheme tints the strip and the window with darkTheme.text', (_n, make, shape) => {
    const c = track(make({ navigator: true, theme: darkTheme })).setData(shape(monthly(2023)));
    const { selection, overlay } = navOf(c);
    expect(overlay.getAttribute('fill')).toBe(darkTheme.text);
    expect(overlay.getAttribute('fill-opacity')).toBe('0.2');
    expect(selection.getAttribute('fill')).toBe(darkTheme.text);
    expect(selection.getAttribute('fill-opacity')).toBe('0.015');
  });

  it.each(NAV_CHARTS)('%s: no navigator fill is a hard-coded rgba(0,0,0,…)', (_n, make, shape) => {
    const c = track(make({ navigator: true, theme: darkTheme })).setData(shape(monthly(2023)));
    const fills = [...c.container.querySelectorAll('.rc-chart-navigator [fill]')].map(n => n.getAttribute('fill'));
    expect(fills.filter(f => /^rgba\(\s*0\s*,\s*0\s*,\s*0/.test(f))).toEqual([]);
  });

  it('a custom theme.text tints both', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true, theme: { text: '#123456' } }))
      .setData(monthly(2023));
    const { selection, overlay } = navOf(c);
    expect(overlay.getAttribute('fill')).toBe('#123456');
    expect(selection.getAttribute('fill')).toBe('#123456');
  });

  it("the default theme keeps today's look: black, 20 % over the strip, 1.5 % in the window", () => {
    const c = track(new Line(mount(null), { animate: false, navigator: true })).setData(monthly(2023));
    const { selection, overlay } = navOf(c);
    expect(defaultTheme.text).toBe('#000000');
    expect(overlay.getAttribute('fill')).toBe('#000000');
    expect(+overlay.getAttribute('fill-opacity')).toBe(0.2);         // was rgba(0,0,0,0.2)
    expect(selection.getAttribute('fill')).toBe('#000000');
    expect(+selection.getAttribute('fill-opacity')).toBe(0.015);     // was rgba alpha 0.05 × d3's 0.3
  });

  it('brushColor still moves only the window stroke and the handles', () => {
    const c = track(new Line(mount(null), { animate: false, navigator: { brushColor: '#ff00ff' }, theme: darkTheme }))
      .setData(monthly(2023));
    const { selection, overlay, handles } = navOf(c);
    expect(selection.getAttribute('stroke')).toBe('#ff00ff');
    expect(handles.length).toBeGreaterThan(0);
    handles.forEach(h => expect(h.getAttribute('fill')).toBe('#ff00ff'));
    expect(selection.getAttribute('fill')).toBe(darkTheme.text);
    expect(overlay.getAttribute('fill')).toBe(darkTheme.text);
  });

  it('a standalone Overview takes its tints from its own theme', () => {
    const ov = new Overview(mount(null), { theme: { text: '#123456' } }).setData(monthly(2023), () => {});
    track({ destroy: () => ov.destroy() });
    const { selection, overlay } = brush(ov.container);
    expect(overlay.getAttribute('fill')).toBe('#123456');
    expect(selection.getAttribute('fill')).toBe('#123456');
  });
});
