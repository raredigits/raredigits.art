// RC-014: where a colour leaves the chart. Charts draw role colours as
// var(--rc-…) references and the data colours as hex (core/paint.js); what
// reaches the page — a formatter's payload, colour maths, the tooltip HTML —
// is never a var(). Here, under jsdom, a reference resolves to its literal
// (no stylesheet); test/browser/charts-hosts.test.js hovers on real hosts.
//   payloads   every colour is #rrggbb[aa], or the page's own plain value
//   tooltip    no inline var( and no muted reference in a built-in tooltip
//   guard      drawing code reads no colour from the spec (this._theme), and
//              no transition writes fill / stroke / stop-color (d3 would
//              interpolate the digits inside a var(--rc-…))
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Line } from '../assets/charts/src/charts/Line.js';
import { TimeSeries } from '../assets/charts/src/charts/TimeSeries.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { HierarchicalBar } from '../assets/charts/src/charts/HierarchicalBar.js';
import { Donut } from '../assets/charts/src/charts/Donut.js';
import { Gauge } from '../assets/charts/src/charts/Gauge.js';
import { darkTheme } from '../assets/charts/src/core/theme.js';
import { linkTooltipHtml, tipHeader, tipKind } from '../assets/charts/src/core/html.js';
import { mount, track } from './helpers.js';

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
const move = (el, clientX = 400) =>
  el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY: 60 }));
const over = el => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
const enter = el => el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
const dates = values => values.map((value, i) => ({ date: new Date(2026, 0, 1 + i), value }));
const recorder = () => {
  const calls = [];
  return { fn: (...args) => { calls.push(args); return 'x'; }, calls };
};
const tipHtml = c => c.container.querySelector('.rc-tooltip')?.innerHTML ?? '';

describe('payload colours are hex', () => {
  it('Line points: the palette as read, a page var() resolved, a plain page colour as written', () => {
    const tip = recorder();
    const c = track(new Line(mount(null), { animate: false, tooltipFormat: tip.fn })).setData([
      { name: 'A', values: dates([1, 2, 3]) },
      { name: 'B', color: 'var(--brand, #336699)', values: dates([2, 3, 4]) },
      { name: 'C', color: 'steelblue', values: dates([3, 4, 5]) },
    ]);
    move(c.container.querySelector('rect.rc-overlay'), 2000);
    expect(tip.calls[0][0].points.map(p => p.color)).toEqual(['#1677ff', '#336699', 'steelblue']);
  });

  it('TimeSeries: the accent (darkTheme: its orange)', () => {
    for (const [theme, want] of [[undefined, '#1677ff'], [darkTheme, '#ff6200']]) {
      const tip = recorder();
      const c = track(new TimeSeries(mount(null), { tooltipFormat: tip.fn, theme }))
        .setData([{ date: '2026-01-01', value: 1 }, { date: '2026-01-02', value: 2 }]);
      move(c.container.querySelector('svg > g > rect'), 790);
      expect(tip.calls[0][1].color).toBe(want);
    }
  });

  it('Bar: a bar\'s role and a stacked segment', () => {
    const tip = recorder();
    const c = track(new Bar(mount(null), { animate: false, tooltipFormat: tip.fn })).setData([{ label: 'A', value: 1 }]);
    over(c.container.querySelector('rect.rc-bar'));
    expect(tip.calls[0][1].color).toBe('#1677ff');
    const seg = recorder();
    const s = track(new Bar(mount(null), { animate: false, tooltipFormat: seg.fn })).setData([
      { name: 'X', values: [{ label: 'a', value: 1 }] },
      { name: 'Y', color: 'var(--brand, #336699)', values: [{ label: 'a', value: 2 }] },
    ]);
    s.container.querySelectorAll('rect.rc-bar-seg').forEach(over);
    expect(seg.calls.map(([p]) => p.color)).toEqual(['#1677ff', '#336699']);
  });

  it('Gauge: the accent fill', () => {
    const tip = recorder();
    const c = track(new Gauge(mount(null), { animate: false, tooltipFormat: tip.fn })).setData(40);
    move(c.container.querySelector('.rc-gauge-arc path'));
    expect(tip.calls[0][0].color).toBe('#1677ff');
  });

  it('Donut: a slice from the palette, the remainder\'s muted', () => {
    const tip = recorder();
    const c = track(new Donut(mount(null), { animate: false, showRemainder: true, tooltipFormat: tip.fn }))
      .setData({ label: 'Root', value: 10, children: [{ label: 'A', value: 6 }] });
    c.container.querySelectorAll('path.rc-donut-slice').forEach(over);
    expect(tip.calls.map(([p]) => [p.label, p.color])).toEqual([['A', '#1677ff'], ['Other', '#666666']]);
  });

  it('HierarchicalBar: the root\'s muted', () => {
    const tip = recorder();
    const c = track(new HierarchicalBar(mount(null), { animate: false, tooltipFormat: tip.fn }))
      .setData({ label: 'Root', value: 10, children: [{ label: 'A', value: 6 }, { label: 'B', value: 4 }] });
    const rows = [...c.container.querySelectorAll('.rc-hbar-row')];
    rows.forEach(enter);
    const colors = tip.calls.map(([, info]) => info.color);
    expect(colors.length).toBe(rows.length);
    expect(colors.every(col => HEX.test(col))).toBe(true);
    expect(tip.calls.find(([node]) => node.label === 'Root')[1].color).toBe('#666666');
  });
});

