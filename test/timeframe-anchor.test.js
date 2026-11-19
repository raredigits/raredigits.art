// The timeframe anchor (RC-001, analytics spec §3 with owner answer 2 А):
// timeframeAnchor 'dataEnd' (the default, the rule before) | 'now' | a date
// is the end every timeframe counts back from, and every window ends at it.
// New keys TODAY, WTD, MTD and nH; weekStart (Monday by default, §2.1).
// With 'now' or a date past the data the full extent — ALL, the zoom, the
// navigator — runs on to the anchor. "Now" is read once per data or
// selection change (setData, appendPoint, setTimeframe, a button click) and
// reused by the renders in between, so the lit button stays lit across a
// resize. Every class with timeframes takes it: Line, DualAxes, TimeSeries,
// the dated Bar, MapFlow and Graph's flow view.
//
// Dates are local, built with the local Date constructor, or UTC with
// Date.UTC for the 'UTC' zone, and kept clear of DST changes: each
// expectation holds in every TZ run. The DST days are in
// timeframe-anchor-dst.test.js, which sets its own zones. Only Date is faked
// (vi.useFakeTimers({ toFake: ['Date'] })): the charts' frames and timers run
// as usual.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as d3 from 'd3';
import { resolveTimeframeExtent } from '../assets/charts/src/core/utils.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { mount, track, setGeometry } from './helpers.js';

const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const utc = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi));
const HOUR = 36e5;
const ms = extent => extent?.map(Number) ?? null;

// ─── resolveTimeframeExtent: the keys ──────────────────────────────────────

describe.each([['local', local], ['UTC', utc]])('resolveTimeframeExtent, %s zone', (zone, D) => {
  // Wednesday 12 June 2024, 11:21; the data from 1 January to 09:00 that day
  const A = D(2024, 6, 12, 11, 21);
  const dataEnd = D(2024, 6, 12, 9);
  const full = [D(2024, 1, 1), A];                  // the full extent, run on to A
  const win = (key, o = {}) => ms(resolveTimeframeExtent(key, full, undefined, zone, { anchor: A, ...o }));

  it('TODAY, WTD, MTD and YTD run from the start of A\'s day, week, month and year to A', () => {
    expect(win('TODAY')).toEqual(ms([D(2024, 6, 12), A]));
    expect(win('WTD')).toEqual(ms([D(2024, 6, 10), A]));          // Monday
    expect(win('MTD')).toEqual(ms([D(2024, 6, 1), A]));
    expect(win('YTD')).toEqual(ms([D(2024, 1, 1), A]));
  });

  it('nH is real hours back from A; nD / nW / nM / nY calendar steps', () => {
    expect(win('24H')).toEqual(ms([new Date(+A - 24 * HOUR), A]));
    expect(win('2H')).toEqual(ms([D(2024, 6, 12, 9, 21), A]));
    expect(win('7D')).toEqual(ms([D(2024, 6, 5, 11, 21), A]));
    expect(win('1W')).toEqual(ms([D(2024, 6, 5, 11, 21), A]));
    expect(win('1M')).toEqual(ms([D(2024, 5, 12, 11, 21), A]));
  });

  it('a window that starts before the data starts at the data\'s start; ALL / MAX are the full extent', () => {
    expect(win('1Y')).toEqual(ms(full));
    expect(win('ALL')).toEqual(ms(full));
    expect(win('MAX')).toEqual(ms(full));
    const late = [D(2024, 6, 12, 8), A];
    expect(ms(resolveTimeframeExtent('TODAY', late, undefined, zone, { anchor: A }))).toEqual(ms(late));
  });

  it('weekStart: Monday by default, Sunday, any day name or number', () => {
    expect(win('WTD', { weekStart: 0 })).toEqual(ms([D(2024, 6, 9), A]));
    expect(win('WTD', { weekStart: 'sunday' })).toEqual(ms([D(2024, 6, 9), A]));
    expect(win('WTD', { weekStart: 'Saturday' })).toEqual(ms([D(2024, 6, 8), A]));
    expect(win('WTD', { weekStart: 3 })).toEqual(ms([D(2024, 6, 12), A]));   // Wednesday: A's own day
    expect(win('WTD', { weekStart: 'monday' })).toEqual(ms([D(2024, 6, 10), A]));
  });

  it('the keys are case-insensitive', () => {
    expect(win('today')).toEqual(win('TODAY'));
    expect(win(' Wtd ')).toEqual(win('WTD'));
    expect(win('24h')).toEqual(win('24H'));
    expect(win({ key: 'mtd', label: 'Month' })).toEqual(win('MTD'));
  });

  it('an anchor inside the full extent: every window ends at A, ALL is still the whole extent', () => {
    const wide = [D(2023, 6, 1), D(2025, 2, 1)];
    const at = key => ms(resolveTimeframeExtent(key, wide, undefined, zone, { anchor: A }));
    expect(at('YTD')).toEqual(ms([D(2024, 1, 1), A]));
    expect(at('TODAY')).toEqual(ms([D(2024, 6, 12), A]));
    expect(at('2D')).toEqual(ms([D(2024, 6, 10, 11, 21), A]));
    expect(at('ALL')).toEqual(ms(wide));
  });

  it('without an anchor the windows end at the full extent\'s end, as before RC-001', () => {
    const data = [D(2024, 1, 1), dataEnd];
    const plain = key => ms(resolveTimeframeExtent(key, data, undefined, zone));
    expect(plain('TODAY')).toEqual(ms([D(2024, 6, 12), dataEnd]));
    expect(plain('6H')).toEqual(ms([D(2024, 6, 12, 3), dataEnd]));
    expect(plain('1M')).toEqual(ms([D(2024, 5, 12, 9), dataEnd]));
    expect(plain('YTD')).toEqual(ms([D(2024, 1, 1), dataEnd]));
  });

  it('an anchor before the data, or a key it does not know: null', () => {
    const data = [D(2024, 1, 1), dataEnd];
    expect(resolveTimeframeExtent('TODAY', data, undefined, zone, { anchor: D(2023, 6, 1) })).toBeNull();
    expect(resolveTimeframeExtent('TOMORROW', full, undefined, zone, { anchor: A })).toBeNull();
    expect(resolveTimeframeExtent('5X', full, undefined, zone, { anchor: A })).toBeNull();
    expect(resolveTimeframeExtent('H', full, undefined, zone, { anchor: A })).toBeNull();
  });
});

