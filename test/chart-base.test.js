import { describe, it, expect } from 'vitest';
import { Line } from '../assets/charts/src/charts/Line.js';
import { Bar } from '../assets/charts/src/charts/Bar.js';
import { mount, track } from './helpers.js';

// The base Chart's card slots. `controls`: a page element moved into the card
// (with its listeners), and handed back on destroy().

const dateSeries = [
  { date: '2026-01-01', value: 1 },
  { date: '2026-02-01', value: 3 },
  { date: '2026-03-01', value: 2 },
];

describe('Chart — controls slot', () => {
  it('moves the given element inside the card, keeping its listeners', () => {
    document.body.innerHTML = '<div id="c"></div><div id="ctl"><button id="b">x</button></div>';
    let clicks = 0;
    document.getElementById('b').addEventListener('click', () => { clicks++; });
    track(new Bar('#c', { controls: '#ctl', source: 'Source: test' }));
    const ctl = document.getElementById('ctl');
    expect(ctl.parentElement.id).toBe('c');
    expect(ctl.classList.contains('rc-chart-controls')).toBe(true);
    document.getElementById('b').click();
    expect(clicks).toBe(1);
  });

  it('hands the page\'s own controls element back to its place among its siblings', () => {
    const page = mount('page');
    const before = document.createElement('p'), after = document.createElement('p');
    const ctl = document.createElement('div');
    ctl.id = 'ctl';
    page.append(before, ctl, after);
    const c = new Line(mount(null), { animate: false, controls: '#ctl' }).setData(dateSeries);
    expect(ctl.parentNode).toBe(c.container);
    c.destroy();
    expect(ctl.parentNode).toBe(page);
    expect(ctl.previousSibling).toBe(before);
    expect(ctl.nextSibling).toBe(after);
    expect(ctl.classList.contains('rc-chart-controls')).toBe(false);
  });

  it('leaves the controls alone once the page has given them to a newer chart', () => {
    const page = mount('page');
    const ctl = document.createElement('div');
    page.appendChild(ctl);
    const old = new Line(mount(null), { animate: false, controls: ctl }).setData(dateSeries);
    const fresh = track(new Line(mount(null), { animate: false, controls: ctl })).setData(dateSeries);
    old.destroy();
    expect(ctl.parentNode).toBe(fresh.container);
    expect(ctl.classList.contains('rc-chart-controls')).toBe(true);
  });
});
