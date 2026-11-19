// The custom range (RC-003, analytics spec §6 with owner answer 5 А):
// 'CUSTOM' in timeframes adds a button — "Custom" unless the page labels it
// — that opens a small panel under itself: From and To date fields and
// Apply (role="dialog", aria-label "Custom range"). Apply makes the view
// [midnight of From, the last millisecond of the To day] in the chart's
// zone, clamped as a view; the chart keeps the days, so setData re-applies
// the same dates, the button stays pressed while that view holds and its
// title names them. setTimeframe('CUSTOM', { range }) does it from code and
// onViewChange reports { key: 'CUSTOM', level }. Every class with
// timeframes takes it (the base Chart's range bar).
//
// The panel's look, its box on three hosts and the keyboard in a real
// engine: test/browser/charts-custom-range.test.js. Sizes are the test's
// own (S-18): every box 800×400. Dates are local, built with the local Date
// constructor, or UTC with Date.UTC for the 'UTC' zone, so each expectation
// holds in every TZ run.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCustomStep, dayRange, dayValue, rangeTitle } from '../assets/charts/src/core/customRange.js';
import { Line } from '../assets/charts/src/charts/Line.js';
import { DualAxes } from '../assets/charts/src/charts/DualAxes.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { MapFlow } from '../assets/charts/src/charts/MapFlow.js';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { mount, track, setGeometry, dragStrip } from './helpers.js';

beforeEach(() => setGeometry({ width: 800, height: 400 }));

const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);
const utc = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi));
// the last millisecond of a day: the next day's midnight less one (Date
// runs 32 January on into February)
const dayEnd = (D, y, mo, d) => new Date(+D(y, mo, d + 1) - 1);
const ms = extent => extent?.map(Number) ?? null;
const tick = () => new Promise(r => setTimeout(r, 0));

// daily rows, 1 January to 18 July 2024 (200 days), at midnight in the zone
const daily = (D = local, n = 200) => Array.from({ length: n }, (_, i) => ({ date: D(2024, 1, 1 + i), value: 10 + (i % 9) }));

const line = (o = {}) => track(new Line(mount(null), { animate: false, timeframes: ['1M', 'ALL', 'CUSTOM'], ...o }))
  .setData([{ name: 'A', values: daily() }]);
const ts = (o = {}) => track(new TimeSeries(mount(null), { animate: false, timeframes: ['1M', 'ALL', 'CUSTOM'], ...o }));

const custom = c => c.container.querySelector('.rc-range-custom');
const panel = c => c.container.querySelector('.rc-range-panel');
const fields = c => [...c.container.querySelectorAll('.rc-range-panel .rc-range-input')];
const applyButton = c => c.container.querySelector('.rc-range-apply');
const pressed = c => [...c.container.querySelectorAll('.rc-range-btn')]
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent);
const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const type = (input, v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); };
// open the panel, fill both fields, press Apply
const pick = (c, from, to) => {
  if (!panel(c)) custom(c).click();
  const [a, b] = fields(c);
  type(a, from);
  type(b, to);
  applyButton(c).click();
};

// ─── The rule (core/customRange.js) ─────────────────────────────────────────

describe('the custom range step', () => {
  it('is the key CUSTOM in any case, or a step known by that label, with no range of its own', () => {
    expect(isCustomStep('CUSTOM')).toBe(true);
    expect(isCustomStep(' custom ')).toBe(true);
    expect(isCustomStep({ key: 'Custom', label: 'Pick dates' })).toBe(true);
    expect(isCustomStep({ label: 'CUSTOM' })).toBe(true);
    expect(isCustomStep({ key: 'CUSTOM', range: ['2024-01-01', '2024-03-31'] })).toBe(false);   // a fixed period
    expect(isCustomStep({ key: 'ALL', label: 'Custom' })).toBe(false);                          // the key names it
    expect(isCustomStep('1M')).toBe(false);
    expect(isCustomStep(null)).toBe(false);
  });
});

