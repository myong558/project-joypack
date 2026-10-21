import { mulberry32 } from '../game/rng';
import type { Rng } from '../game/types';
import type { Skin } from '../theme';

/**
 * 화면 뒤에 깔리는 움직이는 배경.
 * 먼 산 · 중간 언덕 · 가까운 땅 세 겹이 서로 다른 속도로 흐르고, 포인터(또는 기기 기울기)에 따라
 * 겹마다 다른 거리만큼 밀려 깊이감을 낸다. 그림은 모두 SVG로 그려 외부 파일이 없다.
 */

const W = 1200;
const H = 400;

type Wave = (x: number) => number;

/** 한 타일 안에서 정수 주기만 써서 이어 붙여도 끊기지 않는 능선 */
function wave(base: number, terms: [freq: number, amp: number, phase: number][]): Wave {
  return (x) => base - terms.reduce((sum, [f, a, p]) => sum + a * Math.sin((2 * Math.PI * f * x) / W + p), 0);
}

function ridge(y: Wave, fill: string): string {
  let d = `M0 ${H} L0 ${y(0).toFixed(1)}`;
  for (let x = 10; x <= W; x += 10) d += ` L${x} ${y(x).toFixed(1)}`;
  return `<path d="${d} L${W} ${H} Z" fill="${fill}"/>`;
}

/** 타일 가장자리에서 잘리지 않도록 안쪽에만 놓을 x 위치들 */
function spots(rng: Rng, count: number, margin = 60): number[] {
  return Array.from({ length: count }, (_, i) => {
    const slot = (W - margin * 2) / count;
    return margin + slot * i + rng() * slot * 0.7;
  });
}

