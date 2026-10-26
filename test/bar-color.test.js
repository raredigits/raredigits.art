import { describe, it, expect } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';
import { mount, track } from './helpers.js';

// Per-bar colour (B-01): a row's `color` fills its bar, then barColor, then
// the theme accent — in the vertical, horizontal and date modes, on every
// render (setData repaints). The stacked mode keeps series colours.

const fills = c => [...c.container.querySelectorAll('rect.rc-bar')].map(r => r.getAttribute('fill'));
const MODES = [
  ['vertical',   {},                                         k => ({ label: k })],
  ['horizontal', { orientation: 'horizontal', height: 300 }, k => ({ label: k })],
  ['dates',      {},                                         k => ({ date: `2026-0${'ABC'.indexOf(k) + 1}-01` })],
];
const rows = (key, colors) => ['A', 'B', 'C'].map((k, i) =>
  ({ ...key(k), value: i + 1, ...(colors[i] !== undefined ? { color: colors[i] } : {}) }));
const bar = (o, data) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);

describe('Bar per-bar colour (B-01)', () => {
  it.each(MODES)('%s: d.color, then barColor, then the theme accent', (_n, o, key) => {
    expect(fills(bar({ barColor: '#123456', ...o }, rows(key, ['#ff0000']))))
      .toEqual(['#ff0000', '#123456', '#123456']);
    expect(fills(bar(o, rows(key, [undefined, '#00ff00']))))
      .toEqual([defaultTheme.accent, '#00ff00', defaultTheme.accent]);
  });

  it.each(MODES)('%s: setData recolours an existing bar and drops a removed colour', (_n, o, key) => {
    const c = bar({ barColor: '#123456', ...o }, rows(key, ['#ff0000']));
    c.setData(rows(key, [undefined, '#00ff00']));
    expect(fills(c)).toEqual(['#123456', '#00ff00', '#123456']);
  });

  it('recolours on the animated path too', () => {
    const c = track(new Bar(mount(null), {})).setData([{ label: 'A', value: 1 }]);
    c.setData([{ label: 'A', value: 2, color: '#ff0000' }]);
    expect(fills(c)).toEqual(['#ff0000']);
  });

  it('hover keeps the bar colour (opacity only)', () => {
    const c = bar({}, [{ label: 'A', value: 1, color: '#ff0000' }]);
    const r = c.container.querySelector('rect.rc-bar');
    r.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(r.getAttribute('fill')).toBe('#ff0000');
    expect(r.getAttribute('opacity')).toBe('0.75');
    r.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(r.getAttribute('fill')).toBe('#ff0000');
  });

  it('an empty colour is not set: the bar falls back to barColor', () => {
    expect(fills(bar({ barColor: '#123456' }, [{ label: 'A', value: 1, color: '' }]))).toEqual(['#123456']);
    expect(fills(bar({ barColor: '' }, [{ label: 'A', value: 1 }]))).toEqual([defaultTheme.accent]);
  });

  it('stacked: a value\'s color is ignored, segments keep their series colour', () => {
    const s = bar({}, [{ name: 's', color: '#0000ff', values: [{ label: 'A', value: 1, color: '#ff0000' }] }]);
    expect(s.container.querySelector('rect.rc-bar-seg').getAttribute('fill')).toBe('#0000ff');
  });
});
