import { FACE_SETS, type FaceId, type SpecialId } from '../game/faces';

/**
 * 카드 그림 48장 + 특수 카드 2장 + 카드 뒷면 + 시간 막대 스톱워치.
 * 도형·팝아트 16장과 특수 카드·뒷면·마스코트는 이 파일에서 코드로 그린 SVG,
 * 명화 32장은 메트로폴리탄 미술관 Open Access(CC0) 이미지를 잘라 만든 src/art/*.webp(만드는 법·출처는 art-src/)
 */

const INK = '#2b2233';
/** 눈: 검은 점 + 흰 반짝임 */
const eye = (x: number, y: number, r = 2.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;
const eyes = (x1: number, x2: number, y: number, r?: number) => eye(x1, y, r) + eye(x2, y, r);
const line = (d: string, color: string, w = 3) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ---------- 도형(1판): 색과 모양이 뚜렷한 납작한 도형. 아래쪽 옅은 그림자 + 위쪽 반사광 하나 ---------- */

const glint = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>`;
const floor = `<ellipse cx="32" cy="56" rx="16" ry="2.6" fill="${INK}" opacity=".12"/>`;
const SHAPES: Record<string, string> = {
  circle: floor + `<circle cx="32" cy="31" r="20" fill="#374151"/>` + glint('M20 25a14 14 0 0 1 9-8'),
  triangle: floor + `<path d="M32 9 54 50H10z" fill="#2563eb" stroke="#2563eb" stroke-width="5" stroke-linejoin="round"/>` + glint('M27 22l-6 11'),
  square: floor + `<rect x="13" y="12" width="38" height="38" rx="6" fill="#16a34a"/>` + glint('M19 20v9'),
  diamond: floor + `<path d="M32 7 55 31 32 55 9 31z" fill="#dc2626" stroke="#dc2626" stroke-width="4" stroke-linejoin="round"/>` + glint('M27 17l-7 8'),
  hexagon: floor + `<path d="M32 9 51 20v22L32 53 13 42V20z" fill="#9333ea" stroke="#9333ea" stroke-width="4" stroke-linejoin="round"/>` + glint('M18 24v8'),
  ring: floor + `<circle cx="32" cy="31" r="15" fill="none" stroke="#ec4899" stroke-width="11"/>` + glint('M19 24a14 14 0 0 1 6-6'),
  plus: floor + `<path d="M25 10h14v14h14v14H39v14H25V38H11V24h14z" fill="#0d9488" stroke="#0d9488" stroke-width="4" stroke-linejoin="round"/>` + glint('M29 15v6'),
  // 초승달: 조이팩 허브의 타임 투 플립 아이콘(public/favicon.svg) 앞면 카드의 달과 같은 모양
  moon: floor + `<path d="M38.4 11.6a19.6 19.6 0 1 0 6.9 30.4 17.2 17.2 0 0 1-6.9-30.4z" fill="#fbbf24"/>` + glint('M19 25a15 15 0 0 1 6-9'),
};

/* ---------- 팝아트(2판): 굵은 검은 외곽선 + 망점(벤데이 점) 바탕. 카드마다 바탕색이 달라 멀리서도 구분된다(50×64) ---------- */

const O = `stroke="#111" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const popBg = (id: string, bg: string, dot: string) =>
  `<defs><pattern id="d-${id}" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.05" fill="${dot}"/></pattern></defs>` +
  `<rect width="50" height="64" fill="${bg}"/><rect width="50" height="64" fill="url(#d-${id})" opacity=".55"/>`;
const POPS: Record<string, string> = {
  lips:
    popBg('lips', '#ffd400', '#ff8a00') +
    `<path d="M6 33c6-10 12-11 19-5 7-6 13-5 19 5-12 3-26 3-38 0z" fill="#e11d48" ${O}/>` +
    `<path d="M6 33c12 3 26 3 38 0-5 12-33 12-38 0z" fill="#be123c" ${O}/>` +
    `<ellipse cx="31" cy="38.5" rx="5" ry="1.8" fill="#fff" opacity=".85"/>`,
  bolt: popBg('bolt', '#2563eb', '#93c5fd') + `<path d="M29 6 11 36h12l-5 22 21-31H27l6-21z" fill="#fde047" ${O}/>`,
  eye:
    popBg('eye', '#ec4899', '#fbcfe8') +
    `<path d="M4 33q21-22 42 0-21 22-42 0z" fill="#fff" ${O}/>` +
    `<circle cx="25" cy="33" r="9" fill="#0ea5e9" ${O}/><circle cx="25" cy="33" r="4" fill="#111"/><circle cx="28" cy="30" r="2" fill="#fff"/>` +
    `<path d="M9 25 6 20M15 21l-2-6M25 19v-6M35 21l2-6M41 25l3-5" fill="none" ${O}/>`,
  pow:
    popBg('pow', '#22c55e', '#bbf7d0') +
    `<path d="M25 9l4 11 10-7-3 12 12 1-10 7 9 8-12 0 2 12-9-8-7 9-1-12-11 4 6-10-10-6 12-2-5-11 10 5z" fill="#fde047" ${O}/>` +
    `<text x="25" y="38" text-anchor="middle" font-size="10.5" font-weight="700" fill="#ef4444" stroke="#111" stroke-width=".9" paint-order="stroke" transform="rotate(-10 25 34)">POW!</text>`,
  heart:
    popBg('heart', '#7c3aed', '#c4b5fd') +
    `<path d="M25 53C7 40 4 26 12 20c6-4 11-1 13 4 2-5 7-8 13-4 8 6 5 20-13 33z" fill="#ef4444" ${O}/>` +
    `<path d="M13 27q1-4 5-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`,
  shades:
    popBg('shades', '#06b6d4', '#a5f3fc') +
    `<path d="M3 27h44" fill="none" ${O}/>` +
    `<rect x="5" y="25" width="17" height="13" rx="5" fill="#111"/><rect x="28" y="25" width="17" height="13" rx="5" fill="#111"/>` +
    `<path d="M22 29q3-3 6 0" fill="none" ${O}/>` +
    `<path d="M9 28l5 7M32 28l5 7" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>`,
  cone:
    popBg('cone', '#f97316', '#fed7aa') +
    `<path d="M14 32h22L25 58z" fill="#d97706" ${O}/>` +
    `<path d="M17 36l13 13M23 34l9 9M33 36 20 49M27 34l-9 9" stroke="#92400e" stroke-width="1.2"/>` +
    `<circle cx="25" cy="24" r="12" fill="#f9a8d4" ${O}/>` +
    `<path d="M14 30q2 6 5 1 2 6 5 1 3 5 5 0 3 5 6-2" fill="#f9a8d4" ${O}/>` +
    `<circle cx="21" cy="19" r="2.4" fill="#fff" opacity=".8"/>`,
  crown:
    popBg('crown', '#e11d48', '#fecdd3') +
    `<path d="M8 44 10 20l8 11 7-16 7 16 8-11 2 24z" fill="#fde047" ${O}/>` +
    `<rect x="8" y="44" width="34" height="7" rx="1.5" fill="#f59e0b" ${O}/>` +
    `<circle cx="25" cy="47.5" r="2.2" fill="#2563eb"/><circle cx="15" cy="47.5" r="1.8" fill="#22c55e"/><circle cx="35" cy="47.5" r="1.8" fill="#22c55e"/>`,
};

/* ---------- 명화(3판~): 메트로폴리탄 미술관 Open Access(CC0) 이미지를 잘라 만든 webp(art-src/ 참고) ---------- */

const PHOTOS = import.meta.glob<string>('../art/*.webp', { eager: true, query: '?url', import: 'default' });
const photoUrl = (face: string) => PHOTOS[`../art/${face}.webp`];
const INK_FACES = new Set<string>(FACE_SETS.find((s) => s.id === 'ink')!.faces);

/* ---------- 특수 카드(시계·돋보기): 청록 입체 아이콘 + 금 포인트(종·다리·바늘 중심·손잡이 고리). 카드는 은 액자(styles.css .card.special) ---------- */

// 그라데이션 id 는 그림마다 새로(같은 id 가 여러 번 있으면 숨은 첫 그림의 정의를 따라가 색이 빠질 수 있음)
let specialSeq = 0;
const lin = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const TEAL_RIM: [number, string][] = [[0, '#2bb3c4'], [1, '#0b6a77']];
const GOLD_PART: [number, string][] = [[0, '#ffe58a'], [1, '#c98a06']];
const ground = (cx: number, cy: number, rx: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="2.4" fill="#2a2433" opacity=".14"/>`;

const SPECIALS: Record<SpecialId, () => string> = {
  clock: () => {
    const id = `sp${specialSeq++}`;
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r1 = i % 3 ? 12.6 : 11.2;
      return `<line x1="${32 + Math.cos(a) * r1}" y1="${36 + Math.sin(a) * r1}" x2="${32 + Math.cos(a) * 14}" y2="${36 + Math.sin(a) * 14}" stroke="#0b6a77" stroke-width="${i % 3 ? 1 : 1.8}" stroke-linecap="round"/>`;
    }).join('');
    return (
      `<defs>${lin(`${id}r`, TEAL_RIM)}${lin(`${id}g`, GOLD_PART)}</defs>` +
      ground(32, 60, 15) +
      line('M22 52l-3.5 5M42 52l3.5 5', '#c98a06', 3) +
      `<path d="M12.5 21.5a7 7 0 0 1 10-5.5z" fill="url(#${id}g)"/><path d="M51.5 21.5a7 7 0 0 0-10-5.5z" fill="url(#${id}g)"/>` +
      `<rect x="30" y="12" width="4" height="5" rx="1.4" fill="#c98a06"/>` +
      `<circle cx="32" cy="36" r="18" fill="url(#${id}r)"/><circle cx="32" cy="36" r="15" fill="#fff"/>` +
      `<path d="M21 31a11.5 11.5 0 0 1 15-8.5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".5"/>` +
      ticks +
      line('M32 36V26.5M32 36l5.8 3.8', '#20283a', 2.2) +
      `<circle cx="32" cy="36" r="2" fill="#f5b301"/>` +
      `<path d="M18.5 28.5a15.5 15.5 0 0 1 10-9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".55"/>`
    );
  },
  peek: () => {
    const id = `sp${specialSeq++}`;
    return (
      `<defs>${lin(`${id}r`, TEAL_RIM)}${lin(`${id}g`, GOLD_PART)}<radialGradient id="${id}l" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#d8f6ff"/><stop offset="1" stop-color="#9bdcf0"/></radialGradient></defs>` +
      ground(34, 58, 17) +
      line('M38.5 38.5l12 12', '#20283a', 6.5) +
      `<path d="M36.5 36.5l3.6 3.6" stroke="url(#${id}g)" stroke-width="8"/>` +
      `<circle cx="28" cy="28" r="17" fill="url(#${id}r)"/><circle cx="28" cy="28" r="13.4" fill="url(#${id}l)"/>` +
      eyes(23, 33, 30, 2.3) +
      `<path d="M19.5 24a9.5 9.5 0 0 1 8-6.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".85"/>`
    );
  },
};