function svgUrl(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const roundTree = (x: number, gy: number, s: number, leaf: string, trunk: string) =>
  `<rect x="${x - 4 * s}" y="${gy - 34 * s}" width="${8 * s}" height="${36 * s}" rx="${2 * s}" fill="${trunk}"/>` +
  `<circle cx="${x - 12 * s}" cy="${gy - 40 * s}" r="${16 * s}" fill="${leaf}"/>` +
  `<circle cx="${x + 12 * s}" cy="${gy - 42 * s}" r="${17 * s}" fill="${leaf}"/>` +
  `<circle cx="${x}" cy="${gy - 58 * s}" r="${20 * s}" fill="${leaf}"/>`;

const cactus = (x: number, gy: number, s: number, c: string) =>
  `<g fill="none" stroke="${c}" stroke-linecap="round">` +
  `<path d="M${x} ${gy} V${gy - 70 * s}" stroke-width="${14 * s}"/>` +
  `<path d="M${x - 2 * s} ${gy - 32 * s} H${x - 18 * s} V${gy - 52 * s}" stroke-width="${9 * s}" stroke-linejoin="round"/>` +
  `<path d="M${x + 2 * s} ${gy - 42 * s} H${x + 17 * s} V${gy - 60 * s}" stroke-width="${9 * s}" stroke-linejoin="round"/></g>`;

const pine = (x: number, gy: number, s: number, c: string, cap?: string) => {
  const tier = (top: number, half: number, h: number) =>
    `<polygon points="${x},${gy - top * s} ${x - half * s},${gy - (top - h) * s} ${x + half * s},${gy - (top - h) * s}" fill="${c}"/>` +
    (cap ? `<polygon points="${x},${gy - top * s} ${x - half * 0.35 * s},${gy - (top - h * 0.35) * s} ${x + half * 0.35 * s},${gy - (top - h * 0.35) * s}" fill="${cap}"/>` : '');
  return `<rect x="${x - 3 * s}" y="${gy - 14 * s}" width="${6 * s}" height="${16 * s}" fill="${c}"/>` + tier(46, 26, 34) + tier(68, 20, 30) + tier(88, 14, 26);
};

const palm = (x: number, gy: number, s: number, c: string) => {
  const top = [x + 14 * s, gy - 86 * s];
  const leaves = [-150, -110, -60, -20, 20]
    .map((deg) => `<ellipse cx="${top[0] + 22 * s}" cy="${top[1]}" rx="${26 * s}" ry="${6 * s}" fill="${c}" transform="rotate(${deg} ${top[0]} ${top[1]})"/>`)
    .join('');
  return `<path d="M${x} ${gy} Q${x - 6 * s} ${gy - 50 * s} ${top[0]} ${top[1]}" stroke="${c}" stroke-width="${6 * s}" fill="none" stroke-linecap="round"/>${leaves}`;
};

interface SceneArt {
  far: string;
  mid: string;
  near: string;
  clouds: number;
  particles: number;
}

function art(skin: Skin): SceneArt {
  const rng = mulberry32(skin.length * 7919);
  switch (skin) {
    case 'garden': {
      const far = wave(250, [[1, 28, 0], [3, 10, 1]]);
      const mid = wave(300, [[2, 22, 0.5], [5, 7, 2]]);
      const near = wave(290, [[4, 9, 0], [9, 4, 1]]);
      const flowers = spots(rng, 40, 20)
        .map((x, i) => `<circle cx="${x}" cy="${near(x) + 8 + rng() * 30}" r="${3 + rng() * 2}" fill="${['#ff8fb1', '#fff27a', '#ffffff', '#c59bff'][i % 4]}"/>`)
        .join('');
      return {
        far: ridge(far, '#b9dfa4') + spots(rng, 7).map((x) => roundTree(x, far(x) + 4, 0.55, '#a5d38e', '#8fb37a')).join(''),
        mid: ridge(mid, '#93cb74') + spots(rng, 6).map((x) => roundTree(x, mid(x) + 6, 1, '#6fb052', '#7a5232')).join(''),
        near: ridge(near, '#6aa84f') + flowers,
        clouds: 5,
        particles: 14,
      };
    }
    case 'desert': {
      const far = wave(245, [[1, 38, 0], [2, 14, 2]]);
      const mid = wave(300, [[2, 32, 1], [3, 9, 0]]);
      const near = wave(295, [[3, 12, 0], [7, 4, 2]]);
      const rocks = spots(rng, 8)
        .map((x) => `<ellipse cx="${x}" cy="${near(x) + 14}" rx="${10 + rng() * 14}" ry="${6 + rng() * 6}" fill="#b97b3e"/>`)
        .join('');
      return {
        far: ridge(far, '#f3cf95'),
        mid: ridge(mid, '#e9b56a') + spots(rng, 5).map((x) => cactus(x, mid(x) + 8, 0.9 + rng() * 0.4, '#6f9a52')).join(''),
        near: ridge(near, '#dc9d4f') + rocks,
        clouds: 2,
        particles: 18,
      };
    }
    case 'jungle': {
      const far = wave(225, [[1, 55, 0], [3, 22, 1], [5, 9, 2]]);
      const mid = wave(295, [[3, 16, 0], [7, 8, 1]]);
      const near = wave(290, [[5, 12, 0], [11, 5, 2]]);
      const canopy = spots(rng, 22, 30)
        .map((x) => `<circle cx="${x}" cy="${mid(x) + 4}" r="${22 + rng() * 18}" fill="${rng() > 0.5 ? '#3d9156' : '#4aa463'}"/>`)
        .join('');
      const leaves = spots(rng, 14, 30)
        .map((x) => `<ellipse cx="${x}" cy="${near(x) - 6}" rx="${24 + rng() * 10}" ry="9" fill="#1d5e30" transform="rotate(${-40 + rng() * 80} ${x} ${near(x)})"/>`)
        .join('');
      return {
        far: ridge(far, '#8cc7a4'),
        mid: canopy + ridge(mid, '#3a8a50') + spots(rng, 4).map((x) => palm(x, mid(x) + 6, 1.1, '#2c7343')).join(''),
        near: ridge(near, '#23703a') + leaves,
        clouds: 4,
        particles: 22,
      };
    }
    case 'snow': {
      const peaks = spots(rng, 7, 90).map((x) => ({ x, h: 110 + rng() * 90, w: 120 + rng() * 70 }));
      const farBody = peaks
        .map(({ x, h, w }) => {
          const base = 330;
          const cap = 0.32;
          return (
            `<polygon points="${x},${base - h} ${x - w},${base} ${x + w},${base}" fill="#c3d5ea"/>` +
            `<polygon points="${x},${base - h} ${x - w * cap},${base - h * (1 - cap)} ${x - w * 0.12},${base - h * 0.62} ${x + w * 0.1},${base - h * 0.7} ${x + w * cap},${base - h * (1 - cap)}" fill="#ffffff"/>`
          );
        })
        .join('');
      const mid = wave(305, [[2, 18, 0], [5, 6, 1]]);
      const near = wave(300, [[3, 8, 0], [8, 4, 2]]);
      return {
        far: `<rect y="320" width="${W}" height="80" fill="#c3d5ea"/>${farBody}`,
        mid: ridge(mid, '#e3edf7') + spots(rng, 9).map((x) => pine(x, mid(x) + 6, 0.8 + rng() * 0.5, '#6f8fb2', '#ffffff')).join(''),
        near: ridge(near, '#ffffff') + ridge(wave(325, [[3, 6, 1]]), '#e6eff8'),
        clouds: 4,
        particles: 40,
      };
    }
  }
}

/** 겹마다 마우스를 따라 밀리는 최대 거리(px). 가까울수록 크다 */
const DEPTH: Record<string, number> = { far: -8, mid: -18, near: -32 };

let root: HTMLElement | null = null;
let current: Skin | null = null;

function px(rng: Rng, min: number, max: number): string {
  return (min + rng() * (max - min)).toFixed(2);
}

export function setSceneSkin(skin: Skin): void {
  if (!root) mountScene();
  if (skin === current) return;
  current = skin;
  const a = art(skin);
  const rng = mulberry32(42);
  const layer = (name: string, body: string) =>
    `<div class="scene-depth ${name}" data-depth="${DEPTH[name]}"><div class="scene-strip" style="background-image:${svgUrl(body).replace(/"/g, '&quot;')}"></div></div>`;
  const clouds = Array.from(
    { length: a.clouds },
    () =>
      `<span class="cloud" style="--top:${px(rng, 4, 34)}%;--size:${px(rng, 0.7, 1.5)};--dur:${px(rng, 60, 120)}s;--delay:-${px(rng, 0, 120)}s"></span>`,
  ).join('');
  const particles = Array.from(
    { length: a.particles },
    () =>
      `<span class="particle-bg" style="--x:${px(rng, 0, 100)}%;--y:${px(rng, 0, 100)}%;--size:${px(rng, 0.6, 1.4)};--dur:${px(rng, 6, 16)}s;--delay:-${px(rng, 0, 16)}s"></span>`,
  ).join('');
  const stars = Array.from(
    { length: 40 },
    () => `<span class="star" style="--x:${px(rng, 0, 100)}%;--y:${px(rng, 0, 55)}%;--delay:-${px(rng, 0, 4)}s"></span>`,
  ).join('');

  root!.innerHTML = `
    <div class="scene-sky"></div>
    <div class="scene-stars">${stars}</div>
    <div class="scene-depth sun-wrap" data-depth="-4"><div class="scene-sun"></div></div>
    <div class="scene-depth clouds" data-depth="-6">${clouds}</div>
    ${layer('far', a.far)}
    ${layer('mid', a.mid)}
    ${layer('near', a.near)}
    <div class="scene-night"></div>
    <div class="scene-particles">${particles}</div>`;
}

function mountScene(): void {
  root = document.createElement('div');
  root.className = 'scene';
  root.setAttribute('aria-hidden', 'true');
  document.body.prepend(root);

  // 마우스 위치·기기 기울기에 따라 겹마다 다른 거리만큼 좌우로만 민다(위아래로는 움직이지 않음).
  // 변수를 바꾸면 배경 전체 스타일을 다시 계산하므로, 겹 네 장의 transform만 직접 바꾼다
  let frame = 0;
  let tx = 0;
  const push = (x: number) => {
    tx = Math.max(-1, Math.min(1, x));
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      root!.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
        el.style.transform = `translate3d(${(tx * Number(el.dataset.depth)).toFixed(1)}px, 0, 0)`;
      });
    });
  };
  // 터치는 두드릴 때마다 배경이 밀려 어색하므로 마우스만 따른다
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'mouse') push((e.clientX / innerWidth) * 2 - 1);
    },
    { passive: true },
  );
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null) push(e.gamma / 30);
  });
}
