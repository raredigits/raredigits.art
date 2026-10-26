// RareCharts — Base Chart
// Handles container setup, header/footer rendering, the `controls` slot
// (page inputs placed inside the card), dimensions, and resize.
// All chart types extend this class.

import { createTheme } from './theme.js';
import { clampDateExtent, extentEquals, parseDate, resolveTimeframeExtent, uid } from './utils.js';
import { parseTime, linkTimeExtent, activeLinkSeries } from './links.js';
import { Overview } from '../charts/Overview.js';

export const defaultTimeframes = ['1M', '3M', '6M', '1Y', '2Y', 'ALL'];

// Inline properties the library sets on a chart container (height for every
// card, overflow for maps, overflow-x and position for graphs).
const HOST_STYLE_PROPS = ['height', 'overflow', 'overflow-x', 'position'];

// The least plot a chart keeps when its header and footer wrap (C-32).
const MIN_PLOT_HEIGHT = 80;

// One callback per animation frame (K-16); a timer where there are no frames.
const nextFrame = fn => (typeof requestAnimationFrame === 'function'
  ? { raf: requestAnimationFrame(fn) }
  : { timer: setTimeout(fn, 16) });
const cancelFrame = f => {
  if (f?.raf != null) cancelAnimationFrame(f.raf);
  else if (f?.timer != null) clearTimeout(f.timer);
};

// The timeframe that shows the whole data: 'ALL' / 'MAX' without a range.
const isFullStep = step => !Array.isArray(step.range)
  && ['ALL', 'MAX'].includes(String(step.key ?? step.label ?? '').trim().toUpperCase());

export class Chart {
  constructor(selector, options = {}) {
    this.container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!this.container) {
      throw new Error(`RareCharts: element not found — "${selector}"`);
    }

    // What the page gave us. destroy() undoes only the library's own changes:
    // the rc-* classes it added and the inline properties it sets — anything
    // the page changed on the element afterwards stays.
    this._hostClasses = new Set(this.container.classList);
    this._hostStyle = Object.fromEntries(HOST_STYLE_PROPS.map(p => [p, [
      this.container.style.getPropertyValue(p), this.container.style.getPropertyPriority(p)]]));
    this._adopted = [];
    this._destroyed = false;

    // Prefix for this chart's <defs> ids — `${this._uid}-clip`,
    // `${this._uid}-ts-grad`… (C-04); the navigator strip, an Overview, takes
    // its own. Set before any subclass draws.
    this._uid = uid('rc');

    // After destroy() render is a no-op, wherever the call comes from: a
    // resize or fonts callback, a requestAnimationFrame, a late fetch, or
    // the page itself. (Subclass render() methods are reached through this
    // instance property; super.render() calls inside them are unaffected.)
    const render = this.render;
    this.render = (...args) => (this._destroyed ? undefined : render.apply(this, args));

    this.container.classList.add('rc-chart');

    this.theme   = createTheme(options.theme ?? {});
    this.options = options;

    // Every class states its whole default margin: the axis charts work out
    // each side themselves (a side the page sets wins), the others pass
    // theirs complete ahead of the page's options — so a partial `margin`
    // from the page arrives here without the class's other sides. Those
    // classes have no gutter (Map, MapFlow, Graph, MultiChart) or fill the
    // card and do not use margin (Donut, Pie, Gauge, Sankey): a side left
    // out is 0, never an invented 70px Y-axis gutter (C-17).
    const m = options.margin ?? {};
    this.margin = {
      top:    m.top    ?? 0,
      right:  m.right  ?? 0,
      bottom: m.bottom ?? 0,
      left:   m.left   ?? 0,
    };

    this._headerEl     = null;
    this._titleEl      = null;
    this._subtitleEl   = null;
    this._legendEl     = null;
    this._legendAsideEl = null;   // set when legendPosition: 'right'
    this._footerEl     = null;
    this._sourceEl     = null;
    this._noteEl       = null;
    this._rangeRowEl   = null;
    this._rangeBarEl   = null;
    this._timeframeButtons = [];
    this._navigatorEl  = null;
    this._navigator    = null;
    this._viewExtent   = null;
    this._activeTimeframe = null;
    this._selectedTimeframe = null;
    this._onViewChangeCb = null;
    this._onScaleChangeCb = null;
    this._scaleButton = null;

