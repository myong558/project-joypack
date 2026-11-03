import type { Skin } from "../theme";

/**
 * 판 벽 = 바닥 위에 올린 정사각형 돌 블록(모서리 살짝 깎음, 아래로 좁아지는 얇은 두께, 바닥에 드리운 그림자).
 * 블록 윗면은 깬 막돌(규암)을 줄눈으로 맞춘 무늬로, 스킨(날씨)마다 돌 색·젖음·눈이 바뀐다.
 * 그림은 전부 코드로 만든 SVG(가중 보로노이로 돌 모양, 잡음 필터로 돌 결·얼룩, 빛 계산으로 요철·젖은 반사).
 * 스킨마다 무늬 6벌을 만들어 :root 의 --wall-0 ~ --wall-5 에 넣고, 벽 칸은 .w0 ~ .w5 로 번갈아 쓴다(이웃 블록이 같아 보이지 않게).
 * 시작 화면 로고 위 줄 간판도 같은 돌로 만든 가로 4칸짜리 블록 한 장(--wall-sign)
 */

type Pt = [number, number];
type Rng = () => number;

interface Look {
  pal: string[];
  mortar: string;
  blotch: number;
  blotchCol: [number, number, number];
  rust: [number, number, number];
  grain: number;
  deep: number;
  rim: number;
  rimCol: string;
  shCol: string;
  sh: [number, number];
  /** 비: 젖은 반사광·빗물 자국 */
  wet?: boolean;
  /** 노을·눈: 블록 전체에 덮는 색 기운 [위 왼쪽, 아래 오른쪽, 진하기] */
  overlay?: [string, string, number];
  /** 눈: 돌 윗부분 서리 */
  frost?: number;
  /** 눈: 돌 윗변을 따라 얹힌 눈(확률, 돌 높이 대비 두께 범위, 가장자리 일그러짐) */
  caps?: { p: number; min: number; max: number; disp: number };
  /** 눈: 블록 윗면 턱에 쌓인 눈 두께 */
  ledge?: number;
  /** 블록 테두리 빛·그늘 색 */
  hi?: string;
  lo: string;
}

const SEED = 505;
const BASE = {
  grain: 0.28,
  blotch: 0.5,
  blotchCol: [0.7, 0.5, 0.24],
  rust: [0.42, 0.26, 0.16],
  deep: 0.42,
  rim: 0.32,
  rimCol: "#fff",
  shCol: "#000",
  sh: [0.9, 1.3],
} as const;

const LOOKS: Record<Skin, Look> = {
  // 맑음: 밝은 은회색 규암, 햇빛에 요철이 또렷
  clear: {
    ...BASE,
    blotchCol: [...BASE.blotchCol],
    rust: [...BASE.rust],
    sh: [...BASE.sh],
    pal: ["#c3c0b8", "#cfccc4", "#b3b1a9", "#bfbaac", "#a9a79e"],
    mortar: "#8f8c86",
    blotch: 0.25,
    grain: 0.32,
    rim: 0.4,
    lo: "#2a2622",
  },
  // 비: 젖어 짙어지며 황토·녹슨 갈색이 살아나고 표면이 번들거림
  rain: {
    ...BASE,
    sh: [...BASE.sh],
    pal: [
      "#8a857b",
      "#7b7870",
      "#9c7548",
      "#83593a",
      "#a9804e",
      "#6f5b4d",
      "#8d7c61",
      "#94897a",
    ],
    mortar: "#4f504c",
    blotch: 0.62,
    blotchCol: [0.66, 0.42, 0.15],
    rust: [0.48, 0.22, 0.1],
    grain: 0.26,
    wet: true,
    deep: 0.55,
    rim: 0.2,
    lo: "#1a1612",
  },
  // 노을: 주황·분홍으로 물들고 테두리 역광, 보랏빛 긴 그림자
  dusk: {
    ...BASE,
    pal: ["#cdb5a6", "#d8c1b0", "#bea596", "#caa996", "#b0978d"],
    mortar: "#86756f",
    blotch: 0.3,
    blotchCol: [0.88, 0.52, 0.3],
    rust: [0.55, 0.28, 0.25],
    rimCol: "#ffcf96",
    rim: 0.55,
    shCol: "#3b1f42",
    deep: 0.48,
    sh: [1.6, 1.7],
    overlay: ["#ffb070", "#8a4a8a", 0.12],
    lo: "#3b1f42",
    hi: "#ffd2a0",
  },
  // 눈: 살짝 내린 눈이 돌 윗가장자리·블록 윗면 턱에, 돌엔 엷은 서리
  snow: {
    ...BASE,
    sh: [...BASE.sh],
    pal: ["#a9aeb3", "#b6babe", "#9a9fa5", "#a8a397", "#94968f"],
    mortar: "#d6dee6",
    blotch: 0.18,
    blotchCol: [0.62, 0.55, 0.42],
    rust: [0.45, 0.4, 0.36],
    shCol: "#36507a",
    deep: 0.42,
    rim: 0.25,
    frost: 0.4,
    caps: { p: 0.6, min: 0.08, max: 0.24, disp: 2.4 },
    overlay: ["#e4eef9", "#8aa2c0", 0.06],
    ledge: 3.2,
    lo: "#1c2a3c",
  },
};

