// Default number and date formats (step 7a): C-30 — linear value axes of
// Line and Bar label their ticks by the tick step, end labels and tooltip
// values take three significant digits; C-31 — TimeSeries picks its date
// format from the span in view; C-21 — DualAxes rounds an auto domain to the
// axis's own tick count.
import { describe, it, expect, vi } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { compactTickFormat, compactValue, spanTimeFormat } from '../assets/charts/src/core/utils.js';
import { mount, track } from './helpers.js';

const texts = (c, sel) => [...c.container.querySelectorAll(sel)].map(n => n.textContent);
const distinct = list => new Set(list).size === list.length;
const DAY = 864e5;

describe('compactTickFormat / compactValue (C-30)', () => {
  const fmt = ticks => ticks.map(compactTickFormat(ticks));

  it('neighbouring ticks never print alike', () => {
    expect(fmt([145, 150, 155, 160])).toEqual(['145', '150', '155', '160']);   // was 150 150 160 160
    expect(fmt([12340, 12345, 12350, 12355, 12360])).toSatisfy(distinct);
  });

  it('zero is "0"; small steps keep their decimals; no milli prefix', () => {
    expect(fmt([0, 1, 2])).toEqual(['0', '1', '2']);
    expect(fmt([-0.5, 0, 0.5, 1])).toEqual(['−0.5', '0', '0.5', '1']);
    expect(fmt([0, 0.25, 0.5, 0.75, 1])).toEqual(['0', '0.25', '0.5', '0.75', '1']);
  });

  it('from 1000 on, one SI prefix for the axis', () => {
    expect(fmt([0, 5000, 10000])).toEqual(['0', '5k', '10k']);             // was 0.0 5.0k 10k
    expect(fmt([0, 500000, 1000000])).toEqual(['0', '0.5M', '1M']);        // was 0.0 500k 1.0M
  });

  it('ticks between round steps get exact labels, not rounded ones', () => {
    expect(fmt([0, 375, 750, 1125, 1500])).toEqual(['0', '0.375k', '0.75k', '1.125k', '1.5k']);
    expect(fmt([0, 30, 60, 90, 120])).toEqual(['0', '30', '60', '90', '120']);
  });

  it('values: three significant digits, SI from 1000', () => {
    expect([0, -0.6, 147.3, 0.123456, 12.5, 1234, 1500, -2500].map(compactValue))
      .toEqual(['0', '−0.6', '147', '0.123', '12.5', '1.23k', '1.5k', '−2.5k']);
  });
});

describe('Line default formats (C-30)', () => {
  const series = values => values.map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));
  const line = (o, values) => track(new Line(mount(null), { animate: false, ...o })).setData(series(values));
  const yTicks = c => texts(c, '.rc-axis-y .tick text');
  const endLabels = c => texts(c, '.rc-end-label');

  it('145…160: one label per tick, no duplicates', () => {
    expect(yTicks(line({}, [145, 150, 160, 152]))).toEqual(['145', '150', '155', '160']);
  });

  it('end label of −0.6 reads "−0.6" (was "−600m"); the zero tick reads "0"', () => {
    const c = line({}, [1, 2.5, -0.6]);
    expect(endLabels(c)).toEqual(['−0.6']);
    expect(yTicks(c)).toEqual(['0', '1', '2']);
  });

  it('end labels and the tooltip take three significant digits, ticks their step', () => {
    let fmt;
    const c = line({ tooltipFormat: ({ points }) => { fmt = points[0].fmt; return ''; } }, [1000, 1100, 1234.56]);
    expect(endLabels(c)).toEqual(['1.23k']);
    c.container.querySelector('rect.rc-overlay')
      .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 2000, clientY: 50 }));
    expect(fmt).toBe('1.23k');
    expect(yTicks(c)).toSatisfy(distinct);
  });

  it('yPrefix / ySuffix still dress the default labels', () => {
    const c = line({ yPrefix: '$', ySuffix: ' bn' }, [145, 150, 160, 152]);
    expect(yTicks(c)).toEqual(['$145 bn', '$150 bn', '$155 bn', '$160 bn']);
    expect(endLabels(c)).toEqual(['$152 bn']);
  });

  it('an explicit yTickFormat formats ticks, end labels and tooltip', () => {
    let fmt;
    const c = line({ yTickFormat: v => `v${v}`, tooltipFormat: ({ points }) => { fmt = points[0].fmt; return ''; } }, [145, 150, 160, 152]);
    expect(yTicks(c)).toEqual(['v145', 'v150', 'v155', 'v160']);
    expect(endLabels(c)).toEqual(['v152']);
    c.container.querySelector('rect.rc-overlay')
      .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 2000, clientY: 50 }));
    expect(fmt).toBe('v152');
  });

  it('percent and log formats are unchanged', () => {
    expect(endLabels(line({}, [0.05, 0.12]))).toEqual(['+12.00%']);
    expect(yTicks(line({ yScale: 'log' }, [10, 100000]))).toEqual(['10', '100', '1k', '10k', '100k']);
  });
});

