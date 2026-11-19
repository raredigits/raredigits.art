// S-16 — the CSS contract: the selectors in assets/charts/rare-charts.css
// against the classes the library emits.
//
//   1. The classes the stylesheet selects: postcss + postcss-selector-parser,
//      inside :is() / :where() / :not() / :has() too.
//   2. The classes the library emits, found two ways:
//      - a static scan of assets/charts/src for class literals where the code
//        writes a class: .attr('class', …), .classed(…) (not `false`),
//        el.className = …, classList.add / toggle, and class="…" in the HTML
//        strings (tooltips, the details panel);
//      - a runtime pass that renders every chart class in jsdom with the
//        optional parts on and reads classList off the DOM, so the classes
//        built at run time (rc-axis-title-${axis}, the Graph tool buttons'
//        `cls` argument, the state classes) are seen too.
//
// Every class the stylesheet selects is emitted, except the allowlist below;
// the documented hooks are emitted (the public surface, RC-034). Lands before
// the K-06 renames: a renamed class takes its CSS with it or keeps an alias.
// Other properties of the stylesheet (host fallbacks, fonts, the X-05 dead
// aliases, tooltip typography) are checked in test/charts-css.test.js.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut, Pie } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Overview } from '../assets/charts/src/charts/Overview.js';
import { MultiChart } from '../assets/charts/src/charts/MultiChart.js';
import { Map as RareMap } from '../assets/charts/src/charts/Map.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { fixture } from './fixtures/graph.js';
import { mount, track, cleanupCharts } from './helpers.js';

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'assets/charts/src');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');

// Selected in rare-charts.css and emitted by nothing. Each entry says why and
// names the task that removes it; the list only shrinks. Pages set no class
// the stylesheet selects: the documented hooks a page's element carries
// (.rc-chart, .rc-chart-controls, .rc-graph-details) the library adds itself.
const NOT_EMITTED = {
  // empty since X-07 removed `.rc-chart-controls label.is-disabled`
};

// ─── 1. The classes the stylesheet selects ─────────────────────────────────

// { classes: Map<class, selectors[]>, compounds: [{ classes, selector }] }.
// A compound is the set of classes one element carries together (`.a.b`);
// a class in a pseudo-class argument is not part of it (`.a:not(.b)` is [a]),
// though that argument has compounds of its own (`:is(.c.d)` is [c, d]).
function cssClasses(css) {
  const classes = new Map();
  const compounds = [];
  // the one selector of a comma list that holds `node`, on one line
  const selectorOf = node => {
    while (node.parent && node.parent.type !== 'root') node = node.parent;
    return String(node).replace(/\s+/g, ' ').trim();
  };
  postcss.parse(css).walkRules(rule => {
    selectorParser(selectors => {
      selectors.walkClasses(c => {
        if (!classes.has(c.value)) classes.set(c.value, []);
        classes.get(c.value).push(selectorOf(c));
      });
      selectors.walk(node => {
        if (node.type !== 'selector') return;
        let run = new Set();
        const flush = () => {
          if (run.size > 1) compounds.push({ classes: [...run], selector: selectorOf(node) });
          run = new Set();
        };
        for (const part of node.nodes) {
          if (part.type === 'combinator') flush();
          else if (part.type === 'class') run.add(part.value);
        }
        flush();
      });
    }).processSync(rule.selector);
  });
  return { classes, compounds };
}

// ─── 2a. The static scan ───────────────────────────────────────────────────