describe.each([['local', local], ['UTC', utc]])('days in the %s zone', (zone, D) => {
  it('dayValue: the day an <input type="date"> holds, four-digit years included', () => {
    expect(dayValue(D(2024, 6, 12, 23, 59), zone)).toBe('2024-06-12');
    expect(dayValue(D(2024, 1, 1), zone)).toBe('2024-01-01');
    const early = D(2024, 3, 1);
    if (zone === 'UTC') early.setUTCFullYear(500); else early.setFullYear(500);
    expect(dayValue(early, zone)).toBe('0500-03-01');
  });

  it('dayRange: from the first day\'s midnight to the last day\'s last millisecond; the later bound first swaps', () => {
    const want = [D(2024, 6, 1), dayEnd(D, 2024, 6, 12)];
    expect(ms(dayRange(D(2024, 6, 1, 15), D(2024, 6, 12, 3), zone))).toEqual(ms(want));
    expect(ms(dayRange(D(2024, 6, 12), D(2024, 6, 1), zone))).toEqual(ms(want));
    expect(ms(dayRange(D(2024, 6, 12), D(2024, 6, 12), zone))).toEqual(ms([D(2024, 6, 12), dayEnd(D, 2024, 6, 12)]));
    expect(dayRange(null, D(2024, 6, 1), zone)).toBeNull();
    expect(dayRange(D(2024, 6, 1), undefined, zone)).toBeNull();
  });

  it('a DST day runs to the next midnight, whatever its length (10 March 2024 in Los Angeles)', () => {
    const [a, b] = dayRange(D(2024, 3, 10, 12), D(2024, 3, 10, 12), zone);
    expect(+a).toBe(+D(2024, 3, 10));
    expect(+b + 1).toBe(+D(2024, 3, 11));
  });

  it('rangeTitle names the two days', () => {
    expect(rangeTitle([D(2024, 6, 1), dayEnd(D, 2024, 6, 12)], zone)).toBe('Jun 1, 2024 – Jun 12, 2024');
  });
});

// ─── The button ──────────────────────────────────────────────────────────────

describe('the Custom button', () => {
  it('\'CUSTOM\' adds a range button, "Custom", that opens a dialog; nothing is pressed or open yet', () => {
    const c = line();
    const btn = custom(c);
    expect(btn.textContent).toBe('Custom');
    expect(btn.className).toBe('rc-range-btn rc-range-custom');
    expect(btn.dataset.timeframe).toBe('CUSTOM');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.hasAttribute('title')).toBe(false);
    expect(btn.parentElement.classList.contains('rc-chart-range-bar')).toBe(true);
    expect(panel(c)).toBeNull();
  });

  it('the page\'s label wins; the key keeps the page\'s case', () => {
    const c = line({ timeframes: ['ALL', { key: 'CUSTOM', label: 'Dates' }, 'custom'] });
    const [a, b] = c.container.querySelectorAll('.rc-range-custom');
    expect([a.textContent, a.dataset.timeframe]).toEqual(['Dates', 'CUSTOM']);
    expect([b.textContent, b.dataset.timeframe]).toEqual(['Custom', 'custom']);
  });

  it('without \'CUSTOM\' there is no such control; a CUSTOM step with a range of its own is a fixed period', () => {
    const plain = line({ timeframes: ['1M', 'ALL'] });
    expect(plain.container.querySelector('.rc-range-custom, .rc-range-panel')).toBeNull();
    const fixed = line({ timeframes: ['ALL', { key: 'CUSTOM', label: 'Q1', range: ['2024-01-01', '2024-03-31'] }] });
    const q1 = [...fixed.container.querySelectorAll('.rc-range-btn')].find(b => b.textContent === 'Q1');
    expect(q1.className).toBe('rc-range-btn');
    q1.click();
    expect(ms(fixed.getView())).toEqual(ms([local(2024, 1, 1), local(2024, 3, 31)]));
    expect(fixed.container.querySelector('.rc-range-panel')).toBeNull();
  });
});

// ─── The panel ───────────────────────────────────────────────────────────────

