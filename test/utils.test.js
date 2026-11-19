import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import {
  barValueDomain,
  parseDate,
  byDate,
  extentEquals,
  curveName,
  resolveCurve,
  resolveEase,
  resolveStrokeDash,
  markerPath,
  linearTickValues,
  logTickValues,
  logPaddedDomain,
  normalizeAnnotations,
  annotationRoom,
  motionDuration,
  prefersReducedMotion,
  resolveTimeZone,
  timeKit,
  offsetCalendar,
  calendarMidnight,
} from '../assets/charts/src/core/utils.js';

// core/utils, one describe per helper (S-07: these used to be spread over
// utils, utils-extra and line-yscale).

describe('parseDate', () => {
  it('rejects what is not a readable date instead of passing it on (C-26)', () => {
    // An Invalid Date is an object (truthy) — it used to slip past `d.date &&`
    // filters and crash the Line render; null/false used to become 1970.
    [new Date(NaN), NaN, Infinity, -Infinity, null, undefined, false, true, '', 'not a date']
      .forEach(v => expect(parseDate(v)).toBeNull());
  });
  it('keeps epoch 0 and numeric strings of ISO dates', () => {
    expect(+parseDate(0)).toBe(0);
    expect(parseDate('2026-01-01')).toBeInstanceOf(Date);
  });
  it('passes a Date through unchanged', () => {
    const d = new Date('2026-01-01');
    expect(parseDate(d)).toBe(d);
  });
  it('parses an ISO string: a date-only one is that day\'s local midnight (T-10)', () => {
    expect(+parseDate('2026-01-01')).toBe(+new Date(2026, 0, 1));
    expect(+parseDate('2026-01-01T12:00:00Z')).toBe(Date.UTC(2026, 0, 1, 12));
  });
  it('returns null for an unparseable value', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });
  // The zone table itself, under fixed zones: test/time-zones.test.js.
  it('a calendar string with a field out of range is no date, in either zone (T-10)', () => {
    ['2024-13-01', '2024-00-10', '2024-03-32', '2024-03-00', '2024-03-01T25:00', '2024-03-01T24:01',
      '2024-03-01T12:60', '2024-03-01T12:00:60']
      .forEach(v => {
        expect(parseDate(v), v).toBeNull();
        expect(parseDate(v, 'UTC'), v).toBeNull();
      });
  });
  it('31 February runs on into March and 24:00 is the next midnight, as Date has it (T-10)', () => {
    expect(+parseDate('2024-02-31', 'UTC')).toBe(Date.UTC(2024, 2, 2));
    expect(+parseDate('2024-03-01T24:00', 'UTC')).toBe(Date.UTC(2024, 2, 2));
    expect(+parseDate('2024-02-31')).toBe(+new Date(2024, 2, 2));
  });
  it('the years 0–99 are those years, not 19xx (T-10)', () => {
    expect(parseDate('0099-03-01', 'UTC').getUTCFullYear()).toBe(99);
    expect(parseDate('0099-03-01').getFullYear()).toBe(99);
    expect(parseDate('+012024-03-01', 'UTC').getUTCFullYear()).toBe(12024);
  });
  it('reads one-digit months and days, \'/\' for \'-\', a space for T and a trimmed string (T-10)', () => {
    const noon = Date.UTC(2024, 2, 1, 12, 30, 15, 250);
    ['2024-03-01T12:30:15.250', '2024-3-1 12:30:15.250', '2024/03/01T12:30:15.250999', ' 2024-03-01 12:30:15,25 ']
      .forEach(v => expect(+parseDate(v, 'UTC'), v).toBe(noon));
    expect(+parseDate('2024-03-01T12:30', 'UTC')).toBe(Date.UTC(2024, 2, 1, 12, 30));
  });
  it('an unknown zone argument reads as local', () => {
    expect(+parseDate('2026-01-01', 'Mars/Olympus')).toBe(+new Date(2026, 0, 1));
  });
});

