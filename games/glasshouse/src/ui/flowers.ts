import type { FlowerId } from '../flora';

/**
 * 식물 도감 삽화풍 꽃 그림(코드로 그린 SVG, 사진·외부 그림 없음). 가는 먹선 + 물감을 겹친 듯한 옅은 칠.
 * 꽃잎마다 .pt 묶음에 열린 각도(--r)와 오므린 각도·크기(--c·--s)를 두어, 그림 하나로 봉오리(.closed)부터
 * 활짝 핀 모습까지 꽃잎이 실제로 벌어지는 움직임을 낸다(styles.css .fl). 그림은 100×120 판에 그린다.
 * 두 가지로 그린다: 도감(dex)은 잎·꽃잎 결까지 사실적으로, 게임(game)은 칸이 작아 잎·결을 빼고 꽃 머리만 가운데로 잘라(FOCUS) 약식으로
 */
export type FlowerDetail = 'dex' | 'game';
/** 지금 그리는 단계(DRAW 를 부르기 전에 정함) */
let detail: FlowerDetail = 'dex';

const INK = '#4a3a2a';
const LEAF = '#5f7f45';
const LEAF_L = '#a7c27a';
const STEM = '#58743e';
const n = (v: number) => Math.round(v * 10) / 10;
/** 각도를 -180~180 으로(봉오리 ↔ 핀 모습 사이를 가까운 쪽으로 돌아 양쪽으로 고르게 펼쳐지게) */
const norm = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

type Shape = 'oval' | 'point' | 'round' | 'notch' | 'cup' | 'strap' | 'heart';

function petalD(shape: Shape, L: number, W: number): string {
  const w = W / 2;
  const p = (pts: number[][]) => pts.map(([a, b]) => `${n(a)} ${n(b)}`).join(' ');
  switch (shape) {
    case 'point':
    case 'strap':
      return `M0 0C${p([[w * 1.3, -L * 0.3], [w * 0.7, -L * 0.8]])} 0 ${n(-L)}C${p([[-w * 0.7, -L * 0.8], [-w * 1.3, -L * 0.3]])} 0 0Z`;
    case 'round':
      return `M0 0C${p([[w * 1.5, -L * 0.2], [w * 1.4, -L * 1.02]])} 0 ${n(-L)}C${p([[-w * 1.4, -L * 1.02], [-w * 1.5, -L * 0.2]])} 0 0Z`;
    case 'heart':
      return `M0 0C${p([[w * 1.6, -L * 0.25], [w * 1.5, -L * 1.05]])} ${n(w * 0.25)} ${n(-L * 0.92)}L0 ${n(-L * 0.84)}L${n(-w * 0.25)} ${n(-L * 0.92)}C${p([[-w * 1.5, -L * 1.05], [-w * 1.6, -L * 0.25]])} 0 0Z`;
    case 'notch':
      return `M0 0C${p([[w * 1.3, -L * 0.2], [w * 1.25, -L * 0.95]])} ${n(w * 0.5)} ${n(-L)}L${n(w * 0.15)} ${n(-L * 0.9)}L0 ${n(-L * 0.98)}L${n(-w * 0.15)} ${n(-L * 0.9)}L${n(-w * 0.5)} ${n(-L)}C${p([[-w * 1.25, -L * 0.95], [-w * 1.3, -L * 0.2]])} 0 0Z`;
    case 'cup':
      return `M0 0C${p([[w * 1.3, -L * 0.1], [w * 1.35, -L * 0.75]])} ${n(w * 0.3)} ${n(-L)}Q0 ${n(-L * 1.05)} ${n(-w * 0.3)} ${n(-L)}C${p([[-w * 1.35, -L * 0.75], [-w * 1.3, -L * 0.1]])} 0 0Z`;
    default:
      return `M0 0C${p([[w * 1.35, -L * 0.15], [w * 1.35, -L * 0.85]])} 0 ${n(-L)}C${p([[-w * 1.35, -L * 0.85], [-w * 1.35, -L * 0.15]])} 0 0Z`;
  }
}

interface PetalOpts {
  shape?: Shape;
  /** 칠 색, 물 번진 듯 밝은 칠 */
  c: string;
  l: string;
  /** 봉오리일 때의 각도·크기, 피어나는 차례(ms) */
  closed?: number;
  cs?: number;
  delay?: number;
  /** 가운데 잎맥(꽃잎 결) */
  vein?: boolean;
  /** 납작하게(앞에서 비스듬히 본 꽃) */
  sy?: number;
}

class Plate {
  parts: string[] = [];
  /** 잔꽃이 모인 꽃: 봉오리일 때 꽃잎 위에 연두빛을 덮었다가 피면서 걷혀 꽃 색이 차오른다(styles.css .fl .bd) */
  tint = false;

  /** 꽃자루: 줄기(또는 꽃대)에서 잔꽃 하나까지 잇는 가는 선 */
  pedicel(x1: number, y1: number, x2: number, y2: number, w = 0.6): this {
    this.parts.push(`<path d="M${n(x1)} ${n(y1)}Q${n((x1 + x2) / 2)} ${n(Math.min(y1, y2) - 1)} ${n(x2)} ${n(y2)}" fill="none" stroke="${STEM}" stroke-width="${w}" stroke-linecap="round"/>`);
    return this;
  }

  stem(d: string, width = 1.4): this {
    // 도감: 왼쪽에 빛 받은 밝은 줄을 더해 줄기가 둥글게 보이게
    const shine = detail === 'dex' ? `<path d="${d}" fill="none" stroke="${LEAF_L}" stroke-width="${n(width * 0.35)}" stroke-opacity=".7" stroke-linecap="round" transform="translate(${n(-width * 0.25)} 0)"/>` : '';
    this.parts.push(`<path d="${d}" fill="none" stroke="${STEM}" stroke-width="${width}" stroke-linecap="round"/>${shine}<path d="${d}" fill="none" stroke="${INK}" stroke-width=".35" stroke-opacity=".5" transform="translate(.5 0)"/>`);
    return this;
  }

