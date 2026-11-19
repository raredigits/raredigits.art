// The legend builder, core/legend.js (D-04; the legend spec, §4–§6 and §13).
// The builder knows no chart: these tests drive it as a chart would — a host
// keeps the hidden keys, re-renders on onToggle — and read the DOM it draws.
// Gestures go through MouseEvent('click', { detail }) and 'dblclick', as a
// browser sends them; the hide delay runs on fake timers.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HIDE_DELAY_MS, legendKey, nextVisible, renderLegendItems, shapeParts } from '../assets/charts/src/core/legend.js';

// ─── A host: the chart's side of the contract ───────────────────────────────
// defs: the items without `on`; the host adds `on` from its hidden set and
// applies each commit the way the base Chart will (§7: Show all clears
// everything; otherwise only the listed keys change).
function host(defs, { hidden = [], opts = {}, rerender = true } = {}) {
  const el = document.createElement('div');
  el.className = 'rc-legend';
  document.body.appendChild(el);
  const h = { el, defs, hidden: new Set(hidden), calls: [], renders: 0, opts };
  h.render = () => {
    h.renders++;
    renderLegendItems(el, h.defs.map(d => (d.key == null ? d : { ...d, on: !h.hidden.has(d.key) })), {
      anyHidden: h.hidden.size > 0,
      onToggle: info => {
        h.calls.push(info);
        const listed = h.defs.map(d => d.key).filter(k => k != null);
        if (info.kind === 'showAll') h.hidden.clear();
        else {
          listed.forEach(k => h.hidden.delete(k));
          listed.filter(k => !info.visibleKeys.includes(k)).forEach(k => h.hidden.add(k));
        }
        h.onCommit?.(info);
        if (rerender) h.render();
      },
      ...h.opts,
    });
  };
  h.render();
  return h;
}

const ABC = [{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }, { key: 'c', label: 'Gamma' }];
const item = (h, key) => h.el.querySelector(`[data-key="${key}"]`);
const resetOf = h => h.el.querySelector('.rc-legend-reset');
// the keys whose toggles read pressed
const shown = h => [...h.el.querySelectorAll('button[data-key]')]
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.key);
const click = (node, detail = 1) => node.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
const dblclick = node => node.dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
// a real double click in an engine that counts: click 1, click 2, dblclick
const doubleClick = node => { click(node, 1); click(node, 2); dblclick(node); };

beforeEach(() => document.body.replaceChildren());
afterEach(() => document.body.replaceChildren());

// ─── Pure parts ──────────────────────────────────────────────────────────────

describe('legendKey (decision 13)', () => {
  it('series wins, then name, then label', () => {
    expect(legendKey({ series: 'S', name: 'N', label: 'L' })).toBe('S');
    expect(legendKey({ name: 'N', label: 'L' })).toBe('N');
    expect(legendKey({ label: 'L' })).toBe('L');
  });

  it('series: false is a caption; a null series falls through; no name at all is null', () => {
    expect(legendKey({ series: false, name: 'N', label: 'L' })).toBeNull();
    expect(legendKey({ series: null, name: 'N' })).toBe('N');
    expect(legendKey({ color: 'red' })).toBeNull();
    expect(legendKey(null)).toBeNull();
    expect(legendKey('Alpha')).toBeNull();
  });

  it('keys are strings, as data-key holds them', () => {
    expect(legendKey({ series: 2024 })).toBe('2024');
    expect(legendKey({ label: 0 })).toBe('0');
  });
});

describe('nextVisible', () => {
  const keys = ['a', 'b', 'c'];

  it('toggle flips one key and keeps the key order', () => {
    expect(nextVisible(keys, new Set(['c', 'a', 'b']), 'toggle', 'b')).toEqual({ visible: ['a', 'c'], kind: 'toggle' });
    expect(nextVisible(keys, new Set(['c']), 'toggle', 'a')).toEqual({ visible: ['a', 'c'], kind: 'toggle' });
    expect(nextVisible(keys, new Set(['b']), 'toggle', 'b')).toEqual({ visible: [], kind: 'toggle' });
  });

  it('double isolates from any other state, and restores from the only one shown', () => {
    expect(nextVisible(keys, new Set(keys), 'double', 'b')).toEqual({ visible: ['b'], kind: 'isolate' });
    expect(nextVisible(keys, new Set(['a', 'b']), 'double', 'b')).toEqual({ visible: ['b'], kind: 'isolate' });
    expect(nextVisible(keys, new Set(), 'double', 'b')).toEqual({ visible: ['b'], kind: 'isolate' });
    expect(nextVisible(keys, new Set(['a']), 'double', 'b')).toEqual({ visible: ['b'], kind: 'isolate' });
    expect(nextVisible(keys, new Set(['b']), 'double', 'b')).toEqual({ visible: keys, kind: 'restore' });
    // one key in all: a double click on it shows it
    expect(nextVisible(['a'], new Set(['a']), 'double', 'a')).toEqual({ visible: ['a'], kind: 'restore' });
  });

  it('showAll shows every key', () => {
    expect(nextVisible(keys, new Set(), 'showAll')).toEqual({ visible: keys, kind: 'showAll' });
  });

  it('a key outside the list changes nothing; visible keys outside it are ignored', () => {
    expect(nextVisible(keys, new Set(['a', 'zz']), 'toggle', 'zz')).toEqual({ visible: ['a'], kind: 'toggle' });
    expect(nextVisible(keys, new Set(['a', 'b']), 'double', 'zz')).toEqual({ visible: ['a', 'b'], kind: 'isolate' });
    expect(nextVisible(keys, new Set(['b', 'zz']), 'double', 'b').kind).toBe('restore');
  });

  it('visible may be an array', () => {
    expect(nextVisible(keys, ['a', 'c'], 'toggle', 'c').visible).toEqual(['a']);
  });
});

