import type { Season } from '../flora';
import { happy, light, parse, solved, step, Tile, type Board, type State } from './rules.ts';
import { explore, solve } from './solver.ts';

/**
 * 무작위 온실 방 만들기. 판 만들기 도구(tools/levelgen.ts)와 오늘의 정원(daily.ts)이 같이 쓴다.
 * 난수는 바깥에서 받는다(오늘의 정원은 날짜 시드라 모든 기기에서 같은 판이 나와야 함)
 */
export type Rng = () => number;

interface Spec {
  w: [number, number];
  h: [number, number];
  pots: string[][];
  walls: [number, number];
  windows: [number, number];
  extra: (g: string[][], w: number, h: number, r: Rng) => void;
}

const int = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: Rng, l: readonly T[]) => l[Math.floor(r() * l.length)];

const inner = (g: string[][], w: number, h: number) => {
  const c: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g[y][x] === '.') c.push([x, y]);
  return c;
};
const scatter = (ch: string, g: string[][], w: number, h: number, r: Rng) => {
  const free = inner(g, w, h);
  if (!free.length) return;
  const [x, y] = pick(r, free);
  g[y][x] = ch;
};
/** 물길·언 물길은 한 줄로 이어지게(두세 칸) */
const channel = (ch: string, n: [number, number]) => (g: string[][], w: number, h: number, r: Rng) => {
  const free = inner(g, w, h);
  if (!free.length) return;
  let [x, y] = pick(r, free);
  const horiz = r() < 0.5;
  for (let i = 0, len = int(r, ...n); i < len; i++) {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) break;
    if (g[y][x] === '.') g[y][x] = ch;
    if (horiz) x++;
    else y++;
  }
};

export const SPECS: Record<Season, Spec> = {
  spring: { w: [6, 7], h: [6, 8], pots: [['S'], ['S', 'S'], ['S', 'H'], ['S', 'S', 'H']], walls: [1, 4], windows: [1, 2], extra: () => {} },
  summer: { w: [6, 8], h: [7, 8], pots: [['M', 'S'], ['M', 'H'], ['M', 'S', 'H'], ['M', 'M', 'S']], walls: [1, 3], windows: [1, 2], extra: channel('~', [2, 3]) },
  autumn: {
    w: [6, 8],
    h: [7, 8],
    pots: [['S', 'S'], ['S', 'H'], ['S', 'S', 'H'], ['S', 'M']],
    walls: [1, 3],
    windows: [1, 2],
    extra: (g, w, h, r) => {
      scatter(r() < 0.5 ? '/' : '\\', g, w, h, r);
      if (r() < 0.5) scatter(r() < 0.5 ? '/' : '\\', g, w, h, r);
    },
  },
  winter: {
    w: [6, 8],
    h: [7, 8],
    pots: [['S', 'H'], ['S', 'S'], ['H', 'H', 'S'], ['S', 'S', 'H']],
    walls: [1, 3],
    windows: [1, 2],
    extra: (g, w, h, r) => {
      channel('=', [3, 4])(g, w, h, r);
      if (r() < 0.5) channel('=', [2, 3])(g, w, h, r);
    },
  },
};