  /** 잎: (x,y)에서 ang 쪽으로 자라는 잎. curl 은 잎이 휘는 정도 */
  leaf(x: number, y: number, ang: number, L: number, W: number, curl = 0.25, c = LEAF, l = LEAF_L): this {
    if (detail === 'game') return this;
    const w = W / 2;
    const k = curl * L;
    const d = `M0 0C${n(w * 1.4 + k)} ${n(-L * 0.3)} ${n(w + k)} ${n(-L * 0.85)} ${n(k * 1.2)} ${n(-L)}C${n(-w * 0.6 + k)} ${n(-L * 0.8)} ${n(-w * 1.3)} ${n(-L * 0.35)} 0 0Z`;
    this.parts.push(
      `<g transform="translate(${n(x)} ${n(y)}) rotate(${ang})"><path d="${d}" fill="${c}" fill-opacity=".82" stroke="${INK}" stroke-width=".45" stroke-opacity=".7"/>` +
        `<path d="${d}" fill="${l}" fill-opacity=".45" transform="translate(${n(-w * 0.25)} ${n(-L * 0.12)}) scale(.6 .75)"/>` +
        // 가운데 잎맥 한쪽은 그늘(잎이 살짝 접혀 빛을 한쪽만 받음)
        `<path d="M0 0C${n(w * 1.4 + k)} ${n(-L * 0.3)} ${n(w + k)} ${n(-L * 0.85)} ${n(k * 1.2)} ${n(-L)}Q${n(k * 0.5)} ${n(-L * 0.55)} 0 0Z" fill="${INK}" fill-opacity=".16"/>` +
        `<path d="M0 0Q${n(k * 0.5)} ${n(-L * 0.55)} ${n(k * 1.15)} ${n(-L * 0.96)}" fill="none" stroke="${INK}" stroke-width=".35" stroke-opacity=".55"/>` +
        // 곁맥: 가운데 잎맥에서 비스듬히 갈라지는 가는 선 셋씩
        [0.3, 0.5, 0.7].map((t) => `<path d="M${n(k * t * 0.9)} ${n(-L * t)}l${n(w * 0.7)} ${n(-L * 0.12)}M${n(k * t * 0.9)} ${n(-L * t)}l${n(-w * 0.7)} ${n(-L * 0.12)}" stroke="${INK}" stroke-width=".22" stroke-opacity=".35"/>`).join('') +
        '</g>',
    );
    return this;
  }

  /** 움직이는 꽃잎 하나. (x,y)가 꽃잎이 붙은 자리, ang 이 활짝 핀 각도 */
  petal(x: number, y: number, ang: number, L: number, W: number, o: PetalOpts): this {
    const d = petalD(o.shape ?? 'oval', L, W);
    ang = norm(ang);
    // 봉오리: 꽃잎이 길이는 거의 그대로 좁게 오므라져 위(가운데)로 모인다(styles.css .fl.closed .pt)
    const closed = norm(o.closed ?? ang * 0.12);
    // 꽃잎 결: 도감은 가운데 결 + 양옆 결, 게임은 없음
    const side = `<path d="M0 ${n(-L * 0.1)}Q${n(W * 0.2)} ${n(-L * 0.4)} ${n(W * 0.28)} ${n(-L * 0.66)}M0 ${n(-L * 0.1)}Q${n(-W * 0.2)} ${n(-L * 0.4)} ${n(-W * 0.28)} ${n(-L * 0.66)}" fill="none" stroke="${INK}" stroke-width=".22" stroke-opacity=".25"/>`;
    // 도감은 결을 더 촘촘히(바깥쪽 가는 결 둘 더)
    const fine = `<path d="M0 ${n(-L * 0.15)}Q${n(W * 0.36)} ${n(-L * 0.42)} ${n(W * 0.42)} ${n(-L * 0.58)}M0 ${n(-L * 0.15)}Q${n(-W * 0.36)} ${n(-L * 0.42)} ${n(-W * 0.42)} ${n(-L * 0.58)}" fill="none" stroke="${INK}" stroke-width=".16" stroke-opacity=".2"/>`;
    const vein = o.vein === false || detail === 'game' ? '' : `<path d="M0 ${n(-L * 0.08)}V${n(-L * 0.72)}" stroke="${INK}" stroke-width=".3" stroke-opacity=".35"/>${L > 8 ? side : ''}${L > 14 ? fine : ''}`;
    // 도감: 꽃잎 밑동은 그늘져 짙고, 가장자리는 빛이 비쳐 밝은 테
    const shade = detail === 'dex' ? `<path d="${d}" fill="${INK}" fill-opacity=".17" transform="scale(.62 .4)"/><path d="${d}" fill="none" stroke="#fff" stroke-width=".5" stroke-opacity=".35" transform="scale(.9)"/>` : '';
    const sy = o.sy ? ` scale(1 ${o.sy})` : '';
    this.parts.push(
      `<g transform="translate(${n(x)} ${n(y)})${sy}"><g class="pt" style="--r:${n(ang)}deg;--c:${n(closed)}deg;--s:${o.cs ?? 0.45};--d:${o.delay ?? 0}ms">` +
        `<path d="${d}" fill="${o.c}" fill-opacity=".9" stroke="${INK}" stroke-width=".42" stroke-opacity=".75"/>` +
        `<path d="${d}" fill="${o.l}" fill-opacity=".55" transform="translate(0 ${n(-L * 0.28)}) scale(.55)"/>${shade}${vein}${this.tint ? `<path class="bd" d="${d}" fill="#a3c27a" stroke="#6c8c45" stroke-width=".35"/>` : ''}</g></g>`,
    );
    return this;
  }

