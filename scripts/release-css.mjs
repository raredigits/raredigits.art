// Rare Styles release tooling (CSS-348): one validated artifact, built once,
// published as is. Used by .github/workflows/release-css.yml and runnable
// locally for a dry run.
//
//   node scripts/release-css.mjs check                 version + changelog consistency
//   node scripts/release-css.mjs stage <dir>           clean staging + MANIFEST.json,
//                                                      asset and source-map checks
//   node scripts/release-css.mjs verify-tree <dir> <tree>  <tree> holds exactly the artifact
//   node scripts/release-css.mjs verify-cdn <dir>      pinned jsDelivr bytes == staged
//                                                      bytes (retries while the CDN warms)
//
// Version sources: `_data/versions.js` → `styles` (e.g. `v0.7.0`, patches
// `v0.7.0_1`), `package.json` → `version` (the base, `0.7.0`), and a
// `## [v0.7.0] — YYYY-MM-DD — …` entry in `assets/css/docs/Changelog.md`.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const CSS = resolve('assets/css');

// What a release ships. Everything else under assets/css (maintainer docs,
// site-only CSS, examples) stays in raredigits.art.
export const RELEASE_FILES = [
  'rare.css', 'rare.css.map', 'rare.min.css', 'rare.min.css.map',
  'rare.scss', 'modules', 'vendor', 'fonts', 'images',
  'docs/Changelog.md', 'docs/MIGRATION.md', 'docs/SCRIPTS_CONTRACT.md', 'docs/api',
];
// Files that live only in the rare-styles repository; publishing keeps them.
export const PUBLISH_KEEP = ['.git', 'LICENSE', 'README.md', '.nojekyll'];

export function versions() {
  const styles = require(resolve('_data/versions.js')).styles;
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
  return { styles, pkg };
}

export function check() {
  const { styles, pkg } = versions();
  const errors = [];
  const m = /^v(\d+\.\d+\.\d+)(?:_(\d+))?$/.exec(styles);
  if (!m) errors.push(`_data/versions.js styles "${styles}" is not vX.Y.Z or vX.Y.Z_N`);
  else if (m[1] !== pkg) errors.push(`package.json version "${pkg}" ≠ base of ${styles} ("${m[1]}")`);
  const log = readFileSync(join(CSS, 'docs/Changelog.md'), 'utf8');
  if (!log.split('\n').some((l) => l.startsWith(`## [${styles}] — `))) {
    errors.push(`assets/css/docs/Changelog.md has no "## [${styles}] — YYYY-MM-DD — …" entry`);
  }
  return { version: styles, errors };
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function files(dir, base = dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, base) : [relative(base, p)];
  });
}

