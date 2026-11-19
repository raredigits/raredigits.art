// The base Chart's legend glue (core/Chart.js; the legend spec, §7, §8 and
// decisions 8–10, 13–15, 20–22): the header legend is drawn by the one
// builder (core/legend.js) and synced before every render; its items map to
// series; the chart keeps one set of hidden keys; a committed gesture
// updates it, redraws and calls onLegendToggle; _setVisibleKeys is the core
// of the setters (setSeriesVisible, setLinkTypesVisible).
//
// A probe class stands for a chart with a series legend: it lists its series
// (_legendSeries) and records, at each render, what it draws and what the
// legend reads at that moment. Each class gets its series legend in its own
// step (Line's is in line-legend.test.js); the last blocks check Graph's type
// legend apart from the header legend, and legend buttons whose off state is
// aria-pressed alone.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { Chart } from '../assets/charts/src/core/Chart.js';
import { HIDE_DELAY_MS } from '../assets/charts/src/core/legend.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';
import { chainLiteral } from '../assets/charts/src/core/paint.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { fixture } from './fixtures/graph.js';
import { mount, track } from './helpers.js';

// ─── The probe ───────────────────────────────────────────────────────────────

class Probe extends Chart {
  constructor(selector, options = {}) {
    super(selector, options);
    this._series = [];
    this.renders = [];
  }

  setData(series) {
    this._series = series;
    this.render();
    return this;
  }

  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  _legendSeries() {
    return (this._series ?? []).map(s => ({ key: s.name, color: s.color }));
  }

  // What the chart draws, and what its legend reads while it draws.
  render() {
    const el = this._legendEl;
    const reset = el?.querySelector('.rc-legend-reset');
    this.renders.push({
      drawn: this._series.filter(s => this._isShown(s.name)).map(s => s.name),
      pressed: el ? [...el.querySelectorAll('button[data-key]')].map(b => `${b.dataset.key}:${b.getAttribute('aria-pressed')}`) : [],
      reset: reset ? !reset.hidden : null,
    });
  }
}

const ABC = [{ name: 'Alice', color: '#111111' }, { name: 'Bob', color: '#222222' }, { name: 'Carol' }];
const probe = (o = {}) => track(new Probe(mount(null), o));
const last = c => c.renders.at(-1);
const itemOf = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
const itemsOf = c => [...c.container.querySelectorAll('.rc-legend > *')];
const resetOf = c => c.container.querySelector('.rc-legend-reset');
const shownKeys = c => [...c.container.querySelectorAll('.rc-legend button[data-key]')]
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.key);
const click = (node, detail = 0) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
// a real double click in an engine that counts clicks: click 1, click 2, dblclick
const doubleClick = node => {
  click(node, 1);
  click(node, 2);
  node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
};

afterEach(() => vi.useRealTimers());

// ─── Mapping (decision 13) ──────────────────────────────────────────────────

