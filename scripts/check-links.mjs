// Internal link check for the built site (CSS-363).
//
//   npx @11ty/eleventy && node scripts/check-links.mjs
//
// Walks every page in _site/ and checks each same-site `href`/`src`: the
// target file must exist, and a `#fragment` must match an `id` (or `a[name]`)
// on the target page. External URLs are not fetched. Exits 1 on any problem
// outside the documented exceptions below.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const SITE = resolve('_site');

// Known, tracked exceptions. Each one names the task that removes it.
const EXCEPTIONS = [
  { from: '/old/', reason: 'legacy page kept for reference; not linked from the site' },
];

function pages(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'pagefind' ? [] : pages(p);
    return f.endsWith('.html') ? [p] : [];
  });
}

const urlOf = (file) => '/' + relative(SITE, file).split('\\').join('/').replace(/index\.html$/, '');

function targetFile(path) {
  let p = join(SITE, decodeURIComponent(path));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  return existsSync(p) ? p : null;
}

export function checkLinks() {
  const files = pages(SITE);
  const docs = new Map(files.map((f) => [f, new JSDOM(readFileSync(f, 'utf8')).window.document]));
  const ids = new Map([...docs].map(([f, d]) => [f, new Set([...d.querySelectorAll('[id]')].map((e) => e.id)
    .concat([...d.querySelectorAll('a[name]')].map((e) => e.name)))]));
  const problems = [];
  const excused = [];
  for (const [file, doc] of docs) {
    const here = urlOf(file);
    for (const el of doc.querySelectorAll('a[href], link[href], img[src], script[src], source[src]')) {
      const raw = el.getAttribute('href') ?? el.getAttribute('src');
      if (!raw || /^(https?:|mailto:|tel:|data:|javascript:|\{\{|\/\/)/.test(raw)) continue;
      const [pathPart, frag] = raw.split('#');
      const abs = pathPart === ''
        ? here
        : pathPart.startsWith('/') ? pathPart.split('?')[0] : posix.join(posix.dirname(here + 'x'), pathPart.split('?')[0]);
      const target = targetFile(abs);
      let problem = null;
      let anchor = false;
      if (!target) problem = `${raw} → missing ${abs}`;
      else if (frag && !ids.get(target)?.has(decodeURIComponent(frag))) { problem = `${raw} → no #${frag} on ${urlOf(target)}`; anchor = true; }
      if (!problem) continue;
      const ex = EXCEPTIONS.find((e) => here.startsWith(e.from) && (!e.anchorsOnly || anchor));
      (ex ? excused : problems).push(`${here}: ${problem}${ex ? `  [${ex.reason}]` : ''}`);
    }
  }
  return { pages: files.length, problems, excused };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve('scripts/check-links.mjs');
if (isMain) {
  const { pages: n, problems, excused } = checkLinks();
  for (const p of problems) console.error(`✖ ${p}`);
  console.log(`${n} pages checked: ${problems.length} broken, ${excused.length} known exceptions`);
  process.exit(problems.length ? 1 : 0);
}
