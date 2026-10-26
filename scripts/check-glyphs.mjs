// 글꼴 빠진 글자 검사(기준서 1.10, 필수). pnpm build 맨 앞에서 자동으로 돈다.
// 앱(허브·게임)마다 fonts.lock.json(font-subset.mjs 가 만든 기록)과 지금 문구를 비교한다:
//   - 지금 문구에 서브셋을 만들 때 없던 글자가 있거나, 글꼴 파일이 기록과 다르거나, 기록이 없으면 → "오래된 서브셋"
//   - 내 PC: 그 앱의 `pnpm font` 를 자동으로 다시 돌려 고친다(고친 글꼴·fonts.lock.json 은 커밋에 함께 넣는다)
//   - CI(환경 변수 CI): 고치지 않고 빌드를 실패시킨다(커밋에 다시 만든 글꼴이 빠졌다는 뜻)
// 따로 돌리기: node scripts/check-glyphs.mjs [--no-fix]
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCK_FILE, ROOT, collectChars, fontApps } from './font-text.mjs';

const rel = (p) => relative(ROOT, p).split(sep).join('/');

/** 앱 CSS 에서 그 글꼴 파일을 쓰는 @font-face 의 unicode-range(없으면 '', @font-face 가 없으면 null) */
function fontFaceRange(dir, fileName) {
  const css = ['src', 'css'].flatMap((d) => cssFiles(join(dir, d)));
  for (const f of css) {
    for (const block of readFileSync(f, 'utf8').match(/@font-face\s*\{[^}]*\}/g) ?? []) {
      if (block.includes(fileName)) return block.match(/unicode-range:\s*([^;}]+)/)?.[1].trim() ?? '';
    }
  }
  return null;
}

function cssFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return cssFiles(full);
    return name.endsWith('.css') ? [full] : [];
  });
}

/** 앱 하나의 서브셋이 지금 문구와 맞는지. 문제를 글로 돌려준다(없으면 빈 배열) */
export function staleReasons(dir) {
  const lockPath = join(dir, LOCK_FILE);
  if (!existsSync(lockPath)) return [`${LOCK_FILE} 없음(pnpm font 를 한 번도 새 방식으로 돌리지 않음)`];
  const out = [];
  for (const [file, entry] of Object.entries(JSON.parse(readFileSync(lockPath, 'utf8')).fonts ?? {})) {
    const full = join(dir, file);
    if (!existsSync(full)) {
      out.push(`${file} 없음`);
      continue;
    }
    if (createHash('sha256').update(readFileSync(full)).digest('hex') !== entry.sha256) out.push(`${file} 이 기록과 다름(손으로 바꿨거나 다른 PC에서 만듦)`);
    if (entry.fill) {
      // 기호 채움 글꼴은 글자가 정해져 있어 문구와 무관. 대신 CSS @font-face 의 unicode-range 가 기록과 같아야 한다
      const range = fontFaceRange(dir, file.split('/').pop());
      if (range === null) out.push(`${file} 을 쓰는 @font-face 가 CSS 에 없음`);
      else if (range.replace(/\s/g, '') !== entry.unicodeRange.replace(/\s/g, '')) out.push(`${file} 의 CSS unicode-range 가 fonts.lock.json 과 다름(pnpm font 출력으로 고침)`);
      continue;
    }
    const had = new Set(entry.chars);
    const missing = [...collectChars(dir, entry.only)].filter((c) => !had.has(c));
    if (missing.length) out.push(`${file} 에 없는 새 글자 ${missing.length}개: ${missing.slice(0, 30).join('')}${missing.length > 30 ? '…' : ''}`);
  }
  return out;
}

export function checkGlyphs({ fix = !process.env.CI } = {}) {
  const errors = [];
  for (const dir of fontApps()) {
    let reasons = staleReasons(dir);
    if (!reasons.length) continue;
    const name = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name;
    if (fix) {
      console.log(`글꼴 서브셋 다시 만들기 ${rel(dir)}: ${reasons.join(' · ')}`);
      execSync(`pnpm --filter ${name} font`, { cwd: ROOT, stdio: 'inherit' });
      reasons = staleReasons(dir);
    }
    for (const r of reasons) errors.push(`${rel(dir)}: ${r} → 그 앱 폴더에서 pnpm font 후 글꼴·${LOCK_FILE} 을 커밋`);
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = checkGlyphs({ fix: !process.argv.includes('--no-fix') && !process.env.CI });
  if (errors.length) {
    console.error(`글꼴 빠진 글자 검사 실패:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('글꼴 빠진 글자 검사: 모든 앱의 서브셋이 지금 문구와 맞음');
}
