/**
 * 온실정원 규칙(DOM 없음). 판은 글자 줄로 적는다.
 *   #  벽(화단 턱)        .  돌바닥        @  정원사        o  화분
 *   v ^ < >  벽에 난 창: 화살표 쪽 바로 앞 한 칸에 햇살이 비친다(창도 벽). 그 칸이 "햇살 자리"
 * 정원사는 상하좌우로 걷고, 앞에 화분이 있으면 한 칸 민다(화분 뒤가 벽이나 다른 화분이면 못 감, 당기기 없음).
 * 판을 깨는 조건: 모든 햇살 자리에 화분이 놓인다(화분 수 = 창 수)
 */

/** 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽 */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export const Tile = { Floor: 0, Wall: 1 } as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export interface Window {
  at: number;
  dir: Dir;
  /** 이 창이 비추는 햇살 자리(창 바로 앞 칸) */
  spot: number;
}

export interface Board {
  w: number;
  h: number;
  tiles: Tile[];
  windows: Window[];
  /** 햇살 자리(창 순서) */
  spots: number[];
}

export interface State {
  player: number;
  /** 화분 자리. 화분마다 꽃이 정해져 있어 순서를 지킨다(움직임을 그릴 수 있음) */
  pots: number[];
}

const WINDOW_DIR: Record<string, Dir> = { '^': 0, '>': 1, v: 2, '<': 3 };

export function parse(rows: readonly string[]): { board: Board; start: State } {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const tiles: Tile[] = [];
  const windows: Window[] = [];
  const pots: number[] = [];
  let player = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] ?? ' ';
      const i = y * w + x;
      let t: Tile = Tile.Floor;
      if (c === '#' || c === ' ') t = Tile.Wall;
      else if (c in WINDOW_DIR) {
        t = Tile.Wall;
        const dir = WINDOW_DIR[c];
        windows.push({ at: i, dir, spot: (y + DY[dir]) * w + x + DX[dir] });
      } else if (c === 'o') pots.push(i);
      else if (c === '@') player = i;
      tiles.push(t);
    }
  }
  if (player < 0) throw new Error('no player');
  const spots = windows.map((win) => win.spot);
  if (spots.some((s) => s < 0 || s >= w * h || tiles[s] !== Tile.Floor)) throw new Error('window faces no floor');
  if (new Set(spots).size !== spots.length || spots.length !== pots.length) throw new Error('pots must match windows');
  return { board: { w, h, tiles, windows, spots }, start: { player, pots } };
}

/** 화분마다 햇살 자리에 있는지 */
export function lit(board: Board, pots: readonly number[]): boolean[] {
  return pots.map((p) => board.spots.includes(p));
}

export const solved = (board: Board, pots: readonly number[]) => pots.every((p) => board.spots.includes(p));

export interface Step {
  state: State;
  /** 사람이 움직였는지(벽에 막히면 false) */
  moved: boolean;
  /** 민 화분 번호(없으면 -1) */
  pushed: number;
}

/** 한 칸 움직인다. 앞에 화분이 있으면 한 칸 민다(화분 뒤가 막혀 있으면 못 감) */
export function step(board: Board, s: State, dir: Dir): Step {
  const { w, h, tiles } = board;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  const px = s.player % w;
  const py = Math.floor(s.player / w);
  const to = at(px + DX[dir], py + DY[dir]);
  const none: Step = { state: s, moved: false, pushed: -1 };
  if (to < 0 || tiles[to] !== Tile.Floor) return none;
  const pot = s.pots.indexOf(to);
  if (pot < 0) return { state: { player: to, pots: s.pots }, moved: true, pushed: -1 };
  const next = at(px + DX[dir] * 2, py + DY[dir] * 2);
  if (next < 0 || tiles[next] !== Tile.Floor || s.pots.includes(next)) return none;
  const pots = s.pots.slice();
  pots[pot] = next;
  return { state: { player: to, pots }, moved: true, pushed: pot };
}

/**
 * 다시는 햇살 자리로 못 옮기는 화분(되돌리기 안내용): 햇살 자리가 아닌 구석(위아래 한 면 + 좌우 한 면이 벽)에 몰린 화분.
 * 화분은 당길 수 없어 구석에서는 영영 못 뺀다
 */
export function stuckPots(board: Board, s: State): number[] {
  const { w, h, tiles } = board;
  const blocked = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || tiles[y * w + x] !== Tile.Floor;
  return s.pots
    .map((p, i) => {
      if (board.spots.includes(p)) return -1;
      const x = p % w;
      const y = Math.floor(p / w);
      const v = blocked(x, y - 1) || blocked(x, y + 1);
      const hz = blocked(x - 1, y) || blocked(x + 1, y);
      return v && hz ? i : -1;
    })
    .filter((i) => i >= 0);
}