describe('shapeParts: the flow view\'s node shapes', () => {
  it('draws each built-in shape at radius R, a path as given, anything else a circle', () => {
    expect(shapeParts('circle', 10)).toEqual([['circle', { r: 10 }]]);
    expect(shapeParts('square', 10)).toEqual([['rect', { x: -9, y: -9, width: 18, height: 18, rx: 6 }]]);
    expect(shapeParts('diamond', 10)).toEqual([['path', { d: 'M0,-13L13,0L0,13L-13,0z' }]]);
    expect(shapeParts('stack', 10)).toEqual([['circle', { cx: 6, cy: -5, r: 8, opacity: 0.55 }], ['circle', { r: 10 }]]);
    expect(shapeParts('M0,0L5,5z', 10)).toEqual([['path', { d: 'M0,0L5,5z' }]]);
    expect(shapeParts('hexagon', 10)).toEqual([['circle', { r: 10 }]]);
    expect(shapeParts(undefined, 10)).toEqual([['circle', { r: 10 }]]);
    expect(shapeParts('circle')).toEqual([['circle', { r: 18 }]]);
  });
});

// ─── Drawing ─────────────────────────────────────────────────────────────────

describe('renderLegendItems: items, marks and swatches', () => {
  it('a keyed item is a toggle button, an item without a key a static div; the label is the last child span', () => {
    const h = host([{ key: 'a', label: 'Alpha' }, { label: 'Recession', mark: 'band' }, { key: 'b', label: 'Beta' }]);
    const [a, cap, b, reset] = h.el.children;
    expect(h.el.children).toHaveLength(4);
    expect(a.tagName).toBe('BUTTON');
    expect(a.type).toBe('button');
    expect(a.className).toBe('rc-legend-item');
    expect(a.dataset.key).toBe('a');
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(cap.tagName).toBe('DIV');
    expect(cap.className).toBe('rc-legend-item');
    expect(cap.hasAttribute('data-key')).toBe(false);
    expect(cap.hasAttribute('aria-pressed')).toBe(false);
    expect(b.dataset.key).toBe('b');
    expect(reset.className).toBe('rc-legend-reset');
    for (const [node, text] of [[a, 'Alpha'], [cap, 'Recession'], [b, 'Beta']]) {
      expect(node.children).toHaveLength(2);
      expect(node.lastElementChild.tagName).toBe('SPAN');
      expect(node.lastElementChild.textContent).toBe(text);
      expect(node.firstElementChild.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('marks pick the swatch class; the colour is --rc-swatch-color, never an inline background', () => {
    const h = host([
      { key: 'l', color: '#123456' },
      { key: 'd', color: '#00aa00', mark: 'dashed' },
      { key: 'o', color: 'red', mark: 'dot' },
      { key: 'n', color: 'rgb(1, 2, 3)', mark: 'band' },
      { key: 'u', mark: 'nonsense' },
    ]);
    const sw = key => item(h, key).firstElementChild;
    expect(sw('l').className).toBe('rc-legend-line');
    expect(sw('d').className).toBe('rc-legend-line rc-legend-line--dashed');
    expect(sw('o').className).toBe('rc-legend-dot');
    expect(sw('n').className).toBe('rc-legend-band');
    expect(sw('u').className).toBe('rc-legend-line');
    expect(sw('l').style.getPropertyValue('--rc-swatch-color')).toBe('#123456');
    expect(sw('d').style.getPropertyValue('--rc-swatch-color')).toBe('#00aa00');
    expect(sw('o').style.getPropertyValue('--rc-swatch-color')).toBe('red');
    expect(sw('n').style.getPropertyValue('--rc-swatch-color')).toBe('rgb(1, 2, 3)');
    // no colour: no property, so the CSS falls back to currentColor
    expect(sw('u').hasAttribute('style')).toBe(false);
    for (const key of ['l', 'd', 'o', 'n']) {
      expect(sw(key).style.background).toBe('');
      expect(sw(key).style.backgroundColor).toBe('');
      expect(sw(key).style.backgroundImage).toBe('');
    }
  });

  it('a dashed swatch keeps its own first dash pair; the default 5/3 writes nothing', () => {
    const h = host([
      { key: 'def', mark: 'dashed' },
      { key: 'same', mark: 'dashed', dash: [5, 3] },
      { key: 'pair', mark: 'dashed', dash: [6, 5] },
      { key: 'str', mark: 'dashed', dash: '4 2 1 2' },
      { key: 'comma', mark: 'dashed', dash: '7,1' },
      { key: 'one', mark: 'dashed', dash: 4 },
      { key: 'named', mark: 'dashed', dash: 'dotted' },
      { key: 'solid', mark: 'dashed', dash: 'solid' },
      { key: 'empty', mark: 'dashed', dash: [] },
      { key: 'line', dash: [6, 5] },
    ]);
    const dash = key => {
      const st = item(h, key).firstElementChild.style;
      return [st.getPropertyValue('--rc-swatch-dash'), st.getPropertyValue('--rc-swatch-gap')];
    };
    expect(dash('def')).toEqual(['', '']);
    expect(dash('same')).toEqual(['', '']);
    expect(dash('pair')).toEqual(['6px', '5px']);
    expect(dash('str')).toEqual(['4px', '2px']);
    expect(dash('comma')).toEqual(['7px', '1px']);
    expect(dash('one')).toEqual(['4px', '4px']);
    expect(dash('named')).toEqual(['2px', '3px']);       // resolveStrokeDash('dotted') = '2,3'
    expect(dash('solid')).toEqual(['', '']);             // no pair: the default
    expect(dash('empty')).toEqual(['', '']);
    expect(dash('line')).toEqual(['', '']);              // a dash means nothing on a solid line
  });

  it('the RC-053 marks are inline svg glyphs: a node shape at 12×12, the width wedge at 16×12', () => {
    const h = host([
      { label: 'wallet', mark: 'shape', shape: 'circle', color: '#666' },
      { label: 'exchange', mark: 'shape', shape: 'diamond' },
      { label: 'crowd', mark: 'shape', shape: 'stack' },
      { label: 'custom', mark: 'shape', shape: 'M-10,-10L10,10z', radius: 10 },
      { label: 'amount', mark: 'width', color: '#666' },
    ]);
    const glyphs = [...h.el.children].map(n => n.firstElementChild);
    glyphs.forEach(g => {
      expect(g.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(g.tagName.toLowerCase()).toBe('svg');
      expect(g.getAttribute('height')).toBe('12');
      expect(g.getAttribute('aria-hidden')).toBe('true');
      expect(g.hasAttribute('class')).toBe(false);
    });
    expect(glyphs.map(g => g.getAttribute('width'))).toEqual(['12', '12', '12', '12', '16']);
    expect(glyphs[0].getAttribute('viewBox')).toBe('-22 -22 44 44');
    expect(glyphs[0].innerHTML).toBe('<circle r="18"></circle>');
    expect(glyphs[0].style.getPropertyValue('--rc-swatch-color')).toBe('#666');
    expect(glyphs[1].innerHTML).toBe('<path d="M0,-21L21,0L0,21L-21,0z"></path>');
    expect(glyphs[2].querySelectorAll('circle')).toHaveLength(2);
    // a custom path keeps its own scale: the viewBox follows the node radius
    expect(glyphs[3].getAttribute('viewBox')).toBe('-14 -14 28 28');
    expect(glyphs[3].innerHTML).toBe('<path d="M-10,-10L10,10z"></path>');
    expect(glyphs[4].hasAttribute('viewBox')).toBe(false);
    expect(glyphs[4].innerHTML).toBe('<path d="M0,5L16,2L16,10L0,7Z"></path>');
    expect(glyphs[4].style.getPropertyValue('--rc-swatch-color')).toBe('#666');
  });

  it('a swatch that changes mark is swapped in place; a colour change rewrites only the colour', () => {
    const h = host([{ key: 'a', color: 'red' }]);
    const a = item(h, 'a');
    h.defs = [{ key: 'a', color: 'blue', mark: 'dot' }];
    h.render();
    expect(item(h, 'a')).toBe(a);
    expect(a.firstElementChild.className).toBe('rc-legend-dot');
    expect(a.firstElementChild.style.getPropertyValue('--rc-swatch-color')).toBe('blue');
    h.defs = [{ key: 'a', mark: 'shape', shape: 'square' }];
    h.render();
    expect(a.children).toHaveLength(2);
    expect(a.firstElementChild.tagName.toLowerCase()).toBe('svg');
    expect(a.firstElementChild.innerHTML).toContain('<rect');
    expect(a.lastElementChild.textContent).toBe('a');
    h.defs = [{ key: 'a', color: 'red', mark: 'band' }];
    h.render();
    expect(a.children).toHaveLength(2);
    expect(a.firstElementChild.className).toBe('rc-legend-band');
  });

  it('labelStyle styles the label span; the label falls back to the key', () => {
    const h = host([{ key: 'a' }, { key: 'b', label: 'Beta' }], { opts: { labelStyle: { color: '#000000', fontStyle: 'italic' } } });
    const label = item(h, 'a').lastElementChild;
    expect(label.textContent).toBe('a');
    expect(label.style.color).toBe('rgb(0, 0, 0)');
    expect(label.style.fontStyle).toBe('italic');
    h.opts = { labelStyle: { color: '#ffffff' } };
    h.render();
    expect(label.style.color).toBe('rgb(255, 255, 255)');
    expect(label.style.fontStyle).toBe('');
    h.opts = {};
    h.render();
    expect(label.style.color).toBe('');
    // Show all's text is never styled
    expect(resetOf(h).firstElementChild.hasAttribute('style')).toBe(false);
  });

  it('aria-pressed follows on', () => {
    const h = host(ABC, { hidden: ['b'] });
    expect(item(h, 'a').getAttribute('aria-pressed')).toBe('true');
    expect(item(h, 'b').getAttribute('aria-pressed')).toBe('false');
    h.hidden = new Set(['a']);
    h.render();
    expect(shown(h)).toEqual(['b', 'c']);
  });
});

// ─── Gestures ────────────────────────────────────────────────────────────────

describe('gestures (decision 3)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('detail 0 (Enter, Space, a screen reader, element.click()) toggles at once, both ways', () => {
    const h = host(ABC);
    click(item(h, 'b'), 0);
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'b', visibleKeys: ['a', 'c'], replaces: false }]);
    expect(shown(h)).toEqual(['a', 'c']);
    item(h, 'b').click();                         // jsdom's click() has detail 0
    expect(h.calls[1]).toEqual({ kind: 'toggle', key: 'b', visibleKeys: ['a', 'b', 'c'], replaces: false });
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(2);
  });

  it('a pointer click that shows acts at once', () => {
    const h = host(ABC, { hidden: ['c'] });
    click(item(h, 'c'));
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'c', visibleKeys: ['a', 'b', 'c'], replaces: false }]);
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(1);
  });

  it('a pointer click that hides waits HIDE_DELAY_MS, with no onToggle before', () => {
    expect(HIDE_DELAY_MS).toBe(250);
    const h = host(ABC);
    click(item(h, 'a'));
    vi.advanceTimersByTime(HIDE_DELAY_MS - 1);
    expect(h.calls).toEqual([]);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
    vi.advanceTimersByTime(1);
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'a', visibleKeys: ['b', 'c'], replaces: false }]);
    expect(shown(h)).toEqual(['b', 'c']);
  });

  it('a double click on a shown item isolates it in one commit, and it never hides', () => {
    const h = host(ABC);
    const renders = h.renders;
    doubleClick(item(h, 'b'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'isolate', key: 'b', visibleKeys: ['b'], replaces: false }]);
    expect(h.renders - renders).toBe(1);
    expect(shown(h)).toEqual(['b']);
  });

  it('a double click on a hidden item: a show at once, then an isolate that replaces it', () => {
    const h = host(ABC, { hidden: ['b', 'c'] });
    doubleClick(item(h, 'c'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([
      { kind: 'toggle', key: 'c', visibleKeys: ['a', 'c'], replaces: false },
      { kind: 'isolate', key: 'c', visibleKeys: ['c'], replaces: true },
    ]);
    expect(shown(h)).toEqual(['c']);
  });

  it('a double click with nothing shown keeps only that item (computed from before the first click)', () => {
    const h = host(ABC, { hidden: ['a', 'b', 'c'] });
    doubleClick(item(h, 'b'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([
      { kind: 'toggle', key: 'b', visibleKeys: ['b'], replaces: false },
      { kind: 'isolate', key: 'b', visibleKeys: ['b'], replaces: true },
    ]);
    expect(shown(h)).toEqual(['b']);
  });

  it('a double click on the only visible item restores all, with no hide', () => {
    const h = host(ABC, { hidden: ['a', 'c'] });
    doubleClick(item(h, 'b'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'restore', key: 'b', visibleKeys: ['a', 'b', 'c'], replaces: false }]);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
  });

  it('a double click slower than the delay (inside the OS interval) still ends right', () => {
    const h = host(ABC);
    click(item(h, 'a'), 1);
    vi.advanceTimersByTime(HIDE_DELAY_MS + 50);
    click(item(h, 'a'), 2);
    dblclick(item(h, 'a'));
    expect(h.calls).toEqual([
      { kind: 'toggle', key: 'a', visibleKeys: ['b', 'c'], replaces: false },
      { kind: 'isolate', key: 'a', visibleKeys: ['a'], replaces: true },
    ]);
  });

  it('detail 2 on another item is a single click; detail 3 is ignored', () => {
    const h = host(ABC);
    click(item(h, 'a'), 1);                 // a pending hide of a
    click(item(h, 'b'), 2);                 // not a's double: a commits, b pends
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'a', visibleKeys: ['b', 'c'], replaces: false }]);
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(h.calls[1]).toEqual({ kind: 'toggle', key: 'b', visibleKeys: ['c'], replaces: false });
    click(item(h, 'c'), 3);
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(2);
    expect(shown(h)).toEqual(['c']);
  });

  it('a pending hide commits when another item is clicked', () => {
    const h = host(ABC, { hidden: ['c'] });
    click(item(h, 'a'));
    click(item(h, 'c'));
    expect(h.calls).toEqual([
      { kind: 'toggle', key: 'a', visibleKeys: ['b'], replaces: false },
      { kind: 'toggle', key: 'c', visibleKeys: ['b', 'c'], replaces: false },
    ]);
    // so does a keyboard toggle
    click(item(h, 'b'));
    click(item(h, 'c'), 0);
    expect(h.calls.slice(2)).toEqual([
      { kind: 'toggle', key: 'b', visibleKeys: ['c'], replaces: false },
      { kind: 'toggle', key: 'c', visibleKeys: [], replaces: false },
    ]);
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(4);
  });

  it('two quick single clicks on one item cancel out', () => {
    const h = host(ABC);
    click(item(h, 'a'), 1);
    click(item(h, 'a'), 1);                 // the engine did not count it as a double
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([]);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
  });

  it('the dblclick fallback pairs the last two clicks (an engine that does not count detail)', () => {
    // from all shown: isolate, in one commit
    let h = host(ABC);
    click(item(h, 'a'), 1); click(item(h, 'a'), 1); dblclick(item(h, 'a'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'isolate', key: 'a', visibleKeys: ['a'], replaces: false }]);
    // from only it shown: restore, with no hide
    h = host(ABC, { hidden: ['b', 'c'] });
    click(item(h, 'a'), 1); click(item(h, 'a'), 1); dblclick(item(h, 'a'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'restore', key: 'a', visibleKeys: ['a', 'b', 'c'], replaces: false }]);
    // from nothing shown: the first click shows it, the double isolates it
    h = host(ABC, { hidden: ['a', 'b', 'c'] });
    click(item(h, 'a'), 1); click(item(h, 'a'), 1); dblclick(item(h, 'a'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([
      { kind: 'toggle', key: 'a', visibleKeys: ['a'], replaces: false },
      { kind: 'isolate', key: 'a', visibleKeys: ['a'], replaces: true },
    ]);
    expect(shown(h)).toEqual(['a']);
    // a lone click, then dblclick
    h = host(ABC);
    click(item(h, 'b'), 1); dblclick(item(h, 'b'));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'isolate', key: 'b', visibleKeys: ['b'], replaces: false }]);
    // a dblclick on an item the last click was not on does nothing
    h = host(ABC);
    click(item(h, 'b'), 0); dblclick(item(h, 'c'));
    expect(h.calls).toHaveLength(1);
  });

  it('the pair is the last two clicks, not an older click on the same item', () => {
    const h = host(ABC, { hidden: ['b', 'c'] });
    click(item(h, 'b'), 1);                 // an old show of b, from a alone
    vi.advanceTimersByTime(5000);
    h.hidden = new Set(['a', 'c']);         // a setter leaves b alone
    h.render();
    click(item(h, 'b'), 1);                 // a new pair: b pends a hide…
    click(item(h, 'b'), 1);                 // …cancelled by its second click
    dblclick(item(h, 'b'));                 // from b alone: restore (from a alone it would isolate)
    vi.advanceTimersByTime(1000);
    expect(h.calls.map(c => c.kind)).toEqual(['toggle', 'restore']);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
  });

  it('after a detail-2 double click, the dblclick that follows does nothing', () => {
    const h = host(ABC);
    click(item(h, 'a'), 1); click(item(h, 'a'), 2);
    expect(h.calls).toHaveLength(1);
    dblclick(item(h, 'a'));
    click(item(h, 'a'), 3);
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(1);
    expect(shown(h)).toEqual(['a']);
  });

  it('Show all commits showAll and cancels a pending hide', () => {
    const h = host(ABC, { hidden: ['c'] });
    click(item(h, 'a'));
    click(resetOf(h));
    vi.advanceTimersByTime(1000);
    expect(h.calls).toEqual([{ kind: 'showAll', key: null, visibleKeys: ['a', 'b', 'c'], replaces: false }]);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
    expect(resetOf(h).hidden).toBe(true);
  });

  it('the state is written at once, even when the caller has not re-rendered (Graph ego re-queries)', () => {
    const h = host(ABC, { rerender: false });
    click(item(h, 'b'), 0);
    expect(shown(h)).toEqual(['a', 'c']);
    expect(resetOf(h).hidden).toBe(false);
    // the next gesture reads the state just written
    click(item(h, 'a'), 0);
    expect(h.calls[1].visibleKeys).toEqual(['c']);
    click(resetOf(h), 0);
    expect(shown(h)).toEqual(['a', 'b', 'c']);
    expect(resetOf(h).hidden).toBe(true);
    expect(h.renders).toBe(1);
  });

  it('a pending hide survives a re-render, and is dropped when its item leaves or turns static', () => {
    const h = host(ABC);
    click(item(h, 'a'));
    h.render();                              // a resize frame
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'a', visibleKeys: ['b', 'c'], replaces: false }]);
    click(item(h, 'b'));
    h.defs = ABC.filter(d => d.key !== 'b');
    h.render();                              // setData without b
    expect(vi.getTimerCount()).toBe(0);      // its timer is gone with it
    click(item(h, 'c'));
    h.opts = { interactive: false };
    h.render();
    vi.advanceTimersByTime(1000);
    expect(h.calls).toHaveLength(1);
  });

  it('a click whose item leaves while the pending hide it flushes commits does nothing more', () => {
    for (const detail of [0, 1]) {
      const h = host(ABC);
      h.onCommit = info => { if (info.key === 'a') h.defs = ABC.filter(d => d.key !== 'c'); };
      click(item(h, 'a'));
      click(item(h, 'c'), detail);          // flushes a's hide; the caller drops c
      vi.advanceTimersByTime(1000);
      expect(h.calls.map(c => c.key)).toEqual(['a']);
    }
  });

  it('a pending hide does nothing when its item was hidden meanwhile (a setter)', () => {
    const h = host(ABC);
    click(item(h, 'a'));
    h.hidden = new Set(['a']);
    h.render();
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(h.calls).toEqual([]);
    expect(shown(h)).toEqual(['b', 'c']);
  });

  it('a click that reaches no button of the legend does nothing, even inside a page button', () => {
    const outer = document.createElement('button');
    outer.dataset.key = 'a';
    document.body.appendChild(outer);
    const h = host([{ key: 'a' }, { label: 'cap' }]);
    outer.appendChild(h.el);
    click(h.el.children[1].lastElementChild, 0);
    click(h.el, 0);
    dblclick(h.el.children[1]);
    expect(h.calls).toEqual([]);
  });

  it('a click between items or on a static item does nothing; one on a toggle\'s swatch or label is the toggle\'s', () => {
    const h = host([{ key: 'a' }, { label: 'cap' }]);
    click(h.el, 1);
    click(h.el.children[1], 0);
    click(h.el.children[1].lastElementChild, 1);
    // a click on the swatch or label inside a toggle is the toggle's
    click(item(h, 'a').lastElementChild, 0);
    expect(h.calls).toEqual([{ kind: 'toggle', key: 'a', visibleKeys: [], replaces: false }]);
  });
});

