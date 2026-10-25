/**
 * 온실 정원 규칙(DOM 없음). 판은 글자 줄로 적는다.
 *   #  벽(화단 턱)        .  돌바닥          ~  물길(사람·화분은 못 들어감, 햇살은 지나감)
 *   =  언 물길(겨울): 사람은 걸어 다니고, 화분은 밀면 멈출 때까지 미끄러짐
 *   /  \  반사판(가을, 고정): 햇살을 90° 꺾음. 사람·화분은 못 지나감
 *   v ^ < >  벽에 난 창: 화살표 쪽으로 햇살 줄기가 들어옴(창도 벽)
 *   @  정원사   S 햇살 꽃 화분   H 그늘 꽃 화분   M 물가 꽃 화분
 * 햇살 줄기는 창에서 곧게 나아가다 벽이나 화분에 닿으면 멈춘다(그 화분은 햇볕을 받고, 뒤쪽은 그늘).
 * 판을 깨는 조건: 햇살 꽃은 햇볕을 받고, 그늘 꽃은 받지 않고, 물가 꽃은 물길(~) 바로 옆(상하좌우)에 있다
 */

export type Habit = 'sun' | 'shade' | 'moist';
/** 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽 */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

/** 칸 종류. MirrorA '/' 는 오른쪽으로 가던 빛을 위로, MirrorB '\' 는 아래로 꺾는다 */
export const Tile = { Floor: 0, Wall: 1, Water: 2, Ice: 3, MirrorA: 4, MirrorB: 5 } as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export interface Window {
  at: number;
  dir: Dir;
}

export interface Board {
  w: number;
  h: number;
  tiles: Tile[];
  windows: Window[];
  habits: Habit[];
}

export interface State {
  player: number;
  /** 화분 자리. 순서는 board.habits 와 같다(화분마다 정체가 있어 움직임을 그릴 수 있음) */
  pots: number[];
}

const HABIT_OF: Record<string, Habit> = { S: 'sun', H: 'shade', M: 'moist' };
const WINDOW_DIR: Record<string, Dir> = { '^': 0, '>': 1, v: 2, '<': 3 };

export function parse(rows: readonly string[]): { board: Board; start: State } {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const tiles: Tile[] = [];
  const windows: Window[] = [];
  const habits: Habit[] = [];
  const pots: number[] = [];
  let player = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] ?? ' ';
      const i = y * w + x;
      let t: Tile = Tile.Floor;
      if (c === '#' || c === ' ') t = Tile.Wall;
      else if (c === '~') t = Tile.Water;
      else if (c === '=') t = Tile.Ice;
      else if (c === '/') t = Tile.MirrorA;
      else if (c === '\\') t = Tile.MirrorB;
      else if (c in WINDOW_DIR) {
        t = Tile.Wall;
        windows.push({ at: i, dir: WINDOW_DIR[c] });
      } else if (c in HABIT_OF) {
        habits.push(HABIT_OF[c]);
        pots.push(i);
      } else if (c === '@') player = i;
      tiles.push(t);
    }
  }
  if (player < 0) throw new Error('no player');
  return { board: { w, h, tiles, windows, habits }, start: { player, pots } };
}

/** 사람·화분이 설 수 있는 칸(바닥·언 물길) */
export const walkable = (t: Tile) => t === Tile.Floor || t === Tile.Ice;
/** 햇살이 지나가는 칸 */
const clear = (t: Tile) => t === Tile.Floor || t === Tile.Ice || t === Tile.Water;

export interface Light {
  /** 화분마다 햇볕을 받는지 */
  lit: boolean[];
  /** 햇살이 지나간 칸과 방향(그리기용): [칸, 방향, 끝(0 지나감 · 1 화분에서 멈춤 · 2 벽에서 멈춤)] */
  path: [cell: number, dir: Dir, end: 0 | 1 | 2][];
}

export function light(board: Board, pots: readonly number[]): Light {
  const potAt = new Map<number, number>();
  pots.forEach((p, i) => potAt.set(p, i));
  const lit = pots.map(() => false);
  const path: Light['path'] = [];
  for (const win of board.windows) {
    let x = win.at % board.w;
    let y = Math.floor(win.at / board.w);
    let d: Dir = win.dir;
    // 반사판이 둘러싸여 빛이 맴도는 일은 없지만 안전하게 칸 수로 끊는다
    for (let guard = 0; guard < board.w * board.h * 4; guard++) {
      x += DX[d];
      y += DY[d];
      if (x < 0 || y < 0 || x >= board.w || y >= board.h) break;
      const i = y * board.w + x;
      const t = board.tiles[i];
      const pot = potAt.get(i);
      if (pot !== undefined) {
        lit[pot] = true;
        path.push([i, d, 1]);
        break;
      }
      if (t === Tile.MirrorA || t === Tile.MirrorB) {
        path.push([i, d, 0]);
        // '/' : 오른쪽 → 위, 위 → 오른쪽, 왼쪽 → 아래, 아래 → 왼쪽 · '\' : 오른쪽 → 아래, 아래 → 오른쪽, 왼쪽 → 위, 위 → 왼쪽
        d = (t === Tile.MirrorA ? [1, 0, 3, 2] : [3, 2, 1, 0])[d] as Dir;
        continue;
      }
      if (!clear(t)) {
        path.push([i, d, 2]);
        break;
      }
      path.push([i, d, 0]);
    }
  }
  return { lit, path };
}