describe('the panel', () => {
  it('opens under its button: a dialog with From, To and Apply, focus on From', () => {
    const c = line();
    custom(c).click();
    const p = panel(c);
    expect(p).not.toBeNull();
    expect(p.previousElementSibling).toBe(custom(c));       // after its button: Tab runs into it
    expect(p.getAttribute('role')).toBe('dialog');
    expect(p.getAttribute('aria-label')).toBe('Custom range');
    const labels = [...p.querySelectorAll('.rc-range-label')];
    expect(labels.map(l => l.textContent)).toEqual(['From', 'To']);
    const [from, to] = fields(c);
    expect([from.type, to.type]).toEqual(['date', 'date']);
    expect(labels.map(l => l.htmlFor)).toEqual([from.id, to.id]);
    expect(from.id).not.toBe(to.id);
    expect(applyButton(c).textContent).toBe('Apply');
    expect(applyButton(c).type).toBe('button');
    expect(document.activeElement).toBe(from);
    expect(custom(c).getAttribute('aria-expanded')).toBe('true');
  });

  it('the fields start at the view\'s days; min and max are the full extent\'s days', () => {
    const c = line();
    c.setTimeframe('1M');                                     // 18 June – 18 July
    custom(c).click();
    const [from, to] = fields(c);
    expect([from.value, to.value]).toEqual(['2024-06-18', '2024-07-18']);
    expect([from.min, from.max, to.min, to.max]).toEqual(['2024-01-01', '2024-07-18', '2024-01-01', '2024-07-18']);
  });

  it('Apply: the view is [midnight of From, the last millisecond of the To day], the button pressed and titled', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    pick(c, '2024-03-01', '2024-03-31');
    const want = [local(2024, 3, 1), dayEnd(local, 2024, 3, 31)];
    expect(ms(c.getView())).toEqual(ms(want));
    expect(pressed(c)).toEqual(['Custom']);
    expect(custom(c).classList.contains('active')).toBe(true);
    expect(custom(c).title).toBe('Mar 1, 2024 – Mar 31, 2024');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(c.getView(), { key: 'CUSTOM', level: null });
    // the panel has gone, the focus is back on the button
    expect(panel(c)).toBeNull();
    expect(custom(c).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(custom(c));
  });

  it('To before From swaps them', () => {
    const c = line();
    pick(c, '2024-03-31', '2024-03-01');
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(custom(c).title).toBe('Mar 1, 2024 – Mar 31, 2024');
  });

  it('days past min / max are taken as min / max, and the view is clamped to the data', () => {
    const c = line();
    pick(c, '2023-06-01', '2025-01-31');
    // 1 January to 18 July, whose end is past the last row (its midnight)
    expect(ms(c.getView())).toEqual(ms([local(2024, 1, 1), local(2024, 7, 18)]));
    expect(custom(c).title).toBe('Jan 1, 2024 – Jul 18, 2024');
    // ALL covers the same window; the custom range was chosen, so it lights
    expect(pressed(c)).toEqual(['Custom']);
    pick(c, '2024-07-10', '2024-12-31');
    expect(ms(c.getView())).toEqual(ms([local(2024, 7, 10), local(2024, 7, 18)]));
  });

  it('an empty field disables Apply; Enter and a click then do nothing', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    custom(c).click();
    const [from, to] = fields(c);
    expect(applyButton(c).disabled).toBe(false);
    type(to, '');
    expect(applyButton(c).disabled).toBe(true);
    key(from, 'Enter');
    applyButton(c).click();
    expect(changed).not.toHaveBeenCalled();
    expect(panel(c)).not.toBeNull();
    type(to, '2024-02-10');
    expect(applyButton(c).disabled).toBe(false);
  });

  it('Enter applies from a field; preventing the default, so a focused Apply does not apply twice', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    custom(c).click();
    const [from, to] = fields(c);
    type(from, '2024-02-01');
    type(to, '2024-02-29');
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    to.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(ms(c.getView())).toEqual(ms([local(2024, 2, 1), dayEnd(local, 2024, 2, 29)]));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(custom(c));
  });

  it('Escape closes it, focus back on the button, the view as it was', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    const before = ms(c.getView());
    custom(c).click();
    type(fields(c)[0], '2024-02-01');
    key(fields(c)[0], 'Escape');
    expect(panel(c)).toBeNull();
    expect(document.activeElement).toBe(custom(c));
    expect(custom(c).getAttribute('aria-expanded')).toBe('false');
    expect(ms(c.getView())).toEqual(before);
    expect(changed).not.toHaveBeenCalled();
    // Escape on the button closes it too (Shift+Tab from From lands there)
    custom(c).click();
    custom(c).focus();
    key(custom(c), 'Escape');
    expect(panel(c)).toBeNull();
  });

  it('a press outside closes it and gives the focus back to the button; a press inside does not', async () => {
    const c = line();
    custom(c).click();
    fields(c)[1].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    applyButton(c).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(panel(c)).not.toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(panel(c)).toBeNull();
    await tick();
    expect(document.activeElement).toBe(custom(c));
  });

  it('a press on another control keeps the focus that press gives it', async () => {
    const c = line();
    const other = document.body.appendChild(document.createElement('button'));
    custom(c).click();
    other.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    other.focus();                                            // the browser's own focus on press
    await tick();
    expect(panel(c)).toBeNull();
    expect(document.activeElement).toBe(other);
  });

  it('the button toggles it; Tab out of it closes it, the focus staying where it went', () => {
    const c = line();
    custom(c).click();
    expect(panel(c)).not.toBeNull();
    custom(c).click();
    expect(panel(c)).toBeNull();
    expect(document.activeElement).toBe(custom(c));
    custom(c).click();
    // Shift+Tab back to the button keeps it open
    custom(c).focus();
    expect(panel(c)).not.toBeNull();
    fields(c)[0].focus();
    const next = c.container.querySelector('.rc-range-btn');   // 1M, outside the panel
    next.focus();
    expect(panel(c)).toBeNull();
    expect(document.activeElement).toBe(next);
  });

  it('a press on its padding keeps the focus in it (tabindex -1, out of the Tab order), so Escape still closes it', () => {
    const c = line();
    custom(c).click();
    const p = panel(c);
    expect(p.getAttribute('tabindex')).toBe('-1');
    p.focus();
    expect(document.activeElement).toBe(p);
    expect(panel(c)).not.toBeNull();                         // focus inside: still open
    key(p, 'Escape');
    expect(panel(c)).toBeNull();
    expect(document.activeElement).toBe(custom(c));
  });

  // jsdom has no layout: the boxes are stubbed. The card 800×400 at the
  // origin with 16px padding, so its content box is x 16–784, y 16–384;
  // the panel 200×120. Every render places it again.
  it('is placed under the button, right edges together, and held inside the card\'s content box', () => {
    const c = line();
    c.container.style.padding = '16px';
    custom(c).click();
    const p = panel(c);
    const boxAt = (el, left, top, width, height) => {
      el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });
    };
    boxAt(c.container, 0, 0, 800, 400);
    boxAt(p, 0, 0, 200, 120);
    const at = () => [p.style.left, p.style.top, p.style.maxWidth];
    boxAt(custom(c), 700, 20, 80, 30);                      // right edge 780, bottom 50
    c.render();
    expect(at()).toEqual(['580px', '54px', '768px']);
    boxAt(custom(c), 20, 20, 80, 30);                       // near the left: held at the content's left
    c.render();
    expect(at()[0]).toBe('16px');
    boxAt(custom(c), 760, 20, 80, 30);                      // past the right: held at the content's right
    c.render();
    expect(at()[0]).toBe('584px');
    boxAt(custom(c), 700, 270, 80, 30);                     // too low: lifted until it fits
    c.render();
    expect(at()[1]).toBe('264px');
  });

  it('wears the tooltip\'s tokens and theme.border; the date pickers follow its background', () => {
    const c = line();
    custom(c).click();
    const p = panel(c);
    // the default theme's token chains; the scheme from their colour as hex
    expect(p.style.getPropertyValue('--rc-tooltip-bg')).toBe('var(--chart-tooltip-bg, #ffffff)');
    expect(p.style.getPropertyValue('--rc-tooltip-text')).toBe('var(--chart-tooltip-text, #000000)');
    expect(p.style.getPropertyValue('--rc-range-border')).toBe('var(--rc-border, #cccccc)');
    expect(p.style.colorScheme).toBe('light');
    const dark = line({ theme: darkTheme });
    custom(dark).click();
    const d = panel(dark);
    expect(d.style.getPropertyValue('--rc-tooltip-bg')).toBe('#1a1a1a');
    expect(d.style.getPropertyValue('--rc-tooltip-muted')).toBe('#888888');
    expect(d.style.getPropertyValue('--rc-range-border')).toBe('var(--rc-border, #888888)');
    expect(d.style.colorScheme).toBe('dark');
    // a background the page resolves (var()) is read at the card, as hex
    // (core/paint.js): the scheme follows the colour it resolves to
    const host = line({ theme: { tooltip: { bg: 'var(--panel-bg, #fff)' } } });
    custom(host).click();
    expect(panel(host).style.colorScheme).toBe('light');
    const page = line({ theme: { tooltip: { bg: 'var(--panel-bg, #fff)' } } });
    page.container.style.setProperty('--panel-bg', '#101010');
    custom(page).click();
    expect(panel(page).style.colorScheme).toBe('dark');
  });

  it('a chart without data: empty fields, no min or max, Apply waits', () => {
    const c = track(new Line(mount(null), { animate: false, timeframes: ['ALL', 'CUSTOM'] }));
    custom(c).click();
    const [from, to] = fields(c);
    expect([from.value, to.value, from.min, to.max]).toEqual(['', '', '', '']);
    expect(applyButton(c).disabled).toBe(true);
  });

  it('destroy() takes it down with its document listener', async () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    custom(c).click();
    const btn = custom(c);
    const remove = vi.spyOn(document, 'removeEventListener');
    c.destroy();
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(document.querySelector('.rc-range-panel')).toBeNull();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    btn.click();
    await tick();
    expect(changed).not.toHaveBeenCalled();
    expect(document.querySelector('.rc-range-panel')).toBeNull();
  });
});