  /** 꽃잎 count 장을 고르게 돌려 단다(앞에서 본 꽃) */
  ring(x: number, y: number, count: number, L: number, W: number, o: PetalOpts & { start?: number; jitter?: number }, step = 40): this {
    for (let i = 0; i < count; i++) {
      const a = (o.start ?? 0) + (360 / count) * i + (o.jitter ? Math.sin(i * 7.3) * o.jitter : 0);
      this.petal(x, y, a, L * (1 - (o.jitter ? Math.abs(Math.cos(i * 3.1)) * 0.08 : 0)), W, { ...o, closed: o.closed ?? norm(a) * 0.15, delay: (o.delay ?? 0) + i * step });
    }
    return this;
  }

  /**
   * 꽃받침·총포(초록): 봉오리일 때는 위로 서서 오므린 꽃잎을 감싸고, 피면 아래로 젖혀져 꽃잎 뒤로 조금 보인다. 꽃잎보다 먼저 그린다
   */
  calyx(x: number, y: number, count: number, L: number, W: number, sy = 1): this {
    for (let i = 0; i < count; i++) {
      const k = count > 1 ? i / (count - 1) - 0.5 : 0;
      this.petal(x, y, 180 + k * 150, L, W, { shape: 'point', c: '#6c8c45', l: '#a9c27a', closed: k * 46, cs: 0.95, sy, vein: false, delay: 0 });
    }
    return this;
  }

  disc(x: number, y: number, r: number, c: string, l: string, dots = 0, sy = 1): this {
    let s = `<g transform="translate(${n(x)} ${n(y)}) scale(1 ${sy})"><g class="dc">`;
    s += `<circle r="${r}" fill="${c}" stroke="${INK}" stroke-width=".4" stroke-opacity=".7"/><circle r="${n(r * 0.55)}" cx="${n(-r * 0.2)}" cy="${n(-r * 0.25)}" fill="${l}" fill-opacity=".5"/>`;
    for (let i = 0; i < dots; i++) {
      const a = i * 2.39996;
      const rr = r * 0.88 * Math.sqrt((i + 0.5) / dots);
      s += `<circle cx="${n(Math.cos(a) * rr)}" cy="${n(Math.sin(a) * rr)}" r=".5" fill="${INK}" fill-opacity=".55"/>`;
    }
    // 가운데(꽃술)는 .dc 묶음: 봉오리일 때 오므린 꽃잎 속에 작게 숨었다가 꽃잎과 함께 펼쳐진다
    this.parts.push(`${s}</g></g>`);
    return this;
  }

  raw(svg: string): this {
    this.parts.push(svg);
    return this;
  }

  /** 잎처럼 꽃이 아닌 부분(게임 약식에서는 뺌) */
  foliage(svg: string): this {
    if (detail === 'dex') this.parts.push(svg);
    return this;
  }

  toString(): string {
    return this.parts.join('');
  }
}

/**
 * 꽃 머리 하나를 한 묶음으로(봉오리 때 살짝 작게). neck 은 꽃 머리 밑으로 이어 그리는 줄기 길이:
 * 줄기 끝이 꽃 머리 가운데보다 아래에서 끝나는 꽃은 핀 꽃잎이 가려 주지만 봉오리일 때 떠 보이므로 머리 밑동까지 잇는다
 */
const head = (x: number, y: number, inner: Plate, delay = 0, neck = 0) =>
  `${neck ? new Plate().stem(`M${x} ${y + neck}V${y}`, 1.6) : ''}<g transform="translate(${x} ${y})"><g class="hd" style="--d:${delay}ms">${inner}</g></g>`;

