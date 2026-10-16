// rd-gate PostCSS plugin (CSS-343) — selector rewriting and config guards.
// The hostile-host rendering proof is CSS-338; this covers the transform.
import { describe, it, expect } from 'vitest';
import postcss from 'postcss';
import rdGate, { classify } from '../scripts/rd-gate.mjs';

const run = (css, opts) => postcss([rdGate(opts)]).process(css, { from: undefined });
const gated = async (css, opts) => (await run(css, opts)).css;

describe('rd-gate: island gate', () => {
  it('appends :where(.rd, .rd *) to the last compound', async () => {
    expect(await gated('.card a { color: red }')).toBe('.card a:where(.rd, .rd *) { color: red }');
    expect(await gated('.button { x: 1 }')).toBe('.button:where(.rd, .rd *) { x: 1 }');
  });

  it('inserts before pseudo-elements, after pseudo-classes', async () => {
    expect(await gated('.x:hover::before { x: 1 }')).toBe('.x:hover:where(.rd, .rd *)::before { x: 1 }');
    expect(await gated('.x:after { x: 1 }')).toBe('.x:where(.rd, .rd *):after { x: 1 }');
    expect(await gated('::-webkit-file-upload-button { x: 1 }'))
      .toBe(':where(.rd, .rd *)::-webkit-file-upload-button { x: 1 }');
  });

  it('gates every selector of a list and inside @media', async () => {
    expect(await gated('@media (max-width: 768px) { .a, .b > p { x: 1 } }'))
      .toBe('@media (max-width: 768px) { .a:where(.rd, .rd *), .b > p:where(.rd, .rd *) { x: 1 } }');
  });

  it('uses the compact form for the minified build', async () => {
    expect(await gated('.a{x:1}', { compact: true })).toBe('.a:where(.rd,.rd *){x:1}');
  });
});

describe('rd-gate: page gate', () => {
  it('gates html and body on the element itself', async () => {
    expect(await gated('html { x: 1 }')).toBe('html:where(.rd) { x: 1 }');
    expect(await gated('body { x: 1 }')).toBe('body:where(.rd, html.rd > *) { x: 1 }');
  });

  it('scopes shell regions under the page root', async () => {
    expect(await gated('header { x: 1 }')).toBe(':where(html.rd, body.rd) header { x: 1 }');
    expect(await gated('footer a:hover::before { x: 1 }'))
      .toBe(':where(html.rd, body.rd) footer a:hover::before { x: 1 }');
  });
});

describe('rd-gate: ungated', () => {
  it('leaves tokens, font-face and icon compounds alone', async () => {
    const css = ':root { --a: 1 } @font-face { font-family: X } .rd-icon-check::before { x: 1 } [class*=rd-icon-].rd-is-copied::before { x: 1 }';
    expect(await gated(css)).toBe(css);
  });

  it('gates an icon selector that sits in a component context', () => {
    expect(classify('.remark [class*=rd-icon-]')).toBe('island');
  });

  it('leaves selectors that already name .rd', () => {
    expect(classify('html.rd.rd-layout-longread main')).toBe('ungated');
    expect(classify('.rd-layout-longread main')).toBe('island');
  });
});

describe('rd-gate: inventory guards', () => {
  it('fails the build on an unclassified bare-element selector', async () => {
    await expect(run('aside { x: 1 }')).rejects.toThrow(/aside/);
  });

  it('classifies whitespace-insensitively (expanded vs compressed)', () => {
    expect(classify('article > :is(h2, h3):first-child')).toBe('island');
    expect(classify('article>:is(h2,h3):first-child')).toBe('island');
    expect(classify('nav  a')).toBe('page');
  });

  it('reports stats', async () => {
    const r = await run('html{x:1} p{x:1} .a{x:1} :root{--a:1}');
    expect(r.messages.find((m) => m.type === 'rd-gate-stats').stats)
      .toEqual({ island: 2, page: 1, ungated: 1 });
  });
});