// ─── The days kept ───────────────────────────────────────────────────────────

describe('the days are kept', () => {
  it('setData re-applies the same dates, not a window counted back from the new end', () => {
    const c = line();
    pick(c, '2024-03-01', '2024-03-31');
    c.setData([{ name: 'A', values: daily(local, 300) }]);     // now to 26 October
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(pressed(c)).toEqual(['Custom']);
    c.setTimeframe('1M');                                     // a preset moves with the data
    c.setData([{ name: 'A', values: daily(local, 250) }]);
    expect(ms(c.getView())[1]).toBe(+local(2024, 9, 6));
  });

  it('data that no longer reaches the days: the default view, nothing pressed; the days come back with data', () => {
    const c = line();
    pick(c, '2024-03-01', '2024-03-31');
    const later = Array.from({ length: 30 }, (_, i) => ({ date: local(2024, 8, 1 + i), value: i }));
    c.setData([{ name: 'A', values: later }]);
    expect(ms(c.getView())).toEqual(ms([local(2024, 8, 1), local(2024, 8, 30)]));
    expect(pressed(c)).toEqual(['ALL']);
    c.setData([{ name: 'A', values: daily() }]);
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(pressed(c)).toEqual(['Custom']);
  });

  it('TimeSeries.appendPoint keeps them', () => {
    const c = ts().setData(daily());
    c.setTimeframe('CUSTOM', { range: ['2024-03-01', '2024-03-31'] });
    c.appendPoint({ date: local(2024, 7, 19), value: 5 });
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(pressed(c)).toEqual(['Custom']);
  });

  it('the brush and setView let go of the button; the days stay for setTimeframe(\'CUSTOM\')', async () => {
    const c = line({ navigator: true });
    const changed = vi.fn();
    pick(c, '2024-03-01', '2024-03-31');
    c.onViewChange(changed);
    dragStrip(c.container.querySelector('.rc-chart-navigator'), 100, 200, 300);
    await tick();                                            // d3 swallows the click right after a drag
    expect(pressed(c)).toEqual([]);
    expect(changed.mock.calls.at(-1)[1]).toEqual({ key: null, level: null });
    c.setView([local(2024, 5, 1), local(2024, 6, 1)]);
    expect(pressed(c)).toEqual([]);
    custom(c).click();                                       // the fields follow the view
    expect(fields(c).map(f => f.value)).toEqual(['2024-05-01', '2024-06-01']);
    key(fields(c)[0], 'Escape');
    c.setTimeframe('CUSTOM');
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(pressed(c)).toEqual(['Custom']);
    expect(changed).toHaveBeenLastCalledWith(c.getView(), { key: 'CUSTOM', level: null });
  });
});

