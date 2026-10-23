import type { FaceId, SpecialId } from '../game/faces';

/**
 * 카드 그림 48장 + 특수 카드 2장 + 카드 뒷면 + 마스코트 째깍이. 모두 이 파일에서 코드로 그린 SVG 다(외부 그림 없음).
 * 그림체: 외곽선 없는 둥근 도형 + 흰 반사광 하나(살짝 3D 느낌). 판(64×64) 가운데에 놓는다
 */

const INK = '#2b2233';
/** 눈: 검은 점 + 흰 반짝임 */
const eye = (x: number, y: number, r = 2.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;
const eyes = (x1: number, x2: number, y: number, r?: number) => eye(x1, y, r) + eye(x2, y, r);
const smile = (x: number, y: number, w = 4) =>
  `<path d="M${x - w} ${y}q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
const cheeks = (x1: number, x2: number, y: number) =>
  `<ellipse cx="${x1}" cy="${y}" rx="3" ry="2" fill="#ff8fab" opacity=".7"/><ellipse cx="${x2}" cy="${y}" rx="3" ry="2" fill="#ff8fab" opacity=".7"/>`;
const shine = (x: number, y: number, rx = 3, ry = 5, rot = -25) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".45" transform="rotate(${rot} ${x} ${y})"/>`;
const line = (d: string, color: string, w = 3) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const leaf = (d: string, color = '#22c55e') => `<path d="${d}" fill="${color}"/>`;

const FACES: Record<FaceId, string> = {
  /* ---------- 과일 ---------- */
  apple:
    `<path d="M32 19c-6-5-19-3-20 10-1 12 7 25 13 25 3 0 4-1 7-1s4 1 7 1c6 0 14-13 13-25-1-13-14-15-20-10z" fill="#ef4444"/>` +
    line('M32 19c0-4 1-7 3-9', '#7c4a1e') +
    leaf('M35 14c4-5 10-5 13-3-2 4-8 6-13 3z') +
    shine(21, 29),
  cherry:
    line('M22 38Q27 20 40 11M43 40Q39 24 40 11', '#4d7c0f', 2.6) +
    leaf('M40 11c5-4 11-3 13 0-4 3-9 4-13 0z') +
    `<circle cx="21" cy="45" r="10" fill="#dc2626"/><circle cx="43" cy="47" r="10" fill="#e11d48"/>` +
    shine(17, 41, 2, 3.5) +
    shine(39, 43, 2, 3.5),
  grape:
    line('M33 10v8', '#7c4a1e') +
    leaf('M34 13c5-5 12-4 14-1-4 4-10 5-14 1z') +
    [
      [22, 26],
      [33, 25],
      [44, 26],
      [27, 36],
      [39, 36],
      [33, 46],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#8b5cf6"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".45"/>`)
      .join(''),
  lemon:
    `<g transform="rotate(-25 32 34)"><ellipse cx="32" cy="34" rx="20" ry="15" fill="#facc15"/><circle cx="12" cy="34" r="3.5" fill="#facc15"/><circle cx="52" cy="34" r="3.5" fill="#facc15"/></g>` +
    leaf('M38 18c3-6 10-7 13-5-2 5-8 7-13 5z') +
    shine(25, 30, 3, 6, 40),
  strawberry:
    `<path d="M32 57c-13-8-21-20-19-30 1-7 9-9 19-9s18 2 19 9c2 10-6 22-19 30z" fill="#f43f5e"/>` +
    leaf('M20 19c4-1 8 0 12 3 4-3 8-4 12-3-2 4-6 6-12 5-6 1-10-1-12-5z') +
    line('M32 21v-8', '#15803d') +
    [
      [24, 30],
      [32, 28],
      [40, 30],
      [27, 39],
      [37, 39],
      [32, 48],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.2" ry="1.8" fill="#fde68a"/>`)
      .join(''),
  watermelon:
    `<path d="M5 24a27 27 0 0 0 54 0z" fill="#16a34a"/><path d="M9 24a23 23 0 0 0 46 0z" fill="#dcfce7"/><path d="M12 24a20 20 0 0 0 40 0z" fill="#f43f5e"/>` +
    [
      [22, 31],
      [32, 35],
      [42, 31],
      [27, 39],
      [37, 39],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2.2" fill="${INK}"/>`)
      .join(''),
  pear:
    `<path d="M32 13c-6 0-8 5-8 10 0 6-11 10-11 20 0 9 9 14 19 14s19-5 19-14c0-10-11-14-11-20 0-5-2-10-8-10z" fill="#a3e635"/>` +
    line('M32 13c0-3 1-5 2-7', '#7c4a1e') +
    leaf('M34 10c4-4 9-3 11-1-3 3-7 4-11 1z') +
    shine(22, 40, 3, 6, 15),
  orange:
    `<circle cx="32" cy="36" r="19" fill="#fb923c"/>` +
    leaf('M32 18c2-5 8-7 12-5-2 5-7 7-12 5z', '#16a34a') +
    `<circle cx="32" cy="18" r="2" fill="#15803d"/>` +
    [
      [40, 30],
      [44, 38],
      [37, 44],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#ea580c"/>`)
      .join('') +
    shine(23, 30, 3, 6),

  /* ---------- 동물 ---------- */
  cat:
    `<path d="M14 22l4-14 10 9zM50 22l-4-14-10 9z" fill="#fb923c"/><path d="M17 18l2-6 5 5zM47 18l-2-6-5 5z" fill="#fecdd3"/>` +
    `<ellipse cx="32" cy="36" rx="20" ry="18" fill="#fdba74"/>` +
    `<path d="M26 20l2 6M32 19v6M38 20l-2 6" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>` +
    eyes(24, 40, 35) +
    `<path d="M30 41h4l-2 2.5z" fill="#f472b6"/>` +
    line('M28 45q2 2 4 0q2 2 4 0', INK, 2) +
    line('M8 38h9M8 43l9-2M56 38h-9M56 43l-9-2', '#a8a29e', 1.6),
  dog:
    `<ellipse cx="32" cy="34" rx="18" ry="18" fill="#e7b98a"/>` +
    `<ellipse cx="14" cy="32" rx="6" ry="13" fill="#92400e" transform="rotate(18 14 32)"/><ellipse cx="50" cy="32" rx="6" ry="13" fill="#92400e" transform="rotate(-18 50 32)"/>` +
    `<ellipse cx="32" cy="42" rx="9" ry="7" fill="#fdf2e9"/>` +
    eyes(25, 39, 31) +
    `<ellipse cx="32" cy="39" rx="3.5" ry="2.6" fill="${INK}"/>` +
    `<path d="M30 45h4v3a2 2 0 0 1-4 0z" fill="#f472b6"/>`,
  bear:
    `<circle cx="16" cy="18" r="7" fill="#a16207"/><circle cx="48" cy="18" r="7" fill="#a16207"/><circle cx="16" cy="18" r="3.5" fill="#fcd9b6"/><circle cx="48" cy="18" r="3.5" fill="#fcd9b6"/>` +
    `<circle cx="32" cy="35" r="20" fill="#b45309"/>` +
    `<ellipse cx="32" cy="43" rx="9" ry="7" fill="#fcd9b6"/>` +
    eyes(24, 40, 32) +
    `<ellipse cx="32" cy="40" rx="3.2" ry="2.4" fill="${INK}"/>` +
    smile(32, 44, 2.5),
  rabbit:
    `<ellipse cx="23" cy="16" rx="5.5" ry="13" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/><ellipse cx="41" cy="16" rx="5.5" ry="13" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>` +
    `<ellipse cx="23" cy="17" rx="2.5" ry="9" fill="#fbcfe8"/><ellipse cx="41" cy="17" rx="2.5" ry="9" fill="#fbcfe8"/>` +
    `<ellipse cx="32" cy="40" rx="19" ry="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>` +
    eyes(25, 39, 38) +
    cheeks(20, 44, 44) +
    `<path d="M30 43h4l-2 2z" fill="#f472b6"/>` +
    line('M32 45v2m-3 1q3 2 6 0', INK, 1.8),
  frog:
    `<circle cx="20" cy="22" r="8" fill="#4ade80"/><circle cx="44" cy="22" r="8" fill="#4ade80"/>` +
    `<ellipse cx="32" cy="38" rx="23" ry="16" fill="#4ade80"/>` +
    `<circle cx="20" cy="22" r="5" fill="#fff"/><circle cx="44" cy="22" r="5" fill="#fff"/>` +
    eyes(20, 44, 22, 2.8) +
    line('M18 40q14 12 28 0', '#166534', 2.6) +
    cheeks(15, 49, 38),
  chick:
    line('M30 14q2-6 6-4M33 14q3-5 7-1', '#f59e0b', 2.4) +
    `<circle cx="32" cy="36" r="20" fill="#fde047"/>` +
    eyes(25, 39, 32) +
    `<path d="M28 38l4 5 4-5z" fill="#f97316"/>` +
    cheeks(20, 44, 40) +
    `<path d="M12 40q-4 4 2 8M52 40q4 4-2 8" fill="none" stroke="#facc15" stroke-width="4" stroke-linecap="round"/>`,
  pig:
    `<path d="M14 22l3-12 10 8zM50 22l-3-12-10 8z" fill="#f472b6"/>` +
    `<circle cx="32" cy="35" r="20" fill="#f9a8d4"/>` +
    eyes(24, 40, 30) +
    `<ellipse cx="32" cy="40" rx="8" ry="6" fill="#f472b6"/><ellipse cx="29" cy="40" rx="1.6" ry="2.2" fill="#9d174d"/><ellipse cx="35" cy="40" rx="1.6" ry="2.2" fill="#9d174d"/>` +
    cheeks(18, 46, 40),
  panda:
    `<circle cx="16" cy="18" r="7" fill="${INK}"/><circle cx="48" cy="18" r="7" fill="${INK}"/>` +
    `<circle cx="32" cy="35" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>` +
    `<ellipse cx="24" cy="33" rx="5" ry="6.5" fill="${INK}" transform="rotate(25 24 33)"/><ellipse cx="40" cy="33" rx="5" ry="6.5" fill="${INK}" transform="rotate(-25 40 33)"/>` +
    `<circle cx="25" cy="32" r="2" fill="#fff"/><circle cx="39" cy="32" r="2" fill="#fff"/>` +
    `<ellipse cx="32" cy="41" rx="3" ry="2.2" fill="${INK}"/>` +
    smile(32, 45, 2.5),

  /* ---------- 바다 ---------- */
  fish:
    `<path d="M46 32l12-10v20z" fill="#0ea5e9"/>` +
    `<ellipse cx="29" cy="32" rx="20" ry="14" fill="#38bdf8"/>` +
    `<path d="M26 20q6-8 12-2z" fill="#0ea5e9"/>` +
    eye(18, 29) +
    line('M33 26q4 6 0 12', '#0284c7', 2) +
    shine(24, 24, 3, 2, 0),
  octopus:
    line('M18 38q-4 8 0 14M25 40q-2 9 2 14M32 41v14M39 40q2 9-2 14M46 38q4 8 0 14', '#fb7185', 5) +
    `<ellipse cx="32" cy="28" rx="18" ry="17" fill="#fb7185"/>` +
    eyes(25, 39, 30) +
    smile(32, 36, 3) +
    shine(24, 18, 3, 4),
  whale:
    line('M42 16q0-6 4-8M42 16q0-6-4-8M42 16v-9', '#7dd3fc', 2.4) +
    `<path d="M8 36c0-10 10-16 24-16 12 0 20 6 22 14l6-6v14l-6-2c-2 10-12 14-24 14C16 54 8 46 8 36z" fill="#3b82f6"/>` +
    `<path d="M12 42c6 6 16 8 26 6" fill="none" stroke="#bfdbfe" stroke-width="4" stroke-linecap="round"/>` +
    eye(22, 33) +
    `<ellipse cx="27" cy="39" rx="3" ry="2" fill="#ff8fab" opacity=".7"/>`,
  crab:
    line('M14 40l-7 4M14 46l-6 6M50 40l7 4M50 46l6 6', '#dc2626', 3) +
    line('M18 30l-6-10M46 30l6-10', '#dc2626', 3) +
    `<path d="M5 18a7 7 0 1 1 13 0l-6-1z" fill="#ef4444"/><path d="M46 18a7 7 0 1 1 13 0l-6-1z" fill="#ef4444"/>` +
    `<ellipse cx="32" cy="40" rx="19" ry="13" fill="#ef4444"/>` +
    line('M26 30v-8M38 30v-8', '#dc2626', 2.4) +
    `<circle cx="26" cy="21" r="4" fill="#fff"/><circle cx="38" cy="21" r="4" fill="#fff"/>` +
    eyes(26, 38, 21, 2.2) +
    smile(32, 42, 4),
  shell:
    `<path d="M32 54L10 30c0-12 10-20 22-20s22 8 22 20z" fill="#fda4af"/>` +
    line('M32 54L20 14M32 54V11M32 54l12-40M32 54L12 24M32 54l20-30', '#fb7185', 2) +
    `<path d="M26 54h12l-2 5h-8z" fill="#fb7185"/>`,
  starfish:
    `<path d="M32 8l6 15 16 1-12 10 4 16-14-9-14 9 4-16-12-10 16-1z" fill="#fb923c" stroke="#fb923c" stroke-width="5" stroke-linejoin="round"/>` +
    eyes(27, 37, 30) +
    smile(32, 35, 3) +
    [
      [32, 16],
      [46, 26],
      [18, 26],
      [24, 44],
      [40, 44],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fed7aa"/>`)
      .join(''),
  jellyfish:
    line('M20 36q-3 7 1 14M27 37q3 8-1 16M37 37q-3 8 1 16M44 36q3 7-1 14', '#c084fc', 3) +
    `<path d="M10 36c0-14 10-24 22-24s22 10 22 24q-5-4-11 0-5-4-11 0-6-4-11 0-6-4-11 0z" fill="#d8b4fe"/>` +
    eyes(25, 39, 28) +
    cheeks(20, 44, 32) +
    shine(22, 20, 3, 4),
  turtle:
    `<circle cx="52" cy="34" r="7" fill="#86efac"/>` +
    eye(54, 32, 2) +
    `<ellipse cx="17" cy="46" rx="5" ry="4" fill="#86efac"/><ellipse cx="42" cy="46" rx="5" ry="4" fill="#86efac"/>` +
    `<path d="M8 42c0-14 9-24 22-24s21 10 21 24z" fill="#22c55e"/>` +
    `<path d="M22 26l8-4 8 4v8l-8 4-8-4z" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linejoin="round"/>` +
    line('M22 34l-8 6M38 34l8 6M30 38v4', '#15803d', 2.2),

  /* ---------- 하늘 ---------- */
  sun:
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return line(`M${32 + Math.cos(a) * 21} ${32 + Math.sin(a) * 21}L${32 + Math.cos(a) * 28} ${32 + Math.sin(a) * 28}`, '#fb923c', 4);
    }).join('') +
    `<circle cx="32" cy="32" r="16" fill="#facc15"/>` +
    eyes(26, 38, 30, 2.2) +
    smile(32, 36, 3.5) +
    cheeks(23, 41, 36),
  moon:
    `<path d="M38 8a24 24 0 1 0 18 38A20 20 0 1 1 38 8z" fill="#fde68a"/>` +
    `<circle cx="22" cy="40" r="2.5" fill="#fcd34d"/><circle cx="30" cy="50" r="1.8" fill="#fcd34d"/>` +
    line('M24 28q2 2 4 0', INK, 2) +
    smile(28, 36, 2.5),
  star:
    `<path d="M32 7l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fbbf24" stroke="#fbbf24" stroke-width="4" stroke-linejoin="round"/>` +
    eyes(27, 37, 30, 2.2) +
    smile(32, 35, 3) +
    shine(26, 20, 2, 3.5),
  cloud:
    `<path d="M16 46a10 10 0 0 1-1-20 13 13 0 0 1 24-6 11 11 0 0 1 13 13 7 7 0 0 1-1 13z" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>` +
    eyes(27, 39, 34, 2.2) +
    smile(33, 39, 3) +
    cheeks(22, 44, 39),
  rainbow:
    ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6']
      .map((c, i) => `<path d="M${8 + i * 4} 46a${24 - i * 4} ${24 - i * 4} 0 0 1 ${48 - i * 8} 0" fill="none" stroke="${c}" stroke-width="4"/>`)
      .join('') +
    `<circle cx="10" cy="47" r="6" fill="#f1f5f9"/><circle cx="16" cy="49" r="5" fill="#f1f5f9"/><circle cx="54" cy="47" r="6" fill="#f1f5f9"/><circle cx="48" cy="49" r="5" fill="#f1f5f9"/>`,
  bolt:
    `<path d="M36 6L14 36h14l-4 22 24-32H34z" fill="#facc15" stroke="#eab308" stroke-width="2.5" stroke-linejoin="round"/>` +
    shine(28, 22, 2, 5, 35),
  snow:
    [0, 60, 120]
      .map((r) => `<g transform="rotate(${r} 32 32)">${line('M32 8v48M32 16l-6-6M32 16l6-6M32 48l-6 6M32 48l6 6', '#38bdf8', 3.6)}</g>`)
      .join('') + `<circle cx="32" cy="32" r="4" fill="#38bdf8"/>`,
  drop:
    `<path d="M32 8C26 20 15 30 15 40a17 17 0 0 0 34 0c0-10-11-20-17-32z" fill="#60a5fa"/>` +
    eyes(26, 38, 40, 2.2) +
    smile(32, 45, 3) +
    shine(24, 28, 2.5, 6, 20),

  /* ---------- 디저트 ---------- */
  cupcake:
    `<path d="M16 34h32l-5 22H21z" fill="#f472b6"/>` +
    line('M24 34l2 22M32 34v22M40 34l-2 22', '#db2777', 2) +
    `<path d="M14 35c-3-10 6-12 8-12 0-7 6-11 10-11s10 4 10 11c2 0 11 2 8 12z" fill="#fef3c7"/>` +
    `<circle cx="34" cy="12" r="4" fill="#ef4444"/>` +
    [
      [22, 28, '#60a5fa'],
      [30, 22, '#34d399'],
      [40, 28, '#f472b6'],
    ]
      .map(([x, y, c]) => `<rect x="${x}" y="${y}" width="5" height="2" rx="1" fill="${c}" transform="rotate(30 ${x} ${y})"/>`)
      .join(''),
  donut:
    `<path fill-rule="evenodd" d="M32 11a21 21 0 1 1 0 42 21 21 0 0 1 0-42zm0 14a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" fill="#d97706"/>` +
    `<path fill-rule="evenodd" d="M32 14c10 0 18 7 18 16 0 6-3 10-6 8-3 4-7 3-9 6-3-3-7 0-10-4-4 2-7-2-8-6-3-1-3-6-1-9 3-7 9-11 16-11zm0 11a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" fill="#f472b6"/>` +
    [
      [22, 22, '#fde047', 20],
      [40, 20, '#60a5fa', -30],
      [44, 32, '#fff', 60],
      [20, 34, '#34d399', -50],
      [32, 17, '#fff', 0],
    ]
      .map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="5" height="2" rx="1" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`)
      .join(''),
  icecream:
    `<path d="M20 32h24L32 60z" fill="#f59e0b"/>` +
    line('M24 38l12 8M28 34l12 8M40 38l-12 8', '#d97706', 1.8) +
    `<circle cx="32" cy="18" r="10" fill="#f9a8d4"/><circle cx="23" cy="28" r="9" fill="#6ee7b7"/><circle cx="41" cy="28" r="9" fill="#fde68a"/>` +
    shine(29, 14, 2, 3),
  candy:
    `<path d="M16 32L5 22v20zM48 32l11-10v20z" fill="#fca5a5"/>` +
    `<circle cx="32" cy="32" r="16" fill="#ef4444"/>` +
    line('M32 32m-9 0a9 9 0 1 1 9 9a5 5 0 1 1 0-10', '#fff', 3) +
    shine(26, 24, 2, 3.5),
  cookie:
    `<circle cx="32" cy="32" r="21" fill="#d4a373"/>` +
    `<path d="M50 20a5 5 0 0 1-5 6 21 21 0 0 1 8 6 6 6 0 0 0-3-12z" fill="#bc8a5f"/>` +
    [
      [24, 22],
      [38, 24],
      [22, 38],
      [34, 36],
      [42, 42],
      [30, 46],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2.4" fill="#5b3a1a"/>`)
      .join(''),
  pudding:
    `<ellipse cx="32" cy="52" rx="24" ry="5" fill="#e2e8f0"/>` +
    `<path d="M18 50l5-30h18l5 30z" fill="#fcd34d"/>` +
    `<path d="M23 20h18l1 6c-2 2-4 0-5 3-2-2-4 2-6-1-2 3-4-1-6 1-1-2-3 0-3-3z" fill="#92400e"/>` +
    eyes(27, 37, 36, 2.2) +
    smile(32, 41, 3),
  cake:
    `<path d="M8 30l40-14v34H8z" fill="#fef3c7"/>` +
    `<path d="M48 16l8 6v28h-8z" fill="#fde68a"/>` +
    `<path d="M8 38h40M48 38h8" stroke="#f472b6" stroke-width="4"/>` +
    `<path d="M8 30l40-14 8 6-40 14z" fill="#f9a8d4"/>` +
    `<path d="M8 30h8v4H8z" fill="#f9a8d4"/>` +
    `<circle cx="38" cy="14" r="5" fill="#ef4444"/>` +
    leaf('M38 9c1-3 4-4 6-3-1 3-3 4-6 3z'),
  lollipop:
    `<rect x="30" y="34" width="4" height="26" rx="2" fill="#e2e8f0" stroke="#cbd5e1"/>` +
    `<circle cx="32" cy="24" r="17" fill="#c084fc"/>` +
    line('M32 24m0 0a3 3 0 0 1 6 0 6 6 0 0 1-12 0 9 9 0 0 1 18 0 12 12 0 0 1-24 0', '#fef3c7', 3) +
    shine(25, 15, 2, 3.5),

  /* ---------- 장난감 ---------- */
  ball:
    `<circle cx="32" cy="32" r="21" fill="#fef3c7"/>` +
    `<path d="M32 11a21 21 0 0 1 21 21H32z" fill="#ef4444"/><path d="M11 32a21 21 0 0 0 21 21V32z" fill="#3b82f6"/>` +
    `<path d="M32 11a21 21 0 0 0-21 21h21z" fill="#facc15"/>` +
    `<circle cx="32" cy="32" r="4" fill="#fff"/>` +
    shine(22, 20, 3, 5),
  kite:
    line('M32 50q-6 4 0 8t2 4', '#64748b', 1.8) +
    `<path d="M29 54l-4-2v4zM35 58l4-2v4z" fill="#f97316"/>` +
    `<path d="M32 4l16 20-16 26-16-26z" fill="#f43f5e"/>` +
    `<path d="M32 4l16 20H32zM32 24v26L16 24z" fill="#fb7185"/>` +
    line('M32 4v46M16 24h32', '#be123c', 1.8),
  rocket:
    `<path d="M24 44q-6 8 0 14 2-5 8-6 6 1 8 6 6-6 0-14z" fill="#fb923c"/>` +
    `<path d="M22 36l-8 10 10-2zM42 36l8 10-10-2z" fill="#ef4444"/>` +
    `<path d="M32 4c10 8 12 22 10 40H22C20 26 22 12 32 4z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>` +
    `<path d="M32 4c5 4 8 9 9 14H23c1-5 4-10 9-14z" fill="#ef4444"/>` +
    `<circle cx="32" cy="27" r="5" fill="#60a5fa" stroke="#64748b" stroke-width="2"/>`,
  robot:
    line('M32 14V7', '#64748b', 2.4) +
    `<circle cx="32" cy="6" r="3" fill="#f43f5e"/>` +
    `<rect x="12" y="14" width="40" height="34" rx="9" fill="#94a3b8"/>` +
    `<rect x="7" y="25" width="5" height="12" rx="2" fill="#64748b"/><rect x="52" y="25" width="5" height="12" rx="2" fill="#64748b"/>` +
    `<rect x="17" y="20" width="30" height="16" rx="6" fill="#e0f2fe"/>` +
    `<circle cx="25" cy="28" r="3.5" fill="#06b6d4"/><circle cx="39" cy="28" r="3.5" fill="#06b6d4"/>` +
    `<rect x="22" y="40" width="20" height="4" rx="2" fill="#475569"/>` +
    line('M27 40v4M32 40v4M37 40v4', '#94a3b8', 1.4),
  balloon:
    line('M32 46q-5 6 0 10t0 6', '#64748b', 1.8) +
    `<path d="M29 48h6l-3-4z" fill="#9333ea"/>` +
    `<ellipse cx="32" cy="26" rx="16" ry="20" fill="#a855f7"/>` +
    shine(25, 17, 3, 6),
  top:
    `<rect x="29" y="6" width="6" height="12" rx="2" fill="#a16207"/>` +
    `<path d="M10 30c0-8 10-12 22-12s22 4 22 12c0 6-12 16-22 28C22 46 10 36 10 30z" fill="#f97316"/>` +
    `<path d="M11 32c6 4 14 5 21 5s15-1 21-5" fill="none" stroke="#fde047" stroke-width="4"/>` +
    `<path d="M16 40c5 2 10 3 16 3s11-1 16-3" fill="none" stroke="#3b82f6" stroke-width="3"/>` +
    shine(20, 26, 2.5, 4, -60),
  blocks:
    `<rect x="8" y="34" width="22" height="22" rx="4" fill="#3b82f6"/><rect x="34" y="34" width="22" height="22" rx="4" fill="#ef4444"/><rect x="21" y="10" width="22" height="22" rx="4" fill="#facc15"/>` +
    `<circle cx="19" cy="45" r="4" fill="#bfdbfe"/><path d="M41 49l4-8 4 8z" fill="#fecaca"/><rect x="28" y="17" width="8" height="8" rx="1.5" fill="#fef9c3"/>`,
  car:
    `<path d="M8 42v-6c0-3 2-5 5-5l7-9c1-2 3-3 5-3h12c2 0 4 1 5 3l6 9c4 0 8 2 8 6v5z" fill="#ef4444"/>` +
    `<path d="M22 30l4-6h6v6zM36 30v-6h4l4 6z" fill="#bae6fd"/>` +
    `<circle cx="19" cy="44" r="6" fill="${INK}"/><circle cx="45" cy="44" r="6" fill="${INK}"/><circle cx="19" cy="44" r="2.4" fill="#cbd5e1"/><circle cx="45" cy="44" r="2.4" fill="#cbd5e1"/>` +
    `<rect x="50" y="34" width="5" height="3" rx="1.5" fill="#fde047"/>`,
};

const SPECIALS: Record<SpecialId, string> = {
  clock:
    `<circle cx="17" cy="14" r="7" fill="#f59e0b"/><circle cx="47" cy="14" r="7" fill="#f59e0b"/>` +
    `<circle cx="32" cy="34" r="21" fill="#fff" stroke="#0b7785" stroke-width="5"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return `<circle cx="${32 + Math.cos(a) * 15}" cy="${34 + Math.sin(a) * 15}" r="${i % 3 ? 1 : 1.8}" fill="#0b7785"/>`;
    }).join('') +
    line('M32 34V23M32 34l7 4', INK, 3) +
    `<circle cx="32" cy="34" r="2.4" fill="#ef4444"/>`,
  peek:
    line('M41 41l14 14', '#475569', 7) +
    `<circle cx="28" cy="28" r="17" fill="#bae6fd" stroke="#475569" stroke-width="5"/>` +
    eyes(22, 34, 28, 2.6) +
    shine(21, 19, 3, 5),
};

export function faceSvg(face: FaceId | SpecialId): string {
  const body = (FACES as Record<string, string>)[face] ?? SPECIALS[face as SpecialId];
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * 카드 뒷면: 조이팩 로고(레몬 바탕에 게임기 부품 웃는 얼굴 — 왼눈 십자 버튼, 오른눈 동그란 버튼)를 본뜬 얼굴.
 * 부품 아래 진한 그림자로 툭 튀어나온 장난감 버튼처럼 보이게 한다. 바탕 레몬색·테두리는 CSS(.back)
 */
const LOGO_FACE = `<rect x="120" y="198" width="116" height="40" rx="14"/><rect x="158" y="160" width="40" height="116" rx="14"/><circle cx="336" cy="218" r="44"/><path d="M152 318 Q256 428 360 318" fill="none" stroke-width="40" stroke-linecap="round"/>`;
export const CARD_BACK = `<svg viewBox="60 110 392 330" aria-hidden="true" focusable="false">
  <g transform="translate(0 16)" fill="#d98f00" stroke="#d98f00">${LOGO_FACE}</g>
  <circle cx="110" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/><circle cx="402" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/>
  <g fill="#3d2a00" stroke="#3d2a00">${LOGO_FACE}</g>
</svg>`;

/**
 * 마스코트 째깍이: 다리 달린 빨간 자명종. 시간이 모자라면 땀(.sweat)이 나고 몸을 떤다(styles.css .mascot)
 */
export const MASCOT = `<svg class="mascot-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <path d="M22 54l-5 6M42 54l5 6" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="15" cy="13" r="7" fill="#ffb703"/><circle cx="49" cy="13" r="7" fill="#ffb703"/>
  <rect x="30" y="4" width="4" height="7" rx="2" fill="${INK}"/>
  <circle cx="32" cy="34" r="23" fill="#ff5d5d"/>
  <circle cx="32" cy="34" r="17" fill="#fffaf0"/>
  <g class="m-face">${eyes(25, 39, 31, 2.8)}${smile(32, 38, 4)}${cheeks(21, 43, 38)}</g>
  <path class="m-hand" d="M32 34V22" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".35"/>
  <path class="sweat" d="M52 20c-2 3-3 5-3 6.5a3 3 0 0 0 6 0c0-1.5-1-3.5-3-6.5z" fill="#7dd3fc"/>
</svg>`;
