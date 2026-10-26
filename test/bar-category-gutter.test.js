// Horizontal Bar: the category labels get the gutter they need (C-39). The
// left margin was a fixed 65px, so a long label ran off the card at any
// width. It grows to the longest label (after labelMaxLength) up to 40% of
// the chart width; a label past the cap is cut with an ellipsis and keeps its
// full text in the tooltip. jsdom has no text layout: labels measure 7px a
// character here.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track } from './helpers.js';

const CHAR = 7;
beforeEach(() => {
  vi.spyOn(SVGElement.prototype, 'getComputedTextLength')
    .mockImplementation(function () { return this.textContent.length * CHAR; });
});

const LONG = 'A very long category label';   // 26 characters → 182px
const rows = labels => labels.map((label, i) => ({ label, value: 10 + i }));
const hbar = (o, data, width) => track(new Bar(mount(null, { width }), { animate: false, orientation: 'horizontal', ...o })).setData(data);
const shift   = c => +c.g.attr('transform').match(/translate\(([-\d.]+)/)[1];
const labels  = c => [...c.gAxisX.selectAll('.tick text').nodes()].map(n => n.textContent);
const barEnds = c => [...c.container.querySelectorAll('rect.rc-bar')].map(r => +r.getAttribute('x') + +r.getAttribute('width'));

describe('C-39: horizontal category gutter', () => {
  it('grows to the longest label', () => {
    const c = hbar({}, rows(['Short', LONG]), 800);
    expect(c.margin.left).toBe(LONG.length * CHAR + 9);   // label + axis padding + air
    expect(shift(c)).toBe(c.margin.left);
    expect(labels(c)).toEqual(['Short', LONG]);           // nothing cut
    expect(Math.max(...barEnds(c))).toBeLessThanOrEqual(800 - c.margin.left);   // the plot gave the room
  });

  it('short labels keep the 65px gutter', () => {
    expect(hbar({}, rows(['A', 'B']), 800).margin.left).toBe(65);
  });

  it('is capped at 40% of the width; a longer label is cut, its tooltip has it whole', () => {
    const c = hbar({}, rows(['Short', LONG]), 300);
    expect(c.margin.left).toBe(120);
    const cut = labels(c)[1];
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length * CHAR).toBeLessThanOrEqual(120 - 9);
    const show = vi.spyOn(c._tooltip, 'show');
    c.gAxisX.selectAll('.tick text').nodes()[1].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(show.mock.calls.at(-1)[2]).toContain(LONG);
  });

  it('labelMaxLength applies first: the gutter fits the shortened label', () => {
    const c = hbar({ labelMaxLength: 10 }, rows([LONG]), 800);
    expect(labels(c)).toEqual(['A very lon…']);
    expect(c.margin.left).toBe(11 * CHAR + 9);            // the 11 characters drawn, not 26
    expect(hbar({ labelMaxLength: 4 }, rows([LONG]), 800).margin.left).toBe(65);
  });

  it('an explicit margin.left or a hidden category axis keeps the margin as given', () => {
    const c = hbar({ margin: { left: 40 } }, rows([LONG]), 800);
    expect(c.margin.left).toBe(40);
    expect(labels(c)).toEqual([LONG]);
    expect(hbar({ showYAxis: false }, rows([LONG]), 800).margin.left).toBe(0);
  });

  it('margins set from outside later (a MultiChart breakpoint) are kept', () => {
    const c = hbar({}, rows([LONG]), 800);
    c.margin = { ...c.margin, left: 30 };
    c.options.margin = { ...c.options.margin, left: 30 };
    c.render();
    expect(c.margin.left).toBe(30);
  });

  it('stacked horizontal bars size the gutter the same way', () => {
    const c = hbar({}, [{ name: 's', values: rows(['Short', LONG]) }], 800);
    expect(c.margin.left).toBe(LONG.length * CHAR + 9);
  });

  it('follows new data: a shorter set gives the room back', () => {
    const c = hbar({}, rows([LONG]), 800);
    c.setData(rows(['A', 'B']));
    expect(c.margin.left).toBe(65);
    expect(shift(c)).toBe(65);
  });
});
