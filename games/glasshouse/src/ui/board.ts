import type { FlowerId } from '../flora';
import { Tile, type Board, type Dir, type State } from '../game/rules';
import { flowerSvg } from './flowers';

/**
 * 온실 판 그리기. 바닥·벽·창과 창 앞 햇살 자리는 한 번 깔고, 화분·정원사는 움직일 때마다 옮긴다.
 * 칸 크기(--cell)는 판 자리에 맞춰 계산한다(layout). 움직임은 transform 만 쓴다
 */

/** 화분 SVG(40×40): 그림자 · 테라코타 몸통(왼쪽 빛, 오른쪽 그늘) · 테두리 · 흙 */
const POT = `<svg class="pot-body" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
<ellipse cx="20" cy="35.5" rx="13" ry="3.2" fill="rgb(40 30 20 / .28)"/>
<path d="M8 15h24l-3.2 19.2q-.3 1.8-2.2 1.8H13.4q-1.9 0-2.2-1.8z" fill="#b8613a"/>
<path d="M8 15h7l1.2 21h-2.8q-1.9 0-2.2-1.8z" fill="#d98a5c" opacity=".55"/>
<path d="M32 15h-6l-1.6 21h2.4q1.9 0 2.2-1.8z" fill="#7c3a20" opacity=".45"/>
<rect x="6.5" y="11" width="27" height="6" rx="2" fill="#c96f45"/>
<rect x="6.5" y="11" width="27" height="2.4" rx="1.2" fill="#e7a07a" opacity=".7"/>
<ellipse cx="20" cy="12.2" rx="11.2" ry="1.7" fill="#4a3324"/>
<path d="M8 15h24l-3.2 19.2q-.3 1.8-2.2 1.8H13.4q-1.9 0-2.2-1.8zM6.5 11h27v6h-27z" fill="none" stroke="#5a2c18" stroke-width=".5" stroke-opacity=".6"/>
</svg>`;

/** 정원사: 위에서 본 밀짚모자(얼굴 없음). 모자 띠의 매듭이 뒤쪽을 가리켜 보는 방향을 알린다 */
const GARDENER = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
<ellipse cx="21" cy="23" rx="15" ry="14" fill="rgb(40 30 20 / .22)"/>
<ellipse cx="20" cy="21" rx="9" ry="12" fill="#3f5a45"/>
<circle cx="20" cy="20" r="14.5" fill="#d8b46a"/>
<circle cx="20" cy="20" r="14.5" fill="none" stroke="#9a7434" stroke-width=".8"/>
<circle cx="20" cy="20" r="11.5" fill="none" stroke="#b8924a" stroke-width=".5" stroke-dasharray="1.6 1.4"/>
<circle cx="20" cy="20" r="8" fill="#e6c57d"/>
<path d="M14 15a8 8 0 0 1 11-1" fill="none" stroke="#fff3cf" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
<circle cx="20" cy="20" r="8.6" fill="none" stroke="var(--accent)" stroke-width="2"/>
<path d="M20 28.6l-2.4 6.4 2.4-1.6 2.4 1.6z" fill="var(--accent)"/>
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
      el.innerHTML = `<span class="glow"></span>${POT}<span class="plant">${flowerSvg(species[i], false)}</span>`;
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
