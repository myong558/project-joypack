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
 * .g-arm 팔(화분을 밀 때 앞으로 쭉), .g-head 모자 밑 머리, .g-hand 땀 닦는 손, .g-drop 땀방울, .g-all 몸 전체(두리번)
 * 짚 결: 챙에 방사선 결 + 엇갈린 점선 고리, 꼭대기에 점선 고리. 광택 없이 짚 색 두 겹으로 무광
 */
export const GARDENER = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
<ellipse cx="21" cy="23" rx="15" ry="14" fill="rgb(40 30 20 / .22)"/>
<g class="g-all">
<g class="g-arm l"><path d="M13.5 22.5L12.5 33" stroke="#3f5a45" stroke-width="3.4" stroke-linecap="round"/><circle cx="12.4" cy="34" r="2.3" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/></g>
<g class="g-arm r"><path d="M26.5 22.5L27.5 33" stroke="#3f5a45" stroke-width="3.4" stroke-linecap="round"/><circle cx="27.6" cy="34" r="2.3" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/></g>
<ellipse cx="20" cy="21" rx="9" ry="12" fill="#3f5a45"/>
<g class="g-head"><circle cx="20" cy="21" r="6.6" fill="#4a3324"/><path d="M15.5 19.5q4.5-4 9 0" fill="none" stroke="#6b4a30" stroke-width="1.2" stroke-linecap="round"/></g>
<g class="g-hat">
<circle cx="20" cy="20" r="14.5" fill="#cfa862"/>
<circle cx="20" cy="20" r="13.2" fill="#d6b06a"/>
<path d="M29.4 20.0L34.0 20.0M29.1 22.4L33.5 23.6M28.1 24.7L32.1 27.0M26.6 26.6L29.9 29.9M24.7 28.1L27.0 32.1M22.4 29.1L23.6 33.5M20.0 29.4L20.0 34.0M17.6 29.1L16.4 33.5M15.3 28.1L13.0 32.1M13.4 26.6L10.1 29.9M11.9 24.7L7.9 27.0M10.9 22.4L6.5 23.6M10.6 20.0L6.0 20.0M10.9 17.6L6.5 16.4M11.9 15.3L7.9 13.0M13.4 13.4L10.1 10.1M15.3 11.9L13.0 7.9M17.6 10.9L16.4 6.5M20.0 10.6L20.0 6.0M22.4 10.9L23.6 6.5M24.7 11.9L27.0 7.9M26.6 13.4L29.9 10.1M28.1 15.3L32.1 13.0M29.1 17.6L33.5 16.4" stroke="#a9843f" stroke-width=".55" stroke-opacity=".55"/>
<circle cx="20" cy="20" r="12.2" fill="none" stroke="#b8924a" stroke-width=".6" stroke-dasharray="1.3 1.1"/>
<circle cx="20" cy="20" r="10.6" fill="none" stroke="#b8924a" stroke-width=".5" stroke-dasharray="1.1 1.3" stroke-dashoffset=".6"/>
<circle cx="20" cy="20" r="14.5" fill="none" stroke="#8f6a2e" stroke-width=".9"/>
<circle cx="20" cy="20" r="8" fill="#dcb872"/>
<circle cx="20" cy="20" r="6.2" fill="none" stroke="#b8924a" stroke-width=".55" stroke-dasharray="1 1"/>
<circle cx="20" cy="20" r="4.2" fill="none" stroke="#b8924a" stroke-width=".55" stroke-dasharray=".9 1"/>
<circle cx="20" cy="20" r="1.6" fill="#c9a256"/>
<circle cx="20" cy="20" r="8.6" fill="none" stroke="var(--accent)" stroke-width="2"/>
<path d="M20 11.4l-2.4-6.4 2.4 1.6 2.4-1.6z" fill="var(--accent)"/>
</g>
<circle class="g-hand" cx="20" cy="26" r="2.4" fill="#e2ad85" stroke="#9a6a48" stroke-width=".5"/>
<path class="g-drop" d="M27 20q1.6 2.6 0 3.6q-1.6-1 0-3.6z" fill="#8fd0f2" stroke="#3f86b0" stroke-width=".4"/>
</g>
</svg>`;

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

  /** 가만히 있을 때 쉬는 동작 하나(모자 벗고 땀 닦기 · 두리번 · 기지개). null 이면 멈춤 */
  idle(kind: 'wipe' | 'look' | 'stretch' | null): void {
    this.gardener.classList.remove('idle-wipe', 'idle-look', 'idle-stretch');
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

  /** 판을 깼을 때: 화분마다 차례로 꽃이 핀다 */
  bloom(step = 320): void {
    this.el.classList.add('cleared');
    this.pots.forEach((p, i) => setTimeout(() => p.plant.querySelector('.fl')?.classList.remove('closed'), 200 + i * step));
  }
}
