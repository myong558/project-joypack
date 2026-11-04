// 옛 주소(https://myong558.github.io/project-joyfield/)에 남길 "새 주소로 옮겼어요" 묶음 moved/ 를 만든다(README 4.5).
// .github/workflows/moved.yml 이 GitHub Pages 에 올린다(이전 확인 뒤 사람이 한 번 실행).
//   index.html · 404.html  어떤 경로로 들어와도 같은 경로의 새 주소로 보낸다(/project-joyfield/games/hammer/?x → /joyfield/games/hammer/?x)
//                          홈 화면에 설치한 앱으로 열었으면 바로 넘기지 않고 "새 주소에서 다시 설치" 안내와 단추를 보인다
//   sw.js                  예전 서비스 워커를 대신해 캐시를 비우고 스스로 해제한 뒤 화면을 다시 연다(설치 앱이 옛 화면에 머물지 않게)
// 기기 저장 기록·설정은 주소(출처)가 달라 따라가지 않는다(2026-11-04 결정: 안내만)
// 사용: pnpm moved
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'moved');
const OLD_BASE = '/project-joyfield/';
const NEW_BASE = 'https://pocketgamelab.com/joyfield/';

mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) rmSync(join(OUT, name), { recursive: true, force: true });

const page = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>조이필드가 새 주소로 옮겼어요 · Joyfield has moved</title>
<script>
  (function () {
    var OLD = ${JSON.stringify(OLD_BASE)};
    var NEW = ${JSON.stringify(NEW_BASE)};
    var path = location.pathname;
    var rest = path.indexOf(OLD) === 0 ? path.slice(OLD.length) : '';
    var target = NEW + rest + location.search + location.hash;
    window.__target = target;
    var app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    if (!app) location.replace(target);
  })();
</script>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
         background: #f4f6fb; color: #1d2433; text-align: center; }
  @media (prefers-color-scheme: dark) { body { background: #121722; color: #e8ecf5; } .card { background: #1b2230; } }
  .card { background: #fff; padding: 32px 24px; border-radius: 20px; max-width: 340px; margin: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.12); }
  h1 { font-size: 21px; margin: 0 0 10px; }
  p { font-size: 15px; line-height: 1.55; margin: 0 0 8px; opacity: .85; }
  a.btn { display: inline-block; margin-top: 14px; padding: 13px 22px; border-radius: 14px; background: #0f66ff; color: #fff; font-weight: 700; text-decoration: none; }
  .en { margin-top: 18px; font-size: 13px; opacity: .65; }
</style>
</head>
<body>
<div class="card">
  <h1>조이필드가 새 주소로 옮겼어요</h1>
  <p>새 주소: <b>pocketgamelab.com/joyfield</b></p>
  <p>홈 화면에 설치한 앱은 지우고, 새 주소에서 다시 설치해 주세요.</p>
  <a class="btn" id="go" href="${NEW_BASE}">새 주소로 가기</a>
  <p class="en">Joyfield has moved to pocketgamelab.com/joyfield.<br>Please reinstall the app from the new address.</p>
</div>
<script>document.getElementById('go').href = window.__target;</script>
</body>
</html>
`;

// 옛 서비스 워커(/project-joyfield/sw.js)가 업데이트를 확인하면 이 파일을 받는다.
// 캐시를 모두 지우고 등록을 해제한 뒤 열린 화면을 다시 불러온다 → 위 안내 페이지가 열린다
const sw = `// 조이필드가 https://pocketgamelab.com/joyfield/ 로 옮겼다. 옛 캐시를 비우고 이 서비스 워커를 해제한다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;

writeFileSync(join(OUT, 'index.html'), page);
writeFileSync(join(OUT, '404.html'), page);
writeFileSync(join(OUT, 'sw.js'), sw);
console.log(`moved/ 준비: ${OLD_BASE} → ${NEW_BASE} (index.html · 404.html · sw.js)`);
