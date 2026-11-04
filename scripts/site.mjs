// Cloudflare Pages 에 올릴 사이트 묶음 site/ 를 만든다(README 4.5). 먼저 pnpm build.
//   site/joyfield/   ← dist/ 그대로(조이필드: https://pocketgamelab.com/joyfield/)
//   site/_redirects  첫 화면(/)은 아직 스튜디오 소개가 없어 조이필드로 잠시(302) 보낸다
//   site/_headers    서비스 워커는 늘 새로 확인, 개발 사이트(dev.·*.pages.dev)는 검색 차단
//   site/robots.txt
// 운영(main)·개발(dev) 브랜치 모두 같은 묶음을 올린다. DB 는 주소를 보고 공통 모듈이 고른다(Joyfield.FIREBASE).
// 사용: pnpm site
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const SITE = join(ROOT, 'site');
export const APP_PATH = '/joyfield/';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ 가 없습니다. 먼저 pnpm build 를 실행하세요.');
  process.exit(1);
}

// 폴더 자체가 아니라 안의 내용만 지운다(Windows 에서 터미널이 site 안에 있으면 폴더 삭제가 거부됨)
mkdirSync(SITE, { recursive: true });
for (const name of readdirSync(SITE)) rmSync(join(SITE, name), { recursive: true, force: true });

cpSync(DIST, join(SITE, 'joyfield'), { recursive: true });

writeFileSync(
  join(SITE, '_redirects'),
  [
    '# 첫 화면은 스튜디오 소개를 만들 때까지 조이필드로 잠시 보낸다(302: 나중에 바꿔도 브라우저가 기억하지 않음)',
    `/ ${APP_PATH} 302`,
    `/joyfield ${APP_PATH} 301`,
    '',
  ].join('\n'),
);

writeFileSync(
  join(SITE, '_headers'),
  [
    '# 서비스 워커는 브라우저가 늘 새 버전을 확인하게 한다(앱 업데이트가 늦지 않게)',
    `${APP_PATH}sw.js`,
    '  Cache-Control: no-cache',
    '',
    '# 개발 사이트·미리보기 주소는 검색에 나오지 않게 한다',
    'https://dev.pocketgamelab.com/*',
    '  X-Robots-Tag: noindex',
    'https://:sub.pages.dev/*',
    '  X-Robots-Tag: noindex',
    '',
  ].join('\n'),
);

writeFileSync(join(SITE, 'robots.txt'), 'User-agent: *\nAllow: /\n');

console.log(`site/ 준비: 조이필드 → site${APP_PATH}, _redirects · _headers · robots.txt`);
