// 효과음·진동 상업 이용 검사(기준서 1.7·10장). pnpm build 가 끝에 돌리고, 어긋나면 빌드가 실패한다.
//   1. sounds/catalog.json: 소리마다 출처가 허용 목록(synth = 직접 합성, CC0 = 퍼블릭 도메인 기증)이고,
//      CC0 이면 file·url·author·license 가 적혀 있고 파일이 저장소에 있어야 한다. recipe·진동 패턴 모양도 확인
//   2. 배포본(dist)의 모든 소리 파일(mp3·wav·ogg 등)이 목록의 CC0 항목에 있어야 한다(출처 모르는 소리 파일 금지)
// 따로 돌리기: node scripts/check-sounds.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const AUDIO = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba|mid|midi)$/i;
const KINDS = new Set(['tone', 'mallet', 'noise']);
const WAVES = new Set(['sine', 'triangle', 'square', 'sawtooth']);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

export function checkSounds(dist) {
  const errors = [];
  const cat = JSON.parse(readFileSync(join(ROOT, 'sounds/catalog.json'), 'utf8'));
  const allowed = Object.keys(cat.allowedSources);
  const seen = new Set();
  const files = new Set();
  for (const s of cat.sounds) {
    const at = `소리 ${s.id}`;
    if (seen.has(s.id)) errors.push(`${at}: id 가 겹침`);
    seen.add(s.id);
    if (!allowed.includes(s.source)) errors.push(`${at}: 출처 "${s.source}" 는 허용 목록(${allowed.join('·')})이 아님`);
    if (!cat.groups[s.group]) errors.push(`${at}: 묶음 "${s.group}" 이 groups 에 없음`);
    if (s.source === 'CC0') {
      for (const k of ['file', 'url', 'author', 'license']) if (!s[k]) errors.push(`${at}: CC0 소리는 ${k} 를 적어야 함`);
      if (s.file && !existsSync(join(ROOT, s.file))) errors.push(`${at}: 파일 ${s.file} 이 없음`);
      if (s.file) files.add(basename(s.file));
    } else if (!Array.isArray(s.recipe) || !s.recipe.length) {
      errors.push(`${at}: 합성 소리는 recipe(음 목록)가 있어야 함`);
    } else {
      for (const n of s.recipe) {
        if (!KINDS.has(n.k)) errors.push(`${at}: 음 종류 "${n.k}" 를 모름`);
        if (!(n.dur > 0 && n.dur <= 2)) errors.push(`${at}: dur 는 0~2초`);
        if (n.k !== 'noise' && !(n.f > 20 && n.f < 20000)) errors.push(`${at}: f 는 20~20000Hz`);
        if (n.wave && !WAVES.has(n.wave)) errors.push(`${at}: 파형 "${n.wave}" 를 모름`);
      }
    }
  }
  const vib = new Set();
  for (const v of cat.vibrations) {
    if (vib.has(v.id)) errors.push(`진동 ${v.id}: id 가 겹침`);
    vib.add(v.id);
    const list = Array.isArray(v.pattern) ? v.pattern : [v.pattern];
    if (!list.length || list.some((ms) => !Number.isInteger(ms) || ms <= 0) || list.reduce((a, b) => a + b, 0) > 3000)
      errors.push(`진동 ${v.id}: 패턴은 양의 정수 ms 목록, 합계 3초 이하`);
  }
  if (dist && existsSync(dist)) {
    for (const f of walk(dist).filter((p) => AUDIO.test(p))) {
      if (!files.has(basename(f))) errors.push(`배포본의 소리 파일 ${f.slice(dist.length + 1)} 이 목록(sounds/catalog.json)의 CC0 항목에 없음`);
    }
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = checkSounds(join(ROOT, 'dist'));
  if (errors.length) {
    console.error(`효과음 검사 실패:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('효과음 검사: 모두 직접 합성 또는 CC0');
}
