// The icon set is listed in three places that have to agree: the SVG files
// (the source of truth, `_data/icons.js` reads them), the `$icons` mirror that
// generates the classes, and the `ICONS` list of the fetch script. The docs
// page sorts the glyphs into groups (`_data/iconGroups.js`, CSS-418).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const shipped = require('../_data/icons.js');
const groups = require('../_data/iconGroups.js');
// Paths from the repository root, where vitest runs.
const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');
const DIR = 'assets/css/images/icons';

describe('icon set', () => {
  it('the $icons mirror names the shipped glyphs, no more and no less', () => {
    const scss = read('assets/css/modules/decorations/_icons.scss');
    const list = scss.match(/\$icons: \(([\s\S]*?)\);/)[1];
    const names = [...list.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(names.sort()).toEqual([...shipped].sort());
  });

  it('the fetch script lists the shipped glyphs', () => {
    const script = read('scripts/fetch-icons.py');
    const icons = script.match(/ICONS = \[([\s\S]*?)\n\]/)[1];
    const variants = script.match(/VARIANTS = \{([\s\S]*?)\n\}/)[1];
    const names = [
      ...[...icons.matchAll(/^\s+"([a-z0-9_]+)",/gm)].map((m) => m[1]),
      ...[...variants.matchAll(/^\s+"([a-z0-9_]+)": \{/gm)].map((m) => m[1]),
    ];
    expect(names.sort()).toEqual([...shipped].sort());
  });

  it('every glyph ships both weights', () => {
    for (const name of shipped) {
      expect(() => read(`${DIR}/${name}-200.svg`), name).not.toThrow();
    }
  });

  it('no two glyphs are the same drawing (CSS-417)', () => {
    const seen = new Map();
    const same = [];
    for (const name of shipped) {
      const hash = createHash('md5').update(read(`${DIR}/${name}-400.svg`)).digest('hex');
      if (seen.has(hash)) same.push(`${seen.get(hash)} = ${name}`);
      seen.set(hash, name);
    }
    expect(same).toEqual([]);
  });
});

describe('icon groups of /styles/icons/', () => {
  const all = groups.flatMap((group) => group.icons.map((icon) => icon.name));

  it('every shipped glyph is in exactly one named group', () => {
    expect(groups.map((group) => group.id)).not.toContain('other');
    expect([...all].sort()).toEqual([...shipped].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it('search words are lowercase words', () => {
    for (const group of groups) {
      for (const icon of group.icons) expect(icon.words, icon.name).toMatch(/^[a-z0-9 ]*$/);
    }
  });
});

// CSS-419: the first-screen glyphs travel inside the stylesheet.
describe('inlined glyphs', () => {
  const INLINE = ['menu-400', 'close-400', 'search-400', 'content_copy-400', 'check-400', 'check-200', 'refresh-400'];

  it('the build step inlines exactly this list', () => {
    const script = read('scripts/inline-icons.mjs');
    const list = script.match(/INLINE_ICONS = \[(.*?)\]/)[1];
    expect([...list.matchAll(/'([a-z0-9_-]+)'/g)].map((m) => m[1])).toEqual(INLINE);
  });

  for (const artifact of ['assets/css/rare.css', 'assets/css/rare.min.css']) {
    it(`${artifact} asks for no file of an inlined glyph and carries its drawing`, () => {
      const css = read(artifact);
      for (const name of INLINE) {
        expect(css, name).not.toContain(`images/icons/${name}.svg`);
        const path = read(`${DIR}/${name}.svg`).match(/ d="([^"]+)"/)[1];
        expect(css, name).toContain(path);
      }
      // a glyph outside the list is still a file
      expect(css).toContain('images/icons/download-400.svg');
    });
  }
});