// ─── The charts ────────────────────────────────────────────────────────────

const NOW = () => local(2024, 6, 12, 11, 21);       // Wednesday
// hourly rows from Monday 10 June 00:00 to Wednesday 12 June 09:00
const hourly = (to = local(2024, 6, 12, 9)) => {
  const rows = [];
  for (let t = +local(2024, 6, 10); t <= +to; t += HOUR) rows.push({ date: new Date(t), value: 10 + (rows.length % 7) });
  return rows;
};
const pressed = c => [...c.container.querySelectorAll('.rc-range-btn:not(.rc-scale-btn)')]
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
const button = (c, label) => [...c.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === label);
const clock = date => vi.setSystemTime(date);

beforeEach(() => {
  setGeometry({ width: 800, height: 400 });
  vi.useFakeTimers({ toFake: ['Date'] });
  clock(NOW());
});
afterEach(() => vi.useRealTimers());

const ts = (o = {}) => track(new TimeSeries(mount(null), { timeframes: ['TODAY', 'WTD', '24H', 'ALL'], ...o }));

describe('TimeSeries: timeframeAnchor \'now\'', () => {
  it('the windows end now, past the data; the full extent and the axis run on to now', () => {
    const c = ts({ timeframeAnchor: 'now' }).setData(hourly());
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));   // ALL: the data's start to now
    expect(pressed(c)).toEqual(['ALL']);
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
    expect(ms(c.xScale.domain())).toEqual(ms([local(2024, 6, 12), NOW()]));
    expect(pressed(c)).toEqual(['TODAY']);
    c.setTimeframe('24H');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 11, 11, 21), NOW()]));
    c.setTimeframe('WTD');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));
  });

  it('"now" holds across renders and a resize: the lit button stays lit', () => {
    const c = ts({ timeframeAnchor: 'now' }).setData(hourly());
    c.setTimeframe('TODAY');
    clock(local(2024, 6, 12, 11, 40));
    c.render();
    c._onResize();
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
    expect(pressed(c)).toEqual(['TODAY']);
    expect(c.container.querySelector('.rc-range-btn.active')?.textContent).toBe('TODAY');
  });

  it('a defaultTimeframe stays lit across a resize too', () => {
    const c = ts({ timeframeAnchor: 'now', defaultTimeframe: 'TODAY' }).setData(hourly());
    expect(pressed(c)).toEqual(['TODAY']);
    clock(local(2024, 6, 12, 14));
    c._onResize();
    expect(pressed(c)).toEqual(['TODAY']);
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
  });

  it('a button click, setTimeframe, setData and appendPoint read "now" anew', () => {
    const c = ts({ timeframeAnchor: 'now' }).setData(hourly());
    c.setTimeframe('TODAY');
    clock(local(2024, 6, 12, 11, 40));
    button(c, 'TODAY').click();
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 11, 40)]));
    clock(local(2024, 6, 12, 12));
    c.setTimeframe('TODAY');
    expect(c.getView()[1]).toEqual(local(2024, 6, 12, 12));
    clock(local(2024, 6, 12, 12, 30));
    c.setData(hourly());                                   // the selected step re-applies to the new "now"
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 12, 30)]));
    expect(pressed(c)).toEqual(['TODAY']);
    clock(local(2024, 6, 12, 13));
    c.appendPoint({ date: local(2024, 6, 12, 10), value: 3 });
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 13)]));
  });

  it('setView, the brush and the zoom do not read it: they move within the extent of the last reading', () => {
    const c = ts({ timeframeAnchor: 'now', navigator: true }).setData(hourly());
    clock(local(2024, 6, 12, 15));
    c.setView([local(2024, 6, 11), local(2024, 6, 13)]);
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 11), NOW()]));   // clamped to the old "now"
    // the zoom, all the way out: the whole widened extent
    // (jsdom has no svg viewBox: the zoom gets its extent, as in timeframes.test.js)
    c.svg.call(c._zoom.extent([[0, 0], [c.width, c.height]]).transform, d3.zoomIdentity);
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));
    expect(pressed(c)).toEqual(['ALL']);
  });

  it('the navigator spans the widened extent', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    ts({ timeframeAnchor: 'now', navigator: true }).setData(hourly());
    const [rows, , { extent }] = toStrip.mock.calls.at(-1);
    expect(ms(extent)).toEqual(ms([local(2024, 6, 10), NOW()]));
    expect(+rows.at(-1).date).toBe(+local(2024, 6, 12, 9));          // the strip draws the rows as they are
  });

  it('a step that does not resolve leaves the reading as it was', () => {
    const c = ts({ timeframeAnchor: 'now', timeframes: ['TODAY', { key: 'old', range: [local(2020, 1, 1), local(2020, 2, 1)] }] })
      .setData(hourly());
    c.setTimeframe('TODAY');
    clock(local(2024, 6, 12, 16));
    c.setTimeframe('old');                                 // misses the data: nothing changes
    c._onResize();
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
    expect(pressed(c)).toEqual(['TODAY']);
  });

  it('data past now: the windows end now, ALL keeps the data\'s end', () => {
    const c = ts({ timeframeAnchor: 'now' }).setData(hourly(local(2024, 6, 13, 6)));
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), local(2024, 6, 13, 6)]));
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
  });

  it('weekStart: WTD from Sunday; a value that names no day warns once and weeks start on Monday', () => {
    const sun = ts({ timeframeAnchor: 'now', weekStart: 'sunday' }).setData(hourly(local(2024, 6, 12, 9)).concat({ date: local(2024, 6, 8), value: 1 }));
    sun.setTimeframe('WTD');
    expect(ms(sun.getView())).toEqual(ms([local(2024, 6, 9), NOW()]));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const odd = ts({ timeframeAnchor: 'now', weekStart: 'funday' }).setData(hourly());
    odd.setTimeframe('WTD');
    odd.setTimeframe('WTD');
    expect(ms(odd.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));
    expect(warn.mock.calls.filter(([m]) => /weekStart "funday"/.test(m))).toHaveLength(1);
  });
});

