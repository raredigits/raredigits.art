// RareCharts — graph/chrome.js
// Graph's card chrome around the drawing, shared by every view: the
// breadcrumbs, the "+N more" list, the details panel (placement and
// refresh; its default HTML is graph/tooltips.js), the footer tools (zoom
// buttons, full screen) and the relation-type legend.
//
// Methods of Graph (charts/Graph.js mixes them into its prototype; split
// out of Graph.js in 0.9.8_6, D-11, code unchanged): `this` is the chart.

import * as d3 from 'd3';
import { renderLegendItems } from '../core/legend.js';

// The K-06 aliases the Graph and flow legends keep until 0.9.9: the old item
// and Show all classes, and data-type beside data-key. Page scripts and
// tests select them.
export const GRAPH_LEGEND_ALIAS = Object.freeze({
  item: 'rc-graph-legend-item', reset: 'rc-graph-legend-reset', dataType: true,
});

// The ego legend's "nothing shown": an empty traversal filter, which only
// the legend makes — setRelationTypes([]) still means every type.
export const NO_RELATION_TYPES = Symbol('no relation types');

// The dash a tie category's legend swatch shows: the type's own `dash` when
// the drawing draws one, else null. The drawing writes `dash` to
// stroke-dasharray as given, which is solid for anything but a list of
// lengths with some length in it ('solid', a word, '0').
export function drawnDash(dash) {
  const list = Array.isArray(dash) ? dash.map(String)
    : typeof dash === 'string' || typeof dash === 'number' ? String(dash).trim().split(/[\s,]+/) : [];
  const lengths = list.map(v => (/^(\d+\.?\d*|\.\d+)(px)?$/i.test(v.trim()) ? parseFloat(v) : NaN));
  return lengths.length && lengths.every(Number.isFinite) && lengths.some(v => v > 0) ? dash : null;
}

