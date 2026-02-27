// RareCharts — Base Chart
// Handles container setup, header/footer rendering, dimensions, and resize.
// All chart types extend this class.

import { createTheme } from './Theme.js';

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

    // Bind theme values into CSS variables for header/footer styling
    this.container.style.setProperty('--rc-font', this.theme.font);
    this.container.style.setProperty('--rc-muted', this.theme.muted);
    this.container.style.setProperty('--rc-border', this.theme.border);
    this.container.style.setProperty('--rc-accent', this.theme.accent);
    this.container.style.setProperty('--rc-font-size', this.theme.fontSize);
    this.container.style.setProperty('--rc-text', this.theme.text);

    this._headerEl   = null;
    this._titleEl    = null;
    this._subtitleEl = null;
    this._legendEl   = null;
    this._footerEl   = null;
    this._sourceEl   = null;

    this._renderHeader();
    this._renderFooter();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);
  }

  // ── Header (Title / Subtitle / Legend) ────────────────
  // Vertical stack: title, subtitle, legend (each optional).

  _renderHeader() {
    const hasTitle = !!this.options.title;
    const hasSubtitle = !!this.options.subtitle;
    const hasLegend = this.options.legend !== undefined && this.options.legend !== null;

    if (!hasTitle && !hasSubtitle && !hasLegend) return;

    // Remove existing header if re-rendered
    if (this._headerEl && this._headerEl.parentNode) {
      this._headerEl.parentNode.removeChild(this._headerEl);
    }

    this._headerEl = document.createElement('div');
    this._headerEl.className = 'rc-chart-header';

    // Title
    if (hasTitle) {
      this._titleEl = document.createElement('h5');
      this._titleEl.className = 'chart-title';
      this._titleEl.textContent = this.options.title;
      this._headerEl.appendChild(this._titleEl);
    }

    // Subtitle
    if (hasSubtitle) {
      this._subtitleEl = document.createElement('p');
      this._subtitleEl.className = 'chart-subtitle';
      this._subtitleEl.textContent = this.options.subtitle;
      this._headerEl.appendChild(this._subtitleEl);
    }

    // Legend
    if (hasLegend) {
      this._legendEl = document.createElement('div');
      this._legendEl.className = 'chart-legend';

      const legend = this.options.legend;

      if (Array.isArray(legend)) {
        legend.forEach(item => {
          const el = document.createElement('div');
          el.className = 'chart-legend-item';

          const dot = document.createElement('span');
          dot.className = 'chart-legend-dot';
          dot.style.background = item.color ?? this.theme.accent;

          const text = document.createElement('span');
          text.textContent = item.label;

          el.appendChild(dot);
          el.appendChild(text);
          this._legendEl.appendChild(el);
        });
      } else if (legend instanceof HTMLElement) {
        this._legendEl.appendChild(legend);
      } else if (typeof legend === 'string') {
        this._legendEl.innerHTML = legend;
      } else {
        const s = document.createElement('div');
        s.textContent = String(legend);
        this._legendEl.appendChild(s);
      }

      this._headerEl.appendChild(this._legendEl);
    }

    this.container.insertBefore(this._headerEl, this.container.firstChild);
  }

  // ── Footer (Source) ───────────────────────────────────

  _renderFooter() {
    const hasSource = this.options.source !== undefined && this.options.source !== null && this.options.source !== '';
    if (!hasSource) return;

    // Remove existing footer if re-rendered
    if (this._footerEl && this._footerEl.parentNode) {
      this._footerEl.parentNode.removeChild(this._footerEl);
    }

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'rc-chart-footer';

    this._sourceEl = document.createElement('cite');
    this._sourceEl.className = 'chart-source';

    const src = this.options.source;
    if (src instanceof HTMLElement) {
      this._sourceEl.appendChild(src);
    } else {
      this._sourceEl.textContent = String(src);
    }

    this._footerEl.appendChild(this._sourceEl);
    this.container.appendChild(this._footerEl);
  }

  // ── Dimensions ───────────────────────────────────────
  // Height is reduced by header and footer height so the chart SVG
  // doesn't overflow the container.

  get width() {
    return Math.max(0, this.container.clientWidth - this.margin.left - this.margin.right);
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

  // Implemented by each chart type
  render() {
    throw new Error('render() must be implemented');
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
    this._headerEl = null;
    this._titleEl = null;
    this._subtitleEl = null;
    this._legendEl = null;
    this._footerEl = null;
    this._sourceEl = null;
  }
}