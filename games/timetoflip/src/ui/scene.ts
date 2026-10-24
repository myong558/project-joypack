import { FACE_SETS, type FaceId } from '../game/faces';
import { CARD_BACK, faceSvg } from './art';
import { reducedMotion } from './effects';

/**
 * 깊이감 있는 움직이는 배경(화면 뒤 고정 층). 색은 스킨을 따른다.
 *   빛      캔버스 한 장(.sky)에 하늘 · 오로라 덩어리 3개 · 비스듬한 빛 띠 두 줄 · 빛망울 · 반짝이 · 별 · 비네트를 함께 그린다
 *   중간 층 실제 카드(뒷면·도형·팝아트)가 좌우로 흔들리며 떠오르고, 가끔 뒤집혀 그림을 보였다 다시 덮음
 *   가까운 층 큰 카드가 더 빠르게, 살짝 흐릿하게(초점 밖) 지나감
 * 빛을 캔버스 한 장으로 그리는 까닭: 화면보다 큰 움직이는 층을 여러 장 두면 휴대폰 GPU 메모리가 모자라
 * 스킨·창을 바꿀 때 화면 조각이 한두 프레임 빠지며 깜박였다. 캔버스는 기기 화소 대신 낮은 해상도(흐린 빛이라 티 안 남)로 그린다.
 * 게임 중에는 빛을 흐리게 하고 카드 층을 숨긴다. 대화상자가 열려 있으면 그리기를 멈춘다(색이 바뀌면 한 번만 다시 그림).
 * PC 에서는 마우스를 따라 층마다 다른 만큼 움직인다(시차). 동작 줄이기가 켜져 있으면 멈춘 그림으로 둔다
 */
