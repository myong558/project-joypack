// 화면 크기 점검: 세로·가로(주소창·아래 버튼 포함)·폴드 펼침 크기에서 앱의 모든 화면을 찍고, 잘린 글자·버튼을 찾는다.
// 쓰는 법(먼저 pnpm build):
//   pnpm check:screens <앱>            예) pnpm check:screens hammer  /  pnpm check:screens hub
//   pnpm check:screens <앱> landscape  크기 묶음만: portrait | landscape | fold | pc | all(기본)
//   pnpm check:screens <앱> all result,settings  화면 이름에 이 글자가 들어간 것만
// 화면 목록은 앱 폴더의 screen-check.mjs(apps/hub/screen-check.mjs, games/<id>/screen-check.mjs)에 적는다.
// 결과: 콘솔에 크기별 한 줄(ok 또는 문제 요소), screen-check/<앱>/ 에 화면별 모음 그림(_<화면>.png)과 낱장.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const [app = '', group = 'all', only = ''] = process.argv.slice(2);
const appDir = app === 'hub' ? join(ROOT, 'apps/hub') : join(ROOT, 'games', app);
const defFile = join(appDir, 'screen-check.mjs');
if (!app || !existsSync(defFile)) {
  console.error(`화면 목록이 없어요: ${defFile}\n쓰는 법: pnpm check:screens <hub | 게임 id> [portrait|landscape|fold|pc|all] [화면 이름 일부]`);
  process.exit(1);
}
if (!existsSync(join(ROOT, 'dist'))) {
  console.error('dist 가 없어요. 먼저 pnpm build');
  process.exit(1);
}

// 실제 기기에서 브라우저 주소창·아래 버튼·내비게이션 바를 뺀 뒤 남는 크기(CSS px)
export const SIZES = {
  portrait: ['360x560', '344x690', '390x664'], // 주소창+아래 버튼, 폴드 바깥 화면, 사파리
  landscape: ['844x390', '780x300', '667x375', '640x290', '740x260', '568x320'], // 가로: 바로가기 전체, 주소창+버튼, 작은 폰
  fold: ['720x740', '740x690', '884x1004', '1104x784'], // 폴드 펼침(거의 정사각형)
  pc: ['1366x768'],
};
const sizes = (group === 'all' ? Object.values(SIZES).flat() : SIZES[group] ?? group.split(',')).map((s) => s.split('x').map(Number));

const { screens, base = '' } = await import(pathToFileURL(defFile).href);
const out = join(ROOT, 'screen-check', app);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 화면 밖으로 나가거나 넘침을 숨긴(스크롤도 안 되는) 상자에 가려진 글자·버튼을 찾는다.
// 스크롤 상자 안은 스크롤로 볼 수 있으니 넘겨도 되고, 화면 맨 위에 고정된 요소(위 메뉴)는 상자에 잘리지 않으니 뺀다
const CHECK = `(() => {
  const W = innerWidth, H = innerHeight, out = [];
  const shown = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (n.hidden || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
  const leaf = (e) => e.matches('button, a, input, output, select, h1, h2, h3, p, li, label') || [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
  const fixedIn = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return n; return null; };
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('[aria-hidden="true"], script, style, template, svg symbol') || !leaf(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !shown(e)) continue;
    let bad = '';
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) {
      let scroll = document.documentElement.scrollHeight > H + 1; // 문서 자체가 스크롤되면(허브 게임 목록) 아래로 넘는 것도 볼 수 있다
      for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) { scroll = true; break; } }
      if (!scroll || r.left < -1 || r.right > W + 1) bad = 'off ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',');
    }
    const fixed = fixedIn(e);
    for (let p = e.parentElement; p && p !== document.body && !bad; p = p.parentElement) {
      if (fixed && !fixed.contains(p)) break;
      const s = getComputedStyle(p), pr = p.getBoundingClientRect();
      if (/auto|scroll/.test(s.overflowY)) break;
      if ((/hidden|clip/.test(s.overflowY) && (r.bottom > pr.bottom + 2 || r.top < pr.top - 2)) || (/hidden|clip/.test(s.overflowX) && (r.right > pr.right + 2 || r.left < pr.left - 2))) bad = 'clip by .' + String(p.className).split(' ')[0];
    }
    if (bad) out.push((typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName) + ' [' + e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 14) + '] ' + bad);
  }
  const de = document.documentElement;
  return (out.length ? out.slice(0, 6).join(' | ') + (out.length > 6 ? ' …+' + (out.length - 6) : '') : 'ok') + (de.scrollHeight > H + 1 ? ' · 문서 스크롤 ' + de.scrollHeight : '') + (de.scrollWidth > W + 1 ? ' · 가로 스크롤 ' + de.scrollWidth : '');
})()`;

