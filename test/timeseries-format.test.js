// TimeSeries value labels (RC-005, analytics spec §4 "Format" and §2.2):
// yFormat 'currency' (the default — '$' kept, K-10) or 'number', dressed by
// yPrefix / ySuffix. Unset or 'currency' is the label of before, character
// for character; an explicit yTickFormat wins on the ticks and tooltipFormat
// in the tooltip, as before.
//
// Through the DOM (S-17). Sizes are the test's own (S-18): every box 800×400,
// so the plot is 730px wide and the pointer's x in the overlay is clientX.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { compactTickFormat } from '../assets/charts/src/core/utils.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

// 20 days of visits, local dates
const days = (n = 20, value = i => 1000 + 211.5 * i) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(2026, 0, 1 + i), value: value(i) }));

const ts = (o = {}, rows = days()) => track(new TimeSeries(mount(null), o)).setData(rows);
const plot = c => c.container.querySelector(':scope > svg > g');
const yLabels = c => [...plot(c).querySelectorAll(':scope > g.rc-axis')[1].querySelectorAll('.tick text')].map(t => t.textContent);
const yTicks = c => [...plot(c).querySelectorAll(':scope > g.rc-axis')[1].querySelectorAll('.tick')].map(t => t.__data__);
const overlay = c => plot(c).querySelector(':scope > rect');
// hover the row nearest `date`; the tooltip's value row as text
const tipAt = (c, date) => {
  overlay(c).dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY: 50 }));
  return c.container.querySelector('.rc-tooltip');
};
const valueAt = (c, date) => tipAt(c, date).querySelector('.rc-tooltip-value').textContent.trim();
// the chart's markup with the per-instance ids taken out
const markup = c => c.container.outerHTML.replace(/rc-[a-z0-9]{1,8}-\d+/g, 'rc-UID');

describe("the default is 'currency', the labels of before", () => {
  it("ticks are '$' + ',.0f' and the tooltip '$' + ',.2f'", () => {
    const c = ts();
    expect(yLabels(c).length).toBeGreaterThan(2);
    expect(yLabels(c)).toEqual(yTicks(c).map(v => '$' + d3.format(',.0f')(v)));
    expect(valueAt(c, new Date(2026, 0, 3))).toBe('$1,423.00');
  });

  it("yFormat: 'currency' draws the very same markup as no yFormat", () => {
    const a = ts(), b = ts({ yFormat: 'currency' });
    tipAt(a, new Date(2026, 0, 5));
    tipAt(b, new Date(2026, 0, 5));
    expect(markup(b)).toBe(markup(a));
  });

  it('yPrefix replaces the $; ySuffix follows the number', () => {
    const c = ts({ yPrefix: '€', ySuffix: ' net' });
    expect(yLabels(c)).toEqual(yTicks(c).map(v => `€${d3.format(',.0f')(v)} net`));
    expect(valueAt(c, new Date(2026, 0, 3))).toBe('€1,423.00 net');
    const bare = ts({ yPrefix: '' });
    expect(yLabels(bare)).toEqual(yTicks(bare).map(v => d3.format(',.0f')(v)));
  });

  it("a format it does not know draws currency, and says so once", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ yFormat: 'percent' });
    expect(yLabels(c)).toEqual(yTicks(c).map(v => '$' + d3.format(',.0f')(v)));
    c.render();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.TimeSeries: yFormat "percent"/);
  });
});

describe("yFormat: 'number' — counts", () => {
  it('ticks are compact, by the step between the ticks drawn (as on Line)', () => {
    const c = ts({ yFormat: 'number' });
    const ticks = yTicks(c);
    expect(yLabels(c)).toEqual(ticks.map(compactTickFormat(ticks)));
    expect(yLabels(c).every(l => /^\d+(\.\d+)?k$/.test(l))).toBe(true);
    expect(yLabels(c).join(' ')).not.toMatch(/\$/);
  });

  it('the tooltip shows the exact number with separators: 1,234, and decimals only when there are some', () => {
    const c = ts({ yFormat: 'number' }, days(20, i => (i === 2 ? 1234 : 1234.5 + i)));
    expect(valueAt(c, new Date(2026, 0, 3))).toBe('1,234');
    expect(valueAt(c, new Date(2026, 0, 4))).toBe('1,237.5');
  });

  it('explicit tick values: the labels follow their step', () => {
    const c = ts({ yFormat: 'number', yTickValues: [0, 2500, 5000] });
    expect(yLabels(c)).toEqual(['0', '2.5k', '5k']);
  });

  it("a log scale labels its round powers '.3~s'", () => {
    const c = ts({ yFormat: 'number', yScale: 'log' }, days(20, i => 10 ** (1 + i / 4)));
    const ticks = yTicks(c);
    expect(yLabels(c)).toEqual(ticks.map(d3.format('.3~s')));
    expect(yLabels(c)).toContain('1k');
  });

  it('yPrefix and ySuffix dress the ticks and the tooltip; the prefix is empty by default', () => {
    const c = ts({ yFormat: 'number', ySuffix: ' visits' }, days(20, i => (i === 2 ? 1234 : 1000 + 100 * i)));
    const ticks = yTicks(c);
    expect(yLabels(c)).toEqual(ticks.map(v => `${compactTickFormat(ticks)(v)} visits`));
    expect(valueAt(c, new Date(2026, 0, 3))).toBe('1,234 visits');
    const p = ts({ yFormat: 'number', yPrefix: '#' }, days(20, i => (i === 2 ? 1234 : 1000 + 100 * i)));
    expect(valueAt(p, new Date(2026, 0, 3))).toBe('#1,234');
  });

  it('a prefix from the page is text in the tooltip, not markup', () => {
    const c = ts({ yFormat: 'number', yPrefix: '<b>' });
    const tip = tipAt(c, new Date(2026, 0, 3));
    expect(tip.querySelector('b')).toBeNull();
    expect(tip.querySelector('.rc-tooltip-value').textContent.trim()).toBe('<b>1,423');
  });
});

describe('explicit formatters win, as before', () => {
  it('yTickFormat wins on the ticks under either format; the tooltip keeps the format', () => {
    for (const yFormat of [undefined, 'number']) {
      const c = ts({ yFormat, yTickFormat: v => `T${v}` });
      expect(yLabels(c)).toEqual(yTicks(c).map(v => `T${v}`));
      expect(valueAt(c, new Date(2026, 0, 3))).toBe(yFormat ? '1,423' : '$1,423.00');
    }
  });

  it('tooltipFormat wins in the tooltip, with the row and its value as given', () => {
    const fmt = vi.fn((d, info) => `<i>${info.value}</i>`);
    const c = ts({ yFormat: 'number', ySuffix: ' visits', tooltipFormat: fmt });
    const tip = tipAt(c, new Date(2026, 0, 3));
    expect(tip.querySelector('i').textContent).toBe('1423');
    expect(fmt.mock.calls.at(-1)[0].value).toBe(1423);
  });
});