/** 블록 무늬 벌 수(벽 칸 class w0 ~ w5) */
export const WALL_VARIANTS = 6;

function rng(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return (
    "#" +
    [f(n >> 16), f((n >> 8) & 255), f(n & 255)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}
const pts = (p: Pt[]) =>
  p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** 반평면 x·n <= c 로 다각형 자르기 */
function clip(poly: Pt[], nx: number, ny: number, c: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i];
    const Q = poly[(i + 1) % poly.length];
    const dp = P[0] * nx + P[1] * ny - c;
    const dq = Q[0] * nx + Q[1] * ny - c;
    if (dp <= 0) out.push(P);
    if (dp <= 0 !== dq <= 0) {
      const t = dp / (dp - dq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

/** 볼록 다각형 안으로 자르기 */
function clipConvex(subj: Pt[], conv: Pt[], cx: number, cy: number): Pt[] {
  for (let i = 0; i < conv.length && subj.length >= 3; i++) {
    const P = conv[i];
    const Q = conv[(i + 1) % conv.length];
    let nx = -(Q[1] - P[1]);
    let ny = Q[0] - P[0];
    let c = nx * P[0] + ny * P[1];
    if (nx * cx + ny * cy - c > 0) [nx, ny, c] = [-nx, -ny, -c];
    subj = clip(subj, nx, ny, c);
  }
  return subj;
}

/** 돌 윗변을 따라 얹힌 눈: 윗변 윤곽을 그대로 따라 내려오고, 가운데 두툼·양끝 얇게, 아래 경계는 불규칙하게 굽이침 */
function snowCap(poly: Pt[], cx: number, cy: number, T: number, r: Rng): Pt[] {
  const n = poly.length;
  let L = 0;
  let R = 0;
  poly.forEach((p, i) => {
    if (p[0] < poly[L][0]) L = i;
    if (p[0] > poly[R][0]) R = i;
  });
  const walk = (step: number) => {
    const out = [poly[L]];
    for (let i = L; i !== R;) {
      i = (i + step + n) % n;
      out.push(poly[i]);
    }
    return out;
  };
  const a = walk(1);
  const b = walk(-1);
  const avg = (c: Pt[]) => c.reduce((s, p) => s + p[1], 0) / c.length;
  const chain = avg(a) < avg(b) ? a : b;
  const line: Pt[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const P = chain[i];
    const Q = chain[i + 1];
    const k = Math.max(
      1,
      Math.ceil(Math.hypot(Q[0] - P[0], Q[1] - P[1]) / 1.6),
    );
    for (let j = 0; j < k; j++)
      line.push([
        P[0] + ((Q[0] - P[0]) * j) / k,
        P[1] + ((Q[1] - P[1]) * j) / k,
      ]);
  }
  line.push(chain[chain.length - 1]);
  const xL = line[0][0];
  const xR = line[line.length - 1][0];
  const wv = 0.5 + r() * 1.2;
  const ph = r() * 6.28;
  const sk = (r() - 0.5) * 0.5;
  const low = line.map(([x, y]): Pt => {
    const t = (x - xL) / Math.max(1, xR - xL);
    const body = Math.pow(
      Math.sin(Math.PI * Math.min(1, Math.max(0, t + sk * (t - 0.5)))),
      0.7,
    );
    const wob =
      1 + 0.22 * Math.sin(t * 6.28 * wv * 2 + ph) + (r() - 0.5) * 0.18;
    return [x, y + T * (0.12 + 0.88 * body) * wob];
  });
  const top = line.map(([x, y]): Pt => [x, y - 2]);
  return clipConvex([...top, ...low.reverse()], poly, cx, cy);
}

function chamfer(x: number, y: number, w: number, h: number, c: number): Pt[] {
  return [
    [x + c, y],
    [x + w - c, y],
    [x + w, y + c],
    [x + w, y + h - c],
    [x + w - c, y + h],
    [x + c, y + h],
    [x, y + h - c],
    [x, y + c],
  ];
}

/** 블록 한 장(높이 40 단위, 폭 W: 벽 칸은 40, 로고 간판은 160) SVG. 같은 seed 면 늘 같은 그림 */
function blockSvg(o: Look, seed: number, W = 40): string {
  const S = 40;
  const sp = 12;
  const r = rng(seed);
  // 가중 보로노이 씨앗(크기가 제각각인 돌)
  const seeds: { x: number; y: number; w: number }[] = [];
  for (let gy = -1; gy <= Math.ceil(S / sp); gy++)
    for (let gx = -1; gx <= Math.ceil(W / sp); gx++)
      seeds.push({
        x: (gx + 0.5 + (r() - 0.5) * 0.95) * sp,
        y: (gy + 0.5 + (r() - 0.5) * 0.95) * sp,
        w: r() * 0.55 * sp * sp,
      });
  const [sx, sy] = o.sh;
  let under = "";
  let faces = "";
  let over = "";
  let caps = "";
  for (const a of seeds) {
    let poly: Pt[] = [
      [-sp, -sp],
      [W + sp, -sp],
      [W + sp, S + sp],
      [-sp, S + sp],
    ];
    for (const b of seeds) {
      if (a === b) continue;
      const nx = b.x - a.x;
      const ny = b.y - a.y;
      const d = Math.hypot(nx, ny);
      if (d > sp * 3.5) continue;
      // 줄눈 폭만큼 안으로
      poly = clip(
        poly,
        nx,
        ny,
        (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y + a.w - b.w) / 2 -
          0.95 * d,
      );
      if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    // 꼭짓점 일부를 비스듬히 잘라 각진 깬 돌처럼
    const chipped: Pt[] = [];
    poly.forEach((v, i) => {
      const p = poly[(i - 1 + poly.length) % poly.length];
      const n = poly[(i + 1) % poly.length];
      if (r() < 0.4) {
        const t1 = 0.12 + r() * 0.22;
        const t2 = 0.12 + r() * 0.22;
        chipped.push(
          [v[0] + (p[0] - v[0]) * t1, v[1] + (p[1] - v[1]) * t1],
          [v[0] + (n[0] - v[0]) * t2, v[1] + (n[1] - v[1]) * t2],
        );
      } else chipped.push(v);
    });
    poly = chipped;
    const area =
      Math.abs(
        poly.reduce((s, p, i) => {
          const q = poly[(i + 1) % poly.length];
          return s + p[0] * q[1] - q[0] * p[1];
        }, 0),
      ) / 2;
    if (area < 6) continue;
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ys = poly.map((p) => p[1]);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const col = shade(pick(r, o.pal), (r() - 0.5) * 16);
    const P = pts(poly);
    under += `<polygon points='${P}' fill='${o.shCol}' opacity='${o.deep}' transform='translate(${sx} ${sy})'/><polygon points='${P}' fill='${o.rimCol}' opacity='${o.rim}' transform='translate(-.5 -.6)'/>`;
    faces += `<polygon points='${P}' fill='${col}' stroke='${col}' stroke-width='1' stroke-linejoin='round'/>`;
    over += `<polygon points='${P}' fill='url(#lg${Math.floor(r() * 3)})'/>`;
    // 금
    if (r() < 0.25) {
      const i = Math.floor(r() * poly.length);
      const q = poly[(i + 1) % poly.length];
      const s0: Pt = [(poly[i][0] + q[0]) / 2, (poly[i][1] + q[1]) / 2];
      let d = `M${s0[0].toFixed(1)} ${s0[1].toFixed(1)}`;
      const steps = 2 + Math.floor(r() * 3);
      const len = 0.45 + r() * 0.4;
      for (let k = 1; k <= steps; k++)
        d += ` L${(s0[0] + (((cx - s0[0]) * len * k) / steps) * 1.6 + (r() - 0.5) * 3).toFixed(1)} ${(s0[1] + (((cy - s0[1]) * len * k) / steps) * 1.6 + (r() - 0.5) * 3).toFixed(1)}`;
      over += `<path d='${d}' stroke='#fff' stroke-opacity='.3' stroke-width='.5' fill='none' transform='translate(.4 .4)'/><path d='${d}' stroke='#2a2420' stroke-opacity='.6' stroke-width='.55' fill='none' stroke-linejoin='round'/>`;
    }
    if (o.caps && r() < o.caps.p) {
      const cap = snowCap(
        poly,
        cx,
        cy,
        (y1 - y0) * (o.caps.min + r() * (o.caps.max - o.caps.min)),
        r,
      );
      if (cap.length >= 3)
        caps += `<polygon points='${pts(cap)}' fill='#f7fafd' stroke='#f7fafd' stroke-width='1.4' stroke-linejoin='round'/>`;
    }
    if (o.frost) over += `<polygon points='${P}' fill='url(#fr)'/>`;
  }
  // 빗물 자국(칸 한 장에 한 줄, 넓을수록 더)
  if (o.wet) {
    const rr = rng(seed + 99);
    for (
      let i = 0, n = Math.max(1, Math.round((W * S * 78) / 89600));
      i < n;
      i++
    ) {
      const x = rr() * W;
      const y = rr() * S;
      over += `<path d='M${x.toFixed(1)} ${y.toFixed(1)} l ${(rr() - 0.5).toFixed(1)} ${(6 + rr() * 12).toFixed(1)}' stroke='#e8f3f6' stroke-opacity='.32' stroke-width='.7' stroke-linecap='round'/>`;
    }
  }

  // 블록: 모서리 깎은 윗면, 아래로 좁아지는 얇은 두께, 바닥 그림자
  const ins = 1;
  const c = 2.6;
  const th = 2.6;
  const fw = W - 2 * ins;
  const fh = S - 2 * ins - th;
  const faceP = chamfer(ins, ins, fw, fh, c);
  const sideP: Pt[] = [
    [ins, ins + fh - c],
    [W - ins, ins + fh - c],
    [W - ins - c * 1.1, ins + fh + th],
    [ins + c * 1.1, ins + fh + th],
  ];
  const inF = pts(chamfer(ins + 0.6, ins + 0.6, fw - 1.2, fh - 1.2, c - 0.25));
  let ledge = "";
  if (o.ledge) {
    const lp = snowCap(faceP, W / 2, ins + fh / 2, o.ledge, r);
    if (lp.length >= 3)
      ledge = `<g filter='url(#cap)'><polygon points='${pts(lp)}' fill='#f7fafd' stroke='#f7fafd' stroke-width='1.2' stroke-linejoin='round'/></g>`;
  }

  const B = o.blotch;
  const bc = o.blotchCol;
  const G = o.grain;
  const defs = `<defs>
<linearGradient id='lg0' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.2'/><stop offset='.5' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.16'/></linearGradient>
<linearGradient id='lg1' x1='.2' y1='0' x2='.8' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.12'/><stop offset='1' stop-color='#000' stop-opacity='.2'/></linearGradient>
<linearGradient id='lg2' x1='0' y1='.3' x2='1' y2='.7'><stop offset='0' stop-color='#fff' stop-opacity='.16'/><stop offset='1' stop-color='#000' stop-opacity='.1'/></linearGradient>
${o.overlay ? `<linearGradient id='ov' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${o.overlay[0]}' stop-opacity='${o.overlay[2]}'/><stop offset='1' stop-color='${o.overlay[1]}' stop-opacity='${o.overlay[2]}'/></linearGradient>` : ""}
${o.frost ? `<linearGradient id='fr' x1='0' y1='0' x2='.2' y2='1'><stop offset='0' stop-color='#f4f8fc' stop-opacity='${o.frost}'/><stop offset='.75' stop-color='#f4f8fc' stop-opacity='0'/></linearGradient>` : ""}
<filter id='st' color-interpolation-filters='sRGB' x='0' y='0' width='100%' height='100%'>
<feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='${seed}' result='n'/>
<feColorMatrix in='n' type='matrix' values='0 0 0 0 .1  0 0 0 0 .08  0 0 0 0 .06  ${G} 0 0 0 ${-G * 0.45}' result='gd'/>
<feTurbulence type='fractalNoise' baseFrequency='0.06' numOctaves='3' seed='${seed + 7}' result='b'/>
<feColorMatrix in='b' type='matrix' values='0 0 0 0 ${bc[0]}  0 0 0 0 ${bc[1]}  0 0 0 0 ${bc[2]}  ${B * 3} 0 0 0 ${-B * 1.55}' result='bo'/>
<feColorMatrix in='b' type='matrix' values='0 0 0 0 ${o.rust[0]}  0 0 0 0 ${o.rust[1]}  0 0 0 0 ${o.rust[2]}  0 ${B * 3} 0 0 ${-B * 1.75}' result='br'/>
<feMerge result='m'><feMergeNode in='SourceGraphic'/><feMergeNode in='bo'/><feMergeNode in='br'/><feMergeNode in='gd'/></feMerge>
<feTurbulence type='fractalNoise' baseFrequency='0.075' numOctaves='3' seed='${seed + 11}' result='rn'/>
<feDiffuseLighting in='rn' surfaceScale='1.4' diffuseConstant='1.2' lighting-color='#fff' result='lit'><feDistantLight azimuth='225' elevation='55'/></feDiffuseLighting>
<feBlend in='m' in2='lit' mode='multiply' result='m2'/>
${o.wet ? `<feSpecularLighting in='rn' surfaceScale='1.6' specularConstant='.55' specularExponent='30' lighting-color='#eef6f8' result='sp'><feDistantLight azimuth='235' elevation='40'/></feSpecularLighting><feComposite in='sp' in2='SourceGraphic' operator='in' result='spi'/><feComposite in='spi' in2='m2' operator='arithmetic' k2='.38' k3='1' result='m3'/>` : `<feOffset in='m2' result='m3'/>`}
<feComposite in='m3' in2='SourceGraphic' operator='in'/>
</filter>
<filter id='mo' color-interpolation-filters='sRGB' x='0' y='0' width='100%' height='100%'>
<feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' seed='3' result='n'/>
<feColorMatrix in='n' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .9 0 0 0 -.38' result='d'/>
<feColorMatrix in='n' type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 -1.2 0 0 .62' result='l'/>
<feMerge><feMergeNode in='SourceGraphic'/><feMergeNode in='d'/><feMergeNode in='l'/></feMerge>
</filter>
${
  o.caps || o.ledge
    ? `<filter id='cap' color-interpolation-filters='sRGB' x='0' y='0' width='100%' height='100%'>
<feTurbulence type='fractalNoise' baseFrequency='.32' numOctaves='2' seed='${seed + 3}' result='t'/>
<feDisplacementMap in='SourceGraphic' in2='t' scale='${o.caps?.disp ?? 2.4}' xChannelSelector='R' yChannelSelector='G' result='d'/>
<feOffset in='d' dx='.4' dy='1.1' result='o'/><feFlood flood-color='#57718f' flood-opacity='.6'/><feComposite in2='o' operator='in' result='sh'/>
<feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='1' seed='${seed + 5}' result='g'/>
<feColorMatrix in='g' type='matrix' values='0 0 0 0 .74  0 0 0 0 .8  0 0 0 0 .9  1.2 0 0 0 -.58' result='gs'/><feComposite in='gs' in2='d' operator='in' result='gm'/>
<feMerge><feMergeNode in='sh'/><feMergeNode in='d'/><feMergeNode in='gm'/></feMerge>
</filter>`
    : ""
}
<filter id='bl' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='1.3'/></filter>
<clipPath id='blk'><polygon points='${pts(faceP)}'/></clipPath>
<clipPath id='sdc'><polygon points='${pts(sideP)}'/></clipPath>
<linearGradient id='bv' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${o.hi ?? "#fff"}' stop-opacity='.55'/><stop offset='.5' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='${o.lo}' stop-opacity='.45'/></linearGradient>
<linearGradient id='sd' gradientUnits='userSpaceOnUse' x1='0' y1='${ins + fh}' x2='0' y2='${ins + fh + th}'><stop offset='0' stop-color='${o.lo}' stop-opacity='.38'/><stop offset='1' stop-color='${o.lo}' stop-opacity='.62'/></linearGradient>
<radialGradient id='vg' cx='.45' cy='.4' r='.75'><stop offset='.6' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='${o.lo}' stop-opacity='.22'/></radialGradient>
</defs>`;
  const inner = `<rect width='${W}' height='${S}' fill='${o.mortar}' filter='url(#mo)'/><g>${under}</g><g filter='url(#st)'>${faces}</g><g>${over}</g>`;
  const shadow = `<polygon points='${pts(chamfer(ins + 0.4, ins + 1.6, fw, fh + th, c))}' fill='${o.lo}' opacity='.32' filter='url(#bl)'/>`;
  // 두께: 같은 돌무늬를 아래로 이어 그리고 그늘을 덮음(띠처럼 보이지 않게)
  const side = `<g clip-path='url(#sdc)'><g transform='translate(0 ${th})'>${inner}</g><polygon points='${pts(sideP)}' fill='url(#sd)'/></g>`;
  const face = `<g clip-path='url(#blk)'>${inner}${caps ? `<g filter='url(#cap)'>${caps}</g>` : ""}${o.overlay ? `<rect width='${W}' height='${S}' fill='url(#ov)'/>` : ""}</g>`;
  const bevel = `<polygon points='${inF}' fill='url(#vg)'/><polygon points='${inF}' fill='none' stroke='url(#bv)' stroke-width='1.2' stroke-linejoin='round'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${S}' width='${W * 2}' height='${S * 2}'>${defs}${shadow}${side}${face}${bevel}${ledge}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const cache = new Map<Skin, string[]>();

/**
 * 스킨의 블록 무늬를 :root 의 --wall-0 ~ --wall-5 에, 로고 위 줄 간판(가로 4칸짜리 막돌 블록 한 장, 글자를 새김)을 --wall-sign 에 넣는다.
 * 스킨마다 한 번만 만들고 재사용
 */
export function applyStoneWall(skin: Skin): void {
  let urls = cache.get(skin);
  if (!urls) {
    urls = [
      ...Array.from({ length: WALL_VARIANTS }, (_, k) =>
        blockSvg(LOOKS[skin], SEED + k * 101),
      ),
      blockSvg(LOOKS[skin], 777, 160),
    ];
    cache.set(skin, urls);
  }
  const root = document.documentElement.style;
  urls.forEach((u, k) =>
    root.setProperty(k < WALL_VARIANTS ? `--wall-${k}` : "--wall-sign", u),
  );
}

/** 칸 좌표로 블록 무늬 번호(이웃끼리 다르게) */
export const wallVariant = (x: number, y: number): number =>
  (x * 5 + y * 3) % WALL_VARIANTS;
