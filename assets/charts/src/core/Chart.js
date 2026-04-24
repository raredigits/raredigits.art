// RareCharts — Base Chart
// Handles container setup, header/footer rendering, dimensions, and resize.
// All chart types extend this class.

import { createTheme } from './theme.js';
import { clampDateExtent, extentEquals, parseDate, resolveTimeframeExtent } from './utils.js';
import { Overview } from '../charts/Overview.js';

export const defaultTimeframes = ['1M', '3M', '6M', '1Y', '2Y', 'ALL'];

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
      top:    options.margin?.top    ?? 8,
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
    this._rangeRowEl   = null;
    this._rangeBarEl   = null;
    this._timeframeButtons = [];
    this._navigatorEl  = null;
    this._navigator    = null;
    this._viewExtent   = null;
    this._activeTimeframe = null;
    this._onViewChangeCb = null;

    this._renderHeader();
    this._renderFooter();
    this._ensureNavigator();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);
  }

  // ── Header (Title / Subtitle / Legend) ───────────────────────────────────

  _renderHeader() {
    const hasTitle    = !!this.options.title;
    const hasSubtitle = !!this.options.subtitle;
    const hasLegend   = this.options.legend != null;
    const hasRangeBar = this._getTimeframeOptions().length > 0;
    const legendRight = this.options.legendPosition === 'right';

    if (!hasTitle && !hasSubtitle && !hasLegend && !hasRangeBar) return;

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
          text.style.color = this.theme.text;

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
    if (hasTitle || hasSubtitle || (hasLegend && !legendRight) || hasRangeBar) {
      if (this._headerEl?.parentNode) this._headerEl.remove();

      this._headerEl = document.createElement('div');
      this._headerEl.className = 'rc-chart-header';

      if (hasTitle) {
        this._titleEl = document.createElement('h5');
        this._titleEl.className = 'rc-chart-title';
        this._titleEl.textContent = this.options.title;
        this._titleEl.style.color = this.theme.text;
        this._headerEl.appendChild(this._titleEl);
      }

      if (hasSubtitle) {
        this._subtitleEl = document.createElement('p');
        this._subtitleEl.className = 'rc-chart-subtitle';
        this._subtitleEl.textContent = this.options.subtitle;
        this._subtitleEl.style.color = this.theme.text;
        this._headerEl.appendChild(this._subtitleEl);
      }

      if (hasLegend && !legendRight) {
        this._headerEl.appendChild(this._legendEl);
      }

      this.container.insertBefore(this._headerEl, this.container.firstChild);
    }

    if (hasRangeBar) {
      if (this._rangeRowEl?.parentNode) this._rangeRowEl.remove();

      this._rangeRowEl = document.createElement('div');
      this._rangeRowEl.className = 'rc-chart-range-row';

      this._rangeBarEl = document.createElement('div');
      this._rangeBarEl.className = 'rc-chart-range-bar';

      this._timeframeButtons = this._getTimeframeOptions().map(step => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rc-range-btn';
        btn.textContent = step.label ?? step.key ?? '';
        btn.dataset.timeframe = step.key ?? step.label ?? '';
        btn.addEventListener('click', () => this.setTimeframe(step.key ?? step.label ?? ''));
        this._rangeBarEl.appendChild(btn);
        return btn;
      });

      this._rangeRowEl.appendChild(this._rangeBarEl);

      if (this._headerEl?.parentNode === this.container) {
        this.container.insertBefore(this._rangeRowEl, this._headerEl.nextSibling);
      } else {
        this.container.insertBefore(this._rangeRowEl, this.container.firstChild);
      }
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
    this._sourceEl.style.color = this.theme.text;

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
    const cs  = window.getComputedStyle(this.container);
    const padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return Math.max(0, this.container.clientWidth - padH - this.margin.left - this.margin.right - legendW);
  }

  get height() {
    const headerH = this._headerEl ? this._headerEl.offsetHeight + 8 : 0;
    const rangeH = this._rangeRowEl ? this._rangeRowEl.offsetHeight + 8 : 0;
    const navigatorH = this._navigatorEl ? this._navigatorEl.offsetHeight + 8 : 0;
    const footerH = this._footerEl ? this._footerEl.offsetHeight + 6 : 0;
    const cs  = window.getComputedStyle(this.container);
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const h = this.options.height ?? this.container.clientHeight;
    return Math.max(0, h - padV - this.margin.top - this.margin.bottom - headerH - rangeH - navigatorH - footerH);
  }

  _onResize() {
    if (this.width > 0 && this.height > 0) this.render();
  }

  _getTimeframeOptions() {
    const stepsOpt = this.options.timeframes ?? this.options.viewSteps ?? [];
    const steps = stepsOpt === true ? defaultTimeframes : stepsOpt;

    return (Array.isArray(steps) ? steps : [])
      .map(step => typeof step === 'string' ? { key: step, label: step } : step)
      .filter(step => !!(step?.key ?? step?.label));
  }

  _getDataExtent() {
    return null;
  }

  _getNavigatorData() {
    return null;
  }

  _hasNavigatorEnabled() {
    return this.options.navigator != null && this.options.navigator !== false;
  }

  _getNavigatorOptions() {
    if (this.options.navigator === true) return {};
    return typeof this.options.navigator === 'object' ? this.options.navigator : {};
  }

  _ensureNavigator() {
    if (!this._hasNavigatorEnabled()) return null;
    if (this._navigatorEl) return this._navigatorEl;

    this._navigatorEl = document.createElement('div');
    this._navigatorEl.className = 'rc-chart-navigator';

    if (this._footerEl?.parentNode === this.container) {
      this.container.insertBefore(this._navigatorEl, this._footerEl);
    } else {
      this.container.appendChild(this._navigatorEl);
    }

    this._navigator = new Overview(this._navigatorEl, {
      theme: this.theme,
      ...this._getNavigatorOptions(),
    });

    return this._navigatorEl;
  }

  _syncNavigator() {
    if (!this._hasNavigatorEnabled()) return;

    const data = this._getNavigatorData();
    if (!Array.isArray(data) || !data.length) {
      if (this._navigatorEl) this._navigatorEl.style.display = 'none';
      return;
    }

    this._ensureNavigator();
    this._navigatorEl.style.display = '';
    this._navigator.setData(data, extent => this.setView(extent, { silent: true }));

    const view = this.getView();
    if (view) this._navigator.setBrush(view);
  }

  _resolveDefaultView(fullExtent) {
    if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;

    if (Array.isArray(this.options.defaultView)) {
      return clampDateExtent(this.options.defaultView, fullExtent);
    }

    if (this.options.defaultTimeframe) {
      return resolveTimeframeExtent(this.options.defaultTimeframe, fullExtent);
    }

    return null;
  }

  _resolveViewExtent(fullExtent) {
    if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;
    return clampDateExtent(this._viewExtent ?? this._resolveDefaultView(fullExtent) ?? fullExtent, fullExtent);
  }

  _syncTimeframeButtons(fullExtent, viewExtent = null) {
    if (!this._timeframeButtons.length) return;

    const resolvedView = viewExtent ?? this._resolveViewExtent(fullExtent);
    const activeKey = this._getTimeframeOptions().find(step =>
      extentEquals(resolveTimeframeExtent(step, fullExtent), resolvedView)
    )?.key ?? null;

    this._activeTimeframe = activeKey;

    this._timeframeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.timeframe === activeKey);
    });
  }

  setView(extent, { silent = false } = {}) {
    const parsed = Array.isArray(extent)
      ? [parseDate(extent[0]), parseDate(extent[1])]
      : null;

    this._viewExtent = parsed?.[0] && parsed?.[1] ? parsed : null;
    this._syncTimeframeButtons(this._getDataExtent());
    this.render();
    this._syncNavigator();

    const resolved = this._resolveViewExtent(this._getDataExtent());
    if (!silent && resolved && this._onViewChangeCb) this._onViewChangeCb(resolved);
    return this;
  }

  getView() {
    return this._resolveViewExtent(this._getDataExtent());
  }

  setTimeframe(key, { silent = false } = {}) {
    const fullExtent = this._getDataExtent();
    const step = this._getTimeframeOptions().find(item => (item.key ?? item.label) === key) ?? key;
    const extent = resolveTimeframeExtent(step, fullExtent);
    if (!extent) return this;
    return this.setView(extent, { silent });
  }

  onViewChange(fn) {
    this._onViewChangeCb = fn;
    return this;
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
    this._rangeRowEl   = null;
    this._rangeBarEl   = null;
    this._timeframeButtons = [];
    if (this._navigator) this._navigator.destroy();
    this._navigator = null;
    this._navigatorEl = null;
  }
}
