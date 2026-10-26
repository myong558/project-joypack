import type { FlowerId } from '../flora';
import { Tile, type Board, type Dir, type State } from '../game/rules';
import { flowerSvg } from './flowers';

/**
 * 온실 판 그리기. 바닥·벽·창과 창 앞 햇살 자리는 한 번 깔고, 화분·정원사는 움직일 때마다 옮긴다.
 * 칸 크기(--cell)는 판 자리에 맞춰 계산한다(layout). 움직임은 transform 만 쓴다
 */

/**
 * 화분 SVG(40×26): 칸 아래쪽에 앉는 낮고 넓은 테라코타 화분(그림자 · 몸통 왼쪽 빛·오른쪽 그늘 · 굵은 테두리 · 흙).
 * 칸 하나 안에 꽃과 함께 들어가도록 키를 줄이고 입구를 넓혀, 작게 그려도 화분으로 읽힌다
 */
export const POT = `<svg class="pot-body" viewBox="0 0 40 26" aria-hidden="true" focusable="false">
<ellipse cx="20" cy="23.4" rx="14" ry="2.4" fill="rgb(40 30 20 / .3)"/>
<path d="M6.5 8.5h27l-3 13q-.4 1.8-2.3 1.8H11.8q-1.9 0-2.3-1.8z" fill="#b8613a"/>
<path d="M6.5 8.5h7.5l1 14.8h-3.2q-1.9 0-2.3-1.8z" fill="#d98a5c" opacity=".55"/>
<path d="M33.5 8.5h-6.5l-1.3 14.8h2.6q1.9 0 2.3-1.8z" fill="#7c3a20" opacity=".45"/>
<rect x="3.5" y="3" width="33" height="6.6" rx="2.2" fill="#c96f45"/>
<rect x="3.5" y="3" width="33" height="2.6" rx="1.3" fill="#e7a07a" opacity=".7"/>
<ellipse cx="20" cy="4.3" rx="14" ry="1.6" fill="#4a3324"/>
<path d="M6.5 9.6h27l-3 11.9q-.4 1.8-2.3 1.8H11.8q-1.9 0-2.3-1.8zM3.5 3h33v6.6h-33z" fill="none" stroke="#5a2c18" stroke-width=".5" stroke-opacity=".6"/>
</svg>`;

/**
 * 정원사: 위에서 본 밀짚모자(얼굴 없음). 앞쪽(그림 아래)으로 팔이 나오고, 모자 띠 매듭이 뒤쪽(그림 위)을 가리킨다.
 * 부분마다 묶음을 나눠 CSS 로 움직인다(styles.css .gardener): .g-hat 모자(늘 아주 살짝 흔들림, 쉬는 동작 때 벗음),
 * .g-arm 팔(화분을 밀 때 앞으로 쭉), .g-head 모자 밑 머리, .g-mouth 하품하는 입, .g-hand 땀 닦는·입 가리는 손, .g-drop 땀방울, .g-all 몸 전체(두리번)
 * 짚 결: 챙에 방사선 결 + 엇갈린 점선 고리, 꼭대기에 점선 고리. 손으로 엮은 듯 챙 가장자리가 고르지 않고 꼭대기도 살짝 비뚤게(반듯한 원이 아니게)
 * 모자 리본은 스킨(강조색)과 상관없이 짙은 초록으로 고정: 로고·게임 화면 어디서나 같은 정원사로 보이게
 */
