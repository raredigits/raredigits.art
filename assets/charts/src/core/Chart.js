// RareCharts — Base Chart
// Handles container setup, header/footer rendering, the `controls` slot
// (page inputs placed inside the card), dimensions, and resize; for the
// time charts the view, the timeframes and the navigator, reported through
// onViewChange(extent, { key, level }). 'CUSTOM' among the timeframes adds
// the custom range: a button whose panel takes two days (RC-003,
// core/customRange.js); setTimeframe('CUSTOM', { range: [from, to] }) sets
// it from code. setLoading(true | false) lays a "Loading…" bar over any
// chart's plot while the page fetches data.
// All chart types extend this class.

import * as d3 from 'd3';
import { createTheme } from './theme.js';
import { makeHex, paintOf, publishTheme, readDataColors, restoreStyle } from './paint.js';
import { clampDateExtent, extentEquals, parseDate, resolveTimeframeExtent, resolveTimeZone, uid, weekdayOf } from './utils.js';
import { applySvgA11y } from './renderHelpers.js';
import { parseTime, linkTimeExtent, activeLinkSeries } from './links.js';
import { legendKey, renderLegendItems } from './legend.js';
import { Tooltip, setTooltipTokens } from './Tooltip.js';
import { boxInCard } from './zoomGesture.js';
import { CUSTOM_LABEL, RangePanel, dayRange, isCustomStep, rangeTitle } from './customRange.js';
import { Overview } from '../charts/Overview.js';

export const defaultTimeframes = ['1M', '3M', '6M', '1Y', '2Y', 'ALL'];

// Inline properties the library sets on a chart container (height for every
// card, overflow for maps, overflow-x and position for graphs). The theme's
// own --rc-* values join them when the chart publishes (core/paint.js).
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

