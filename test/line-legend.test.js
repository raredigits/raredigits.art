// Line's interactive legend (the legend spec, §9.1; D-04, RC-054): a header
// legend item that names a series toggles it. A hidden series leaves the
// plot, the end labels, the markers, the crosshair and its tooltip; the Y
// axis rescales to the series still shown (legendRescale: false keeps it on
// every series in view). The X axis, the navigator, the annotations and the
// auto formats never follow the legend; hiding every series leaves the axes
// and the grid. setSeriesVisible() is the silent setter.
//
// Oracles are what a page sees (S-17): the drawing, the legend's buttons,
// the tooltip element. A "reference" chart is the same chart drawn from the
// shown series alone — what a rescaled chart must match.
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as d3 from 'd3';
import { Line } from '../assets/charts/src/charts/Line.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { mount, track, tooltipOf } from './helpers.js';

const day = i => new Date(2026, 0, 1 + i);
const rows = values => values.map((value, i) => ({ date: day(i), value }));
const ALICE = { name: 'Alice', color: '#111111', values: rows([10, 12, 14, 16]) };
const BOB   = { name: 'Bob',   color: '#222222', values: rows([100, 300, 500, 700]) };
const CAROL = { name: 'Carol', color: '#333333', values: rows([20, 22, 24, 26]) };
const ABC = [ALICE, BOB, CAROL];
const LEGEND = [{ label: 'Alice' }, { label: 'Bob' }, { label: 'Carol' }];

// Every chart in a test at one size (S-18): the reference and the chart it is
// compared with share the plot — the reference keeps a header (a caption), as
// the header's gap comes off the plot's height.
const line = (o = {}, data = ABC) =>
  track(new Line(mount(null, { width: 600 }), { animate: false, legend: LEGEND, ...o })).setData(data);
const reference = (data, o = {}) => line({ legend: [{ label: 'Key', series: false }], ...o }, data);

const all = (c, sel) => [...c.container.querySelectorAll(sel)];
const texts = (c, sel) => all(c, sel).map(n => n.textContent);
const attrs = (c, sel, name) => all(c, sel).map(n => n.getAttribute(name));
const yTicks = c => texts(c, '.rc-axis-y .tick text');
const xTicks = c => texts(c, '.rc-axis-x .tick text');
const lines = c => attrs(c, 'path.rc-line', 'stroke');
const paths = c => attrs(c, 'path.rc-line', 'd');
const endLabels = c => texts(c, '.rc-end-label');
const item = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
const resetOf = c => c.container.querySelector('.rc-legend-reset');
const pressed = c => all(c, '.rc-legend button[data-key]').map(b => `${b.dataset.key}:${b.getAttribute('aria-pressed')}`);
const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
// jsdom has no layout: the pointer's x in the overlay is clientX
const hover = (c, clientX = 300) => c.container.querySelector('rect.rc-overlay')
  .dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 50 }));
const tipShown = c => tooltipOf(c).classList.contains('is-visible');
const crossDots = c => all(c, '.rc-cross-dot').filter(d => d.getAttribute('opacity') !== '0').map(d => d.getAttribute('fill'));

