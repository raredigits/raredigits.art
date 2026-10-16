// The /styles/usage/ customization example uses only real library API
// (CSS-347, v0.7.0 bug closure). The quick start once overrode tokens and
// classes that do not exist (`--color-primary`, `--font-heading`, `.btn`),
// so copying it changed nothing. This keeps the example honest.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

let example; // postcss root of the ```css block
let tokens; // custom properties declared on the library's :root
let libClasses; // every class name the library styles
let libFonts; // font families the library ships via @font-face

beforeAll(() => {
  const blocks = [...read('styles/usage/index.md').matchAll(/```css\n([\s\S]*?)```/g)].map((m) => m[1]);
  expect(blocks.length).toBe(1);
  example = postcss.parse(blocks[0]);

  const lib = postcss.parse(read('assets/css/rare.css'));
  tokens = new Set();
  libClasses = new Set();
  libFonts = new Set();
  lib.walkRules((r) => {
    if (r.selector === ':root') r.walkDecls(/^--/, (d) => tokens.add(d.prop));
    selectorParser((s) => s.walkClasses((c) => { libClasses.add(c.value); })).processSync(r.selector);
  });
  lib.walkAtRules('font-face', (a) => a.walkDecls('font-family', (d) => libFonts.add(d.value.replace(/['"]/g, ''))));
});

describe('CSS-347: /styles/usage/ example', () => {
  it('overrides only tokens the library declares (own tokens are --my-*)', () => {
    const unknown = [];
    example.walkRules(':root', (r) => r.walkDecls(/^--/, (d) => {
      if (!tokens.has(d.prop) && !d.prop.startsWith('--my-')) unknown.push(d.prop);
    }));
    expect(unknown).toEqual([]);
  });

  it('every own token is actually used by the example', () => {
    const own = [];
    example.walkDecls(/^--my-/, (d) => own.push(d.prop));
    const text = example.toString();
    for (const t of own) expect(text).toContain(`var(${t})`);
  });

  it('variants extend existing library components', () => {
    const bad = [];
    example.walkRules((r) => {
      if (r.selector === ':root') return;
      selectorParser((s) => s.each((sel) => {
        const first = sel.nodes.find((n) => n.type === 'class');
        if (!first || !libClasses.has(first.value)) bad.push(String(sel).trim());
      })).processSync(r.selector);
    });
    expect(bad).toEqual([]);
  });

  it('a font named in a font token is shipped by the library or loaded by the example', () => {
    const loaded = new Set(libFonts);
    example.walkAtRules('font-face', (a) => a.walkDecls('font-family', (d) => loaded.add(d.value.replace(/['"]/g, ''))));
    const missing = [];
    example.walkDecls(/^--(heading|primary|code|script)-font$/, (d) => {
      const family = d.value.split(',')[0].trim().replace(/['"]/g, '');
      if (!loaded.has(family)) missing.push(family);
    });
    expect(missing).toEqual([]);
  });
});
