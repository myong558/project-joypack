import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
// @ts-expect-error 빌드 스크립트(.mjs, 타입 없음)의 아이콘 색 계산을 그대로 쓴다
import { teaserBackdrop } from '../../scripts/check-icons.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const readJson = (path: string) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

// 개발 서버가 게임 주소를 이어 줄 게임 목록. 설정 → 정보에는 조이팩 버전(루트 package.json)만 보인다(게임 버전은 각 게임 설정 맨 아래)
const games: { id: string; icon?: string; color?: string }[] = readJson('games.json');

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
    // 개발자 모드에서 게임 카드 그림판 오른쪽 아래에 보이는 게임 버전(각 게임 package.json)
    __GAME_VERSIONS__: JSON.stringify(Object.fromEntries(games.map((g) => [g.id, readJson(`games/${g.id}/package.json`).version]))),
    // COMING SOON 카드 그림판 번호(게임 id → TEASER_BACKDROPS 번호): 게임 색과 겹치지 않고 아이콘 바탕색과 가장 잘 구분되는 후보(scripts/check-icons.mjs)
    __TEASER_BACKDROP__: JSON.stringify(
      Object.fromEntries(
        games
          .filter((g) => g.icon?.endsWith('.svg') && existsSync(join(ROOT, g.icon)))
          .map((g) => [g.id, teaserBackdrop(readFileSync(join(ROOT, g.icon!), 'utf8'), g.color).index]),
      ),
    ),
  },
  server: { port: 5170, open: false, fs: { allow: [ROOT] } },
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [devGames],
});