const PORT = 4600 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [join(ROOT, 'scripts/preview.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const page = await launch();
const url = `http://localhost:${PORT}/project-joypack/${base}`;
let problems = 0;

// 새로 연 페이지: 설치 안내는 닫고 한국어로(설정은 화면 정의의 setup 으로 더 넣는다)
async function open(setup = '') {
  await page.goto(url);
  await page.eval(`localStorage.setItem('joypack.installDismissed', '1'); localStorage.setItem('joypack.lang', 'ko'); ${setup}; true`);
  await page.goto(url);
  await page.wait(2500); // 첫 진입 연출이 끝날 때까지
}

async function record(name, w, h) {
  const res = await page.eval(CHECK);
  if (!res.startsWith('ok')) problems++;
  console.log(`${name.padEnd(14)} ${`${w}x${h}`.padEnd(9)} ${res}`);
  await page.shot(join(out, `${name}-${w}x${h}.png`));
}

try {
  for (const s of screens.filter((s) => !only || only.split(',').some((o) => s.name.includes(o)))) {
    if (s.reach === 'once') {
      // 결과 화면처럼 가는 데 오래 걸리는 화면: 한 번만 가서 크기만 바꿔 가며 찍는다(화면 돌리기와 같은 상황)
      await page.size(390, 844);
      await open(s.setup);
      await s.go(page);
      for (const [w, h] of sizes) {
        await page.size(w, h);
        await page.wait(700);
        await record(s.name, w, h);
      }
    } else {
      for (const [w, h] of sizes) {
        await page.size(w, h);
        await open(s.setup);
        if (s.go) await s.go(page);
        await page.wait(900);
        await record(s.name, w, h);
      }
    }
  }
  if (page.errors.length) console.log('콘솔 오류:\n' + [...new Set(page.errors)].join('\n'));
} finally {
  page.close();
  server.kill();
}

// 화면마다 크기별 낱장을 한 장으로 모은다(세로 줄 · 가로 줄 · 폴드·PC 줄)
const sharp = createRequire(join(ROOT, 'apps/hub/package.json'))('sharp');
for (const s of screens) {
  const items = readdirSync(out)
    .filter((f) => f.startsWith(s.name + '-'))
    .map((f) => {
      const [w, h] = f.match(/(\d+)x(\d+)\.png$/).slice(1).map(Number);
      return { f, w, h };
    });
  if (!items.length) continue;
  const rows = [items.filter((i) => i.h > i.w && i.w < 500), items.filter((i) => i.w > i.h && i.h < 500), items.filter((i) => i.w >= 500 && i.h >= 500)].filter((r) => r.length);
  const S = 0.5, GAP = 12, comps = [];
  let y = 0, W = 0;
  for (const row of rows) {
    let x = 0, rh = 0;
    for (const it of row) {
      const w = Math.round(it.w * S), h = Math.round(it.h * S);
      comps.push({ input: await sharp(join(out, it.f)).resize(w, h).toBuffer(), left: x, top: y });
      x += w + GAP;
      rh = Math.max(rh, h);
    }
    W = Math.max(W, x);
    y += rh + GAP;
  }
  await sharp({ create: { width: W, height: y, channels: 4, background: '#ff00ff' } }).composite(comps).png().toFile(join(out, `_${s.name}.png`));
}
console.log(`\n${problems ? `문제 ${problems}줄` : '모두 ok'} · 모음 그림: screen-check/${app}/_<화면>.png`);
