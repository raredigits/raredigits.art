// RareCharts — Base Chart
// Handles container setup, header/footer rendering, dimensions, and resize.
// All chart types extend this class.

import { createTheme } from './theme.js';

export class Chart {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!this.container) {
      throw new Error(`RareCharts: element not found — "${selector}"`);
    }

    this.container.classList.add('rc-chart');

    this.theme   = createTheme(options.theme ?? {});
    this.options = options;

    this.margin = {
      top:    options.margin?.top    ?? 16,
      right:  options.margin?.right  ?? 70,
      bottom: options.margin?.bottom ?? 16,
      left:   options.margin?.left   ?? 0,
    };

    this._headerEl     = null;
    this._titleEl      = null;
    this._subtitleEl   = null;
    this._legendEl     = null;
    this._legendAsideEl = null;   // set when legendPosition: 'right'
    this._footerEl     = null;
    this._sourceEl     = null;

    this._renderHeader();
    this._renderFooter();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);
  }

  // ── Header (Title / Subtitle / Legend) ───────────────────────────────────

  _renderHeader() {
    const hasTitle    = !!this.options.title;
    const hasSubtitle = !!this.options.subtitle;
    const hasLegend   = this.options.legend != null;
    const legendRight = this.options.legendPosition === 'right';

    if (!hasTitle && !hasSubtitle && !hasLegend) return;

    // ── Build legend element (shared logic regardless of position) ──────────
    if (hasLegend) {
      this._legendEl = document.createElement('div');
      this._legendEl.className = 'rc-legend';

      const legend = this.options.legend;

      if (Array.isArray(legend)) {
        legend.forEach(item => {
          const el = document.createElement('div');
          el.className = 'rc-legend-item';

          // Line indicator for line series; dot for everything else
          const indicator = document.createElement('span');
          if (item.type === 'bar' || item.type === 'dot') {
            indicator.className = 'rc-legend-dot';
          } else {
            indicator.className = 'rc-legend-line';
          }
          indicator.style.background = item.color ?? this.theme.accent;

          const text = document.createElement('span');
          text.textContent = item.label ?? item.name ?? '';

          el.appendChild(indicator);
          el.appendChild(text);
          this._legendEl.appendChild(el);
        });
      } else if (legend instanceof HTMLElement) {
        this._legendEl.appendChild(legend);
      } else if (typeof legend === 'string') {
        this._legendEl.innerHTML = legend;
      } else {
        this._legendEl.textContent = String(legend);
      }
    }

    // ── Legend aside (right column) ─────────────────────────────────────────
    if (hasLegend && legendRight) {
      if (this._legendAsideEl?.parentNode) this._legendAsideEl.remove();

      this._legendAsideEl = document.createElement('div');
      this._legendAsideEl.className = 'rc-chart-legend-aside';
      this._legendAsideEl.appendChild(this._legendEl);

      this.container.classList.add('rc-chart--legend-right');
      this.container.appendChild(this._legendAsideEl);
    }

    // ── Header block (title, subtitle, inline legend) ────────────────────────
    if (hasTitle || hasSubtitle || (hasLegend && !legendRight)) {
      if (this._headerEl?.parentNode) this._headerEl.remove();

      this._headerEl = document.createElement('div');
      this._headerEl.className = 'rc-chart-header';

      if (hasTitle) {
        this._titleEl = document.createElement('h5');
        this._titleEl.className = 'rc-chart-title';
        this._titleEl.textContent = this.options.title;
        this._headerEl.appendChild(this._titleEl);
      }

      if (hasSubtitle) {
        this._subtitleEl = document.createElement('p');
        this._subtitleEl.className = 'rc-chart-subtitle';
        this._subtitleEl.textContent = this.options.subtitle;
        this._headerEl.appendChild(this._subtitleEl);
      }

      if (hasLegend && !legendRight) {
        this._headerEl.appendChild(this._legendEl);
      }

      this.container.insertBefore(this._headerEl, this.container.firstChild);
    }
  }

  // ── Footer (Source) ───────────────────────────────────────────────────────

  _renderFooter() {
    const hasSource = !!this.options.source;
    if (!hasSource) return;

    if (this._footerEl?.parentNode) this._footerEl.remove();

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'rc-chart-footer';

    this._sourceEl = document.createElement('cite');
    this._sourceEl.className = 'rc-chart-source';

    const src = this.options.source;
    if (src instanceof HTMLElement) {
      this._sourceEl.appendChild(src);
    } else {
      this._sourceEl.textContent = String(src);
    }

    this._footerEl.appendChild(this._sourceEl);
    this.container.appendChild(this._footerEl);
  }

  // ── Dimensions ────────────────────────────────────────────────────────────

  get width() {
    // When legend is in a right-side column, subtract its width from the total
    const legendW = this._legendAsideEl ? this._legendAsideEl.offsetWidth : 0;
    return Math.max(0, this.container.clientWidth - this.margin.left - this.margin.right - legendW);
  }

  get height() {
    const headerH = this._headerEl ? this._headerEl.offsetHeight + 8 : 0;
    const footerH = this._footerEl ? this._footerEl.offsetHeight + 6 : 0;
    const h = this.options.height ?? this.container.clientHeight;
    return Math.max(0, h - this.margin.top - this.margin.bottom - headerH - footerH);
  }

  _onResize() {
    if (this.width > 0 && this.height > 0) this.render();
  }

  render() {
    throw new Error('render() must be implemented');
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
    this._headerEl     = null;
    this._titleEl      = null;
    this._subtitleEl   = null;
    this._legendEl     = null;
    this._legendAsideEl = null;
    this._footerEl     = null;
    this._sourceEl     = null;
  }
}
