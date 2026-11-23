// A static server for the tests: / is the repo, /engine/ is a local jade-vn-engine checkout (MicroPython, Live2D).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.wasm': 'application/wasm', '.png': 'image/png', '.css': 'text/css', '.moc3': 'application/octet-stream' };
export function serve(roots, port = 0) {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = null;
      for (const [prefix, dir] of Object.entries(roots)) if (u.startsWith(prefix)) { file = path.join(dir, u.slice(prefix.length)); break; }
      if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
    });
    srv.listen(port, '127.0.0.1', () => ok({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}