const DRAW: Record<FlowerId, () => Plate> = {
  tulip: () => {
    const p = new Plate().stem('M50 116C50 96 49 74 50 50').leaf(50, 112, -28, 52, 16, 0.2).leaf(50, 108, 24, 46, 14, -0.15);
    const h = new Plate()
      .petal(0, 0, 0, 30, 20, { shape: 'cup', c: '#c9473f', l: '#f2a08a', closed: 0, cs: 0.7 })
      .petal(-2, 1, -22, 30, 18, { shape: 'cup', c: '#b83b36', l: '#ee927e', closed: -4, cs: 0.7, delay: 120 })
      .petal(2, 1, 22, 30, 18, { shape: 'cup', c: '#b83b36', l: '#ee927e', closed: 4, cs: 0.7, delay: 240 });
    return p.raw(head(50, 52, h));
  },
  daffodil: () => {
    const p = new Plate().stem('M50 116C51 90 52 70 56 54').leaf(48, 114, -14, 64, 7, 0.1).leaf(50, 114, 12, 58, 7, -0.1);
    const h = new Plate().ring(0, 0, 6, 20, 12, { shape: 'point', c: '#f1d36b', l: '#fff3b8', start: 0, sy: 0.75 } as PetalOpts, 70);
    h.raw(`<g class="pt" style="--r:0deg;--c:0deg;--s:.5;--d:300ms"><path d="M-4.5 0C-5 -6 -6.5 -10 -7.5 -14H7.5C6.5 -10 5 -6 4.5 0Z" fill="#efb43e" fill-opacity=".92" stroke="${INK}" stroke-width=".45"/><path d="M-1.5 -2V-12M2 -2V-12" stroke="#c98a26" stroke-width=".4" stroke-opacity=".7"/><path d="M-8.5 -14Q-6 -17 -3 -15.5Q0 -18 3 -15.5Q6 -17 8.5 -14Q4 -12 0 -12.5Q-4 -12 -8.5 -14Z" fill="#f8cf62" stroke="${INK}" stroke-width=".4"/><ellipse cy="-14.3" rx="4.5" ry="1.2" fill="#c47a1e" fill-opacity=".8"/></g>`);
    return p.raw(`<g transform="rotate(-25 57 52)">${head(57, 52, h)}</g>`);
  },
  hyacinth: () => {
    const p = new Plate().stem('M50 116V44', 2).leaf(49, 116, -20, 50, 10, 0.25).leaf(51, 116, 18, 46, 10, -0.2).leaf(50, 116, 2, 40, 9, 0.05);
    const h = new Plate();
    h.tint = true;
    p.stem('M50 46V40', 1.6);
    for (let i = 0; i < 13; i++) {
      const y = 70 - i * 2.4;
      const x = 50 + (i % 2 ? 6 : -6) * (1 - i / 18);
      p.pedicel(50, y + 1.5, x, y);
      h.ring(x, y, 4, 6.4, 5, { shape: 'oval', c: '#7a6bbf', l: '#c9c0f0', start: 45, vein: false, delay: 500 - i * 30 } as PetalOpts, 20);
    }
    return p.raw(h.toString());
  },
  lily: () => {
    const p = new Plate().leaf(46, 116, -18, 70, 22, 0.15).leaf(54, 116, 16, 64, 20, -0.15).stem('M50 116C50 80 56 50 82 46', 1);
    const h = new Plate();
    h.tint = true;
    // 꽃대 곡선(위 stem 과 같은 베지어) 위의 점에서 꽃자루가 아래로 처져 방울 꽃 꼭대기에 닿는다
    const arc = (t: number) => {
      const u = 1 - t;
      const bz = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
      return [bz(50, 50, 56, 82), bz(116, 80, 50, 46)];
    };
    [0.6, 0.7, 0.79, 0.88, 0.97].forEach((t, i) => {
      const [ax, ay] = arc(t);
      const bx = ax + 1.2;
      const by = ay + 8;
      h.raw(`<path d="M${n(ax)} ${n(ay)}Q${n(ax + 2.4)} ${n(ay + 3)} ${n(bx)} ${n(by)}" fill="none" stroke="${STEM}" stroke-width=".7" stroke-linecap="round"/>`);
      h.petal(bx, by, 180, 9, 10, { shape: 'cup', c: '#f4f1e6', l: '#ffffff', closed: 180, cs: 0.55, delay: i * 120 });
    });
    return p.raw(h.toString());
  },
  pansy: () => {
    const p = new Plate().stem('M50 116C48 100 46 84 50 66').leaf(49, 108, -40, 22, 14, 0.2).leaf(49, 98, 38, 20, 13, -0.2);
    const h = new Plate()
      .calyx(0, 0, 5, 12, 6)
      .petal(0, 0, -25, 22, 20, { shape: 'round', c: '#5a3f8f', l: '#9d86cf', delay: 0 })
      .petal(0, 0, 25, 22, 20, { shape: 'round', c: '#5a3f8f', l: '#9d86cf', delay: 80 })
      .petal(0, 0, -95, 19, 17, { shape: 'round', c: '#e8c546', l: '#fbeaa0', delay: 160 })
      .petal(0, 0, 95, 19, 17, { shape: 'round', c: '#e8c546', l: '#fbeaa0', delay: 240 })
      .petal(0, 0, 180, 21, 22, { shape: 'round', c: '#efcf52', l: '#fff0a6', delay: 320 })
      .raw(`<path d="M0 2L-3 9M0 2L0 11M0 2L3 9" stroke="#3b2a55" stroke-width=".6" stroke-opacity=".7"/><circle r="1.6" fill="#f5e27a" stroke="${INK}" stroke-width=".3"/>`);
    return p.raw(head(50, 56, h, 0, 10));
  },
  peony: () => {
    const p = new Plate().stem('M50 116C50 96 50 80 50 64', 1.8).leaf(50, 104, -50, 30, 14, 0.25).leaf(50, 98, 48, 28, 13, -0.25).leaf(50, 112, -20, 24, 10, 0.2);
    const h = new Plate().calyx(0, 0, 5, 18, 12, 0.82);
    const rings: [number, number, number, string, string][] = [
      [9, 24, 20, '#e48ba2', '#f8c9d4'],
      [7, 18, 18, '#de7d97', '#f7c1cf'],
      [6, 12, 15, '#d36e8b', '#f2b3c4'],
    ];
    rings.forEach(([cnt, L, W, c, l], k) => h.ring(0, 0, cnt, L, W, { shape: 'round', c, l, start: k * 20, sy: 0.82, delay: 200 * (2 - k), cs: 0.4 } as PetalOpts, 50));
    h.disc(0, -1, 4, '#f3d15a', '#fff2a6', 0, 0.8);
    return p.raw(head(50, 50, h, 0, 14));
  },
  forgetmenot: () => {
    const p = new Plate().stem('M50 116C50 96 44 80 36 64', 1).stem('M50 106C54 92 62 80 66 66', 1).stem('M50 98C50 86 51 74 52 56', 1).leaf(50, 112, -55, 22, 8, 0.2).leaf(50, 104, 50, 20, 8, -0.2);
    const h = new Plate();
    const spots = [[36, 60], [30, 66], [40, 54], [66, 62], [72, 56], [62, 56], [52, 52], [47, 46], [57, 46], [44, 62]];
    h.tint = true;
    // 꽃자루: 가장 가까운 가지 끝에서 잔꽃마다
    const tips = [[36, 64], [66, 66], [52, 56]];
    for (const [x, y] of spots) {
      const [tx, ty] = tips.reduce((a, b) => (Math.hypot(b[0] - x, b[1] - y) < Math.hypot(a[0] - x, a[1] - y) ? b : a));
      if (Math.hypot(tx - x, ty - y) > 1) p.pedicel(tx, ty, x, y);
    }
    spots.forEach(([x, y], i) => h.ring(x, y, 5, 4.6, 4.6, { shape: 'round', c: '#5c8fd0', l: '#bcd6f4', start: i * 13, vein: false, delay: i * 70 } as PetalOpts, 15).disc(x, y, 1.1, '#f2d35b', '#fff'));
    return p.raw(h.toString());
  },
  hydrangea: () => {
    const p = new Plate().stem('M50 116C50 100 50 86 50 72', 2).leaf(50, 108, -62, 34, 22, 0.2).leaf(50, 104, 60, 32, 21, -0.2);
    const h = new Plate();
    h.tint = true;
    for (let i = 0; i < 17; i++) {
      const a0 = i * 2.39996;
      const r0 = 17 * Math.sqrt((i + 0.5) / 17);
      p.pedicel(50, 73, 50 + Math.cos(a0) * r0 * 1.2, 54 + Math.sin(a0) * r0 * 0.9, 0.7);
    }
    for (let i = 0; i < 17; i++) {
      const a = i * 2.39996;
      const r = 17 * Math.sqrt((i + 0.5) / 17);
      const x = 50 + Math.cos(a) * r * 1.2;
      const y = 54 + Math.sin(a) * r * 0.9;
      h.ring(x, y, 4, 6.5, 6.5, { shape: 'round', c: i % 3 ? '#7f8fd6' : '#9a7fc8', l: '#d6dcf6', start: i * 17, vein: false, delay: i * 40 } as PetalOpts, 10);
    }
    return p.raw(h.toString());
  },
  lavender: () => {
    const p = new Plate().stem('M50 116C49 90 46 66 40 40', 0.9).stem('M50 116C51 90 52 64 54 34', 0.9).stem('M50 116C52 92 58 70 66 46', 0.9).leaf(50, 116, -30, 26, 4, 0.15).leaf(50, 116, 28, 24, 4, -0.15).leaf(50, 116, -5, 22, 4, 0.05);
    const h = new Plate();
    const spikes: [number, number, number][] = [[40, 40, -14], [54, 34, 2], [66, 46, 18]];
    h.tint = true;
    spikes.forEach(([x, y, a], s) => {
      // 꽃대 축: 잔꽃이 붙는 선을 그려 줄기와 잇는다
      p.stem(`M${x} ${y}L${n(x + Math.sin((a * Math.PI) / 180) * 21)} ${n(y + 21 * Math.cos((a * Math.PI) / 180))}`, 0.8);
      for (let i = 0; i < 7; i++) {
        const t = i * 3.4;
        const px = x - Math.sin((a * Math.PI) / 180) * -t;
        const py = y + t * Math.cos((a * Math.PI) / 180);
        h.petal(px - 1.6, py, -60 + a, 4.2, 3.4, { shape: 'oval', c: '#8366b5', l: '#c8b4ea', vein: false, delay: s * 150 + (6 - i) * 60 });
        h.petal(px + 1.6, py, 60 + a, 4.2, 3.4, { shape: 'oval', c: '#7559a8', l: '#bfa8e4', vein: false, delay: s * 150 + (6 - i) * 60 + 30 });
      }
    });
    return p.raw(h.toString());
  },
  iris: () => {
    const p = new Plate().stem('M50 116V58', 1.5).leaf(48, 116, -10, 66, 6, 0.08).leaf(52, 116, 9, 60, 6, -0.08).leaf(50, 116, -24, 46, 5, 0.2);
    const h = new Plate()
      .petal(0, 0, -70, 26, 20, { shape: 'round', c: '#6a4fa3', l: '#b9a3e2', closed: -8, cs: 0.4 })
      .petal(0, 0, 70, 26, 20, { shape: 'round', c: '#6a4fa3', l: '#b9a3e2', closed: 8, cs: 0.4, delay: 120 })
      .petal(0, 0, 180, 22, 19, { shape: 'round', c: '#5d4596', l: '#ae97da', closed: 170, cs: 0.4, delay: 240 })
      .petal(0, -2, -12, 14, 8, { shape: 'point', c: '#7d64b6', l: '#cbb9ee', delay: 360 })
      .petal(0, -2, 12, 14, 8, { shape: 'point', c: '#7d64b6', l: '#cbb9ee', delay: 400 })
      .raw(`<path d="M-3 4L-10 14M3 4L10 14" stroke="#f0c94a" stroke-width="1.2" stroke-linecap="round"/>`);
    return p.raw(head(50, 56, h));
  },
  balsam: () => {
    // 곧은 줄기 잎겨드랑이마다 분홍 꽃이 매달림(꽃잎 다섯, 아래로 휜 꿀주머니)
    const p = new Plate().stem('M50 116C50 96 50 74 50 44', 2);
    for (const [y, a] of [[104, -48], [96, 46], [86, -44], [76, 42], [64, -38], [52, 34]] as const) p.leaf(50, y, a, 24, 7, a < 0 ? 0.15 : -0.15);
    const bloom = (x: number, y: number, delay: number) => {
      const h = new Plate().ring(0, 0, 5, 9, 9, { shape: 'heart', c: '#d9466f', l: '#f6a3bb', start: 0, sy: 0.9, cs: 0.4, delay } as PetalOpts, 60);
      h.raw(`<path d="M2 3Q6 8 3 11" fill="none" stroke="#b8345a" stroke-width="1.1" stroke-linecap="round"/><circle r="1.6" fill="#f7e3ea" stroke="${INK}" stroke-width=".3"/>`);
      return head(x, y, h);
    };
    return p.raw(`<path d="M50 70L41 66M50 58L60 54M50 82L59 80" stroke="${STEM}" stroke-width=".8"/>` + bloom(40, 64, 0) + bloom(61, 52, 200) + bloom(60, 79, 400) + bloom(50, 42, 600));
  },
  sunflower: () => {
    const p = new Plate().stem('M50 116C50 96 52 80 52 68', 2.4).leaf(50, 106, -60, 30, 22, 0.3).leaf(51, 96, 58, 28, 20, -0.3);
    const h = new Plate().calyx(0, 0, 7, 17, 9).ring(0, 0, 20, 21, 7, { shape: 'point', c: '#e8b528', l: '#fbe08a', start: 0, cs: 0.35 } as PetalOpts, 25).disc(0, 0, 11, '#6b4220', '#9c6a3a', 45);
    return p.raw(head(52, 48, h, 0, 20));
  },
  cosmos: () => {
    const p = new Plate().stem('M50 116C47 96 46 78 52 58', 0.9).foliage(
      `<path d="M48 100L38 92M38 92L33 94M38 92L36 86M49 88L60 80M60 80L65 82M60 80L60 74M47 106L58 100" stroke="${LEAF}" stroke-width=".8" fill="none" stroke-linecap="round"/>`,
    );
    const h = new Plate().calyx(0, 0, 6, 13, 7).ring(0, 0, 8, 22, 15, { shape: 'notch', c: '#de7fa8', l: '#f7c6db', start: 10 } as PetalOpts, 50).disc(0, 0, 4.5, '#e9b730', '#fbe38a', 14);
    return p.raw(head(52, 52, h, 0, 6));
  },
  lycoris: () => {
    const p = new Plate().stem('M50 116V58', 1.4);
    const h = new Plate();
    h.tint = true;
    for (let i = 0; i < 6; i++) {
      const a = -150 + i * 60;
      h.petal(0, 0, a, 20, 4, { shape: 'strap', c: '#c23a32', l: '#ef7c6c', closed: a * 0.2, cs: 0.4, delay: i * 70 });
      const ex = Math.cos(((a - 90) * Math.PI) / 180);
      const ey = Math.sin(((a - 90) * Math.PI) / 180);
      h.raw(`<g class="pt" style="--r:0deg;--c:0deg;--s:.3;--d:${500 + i * 50}ms"><path d="M0 0Q${n(ex * 18)} ${n(ey * 18 - 10)} ${n(ex * 30)} ${n(ey * 30 - 6)}" fill="none" stroke="#b5302a" stroke-width=".5"/><circle cx="${n(ex * 30)}" cy="${n(ey * 30 - 6)}" r=".9" fill="#e8b52e"/></g>`);
    }
    return p.raw(head(50, 56, h));
  },
  gujeolcho: () => {
    const p = new Plate().stem('M50 116C50 96 48 80 50 62', 1).leaf(50, 106, -55, 16, 10, 0.3).leaf(50, 98, 52, 15, 10, -0.3);
    const h = new Plate().calyx(0, 0, 6, 12, 6).ring(0, 0, 14, 19, 7, { shape: 'round', c: '#f4e6ea', l: '#ffffff', start: 0 } as PetalOpts, 35).disc(0, 0, 5, '#e6b02d', '#fde28c', 16);
    return p.raw(head(50, 56, h, 0, 6));
  },
  dahlia: () => {
    const p = new Plate().stem('M50 116C50 98 50 82 50 66', 1.8).leaf(50, 104, -58, 26, 15, 0.25).leaf(50, 96, 56, 24, 14, -0.25);
    const h = new Plate()
      .calyx(0, 0, 6, 15, 8, 0.9)
      .ring(0, 0, 12, 24, 10, { shape: 'point', c: '#a8304a', l: '#e4788c', start: 0, cs: 0.35, sy: 0.9 } as PetalOpts, 30)
      .ring(0, 0, 10, 17, 9, { shape: 'point', c: '#b93a54', l: '#ec8a9c', start: 18, cs: 0.35, sy: 0.9, delay: 250 } as PetalOpts, 30)
      .ring(0, 0, 8, 10, 7, { shape: 'point', c: '#c44a62', l: '#f3a1ae', start: 8, cs: 0.35, sy: 0.9, delay: 500 } as PetalOpts, 30)
      .disc(0, 0, 2.6, '#7c2134', '#c9576b', 0, 0.9);
    return p.raw(head(50, 52, h, 0, 14));
  },
  aster: () => {
    const p = new Plate().stem('M50 116C51 98 50 82 50 64', 1).leaf(50, 104, -50, 22, 9, 0.2).leaf(50, 94, 48, 20, 9, -0.2);
    const h = new Plate()
      .calyx(0, 0, 7, 13, 5)
      .ring(0, 0, 22, 20, 4, { shape: 'strap', c: '#7b4fa8', l: '#c3a1e4', start: 0, jitter: 4 } as PetalOpts, 18)
      .ring(0, 0, 16, 13, 3.6, { shape: 'strap', c: '#8d5fba', l: '#d2b4ee', start: 10, delay: 300 } as PetalOpts, 18)
      .disc(0, 0, 4.5, '#e8b631', '#fbe590', 14);
    return p.raw(head(50, 56, h, 0, 8));
  },
  mum: () => {
    const p = new Plate().stem('M50 116C50 98 50 84 50 70', 1.6).leaf(50, 108, -58, 22, 14, 0.25).leaf(50, 100, 56, 22, 14, -0.25);
    const h = new Plate().calyx(0, 0, 6, 14, 7, 0.75);
    for (let k = 0; k < 4; k++) h.ring(0, 0, 14 - k * 2, 22 - k * 4.5, 6, { shape: 'oval', c: ['#d98a2a', '#e09a32', '#e8ad3e', '#efc153'][k], l: '#fbe0a0', start: k * 11, sy: 0.75 - k * 0.08, cs: 0.4, delay: (3 - k) * 160 } as PetalOpts, 25);
    return p.raw(head(50, 58, h, 0, 12));
  },
  camellia: () => {
    const p = new Plate().stem('M50 116C48 100 48 86 50 72', 1.8).leaf(50, 104, -62, 26, 15, 0.2, '#3f6a3c', '#86ad6f').leaf(50, 98, 58, 26, 15, -0.2, '#3f6a3c', '#86ad6f').leaf(50, 86, -30, 22, 13, 0.2, '#3f6a3c', '#86ad6f');
    const h = new Plate()
      .calyx(0, 0, 5, 13, 10, 0.85)
      .ring(0, 0, 6, 22, 22, { shape: 'round', c: '#b22a38', l: '#e5707a', start: 0, sy: 0.85, cs: 0.4 } as PetalOpts, 70)
      .ring(0, 0, 5, 14, 15, { shape: 'round', c: '#c2333f', l: '#ee8a91', start: 30, sy: 0.85, cs: 0.4, delay: 300 } as PetalOpts, 60);
    h.raw(`<g class="pt" style="--r:0deg;--c:0deg;--s:.4;--d:600ms">${Array.from({ length: 9 }, (_, i) => `<path d="M0 3L${n(-5 + i * 1.25)} -6" stroke="#f2d27a" stroke-width=".7"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<circle cx="${n(-5 + i * 1.25)}" cy="${n(-6.5 + Math.abs(i - 4) * 0.35)}" r=".9" fill="#f0c94c" stroke="${INK}" stroke-width=".2"/>`).join('')}</g>`);
    return p.raw(head(50, 56, h, 0, 16));
  },
  cyclamen: () => {
    const p = new Plate().stem('M48 112C46 80 44 62 40 48', 0.9).stem('M52 112C56 84 62 66 64 56', 0.9);
    for (const [x, a] of [[38, -40], [50, -5], [62, 35]] as const) p.foliage(`<g transform="translate(${x} 112) rotate(${a})"><path d="M0 0C12 -4 14 -18 0 -16C-14 -18 -12 -4 0 0Z" fill="#4f7a43" fill-opacity=".85" stroke="${INK}" stroke-width=".45"/><path d="M0 -3C7 -6 8 -13 0 -12C-8 -13 -7 -6 0 -3Z" fill="#b9cf9a" fill-opacity=".55"/></g>`);
    const flower = (x: number, y: number, tilt: number, delay: number) => {
      const h = new Plate();
      [-30, -12, 6, 22].forEach((a, i) => h.petal(0, 0, a + tilt, 20, 7, { shape: 'oval', c: '#d2466e', l: '#f4a2b8', closed: 170, cs: 0.4, delay: delay + i * 80 }));
      h.raw(`<ellipse rx="2.6" ry="1.6" fill="#7a1f3a" stroke="${INK}" stroke-width=".3"/>`);
      return head(x, y, h);
    };
    return p.raw(flower(40, 48, -4, 0) + flower(64, 56, 8, 250));
  },
  poinsettia: () => {
    const p = new Plate().stem('M50 116C50 100 50 86 50 74', 1.8).leaf(50, 104, -66, 26, 16, 0.2).leaf(50, 98, 64, 26, 16, -0.2).leaf(50, 92, 150, 22, 13, 0.2).leaf(50, 92, -150, 22, 13, -0.2);
    const h = new Plate()
      .ring(0, 0, 7, 28, 13, { shape: 'point', c: '#b8222f', l: '#e2606a', start: 0, sy: 0.85, cs: 0.4 } as PetalOpts, 60)
      .ring(0, 0, 6, 17, 10, { shape: 'point', c: '#c62d39', l: '#ec7a83', start: 26, sy: 0.85, cs: 0.4, delay: 350 } as PetalOpts, 60);
    for (let i = 0; i < 5; i++) h.raw(`<circle cx="${n(Math.cos(i * 1.26) * 2.6)}" cy="${n(Math.sin(i * 1.26) * 2.2)}" r="1.1" fill="#e8c43a" stroke="#6a5a1a" stroke-width=".25"/>`);
    return p.raw(head(50, 58, h, 0, 16));
  },
  hellebore: () => {
    const p = new Plate().stem('M50 116C50 96 52 82 56 70', 1.2);
    for (const a of [-50, -25, 0, 25, 50]) p.leaf(44, 116, a - 10, 26, 8, 0.15, '#4b6b3e', '#93b07c');
    const h = new Plate()
      .ring(0, 0, 5, 20, 20, { shape: 'round', c: '#f1ede0', l: '#ffffff', start: 0, sy: 0.85 } as PetalOpts, 80)
      .disc(0, 0, 4, '#b6c977', '#e2ecb0', 0, 0.85);
    for (let i = 0; i < 12; i++) h.raw(`<g class="pt" style="--r:0deg;--c:0deg;--s:.3;--d:500ms"><path d="M0 0L${n(Math.cos(i * 0.52) * 7)} ${n(Math.sin(i * 0.52) * 6)}" stroke="#e7c64c" stroke-width=".55"/></g>`);
    return p.raw(head(56, 64, h, 0, 6));
  },
  snowdrop: () => {
    const p = new Plate().stem('M50 116C50 90 51 64 54 46Q58 38 64 42', 1).leaf(49, 116, -8, 58, 5, 0.1, '#6f8f6a', '#b8cdb0').leaf(51, 116, 10, 52, 5, -0.1, '#6f8f6a', '#b8cdb0');
    const h = new Plate()
      .raw(`<path d="M0 0V3" stroke="${STEM}" stroke-width="1"/><ellipse cy="2.5" rx="1.6" ry="1.4" fill="#7fa36a"/>`)
      .petal(0, 3, 158, 24, 12, { shape: 'oval', c: '#f7f6f0', l: '#ffffff', closed: 178, cs: 0.6 })
      .petal(0, 3, 202, 24, 12, { shape: 'oval', c: '#f7f6f0', l: '#ffffff', closed: 182, cs: 0.6, delay: 120 })
      .petal(0, 3, 180, 13, 10, { shape: 'cup', c: '#eef3e6', l: '#ffffff', closed: 180, cs: 0.6, delay: 200 })
      .raw(`<path d="M-2.4 15Q0 13 2.4 15" stroke="#5f9a4a" stroke-width="1" fill="none"/>`);
    return p.raw(head(64, 42, h));
  },
  adonis: () => {
    const p = new Plate().stem('M50 116C50 100 50 88 50 76', 1.4).foliage(
      `<path d="M50 104L38 96M38 96L34 97M38 96L37 91M50 98L62 90M62 90L66 92M62 90L62 85M50 110L40 106M50 110L60 105" stroke="${LEAF}" stroke-width=".9" fill="none" stroke-linecap="round"/>`,
    );
    const h = new Plate()
      .calyx(0, 0, 6, 14, 7, 0.6)
      .ring(0, 0, 9, 21, 10, { shape: 'oval', c: '#e2b81f', l: '#fff0a0', start: -80, sy: 0.6, cs: 0.4 } as PetalOpts, 50)
      .ring(0, -2, 7, 16, 9, { shape: 'oval', c: '#ebc42e', l: '#fff4b0', start: -60, sy: 0.65, cs: 0.4, delay: 300 } as PetalOpts, 50)
      .disc(0, -3, 4, '#c9921a', '#f3d36a', 10, 0.6);
    return p.raw(head(50, 72, h, 0, 4));
  },
};