describe('header legend items map to series', () => {
  const legend = [
    { label: 'Alice' },                                   // label
    { name: 'Bob', label: 'Robert' },                     // name over label
    { label: 'Electricity Cost', series: 'Carol' },       // series over both
    { label: 'Recession', type: 'band', series: false },  // a caption
    { label: 'Dave' },                                    // no such series
  ];

  it('series, then name, then label; series: false and an unknown name stay labels', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = probe({ legend }).setData(ABC);
    expect(itemsOf(c).map(el => `${el.localName}:${el.dataset.key ?? '-'}:${el.lastElementChild.textContent}`)).toEqual([
      'button:Alice:Alice', 'button:Bob:Robert', 'button:Carol:Electricity Cost',
      'div:-:Recession', 'div:-:Dave', 'button:-:Show all',
    ]);
    expect(shownKeys(c)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('at construction every item is a label (the series are not known yet); the first render maps them', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Bob' }] });
    expect(itemsOf(c).map(el => el.localName)).toEqual(['div', 'div']);
    expect(c.container.querySelector('.rc-legend').hasAttribute('role')).toBe(false);
    c.setData(ABC);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['button', 'button', 'button']);
    expect(c.container.querySelector('.rc-legend').getAttribute('role')).toBe('group');
  });

  it('a class without a series legend keeps every item a label, through renders', () => {
    class Plain extends Chart { render() {} }
    const c = track(new Plain(mount(null), { legend: [{ label: 'Alice' }, { label: 'Bob' }] }));
    const before = itemsOf(c);
    c.render();
    c.render();
    expect(itemsOf(c)).toEqual(before);                   // the same elements, not rebuilt
    expect(before.map(el => el.localName)).toEqual(['div', 'div']);
    expect(resetOf(c)).toBeNull();
  });

  it('a render that changes nothing writes nothing to the legend (it runs on every frame)', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Bob', type: 'dashed' }, { label: 'Note', type: 'band' }] }).setData(ABC);
    click(itemOf(c, 'Bob'));
    const seen = new MutationObserver(() => {});
    seen.observe(c.container.querySelector('.rc-legend'), { subtree: true, childList: true, attributes: true, characterData: true });
    c.render();
    c.setData(ABC);
    expect(seen.takeRecords()).toEqual([]);
    seen.disconnect();
  });

  it('an item without a colour takes its series colour, else the accent; its own colour wins (decision 22)', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Bob', color: '#abcdef' }, { label: 'Carol' }, { label: 'Note' }] })
      .setData(ABC);
    const colors = itemsOf(c).filter(el => el.dataset.key || el.localName === 'div')
      .map(el => el.firstElementChild.style.getPropertyValue('--rc-swatch-color'));
    // the accent as the card's token (K-14): a theme's own accent is published there
    const accent = 'var(--rc-accent, #1677ff)';
    expect(colors).toEqual(['#111111', '#abcdef', accent, accent]);
    expect(accent).toBe(`var(--rc-accent, ${chainLiteral(defaultTheme.accent)})`);
  });

  it('a class may match items its own way (_legendKeyOf: Donut matches ids)', () => {
    class ById extends Probe {
      _legendKeyOf(item, present) { return item.id != null && present.has(item.id) ? item.id : null; }
    }
    const c = track(new ById(mount(null), { legend: [{ id: 'Bob', label: 'Second' }, { label: 'Alice' }] })).setData(ABC);
    expect(itemsOf(c).map(el => `${el.localName}:${el.dataset.key ?? '-'}`)).toEqual(['button:Bob', 'div:-', 'button:-']);
  });
});

// ─── The header legend's look, as before ────────────────────────────────────

describe('the header legend draws as it did', () => {
  it('swatches by type, the colour in --rc-swatch-color, no inline background; 5/3 dashes; the label inherits the card\'s text', () => {
    const c = probe({ theme: { text: '#123456' }, legend: [
      { label: 'line', color: '#ff0000' },
      { label: 'dashed', type: 'dashed' },
      { label: 'flag', dash: true },
      { label: 'pattern', dash: '6 4' },                  // a flag here: the 5/3 dash
      { label: 'dot', type: 'dot' },
      { label: 'bar', type: 'bar' },
      { label: 'band', type: 'band', dash: true },        // the type wins
    ] });
    const rows = itemsOf(c).map(el => {
      const sw = el.firstElementChild;
      return [sw.className, sw.style.getPropertyValue('--rc-swatch-color'), sw.style.getPropertyValue('--rc-swatch-dash'),
        sw.style.background, sw.getAttribute('aria-hidden'), el.lastElementChild.style.color];
    });
    const accent = 'var(--rc-accent, #1677ff)';          // the card's accent token
    const label = '';                                     // no inline colour: .rc-legend takes --rc-text (K-14)
    expect(rows).toEqual([
      ['rc-legend-line', '#ff0000', '', '', 'true', label],
      ['rc-legend-line rc-legend-line--dashed', accent, '', '', 'true', label],
      ['rc-legend-line rc-legend-line--dashed', accent, '', '', 'true', label],
      ['rc-legend-line rc-legend-line--dashed', accent, '', '', 'true', label],
      ['rc-legend-dot', accent, '', '', 'true', label],
      ['rc-legend-dot', accent, '', '', 'true', label],
      ['rc-legend-band', accent, '', '', 'true', label],
    ]);
  });

  it('a string or element legend is the page\'s own: the render leaves it alone', () => {
    const own = document.createElement('span');
    own.textContent = 'mine';
    const c = probe({ legend: own }).setData(ABC);
    c.render();
    expect(c.container.querySelector('.rc-legend').firstChild).toBe(own);
    const s = probe({ legend: '<b>bold</b>' }).setData(ABC);
    expect(s.container.querySelector('.rc-legend').innerHTML).toBe('<b>bold</b>');
  });
});

// ─── The warning (decision 14) ──────────────────────────────────────────────