describe('the tooltip HTML carries no role colour', () => {
  it('the Donut remainder\'s mark takes the tooltip\'s muted, a slice its own colour (RC-082)', () => {
    const c = track(new Donut(mount(null), { animate: false, showRemainder: true }))
      .setData({ label: 'Root', value: 10, children: [{ label: 'A', value: 6 }] });
    const [a, rest] = c.container.querySelectorAll('path.rc-donut-slice');
    over(rest);
    let mark = c.container.querySelector('.rc-tooltip .rc-tooltip-swatch');
    expect(mark.classList.contains('rc-tooltip-muted')).toBe(true);
    expect(mark.getAttribute('style')).toBeNull();
    expect(tipHtml(c)).not.toMatch(/var\(/);
    over(a);
    mark = c.container.querySelector('.rc-tooltip .rc-tooltip-swatch');
    expect(mark.getAttribute('style')).toBe('--rc-swatch-color:#1677ff');
    expect(c.container.querySelector('.rc-tooltip [style*="color:"]:not(.rc-tooltip-swatch)')).toBeNull();
  });

  it('an untyped tie\'s kind (the chart\'s muted) reads as muted, a typed one keeps its colour', () => {
    const muted = 'var(--rc-muted, #666666)';
    const html = linkTooltipHtml({ from: 'a', to: 'b', ties: [
      { link: {}, kind: { label: 'Untyped', color: muted } },
      { link: {}, kind: { label: 'Typed', color: '#1677ff' } },
    ] });
    expect(html).not.toMatch(/var\(/);
    expect(html).toContain('<span class="rc-tooltip-kind rc-tooltip-muted">Untyped</span>');
    expect(html).toContain('<span class="rc-tooltip-kind" style="color:#1677ff">Typed</span>');
    expect(tipHeader('x', { color: muted })).toBe('<div class="rc-tooltip-header rc-tooltip-muted">x</div>');
    expect(tipKind('k', muted)).toBe('<span class="rc-tooltip-kind rc-tooltip-muted">k</span>');
  });

  it('Line and TimeSeries tooltips write hex, not references', () => {
    const line = track(new Line(mount(null), { animate: false })).setData(dates([1, 2, 3]));
    move(line.container.querySelector('rect.rc-overlay'), 2000);
    const ts = track(new TimeSeries(mount(null))).setData([{ date: '2026-01-01', value: 1 }, { date: '2026-01-02', value: 2 }]);
    move(ts.container.querySelector('svg > g > rect'), 790);
    for (const c of [line, ts]) {
      expect(tipHtml(c)).toMatch(/color:#1677ff/);
      expect(tipHtml(c)).not.toMatch(/var\(/);
    }
  });
});

describe('guard: drawing code and transitions', () => {
  const SRC = resolve(process.cwd(), 'assets/charts/src');
  const files = readdirSync(SRC, { recursive: true }).filter(f => f.endsWith('.js'))
    .map(f => [f, readFileSync(join(SRC, f), 'utf8')]);

  // this._theme is the spec in Chart and a standalone Overview: only made,
  // published and read for the data colours. Crosshair, the zoom hint and
  // the range panel keep the paint object they are given under that name.
  it('this._theme is not read for a colour', () => {
    const OWN_NAME = new Set(['core/Crosshair.js', 'core/zoomGesture.js', 'core/customRange.js']);
    const ALLOWED = /this\._theme\s*=\s*createTheme\(|publishTheme\([^)]*this\._theme|paintOf\(this\._theme|readDataColors\([^)]*this\._theme|if \(this\._theme\)/;
    const bad = [];
    for (const [f, text] of files) {
      if (OWN_NAME.has(f)) continue;
      text.split('\n').forEach((line, i) => {
        if (/this\._theme\b/.test(line) && !ALLOWED.test(line) && !/^\s*\/\//.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('no transition writes a colour', () => {
    const bad = [];
    for (const [f, text] of files) {
      for (const m of text.matchAll(/\.transition\(/g)) {
        // the chain up to the end of its statement
        const rest = text.slice(m.index);
        const chain = rest.slice(0, rest.search(/;\s*$|;\n/m) + 1);
        if (/\.(attr|style)\(\s*'(fill|stroke|stop-color|color)'/.test(chain)) bad.push(`${f}: ${chain.slice(0, 80)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
