import { describe, it, expect, vi, afterEach } from 'vitest';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { fixture as graphData } from './fixtures/graph.js';
import { mount, track } from './helpers.js';

// MultiChart: the chart types a cell may name (B-02), and the breakpoint.
//
// C-15: the narrow layout is a matter of width (not of the column counts), and
// crossing the breakpoint rebuilds a panel with mobileOptions, so the options
// a chart reads in its constructor — height, margin — apply as well.

const rows = [
  { label: 'North', value: 4 }, { label: 'South', value: 6 }, { label: 'East', value: 5 },
];
const later = [{ label: 'West', value: 9 }, { label: 'Centre', value: 2 }];

// A grid container whose width the test sets; children keep setup's 800px.
// resizeTo() changes the width and reports it through the grid's
// ResizeObserver, as a browser does; the grid lays out again a frame later.
function grid(options, width) {
  const el = document.createElement('div');
  let w = width;
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w });
  document.body.appendChild(el);
  let report = null;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback; }
    observe(target) { if (target === el) report = this.callback; }
    unobserve() {}
    disconnect() {}
  });
  const mc = track(new MultiChart(el, { animate: false, ...options }));
  mc.resizeTo = async (next) => {
    w = next;
    report([{ target: el }]);
    await new Promise(requestAnimationFrame);
    return mc;
  };
  return mc;
}
const gridEl = mc => mc.container.querySelector('.rc-multichart-grid');
const cells = mc => [...mc.container.querySelectorAll('.rc-multichart-cell')];
// The layout a grid is in shows in its panels' options, and in a crossing
// being a rebuild: a resize that stays on the same side keeps the panel.
const staysWithin = async (mc, width) => {
  const panel = mc.charts[1];
  await mc.resizeTo(width);
  expect(mc.charts[1]).toBe(panel);
};

const panels = (extra = {}) => [
  { type: 'Bar', data: rows, options: { barColor: '#111111' } },
  {
    type: 'Bar', data: rows,
    options: { barColor: '#222222', margin: { left: 0 } },
    mobileOptions: { barColor: '#333333', height: 300, margin: { left: 100 } },
    ...extra,
  },
];
const fills = c => [...c.container.querySelectorAll('rect.rc-bar')].map(r => r.getAttribute('fill'));