// ─── Show all ────────────────────────────────────────────────────────────────

describe('Show all (decision 11)', () => {
  it('exists while the legend holds a toggle, as the last child; hidden while nothing is off', () => {
    const h = host(ABC);
    expect(h.el.lastElementChild).toBe(resetOf(h));
    expect(resetOf(h).tagName).toBe('BUTTON');
    expect(resetOf(h).type).toBe('button');
    expect(resetOf(h).hidden).toBe(true);
    expect(resetOf(h).hasAttribute('aria-pressed')).toBe(false);
    expect(resetOf(h).classList.contains('rc-legend-item')).toBe(false);
    expect(resetOf(h).innerHTML).toBe('<span>Show all</span>');
    // a legend with no toggle has none
    const caption = host([{ label: 'Revenue, millions USD' }]);
    expect(resetOf(caption)).toBeNull();
  });

  it('shows when a toggle is off, or when the chart hides something the legend does not list', () => {
    const h = host(ABC, { hidden: ['b'] });
    expect(resetOf(h).hidden).toBe(false);
    const unlisted = host(ABC, { hidden: ['not-listed'] });
    expect(shown(unlisted)).toEqual(['a', 'b', 'c']);
    expect(resetOf(unlisted).hidden).toBe(false);
    // an off toggle shows it even when the caller passes no anyHidden
    const el = document.createElement('div');
    renderLegendItems(el, [{ key: 'a' }, { key: 'b', on: false }]);
    expect(el.querySelector('.rc-legend-reset').hidden).toBe(false);
    renderLegendItems(el, [{ key: 'a' }, { key: 'b' }]);
    expect(el.querySelector('.rc-legend-reset').hidden).toBe(true);
  });

  it('keeps its element across renders', () => {
    const h = host(ABC);
    const reset = resetOf(h);
    h.hidden = new Set(['a']);
    h.render();
    expect(resetOf(h)).toBe(reset);
    expect(reset.hidden).toBe(false);
  });
});

