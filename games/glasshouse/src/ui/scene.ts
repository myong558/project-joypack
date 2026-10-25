import { reducedMotion } from './effects';

/**
 * 깊이감 있는 움직이는 배경(화면 뒤 고정 층). 색은 계절 스킨을 따른다.
 *   먼 층   캔버스 한 장(.sky)에 유리 너머 하늘 · 아치형 온실 창틀 · 비스듬히 들어오는 햇살 줄기 셋 · 빛 속을 떠도는 먼지 ·
 *           겨울엔 유리 밖에 내리는 눈 · 아래쪽 어두운 잎 무리(비네트처럼 가장자리를 눌러 가운데가 앞으로 나옴)
 *   중간 층 천장에서 늘어진 덩굴 잎이 천천히 흔들림
 *   가까운 층 그 계절 꽃잎·잎이 크게, 조금 빠르게, 살짝 흐릿하게 내려옴
 * 빛을 캔버스 한 장으로 그리는 까닭(기준서 1.10): 화면보다 큰 움직이는 층 여러 장은 휴대폰에서 깜박인다.
 * 게임 중에는 빛을 흐리게 하고 잎·꽃잎 층을 숨긴다. 대화상자가 열려 있거나 동작 줄이기면 멈춘 그림
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
  const bits = Array.from({ length: 9 }, () => {
    const d = Number(pick(16, 26));
    return `<i class="bit" style="--x:${pick(0, 100)}%;--s:${pick(10, 18)}px;--d:${d}s;--t:-${pick(0, d)}s;--w:${pick(30, 90)}px;--r:${pick(-180, 180)}deg"></i>`;
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
const wave = (t: number, period: number, phase = 0) => (1 - Math.cos(((t + phase) / period) * Math.PI * 2)) / 2;

function paint(canvas: HTMLCanvasElement, rnd: () => number): void {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const motes = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), d: 14 + rnd() * 14, t: rnd() * 30, r: 0.8 + rnd() * 1.4 }));
  const snow = Array.from({ length: 40 }, () => ({ x: rnd(), y: rnd(), s: 0.6 + rnd() * 1.2, v: 20 + rnd() * 30 }));
  const shrubs = Array.from({ length: 14 }, () => ({ x: rnd(), r: 40 + rnd() * 60, y: rnd() * 0.08 }));
  let w = 0;
  let h = 0;
  let scale = 1;
  let col = { a: [0, 0, 0] as Rgb, b: [0, 0, 0] as Rgb, sun: [0, 0, 0] as Rgb, frame: [0, 0, 0] as Rgb, leaf: [0, 0, 0] as Rgb, winter: false, dark: false };
  let dirty = true;
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => parse(s.getPropertyValue(n));
    col = {
      a: v('--sky-a'),
      b: v('--sky-b'),
      sun: v('--sun'),
      frame: v('--frame'),
      leaf: v('--shrub'),
      winter: document.documentElement.dataset.skin === 'winter',
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
    const { a, b, sun, frame, leaf } = col;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba(a));
    sky.addColorStop(1, rgba(b));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const k = game ? 0.45 : 1;
    const px = mouse.x * 5;

    // 겨울: 유리 밖에 눈이 천천히 내림(창틀 뒤)
    if (col.winter) {
      ctx.fillStyle = col.dark ? 'rgba(220,230,255,.5)' : 'rgba(255,255,255,.9)';
      for (const f of snow) {
        const y = ((f.y * h + t * f.v) % (h + 20)) - 10;
        const x = f.x * w + Math.sin(t / 3 + f.x * 9) * 12;
        ctx.globalAlpha = 0.6 * k;
        ctx.beginPath();
        ctx.arc(x, y, f.s * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 온실 창틀: 위는 아치(둥근 지붕 갈비), 아래는 세로 창살·가로 띠. 화면 폭에 맞춰 칸 수를 정한다
    ctx.strokeStyle = rgba(frame, (col.dark ? 0.55 : 0.32) * (game ? 0.6 : 1));
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
    ctx.strokeStyle = rgba(frame, (col.dark ? 0.3 : 0.16) * (game ? 0.6 : 1));
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const x = i * span + span / 2 - px;
      ctx.moveTo(x, h);
      ctx.lineTo(x, archBase);
    }
    ctx.stroke();

    // 햇살 줄기 셋: 위에서 비스듬히 내려오며 아주 천천히 옮겨 가고 숨 쉬듯 밝아졌다 어두워짐
    ctx.save();
    ctx.globalCompositeOperation = col.dark ? 'lighter' : 'source-over';
    for (const [x0, bw, per, ph] of [
      [0.2, 0.16, 38, 0],
      [0.55, 0.1, 46, 12],
      [0.8, 0.2, 54, 25],
    ]) {
      const p = wave(t, per, ph);
      const x = (x0 + (p - 0.5) * 0.08) * w;
      const width = bw * Math.max(w, 500);
      ctx.save();
      ctx.translate(x, -20);
      ctx.rotate(-0.42);
      const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      const alpha = (col.dark ? 0.1 : 0.32) * (0.6 + 0.4 * p) * k;
      g.addColorStop(0, rgba(sun, 0));
      g.addColorStop(0.5, rgba(sun, alpha));
      g.addColorStop(1, rgba(sun, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-width / 2, 0, width, h * 1.6);
      ctx.restore();
    }
    ctx.restore();

    // 빛 속의 먼지: 위로 천천히 떠오르며 반짝
    ctx.fillStyle = rgba(sun);
    for (const m of motes) {
      const p = wave(t, m.d, m.t);
      ctx.globalAlpha = (col.dark ? 0.35 : 0.7) * p * k;
      ctx.beginPath();
      ctx.arc(m.x * w + Math.sin(t / m.d + m.t) * 20 - px * 2, ((m.y * h - t * 6) % h + h) % h, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 아래쪽 잎 무리(가장 가까운 어둠): 가장자리를 눌러 가운데가 떠 보이게
    ctx.fillStyle = rgba(leaf, (col.dark ? 0.85 : 0.5) * (game ? 0.5 : 1));
    for (const s of shrubs) {
      const sway = Math.sin(t / 5 + s.x * 10) * 3;
      ctx.beginPath();
      ctx.ellipse(s.x * w + sway - px * 3, h + s.r * 0.35 - s.y * h, s.r, s.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, rgba(leaf, 0));
    v.addColorStop(1, rgba(leaf, col.dark ? 0.5 : 0.2));
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