describe('TimeSeries: the other anchors', () => {
  it('\'dataEnd\' (the default, in any case): the windows end at the last row and the clock does not matter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const o of [{}, { timeframeAnchor: 'dataEnd' }, { timeframeAnchor: 'DATAEND' }]) {
      const c = ts(o).setData(hourly());
      expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), local(2024, 6, 12, 9)]));
      c.setTimeframe('TODAY');
      expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 9)]));
      clock(local(2024, 6, 20));
      c.setTimeframe('TODAY');
      expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 9)]));
      clock(NOW());
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('\'now\' in any case', () => {
    const c = ts({ timeframeAnchor: ' Now ' }).setData(hourly());
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));
    clock(local(2024, 6, 12, 12));
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 12)]));
  });

  it('a fixed date inside the data: the windows end there, ALL is the data', () => {
    const c = ts({ timeframeAnchor: local(2024, 6, 11, 18) }).setData(hourly());
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), local(2024, 6, 12, 9)]));
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 11), local(2024, 6, 11, 18)]));
    clock(local(2024, 7, 1));
    c.setTimeframe('24H');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10, 18), local(2024, 6, 11, 18)]));
  });

  it('a fixed date past the data, as a string or epoch ms: the full extent runs on to it', () => {
    const iso = ts({ timeframeAnchor: '2024-06-13T06:00' }).setData(hourly());
    expect(ms(iso.getView())).toEqual(ms([local(2024, 6, 10), local(2024, 6, 13, 6)]));
    const epoch = ts({ timeframeAnchor: +local(2024, 6, 13, 6) }).setData(hourly());
    epoch.setTimeframe('TODAY');
    expect(ms(epoch.getView())).toEqual(ms([local(2024, 6, 13), local(2024, 6, 13, 6)]));
  });

  it('a fixed date in the UTC zone is read in UTC', () => {
    const rows = hourly().map(r => ({ ...r }));
    const c = ts({ timeZone: 'UTC', timeframeAnchor: '2024-06-14T06:00' }).setData(rows);
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([utc(2024, 6, 14), utc(2024, 6, 14, 6)]));
  });

  it('a value that is none of these warns once and counts as \'dataEnd\'', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ timeframeAnchor: 'tomorrow' }).setData(hourly());
    c.setTimeframe('TODAY');
    c.render();
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 9)]));
    const said = warn.mock.calls.filter(([m]) => /timeframeAnchor "tomorrow"/.test(m));
    expect(said).toHaveLength(1);
    expect(said[0][0]).toMatch(/^RareCharts\.TimeSeries: /);
  });
});

