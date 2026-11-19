// RareCharts — zoom gestures (T-09)
//
// One rule for every d3.zoom in the library (TimeSeries; Map and MapFlow with
// zoom: true; Graph), so a chart in the middle of a page never takes the
// page's scroll:
//
//   the wheel        zooms only with Ctrl or ⌘ (metaKey). A trackpad pinch
//                    arrives as a wheel with ctrlKey, so it still zooms. The
//                    filter refuses a plain wheel, d3 then leaves the event
//                    alone (no preventDefault) and the page scrolls.
//   touch            one finger scrolls the page; two fingers pan and pinch.
//   anything else    d3's own default filter: no secondary button, no Ctrl
//                    with the mouse (macOS sends Ctrl+click as a right click).
//
// A plain wheel or a one-finger drag over the plot shows a hint saying how:
// "Hold Ctrl to zoom" ("Hold ⌘ to zoom" on Apple platforms), "Use two fingers
// to move". It is made on first need, so a chart at rest keeps its DOM.
//
// Why touch works this way (d3-zoom 3, src/zoom.js; checked in Chrome with
// touch emulation, test/browser/charts-zoom-gesture.test.js):
//   - touchstarted runs the filter first. Refused (one finger), no gesture
//     starts, and touchmoved returns before its preventDefault because
//     this.__zooming is unset: the browser pans the page as over any element.
//   - A second finger sends a touchstart whose event.touches holds both. The
//     filter passes; d3 takes both touches (it loops over event.touches, not
//     changedTouches) and its touchmoved prevents the default from then on,
//     so the page neither scrolls nor zooms while two fingers move the chart.
//   - Once the page scrolls, the browser sends touchmove with cancelable:
//     false ("scrolling is in progress and cannot be interrupted"). A finger
//     added then would move the chart and the page at once, so the page keeps
//     a sequence it owns: the filter refuses its touchstarts until every
//     finger is up.
//   - touch-action: pan-x pan-y on the zoom target, set where d3 binds touch
//     (beside its own -webkit-tap-highlight-color). One finger still pans the
//     page, or a scrolling parent (the sideways wrapper of Graph's flow view),
//     but the browser's own pinch-zoom and double-tap zoom never start on the
//     plot. Touch events reach the script whatever touch-action says; it only
//     limits what the browser does by itself.
//   - Taps keep working: d3 never sees a one-finger touch, so the browser's
//     click follows the tap (a Graph node, a Map region), and the TimeSeries
//     crosshair follows the mousemove the browser sends before that click.
// The navigator's brush is an svg of its own (charts/Overview.js) and keeps
// its one-finger drag.

import { setTooltipTokens } from './Tooltip.js';

// The hint fades this long after the last wheel step or touch move.
export const ZOOM_HINT_MS = 1200;

// A finger that moves less than this is a tap, not a drag (d3-zoom's
// tapDistance, client px).
const TAP_DISTANCE = 10;

// Zoom targets whose current touch sequence the page owns (it began to
// scroll); the filter refuses their touchstarts until every finger is up.
const pageTouches = new WeakSet();

// d3-zoom's default filter: no secondary button; Ctrl only on the wheel.
const d3Filter = event => (!event.ctrlKey || event.type === 'wheel') && !event.button;

// The zoom filter (d3: filter.call(target, event, datum)).
export function zoomFilter(event) {
  if (event.type === 'wheel') return !!(event.ctrlKey || event.metaKey);
  if (event.type === 'touchstart') {
    return (event.touches?.length ?? 0) >= 2 && !pageTouches.has(this) && d3Filter(event);
  }
  return d3Filter(event);
}

// Apple platforms name the modifier ⌘. userAgentData is Chromium's ('macOS');
// elsewhere navigator.platform ('MacIntel', 'iPhone', 'iPad'). An empty
// userAgentData.platform falls back too.
export function isApplePlatform(nav = globalThis.navigator) {
  const platform = nav?.userAgentData?.platform || nav?.platform || '';
  return /mac|iphone|ipad|ipod|ios/i.test(platform);
}

// The hint's words: 'wheel' or 'touch'. Fixed English, as "Show all" is.
export function zoomHintText(kind, nav) {
  if (kind === 'touch') return 'Use two fingers to move';
  return `Hold ${isApplePlatform(nav) ? '⌘' : 'Ctrl'} to zoom`;
}