// ─── The keyed join and focus (decision 12) ──────────────────────────────────

describe('the keyed join and focus (decision 12)', () => {
  it('a re-render keeps element identity: toggles by key, labels by position', () => {
    const h = host([{ key: 'a' }, { label: 'one' }, { key: 'b' }, { label: 'two' }]);
    const [a, one, b, two] = h.el.children;
    h.defs = [{ key: 'b' }, { label: 'uno' }, { key: 'a' }, { key: 'c' }, { label: 'dos' }];
    h.render();
    const kids = [...h.el.children];
    expect(kids.slice(0, 5)).toEqual([b, one, a, item(h, 'c'), two]);
    expect(one.lastElementChild.textContent).toBe('uno');
    expect(two.lastElementChild.textContent).toBe('dos');
  });

  it('an element is replaced only when it switches between toggle and label', () => {
    const h = host(ABC);
    const [a, b] = [item(h, 'a'), item(h, 'b')];
    h.defs = [{ key: 'a' }, { label: 'b' }, { key: 'c' }];
    h.render();
    expect(item(h, 'a')).toBe(a);
    expect(h.el.children[1].tagName).toBe('DIV');
    expect(b.isConnected).toBe(false);
  });

  it('a focused toggle keeps focus through a re-render that moves it', () => {
    const h = host(ABC);
    const c = item(h, 'c');
    c.focus();
    h.defs = [ABC[2], ABC[0], ABC[1]];
    h.render();
    expect(h.el.firstElementChild).toBe(c);
    expect(document.activeElement).toBe(c);
  });

  it('when the focused toggle goes or turns static: the toggle before it, then the one after, then the group', () => {
    const h = host([{ key: 'a' }, { label: 'cap' }, { key: 'b' }, { key: 'c' }]);
    item(h, 'c').focus();
    h.defs = [{ key: 'a' }, { label: 'cap' }, { key: 'b' }, { label: 'c' }];   // c made static
    h.render();
    expect(document.activeElement).toBe(item(h, 'b'));
    item(h, 'a').focus();
    h.defs = [{ label: 'cap' }, { key: 'b' }, { label: 'c' }];                  // a removed: none before it
    h.render();
    expect(document.activeElement).toBe(item(h, 'b'));                          // past the label
    expect(h.el.hasAttribute('tabindex')).toBe(false);
    h.defs = [{ label: 'cap' }, { label: 'c' }];                                 // no toggle left
    h.render();
    expect(document.activeElement).toBe(h.el);
    expect(h.el.getAttribute('tabindex')).toBe('-1');
  });

  it('Show all activated from the keyboard hands focus to the toggle before it', () => {
    const h = host([{ key: 'a' }, { key: 'b' }, { label: 'note' }], { hidden: ['a'] });
    resetOf(h).focus();
    click(resetOf(h), 0);
    expect(resetOf(h).hidden).toBe(true);
    expect(document.activeElement).toBe(item(h, 'b'));
    // the same when the caller has not re-rendered yet
    const g = host([{ key: 'a' }, { key: 'b' }], { hidden: ['b'], rerender: false });
    resetOf(g).focus();
    click(resetOf(g), 0);
    expect(document.activeElement).toBe(item(g, 'b'));
  });

  it('Show all hidden by a re-render while focused hands focus back too', () => {
    const h = host(ABC, { hidden: ['a'] });
    resetOf(h).focus();
    h.hidden.clear();                         // a setter
    h.render();
    expect(document.activeElement).toBe(item(h, 'c'));
  });

  it('a redraw with focus outside the legend leaves it there', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const h = host(ABC);
    outside.focus();
    h.defs = [{ label: 'cap' }];
    h.render();
    expect(document.activeElement).toBe(outside);
    expect(h.el.hasAttribute('tabindex')).toBe(false);
  });

  it('children the builder did not make are removed', () => {
    const el = document.createElement('div');
    el.innerHTML = '<div class="rc-legend-item"><span class="rc-legend-line" style="background: red"></span><span>Old</span></div>text';
    document.body.appendChild(el);
    const old = el.firstElementChild;
    renderLegendItems(el, [{ label: 'New' }]);
    expect(el.childNodes).toHaveLength(1);
    expect(el.firstElementChild).not.toBe(old);
    expect(el.textContent).toBe('New');
  });
});