// A header legend item's swatch, from its `type` (the legend format of the
// settings page): 'band' a filled square, 'bar' / 'dot' a dot, 'dashed' (or
// `dash: true`) a dashed line, anything else a solid line. A dashed item keeps
// the 5/3 dash: `dash` is a flag here, not a pattern. An item that sets
// neither takes a dashed line from the series it names when that series is
// drawn dashed (`dashed: true` in _legendSeries: TimeSeries' comparison).
const markOf = (item, series = null) => {
  if (item.type === 'band') return 'band';
  if (item.type === 'bar' || item.type === 'dot') return 'dot';
  if (item.type === 'dashed' || item.dash) return 'dashed';
  if (item.type == null && item.dash == null && series?.dashed === true) return 'dashed';
  return 'line';
};

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
    // Every render syncs the header legend first: a "Show all" that appears
    // can add a row to the header, and the class measures the header and the
    // legend column while it renders (height, width).
    // A loading bar (setLoading) and an open custom range panel follow the
    // plot and the buttons after every render: a resize, a header that wraps.
    // The data colours (the accent, the series) are read first, so a page
    // that changed its --chart-series-* sees them at the next render.
    const render = this.render;
    this.render = (...args) => {
      if (this._destroyed) return undefined;
      this._readDataColors();
      this._syncLegend();
      const out = render.apply(this, args);
      if (this._loadingEl) this._placeLoading();
      if (this._rangePanel?.isOpen) this._rangePanel.place();
      return out;
    };

    // The series the legend hides, by key (a series name; a slice's id or
    // label; a tie category). One set for every legend of the chart: it
    // survives setData, so a series that leaves the data and comes back
    // stays hidden (it is "dormant" meanwhile).
    this._hiddenKeys = new Set();

    this.container.classList.add('rc-chart');

    // The theme (RC-014, K-14): the merged spec, its own values published
    // inline on the card as --rc-* (rare-charts.css declares the defaults on
    // .rc-chart, the page's --chart-* tokens first), and the object the
    // classes draw with (core/paint.js): role colours as var(--rc-…)
    // references the browser resolves, the accent and the series as hex,
    // read here — for anything built before the first render — and at every
    // render. The page's own inline values of those names are saved with the
    // others; destroy() puts them back. Drawing code reads this.theme only;
    // this._theme is the spec. A colour that leaves the chart (a payload,
    // colour maths) goes through this._hex().
    this._theme  = createTheme(options.theme ?? {});
    publishTheme(this.container, this._theme, this._hostStyle);
    this._hex    = makeHex(this.container);
    this.theme   = paintOf(this._theme, { hex: this._hex });
    this._readDataColors();
    // Some classes give each series its colour as they take the data (Line,
    // a stacked Bar's legend): setData reads the colours first too, so a
    // page that changed its --chart-series-* sees them in that call.
    const setData = this.setData;
    if (typeof setData === 'function') {
      this.setData = (...args) => {
        if (!this._destroyed) this._readDataColors();
        return setData.apply(this, args);
      };
    }
    this.options = options;
    // timeZone: 'local' (default) | 'UTC' — the zone dates are read, cut and
    // named in (T-10; the table is at parseDate in core/utils.js), a relation
    // chart's ties too (RC-006; parseTime in core/links.js). Read once: the
    // rows already parsed would not follow a later change.
    this._timeZone = resolveTimeZone(options.timeZone);

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
    this._selectedTimeframe = null;
    this._customRange  = null;   // the custom range's days, [start, end] (RC-003)
    this._rangePanel   = null;   // its panel, made on the first click
    this._now          = null;   // "now" for timeframeAnchor: 'now' (_readAnchor)
    this._onViewChangeCb = null;
    this._onScaleChangeCb = null;
    this._scaleButton = null;
    this._tooltip = null;         // the tooltip getter makes it
    this._loadingEl = null;       // setLoading(true) makes it

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
        // Every item a label for now: the class's series are not known yet
        // (its constructor has not run). The render syncs it (_syncLegend).
        renderLegendItems(this._legendEl, this._headerLegendItems(null), { interactive: false });
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

        // A timeframe button is a toggle: its state is aria-pressed (K-06),
        // set by _syncTimeframeButtons; none is pressed before the data.
        // The custom range's button also opens its panel (aria-expanded).
        this._timeframeButtons = this._getTimeframeOptions().map(step => {
          const key = step.key ?? step.label ?? '';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'rc-range-btn';
          btn.textContent = step.label ?? step.key ?? '';
          btn.dataset.timeframe = key;
          btn.setAttribute('aria-pressed', 'false');
          if (isCustomStep(step)) {
            btn.className = 'rc-range-btn rc-range-custom';
            btn.setAttribute('aria-haspopup', 'dialog');
            btn.setAttribute('aria-expanded', 'false');
            btn.addEventListener('click', () => this._toggleRangePanel(btn, key));
          } else {
            btn.addEventListener('click', () => this.setTimeframe(key));
          }
          this._rangeBarEl.appendChild(btn);
          return btn;
        });

        this._rangeRowEl.appendChild(this._rangeBarEl);
      }

      // Log — one toggle pinned right, above the Y-axis labels (CSS);
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

  // ── Legend: items, series and the hidden set ─────────────────────────────
  // The header legend is drawn by the one legend builder (core/legend.js,
  // D-04). An item names its series by `series`, else `name`, else `label`;
  // `series: false` keeps it a caption. An item that names a series in the
  // data is a toggle, the others are labels. A class with a series legend
  // lists its series (_legendSeries) and draws only the shown ones
  // (_isShown); the base keeps the hidden set and answers the gestures.

  // The series the legend shows and hides, in data order: [{ key, color,
  // dashed? }]. None by default: the class has no series legend, every item
  // a label.
  _legendSeries() {
    return [];
  }

  // The key of a header legend item when it names a series in `present`
  // (a Map key → series), else null. A class whose items match otherwise
  // (Donut: an item's id against the slice ids) overrides it.
  _legendKeyOf(item, present) {
    const key = legendKey(item);
    return key != null && present.has(key) ? key : null;
  }

  // Whether the value axes follow the shown series (legendRescale, default
  // true) or keep every series in view.
  _legendRescale() {
    return this.options.legendRescale !== false;
  }

  _isShown(key) {
    return !this._hiddenKeys.has(key);
  }

  // A class that pins a tooltip lets go of an item that was just hidden.
  _unpinHidden() {}

  // _legendSeries() as a Map key → series, keys as strings; the first of a
  // repeated key wins.
  _legendPresent() {
    const present = new Map();
    (this._legendSeries() ?? []).forEach(s => {
      const key = s?.key == null ? null : String(s.key);
      if (key != null && !present.has(key)) present.set(key, s);
    });
    return present;
  }

  // The builder's items for an array `legend`. `present` null — the header
  // being built, before the class's own fields exist — makes every item a
  // label. The colour is the item's, else its series', else the fallback.
  _headerLegendItems(present) {
    return this.options.legend.map(entry => {
      const item = entry ?? {};
      const key = present ? this._legendKeyOf(item, present) : null;
      return {
        key,
        label: item.label ?? item.name ?? '',
        color: item.color ?? (key != null ? present.get(key)?.color : null) ?? this._legendFallbackColor(),
        mark: markOf(item, key != null ? present.get(key) : null),
        on: key == null || this._isShown(key),
      };
    });
  }

  // The accent and the series palette as hex, in place on this.theme
  // (core/paint.js); the hex() cache starts again.
  _readDataColors() {
    readDataColors(this.container, this._theme, this.theme);
  }

  // The colour of a legend item that has none of its own and no series
  // drawn to take it from: the accent, as the card's token (K-14), so a
  // theme's own accent applies (Donut: grey, see there).
  _legendFallbackColor() {
    return 'var(--rc-accent, #1677ff)';
  }

  // Run before every render (the wrapper in the constructor), resize and
  // brush frames included: the header legend follows the data and the
  // hidden set. The builder writes only what changed, and keeps focus.
  // `legendInteractive: false` keeps every item a label and leaves out the
  // series the chart does not draw. A string or element legend is the
  // page's own and is left alone.
  _syncLegend() {
    const el = this._legendEl;
    const legend = this.options.legend;
    if (!el || !Array.isArray(legend)) return;
    const present = this._legendPresent();
    let items = this._headerLegendItems(present);
    this._warnUnmappedLegend(legend, items);
    const interactive = this.options.legendInteractive !== false;
    if (!interactive) items = items.filter(item => item.on);
    const listed = [...new Set(items.filter(item => item.key != null).map(item => item.key))];
    renderLegendItems(el, items, {
      interactive,
      anyHidden: [...present.keys()].some(key => this._hiddenKeys.has(key)),
      onToggle: info => this._legendGesture(info, listed),
    });
  }

  // When some items name a series and another names one that is not in the
  // data, that one is most likely a typo: say so, once per item. A legend
  // where nothing maps (a caption, a class without a series legend) stays
  // quiet, and so does an item with `series: false`.
  _warnUnmappedLegend(legend, items) {
    if (!items.some(item => item.key != null)) return;
    items.forEach((item, i) => {
      const name = item.key == null ? legendKey(legend[i]) : null;
      if (name == null || this._legendWarned?.has(name)) return;
      (this._legendWarned ??= new Set()).add(name);
      console.warn(`RareCharts.${this._chartName()}: legend item "${item.label || name}" names no series — set \`series\` to the series name, or \`series: false\` for a caption`);
    });
  }

  // The class's public name, for console messages: looked up in the bundle's
  // global, as the minified bundle renames classes; outside the bundle (tests,
  // ES imports) and for a page's own subclass, the class's own name.
  _chartName() {
    const ns = globalThis.RareCharts;
    const name = ns && typeof ns === 'object'
      ? Object.keys(ns).find(k => ns[k] === this.constructor) : null;
    return name ?? this.constructor.name;
  }

  // A committed legend gesture (the builder's onToggle). `listed`: the keys
  // this legend toggles — a gesture changes only those, so a series with no
  // item cannot be hidden for good by a double click; Show all clears every
  // hidden key, dormant ones too. The chart redraws (the render syncs the
  // legend), then tells the page: onLegendToggle({ name, visible,
  // visibleNames }) — name null for Show all, visible true after a double
  // click, visibleNames the shown keys in the data, in data order.
  _legendGesture({ kind, key, visibleKeys }, listed) {
    if (this._destroyed) return;
    const changed = new Set(listed);
    if (kind === 'showAll') {
      this._hiddenKeys.forEach(k => changed.add(k));
      this._hiddenKeys.clear();
    } else {
      const visible = new Set(visibleKeys);
      listed.forEach(k => (visible.has(k) ? this._hiddenKeys.delete(k) : this._hiddenKeys.add(k)));
    }
    this._hiddenChanged(changed);
    this._emit(this.options.onLegendToggle, {
      name: kind === 'showAll' ? null : key,
      visible: kind === 'toggle' ? visibleKeys.includes(key) : true,
      visibleNames: this._visibleLegendKeys(),
    });
  }

  // The keys in the data that are shown, in data order.
  _visibleLegendKeys() {
    return [...this._legendPresent().keys()].filter(key => this._isShown(key));
  }

  // The visibility setters (setSeriesVisible, setLinkTypesVisible) in one:
  // a list shows those keys and hides every other key in the data (hidden
  // keys no longer in the data drop); null shows everything. The chart
  // redraws; no event — a page that mirrors one chart into another from
  // onLegendToggle cannot loop.
  _setVisibleKeys(list) {
    const shown = list == null ? null : new Set((typeof list === 'string' ? [list] : [...list]).map(String));
    const present = shown ? [...this._legendPresent().keys()] : [];
    const changed = new Set([...this._hiddenKeys, ...present]);
    this._hiddenKeys.clear();
    present.forEach(key => { if (!shown.has(key)) this._hiddenKeys.add(key); });
    this._hiddenChanged(changed);
    return this;
  }

  // The hidden set changed for `keys` (a gesture, a setter): the chart lets
  // go of a pinned item that is now hidden and redraws. MultiChart passes
  // the change on to its cells.
  _hiddenChanged(_keys) {
    this._unpinHidden();
    this.render();
  }

  // ── Y scale switch ───────────────────────────────────────────────────────
  // `scaleToggle` adds one "Log" toggle to the header — pinned right, above
  // the Y-axis labels — for charts that have setYScale(): pressed while the
  // axis is logarithmic. Accepts true, an axis name ('y1' | 'y2' | 'both',
  // DualAxes), or { axis?, labels?: { log? } } — labels.log is its text;
  // labels.linear is still read, for pages that pass it, and not shown.

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
    // One toggle with a fixed label (maintainer, 2026-11-18, RC-083): "Log",
    // pressed while the axis is logarithmic. A label that named the scale in
    // force read as an action and as a state at once.
    btn.textContent = cfg.labels.log;
    btn.setAttribute('aria-pressed', String(log));
    btn.dataset.scale = log ? 'log' : 'linear';
    btn.title = 'Logarithmic scale';
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

  // ── Tooltip ──────────────────────────────────────────────────────────────
  // The chart's one tooltip (core/Tooltip.js), made on first use: a class
  // that shows none (MultiChart) makes none. The classes that do ask for it
  // in their constructor, so its element takes the same place in the card as
  // ever. destroy() takes it down for every class — the element and, if it
  // is pinned, its document listeners; after that there is none (null).
  get tooltip() {
    if (!this._tooltip && !this._destroyed) this._tooltip = new Tooltip(this.container, this.theme);
    return this._tooltip;
  }

  // ── SVG root ─────────────────────────────────────────────────────────────
  // The rule: every SVG chart class creates its svg through
  // Chart._createSvg(). The root is made, placed in the card and given its
  // accessible name (applySvgA11y: role="img", an aria-label from ariaLabel
  // or the title and subtitle) here, in one place — a class cannot leave its
  // drawing unnamed or ignore ariaLabel. (Overview, the navigator strip, is
  // not a Chart: it lives inside the card of the chart it serves.)
  //
  //   size          'fill' (default): the card takes options.height and the
  //                 svg fills it (width and height 100%); 'width': width
  //                 100%, the class sets the height (HierarchicalBar grows
  //                 with its rows); 'none': the class sizes it (Map)
  //   className     the svg's class
  //   style         inline styles, set in the order given
  //   beforeFooter  placed ahead of the footer rather than last in the card
  //
  // The attributes come in that order — class, size, style, then the name.
  // Sets this.svg and returns it.
  _createSvg({ size = 'fill', className = null, style = null, beforeFooter = false } = {}) {
    if (size === 'fill') this.container.style.height = this.options.height + 'px';
    const footer = beforeFooter && this._footerEl?.parentNode === this.container ? this._footerEl : null;
    const svg = d3.select(this.container).insert('svg', () => footer);
    if (className) svg.attr('class', className);
    if (size === 'fill' || size === 'width') svg.attr('width', '100%');
    if (size === 'fill') svg.attr('height', '100%');
    Object.entries(style ?? {}).forEach(([name, value]) => svg.style(name, value));
    applySvgA11y(svg, this.options);
    this.svg = svg;
    return svg;
  }

  // The plot of an axis chart (Line, DualAxes, TimeSeries, Bar): the svg
  // filling the card and in it the group the marks are drawn in, moved in by
  // the margin. Sets this.svg and this.g; returns the group.
  _createPlot() {
    this._createSvg();
    const { left, top } = this.margin;
    this.g = this.svg.append('g').attr('transform', `translate(${left},${top})`);
    this._axisPlot = true;
    return this.g;
  }

  // The plot in the card's frame, { x, y, width, height }, for what is laid
  // over it (the zoom hint, the loading bar): an axis chart's plot inside its
  // margins, else the drawing's svg cut to the card (Graph leaves out its
  // side panel), else the card's top edge.
  _plotBox() {
    if (this._axisPlot) {
      const [x, y] = this._plotToCard(0, 0);
      return { x, y, width: this.width, height: this.height };
    }
    const svg = this.svg?.node();
    return svg ? boxInCard(svg, this.container) : { x: 0, y: 0, width: this.container.clientWidth, height: 0 };
  }

  // A point of the plot (this.g's frame) in the card's frame — the one the
  // tooltip is placed in, and d3.pointer(event, container) gives.
  _plotToCard(px, py) {
    const svgBox  = this.svg.node().getBoundingClientRect();
    const cardBox = this.container.getBoundingClientRect();
    const dx = svgBox.left - cardBox.left - this.container.clientLeft;
    const dy = svgBox.top - cardBox.top - this.container.clientTop;
    return [px + this.margin.left + dx, py + this.margin.top + dy];
  }

  // A log axis has no place for values ≤ 0: filterLogSeries skips them, and
  // the page is told once per setData (setData clears the flag). `label`
  // names the class, `where` the scale ('scale', or 'axis' on DualAxes).
  _warnLogSkips(skipped, label, where = 'scale') {
    if (!skipped || this._warnedNonPositive) return;
    this._warnedNonPositive = true;
    console.warn(`RareCharts.${label}: ${skipped} value${skipped === 1 ? '' : 's'} ≤ 0 skipped on the log ${where}`);
  }

  // ── Value gutters (RC-060) ─────────────────────────────────────────────────
  // Tick and end labels wider than their gutter ('$100,000' in 64 px) reached
  // past the drawing, and a card without padding cut them off. Each gutter
  // the page's margin does not set takes the room its labels need — never
  // less than the class's own width — and one more render follows when a
  // side changes. `sides`: [[group or groups, 'left' | 'right'], …]. Returns
  // true after that render, so the caller stops drawing.
  _fitGutters(sides) {
    if (this._fittingGutters || this._destroyed) return false;
    const box = this.svg?.node()?.getBoundingClientRect?.();
    if (!box || !(box.width > 0)) return false;
    this._gutterBase ??= {};
    let changed = false;
    for (const [groups, side] of sides) {
      if ((this._pageMargin ?? this.options.margin)?.[side] != null) continue;
      const base = (this._gutterBase[side] ??= this.margin[side]);
      let over = null;   // px the labels reach past the drawing (negative: room left)
      for (const g of [].concat(groups)) {
        g?.selectAll?.('text').each(function () {
          if (this.getAttribute('visibility') === 'hidden' || this.getAttribute('display') === 'none') return;
          const r = this.getBoundingClientRect();
          if (!(r.width > 0)) return;
          const o = side === 'right' ? r.right - box.right : box.left - r.left;
          over = over == null ? o : Math.max(over, o);
        });
      }
      if (over == null) continue;
      const now = this.margin[side];
      // grow by the overrun and 2 px; shrink back towards the class's width
      // when the labels got narrower; leave a gutter that fits alone
      const target = over > 0 || now > base ? Math.max(base, Math.ceil(now + over + 2)) : now;
      if (target !== now) { this.margin[side] = target; changed = true; }
    }
    if (!changed) return false;
    // a left gutter moves the plot
    this.g?.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    this._fittingGutters = true;
    try { this.render(); } finally { this._fittingGutters = false; }
    return true;
  }

  // ── Dimensions ────────────────────────────────────────────────────────────

  get width() {
    // When legend is in a right-side column, subtract its width from the total
    const legendW = this._legendAsideEl ? this._legendAsideEl.offsetWidth : 0;
    const cs  = window.getComputedStyle(this.container);
    const padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return Math.max(0, this.container.clientWidth - padH - this.margin.left - this.margin.right - legendW);
  }

  // RC-066 (maintainer, 2026-11-17/18): the range buttons go under the
  // subtitle, as on a card of 460 px or less, when beside them the title is
  // cut ('SIT…' at 600–800 px on TimeSeries, 600–900 on the big flow) or the
  // subtitle, squeezed into what the buttons leave, runs past two lines (six
  // at 700 px, three at 1000). Measured once per card width, texts and font
  // state — the height a render reads follows from it.
  _fitHeader() {
    const h = this._headerEl, title = this._titleEl, sub = this._subtitleEl, row = this._rangeRowEl;
    if (!h || !row || !(title || sub) || !h.isConnected) return;
    const key = [this.container.clientWidth, title?.textContent, sub?.textContent, row.textContent,
      document.fonts?.status ?? ''].join('|');
    if (key === this._headerFitKey) return;
    this._headerFitKey = key;
    const STACKED = 'rc-chart-header--stacked';
    h.classList.remove(STACKED);
    if (title && title.scrollWidth > title.clientWidth + 1) { h.classList.add(STACKED); return; }
    if (!sub) return;
    const line = parseFloat(getComputedStyle(sub).lineHeight) || 16;
    if (Math.round(sub.offsetHeight / line) > 2) h.classList.add(STACKED);
  }

  get height() {
    this._fitHeader();
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

  // The deprecated alias viewSteps was removed in 0.9.8_7 (RC-059; the
  // maintainer's decision of 2026-10-26): only timeframes builds the buttons.
  _getTimeframeOptions() {
    const stepsOpt = this.options.timeframes ?? [];
    const steps = stepsOpt === true ? defaultTimeframes : stepsOpt;

    // The custom range is "Custom" unless the page labels it (RC-003).
    return (Array.isArray(steps) ? steps : [])
      .map(step => {
        if (!isCustomStep(step)) return typeof step === 'string' ? { key: step, label: step } : step;
        return typeof step === 'string' ? { key: step, label: CUSTOM_LABEL } : { ...step, label: step.label ?? CUSTOM_LABEL };
      })
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

  // The zone this chart reads, cuts and names its dates in: its timeZone
  // option (T-10) — a time series' rows and a relation chart's ties alike
  // (RC-006), with their timeframe steps and navigator strip.
  _zone() {
    return this._timeZone;
  }

  // How a view bound (setView, defaultView, a timeframe range) is read, in
  // the chart's zone. Time series take Dates, date strings and epoch ms;
  // relation charts read bounds like their ties' start / end: a number below
  // 10000 is a year, 'YYYY' and 'YYYY-MM' are periods, and an upper bound
  // runs to the period's end.
  _parseViewBound(v, isEnd = false) {
    if (!this._isLinkTimeChart()) return parseDate(v, this._zone());
    const t = parseTime(v, { end: isEnd, timeZone: this._zone() });
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
  // brush drag renders many times over the same ties (K-16). Both in the
  // chart's zone, which is fixed at construction.
  _linkTime() {
    const links = this._timeLinks();
    if (!links) return null;
    if (this._linkTimeCache?.links !== links) {
      this._linkTimeCache = { links, extent: linkTimeExtent(links, this._zone()), series: undefined };
    }
    return this._linkTimeCache;
  }

  // The extent of the data itself: [first, last]. A class with dated rows
  // overrides it; a relation chart's is its ties' start / end. The full
  // extent the view works in is _getDataExtent's (the timeframe anchor).
  _dataExtent() {
    return this._linkTime()?.extent ?? null;
  }

  // The strip's series over the full extent — up to the anchor when that is
  // past the ties (RC-001), so a tie with no end runs on to it. Worked out
  // again only when the extent moves: a new data set or a new "now".
  _getNavigatorData() {
    const t = this._linkTime();
    if (!t) return null;
    const full = this._getDataExtent();
    const key = full ? `${+full[0]}:${+full[1]}` : '';
    if (t.series === undefined || t.seriesKey !== key) {
      t.series = activeLinkSeries(t.links, full, this._zone());
      t.seriesKey = key;
    }
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
    // The strip reads and ticks its dates in the chart's zone, whatever the
    // navigator object says: it shows the chart's own rows.
    return { ...base, ...user, margin: { ...base.margin, ...(user.margin ?? {}) }, timeZone: this._zone() };
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
      return this._timeframeExtent(this._findTimeframe(this.options.defaultTimeframe), fullExtent);
    }

    return null;
  }

  // The window of a timeframe step over `fullExtent`: its bounds read as
  // view bounds, its calendar steps cut in the chart's zone (T-10) and
  // counted back from the anchor (RC-001), a week from weekStart. The
  // custom range is the days last applied (RC-003), none before.
  _timeframeExtent(step, fullExtent) {
    if (isCustomStep(step)) step = this._customRange ? { range: this._customRange } : null;
    return resolveTimeframeExtent(step, fullExtent, (v, isEnd) => this._parseViewBound(v, isEnd), this._zone(),
      { anchor: this._anchorInstant(), weekStart: this._weekStart() });
  }

  // ── The timeframe anchor (RC-001) ────────────────────────────────────────
  // timeframeAnchor — the end every timeframe counts back from:
  //   'dataEnd' (default)  the data's last date: the rule before RC-001
  //   'now'                the moment read at the last data or selection
  //                        change (_readAnchor)
  //   a date               a fixed "as of" instant, read as a view bound is
  //                        (a relation chart's 1950 is the end of 1950)
  // With 'now' or a date the full extent runs to the anchor when that is past
  // the data — ALL, the zoom and the navigator reach it — and the windows
  // still start no earlier than the data (resolveTimeframeExtent).
  // weekStart — the first day of a week, for WTD (and a TimeSeries' week
  // buckets): Monday by default, 'sunday' or 0 (any day name, 0–6).

  // The anchor's instant, or null under 'dataEnd' (the windows end at the
  // full extent's end). A value that is none of these warns once and counts
  // as 'dataEnd'.
  _anchorInstant() {
    const v = this.options.timeframeAnchor;
    const word = this._anchorWord();
    if (v == null || word === 'dataend') return null;
    if (word === 'now') return this._now ?? (this._now = new Date());
    const at = this._parseViewBound(v, true);
    if (at) return at;
    this._warnOnce('timeframeAnchor', `timeframeAnchor "${v}" is not 'dataEnd', 'now' or a date — the timeframes count back from the data's end`);
    return null;
  }

  // The anchor's keyword in lower case ('dataend', 'now'), or null for a
  // value that is not a string.
  _anchorWord() {
    const v = this.options.timeframeAnchor;
    return typeof v === 'string' ? v.trim().toLowerCase() : null;
  }

  // "Now" is read once per data or selection change — setData, appendPoint,
  // setTimeframe and so a button click — and every render in between (a
  // resize, the fonts settling, a brush frame) reuses it: the buttons light
  // by exact comparison of windows, which a clock read at every render would
  // break. `at` puts back an earlier reading (setTimeframe on a step that
  // does not resolve). Under any other anchor there is nothing to read.
  _readAnchor(at = new Date()) {
    if (this._anchorWord() === 'now') this._now = at;
  }

  // The first day of a week, 0 Sunday … 6 Saturday; Monday unless weekStart
  // names another. A value that names no day warns once.
  _weekStart() {
    const v = this.options.weekStart;
    const day = weekdayOf(v);
    if (day != null) return day;
    if (v != null) this._warnOnce('weekStart', `weekStart "${v}" is not a day name or 0–6 — weeks start on Monday`);
    return 1;
  }

  // The full extent: the data's own (_dataExtent), run on to the anchor when
  // that is past the data's end.
  _getDataExtent() {
    const data = this._dataExtent();
    if (!data) return null;
    const at = this._anchorInstant();
    return at && +at > +data[1] ? [data[0], new Date(+at)] : data;
  }

  // A console warning, once per chart and key.
  _warnOnce(key, text) {
    this._warned ??= new Set();
    if (this._warned.has(key)) return;
    this._warned.add(key);
    console.warn(`RareCharts.${this._chartName()}: ${text}`);
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

  // After setData: "now" is read anew (timeframeAnchor: 'now'), a chosen
  // timeframe re-applies to the new data (the last 3M of the new range, not
  // the old dates; the custom range its own days); any other view that no
  // longer meets the data falls back to the full extent (_resolveViewExtent).
  _refreshViewForData() {
    this._readAnchor();
    const full = this._getDataExtent();
    if (full && this._selectedTimeframe) {
      const step = this._findTimeframe(this._selectedTimeframe);
      // keep the current window if the step cannot be resolved any more
      this._viewExtent = this._timeframeExtent(step, full) ?? this._viewExtent;
    }
    if (full && this._viewExtent && !clampDateExtent(this._viewExtent, full)) this._viewExtent = null;
    this._syncTimeframeButtons(full);
  }

  _syncTimeframeButtons(fullExtent, viewExtent = null) {
    if (!this._timeframeButtons.length) return;

    const resolvedView = viewExtent ?? this._resolveViewExtent(fullExtent);
    const matchingSteps = this._getTimeframeOptions().filter(step =>
      extentEquals(this._timeframeExtent(step, fullExtent), resolvedView)
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

    // The state is aria-pressed (K-06); `.active` is kept beside it as an
    // alias for pages and tests that select it, until 0.9.9. The Log
    // toggle is not among these: it keeps its own aria-pressed (RC-083).
    this._timeframeButtons.forEach(btn => {
      const on = btn.dataset.timeframe === activeKey;
      btn.classList.toggle('active', on);
      if (btn.getAttribute('aria-pressed') !== String(on)) btn.setAttribute('aria-pressed', String(on));
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
    if (!silent && resolved) this._emit(this._onViewChangeCb, resolved, this._viewInfo());
    return this;
  }

  // onViewChange's second argument (§2.3 of the analytics spec), { key,
  // level }: `key` the timeframe key when a button or setTimeframe set the
  // view, null when the brush, the wheel or setView did; `level` the level
  // drawn for the view (TimeSeries levels, RC-002), null for plain data.
  _viewInfo() {
    return { key: this._selectedTimeframe ?? null, level: this._viewLevel() };
  }

  // The level drawn for the current view: none by default.
  _viewLevel() {
    return null;
  }

  getView() {
    return this._resolveViewExtent(this._getDataExtent());
  }

  // `range` (the custom range, RC-003): [from, to], read as view bounds; the
  // view becomes those whole days in the chart's zone, and the chart keeps
  // them. setTimeframe('CUSTOM') without one applies the days kept.
  setTimeframe(key, { silent = false, range = null } = {}) {
    // A selection change reads "now" anew (timeframeAnchor: 'now'); a step
    // that does not resolve changes nothing, the reading included.
    const kept = this._now;
    this._readAnchor();
    const fullExtent = this._getDataExtent();
    const step = this._findTimeframe(key);
    const newDays = isCustomStep(step) && Array.isArray(range);
    const days = newDays ? this._customDays(range) : null;
    const extent = newDays
      ? days && this._timeframeExtent({ range: days }, fullExtent)
      : this._timeframeExtent(step, fullExtent);
    if (!extent) { this._readAnchor(kept); return this; }
    if (days) {
      this._customRange = days;
      this._syncCustomTitle();
    }
    this._selectedTimeframe = typeof key === 'string' ? key : (step.key ?? step.label ?? null);
    return this.setView(extent, { silent, preserveSelectedTimeframe: true });
  }

  // ── The custom range (RC-003) ────────────────────────────────────────────
  // core/customRange.js holds the rule and the panel. The chart keeps the
  // days applied (_customRange), and every path that resolves a timeframe
  // reads them (_timeframeExtent): setData re-applies the same dates, and
  // the button lights while the view is theirs.

  // The whole days of a range given as view bounds, in the chart's zone
  // (a relation chart reads 1950 as that year, to its end); null when a
  // bound does not read.
  _customDays(range) {
    return dayRange(this._parseViewBound(range[0], false), this._parseViewBound(range[1], true), this._zone());
  }

  // The Custom button's title names the days applied.
  _syncCustomTitle() {
    if (!this._customRange) return;
    const title = rangeTitle(this._customRange, this._zone());
    this._timeframeButtons.forEach(btn => {
      if (btn.classList.contains('rc-range-custom')) btn.title = title;
    });
  }

  // A click on a Custom button: its panel opens at the view's days, or
  // closes. Apply goes through setTimeframe, under the button's own key.
  _toggleRangePanel(btn, key) {
    if (this._destroyed) return;
    if (this._rangePanel?.isOpen) { this._rangePanel.close(); return; }
    if (this._rangePanel?.button !== btn) {
      this._rangePanel?.destroy();
      this._rangePanel = new RangePanel(btn, {
        container: this.container,
        theme: this.theme,
        zone: this._zone(),
        onApply: (from, to) => this.setTimeframe(key, { range: [from, to] }),
      });
    }
    this._rangePanel.open(this.getView(), this._getDataExtent());
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

  // fn(extent, { key, level }) after every view change the page did not ask
  // to be silent: once per button click, per brush drag (at its release),
  // per wheel or pinch step, per setView and setTimeframe — never for
  // setData. A callback that reads only the extent works as before.
  onViewChange(fn) {
    this._onViewChangeCb = fn;
    return this;
  }

  // ── Loading (RC-002) ─────────────────────────────────────────────────────
  // setLoading(true) while the page fetches rows — a finer level for the
  // window onViewChange reported: a slim "Loading…" bar across the top of the
  // plot and aria-busy on the card; the drawing stays as it is until the
  // data comes. setLoading(false) takes both away. The bar wears the
  // tooltip's colours (--rc-tooltip-*, from the theme: dark with darkTheme);
  // rare-charts.css lays it out and hides it in print. It is made on first
  // need and removed again, so a chart that never loads keeps its DOM.
  setLoading(on = true) {
    if (this._destroyed) return this;
    if (on && !this._loadingEl) {
      const el = document.createElement('div');
      el.className = 'rc-chart-loading';
      el.textContent = 'Loading…';
      setTooltipTokens(el, this.theme);
      this.container.appendChild(el);
      this._loadingEl = el;
      // a page's own aria-busy comes back afterwards
      this._hostBusy = this.container.getAttribute('aria-busy');
      this.container.setAttribute('aria-busy', 'true');
      this._placeLoading();
    } else if (!on && this._loadingEl) {
      this._loadingEl.remove();
      this._loadingEl = null;
      this._restoreBusy();
    }
    return this;
  }

  // The bar across the top of the plot, as wide as the plot.
  _placeLoading() {
    const b = this._plotBox();
    const style = this._loadingEl.style;
    style.left = `${b.x}px`;
    style.top = `${b.y}px`;
    style.width = `${b.width}px`;
  }

  _restoreBusy() {
    if (this._hostBusy != null) this.container.setAttribute('aria-busy', this._hostBusy);
    else this.container.removeAttribute('aria-busy');
    this._hostBusy = null;
  }

  render() {
    throw new Error('render() must be implemented');
  }

  // Tear down: stop observers and late renders (fonts, fetches, queued
  // tasks check _destroyed), take the tooltip down, hand the page's own
  // controls element back to where it was, empty the container and restore
  // its class and style.
  destroy() {
    this._destroyed = true;
    // destroy, not hide: a pinned tooltip ignores hide() and keeps its
    // document listeners
    this._tooltip?.destroy();
    this._tooltip = null;
    // the loading bar goes with the card's content; aria-busy is put back
    if (this._loadingEl) this._restoreBusy();
    this._loadingEl = null;
    // the zoom hint's fade timer (core/zoomGesture.js; the zooming classes)
    this._zoomHint?.destroy();
    this._zoomHint = null;
    // the custom range panel's document listener
    this._rangePanel?.destroy();
    this._rangePanel = null;
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
    restoreStyle(this.container, this._hostStyle);
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
