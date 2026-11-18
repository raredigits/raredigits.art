// The panel family on the compiled CSS and the site sources (v0.7.2).
//
//   CSS-181   `.card-dashboard-bordered` / `.card-row-bordered(-item)` are
//             removed with no alias: no selector ships them, and the site
//             migrated in lockstep (CSS-183a) — no page, template or fixture
//             uses them in a class attribute. The site layer
//             (rare-website.css, harvested in CSS-371) names them nowhere.
//   CSS-180   a panel is safe on the same element as a RareCharts chart: its
//             layout sits at zero specificity and it never sets the
//             properties the chart owns (gap, overflow, position, container,
//             alignment of the chart's parts). Its padding has class
//             specificity: the reset at the end of rare.scss is
//             zero-specificity too and would erase it. A panel is a block
//             (the drop-in for `.card-dashboard-bordered`, CSS-181); only a
//             panel with parts is a flex column.
//   CSS-183a  the site's chart frames follow one recipe: the panel on the
//             chart element itself, never a panel around a lone chart (the
//             chart's labels run into the padding of the element it draws
//             in; around an unpadded chart they are clipped); and no colour
//             utility on the frame of a light-theme chart (the `black-bg` that
//             a `.card` background used to hide came alive on the transparent
//             panel).
// Real-browser proof: test/browser/panels.test.js.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postcss from 'postcss';

const ROOT = process.cwd();
const GATE = /:where\(\.rd, \.rd \*\)/g;
const strip = (s) => s.replace(GATE, '').trim();
const REMOVED = ['card-dashboard-bordered', 'card-row-bordered', 'card-row-bordered-item'];

let root;
beforeAll(() => {
  root = postcss.parse(readFileSync(resolve(ROOT, 'assets/css/rare.css'), 'utf8'));
});

