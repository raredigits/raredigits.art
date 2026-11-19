// TimeSeries' comparison series (RC-004, analytics spec §7 with owner answer
// 4 А, and §2.5 for its look): compare: 'previousPeriod' | 'previousYear'
// draws the rows of an earlier window moved onto the view — a dashed grey
// line under the main one, named compareName — and the tooltip reports it
// beside the main value with the change. The shift follows what set the
// view: a calendar key by one of its unit, a rolling key by its n, the
// custom range by its days, any other window by its own length;
// 'previousYear' always a year. The rule itself, pure: test/compare.test.js;
// across DST: test/compare-dst.test.js.
//
// Through the DOM and the public surface (S-17), with a look at the
// comparison's rows (_compareSeries) where only the drawn dates tell one
// shift from another. Sizes are the test's own (S-18): every box 800×400,
// the plot 730px wide, the pointer's x in the overlay is clientX. Dates are
// local, built with the local Date constructor, or UTC with Date.UTC for the
// 'UTC' zone, so each expectation holds in every TZ run.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { sourceDate } from '../assets/charts/src/core/compare.js';
import { mount, track, setGeometry } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));
afterEach(() => vi.useRealTimers());

const HOUR = 36e5;
// theme.muted as the chart draws it: a reference to its card's token
// (core/paint.js); as it leaves the chart (a payload), hex
const MUTED = 'var(--rc-muted, #666666)';
const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const utc = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi));

// A row's value names its day in the zone: 18 November 2026 → 261118.
const stamp = (date, zone = 'local') => (zone === 'UTC'
  ? (date.getUTCFullYear() % 100) * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
  : (date.getFullYear() % 100) * 10000 + (date.getMonth() + 1) * 100 + date.getDate());

// One row a day, at midnight in the zone, from `from` to `to` (both
// included): by default 1 September 2025 to Wednesday 18 November 2026.
const days = (D = local, zone = 'local', from = [2025, 9, 1], to = [2026, 11, 18]) => {
  const out = [];
  for (let i = 0; ; i++) {
    const date = D(from[0], from[1], from[2] + i);
    if (date > D(...to)) return out;
    out.push({ date, value: stamp(date, zone) });
  }
};
// hourly rows from `from`, `n` of them, valued by the hour of the day
const hours = (from, n, value = (d, i) => i) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(+from + i * HOUR), value: value(new Date(+from + i * HOUR), i) }));

const TIMEFRAMES = ['TODAY', 'WTD', 'MTD', 'YTD', '24H', '7D', '3M', 'ALL', 'CUSTOM'];
const ts = (o = {}) => track(new TimeSeries(mount(null), { timeframes: TIMEFRAMES, yFormat: 'number', ...o }));

const plot = c => c.container.querySelector(':scope > svg > g');
const paths = c => c.container.querySelector('svg g[clip-path] > g');
const compareLine = c => c.container.querySelector('path.rc-ts-compare-line');
const mainLine = c => c.container.querySelector('path.rc-ts-line');
const hover = (c, date) => plot(c).querySelector(':scope > rect')
  .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: c.xScale(date), clientY: 50 }));
const tooltip = c => c.container.querySelector('.rc-tooltip');
// The tooltip's lines: the date, then each row as 'name | value | note' (RC-082)
const tipRows = c => [...tooltip(c).children].map(el => (el.classList.contains('rc-tooltip-row')
  ? [...el.children].filter(x => !x.classList.contains('rc-tooltip-swatch')).map(x => x.textContent).join(' | ')
  : el.textContent.trim()));
const yLabels = c => [...plot(c).querySelectorAll(':scope > g.rc-axis')[1].querySelectorAll('text')].map(t => t.textContent);
const xLabels = c => [...plot(c).querySelectorAll(':scope > g.rc-axis')[0].querySelectorAll('text')].map(t => t.textContent);
const item = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
const click = node => node.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));
const moves = d => (d?.match(/M/g) ?? []).length;
// The comparison's rows: where each was drawn, where it came from.
const drawn = c => (c._compareSeries?.values ?? []).map(r => +r.date);
const sources = c => (c._compareSeries?.values ?? []).map(r => +sourceDate(r));