// Fake timers fake performance.now and requestAnimationFrame too, and d3
// keeps the time of a frame until a frame callback clears it: run what is
// pending before going back to real timers, so a test that stopped early does
// not leave d3 on a fake clock (the motion test at the end reads it).
afterEach(() => {
  if (vi.isFakeTimers()) vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ─── The legend maps Line's series ──────────────────────────────────────────

describe('the header legend toggles Line series', () => {
  it('an item naming a series is a toggle, pressed; Show all waits hidden', () => {
    const c = line();
    expect(all(c, '.rc-legend > *').map(el => `${el.localName}:${el.dataset.key ?? '-'}`))
      .toEqual(['button:Alice', 'button:Bob', 'button:Carol', 'button:-']);
    expect(pressed(c)).toEqual(['Alice:true', 'Bob:true', 'Carol:true']);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('an item without a colour takes its series colour (decision 22)', () => {
    const c = line({ legend: [{ label: 'Alice' }, { label: 'Bob', color: '#abcdef' }] });
    const swatch = key => item(c, key).firstElementChild.style.getPropertyValue('--rc-swatch-color');
    expect([swatch('Alice'), swatch('Bob')]).toEqual(['#111111', '#abcdef']);
  });

  it('`series` names the series when the label differs; a legend where nothing maps stays labels', () => {
    const c = line({ legend: [{ label: 'Bob, USD', series: 'Bob' }] });
    expect(item(c, 'Bob').localName).toBe('button');
    click(item(c, 'Bob'));
    expect(lines(c)).toEqual(['#111111', '#333333']);
    const caption = line({ legend: [{ label: 'Revenue, millions USD' }] });
    expect(all(caption, '.rc-legend > *').map(el => el.localName)).toEqual(['div']);
  });

  it('a band is a series; default names map too: seriesName, and "Series N" for an unnamed series', () => {
    const one = line({ seriesName: 'BTC', legend: [{ label: 'BTC' }] }, rows([1, 2, 3]));
    expect(item(one, 'BTC').localName).toBe('button');
    const dflt = line({ legend: [{ label: 'Series' }] }, rows([1, 2, 3]));
    expect(item(dflt, 'Series').localName).toBe('button');
    const unnamed = line({ legend: [{ label: 'Series 2' }] }, [ALICE, { values: rows([5, 6, 7, 8]) }]);
    expect(item(unnamed, 'Series 2').localName).toBe('button');
    const band = line({ legend: [{ label: 'Range', type: 'band' }] },
      [{ name: 'Range', type: 'band', values: ALICE.values.map(d => ({ date: d.date, lower: 0, upper: 50 })) }, ALICE]);
    expect(item(band, 'Range').localName).toBe('button');
  });

  it('a series named by a number maps to its item and hides', () => {
    const c = line({ legend: [{ label: '2024' }, { label: '2025' }] },
      [{ name: 2024, color: '#111111', values: ALICE.values }, { name: 2025, color: '#222222', values: BOB.values }]);
    click(item(c, '2024'));
    expect(lines(c)).toEqual(['#222222']);
    expect(pressed(c)).toEqual(['2024:false', '2025:true']);
  });
});

// ─── What a hidden series leaves ────────────────────────────────────────────

describe('a hidden series leaves the plot, the end labels, the markers and the crosshair', () => {
  it('its line, area, end label and markers go; the others stay as they were drawn', () => {
    const c = line({ markers: true, area: true });
    expect(lines(c)).toEqual(['#111111', '#222222', '#333333']);
    expect(attrs(c, '.rc-marker-circle', 'fill')).toHaveLength(12);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(lines(c)).toEqual(['#111111', '#333333']);
    expect(attrs(c, 'path.rc-line-area', 'fill')).toEqual(['#111111', '#333333']);
    expect(endLabels(c)).toEqual(['16', '26']);
    expect(new Set(attrs(c, '.rc-marker-circle', 'fill'))).toEqual(new Set(['#111111', '#333333']));
    expect(attrs(c, '.rc-marker-circle', 'fill')).toHaveLength(8);
    // drawn as a chart of the shown series alone (the Y axis rescaled)
    const ref = reference([ALICE, CAROL], { markers: true, area: true });
    expect(paths(c)).toEqual(paths(ref));
    expect(attrs(c, '.rc-marker-circle', 'cy')).toEqual(attrs(ref, '.rc-marker-circle', 'cy'));
    expect(attrs(c, '.rc-end-label-g', 'transform')).toEqual(attrs(ref, '.rc-end-label-g', 'transform'));
  });

  it('the crosshair has no dot and the tooltip no row for it', () => {
    const c = line();
    c.setSeriesVisible(['Alice', 'Carol']);
    hover(c);
    expect(tipShown(c)).toBe(true);
    expect(tooltipOf(c).textContent).toContain('Alice');
    expect(tooltipOf(c).textContent).toContain('Carol');
    expect(tooltipOf(c).textContent).not.toContain('Bob');
    expect(crossDots(c)).toEqual(['#111111', '#333333']);
  });

  it('a tooltipFormat gets the shown series only', () => {
    let names;
    const c = line({ tooltipFormat: ({ points }) => { names = points.map(p => p.series); return ''; } });
    c.setSeriesVisible(['Bob']);
    hover(c);
    expect(names).toEqual(['Bob']);
  });

  it('a change of visibility drops the hover readout: the next move draws it from what is shown', () => {
    const c = line();
    hover(c);
    expect(crossDots(c)).toHaveLength(3);
    c.setSeriesVisible(['Alice']);
    expect(tipShown(c)).toBe(false);
    expect(crossDots(c)).toEqual([]);
    hover(c, 320);
    expect(tipShown(c)).toBe(true);
    expect(crossDots(c)).toEqual(['#111111']);
  });

  it('a band hides like a line: its ribbon and its tooltip range go, the axis fits the rest', () => {
    const range = { name: 'Range', type: 'band', color: '#999999',
      values: ALICE.values.map(d => ({ date: d.date, lower: d.value - 40, upper: d.value + 40 })) };
    const c = line({ legend: [{ label: 'Alice' }, { label: 'Range', type: 'band' }] }, [range, ALICE]);
    expect(all(c, 'path.rc-band')).toHaveLength(1);
    click(item(c, 'Range'));
    expect(all(c, 'path.rc-band')).toHaveLength(0);
    expect(yTicks(c)).toEqual(yTicks(reference([ALICE])));
    hover(c);
    expect(tooltipOf(c).textContent).not.toContain('Range');
    click(item(c, 'Range'));
    expect(all(c, 'path.rc-band')).toHaveLength(1);
    expect(yTicks(c)).toEqual(yTicks(reference([range, ALICE])));
  });
});

// ─── The axes ───────────────────────────────────────────────────────────────

describe('the Y axis follows the shown series; legendRescale: false keeps it', () => {
  it('hiding Bob rescales Y to Alice and Carol; showing him again puts the axis back', () => {
    const c = line();
    const full = yTicks(c);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(yTicks(c)).toEqual(yTicks(reference([ALICE, CAROL])));
    expect(yTicks(c)).not.toEqual(full);
    c.setSeriesVisible(null);
    expect(yTicks(c)).toEqual(full);
  });

  it('legendRescale: false keeps every series in view on the axis; the marks still go', () => {
    const c = line({ legendRescale: false });
    const full = yTicks(c);
    const fullPaths = paths(c);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(yTicks(c)).toEqual(full);
    expect(lines(c)).toEqual(['#111111', '#333333']);
    expect(paths(c)).toEqual([fullPaths[0], fullPaths[2]]);
  });

  it('a log axis rescales the same way', () => {
    const a = { name: 'A', values: rows([10, 20, 40, 80]) };
    const b = { name: 'B', values: rows([1000, 5000, 10000, 50000]) };
    const c = line({ yScale: 'log', legend: [{ label: 'A' }, { label: 'B' }] }, [a, b]);
    const full = yTicks(c);
    click(item(c, 'B'));
    expect(yTicks(c)).toEqual(yTicks(reference([a], { yScale: 'log' })));
    expect(yTicks(c)).not.toEqual(full);
  });

  it('the auto percent reads every series in view: hiding the large series does not turn 0.3 into +30.00%', () => {
    const small = { name: 'Share', values: rows([0.1, 0.2, 0.3]) };
    const large = { name: 'Total', values: rows([100, 200, 300]) };
    const c = line({ legend: [{ label: 'Share' }, { label: 'Total' }] }, [small, large]);
    expect(endLabels(c)[0]).toBe('0.3');
    click(item(c, 'Total'));
    expect(endLabels(c)).toEqual(['0.3']);
    expect(yTicks(c).join(' ')).not.toContain('%');
    // alone, the same series reads as a percent: the format came from the view
    expect(endLabels(reference([small]))).toEqual(['+30.00%']);
  });

  it('the X axis, a date annotation and the navigator do not move', () => {
    // Bob runs ten days longer than the others: hiding him leaves the dates alone
    const longBob = { ...BOB, values: [...BOB.values, ...rows(Array(14).fill(800)).slice(4)] };
    const o = { navigator: true, annotations: [{ date: day(2), label: 'Launch' }] };
    const c = line(o, [ALICE, longBob, CAROL]);
    const strip = () => c.container.querySelector('.rc-chart-navigator').innerHTML;
    const before = { x: xTicks(c), mark: attrs(c, '.rc-annotation-line', 'x1'), strip: strip() };
    expect(before.strip).toContain('path');
    expect(xTicks(c)).not.toEqual(xTicks(reference([ALICE, CAROL], o)));
    c.setSeriesVisible(['Bob']);          // Alice, whose line the navigator draws, hidden too
    expect({ x: xTicks(c), mark: attrs(c, '.rc-annotation-line', 'x1'), strip: strip() }).toEqual(before);
    c.setSeriesVisible(['Alice']);
    expect({ x: xTicks(c), mark: attrs(c, '.rc-annotation-line', 'x1'), strip: strip() }).toEqual(before);
  });

  it('a level outside the rescaled axis is skipped; with legendRescale: false it stays', () => {
    const annotations = [{ value: 600, label: 'Target' }];
    const c = line({ annotations });
    expect(all(c, '.rc-annotation-h-line')).toHaveLength(1);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(all(c, '.rc-annotation-h-line')).toHaveLength(0);
    const kept = line({ annotations, legendRescale: false });
    kept.setSeriesVisible(['Alice', 'Carol']);
    expect(all(kept, '.rc-annotation-h-line')).toHaveLength(1);
  });
});

// ─── Nothing shown ──────────────────────────────────────────────────────────

describe('every series hidden', () => {
  it('the axes and the grid stay on every series in view; no marks; the crosshair stays away', () => {
    const c = line({ markers: true });
    const before = { y: yTicks(c), x: xTicks(c), grid: all(c, '.rc-grid line').length };
    c.setSeriesVisible([]);
    expect({ y: yTicks(c), x: xTicks(c), grid: all(c, '.rc-grid line').length }).toEqual(before);
    expect(before.grid).toBeGreaterThan(0);
    expect(all(c, 'path.rc-line, path.rc-band, .rc-end-label, .rc-marker-circle')).toHaveLength(0);
    hover(c);
    expect(tipShown(c)).toBe(false);
    expect(crossDots(c)).toEqual([]);
    expect(pressed(c)).toEqual(['Alice:false', 'Bob:false', 'Carol:false']);
    expect(resetOf(c).hidden).toBe(false);
  });

  it('Show all brings every series back', () => {
    const c = line();
    c.setSeriesVisible([]);
    click(resetOf(c));
    expect(lines(c)).toEqual(['#111111', '#222222', '#333333']);
    expect(resetOf(c).hidden).toBe(true);
  });
});

// ─── Gestures and the event ─────────────────────────────────────────────────

describe('legend gestures on a Line', () => {
  it('a key or scripted click hides at once and tells the page; a second shows', () => {
    const onLegendToggle = vi.fn();
    const c = line({ onLegendToggle });
    click(item(c, 'Bob'));
    expect(lines(c)).toEqual(['#111111', '#333333']);
    expect(onLegendToggle).toHaveBeenCalledTimes(1);
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: 'Bob', visible: false, visibleNames: ['Alice', 'Carol'] });
    expect(resetOf(c).hidden).toBe(false);
    click(item(c, 'Bob'));
    expect(lines(c)).toEqual(['#111111', '#222222', '#333333']);
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: 'Bob', visible: true, visibleNames: ['Alice', 'Bob', 'Carol'] });
  });

  it('a pointer click that hides waits for a possible second click', () => {
    vi.useFakeTimers();
    const c = line();
    click(item(c, 'Bob'), 1);
    expect(lines(c)).toHaveLength(3);
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(lines(c)).toEqual(['#111111', '#333333']);
  });

  it('a double click keeps only that series, which never leaves; a second one brings all back', () => {
    vi.useFakeTimers();
    const onLegendToggle = vi.fn();
    const c = line({ onLegendToggle });
    const full = yTicks(c);
    const dbl = node => { click(node, 1); click(node, 2); };
    click(item(c, 'Alice'), 1);
    expect(lines(c)).toHaveLength(3);                     // the first click waits
    click(item(c, 'Alice'), 2);
    expect(lines(c)).toEqual(['#111111']);
    expect(yTicks(c)).toEqual(yTicks(reference([ALICE])));
    expect(onLegendToggle).toHaveBeenCalledTimes(1);
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: 'Alice', visible: true, visibleNames: ['Alice'] });
    vi.advanceTimersByTime(HIDE_DELAY_MS * 2);
    dbl(item(c, 'Alice'));
    expect(lines(c)).toHaveLength(3);
    expect(yTicks(c)).toEqual(full);
  });

  it('setSeriesVisible returns the chart, follows in the legend and fires no event', () => {
    const onLegendToggle = vi.fn();
    const c = line({ onLegendToggle });
    expect(c.setSeriesVisible(['Carol'])).toBe(c);
    expect(pressed(c)).toEqual(['Alice:false', 'Bob:false', 'Carol:true']);
    expect(lines(c)).toEqual(['#333333']);
    c.setSeriesVisible('Bob');
    expect(lines(c)).toEqual(['#222222']);
    c.setSeriesVisible(null);
    expect(lines(c)).toHaveLength(3);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('legendInteractive: false keeps labels and leaves out the series it does not draw; the setter still works', () => {
    const c = line({ legendInteractive: false });
    expect(all(c, '.rc-legend > *').map(el => el.localName)).toEqual(['div', 'div', 'div']);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(lines(c)).toEqual(['#111111', '#333333']);
    expect(texts(c, '.rc-legend-item > span:last-child')).toEqual(['Alice', 'Carol']);
  });
});

