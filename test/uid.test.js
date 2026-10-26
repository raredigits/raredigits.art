import { describe, it, expect } from 'vitest';
import { uid } from '../assets/charts/src/core/utils.js';

// uid() names every <defs> element a chart draws (C-04): unique on the page,
// and usable both in url(#…) and as a CSS selector.
describe('uid', () => {
  it('never returns the same id twice', () => {
    const ids = Array.from({ length: 50 }, () => uid('rc'));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is <prefix>-<4-char salt>-<counter>, the salt shared by one bundle', () => {
    const a = uid('rc'), b = uid('rc');
    expect(a).toMatch(/^rc-[0-9a-z]{4}-\d+$/);
    expect(b).toMatch(/^rc-[0-9a-z]{4}-\d+$/);
    expect(a.split('-')[1]).toBe(b.split('-')[1]);
    expect(+b.split('-')[2]).toBe(+a.split('-')[2] + 1);
  });

  it("defaults the prefix to 'rc' and keeps the one it is given", () => {
    expect(uid()).toMatch(/^rc-/);
    expect(uid('ov')).toMatch(/^ov-[0-9a-z]{4}-\d+$/);
  });

  it('is a valid CSS id selector, also with a role suffix', () => {
    const id = uid('rc');
    expect(() => document.querySelector(`#${id}`)).not.toThrow();
    expect(() => document.querySelector(`#${id}-arrow-0 path`)).not.toThrow();
  });
});
