// Reduced-motion policy (CSS-112, v0.7.0 bug closure): every transition or
// animation in the shipped CSS runs only under
// `@media (prefers-reduced-motion: no-preference)` (the `bp.motion-safe`
// mixin), so a user who asked for reduced motion gets the end state at once.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';

const MOTION = /^(transition|animation)(-|$)/;
const NO_MOTION = /^(none|0s?)$/;

describe('CSS-112: motion only without a reduced-motion preference', () => {
  it.each(['rare.css', 'rare.min.css'])('%s', (file) => {
    const root = postcss.parse(readFileSync(resolve(process.cwd(), 'assets/css', file), 'utf8'));
    const unguarded = [];
    let guarded = 0;
    root.walkDecls(MOTION, (d) => {
      if (NO_MOTION.test(d.value.trim())) return;
      let ok = false;
      for (let p = d.parent; p; p = p.parent) {
        if (p.type === 'atrule' && p.name === 'media' && /prefers-reduced-motion:\s*no-preference/.test(p.params)) ok = true;
      }
      if (ok) guarded++;
      else unguarded.push(`${d.parent.selector} { ${d.prop}: ${d.value} }`);
    });
    expect(unguarded).toEqual([]);
    expect(guarded).toBeGreaterThanOrEqual(6);
  });
});
