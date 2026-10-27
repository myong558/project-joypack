import { solved, step, type Board, type Dir, type State } from './rules.ts';

/**
 * 판 풀이기(너비 우선 탐색). 판의 기준 이동 수(가장 적은 이동)를 정하고, 모의 플레이에서
 * 상태마다 "앞으로 몇 걸음이면 깨는지"를 알려 준다. 화분끼리는 바꿔 놓아도 같은 상태로 본다(어느 화분이든 햇살 자리에 놓으면 됨)
 */

/** 상태를 숫자 하나로(칸 100개까지(번호 0~99) · 화분 6개까지는 정확함) */
export function stateKey(s: State): number {
  let k = s.player;
  for (const p of s.pots.slice().sort((a, b) => a - b)) k = k * 100 + p;
  return k;
}

export interface Graph {
  states: State[];
  index: Map<number, number>;
  /** 상태마다 네 방향으로 갔을 때의 상태 번호(못 가면 -1) */
  next: Int32Array;
  /** 깨기까지 남은 가장 적은 이동(못 깨면 -1) */
  toGoal: Int32Array;
  /** 처음 상태에서의 거리 */
  fromStart: Int32Array;
}

/** 처음 상태에서 닿는 모든 상태를 만든다. 너무 많으면(어려운 판 만들기 중) null */
export function explore(board: Board, start: State, limit = 400_000): Graph | null {
  const states: State[] = [start];
  const index = new Map<number, number>([[stateKey(start), 0]]);
  const nextList: number[] = [];
  const dist: number[] = [0];
  for (let i = 0; i < states.length; i++) {
    // 깬 상태에서는 더 나아가지 않는다(판이 끝남)
    if (i > 0 && solved(board, states[i].pots)) {
      nextList.push(-1, -1, -1, -1);
      continue;
    }
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      const r = step(board, states[i], d);
      if (!r.moved) {
        nextList.push(-1);
        continue;
      }
      const k = stateKey(r.state);
      let j = index.get(k);
      if (j === undefined) {
        j = states.length;
        index.set(k, j);
        states.push(r.state);
        dist.push(dist[i] + 1);
        if (states.length > limit) return null;
      }
      nextList.push(j);
    }
  }
  const n = states.length;
  const next = Int32Array.from(nextList);
  // 거꾸로 더듬어 깬 상태까지 남은 거리
  const prev: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (let d = 0; d < 4; d++) if (next[i * 4 + d] >= 0) prev[next[i * 4 + d]].push(i);
  const toGoal = new Int32Array(n).fill(-1);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (solved(board, states[i].pots)) (toGoal[i] = 0), queue.push(i);
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    for (const p of prev[i]) if (toGoal[p] < 0) (toGoal[p] = toGoal[i] + 1), queue.push(p);
  }
  return { states, index, next, toGoal, fromStart: Int32Array.from(dist) };
}

export interface Solution {
  moves: number;
  pushes: number;
  path: Dir[];
}

/** 가장 적은 이동으로 깨는 길 */
export function solve(board: Board, start: State, graph = explore(board, start)): Solution | null {
  if (!graph || graph.toGoal[0] < 0) return null;
  const path: Dir[] = [];
  let pushes = 0;
  let i = 0;
  while (graph.toGoal[i] > 0) {
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      const j = graph.next[i * 4 + d];
      if (j >= 0 && graph.toGoal[j] === graph.toGoal[i] - 1) {
        if (step(board, graph.states[i], d).pushed >= 0) pushes++;
        path.push(d);
        i = j;
        break;
      }
    }
  }
  return { moves: path.length, pushes, path };
}
