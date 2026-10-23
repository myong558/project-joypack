// 웹폰트(Do Hyeon, SIL OFL 1.1 · 예약 글꼴 이름 없음)를 이 게임 화면에 쓰이는 글자만 남긴 woff2 로 만든다.
// 문구(src/*.ts, index.html)를 바꾼 뒤에는 `pnpm --filter timetoflip font` 를 다시 실행한다.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';

const SOURCE_URL = 'https://github.com/google/fonts/raw/main/ofl/dohyeon/DoHyeon-Regular.ttf';
const SOURCE_CACHE = '../../node_modules/.cache/fonts/DoHyeon-Regular.ttf';
const OUTPUT = 'src/fonts/dohyeon-subset.woff2';

async function tsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tsFiles(full)));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

async function loadSource() {
  if (!existsSync(SOURCE_CACHE)) {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error('원본 폰트 다운로드 실패: ' + res.status);
    await mkdir(dirname(SOURCE_CACHE), { recursive: true });
    await writeFile(SOURCE_CACHE, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(SOURCE_CACHE);
}

// 출력 가능한 ASCII 는 모두 넣는다. 실행 중에 만들어지는 숫자·이름(A–Z)을 위해서다.
let text = '…·—–×→←↑↓★☆';
for (let code = 0x20; code < 0x7f; code++) text += String.fromCharCode(code);
for (const file of ['index.html', ...(await tsFiles('src'))]) text += await readFile(file, 'utf8');
const chars = [...new Set(text)].filter((c) => c >= ' ').join('');

const font = await subsetFont(await loadSource(), chars, { targetFormat: 'woff2' });
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, font);
console.log(OUTPUT + ': ' + chars.length + '자, ' + (font.length / 1024).toFixed(1) + ' KB');