// tooltipFormat as a recorder: the last row and info it was given.
const recorder = () => {
  const fn = vi.fn(() => '');
  return { fn, last: () => fn.mock.lastCall };
};

// ─── Off by default ──────────────────────────────────────────────────────────

describe('compare is off by default', () => {
  it('no comparison: no group, no row, the role fields as before', () => {
    const tip = recorder();
    const c = ts({ tooltipFormat: tip.fn }).setData(days());
    expect(c.container.querySelector('.rc-ts-compare')).toBeNull();
    hover(c, local(2026, 11, 18));
    expect(Object.keys(tip.last()[1]).sort()).toEqual(['color', 'date', 'level', 'value']);
  });

  it('false draws none; an unknown value warns once and draws none', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(ts({ compare: false }).setData(days()).container.querySelector('.rc-ts-compare')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    const c = ts({ compare: 'lastYear' }).setData(days());
    c.setTimeframe('MTD');
    expect(c.container.querySelector('.rc-ts-compare')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("RareCharts.TimeSeries: compare \"lastYear\" is not 'previousPeriod' or 'previousYear' — no comparison is drawn");
  });
});

// ─── The shift ───────────────────────────────────────────────────────────────

describe.each([['local', local], ['UTC', utc]])("'previousPeriod' in the %s zone: the shift follows what set the view", (zone, D) => {
  const make = (o = {}) => {
    const tip = recorder();
    const c = ts({ timeZone: zone, compare: 'previousPeriod', tooltipFormat: tip.fn, ...o }).setData(days(D, zone));
    return { c, tip, at: date => { hover(c, date); return tip.last()[1].compare; } };
  };

  it('MTD: the same days of the month before — 1–18 November against 1–18 October', () => {
    const { c, at } = make();
    c.setTimeframe('MTD');
    expect(at(D(2026, 11, 18))).toEqual({ date: D(2026, 10, 18), value: 261018, change: (261118 - 261018) / 261018 });
    expect(at(D(2026, 11, 1)).date).toEqual(D(2026, 10, 1));
    expect(sources(c)).toEqual(days(D, zone, [2026, 10, 1], [2026, 10, 18]).map(r => +r.date));
    expect(drawn(c)).toEqual(days(D, zone, [2026, 11, 1], [2026, 11, 18]).map(r => +r.date));
  });

  it('WTD a week back, YTD a year back', () => {
    const { c, at } = make();
    c.setTimeframe('WTD');                                   // Monday 16 – Wednesday 18 November
    expect(c.getView()[0]).toEqual(D(2026, 11, 16));
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 11, 11));
    expect(sources(c)).toEqual([9, 10, 11].map(d => +D(2026, 11, d)));
    c.setTimeframe('YTD');
    expect(at(D(2026, 11, 18)).date).toEqual(D(2025, 11, 18));
    expect(at(D(2026, 1, 1))).toBeNull();                    // the year before has rows from September only
    expect(at(D(2026, 9, 1)).date).toEqual(D(2025, 9, 1));
  });

  it('a rolling key by its n: 7D a week, 3M three months', () => {
    const { c, at } = make();
    c.setTimeframe('7D');
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 11, 11));
    expect(sources(c)[0]).toBe(+D(2026, 11, 4));
    c.setTimeframe('3M');
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 8, 18));
    expect(at(D(2026, 9, 30)).date).toEqual(D(2026, 6, 30));
  });

  it('the custom range by its days: 1–10 November against 22–31 October', () => {
    const { c, at } = make();
    c.setTimeframe('CUSTOM', { range: [D(2026, 11, 1), D(2026, 11, 10)] });
    expect(at(D(2026, 11, 1)).date).toEqual(D(2026, 10, 22));
    expect(at(D(2026, 11, 10)).date).toEqual(D(2026, 10, 31));
    // clamped to the data's end, the days still count: 1–18 November against the 18 before
    c.setTimeframe('CUSTOM', { range: [D(2026, 11, 1), D(2026, 11, 30)] });
    expect(c.getView()[1]).toEqual(D(2026, 11, 18));
    expect(at(D(2026, 11, 1)).date).toEqual(D(2026, 10, 2));
  });

  it('any other window by its length: whole days from midnight to midnight, else rounded to whole days', () => {
    const { c, at } = make();
    c.setView([D(2026, 11, 2), D(2026, 11, 9)]);
    expect(at(D(2026, 11, 9)).date).toEqual(D(2026, 11, 2));
    expect(drawn(c)).toEqual(days(D, zone, [2026, 11, 2], [2026, 11, 9]).map(r => +r.date));

    // 7½ days → 8 whole days, so the rows keep their time of day
    c.setView([D(2026, 11, 2, 6), D(2026, 11, 9, 18)]);
    expect(drawn(c)).toHaveLength(7);
    expect(at(D(2026, 11, 9)).date).toEqual(D(2026, 11, 1));
  });

  it('the period picked holds while setView, the brush or the wheel move the window (maintainer, 2026-11-18)', () => {
    const { c, at } = make();
    c.setTimeframe('MTD');
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 10, 18));
    c.setView(c.getView());                                  // 1–18 November: still the month before
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 10, 18));
    c.setView([D(2026, 11, 10, 6), D(2026, 11, 17, 18)]);    // zoomed in: still the month before
    expect(at(D(2026, 11, 17)).date).toEqual(D(2026, 10, 17));
    c.setTimeframe('ALL');                                   // ALL drops the period picked
    c.setView([D(2026, 11, 2), D(2026, 11, 9)]);
    expect(at(D(2026, 11, 9)).date).toEqual(D(2026, 11, 2));
  });

  it('a period picked holds after its window is gone: the custom range keeps its 10 days', () => {
    const { c, at } = make();
    c.setTimeframe('CUSTOM', { range: [D(2026, 11, 1), D(2026, 11, 10)] });
    // new data that stops before those days: the view falls back to all of it,
    // and the comparison stays 10 days back
    c.setData(days(D, zone, [2025, 9, 1], [2026, 10, 15]));
    expect(c.getView()).toEqual([D(2025, 9, 1), D(2026, 10, 15)]);
    expect(at(D(2026, 10, 15)).date).toEqual(D(2026, 10, 5));
  });

  it('the defaultTimeframe counts while the default view holds', () => {
    const { at } = make({ defaultTimeframe: 'MTD' });
    expect(at(D(2026, 11, 18)).date).toEqual(D(2026, 10, 18));
  });

  it('ALL against the span before it: each point against the one that far back — only the last has one', () => {
    const { c, at } = make();
    c.setTimeframe('ALL');
    expect(sources(c)).toEqual([+D(2025, 9, 1)]);
    expect(drawn(c)).toEqual([+D(2026, 11, 18)]);
    expect(at(D(2026, 11, 18)).date).toEqual(D(2025, 9, 1));
    expect(at(D(2026, 11, 17))).toBeNull();
  });

  it('an earlier window before the data: no rows, no line, the group stays', () => {
    const { c, at } = make({ compare: 'previousYear' });
    c.setView([D(2025, 9, 1), D(2025, 10, 1)]);
    expect(sources(c)).toEqual([]);
    expect(compareLine(c)).toBeNull();
    expect(c.container.querySelector('g.rc-ts-compare')).not.toBeNull();
    expect(at(D(2025, 9, 20))).toBeNull();
  });
});

