/**
 * 도감 큰 카드를 두르는 고풍 앤티크 금 액자(루이 15세풍). 코드로 그린 SVG(직접 만든 그림).
 *   물결 바깥선(모서리·변 가운데는 나오고 그 사이는 오목) · 둥글게 솟은 금 몰딩 · 모서리와 네 변 가운데 조각(잎·소용돌이·조개·꽃)
 *   · 안쪽 구슬 띠와 금 턱 · 바랜 금색(홈은 어둡게)
 * 입체: 모양의 윤곽을 흐려 높이로 쓰고 왼쪽 위에서 빛을 비춘다(SVG 조명 필터). 조각이 돌아가 있어도 빛 방향이 같도록
 * 조각을 종류별 층(잎·소용돌이·조개·꽃잎·꽃술)으로 나눠 층마다 필터를 건다.
 * 좌표: 200×250, 카드 창은 (25,29)부터 150×192 → 창이 카드와 꼭 맞도록 styles.css .dex-frame 이 바깥으로 키워 놓는다
 */
const W = 200;
const H = 250;
const X = 25;
const Y = 29;
const IW = 150;
const IH = 192;
const GOLD = ['#f2d27a', '#b9862a', '#5e3c08'] as const;
const R = (n: number) => +n.toFixed(2);

type Part = 'lf' | 'cu' | 'sh' | 'fl' | 'fc' | 'v';
/** 지금 그리는 층. 부품은 자기 종류일 때만 그려진다 */
let only: Part = 'lf';
const when = (p: Part, s: string) => (only === p ? s : '');