describe('Bar default formats (C-30)', () => {
  const bar = (o, data) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);
  const yTicks = c => texts(c, '.rc-axis .tick text');
  const cats = values => values.map((value, i) => ({ label: `C${i}`, value }));

  it('vertical: "0", not "0.0"; one SI prefix from 1000 on', () => {
    expect(yTicks(bar({}, cats([400000, 1000000]))))
      .toEqual(['0', '0.2M', '0.4M', '0.6M', '0.8M', '1M', '1.2M']);
  });

  it('vertical: small values keep their decimals instead of a milli prefix', () => {
    expect(yTicks(bar({}, cats([0.5, 2])))).toEqual(['0', '0.5', '1', '1.5', '2', '2.5']);
  });

  it('horizontal: the value axis reads "0 10 20 30 40"', () => {
    const c = bar({ orientation: 'horizontal' }, cats([30, 45]));
    expect(texts(c, '.rc-axis .tick text')).toEqual(['0', '10', '20', '30', '40']);
  });

  it('dates: "0" at the base, prefix and suffix kept', () => {
    const rows = [145, 150, 160].map((value, i) => ({ date: new Date(2026, i, 1), value }));
    const c = bar({ yPrefix: '$' }, rows);
    expect([...c.gAxisY.selectAll('.tick text').nodes()].map(n => n.textContent))
      .toEqual(['$0', '$50', '$100', '$150', '$200']);
  });

  it('stacked: exact labels on the divided axis; percent stays .0%', () => {
    const s = [{ name: 'a', values: [{ label: 'x', value: 1000 }] }, { name: 'b', values: [{ label: 'x', value: 500 }] }];
    expect(yTicks(bar({}, s))).toEqual(['0', '0.375k', '0.75k', '1.125k', '1.5k']);
    expect(yTicks(bar({ stacked: 'percent' }, s))).toEqual(['0%', '25%', '50%', '75%', '100%']);
  });

  it('explicit formats win', () => {
    expect(yTicks(bar({ yTickFormat: v => `v${v}` }, cats([0.5, 2])))[0]).toBe('v0');
    expect(texts(bar({ orientation: 'horizontal', xTickFormat: v => `x${v}` }, cats([30, 45])), '.rc-axis .tick text')[0]).toBe('x0');
  });
});

describe('TimeSeries default date format by span (C-31)', () => {
  // jsdom has no layout: give each tick label a 30px box at its tick, so the
  // overlap thinning in renderAxisX sees the real spacing.
  const layoutLabels = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const m = this.closest?.('.tick')?.getAttribute('transform')?.match(/translate\(([-\d.]+)/);
    const x = m ? +m[1] : 0;
    return { left: x - 15, right: x + 15, top: 0, bottom: 10, width: 30, height: 10, x: x - 15, y: 0 };
  });
  const points = (from, n, step) => Array.from({ length: n }, (_, i) => ({ date: new Date(+from + i * step), value: 100 + (i % 7) }));
  const ts = (data, o = {}) => track(new TimeSeries(mount(null), o)).setData(data);
  const xLabels = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);

  it('spanTimeFormat picks by the span', () => {
    const at = d => [new Date(2026, 0, 1), new Date(+new Date(2026, 0, 1) + d)];
    expect(spanTimeFormat(at(36 * 36e5))).toBe('%H:%M');
    expect(spanTimeFormat(at(92 * DAY))).toBe('%b %d');
    expect(spanTimeFormat(at(366 * DAY))).toBe('%b');
    expect(spanTimeFormat([new Date(2020, 0, 1), new Date(2025, 0, 1)])).toBe("%b '%y");
    expect(spanTimeFormat([new Date(2020, 0, 1), new Date(2025, 0, 2)])).toBe('%Y');
  });

  it.each([
    ['a day: clock times, midnight names the day', points(new Date(2026, 0, 5), 25, 36e5), /^(\d{2}:\d{2}|Jan 0[56])$/],
    ['a month: month and day',        points(new Date(2026, 0, 1), 31, DAY),    /^[A-Z][a-z]{2} \d{2}$/],
    ['seven months: month names',     points(new Date(2026, 0, 1), 210, DAY),   /^[A-Z][a-z]{2}$/],
    ['two years: month and year',     points(new Date(2024, 0, 1), 730, DAY),   /^[A-Z][a-z]{2} '\d{2}$/],
    ['ten years: years',              points(new Date(2016, 0, 1), 3650, DAY),  /^\d{4}$/],
  ])('%s, never a repeated label', (_n, data, shape) => {
    layoutLabels();
    const labels = xLabels(ts(data));
    expect(labels.length).toBeGreaterThan(1);
    labels.forEach(l => expect(l).toMatch(shape));
    expect(labels).toSatisfy(distinct);
  });

  it('the 1M view of a long series names days, not months', () => {
    layoutLabels();
    const c = ts(points(new Date(2025, 0, 1), 400, DAY), { timeframes: ['1M', 'ALL'] });
    c.setTimeframe('1M');
    const labels = xLabels(c);
    labels.forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2} \d{2}$/));
    expect(labels).toSatisfy(distinct);
  });

  it('across midnight the clock-time axis names the day', () => {
    layoutLabels();
    const labels = xLabels(ts(points(new Date(2026, 0, 5, 8), 37, 36e5)));   // 08:00 → 20:00 next day
    expect(labels).toContain('Jan 06');
    expect(labels).not.toContain('00:00');
  });

  it('three days: one label per midnight', () => {
    layoutLabels();
    expect(xLabels(ts(points(new Date(2026, 0, 1), 49, 36e5)))).toEqual(['Jan 01', 'Jan 02', 'Jan 03']);
  });

  it('an explicit xTickFormat wins', () => {
    layoutLabels();
    const labels = xLabels(ts(points(new Date(2024, 0, 1), 730, DAY), { xTickFormat: d => `y${d.getFullYear()}` }));
    labels.forEach(l => expect(l).toMatch(/^y\d{4}$/));
  });
});