export function stage(out, { version = versions().styles } = {}) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of RELEASE_FILES) {
    const src = join(CSS, f);
    if (!existsSync(src)) throw new Error(`release file missing: assets/css/${f}`);
    mkdirSync(dirname(join(out, f)), { recursive: true });
    cpSync(src, join(out, f), { recursive: true });
  }
  const problems = [];
  // every url() in the shipped CSS resolves inside the artifact
  for (const css of ['rare.css', 'rare.min.css']) {
    postcss.parse(readFileSync(join(out, css), 'utf8')).walkDecls((d) => {
      for (const u of d.value.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        const ref = u[1];
        if (/^(data:|https?:|#)/.test(ref)) continue;
        if (!existsSync(join(out, ref.split(/[?#]/)[0]))) problems.push(`${css}: url(${ref}) not in artifact`);
      }
    });
  }
  // every relative link in the shipped Markdown resolves inside the artifact
  // (rare-styles and the self-hosting archive have no maintainer docs)
  for (const md of files(out).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(out, md), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const ref = m[1].split('#')[0];
      if (!ref || /^(https?:|mailto:|\/)/.test(ref)) continue;
      if (!existsSync(join(out, dirname(md), ref))) problems.push(`${md}: link ${m[1]} not in artifact`);
    }
  }
  // every source a map points to ships too (devtools resolve them)
  for (const map of ['rare.css.map', 'rare.min.css.map']) {
    for (const s of JSON.parse(readFileSync(join(out, map), 'utf8')).sources) {
      if (!existsSync(join(out, s))) problems.push(`${map}: source ${s} not in artifact`);
    }
  }
  const manifest = {
    name: 'rare-styles',
    version,
    files: Object.fromEntries(files(out).sort().map((f) => {
      const buf = readFileSync(join(out, f));
      return [f.split('\\').join('/'), { bytes: buf.length, sha256: sha256(buf) }];
    })),
  };
  writeFileSync(join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, problems };
}

// A published tree (e.g. the rare-styles checkout at an existing tag) holds
// exactly the verified artifact: every manifest file present with the same
// sha256, and no other file outside the repository-only ones.
export function verifyTree(artifactDir, treeDir, { keep = PUBLISH_KEEP } = {}) {
  const manifest = JSON.parse(readFileSync(join(artifactDir, 'MANIFEST.json'), 'utf8'));
  const problems = [];
  for (const [f, { sha256: want }] of Object.entries(manifest.files)) {
    const p = join(treeDir, f);
    if (!existsSync(p)) problems.push(`missing ${f}`);
    else if (sha256(readFileSync(p)) !== want) problems.push(`differs ${f}`);
  }
  const listed = new Set([...Object.keys(manifest.files), 'MANIFEST.json']);
  for (const f of files(treeDir).map((x) => x.split('\\').join('/'))) {
    if (keep.some((k) => f === k || f.startsWith(`${k}/`))) continue;
    if (!listed.has(f)) problems.push(`extra ${f}`);
  }
  return { version: manifest.version, problems };
}

export async function verifyCdn(dir, { attempts = 10, waitMs = 30000, fetchImpl = fetch } = {}) {
  const manifest = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8'));
  const sample = ['rare.min.css', 'rare.css',
    Object.keys(manifest.files).find((f) => f.startsWith('fonts/') && f.endsWith('.woff2')),
    Object.keys(manifest.files).find((f) => f.startsWith('images/icons/') && f.endsWith('.svg'))].filter(Boolean);
  const base = `https://cdn.jsdelivr.net/gh/raredigits/rare-styles@${manifest.version}/`;
  let pending = sample;
  for (let i = 1; i <= attempts && pending.length; i++) {
    const still = [];
    for (const f of pending) {
      const res = await fetchImpl(base + f, { cache: 'no-store' });
      const ok = res.ok && sha256(Buffer.from(await res.arrayBuffer())) === manifest.files[f].sha256;
      if (!ok) still.push(f);
    }
    pending = still;
    if (pending.length && i < attempts) await new Promise((r) => setTimeout(r, waitMs));
  }
  return { base, checked: sample, mismatched: pending };
}

const SELF = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : resolve('scripts/release-css.mjs');
const isMain = process.argv[1] && resolve(process.argv[1]) === SELF;
if (isMain) {
  const [, , cmd, arg] = process.argv;
  if (cmd === 'check') {
    const { version, errors } = check();
    for (const e of errors) console.error(`✖ ${e}`);
    if (errors.length) process.exit(1);
    console.log(version);
  } else if (cmd === 'stage' && arg) {
    const { manifest, problems } = stage(resolve(arg));
    for (const p of problems) console.error(`✖ ${p}`);
    if (problems.length) process.exit(1);
    console.log(`staged ${manifest.version}: ${Object.keys(manifest.files).length} files → ${arg}`);
  } else if (cmd === 'verify-tree' && arg && process.argv[4]) {
    const { version, problems } = verifyTree(resolve(arg), resolve(process.argv[4]));
    for (const p of problems) console.error(`✖ ${p}`);
    if (problems.length) process.exit(1);
    console.log(`${process.argv[4]} holds exactly the verified ${version} artifact`);
  } else if (cmd === 'verify-cdn' && arg) {
    const r = await verifyCdn(resolve(arg));
    if (r.mismatched.length) { console.error(`✖ CDN bytes differ from the artifact: ${r.mismatched.join(', ')} (${r.base})`); process.exit(1); }
    console.log(`CDN matches the artifact: ${r.checked.join(', ')} at ${r.base}`);
  } else {
    console.error('usage: node scripts/release-css.mjs check | stage <dir> | verify-tree <dir> <tree> | verify-cdn <dir>');
    process.exit(1);
  }
}