/** 방 하나(글자 줄). 창 바로 안쪽이 막혔거나 놓을 자리가 없으면 null. pots 를 주면 계절 기본 화분 묶음 대신 쓴다 */
export function makeRoom(season: Season, r: Rng, opts: { pots?: string[][]; maxW?: number } = {}): string[] | null {
  const spec = SPECS[season];
  const w = Math.min(opts.maxW ?? 8, int(r, ...spec.w));
  const h = int(r, ...spec.h);
  const g: string[][] = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')));
  // 모서리를 깎아 네모가 아닌 방
  if (r() < 0.6) {
    const cx = r() < 0.5 ? 1 : w - 2;
    const cy = r() < 0.5 ? 1 : h - 2;
    g[cy][cx] = '#';
    if (r() < 0.5) g[cy][cx === 1 ? 2 : w - 3] = '#';
  }
  for (let i = 0, n = int(r, ...spec.walls); i < n; i++) scatter('#', g, w, h, r);
  spec.extra(g, w, h, r);
  // 창: 벽 가장자리(구석 말고)에서 안쪽을 향함. 바로 안쪽이 바닥이어야 함
  for (let i = 0, n = int(r, ...spec.windows); i < n; i++) {
    const side = int(r, 0, 3);
    const along = side % 2 === 0 ? int(r, 1, w - 2) : int(r, 1, h - 2);
    const [x, y, ch, ix, iy] =
      side === 0 ? [along, 0, 'v', along, 1] : side === 1 ? [w - 1, along, '<', w - 2, along] : side === 2 ? [along, h - 1, '^', along, h - 2] : [0, along, '>', 1, along];
    if (g[iy][ix] === '#') return null;
    g[y][x] = ch;
  }
  for (const p of pick(r, opts.pots ?? spec.pots)) {
    const free = inner(g, w, h);
    if (!free.length) return null;
    const [x, y] = pick(r, free);
    g[y][x] = p;
  }
  const free = inner(g, w, h);
  if (!free.length) return null;
  const [x, y] = pick(r, free);
  g[y][x] = '@';
  return g.map((row) => row.join(''));
}

/** 판이 계절 요소를 실제로 써야 한다: 겨울은 미끄러짐, 가을은 반사판에 꺾인 빛을 받는 화분(봄·여름은 늘 참) */
export function usesFeature(season: Season, board: Board, start: State, path: readonly number[]): boolean {
  let s = start;
  let slid = false;
  for (const d of path) {
    const res = step(board, s, d as 0);
    if (res.trail.length > 1) slid = true;
    s = res.state;
  }
  if (season === 'winter') return slid;
  if (season === 'autumn') {
    const { path: beam } = light(board, s.pots);
    const bent = (c: number) => board.tiles[c] === Tile.MirrorA || board.tiles[c] === Tile.MirrorB;
    return beam.some(([c]) => bent(c)) && beam.some(([, , e], i) => e === 1 && beam.slice(0, i).some(([c]) => bent(c)));
  }
  return true;
}

export interface Candidate {
  rows: string[];
  moves: number;
  pushes: number;
  states: number;
  /** 어려움 점수(정수라 기기마다 같게 정렬됨): 밀기·이동이 많고, 막히는 상태가 많고, 깨는 상태가 적을수록 높다 */
  score: number;
}

/**
 * 방 하나를 판으로 쓸 수 있는지 보고 어려움을 잰다. 처음부터 맞는 화분이 있거나, 상태가 너무 많거나(limit),
 * 못 깨거나, 밀기 수가 범위 밖이거나, 계절 요소를 안 쓰면 null
 */
export function rate(season: Season, rows: string[], limit: number, push: [number, number]): Candidate | null {
  let parsed;
  try {
    parsed = parse(rows);
  } catch {
    return null;
  }
  const { board, start } = parsed;
  if (happy(board, start.pots).some(Boolean)) return null;
  const graph = explore(board, start, limit);
  if (!graph) return null;
  const sol = solve(board, start, graph);
  if (!sol || sol.pushes < push[0] || sol.pushes > push[1]) return null;
  if (!usesFeature(season, board, start, sol.path)) return null;
  let dead = 0;
  for (let i = 0; i < graph.states.length; i++) if (graph.toGoal[i] < 0) dead++;
  const goals = graph.states.filter((st) => solved(board, st.pots)).length;
  const score = sol.pushes * 6 + sol.moves + Math.floor((dead * 40) / graph.states.length) - 4 * (32 - Math.clz32(goals + 1));
  return { rows, moves: sol.moves, pushes: sol.pushes, states: graph.states.length, score };
}
