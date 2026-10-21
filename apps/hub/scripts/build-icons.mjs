// public/logo.svg 로 앱 아이콘(PNG)과 링크 미리보기 이미지(og-image.png)를 만든다. 로고를 바꾸면 `pnpm --filter hub icons`.
// 로고를 바꾸면 index.html 과 public/manifest.webmanifest 의 아이콘 주소 끝 ?v=숫자 도 하나 올린다.
// 주소가 같으면 이미 설치된 앱(안드로이드·PC)이 아이콘이 바뀐 줄 모르고 예전 아이콘을 계속 쓴다
// 만든 PNG 는 저장소에 커밋한다(CI 에서는 다시 만들지 않음).
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const logo = await readFile('public/logo.svg');
const png = (size) => sharp(logo, { density: 384 }).resize(size, size).png();

await png(192).toFile('public/pwa-192x192.png');
await png(512).toFile('public/pwa-512x512.png');

// 아이폰 홈 화면·마스커블 아이콘은 모서리를 기기가 자르므로 꽉 찬 사각 배경에 로고를 안쪽(안전 영역)으로 넣는다
async function padded(size, inner, file) {
  const mark = await sharp(logo, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ffb703' } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(file);
}
await padded(512, 400, 'public/maskable-icon-512x512.png');
await padded(180, 164, 'public/apple-touch-icon-180x180.png');

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
