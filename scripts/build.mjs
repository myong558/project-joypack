// 조이팩 전체 빌드: 허브 + 모든 게임 → dist/ 한 곳 (README 3·4.1장)
//   1. 허브 빌드(apps/hub/dist) → dist/
//   2. 게임마다: package.json 에 build 스크립트가 있으면 빌드해 그 dist/ 를, 없으면 package.json "files" 에 적힌 파일을 dist/games/<id>/ 로
//      (빌드 없는 게임은 .js·.html 의 __APP_VERSION__ 을 package.json version 으로 바꿔 넣음)
//   3. 공통 모듈 packages/shared/joypack.js·topbar.css → dist/shared/ (빌드 없는 게임이 불러옴)
//   4. 게임마다 파일 목록 dist/games/<id>/files.json (경로 + 해시). 처음 열 때 이 목록 전체를 캐시한다
//   5. 서비스 워커 dist/sw.js: 허브 파일만 미리 캐시, 게임은 처음 열 때 캐시 (scripts/sw-template.js)
//   0. 검사: 글꼴 서브셋에 빠진 글자(scripts/check-glyphs.mjs, 내 PC에서는 자동으로 다시 만듦)
//   6~8. 검사: 글꼴·효과음 상업 이용, 용량(게임 하나·허브 크기 상한, scripts/check-size.mjs)
// 게임 하나만 고쳤을 때: pnpm build <id> → 허브와 그 게임만 다시 빌드하고 다른 게임은 지난 dist 를 그대로 쓴다(빠른 확인용).
// 배포(CI)·커밋 전 최종 확인은 인자 없이 전체 빌드한다
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFonts } from './check-fonts.mjs';
import { checkGlyphs } from './check-glyphs.mjs';
import { checkIcons, teaserWarnings } from './check-icons.mjs';
import { LIMITS, checkSize } from './check-size.mjs';
import { checkSounds } from './check-sounds.mjs';

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

const only = process.argv[2];
if (only && !readJson('games.json').some((g) => g.id === only)) throw new Error(`games.json 에 없는 게임: ${only}`);
// 글꼴 서브셋에 빠진 글자가 없는지(문구를 고치고 pnpm font 를 잊어도 내 PC에서는 여기서 다시 만듦, CI 는 실패. scripts/check-glyphs.mjs)
const glyphErrors = checkGlyphs();
if (glyphErrors.length) throw new Error(`글꼴 빠진 글자 검사 실패:\n- ${glyphErrors.join('\n- ')}`);
// 허브 카드 아이콘: 파일이 있고, 바탕색이 카드 그림판 색과 충분히 달라야 한다(scripts/check-icons.mjs, 기준서 6장 1번)
const iconErrors = checkIcons();
if (iconErrors.length) throw new Error(`허브 카드 아이콘 검사 실패:\n- ${iconErrors.join('\n- ')}`);
// 공개 예약 게임: COMING SOON 카드 그림판 후보 모두와 비슷하면 경고만(그림판은 허브 빌드가 가장 잘 구분되는 것으로 고름)
for (const warning of teaserWarnings()) console.warn(`! COMING SOON 카드: ${warning}`);
// 다시 빌드하지 않고 지난 결과를 쓸 게임(게임 하나만 빌드할 때, 지난 dist 가 있는 다른 게임)
const keep = (id) => !!only && id !== only && existsSync(join(DIST, 'games', id, 'index.html'));

// 폴더 자체가 아니라 안의 내용만 지운다(Windows 에서 터미널이 dist 안에 있으면 폴더 삭제가 거부됨)
mkdirSync(DIST, { recursive: true });
for (const name of readdirSync(DIST)) {
  if (name === 'games' && only) {
    for (const id of readdirSync(join(DIST, name))) if (!keep(id)) rmSync(join(DIST, name, id), { recursive: true, force: true });
    continue;
  }
  rmSync(join(DIST, name), { recursive: true, force: true });
}

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
  if (keep(game.id)) {
    console.log(`games/${game.id}: 지난 빌드 그대로 씀`);
    continue;
  }
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
    // 공개 예약(open)이 있으면 그 시각도 적는다: 공통 모듈이 그 전에는 "곧 공개" 화면으로 막고, 지나면 공개된 게임으로 본다
    const openAttr = game.open ? ` data-jp-open="${game.open}"` : '';
    writeFileSync(index, readFileSync(index, 'utf8').replace(/<html\b/i, `<html data-jp-preview${openAttr}`));
    console.log(`games/${game.id}: 숨김 미리보기(비밀번호 확인한 기기의 허브에만 보임)`);
  }
}

