import { lit, parse, solved, step, type Board, type Dir, type State } from './rules.ts';
import { explore, solve } from './solver.ts';

/**
 * 무작위 온실 방 만들기. 판 만들기 도구(tools/levelgen.ts)와 오늘의 정원 판 만들기(tools/dailygen.ts)가 같이 쓴다.
 * 난수는 바깥에서 받는다(오늘의 정원은 날짜 시드라 다시 만들어도 같은 판이 나와야 함)
 */
export type Rng = () => number;

interface Spec {
  w: [number, number];
  h: [number, number];
  /** 화분 수(= 창 수) 후보 */
  pots: number[];
  /** 방 안에 세울 벽 칸 수 */
  walls: [number, number];
}

const int = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: Rng, l: readonly T[]) => l[Math.floor(r() * l.length)];

const inner = (g: string[][], w: number, h: number) => {
  const c: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g[y][x] === '.') c.push([x, y]);
  return c;
};

/** 방 크기 단계 1~5: 단계가 오를수록 방이 넓어지고 화분이 는다(오늘의 정원은 요일마다 정한 1~4 단계, 5 는 정원 끝 판만) */
export type RoomSize = 1 | 2 | 3 | 4 | 5;

const SPECS: Record<RoomSize, Spec> = {
  1: { w: [6, 7], h: [6, 7], pots: [1, 2], walls: [1, 3] },
  2: { w: [6, 8], h: [6, 8], pots: [2], walls: [2, 4] },
  3: { w: [7, 8], h: [7, 8], pots: [2, 3], walls: [2, 5] },
  4: { w: [7, 8], h: [7, 9], pots: [3], walls: [3, 6] },
  5: { w: [8, 9], h: [8, 9], pots: [3, 4], walls: [4, 8] },
};

/** 방 하나(글자 줄). 놓을 자리가 없으면 null. pots 를 주면 단계 기본 화분 수 대신 쓴다 */
export function makeRoom(size: RoomSize, r: Rng, opts: { pots?: number; maxW?: number } = {}): string[] | null {
  const spec = SPECS[size];
  const w = Math.min(opts.maxW ?? 9, int(r, ...spec.w));
  const h = int(r, ...spec.h);
  const g: string[][] = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')));
  // 모서리를 깎아 네모가 아닌 방
  if (r() < 0.6) {
    const cx = r() < 0.5 ? 1 : w - 2;
    const cy = r() < 0.5 ? 1 : h - 2;
    g[cy][cx] = '#';
    if (r() < 0.5) g[cy][cx === 1 ? 2 : w - 3] = '#';
  }
  for (let i = 0, n = int(r, ...spec.walls); i < n; i++) {
    const free = inner(g, w, h);
    if (!free.length) return null;
    const [x, y] = pick(r, free);
    g[y][x] = '#';
  }
  // 창: 바깥 벽(구석 말고)에서 안쪽을 향함. 바로 앞(햇살 자리)이 바닥이고 다른 창의 자리와 겹치지 않아야 함
  const n = opts.pots ?? pick(r, spec.pots);
  const spots = new Set<string>();
  for (let i = 0; i < n; i++) {
    const side = int(r, 0, 3);
    const along = side % 2 === 0 ? int(r, 1, w - 2) : int(r, 1, h - 2);
    const [x, y, ch, ix, iy] =
      side === 0 ? [along, 0, 'v', along, 1] : side === 1 ? [w - 1, along, '<', w - 2, along] : side === 2 ? [along, h - 1, '^', along, h - 2] : [0, along, '>', 1, along];
    if (g[iy][ix] !== '.' || g[y][x] !== '#' || spots.has(`${ix},${iy}`)) return null;
    g[y][x] = ch;
    spots.add(`${ix},${iy}`);
  }
  // 화분·정원사는 햇살 자리가 아닌 바닥에
  const off = () => inner(g, w, h).filter(([x, y]) => !spots.has(`${x},${y}`));
  for (let i = 0; i < n; i++) {
    const free = off();
    if (!free.length) return null;
    const [x, y] = pick(r, free);
    g[y][x] = 'o';
  }
  const free = off();
  if (!free.length) return null;
  const [x, y] = pick(r, free);
  g[y][x] = '@';
  return g.map((row) => row.join(''));
}

export interface Candidate {
  rows: string[];
  moves: number;
  pushes: number;
  states: number;
  /** 돌려 놓는 밀기: 가장 적은 이동 풀이에서 민 화분이 가장 가까운 햇살 자리에 더 가까워지지 않는 밀기 수(생각해야 하는 판일수록 많음) */
  detours: number;
  /** 어려움 점수(정수라 기기마다 같게 정렬됨): 돌려 놓는 밀기·밀기·이동이 많고, 막히는 상태가 많고, 깨는 상태가 적을수록 높다 */
  score: number;
}

/** 가장 적은 이동 풀이를 따라가며 돌려 놓는 밀기(민 화분이 가장 가까운 햇살 자리에 더 가까워지지 않음)를 센다 */
function countDetours(board: Board, start: State, path: readonly Dir[]): number {
  const near = (p: number) => Math.min(...board.spots.map((s) => Math.abs((s % board.w) - (p % board.w)) + Math.abs(Math.floor(s / board.w) - Math.floor(p / board.w))));
  let s = start;
  let n = 0;
  for (const d of path) {
    const r = step(board, s, d);
    if (r.pushed >= 0 && near(r.state.pots[r.pushed]) >= near(s.pots[r.pushed])) n++;
    s = r.state;
  }
  return n;
}

/**
 * 방 하나를 판으로 쓸 수 있는지 보고 어려움을 잰다. 처음부터 햇살 자리에 있는 화분이 있거나, 상태가 너무 많거나(limit),
 * 못 깨거나, 밀기 수가 범위 밖이면 null
 */
export function rate(rows: string[], limit: number, push: [number, number]): Candidate | null {
  let board: Board;
  let start;
  try {
    ({ board, start } = parse(rows));
  } catch {
    return null;
  }
  if (lit(board, start.pots).some(Boolean)) return null;
  const graph = explore(board, start, limit);
  if (!graph) return null;
  const sol = solve(board, start, graph);
  if (!sol || sol.pushes < push[0] || sol.pushes > push[1]) return null;
  let dead = 0;
  for (let i = 0; i < graph.states.length; i++) if (graph.toGoal[i] < 0) dead++;
  const goals = graph.states.filter((st) => solved(board, st.pots)).length;
  // 돌려 놓는 밀기는 밀기 하나보다 크게 친다(v0.9.0: 길기만 하고 생각할 거리가 적은 판 대신, 화분을 먼저 비켜 두거나 돌려 넣어야 하는 판)
  const detours = countDetours(board, start, sol.path);
  const score = detours * 14 + sol.pushes * 6 + sol.moves + Math.floor((dead * 40) / graph.states.length) - 4 * (32 - Math.clz32(goals + 1));
  return { rows, moves: sol.moves, pushes: sol.pushes, states: graph.states.length, detours, score };
}