// The source with its comments blanked (offsets kept), so the scan reads code
// only. Strings, templates (with their ${…}) and regex literals are skipped
// whole: a quote or `//` inside one starts nothing.
const BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await']);
function blankComments(src) {
  const out = [...src];
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  let i = 0;
  let prev = '';            // the last token: a word, or one punctuation char
  const quoted = q => { for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++; i++; };
  const template = () => {
    for (i++; i < src.length && src[i] !== '`'; i++) {
      if (src[i] === '\\') i++;
      else if (src[i] === '$' && src[i + 1] === '{') { i += 2; code(true); i--; }
    }
    i++;
  };
  const regex = () => {
    let inClass = false;
    for (i++; i < src.length; i++) {
      if (src[i] === '\\') i++;
      else if (src[i] === '[') inClass = true;
      else if (src[i] === ']') inClass = false;
      else if (src[i] === '/' && !inClass) break;
    }
    for (i++; /[a-z]/.test(src[i] ?? ''); i++);
  };
  const regexMayStart = () => prev === '' || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || BEFORE_REGEX.has(prev);
  function code(inTemplate) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const end = e < 0 ? src.length : e; blank(i, end); i = end; }
      else if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? src.length : e + 2; blank(i, end); i = end; }
      else if (c === '\'' || c === '"') { quoted(c); prev = 'a'; }
      else if (c === '`') { template(); prev = 'a'; }
      else if (c === '/' && regexMayStart()) { regex(); prev = 'a'; }
      else if (/\s/.test(c)) i++;
      else if (/[\w$]/.test(c)) { const j = i; while (/[\w$]/.test(src[i] ?? '')) i++; prev = src.slice(j, i); }
      else {
        if (c === '{') depth++;
        if (c === '}' && depth-- === 0 && inTemplate) { i++; return; }
        prev = c;
        i++;
      }
    }
  }
  code(false);
  return out.join('');
}

// Where the expression starting at `from` ends: at the first `stops` char at
// depth 0, or at the bracket that closes an enclosing one. Strings and
// templates are skipped whole.
function exprEnd(src, from, stops) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '\'' || c === '"') { for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++; }
    else if (c === '`') i = templateEnd(src, i) - 1;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth-- === 0) return i; }
    else if (depth === 0 && stops.includes(c)) return i;
  }
  return src.length;
}
function templateEnd(src, from) {
  for (let i = from + 1; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === '`') return i + 1;
    else if (src[i] === '$' && src[i + 1] === '{') i = exprEnd(src, i + 2, '');
  }
  return src.length;
}

// The static runs and the ${…} of a template body (or an attribute value):
// text(run, afterExpr, beforeExpr), expr(code).
function templateParts(body, text, expr) {
  let last = 0, afterExpr = false;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\') { i++; continue; }
    if (body[i] === '$' && body[i + 1] === '{') {
      text(body.slice(last, i), afterExpr, true);
      const end = exprEnd(body, i + 2, '');
      expr(body.slice(i + 2, end));
      last = end + 1;
      i = end;
      afterExpr = true;
    }
  }
  text(body.slice(last), afterExpr, false);
}

// The class names in a run of class-list text. A name glued to a ${…} is
// built at run time (`rc-axis-title-${axis}`): left to the runtime pass.
const CLASS_NAME = /^-?[_a-zA-Z][\w-]*$/;
function addNames(out, text, glueStart = false, glueEnd = false) {
  const words = text.split(/\s+/);
  if (glueStart && !/^\s/.test(text)) words.shift();
  if (glueEnd && !/\s$/.test(text)) words.pop();
  words.filter(w => CLASS_NAME.test(w)).forEach(w => out.add(w));
}

// The class names written as literals in an expression: plain strings and
// the static text of templates, recursing into ${…}.
function literalClasses(expr, out) {
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '\'' || c === '"') {
      let j = i + 1;
      for (; j < expr.length && expr[j] !== c; j++) if (expr[j] === '\\') j++;
      addNames(out, expr.slice(i + 1, j));
      i = j;
    } else if (c === '`') {
      const end = templateEnd(expr, i);
      templateParts(expr.slice(i + 1, end - 1), (t, a, b) => addNames(out, t, a, b), inner => literalClasses(inner, out));
      i = end - 1;
    }
  }
  return out;
}

