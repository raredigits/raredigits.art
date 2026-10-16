// Dated size baseline for Rare Styles (CSS-339).
//
//   node scripts/size-report.mjs <git-ref|--working> <label>   print one table row
//   node scripts/size-report.mjs --check                      recompute every row of
//                                                              SIZE-BASELINE.md that names
//                                                              a git ref; fail on mismatch
//
// Settings (fixed so rows stay comparable): bytes exclude the trailing
// `/*# sourceMappingURL=… */` comment; gzip = Node zlib default (level 6);
// Brotli = Node zlib default (quality 11, window 22). Local measurements of
// the files, not transferred CDN sizes and not speed evidence.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import postcss from 'postcss';

const TABLE = resolve('assets/css/docs/SIZE-BASELINE.md');

function source(ref) {
  const working = ref === '--working';
  const read = (p) => (working ? readFileSync(resolve(p)) : execFileSync('git', ['show', `${ref}:${p}`], { maxBuffer: 1 << 28 }));
  const tree = (dir) => {
    if (working) {
      const out = [];
      const walk = (d) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else out.push({ path: p, size: statSync(p).size });
        }
      };
      walk(resolve(dir));
      return out;
    }
    return execFileSync('git', ['ls-tree', '-r', '-l', ref, dir], { encoding: 'utf8', maxBuffer: 1 << 26 })
      .split('\n').filter(Boolean)
      .map((l) => { const m = l.match(/^\S+ blob \S+\s+(\d+)\t(.+)$/); return { path: m[2], size: +m[1] }; });
  };
  return { read, tree };
}

const strip = (buf) => Buffer.from(buf.toString('utf8').replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*$/, ''));
const sizes = (buf) => ({ raw: buf.length, gzip: gzipSync(buf).length, br: brotliCompressSync(buf).length });

export function measure(ref) {
  const { read, tree } = source(ref);
  const min = sizes(strip(read('assets/css/rare.min.css')));
  const readable = sizes(strip(read('assets/css/rare.css')));
  const root = postcss.parse(read('assets/css/rare.min.css').toString('utf8'));
  let rules = 0; let selectors = 0; let media = 0;
  root.walkRules((r) => {
    if (r.parent.type === 'atrule' && /keyframes$/.test(r.parent.name)) return;
    rules++; selectors += r.selectors.length;
  });
  root.walkAtRules('media', () => { media++; });
  const files = tree('assets/css');
  const group = (re) => {
    const g = files.filter((f) => re.test(f.path.replace(/\\/g, '/')));
    return { n: g.length, bytes: g.reduce((s, f) => s + f.size, 0) };
  };
  return {
    min, readable, rules, selectors, media,
    fonts: group(/assets\/css\/fonts\/.+\.woff2$/),
    icons: group(/assets\/css\/images\/icons\/.+\.svg$/),
    images: group(/assets\/css\/images\/(?!icons\/).+\.(svg|png|jpe?g|webp|avif|gif)$/),
  };
}

const n = (x) => x.toLocaleString('en-US');
export const row = (date, label, ref, m) =>
  `| ${date} | ${label} | ${ref === '--working' ? 'working tree' : `\`${ref}\``} | ${n(m.min.raw)} | ${n(m.min.gzip)} | ${n(m.min.br)} | ${n(m.readable.raw)} | ${n(m.readable.gzip)} | ${n(m.readable.br)} | ${n(m.rules)} | ${n(m.selectors)} | ${n(m.media)} | ${m.fonts.n} / ${n(m.fonts.bytes)} | ${m.icons.n} / ${n(m.icons.bytes)} | ${m.images.n} / ${n(m.images.bytes)} |`;

// Rows of the table that name a git ref (`abc1234` in the Source column).
export function recordedRows() {
  return readFileSync(TABLE, 'utf8').split('\n')
    .filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l))
    .map((l) => { const c = l.split('|').map((s) => s.trim()); return { line: l, date: c[1], label: c[2], ref: (c[3].match(/^`([0-9a-f]{7,40})`$/) || [])[1] }; })
    .filter((r) => r.ref);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve('scripts/size-report.mjs');
if (isMain) {
  const [, , a, b] = process.argv;
  if (a === '--check') {
    let bad = 0;
    for (const r of recordedRows()) {
      const expected = row(r.date, r.label, r.ref, measure(r.ref));
      if (expected !== r.line) { bad++; console.error(`MISMATCH ${r.label}\n  table:    ${r.line}\n  computed: ${expected}`); }
      else console.log(`ok ${r.label} (${r.ref})`);
    }
    process.exit(bad ? 1 : 0);
  } else if (a && b) {
    console.log(row(new Date().toISOString().slice(0, 10), b, a, measure(a)));
  } else {
    console.error('usage: node scripts/size-report.mjs <git-ref|--working> <label> | --check');
    process.exit(1);
  }
}
