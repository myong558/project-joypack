import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const readJson = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

// 설정 화면에 보여 줄 버전: 조이팩은 루트 package.json, 게임은 각 게임 package.json
const games: { id: string }[] = readJson('games.json');
const gameVersions = Object.fromEntries(games.map((g) => [g.id, readJson(`games/${g.id}/package.json`).version as string]));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

/**
 * 개발 서버에서 허브 카드를 눌러 게임까지 이어서 확인할 수 있게, 배포 때와 같은 경로로 게임 파일을 내준다.
 *   games/updown/  → games/updown (빌드 없음, 고치면 새로 고침만 하면 됨)
 *   games/hammer/  → games/hammer/dist (pnpm --filter hammer build 로 먼저 빌드)
 *   shared/        → packages/shared
 */
const devGames: Plugin = {
  name: 'joypack-dev-games',
  apply: 'serve',
  configureServer(server) {
    const mounts: [string, string][] = [
      ['/shared/', 'packages/shared/'],
      ...games.map((g): [string, string] => {
        const built = join(ROOT, `games/${g.id}/dist`);
        return [`/games/${g.id}/`, existsSync(built) ? `games/${g.id}/dist/` : `games/${g.id}/`];
      }),
    ];
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url ?? '').split('?')[0]);
      const mount = mounts.find(([prefix]) => url.startsWith(prefix));
      if (!mount) return next();
      let file = normalize(join(ROOT, mount[1], url.slice(mount[0].length)));
      if (!file.startsWith(normalize(join(ROOT, mount[1])))) return next();
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file)) return next();
      res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(readJson('package.json').version),
    __GAME_VERSIONS__: JSON.stringify(gameVersions),
  },
  server: { port: 5170, open: false, fs: { allow: [ROOT] } },
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [devGames],
});