// `el`'s box in the card's frame (the one position: absolute places in), cut
// to the card: a drawing wider than the card (Graph flow's sideways scroll)
// centres the hint on the part that shows.
export function boxInCard(el, container) {
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const left = Math.max(r.left, c.left), right = Math.min(r.right, c.right);
  const top = Math.max(r.top, c.top), bottom = Math.min(r.bottom, c.bottom);
  const ox = c.left + container.clientLeft - container.scrollLeft;
  const oy = c.top + container.clientTop - container.scrollTop;
  return { x: left - ox, y: top - oy, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

// The hint: a small plate centred on the plot (rare-charts.css,
// .rc-zoom-hint), in the tooltip's tokens. `box()` gives the plot in the
// card's frame. Made by the first show(); shown again, it stays and its fade
// starts over.
export class ZoomHint {
  constructor(container, theme, box) {
    this._container = container;
    this._theme = theme;
    this._box = box;
    this._timer = null;
    this.el = null;
  }

  show(kind) {
    if (!this.el) this.el = this._create();
    const text = zoomHintText(kind);
    if (this.el.textContent !== text) this.el.textContent = text;
    if (!this.el.classList.contains('is-visible')) {
      const b = this._box();
      this.el.style.left = `${b.x + b.width / 2}px`;
      this.el.style.top = `${b.y + b.height / 2}px`;
      this.el.classList.add('is-visible');
    }
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), ZOOM_HINT_MS);
  }

  hide() {
    clearTimeout(this._timer);
    this._timer = null;
    this.el?.classList.remove('is-visible');
  }

  destroy() {
    this.hide();
    this.el?.remove();
    this.el = null;
  }

  _create() {
    const el = document.createElement('div');
    el.className = 'rc-zoom-hint';
    el.setAttribute('aria-hidden', 'true');
    setTooltipTokens(el, this._theme);
    this._container.appendChild(el);
    return el;
  }
}

// One wheel step's zoom, as d3's default except for Ctrl. d3 speeds up a
// Ctrl wheel tenfold because a trackpad pinch arrives that way, in small
// steps; a mouse wheel turned with Ctrl held then zoomed 4× a notch while
// ⌘ + wheel zoomed 1.15× (maintainer, 2026-11-18: "the wheel behaves
// strangely"). A pinch's steps are small (a few px); a mouse notch is tens
// of px or more, or counted in lines or pages: those keep the plain rate.
export function zoomWheelDelta(event) {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  const pinch = event.ctrlKey && event.deltaMode === 0 && Math.abs(event.deltaY) < 50;
  return -event.deltaY * unit * (pinch ? 10 : 1);
}

// Apply `zoom` to `selection` under the rule above, in place of
// selection.call(zoom): the filter, touch-action where d3 binds touch, and
// the hint's listeners. `box` gives the plot in the card's frame (default:
// the zoom target's own box). Returns the hint; Chart.destroy() takes it down.
//
// The hint's listeners come after d3's on the same element. d3 stops the
// events of a gesture it takes (stopImmediatePropagation), so they only see
// what d3 left to the page: a plain wheel, a one-finger touch.
export function bindZoom(selection, zoom, { container, theme, box = null }) {
  zoom.filter(zoomFilter).wheelDelta(zoomWheelDelta);
  selection.call(zoom);

  const node = selection.node();
  const hint = new ZoomHint(container, theme, box ?? (() => boxInCard(node, container)));
  // a pan or zoom started (by any means): the hint has done its job
  zoom.on('start.rc-hint', () => hint.hide());

  selection.on('wheel.rc-hint', event => {
    if (!event.ctrlKey && !event.metaKey) hint.show('wheel');
  }, { passive: true });

  if (!zoom.touchable().call(node)) return hint;

  let start = null;   // where the one finger went down, client px
  selection
    .style('touch-action', 'pan-x pan-y')
    .on('touchstart.rc-hint', event => {
      const t = event.touches;
      start = t.length === 1 ? [t[0].clientX, t[0].clientY] : null;
    }, { passive: true })
    .on('touchmove.rc-hint', event => {
      const t = event.touches;
      if (t.length !== 1 || !start || event.defaultPrevented) return;
      if (!event.cancelable) pageTouches.add(node);
      if (Math.hypot(t[0].clientX - start[0], t[0].clientY - start[1]) > TAP_DISTANCE) hint.show('touch');
    }, { passive: true })
    .on('touchend.rc-hint touchcancel.rc-hint', event => {
      if (event.touches.length) return;
      start = null;
      pageTouches.delete(node);
    }, { passive: true });
  return hint;
}
