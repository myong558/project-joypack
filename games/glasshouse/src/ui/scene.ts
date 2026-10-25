import { reducedMotion } from './effects';

/**
 * 깊이감 있는 움직이는 배경(화면 뒤 고정 층). 색과 날씨는 스킨(맑음·비·노을·눈)을 따른다.
 *   먼 층   캔버스 한 장(.sky)에 차례로: 유리 너머 하늘 · 해(맑음·노을) · 흘러가는 구름 · 비 줄기 / 눈 · 먼 언덕과 나무 줄 두 겹 ·
 *           아치형 온실 창틀 · 유리를 타고 흐르는 빗방울(비) / 모서리 성에(눈) · 유리 위를 지나가는 반짝임 ·
 *           비스듬히 들어오는 햇살 줄기 셋 · 빛 속 먼지 · 아래 선반 위 화분들(흐릿한 뒤 줄) ·
 *           양쪽 아래 모서리의 큰 고사리·하트 잎·칼 잎(가장 가까운 어둠, 바람에 흔들림) · 가장자리 비네트
 *   중간 층 천장에서 늘어진 덩굴 잎이 천천히 흔들림
 *   가까운 층 온실 안 꽃잎(노을은 마른 잎, 눈은 큰 눈송이)이 크게, 조금 빠르게, 살짝 흐릿하게 내려옴
 * 빛을 캔버스 한 장으로 그리는 까닭(기준서 1.10): 화면보다 큰 움직이는 층 여러 장은 휴대폰에서 깜박인다.
 * 잎은 층마다 경로 하나에 모아 한 번에 칠한다(잎 수백 장이어도 가볍게).
 * 게임 중에는 빛·잎을 흐리게 하고 덩굴·꽃잎 층을 숨긴다. 대화상자가 열려 있거나 동작 줄이기면 멈춘 그림
 */
export function mountScene(): void {
  if (document.querySelector('.scene')) return;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);

  const vines = Array.from({ length: 6 }, (_, i) => {
    const len = Number(pick(70, 150));
    const leaves = Array.from({ length: Math.floor(len / 22) }, (_, k) => `<path d="M0 ${12 + k * 22}c${k % 2 ? '' : '-'}9 -2 ${k % 2 ? '' : '-'}13 -8 ${k % 2 ? '' : '-'}12 -14c${k % 2 ? '-' : ''}6 2 ${k % 2 ? '-' : ''}11 7 ${k % 2 ? '-' : ''}12 14z" />`).join('');
    return `<i class="vine" style="--x:${(i * 17 + Number(pick(0, 8))).toFixed(1)}%;--sw:${pick(7, 12)}s;--t:-${pick(0, 10)}s"><svg viewBox="-16 0 32 ${len}" style="height:${len}px" focusable="false"><path d="M0 0V${len}" stroke="currentColor" stroke-width="1.2" fill="none"/><g fill="currentColor">${leaves}</g></svg></i>`;
  }).join('');
  // 떨어지는 것 24개: 맑음·눈은 모두, 노을은 앞 10개만(styles.css). 셋에 하나는 작은 잎(맑음)
  const bits = Array.from({ length: 24 }, () => {
    const d = Number(pick(12, 24));
    return `<i class="bit" style="--x:${pick(0, 100)}%;--s:${pick(9, 20)}px;--d:${d}s;--t:-${pick(0, d)}s;--w:${pick(30, 90)}px;--r:${pick(-180, 180)}deg"></i>`;
  }).join('');

  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `<canvas class="sky"></canvas><div class="layer mid" style="--k:10">${vines}</div><div class="layer near" style="--k:24">${bits}</div>`;
  document.body.prepend(scene);
  paint(scene.querySelector('canvas')!, rnd);

  // PC 마우스 시차: 층마다 --k px 씩 반대로 옮긴다. 터치 기기·동작 줄이기는 하지 않는다
  if (!matchMedia('(pointer: fine)').matches) return;
  let frame = 0;
  window.addEventListener('pointermove', (e) => {
    if (reducedMotion.matches || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      mouse.x = (e.clientX / innerWidth) * 2 - 1;
      mouse.y = (e.clientY / innerHeight) * 2 - 1;
      scene.style.setProperty('--px', mouse.x.toFixed(3));
      scene.style.setProperty('--py', mouse.y.toFixed(3));
    });
  });
}

