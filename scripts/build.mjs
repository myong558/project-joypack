// 조이팩 전체 빌드: 허브 + 모든 게임 → dist/ 한 곳 (README 3·4.1장)
//   1. 허브 빌드(apps/hub/dist) → dist/
//   2. 게임마다: package.json 에 build 스크립트가 있으면 빌드해 그 dist/ 를, 없으면 package.json "files" 에 적힌 파일을 dist/games/<id>/ 로
//      (빌드 없는 게임은 .js·.html 의 __APP_VERSION__ 을 package.json version 으로 바꿔 넣음)
//   3. 공통 모듈 packages/shared/joypack.js·topbar.css → dist/shared/ (빌드 없는 게임이 불러옴)
//   4. 게임마다 파일 목록 dist/games/<id>/files.json (경로 + 해시). 처음 열 때 이 목록 전체를 캐시한다
//   5. 서비스 워커 dist/sw.js: 허브 파일만 미리 캐시, 게임은 처음 열 때 캐시 (scripts/sw-template.js)
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(ROOT, 'dist');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

// 캐시에 넣지 않는 파일(링크 미리보기 전용)
const NO_CACHE = new Set(['og-image.png']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sitePath = (file) => relative(DIST, file).split(sep).join('/');
const hashOf = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);

// 폴더 자체가 아니라 안의 내용만 지운다(Windows 에서 터미널이 dist 안에 있으면 폴더 삭제가 거부됨)
mkdirSync(DIST, { recursive: true });
for (const name of readdirSync(DIST)) rmSync(join(DIST, name), { recursive: true, force: true });

// 1. 허브
run('pnpm --filter hub build');
cpSync(join(ROOT, 'apps/hub/dist'), DIST, { recursive: true });

// 2. 게임
// preview(숨김 미리보기)도 배포한다. 허브는 비밀번호를 확인한 기기에서만 카드를 보인다
const games = readJson('games.json').filter((g) => g.status === 'live' || g.status === 'preview');
for (const game of games) {
  const dir = join(ROOT, 'games', game.id);
  const pkg = readJson(`games/${game.id}/package.json`);
  const out = join(DIST, 'games', game.id);
  mkdirSync(out, { recursive: true });
  if (pkg.scripts?.build) {
    run(`pnpm --filter ${pkg.name} build`);
    cpSync(join(dir, 'dist'), out, { recursive: true });
  } else {
    if (!pkg.files?.length) throw new Error(`games/${game.id}/package.json 에 build 스크립트나 "files" 가 필요합니다`);
    for (const entry of pkg.files) cpSync(join(dir, entry), join(out, entry), { recursive: true });
    // 빌드 없는 게임도 설정 맨 아래에 버전을 보이도록 .js·.html 의 __APP_VERSION__ 을 package.json version 으로 바꾼다
    for (const file of walk(out).filter((f) => /\.(js|html)$/.test(f))) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('__APP_VERSION__')) writeFileSync(file, text.replaceAll('__APP_VERSION__', pkg.version));
    }
  }
  if (!existsSync(join(out, 'index.html'))) throw new Error(`dist/games/${game.id}/index.html 이 없습니다`);
  // 미리보기 표시: 게임은 Joypack.isPreview() 로 미리보기로 배포된 것을 안다(랭킹은 그대로 등록됨)
  if (game.status === 'preview') {
    const index = join(out, 'index.html');
    writeFileSync(index, readFileSync(index, 'utf8').replace(/<html\b/i, '<html data-jp-preview'));
    console.log(`games/${game.id}: 숨김 미리보기(비밀번호 확인한 기기의 허브에만 보임)`);
  }
}

// 3. 공통 모듈(빌드 없는 게임이 <script> 로 불러옴)
mkdirSync(join(DIST, 'shared'), { recursive: true });
cpSync(join(ROOT, 'packages/shared/joypack.js'), join(DIST, 'shared/joypack.js'));
cpSync(join(ROOT, 'packages/shared/topbar.css'), join(DIST, 'shared/topbar.css'));

// 4. 게임별 파일 목록
for (const game of games) {
  const out = join(DIST, 'games', game.id);
  const files = walk(out)
    .filter((f) => !NO_CACHE.has(f.split(sep).pop()))
    .map((f) => ({ path: sitePath(f), hash: hashOf(f) }));
  writeFileSync(join(out, 'files.json'), JSON.stringify({ id: game.id, files }, null, 2));
  const kb = files.reduce((sum, f) => sum + statSync(join(DIST, f.path)).size, 0) / 1024;
  console.log(`games/${game.id}: 파일 ${files.length}개, ${kb.toFixed(0)} KB (처음 열 때 캐시)`);
}

// 5. 서비스 워커
const hubFiles = walk(DIST)
  .map(sitePath)
  .filter((p) => !p.startsWith('games/') && p !== 'sw.js' && !NO_CACHE.has(p));
const version = createHash('sha256')
  .update(hubFiles.map((p) => p + hashOf(join(DIST, p))).join('\n'))
  .update(readFileSync(join(ROOT, 'scripts/sw-template.js')))
  .digest('hex')
  .slice(0, 12);
const sw = readFileSync(join(ROOT, 'scripts/sw-template.js'), 'utf8')
  .replace("'__VERSION__'", JSON.stringify(version))
  .replace('[] /* __HUB_FILES__ */', JSON.stringify(hubFiles));
writeFileSync(join(DIST, 'sw.js'), sw);
const hubKb = hubFiles.reduce((sum, p) => sum + statSync(join(DIST, p)).size, 0) / 1024;
console.log(`허브: 파일 ${hubFiles.length}개, ${hubKb.toFixed(0)} KB (설치 때 미리 캐시) · 서비스 워커 ${version}`);
