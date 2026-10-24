// 허브 카드 아이콘 검사(기준서 6장 1번). pnpm build 가 처음에 돌리고, 어긋나면 빌드가 실패한다.
//   1. games.json 의 icon 파일이 저장소에 있어야 한다(없으면 허브 카드 그림이 빈칸)
//   2. 아이콘 바탕색(SVG 를 꽉 채우는 첫 사각형의 색, 그라데이션이면 멈춤 색 평균)이 카드 그림판 색(games.json color)과
//      충분히 달라야 한다: 밝기 대비 1.8 이상이거나 색상(hue) 차이 45° 이상. 같은 계열이면 아이콘이 그림판에 묻힌다
//   3. 공개 예약 게임(open)은 COMING SOON 카드 그림판 후보(TEASER_BACKDROPS) 중 게임 색과 겹치지 않고 아이콘과 잘 구분되는 것을 허브 빌드가 고른다.
//      어느 후보와도 비슷하면 경고만(teaserWarnings, 빌드는 계속)
// 따로 돌리기: node scripts/check-icons.mjs
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MIN_CONTRAST = 1.8;
export const MIN_HUE = 45;

const hexRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const luminance = ([r, g, b]) => {
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const hue = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
};

/** SVG 아이콘의 바탕색(첫 번째로 화면을 꽉 채우는 사각형). 못 찾으면 null */
export function iconBackground(svg) {
  const [, , vw, vh] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 0 0').split(/\s+/).map(Number);
  for (const rect of svg.match(/<rect\b[^>]*>/g) ?? []) {
    const w = Number(rect.match(/\bwidth="([\d.]+)"/)?.[1]);
    const h = Number(rect.match(/\bheight="([\d.]+)"/)?.[1]);
    if (w < vw * 0.9 || h < vh * 0.9) continue;
    const fill = rect.match(/\bfill="([^"]+)"/)?.[1] ?? '';
    if (fill.startsWith('#')) return hexRgb(fill);
    const id = fill.match(/url\(#([^)]+)\)/)?.[1];
    const grad = id && svg.match(new RegExp(`<(?:linear|radial)Gradient[^>]*id="${id}"[\\s\\S]*?</(?:linear|radial)Gradient>`))?.[0];
    const stops = grad ? [...grad.matchAll(/stop-color="(#[0-9a-fA-F]{3,6})"/g)].map((m) => hexRgb(m[1])) : [];
    if (stops.length) return [0, 1, 2].map((i) => Math.round(stops.reduce((s, c) => s + c[i], 0) / stops.length));
  }
  return null;
}

/** 두 색이 충분히 다른지: 밝기 대비 MIN_CONTRAST 이상이거나 색상 차이 MIN_HUE 이상 */
function distinct(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  const contrast = (hi + 0.05) / (lo + 0.05);
  const [h1, h2] = [hue(a), hue(b)];
  const hueDiff = h1 === null || h2 === null ? 0 : Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
  return { contrast, hueDiff, ok: contrast >= MIN_CONTRAST || hueDiff >= MIN_HUE };
}

/**
 * 허브 COMING SOON 카드 그림판 후보(apps/hub/src/styles.css .card.teaser .card-art[data-backdrop]).
 * 게임 색과 상관없는 고정 색이라 공개 전에 게임 색이 드러나지 않는다(게임 색과 비슷한 후보는 빼고 고름). 0번(보라)이 기본
 */
export const TEASER_BACKDROPS = [
  ['#6d5bd0', '#2a2052'], // 보라
  ['#2aa198', '#0b3d44'], // 청록
  ['#c2456e', '#4a1430'], // 버건디
  ['#4a6fe0', '#16224f'], // 남색
  ['#e09a2c', '#5a3408'], // 호박
  ['#3f9d5a', '#123d22'], // 숲 초록
];

const backdropColor = (pair) => {
  const stops = pair.map(hexRgb);
  return [0, 1, 2].map((i) => Math.round((stops[0][i] + stops[1][i]) / 2));
};

/**
 * 예약 게임의 COMING SOON 그림판 번호.
 *   1. 게임 색(games.json color, 공개 뒤 카드 그림판)과 비슷한 후보는 뺀다: 공개 전 그림판이 게임 색 단서가 되지 않게
 *      (예: 타임 투 플립 청록 #0b7785 → 청록 후보 제외). 모두 비슷하면 전체에서 고른다
 *   2. 남은 후보 중 아이콘(SVG) 바탕색과 밝기 대비가 가장 큰 것(같으면 앞 후보).
 *      기준만 겨우 넘는 같은 계열 색(예: 남보라 아이콘 + 보라 그림판, 대비 1.84)보다 눈에 띄게 다른 색을 고른다
 * ok 가 false 면 고른 후보도 아이콘과 기준을 넘지 못한 것(빌드 경고)
 */
export function teaserBackdrop(svg, color) {
  const bg = iconBackground(svg);
  const all = TEASER_BACKDROPS.map((pair, index) => ({ index, rgb: backdropColor(pair) }));
  const apart = color ? all.filter((c) => distinct(c.rgb, hexRgb(color)).ok) : all;
  const pool = apart.length ? apart : all;
  if (!bg) return { index: pool[0].index, ok: true };
  const scored = pool.map((c) => ({ index: c.index, ...distinct(bg, c.rgb) }));
  const best = scored.reduce((b, s) => (s.contrast > b.contrast ? s : b));
  return { index: best.index, ok: best.ok };
}

export function checkIcons() {
  const errors = [];
  for (const g of JSON.parse(readFileSync(join(ROOT, 'games.json'), 'utf8'))) {
    if (!g.icon) continue;
    const file = join(ROOT, g.icon);
    if (!existsSync(file)) {
      errors.push(`${g.id}: 아이콘 파일이 없습니다(${g.icon})`);
      continue;
    }
    if (!g.icon.endsWith('.svg') || !g.color) continue;
    const bg = iconBackground(readFileSync(file, 'utf8'));
    if (!bg) continue;
    const { contrast, hueDiff, ok } = distinct(bg, hexRgb(g.color));
    if (!ok) {
      errors.push(
        `${g.id}: 아이콘 바탕색이 카드 그림판 색(${g.color})과 너무 비슷합니다(밝기 대비 ${contrast.toFixed(2)}, 색상 차이 ${Math.round(hueDiff)}°). ` +
          `대비 ${MIN_CONTRAST} 이상이거나 색상 차이 ${MIN_HUE}° 이상이 되게 아이콘 바탕이나 color 를 바꾸세요`,
      );
    }
  }
  return errors;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = checkIcons();
  if (errors.length) {
    console.error('허브 카드 아이콘 검사 실패(기준서 6장 1번):\n- ' + errors.join('\n- '));
    process.exit(1);
  }
  console.log('아이콘 검사: 모든 게임 아이콘이 카드 그림판 색과 구분됨');
}

/** 공개 예약 게임 아이콘이 COMING SOON 그림판 후보 어느 것과도 비슷하면 경고 문구 */
export function teaserWarnings() {
  return JSON.parse(readFileSync(join(ROOT, 'games.json'), 'utf8'))
    .filter((g) => g.open && g.icon?.endsWith('.svg') && existsSync(join(ROOT, g.icon)))
    .filter((g) => !teaserBackdrop(readFileSync(join(ROOT, g.icon), 'utf8'), g.color).ok)
    .map((g) => `${g.id}: 아이콘 바탕색이 COMING SOON 카드 그림판 후보(게임 색과 겹치지 않는 것) 모두와 비슷합니다. 아이콘 바탕을 바꾸거나 scripts/check-icons.mjs TEASER_BACKDROPS 에 후보를 더하세요`);
}
