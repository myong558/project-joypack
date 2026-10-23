// 게임(또는 앱)에 쓸 글꼴을 fonts/catalog.json 에서 골라, 그 화면에 쓰이는 글자만 남긴 woff2 로 만든다(기준서 1.10).
// 게임 폴더에서 실행한다:
//   node ../../scripts/font-subset.mjs <글꼴 id>=<출력 woff2> [<글꼴 id>=<출력 woff2> ...]
//   예) node ../../scripts/font-subset.mjs jua=src/fonts/jua-subset.woff2 bagel-fat-one=src/fonts/bagel-subset.woff2
// - 글자는 src/ 아래 .ts 와 index.html 에서 모은다(출력 가능한 ASCII 는 모두 넣음: 숫자·이름 A–Z).
// - 라이선스 전문을 public/fonts/LICENSE-<글꼴 이름>.txt 로 복사한다(배포본에 함께 들어감).
// - 목록에 없는 글꼴은 만들지 않는다. 새 글꼴은 라이선스를 검증한 뒤 catalog.json 에 먼저 더한다.
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CACHE = join(ROOT, 'node_modules/.cache/fonts');
const catalog = JSON.parse(await readFile(join(ROOT, 'fonts/catalog.json'), 'utf8'));

const jobs = process.argv.slice(2).map((arg) => {
  const [id, output] = arg.split('=');
  const font = catalog.fonts.find((f) => f.id === id);
  if (!font || !output) {
    console.error(`글꼴 목록(fonts/catalog.json)에 없는 id 이거나 출력 경로가 없어요: ${arg}\n있는 id: ${catalog.fonts.map((f) => f.id).join(', ')}`);
    process.exit(1);
  }
  return { font, output };
});
if (!jobs.length) {
  console.error('쓰는 법: node ../../scripts/font-subset.mjs <글꼴 id>=<출력 woff2> ...');
  process.exit(1);
}

async function fetchTo(url, file) {
  if (existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`받기 실패(${res.status}): ${url}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

/** 원본 글꼴과 라이선스 전문(캐시에 받아 둠). zip 으로만 배포되는 글꼴은 미리 풀어 둔 폴더를 쓴다 */
async function source(font) {
  if (font.zipEntry) {
    const dir = join(CACHE, font.id);
    const ttf = join(dir, font.zipEntry);
    if (!existsSync(ttf)) throw new Error(`${font.family}: ${font.url} 을 받아 ${dir} 에 풀어 두세요(${font.zipEntry}, ${font.licenseEntry})`);
    return { ttf: await readFile(ttf), license: await readFile(join(dir, font.licenseEntry), 'utf8') };
  }
  const ttf = join(CACHE, font.url.split('/').pop());
  const lic = join(CACHE, `${font.id}-OFL.txt`);
  await fetchTo(font.url, ttf);
  await fetchTo(font.license, lic);
  return { ttf: await readFile(ttf), license: await readFile(lic, 'utf8') };
}

async function files(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(full)));
    else if (/\.(ts|js|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let text = '…·—–−×→←↑↓★☆';
for (let code = 0x20; code < 0x7f; code++) text += String.fromCharCode(code);
for (const file of [...(existsSync('index.html') ? ['index.html'] : []), ...(await files('src'))]) text += await readFile(file, 'utf8');
const chars = [...new Set(text)].filter((c) => c >= ' ').join('');

for (const { font, output } of jobs) {
  const { ttf, license } = await source(font);
  const woff2 = await subsetFont(ttf, chars, { targetFormat: 'woff2' });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, woff2);
  const licFile = join('public/fonts', `LICENSE-${font.family.replace(/\s+/g, '')}.txt`);
  await mkdir(dirname(licFile), { recursive: true });
  await writeFile(licFile, license);
  console.log(`${output}: ${font.family} ${chars.length}자, ${(woff2.length / 1024).toFixed(1)} KB · ${licFile}`);
}