describe('resolveTimeZone (T-10)', () => {
  it("'UTC' and 'local' in any case; absent is 'local'", () => {
    expect(resolveTimeZone('UTC')).toBe('UTC');
    expect(resolveTimeZone(' utc ')).toBe('UTC');
    expect(resolveTimeZone('local')).toBe('local');
    expect(resolveTimeZone('Local')).toBe('local');
    expect(resolveTimeZone(undefined)).toBe('local');
    expect(resolveTimeZone(null)).toBe('local');
  });
  it('anything else is local, with one hint per value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTimeZone('Europe/Berlin')).toBe('local');
    expect(resolveTimeZone('Europe/Berlin')).toBe('local');
    expect(resolveTimeZone(0)).toBe('local');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts: timeZone "Europe\/Berlin" is not supported/);
  });
});

describe('timeKit (T-10)', () => {
  it("d3's UTC scale, format and intervals for 'UTC'", () => {
    expect(timeKit('UTC')).toMatchObject({ zone: 'UTC', scale: d3.scaleUtc, format: d3.utcFormat, day: d3.utcDay, month: d3.utcMonth, year: d3.utcYear });
  });
  it("d3's local ones for 'local' and by default", () => {
    const local = { zone: 'local', scale: d3.scaleTime, format: d3.timeFormat, day: d3.timeDay, month: d3.timeMonth, year: d3.timeYear };
    expect(timeKit('local')).toMatchObject(local);
    expect(timeKit()).toMatchObject(local);
  });
});

describe('calendarMidnight (RC-006)', () => {
  it("midnight at the start of that day in the zone: the local Date's or Date.UTC's", () => {
    expect(+calendarMidnight(2024, 2, 15, 'local')).toBe(+new Date(2024, 2, 15));
    expect(+calendarMidnight(2024, 2, 15, 'UTC')).toBe(Date.UTC(2024, 2, 15));
    // the epoch's own hour in the zone does not leak in
    expect(calendarMidnight(2024, 2, 15).getHours()).toBe(0);
    expect(calendarMidnight(2024, 2, 15, 'UTC').getUTCHours()).toBe(0);
  });

  it("the 1st of January by default, in local time", () => {
    expect(+calendarMidnight(2024)).toBe(+new Date(2024, 0, 1));
    expect(+calendarMidnight(2024, 5)).toBe(+new Date(2024, 5, 1));
    expect(+calendarMidnight(2024, 0, 1, undefined)).toBe(+new Date(2024, 0, 1));
  });

  it('a month or day out of range runs on, as Date has it', () => {
    expect(+calendarMidnight(2024, 12, 1, 'UTC')).toBe(Date.UTC(2025, 0, 1));
    expect(+calendarMidnight(2024, -1, 1, 'UTC')).toBe(Date.UTC(2023, 11, 1));
    expect(+calendarMidnight(2024, 2, 0, 'UTC')).toBe(Date.UTC(2024, 1, 29));
    expect(+calendarMidnight(2024, 12)).toBe(+new Date(2025, 0, 1));
  });

  it('years 0–99 stay themselves, in both zones', () => {
    const local = calendarMidnight(14);
    expect([local.getFullYear(), local.getMonth(), local.getDate(), local.getHours()]).toEqual([14, 0, 1, 0]);
    expect(calendarMidnight(99, 11, 31, 'UTC').toISOString()).toBe('0099-12-31T00:00:00.000Z');
  });

  it('a new Date each time', () => {
    expect(calendarMidnight(2024, 0, 1, 'UTC')).not.toBe(calendarMidnight(2024, 0, 1, 'UTC'));
  });
});