const mouse = { x: 0, y: 0 };
type Rgb = [number, number, number];
const parse = (c: string): Rgb => {
  c = c.trim();
  if (c.startsWith('#')) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
  }
  const m = c.match(/[\d.]+/g);
  return m ? (m.slice(0, 3).map(Number) as Rgb) : [128, 128, 128];
};
const rgba = (c: Rgb, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * k) as Rgb;
const wave = (t: number, period: number, phase = 0) => (1 - Math.cos(((t + phase) / period) * Math.PI * 2)) / 2;
const WHITE: Rgb = [255, 255, 255];

type Weather = 'clear' | 'rain' | 'dusk' | 'snow';
/** 날씨마다: 햇살 줄기 세기, 먼지 세기, 줄기 기울기, 구름 색 섞기(흰색 → 잿빛·분홍) */
const LOOK: Record<Weather, { beam: number; motes: number; tilt: number; cloud: number }> = {
  clear: { beam: 1, motes: 1, tilt: -0.42, cloud: 0.7 },
  rain: { beam: 0.22, motes: 0.25, tilt: -0.3, cloud: 0.55 },
  dusk: { beam: 0.85, motes: 0.8, tilt: -0.95, cloud: 0.55 },
  snow: { beam: 0.55, motes: 0.4, tilt: -0.42, cloud: 0.6 },
};

/** 잎 한 장(밑 x,y 에서 ang 쪽으로 len, 가장 넓은 곳 wid)을 지금 경로에 더한다 */
function blade(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, wid: number, waist = 0.45): void {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const mx = x + dx * len * waist, my = y + dy * len * waist;
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx - dy * wid, my + dx * wid, x + dx * len, y + dy * len);
  ctx.quadraticCurveTo(mx + dy * wid, my - dx * wid, x, y);
}

/** 하트 잎(필로덴드론): 잎자루 끝 x,y 에서 ang 쪽으로 */
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, vein?: Path2D): void {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const P = (u: number, v: number): [number, number] => [x + dx * u * len - dy * v * len, y + dy * u * len + dx * v * len];
  ctx.moveTo(...P(0.1, 0));
  ctx.bezierCurveTo(...P(-0.15, 0.45), ...P(0.45, 0.62), ...P(1, 0));
  ctx.bezierCurveTo(...P(0.45, -0.62), ...P(-0.15, -0.45), ...P(0.1, 0));
  if (!vein) return;
  // 가운데 잎맥과 양쪽 곁맥 둘씩
  vein.moveTo(...P(0.1, 0));
  vein.lineTo(...P(0.9, 0));
  for (const u of [0.3, 0.55]) {
    vein.moveTo(...P(u, 0));
    vein.lineTo(...P(u + 0.22, 0.3 - u * 0.25));
    vein.moveTo(...P(u, 0));
    vein.lineTo(...P(u + 0.22, -0.3 + u * 0.25));
  }
}

/** 고사리 잎: 밑에서 ang 쪽으로 휘며(bend) 뻗고, 마디마다 양쪽으로 작은 잎. 줄기 선은 stem 경로에 */
function frond(ctx: CanvasRenderingContext2D, stem: Path2D, x: number, y: number, ang: number, len: number, bend: number): void {
  const N = 13;
  const step = len / N;
  stem.moveTo(x, y);
  for (let k = 1; k <= N; k++) {
    const s = k / N;
    const a = ang + bend * s * s;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    stem.lineTo(x, y);
    const l = len * 0.17 * (1 - s * 0.82) + 2;
    blade(ctx, x, y, a - 1.05, l, l * 0.26, 0.4);
    blade(ctx, x, y, a + 1.05, l, l * 0.26, 0.4);
  }
  blade(ctx, x, y, ang + bend, len * 0.06 + 3, len * 0.018 + 1);
}

