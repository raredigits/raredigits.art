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
//       type          — 'Line' | 'Bar' (default: 'Line'; any other type warns
//                       and draws a Line)
//       title         — optional label shown above the cell
//       span          — optional column span (e.g. span: 2 fills the full width in a 2-col grid)
//       data          — passed immediately to setData() if provided
//       options       — forwarded to the child chart constructor; the grid sets
//                       height (chartHeight), animate, theme and margin.bottom: 26
//                       unless these options set them
//       mobileOptions — merged over options while the container is at most
//                       mobileBreakpoint wide (C-15: by width, whatever the
//                       column counts). Crossing the breakpoint rebuilds the
//                       panel — destroy, a new chart with the options of the
//                       new side, setData with its last data — so every key
//                       applies, height and margin included.
//     }
//
// Public API:
//   .charts            — array of instantiated child chart objects (in order);
//                        a breakpoint crossing replaces the rebuilt ones, so
//                        read mc.charts[i] again rather than keep a reference
//   .setData([d0, d1]) — call setData on each child by index
//   .destroy()         — tears down all children, then self

import { Chart } from '../core/Chart.js';
import { Line }  from './Line.js';
import { Bar }   from './Bar.js';

const TYPE_MAP = { Line, Bar };

// The class for a descriptor's `type`. No type means Line. A type the grid
// does not know warns and falls back to Line, as it always did — no throw
// before every class joins the map (B-02; the full map is v0.9.8_9).
// Own keys only: 'constructor' or 'toString' must not reach Object.prototype.
function chartClassFor(type, index) {
  if (type == null) return Line;
  if (typeof type === 'string' && Object.prototype.hasOwnProperty.call(TYPE_MAP, type)) return TYPE_MAP[type];
  const names = Object.keys(TYPE_MAP);
  const near  = typeof type === 'string'
    ? names.find(n => n.toLowerCase() === type.trim().toLowerCase())
    : null;
  const shown = typeof type === 'string' ? `"${type}"`
    : typeof type === 'function' ? (type.name || 'function') : String(type);
  console.warn(
    `RareCharts.MultiChart: charts[${index}] has an unknown type ${shown} — drawn as Line. ` +
    (near ? `Did you mean '${near}'?` : `Supported types: ${names.map(n => `'${n}'`).join(', ')}.`));
  return Line;
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
  _childOptions(cfg, isMobile) {
    const mobileOverride = (isMobile && cfg.mobileOptions) ? cfg.mobileOptions : {};
    return {
      animate: this.options.animate ?? true,
      height:  this.options.chartHeight ?? 200,
      theme:   this.options.theme,   // inherit parent theme
      ...cfg.options,
      ...mobileOverride,
      // Deep-merge margin: base → mobileOverride → bottom default
      margin: {
        bottom: 26,
        ...(cfg.options?.margin ?? {}),
        ...(mobileOverride.margin ?? {}),
      },
    };
  }

  // Build panel i's chart in its wrapper. Its setData is recorded — whether
  // it comes from cfg.data, mc.setData or mc.charts[i].setData — so a rebuild
  // can hand the new chart the same data; a call on a replaced instance is not.
  _createChild(i, wrapper, isMobile) {
    const cfg = (this.options.charts ?? [])[i];
    const ChartClass = chartClassFor(cfg.type, i);
    const chart = new ChartClass(wrapper, this._childOptions(cfg, isMobile));
    const own = chart.setData;
    chart.setData = (data) => {
      if (this.charts[i] === chart) this._lastData[i] = data;
      return own.call(chart, data);
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
        titleEl.style.color = this.theme.text;
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

  // ── Public ────────────────────────────────────────────────────────────────

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