describe('offsetCalendar (T-10)', () => {
  const U = (...a) => new Date(Date.UTC(...a));
  const iso = d => d.toISOString();

  it('day and week steps keep the wall time', () => {
    expect(iso(offsetCalendar(U(2024, 2, 1, 15), 'D', -1, 'UTC'))).toBe('2024-02-29T15:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 2, 1, 15), 'W', -2, 'UTC'))).toBe('2024-02-16T15:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 1, 25), 'D', 7, 'UTC'))).toBe('2024-03-03T00:00:00.000Z');
  });
  it('a month step keeps the day of the month, or clamps it to the month\'s last day', () => {
    expect(iso(offsetCalendar(U(2024, 2, 15, 9), 'M', -1, 'UTC'))).toBe('2024-02-15T09:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 2, 31, 9), 'M', -1, 'UTC'))).toBe('2024-02-29T09:00:00.000Z');
    expect(iso(offsetCalendar(U(2023, 2, 31), 'M', -1, 'UTC'))).toBe('2023-02-28T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 4, 31), 'M', -3, 'UTC'))).toBe('2024-02-29T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 6, 31), 'M', -1, 'UTC'))).toBe('2024-06-30T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 0, 31), 'M', 1, 'UTC'))).toBe('2024-02-29T00:00:00.000Z');
  });
  it('a month step crosses years both ways', () => {
    expect(iso(offsetCalendar(U(2024, 0, 31), 'M', -2, 'UTC'))).toBe('2023-11-30T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 1, 10), 'M', -14, 'UTC'))).toBe('2022-12-10T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2023, 10, 30), 'M', 3, 'UTC'))).toBe('2024-02-29T00:00:00.000Z');
  });
  it('a year step clamps 29 February to the 28th', () => {
    expect(iso(offsetCalendar(U(2024, 1, 29), 'Y', -1, 'UTC'))).toBe('2023-02-28T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 1, 29), 'Y', -4, 'UTC'))).toBe('2020-02-29T00:00:00.000Z');
    expect(iso(offsetCalendar(U(2024, 5, 20), 'Y', -2, 'UTC'))).toBe('2022-06-20T00:00:00.000Z');
  });
  it('local steps work on the local calendar', () => {
    expect(+offsetCalendar(new Date(2024, 2, 31, 10), 'M', -1)).toBe(+new Date(2024, 1, 29, 10));
    expect(+offsetCalendar(new Date(2024, 1, 29), 'Y', -1, 'local')).toBe(+new Date(2023, 1, 28));
    expect(+offsetCalendar(new Date(2024, 2, 1), 'D', -1)).toBe(+new Date(2024, 1, 29));
  });
  it('returns a new Date, and null for another unit', () => {
    const d = U(2024, 2, 31);
    expect(offsetCalendar(d, 'M', -1, 'UTC')).not.toBe(d);
    expect(+d).toBe(Date.UTC(2024, 2, 31));
    expect(offsetCalendar(d, 'Q', -1, 'UTC')).toBeNull();
  });
});

describe('extentEquals', () => {
  it('is true for equal date pairs', () => {
    expect(extentEquals([new Date(0), new Date(10)], [new Date(0), new Date(10)])).toBe(true);
  });
  it('is false when an endpoint differs', () => {
    expect(extentEquals([new Date(0), new Date(10)], [new Date(0), new Date(11)])).toBe(false);
  });
  it('is false for malformed input', () => {
    expect(extentEquals(null, [new Date(0), new Date(10)])).toBe(false);
  });
});

describe('resolveCurve', () => {
  it('maps known curve names to their d3 factory', () => {
    expect(resolveCurve('monotone')).toBe(d3.curveMonotoneX);
    expect(resolveCurve('basis')).toBe(d3.curveBasis);
    expect(resolveCurve('step')).toBe(d3.curveStep);
    expect(resolveCurve('linear')).toBe(d3.curveLinear);
  });
  it('falls back to linear for an unknown name', () => {
    expect(resolveCurve('nope')).toBe(d3.curveLinear);
  });
  it('returns a usable cardinal curve with tension applied', () => {
    expect(typeof resolveCurve('cardinal', 0.5)).toBe('function');
  });

  // D-09: TimeSeries draws an unknown name as monotone, Line and DualAxes as linear.
  it('an unknown name draws the fallback curve; a known name ignores it', () => {
    expect(resolveCurve('nope', 0, 'monotone')).toBe(d3.curveMonotoneX);
    expect(resolveCurve(undefined, 0, 'step')).toBe(d3.curveStep);
    expect(resolveCurve('basis', 0, 'monotone')).toBe(d3.curveBasis);
    expect(resolveCurve('linear', 0, 'monotone')).toBe(d3.curveLinear);
  });
  it('names off the list — Object.prototype keys too — are unknown', () => {
    expect(resolveCurve('toString', 0, 'monotone')).toBe(d3.curveMonotoneX);
    expect(resolveCurve('constructor')).toBe(d3.curveLinear);
  });
  it('an unknown fallback is linear, never a loop', () => {
    expect(resolveCurve('nope', 0, 'nope either')).toBe(d3.curveLinear);
    expect(resolveCurve('nope', 0, null)).toBe(d3.curveLinear);
  });
  it('a cardinal fallback takes the tension', () => {
    const path = c => d3.line().curve(c)([[0, 0], [10, 10], [20, 0], [30, 10]]);
    expect(path(resolveCurve('nope', 0.5, 'cardinal'))).toBe(path(d3.curveCardinal.tension(0.5)));
    expect(path(resolveCurve('nope', 0.5, 'cardinal'))).not.toBe(path(d3.curveCardinal));
  });
});