/** 화분 하나(테라코타 사다리꼴 + 테) */
function pot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.moveTo(x - w / 2, y - h);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x + w * 0.36, y);
  ctx.lineTo(x - w * 0.36, y);
  ctx.closePath();
  ctx.rect(x - w * 0.56, y - h - h * 0.22, w * 1.12, h * 0.26);
}

interface BackPlant { x: number; kind: number; size: number; phase: number; leaves: number[] }
interface Cloud { x: number; y: number; s: number; v: number; puffs: [number, number, number][] }

function paint(canvas: HTMLCanvasElement, rnd: () => number): void {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const motes = Array.from({ length: 30 }, () => ({ x: rnd(), y: rnd(), d: 14 + rnd() * 14, t: rnd() * 30, r: 0.8 + rnd() * 1.4 }));
  const snow = Array.from({ length: 170 }, () => ({ x: rnd(), y: rnd(), s: 0.5 + rnd() * 1.3, v: 14 + rnd() * 30, far: rnd() < 0.5 }));
  // 눈: 잎보다 앞에서 크게 내리는 송이(가장 가까운 층)
  const flakes = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), s: 2.4 + rnd() * 2.4, v: 40 + rnd() * 40, p: rnd() * 9 }));
  const rain = Array.from({ length: 80 }, () => ({ x: rnd(), y: rnd(), l: 10 + rnd() * 16, v: 0.9 + rnd() * 0.5 }));
  const drops = Array.from({ length: 22 }, () => ({ x: rnd(), y: rnd(), r: 1.4 + rnd() * 2.6, v: 0.015 + rnd() * 0.05, p: rnd() * 10 }));
  const clouds: Cloud[] = Array.from({ length: 6 }, (_, i) => ({
    x: rnd(),
    y: 0.06 + (i % 3) * 0.09 + rnd() * 0.05,
    s: 0.7 + rnd() * 0.7,
    v: 0.004 + rnd() * 0.006,
    puffs: Array.from({ length: 5 }, (_, k) => [(k - 2) * 26 + rnd() * 10, -Math.sin((k / 4) * Math.PI) * 14 - rnd() * 6, 18 + Math.sin((k / 4) * Math.PI) * 12 + rnd() * 6]),
  }));
  const hills = [0, 1].map(() => ({ p1: rnd() * 6, p2: rnd() * 6, p3: rnd() * 6 }));
  const back: BackPlant[] = Array.from({ length: 16 }, (_, i) => ({ x: (i + 0.3 + rnd() * 0.4) / 16, kind: Math.floor(rnd() * 4), size: 0.75 + rnd() * 0.5, phase: rnd() * 9, leaves: Array.from({ length: 7 }, () => rnd()) }));
  let w = 0;
  let h = 0;
  let scale = 1;
  let col = { a: [0, 0, 0] as Rgb, b: [0, 0, 0] as Rgb, sun: [0, 0, 0] as Rgb, frame: [0, 0, 0] as Rgb, leaf: [0, 0, 0] as Rgb, weather: 'clear' as Weather, dark: false };
  let dirty = true;
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => parse(s.getPropertyValue(n));
    const skin = document.documentElement.dataset.skin as Weather;
    col = {
      a: v('--sky-a'),
      b: v('--sky-b'),
      sun: v('--sun'),
      frame: v('--frame'),
      leaf: v('--shrub'),
      weather: skin in LOOK ? skin : 'clear',
      dark: s.getPropertyValue('color-scheme').trim() === 'dark',
    };
    dirty = true;
  };
  const resize = () => {
    scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.75;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    dirty = true;
  };
  readColors();
  resize();
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  window.addEventListener('resize', resize);

  const draw = (t: number, game: boolean) => {
    const { a, b, sun, frame, leaf, weather, dark } = col;
    const look = LOOK[weather];
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba(a));
    sky.addColorStop(1, rgba(b));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const k = game ? 0.45 : 1;
    const px = mouse.x * 5;
    const horizon = h * 0.7;

    // 해: 맑음은 왼쪽 위(햇살 줄기가 오는 쪽), 노을은 언덕 위에 낮게 걸려 아주 천천히 숨 쉬듯
    if (weather === 'clear' || weather === 'dusk') {
      const low = weather === 'dusk';
      const sx = (low ? 0.86 : 0.12) * w - px * 0.5;
      const sy = low ? horizon - h * 0.07 + Math.sin(t / 20) * 3 : h * 0.06;
      const r = Math.min(w, h) * (low ? 0.07 : 0.05);
      const glow = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * (low ? 7 : 5));
      glow.addColorStop(0, rgba(mix(sun, WHITE, 0.4), dark ? 0.35 : 0.8));
      glow.addColorStop(1, rgba(sun, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgba(low ? mix(sun, [255, 128, 84], 0.35) : mix(sun, WHITE, 0.6), dark ? 0.55 : 0.95);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 구름: 둥근 덩이 다섯 개가 한 구름, 오른쪽으로 천천히 흘러감(비는 짙고 낮게)
    const cloudCol = weather === 'rain' ? mix(a, [92, 106, 112], 0.45) : weather === 'dusk' ? mix(sun, [236, 150, 170], 0.5) : mix(WHITE, a, 0.15);
    ctx.fillStyle = rgba(cloudCol, (dark ? 0.12 : look.cloud) * (weather === 'snow' ? 0.7 : 1));
    ctx.beginPath();
    for (const c of clouds) {
      const cs = c.s * Math.max(0.8, Math.min(w, 900) / 600) * (weather === 'rain' ? 1.4 : 1);
      const cx = (((c.x + t * c.v * 0.1) % 1.3) - 0.15) * w - px;
      const cy = c.y * h * (weather === 'rain' ? 0.8 : 1);
      for (const [ox, oy, r] of c.puffs) {
        ctx.moveTo(cx + ox * cs + r * cs, cy + oy * cs);
        ctx.arc(cx + ox * cs, cy + oy * cs, r * cs, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // 비 줄기(유리 밖, 빠르게 비스듬히)
    if (weather === 'rain') {
      ctx.strokeStyle = rgba(dark ? [170, 190, 200] : [110, 130, 140], dark ? 0.28 : 0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const r of rain) {
        const y = ((r.y * h + t * 520 * r.v) % (h + 40)) - 20;
        const x = ((r.x * w + y * 0.18) % w) - px;
        ctx.moveTo(x, y);
        ctx.lineTo(x + r.l * 0.18, y + r.l);
      }
      ctx.stroke();
    }

    // 먼 언덕과 나무 줄 두 겹(뒤 겹은 하늘에 묻히고 앞 겹은 조금 짙게). 눈이면 하얗게 덮임
    hills.forEach((hl, i) => {
      const ground = weather === 'snow' ? (dark ? mix(a, WHITE, 0.1 + i * 0.05) : mix(WHITE, a, 0.35 + i * 0.1)) : mix(b, leaf, (dark ? 0.35 : 0.12) + i * 0.1);
      ctx.fillStyle = rgba(ground, weather === 'rain' ? 0.75 : 0.9);
      ctx.beginPath();
      ctx.moveTo(0, h);
      const base = horizon + i * h * 0.05;
      const shift = px * (1 + i);
      for (let x = -10; x <= w + 10; x += 6) {
        const u = (x + shift) / Math.max(w, 400);
        const y = base - Math.sin(u * 5 + hl.p1) * h * 0.025 - Math.sin(u * 13 + hl.p2) * h * 0.01 - Math.abs(Math.sin(u * 60 + hl.p3)) * (i ? 7 : 4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });

    // 눈(유리 밖): 먼 송이는 작고 느리게, 가까운 송이는 크게
    if (weather === 'snow') {
      ctx.fillStyle = dark ? 'rgba(220,230,255,.55)' : 'rgba(255,255,255,.95)';
      ctx.beginPath();
      for (const f of snow) {
        const v = f.far ? f.v * 0.6 : f.v;
        const y = ((f.y * h + t * v) % (h + 20)) - 10;
        const x = f.x * w + Math.sin(t / 3 + f.x * 9) * 12 - px * (f.far ? 0.5 : 1.5);
        const r = f.s * (f.far ? 1.4 : 2.6);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.globalAlpha = 0.75 * k;
      ctx.fill();
      if (!dark) {
        ctx.strokeStyle = 'rgba(120,145,175,.35)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 온실 창틀: 위는 아치(둥근 지붕 갈비), 아래는 세로 창살·가로 띠. 화면 폭에 맞춰 칸 수를 정한다
    ctx.strokeStyle = rgba(frame, (dark ? 0.55 : 0.32) * (game ? 0.6 : 1));
    ctx.lineWidth = 3;
    const cols = Math.max(4, Math.round(w / 140));
    const span = w / cols;
    const archTop = h * 0.04;
    const archBase = h * 0.3;
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const x = i * span - px;
      ctx.moveTo(x, h);
      ctx.lineTo(x, archBase);
      ctx.quadraticCurveTo(x + (w / 2 - x) * 0.18, archTop + Math.abs(x - w / 2) * 0.25, w / 2 - px, archTop - 30);
    }
    for (const yy of [archBase, h * 0.58, h * 0.86]) {
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(frame, (dark ? 0.3 : 0.16) * (game ? 0.6 : 1));
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const x = i * span + span / 2 - px;
      ctx.moveTo(x, h);
      ctx.lineTo(x, archBase);
    }
    ctx.stroke();

    // 유리를 타고 흐르는 빗방울: 멈칫멈칫 내려오며 위로 가는 물줄기를 남긴다
    if (weather === 'rain') {
      const hi = rgba(WHITE, dark ? 0.25 : 0.6);
      const rim = rgba(dark ? [150, 170, 180] : [90, 110, 120], dark ? 0.35 : 0.3);
      for (const d of drops) {
        const go = Math.max(0, Math.sin(t * 0.8 + d.p)) ** 3;
        const y = ((d.y + t * d.v * (0.3 + go)) % 1.1) * h - h * 0.05;
        const x = d.x * w + Math.sin(d.p + y / 60) * 2;
        ctx.strokeStyle = rim;
        ctx.lineWidth = d.r * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y - d.r);
        ctx.lineTo(x + Math.sin(d.p) * 2, y - d.r - 20 - d.r * 8);
        ctx.stroke();
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.arc(x - d.r * 0.35, y - d.r * 0.35, d.r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 눈: 창 네 모서리에 낀 성에
    if (weather === 'snow') {
      const R = Math.max(w, h) * 0.32;
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, rgba(WHITE, dark ? 0.12 : 0.55));
        g.addColorStop(1, rgba(WHITE, 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx ? cx - R : 0, cy ? cy - R : 0, R, R);
      }
    }

    // 유리 위를 비스듬히 지나가는 반짝임(14초에 한 번, 비 오는 날은 없음)
    if (weather !== 'rain') {
      const p = (t % 14) / 14;
      const gx = -w * 0.4 + p * w * 1.8;
      const g = ctx.createLinearGradient(gx - 80, 0, gx + 80, h * 0.4);
      g.addColorStop(0, rgba(WHITE, 0));
      g.addColorStop(0.5, rgba(WHITE, (dark ? 0.05 : 0.22) * k));
      g.addColorStop(1, rgba(WHITE, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // 햇살 줄기 셋: 위에서 비스듬히 내려오며 아주 천천히 옮겨 가고 숨 쉬듯 밝아졌다 어두워짐(노을은 길게 눕는다)
    ctx.save();
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (const [x0, bw, per, ph] of [
      [0.2, 0.16, 38, 0],
      [0.55, 0.1, 46, 12],
      [0.8, 0.2, 54, 25],
    ]) {
      const p = wave(t, per, ph);
      const x = (x0 + (p - 0.5) * 0.08) * w;
      const width = bw * Math.max(w, 500);
      ctx.save();
      ctx.translate(weather === 'dusk' ? x + w * 0.35 : x, -20);
      ctx.rotate(weather === 'dusk' ? -look.tilt * 0.7 : look.tilt);
      const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      const alpha = (dark ? 0.1 : 0.32) * (0.6 + 0.4 * p) * k * look.beam;
      g.addColorStop(0, rgba(sun, 0));
      g.addColorStop(0.5, rgba(sun, alpha));
      g.addColorStop(1, rgba(sun, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-width / 2, 0, width, h * 1.8);
      ctx.restore();
    }
    ctx.restore();

    // 빛 속의 먼지: 위로 천천히 떠오르며 반짝
    ctx.fillStyle = rgba(sun);
    for (const m of motes) {
      const p = wave(t, m.d, m.t);
      ctx.globalAlpha = (dark ? 0.35 : 0.7) * p * k * look.motes;
      ctx.beginPath();
      ctx.arc(m.x * w + Math.sin(t / m.d + m.t) * 20 - px * 2, ((m.y * h - t * 6) % h + h) % h, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 뒤 줄: 아래쪽 선반과 그 위 화분들(하늘빛에 묻혀 흐릿하게, 잎은 바람에 조금씩)
    const shelf = h - Math.min(70, h * 0.11);
    const haze = mix(leaf, b, dark ? 0.35 : 0.55);
    const gameK = game ? 0.5 : 1;
    ctx.fillStyle = rgba(haze, (dark ? 0.8 : 0.55) * gameK);
    ctx.beginPath();
    ctx.rect(-10, shelf, w + 20, 5);
    for (let x = span / 2 - px * 2; x < w; x += span) ctx.rect(x - 2, shelf + 5, 4, h - shelf);
    ctx.fill();
    const potCol = mix([176, 98, 62], b, dark ? 0.55 : 0.5);
    ctx.fillStyle = rgba(potCol, (dark ? 0.7 : 0.6) * gameK);
    ctx.beginPath();
    const unit = Math.max(26, Math.min(44, w / 22));
    for (const pl of back) pot(ctx, pl.x * w - px * 2, shelf, unit * 0.62 * pl.size, unit * 0.5 * pl.size);
    ctx.fill();
    ctx.fillStyle = rgba(haze, (dark ? 0.85 : 0.6) * gameK);
    ctx.beginPath();
    const stems = new Path2D();
    for (const pl of back) {
      const x = pl.x * w - px * 2;
      const y = shelf - unit * 0.62 * pl.size;
      const s = unit * pl.size;
      const sw = Math.sin(t * 0.7 + pl.phase) * 0.06;
      if (pl.kind === 0) {
        // 작은 고사리
        for (let i = 0; i < 5; i++) frond(ctx, stems, x, y, -Math.PI / 2 + (i - 2) * 0.5 + sw, s * (0.9 + pl.leaves[i] * 0.4), (i - 2) * 0.35);
      } else if (pl.kind === 1) {
        // 칼 잎(산세베리아)
        for (let i = 0; i < 5; i++) blade(ctx, x + (i - 2) * s * 0.08, y, -Math.PI / 2 + (i - 2) * 0.14 + sw * 0.5, s * (1.1 + pl.leaves[i] * 0.7), s * 0.07, 0.35);
      } else if (pl.kind === 2) {
        // 둥근 잎 포기
        for (let i = 0; i < 7; i++) blade(ctx, x, y, -Math.PI / 2 + (i - 3) * 0.42 + sw, s * (0.7 + pl.leaves[i] * 0.3), s * 0.2);
      } else {
        // 꽃대 몇 개(꽃은 작은 동그라미)
        for (let i = 0; i < 4; i++) {
          const ang = -Math.PI / 2 + (i - 1.5) * 0.3 + sw;
          const L = s * (0.9 + pl.leaves[i] * 0.6);
          stems.moveTo(x, y);
          stems.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L);
          ctx.moveTo(x + Math.cos(ang) * L + s * 0.09, y + Math.sin(ang) * L);
          ctx.arc(x + Math.cos(ang) * L, y + Math.sin(ang) * L, s * 0.09, 0, Math.PI * 2);
          blade(ctx, x, y, ang + (i % 2 ? 0.5 : -0.5), s * 0.45, s * 0.1);
        }
      }
    }
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.2;
    ctx.stroke(stems);

    // 앞 줄: 양쪽 아래 모서리의 큰 잎(가장 가까운 어둠). 왼쪽은 고사리·하트 잎, 오른쪽은 하트 잎·칼 잎. 바람결이 왼쪽에서 오른쪽으로 번진다
    const S = Math.max(120, Math.min(300, Math.min(w, h) * 0.42));
    const gust = (ph: number) => Math.sin(t * 0.55 + ph) * 0.045 + Math.sin(t * 1.4 + ph * 2) * 0.015;
    const fstem = new Path2D();
    const veins = new Path2D();
    ctx.beginPath();
    const lx = -S * 0.05 - px * 4;
    for (let i = 0; i < 6; i++) frond(ctx, fstem, lx + S * 0.12, h + 6, -1.75 + i * 0.27 + gust(i * 0.4), S * (0.95 + (i % 3) * 0.12), 0.55 + i * 0.05);
    for (let i = 0; i < 3; i++) {
      const ang = -1.2 + i * 0.35 + gust(2 + i);
      const L = S * (0.55 + i * 0.08);
      const ex = lx + S * 0.02 + Math.cos(ang) * L * 0.55, ey = h + 8 + Math.sin(ang) * L * 0.55;
      fstem.moveTo(lx + S * 0.02, h + 8);
      fstem.quadraticCurveTo(lx + S * 0.02 + Math.cos(ang) * L * 0.3, h + 8 + Math.sin(ang) * L * 0.4, ex, ey);
      heart(ctx, ex, ey, ang + 0.5, S * 0.32, veins);
    }
    const rx = w + S * 0.05 - px * 4;
    for (let i = 0; i < 7; i++) blade(ctx, rx - S * 0.12 - i * S * 0.035, h + 6, -1.62 - i * 0.07 + gust(4 + i * 0.3) * 0.6, S * (0.85 + ((i * 37) % 5) * 0.09), S * 0.06, 0.38);
    for (let i = 0; i < 3; i++) {
      const ang = Math.PI + 1.15 - i * 0.33 + gust(6 + i);
      const L = S * (0.6 + i * 0.07);
      const bx = rx - S * 0.02;
      const ex = bx + Math.cos(ang) * L * 0.55, ey = h + 8 + Math.sin(ang) * L * 0.55;
      fstem.moveTo(bx, h + 8);
      fstem.quadraticCurveTo(bx + Math.cos(ang) * L * 0.3, h + 8 + Math.sin(ang) * L * 0.4, ex, ey);
      heart(ctx, ex, ey, ang - 0.5, S * 0.34, veins);
    }
    ctx.fillStyle = rgba(leaf, (dark ? 0.9 : 0.62) * gameK);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    ctx.stroke(fstem);
    ctx.strokeStyle = rgba(mix(leaf, b, 0.6), (dark ? 0.35 : 0.5) * gameK);
    ctx.lineWidth = 1.2;
    ctx.stroke(veins);

    if (weather === 'snow') {
      ctx.fillStyle = dark ? 'rgba(225,235,255,.6)' : 'rgba(255,255,255,.95)';
      ctx.beginPath();
      for (const f of flakes) {
        const y = ((f.y * h + t * f.v) % (h + 30)) - 15;
        const x = f.x * w + Math.sin(t / 2.4 + f.p) * 18 - px * 3;
        ctx.moveTo(x + f.s, y);
        ctx.arc(x, y, f.s, 0, Math.PI * 2);
      }
      ctx.globalAlpha = 0.85 * k;
      ctx.fill();
      if (!dark) {
        ctx.strokeStyle = 'rgba(120,145,175,.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, rgba(leaf, 0));
    v.addColorStop(1, rgba(leaf, dark ? 0.5 : 0.2));
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  };

  let last = 0;
  let wasGame = false;
  let wasModal = false;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    const game = !!document.querySelector('.screen.game');
    const modal = !!document.querySelector('.modal-backdrop');
    const still = modal || reducedMotion.matches;
    const changed = dirty || game !== wasGame || modal !== wasModal;
    if (!changed && (still || now - last < 33)) return;
    last = now;
    dirty = false;
    wasGame = game;
    wasModal = modal;
    draw(reducedMotion.matches ? 0 : now / 1000, game);
  };
  requestAnimationFrame(loop);
}