const lightFilter = (id: string, blur: number, scale: number, spec: number, exp: number) =>
  `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
  `<feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="h"/>` +
  `<feDiffuseLighting in="h" surfaceScale="${scale}" diffuseConstant="1.15" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="42"/></feDiffuseLighting>` +
  `<feComposite in="d" in2="SourceAlpha" operator="in" result="d2"/>` +
  `<feBlend in="SourceGraphic" in2="d2" mode="multiply" result="m"/>` +
  `<feSpecularLighting in="h" surfaceScale="${scale}" specularConstant="${spec}" specularExponent="${exp}" lighting-color="#fff8dc" result="s"><feDistantLight azimuth="225" elevation="48"/></feSpecularLighting>` +
  `<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>` +
  `<feComposite in="m" in2="s2" operator="arithmetic" k2="1" k3="1"/></filter>`;

function wavyOutline(inset: number, depth: number): string {
  const x0 = inset;
  const y0 = inset;
  const x1 = W - inset;
  const y1 = H - inset;
  const seg = (t: number, a: number, b: number) => (t > a && t < b ? Math.sin(((t - a) / (b - a)) * Math.PI) : 0);
  const dip = (t: number) => depth * Math.max(seg(t, 0.17, 0.41), seg(t, 0.59, 0.83));
  const pts: [number, number][] = [];
  const N = 48;
  for (let k = 0; k < N; k++) pts.push([x0 + ((x1 - x0) * k) / N, y0 + dip(k / N)]);
  for (let k = 0; k < N; k++) pts.push([x1 - dip(k / N), y0 + ((y1 - y0) * k) / N]);
  for (let k = 0; k < N; k++) pts.push([x1 - ((x1 - x0) * k) / N, y1 - dip(k / N)]);
  for (let k = 0; k < N; k++) pts.push([x0 + dip(k / N), y1 - ((y1 - y0) * k) / N]);
  return 'M' + pts.map(([x, y]) => `${R(x)} ${R(y)}`).join('L') + 'Z';
}
const rect = (a: number) => `M${X - a} ${Y - a}h${IW + 2 * a}v${IH + 2 * a}h-${IW + 2 * a}z`;

// 조각 부품
const leaf = (x: number, y: number, len: number, w: number, ang: number) =>
  when('lf', `<path transform="translate(${x} ${y}) rotate(${ang})" d="M0 0C${w * 0.7} ${-len * 0.15} ${w * 0.9} ${-len * 0.5} ${w * 0.35} ${-len * 0.62}C${w * 0.7} ${-len * 0.7} ${w * 0.4} ${-len * 0.92} 0 ${-len}C${-w * 0.4} ${-len * 0.92} ${-w * 0.7} ${-len * 0.7} ${-w * 0.35} ${-len * 0.62}C${-w * 0.9} ${-len * 0.5} ${-w * 0.7} ${-len * 0.15} 0 0z"/>`) +
  when('v', `<polyline transform="translate(${x} ${y}) rotate(${ang})" points="0,${-len * 0.1} 0,${-len * 0.8} ${w * 0.25},${-len * 0.6} 0,${-len * 0.45} ${-w * 0.25},${-len * 0.3}"/>`);
const curl = (x: number, y: number, r: number, ang: number) =>
  when('cu', `<path transform="translate(${x} ${y}) rotate(${ang})" d="M0 0C${r * 1.2} ${-r * 0.2} ${r * 1.4} ${-r * 1.6} ${r * 0.4} ${-r * 1.7}C${-r * 0.4} ${-r * 1.8} ${-r * 0.5} ${-r * 0.8} ${r * 0.2} ${-r * 0.8}C${r * 0.6} ${-r * 0.8} ${r * 0.5} ${-r * 1.25} ${r * 0.2} ${-r * 1.2}" fill="none" stroke-width="${r * 0.55}" stroke-linecap="round"/>`);
const flower = (x: number, y: number, r: number) =>
  when('fl', [0, 72, 144, 216, 288].map((a) => `<ellipse transform="translate(${x} ${y}) rotate(${a})" cy="${-r * 0.55}" rx="${r * 0.32}" ry="${r * 0.5}"/>`).join('')) +
  when('fc', `<circle cx="${x}" cy="${y}" r="${r * 0.3}"/>`);
const shell = (x: number, y: number, r: number, ang: number) =>
  when('sh', `<g transform="translate(${x} ${y}) rotate(${ang})">${[-60, -40, -20, 0, 20, 40, 60].map((a) => `<ellipse transform="rotate(${a})" cy="${-r * 0.55}" rx="${r * 0.17}" ry="${r * 0.55}"/>`).join('')}<ellipse cy="${r * 0.05}" rx="${r * 0.42}" ry="${r * 0.22}"/></g>`);

/** 모서리 조각(모서리 = 0,0, 대각선 대칭) */
function cornerCarve(): string {
  const half = leaf(20, 7, 22, 7, 75) + leaf(33, 6, 16, 5.5, 95) + curl(42, 9, 5, 80) + leaf(15, 15, 16, 6, 60);
  return `${half}<g transform="matrix(0 1 1 0 0 0)">${half}</g>${shell(13, 13, 15, -45)}${flower(16, 16, 9)}`;
}
/** 변 가운데 조각(바깥쪽 = 위) */
function midCarve(): string {
  const side = leaf(8, 2, 20, 7, 75) + leaf(21, 1, 14, 5, 95) + curl(30, 5, 5, 80);
  return `${side}<g transform="scale(-1 1)">${side}</g>${shell(0, -1, 15, 0)}${flower(0, 6, 8)}`;
}
function ornaments(): string {
  const c = cornerCarve();
  const m = midCarve();
  const corners = ([[3, 3, 0], [W - 3, 3, 90], [W - 3, H - 3, 180], [3, H - 3, 270]] as const).map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${c}</g>`);
  const mids = ([[W / 2, 9, 0], [W - 9, H / 2, 90], [W / 2, H - 9, 180], [9, H / 2, 270]] as const).map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${m}</g>`);
  return corners.join('') + mids.join('');
}
function beads(a: number, step: number, r: number): string {
  const out: string[] = [];
  const x0 = X - a;
  const y0 = Y - a;
  const w = IW + 2 * a;
  const h = IH + 2 * a;
  const nx = Math.round(w / step);
  const ny = Math.round(h / step);
  const b = (x: number, y: number) => `<circle cx="${R(x)}" cy="${R(y)}" r="${r}"/>`;
  for (let k = 0; k < nx; k++) out.push(b(x0 + ((k + 0.5) * w) / nx, y0), b(x0 + ((k + 0.5) * w) / nx, y0 + h));
  for (let k = 0; k < ny; k++) out.push(b(x0, y0 + ((k + 0.5) * h) / ny), b(x0 + w, y0 + ((k + 0.5) * h) / ny));
  return out.join('');
}

function build(): string {
  const [g1, g2, g3] = GOLD;
  const outer = wavyOutline(2, 6);
  const layers = (['lf', 'cu', 'sh', 'fl', 'fc'] as Part[])
    .map((p) => {
      only = p;
      return `<g filter="url(#af-carve)">${ornaments()}</g>`;
    })
    .join('');
  only = 'v';
  const veins = `<g fill="none" stroke="#3a2200" stroke-width=".5" opacity=".7">${ornaments()}</g>`;
  return (
    `<svg class="dex-frame" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false"><defs>` +
    `<linearGradient id="af-rail" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset=".55" stop-color="${g2}"/><stop offset="1" stop-color="${g3}"/></linearGradient>` +
    `<linearGradient id="af-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g2}"/><stop offset="1" stop-color="${g3}"/></linearGradient>` +
    lightFilter('af-rail-l', 5, 6, 0.75, 22) +
    lightFilter('af-carve', 0.9, 2.6, 0.7, 26) +
    lightFilter('af-bead', 0.6, 2, 1.2, 22) +
    `<filter id="af-recess" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx=".8" dy="1.2" stdDeviation="1" flood-color="#2a1800" flood-opacity=".75"/></filter>` +
    `</defs>` +
    `<path d="${outer}${rect(8)}" fill-rule="evenodd" fill="url(#af-rail)" filter="url(#af-rail-l)"/>` +
    `<path d="${rect(8)}${rect(3)}" fill-rule="evenodd" fill="${g2}" filter="url(#af-bead)"/>` +
    `<path d="${rect(8.2)}" fill="none" stroke="${g3}" stroke-width="1.2" opacity=".8"/>` +
    `<path d="${rect(3)}${rect(0)}" fill-rule="evenodd" fill="${g1}" filter="url(#af-bead)"/>` +
    `<path d="${rect(0.4)}" fill="none" stroke="#2a1800" stroke-width=".8" opacity=".7"/>` +
    `<g fill="${g1}" filter="url(#af-bead)">${beads(5.5, 3.6, 1.15)}</g>` +
    `<g filter="url(#af-recess)"><g fill="url(#af-gold)" stroke="url(#af-gold)">${layers}</g></g>${veins}` +
    // 바랜 금: 전체를 갈색으로 살짝 눌러 오래된 느낌
    `<path d="${outer}${rect(0)}" fill-rule="evenodd" fill="#3a2000" opacity=".28" style="mix-blend-mode:multiply"/>` +
    `</svg>`
  );
}

export const ANTIQUE_FRAME = build();