describe('curveName (RC-080)', () => {
  const names = ['linear', 'monotone', 'basis', 'cardinal', 'step', 'stepBefore', 'stepAfter'];
  it('a known name is kept, whatever the fallback', () => {
    for (const n of names) {
      expect(curveName(n)).toBe(n);
      expect(curveName(n, 'monotone')).toBe(n);
    }
  });
  it('an unknown or missing name takes the fallback', () => {
    expect(curveName('smooth', 'monotone')).toBe('monotone');
    expect(curveName(undefined, 'monotone')).toBe('monotone');
    expect(curveName(null, 'step')).toBe('step');
    expect(curveName('nope')).toBe('linear');
  });
  it('names off the list — Object.prototype keys, other cases — are unknown', () => {
    expect(curveName('toString', 'monotone')).toBe('monotone');
    expect(curveName('__proto__', 'monotone')).toBe('monotone');
    expect(curveName('Monotone', 'basis')).toBe('basis');
  });
  it('an unknown fallback is linear', () => {
    expect(curveName('nope', 'nope either')).toBe('linear');
    expect(curveName('nope', null)).toBe('linear');
    expect(curveName('nope', 'constructor')).toBe('linear');
  });
  it('resolveCurve draws the name curveName settles on', () => {
    const path = c => d3.line().curve(c)([[0, 0], [10, 10], [20, 0], [30, 10]]);
    for (const n of [...names, 'toString', 'nope']) {
      expect(path(resolveCurve('smooth', 0.5, n))).toBe(path(resolveCurve(curveName('smooth', n), 0.5)));
      expect(path(resolveCurve(n, 0.5, 'basis'))).toBe(path(resolveCurve(curveName(n, 'basis'), 0.5)));
    }
  });
});

describe('annotationRoom (D-09)', () => {
  const ann = [{ date: '2025-02-01', label: 'Event' }];

  it('no annotations: no room, the default label height', () => {
    expect(annotationRoom({})).toEqual({ annotations: [], labelHeight: 22, top: 0 });
    expect(annotationRoom()).toEqual({ annotations: [], labelHeight: 22, top: 0 });
  });

  it('annotations to label keep the label height plus a 4px gap', () => {
    const room = annotationRoom({ annotations: ann });
    expect(room.top).toBe(26);
    expect(room.annotations).toEqual(normalizeAnnotations(ann));
    expect(annotationRoom({ annotations: ann, annotationLabelHeight: 30 })).toMatchObject({ labelHeight: 30, top: 34 });
    expect(annotationRoom({ annotations: ann, annotationLabelHeight: 0 }).top).toBe(4);
  });

  it('only valid annotations count', () => {
    expect(annotationRoom({ annotations: [{ date: 'nope' }, null] })).toMatchObject({ annotations: [], top: 0 });
  });

  it('labelled: false keeps no room but still reads the annotations', () => {
    const room = annotationRoom({ annotations: ann, annotationLabelHeight: 30 }, false);
    expect(room).toMatchObject({ labelHeight: 30, top: 0 });
    expect(room.annotations).toHaveLength(1);
  });

  it("reads the dates in the chart's timeZone (T-10)", () => {
    expect(+annotationRoom({ annotations: ann }).annotations[0].date).toBe(+new Date(2025, 1, 1));
    expect(+annotationRoom({ annotations: ann, timeZone: 'UTC' }).annotations[0].date).toBe(Date.UTC(2025, 1, 1));
  });
});

describe('resolveEase', () => {
  it('maps known easings', () => {
    expect(resolveEase('cubicInOut')).toBe(d3.easeCubicInOut);
    expect(resolveEase('linear')).toBe(d3.easeLinear);
  });
  it('defaults to cubicOut', () => {
    expect(resolveEase('cubicOut')).toBe(d3.easeCubicOut);
    expect(resolveEase(undefined)).toBe(d3.easeCubicOut);
  });
});

