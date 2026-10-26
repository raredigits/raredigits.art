// RareCharts — graph/chrome.js
// Graph's card chrome around the drawing, shared by every view: the
// breadcrumbs, the "+N more" list, the details panel (placement and
// refresh; its default HTML is graph/tooltips.js), the footer tools (zoom
// buttons, full screen) and the relation-type legend.
//
// Methods of Graph (charts/Graph.js mixes them into its prototype; split
// out of Graph.js in 0.9.8_6, D-11, code unchanged): `this` is the chart.

import * as d3 from 'd3';
import { legendFocus } from './legendFocus.js';

export const graphChrome = {
  _initGraphChrome() {
    // The hidden-nodes list is positioned against the chart card.
    this.container.style.position = 'relative';
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
    if (this._legendEl) this._legendEl.style.marginRight = clear;
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
    const t = this.theme;
    const tools = document.createElement('div');
    tools.className = 'rc-graph-tools';
    this._toolsEl = tools;

    const mkButton = (label, title, fn, cls = '') => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      if (cls) b.className = cls;
      b.style.cssText =
        `height:26px;min-width:26px;padding:0 6px;border:1px solid ${t.border ?? t.muted};` +
        `border-radius:4px;background:${t.bg ?? '#fff'};color:${t.text};` +
        'font-size:14px;line-height:1;cursor:pointer;';
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
      this._zoomControlsEl = zoom;
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

  _renderLegend(typesInUse, t) {
    if (!this._legendEl) return;
    typesInUse.forEach(type => this._knownTypes.add(String(type)));
    // The filter only drives the ego traversal. In the path view the legend
    // is a static caption of the types on screen — clickable items that do
    // nothing would read as broken, and the accumulated catalogue would list
    // types the canvas doesn't show.
    const filterable = this._view === 'ego';
    const available = filterable && this._knownTypes.size
      ? [...this._knownTypes] : typesInUse.map(String);
    const items = available
      .map(type => ({ ...this._typeInfo(type), type }));
    const active = filterable ? this._relationTypes : null;
    const refocus = legendFocus(this._legendEl);
    this._legendEl.replaceChildren();
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rc-legend-item rc-graph-legend-item';
      button.dataset.type = item.type;
      const selected = !active || active.has(item.type);
      if (filterable) button.setAttribute('aria-pressed', String(selected));
      button.style.opacity = selected ? '1' : '0.35';
      button.disabled = !filterable || this.options.interactiveLegend === false;
      button.innerHTML = `<svg width="22" height="12" aria-hidden="true">
        <line x1="1" y1="6" x2="21" y2="6" stroke="${item.color}"
          stroke-width="2" ${item.dash ? `stroke-dasharray="${item.dash}"` : ''}/>
      </svg><span></span>`;
      button.querySelector('span').textContent = item.label ?? item.type;
      button.addEventListener('click', event => this._toggleRelationType(item.type, event));
      this._legendEl.appendChild(button);
    });

    if (active) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'rc-graph-legend-reset';
      reset.textContent = 'Show all';
      reset.addEventListener('click', () => this.clearRelationTypes());
      this._legendEl.appendChild(reset);
    }
    refocus();
  },

  _toggleRelationType(type, event) {
    if (this.options.interactiveLegend === false) return;
    const multi = event.shiftKey || event.ctrlKey || event.metaKey;
    if (!multi) {
      const onlyThis = this._relationTypes?.size === 1 && this._relationTypes.has(type);
      this.setRelationTypes(onlyThis ? null : [type]);
      return;
    }
    const next = new Set(this._relationTypes ?? this._knownTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    this.setRelationTypes(next.size === this._knownTypes.size || next.size === 0 ? null : [...next]);
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
