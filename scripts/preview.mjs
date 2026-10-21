// dist/ 를 실제 배포와 같은 하위 경로(/project-joypack/)로 띄운다. 서비스 워커는 localhost 에서 동작한다.
// 먼저 pnpm build. 사용: pnpm preview  →  http://localhost:4170/project-joypack/
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const BASE = '/project-joypack/';
const PORT = Number(process.env.PORT) || 4170;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(DIST)) {
  console.error('dist/ 가 없습니다. 먼저 pnpm build 를 실행하세요.');
  process.exit(1);
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!url.startsWith(BASE)) {
    res.writeHead(302, { Location: BASE }).end();
    return;
  }
  let file = normalize(join(DIST, url.slice(BASE.length)));
  if (!file.startsWith(normalize(DIST))) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    // GitHub Pages 처럼 폴더 주소는 끝에 / 를 붙여 넘긴다
    if (!url.endsWith('/')) return res.writeHead(301, { Location: url + '/' }).end();
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}`));
