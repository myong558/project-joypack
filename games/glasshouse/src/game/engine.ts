import { lit, parse, solved, step, stuckPots, type Board, type Dir, type State, type Step } from './rules.ts';

/** 판 하나의 진행: 움직이기·되돌리기·처음부터, 이동 수. 화면은 move 가 돌려준 결과로 그린다 */
export class Game {
  readonly board: Board;
  readonly start: State;
  state: State;
  moves = 0;
  /** 되돌리기용 지난 상태(이동 수도 함께 되돌린다: 점수는 깬 순간의 이동 수) */
  private history: State[] = [];
  done = false;

  constructor(rows: readonly string[]) {
    const { board, start } = parse(rows);
    this.board = board;
    this.start = start;
    this.state = start;
  }

  /** 화분마다 햇살 자리에 있는지 */
  get lit(): boolean[] {
    return lit(this.board, this.state.pots);
  }

  get stuck(): number[] {
    return stuckPots(this.board, this.state);
  }

  get canUndo(): boolean {
    return this.history.length > 0 && !this.done;
  }

  move(dir: Dir): Step {
    if (this.done) return { state: this.state, moved: false, pushed: -1 };
    const r = step(this.board, this.state, dir);
    if (!r.moved) return r;
    this.history.push(this.state);
    this.state = r.state;
    this.moves++;
    this.done = solved(this.board, this.state.pots);
    return r;
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev || this.done) return false;
    this.state = prev;
    this.moves--;
    return true;
  }

  restart(): void {
    this.history = [];
    this.state = this.start;
    this.moves = 0;
    this.done = false;
  }

  /** 걸어서 갈 수 있는 칸까지의 가장 짧은 길(화분을 밀지 않음). 못 가면 null */
  pathTo(target: number): Dir[] | null {
    const { w, h, tiles } = this.board;
    const blocked = new Set(this.state.pots);
    const prev = new Map<number, [number, Dir]>([[this.state.player, [-1, 0]]]);
    const queue = [this.state.player];
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q];
      if (c === target) break;
      const x = c % w;
      const y = Math.floor(c / w);
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const nx = x + [0, 1, 0, -1][d];
        const ny = y + [-1, 0, 1, 0][d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nc = ny * w + nx;
        if (prev.has(nc) || blocked.has(nc) || tiles[nc] !== 0) continue;
        prev.set(nc, [c, d]);
        queue.push(nc);
      }
    }
    if (!prev.has(target)) return null;
    const path: Dir[] = [];
    for (let c = target; c !== this.state.player; ) {
      const [p, d] = prev.get(c)!;
      path.unshift(d);
      c = p;
    }
    return path;
  }
}

/** 판 점수: 기준 이동 수 이하면 1000, 많을수록 비율만큼(10점 단위, 최소 100) */
export function levelScore(par: number, moves: number): number {
  return Math.max(100, Math.round((1000 * Math.min(1, par / moves)) / 10) * 10);
}

/** 꽃잎 3장(기준 이하) · 2장(기준의 1.3배까지) · 1장 */
export function petals(par: number, moves: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  return moves <= Math.ceil(par * 1.3) ? 2 : 1;
}
