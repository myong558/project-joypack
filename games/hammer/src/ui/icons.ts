import type { MoleKind } from '../game/types';
import { mulberry32 } from '../game/rng';
import type { Skin, SkinSetting, Theme } from '../theme';

/**
 * 이모지 대신 쓰는 아이콘과 그림.
 * UI 아이콘은 둥근 선 + 옅은 면(currentColor)으로 통일하고,
 * 두더지 장식·망치·배경 소품은 두더지와 같은 굵은 갈색 외곽선의 만화풍으로 그린다.
 */

const ui = (body: string) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  globe: ui(
    '<circle class="fill" cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  ),
  gear: ui(
    '<path class="fill" d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>' +
      '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  ),
  soundOn: ui('<path class="fill" d="M11 5 6 9H2v6h4l5 4z"/><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>'),
  soundOff: ui('<path class="fill" d="M11 5 6 9H2v6h4l5 4z"/><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>'),
  shakeOn: ui('<rect class="fill" x="8" y="4" width="8" height="16" rx="2"/><rect x="8" y="4" width="8" height="16" rx="2"/><path d="m3 8 2 2-2 2 2 2"/><path d="m21 8-2 2 2 2-2 2"/>'),
  shakeOff: ui('<rect class="fill" x="8" y="4" width="8" height="16" rx="2"/><rect x="8" y="4" width="8" height="16" rx="2"/><path d="M3 3l18 18"/>'),
  pause: ui('<rect class="fill" x="6" y="4" width="4" height="16" rx="1.5"/><rect class="fill" x="14" y="4" width="4" height="16" rx="1.5"/><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>'),
  target: ui('<circle class="fill" cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  lock: ui('<rect class="fill" x="4" y="11" width="16" height="10" rx="2.5"/><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  check: ui('<path d="M20 6 9 17l-5-5"/>'),
  arrow: ui('<path d="M4.5 12h14M12.5 5.5 19 12l-6.5 6.5"/>'),
  sparkle: ui('<path class="fill" d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M19 17v4M17 19h4"/>'),
};

export const THEME_ICONS: Record<Theme, string> = {
  // 기기 설정을 따름: 모니터 앞에 휴대폰을 겹쳐 PC·스마트폰 모두 떠오르게
  system: ui('<rect class="fill" x="2" y="4" width="15" height="10.5" rx="1.8"/><path d="M14 14.5H3.8A1.8 1.8 0 0 1 2 12.7V5.8A1.8 1.8 0 0 1 3.8 4h11.4A1.8 1.8 0 0 1 17 5.8V9"/><path d="M6 19h7M9.5 14.5V19"/><rect class="fill" x="15" y="9" width="7" height="12" rx="1.6"/><rect x="15" y="9" width="7" height="12" rx="1.6"/><path d="M17.8 18.6h1.4"/>'),
  light: ui('<circle class="fill" cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  dark: ui('<path class="fill" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
};

export const MORE_ICONS = {
  close: ui('<path d="M18 6 6 18M6 6l12 12"/>'),
  trophy: ui('<path class="fill" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8M9.5 17h5v3h-5z"/>'),
  chevronLeft: ui('<path d="m15 5-7 7 7 7"/>'),
  chevronRight: ui('<path d="m9 5 7 7-7 7"/>'),
  share: ui('<circle class="fill" cx="18" cy="5" r="3"/><circle class="fill" cx="6" cy="12" r="3"/><circle class="fill" cx="18" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
  link: ui('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'),
  home: ui('<path class="fill" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
};

export const SKIN_ICONS: Record<SkinSetting, string> = {
  auto: ui('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'),
  garden: ui(
    '<circle class="fill" cx="12" cy="7" r="3.2"/><circle class="fill" cx="16.5" cy="11" r="3.2"/><circle class="fill" cx="7.5" cy="11" r="3.2"/>' +
      '<path d="M12 4a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.6M12 4a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.6"/><circle cx="12" cy="10" r="2"/><path d="M12 13v8M12 18c-2-2-4-2-5-1M12 17c2-2 4-2 5-1"/>',
  ),
  desert: ui('<path class="fill" d="M10 21V6a2 2 0 0 1 4 0v15z"/><path d="M10 21V6a2 2 0 0 1 4 0v15"/><path d="M10 14H8a2 2 0 0 1-2-2V9"/><path d="M14 11h2a2 2 0 0 0 2-2V7"/><path d="M4 21h16"/>'),
  jungle: ui(
    '<path class="fill" d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>',
  ),
  snow: ui('<path class="fill" d="m8 3 4 8 5-5 5 15H2z"/><path d="m8 3 4 8 5-5 5 15H2z"/><path d="M4.5 15c2.6-1.5 5.2-1.4 7.8.4 2.7 2 5.5 2 8.2.2"/>'),
};

/* ---------- 만화풍 그림 (두더지 장식·망치·소품) ---------- */

const OL = '#3b2414';
const art = (body: string, view = '0 0 64 64') =>
  `<svg class="art" viewBox="${view}" aria-hidden="true" focusable="false" stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

export const CROWN = art(
  '<path d="M10 46 8 18l13 13 11-20 11 20 13-13-2 28z" fill="#ffcf3d"/>' +
    '<path d="M10 46h44v9H10z" fill="#f5a623"/>' +
    '<path d="M15 24l4 18" stroke="#fff3b0" stroke-width="2.5"/>' +
    '<circle cx="8" cy="18" r="3.5" fill="#fff1a8"/><circle cx="32" cy="11" r="4" fill="#fff1a8"/><circle cx="56" cy="18" r="3.5" fill="#fff1a8"/>' +
    '<circle cx="32" cy="39" r="4.5" fill="#e2557a"/><circle cx="19" cy="41" r="3" fill="#3b82d6"/><circle cx="45" cy="41" r="3" fill="#3fb36b"/>',
);

export const HELMET = art(
  '<path d="M9 42C9 22 20 12 32 12s23 10 23 30z" fill="#ff5a4f"/>' +
    '<path d="M16 30c2-8 7-12 12-13" stroke="#ffb3ac" stroke-width="3"/>' +
    '<path d="M32 12v30" stroke-width="2.5"/>' +
    '<rect x="3" y="40" width="58" height="8" rx="4" fill="#d9362e"/>' +
    '<circle cx="44" cy="29" r="6" fill="#fff"/><path d="M44 25.5v7M40.5 29h7" stroke="#ff5a4f" stroke-width="2.5"/>',
);

export const BOMB = art(
  '<path d="M44 18c4-6 9-8 14-5" fill="none" stroke="#b8894f" stroke-width="3.5"/>' +
    '<path d="M36 15l9-3 3 9-9 3z" fill="#6c6580"/>' +
    '<circle cx="28" cy="40" r="20" fill="#3a3150"/>' +
    '<ellipse cx="20" cy="32" rx="5" ry="3.2" fill="#8d84a8" stroke="none" transform="rotate(-30 20 32)"/>' +
    '<path class="spark" d="M58 6l2 5 5 1-4 3 1 5-4-3-5 2 2-5-3-4 5 0z" fill="#ffd23f" stroke="#e8722c" stroke-width="2"/>',
);

export const CLOCK = art(
  '<circle cx="16" cy="16" r="8" fill="#ffcf3d"/><circle cx="48" cy="16" r="8" fill="#ffcf3d"/>' +
    '<path d="M18 54l-4 6M46 54l4 6"/>' +
    '<circle cx="32" cy="36" r="22" fill="#ff6b6b"/>' +
    '<circle cx="32" cy="36" r="16" fill="#fffaf0"/>' +
    '<path d="M32 36V26M32 36l7 5" stroke-width="3.5"/><circle cx="32" cy="36" r="2" fill="' + OL + '"/>' +
    '<path d="M22 24a14 14 0 0 1 8-5" stroke="#fff" stroke-width="2.5"/>',
);

export const ICE = art(
  '<path d="M32 8 56 20 32 32 8 20z" fill="#e3f7ff"/>' +
    '<path d="M8 20l24 12v26L8 46z" fill="#9edcf7"/>' +
    '<path d="M56 20 32 32v26l24-12z" fill="#62bde9"/>' +
    '<path d="M15 27v10M20 31v4M40 40l8-4" stroke="#fff" stroke-width="2.5"/>',
);

export const SPARKLE = art(
  '<path d="M32 4c2 18 8 24 26 26-18 2-24 8-26 26-2-18-8-24-26-26 18-2 24-8 26-26z" fill="#fff3a6" stroke="#d9a000"/>' +
    '<path d="M52 44c.7 5 2.3 6.6 7 7-4.7.7-6.3 2.3-7 7-.7-4.7-2.3-6.3-7-7 4.7-.4 6.3-2 7-7z" fill="#fff" stroke="#d9a000" stroke-width="2"/>',
);

export const WIND = art(
  '<g fill="none"><path d="M6 22h30a8 8 0 1 0-8-8" stroke-width="9"/><path d="M6 36h42a8 8 0 1 1-8 8" stroke-width="9"/><path d="M12 50h16" stroke-width="9"/></g>' +
    '<g fill="none" stroke="#f2f7ff"><path d="M6 22h30a8 8 0 1 0-8-8" stroke-width="4"/><path d="M6 36h42a8 8 0 1 1-8 8" stroke-width="4"/><path d="M12 50h16" stroke-width="4"/></g>',
);

/** 뿅망치: 빨간 머리 양끝, 노란 주름 몸통, 노란 손잡이 */
export const HAMMER = art(
  '<rect x="28" y="28" width="8" height="32" rx="4" fill="#ffd23f"/>' +
    '<path d="M28 40h8M28 48h8" stroke-width="2"/>' +
    '<rect x="15" y="9" width="34" height="20" rx="4" fill="#ffd23f"/>' +
    '<path d="M21 9v20M27 9v20M33 9v20M39 9v20M45 9v20" stroke-width="2"/>' +
    '<rect x="4" y="4" width="14" height="30" rx="6" fill="#ff4d5a"/>' +
    '<rect x="46" y="4" width="14" height="30" rx="6" fill="#ff4d5a"/>' +
    '<path d="M8.5 9v10M50.5 9v10" stroke="#ffb3b9" stroke-width="2.5"/>',
);

export const DIZZY = art(
  '<ellipse cx="32" cy="32" rx="28" ry="9" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 5"/>' +
    '<path d="M10 25l2 4 4 .5-3 3 1 4-4-2-3.5 2 .7-4-3-3 4-.5z" fill="#ffd84d" stroke-width="2"/>' +
    '<path d="M34 34l2 4 4 .5-3 3 1 4-4-2-3.5 2 .7-4-3-3 4-.5z" fill="#ffd84d" stroke-width="2"/>' +
    '<path d="M52 23l2 4 4 .5-3 3 1 4-4-2-3.5 2 .7-4-3-3 4-.5z" fill="#ffd84d" stroke-width="2"/>',
);

export const STAR_ON = art('<path d="M32 5l8 17 18.5 2.5-13.5 13 3.5 18.5L32 47l-16.5 9 3.5-18.5-13.5-13L24 22z" fill="#ffcf3d"/><path d="M24 26l3-6" stroke="#fff3b0" stroke-width="3"/>');
export const STAR_OFF = art('<path d="M32 5l8 17 18.5 2.5-13.5 13 3.5 18.5L32 47l-16.5 9 3.5-18.5-13.5-13L24 22z" fill="#d8d0c4" stroke="#9a8f80"/>');

export const ACCESSORY_ART: Partial<Record<MoleKind, string>> = {
  golden: SPARKLE,
  helmet: HELMET,
  swift: WIND,
  bomb: BOMB,
  clock: CLOCK,
  ice: ICE,
  king: CROWN,
};

/* ---------- 판 가장자리 소품 (스킨별) ---------- */

const FLOWER = (petal: string) =>
  art(
    '<path d="M32 40v20" stroke-width="3.5"/><path d="M32 52c-6-6-12-6-15-3 4 4 10 5 15 3z" fill="#5fb548"/>' +
      [0, 72, 144, 216, 288].map((a) => `<ellipse cx="32" cy="20" rx="7" ry="10" fill="${petal}" transform="rotate(${a} 32 30)"/>`).join('') +
      '<circle cx="32" cy="30" r="6" fill="#ffd23f"/>',
  );
const SPROUT = art('<path d="M32 60V34" stroke-width="3.5"/><path d="M32 40c-2-12-12-16-22-14 2 10 10 16 22 14zM32 36c2-12 12-16 22-14-2 10-10 16-22 14z" fill="#6cc04a"/>');
const CACTUS = art('<path d="M26 60V16a6 6 0 0 1 12 0v44z" fill="#6fae52"/><path d="M26 40h-6a6 6 0 0 1-6-6v-8a3 3 0 0 1 6 0v6h6M38 34h6v-8a3 3 0 0 1 6 0v8a6 6 0 0 1-6 6h-6" fill="#6fae52"/><path d="M32 22v30" stroke="#9bd27b" stroke-width="2"/>');
const ROCK = art('<path d="M8 56c0-14 8-26 22-28 12-2 26 8 26 28z" fill="#c99a6a"/><path d="M20 40c3-5 8-7 12-7" stroke="#f0d2ad" stroke-width="2.5"/>');
const LEAF = art('<path d="M10 58C10 30 28 10 56 8c0 28-18 48-46 50z" fill="#3ea85e"/><path d="M12 56 46 20M24 44l-2-10M34 34l8 1" stroke-width="2.5"/>');
const PINE = art('<path d="M32 4 50 30H40l14 18H10l14-18H14z" fill="#5f88b0"/><path d="M32 4l6 9h-12z" fill="#fff"/><path d="M28 48h8v12h-8z" fill="#8a5a2b"/>');
const SNOWFLAKE = art('<g stroke="#e8f4ff" stroke-width="4"><path d="M32 6v52M9 19l46 26M9 45l46-26"/></g><g stroke-width="1.5" fill="none"><path d="M32 6v52M9 19l46 26M9 45l46-26"/></g>');

export const DECO_ART: Record<Skin, [string, string]> = {
  garden: [FLOWER('#ff9cbf'), SPROUT],
  desert: [CACTUS, ROCK],
  jungle: [LEAF, FLOWER('#ff6a5a')],
  snow: [PINE, SNOWFLAKE],
};

/* ---------- 구멍: 뒤(둔덕·구멍 속)와 앞(앞 테두리) ---------- */

type Pt = [number, number];
const f1 = (n: number) => n.toFixed(1);

/** 점들을 이어 부드러운 닫힌 곡선으로: 꼭짓점을 조절점으로, 변의 가운데를 지나간다 */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f1(start[0])} ${f1(start[1])}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return d + 'Z';
}

/** 타원 둘레를 울퉁불퉁하게: 손으로 그린 듯한 둔덕·바위·흙덩이 가장자리 */
function wobblyEllipse(cx: number, cy: number, rx: number, ry: number, rng: () => number, jitter: number, n = 12): string {
  const phase = rng() * Math.PI * 2;
  return smoothClosed(
    Array.from({ length: n }, (_, i): Pt => {
      const a = phase + (i / n) * Math.PI * 2;
      const k = 1 + (rng() - 0.5) * jitter;
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    }),
  );
}

/** 앞 테두리: 안쪽은 구멍 입구 타원, 바깥쪽은 구멍마다 다르게 울퉁불퉁한 흙 둘레 */
function lipPath(rng: () => number, outer: [number, number], inset: number): string {
  const n = 9;
  const [rx, ry] = outer;
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI;
    const k = i === 0 || i === n ? 1 : 1 + (rng() - 0.4) * 0.26;
    return [50 + Math.cos(a) * rx * k, 33 - inset + Math.sin(a) * ry * k];
  });
  let d = `M12 30A38 14 0 0 0 88 30L${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < n; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return `${d}L${f1(pts[n][0])} ${f1(pts[n][1])}z`;
}

const tuft = (x: number, y: number, s: number, flip: boolean) =>
  `<path class="h-grass" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(flip ? -s : s)} ${f1(s)})" d="M0 0c-1-3-1-6 0-8 1 2 1 4 1 6 0-3 1-6 3-8 0 3-1 6-1 9 1-2 3-3 4-3-1 2-2 3-3 4z"/>`;

/** 둘레에 걸친 바위. 덮개(이끼·눈)와 색은 스킨에 따라 CSS에서 정한다 */
function boulder(x: number, y: number, r: number, rng: () => number): string {
  const body = wobblyEllipse(x, y, r, r * 0.78, rng, 0.5, 7);
  const cap = wobblyEllipse(x - r * 0.1, y - r * 0.42, r * 0.72, r * 0.32, rng, 0.35, 6);
  return (
    `<path class="h-rock" d="${body}"/>` +
    `<ellipse class="h-rock-hi" cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.3)}" rx="${f1(r * 0.3)}" ry="${f1(r * 0.16)}"/>` +
    `<path class="h-rock-cap" d="${cap}"/>`
  );
}

/** 둔덕 둘레에서 떨어져 나온 흙덩이. 매끈한 타원 실루엣을 깨뜨린다 */
const clod = (x: number, y: number, r: number, rng: () => number) =>
  `<path class="h-clod" d="${wobblyEllipse(x, y, r, r * 0.7, rng, 0.45, 6)}"/>` +
  `<ellipse class="h-clod-hi" cx="${f1(x - r * 0.25)}" cy="${f1(y - r * 0.3)}" rx="${f1(r * 0.4)}" ry="${f1(r * 0.18)}"/>`;

/* 스킨별 소품. 한 구멍에 네 스킨 몫을 모두 그려 두고 지금 스킨 것만 CSS로 보인다 */
const flower = (x: number, y: number, s: number) =>
  `<g class="h-flower" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><path class="stem" d="M0 0q.5-3 0-5"/>` +
  [0, 72, 144, 216, 288].map((a) => `<ellipse class="petal" cx="0" cy="-7.4" rx="1.5" ry="2.1" transform="rotate(${a} 0 -5.4)"/>`).join('') +
  '<circle class="core" cx="0" cy="-5.4" r="1.1"/></g>';
const clover = (x: number, y: number, s: number) =>
  `<g class="h-clover" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">` +
  [-50, 50, 180].map((a) => `<circle cx="0" cy="-1.6" r="1.5" transform="rotate(${a})"/>`).join('') +
  '</g>';
const cactus = (x: number, y: number, s: number, flip: boolean) =>
  `<g class="h-cactus" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(flip ? -s : s)} ${f1(s)})">` +
  '<path d="M-1.6 0v-9a1.6 1.6 0 0 1 3.2 0V0zM1.6-4.5h1.4a1 1 0 0 0 1-1V-7a1 1 0 0 1 2 0v1.8a3 3 0 0 1-3 3H1.6zM-1.6-3h-1a2.6 2.6 0 0 1-2.6-2.6v-.9a1 1 0 0 1 2 0v.6c0 .5.3.9.8.9h.8z"/>' +
  '<path class="rib" d="M0-9.5v8.5"/></g>';
const twig = (x: number, y: number, s: number, flip: boolean) =>
  `<path class="h-twig" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(flip ? -s : s)} ${f1(s)})" d="M0 0l7-2.5m-3.2 1.1 1.6-2.4m-1.4 1.5 2.6-.2"/>`;
const ripple = (x: number, y: number) =>
  `<path class="h-ripple" d="M${f1(x)} ${f1(y)}q3-1.4 6 0t6 0M${f1(x + 2)} ${f1(y + 2.2)}q3-1.2 6 0"/>`;
const leaf = (x: number, y: number, s: number, rot: number) =>
  `<g class="h-leaf" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(s)})"><path d="M0 0c2-4 7-5 11-3-2 4-7 5-11 3z"/><path class="vein" d="M.5 0 9.5-2.6"/></g>`;
const mushroom = (x: number, y: number, s: number) =>
  `<g class="h-mush" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><path class="stalk" d="M-1 0v-3.4h2V0z"/><path class="cap" d="M-3.6-3a3.6 3 0 0 1 7.2 0z"/><circle class="dot" cx="-1.2" cy="-4.4" r=".55"/><circle class="dot" cx="1.3" cy="-3.8" r=".45"/></g>`;
const snowPile = (x: number, y: number, r: number, rng: () => number) =>
  `<path class="h-snow" d="${wobblyEllipse(x, y, r, r * 0.45, rng, 0.3, 7)}"/>`;
const iceShard = (x: number, y: number, s: number, flip: boolean) =>
  `<g class="h-ice" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(flip ? -s : s)} ${f1(s)})"><path d="M0 0 1.2-6.5 3-1zM2.4 0l2.4-4.4L5.6 0z"/><path class="glint" d="M.9-4.6.6-2"/></g>`;

/**
 * 두더지가 사이에 끼도록 구멍을 뒤·앞 두 장으로 그린다. 색은 스킨 변수를 CSS에서 입힌다.
 * 구멍마다 시드로 둘레 모양·흙덩이·바위·소품을 바꿔 아홉 개가 모두 조금씩 다르다.
 */
export function holeArt(seed = 0): { back: string; front: string } {
  const rng = mulberry32(seed * 7919 + 17);
  const pick = (a: number, b: number) => a + rng() * (b - a);
  const chance = (p: number) => rng() < p;

  /** 둔덕 둘레 위의 한 점. a는 라디안(0=오른쪽, π/2=아래) */
  const rim = (a: number, k = 1): Pt => [50 + Math.cos(a) * 45 * k, 33 + Math.sin(a) * 19.5 * k];

  // 위쪽 둘레(뒤)와 아래쪽 둘레(앞)에 흙덩이를 흩뿌린다
  const backClods = Array.from({ length: 1 + Math.floor(rng() * 3) }, () => {
    const [x, y] = rim(pick(Math.PI * 1.1, Math.PI * 1.9), pick(0.95, 1.05));
    return clod(x, y, pick(4.5, 7.5), rng);
  }).join('');
  const frontClods = Array.from({ length: 1 + Math.floor(rng() * 2) }, () => {
    const [x, y] = rim(pick(Math.PI * 0.12, Math.PI * 0.88), pick(0.98, 1.06));
    return clod(x, y, pick(4, 6.5), rng);
  }).join('');

  // 바위는 구멍마다 0–2개, 왼쪽·오른쪽·뒤 중 겹치지 않게 고른다
  const spots = (['left', 'right', 'back'] as const).filter(() => chance(0.55)).slice(0, 2);
  let backRocks = '';
  let frontRocks = '';
  for (const spot of spots) {
    if (spot === 'back') {
      const [x, y] = rim(pick(Math.PI * 1.25, Math.PI * 1.75), 0.98);
      backRocks += boulder(x, y - 1, pick(7, 10), rng);
    } else {
      const a = spot === 'left' ? pick(Math.PI * 0.82, Math.PI * 0.96) : pick(Math.PI * 0.04, Math.PI * 0.18);
      const [x, y] = rim(a, 1);
      frontRocks += boulder(x, y + 2, pick(8, 11.5), rng);
    }
  }

  const rootX = pick(28, 70);
  const root = chance(0.7) ? `<path class="h-root" d="M${f1(rootX)} 17.5q${f1(pick(-3, 3))} 4 ${f1(pick(-1, 1))} ${f1(pick(6, 9))}"/>` : '';

  // 소품은 바위가 없는 쪽에 둔다
  const side = spots.includes('left') ? 1 : spots.includes('right') ? -1 : chance(0.5) ? 1 : -1;
  const sx = (near: number) => (side > 0 ? 100 - near : near);
  const flip = side < 0;
  const backX = pick(14, 30) * (chance(0.5) ? 1 : -1) + 50;

  const skins: Record<Skin, { back: string; front: string }> = {
    garden: {
      back: (chance(0.6) ? tuft(backX, pick(16, 18), 1.6, chance(0.5)) : '') + (chance(0.45) ? clover(100 - backX, 15, 1.6) : ''),
      front:
        tuft(sx(pick(5, 10)), pick(44, 47), 2, flip) +
        (chance(0.65) ? flower(sx(pick(15, 22)), pick(51, 54), pick(1.3, 1.6)) : '') +
        (chance(0.4) ? clover(pick(38, 62), pick(54, 56), 1.7) : ''),
    },
    desert: {
      back: chance(0.55) ? cactus(backX, pick(16, 18), pick(1.4, 1.7), chance(0.5)) : '',
      front:
        (chance(0.6) ? cactus(sx(pick(6, 11)), pick(47, 50), pick(1.7, 2.1), flip) : twig(sx(pick(8, 14)), pick(49, 52), 1.9, flip)) +
        (chance(0.7) ? ripple(pick(32, 52), pick(52, 54)) : ''),
    },
    jungle: {
      back: leaf(backX - 8, pick(16, 18), pick(1.4, 1.7), pick(-30, -10)) + (chance(0.5) ? leaf(100 - backX, 15, 1.5, pick(190, 210)) : ''),
      front:
        leaf(sx(pick(2, 7)), pick(44, 47), pick(1.8, 2.2), side > 0 ? pick(190, 215) : pick(-35, -10)) +
        (chance(0.65) ? mushroom(sx(pick(15, 22)), pick(52, 54), pick(1.5, 1.9)) : '') +
        (chance(0.4) ? tuft(pick(40, 60), 57, 1.4, chance(0.5)) : ''),
    },
    snow: {
      back: snowPile(backX, pick(15, 17), pick(9, 12), rng),
      front:
        snowPile(pick(32, 68), pick(48, 51), pick(11, 15), rng) +
        (chance(0.6) ? iceShard(sx(pick(6, 12)), pick(48, 51), pick(1.7, 2.2), flip) : snowPile(sx(9), 45, 8, rng)),
    },
  };
  const deco = (part: 'back' | 'front') =>
    (Object.keys(skins) as Skin[]).map((s) => `<g class="h-deco deco-${s}">${skins[s][part]}</g>`).join('');

  const back =
    '<svg class="hole-back" viewBox="0 0 100 60" aria-hidden="true" focusable="false">' +
    '<ellipse class="h-shadow" cx="50" cy="42" rx="48" ry="16"/>' +
    backClods +
    `<path class="h-mound" d="${wobblyEllipse(50, 33, 46.5, 20.5, rng, 0.22, 14)}"/>` +
    `<path class="h-mound-top" d="${wobblyEllipse(47, 29, 41, 14.5, rng, 0.1, 12)}"/>` +
    '<ellipse class="h-mound-shine" cx="34" cy="21" rx="12" ry="3"/>' +
    backRocks +
    deco('back') +
    '<ellipse class="h-pit-wall" cx="50" cy="30" rx="38" ry="14"/>' +
    root +
    '<ellipse class="h-pit" cx="50" cy="33" rx="34" ry="10.5"/>' +
    '<ellipse class="h-pit-deep" cx="50" cy="35.5" rx="25" ry="6.5"/>' +
    '<path class="h-rim-light" d="M15 26A38 14 0 0 1 85 26"/>' +
    '</svg>';

  const front =
    '<svg class="hole-front" viewBox="0 0 100 60" aria-hidden="true" focusable="false">' +
    `<path class="h-lip" d="${lipPath(rng, [46.5, 20.5], 0)}"/>` +
    '<path class="h-lip-top" d="M12 30A38 14 0 0 0 88 30L90.5 31.6A40.5 16.6 0 0 1 9.5 31.6z"/>' +
    frontClods +
    (chance(0.45) ? `<path class="h-crack" d="M${f1(pick(30, 70))} 47.5l2 2-1 3"/>` : '') +
    frontRocks +
    deco('front') +
    '</svg>';
  return { back, front };
}
