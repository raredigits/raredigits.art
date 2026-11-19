// TimeSeries' legend (the legend spec, §9.3; step S6): the one series is
// keyed by `seriesName` (default 'Series', as Line's single series), so a
// header legend item that names it is a toggle. Hidden, the series leaves
// the line, the area and the crosshair; the frame stays (axes, grid,
// annotations), and the time axis, the view and the navigator never follow
// the legend. setSeriesVisible sets it from code, silently.
//
// The comparison series of RC-004 enters through one hook, _drawnSeries(),
// which lists, scales and crosshairs every series; the last block takes it
// through the real option (compare: 'previousYear', named 'Last year').
//
// Through the DOM and the public surface (S-17). Sizes are the test's own
// (S-18): every box 800×400, so the plot is 730px wide (the right margin
// holds the Y labels) and the pointer's x in the overlay is clientX.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { mount, track, setGeometry } from './helpers.js';

// the accent as the chart reads it at its card (core/paint.js): hex, the
// default chain's literal here
const ACCENT = '#1677ff';

beforeEach(() => setGeometry({ width: 800, height: 400 }));
afterEach(() => vi.useRealTimers());

// 30 days of January 2026, local dates: 100 … 129
const days = (n = 30, value = i => 100 + i, from = 1) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(2026, 0, from + i), value: value(i) }));

// January 2025 (1000 … 1290) and January 2026 (days(): 100 … 129): the
// comparison of a view on January 2026 a year back is the first month.
const TWO_YEARS = Array.from({ length: 30 }, (_, i) => ({ date: new Date(2025, 0, 1 + i), value: 1000 + 10 * i }))
  .concat(days());
const ON_2026 = ['2026-01-01', '2026-01-30'];

const ts = (o = {}) => track(new TimeSeries(mount(null), o));

const plot = c => c.container.querySelector(':scope > svg > g');
const axisLabels = (c, i) => [...plot(c).querySelectorAll(':scope > g.rc-axis')[i].querySelectorAll('text')]
  .map(t => t.textContent);
const xLabels = c => axisLabels(c, 0);
const yLabels = c => axisLabels(c, 1);
const gridLines = c => plot(c).querySelectorAll('g.rc-grid line').length;
const lineOf = c => c.container.querySelector('path.rc-ts-line');
const areaOf = c => c.container.querySelector('path.rc-ts-area');
const overlay = c => plot(c).querySelector(':scope > rect');
const crossLines = c => [...plot(c).querySelectorAll(':scope > line')].map(l => l.style.opacity);
const tooltip = c => c.container.querySelector('.rc-tooltip');
const tipShown = c => !!tooltip(c)?.classList.contains('is-visible');
const hover = (c, clientX = 400) =>
  overlay(c).dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 50 }));

const legendItems = c => [...c.container.querySelectorAll('.rc-legend > *')];
const item = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
const pressed = c => [...c.container.querySelectorAll('.rc-legend button[data-key]')]
  .map(b => `${b.dataset.key}:${b.getAttribute('aria-pressed')}`);
const reset = c => c.container.querySelector('.rc-legend-reset');
const swatch = el => el.firstElementChild.style.getPropertyValue('--rc-swatch-color');
const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
const doubleClick = node => {
  click(node, 1);
  click(node, 2);
  node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
};

const strip = c => c.container.querySelector('.rc-chart-navigator');
const stripLine = c => strip(c).querySelector('path.rc-ov-line').getAttribute('d');

// ─── The key: seriesName ─────────────────────────────────────────────────────