// ─── From code ───────────────────────────────────────────────────────────────

describe('setTimeframe(\'CUSTOM\', { range })', () => {
  it('does what Apply does, and reports { key: \'CUSTOM\', level }', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    c.setTimeframe('CUSTOM', { range: [local(2024, 2, 10, 15), '2024-02-20'] });
    const want = [local(2024, 2, 10), dayEnd(local, 2024, 2, 20)];
    expect(ms(c.getView())).toEqual(ms(want));
    expect(pressed(c)).toEqual(['Custom']);
    expect(custom(c).title).toBe('Feb 10, 2024 – Feb 20, 2024');
    expect(changed).toHaveBeenCalledWith(c.getView(), { key: 'CUSTOM', level: null });
    c.setTimeframe('CUSTOM', { range: ['2024-02-20', '2024-02-10'], silent: true });   // swapped, silent
    expect(ms(c.getView())).toEqual(ms(want));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('a chart without a Custom button takes it too, under the key it was given', () => {
    const c = line({ timeframes: ['1M', 'ALL'] });
    const changed = vi.fn();
    c.onViewChange(changed);
    c.setTimeframe('custom', { range: ['2024-04-01', '2024-04-30'] });
    expect(ms(c.getView())).toEqual(ms([local(2024, 4, 1), dayEnd(local, 2024, 4, 30)]));
    expect(changed).toHaveBeenCalledWith(c.getView(), { key: 'custom', level: null });
    expect(pressed(c)).toEqual([]);
  });

  it('a range that misses the data or does not read, or no range and none kept: nothing changes', () => {
    const c = line();
    const changed = vi.fn();
    c.onViewChange(changed);
    c.setTimeframe('CUSTOM');
    c.setTimeframe('CUSTOM', { range: ['2023-01-01', '2023-02-01'] });
    c.setTimeframe('CUSTOM', { range: ['soon', '2024-02-01'] });
    expect(changed).not.toHaveBeenCalled();
    expect(pressed(c)).toEqual(['ALL']);
    expect(custom(c).hasAttribute('title')).toBe(false);
    c.setTimeframe('CUSTOM', { range: ['2024-04-01', '2024-04-30'] });
    c.setTimeframe('CUSTOM', { range: ['2025-01-01', '2025-02-01'] });   // the days kept stay
    expect(ms(c.getView())).toEqual(ms([local(2024, 4, 1), dayEnd(local, 2024, 4, 30)]));
    expect(custom(c).title).toBe('Apr 1, 2024 – Apr 30, 2024');
  });

  it('a range on another key is left alone: the key resolves as before', () => {
    const c = line();
    c.setTimeframe('1M', { range: ['2024-04-01', '2024-04-30'] });
    expect(ms(c.getView())).toEqual(ms([local(2024, 6, 18), local(2024, 7, 18)]));
    expect(pressed(c)).toEqual(['1M']);
  });
});

// ─── The zone, the anchor, the levels ────────────────────────────────────────

describe('in the chart\'s zone, with the anchor and the levels', () => {
  it('timeZone \'UTC\': the days are UTC days', () => {
    const c = ts({ timeZone: 'UTC' }).setData(daily(utc));
    custom(c).click();
    expect(fields(c).map(f => f.value)).toEqual(['2024-01-01', '2024-07-18']);
    pick(c, '2024-03-01', '2024-03-31');
    expect(ms(c.getView())).toEqual(ms([utc(2024, 3, 1), dayEnd(utc, 2024, 3, 31)]));
    expect(ms(c.xScale.domain())).toEqual(ms(c.getView()));
    expect(custom(c).title).toBe('Mar 1, 2024 – Mar 31, 2024');
  });

  it('timeframeAnchor \'now\': Apply reads "now" again, and the days run to it', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(local(2024, 7, 20, 11, 21));
      const c = ts({ timeframeAnchor: 'now' }).setData(daily());
      custom(c).click();
      expect(fields(c)[1].max).toBe('2024-07-20');            // the full extent runs to now
      vi.setSystemTime(local(2024, 7, 20, 12, 5));
      pick(c, '2024-07-19', '2024-07-20');
      expect(ms(c.getView())).toEqual(ms([local(2024, 7, 19), local(2024, 7, 20, 12, 5)]));
      expect(pressed(c)).toEqual(['Custom']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('TimeSeries levels: the level follows the custom window, and onViewChange names it', () => {
    const END = local(2024, 7, 18, 23);
    const hours = Array.from({ length: 24 * 10 }, (_, i) => ({ date: new Date(+END - (24 * 10 - 1 - i) * 36e5), value: i % 24 }));
    const c = ts().setData({ hour: hours, day: daily() });
    const changed = vi.fn();
    c.onViewChange(changed);
    expect(c.getLevel()).toBe('day');
    pick(c, '2024-07-15', '2024-07-16');
    expect(c.getLevel()).toBe('hour');
    expect(changed).toHaveBeenCalledWith(c.getView(), { key: 'CUSTOM', level: 'hour' });
    pick(c, '2024-03-01', '2024-03-31');
    expect(c.getLevel()).toBe('day');
  });
});

// ─── Every class with timeframes ─────────────────────────────────────────────

const geoData = { type: 'FeatureCollection', features: [{ type: 'Feature', id: '1', properties: {},
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 20], [20, 20], [20, 0], [0, 0]]] } }] };
const ties = { nodes: [{ id: 'A', coords: [1, 1], lane: 'x' }, { id: 'B', coords: [10, 10], lane: 'y' }],
  links: [{ from: 'A', to: 'B', start: '2024-01-01', end: '2024-06-30' }, { from: 'B', to: 'A', start: '2024-03-01', end: '2024-12-31' }] };