describe('a legend item that names no series', () => {
  let warn;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });

  it('warns once per item when another item maps', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Electricity Cost' }] }).setData(ABC);
    c.render();
    c.setData(ABC);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe(
      'RareCharts.Probe: legend item "Electricity Cost" names no series — set `series` to the series name, or `series: false` for a caption');
  });

  it('stays quiet when nothing maps, and for series: false', () => {
    probe({ legend: [{ label: 'Revenue, millions USD' }, { label: 'Other' }] }).setData(ABC);
    probe({ legend: [{ label: 'Alice' }, { label: 'Recession', series: false }] }).setData(ABC);
    expect(warn).not.toHaveBeenCalled();
  });
});

// ─── The sync runs before the render (decision 10) ──────────────────────────

describe('the legend is synced before the class renders', () => {
  it('the render sees the toggles, their state and Show all already in place', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Bob' }] }).setData(ABC);
    expect(last(c)).toEqual({ drawn: ['Alice', 'Bob', 'Carol'], pressed: ['Alice:true', 'Bob:true'], reset: false });
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(last(c)).toEqual({ drawn: ['Alice', 'Carol'], pressed: ['Alice:true', 'Bob:false'], reset: true });
  });

  it('no render after destroy(), so no sync either', () => {
    const c = probe({ legend: [{ label: 'Alice' }] }).setData(ABC);
    const n = c.renders.length;
    c.destroy();
    c.render();
    expect(c.renders).toHaveLength(n);
  });
});

// ─── Gestures, the hidden set and the event ─────────────────────────────────