// ─── Static legends, aliases, duplicates ────────────────────────────────────

describe('interactive: false, aliases, duplicate keys', () => {
  it('interactive: false draws labels only: no button, no Show all, no group; keyed labels keep data-key', () => {
    const h = host(ABC, { hidden: ['b'], opts: { interactive: false } });
    expect(h.el.querySelectorAll('button')).toHaveLength(0);
    expect([...h.el.children].map(n => n.tagName)).toEqual(['DIV', 'DIV', 'DIV']);
    expect([...h.el.children].map(n => n.dataset.key)).toEqual(['a', 'b', 'c']);
    expect(h.el.querySelector('[aria-pressed]')).toBeNull();
    expect(h.el.hasAttribute('role')).toBe(false);
    click(h.el.children[0], 0);
    click(h.el.children[0], 1);
    expect(h.calls).toEqual([]);
  });

  it('turning interactive on and off swaps toggles and labels', () => {
    const h = host(ABC);
    const a = item(h, 'a');
    h.opts = { interactive: false };
    h.render();
    expect(h.el.querySelectorAll('button')).toHaveLength(0);
    expect(h.el.hasAttribute('role')).toBe(false);
    expect(h.el.hasAttribute('aria-label')).toBe(false);
    h.opts = {};
    h.render();
    expect(item(h, 'a').tagName).toBe('BUTTON');
    expect(item(h, 'a')).not.toBe(a);
    expect(h.el.getAttribute('role')).toBe('group');
  });

  it('aliases: alias.item on every item, item.alias in its place, data-type beside data-key, alias.reset on Show all', () => {
    const h = host([
      { label: 'Wallet', mark: 'dot', alias: 'rc-flow-legend-group' },
      { key: 'transfer', label: 'Transfer' },
      { label: 'Path', key: null },
      { label: 'Key row', mark: 'width', alias: '' },
    ], { opts: { alias: { item: 'rc-graph-legend-item', reset: 'rc-graph-legend-reset', dataType: true } } });
    const [group, toggle, label, key] = h.el.children;
    expect(group.className).toBe('rc-legend-item rc-flow-legend-group');
    expect(toggle.className).toBe('rc-legend-item rc-graph-legend-item');
    expect(toggle.dataset.type).toBe('transfer');
    expect(toggle.dataset.key).toBe('transfer');
    expect(label.className).toBe('rc-legend-item rc-graph-legend-item');
    expect(label.hasAttribute('data-type')).toBe(false);
    expect(key.className).toBe('rc-legend-item');
    expect(resetOf(h).className).toBe('rc-legend-reset rc-graph-legend-reset');
    // without the option: no data-type
    const plain = host(ABC);
    expect(plain.el.querySelector('[data-type]')).toBeNull();
    // a static legend keeps data-type on keyed labels (the Graph path view)
    const path = host(ABC, { opts: { interactive: false, alias: { item: 'rc-graph-legend-item', dataType: true } } });
    expect([...path.el.children].map(n => n.dataset.type)).toEqual(['a', 'b', 'c']);
  });

  it('a repeated key: the first item is the toggle, the later ones labels', () => {
    const h = host([{ key: 'a', label: 'A' }, { key: 'a', label: 'A again' }, { key: 'b' }]);
    const [first, again] = h.el.children;
    expect(first.tagName).toBe('BUTTON');
    expect(again.tagName).toBe('DIV');
    expect(again.hasAttribute('data-key')).toBe(false);
    expect(again.lastElementChild.textContent).toBe('A again');
    expect(h.el.querySelectorAll('[data-key="a"]')).toHaveLength(1);
  });
});