/** 카드 앞면 그림. 도형·특수 카드는 64×64 SVG, 팝아트는 카드 비율 SVG, 명화는 그림 파일(동양화는 .ink: 닮은 카드가 좌우 뒤집힘) */
export function faceSvg(face: FaceId | SpecialId): string {
  const pop = POPS[face];
  if (pop) return `<svg class="art" viewBox="0 0 50 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${pop}</svg>`;
  const url = photoUrl(face);
  if (url) return `<img class="art${INK_FACES.has(face) ? ' ink' : ''}" src="${url}" alt="" draggable="false" decoding="async">`;
  const body = SHAPES[face] ?? SPECIALS[face as SpecialId]();
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** 명화 그림을 미리 받아 둔다(뒤집는 순간 빈칸이 보이지 않게). 처음 화면을 그린 뒤 한 번 부른다 */
export function preloadFaces(): void {
  for (const url of Object.values(PHOTOS)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}

/**
 * 카드 뒷면: 조이팩 로고 얼굴(십자 버튼 눈·동그란 버튼 눈·웃는 입)을 가운데 볼록한 메달 안에 새겼다.
 * 층: 레몬 방사 그라데이션 → 사선 줄무늬 → 이중 테두리·모서리 점 → 메달(아래 그림자) → 얼굴(그림자 + 본체) → 왼쪽 위 광택.
 * 스킨 강조색 테두리와 지나가는 빛줄기는 CSS(.back::before/::after)
 */
const LOGO_FACE = `<rect x="120" y="198" width="116" height="40" rx="14"/><rect x="158" y="160" width="40" height="116" rx="14"/><circle cx="336" cy="218" r="44"/><path d="M152 318 Q256 428 360 318" fill="none" stroke-width="40" stroke-linecap="round"/>`;
const logoFace = (dy: number, color: string) => `<g transform="translate(19.3 ${30.5 + dy}) scale(.12)" fill="${color}" stroke="${color}">${LOGO_FACE}</g>`;
export const CARD_BACK = `<svg class="back-art" viewBox="0 0 100 128" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="cb-bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#ffd84f"/><stop offset=".55" stop-color="#ffb703"/><stop offset="1" stop-color="#e48c00"/></radialGradient>
    <radialGradient id="cb-medal" cx=".42" cy=".35" r=".7"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f5a500"/></radialGradient>
    <pattern id="cb-str" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3" height="7" fill="#fff" opacity=".13"/></pattern>
  </defs>
  <rect width="100" height="128" fill="url(#cb-bg)"/>
  <rect width="100" height="128" fill="url(#cb-str)"/>
  <rect x="7" y="7" width="86" height="114" rx="9" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".75"/>
  <rect x="11.5" y="11.5" width="77" height="105" rx="6" fill="none" stroke="#b36b00" stroke-width="1" stroke-dasharray="2 2.6" opacity=".45"/>
  <g fill="#fff3c4" opacity=".9"><circle cx="17" cy="17" r="2"/><circle cx="83" cy="17" r="2"/><circle cx="17" cy="111" r="2"/><circle cx="83" cy="111" r="2"/></g>
  <circle cx="50" cy="66.5" r="29" fill="#b36b00" opacity=".35"/>
  <circle cx="50" cy="64" r="29" fill="url(#cb-medal)" stroke="#c27a00" stroke-width="2"/>
  <circle cx="50" cy="64" r="24.5" fill="none" stroke="#fff6d6" stroke-width="1.2" opacity=".7"/>
  ${logoFace(2.2, '#b36b00')}
  <circle cx="31.5" cy="70.5" r="3.3" fill="#ff7a3d" opacity=".85"/><circle cx="68.5" cy="70.5" r="3.3" fill="#ff7a3d" opacity=".85"/>
  ${logoFace(0, '#3d2a00')}
  <path d="M8 34Q12 10 40 8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".28"/>
</svg>`;

/**
 * 시간 막대 끝 스톱워치: 진한 테 + 흰 판 + 강조색 바늘 하나. 바늘은 남은 시간(--at)만큼 돌고,
 * 5초 아래면 바늘이 빨개지고 몸을 떤다. 미리 보기(외우는 시간) 동안은 스톱워치 대신 눈(.sw-eye)이 보인다(styles.css .mascot)
 */
export const MASCOT = `<svg class="mascot-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <g class="sw-watch">
  <rect x="17" y="1" width="6" height="4" rx="1.5" fill="${INK}"/>
  <path d="M30.5 7.5l2.5-2.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="20" cy="22" r="16" fill="${INK}"/>
  <circle cx="20" cy="22" r="12.5" fill="#fff"/>
  <path d="M20 9.5L20 12M32.5 22L30 22M20 34.5L20 32M7.5 22L10 22" stroke="${INK}" stroke-width="1.6" opacity=".4"/>
  <g class="sw-hand"><path d="M20 22V12" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="22" r="2.2"/></g>
  </g>
  <g class="sw-eye">
    <path d="M2 21C8 11 14 7 20 7s12 4 18 14C32 31 26 35 20 35S8 31 2 21z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="20" cy="21" r="8.5" fill="#f2a300"/>
    <circle cx="20" cy="21" r="4.4" fill="${INK}"/>
    <circle cx="22.6" cy="18.4" r="1.9" fill="#fff"/>
  </g>
</svg>`;