    this._renderHeader();
    this._renderFooter();
    this._renderControls();
    this._ensureNavigator();

    // One frame later, not inside the observer's own callback: a render
    // there may grow the card (C-32), and resizing the observed element
    // from its callback makes the browser report a ResizeObserver loop.
    this._resizeObserver = new ResizeObserver(() => {
      if (this._resizeFrame) return;
      this._resizeFrame = nextFrame(() => { this._resizeFrame = null; this._onResize(); });
    });
    this._resizeObserver.observe(this.container);

    // Text measurement (axis-title clipping, X-label thinning, end-label boxes)
    // runs at first paint, which can land before the web font loads — the
    // wider fallback font then mis-measures and, e.g., trims a title that would
    // actually fit. Re-render once fonts settle so those measurements are right.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (this._destroyed) return;
        try { this.render(); } catch { /* not yet populated */ }
      });
    }
  }

  // ── Header (Title / Subtitle / Legend) ───────────────────────────────────

  _renderHeader() {
    const hasTitle    = !!this.options.title;
    const hasSubtitle = !!this.options.subtitle;
    const hasLegend   = this.options.legend != null;
    const hasTimeframes = this._getTimeframeOptions().length > 0;
    const scaleToggle   = this._getScaleToggle();
    const hasRangeBar   = hasTimeframes || !!scaleToggle;
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

          // Indicator shape reflects the series encoding:
          //   'band'           → filled square (a shaded range)
          //   'bar' | 'dot'    → dot
          //   'dashed'         → dashed line
          //   default          → solid line
          const indicator = document.createElement('span');
          const color = item.color ?? this.theme.accent;
          if (item.type === 'band') {
            indicator.className = 'rc-legend-band';
            indicator.style.background = color;
          } else if (item.type === 'bar' || item.type === 'dot') {
            indicator.className = 'rc-legend-dot';
            indicator.style.background = color;
          } else if (item.type === 'dashed' || item.dash) {
            indicator.className = 'rc-legend-line rc-legend-line--dashed';
            // Dashes drawn via a repeating gradient so the swatch stays a thin rule.
            indicator.style.backgroundImage =
              `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 8px)`;
          } else {
            indicator.className = 'rc-legend-line';
            indicator.style.background = color;
          }

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
      // The row keeps 60px free above the Y-axis labels on the right; charts
      // without that gutter (Map, MapFlow, Graph) align it to the edge.
      if (!this.margin.right) this._rangeRowEl.classList.add('rc-chart-range-row--flush');

      if (hasTimeframes) {
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
      }

      // Lin/Log — one button pinned right, above the Y-axis labels (CSS);
      // it names the current scale and flips it on click.
      if (scaleToggle) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rc-range-btn rc-scale-btn';
        btn.addEventListener('click', () =>
          this.setYScale(this._isLogScale(scaleToggle.axis) ? 'linear' : 'log', { axis: scaleToggle.axis }));
        this._rangeRowEl.classList.add(hasTimeframes ? 'rc-chart-range-row--scale' : 'rc-chart-range-row--scale-only');
        this._rangeRowEl.appendChild(btn);
        this._scaleButton = btn;
        this._syncScaleButton();
      }

      this._headerEl.appendChild(this._rangeRowEl);
    }
  }

  // ── Y scale switch ───────────────────────────────────────────────────────
  // `scaleToggle` adds one Lin/Log button to the header — pinned right, above
  // the Y-axis labels — for charts that have setYScale(). Accepts true, an axis name
  // ('y1' | 'y2' | 'both', DualAxes), or { axis?, labels?: { linear?, log? } }.

  _getScaleToggle() {
    const opt = this.options.scaleToggle;
    if (!opt || typeof this.setYScale !== 'function') return null;
    const cfg = typeof opt === 'object' ? opt : (typeof opt === 'string' ? { axis: opt } : {});
    return {
      axis:   cfg.axis ?? this._defaultScaleAxis(),
      labels: { linear: cfg.labels?.linear ?? 'Lin', log: cfg.labels?.log ?? 'Log' },
    };
  }

  // The axis the switch drives and how to read its state; charts with a log
  // scale override both.
  _defaultScaleAxis() {
    return 'y';
  }

  _isLogScale(_axis) {
    return false;
  }

  _syncScaleButton() {
    const btn = this._scaleButton;
    if (!btn) return;
    const cfg = this._getScaleToggle();
    const log = this._isLogScale(cfg.axis);
    btn.textContent = cfg.labels[log ? 'log' : 'linear'];
    // The other label, laid out unseen (CSS ::after), keeps the button as wide
    // as the wider of the two: it does not change size when it flips.
    btn.dataset.alt = cfg.labels[log ? 'linear' : 'log'];
    btn.dataset.scale = log ? 'log' : 'linear';
    btn.title = `Switch to ${log ? 'linear' : 'logarithmic'} scale`;
  }

  // Called by setYScale(): keeps the button in step and tells the page.
  _scaleChanged(scale, axis, silent) {
    this._syncScaleButton();
    if (!silent) this._emit(this._onScaleChangeCb, { scale, axis });
  }

  // Every page callback goes through here: after destroy() none fires — a
  // drag that ends after it, a late frame or fetch, a held button (C-33).
  _emit(fn, ...args) {
    if (this._destroyed || typeof fn !== 'function') return undefined;
    return fn.apply(this, args);   // the chart as `this`, as before
  }

  // A promise that settles once the chart has drawn what it loads (Graph:
  // its queued fetches and layout; Map, MapFlow: the geometry) and resolves
  // with the chart. A class with async work sets this._ready to its
  // promise; the others draw on setData, so theirs resolves at once (K-12).
  whenReady() {
    return Promise.resolve(this._ready).then(() => this);
  }

  onScaleChange(fn) {
    this._onScaleChangeCb = fn;
    return this;
  }

  // ── Footer (Source) ───────────────────────────────────────────────────────

  _renderFooter() {
    const hasSource = !!this.options.source;
    const hasNote   = !!this.options.note;
    if (!hasSource && !hasNote) return;

    if (this._footerEl?.parentNode) this._footerEl.remove();

    this._footerEl = document.createElement('div');
    this._footerEl.className = 'rc-chart-footer';

    if (hasSource) {
      this._sourceEl = document.createElement('cite');
      this._sourceEl.className = 'rc-chart-source';
      this._sourceEl.style.color = this.theme.text;

      const src = this.options.source;
      // An array source carries multiple parts (e.g. several attributions, some
      // linked) and is allowed to wrap so none get truncated; a plain string
      // keeps the single-line ellipsis behaviour.
      if (Array.isArray(src)) this._sourceEl.classList.add('rc-chart-source--rich');
      this._renderAttribution(this._sourceEl, src);

      this._footerEl.appendChild(this._sourceEl);
    }

    // Note — disclaimers, data caveats, editorial context. Rendered below the
    // source in the muted color so it reads as secondary. An in-component slot
    // so this text stops getting hand-built as stray markup around the chart.
    if (hasNote) {
      this._noteEl = document.createElement('p');
      this._noteEl.className = 'rc-chart-note';
      this._noteEl.style.color = this.theme.muted;

      const note = this.options.note;
      if (note instanceof HTMLElement) {
        this._noteEl.appendChild(note);
      } else {
        this._noteEl.textContent = String(note);
      }

      this._footerEl.appendChild(this._noteEl);
    }

    this.container.appendChild(this._footerEl);
  }

  // ── Controls slot ────────────────────────────────────────────────────────
  // Page-owned controls (filters, sliders, toggles) that drive the chart,
  // shown inside the card between the drawing and the footer — so they read
  // as part of the chart, not as stray markup above it. Pass an element or
  // a selector; the element is moved in as is (its listeners keep working).

  _renderControls() {
    const c = this.options.controls;
    if (!c) return;
    const el = typeof c === 'string' ? document.querySelector(c) : c;
    if (!(el instanceof HTMLElement)) return;
    this._adoptPageElement(el, e => e.classList.remove('rc-chart-controls'));
    el.classList.add('rc-chart-controls');
    this._controlsEl = el;
    this.container.appendChild(el);
  }

  // A page-owned element the chart moves into its card (controls, a Graph
  // details panel): destroy() puts it back where the page had it, undoing
  // the chart's changes with `cleanup` — but only while the chart still holds
  // it. One the page has moved meanwhile, or given to a new chart, stays.
  _adoptPageElement(el, cleanup = null) {
    this._adopted.push({ el, parent: el.parentNode, next: el.nextSibling, cleanup });
  }

  _returnPageElements() {
    this._adopted.forEach(({ el, parent, next, cleanup }) => {
      if (el.parentNode !== this.container) return;
      cleanup?.(el);
      if (parent && parent !== this.container && parent.isConnected) {
        parent.insertBefore(el, next && next.parentNode === parent ? next : null);
      } else {
        el.remove();
      }
    });
    this._adopted = [];
  }

  /**
   * Render a source/attribution value into `el`. Accepts:
   *   string                         → plain text
   *   HTMLElement                    → appended as-is
   *   { text, href }                 → an <a> opening in a new tab
   *   { text }                       → plain text (no href, no link)
   *   Array<string | { text, href } | HTMLElement>
   *                                  → each part in sequence, so a footer can mix
   *                                    several links and unlinked text on one line
   *                                    (e.g. "Source: NASDAQ, Bloomberg, Internal").
   * Links inherit the source text color and are distinguished by an underline.
   */
  _renderAttribution(el, value) {
    const appendPart = (part) => {
      if (part == null) return;
      if (part instanceof HTMLElement) { el.appendChild(part); return; }
      if (typeof part === 'object' && part.href) {
        const a = document.createElement('a');
        a.href = part.href;
        a.textContent = part.text ?? part.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        el.appendChild(a);
        return;
      }
      // { text } without an href is plain text, not "[object Object]"
      if (typeof part === 'object') {
        if (part.text != null) el.appendChild(document.createTextNode(String(part.text)));
        return;
      }
      el.appendChild(document.createTextNode(String(part)));
    };

    if (Array.isArray(value)) value.forEach(appendPart);
    else appendPart(value);
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
    // A header or strip hidden with display:none (Bar without a date axis)
    // gives back its gap too.
    const shown = el => el && el.style.display !== 'none';
    const headerH = shown(this._headerEl) ? this._headerEl.offsetHeight + 8 : 0;
    const navigatorH = shown(this._navigatorEl) ? this._navigatorEl.offsetHeight + 8 : 0;
    const footerH = this._footerEl ? this._footerEl.offsetHeight + 6 : 0;
    const controlsH = this._controlsEl ? this._controlsEl.offsetHeight : 0;
    const cs  = window.getComputedStyle(this.container);
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const h = this.options.height ?? this.container.clientHeight;
    const plot = h - padV - this.margin.top - this.margin.bottom - headerH - navigatorH - footerH - controlsH;
    return Math.max(0, this._keepPlotHeight(h, plot));
  }

  // A narrow card wraps its title, buttons, legend and footer onto more
  // lines, and they take the plot's share of `height` — down to nothing
  // (C-32). Below MIN_PLOT_HEIGHT the card grows instead, so the plot keeps
  // that much; once the parts fit again it returns to `height`. Only a card
  // at the height the chart gave it (or grew it to) is touched: a height the
  // page or the chart itself manages (a Graph details panel) stays, and a
  // card without one (Map) grows with its drawing.
  _keepPlotHeight(h, plot) {
    if (this.options.height == null) return plot;
    const style = this.container.style;
    if (!style.height) return Math.max(plot, MIN_PLOT_HEIGHT);
    const given = `${h}px`;
    if (style.height !== given && style.height !== this._grownHeight) return plot;
    const want = plot < MIN_PLOT_HEIGHT ? `${h + MIN_PLOT_HEIGHT - plot}px` : given;
    if (style.height !== want) style.height = want;
    this._grownHeight = want === given ? null : want;
    return Math.max(plot, MIN_PLOT_HEIGHT);
  }

  _onResize() {
    if (this.width > 0 && this.height > 0) this.render();
  }

  // viewSteps is the old name of timeframes: deprecated, removal planned for
  // 0.9.9 (K-04). It still works — timeframes wins when both are set — and
  // warns once per chart.
  _getTimeframeOptions() {
    if (this.options.viewSteps != null && !this._warnedViewSteps) {
      this._warnedViewSteps = true;
      console.warn('RareCharts: viewSteps is deprecated — use timeframes');
    }
    const stepsOpt = this.options.timeframes ?? this.options.viewSteps ?? [];
    const steps = stepsOpt === true ? defaultTimeframes : stepsOpt;

    return (Array.isArray(steps) ? steps : [])
      .map(step => typeof step === 'string' ? { key: step, label: step } : step)
      .filter(step => !!(step?.key ?? step?.label));
  }

  // ── Time of relation charts ──────────────────────────────────────────────
  // Graph's flow view and MapFlow hold ties with start / end rather than a
  // dated series. They say so with _isLinkTimeChart() (known at construction:
  // the navigator is built in this constructor) and hand over their ties with
  // _timeLinks(); the base then provides the time scale over them — data
  // extent, navigator series, the setTimeWindow ⇄ view link and the render
  // sync — once for both.
  _isLinkTimeChart() {
    return false;
  }

  _timeLinks() {
    return null;
  }

  _hasTimeNav() {
    return this._isLinkTimeChart() && (this._getTimeframeOptions().length > 0 || this._hasNavigatorEnabled());
  }

  // How a view bound (setView, defaultView, a timeframe range) is read. Time
  // series take Dates, ISO strings and epoch ms; relation charts read bounds
  // like their ties' start / end: a number below 10000 is a year, 'YYYY' and
  // 'YYYY-MM' are periods, and an upper bound runs to the period's end.
  _parseViewBound(v, isEnd = false) {
    if (!this._isLinkTimeChart()) return parseDate(v);
    const t = parseTime(v, { end: isEnd });
    return t == null ? null : new Date(t);
  }

  // setTimeWindow(from, to) on a relation chart with a time scale: the window
  // becomes the view, so the buttons and the brush follow it.
  _timeWindowAsView(from, to) {
    const full = this._getDataExtent();
    // a bound that does not read as a time ('' from an empty input, null) is
    // open — as without the time scale
    const a = this._parseViewBound(from, false), b = this._parseViewBound(to, true);
    if (!a && !b) return this.setView(full);
    return this.setView([a ?? full?.[0], b ?? full?.[1]]);
  }

  // At render: buttons and navigator follow the view; returns the window the
  // drawing applies ({ from, to }, or null for the whole span).
  _syncLinkTimeView() {
    const full = this._getDataExtent();
    const view = this._resolveViewExtent(full);
    this._syncTimeframeButtons(full, view);
    this._syncNavigator();
    return view && !extentEquals(view, full) ? { from: view[0], to: view[1] } : null;
  }

  // Extent and navigator series of the ties, worked out once per data set
  // (the array is replaced on setData) rather than on every render — a
  // brush drag renders many times over the same ties (K-16).
  _linkTime() {
    const links = this._timeLinks();
    if (!links) return null;
    if (this._linkTimeCache?.links !== links) {
      this._linkTimeCache = { links, extent: linkTimeExtent(links), series: undefined };
    }
    return this._linkTimeCache;
  }

  _getDataExtent() {
    return this._linkTime()?.extent ?? null;
  }

  _getNavigatorData() {
    const t = this._linkTime();
    if (!t) return null;
    if (t.series === undefined) t.series = activeLinkSeries(t.links, t.extent);
    return t.series;
  }

  // true or an options object turns the strip on; anything else (false,
  // null, 0, '') leaves it off.
  _hasNavigatorEnabled() {
    const n = this.options.navigator;
    return n === true || (n !== null && typeof n === 'object');
  }

  // The navigator lines up with the plot: its side margins default to the
  // chart's own (a relation chart's drawing has no axis gutter — it keeps
  // 6px for the brush handles and shows a time axis). A user `navigator`
  // object is merged over that, margin side by side.
  _getNavigatorOptions() {
    const user = typeof this.options.navigator === 'object' ? this.options.navigator : {};
    const base = this._isLinkTimeChart()
      ? { axis: true, margin: { left: 6, right: 6 } }
      : { margin: { left: this.margin.left, right: this.margin.right } };
    return { ...base, ...user, margin: { ...base.margin, ...(user.margin ?? {}) } };
  }

  _ensureNavigator() {
    if (this._destroyed || !this._hasNavigatorEnabled()) return null;
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
    if (this._destroyed || !this._hasNavigatorEnabled()) return;

    const data = this._getNavigatorData();
    if (!Array.isArray(data) || !data.length) {
      if (this._navigatorEl) this._navigatorEl.style.display = 'none';
      return;
    }

    this._ensureNavigator();
    this._navigatorEl.style.display = '';
    // The strip spans the chart's whole extent (every series, not only the
    // one it draws).
    this._navigator.setData(
      data,
      (extent, { final = false } = {}) => this._onNavigatorBrush(extent, final),
      { extent: this._getDataExtent() },
    );

    const view = this.getView();
    if (view) this._navigator.setBrush(view);
  }

  // A drag fires an event on every pointer move, and each one used to
  // re-render the chart — a flow layout, the strip (K-16). Live moves now
  // land once per animation frame, the latest window winning, silently; the
  // drag's end applies at once and reports through onViewChange, like the
  // buttons do.
  _onNavigatorBrush(extent, final) {
    if (this._destroyed) return;
    if (final) {
      cancelFrame(this._brushFrame);
      this._brushFrame = null;
      this._pendingBrush = null;
      this.setView(extent);
      return;
    }
    this._pendingBrush = extent;
    if (this._brushFrame) return;
    this._brushFrame = nextFrame(() => {
      const pending = this._pendingBrush;
      this._brushFrame = null;
      this._pendingBrush = null;
      if (pending && !this._destroyed) this.setView(pending, { silent: true });
    });
  }

  _resolveDefaultView(fullExtent) {
    if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;

    const parse = (v, isEnd) => this._parseViewBound(v, isEnd);
    if (Array.isArray(this.options.defaultView)) {
      return clampDateExtent(this.options.defaultView, fullExtent, parse);
    }

    if (this.options.defaultTimeframe) {
      return resolveTimeframeExtent(this._findTimeframe(this.options.defaultTimeframe), fullExtent, parse);
    }

    return null;
  }

  _resolveViewExtent(fullExtent) {
    if (!Array.isArray(fullExtent) || !fullExtent[0] || !fullExtent[1]) return null;
    // An explicit window is honoured: clamped to the data, or — when it
    // misses the data entirely — kept as asked, an empty window (axis charts
    // show their empty state, relation views dim or hide every tie). Only a
    // default view that misses the data falls back to the full extent; after
    // setData, _refreshViewForData drops a window the new data left behind.
    if (this._viewExtent) {
      return clampDateExtent(this._viewExtent, fullExtent) ?? clampDateExtent(this._viewExtent, null);
    }
    return this._resolveDefaultView(fullExtent) ?? clampDateExtent(fullExtent, fullExtent);
  }

  // A timeframe step by key, from the chart's own list (custom
  // { key, label, range } steps included); an unknown key is returned as is,
  // so preset keys ('1Y', 'YTD', 'ALL') still resolve.
  _findTimeframe(key) {
    if (key && typeof key === 'object') return key;
    return this._getTimeframeOptions().find(step => (step.key ?? step.label) === key) ?? key;
  }

  // After setData: a chosen timeframe re-applies to the new data (the last
  // 3M of the new range, not the old dates); any other view that no longer
  // meets the data falls back to the full extent (_resolveViewExtent).
  _refreshViewForData() {
    const full = this._getDataExtent();
    if (full && this._selectedTimeframe) {
      const step = this._findTimeframe(this._selectedTimeframe);
      // keep the current window if the step cannot be resolved any more
      this._viewExtent = resolveTimeframeExtent(step, full, (v, e) => this._parseViewBound(v, e)) ?? this._viewExtent;
    }
    if (full && this._viewExtent && !clampDateExtent(this._viewExtent, full)) this._viewExtent = null;
    this._syncTimeframeButtons(full);
  }

  _syncTimeframeButtons(fullExtent, viewExtent = null) {
    if (!this._timeframeButtons.length) return;

    const resolvedView = viewExtent ?? this._resolveViewExtent(fullExtent);
    const parse = (v, isEnd) => this._parseViewBound(v, isEnd);
    const matchingSteps = this._getTimeframeOptions().filter(step =>
      extentEquals(resolveTimeframeExtent(step, fullExtent, parse), resolvedView)
    );

    // Several steps can cover the same window (YTD, 1Y and ALL on data from
    // this year). The step chosen wins: the last one clicked or set, or the
    // defaultTimeframe while the default view holds. Without one, a view of
    // the whole data lights ALL rather than whichever step comes first in
    // the list (C-34); any other view, the first step that matches.
    const chosen = this._selectedTimeframe ?? this._defaultTimeframeKey();
    const selectedMatch = chosen
      ? matchingSteps.find(step => (step.key ?? step.label) === chosen)
      : null;
    const fullMatch = extentEquals(resolvedView, fullExtent) ? matchingSteps.find(isFullStep) : null;

    // a step without a key is known by its label, as its button is
    const active = selectedMatch ?? fullMatch ?? matchingSteps[0];
    const activeKey = active ? (active.key ?? active.label ?? null) : null;

    this._activeTimeframe = activeKey;

    this._timeframeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.timeframe === activeKey);
    });
  }

  // The defaultTimeframe's key while the default view is in force — no
  // window set since (a button, the brush, setView) and no defaultView,
  // which wins over it.
  _defaultTimeframeKey() {
    const d = this.options.defaultTimeframe;
    if (!d || this._viewExtent || Array.isArray(this.options.defaultView)) return null;
    return typeof d === 'object' ? (d.key ?? d.label ?? null) : d;
  }

  setView(extent, { silent = false, preserveSelectedTimeframe = false } = {}) {
    const parsed = Array.isArray(extent)
      ? [this._parseViewBound(extent[0], false), this._parseViewBound(extent[1], true)]
      : null;

    this._viewExtent = parsed?.[0] && parsed?.[1] ? parsed : null;
    if (!preserveSelectedTimeframe) this._selectedTimeframe = null;
    this._syncTimeframeButtons(this._getDataExtent());
    this.render();               // the render syncs the navigator and its brush

    const resolved = this._resolveViewExtent(this._getDataExtent());
    if (!silent && resolved) this._emit(this._onViewChangeCb, resolved);
    return this;
  }

  getView() {
    return this._resolveViewExtent(this._getDataExtent());
  }

  setTimeframe(key, { silent = false } = {}) {
    const fullExtent = this._getDataExtent();
    const step = this._findTimeframe(key);
    const extent = resolveTimeframeExtent(step, fullExtent, (v, e) => this._parseViewBound(v, e));
    if (!extent) return this;
    this._selectedTimeframe = typeof key === 'string' ? key : (step.key ?? step.label ?? null);
    return this.setView(extent, { silent, preserveSelectedTimeframe: true });
  }

  // Empty state — no data, or nothing in the current window: the drawing
  // layers the class lists in _dataLayers() are cleared (marks, axes, grid,
  // labels, annotations), tooltip and crosshair hidden, and the header
  // buttons and the navigator synced (the navigator hides without data).
  // Title, legend and footer stay.
  _renderEmpty() {
    this._dataLayers().forEach(g => g?.selectAll('*').remove());
    // unbind, not just hide: the hover handlers hold the old series and scale
    this._crosshair?.unbind?.();
    this._tooltip?.hide?.();
    this._syncTimeframeButtons(this._getDataExtent());
    this._syncNavigator();
  }

  _dataLayers() {
    return [];
  }

  onViewChange(fn) {
    this._onViewChangeCb = fn;
    return this;
  }

  render() {
    throw new Error('render() must be implemented');
  }

  // Tear down: stop observers and late renders (fonts, fetches, queued
  // tasks check _destroyed), hand the page's own controls element back to
  // where it was, empty the container and restore its class and style.
  destroy() {
    this._destroyed = true;
    cancelFrame(this._brushFrame);
    this._brushFrame = null;
    cancelFrame(this._resizeFrame);
    this._resizeFrame = null;
    this._pendingBrush = null;
    this._onViewChangeCb = null;
    this._onScaleChangeCb = null;
    this._resizeObserver.disconnect();
    this._returnPageElements();
    this._controlsEl = null;
    this.container.innerHTML = '';
    [...this.container.classList]
      .filter(c => c.startsWith('rc-') && !this._hostClasses.has(c))
      .forEach(c => this.container.classList.remove(c));
    if (!this.container.classList.length && !this._hostClasses.size) this.container.removeAttribute('class');
    HOST_STYLE_PROPS.forEach(p => {
      const [value, priority] = this._hostStyle[p];
      if (value) this.container.style.setProperty(p, value, priority);
      else this.container.style.removeProperty(p);
    });
    if (!this.container.getAttribute('style')) this.container.removeAttribute('style');
    this._headerEl     = null;
    this._titleEl      = null;
    this._subtitleEl   = null;
    this._legendEl     = null;
    this._legendAsideEl = null;
    this._footerEl     = null;
    this._sourceEl     = null;
    this._noteEl       = null;
    this._rangeRowEl   = null;
    this._rangeBarEl   = null;
    this._timeframeButtons = [];
    this._scaleButton = null;
    if (this._navigator) this._navigator.destroy();
    this._navigator = null;
    this._navigatorEl = null;
  }
}
