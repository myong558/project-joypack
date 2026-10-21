// 웹폰트(Jua)를 허브 화면에 쓰이는 글자만 남긴 woff2 로 만든다(업다운과 같은 글꼴).
// 허브 문구(src/, index.html)나 games.json 의 게임 이름·설명을 바꾼 뒤에는 `pnpm font` 를 다시 실행한다.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import subsetFont from 'subset-font';

const SOURCE_URL = 'https://github.com/google/fonts/raw/main/ofl/jua/Jua-Regular.ttf';
const SOURCE_CACHE = 'node_modules/.cache/fonts/Jua-Regular.ttf';
const SRC_FILES = (await readdir('src')).filter((name) => name.endsWith('.ts')).map((name) => 'src/' + name);
const TEXT_FILES = ['index.html', '../../games.json', ...SRC_FILES];
const OUTPUT = 'src/fonts/jua-hub.woff2';

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
let text = '…·—–';
for (let code = 0x20; code < 0x7f; code++) text += String.fromCharCode(code);
for (const file of TEXT_FILES) text += await readFile(file, 'utf8');
const chars = [...new Set(text)].filter((c) => c >= ' ').join('');

const font = await subsetFont(await loadSource(), chars, { targetFormat: 'woff2' });
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, font);
console.log(OUTPUT + ': ' + chars.length + '자, ' + (font.length / 1024).toFixed(1) + ' KB');