describe('TimeSeries: gaps \'zero\' up to the anchor (RC-005 × RC-001)', () => {
  // the last three rows drawn: [hour, 0 for a filled bucket or 'row']
  const tail = c => c._data.slice(-3).map(d => [d.date.getHours(), d.value === 0 ? 0 : 'row']);

  it('data to 09:00 at 11:21 gives zeros at 10:00 and 11:00; the next reading adds 12:00', () => {
    const c = ts({ timeframeAnchor: 'now', gaps: 'zero' }).setData(hourly());
    expect(tail(c)).toEqual([[9, 'row'], [10, 0], [11, 0]]);
    expect(c.container.querySelector('path.rc-ts-line').getAttribute('d')).not.toMatch(/NaN/);
    clock(local(2024, 6, 12, 12, 5));
    c._onResize();                                         // a render keeps the reading
    expect(tail(c)).toEqual([[9, 'row'], [10, 0], [11, 0]]);
    button(c, 'TODAY').click();
    expect(tail(c)).toEqual([[10, 0], [11, 0], [12, 0]]);
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), local(2024, 6, 12, 12, 5)]));
  });

  it('a fixed date fills up to its bucket; \'dataEnd\' fills nothing after the last row', () => {
    const fixed = ts({ timeframeAnchor: local(2024, 6, 12, 10, 30), gaps: 'zero' }).setData(hourly());
    expect(tail(fixed)).toEqual([[8, 'row'], [9, 'row'], [10, 0]]);
    const plain = ts({ gaps: 'zero' }).setData(hourly());
    expect(tail(plain)).toEqual([[7, 'row'], [8, 'row'], [9, 'row']]);
  });

  it('a button click under \'dataEnd\' keeps the rows drawn', () => {
    const c = ts({ gaps: 'zero' }).setData(hourly());
    const before = c._data;
    button(c, 'TODAY').click();
    expect(c._data).toBe(before);
  });

  it('weekStart cuts the week buckets the gaps are counted in', () => {
    // weekly rows on Sundays, then one on Monday 10 June: Sunday 9 June is a
    // missing week from Monday, and the same week as 10 June from Sunday
    const rows = [local(2024, 5, 26), local(2024, 6, 2), local(2024, 6, 10)].map((date, i) => ({ date, value: i + 1 }));
    const days = c => c._data.map(d => d.date.getDate());
    expect(days(ts({ gaps: 'zero', interval: 'week' }).setData(rows))).toEqual([26, 2, 9, 10]);
    expect(days(ts({ gaps: 'zero', interval: 'week', weekStart: 'sunday' }).setData(rows))).toEqual([26, 2, 10]);
  });
});

// Line, DualAxes and the dated Bar: the same view rules through the base
// Chart, with their own data extent.
const TIME_CHARTS = [
  ['Line', o => new Line(mount(null), { animate: false, ...o }), rows => rows],
  ['DualAxes', o => new DualAxes(mount(null), { animate: false, ...o }), rows => [{ name: 's', values: rows }]],
  ['Bar (dates)', o => new Bar(mount(null), { animate: false, ...o }), rows => rows],
];