describe.each([
  ['DualAxes', () => new DualAxes(mount(null), { animate: false, timeframes: ['ALL', 'CUSTOM'] })
    .setData([{ name: 'A', axis: 'y1', values: daily() }, { name: 'B', axis: 'y2', values: daily() }])],
  ['the dated Bar', () => new Bar(mount(null), { animate: false, timeframes: ['ALL', 'CUSTOM'] })
    .setData(daily().map(d => ({ date: d.date, value: d.value })))],
  ['TimeSeries', () => new TimeSeries(mount(null), { timeframes: ['ALL', 'CUSTOM'] }).setData(daily())],
  ['MapFlow', () => new MapFlow(mount(null), { geoData, timeframes: ['ALL', 'CUSTOM'] }).setData(ties)],
  ['Graph flow', () => new Graph(mount(null), { view: 'flow', duration: 0, timeframes: ['ALL', 'CUSTOM'] }).setData(ties)],
])('%s', (_name, make) => {
  it('has the Custom button, and Apply makes the view those days', async () => {
    const c = track(make());
    await c.whenReady();
    custom(c).click();
    expect(panel(c)).not.toBeNull();
    expect(fields(c)[0].min).toBe('2024-01-01');
    pick(c, '2024-03-01', '2024-03-31');
    expect(ms(c.getView())).toEqual(ms([local(2024, 3, 1), dayEnd(local, 2024, 3, 31)]));
    expect(pressed(c)).toEqual(['Custom']);
  });
});

describe('the relation charts read the range as their view bounds', () => {
  it('a year runs to its end, then to whole days', async () => {
    const c = track(new MapFlow(mount(null), { geoData, timeframes: ['ALL', 'CUSTOM'] })).setData({
      ...ties, links: [{ from: 'A', to: 'B', start: 1940, end: 1970 }],
    });
    await c.whenReady();
    c.setTimeframe('CUSTOM', { range: [1950, 1960] });
    expect(ms(c.getView())).toEqual(ms([local(1950, 1, 1), dayEnd(local, 1960, 12, 31)]));
    expect(custom(c).title).toBe('Jan 1, 1950 – Dec 31, 1960');
  });
});

afterEach(() => document.body.querySelectorAll('button:not(.rc-chart *)').forEach(b => b.remove()));