describe('resolveStrokeDash', () => {
  it('maps named presets', () => {
    expect(resolveStrokeDash('dashed')).toBe('6,4');
    expect(resolveStrokeDash('dotted')).toBe('2,3');
  });
  it('treats solid/empty as no dash', () => {
    expect(resolveStrokeDash('solid')).toBeNull();
    expect(resolveStrokeDash(null)).toBeNull();
  });
  it('joins an array', () => {
    expect(resolveStrokeDash([4, 3])).toBe('4,3');
  });
  it('passes a raw dash-array string through', () => {
    expect(resolveStrokeDash('5,4')).toBe('5,4');
    expect(resolveStrokeDash('4 3')).toBe('4 3');
  });
  it('rejects a non-numeric string', () => {
    expect(resolveStrokeDash('abc')).toBeNull();
  });
});

describe('markerPath', () => {
  it('returns null for circle (rendered natively)', () => {
    expect(markerPath('circle', 4)).toBeNull();
  });
  it('returns an SVG path for other shapes', () => {
    for (const shape of ['square', 'diamond', 'triangle', 'cross']) {
      expect(markerPath(shape, 4)).toMatch(/^M/);
    }
  });
});

describe('linearTickValues', () => {
  it('keeps every tick inside the range (1Y case: max 193 no longer pulls the axis to 400)', () => {
    const ticks = linearTickValues(49.4, 203.6, 4);
    expect(ticks).toEqual([50, 100, 150, 200]);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(203.6);
  });

  it('returns at least two ticks for a narrow range', () => {
    expect(linearTickValues(100.1, 100.2, 4).length).toBeGreaterThanOrEqual(2);
  });
});

describe('logTickValues', () => {
  it('uses powers of ten across decades', () => {
    expect(logTickValues(5, 300000, 4)).toEqual([10, 100, 1000, 10000, 100000]);
  });

  it('thins powers when there are many decades', () => {
    const ticks = logTickValues(1, 1e12, 4);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0]).toBe(1);
  });

  it('falls back to 1-2-5 steps inside one decade boundary', () => {
    expect(logTickValues(15, 600, 4)).toEqual([20, 50, 100, 200, 500]);
  });

  it('falls back to linear steps for a very narrow domain', () => {
    const ticks = logTickValues(120, 180, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    ticks.forEach(v => expect(v >= 120 && v <= 180).toBe(true));
  });

  it('returns nothing for a non-positive domain', () => {
    expect(logTickValues(0, 10, 4)).toEqual([]);
  });
});

describe('logPaddedDomain', () => {
  it('pads by the same factor on both ends', () => {
    const [lo, hi] = logPaddedDomain(10, 1000);
    expect(10 / lo).toBeCloseTo(hi / 1000, 9);
    expect(10 / lo).toBeCloseTo(Math.pow(100, 0.08), 9);
  });

  it('pads flat data', () => {
    const [lo, hi] = logPaddedDomain(50, 50);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(50);
  });
});