/** 게임 약식 그림에서 가운데로 잘라 올 꽃 머리 자리: [가운데 x, 가운데 y, 반지름] (100×120 판 좌표) */
const FOCUS: Record<FlowerId, [number, number, number]> = {
  tulip: [50, 40, 20], daffodil: [56, 46, 21], hyacinth: [50, 55, 22], lily: [63, 60, 20], pansy: [50, 54, 23], peony: [50, 50, 24],
  forgetmenot: [51, 56, 24], hydrangea: [50, 54, 25], lavender: [53, 50, 25], iris: [50, 52, 27], balsam: [50, 60, 26], sunflower: [52, 48, 24],
  cosmos: [52, 52, 24], lycoris: [50, 48, 30], gujeolcho: [50, 56, 21], dahlia: [50, 52, 25], aster: [50, 56, 22], mum: [50, 58, 22],
  camellia: [50, 56, 24], cyclamen: [52, 46, 26], poinsettia: [50, 58, 29], hellebore: [56, 64, 22], snowdrop: [62, 54, 20], adonis: [50, 68, 22],
};

/** 게임 약식 그림 틀만 따로 옮길 꽃(x 방향): 은방울꽃은 도감에서는 잎까지 보이게 왼쪽, 게임 칸에서는 방울 꽃 줄 가운데 */
const GAME_SHIFT: Partial<Record<FlowerId, number>> = { lily: 6 };

