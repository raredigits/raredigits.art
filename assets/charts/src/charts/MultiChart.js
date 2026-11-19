// RareCharts — MultiChart
// Combines 2–4 charts in a shared grid with a common title / legend / footer.
//
// Options:
//   title, subtitle, legend, source, note — same as Chart (shared header/footer)
//   animate            — passed through to every child chart (default: true)
//   columns            — grid columns: 1 | 2 | 3 | 4 (default: 2)
//   mobileColumns      — columns when container width ≤ mobileBreakpoint (default: 1)
//   mobileBreakpoint   — container width (px) at which to switch to mobileColumns (default: 480)
//   chartHeight        — height of each chart in px (default: 200); a child's own
//                        options.height wins, a cell title adds its line above
//   gap                — grid gap: number (px) or CSS string (default: 32px, --rc-space-lg)
//   charts             — array of chart descriptors:
//     {
//       type          — the name of a chart class (default: 'Line'): 'Line',
//                       'Bar', 'TimeSeries', 'DualAxes', 'HierarchicalBar',
//                       'Donut', 'Pie', 'Gauge', 'Sankey', 'Graph', 'Map' or
//                       'MapFlow' (K-11). 'Overview' (the navigator strip, not
//                       a chart) and 'MultiChart' (no grid in a grid) are not
//                       taken; they and any other value warn once per cell
//                       and draw a Line
//       title         — optional label shown above the cell
//       span          — optional column span (e.g. span: 2 fills the full width in a 2-col grid)
//       data          — passed immediately to setData() if provided
//       options       — forwarded to the child chart constructor; the grid sets
//                       height (chartHeight), animate and theme unless these
//                       options set them, and margin.bottom: 26 under the
//                       bottom axis of Line, Bar, DualAxes and TimeSeries (the
//                       other classes keep their own margin)
//       mobileOptions — merged over options while the container is at most
//                       mobileBreakpoint wide (C-15: by width, whatever the
//                       column counts). Crossing the breakpoint rebuilds the
//                       panel — destroy, a new chart with the options of the
//                       new side, setData with its last data — so every key
//                       applies, height and margin included.
//     }
//
// The shared legend (S10): an item of the grid's `legend` that names a
// series of any cell (`series`, else `name`, else `label`, as on a chart)
// is a toggle, and its gestures show and hide the series of that name in
// every cell; onLegendToggle fires on the grid only. `legendRescale` goes
// down to every cell that does not set its own. A cell's own legend acts on
// that cell alone, until the next gesture on the shared one.
//
// Accessible names (RC-023): the grid is a group named by `ariaLabel`, else
// the title and subtitle joined with " — ", as a chart names its drawing.
// A cell's drawing takes its own ariaLabel, title or subtitle, else the
// cell title.
//
// Public API:
//   .charts            — array of instantiated child chart objects (in order);
//                        a breakpoint crossing replaces the rebuilt ones, so
//                        read mc.charts[i] again rather than keep a reference
//   .setData([d0, d1]) — call setData on each child by index
//   .setSeriesVisible(names | null) — show only these series in every cell
//                        (null: all), as the shared legend; no onLegendToggle
//   .destroy()         — tears down all children, then self

import { Chart } from '../core/Chart.js';
import { Line }  from './Line.js';
import { Bar }   from './Bar.js';
import { TimeSeries } from './TimeSeries.js';
import { DualAxes } from './DualAxes.js';
import { HierarchicalBar } from './HierarchicalBar.js';
import { Donut, Pie } from './Donut.js';
import { Gauge } from './Gauge.js';
import { Sankey } from './Sankey.js';
import { Graph } from './Graph.js';
import { Map as RareMap } from './Map.js';
import { MapFlow } from './MapFlow.js';

// Every chart class a cell takes, by its public name (K-11).
const TYPE_MAP = {
  Line, Bar, TimeSeries, DualAxes, HierarchicalBar, Donut, Pie, Gauge,
  Sankey, Graph, Map: RareMap, MapFlow,
};

// Public classes a cell cannot take, and why.
const NOT_A_CELL = {
  Overview:   'the navigator strip is not a chart (use `navigator: true` on a time chart)',
  MultiChart: 'a grid does not nest in a cell',
};

const named = v => typeof v === 'string' && v.trim() !== '';

// The classes whose bottom axis takes the grid's margin.bottom default.
const BOTTOM_AXIS = new Set([Line, Bar, DualAxes, TimeSeries]);

// The class for a descriptor's `type`, or null with the warning to give:
// no type means Line; a type the grid does not take falls back to Line, as
// it always did — no throw (B-02). Own keys only: 'constructor' or
// 'toString' must not reach Object.prototype.
function chartClassFor(type, index) {
  if (type == null) return { ChartClass: Line };
  const own = (map, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);
  if (own(TYPE_MAP, type)) return { ChartClass: TYPE_MAP[type] };
  const names = Object.keys(TYPE_MAP);
  const near  = typeof type === 'string'
    ? names.find(n => n.toLowerCase() === type.trim().toLowerCase())
    : null;
  const shown = typeof type === 'string' ? `"${type}"`
    : typeof type === 'function' ? (type.name || 'function') : String(type);
  const warning = own(NOT_A_CELL, type)
    ? `charts[${index}] has type ${shown}, which a cell cannot take: ${NOT_A_CELL[type]} — drawn as Line.`
    : `charts[${index}] has an unknown type ${shown} — drawn as Line. ` +
      (near ? `Did you mean '${near}'?` : `Supported types: ${names.map(n => `'${n}'`).join(', ')}.`);
  return { ChartClass: Line, warning };
}