// 3. 공통 모듈(빌드 없는 게임이 <script> 로 불러옴)
mkdirSync(join(DIST, 'shared'), { recursive: true });
cpSync(join(ROOT, 'packages/shared/joypack.js'), join(DIST, 'shared/joypack.js'));
cpSync(join(ROOT, 'packages/shared/topbar.css'), join(DIST, 'shared/topbar.css'));

// 3-1. 효과음·진동 견본 페이지(제작용, 허브에 연결하지 않음, 미리 캐시하지 않음): dist/sounds/ (기준서 1.7)
mkdirSync(join(DIST, 'sounds'), { recursive: true });
cpSync(join(ROOT, 'sounds/index.html'), join(DIST, 'sounds/index.html'));
cpSync(join(ROOT, 'sounds/catalog.json'), join(DIST, 'sounds/catalog.json'));
cpSync(join(ROOT, 'packages/shared/sfx.js'), join(DIST, 'sounds/sfx.js'));

// 4. 게임별 파일 목록
const sizeGroups = [];
for (const game of games) {
  const out = join(DIST, 'games', game.id);
  const files = walk(out)
    .filter((f) => !NO_CACHE.has(f.split(sep).pop()))
    .map((f) => ({ path: sitePath(f), hash: hashOf(f) }));
  writeFileSync(join(out, 'files.json'), JSON.stringify({ id: game.id, files }, null, 2));
  const kb = files.reduce((sum, f) => sum + statSync(join(DIST, f.path)).size, 0) / 1024;
  console.log(`games/${game.id}: 파일 ${files.length}개, ${kb.toFixed(0)} KB (처음 열 때 캐시)`);
  sizeGroups.push({ name: `games/${game.id}`, kind: 'game', paths: files.map((f) => f.path) });
}

// 5. 서비스 워커
const hubFiles = walk(DIST)
  .map(sitePath)
  .filter((p) => !p.startsWith('games/') && !p.startsWith('sounds/') && p !== 'sw.js' && !NO_CACHE.has(p));
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

// 6. 글꼴 상업 이용 검사(기준서 1.10, 필수): 목록 밖 글꼴·상업 이용이 확인되지 않은 글꼴·라이선스 파일이 빠진 글꼴이 있으면 빌드 실패
const fontErrors = checkFonts(DIST);
if (fontErrors.length) {
  console.error(`글꼴 상업 이용 검사 실패(기준서 1.10):\n- ${fontErrors.join('\n- ')}`);
  process.exit(1);
}
console.log('글꼴 검사: 목록·배포본 모두 상업 이용 가능한 무료 글꼴');

// 7. 효과음 상업 이용 검사(기준서 1.7·10장, 필수): 직접 합성 또는 CC0 만, 목록 밖 소리 파일이 배포본에 있으면 빌드 실패
const soundErrors = checkSounds(DIST);
if (soundErrors.length) {
  console.error(`효과음 검사 실패(기준서 1.7):\n- ${soundErrors.join('\n- ')}`);
  process.exit(1);
}
console.log('효과음 검사: 모두 직접 합성 또는 CC0, 목록 밖 소리 파일 없음');

// 8. 용량 검사(기준서 1.11, 필수): 게임은 계속 늘어나므로 게임 하나·허브마다 상한. 넘으면 큰 파일 순서를 보여 준다
sizeGroups.push({ name: '허브', kind: 'hub', paths: hubFiles });
const size = checkSize(DIST, sizeGroups);
if (size.warnings.length) console.warn(`용량 경고(기준서 1.11, 빌드는 계속):\n- ${size.warnings.join('\n- ')}`);
if (size.errors.length) {
  console.error(`용량 검사 실패(기준서 1.11):\n- ${size.errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`용량 검사: 게임 하나 ${LIMITS.game.warn} KB · 허브 ${LIMITS.hub.warn} KB 안${size.warnings.length ? ' (경고 있음)' : ''}`);
