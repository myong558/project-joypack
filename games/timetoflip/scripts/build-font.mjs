// 웹폰트를 이 게임 화면에 쓰이는 글자만 남긴 woff2 로 만든다. 두 글꼴 모두 SIL OFL 1.1 · 예약 글꼴 이름 없음(서브셋 허용).
//   Do Hyeon    본문·숫자·버튼(또렷한 굵은 글씨, 타이머 숫자)
//   Dongle Bold 제목·띠·팝업(둥글고 통통한 장난감 느낌)
// 문구(src/*.ts, index.html)를 바꾼 뒤에는 `pnpm --filter timetoflip font` 를 다시 실행한다.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';

const FONTS = [
  { url: 'https://github.com/google/fonts/raw/main/ofl/dohyeon/DoHyeon-Regular.ttf', output: 'src/fonts/dohyeon-subset.woff2' },
  { url: 'https://github.com/google/fonts/raw/main/ofl/dongle/Dongle-Bold.ttf', output: 'src/fonts/dongle-bold-subset.woff2' },
];
const CACHE = '../../node_modules/.cache/fonts/';

async function tsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tsFiles(full)));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

async function loadSource(url) {
  const cache = CACHE + url.split('/').pop();
  if (!existsSync(cache)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('원본 폰트 다운로드 실패: ' + res.status);
    await mkdir(dirname(cache), { recursive: true });
    await writeFile(cache, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(cache);
}

// 출력 가능한 ASCII 는 모두 넣는다. 실행 중에 만들어지는 숫자·이름(A–Z)을 위해서다.
let text = '…·—–−×→←↑↓★☆';
for (let code = 0x20; code < 0x7f; code++) text += String.fromCharCode(code);
for (const file of ['index.html', ...(await tsFiles('src'))]) text += await readFile(file, 'utf8');
const chars = [...new Set(text)].filter((c) => c >= ' ').join('');

for (const { url, output } of FONTS) {
  const font = await subsetFont(await loadSource(url), chars, { targetFormat: 'woff2' });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, font);
  console.log(output + ': ' + chars.length + '자, ' + (font.length / 1024).toFixed(1) + ' KB');
}