describe.each(TIME_CHARTS)('%s: the anchor', (_name, make, shape) => {
  const chart = o => track(make({ timeframes: ['TODAY', '24H', 'ALL'], navigator: true, ...o }));

  it('\'now\': TODAY ends now, ALL and the navigator run on to it; a resize keeps the lit button', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    const c = chart({ timeframeAnchor: 'now' }).setData(shape(hourly()));
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 10), NOW()]));
    expect(ms(toStrip.mock.calls.at(-1)[2].extent)).toEqual(ms([local(2024, 6, 10), NOW()]));
    button(c, 'TODAY').click();
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
    clock(local(2024, 6, 12, 12));
    c._onResize();
    expect(pressed(c)).toEqual(['TODAY']);
  });

  it('the default: the windows end at the data\'s end', () => {
    const c = chart().setData(shape(hourly()));
    c.setTimeframe('24H');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 11, 9), local(2024, 6, 12, 9)]));
  });
});

describe('Bar without a date axis: the anchor is ignored', () => {
  it('categorical and horizontal dated bars have no view', () => {
    const cat = track(new Bar(mount(null), { animate: false, timeframes: ['TODAY'], timeframeAnchor: 'now' }))
      .setData([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]);
    expect(cat.getView()).toBeNull();
    cat.setTimeframe('TODAY');
    expect(cat.getView()).toBeNull();
    expect(cat.container.querySelectorAll('rect.rc-bar')).toHaveLength(2);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const flat = track(new Bar(mount(null), { animate: false, orientation: 'horizontal', timeframeAnchor: 'now' }))
      .setData(hourly().slice(0, 3));
    expect(flat.getView()).toBeNull();
    warn.mockRestore();
  });
});

// The relation charts read a fixed anchor as they read a view bound: a year
// is that year's end.
const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
const ties = links => ({ nodes: [{ id: 'A', coords: [1, 1], lane: 'x' }, { id: 'B', coords: [10, 10], lane: 'y' }], links });
const RELATION_CHARTS = [
  ['MapFlow', o => new MapFlow(mount(null), { geoData, ...o })],
  ['Graph flow', o => new Graph(mount(null), { view: 'flow', duration: 0, ...o })],
];

describe.each(RELATION_CHARTS)('%s: the anchor', (_name, make) => {
  const chart = o => track(make({ timeframes: ['TODAY', '5Y', 'ALL'], navigator: true, ...o }));

  it('\'now\': the full extent runs to now and a tie with no end runs on in the strip', () => {
    const toStrip = vi.spyOn(Overview.prototype, 'setData');
    const c = chart({ timeframeAnchor: 'now' }).setData(ties([
      { from: 'A', to: 'B', start: '2024-06-01', end: '2024-06-05' },
      { from: 'B', to: 'A', start: '2024-06-03' },            // still running
    ]));
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 1), NOW()]));
    const [series, , { extent }] = toStrip.mock.calls.at(-1);
    expect(ms(extent)).toEqual(ms([local(2024, 6, 1), NOW()]));
    expect(+series.at(-1).date).toBe(+NOW());
    expect(series.at(-1).value).toBe(1);
    c.setTimeframe('TODAY');
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 12), NOW()]));
    expect(pressed(c)).toEqual(['TODAY']);
    clock(local(2024, 6, 12, 18));
    c.render();
    expect(pressed(c)).toEqual(['TODAY']);
    c.setTimeframe('TODAY');                                // a new reading: the strip runs on to it
    expect(+toStrip.mock.calls.at(-1)[0].at(-1).date).toBe(+local(2024, 6, 12, 18));
  });

  it('a fixed year: the windows end at that year\'s end; the extent stays the ties\'', () => {
    const c = chart({ timeframeAnchor: 2000 }).setData(ties([{ from: 'A', to: 'B', start: 1985, end: 2005 }]));
    const endOf = y => new Date(+local(y + 1, 1, 1) - 1);
    expect(ms(c.getView())).toEqual(ms([local(1985, 1, 1), endOf(2005)]));
    c.setTimeframe('5Y');
    expect(ms(c.getView())).toEqual(ms([new Date(+local(1996, 1, 1) - 1), endOf(2000)]));
  });

  it('the default: the windows end at the ties\' end', () => {
    const c = chart().setData(ties([{ from: 'A', to: 'B', start: 1985, end: 2005 }]));
    c.setTimeframe('5Y');
    expect(c.getView()[1].getFullYear()).toBe(2005);
  });
});