describe('hours: TODAY a day back, 24H 24 hours back', () => {
  // 17 and 18 November 2026 to 11:00, hourly, valued by the hour; now 11:21
  const NOW = local(2026, 11, 18, 11, 21);
  const make = () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const tip = recorder();
    const rows = hours(local(2026, 11, 17), 36, d => d.getDate() * 100 + d.getHours());
    const c = ts({ timeframeAnchor: 'now', compare: 'previousPeriod', tooltipFormat: tip.fn }).setData(rows);
    return { c, at: date => { hover(c, date); return tip.last()[1].compare; } };
  };

  it('TODAY: 00:00–11:00 against the same hours yesterday', () => {
    const { c, at } = make();
    c.setTimeframe('TODAY');
    expect(c.getView()).toEqual([local(2026, 11, 18), NOW]);
    expect(at(local(2026, 11, 18, 11))).toEqual({ date: local(2026, 11, 17, 11), value: 1711, change: (1811 - 1711) / 1711 });
    expect(sources(c)).toEqual(hours(local(2026, 11, 17), 12).map(r => +r.date));
  });

  it('24H: each row 24 hours on', () => {
    const { c } = make();
    c.setTimeframe('24H');
    expect(drawn(c).length).toBeGreaterThan(0);
    drawn(c).forEach((t, i) => expect(t - sources(c)[i]).toBe(24 * HOUR));
  });
});