// ─── New data ───────────────────────────────────────────────────────────────

describe('the hidden set across setData', () => {
  it('a new series starts shown; a hidden one stays hidden', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});   // Dave's item names no series at first
    const dave = { name: 'Dave', color: '#444444', values: rows([30, 31, 32, 33]) };
    const c = line({ legend: [...LEGEND, { label: 'Dave' }] });
    c.setSeriesVisible(['Alice', 'Carol']);
    c.setData([ALICE, BOB, CAROL, dave]);
    expect(lines(c)).toEqual(['#111111', '#333333', '#444444']);
    expect(pressed(c)).toEqual(['Alice:true', 'Bob:false', 'Carol:true', 'Dave:true']);
  });

  it('a hidden series that leaves the data comes back hidden', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});   // Bob's item names no series meanwhile
    const c = line();
    click(item(c, 'Bob'));
    c.setData([ALICE, CAROL]);
    // no series: a label, and nothing is hidden among the series in the data
    expect(all(c, '.rc-legend > *').map(el => `${el.localName}:${el.lastElementChild.textContent}`))
      .toEqual(['button:Alice', 'div:Bob', 'button:Carol', 'button:Show all']);
    expect(resetOf(c).hidden).toBe(true);
    expect(yTicks(c)).toEqual(yTicks(reference([ALICE, CAROL])));
    c.setData(ABC);
    expect(lines(c)).toEqual(['#111111', '#333333']);
    expect(pressed(c)).toEqual(['Alice:true', 'Bob:false', 'Carol:true']);
    expect(yTicks(c)).toEqual(yTicks(reference([ALICE, CAROL])));
  });
});