/** 물가 꽃: 상하좌우 한 칸에 물길(얼지 않은 물)이 있다 */
export function nearWater(board: Board, cell: number): boolean {
  const x = cell % board.w;
  const y = Math.floor(cell / board.w);
  for (let d = 0; d < 4; d++) {
    const nx = x + DX[d];
    const ny = y + DY[d];
    if (nx < 0 || ny < 0 || nx >= board.w || ny >= board.h) continue;
    if (board.tiles[ny * board.w + nx] === Tile.Water) return true;
  }
  return false;
}

/** 화분마다 지금 자리가 그 꽃의 습성에 맞는지 */
export function happy(board: Board, pots: readonly number[], lit = light(board, pots).lit): boolean[] {
  return pots.map((p, i) => {
    const habit = board.habits[i];
    if (habit === 'sun') return lit[i];
    if (habit === 'shade') return !lit[i];
    return nearWater(board, p);
  });
}

export const solved = (board: Board, pots: readonly number[]) => happy(board, pots).every(Boolean);

export interface Step {
  state: State;
  /** 사람이 움직였는지(벽에 막히면 false) */
  moved: boolean;
  /** 민 화분 번호(없으면 -1)와 화분이 지나간 칸(미끄러짐 포함) */
  pushed: number;
  trail: number[];
}

/** 한 칸 움직인다. 앞에 화분이 있으면 민다(화분 뒤가 막혀 있으면 못 감). 언 물길 위 화분은 막힐 때까지 미끄러진다 */
export function step(board: Board, s: State, dir: Dir): Step {
  const { w, h, tiles } = board;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  const px = s.player % w;
  const py = Math.floor(s.player / w);
  const to = at(px + DX[dir], py + DY[dir]);
  const none: Step = { state: s, moved: false, pushed: -1, trail: [] };
  if (to < 0 || !walkable(tiles[to])) return none;
  const pot = s.pots.indexOf(to);
  if (pot < 0) return { state: { player: to, pots: s.pots }, moved: true, pushed: -1, trail: [] };
  const free = (c: number) => c >= 0 && walkable(tiles[c]) && !s.pots.includes(c);
  let cx = px + DX[dir];
  let cy = py + DY[dir];
  let next = at(cx + DX[dir], cy + DY[dir]);
  if (!free(next)) return none;
  const trail: number[] = [];
  do {
    cx += DX[dir];
    cy += DY[dir];
    trail.push(next);
    // 언 물길 위에 있으면 다음 칸이 비어 있는 동안 계속 미끄러진다
    if (tiles[next] !== Tile.Ice) break;
    next = at(cx + DX[dir], cy + DY[dir]);
  } while (free(next));
  const pots = s.pots.slice();
  pots[pot] = trail[trail.length - 1];
  return { state: { player: to, pots }, moved: true, pushed: pot, trail };
}

/**
 * 다시는 피울 수 없는 화분(되돌리기 안내용): 밀 수 없는 구석(벽 두 면)에 몰렸는데
 * 햇살 꽃은 그 칸에 햇살 줄기가 아예 지나가지 않고(화분은 빛을 가리기만 하므로 앞으로도 안 닿음), 물가 꽃은 물길 옆이 아님.
 * 그늘 꽃은 다른 화분이 앞을 가려 줄 수 있어 넣지 않는다
 */
export function stuckPots(board: Board, s: State): number[] {
  const { w, h, tiles } = board;
  const beam = new Set(light(board, []).path.map(([c]) => c));
  const blocked = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || !walkable(tiles[y * w + x]);
  return s.pots
    .map((p, i) => {
      const habit = board.habits[i];
      if (habit === 'shade' || (habit === 'sun' && beam.has(p)) || (habit === 'moist' && nearWater(board, p))) return -1;
      const x = p % w;
      const y = Math.floor(p / w);
      const v = blocked(x, y - 1) || blocked(x, y + 1);
      const hz = blocked(x - 1, y) || blocked(x + 1, y);
      return v && hz ? i : -1;
    })
    .filter((i) => i >= 0);
}