describe("'previousYear': always a year back", () => {
  it('whatever set the view; named "Previous year"', () => {
    const tip = recorder();
    const c = ts({ compare: 'previousYear', tooltipFormat: tip.fn, legend: [{ label: 'Previous year' }] }).setData(days());
    for (const set of [() => c.setTimeframe('MTD'), () => c.setTimeframe('7D'), () => c.setView([local(2026, 9, 3, 5), local(2026, 10, 1)])]) {
      set();
      const end = c.getView()[1];
      hover(c, end);
      const [row, info] = tip.last();
      expect(info.series).toBe('Series');
      expect(info.compare.date).toEqual(new Date(row.date.getFullYear() - 1, row.date.getMonth(), row.date.getDate()));
    }
    expect(item(c, 'Previous year')).not.toBeNull();
  });
});

describe('month ends: two rows on one date keep the later', () => {
  it('1M back from 15 December: 30 and 31 October both land on 30 November, the 31st stays', () => {
    const tip = recorder();
    const c = ts({ timeframes: ['1M'], compare: 'previousPeriod', tooltipFormat: tip.fn })
      .setData(days(local, 'local', [2026, 8, 1], [2026, 12, 15]));
    c.setTimeframe('1M');
    expect(c.getView()).toEqual([local(2026, 11, 15), local(2026, 12, 15)]);
    hover(c, local(2026, 11, 30));
    expect(tip.last()[1].compare).toMatchObject({ date: local(2026, 10, 31), value: 261031 });
    hover(c, local(2026, 11, 29));
    expect(tip.last()[1].compare).toMatchObject({ date: local(2026, 10, 29), value: 261029 });
    expect(new Set(drawn(c)).size).toBe(drawn(c).length);
  });
});

// ─── The gaps rule ───────────────────────────────────────────────────────────

describe('the gaps rule applies to the comparison', () => {
  // 10 October is missing; a lone row on 15 October between two gaps
  const holed = days().filter(r => ![local(2026, 10, 10), local(2026, 10, 14), local(2026, 10, 16)].some(d => +d === +r.date));
  const make = gaps => {
    const tip = recorder();
    const c = ts({ compare: 'previousPeriod', gaps, interval: 'day', tooltipFormat: tip.fn }).setData(holed);
    c.setTimeframe('MTD');
    return { c, at: date => { hover(c, date); return tip.last()[1].compare; } };
  };

  it("'zero': the missing day is 0, and against 0 there is no change", () => {
    const { c, at } = make('zero');
    expect(at(local(2026, 11, 10))).toEqual({ date: local(2026, 10, 10), value: 0, change: null });
    expect(moves(compareLine(c).getAttribute('d'))).toBe(1);
  });

  it("'break': the line stops there, the lone day gets a dot in its colour", () => {
    const { c, at } = make('break');
    expect(at(local(2026, 11, 10))).toEqual({ date: local(2026, 10, 10), value: null, change: null });
    expect(moves(compareLine(c).getAttribute('d'))).toBe(4);     // 1–9, 11–13, 15, 17–18
    const dots = [...c.container.querySelectorAll('g.rc-ts-compare > circle.rc-ts-compare-dot')];
    expect(dots).toHaveLength(1);
    expect(+dots[0].getAttribute('cx')).toBeCloseTo(c.xScale(local(2026, 11, 15)), 6);
    expect(dots[0].getAttribute('fill')).toBe(MUTED);
    expect(dots[0].getAttribute('r')).toBe('3');
  });

  it("'join': no row for the day; the line joins its neighbours", () => {
    const { c, at } = make('join');
    expect(at(local(2026, 11, 10)).date).not.toEqual(local(2026, 10, 10));
    expect(moves(compareLine(c).getAttribute('d'))).toBe(1);
    expect(c.container.querySelector('.rc-ts-compare-dot')).toBeNull();
  });
});