export const graphChrome = {
  _initGraphChrome() {
    // The "+N more" list is positioned against the card, which
    // rare-charts.css makes relative (.rc-chart): no inline position (X-11).
    this._breadcrumbsEl = document.createElement('nav');
    this._breadcrumbsEl.className = 'rc-graph-breadcrumbs';
    this._breadcrumbsEl.setAttribute('aria-label', 'Graph navigation');
    this.container.appendChild(this._breadcrumbsEl);

    this._overflowEl = document.createElement('div');
    this._overflowEl.className = 'rc-graph-overflow';
    this._overflowEl.setAttribute('role', 'dialog');
    this._overflowEl.setAttribute('aria-label', 'Hidden nodes');
    this._overflowEl.hidden = true;
    this._overflowEl.addEventListener('keydown', event => {
      if (event.key === 'Escape') this._closeOverflow();
    });
    this.container.appendChild(this._overflowEl);
  },

  // ─── Details panel ────────────────────────────────────────────────────────

  _initDetails() {
    const d = this.options.details;
    if (!d) return;
    let el;
    if (d === true) {
      el = document.createElement('div');
      this._detailsOwned = true;
    } else {
      el = typeof d === 'string' ? document.querySelector(d) : d;
      if (!(el instanceof HTMLElement)) return;
      this._detailsOwned = false;
      // the page's own panel goes back where it was on destroy()
      const addedLive = !el.hasAttribute('aria-live');
      this._adoptPageElement(el, e => {
        e.classList.remove('rc-graph-details');
        if (addedLive) e.removeAttribute('aria-live');
        ['width', 'height', 'top', 'right'].forEach(p => e.style.removeProperty(p));
        if (!e.getAttribute('style')) e.removeAttribute('style');
      });
    }
    el.classList.add('rc-graph-details');
    if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    this._detailsEl = el;
    this._detailsSubject = null;
    this.container.appendChild(el);
  },

  // Side or below, by card width. Returns the width the layout must leave
  // free on the right (0 when the panel sits below).
  _layoutDetails() {
    const el = this._detailsEl;
    if (!el) return 0;
    const o = this.options;
    // Content width: the card's own padding is not drawing space.
    const cs = window.getComputedStyle(this.container);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const cw = this.container.clientWidth - padL - padR;
    this._detailsInset = padR;
    const width = o.detailsWidth ?? 300;
    // Beside the drawing only if the drawing keeps its own minimum width
    // next to the panel (the flow view's minWidth); otherwise below.
    const minDrawing = this._view === 'flow' ? (o.minWidth ?? 0) : 0;
    const side = cw >= (o.detailsBreakpoint ?? 1000) && cw >= minDrawing + width + 12;
    this.container.classList.toggle('rc-graph--details-side', side);
    this.container.classList.toggle('rc-graph--details-below', !side);
    // Below: the card grows by the panel so the drawing keeps its height.
    if (!this._expanded) {
      this._baseCardHeight ??= this.container.style.height;
      const base = parseFloat(this._baseCardHeight) || o.height || 520;
      const want = side ? `${base}px` : `${base + (o.detailsHeight ?? 200)}px`;
      if (this.container.style.height !== want) this.container.style.height = want;
    }
    el.style.width = side ? `${width}px` : '';
    el.style.height = side ? '' : `${o.detailsHeight ?? 200}px`;
    // The legend and breadcrumbs above the drawing stop where the panel
    // begins, so they never run under it.
    const clear = side ? `${width + 12}px` : '';
    if (this._typeLegendEl) this._typeLegendEl.style.marginRight = clear;
    if (this._breadcrumbsEl) this._breadcrumbsEl.style.marginRight = clear;
    // The navigator under the drawing spans the drawing, not the panel.
    if (this._navigatorEl) this._navigatorEl.style.marginRight = clear;
    return side ? width + 12 : 0;
  },

  // Side panel: aligned with the drawing's top and height. Called after the
  // drawing and its legend are done — the legend's height moves the svg.
  _placeDetails(svgEl) {
    const el = this._detailsEl;
    if (!el || !this.container.classList.contains('rc-graph--details-side')) {
      if (el) { el.style.top = ''; el.style.height = el.style.height || ''; }
      return;
    }
    // An <svg> has no offsetTop: measure against the card's padding box.
    const svgBox = svgEl.getBoundingClientRect();
    const cardBox = this.container.getBoundingClientRect();
    const top = svgBox.top - cardBox.top - this.container.clientTop + this.container.scrollTop;
    el.style.top = `${top}px`;
    el.style.right = `${this._detailsInset ?? 0}px`;
    el.style.height = `${svgBox.height}px`;
  },

  // What the panel shows: a hovered/selected node or tie, else the default
  // (the focused node in the ego view, nothing elsewhere).
  _showDetails(subject) {
    this._detailsSubject = subject;
    this._refreshDetails();
  },

  _refreshDetails() {
    const el = this._detailsEl;
    if (!el || !this._detailsOwned) return;
    let subject = this._detailsSubject;
    // a node that is no longer drawn (in the flow view: what FlowView drew,
    // fold meta-nodes included) leaves the panel to its default
    const drawn = this._view === 'flow' ? this._flowView?._lastVisible?.nodes : (this._shown ?? this._viewData)?.nodes;
    if (subject?.node && !drawn?.some(n => n.id === subject.node.id)) subject = null;
    if (!subject && this._view === 'ego' && this._root != null) {
      const root = this._model.node(this._root);
      if (root) subject = { node: root };
    }
    const fmt = this.options.detailsFormat;
    el.innerHTML = fmt
      ? fmt({ node: subject?.node ?? null, link: subject?.link ?? null, view: this._view })
      : this._defaultDetails(subject);
  },

  // ─── Footer tools and full screen ────────────────────────────────────────

  // Footer tools, right of the source line: the "+N more" and "N hidden"
  // notes, zoom buttons, full screen. Never over the canvas, where they
  // covered the bottom row. A chart without source/note gets a footer row
  // just for them.
  _initTools() {
    const tools = document.createElement('div');
    tools.className = 'rc-graph-tools';

    const mkButton = (label, title, fn, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      // the look is the stylesheet's, in the card's tokens (X-11)
      b.className = cls ? `rc-graph-tool ${cls}` : 'rc-graph-tool';
      b.addEventListener('click', fn);
      return b;
    };
    const mkNote = (cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.hidden = true;
      b.addEventListener('click', fn);
      tools.appendChild(b);
      return b;
    };

    this._overflowNoteEl = mkNote('rc-graph-note', () => this._toggleOverflow());
    this._hiddenNoteEl = mkNote('rc-graph-hidden-note', () => {
      this._hidden.clear();
      this.render();
    });

    if (this.options.zoom !== false) {
      const zoom = document.createElement('div');
      zoom.className = 'rc-graph-zoom-controls';
      zoom.setAttribute('role', 'group');
      zoom.setAttribute('aria-label', 'Zoom');
      zoom.append(
        mkButton('+', 'Zoom in',    () => this._zoomBy(1.4)),
        mkButton('−', 'Zoom out',   () => this._zoomBy(1 / 1.4)),
        mkButton('⟲', 'Reset view', () => {
          if (this._zoom) this.svg.transition().duration(200).call(this._zoom.transform, d3.zoomIdentity);
        }),
      );
      tools.appendChild(zoom);
    }

    if (this.options.fullscreen !== false) {
      this._fullscreenBtn = mkButton('⛶', 'Full screen', () => this.toggleFullscreen(), 'rc-graph-fullscreen');
      tools.appendChild(this._fullscreenBtn);
      this._onFullscreenChange = () => this._syncFullscreen(document.fullscreenElement === this.container);
      document.addEventListener('fullscreenchange', this._onFullscreenChange);
      this._onFullscreenKey = event => {
        if (event.key === 'Escape' && this._expanded && !document.fullscreenElement) this.toggleFullscreen(false);
      };
      document.addEventListener('keydown', this._onFullscreenKey);
    }

    if (!this._footerEl) {
      this._footerEl = document.createElement('div');
      this._footerEl.className = 'rc-chart-footer';
      this.container.appendChild(this._footerEl);
    }
    this._footerEl.classList.add('rc-chart-footer--tools');
    this._footerEl.insertBefore(tools, this._sourceEl ? this._sourceEl.nextSibling : this._footerEl.firstChild);
  },

  _syncFullscreen(on) {
    if (on === this._expanded) return;
    this._expanded = on;
    const el = this.container;
    if (on) {
      this._savedHeight = el.style.height;
      el.style.height = '100vh';
      el.classList.add('rc-graph--fullscreen');
    } else {
      el.style.height = this._savedHeight ?? '';
      el.classList.remove('rc-graph--fullscreen');
    }
    if (this._fullscreenBtn) {
      this._fullscreenBtn.textContent = on ? '✕' : '⛶';
      this._fullscreenBtn.title = on ? 'Exit full screen (Esc)' : 'Full screen';
      this._fullscreenBtn.setAttribute('aria-label', this._fullscreenBtn.title);
    }
    // The ResizeObserver catches the native case; the overlay needs a nudge.
    requestAnimationFrame?.(() => this.render());
  },

  _zoomBy(factor) {
    if (!this._zoom) return;
    this.svg.transition().duration(200).call(this._zoom.scaleBy, factor);
  },

  // ─── Legend ───────────────────────────────────────────────────────────────
  // The relation-type legend, drawn by the one legend builder (core/legend.js,
  // D-04) like every RareCharts legend. In the ego view each known type is a
  // toggle, and the toggles drive the traversal (K-05): a click, Enter or
  // Space turns a type off or on, a double click keeps only that type and a
  // second double click brings all back, "Show all" shows while a type is
  // off. The path view lists the types on screen as plain labels — buttons
  // that did nothing would read as broken, and the accumulated catalogue
  // would list types the canvas doesn't show. The builder updates the items
  // in place, so a focused item keeps focus through every redraw and
  // re-query (R-16).

  _renderLegend(typesInUse) {
    const el = this._typeLegendEl;
    if (!el) return;
    typesInUse.forEach(type => this._knownTypes.add(String(type)));
    const ego = this._view === 'ego';
    const interactive = ego && this.options.legendInteractive !== false;
    const keys = ego && this._knownTypes.size ? [...this._knownTypes] : typesInUse.map(String);
    const shown = ego ? this._legendShownTypes() : null;
    let items = keys.map(type => {
      const info = this._typeInfo(type);
      const dash = drawnDash(info.dash);
      return {
        key: type, label: info.label ?? type, color: info.color,
        mark: dash ? 'dashed' : 'line', dash, on: !shown || shown.has(type),
      };
    });
    // A static ego legend (legendInteractive: false) names the types the
    // view traverses, not the ones it skips.
    if (!interactive) items = items.filter(item => item.on);
    this._typeLegendKeys = interactive ? keys : [];
    renderLegendItems(el, items, {
      interactive,
      busy: !!this._legendPending,
      alias: GRAPH_LEGEND_ALIAS,
      onToggle: info => this._relationLegendGesture(info),
    });
  },

  // The types the ego legend shows on: those of a legend gesture whose
  // re-query is still pending (the builder wrote them at once, and a redraw
  // meanwhile must not flip them back), else the traversal filter. null:
  // every type.
  _legendShownTypes() {
    return this._legendPending ? this._legendPending.shown : this._relationTypes;
  },

  // A committed gesture on the ego legend (the builder's onToggle). The types
  // it leaves on become the traversal filter (K-05): all → no filter, none →
  // the legend's own "nothing shown", the root alone without a source call
  // (spec decision 26), else the list. The view re-queries around its root,
  // which is read when the query runs; aria-busy sits on the legend until
  // then, and onLegendToggle fires after it. `replaces`: the second click of
  // a double click whose first click already re-queried — its breadcrumb
  // takes over that click's instead of adding one.
  _relationLegendGesture({ kind, key, visibleKeys, replaces }) {
    if (this._destroyed) return;
    const keys = this._typeLegendKeys ?? [];
    const on = new Set(visibleKeys);
    const visible = keys.filter(k => on.has(k));
    const shown = kind === 'showAll' || visible.length === keys.length ? null : new Set(visible);
    const pending = { shown };
    const gen = this._dataGen;
    this._legendPending = pending;
    this._typeLegendEl?.setAttribute('aria-busy', 'true');
    this._enqueue(async () => {
      if (gen !== this._dataGen) return;   // new data came first: this legend is gone
      const types = shown == null ? null : shown.size ? [...shown] : NO_RELATION_TYPES;
      if (this._view === 'ego' && this._root != null) {
        await this._focusTask(this._root, { types, legend: { replaces: !!replaces } });
      } else {
        this._setRelationTypesState(types);
        this.render();
      }
    });
    this._enqueue(() => {
      if (this._legendPending === pending) {
        this._legendPending = null;
        this._typeLegendEl?.removeAttribute('aria-busy');
      }
      if (gen !== this._dataGen) return;
      this._emit(this.options.onLegendToggle, {
        name: kind === 'showAll' ? null : key,
        visible: kind === 'toggle' ? on.has(key) : true,
        visibleNames: [...this._knownTypes].filter(type => !this._relationTypes || this._relationTypes.has(type)),
      });
    });
  },

  // ─── "+N more" list ───────────────────────────────────────────────────────

  _renderOverflow() {
    if (!this._overflowEl) return;
    if (!this._overflowNodes.length || this._view !== 'ego') {
      this._overflowEl.hidden = true;
      this._overflowEl.replaceChildren();
      return;
    }
    const title = document.createElement('div');
    title.className = 'rc-graph-overflow-title';
    title.textContent = `${this._overflowNodes.length} more node${this._overflowNodes.length === 1 ? '' : 's'}`;
    const list = document.createElement('div');
    list.className = 'rc-graph-overflow-list';
    this._overflowNodes.forEach(node => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rc-graph-overflow-item';
      button.textContent = node.label ?? node.id;
      button.title = `Focus ${node.label ?? node.id}`;
      button.addEventListener('click', () => {
        this._overflowEl.hidden = true;
        this.focus(node.id);
      });
      list.appendChild(button);
    });
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'rc-graph-overflow-close';
    close.setAttribute('aria-label', 'Close hidden nodes list');
    close.textContent = '×';
    close.addEventListener('click', () => this._closeOverflow());
    this._overflowEl.replaceChildren(title, close, list);
  },

  // Escape or ×: the list closes and keyboard focus goes back to the
  // "+N more" button that opened it, not to the page's <body> (D7).
  _closeOverflow() {
    this._overflowEl.hidden = true;
    if (this._overflowNoteEl && !this._overflowNoteEl.hidden) this._overflowNoteEl.focus();
  },

  _toggleOverflow() {
    if (!this._overflowEl || !this._overflowNodes.length) return;
    this._overflowEl.hidden = !this._overflowEl.hidden;
    if (!this._overflowEl.hidden) {
      this._overflowEl.querySelector('.rc-graph-overflow-close')?.focus();
    }
  },

  // ─── Breadcrumbs ──────────────────────────────────────────────────────────

  _renderBreadcrumbs() {
    if (!this._breadcrumbsEl) return;
    if (this.options.breadcrumbs === false || this._history.length < 2) {
      this._breadcrumbsEl.hidden = true;
      this._breadcrumbsEl.replaceChildren();
      this._refitIfResized();
      return;
    }
    this._breadcrumbsEl.hidden = false;
    this._breadcrumbsEl.replaceChildren();
    this._history.forEach((state, index) => {
      if (index) this._breadcrumbsEl.append(' / ');
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = index === this._history.length - 1;
      button.textContent = this._historyLabel(state);
      button.addEventListener('click', () => {
        const target = this._history[index];
        this._history = this._history.slice(0, index + 1);
        this._skipHistoryOnce = true;
        this._restoreState(target);
        this._renderBreadcrumbs();
      });
      this._breadcrumbsEl.appendChild(button);
    });
    this._refitIfResized();
  },

  _historyLabel(state) {
    if (state.view === 'cluster') return 'Overview';
    if (state.view === 'path') {
      const a = this._model.node(state.a)?.label ?? state.a;
      const b = this._model.node(state.b)?.label ?? state.b;
      return state.a === state.b ? String(a) : `${a} ↔ ${b}`;
    }
    return this._model.node(state.root)?.label ?? state.root;
  },
};