describe('CSS-181: the old names are gone', () => {
  it.each(['rare.css', 'rare.min.css', 'rare-website.css'])('no selector in %s names them', (file) => {
    const css = readFileSync(resolve(ROOT, 'assets/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const found = REMOVED.filter((name) => new RegExp(`\\.${name}(?![\\w-])`).test(css));
    expect(found).toEqual([]);
  });

  it('no site source uses them in a class attribute (CSS-183a)', () => {
    // Everything the site renders or tests; the history files (Changelog,
    // MIGRATION, the API snapshots) and internal docs keep the old names.
    const DIRS = ['_includes', '_layouts', '_posts', '_drafts', 'kb', 'pricing', 'charts', 'styles', 'examples', 'scripts', 'manifesto', 'legal', 'search', 'test/browser/fixtures', 'test/fixtures'];
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(md|html|njk|js)$/.test(name)) files.push(p);
      }
    };
    for (const d of DIRS) walk(resolve(ROOT, d));
    walk(resolve(ROOT, 'assets/charts/examples'));
    files.push(resolve(ROOT, 'index.html'));
    const classAttr = /class(?:Name)?\s*=\s*["'`]([^"'`]*)["'`]/g;
    const hits = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(classAttr)) {
        const used = m[1].split(/\s+/).filter((c) => REMOVED.includes(c));
        if (used.length) hits.push(`${f.slice(ROOT.length + 1)}: ${used.join(' ')}`);
      }
    }
    expect(files.length).toBeGreaterThan(100);
    expect(hits).toEqual([]);
  });
});

describe('CSS-180: a panel is safe on a chart element', () => {
  // Rules whose selector is the panel itself (`.panel`, `:where(.panel)`,
  // `:where(.panel:has(> parts))`), in any media query.
  const WITH_PARTS = /^:where\(\.panel:has\(.+\)\)$/;
  const panelRules = () => {
    const out = [];
    root.walkRules((r) => {
      const own = r.selectors.map(strip).filter((s) => s === '.panel' || s === ':where(.panel)' || WITH_PARTS.test(s));
      if (own.length) out.push({ selectors: own, decls: r.nodes.filter((n) => n.type === 'decl').map((d) => d.prop) });
    });
    return out;
  };

  it('never sets what the chart owns', () => {
    const OWNED = ['gap', 'row-gap', 'column-gap', 'overflow', 'overflow-x', 'overflow-y', 'position', 'container', 'container-type', 'container-name', 'align-items', 'justify-content'];
    const rules = panelRules();
    expect(rules.length).toBeGreaterThan(1);
    expect(rules.flatMap((r) => r.decls.filter((p) => OWNED.includes(p)))).toEqual([]);
  });

  it('its layout sits at zero specificity, its padding at class specificity', () => {
    const rules = panelRules();
    const where = rules.filter((r) => r.selectors.includes(':where(.panel)')).flatMap((r) => r.decls);
    const parts = rules.filter((r) => r.selectors.some((s) => WITH_PARTS.test(s))).flatMap((r) => r.decls);
    const cls = rules.filter((r) => r.selectors.includes('.panel')).flatMap((r) => r.decls);
    // A block by default — the drop-in for `.card-dashboard-bordered`:
    // mixed inline content stays on one line, paragraph margins collapse.
    expect(where).not.toContain('display');
    expect(parts).toEqual(expect.arrayContaining(['display', 'flex-direction']));
    expect([...where, ...parts]).not.toContain('padding');
    expect(cls).toContain('padding');
    expect(cls).not.toContain('display');
  });
});

describe('CSS-183a: the site\'s chart frames', () => {
  const DIRS = ['charts', 'examples', '_posts', '_drafts', 'kb', 'pricing', 'styles', '_includes', '_layouts'];
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|html|njk)$/.test(name)) pages.push(p);
    }
  };
  beforeAll(() => { for (const d of DIRS) walk(resolve(ROOT, d)); });
  const classes = (attrs) => (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/);

  it('a single chart\'s frame is the chart element itself, not a panel around it', () => {
    // `<div class="panel …"><div id="chart"></div></div>` leaves the chart
    // unpadded: RareCharts' axis and slice labels that run past its drawing
    // are clipped by `.rc-chart { overflow: hidden }` ($100,000 on
    // /charts/bar/ by 11px). A panel wraps a chart only with more around it.
    const hits = [];
    for (const f of pages) {
      for (const m of readFileSync(f, 'utf8').matchAll(/<div\b([^>]*)>\s*<div id="[^"]+"[^>]*>\s*<\/div>\s*<\/div>/g)) {
        if (classes(m[1]).includes('panel')) hits.push(`${f.slice(ROOT.length + 1)}: ${m[0].replace(/\s+/g, ' ')}`);
      }
    }
    expect(pages.length).toBeGreaterThan(50);
    expect(hits).toEqual([]);
  });

  it('no colour utility on the frame of a light-theme chart', () => {
    // A `.card` background used to hide `black-bg` on the /charts/ hero frame;
    // the transparent panel let it through, black on the light theme's black
    // text. A `-bg` utility on a frame is fine only for a darkTheme chart.
    const hits = [];
    let checked = 0;
    for (const f of pages) {
      const src = readFileSync(f, 'utf8');
      const scripts = [...src.matchAll(/<script src="\/(assets\/charts\/examples\/[^"]+)"/g)]
        .map((m) => readFileSync(resolve(ROOT, m[1]), 'utf8'));
      for (const m of src.matchAll(/<div\b([^>]*)>/g)) {
        const cls = classes(m[1]);
        if (!cls.includes('panel')) continue;
        checked++;
        const bg = cls.filter((c) => /-bg$/.test(c));
        if (!bg.length) continue;
        // the chart is the panel itself, or the first element inside it
        const id = m[1].match(/\bid="([^"]+)"/)?.[1] ?? src.slice(m.index + m[0].length).match(/\bid="([^"]+)"/)?.[1];
        const script = scripts.find((js) => js.includes(`'#${id}'`) || js.includes(`"#${id}"`));
        if (!script || !/\bdarkTheme\b/.test(script)) hits.push(`${f.slice(ROOT.length + 1)}: #${id} ${bg.join(' ')}`);
      }
    }
    expect(checked).toBeGreaterThan(30);
    expect(hits).toEqual([]);
  });
});
