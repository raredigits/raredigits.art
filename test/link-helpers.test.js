import { describe, it, expect, beforeEach, vi } from 'vitest';
import { linkValue, linkWeight, groupTies } from '../assets/charts/src/core/links.js';
import { foldGraph } from '../assets/charts/src/graph/views/flowFold.js';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';

// The shared link readers (D-06): a tie's amount, its strength, and the
// grouping of ties that are one in a view. Every relation chart reads through
// them; the last two blocks pin the callers whose rules differ.

describe('linkValue — a tie\'s amount', () => {
  it('reads `value` as a number: numbers as given, numeric strings parsed', () => {
    expect(linkValue({ value: 12 })).toBe(12);
    expect(linkValue({ value: 0.25 })).toBe(0.25);
    expect(linkValue({ value: '12' })).toBe(12);
    expect(linkValue({ value: ' 3.5 ' })).toBe(3.5);
    expect(linkValue({ value: '1e3' })).toBe(1000);
  });

  it('zero is an amount, not a missing one', () => {
    expect(linkValue({ value: 0 })).toBe(0);
    expect(linkValue({ value: '0' })).toBe(0);
  });

  it('null when there is no amount: missing, null, undefined, empty string', () => {
    expect(linkValue({})).toBe(null);
    expect(linkValue({ value: null })).toBe(null);
    expect(linkValue({ value: undefined })).toBe(null);
    expect(linkValue({ value: '' })).toBe(null);
  });

  it('null for anything that is not a finite number', () => {
    expect(linkValue({ value: 'abc' })).toBe(null);
    expect(linkValue({ value: '12px' })).toBe(null);
    expect(linkValue({ value: NaN })).toBe(null);
    expect(linkValue({ value: Infinity })).toBe(null);
    expect(linkValue({ value: -Infinity })).toBe(null);
    expect(linkValue({ value: 'Infinity' })).toBe(null);
  });

  it('floors at 0 by default: a negative amount reads as 0', () => {
    expect(linkValue({ value: -5 })).toBe(0);
    expect(linkValue({ value: '-5' })).toBe(0);
  });

  it('min: -Infinity keeps the sign; another min is a floor', () => {
    expect(linkValue({ value: -5 }, { min: -Infinity })).toBe(-5);
    expect(linkValue({ value: '-2.5' }, { min: -Infinity })).toBe(-2.5);
    expect(linkValue({ value: 7 }, { min: -Infinity })).toBe(7);
    expect(linkValue({ value: 'x' }, { min: -Infinity })).toBe(null);
    expect(linkValue({ value: 0.5 }, { min: 1 })).toBe(1);
    expect(linkValue({ value: 3 }, { min: 1 })).toBe(3);
  });

  it('`by` names another field or is an accessor', () => {
    expect(linkValue({ value: 1, usd: '40' }, { by: 'usd' })).toBe(40);
    expect(linkValue({ value: 1 }, { by: 'usd' })).toBe(null);
    expect(linkValue({ amount: { usd: -3 } }, { by: l => l.amount.usd })).toBe(0);
    expect(linkValue({ amount: { usd: '' } }, { by: l => l.amount.usd })).toBe(null);
  });

  it('a missing link has no amount (sparse arrays in the width scale)', () => {
    expect(linkValue(null)).toBe(null);
    expect(linkValue(undefined)).toBe(null);
  });
});

describe('linkWeight — a tie\'s strength', () => {
  it('weight first, then the legacy `strength`, then 0.5', () => {
    expect(linkWeight({ weight: 0.9, strength: 0.1 })).toBe(0.9);
    expect(linkWeight({ strength: 0.1 })).toBe(0.1);
    expect(linkWeight({})).toBe(0.5);
  });

  it('a zero weight is a weight; only null and undefined fall through', () => {
    expect(linkWeight({ weight: 0, strength: 0.7 })).toBe(0);
    expect(linkWeight({ weight: null, strength: 0.7 })).toBe(0.7);
    expect(linkWeight({ weight: undefined, strength: null })).toBe(0.5);
  });

  it('takes its own fallback (community detection counts an unweighted edge as 1)', () => {
    expect(linkWeight({}, 1)).toBe(1);
    expect(linkWeight({ strength: 0.2 }, 1)).toBe(0.2);
  });

  it('returns the value as given, not parsed', () => {
    expect(linkWeight({ weight: '0.8' })).toBe('0.8');
    expect(linkWeight({ strength: 'x' })).toBe('x');
  });
});

