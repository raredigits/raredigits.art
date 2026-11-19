// RareCharts — the custom range (RC-003)
//
// 'CUSTOM' in a chart's timeframes adds a button to the range bar — "Custom"
// unless the page labels it — that opens a small panel under itself: two
// <input type="date"> fields, From and To, and Apply. Apply makes the view
// those whole days in the chart's zone, [midnight of From, the last
// millisecond of the To day], clamped to the data as any view is. The chart
// keeps the days, not a window counted back from the data's end, so setData
// re-applies the same dates; the button stays pressed while that view holds
// and its title names the days (core/Chart.js). From code:
// setTimeframe('CUSTOM', { range: [from, to] }).
//
// The panel (owner answer 5 А):
//   - role="dialog", aria-label "Custom range"; it opens with focus on From;
//   - the fields start at the view's days, their min / max are the full
//     extent's days, and Apply keeps the days inside them;
//   - To before From swaps them; an empty field disables Apply;
//   - Enter applies. Escape, or a press outside, closes it, and focus goes
//     back to the button — unless that press put it on another control.
//     Tabbing out of it closes it as well.
// It is made on open and removed on close: a chart at rest keeps its DOM.
// rare-charts.css draws it (.rc-range-panel) in the tooltip's tokens, so it
// follows the theme (dark with darkTheme), and resets its fields and its
// button at a doubled class: no host form or button rule reaches them.
// Fixed English words, as "Show all" is: "Custom", "From", "To", "Apply".

import * as d3 from 'd3';
import { bucketDateText, timeKit, uid } from './utils.js';
import { setTooltipTokens } from './Tooltip.js';
import { hexOf } from './paint.js';

export const CUSTOM_LABEL = 'Custom';

// The panel sits this far under its button, px.
const GAP = 4;

// Whether a timeframe step is the custom range: the key 'CUSTOM' (a step
// known by its label: that label) in any case, with no range of its own. A
// { key: 'CUSTOM', range } step is a fixed period like any other, as it was
// before RC-003.
export function isCustomStep(step) {
  if (step == null) return false;
  const cfg = typeof step === 'string' ? { key: step } : step;
  if (typeof cfg !== 'object' || Array.isArray(cfg.range)) return false;
  return String(cfg.key ?? cfg.label ?? '').trim().toUpperCase() === 'CUSTOM';
}

// A day as an <input type="date"> holds it: 'YYYY-MM-DD', in the zone.
export function dayValue(date, zone = 'local') {
  return timeKit(zone).format('%Y-%m-%d')(date);
}

// The whole days from `from` to `to` (Dates) in the zone: [the start of the
// first, the last millisecond of the last]. The later bound first swaps
// them. null when either is missing.
export function dayRange(from, to, zone = 'local') {
  if (!from || !to) return null;
  const day = timeKit(zone).day;
  const [lo, hi] = +from <= +to ? [from, to] : [to, from];
  return [day.floor(lo), new Date(+day.offset(day.floor(hi), 1) - 1)];
}

// The button's title for a range of days: 'Jun 1, 2024 – Jun 12, 2024'.
export function rangeTitle(range, zone = 'local') {
  return `${bucketDateText(range[0], 'day', zone)} – ${bucketDateText(range[1], 'day', zone)}`;
}

// 'dark' or 'light' for a colour, so the fields' calendar icon and the
// browser's picker match the panel; null for one that does not parse. The
// theme's colours are token chains: the panel reads them as hex first
// (core/paint.js).
function schemeOf(colour) {
  const c = colour == null ? null : d3.color(String(colour));
  return c ? (d3.hsl(c).l < 0.5 ? 'dark' : 'light') : null;
}

// The panel of one Custom button. `container` is the card; `onApply(from,
// to)` gets the two days as the fields hold them ('YYYY-MM-DD', inside the
// fields' min / max, not yet in order).
export class RangePanel {
  constructor(button, { container, theme, zone, onApply }) {
    this._button = button;
    this._container = container;
    this._theme = theme;
    this._zone = zone;
    this._onApply = onApply;
    this._destroyed = false;
    this.el = null;

    // Escape on the button too: Shift+Tab from From lands there.
    this._onButtonKey = event => {
      if (this.el && event.key === 'Escape') { event.preventDefault(); this.close(); }
    };
    button.addEventListener('keydown', this._onButtonKey);

    // A press outside the panel and its button closes it. Focus goes back to
    // the button, then the press does what it does: on another control, it
    // takes the focus; on anything else the browser drops it, and it comes
    // back to the button once the press has run.
    this._onDocPointer = event => {
      if (!this.el || this.el.contains(event.target) || button.contains(event.target)) return;
      this.close();
      setTimeout(() => {
        const at = document.activeElement;
        if (!this._destroyed && (!at || at === document.body) && button.isConnected) button.focus({ preventScroll: true });
      }, 0);
    };
  }

  get isOpen() {
    return !!this.el;
  }

  get button() {
    return this._button;
  }