export const GARDENER = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
<ellipse cx="21" cy="23" rx="15" ry="14" fill="rgb(40 30 20 / .22)"/>
<g class="g-all">
<g class="g-arm l"><path d="M13.5 22.5L12.5 33" stroke="#3f5a45" stroke-width="3.4" stroke-linecap="round"/><circle cx="12.4" cy="34" r="2.3" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/></g>
<g class="g-arm r"><path d="M26.5 22.5L27.5 33" stroke="#3f5a45" stroke-width="3.4" stroke-linecap="round"/><circle cx="27.6" cy="34" r="2.3" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/></g>
<ellipse cx="20" cy="21" rx="9" ry="12" fill="#3f5a45"/>
<g class="g-head"><circle cx="20" cy="21" r="6.6" fill="#4a3324"/><path d="M15.5 19.5q4.5-4 9 0" fill="none" stroke="#6b4a30" stroke-width="1.2" stroke-linecap="round"/></g>
<ellipse class="g-mouth" cx="20" cy="26.8" rx="1.7" ry="1.3" fill="#5a2c18"/>
<g class="g-hat">
<path d="M34.7 20.0L34.9 22.6L33.9 25.1L32.7 27.3L31.3 29.5L29.4 31.2L27.2 32.5L24.9 33.3L22.4 33.5L20.0 33.5L17.5 34.0L15.0 33.7L12.7 32.6L10.6 31.2L8.6 29.5L7.1 27.4L5.9 25.1L5.4 22.6L5.9 20.0L6.6 17.6L6.9 15.2L7.8 12.9L9.2 11.0L10.8 9.1L12.8 7.5L15.0 6.3L17.4 5.1L20.0 4.7L22.5 5.6L24.9 6.7L27.1 7.6L29.1 9.2L30.7 11.0L32.1 13.0L33.0 15.3L33.8 17.6Z" fill="#cfa862"/>
<path d="M33.8 20.0L33.3 22.3L32.4 24.5L31.5 26.6L30.2 28.5L28.3 29.9L26.3 31.0L24.3 31.8L22.2 32.3L20.0 33.0L17.7 33.2L15.4 32.5L13.4 31.5L11.3 30.3L9.6 28.7L8.4 26.7L7.6 24.5L7.4 22.2L7.6 20.0L7.5 17.8L7.8 15.5L8.8 13.5L10.1 11.7L11.5 9.8L13.2 8.3L15.3 7.2L17.6 6.5L20.0 6.8L22.2 7.4L24.4 7.9L26.5 8.8L28.2 10.3L29.7 11.9L31.1 13.6L32.2 15.5L33.2 17.7Z" fill="#d6b06a"/>
<path d="M29.4 20.0L34.0 20.0M29.1 22.4L33.5 23.6M28.1 24.7L32.1 27.0M26.6 26.6L29.9 29.9M24.7 28.1L27.0 32.1M22.4 29.1L23.6 33.5M20.0 29.4L20.0 34.0M17.6 29.1L16.4 33.5M15.3 28.1L13.0 32.1M13.4 26.6L10.1 29.9M11.9 24.7L7.9 27.0M10.9 22.4L6.5 23.6M10.6 20.0L6.0 20.0M10.9 17.6L6.5 16.4M11.9 15.3L7.9 13.0M13.4 13.4L10.1 10.1M15.3 11.9L13.0 7.9M17.6 10.9L16.4 6.5M20.0 10.6L20.0 6.0M22.4 10.9L23.6 6.5M24.7 11.9L27.0 7.9M26.6 13.4L29.9 10.1M28.1 15.3L32.1 13.0M29.1 17.6L33.5 16.4" stroke="#a9843f" stroke-width=".55" stroke-opacity=".55"/>
<circle cx="20" cy="20" r="12.2" fill="none" stroke="#b8924a" stroke-width=".6" stroke-dasharray="1.3 1.1"/>
<circle cx="20" cy="20" r="10.6" fill="none" stroke="#b8924a" stroke-width=".5" stroke-dasharray="1.1 1.3" stroke-dashoffset=".6"/>
<path d="M34.7 20.0L34.9 22.6L33.9 25.1L32.7 27.3L31.3 29.5L29.4 31.2L27.2 32.5L24.9 33.3L22.4 33.5L20.0 33.5L17.5 34.0L15.0 33.7L12.7 32.6L10.6 31.2L8.6 29.5L7.1 27.4L5.9 25.1L5.4 22.6L5.9 20.0L6.6 17.6L6.9 15.2L7.8 12.9L9.2 11.0L10.8 9.1L12.8 7.5L15.0 6.3L17.4 5.1L20.0 4.7L22.5 5.6L24.9 6.7L27.1 7.6L29.1 9.2L30.7 11.0L32.1 13.0L33.0 15.3L33.8 17.6Z" fill="none" stroke="#8f6a2e" stroke-width=".9" stroke-linejoin="round"/>
<ellipse cx="20.3" cy="19.8" rx="8.2" ry="7.8" transform="rotate(-12 20 20)" fill="#dcb872"/>
<circle cx="20" cy="20" r="6.2" fill="none" stroke="#b8924a" stroke-width=".55" stroke-dasharray="1 1"/>
<circle cx="20" cy="20" r="4.2" fill="none" stroke="#b8924a" stroke-width=".55" stroke-dasharray=".9 1"/>
<circle cx="20" cy="20" r="1.6" fill="#c9a256"/>
<circle cx="20" cy="20" r="8.6" fill="none" stroke="#2f6b3e" stroke-width="2"/>
<path d="M20 11.4l-2.4-6.4 2.4 1.6 2.4-1.6z" fill="#2f6b3e"/>
</g>
<circle class="g-hand" cx="20" cy="26" r="2.4" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/>
<path class="g-drop" d="M27 20q1.6 2.6 0 3.6q-1.6-1 0-3.6z" fill="#8fd0f2" stroke="#3f86b0" stroke-width=".4"/>
</g>
</svg>`;

export const IDLE_KINDS = ['wipe', 'look', 'stretch', 'yawn', 'fan'] as const;
export type IdleKind = (typeof IDLE_KINDS)[number];

export interface PotView {
  el: HTMLElement;
  plant: HTMLElement;
}

export class BoardView {
  readonly el: HTMLElement;
  readonly pots: PotView[] = [];
  private readonly gardener: HTMLElement;
  private facing: Dir = 2;
  private pushTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    host: HTMLElement,
    private readonly board: Board,
    species: FlowerId[],
    state: State,
  ) {
    const { w, h, tiles } = board;
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.style.setProperty('--w', String(w));
    this.el.style.setProperty('--h', String(h));
    const windows = new Map(board.windows.map((win) => [win.at, win.dir]));
    let floor = '';
    for (let i = 0; i < w * h; i++) {
      const t = tiles[i];
      const x = i % w;
      const y = Math.floor(i / w);
      const pos = `style="--x:${x};--y:${y}"`;
      if (windows.has(i)) floor += `<i class="tile window d${windows.get(i)}" ${pos}></i>`;
      else if (t === Tile.Wall) {
        // 판 밖(빈칸)은 그리지 않고, 벽은 바닥과 닿은 곳만 그린다
        const touches = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1].some((o) => {
          const j = i + o;
          const jx = j % w;
          return j >= 0 && j < w * h && Math.abs(jx - x) <= 1 && tiles[j] !== Tile.Wall;
        });
        if (touches) floor += `<i class="tile wall" ${pos}></i>`;
      } else floor += `<i class="tile floor${(x + y) % 2 ? ' alt' : ''}" ${pos}></i>`;
    }
    // 햇살 자리: 창에서 들어온 빛이 바로 앞 한 칸 바닥에 고인다(빛 띠는 창 쪽에서 들어오는 방향)
    const sun = board.windows
      .map(({ spot, dir }) => {
        const pos = `style="--x:${spot % w};--y:${Math.floor(spot / w)}"`;
        return `<i class="spot-pool" ${pos}></i><i class="beam spot ${dir % 2 ? 'h' : 'v'} d${dir}" ${pos}></i>`;
      })
      .join('');
    this.el.innerHTML = `<div class="floor-layer">${floor}</div><div class="beam-layer">${sun}</div><div class="piece-layer"></div>`;
    const pieces = this.el.querySelector<HTMLElement>('.piece-layer')!;
    state.pots.forEach((_, i) => {
      const el = document.createElement('div');
      el.className = 'pot';
      el.innerHTML = `<span class="glow"></span><span class="plant">${flowerSvg(species[i], false, 'game')}</span>${POT}`;
      pieces.append(el);
      this.pots.push({ el, plant: el.querySelector('.plant')! });
    });
    this.gardener = document.createElement('div');
    this.gardener.className = 'gardener';
    this.gardener.innerHTML = GARDENER;
    pieces.append(this.gardener);
    host.replaceChildren(this.el);
    this.place(state, null);
  }

  /** 칸 크기를 판 자리에 맞춘다. 꽃이 화분 위로 솟으므로 위쪽에 반 칸 여유를 둔다 */
  layout(width: number, height: number): void {
    const cell = Math.floor(Math.max(26, Math.min(76, width / this.board.w, height / (this.board.h + 0.5))));
    this.el.style.setProperty('--cell', `${cell}px`);
  }

  cellAt(clientX: number, clientY: number): number {
    const r = this.el.getBoundingClientRect();
    const cell = r.width / this.board.w;
    const x = Math.floor((clientX - r.left) / cell);
    const y = Math.floor((clientY - r.top) / cell);
    if (x < 0 || y < 0 || x >= this.board.w || y >= this.board.h) return -1;
    return y * this.board.w + x;
  }

  /**
   * 화분·정원사를 새 자리로 옮긴다. face 는 정원사가 바라볼 방향(막혀서 못 움직여도 그쪽을 본다)
   */
  place(state: State, face: Dir | null): void {
    const { w } = this.board;
    if (face !== null) this.facing = face;
    const at = (el: HTMLElement, c: number) => {
      el.style.setProperty('--x', String(c % w));
      el.style.setProperty('--y', String(Math.floor(c / w)));
    };
    state.pots.forEach((c, i) => at(this.pots[i].el, c));
    at(this.gardener, state.player);
    this.gardener.style.setProperty('--face', `${[180, 270, 0, 90][this.facing]}deg`);
  }

  /** 화분을 밀 때: 모자 밖으로 두 팔이 쭉 나와 미는 모습(이어 밀면 팔을 계속 뻗고 있음) */
  push(): void {
    this.idle(null);
    this.gardener.classList.add('push');
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.gardener.classList.remove('push'), 240);
  }

  /** 가만히 있을 때 쉬는 동작 하나(땀 닦기 · 두리번 · 기지개 · 하품 · 모자 부채질). null 이면 멈춤 */
  idle(kind: IdleKind | null): void {
    this.gardener.classList.remove(...IDLE_KINDS.map((k) => `idle-${k}`));
    if (kind) {
      void this.gardener.offsetWidth;
      this.gardener.classList.add(`idle-${kind}`);
    }
  }

  /** 막혔을 때 정원사가 그쪽으로 살짝 부딪힘 */
  bump(dir: Dir): void {
    this.gardener.style.setProperty('--bx', String([0, 1, 0, -1][dir]));
    this.gardener.style.setProperty('--by', String([-1, 0, 1, 0][dir]));
    this.gardener.classList.remove('bump');
    void this.gardener.offsetWidth;
    this.gardener.classList.add('bump');
  }

  /** 화분마다 햇살 자리에 있는지(있으면 꽃대가 서고 바닥이 빛남) */
  mood(lit: boolean[], stuck: number[]): void {
    lit.forEach((ok, i) => {
      this.pots[i].el.classList.toggle('happy', ok);
      this.pots[i].el.classList.toggle('stuck', stuck.includes(i));
    });
  }

  /** 판을 깼을 때: 모든 화분의 꽃이 함께 핀다 */
  bloom(): void {
    this.el.classList.add('cleared');
    setTimeout(() => this.pots.forEach((p) => p.plant.querySelector('.fl')?.classList.remove('closed')), 200);
  }

  /** 꽃이 다 핀 뒤 마무리 동작: 모든 꽃이 함께 살짝 커졌다 흔들려 피는 연출이 끝났음을 알림(styles.css .board.done) */
  flourish(): void {
    this.el.classList.add('done');
  }
}
