// RareCharts — Tooltip
// Shared tooltip used by all chart types.
// Colors come from theme.tooltip — nothing is hardcoded.
//
// Two modes. show()/hide() is the hover tooltip every chart uses: it follows
// the pointer and takes no pointer events. pin() is opt-in (relation charts
// pin a link's tooltip on click): the tooltip stays put, accepts pointer
// events so links inside it work, and closes on a click elsewhere or Escape.
// While pinned, hover show()/hide() calls are ignored.

export class Tooltip {
  constructor(container, theme) {
    this._container = container;
    this.theme = theme;
    this._pinned = false;
    this._onClose = null;

    const tt = theme.tooltip ?? {};

    this.el = document.createElement('div');
    this.el.className = 'rc-tooltip';

    Object.assign(this.el.style, {
      fontFamily: theme.numericFont ?? theme.font,
      fontSize:   '13px',
      color:      tt.text  ?? theme.text,
      background: tt.bg    ?? '#fff',
      border:     `1px solid ${tt.border ?? theme.border}`,
      boxShadow:  tt.shadow ?? 'none',
    });

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

    // Clamp to container bounds — don't let the tooltip bleed outside
    const maxX = this._container.clientWidth  - this.el.offsetWidth  - 12;
    const maxY = this._container.clientHeight - this.el.offsetHeight - 8;

    this.el.style.left = `${Math.min(x + 12, maxX)}px`;
    this.el.style.top  = `${Math.min(Math.max(y - 20, 8), maxY)}px`;
  }
}