  // view, full: [Date, Date] or null — the chart's view and full extent.
  open(view, full) {
    if (this.el || this._destroyed) return;
    const el = document.createElement('div');
    el.className = 'rc-range-panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Custom range');
    // a press on its padding keeps the focus in it, so Escape still closes it
    el.tabIndex = -1;
    setTooltipTokens(el, this._theme);
    if (this._theme.border) el.style.setProperty('--rc-range-border', String(this._theme.border));
    const scheme = schemeOf(hexOf(this._theme)(this._theme.tooltip?.bg ?? this._theme.bg));
    if (scheme) el.style.colorScheme = scheme;

    const id = uid('rc-range');
    const field = (name, text) => {
      const label = document.createElement('label');
      label.className = 'rc-range-label';
      label.htmlFor = `${id}-${name}`;
      label.textContent = text;
      const input = document.createElement('input');
      input.className = 'rc-range-input';
      input.type = 'date';
      input.id = `${id}-${name}`;
      el.append(label, input);
      return input;
    };
    const from = field('from', 'From');
    const to = field('to', 'To');
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'rc-range-apply';
    apply.textContent = 'Apply';
    el.appendChild(apply);

    const min = full ? dayValue(full[0], this._zone) : '';
    const max = full ? dayValue(full[1], this._zone) : '';
    [from, to].forEach(input => {
      if (min) input.min = min;
      if (max) input.max = max;
    });
    if (view) {
      from.value = dayValue(view[0], this._zone);
      to.value = dayValue(view[1], this._zone);
    }

    const sync = () => { apply.disabled = !from.value || !to.value; };
    // the days inside the fields' min / max ('YYYY-MM-DD' sorts as dates)
    const within = v => (min && v < min ? min : (max && v > max ? max : v));
    const commit = () => {
      if (apply.disabled) return;
      const [a, b] = [within(from.value), within(to.value)];
      this.close();
      this._onApply(a, b);
    };
    from.addEventListener('input', sync);
    to.addEventListener('input', sync);
    from.addEventListener('change', sync);
    to.addEventListener('change', sync);
    apply.addEventListener('click', commit);
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); this.close(); }
      // Enter applies from any part of the panel; preventDefault keeps a
      // focused Apply from clicking a second time
      else if (event.key === 'Enter') { event.preventDefault(); commit(); }
    });
    // Tabbing out of the panel closes it, focus staying where it went. A
    // move to nowhere (the window losing focus, a picker opening) does not.
    el.addEventListener('focusout', event => {
      const next = event.relatedTarget;
      if (this.el && next && !el.contains(next) && next !== this._button) this.close({ focus: false });
    });
    sync();

    this.el = el;
    this._button.after(el);
    this._button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', this._onDocPointer, true);
    this.place();
    from.focus({ preventScroll: true });
  }

  // `focus`: give the focus back to the button (Escape, Apply, a press
  // outside); false when it has gone elsewhere (Tab).
  close({ focus = true } = {}) {
    if (!this.el) return;
    const el = this.el;
    this.el = null;
    document.removeEventListener('pointerdown', this._onDocPointer, true);
    this._button.setAttribute('aria-expanded', 'false');
    // the button takes the focus before the field that holds it goes
    if (focus && this._button.isConnected) this._button.focus({ preventScroll: true });
    el.remove();
  }

  // Under the button, GAP px down, its right edge on the button's, and
  // inside the card's content box: the card clips what leaves it. A card
  // too short for it below the button (a small chart whose header wraps on
  // a phone) lifts it until it fits, over the buttons, rather than cut off
  // Apply. Run on open and after every render (a resize, a header that
  // wraps).
  place() {
    const el = this.el;
    if (!el) return;
    const card = this._container;
    const c = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const px = v => parseFloat(v) || 0;
    const left = c.left + card.clientLeft + px(cs.paddingLeft);
    const right = c.left + card.clientLeft + card.clientWidth - px(cs.paddingRight);
    const top = c.top + card.clientTop + px(cs.paddingTop);
    const bottom = c.top + card.clientTop + card.clientHeight - px(cs.paddingBottom);
    el.style.maxWidth = `${Math.max(0, right - left)}px`;
    const b = this._button.getBoundingClientRect();
    const { width: w, height: h } = el.getBoundingClientRect();
    const x = Math.max(left, Math.min(b.right - w, right - w));
    const y = Math.max(top, Math.min(b.bottom + GAP, bottom - h));
    // left / top are in the frame of the panel's positioned ancestor (the
    // range row); jsdom has none, the card stands in
    const frame = el.offsetParent ?? card;
    const f = frame.getBoundingClientRect();
    el.style.left = `${x - f.left - frame.clientLeft}px`;
    el.style.top = `${y - f.top - frame.clientTop}px`;
  }

  destroy() {
    this.close({ focus: false });
    this._destroyed = true;
    this._button.removeEventListener('keydown', this._onButtonKey);
  }
}