// ─── The series ──────────────────────────────────────────────────────────────

describe('the series: its look, its place, the legend', () => {
  const make = (o = {}) => {
    const c = ts({ compare: 'previousPeriod', ...o }).setData(days());
    c.setTimeframe('MTD');
    return c;
  };

  it('a dashed line, 4 3 at 1.5px, in theme.muted, with no area; compareColor overrides', () => {
    const line = compareLine(make());
    expect(line.getAttribute('stroke')).toBe(MUTED);
    expect(line.getAttribute('stroke-dasharray')).toBe('4 3');
    expect(line.getAttribute('stroke-width')).toBe('1.5');
    expect(line.getAttribute('fill')).toBe('none');
    expect(compareLine(make({ compareColor: '#ff6200' })).getAttribute('stroke')).toBe('#ff6200');
    expect(compareLine(make({ theme: darkTheme })).getAttribute('stroke')).toBe(`var(--rc-muted, ${darkTheme.muted})`);
    expect(make().container.querySelectorAll('path.rc-ts-area')).toHaveLength(1);
  });

  it('over the area, under the main line — and back there when the main line returns', () => {
    const c = make({ seriesName: 'Visits', legend: [{ label: 'Visits' }, { label: 'Previous period' }] });
    const order = () => [...paths(c).children].map(n => n.getAttribute('class'));
    expect(order()).toEqual(['rc-ts-area', 'rc-ts-compare', 'rc-ts-line']);
    click(item(c, 'Visits'));
    expect(order()).toEqual(['rc-ts-compare']);
    click(item(c, 'Visits'));
    expect(order()).toEqual(['rc-ts-area', 'rc-ts-compare', 'rc-ts-line']);
    // with no rows first (ALL), then rows: still under the main line
    c.setTimeframe('ALL');
    c.setTimeframe('MTD');
    expect(order()).toEqual(['rc-ts-area', 'rc-ts-compare', 'rc-ts-line']);
  });

  it('the legend: a toggle named compareName, with a dashed swatch unless the item says', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legend = [{ label: 'Visits', series: 'Series' }, { label: 'Before' }];
    const c = make({ legend, compareName: 'Before' });
    expect(warn).not.toHaveBeenCalled();                    // mapped on the first render
    const swatch = item(c, 'Before').firstElementChild;
    expect(swatch.className).toBe('rc-legend-line rc-legend-line--dashed');
    expect(swatch.style.getPropertyValue('--rc-swatch-color')).toBe(MUTED);
    expect(item(c, 'Series').firstElementChild.className).toBe('rc-legend-line');
    const own = make({ legend: [{ label: 'Previous period', type: 'line' }] });
    expect(item(own, 'Previous period').firstElementChild.className).toBe('rc-legend-line');
  });

  it('a comparison with no rows keeps its legend item', () => {
    const c = make({ compare: 'previousYear', legend: [{ label: 'Series' }, { label: 'Previous year' }] });
    c.setView([local(2025, 9, 1), local(2025, 10, 1)]);
    expect(compareLine(c)).toBeNull();
    expect(item(c, 'Previous year').getAttribute('aria-pressed')).toBe('true');
  });

  it('the legend hides it: no line, no row; shown again it comes back', () => {
    const tip = recorder();
    const c = make({ legend: [{ label: 'Series' }, { label: 'Previous period' }], tooltipFormat: tip.fn });
    click(item(c, 'Previous period'));
    expect(compareLine(c)).toBeNull();
    hover(c, local(2026, 11, 18));
    expect(tip.last()[1]).toMatchObject({ series: 'Series', compare: null });
    click(item(c, 'Previous period'));
    expect(compareLine(c)).not.toBeNull();
  });

  it('the Y axis fits it, and follows the legend; legendRescale: false keeps it', () => {
    // the year before ran ten times higher
    const rows = days().map(r => ({ ...r, value: r.date < local(2026, 11, 1) ? 1000 : 100 + r.date.getDate() }));
    const legend = [{ label: 'Series' }, { label: 'Previous period' }];
    const c = track(new TimeSeries(mount(null), { timeframes: ['MTD'], compare: 'previousPeriod', legend })).setData(rows);
    c.setTimeframe('MTD');
    const plain = track(new TimeSeries(mount(null), { timeframes: ['MTD'] })).setData(rows);
    plain.setTimeframe('MTD');
    const both = yLabels(c);
    expect(both).not.toEqual(yLabels(plain));
    expect(both[both.length - 1]).toBe('$1,000');
    click(item(c, 'Previous period'));
    expect(yLabels(c)).toEqual(yLabels(plain));

    const fixed = track(new TimeSeries(mount(null), { timeframes: ['MTD'], compare: 'previousPeriod', legend, legendRescale: false })).setData(rows);
    fixed.setTimeframe('MTD');
    click(item(fixed, 'Previous period'));
    expect(yLabels(fixed)).toEqual(both);
  });

  it('the time axis, the view and the navigator ignore it', () => {
    const plain = ts({ navigator: true }).setData(days());
    const c = ts({ navigator: true, compare: 'previousPeriod' }).setData(days());
    const strip = x => x.container.querySelector('.rc-chart-navigator path.rc-ov-line').getAttribute('d');
    for (const set of [x => x.setTimeframe('MTD'), x => x.setTimeframe('ALL'), x => x.setView([local(2026, 3, 1), local(2026, 4, 1)])]) {
      set(plain);
      set(c);
      expect(c.getView()).toEqual(plain.getView());
      expect(xLabels(c)).toEqual(xLabels(plain));
      expect(strip(c)).toBe(strip(plain));
    }
  });

  it('new data rebuilds it: appendPoint moves MTD and its comparison a day on', () => {
    const c = make();
    expect(sources(c).at(-1)).toBe(+local(2026, 10, 18));
    c.appendPoint({ date: local(2026, 11, 19), value: 1 });
    expect(sources(c).at(-1)).toBe(+local(2026, 10, 19));
    expect(drawn(c).at(-1)).toBe(+local(2026, 11, 19));
  });

  it('with levels, the rows of the level drawn: hours for TODAY, days for MTD', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(local(2026, 11, 18, 11, 21));
    const c = ts({ timeframeAnchor: 'now', compare: 'previousPeriod' }).setData({
      hour: hours(local(2026, 11, 10), 8 * 24 + 12),
      day: days(local, 'local', [2026, 1, 1], [2026, 11, 18]),
    });
    c.setTimeframe('TODAY');
    expect(c.getLevel()).toBe('hour');
    expect(sources(c)).toEqual(hours(local(2026, 11, 17), 12).map(r => +r.date));
    c.setTimeframe('MTD');
    expect(c.getLevel()).toBe('day');
    expect(sources(c)).toEqual(days(local, 'local', [2026, 10, 1], [2026, 10, 18]).map(r => +r.date));
  });
});

