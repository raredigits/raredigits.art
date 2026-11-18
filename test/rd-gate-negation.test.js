// rd-gate (CSS-343): a class, attribute or id inside `:not()` excludes
// elements and does not scope a rule, so the selector stays in the
// hand-reviewed inventory under its key, the selector without its `:not()`
// parts (v0.7.2 review, CSS-100). The gated output does not change.
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import rdGate, { classify, inventoryKey } from '../scripts/rd-gate.mjs';

const run = (css) => postcss([rdGate()]).process(css, { from: undefined });
const none = { page: [], island: [] };

describe('rd-gate: the inventory key drops the exclusions', () => {
  it('leaves a selector without :not() as it is (normalized)', () => {
    expect(inventoryKey('article > :is(h2, h3, h4):first-child')).toBe('article>:is(h2,h3,h4):first-child');
    expect(inventoryKey('nav  a:hover')).toBe('nav a:hover');
  });

  it('drops :not() wherever it sits, and a :where() / :is() it empties', () => {
    expect(inventoryKey('button:not(:where(.rc-chart *))')).toBe('button');
    expect(inventoryKey('button:not(:where(.rc-chart *)):where(:hover:not(:disabled, [aria-busy="true"]))'))
      .toBe('button:where(:hover)');
    expect(inventoryKey('select:not(:where(.rc-chart *)):where(:not([multiple], [size]))')).toBe('select');
    expect(inventoryKey('article :is(p, ul, ol):not(:where(.panel, .stat) *)')).toBe('article :is(p,ul,ol)');
    expect(inventoryKey('textarea:not(:where(.rc-chart *))::placeholder')).toBe('textarea::placeholder');
  });

  it('is the same key whatever the exclusion list holds', () => {
    expect(inventoryKey('dl:not(:where(.panel) *)')).toBe(inventoryKey('dl:not(:where(.panel, .stat, .rc-chart) *)'));
  });

  it('keeps an emptied compound as `*`, never merging it into its neighbour', () => {
    expect(inventoryKey('article :not(.lead)')).toBe('article *');
    expect(inventoryKey(':not(.lead) > p')).toBe('*>p');
  });
});

describe('rd-gate: exclusions do not make a class context', () => {
  it('a bare element with only exclusions needs an inventory entry', () => {
    expect(classify('aside:not(.wide)', none)).toBe(null);
    expect(classify('aside:not(.wide)', { page: [], island: ['aside'] })).toBe('island');
    expect(classify('aside:not(.wide)', { page: ['aside'], island: [] })).toBe('page');
  });

  it('a class, attribute or id that scopes the rule still makes a class context', () => {
    expect(classify('.card a:not(.button)', none)).toBe('island');
    expect(classify('input:not(:where(.rc-chart *)):where([type="text"])', none)).toBe('island');
    expect(classify('button:where(:disabled, [aria-disabled="true"])', none)).toBe('island');
  });

  it('fails the build on an unlisted one and names its key', async () => {
    await expect(run('aside:not(.wide) { x: 1 }')).rejects.toThrow(/aside \(from aside:not\(\.wide\)\)/);
  });

  it('gates a listed one exactly as before', async () => {
    const r = await run('button:not(:where(.rc-chart *)) { x: 1 }');
    expect(r.css).toBe('button:not(:where(.rc-chart *)):where(.rd, .rd *) { x: 1 }');
  });
});