describe('the one series is keyed by seriesName', () => {
  it('a legend item naming it is a toggle, in the series colour', () => {
    const c = ts({ seriesName: 'BTC', legend: [{ label: 'BTC' }] }).setData(days());
    const [btc, showAll] = legendItems(c);
    expect(btc.localName).toBe('button');
    expect(btc.dataset.key).toBe('BTC');
    expect(btc.getAttribute('aria-pressed')).toBe('true');
    expect(swatch(btc)).toBe(ACCENT);
    expect(showAll).toBe(reset(c));
    expect(showAll.hidden).toBe(true);
  });

  it("the default name is 'Series' (as Line's single series)", () => {
    const c = ts({ legend: [{ label: 'Bitcoin', series: 'Series' }] }).setData(days());
    expect(pressed(c)).toEqual(['Series:true']);
    expect(item(c, 'Series').lastElementChild.textContent).toBe('Bitcoin');
  });

  it('an item naming something else stays a caption, without a warning (nothing maps)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = ts({ legend: [{ label: 'Bitcoin' }] }).setData(days());
    expect(legendItems(c).map(el => el.localName)).toEqual(['div']);
    expect(reset(c)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('a number as seriesName is the key as text, and hides the series', () => {
    const c = ts({ seriesName: 2024, legend: [{ label: '2024' }] }).setData(days());
    expect(pressed(c)).toEqual(['2024:true']);
    click(item(c, '2024'));
    expect(pressed(c)).toEqual(['2024:false']);
    expect(lineOf(c)).toBeNull();
  });

  it('without data the item is a caption; the first data makes it a toggle', () => {
    const c = ts({ seriesName: 'BTC', legend: [{ label: 'BTC' }] });
    c.setData([]);
    expect(legendItems(c).map(el => el.localName)).toEqual(['div']);
    c.setData(days());
    expect(pressed(c)).toEqual(['BTC:true']);
  });
});

// ─── Hiding the series: the frame stays ──────────────────────────────────────

describe('hiding the one series (NONE)', () => {
  const annotations = [{ value: 110, label: 'Level' }, { date: new Date(2026, 0, 10), label: 'Event' }];
  const make = (o = {}) => ts({ seriesName: 'BTC', legend: [{ label: 'BTC' }], annotations, ...o }).setData(days());

  it('takes away the line and the area; the axes, grid and annotations stay as they were', () => {
    const c = make();
    const before = {
      x: xLabels(c), y: yLabels(c), grid: gridLines(c),
      ann: plot(c).querySelector('g.rc-annotations').innerHTML,
      line: lineOf(c).getAttribute('d'), area: areaOf(c).getAttribute('d'),
    };
    expect(before.y.length).toBeGreaterThan(1);
    expect(before.ann).toContain('Level');
    click(item(c, 'BTC'));
    expect(pressed(c)).toEqual(['BTC:false']);
    expect(lineOf(c)).toBeNull();
    expect(areaOf(c)).toBeNull();
    expect(xLabels(c)).toEqual(before.x);
    expect(yLabels(c)).toEqual(before.y);
    expect(gridLines(c)).toBe(before.grid);
    expect(plot(c).querySelector('g.rc-annotations').innerHTML).toBe(before.ann);
    expect(reset(c).hidden).toBe(false);

    click(item(c, 'BTC'));                                  // back, as it was
    expect(pressed(c)).toEqual(['BTC:true']);
    expect(lineOf(c).getAttribute('d')).toBe(before.line);
    expect(areaOf(c).getAttribute('d')).toBe(before.area);
    expect(reset(c).hidden).toBe(true);
  });

  it('keeps a log frame (the scale reads every series in view while nothing is shown)', () => {
    const c = make({ yScale: 'log' });
    const y = yLabels(c);
    click(item(c, 'BTC'));
    expect(lineOf(c)).toBeNull();
    expect(yLabels(c)).toEqual(y);
  });

  it('with area: false the line goes, and no area appears', () => {
    const c = make({ area: false });
    click(item(c, 'BTC'));
    click(item(c, 'BTC'));
    expect(lineOf(c)).not.toBeNull();
    expect(areaOf(c)).toBeNull();
  });

  it('unbinds the crosshair: a visible tooltip and its lines go, and hovering shows nothing', () => {
    const c = make();
    hover(c);
    expect(tipShown(c)).toBe(true);
    expect(crossLines(c)).toEqual(['1', '1']);
    click(item(c, 'BTC'));
    expect(tipShown(c)).toBe(false);
    expect(crossLines(c)).toEqual(['0', '0']);
    hover(c);
    hover(c, 200);
    expect(tipShown(c)).toBe(false);
    expect(crossLines(c)).toEqual(['0', '0']);

    click(item(c, 'BTC'));                                  // shown again: the crosshair is back
    hover(c);
    expect(tipShown(c)).toBe(true);
  });

  it('a pointer click hides only after the double-click wait; the drawing follows the commit', () => {
    vi.useFakeTimers();
    const c = make();
    click(item(c, 'BTC'), 1);
    expect(lineOf(c)).not.toBeNull();
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(lineOf(c)).toBeNull();
  });

  it('onLegendToggle tells the page, after the redraw', () => {
    const seen = [];
    const c = make({ onLegendToggle: e => seen.push({ ...e, line: !!lineOf(c) }) });
    click(item(c, 'BTC'));
    click(reset(c));
    expect(seen).toEqual([
      { name: 'BTC', visible: false, visibleNames: [], line: false },
      { name: null, visible: true, visibleNames: ['BTC'], line: true },
    ]);
  });

  it('the view, the timeframes and the navigator do not follow the legend', () => {
    const c = make({ navigator: true, timeframes: ['1W', 'ALL'], defaultTimeframe: '1W' });
    const view = c.getView().map(Number);
    const buttons = () => [...c.container.querySelectorAll('.rc-range-btn')].map(b => b.getAttribute('aria-pressed'));
    const before = { strip: strip(c).outerHTML, buttons: buttons() };
    expect(before.buttons).toEqual(['true', 'false']);
    expect(before.strip).toContain('rc-ov-line');
    click(item(c, 'BTC'));
    expect(lineOf(c)).toBeNull();
    expect(c.getView().map(Number)).toEqual(view);
    expect(buttons()).toEqual(before.buttons);
    expect(strip(c).outerHTML).toBe(before.strip);          // shown, the whole series, the same window
  });
});

// ─── From code; across new data ──────────────────────────────────────────────

describe('setSeriesVisible and the hidden state across data', () => {
  it('hides and shows from code, with or without a legend, and fires no event', () => {
    const onLegendToggle = vi.fn();
    const c = ts({ seriesName: 'BTC', onLegendToggle }).setData(days());
    expect(c.setSeriesVisible([])).toBe(c);
    expect(lineOf(c)).toBeNull();
    expect(c.setSeriesVisible(['BTC'])).toBe(c);
    expect(lineOf(c)).not.toBeNull();
    c.setSeriesVisible([]).setSeriesVisible(null);
    expect(lineOf(c)).not.toBeNull();
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('a hidden series stays hidden through setData and appendPoint, until Show all', () => {
    const c = ts({ seriesName: 'BTC', legend: [{ label: 'BTC' }] }).setData(days());
    c.setSeriesVisible([]);
    c.setData(days(40, i => 200 + i));
    expect(lineOf(c)).toBeNull();
    expect(pressed(c)).toEqual(['BTC:false']);
    c.appendPoint({ date: new Date(2026, 1, 15), value: 300 });
    expect(lineOf(c)).toBeNull();
    expect(yLabels(c).length).toBeGreaterThan(1);           // the frame of the new data
    click(reset(c));
    expect(lineOf(c)).not.toBeNull();
  });

  it('legendInteractive: false leaves the hidden series out of a static legend', () => {
    const c = ts({ seriesName: 'BTC', legend: [{ label: 'BTC' }], legendInteractive: false }).setData(days());
    expect(legendItems(c).map(el => `${el.localName}:${el.textContent}`)).toEqual(['div:BTC']);
    c.setSeriesVisible([]);
    expect(legendItems(c)).toEqual([]);
    expect(lineOf(c)).toBeNull();
  });
});

// ─── The RC-004 hook ─────────────────────────────────────────────────────────

describe('the comparison hook (_drawnSeries): listed, scaled and crosshaired', () => {
  const legend = [{ label: 'BTC' }, { label: 'Last year' }];
  // The comparison is built from the data the legend first maps, so both
  // series arrive in one render and no legend item is ever unmapped
  // (decision 14 would warn).
  const make = (o = {}) => ts({
    seriesName: 'BTC', legend, compare: 'previousYear', compareName: 'Last year', compareColor: '#888888',
    defaultView: ON_2026, ...o,
  }).setData(TWO_YEARS);
  const mainOnlyY = () => yLabels(ts().setData(days()));

  it('the legend lists the comparison after the main series, in its own colour', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = make();
    expect(pressed(c)).toEqual(['BTC:true', 'Last year:true']);
    expect(swatch(item(c, 'Last year'))).toBe('#888888');
    expect(swatch(item(c, 'BTC'))).toBe(ACCENT);
    expect(warn).not.toHaveBeenCalled();
  });

  it('the Y axis fits both, and follows the legend; legendRescale: false keeps it', () => {
    const c = make();
    const both = yLabels(c);
    expect(both).not.toEqual(mainOnlyY());
    click(item(c, 'Last year'));
    expect(yLabels(c)).toEqual(mainOnlyY());
    expect(lineOf(c)).not.toBeNull();                       // the main line stays
    click(item(c, 'Last year'));
    expect(yLabels(c)).toEqual(both);

    const fixed = make({ legendRescale: false });
    click(item(fixed, 'Last year'));
    expect(yLabels(fixed)).toEqual(both);
  });

  it('with the main series hidden, the axis fits the comparison and the crosshair follows it', () => {
    const tip = vi.fn(() => 'tip');
    const c = make();
    const both = yLabels(c);
    click(item(c, 'BTC'));
    expect(lineOf(c)).toBeNull();
    expect(areaOf(c)).toBeNull();
    expect(yLabels(c)).not.toEqual(both);
    hover(c, 0);                                            // the first day: 1000
    expect(tipShown(c)).toBe(true);
    expect(tooltip(c).innerHTML).toContain('$1,000.00');
    // the comparison's own row: its dashed mark in its colour (RC-082)
    const mark = tooltip(c).querySelector('.rc-tooltip-swatch');
    expect(mark.classList.contains('rc-tooltip-swatch--dashed')).toBe(true);
    expect(mark.style.getPropertyValue('--rc-swatch-color')).toBe('#888888');

    const own = make({ tooltipFormat: tip });
    click(item(own, 'BTC'));
    hover(own, 0);
    expect(tip).toHaveBeenLastCalledWith(expect.objectContaining({ value: 1000 }),
      expect.objectContaining({ value: 1000, color: '#888888' }));
  });

  it('a hidden comparison leaves the crosshair to the main series', () => {
    const c = make();
    click(item(c, 'Last year'));
    hover(c, 0);
    expect(tooltip(c).innerHTML).toContain('$100.00');
    expect(tooltip(c).querySelector('.rc-tooltip-swatch').style.getPropertyValue('--rc-swatch-color')).toBe(ACCENT.toLowerCase());
  });

  it('a double click keeps one series and a second brings both back; visibleNames in data order', () => {
    const seen = [];
    const c = make({ onLegendToggle: e => seen.push(e) });
    doubleClick(item(c, 'BTC'));
    expect(pressed(c)).toEqual(['BTC:true', 'Last year:false']);
    doubleClick(item(c, 'BTC'));
    expect(pressed(c)).toEqual(['BTC:true', 'Last year:true']);
    click(item(c, 'BTC'));
    expect(seen).toEqual([
      { name: 'BTC', visible: true, visibleNames: ['BTC'] },
      { name: 'BTC', visible: true, visibleNames: ['BTC', 'Last year'] },
      { name: 'BTC', visible: false, visibleNames: ['Last year'] },
    ]);
  });

  it('setSeriesVisible takes the comparison by its key', () => {
    const c = make();
    c.setSeriesVisible(['Last year']);
    expect(pressed(c)).toEqual(['BTC:false', 'Last year:true']);
    expect(lineOf(c)).toBeNull();
  });

  it('the navigator stays the main series', () => {
    const plain = ts({ navigator: true, defaultView: ON_2026 }).setData(TWO_YEARS);
    const c = make({ navigator: true });
    expect(stripLine(c)).toBe(stripLine(plain));
    click(item(c, 'BTC'));
    expect(strip(c).style.display).toBe('');
    expect(stripLine(c)).toBe(stripLine(plain));
  });
});

