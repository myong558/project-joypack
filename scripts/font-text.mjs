// 글꼴 서브셋에 넣을 글자를 모으는 공통 규칙(기준서 1.10). font-subset.mjs(만들기)와 check-glyphs.mjs(빌드 검사)가 함께 쓴다.
// 두 곳이 같은 규칙으로 모아야 "만든 뒤 문구가 바뀌어 글자가 빠졌는지"를 정확히 알 수 있다.
//   - 늘 넣는 기본 세트: 출력 가능한 ASCII 전체(숫자·이름 A–Z), 한글 자음·모음(ㅋㅋ·ㅠㅠ), 자주 쓰는 기호(BASE_SYMBOLS)
//   - 앱 폴더의 index.html 과 src/·js/·css/ 아래 .ts·.js·.html·.css·.json(CSS content: 의 기호 포함)
//   - 모든 앱이 함께 보여 주는 글: 공통 모듈(packages/shared 의 .js·.css), games.json(허브 카드·공유 문구의 게임 이름·설명)
//   - "몇 글자만" 쓰는 글꼴(only)은 ASCII + 그 글자만
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const LOCK_FILE = 'fonts.lock.json';

/** 자주 쓰는 기호. 글꼴에 없는 기호는 서브셋에서 저절로 빠지고(기기 글꼴로 보임) lock 의 absent 에 남는다 */
export const BASE_SYMBOLS =
  '…‥·•—–−‘’“”「」『』《》〈〉【】〔〕※★☆○●◎◇◆□■△▲▽▼◁◀▷▶→←↑↓↔⇒♥♡♠♤♣♧♦♢♪♬✓✔✕✖✗×÷±≠≤≥∞°℃%‰№™©®①②③④⑤⑥⑦⑧⑨⑩¹²³½¼¾~';

export function asciiChars() {
  let s = '';
  for (let code = 0x20; code < 0x7f; code++) s += String.fromCharCode(code);
  return s;
}

export function jamoChars() {
  let s = '';
  for (let code = 0x3131; code <= 0x3163; code++) s += String.fromCharCode(code);
  return s;
}

const TEXT_EXT = /\.(ts|js|mjs|html|css|json)$/;

function textFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' || name === 'fonts' ? [] : textFiles(full);
    return TEXT_EXT.test(name) ? [full] : [];
  });
}

/** 글자를 겹치지 않게, 코드 순서로(lock 파일이 실행마다 같은 순서가 되게) */
export function uniqChars(text) {
  return [...new Set(text)].filter((c) => c >= ' ').sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

/** 앱 폴더(appDir)에서 글꼴에 넣을 글자. only 가 있으면 ASCII + 그 글자만 */
export function collectChars(appDir, only) {
  if (only) return uniqChars(asciiChars() + only);
  let text = asciiChars() + jamoChars() + BASE_SYMBOLS;
  const files = [
    join(appDir, 'index.html'),
    ...['src', 'js', 'css'].flatMap((d) => textFiles(join(appDir, d))),
    ...textFiles(join(ROOT, 'packages/shared')).filter((f) => /\.(js|css)$/.test(f)),
    join(ROOT, 'games.json'),
  ];
  for (const file of files) if (existsSync(file)) text += readFileSync(file, 'utf8');
  return uniqChars(text);
}

/** TTF/OTF 원본에 그려진 글자 코드(cmap 형식 4·12). 글꼴에 없는 글자를 lock 의 absent 로 남기는 데 쓴다 */
export function fontCodePoints(buf) {
  const u16 = (o) => buf.readUInt16BE(o);
  const u32 = (o) => buf.readUInt32BE(o);
  const tables = u16(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('latin1', rec, rec + 4) === 'cmap') cmap = u32(rec + 8);
  }
  const out = new Set();
  if (cmap < 0) return out;
  const subtables = [];
  for (let i = 0; i < u16(cmap + 2); i++) {
    const rec = cmap + 4 + i * 8;
    subtables.push({ platform: u16(rec), encoding: u16(rec + 2), offset: cmap + u32(rec + 4) });
  }
  // 유니코드 전체(형식 12)가 있으면 그것, 없으면 BMP(형식 4)
  const pick = subtables.find((t) => u16(t.offset) === 12 && (t.platform === 0 || t.encoding === 10)) ?? subtables.find((t) => u16(t.offset) === 4 && (t.platform === 0 || t.platform === 3));
  if (!pick) return out;
  const o = pick.offset;
  if (u16(o) === 12) {
    for (let i = 0; i < u32(o + 12); i++) {
      const g = o + 16 + i * 12;
      for (let c = u32(g); c <= u32(g + 4); c++) out.add(c);
    }
    return out;
  }
  const segX2 = u16(o + 6);
  const ends = o + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  for (let i = 0; i < segX2 / 2; i++) {
    const end = u16(ends + i * 2);
    const start = u16(starts + i * 2);
    const delta = u16(deltas + i * 2);
    const rangeOffset = u16(ranges + i * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const at = ranges + i * 2 + rangeOffset + (c - start) * 2;
        glyph = u16(at);
        if (glyph) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph) out.add(c);
    }
  }
  return out;
}

/** 글꼴 서브셋을 만드는 앱 폴더들(package.json 에 font 스크립트가 있는 허브·게임) */
export function fontApps() {
  const dirs = [join(ROOT, 'apps/hub'), ...readdirSync(join(ROOT, 'games')).map((id) => join(ROOT, 'games', id))];
  return dirs.filter((dir) => {
    const pkg = join(dir, 'package.json');
    return existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).scripts?.font;
  });
}
