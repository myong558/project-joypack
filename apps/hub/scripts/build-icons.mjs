// public/logo.svg 로 앱 아이콘(PNG)과 링크 미리보기 이미지(og-image.png)를 만든다. 로고를 바꾸면 `pnpm --filter hub icons`.
// 로고를 바꾸면 index.html 과 public/manifest.webmanifest 의 아이콘 주소 끝 ?v=숫자 도 하나 올린다.
// 주소가 같으면 이미 설치된 앱(안드로이드·PC)이 아이콘이 바뀐 줄 모르고 예전 아이콘을 계속 쓴다
// 만든 PNG 는 저장소에 커밋한다(CI 에서는 다시 만들지 않음).
import { readFile } from 'node:fs/promises';
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
const fullIcon = (scale, size, file) => sharp(fullBleed(scale), { density: 384 }).resize(size, size).png().toFile(file);
await fullIcon(0.8, 192, 'public/pwa-192x192.png');
await fullIcon(0.8, 512, 'public/pwa-512x512.png');
await fullIcon(0.8, 512, 'public/maskable-icon-512x512.png');
await fullIcon(0.92, 180, 'public/apple-touch-icon-180x180.png');

// 링크 미리보기 1200×630
const markup = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="g" cx="85%" cy="0%" r="90%"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#fffbe8"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="560" y="300" font-family="Jua, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="150" font-weight="700" fill="#3d2a00">조이팩</text>
  <text x="566" y="390" font-family="Jua, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" font-size="46" fill="#8a6420">하나씩 늘어나는 미니 게임 모음</text>
</svg>`;
const mark = await sharp(logo, { density: 384 }).resize(360, 360).png().toBuffer();
await sharp(Buffer.from(markup))
  .composite([{ input: mark, left: 140, top: 135 }])
  .png()
  .toFile('public/og-image.png');
console.log('아이콘·og-image 생성 완료');