describe('groupTies — ties that are one in a view', () => {
  const ab = (type, extra = {}) => ({ source: 'a', target: 'b', ...(type === undefined ? {} : { type }), ...extra });

  it('one group per ordered pair and category, members in input order', () => {
    const l1 = ab('x', { n: 1 }), l2 = ab('x', { n: 2 }), l3 = ab('y'), l4 = { source: 'b', target: 'a', type: 'x' };
    const out = groupTies([l1, l3, l2, l4]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ key: JSON.stringify(['a', 'b', 'x']), source: 'a', target: 'b', links: [l1, l2] });
    expect(out[1].links).toEqual([l3]);
    expect(out[2]).toMatchObject({ source: 'b', target: 'a', links: [l4] });   // direction counts
  });

  it('a group stands where its first member stood', () => {
    const out = groupTies([ab('x'), ab('y'), ab('x'), ab('z'), ab('y')]);
    expect(out.map(g => JSON.parse(g.key)[2])).toEqual(['x', 'y', 'z']);
    expect(out.map(g => g.links.length)).toEqual([2, 2, 1]);
  });

  it("default category: the type as a string, 'default' when absent", () => {
    const out = groupTies([ab(), ab('default'), ab(null), ab(1), ab('1')]);
    expect(out).toHaveLength(2);
    expect(out[0].key).toBe(JSON.stringify(['a', 'b', 'default']));
    expect(out[0].links).toHaveLength(3);
    expect(out[1].key).toBe(JSON.stringify(['a', 'b', '1']));
  });

  it('tie() re-points the ends and picks the category; the group takes the ends from it', () => {
    const l1 = { source: 'p1', target: 'out', type: 'x' }, l2 = { source: 'p2', target: 'out', type: 'x' };
    const out = groupTies([l1, l2], { tie: l => ['fold', l.target, l.type.toUpperCase()] });
    expect(out).toEqual([{ key: JSON.stringify(['fold', 'out', 'X']), source: 'fold', target: 'out', links: [l1, l2] }]);
  });

  it('tie() → null leaves a link apart, as itself, in its place', () => {
    const keep = ab('x', { keep: true });
    const out = groupTies([ab('x'), keep, ab('x'), keep], { tie: l => (l.keep ? null : [l.source, l.target, l.type]) });
    expect(out).toHaveLength(3);
    expect(out[0].links).toHaveLength(2);
    expect(out[1]).toBe(keep);
    expect(out[2]).toBe(keep);
  });

  it('the key is unambiguous whatever the ids and categories contain (R-20)', () => {
    const out = groupTies([
      { source: 'a', target: 'b→c', type: 'x' },
      { source: 'a→b', target: 'c', type: 'x' },
      { source: 'a|b', target: 'c', type: 'x' },
      { source: 'a', target: 'b|c', type: 'x' },
      { source: 'a', target: 'b', type: 'x","y' },
      { source: 'a', target: 'b","x', type: 'y' },
    ]);
    expect(out).toHaveLength(6);
  });

  it('onRepeat(link, group) runs for every later member, in input order, never for a first one', () => {
    const l1 = ab('x'), l2 = ab('y'), l3 = ab('y'), l4 = ab('x'), l5 = ab('x');
    const calls = [];
    const out = groupTies([l1, l2, l3, l4, l5], {
      onRepeat: (l, g) => calls.push([l, g, g.links.length]),
    });
    expect(calls.map(c => c[0])).toEqual([l3, l4, l5]);
    expect(calls[0][1]).toBe(out[1]);
    expect(calls[1][1]).toBe(out[0]);
    expect(calls.map(c => c[2])).toEqual([2, 2, 3]);   // the link has joined when it runs
  });

  it('no links, no groups', () => {
    expect(groupTies([])).toEqual([]);
    expect(groupTies(null)).toEqual([]);
    expect(groupTies(undefined)).toEqual([]);
  });
});

// The callers whose rules differ from the defaults keep them.

describe('Sankey reads values and repeats through the helpers, with its own rules', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });
  const bands = () => [...host.querySelectorAll('.rc-sankey-link')].map(b => b.getAttribute('aria-label'));

  it('a band needs a positive finite value; a numeric string counts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData({ links: [
      { source: 'a', target: 'b', value: ' 7 ' },
      { source: 'a', target: 'c', value: '' },
      { source: 'a', target: 'd', value: null },
      { source: 'a', target: 'e' },
      { source: 'a', target: 'f', value: -5 },
      { source: 'a', target: 'g', value: Infinity },
      { source: 'a', target: 'h', value: 0 },
    ] });
    expect(bands()).toEqual(['a → b: 7']);
    expect(host.querySelectorAll('.rc-sankey-node')).toHaveLength(2);   // a dropped flow names no node
    expect(warn).toHaveBeenCalledTimes(6);
    warn.mockRestore();
  });

  it("sums a repeated pair and type, warning per repeat in input order; untyped and 'default' stay apart", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData({ links: [
      { source: 'a', target: 'b', value: 1 },
      { source: 'a', target: 'c', value: 1, type: 't' },
      { source: 'a', target: 'c', value: 2, type: 't' },
      { source: 'a', target: 'b', value: 2 },
      { source: 'a', target: 'b', value: 4, type: 'default' },
      { source: 'a', target: 'b', value: 3 },
    ] });
    expect(bands()).toEqual(['a → b: 6', 'a → c: 3', 'a → b: 4']);
    expect(warn.mock.calls.map(c => c[0])).toEqual([
      'RareCharts.Sankey: repeated link a → c (t) — values summed',
      'RareCharts.Sankey: repeated link a → b — values summed',
      'RareCharts.Sankey: repeated link a → b — values summed',
    ]);
    warn.mockRestore();
  });
});

describe('foldGraph merges through groupTies and sums signed values', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }];

  it('a negative value subtracts; one that does not parse is left out; none at all is null', () => {
    const ties = [
      { id: '1', source: 'a', target: 'b', value: -2 },
      { id: '2', source: 'a', target: 'b', value: '5' },
      { id: '3', source: 'a', target: 'b', value: 'x' },
      { id: '4', source: 'a', target: 'b', value: '' },
    ];
    const [agg] = foldGraph({ nodes, links: ties }, [], new Set(), { aggregate: true }).links;
    expect(agg.value).toBe(3);
    expect(agg.id).toBe(`agg:${JSON.stringify(['a', 'b', 'default'])}`);
    const none = ties.slice(2);
    expect(foldGraph({ nodes, links: none }, [], new Set(), { aggregate: true }).links[0].value).toBe(null);
  });

  it('without aggregate, untouched ties pass through as themselves, in place', () => {
    const ties = [
      { id: '1', source: 'a', target: 'b', value: 1 },
      { id: '2', source: 'a', target: 'b', value: 2 },
    ];
    expect(foldGraph({ nodes, links: ties }, [], new Set()).links).toEqual(ties);
  });
});
