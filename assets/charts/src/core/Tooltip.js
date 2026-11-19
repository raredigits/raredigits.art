// RareCharts — Tooltip
// Shared tooltip used by all chart types. A chart has one, made by the base
// Chart's `tooltip` getter and taken down by Chart.destroy().
// Colours come from the card: rare-charts.css declares --rc-tooltip-* on
// .rc-chart (the page's --chart-tooltip-* first, then the light defaults) and
// the chart publishes its theme's own values there (core/paint.js); the
// element inherits them. Size, weight and spacing are rare-charts.css
// (.rc-tooltip and its row classes, which the default HTML builds with
// core/html.js).
//
// Two modes. show()/hide() is the hover tooltip every chart uses: it follows
// the pointer and takes no pointer events. pin() is opt-in (relation charts
// pin a link's tooltip on click): the tooltip stays put, accepts pointer
// events so links inside it work, and closes on a click elsewhere or Escape.
// While pinned, hover show()/hide() calls are ignored.

// Custom properties, not inline styles, so a page rule that outranks
// .rc-tooltip (.rc-chart .rc-tooltip) restyles it (B-03, C-23). null takes
// the chart token (text, muted, bg, border; shadow: none); an empty value
// leaves the property unset and the CSS fallback applies.
const setToken = (el, name, v) => { if (v != null && v !== '') el.style.setProperty(name, String(v)); };

// The tooltip's font and colours as --rc-tooltip-* on `el`, for the boxes
// that wear the tooltip's look without being one: the zoom hint
// (core/zoomGesture.js), the custom range panel and the loading bar.
export function setTooltipTokens(el, theme) {
  const tt = theme.tooltip ?? {};
  setToken(el, '--rc-tooltip-font',   theme.font);
  setToken(el, '--rc-tooltip-font-numeric', theme.numericFont);
  setToken(el, '--rc-tooltip-text',   tt.text   ?? theme.text);
  setToken(el, '--rc-tooltip-muted',  tt.muted  ?? theme.muted);
  setToken(el, '--rc-tooltip-bg',     tt.bg     ?? theme.bg);
  setToken(el, '--rc-tooltip-border', tt.border ?? theme.border);
  setToken(el, '--rc-tooltip-shadow', tt.shadow ?? 'none');
}

export class Tooltip {
  constructor(container, theme) {
    this._container = container;
    this.theme = theme;
    this._pinned = false;
    this._onClose = null;

    const header = theme.tooltip?.header ?? {};

    this.el = document.createElement('div');
    this.el.className = 'rc-tooltip';
    // the colours, header ones included, are the card's (core/paint.js)
    if (header.bg != null && header.bg !== '') this.el.classList.add('rc-tooltip--header-band');

    container.appendChild(this.el);

    this._onDocPointer = event => {
      if (this._pinned && !this.el.contains(event.target)) this.unpin();
    };
    this._onDocKey = event => {
      if (this._pinned && event.key === 'Escape') this.unpin();
    };
  }

  get isPinned() { return this._pinned; }

  show(x, y, html) {
    if (this._pinned) return;
    this._place(x, y, html);
  }

  hide() {
    if (this._pinned) return;
    this.el.classList.remove('is-visible');
  }

  // Pin at (x, y). Re-pinning replaces the content in place. `onClose` runs
  // once when the pin is released (outside click, Escape, or unpin()).
  pin(x, y, html, { onClose = null } = {}) {
    const wasPinned = this._pinned;
    if (wasPinned) this._releaseCallback();
    this._pinned = true;
    this._onClose = onClose;
    this.el.classList.add('is-pinned');
    this._place(x, y, html);
    if (!wasPinned) {
      // Defer: the click that pinned must not count as the outside click.
      setTimeout(() => {
        if (!this._pinned) return;
        document.addEventListener('pointerdown', this._onDocPointer, true);
        document.addEventListener('keydown', this._onDocKey);
      }, 0);
    }
  }

  unpin() {
    if (!this._pinned) return;
    this._pinned = false;
    this.el.classList.remove('is-pinned', 'is-visible');
    document.removeEventListener('pointerdown', this._onDocPointer, true);
    document.removeEventListener('keydown', this._onDocKey);
    this._releaseCallback();
  }

  destroy() {
    this.unpin();
    this.el.remove();
  }

  _releaseCallback() {
    const cb = this._onClose;
    this._onClose = null;
    if (cb) cb();
  }

  _place(x, y, html) {
    this.el.innerHTML = html;
    this.el.classList.add('is-visible');

    // Clamp to container bounds — don't let the tooltip bleed outside.
    // 12px right of the pointer; where that runs past the card, 12px left
    // of it instead (RC-070): clamped against the right edge it slid back
    // over the point being read.
    const width = this.el.offsetWidth;
    const maxX = this._container.clientWidth  - width - 12;
    const maxY = this._container.clientHeight - this.el.offsetHeight - 8;
    const left = x + 12 <= maxX ? x + 12 : Math.max(8, x - 12 - width);

    this.el.style.left = `${left}px`;
    this.el.style.top  = `${Math.min(Math.max(y - 20, 8), maxY)}px`;
  }
}
