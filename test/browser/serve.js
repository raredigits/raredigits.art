// Minimal static server for the browser checks: serves the repository root,
// so fixtures load the committed `/assets/css/rare.css` and its fonts.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json',
};

export function serve() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      try {
        const body = await readFile(join(ROOT, path));
        res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => ok({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}
