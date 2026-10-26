// 게임(또는 앱)에 쓸 글꼴을 fonts/catalog.json 에서 골라, 그 화면에 쓰이는 글자만 남긴 woff2 로 만든다(기준서 1.10).
// 게임 폴더에서 실행한다:
//   node ../../scripts/font-subset.mjs <글꼴 id>=<출력 woff2> [<글꼴 id>=<출력 woff2> ...]
//   예) node ../../scripts/font-subset.mjs jua=src/fonts/jua-subset.woff2 bagel-fat-one=src/fonts/bagel-subset.woff2
// - 넣을 글자는 scripts/font-text.mjs 규칙으로 모은다: 기본 세트(ASCII·한글 자음모음·자주 쓰는 기호) + 앱의 index.html·src/·js/·css/
//   + 공통 모듈(packages/shared) + games.json.
// - 몇 글자에만 쓰는 글꼴은 세 번째 칸에 글자를 적으면 그 글자(+ ASCII)만 넣는다.
//   예) jua=src/fonts/jua-topbar-subset.woff2=한국어 → 공용 위 메뉴(Jua)의 언어 단추 "한국어 / English" 용
// - 기호 채움: 세 번째 칸이 +<본문 글꼴 id> 이면 본문 글꼴에 없는 ASCII·기본 기호만 담는다(글자 수가 정해져 있어 문구와 무관).
//   예) gothic-a1-bold=src/fonts/gothic-a1-bold-symbols.woff2=+jua → Jua 에 없는 … → © ① ★ 등 약 86자, 약 8 KB.
//   CSS 에서 본문 글꼴과 **같은 font-family 이름·같은 굵기 설명**으로, 출력되는 unicode-range 를 붙여 하나 더 선언한다(기준서 1.10).
// - 라이선스 전문을 public/fonts/LICENSE-<글꼴 이름>.txt 로 복사한다(배포본에 함께 들어감). 빌드 없는 앱은 --license-dir=fonts 처럼 폴더를 바꾼다.
// - 만든 결과(넣은 글자·파일 해시·글꼴에 없는 글자)를 앱 폴더의 fonts.lock.json 에 적는다. pnpm build 가 이것으로
//   문구가 바뀌어 빠진 글자가 생겼는지 검사하고, 생겼으면 이 스크립트를 다시 돌린다(scripts/check-glyphs.mjs).
// - 목록에 없는 글꼴은 만들지 않는다. 새 글꼴은 라이선스를 검증한 뒤 catalog.json 에 먼저 더한다.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { declaresReservedName, fontProblems } from './check-fonts.mjs';
import { BASE_SYMBOLS, LOCK_FILE, asciiChars, collectChars, fontCodePoints, uniqChars } from './font-text.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CACHE = join(ROOT, 'node_modules/.cache/fonts');
const catalog = JSON.parse(await readFile(join(ROOT, 'fonts/catalog.json'), 'utf8'));

const args = process.argv.slice(2);
const licenseDir = args.find((a) => a.startsWith('--license-dir='))?.split('=')[1] ?? 'public/fonts';
const jobs = args.filter((a) => !a.startsWith('--')).map((arg) => {
  const [id, output, only] = arg.split('=');
  const font = catalog.fonts.find((f) => f.id === id);
  if (!font || !output) {
    console.error(`글꼴 목록(fonts/catalog.json)에 없는 id 이거나 출력 경로가 없어요: ${arg}\n있는 id: ${catalog.fonts.map((f) => f.id).join(', ')}`);
    process.exit(1);
  }
  // 상업 이용 무료 글꼴만(기준서 1.10): 목록에 그렇게 적혀 있지 않으면 만들지 않는다
  const problems = fontProblems(font, catalog);
  if (problems.length) {
    console.error(`${font.family}: 상업 이용 무료 글꼴 조건을 갖추지 않아 쓸 수 없어요 — ${problems.join(', ')}`);
    process.exit(1);
  }
  if (only?.startsWith('+') && !catalog.fonts.some((f) => f.id === only.slice(1))) {
    console.error(`기호 채움 대상 글꼴이 목록에 없어요: ${only}`);
    process.exit(1);
  }
  return { font, output, only };
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

/** 글자들을 CSS unicode-range 로(이어지는 코드는 묶음) */
function unicodeRangeOf(chars) {
  const hex = (n) => n.toString(16).toUpperCase();
  const codes = [...chars].map((c) => c.codePointAt(0)).sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < codes.length; i++) {
    let j = i;
    while (codes[j + 1] === codes[j] + 1) j++;
    out.push(j > i ? `U+${hex(codes[i])}-${hex(codes[j])}` : `U+${hex(codes[i])}`);
    i = j;
  }
  return out.join(', ');
}

const lock = {};
for (const { font, output, only } of jobs) {
  const fill = only?.startsWith('+') ? only.slice(1) : null;
  const { ttf, license } = await source(font);
  let wanted;
  if (fill) {
    const base = fontCodePoints((await source(catalog.fonts.find((f) => f.id === fill))).ttf);
    wanted = [...uniqChars(asciiChars() + BASE_SYMBOLS)].filter((c) => !base.has(c.codePointAt(0))).join('');
  } else wanted = collectChars('.', only);
  // 원본에 없는 글자(이모지 등)는 넣을 수 없다 → 기기 글꼴로 보인다. 기록만 남긴다
  const has = fontCodePoints(ttf);
  const chars = [...wanted].filter((c) => has.has(c.codePointAt(0))).join('');
  const absent = [...wanted].filter((c) => !has.has(c.codePointAt(0)) && c !== ' ').join('');
  // 받은 라이선스 원문도 다시 본다: OFL 이 맞고 예약 글꼴 이름이 없어야 서브셋(수정본)을 만들 수 있다
  if (!/SIL Open Font License/i.test(license) || declaresReservedName(license)) {
    console.error(`${font.family}: 라이선스 원문이 OFL 이 아니거나 예약 글꼴 이름이 있어 서브셋을 만들 수 없어요. 목록에서 빼거나 다시 검증하세요`);
    process.exit(1);
  }
  const woff2 = await subsetFont(ttf, chars, { targetFormat: 'woff2' });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, woff2);
  const unicodeRange = fill ? unicodeRangeOf(chars) : undefined;
  lock[output] = { font: font.id, ...(fill ? { fill, unicodeRange } : only ? { only } : {}), sha256: createHash('sha256').update(woff2).digest('hex'), chars: wanted, absent };
  const licFile = join(licenseDir, `LICENSE-${font.family.replace(/\s+/g, '')}.txt`);
  await mkdir(dirname(licFile), { recursive: true });
  await writeFile(licFile, license);
  console.log(`${output}: ${font.family} ${chars.length}자, ${(woff2.length / 1024).toFixed(1)} KB · ${licFile}`);
  if (fill) console.log(`  CSS unicode-range: ${unicodeRange}`);
}

await writeFile(LOCK_FILE, JSON.stringify({ about: '글꼴 서브셋 기록(scripts/font-subset.mjs 가 만듦, 손으로 고치지 않음). pnpm build 가 빠진 글자를 검사할 때 씀', fonts: lock }, null, 2) + '\n');