describe('Bar date axis: the same span-aware default (C-31)', () => {
  const xLabels = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);
  const bars = (from, n, step) => Array.from({ length: n }, (_, i) => ({ date: new Date(+from + i * step), value: 10 + i }));
  const bar = (data, o = {}) => track(new Bar(mount(null), { animate: false, ...o })).setData(data);

  it('three months of days: no repeated month ("Jan Jan Jan Feb")', () => {
    const labels = xLabels(bar(bars(new Date(2026, 0, 1), 90, DAY)));
    labels.forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2} \d{2}$/));
    expect(labels).toSatisfy(distinct);
  });

  it('a year of months keeps "%b"; two years add the year', () => {
    const monthly = (y, n) => Array.from({ length: n }, (_, i) => ({ date: new Date(y, i, 1), value: 10 + i }));
    xLabels(bar(monthly(2025, 12))).forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2}$/));
    const two = xLabels(bar(monthly(2024, 24)));
    two.forEach(l => expect(l).toMatch(/^[A-Z][a-z]{2} '\d{2}$/));
    expect(two).toSatisfy(distinct);
  });

  it('an explicit xTickFormat and xTicks win', () => {
    const labels = xLabels(bar(bars(new Date(2026, 0, 1), 5, DAY), { xTickFormat: d => `d${d.getDate()}`, xTicks: 2 }));
    labels.forEach(l => expect(l).toMatch(/^d\d+$/));
  });
});

describe('DualAxes: y1Ticks / y2Ticks reach the auto domain (C-21)', () => {
  const values = [12, 40, 87].map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));
  const dual = o => track(new DualAxes(mount(null), { animate: false, ...o })).setData([
    { name: 'a', axis: 'y1', values },
    { name: 'b', axis: 'y2', values },
  ]);
  const ends = (c, axis) => { const l = texts(c, `.rc-axis-${axis} .tick text`); return [l[0], l.at(-1)]; };

  it('default 4: the domain rounds to [0, 100]', () => {
    const c = dual({});
    expect(ends(c, 'y1')).toEqual(['0.00', '100.00']);
    expect(ends(c, 'y2')).toEqual(['0', '+100.00']);
  });

  it('10 ticks: the domain rounds to the finer step, [10, 90]', () => {
    const c = dual({ y1Ticks: 10, y2Ticks: 10 });
    expect(ends(c, 'y1')).toEqual(['10.00', '90.00']);
    expect(ends(c, 'y2')).toEqual(['+10.00', '+90.00']);
  });
});

describe('Bar date axis thins overlapping labels (step 7a review)', () => {
  it('a narrow card keeps its month labels apart, as on Line', () => {
    // jsdom has no layout: give each tick label a 50px box at its tick.
    const orig = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.tagName === 'text' && this.parentNode?.getAttribute?.('transform')) {
        const x = +this.parentNode.getAttribute('transform').match(/translate\(([-\d.]+)/)[1];
        return { left: x - 25, right: x + 25, width: 50, top: 0, bottom: 10, height: 10, x: x - 25, y: 0 };
      }
      return orig.call(this);
    };
    try {
      const rows = Array.from({ length: 36 }, (_, i) => ({ date: new Date(2023, i, 1), value: 10 + i }));
      const c = track(new Bar(mount(null, { width: 300 }), { animate: false })).setData(rows);
      const boxes = [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.getBoundingClientRect());
      expect(boxes.length).toBeGreaterThan(1);
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right + 8);
    } finally {
      Element.prototype.getBoundingClientRect = orig;
    }
  });
});
