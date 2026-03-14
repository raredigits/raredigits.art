// RareCharts — MultiChart
// Combines 2–4 charts in a shared grid with a common title / legend / footer.
//
// Options:
//   title, subtitle, legend, source  — same as Chart (shared header/footer)
//   columns            — grid columns: 1 | 2 | 3 | 4 (default: 2)
//   mobileColumns      — columns when container width ≤ mobileBreakpoint (default: 1)
//   mobileBreakpoint   — container width (px) at which to switch to mobileColumns (default: 480)
//   chartHeight        — height for each cell in px (default: 200)
//   gap                — grid gap: number (px) or CSS string (default: uses --space-lg)
//   charts             — array of chart descriptors:
//     {
//       type          — 'Line' | 'Bar' (default: 'Line')
//       title         — optional label shown above the cell
//       span          — optional column span (e.g. span: 2 fills the full width in a 2-col grid)
//       data          — passed immediately to setData() if provided
//       options       — forwarded to the child chart constructor
//       mobileOptions — merged over options when container ≤ mobileBreakpoint
//                       (keys present in mobileOptions are restored to options values on desktop)
//     }
//
// Public API:
//   .charts            — array of instantiated child chart objects (in order)
//   .setData([d0, d1]) — call setData on each child by index
//   .destroy()         — tears down all children, then self

import { Chart } from '../core/Chart.js';
import { Line }  from './Line.js';
import { Bar }   from './Bar.js';

const TYPE_MAP = { Line, Bar };

export class MultiChart extends Chart {
  constructor(selector, options = {}) {
    super(selector, {
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      ...options,
    });

    this.charts  = [];
    this._cells  = [];
    this._isMobile = false;

    this._buildGrid();
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  _currentColumns() {
    const breakpoint  = this.options.mobileBreakpoint ?? 480;
    const mobileCols  = this.options.mobileColumns    ?? 1;
    const desktopCols = Math.min(Math.max(this.options.columns ?? 2, 1), 4);
    const w = this.container.clientWidth;
    // clientWidth === 0 means the element is hidden or not yet laid out — keep desktop cols.
    return (w > 0 && w <= breakpoint) ? mobileCols : desktopCols;
  }

  _buildGrid() {
    const { charts = [], gap, chartHeight = 200 } = this.options;

    const cols = this._currentColumns();
    this._isMobile = cols <= (this.options.mobileColumns ?? 1) && this.container.clientWidth > 0;

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

    charts.forEach(cfg => {
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

      // Merge mobileOptions when starting in mobile mode
      const mobileOverride = (this._isMobile && cfg.mobileOptions) ? cfg.mobileOptions : {};

      const ChartClass = TYPE_MAP[cfg.type] ?? Line;
      const childOpts  = {
        animate: this.options.animate ?? true,
        height:  chartHeight,
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

      const chart = new ChartClass(wrapper, childOpts);
      this.charts.push(chart);

      if (cfg.data != null) chart.setData(cfg.data);
    });
  }

  // ── Apply breakpoint options to existing child charts ──────────────────────

  _applyBreakpointOptions(isMobile) {
    const charts = this.options.charts ?? [];
    charts.forEach((cfg, i) => {
      if (!cfg.mobileOptions) return;
      const child = this.charts[i];
      if (!child) return;

      // Keys to update are always the keys defined in mobileOptions
      const keys = Object.keys(cfg.mobileOptions);
      keys.forEach(key => {
        const val = isMobile
          ? cfg.mobileOptions[key]
          : (cfg.options ?? {})[key];    // restore to base (may be undefined → default)

        if (key === 'margin') {
          // Always reconstruct from full defaults so top/right are never lost.
          // Layer: Chart.js defaults → MultiChart bottom → cfg.options.margin → mobileOptions.margin
          const defaults    = { top: 8, right: 70, bottom: 26, left: 0 };
          const baseMargin  = cfg.options?.margin     ?? {};
          const mobileMargin = cfg.mobileOptions?.margin ?? {};
          const merged = isMobile
            ? { ...defaults, ...baseMargin, ...mobileMargin }
            : { ...defaults, ...baseMargin };
          child.margin         = merged;
          child.options.margin = merged;
        } else {
          child.options[key] = val;
        }
      });

      child.render();
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
    const isMobile = cols <= (this.options.mobileColumns ?? 1) && this.container.clientWidth > 0;

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
    if (this._gridEl?.parentNode) this._gridEl.remove();
    this._gridEl = null;
    super.destroy();
  }
}
