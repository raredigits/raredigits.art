// The three hosts RareCharts is checked on (RC-014, K-14): the same fixture
//   bare   the bundle alone: no Rare Styles, no host variables
//   v071   Rare Styles v0.7.1, the last before the --chart-* tokens: main's
//          rare.css at a6e3fed1, read from git (no vendored copy) and served
//          at /assets/css/rare-v0.7.1.css, so its url("fonts/…") resolve to
//          the committed fonts
//   v072   Rare Styles v0.7.2, the committed /assets/css/rare.css
// A fixture reads ?host= and links the stylesheet itself (charts-hosts.html).
// CI checks out the whole history (fetch-depth: 0), as size-baseline does.
import { execFileSync } from 'node:child_process';

export const HOSTS = ['bare', 'v071', 'v072'];

const V071 = 'a6e3fed1';
let v071;
const v071Css = () => (v071 ??= execFileSync('git', ['show', `${V071}:assets/css/rare.css`]));

// A new page on `host`, at `fixture?host=…`; page errors are collected.
export async function openHost(browser, origin, fixture, host, { width = 1280, height = 900 } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (host === 'v071') {
    await page.route('**/assets/css/rare-v0.7.1.css', route => route.fulfill({
      status: 200, contentType: 'text/css; charset=utf-8', body: v071Css(),
    }));
  }
  await page.goto(`${origin}${fixture}?host=${host}`);
  return { page, errors };
}