export class MultiChart extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this.charts  = [];
    this._cells  = [];
    this._isMobile = false;
    this._lastData = [];   // per panel: the data its chart was last given

    this._buildGrid();
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  // The narrow layout is a matter of width alone (C-15): it used to be read
  // off the column count, so a grid with columns ≤ mobileColumns was "mobile"
  // — mobileOptions and all — on any screen. clientWidth 0 means the element
  // is hidden or not laid out yet: keep the wide layout.
  _narrow() {
    const w = this.container.clientWidth;
    return w > 0 && w <= (this.options.mobileBreakpoint ?? 480);
  }

  _currentColumns() {
    const mobileCols  = this.options.mobileColumns    ?? 1;
    const desktopCols = Math.min(Math.max(this.options.columns ?? 2, 1), 4);
    return this._narrow() ? mobileCols : desktopCols;
  }

  // The constructor options of panel i on one side of the breakpoint: the
  // grid's defaults, the descriptor's options, then (narrow) its mobileOptions;
  // margin merged by side over the grid's bottom default.
  // A class without a bottom axis gets only the margin the page sets: its
  // own defaults stay (Donut's 8px all round, Map's 0).
  _childOptions(cfg, isMobile, ChartClass = Line) {
    const mobileOverride = (isMobile && cfg.mobileOptions) ? cfg.mobileOptions : {};
    const options = {
      animate: this.options.animate ?? true,
      height:  this.options.chartHeight ?? 200,
      theme:   this.options.theme,   // inherit parent theme
      ...(this.options.legendRescale != null && { legendRescale: this.options.legendRescale }),
      ...cfg.options,
      ...mobileOverride,
    };
    if (named(cfg.title) && ![options.ariaLabel, options.title, options.subtitle].some(named)) {
      options.ariaLabel = cfg.title;
    }
    const set = cfg.options?.margin || mobileOverride.margin;
    if (BOTTOM_AXIS.has(ChartClass) || set) {
      // Deep-merge margin: bottom default → options → mobileOverride
      options.margin = {
        ...(BOTTOM_AXIS.has(ChartClass) ? { bottom: 26 } : {}),
        ...(cfg.options?.margin ?? {}),
        ...(mobileOverride.margin ?? {}),
      };
    }
    return options;
  }

  // Build panel i's chart in its wrapper. Its setData is recorded — whether
  // it comes from cfg.data, mc.setData or mc.charts[i].setData — so a rebuild
  // can hand the new chart the same data; a call on a replaced instance is not.
  // The new chart starts with the series the shared legend hides, before
  // any data; after its data the shared legend follows the series.
  _createChild(i, wrapper, isMobile) {
    const cfg = (this.options.charts ?? [])[i];
    const { ChartClass, warning } = chartClassFor(cfg.type, i);
    if (warning) this._warnOnce(`type:${i}`, warning);   // not again on a rebuild
    const chart = new ChartClass(wrapper, this._childOptions(cfg, isMobile, ChartClass));
    this._hiddenKeys.forEach(key => chart._hiddenKeys.add(key));
    const own = chart.setData;
    chart.setData = (data) => {
      if (this.charts[i] === chart) this._lastData[i] = data;
      const out = own.call(chart, data);
      if (this.charts[i] === chart) this._syncLegend();
      return out;
    };
    this._wrappers[i] = wrapper;
    this.charts[i] = chart;
    return chart;
  }

  _buildGrid() {
    const { charts = [], gap } = this.options;

    const cols = this._currentColumns();
    this._isMobile = this._narrow();
    this._wrappers = [];

    this._gridEl = document.createElement('div');
    this._gridEl.className = 'rc-multichart-grid';
    const { ariaLabel, title, subtitle } = this.options;
    const label = named(ariaLabel) ? ariaLabel.trim() : [title, subtitle].filter(named).join(' — ');
    this._gridEl.setAttribute('role', 'group');
    if (label) this._gridEl.setAttribute('aria-label', label);
    this._gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    if (gap != null) {
      this._gridEl.style.gap = typeof gap === 'number' ? `${gap}px` : gap;
    }

    // Insert before footer, or append if there is no footer
    if (this._footerEl?.parentNode) {
      this.container.insertBefore(this._gridEl, this._footerEl);
    } else {
      this.container.appendChild(this._gridEl);
    }

    charts.forEach((cfg, i) => {
      const cell = document.createElement('div');
      cell.className = 'rc-multichart-cell';

      // Optional column span — only applied when the grid has more than 1 column.
      // In a 1-column grid, span > 1 would create implicit extra columns (CSS quirk).
      if (cfg.span && cfg.span > 1 && cols > 1) {
        cell.style.gridColumn = `span ${cfg.span}`;
      }

      // Optional per-cell title rendered outside the child Chart's DOM
      if (cfg.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'rc-multichart-cell-title';
        titleEl.textContent = cfg.title;
        cell.appendChild(titleEl);
      }

      // Separate wrapper so the child chart doesn't collide with the title node
      const wrapper = document.createElement('div');
      wrapper.className = 'rc-multichart-chart-wrapper';
      cell.appendChild(wrapper);

      this._gridEl.appendChild(cell);
      this._cells.push(cell);

      // mobileOptions merged in when the grid starts narrow
      const chart = this._createChild(i, wrapper, this._isMobile);
      if (cfg.data != null) chart.setData(cfg.data);
    });
  }

  // ── Rebuild the panels with mobileOptions on a breakpoint crossing ─────────

  // A chart reads much of its options once, in its constructor — height
  // sizes the card, margin places the plot — so patching child.options left a
  // crossing half-applied (C-15). Each panel with mobileOptions is rebuilt
  // instead: destroyed, made again with the options of the new side, and
  // given its last data. State set through the panel's own methods (a y
  // scale, a view window) starts over from its options.
  _applyBreakpointOptions(isMobile) {
    const charts = this.options.charts ?? [];
    charts.forEach((cfg, i) => {
      if (!cfg.mobileOptions) return;
      const old = this.charts[i];
      const wrapper = this._wrappers[i];
      if (!old || !wrapper) return;

      const data = this._lastData[i];
      old.destroy();
      const chart = this._createChild(i, wrapper, isMobile);
      if (data != null) chart.setData(data);
    });
  }

  // ── The shared legend (S10) ───────────────────────────────────────────────

  // Every cell's series, in cell order; a key in several cells is one item,
  // in the first cell's colour (a later cell's when the first has none).
  _legendSeries() {
    const byKey = new Map();
    (this.charts ?? []).forEach(chart => (chart._legendSeries() ?? []).forEach(s => {
      const key = s?.key == null ? null : String(s.key);
      if (key == null) return;
      const had = byKey.get(key);
      if (!had) byKey.set(key, { ...s, key });
      else if (had.color == null && s.color != null) had.color = s.color;
    }));
    return [...byKey.values()];
  }

  // A name may belong to a cell whose data has not come yet: the grid
  // warns about an item that names no series once every cell has its data.
  _warnUnmappedLegend(legend, items) {
    if ((this.options.charts ?? []).every((_, i) => this._lastData?.[i] != null)) super._warnUnmappedLegend(legend, items);
  }

  // A gesture or setSeriesVisible changed the grid's hidden set for `keys`:
  // each cell takes the change — a key it does not draw is kept for its
  // data to come — and redraws, silently, when the change touches a series
  // it draws. Then the grid's own legend follows.
  _hiddenChanged(keys) {
    this.charts.forEach(chart => {
      const present = chart._legendPresent();
      let redraw = false;
      keys.forEach(key => {
        const hide = this._hiddenKeys.has(key);
        if (chart._hiddenKeys.has(key) === hide) return;
        if (hide) chart._hiddenKeys.add(key); else chart._hiddenKeys.delete(key);
        if (present.has(key)) redraw = true;
      });
      if (!redraw) return;
      chart._unpinHidden();
      chart.render();
    });
    this.render();
  }

  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * Show only these series in every cell (a list, or one name); null shows
   * them all — what the shared legend does, without onLegendToggle.
   */
  setSeriesVisible(names) {
    return this._setVisibleKeys(names);
  }

  /**
   * Feed data into children by position.
   * @param {Array} dataArray — each element is passed to the corresponding child's setData()
   */
  setData(dataArray) {
    if (!Array.isArray(dataArray)) return this;
    dataArray.forEach((data, i) => {
      if (this.charts[i] && data != null) this.charts[i].setData(data);
    });
    return this;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  render() {
    // Children self-manage via their own ResizeObservers.
    // This override satisfies the abstract method requirement.
  }

  _onResize() {
    if (!this._gridEl) return;

    const cols     = this._currentColumns();
    const isMobile = this._narrow();

    this._gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Update cell spans: in 1-column mode clear spans to avoid implicit extra columns.
    (this.options.charts ?? []).forEach((cfg, i) => {
      if (!cfg.span || cfg.span <= 1) return;
      const cell = this._cells[i];
      if (cell) cell.style.gridColumn = cols > 1 ? `span ${cfg.span}` : '';
    });

    // Apply / restore mobileOptions when crossing the breakpoint
    if (isMobile !== this._isMobile) {
      this._isMobile = isMobile;
      this._applyBreakpointOptions(isMobile);
    }

    // Children self-manage via their own ResizeObservers.
  }

  destroy() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this._cells = [];
    this._wrappers = [];
    this._lastData = [];
    if (this._gridEl?.parentNode) this._gridEl.remove();
    this._gridEl = null;
    super.destroy();
  }
}