// ─── The tooltip ─────────────────────────────────────────────────────────────

describe('the tooltip', () => {
  // 18 November 1,234 against 18 October 1,100; 17 November against a 0
  const rows = days().map(r => ({
    ...r,
    value: +r.date === +local(2026, 11, 18) ? 1234
      : +r.date === +local(2026, 10, 18) ? 1100
        : +r.date === +local(2026, 10, 17) ? 0
          : +r.date === +local(2026, 11, 16) ? 990 : 1000,
  }));
  const make = (o = {}) => {
    const c = ts({ compare: 'previousPeriod', ...o }).setData(rows);
    c.setTimeframe('MTD');
    return c;
  };

  it("the default adds a row: 'Previous period  1,100', under it 'Oct 18 · +12.2%'", () => {
    const c = make();
    hover(c, local(2026, 11, 18));
    expect(tipRows(c)).toEqual(['Nov 18, 2026', 'Series | 1,234', 'Previous period | 1,100 | Oct 18 · +12.2%']);
    // the comparison's mark is dashed, in the tooltip's muted (a role colour)
    const mark = tooltip(c).lastElementChild.querySelector('.rc-tooltip-swatch');
    expect(mark.className).toBe('rc-tooltip-swatch rc-tooltip-swatch--dashed rc-tooltip-muted');
    expect(tooltip(c).querySelector('.rc-tooltip-swatch').className).toBe('rc-tooltip-swatch');   // the main line
    hover(c, local(2026, 11, 16));
    expect(tipRows(c)[2]).toBe('Previous period | 1,000 | Oct 16 · −1.0%');
    hover(c, local(2026, 11, 17));                          // against 0: no change
    expect(tipRows(c)[2]).toBe('Previous period | 0 | Oct 17');
  });

  it("values in the chart's format; a year back names the year; compareName names the row", () => {
    const c = make({ yFormat: 'currency', compare: 'previousYear', compareName: 'Last <year>' });
    hover(c, local(2026, 11, 18));
    expect(tipRows(c)[2]).toBe('Last <year> | $1,000.00 | Nov 18, 2025 · +23.4%');
    expect(tooltip(c).innerHTML).toContain('Last &lt;year&gt;');
  });

  it('tooltipFormat gets info.series and info.compare: { date, value, change }', () => {
    const tip = recorder();
    const c = make({ tooltipFormat: tip.fn, theme: { accent: '#abcdef' } });
    hover(c, local(2026, 11, 18));
    const [row, info] = tip.last();
    expect(row).toMatchObject({ date: local(2026, 11, 18), value: 1234 });
    expect(info).toEqual({
      date: local(2026, 11, 18), value: 1234, color: '#abcdef', level: null,
      series: 'Series', compare: { date: local(2026, 10, 18), value: 1100, change: (1234 - 1100) / 1100 },
    });
    // outside the comparison's rows: none (19 days back from 1–20 September
    // 2025 reaches only the first row, drawn on the 20th)
    c.setView([local(2025, 9, 1), local(2025, 9, 20)]);
    hover(c, local(2025, 9, 10));
    expect(tip.last()[1].compare).toBeNull();
  });

  it('the main series hidden: the crosshair follows the comparison, the row names it', () => {
    const tip = recorder();
    const legend = [{ label: 'Series' }, { label: 'Previous period' }];
    const c = make({ legend });
    click(item(c, 'Series'));
    hover(c, local(2026, 11, 18));
    expect(tipRows(c)).toEqual(['Nov 18, 2026', 'Previous period | 1,100 | Oct 18']);
    // the comparison's muted is a role colour: not inline, the tooltip's muted
    const mark = tooltip(c).querySelector('.rc-tooltip-swatch');
    expect(mark.getAttribute('style')).toBeNull();
    expect(mark.classList.contains('rc-tooltip-muted')).toBe(true);

    const own = make({ legend, tooltipFormat: tip.fn });
    click(item(own, 'Series'));
    hover(own, local(2026, 11, 18));
    const [row, info] = tip.last();
    expect(row).toMatchObject({ date: local(2026, 11, 18), value: 1100 });
    expect(info).toEqual({
      date: local(2026, 11, 18), value: 1100, color: '#666666', level: null,
      series: 'Previous period', compare: { date: local(2026, 10, 18), value: 1100, change: null },
    });
  });

  it('over a gap of the main series: "No data", and the comparison beneath', () => {
    const holed = rows.map(r => (+r.date === +local(2026, 11, 18) ? { ...r, value: null } : r));
    const tip = recorder();
    const c = ts({ compare: 'previousPeriod', gaps: 'break', tooltipFormat: tip.fn }).setData(holed);
    c.setTimeframe('MTD');
    hover(c, local(2026, 11, 18));
    expect(tipRows(c)).toEqual(['Nov 18, 2026', 'Series | No data', 'Previous period | 1,100 | Oct 18']);
    expect(tip.fn).not.toHaveBeenCalled();
  });

  it('hourly rows: the hour, without the year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(local(2026, 11, 18, 11, 21));
    const c = ts({ timeframeAnchor: 'now', compare: 'previousPeriod' })
      .setData(hours(local(2026, 11, 17), 36, (d, i) => 100 + i));
    c.setTimeframe('TODAY');
    hover(c, local(2026, 11, 18, 11));
    expect(tipRows(c)).toEqual(['Nov 18, 2026, 11:00', 'Series | 135', 'Previous period | 111 | Nov 17, 11:00 · +21.6%']);
  });
});
