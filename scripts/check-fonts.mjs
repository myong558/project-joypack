// 글꼴 상업 이용 검사(기준서 1.10·10.1, 필수). pnpm build 끝에 자동으로 돌고, 어긋나면 빌드가 실패한다.
//   1. fonts/catalog.json 의 모든 글꼴: 허용 라이선스(allowedLicenses)이고 free·commercial 이 true, rfn(예약 글꼴 이름)이 false.
//      받아 둔 라이선스 원문이 있으면 그 머리말에 예약 글꼴 이름이 없는지도 본다.
//   2. dist 의 모든 글꼴 파일(woff2·woff·ttf·otf): 파일 이름이 목록의 id 로 시작하고(예: jua-subset.woff2 → jua),
//      그 앱의 fonts/LICENSE-<글꼴 이름>.txt 가 함께 배포된다.
// 따로 돌리기: node scripts/check-fonts.mjs [dist 폴더]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** 라이선스 원문 머리말(본문 시작 전)에 예약 글꼴 이름 선언이 있는지 */
export function declaresReservedName(text) {
  const head = text.split(/PREAMBLE|-{5,}/)[0];
  return /reserved font name/i.test(head);
}

/** 목록의 글꼴 하나가 상업 이용 무료 조건을 모두 갖췄는지. 문제를 글로 돌려준다(없으면 빈 배열) */
export function fontProblems(font, catalog) {
  const out = [];
  if (!catalog.allowedLicenses?.[font.licenseType]) out.push(`허용되지 않은 라이선스 ${font.licenseType ?? '(없음)'}`);
  if (font.free !== true) out.push('무료(free)가 아님');
  if (font.commercial !== true) out.push('상업 이용(commercial)이 확인되지 않음');
  if (font.rfn !== false) out.push('예약 글꼴 이름(rfn)이 있거나 확인되지 않음');
  if (!font.verified) out.push('검증 날짜(verified) 없음');
  return out;
}

export function checkFonts(dist = join(ROOT, 'dist')) {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'fonts/catalog.json'), 'utf8'));
  const errors = [];
  for (const font of catalog.fonts) {
    for (const p of fontProblems(font, catalog)) errors.push(`목록 ${font.id}: ${p}`);
    const cached = join(ROOT, 'node_modules/.cache/fonts', font.zipEntry ? join(font.id, font.licenseEntry) : `${font.id}-OFL.txt`);
    if (existsSync(cached) && declaresReservedName(readFileSync(cached, 'utf8'))) errors.push(`목록 ${font.id}: 라이선스 원문에 예약 글꼴 이름 선언이 있음`);
  }

  if (existsSync(dist)) {
    const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    const ids = catalog.fonts.map((f) => f.id).sort((a, b) => b.length - a.length);
    for (const file of walk(dist).filter((f) => /\.(woff2?|ttf|otf)$/i.test(f))) {
      const rel = relative(dist, file).split(sep).join('/');
      const name = rel.split('/').pop().toLowerCase();
      const id = ids.find((i) => name.startsWith(i));
      const font = catalog.fonts.find((f) => f.id === id);
      if (!font) {
        errors.push(`배포본 ${rel}: 글꼴 목록에 없는 글꼴(파일 이름이 목록 id 로 시작해야 함)`);
        continue;
      }
      // 앱 폴더: 게임은 dist/games/<id>, 허브는 dist
      const app = rel.startsWith('games/') ? join(dist, 'games', rel.split('/')[1]) : dist;
      const lic = join(app, 'fonts', `LICENSE-${font.family.replace(/\s+/g, '')}.txt`);
      if (!existsSync(lic)) errors.push(`배포본 ${rel}: 라이선스 파일이 함께 배포되지 않음(${relative(dist, lic).split(sep).join('/')})`);
    }
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = checkFonts(process.argv[2]);
  if (errors.length) {
    console.error('글꼴 상업 이용 검사 실패(기준서 1.10):\n- ' + errors.join('\n- '));
    process.exit(1);
  }
  console.log('글꼴 검사: 목록·배포본 모두 상업 이용 가능한 무료 글꼴');
}