// ─── No new motion (decision 19) ────────────────────────────────────────────

describe('a legend redraw adds no motion', () => {
  // d3's clock, moved by hand (as in entry-motion.test.js)
  const D = 600;
  let clock;
  const at = async ms => { clock = ms; await new Promise(r => setTimeout(r, 30)); d3.timerFlush(); };

  it('after the draw-in, a series shown again is drawn whole at once', async () => {
    const base = performance.now();
    clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => base + clock);
    vi.spyOn(SVGElement.prototype, 'getTotalLength').mockImplementation(() => 200);
    const c = track(new Line(mount(null, { width: 600 }), { duration: D, ease: 'linear', legend: LEGEND })).setData(ABC);
    expect(attrs(c, 'path.rc-line', 'stroke-dashoffset')).toEqual(['200', '200', '200']);   // drawing in
    await at(D + 50);
    expect(attrs(c, 'path.rc-line', 'stroke-dasharray')).toEqual([null, null, null]);
    c.setSeriesVisible(['Alice', 'Carol']);
    c.setSeriesVisible(null);
    expect(attrs(c, 'path.rc-line', 'stroke-dasharray')).toEqual([null, null, null]);
    expect(attrs(c, 'path.rc-line', 'stroke-dashoffset')).toEqual([null, null, null]);
  });
});