// The places in the code that write a class; `stops` ends the argument read.
const EMITTERS = [
  { re: /\.attr\(\s*(['"])class\1\s*,/g, stops: '' },                          // d3 .attr('class', expr)
  { re: /\.classed\(/g, stops: ',', unless: /^,\s*false\s*\)/ },               // d3 .classed('a b', on)
  { re: /\.className\s*=(?!=)/g, stops: ';' },                                 // el.className = expr;
  { re: /\.classList\.add\(/g, stops: '' },                                    // every argument
  { re: /\.classList\.toggle\(/g, stops: ',' },                                // the name
];

function staticClasses(src) {
  const code = blankComments(src);
  const out = new Set();
  for (const { re, stops, unless } of EMITTERS) {
    for (const m of code.matchAll(re)) {
      const from = m.index + m[0].length;
      const end = exprEnd(code, from, stops);
      if (!unless?.test(code.slice(end))) literalClasses(code.slice(from, end), out);
    }
  }
  // HTML in strings and templates: class="…", whose value may hold ${…}.
  for (const m of code.matchAll(/\bclass=(["'])/g)) {
    const from = m.index + m[0].length;
    let end = from;
    for (; end < code.length && code[end] !== m[1]; end++) {
      if (code[end] === '$' && code[end + 1] === '{') end = exprEnd(code, end + 2, '');
    }
    templateParts(code.slice(from, end), (t, a, b) => addNames(out, t, a, b), inner => literalClasses(inner, out));
  }
  return out;
}

const STATIC = new Map();   // class → the source files that write it
for (const file of readdirSync(SRC, { recursive: true }).filter(f => f.endsWith('.js')).sort()) {
  for (const c of staticClasses(readFileSync(join(SRC, file), 'utf8'))) {
    if (!STATIC.has(c)) STATIC.set(c, []);
    STATIC.get(c).push(file);
  }
}

// ─── 2b. The runtime pass ──────────────────────────────────────────────────
// Every chart class in jsdom with its optional parts on, driven through the
// public paths: options, methods, pointer events. snap() reads classList off
// every element in the page after each step — the next hover replaces a
// tooltip's rows, a state class comes and goes.

const RUNTIME = new Map();       // class → the first scene that showed it
const TOGETHER = new Set();      // ' a b c ': the classes of one element
function snap(scene) {
  for (const el of document.body.querySelectorAll('[class]')) {
    const list = [...new Set(el.classList)];
    list.forEach(c => { if (!RUNTIME.has(c)) RUNTIME.set(c, scene); });
    if (list.length > 1) TOGETHER.add(` ${list.sort().join(' ')} `);
  }
}

const tick = () => new Promise(r => setTimeout(r, 0));
const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 300, clientY: 100 }));
const one = (chart, selector) => {
  const el = chart.container.querySelector(selector);
  if (!el) throw new Error(`${chart.constructor.name}: no ${selector}`);
  return el;
};

const D = m => new Date(2026, m - 1, 1);
const crossingZero = [10, -5, 20, 15, 30, 25].map((value, i) => ({ date: D(i + 1), value }));
const labelSeries = [{ label: 'A', value: 4 }, { label: 'B', value: 7 }, { label: 'C', value: 2 }];
const ANNOTATIONS = [
  { date: D(3), label: 'Launch' },
  { from: D(2), to: D(4), label: 'Freeze' },
  { value: 20, label: 'Target' },
  { yFrom: 15, yTo: 25, label: 'Band' },
];
const square = (x, y) => [[[x, y], [x, y + 10], [x + 10, y + 10], [x + 10, y], [x, y]]];
const geoData = { type: 'FeatureCollection', features: [
  { type: 'Feature', id: 'AA', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: square(0, 40) } },
  { type: 'Feature', id: 'BB', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: square(30, 40) } },
] };
// The page's own controls row (option `controls`).
const controlsRow = () => {
  const el = document.createElement('div');
  el.innerHTML = '<label><input type="checkbox"> Show</label><output>1</output>';
  document.body.appendChild(el);
  return el;
};

const SCENES = {
  // The card: a header with every legend swatch, timeframes with the custom
  // range and its open panel, and Lin/Log; a plot with a band, areas,
  // markers of both kinds, end labels, the zero line, the crosshair and all
  // four annotation kinds; the navigator, the page's controls, a rich
  // source and a note.
  'Line, every part': async scene => {
    const c = track(new Line(mount(null), {
      animate: false, title: 'Line', subtitle: 'sub', area: true, markers: true,
      legend: [{ label: 'line' }, { label: 'dashed', type: 'dashed' }, { label: 'dot', type: 'dot' }, { label: 'band', type: 'band' }],
      timeframes: ['3M', 'ALL', 'CUSTOM'], navigator: true, scaleToggle: true, annotations: ANNOTATIONS,
      source: ['Source', { text: 'link', href: 'https://example.com' }], note: 'Note', controls: controlsRow(),
    })).setData([
      { name: 'a', values: crossingZero },
      { name: 'b', values: crossingZero.map(d => ({ ...d, value: d.value + 3 })), markerShape: 'diamond' },
      { name: 'range', type: 'band', values: crossingZero.map(d => ({ date: d.date, lower: d.value - 2, upper: d.value + 2 })) },
    ]);
    snap(scene);
    fire(one(c, 'rect.rc-overlay'), 'mousemove');
    snap(scene);
    one(c, '.rc-range-custom').click();
    snap(scene);
  },
  'Line, legend on the right': async scene => {
    track(new Line(mount(null), {
      animate: false, legend: [{ label: 'a' }], legendPosition: 'right', scaleToggle: true, source: 'Source',
    })).setData(crossingZero);
    snap(scene);
  },
  // RC-066: a title cut beside the buttons stacks the header. jsdom lays
  // nothing out, so the title reports a cut (scrollWidth past clientWidth).
  'Header, stacked by a cut title': async scene => {
    const host = mount(null);
    const c = new TimeSeries(host, { title: 'A title too long to sit beside six buttons', timeframes: true });
    const title = host.querySelector('.rc-chart-title');
    Object.defineProperty(title, 'scrollWidth', { configurable: true, get: () => 400 });
    Object.defineProperty(title, 'clientWidth', { configurable: true, get: () => 120 });
    track(c).setData(crossingZero);
    snap(scene);
  },
  'TimeSeries': async scene => {
    const c = track(new TimeSeries(mount(null), { title: 'TS', timeframes: true, navigator: true, annotations: ANNOTATIONS }))
      .setData(crossingZero);
    fire(one(c, 'svg > g > rect'), 'mousemove');
    snap(scene);
    // a plain wheel: the zoom hint, made on first need (T-09)
    c.svg.node().dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 }));
    snap(scene);
    // the loading bar, made on first need (RC-002)
    c.setLoading(true);
    snap(scene);
  },
  // gaps 'break': a point between two gaps gets a dot (RC-005)
  'TimeSeries, gaps': async scene => {
    track(new TimeSeries(mount(null), { gaps: 'break' }))
      .setData([10, null, 20, null, 30].map((value, i) => ({ date: D(i + 1), value })));
    snap(scene);
  },
  // compare: the comparison's group, its dashed line and a lone dot of it
  // (RC-004) — a year back, with a gap on either side of March 2025; over
  // 2026 the tooltip's comparison row, its mark dashed (RC-082)
  'TimeSeries, comparison': async scene => {
    const months = (y, values) => values.map((value, i) => ({ date: new Date(y, i, 1), value }));
    const c = track(new TimeSeries(mount(null), { gaps: 'break', interval: 'month', compare: 'previousYear' }))
      .setData([...months(2025, [10, null, 20, null, 30]), ...months(2026, [11, 12, 13, 14, 15])]);
    snap(scene);
    c.setView([new Date(2026, 0, 1), new Date(2026, 4, 1)]);
    fire(one(c, 'svg > g > rect'), 'mousemove');
    snap(scene);
  },
  // band: the ribbon's group and its path (RC-051)
  'TimeSeries, band': async scene => {
    track(new TimeSeries(mount(null), { band: true }))
      .setData([10, 20, 30].map((value, i) => ({ date: D(i + 1), value, lower: value - 5, upper: value + 5 })));
    snap(scene);
  },
  'DualAxes': async scene => {
    const c = track(new DualAxes(mount(null), { animate: false, y1Title: 'P', y2Title: 'V', scaleToggle: 'both', annotations: ANNOTATIONS }))
      .setData([
        { name: 'Vol', axis: 'y1', type: 'bar', values: crossingZero },
        { name: 'Price', axis: 'y2', type: 'line', values: crossingZero, markers: true, area: true },
      ]);
    fire(one(c, 'rect.rc-overlay'), 'mousemove');
    snap(scene);
  },
  'Bar: categories, horizontal with values, stacked, dates': async scene => {
    const cats = track(new Bar(mount(null), { animate: false, labelMaxLength: 1 })).setData(labelSeries);
    fire(one(cats, 'rect.rc-bar'), 'mouseover');
    snap(scene);
    fire(one(cats, '.tick text'), 'mouseover');       // a truncated axis label
    snap(scene);
    track(new Bar(mount(null), { animate: false, orientation: 'horizontal', showValues: true })).setData(labelSeries);
    const stacked = track(new Bar(mount(null), { animate: false }))
      .setData([{ name: 's', values: labelSeries }, { name: 't', values: labelSeries }]);
    fire(one(stacked, 'rect.rc-bar-seg'), 'mouseover');
    snap(scene);
    track(new Bar(mount(null), { animate: false, timeframes: true, navigator: true, annotations: ANNOTATIONS })).setData(crossingZero);
    snap(scene);
  },
  'HierarchicalBar': async scene => {
    const c = track(new HierarchicalBar(mount(null), { animate: false }))
      .setData({ label: 'Total', children: [{ label: 'A', value: 3 }, { label: 'B', value: 2 }] });
    fire(one(c, '.rc-hbar-row'), 'mouseenter');
    snap(scene);
  },
  'Donut: labels, centre, drill-down; Pie': async scene => {
    const c = track(new Donut(mount(null), { animate: false, showLabels: true, legend: [{ label: 'A' }] }))
      .setData({ label: 'Root', children: [
        { label: 'A', children: [{ label: 'A1', value: 2 }, { label: 'A2', value: 3 }] },
        { label: 'B', value: 4 },
      ] });
    fire(one(c, 'path.rc-donut-slice'), 'mouseover');
    snap(scene);
    c.drillTo('A');
    snap(scene);
    track(new Pie(mount(null), { animate: false, showLabels: true })).setData(labelSeries);
    snap(scene);
  },
  'Gauge': async scene => {
    const c = track(new Gauge(mount(null), { animate: false, needle: true, centerLabel: 'of 10' })).setData({ value: 4, max: 10 });
    fire(one(c, 'svg path'), 'mousemove');
    snap(scene);
  },
  'Map': async scene => {
    const c = track(new RareMap(mount(null), { projection: 'mercator', geoData, graticule: true, title: 'Map', timeframes: ['ALL'] }))
      .setData([{ id: 'AA', value: 5 }, { id: 'BB', value: 3 }]);
    await c.whenReady();
    fire(one(c, '.rc-map-feature'), 'mouseover');
    snap(scene);
  },
  // onRegionClick: a region with data is a button (B-06)
  'Map, region clicks': async scene => {
    const c = track(new RareMap(mount(null), { geoData, onRegionClick: () => {} })).setData([{ id: 'AA', value: 5 }]);
    await c.whenReady();
    snap(scene);
  },
  // The type legend: two toggles in their colour and dash, one turned off,
  // and Show all (the legend builder, with the K-06 aliases).
  'MapFlow': async scene => {
    const c = track(new MapFlow(mount(null), {
      projection: 'mercator', geoData, title: 'Flows',
      linkTypes: { goods: { color: '#8a5a2b', label: 'goods' }, silver: { color: '#5b6b7d', label: 'silver', dash: '6 4' } },
    })).setData({
      nodes: [{ id: 'W', label: 'West', country: 'AA' }, { id: 'E', label: 'East', country: 'BB' }],
      links: [
        { source: 'W', target: 'E', value: 3, type: 'goods', sources: [{ url: 'https://example.com', title: 'Proof' }] },
        { source: 'E', target: 'W', value: 1, type: 'silver' },
      ],
    });
    await c.whenReady();
    fire(one(c, '.rc-mapflow-node'), 'mouseover');
    snap(scene);
    fire(one(c, '.rc-mapflow-link-hit'), 'click');     // pins the tie
    snap(scene);
    one(c, '.rc-mapflow-legend button.rc-legend-item[data-key="silver"]').click();   // off: Show all shows
    if (one(c, '.rc-mapflow-legend .rc-legend-reset').hidden) throw new Error('MapFlow: Show all did not show');
    snap(scene);
  },
  // The type legend too: a toggle turned off, and Show all.
  'Sankey': async scene => {
    const c = track(new Sankey(mount(null), {
      animate: false, title: 'Sankey', linkColor: 'type',
      linkTypes: { t: { color: '#8a5a2b', label: 'goods' }, u: { color: '#5b6b7d', label: 'silver' } },
    })).setData({ links: [{ source: 'A', target: 'B', value: 5, type: 't' }, { source: 'A', target: 'C', value: 3, type: 'u' }] });
    fire(one(c, '.rc-sankey-node'), 'mouseover');
    snap(scene);
    fire(one(c, '.rc-sankey-link'), 'click');
    snap(scene);
    one(c, 'button.rc-legend-item[data-key="t"]').click();   // off: Show all shows
    if (one(c, '.rc-legend-reset').hidden) throw new Error('Sankey: Show all did not show');
    snap(scene);
  },
  // Ego: sector captions, icons and an image, a +N badge on a pair with
  // more ties than drawn, the "+N more" note and its list, the hidden note,
  // a pinned tie, a legend toggle turned off and Show all, breadcrumbs, full
  // screen, the details panel beside a wide card and below a narrow one.
  // Then the path view (its legend plain labels, row captions) and the
  // cluster view (the capped tooltip body).
  'Graph: ego, path, cluster and the chrome': async scene => {
    const host = mount(null, { width: 1200 });
    host.requestFullscreen = undefined;               // the overlay fallback
    const links = [...fixture.links, ...['t1', 't2', 't3', 't4'].map(type => ({ source: 'a', target: 'e', type }))];
    const nodes = fixture.nodes.map(n => (n.id === 'b' ? { ...n, image: 'data:,' } : n));
    const g = track(new Graph(host, {
      duration: 0, title: 'Graph', source: 'Source', details: true, sectorLabels: true, maxNodes: 3,
      nodeIcons: { g1: 'M0 0h1v1z' },
    })).setData({ nodes, links });
    await g.focus('a').whenReady();
    snap(scene);
    fire(one(g, '.rc-graph-node'), 'mouseover');
    snap(scene);
    fire(one(g, '.rc-graph-link-hit'), 'click');
    snap(scene);
    one(g, '.rc-graph-note').click();
    snap(scene);
    g.hide('e');
    snap(scene);
    one(g, '.rc-graph-legend-item').click();
    await g.whenReady();
    snap(scene);
    await g.focus('c').whenReady();
    snap(scene);
    g.toggleFullscreen(true);
    snap(scene);
    g.toggleFullscreen(false);
    await g.connect('a', 'f').whenReady();
    snap(scene);
    await g.overview().whenReady();
    fire(one(g, '.rc-graph-node'), 'mouseover');
    snap(scene);

    await track(new Graph(mount(null, { width: 600 }), { duration: 0, details: true })).setData(fixture).whenReady();
    snap(scene);
  },
  // Flow: lanes, a hull, a fold and its switch, tie labels, a node's sub
  // line, the legend's groups and tie types, timeframes and the navigator,
  // the sideways scroll (minWidth), a selected node, a pinned tie.
  'Graph: flow view': async scene => {
    const g = track(new Graph(mount(null), {
      view: 'flow', duration: 0, laneBy: 'lane', title: 'Flow', details: true, minWidth: 2000,
      lanes: [{ id: 'l1', label: 'One' }, { id: 'l2', label: 'Two' }],
      nodeGroups: { g1: { color: '#2c5d8f', label: 'Group' } },
      linkTypes: { x: { color: '#6c58b5', label: 'X' } },
      hulls: [{ id: 'h', label: 'hull', members: n => n.group === 'g1' }],
      folds: [{ id: 'f', label: 'fold', members: ['c', 'd'], sub: '{n} nodes' }],
      timeframes: ['ALL'], navigator: true,
    })).setData({
      nodes: [
        { id: 'a', label: 'A', sub: 'a sub', group: 'g1', lane: 'l1' },
        { id: 'b', label: 'B', group: 'g1', lane: 'l2' },
        { id: 'c', label: 'C', lane: 'l2' },
        { id: 'd', label: 'D', lane: 'l2' },
      ],
      links: [
        { from: 'a', to: 'b', type: 'x', value: 5, label: '5 X', start: '2024-01' },
        { from: 'a', to: 'c', type: 'x', value: 2, start: '2024-02' },
        { from: 'a', to: 'd', type: 'x', value: 1, start: '2024-03' },
      ],
    });
    await g.whenReady();
    snap(scene);
    fire(one(g, '.rc-flow-node'), 'mouseover');
    snap(scene);
    fire(one(g, '.rc-flow-node'), 'click');
    snap(scene);
    fire(one(g, '.rc-flow-link-hit'), 'click');
    snap(scene);
    g.collapse('f');
    snap(scene);
  },
  'MultiChart': async scene => {
    track(new MultiChart(mount(null), { title: 'Grid', charts: [
      { type: 'Bar', title: 'Cell', options: { title: 'A' }, data: labelSeries },
      { type: 'Line', options: { title: 'B' }, data: crossingZero },
    ] }));
    snap(scene);
  },
  'Overview': async scene => {
    track(new Overview(mount(null))).setData(crossingZero);
    snap(scene);
  },
  'a tooltip with a header band (theme.tooltip.header.bg)': async scene => {
    const c = track(new Bar(mount(null), { animate: false, theme: { tooltip: { header: { bg: '#eeeeee' } } } })).setData(labelSeries);
    fire(one(c, 'rect.rc-bar'), 'mouseover');
    snap(scene);
  },
};

// ─── The documented hooks ──────────────────────────────────────────────────
// rc- class names (and .is-* state classes) in the public docs: the pages
// under charts/ and the library README. The backlog page lists plans, not
// hooks.

const DOC_FILES = [
  'assets/charts/README.md',
  ...readdirSync(resolve(ROOT, 'charts'), { recursive: true })
    .filter(f => /\.(md|html)$/.test(f) && !f.startsWith('backlog'))
    .map(f => join('charts', f)),
];
// rc- names in the docs that are ids, not classes.
const DOC_IDS = {
  'rc-base-styles': 'the id of the page\'s own <link> to the stylesheet (installation)',
  'rc-demo-root': 'the docs page\'s own mount element (line/options)',
};
function docHooks() {
  const hooks = new Map();      // name → files
  const ids = new Set();
  for (const file of DOC_FILES) {
    const text = read(file);
    for (const m of text.matchAll(/(?<![\w-])\.?(rc-[a-z][a-z0-9]*(?:--?[a-z0-9]+)*)(?![\w-])|(?<![\w-])\.(is-[a-z][a-z0-9-]*[a-z0-9])/g)) {
      const name = m[1] ?? m[2];
      if (DOC_IDS[name]) { ids.add(name); continue; }
      if (!hooks.has(name)) hooks.set(name, new Set());
      hooks.get(name).add(file);
    }
  }
  return { hooks, ids };
}

// ─── The checks ────────────────────────────────────────────────────────────

describe('S-16: the scanners', () => {
  it('reads classes inside :is(), :where(), :not() and :has(); compounds are the classes of one element', () => {
    const { classes, compounds } = cssClasses(
      '.a:is(.b, .c) > .d:not(.e) .f.g:where(.h), x:has(.i.j) {} @media print { .k {} }');
    expect([...classes.keys()].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']);
    expect(compounds.map(c => c.classes.sort().join('.')).sort()).toEqual(['f.g', 'i.j']);
  });

  it('blanks comments, not strings, templates or regex literals', () => {
    const src = 'const r = /["\'`/]/g; // el.className = \'gone\';\nconst s = "// kept"; /* x */ const t = `a ${b /* c */} d`;';
    const out = blankComments(src);
    expect(out).toHaveLength(src.length);
    expect(out).not.toContain('gone');
    expect(out).not.toContain('/* x */');
    expect(out).toContain('"// kept"');
    expect(out).toContain('/["\'`/]/g');
    expect(out).toMatch(/`a \$\{b\s+\} d`/);
  });

  it('finds the literals where the code writes a class, and only there', () => {
    const src = `
      g.append('g').attr('class', d => \`rc-a rc-built-\${d.k}\`).attr('fill', 'rc-not');
      g.classed('rc-c', true).classed('rc-off', false);
      el.className = on ? 'rc-e rc-f' : 'rc-g';
      el.classList.add('rc-h', x ? 'rc-i' : null);
      el.classList.toggle('rc-j', on);
      el.classList.remove('rc-removed'); el.classList.contains('rc-tested');
      g.selectAll('.rc-selected');
      // el.className = 'rc-commented';
      const html = \`<div class="\${classes('rc-k', muted && 'rc-l')} rc-m" data-x="rc-not">\${body}</div>\`;
      const tip = '<span class="rc-n">' + x + '</span>';
    `;
    expect([...staticClasses(src)].sort()).toEqual(
      ['rc-a', 'rc-c', 'rc-e', 'rc-f', 'rc-g', 'rc-h', 'rc-i', 'rc-j', 'rc-k', 'rc-l', 'rc-m', 'rc-n']);
  });
});

describe('S-16: the CSS contract', () => {
  const { classes: SELECTED, compounds: COMPOUNDS } = cssClasses(read('assets/charts/rare-charts.css'));
  const emitted = c => STATIC.has(c) || RUNTIME.has(c);

  beforeAll(async () => {
    for (const [scene, run] of Object.entries(SCENES)) {
      try {
        await run(scene);
      } catch (e) {
        e.message = `runtime pass, ${scene}: ${e.message}`;
        throw e;
      }
      await tick();
      cleanupCharts();
      document.body.replaceChildren();
    }
  });

  it('every class rare-charts.css selects is emitted by the library (or allowlisted)', () => {
    const missing = [...SELECTED].filter(([c]) => !emitted(c) && !NOT_EMITTED[c])
      .map(([c, selectors]) => `.${c} in ${[...new Set(selectors)].join(' | ')}`);
    expect(missing).toEqual([]);
  });

  it('the allowlist is current: each entry is still selected and still emitted by nothing', () => {
    const stale = Object.keys(NOT_EMITTED).filter(c => !SELECTED.has(c) || emitted(c));
    expect(stale).toEqual([]);
  });

  // `.rc-range-btn.active` needs both on one button: a state class the
  // library moved to another element would leave the rule dead.
  it('each compound in a selector is carried by one element', () => {
    const together = [...TOGETHER];
    const missing = COMPOUNDS
      .filter(({ classes }) => !classes.some(c => NOT_EMITTED[c]))
      .filter(({ classes }) => !together.some(t => classes.every(c => t.includes(` ${c} `))))
      .map(({ classes, selector }) => `.${classes.join('.')} in ${selector}`);
    expect([...new Set(missing)]).toEqual([]);
  });

  // The static scan keeps the runtime pass honest: a class written in the
  // code that no scene shows means a part of a chart the pass does not reach.
  it('the runtime pass shows every class the static scan finds', () => {
    const unseen = [...STATIC].filter(([c]) => !RUNTIME.has(c)).map(([c, files]) => `${c} (${files.join(', ')})`);
    expect(unseen).toEqual([]);
  });

  it('the hooks the docs name are emitted (RC-034)', () => {
    const { hooks, ids } = docHooks();
    // the scan finds the documented hooks of the public-surface statement…
    expect([...hooks.keys()]).toEqual(expect.arrayContaining([
      'rc-chart', 'rc-tooltip', 'rc-tooltip-header', 'rc-chart-controls', 'rc-chart-note', 'rc-cross-line',
      'rc-graph-details', 'rc-graph-details-kind', 'rc-graph-details-muted', 'is-visible',
    ]));
    // …and every id it skips is still in the docs
    expect([...ids].sort()).toEqual(Object.keys(DOC_IDS).sort());
    const missing = [...hooks].filter(([c]) => !RUNTIME.has(c)).map(([c, files]) => `${c} (${[...files].join(', ')})`);
    expect(missing).toEqual([]);
  });

  // Not a contract: the rc- classes the library writes that no rule selects —
  // hooks for the code itself, or for pages. Information for K-06 and RC-034,
  // shown with --reporter=verbose.
  it('report: emitted rc- classes with no rule in rare-charts.css', async ({ annotate }) => {
    const bare = [...new Set([...STATIC.keys(), ...RUNTIME.keys()])]
      .filter(c => c.startsWith('rc-') && !SELECTED.has(c)).sort();
    await annotate(`${bare.length} emitted rc- classes have no rule: ${bare.join(' ')}`);
  });
});