const cache = new Map<string, string>();

/**
 * 꽃 그림 SVG. open 이 false 면 봉오리(styles.css .fl.closed).
 * kind: 'dex' 는 잎까지 그린 100×120 전체, 'game' 은 잎·결을 뺀 약식을 꽃 머리 가운데로 잘라 정사각형으로(화분 위·작은 칸)
 */
export function flowerSvg(id: FlowerId, open = true, kind: FlowerDetail = 'dex'): string {
  const key = `${kind}:${id}`;
  let body = cache.get(key);
  if (!body) {
    detail = kind;
    cache.set(key, (body = DRAW[id]().toString()));
    detail = 'dex';
  }
  // 게임 칸에서는 꽃 머리 둘레를 조금 더 바짝(반지름의 85%) 잘라 크게 보이게
  const [cx, cy, r0] = FOCUS[id];
  const r = kind === 'game' ? Math.round(r0 * 0.85) : r0;
  // spray: 꽃 머리 그룹(.hd) 없이 잔꽃만 있는 꽃(마무리 동작에서 잔꽃마다 기욺, styles.css .fl.spray)
  return `<svg class="fl ${kind}${body.includes('class="hd"') ? '' : ' spray'}${open ? '' : ' closed'}" viewBox="${kind === 'game' ? `${cx + (GAME_SHIFT[id] ?? 0) - r} ${cy - r} ${r * 2} ${r * 2}` : dexBox(cx, cy)}" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** 튤립 꽃 머리 높이(도감 판에서 꽃 머리가 오는 자리) */
const DEX_HEAD = FOCUS.tulip[1];

/**
 * 도감 판: 줄기 밑(판 아래 끝)은 그대로 두고, 꽃 머리가 튤립과 같은 높이·가운데에 오도록 판을 키워 자른다.
 * 꽃 머리가 낮은 꽃(복수초·크리스마스로즈)은 그만큼 크게 보인다
 */
function dexBox(cx: number, cy: number): string {
  const k = Math.min(1, (120 - cy) / (120 - DEX_HEAD));
  const w = 100 * k;
  return `${n(cx - w / 2)} ${n(120 - 120 * k)} ${n(w)} ${n(120 * k)}`;
}