describe('MultiChart — mobile is a matter of width (C-15)', () => {
  it('one column on a wide screen is not the mobile layout', async () => {
    const mc = grid({ columns: 1, charts: panels() }, 1000);
    expect(mc.charts[1].options.barColor).toBe('#222222');
    expect(mc.charts[1].options.height).toBe(200);
    expect(fills(mc.charts[1]).every(f => f === '#222222')).toBe(true);
    await staysWithin(mc, 1200);
  });

  it('a narrow container is, whatever the column counts', async () => {
    const mc = grid({ columns: 3, mobileColumns: 2, charts: panels() }, 400);
    expect(gridEl(mc).style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(mc.charts[1].options.barColor).toBe('#333333');
    await staysWithin(mc, 300);
  });

  it('a one-column grid that widens past the breakpoint leaves the mobile layout', async () => {
    const mc = grid({ columns: 1, charts: panels() }, 400);
    expect(mc.charts[1].options.barColor).toBe('#333333');
    await mc.resizeTo(1000);
    expect(mc.charts[1].options.barColor).toBe('#222222');
    expect(mc.charts[1].container.style.height).toBe('200px');
    await staysWithin(mc, 1200);
  });

  it('a hidden container (width 0) keeps the wide layout', async () => {
    const mc = grid({ charts: panels() }, 0);
    expect(mc.charts[1].options.barColor).toBe('#222222');
    await staysWithin(mc, 1000);
  });
});

describe('MultiChart — crossing the breakpoint rebuilds the panel (C-15)', () => {
  it('narrowing applies height and margin from mobileOptions, not just the render-time keys', async () => {
    const mc = grid({ charts: panels() }, 1000);
    const wide = mc.charts[1];
    expect(wide.container.style.height).toBe('200px');
    await mc.resizeTo(400);
    const narrow = mc.charts[1];
    expect(narrow).not.toBe(wide);
    expect(narrow).toBeInstanceOf(Bar);
    expect(narrow.container.style.height).toBe('300px');
    expect(narrow.g.attr('transform')).toMatch(/^translate\(100,/);
    expect(fills(narrow).every(f => f === '#333333')).toBe(true);
    expect(narrow.container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
    expect(wide.container.querySelectorAll('svg')).toHaveLength(1);   // the old chart left the wrapper
  });

  it('widening again restores the options of the wide side', async () => {
    const mc = grid({ charts: panels() }, 400);
    expect(mc.charts[1].container.style.height).toBe('300px');
    await mc.resizeTo(1000);
    const wide = mc.charts[1];
    expect(wide.container.style.height).toBe('200px');
    expect(wide.g.attr('transform')).toMatch(/^translate\(0,/);
    expect(fills(wide).every(f => f === '#222222')).toBe(true);
  });

  it('the rebuilt panel gets the data it was last given — by mc.setData or by the panel itself', async () => {
    const mc = grid({ charts: panels() }, 1000);
    mc.setData([null, later]);
    await mc.resizeTo(400);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(2);

    mc.charts[1].setData(rows);
    await mc.resizeTo(1000);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
  });

  it('a call on a replaced panel instance is not replayed', async () => {
    const mc = grid({ charts: panels() }, 1000);
    const old = mc.charts[1];
    await mc.resizeTo(400);
    old.setData(later);
    await mc.resizeTo(1000);
    expect(mc.charts[1].container.querySelectorAll('rect.rc-bar')).toHaveLength(3);
  });

  it('a panel without mobileOptions is left as it is; spans follow the columns', async () => {
    const mc = grid({ charts: [{ ...panels()[0], span: 2 }, panels()[1]] }, 1000);
    const first = mc.charts[0];
    expect(cells(mc)[0].style.gridColumn).toBe('span 2');
    await mc.resizeTo(400);
    expect(mc.charts[0]).toBe(first);
    expect(cells(mc)[0].style.gridColumn).toBe('');
    expect(gridEl(mc).style.gridTemplateColumns).toBe('repeat(1, 1fr)');
  });

  it('no crossing, no rebuild', async () => {
    const mc = grid({ charts: panels() }, 1000);
    const panel = mc.charts[1];
    await mc.resizeTo(900);
    expect(mc.charts[1]).toBe(panel);
  });
});

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
];

// B-02: an explicit type the grid does not know warns and still draws a Line;
// no type means Line, silently. K-11: every chart class is a type.
describe('MultiChart — chart types (B-02, K-11)', () => {
  const multi = charts => track(new MultiChart(mount(null), { animate: false, charts }));
  const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

  it('an unknown type warns once, naming the cell and the supported types, and draws a Line', () => {
    const warn = silence();
    const m = multi([{ type: 'Line', data: dateSeries }, { type: 'Area', data: dateSeries },
      { type: 'Bar', data: dateSeries }, { data: dateSeries }, { type: null, data: dateSeries }]);
    expect(m.charts.map(c => c.constructor)).toEqual([Line, Line, Bar, Line, Line]);
    expect(m.charts[1].container.querySelector('path.rc-line')).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("RareCharts.MultiChart: charts[1] has an unknown type \"Area\" — drawn as Line. Supported types: "
      + "'Line', 'Bar', 'TimeSeries', 'DualAxes', 'HierarchicalBar', 'Donut', 'Pie', 'Gauge', 'Sankey', 'Graph', 'Map', 'MapFlow'.");
  });

  it('a wrong case points at the right name, and still falls back to Line', () => {
    const warn = silence();
    const m = multi([{ type: 'bar', data: dateSeries }, { type: ' donut ', data: dateSeries }]);
    expect(m.charts.map(c => c.constructor)).toEqual([Line, Line]);
    expect(warn.mock.calls[0][0]).toMatch(/charts\[0\] has an unknown type "bar" .* Did you mean 'Bar'\?$/);
    expect(warn.mock.calls[1][0]).toMatch(/Did you mean 'Donut'\?$/);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('%s is an unknown type, not an Object.prototype member', (type) => {
    const warn = silence();
    let m;
    expect(() => { m = multi([{ type, data: dateSeries }]); }).not.toThrow();
    expect(m.charts[0]).toBeInstanceOf(Line);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(() => m.destroy()).not.toThrow();
  });

  it('a class instead of its name warns too', () => {
    const warn = silence();
    const m = multi([{ type: Bar, data: dateSeries }]);
    expect(m.charts[0]).toBeInstanceOf(Line);
    expect(warn.mock.calls[0][0]).toMatch(/unknown type Bar — drawn as Line/);
  });

  // The two public classes a cell cannot take say why, once per cell: a
  // breakpoint rebuild of the cell does not warn again.
  it('Overview and MultiChart are named as not a cell, once per cell, rebuilds included', async () => {
    const warn = silence();
    const m = grid({ charts: [
      { type: 'Overview', data: dateSeries, mobileOptions: { height: 120 } },
      { type: 'MultiChart', data: dateSeries },
    ] }, 800);
    expect(m.charts.map(c => c.constructor)).toEqual([Line, Line]);
    await m.resizeTo(400);
    await m.resizeTo(800);
    expect(warn.mock.calls.map(c => c[0])).toEqual([
      'RareCharts.MultiChart: charts[0] has type "Overview", which a cell cannot take: the navigator strip is not a chart (use `navigator: true` on a time chart) — drawn as Line.',
      'RareCharts.MultiChart: charts[1] has type "MultiChart", which a cell cannot take: a grid does not nest in a cell — drawn as Line.',
    ]);
  });
});

// K-11 with the S-19 cascade: a cell of each class is that class, gets the
// grid's options (animate, theme, chartHeight; the descriptor's own win),
// draws its data, and the grid's margin.bottom default goes only under a
// bottom axis.
const square = (x, y) => [[[x, y], [x, y + 10], [x + 10, y + 10], [x + 10, y], [x, y]]];
const geoData = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 40) } },
  { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: square(30, 40) } },
] };
const CELLS = [
  ['Line', Line, dateSeries, {}, 'path.rc-line'],
  ['Bar', Bar, rows, {}, 'rect.rc-bar'],
  ['TimeSeries', TimeSeries, dateSeries, {}, 'path.rc-ts-line'],
  ['DualAxes', DualAxes, [{ name: 'V', axis: 'y1', type: 'bar', values: dateSeries },
    { name: 'P', axis: 'y2', type: 'line', values: dateSeries }], {}, 'path.rc-dual-line'],
  ['HierarchicalBar', HierarchicalBar, { label: 'Total', children: [{ label: 'A', value: 3 }, { label: 'B', value: 2 }] }, {}, 'rect'],
  ['Donut', Donut, rows, {}, '.rc-donut-slices path'],
  ['Pie', Pie, rows, {}, '.rc-donut-slices path'],
  ['Gauge', Gauge, { value: 4, max: 10 }, {}, 'path'],
  ['Sankey', Sankey, { links: [{ source: 'A', target: 'B', value: 5 }, { source: 'A', target: 'C', value: 3 }] }, {}, '.rc-sankey-node'],
  ['Graph', Graph, graphData, { duration: 0 }, null],
  ['Map', RareMap, [{ id: 'AA', value: 5 }], { projection: 'mercator', geoData }, 'path'],
  ['MapFlow', MapFlow, {
    nodes: [{ id: 'W', label: 'West', country: 'AA' }, { id: 'E', label: 'East', country: 'BB' }],
    links: [{ source: 'W', target: 'E', value: 3, type: 'goods' }],
  }, { projection: 'mercator', geoData }, '.rc-mapflow-node'],
];