describe('normalizeAnnotations', () => {
  it('returns [] for non-arrays', () => {
    expect(normalizeAnnotations(null)).toEqual([]);
  });
  it('drops invalid entries', () => {
    expect(normalizeAnnotations([{ date: 'nope' }, {}])).toEqual([]);
  });
  it('reads point and range dates in the zone it is given, local by default (T-10)', () => {
    const list = [{ date: '2024-03-01' }, { from: '2024-03-02', to: '2024-03' }];
    const [p, r] = normalizeAnnotations(list);
    expect([+p.date, +r.from, +r.to]).toEqual([+new Date(2024, 2, 1), +new Date(2024, 2, 1), +new Date(2024, 2, 2)]);
    const [pu, ru] = normalizeAnnotations(list, 'UTC');
    expect([+pu.date, +ru.from, +ru.to]).toEqual([Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 1), Date.UTC(2024, 2, 2)]);
  });
  it('orders a horizontal band low→high regardless of input order', () => {
    const [band] = normalizeAnnotations([{ yFrom: 9, yTo: 2 }]);
    expect(band.kind).toBe('hRange');
    expect(band.yFrom).toBe(2);
    expect(band.yTo).toBe(9);
  });
  it('normalizes a vertical point from a date', () => {
    const [pt] = normalizeAnnotations([{ date: '2026-01-01', label: 'launch' }]);
    expect(pt.kind).toBe('point');
    expect(pt.label).toBe('launch');
  });
  it('normalizes a horizontal line { value } with defaults', () => {
    const [a] = normalizeAnnotations([{ value: 100 }]);
    expect(a.kind).toBe('hPoint');
    expect(a.value).toBe(100);
    expect(a.axis).toBe('y1');           // default axis
    expect(a.strokeDash).toBe('dashed'); // default dash
    expect(a.labelPosition).toBe('left');
  });
  it('respects axis y2 and labelPosition right', () => {
    const [a] = normalizeAnnotations([{ value: 5, axis: 'y2', labelPosition: 'right' }]);
    expect(a.axis).toBe('y2');
    expect(a.labelPosition).toBe('right');
  });
  it('orders a vertical range from→to chronologically', () => {
    const [a] = normalizeAnnotations([{ from: '2026-06-01', to: '2026-01-01' }]);
    expect(a.kind).toBe('range');
    expect(+a.from).toBeLessThan(+a.to);
  });
  it('applies the default fillOpacity and honours an explicit one', () => {
    const [def] = normalizeAnnotations([{ from: '2026-01-01', to: '2026-02-01' }]);
    expect(def.fillOpacity).toBe(0.08);
    const [custom] = normalizeAnnotations([{ yFrom: 1, yTo: 2, fillOpacity: 0.3 }]);
    expect(custom.fillOpacity).toBe(0.3);
  });
  it('drops a horizontal line with a non-finite value', () => {
    expect(normalizeAnnotations([{ value: 'x' }])).toEqual([]);
  });
});

describe('motion gating', () => {
  it('prefersReducedMotion is false without matchMedia (jsdom default)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
  it('motionDuration returns the duration when motion is allowed', () => {
    expect(motionDuration(500)).toBe(500);
  });
  it('with prefers-reduced-motion: reduce, motionDuration returns 0', () => {
    const query = vi.fn(q => ({ matches: q === '(prefers-reduced-motion: reduce)', media: q }));
    vi.stubGlobal('matchMedia', query);
    expect(prefersReducedMotion()).toBe(true);
    expect(motionDuration(500)).toBe(0);
    expect(query).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
  it('a matchMedia that does not match leaves the duration alone', () => {
    vi.stubGlobal('matchMedia', q => ({ matches: false, media: q }));
    expect(prefersReducedMotion()).toBe(false);
    expect(motionDuration(500)).toBe(500);
  });
});

describe('byDate', () => {
  it('sorts rows ascending by date (C-07)', () => {
    const rows = [{ date: new Date(3) }, { date: new Date(1) }, { date: new Date(2) }];
    expect(rows.sort(byDate).map(r => +r.date)).toEqual([1, 2, 3]);
  });
});

// Bars grow from zero: the domain keeps 0, gets Line's 8% headroom on each
// side that has bars, and is not rounded up (maintainer, 2026-11-17).
describe('barValueDomain', () => {
  it('a tallest bar of 156k: 168.48k, not the 200k .nice() gave', () => {
    expect(barValueDomain(20000, 156000)).toEqual([0, 168480]);
  });
  it('negative bars hang below zero with the same headroom', () => {
    expect(barValueDomain(-50, 100)).toEqual([-62, 112]);
    expect(barValueDomain(-100, -20)).toEqual([-108, 0]);
  });
  it('a custom pad', () => {
    expect(barValueDomain(0, 100, { pad: 0 })).toEqual([0, 100]);
  });
  it('explicit tick values widen it, never narrow it', () => {
    expect(barValueDomain(0, 156, { tickValues: [0, 100, 200, 300] })).toEqual([0, 300]);
    expect(barValueDomain(0, 156, { tickValues: [50, 100] })).toEqual([0, 168.48]);
    expect(barValueDomain(0, 156, { tickValues: [] })).toEqual([0, 168.48]);
  });
  it('no bars, or all at zero: [0, 1]', () => {
    expect(barValueDomain(undefined, undefined)).toEqual([0, 1]);
    expect(barValueDomain(0, 0)).toEqual([0, 1]);
  });
});