export function mountScene(): void {
  if (document.querySelector('.scene')) return;
  // 매번 같은 배치(새로고침해도 배경이 덜컥 바뀌지 않게)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);
  // 떠다니는 카드 그림: 처음 두 묶음(도형·팝아트)에서만 뽑는다. 명화는 게임에서 만나는 깜짝 선물로 남겨 둔다
  const faces = FACE_SETS.slice(0, 2).flatMap((s) => [...s.faces] as FaceId[]).sort(() => rnd() - 0.5);
  let next = 0;
  const face = (): FaceId => faces[next++ % faces.length];

  const cards = (n: number, size: [number, number], dur: [number, number]) =>
    Array.from({ length: n }, () => {
      const d = Number(pick(...dur));
      const f = Number(pick(6, 11));
      return (
        `<i class="fc" style="--x:${pick(2, 94)}%;--s:${pick(...size)}px;--d:${d}s;--t:-${pick(0, d)}s;--r:${pick(-25, 25)}deg;--w:${pick(14, 40)}px;--sw:${pick(4, 7)}s;--f:${f}s;--ft:-${pick(0, f)}s">` +
        `<span class="sway"><span class="flip"><b class="side back">${CARD_BACK}</b><b class="side front">${faceSvg(face())}</b></span></span></i>`
      );
    }).join('');

  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `
    <canvas class="sky"></canvas>
    <div class="layer mid" style="--k:14">${cards(7, [26, 40], [30, 44])}</div>
    <div class="layer near" style="--k:28">${cards(4, [56, 76], [18, 26])}</div>`;
  document.body.prepend(scene);
  paintSky(scene.querySelector('canvas')!, rnd);

  // 마우스 시차: 화면 가운데에서 벗어난 만큼(−1~1) 층마다 --k px 씩 반대로 옮긴다. 터치 기기·동작 줄이기는 하지 않는다
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
/** a 를 p 만큼, 나머지는 b (CSS color-mix(in srgb, a p, b) 와 같음) */
const mix = (a: Rgb, p: number, b: Rgb): Rgb => a.map((v, i) => v * p + b[i] * (1 - p)) as Rgb;
const rgba = (c: Rgb, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;
const WHITE: Rgb = [255, 255, 255];
const PINK: Rgb = [255, 111, 168];
/** 끝과 끝을 부드럽게 오가는 0~1(ease-in-out alternate) */
const wave = (t: number, period: number, phase = 0) => (1 - Math.cos(((t + phase) / period) * Math.PI * 2)) / 2;

function paintSky(canvas: HTMLCanvasElement, rnd: () => number): void {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  // 빛망울·반짝이 자리(화면 비율 기준)
  const bokeh = Array.from({ length: 6 }, () => ({ x: rnd(), y: rnd(), s: 120 + rnd() * 160, d: 18 + rnd() * 12, t: rnd() * 30 }));
  const sparks = Array.from({ length: 14 }, () => ({ x: rnd(), y: rnd(), d: 2.5 + rnd() * 2.5, t: rnd() * 5 }));
  const stars: [number, number, number][] = [
    [0.12, 0.18, 3],
    [0.78, 0.12, 2],
    [0.64, 0.7, 3],
    [0.3, 0.84, 2],
    [0.9, 0.52, 2],
  ];

  let w = 0;
  let h = 0;
  let scale = 1;
  let col = { a: WHITE, b: WHITE, accent: WHITE, glow: WHITE, night: false };
  let dirty = true;

  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => parse(s.getPropertyValue(n));
    col = { a: v('--sky-a'), b: v('--sky-b'), accent: v('--accent'), glow: v('--glow'), night: document.documentElement.dataset.skin === 'night' };
    dirty = true;
  };
  const resize = () => {
    // 흐린 빛 그림이라 기기 화소의 절반 정도로 충분하다(메모리·그리기 비용을 줄임)
    scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.75;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    dirty = true;
  };
  readColors();
  resize();
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin', 'data-theme', 'class', 'style'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  window.addEventListener('resize', resize);

  const blob = (x: number, y: number, r: number, c: Rgb, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  const draw = (t: number, game: boolean) => {
    const { a, b, accent, glow } = col;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    // 하늘: 스킨 하늘색 + 아래로 갈수록 강조색이 스며 깊어짐(170deg)
    const ang = (170 - 90) * (Math.PI / 180);
    const len = Math.abs(w * Math.cos(ang)) + Math.abs(h * Math.sin(ang));
    const dx = (Math.cos(ang) * len) / 2;
    const dy = (Math.sin(ang) * len) / 2;
    const sky = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
    sky.addColorStop(0, rgba(a));
    sky.addColorStop(0.55, rgba(b));
    sky.addColorStop(1, rgba(mix(b, 0.62, accent)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // 위쪽 밝은 빛
    ctx.save();
    ctx.translate(w / 2, -0.1 * h);
    ctx.scale(1.2 * w, 0.7 * h);
    const top = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    top.addColorStop(0, rgba(mix(a, 0.7, WHITE)));
    top.addColorStop(0.6, rgba(mix(a, 0.7, WHITE), 0));
    ctx.fillStyle = top;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();

    // 게임 중에는 빛을 흐리게(카드를 외우는 데 방해되지 않게)
    const k = game ? 0.4 : 1;
    const vmax = Math.max(w, h);
    const px = mouse.x * 6;
    const py = mouse.y * 6;
    // 오로라 덩어리 셋(서로 다른 속도로 흐름)
    const r = 0.4 * vmax;
    const p1 = wave(t, 76);
    const p2 = wave(t, 92);
    const p3 = 1 - wave(t, 108, 20);
    blob(-0.3 * vmax + r + p1 * 0.25 * w, -0.3 * vmax + r + p1 * 0.18 * h, r * (1 + 0.2 * p1), accent, 0.38 * k);
    blob(w + 0.35 * vmax - r - p2 * 0.3 * w, 0.1 * h + r + p2 * 0.25 * h, r * (1 - 0.15 * p2), glow, 0.55 * k);
    blob(-0.1 * vmax + r + p3 * 0.25 * w, h + 0.45 * vmax - r + p3 * 0.18 * h, r * (1 + 0.2 * p3), PINK, 0.3 * k);

    // 비스듬한 빛 띠 두 줄(게임 중에는 없음)
    if (!game) {
      for (const [bw, period, phase] of [
        [0.26 * vmax, 26, 0],
        [0.12 * vmax, 34, 14],
      ]) {
        const p = wave(t, period, phase);
        const x = -0.4 * w + p * 1.5 * w;
        ctx.save();
        ctx.translate(x + bw / 2, h * 0.5);
        ctx.rotate((18 * Math.PI) / 180);
        const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.22)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-bw / 2, -h, bw, h * 2);
        ctx.restore();
      }
    }

    // 먼 빛망울: 떠다니며 숨 쉬듯 커졌다 작아짐
    for (const o of bokeh) {
      const p = wave(t, o.d * 2, o.t);
      const s = (o.s / 2) * (0.8 + 0.35 * p) * 0.68;
      blob(o.x * w - 30 + 70 * p - px, o.y * h + 20 - 50 * p - py, s, glow, 0.55 * 0.7 * k);
    }
    // 별(밤은 반짝임) · 작은 십자 반짝이
    ctx.fillStyle = rgba(glow);
    const drift = ((t / (col.night ? 60 : 40)) % 1) * 340;
    ctx.globalAlpha = 0.55 * k * (col.night ? 0.25 + 0.55 * wave(t, 6) : 1);
    for (let ox = -340; ox < w + 340; ox += 340) {
      for (let oy = -340; oy < h + 340; oy += 340) {
        for (const [sx, sy, sr] of stars) {
          ctx.beginPath();
          ctx.arc(ox + sx * 340 - drift, oy + sy * 340 + (drift * 120) / 340, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#fff';
    for (const o of sparks) {
      const p = Math.sin((((t + o.t) % o.d) / o.d) * Math.PI);
      if (p < 0.05) continue;
      ctx.globalAlpha = 0.85 * p * k;
      const x = o.x * w - px;
      const y = o.y * h - py;
      const s = 5 * (1 + 0.3 * p);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((p * Math.PI) / 4);
      ctx.fillRect(-s, -0.5, s * 2, 1);
      ctx.fillRect(-0.5, -s, 1, s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // 가장자리를 살짝 어둡게(비네트): 가운데가 앞으로 나와 보인다
    ctx.save();
    ctx.translate(w / 2, h * 0.45);
    ctx.scale(1.2 * w, 0.9 * h);
    const v = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    // CSS 의 color-mix(강조색 22%, rgb(20 16 40 / 0.35)) 를 불투명도 0.55 로 얹은 것과 같게
    const edge = mix(accent, 0.22, [20, 16, 40]);
    v.addColorStop(0.55, rgba(edge, 0));
    v.addColorStop(1, rgba(edge, 0.55 * (0.22 + 0.78 * 0.35) * (game ? 0.45 : 1)));
    ctx.fillStyle = v;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };

  // 30fps 로 충분(천천히 흐르는 빛). 대화상자가 열려 있으면 멈추고, 색·크기가 바뀌었을 때만 다시 그린다
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