// ─── The group's attributes; writes ─────────────────────────────────────────

describe('the group and its writes', () => {
  it('role="group" and aria-label="Legend" only while the legend holds a toggle', () => {
    const h = host(ABC);
    expect(h.el.getAttribute('role')).toBe('group');
    expect(h.el.getAttribute('aria-label')).toBe('Legend');
    h.defs = [{ label: 'cap' }];
    h.render();
    expect(h.el.hasAttribute('role')).toBe(false);
    expect(h.el.hasAttribute('aria-label')).toBe(false);
    const caption = host([{ label: 'cap' }]);
    expect(caption.el.getAttributeNames()).toEqual(['class']);
  });

  it('aria-busy follows busy', () => {
    const h = host(ABC, { opts: { busy: true } });
    expect(h.el.getAttribute('aria-busy')).toBe('true');
    h.opts = { busy: false };
    h.render();
    expect(h.el.hasAttribute('aria-busy')).toBe(false);
  });

  it('a re-render with nothing changed writes nothing', () => {
    const defs = [
      { key: 'a', label: 'Alpha', color: '#123456' },
      { key: 'b', label: 'Beta', color: '#654321', mark: 'dashed', dash: [6, 5] },
      { label: 'cap', mark: 'band', color: 'red' },
      { label: 'wallet', mark: 'shape', shape: 'stack' },
      { label: 'amount', mark: 'width' },
    ];
    const opts = { labelStyle: { color: '#000000' }, alias: { item: 'x-alias', reset: 'x-reset', dataType: true }, busy: true };
    const h = host(defs, { hidden: ['b'], opts });
    item(h, 'a').focus();
    const observer = new MutationObserver(() => {});
    observer.observe(h.el, { subtree: true, childList: true, attributes: true, characterData: true });
    // jsdom records no mutation for a style property set to the value it
    // has: count those writes too
    const proto = Object.getPrototypeOf(h.el.style);
    const set = vi.spyOn(proto, 'setProperty');
    const remove = vi.spyOn(proto, 'removeProperty');
    h.defs = defs.map(d => ({ ...d }));
    h.opts = { ...opts, labelStyle: { ...opts.labelStyle }, alias: { ...opts.alias } };
    h.render();
    expect(observer.takeRecords()).toEqual([]);
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(item(h, 'a'));
    // a change writes only itself
    h.defs = defs.map(d => (d.key === 'a' ? { ...d, color: '#000001' } : d));
    h.render();
    const records = observer.takeRecords();
    observer.disconnect();
    expect(records.map(r => [r.type, r.attributeName, r.target.className])).toEqual([['attributes', 'style', 'rc-legend-line']]);
  });
});