describe('MultiChart — every class is a cell, and the cascade (K-11, S-19)', () => {
  it.each(CELLS)('%s: the cell is that class, takes the grid options and draws', async (type, ChartClass, data, options, mark) => {
    const warn = vi.spyOn(console, 'warn');
    const m = track(new MultiChart(mount(null), {
      animate: false, chartHeight: 260, theme: darkTheme,
      charts: [{ type, data, options }, { type, data, options: { ...options, height: 300, animate: true } }],
    }));
    const [cell, own] = m.charts;
    expect(cell).toBeInstanceOf(ChartClass);
    expect(cell.constructor).toBe(ChartClass);
    expect(cell.options).toMatchObject({ animate: false, height: 260 });
    expect(own.options).toMatchObject({ animate: true, height: 300 });
    expect(cell.options.theme).toBe(darkTheme);
    if (type === 'Graph') await cell.focus('a').whenReady();
    if (cell.whenReady) await cell.whenReady();
    if (mark) expect(cell.container.querySelector(mark), mark).not.toBeNull();
    else expect(cell.container.querySelectorAll('.rc-graph-node').length).toBeGreaterThan(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(CELLS)('%s: margin.bottom 26 only under a bottom axis; a margin the page sets is merged', (type, ChartClass, data, options) => {
    const axis = ['Line', 'Bar', 'DualAxes', 'TimeSeries'].includes(type);
    const m = track(new MultiChart(mount(null), {
      animate: false,
      charts: [{ type, options }, { type, options: { ...options, margin: { left: 12 } } }],
    }));
    const alone = (margin) => track(new ChartClass(mount(null), { animate: false, ...options, ...(margin && { margin }) })).margin;
    const under = m => (axis ? { ...m, bottom: 26 } : m);
    const [cell, set] = m.charts;
    expect(cell.margin).toEqual(under(alone(undefined)));
    expect(set.margin).toEqual(under(alone({ left: 12 })));
    expect(set.margin.left).toBe(12);
  });
});

// S10: the shared legend. An item of the grid's legend that names a series
// of any cell toggles the series of that name in every cell; the event
// fires on the grid only.
describe('MultiChart — the shared legend (S10)', () => {
  const day = i => new Date(2026, 0, 1 + i);
  const vals = values => values.map((value, i) => ({ date: day(i), value }));
  const A = { name: 'Alice', color: '#111111', values: vals([10, 12, 14]) };
  const B = { name: 'Bob',   color: '#222222', values: vals([100, 300, 500]) };
  const C = { name: 'Carol', color: '#333333', values: vals([20, 22, 24]) };
  const LEGEND = [{ label: 'Alice' }, { label: 'Bob' }, { label: 'Carol' }];

  const all = (root, sel) => [...root.querySelectorAll(sel)];
  const strokes = c => all(c.container, 'path.rc-line').map(p => p.getAttribute('stroke'));
  // the grid's own legend: outside the cells
  const shared = mc => all(mc.container, '.rc-legend').find(n => !n.closest('.rc-multichart-grid'));
  const item = (mc, key) => shared(mc).querySelector(`.rc-legend-item[data-key="${key}"]`);
  const reset = mc => shared(mc).querySelector('.rc-legend-reset');
  const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
  const make = (o = {}, charts = null) => track(new MultiChart(mount(null, { width: 900 }), {
    animate: false, legend: LEGEND,
    charts: charts ?? [
      { type: 'Line', data: [A, B] },
      { type: 'Line', data: [B, C] },
      { type: 'Line', data: [C] },
    ],
    ...o,
  }));

  afterEach(() => {
    if (vi.isFakeTimers()) vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('an item that names a series in any cell is a toggle; one that names none stays a label and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mc = make({ legend: [...LEGEND, { label: 'Dave' }] });
    expect(all(shared(mc), 'button.rc-legend-item').map(b => b.dataset.key)).toEqual(['Alice', 'Bob', 'Carol']);
    expect(all(shared(mc), 'div.rc-legend-item').map(d => d.textContent)).toEqual(['Dave']);
    expect(item(mc, 'Bob').querySelector('[aria-hidden]').style.getPropertyValue('--rc-swatch-color')).toBe('#222222');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^RareCharts\.MultiChart: legend item "Dave" names no series/);
  });

  it('an item waits for the data of every cell before it warns', () => {
    const warn = vi.spyOn(console, 'warn');
    const mc = make({}, [{ type: 'Line' }, { type: 'Line' }]);
    mc.charts[0].setData([A, B]);
    expect(warn).not.toHaveBeenCalled();
    mc.charts[1].setData([C]);
    expect(warn).not.toHaveBeenCalled();
    expect(all(shared(mc), 'button[data-key]').map(b => b.dataset.key)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('a grid legend that names no series stays a caption, silently', () => {
    const warn = vi.spyOn(console, 'warn');
    const mc = make({ legend: [{ label: 'Survey 2026' }] });
    expect(shared(mc).querySelector('button')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('a click hides the name in every cell, redraws only the cells that draw it, and fires once, on the grid', () => {
    const onLegendToggle = vi.fn();
    const own = vi.fn();
    const mc = make({ onLegendToggle }, [
      { type: 'Line', data: [A, B], options: { onLegendToggle: own } },
      { type: 'Line', data: [B, C] },
      { type: 'Line', data: [C] },
    ]);
    const third = vi.spyOn(mc.charts[2], 'render');
    click(item(mc, 'Bob'));
    expect(mc.charts.map(strokes)).toEqual([['#111111'], ['#333333'], ['#333333']]);
    expect(third).not.toHaveBeenCalled();
    expect(item(mc, 'Bob').getAttribute('aria-pressed')).toBe('false');
    expect(reset(mc).hidden).toBe(false);
    expect(onLegendToggle).toHaveBeenCalledTimes(1);
    expect(onLegendToggle).toHaveBeenCalledWith({ name: 'Bob', visible: false, visibleNames: ['Alice', 'Carol'] });
    expect(own).not.toHaveBeenCalled();

    click(reset(mc));
    expect(mc.charts.map(strokes)).toEqual([['#111111', '#222222'], ['#222222', '#333333'], ['#333333']]);
    expect(reset(mc).hidden).toBe(true);
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: null, visible: true, visibleNames: ['Alice', 'Bob', 'Carol'] });
  });

  it('a double click keeps only that series in every cell; a second one brings all back', () => {
    vi.useFakeTimers();
    const mc = make();
    click(item(mc, 'Carol'), 1);
    click(item(mc, 'Carol'), 2);
    expect(mc.charts.map(strokes)).toEqual([[], ['#333333'], ['#333333']]);
    click(item(mc, 'Carol'), 1);
    click(item(mc, 'Carol'), 2);
    vi.advanceTimersByTime(1000);
    expect(mc.charts.map(strokes)).toEqual([['#111111', '#222222'], ['#222222', '#333333'], ['#333333']]);
  });

  it('setSeriesVisible applies to every cell, with no event; null shows all', () => {
    const onLegendToggle = vi.fn();
    const mc = make({ onLegendToggle });
    expect(mc.setSeriesVisible(['Alice'])).toBe(mc);
    expect(mc.charts.map(strokes)).toEqual([['#111111'], [], []]);
    expect(all(shared(mc), 'button[data-key]').map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    mc.setSeriesVisible(null);
    expect(mc.charts.map(strokes)).toEqual([['#111111', '#222222'], ['#222222', '#333333'], ['#333333']]);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('a series that comes later into a cell arrives hidden, and the grid legend follows the data', () => {
    const mc = make({}, [{ type: 'Line', data: [A] }, { type: 'Line' }]);
    expect(item(mc, 'Bob')).toBeNull();                 // no cell draws Bob yet: a label
    mc.setSeriesVisible(['Alice']);
    mc.charts[1].setData([B, C]);
    expect(item(mc, 'Bob').getAttribute('aria-pressed')).toBe('true');   // a key not in the data drops
    click(item(mc, 'Carol'));
    mc.charts[0].setData([A, C]);
    expect(strokes(mc.charts[0])).toEqual(['#111111']);
    expect(strokes(mc.charts[1])).toEqual(['#222222']);
  });

  it('a breakpoint rebuild keeps the hidden series', async () => {
    const mc = grid({ legend: LEGEND, charts: [
      { type: 'Line', data: [A, B], mobileOptions: { height: 300 }, options: { legend: [{ label: 'Alice' }, { label: 'Bob' }] } },
    ] }, 800);
    click(item(mc, 'Bob'));
    const before = mc.charts[0];
    await mc.resizeTo(400);
    expect(mc.charts[0]).not.toBe(before);
    expect(strokes(mc.charts[0])).toEqual(['#111111']);
    expect(mc.charts[0].container.querySelector('.rc-legend-item[data-key="Bob"]').getAttribute('aria-pressed')).toBe('false');
  });

  it("a cell's own legend acts on that cell; the next shared gesture overrides it for the shared names only", () => {
    const mc = make({ legend: [{ label: 'Alice' }, { label: 'Bob' }] }, [
      { type: 'Line', data: [A, B, C], options: { legend: LEGEND } },
      { type: 'Line', data: [A, B, C] },
    ]);
    const cellItem = key => mc.charts[0].container.querySelector(`.rc-legend-item[data-key="${key}"]`);
    click(cellItem('Bob'));
    click(cellItem('Carol'));
    expect(mc.charts.map(strokes)).toEqual([['#111111'], ['#111111', '#222222', '#333333']]);
    expect(item(mc, 'Bob').getAttribute('aria-pressed')).toBe('true');
    click(item(mc, 'Alice'));
    // Bob follows the grid (shown), Carol is the cell's own and stays off
    expect(mc.charts.map(strokes)).toEqual([['#222222'], ['#222222', '#333333']]);
  });

  it('legendRescale goes down to every cell that does not set its own', () => {
    const mc = make({ legendRescale: false }, [{ type: 'Line', data: [A] }, { type: 'Line', data: [B], options: { legendRescale: true } }]);
    expect(mc.charts.map(c => c.options.legendRescale)).toEqual([false, true]);
    expect('legendRescale' in make().charts[0].options).toBe(false);
  });

  it('the names of other classes join: a Sankey cell hides its links of that type', () => {
    const mc = make({ legend: [{ label: 'loan' }] }, [
      { type: 'Sankey', data: { links: [{ source: 'A', target: 'B', value: 5, type: 'loan' }, { source: 'A', target: 'C', value: 3, type: 'gift' }] } },
    ]);
    const bands = () => mc.charts[0].container.querySelectorAll('.rc-sankey-link').length;
    expect(bands()).toBe(2);
    click(item(mc, 'loan'));
    expect(bands()).toBe(1);
  });
});

// RC-023: the grid is a group with a name, as a chart's drawing is named;
// a cell's drawing falls back to the cell title.
describe('MultiChart — accessible names (RC-023)', () => {
  const make = (o = {}, charts = [{ type: 'Line', data: dateSeries }]) =>
    track(new MultiChart(mount(null), { animate: false, charts, ...o }));
  const group = mc => mc.container.querySelector('.rc-multichart-grid');
  const svgLabels = mc => mc.charts.map(c => c.container.querySelector('svg').getAttribute('aria-label'));

  it('ariaLabel names the group; without it the title and subtitle; without them the group has no name', () => {
    expect(group(make({ ariaLabel: '  Market  ', title: 'T' })).getAttribute('aria-label')).toBe('Market');
    expect(group(make({ title: 'Prices', subtitle: '2026' })).getAttribute('aria-label')).toBe('Prices — 2026');
    const bare = group(make({ ariaLabel: ' ' }));
    expect(bare.getAttribute('role')).toBe('group');
    expect(bare.hasAttribute('aria-label')).toBe(false);
  });

  it("a cell's drawing takes its own ariaLabel, title or subtitle, else the cell title", () => {
    const mc = make({}, [
      { type: 'Line', title: 'Cell A', data: dateSeries },
      { type: 'Bar', title: 'Cell B', data: rows, options: { ariaLabel: 'Own' } },
      { type: 'Donut', title: 'Cell C', data: rows, options: { title: 'Shares' } },
      { type: 'Line', data: dateSeries },
    ]);
    expect(svgLabels(mc)).toEqual(['Cell A', 'Own', 'Shares', 'Chart']);
    expect(mc.charts.every(c => c.container.querySelector('svg').getAttribute('role') === 'img')).toBe(true);
  });
});
