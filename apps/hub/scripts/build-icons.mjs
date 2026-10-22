// public/logo.svg 로 앱 아이콘(PNG)과 링크 미리보기 이미지(og-image.png)를 만든다. 로고를 바꾸면 `pnpm --filter hub icons`.
// 로고를 바꾸면 index.html 과 public/manifest.webmanifest 의 아이콘 주소 끝 ?v=숫자 도 하나 올린다.
// 주소가 같으면 이미 설치된 앱(안드로이드·PC)이 아이콘이 바뀐 줄 모르고 예전 아이콘을 계속 쓴다
// 만든 PNG 는 저장소에 커밋한다(CI 에서는 다시 만들지 않음).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const logo = await readFile('public/logo.svg');
// 아이폰 홈 화면·마스커블 아이콘은 기기가 모양을 잘라 쓰므로, 로고 안쪽의 둥근 상자를 빼고 레몬색을 끝까지 채운 뒤 얼굴만 얹는다.
// 상자를 작게 넣으면 런처마다 보이는 범위가 달라(앱 설치는 가운데 약 80%, 브라우저 바로가기는 약 66%) 상자 테두리가 잘리며 확대돼 보인다.
// 브라우저 바로가기(삼성 인터넷·Chrome "홈 화면에 추가" 등)는 마스커블이 아닌 일반 아이콘(pwa-*)을 골라 원·둥근 사각으로 잘라 쓰기도 하므로
// 일반 아이콘도 같은 꽉 찬 모양으로 만든다. 얼굴을 scale 배로 줄여 가장 좁게 잘라도(가운데 66% 원) 볼·입이 잘리지 않게 한다
const fullBleed = (scale) =>
  Buffer.from(
    logo
      .toString()
      .replace('<rect width="512" height="512" rx="120" fill="#ffb703"/>', '<rect width="512" height="512" fill="#ffb703"/><g transform="translate(256 248) scale(' + scale + ') translate(-256 -270)">')
      .replace('</svg>', '</g></svg>'),
  );
// 안드로이드 Chrome 바로가기는 마스커블을 적응형 아이콘(108dp 중 가운데 72dp, 약 66%만 보임)으로 넣어 1.5배 확대돼 보인다.
// 그래서 마스커블은 얼굴을 0.6배로 줄여, 잘린 뒤 보이는 크기가 원래 로고와 같게 한다
const fullIcon = (scale, size, file) => sharp(fullBleed(scale), { density: 384 }).resize(size, size).png().toFile(file);
await fullIcon(0.8, 192, 'public/pwa-192x192.png');
await fullIcon(0.8, 512, 'public/pwa-512x512.png');
await fullIcon(0.6, 512, 'public/maskable-icon-512x512.png');
await fullIcon(0.92, 180, 'public/apple-touch-icon-180x180.png');

// 링크 미리보기 1200×630(카카오톡·메신저·SNS). 화면과 같은 Jua 글꼴로 그리려고 Chrome 으로 HTML 을 찍는다
// (sharp 는 웹 글꼴 woff2 를 못 읽어 기본 글꼴로 딱딱하게 나온다). Chrome 위치가 다르면 CHROME 환경 변수로 알려 준다.
// 메신저가 가장자리를 잘라 보여 주기도 하므로 글자는 가운데 안전 영역(좌우 90px 안쪽)에 둔다.
// 이미지를 바꾸면 index.html 의 og:image 주소 끝 ?v=숫자 도 올린다(카카오톡이 같은 주소의 옛 그림을 오래 기억한다)
const CHROME =
  process.env.CHROME ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!CHROME) throw new Error('og-image 를 그릴 Chrome 을 찾지 못했습니다. CHROME 환경 변수로 경로를 알려 주세요');
const work = mkdtempSync(join(tmpdir(), 'joypack-og-'));
const font = pathToFileURL(resolve('src/fonts/jua-hub.woff2')).href;
const mark = `data:image/svg+xml;base64,${logo.toString('base64')}`;
writeFileSync(
  join(work, 'og.html'),
  `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Jua; src: url('${font}') format('woff2'); }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    display: flex; align-items: center; justify-content: center; gap: 64px;
    background: radial-gradient(90% 120% at 85% 0%, #ffe9a8, #fffbe8);
    font-family: Jua, sans-serif; color: #3d2a00;
  }
  img { width: 330px; height: 330px; filter: drop-shadow(0 18px 24px rgb(154 91 0 / 0.25)); }
  h1 { margin: 0; font-size: 158px; font-weight: 400; line-height: 1; letter-spacing: 0.02em; }
  p { margin: 26px 0 0; font-size: 50px; line-height: 1.3; color: #8a6420; }
</style><img src="${mark}"><div><h1>조이팩</h1><p>하나씩 늘어나는<br>미니 게임 모음</p></div>`,
);
execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  '--virtual-time-budget=3000',
  `--user-data-dir=${join(work, 'profile')}`,
  `--screenshot=${join(work, 'og.png')}`,
  pathToFileURL(join(work, 'og.html')).href,
], { stdio: 'ignore' });
await sharp(join(work, 'og.png')).resize(1200, 630).png().toFile('public/og-image.png');
rmSync(work, { recursive: true, force: true });
console.log('아이콘·og-image 생성 완료');