describe('a legend gesture', () => {
  const AB = [{ label: 'Alice' }, { label: 'Bob' }];

  it('a click (Enter, Space, a script) hides a series at once, and a second shows it', () => {
    const c = probe({ legend: AB }).setData(ABC);
    click(itemOf(c, 'Bob'));
    expect(last(c).drawn).toEqual(['Alice', 'Carol']);
    expect(itemOf(c, 'Bob').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(c).hidden).toBe(false);
    click(itemOf(c, 'Bob'));
    expect(last(c).drawn).toEqual(['Alice', 'Bob', 'Carol']);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('a pointer click hides after the delay; a double click keeps only that series in one render; a second brings all back', () => {
    vi.useFakeTimers();
    const c = probe({ legend: AB }).setData(ABC);
    const n = c.renders.length;
    click(itemOf(c, 'Bob'), 1);
    expect(c.renders).toHaveLength(n);                    // waits for a second click
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(last(c).drawn).toEqual(['Alice', 'Carol']);
    click(itemOf(c, 'Bob'));                              // back
    const m = c.renders.length;
    doubleClick(itemOf(c, 'Alice'));
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(c.renders).toHaveLength(m + 1);                // one render, no flash
    expect(last(c).drawn).toEqual(['Alice', 'Carol']);    // Carol has no item: not the legend's to hide
    doubleClick(itemOf(c, 'Alice'));
    expect(last(c).drawn).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('changes only the keys this legend lists; Show all shows every key (decision 8)', () => {
    const c = probe({ legend: AB }).setData(ABC);
    c.setSeriesVisible(['Alice', 'Bob']);                 // Carol: hidden, and no item for her
    click(itemOf(c, 'Bob'));
    expect(last(c).drawn).toEqual(['Alice']);
    click(itemOf(c, 'Bob'));
    expect(last(c).drawn).toEqual(['Alice', 'Bob']);      // Carol stays hidden
    expect(resetOf(c).hidden).toBe(false);                // something is off, listed or not
    click(resetOf(c));
    expect(last(c).drawn).toEqual(['Alice', 'Bob', 'Carol']);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('Show all clears a dormant key too', () => {
    const c = probe({ legend: AB }).setData(ABC);
    click(itemOf(c, 'Bob'));
    c.setData([ABC[0], ABC[2]]);                          // Bob leaves the data, hidden
    click(itemOf(c, 'Alice'));
    click(resetOf(c));
    c.setData(ABC);                                       // Bob is back: shown
    expect(last(c).drawn).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('onLegendToggle({ name, visible, visibleNames }) after the redraw, with the chart as this', () => {
    vi.useFakeTimers();
    const calls = [];
    const c = probe({
      legend: AB,
      onLegendToggle(info) { calls.push({ ...info, self: this === c, drawn: last(this).drawn }); },
    }).setData(ABC);
    click(itemOf(c, 'Bob'));
    click(itemOf(c, 'Bob'));
    doubleClick(itemOf(c, 'Alice'));
    doubleClick(itemOf(c, 'Alice'));
    click(itemOf(c, 'Alice'));
    click(resetOf(c));
    expect(calls).toEqual([
      { name: 'Bob', visible: false, visibleNames: ['Alice', 'Carol'], self: true, drawn: ['Alice', 'Carol'] },
      { name: 'Bob', visible: true, visibleNames: ['Alice', 'Bob', 'Carol'], self: true, drawn: ['Alice', 'Bob', 'Carol'] },
      { name: 'Alice', visible: true, visibleNames: ['Alice', 'Carol'], self: true, drawn: ['Alice', 'Carol'] },
      { name: 'Alice', visible: true, visibleNames: ['Alice', 'Bob', 'Carol'], self: true, drawn: ['Alice', 'Bob', 'Carol'] },
      { name: 'Alice', visible: false, visibleNames: ['Bob', 'Carol'], self: true, drawn: ['Bob', 'Carol'] },
      { name: null, visible: true, visibleNames: ['Alice', 'Bob', 'Carol'], self: true, drawn: ['Alice', 'Bob', 'Carol'] },
    ]);
  });

  it('a hide still pending at destroy() commits nothing and calls nothing', () => {
    vi.useFakeTimers();
    const onLegendToggle = vi.fn();
    const c = probe({ legend: AB, onLegendToggle }).setData(ABC);
    click(itemOf(c, 'Bob'), 1);
    c.destroy();
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(onLegendToggle).not.toHaveBeenCalled();
    expect(c._isShown('Bob')).toBe(true);
  });
});

// ─── The setters' core and setData (decisions 9, 20) ────────────────────────

describe('_setVisibleKeys and the hidden set across setData', () => {
  const AB = [{ label: 'Alice' }, { label: 'Bob' }];

  it('a list shows those and hides the rest; null shows all; no event; the chart is returned', () => {
    const onLegendToggle = vi.fn();
    const c = probe({ legend: AB, onLegendToggle }).setData(ABC);
    expect(c.setSeriesVisible(['Bob'])).toBe(c);
    expect(last(c).drawn).toEqual(['Bob']);
    expect(shownKeys(c)).toEqual(['Bob']);
    c.setSeriesVisible(new Set(['Alice', 'Carol']));
    expect(last(c).drawn).toEqual(['Alice', 'Carol']);
    c.setSeriesVisible('Carol');                          // one name
    expect(last(c).drawn).toEqual(['Carol']);
    c.setSeriesVisible(null);
    expect(last(c).drawn).toEqual(['Alice', 'Bob', 'Carol']);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('a hidden key that leaves the data stays hidden and comes back hidden; its item is a label meanwhile', () => {
    const c = probe({ legend: AB }).setData(ABC);
    click(itemOf(c, 'Bob'));
    c.setData([ABC[0], ABC[2]]);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['button', 'div', 'button']);
    expect(resetOf(c).hidden).toBe(true);                 // nothing in the data is off
    c.setData(ABC);
    expect(last(c).drawn).toEqual(['Alice', 'Carol']);
    expect(itemOf(c, 'Bob').getAttribute('aria-pressed')).toBe('false');
    c.setData([...ABC, { name: 'Dave' }]);                // a new key starts visible
    expect(last(c).drawn).toEqual(['Alice', 'Carol', 'Dave']);
  });

  it('a list drops the dormant keys: they come back shown', () => {
    const c = probe({ legend: AB }).setData(ABC);
    click(itemOf(c, 'Bob'));
    c.setData([ABC[0], ABC[2]]);
    c.setSeriesVisible(['Alice']);
    c.setData(ABC);
    expect(last(c).drawn).toEqual(['Alice', 'Bob']);
  });
});

// ─── legendInteractive: false (decision 15) ─────────────────────────────────

describe('legendInteractive: false', () => {
  it('every item a label, no Show all; a series hidden through the API leaves the legend', () => {
    const c = probe({ legend: [{ label: 'Alice' }, { label: 'Bob' }, { label: 'Note' }], legendInteractive: false }).setData(ABC);
    expect(itemsOf(c).map(el => el.localName)).toEqual(['div', 'div', 'div']);
    expect(c.container.querySelector('.rc-legend').hasAttribute('role')).toBe(false);
    c.setSeriesVisible(['Alice', 'Carol']);
    expect(itemsOf(c).map(el => el.lastElementChild.textContent)).toEqual(['Alice', 'Note']);
    expect(resetOf(c)).toBeNull();
    c.setSeriesVisible(null);
    expect(itemsOf(c).map(el => el.lastElementChild.textContent)).toEqual(['Alice', 'Bob', 'Note']);
  });
});

// ─── The real classes: nothing changes yet ──────────────────────────────────

describe('the classes without a series legend yet', () => {
  it('Graph: the header legend and the type legend are two elements; the sync before a render touches only the header one', async () => {
    const g = track(new Graph(mount(null), { duration: 0, legend: [{ label: 'Note', color: '#ff0000' }] })).setData(fixture);
    await g.whenReady();
    const types = g.container.querySelector('.rc-graph-legend');
    const focused = types.querySelector('.rc-graph-legend-item[data-type="family"]');
    focused.focus();
    g.render();
    const header = g.container.querySelector('.rc-chart-header .rc-legend');
    expect([...header.children].map(el => el.textContent)).toEqual(['Note']);
    expect(types.querySelectorAll('.rc-graph-legend-item').length).toBeGreaterThan(1);
    // Graph's own rebuild hands focus on (legendFocus): nothing emptied the
    // type legend before it
    expect(document.activeElement.closest('.rc-graph-legend')).toBe(types);
    expect(document.activeElement.dataset.type).toBe('family');
  });
});

describe('Graph, flow and MapFlow legend buttons: off is aria-pressed alone, no inline opacity', () => {
  const styleOf = el => [...el.querySelectorAll('button.rc-legend-item')]
    .map(b => `${b.getAttribute('aria-pressed')}:${b.style.opacity}`);

  it('Graph ego, filtered to one relation type', async () => {
    const g = track(new Graph(mount(null), { duration: 0, relationTypes: ['family'] })).setData(fixture);
    await g.whenReady();
    expect(styleOf(g.container).sort()).toEqual(['false:', 'false:', 'true:']);
  });

  it('the flow view, a category hidden from the start', async () => {
    const g = track(new Graph(mount(null), {
      view: 'flow', duration: 0, hiddenLinkTypes: ['noise'],
      linkTypes: { eth: { color: '#333333', label: 'ETH' }, noise: { color: '#cc0000', label: 'poisoning' } },
    })).setData({
      nodes: [{ id: 'a', lane: 'x' }, { id: 'b', lane: 'y' }, { id: 'c', lane: 'y', row: 1 }],
      links: [{ source: 'a', target: 'b', type: 'eth' }, { source: 'a', target: 'c', type: 'noise' }],
    });
    await g.whenReady();
    expect(styleOf(g.container)).toEqual(['true:', 'false:']);
  });

  it('MapFlow, a type hidden from the start', async () => {
    const square = (x, y) => [[[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10], [x, y]]];
    const c = track(new MapFlow(mount(null), {
      geoData: { type: 'FeatureCollection', features: [
        { type: 'Feature', id: '1', geometry: { type: 'Polygon', coordinates: square(0, 40) } },
        { type: 'Feature', id: '2', geometry: { type: 'Polygon', coordinates: square(30, 40) } },
      ] },
      projection: 'mercator', hiddenLinkTypes: ['silver'],
    })).setData({
      nodes: [{ id: 'W', country: '1' }, { id: 'E', country: '2' }],
      links: [{ from: 'W', to: 'E', type: 'goods', value: 1 }, { from: 'E', to: 'W', type: 'silver', value: 1 }],
    });
    await c.whenReady();
    expect(styleOf(c.container)).toEqual(['true:', 'false:']);
  });
});

// ─── The stylesheet's side (rare-charts.css) ────────────────────────────────

describe('rare-charts.css: the legend and the range buttons', () => {
  const root = postcss.parse(readFileSync('assets/charts/rare-charts.css', 'utf8'));
  const rules = [];
  // the screen rules: the print block hides Show all on paper (RC-019)
  root.walkRules(r => { if (!(r.parent.type === 'atrule' && r.parent.params === 'print')) rules.push(r); });
  const declOf = (selector, prop) => rules.filter(r => r.selectors.includes(selector))
    .flatMap(r => r.nodes.filter(n => n.prop === prop)).at(-1)?.value;
  const indexOf = selector => rules.findIndex(r => r.selectors.includes(selector));

  it('swatches paint --rc-swatch-color; a dashed one its 5/3 dash unless the item gives one', () => {
    ['.rc-legend-line', '.rc-legend-dot', '.rc-legend-band']
      .forEach(s => expect(declOf(s, 'background'), s).toBe('var(--rc-swatch-color, currentColor)'));
    const dashed = declOf('.rc-legend-line--dashed', 'background').replace(/\s+/g, ' ');
    expect(dashed).toBe('repeating-linear-gradient(90deg, var(--rc-swatch-color, currentColor) 0 var(--rc-swatch-dash, 5px), '
      + 'transparent var(--rc-swatch-dash, 5px) calc(var(--rc-swatch-dash, 5px) + var(--rc-swatch-gap, 3px)))');
    // the dashed gradient comes after the plain colour, so it wins on a dashed line
    const plain = rules.findIndex(r => r.selectors.includes('.rc-legend-line') && r.selectors.includes('.rc-legend-dot'));
    expect(plain).toBeGreaterThan(-1);
    expect(indexOf('.rc-legend-line--dashed')).toBeGreaterThan(plain);
  });

  it('off dims the item\'s children, never the item: the focus ring keeps its contrast', () => {
    expect(declOf('.rc-legend-item[aria-pressed="false"] > *', 'opacity')).toBe('0.35');
    const dimsItem = rules.filter(r => r.selectors.some(s => /rc-legend-item[^ >]*\[aria-pressed="false"\]$/.test(s))
      && r.nodes.some(n => n.prop === 'opacity'));
    expect(dimsItem).toEqual([]);
  });

  it('the reset reaches every state, of the items and of Show all; no rule selects the K-06 alias classes', () => {
    const states = ['', ':hover', ':active'];
    states.forEach(st => {
      expect(declOf(`.rc-legend-item.rc-legend-item${st}`, 'padding'), st).toBe('0');
      expect(declOf(`.rc-legend-reset.rc-legend-reset${st}`, 'padding'), st).toBe('0');
      expect(declOf(`.rc-legend-reset.rc-legend-reset${st}`, 'background'), st).toBe('transparent');
    });
    // one item size everywhere: the Graph, flow and MapFlow rows lost their
    // 2px padding with the old Graph legend rules (S3b)
    expect(rules.filter(r => /rc-graph-legend-(item|reset)/.test(r.selector)).map(r => r.selector)).toEqual([]);
  });

  it('Show all: hidden while nothing is off, laid out invisibly in the right-hand column; its text dimmed, not the button', () => {
    expect(declOf('.rc-legend-reset', 'display')).toBe('inline-flex');
    expect(declOf('.rc-legend-reset[hidden]', 'display')).toBe('none');
    expect(declOf('.rc-chart-legend-aside .rc-legend-reset[hidden]', 'display')).toBe('inline-flex');
    expect(declOf('.rc-chart-legend-aside .rc-legend-reset[hidden]', 'visibility')).toBe('hidden');
    expect(declOf('.rc-chart-legend-aside .rc-legend-reset', 'margin-bottom')).toBe('calc(-1.3em - var(--rc-space-sm))');
    expect(declOf('.rc-legend-reset > span', 'text-decoration')).toBe('underline');
    expect(declOf('.rc-legend-reset > span', 'opacity')).toBe('0.7');
    expect(rules.filter(r => r.selectors.some(s => /\.rc-legend-reset(:[a-z-]+)?$/.test(s))
      && r.nodes.some(n => n.prop === 'opacity'))).toEqual([]);
    ['cursor', 'touch-action'].forEach(p => expect(declOf('.rc-legend-reset', p), p).toBe(declOf('button.rc-legend-item', p)));
    expect(declOf('.rc-legend-reset::before', 'inset')).toBe('-3px 0');
    // the one focus rule of every chart button (RC-015) lists it
    const ring = rules.find(r => r.selectors.some(x => x.startsWith(':is(') && x.includes('.rc-legend-reset') && x.endsWith(':focus-visible')));
    expect(ring?.nodes.find(n => n.prop === 'outline')?.value).toBe('2px solid var(--rc-focus-ring)');
  });

  it('the pressed timeframe is selected by aria-pressed; .active is no longer selected', () => {
    expect(declOf('.rc-range-btn[aria-pressed="true"]', 'border-color')).toBe('var(--rc-control-hover-border)');
    expect(rules.filter(r => r.selector.includes('.active'))).toEqual([]);
  });
});
