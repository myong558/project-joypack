/**
 * 빠른 판 재기(배포에 안 들어감). src/game/roomgen.ts 의 rate 와 결과가 똑같은 판정·어려움 점수를 내되,
 * 상태를 객체 대신 숫자 배열에 담고 이웃을 칸 번호 더하기로 구해 몇 배 빠르고 메모리를 덜 쓴다.
 * 상태 번호를 매기는 순서(너비 우선, 방향 0~3)와 상태 키(solver stateKey)가 같아 그래프가 그대로 같다.
 * tests 는 없고 tools/levelmake.ts check 가 지금 판·무작위 방에서 rate 와 같은지 확인한다
 */
import { parse, type Board } from '../src/game/rules.ts';
import type { Candidate } from '../src/game/roomgen.ts';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

/** 숫자 배열(크기가 늘어남) */
class Grow {
  a: Int32Array;
  n = 0;
  constructor(cap = 1 << 16) {
    this.a = new Int32Array(cap);
  }
  push(v: number) {
    if (this.n === this.a.length) {
      const b = new Int32Array(this.a.length * 2);
      b.set(this.a);
      this.a = b;
    }
    this.a[this.n++] = v;
  }
}

/** 숫자 키 → 상태 번호 해시표(열린 주소). Map 보다 빠르고 작다. 키는 0 이상 정수(2^53 아래) */
class KeyIndex {
  keys: Float64Array;
  vals: Int32Array;
  mask: number;
  size = 0;
  constructor(bits = 16) {
    this.keys = new Float64Array(1 << bits).fill(-1);
    this.vals = new Int32Array(1 << bits);
    this.mask = (1 << bits) - 1;
  }
  private slot(key: number) {
    const lo = key | 0;
    const hi = (key / 4294967296) | 0;
    let h = Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 15;
    let i = h & this.mask;
    while (this.keys[i] !== -1 && this.keys[i] !== key) i = (i + 1) & this.mask;
    return i;
  }
  get(key: number): number | undefined {
    const i = this.slot(key);
    return this.keys[i] === -1 ? undefined : this.vals[i];
  }
  set(key: number, v: number) {
    if ((this.size + 1) * 2 > this.keys.length) this.grow();
    const i = this.slot(key);
    if (this.keys[i] === -1) this.size++;
    this.keys[i] = key;
    this.vals[i] = v;
  }
  private grow() {
    const { keys, vals } = this;
    this.keys = new Float64Array(keys.length * 2).fill(-1);
    this.vals = new Int32Array(keys.length * 2);
    this.mask = keys.length * 2 - 1;
    this.size = 0;
    for (let i = 0; i < keys.length; i++) if (keys[i] !== -1) this.set(keys[i], vals[i]);
  }
}

export interface FastGraph {
  P: number;
  /** 상태 수 */
  n: number;
  player: Int32Array;
  /** 상태마다 화분 P 개(정렬) */
  pots: Int32Array;
  next: Int32Array;
  toGoal: Int32Array;
  /** 정원사 자리·정렬된 화분 자리로 상태 번호(없으면 -1) */
  find: (player: number, pots: ArrayLike<number>) => number;
}

/** solver explore 와 같은 그래프. 상태가 limit 을 넘으면 null */
export function fastExplore(board: Board, start: { player: number; pots: number[] }, limit: number): FastGraph | null {
  const { w, h, tiles } = board;
  const N = w * h;
  const P = start.pots.length;
  const floor = new Uint8Array(N);
  for (let i = 0; i < N; i++) floor[i] = tiles[i] === 0 ? 1 : 0;
  const spot = new Uint8Array(N);
  for (const s of board.spots) spot[s] = 1;
  const step = [-w, 1, w, -1];
  const col = (c: number) => c % w;
  const inside = (from: number, d: number) => {
    const x = col(from) + DX[d];
    const y = (from - col(from)) / w + DY[d];
    return x >= 0 && y >= 0 && x < w && y < h;
  };
  const player = new Grow();
  const pots = new Grow();
  const next = new Grow();
  const index = new KeyIndex();
  const sorted = start.pots.slice().sort((a, b) => a - b);
  const keyOf = (pl: number, ps: ArrayLike<number>) => {
    let k = pl;
    for (let i = 0; i < P; i++) k = k * 100 + ps[i];
    return k;
  };
  index.set(keyOf(start.player, sorted), 0);
  player.push(start.player);
  for (const p of sorted) pots.push(p);
  const occ = new Uint8Array(N);
  const cur = new Int32Array(P);
  const tmp = new Int32Array(P);
  for (let i = 0; i < player.n; i++) {
    let lit = true;
    for (let k = 0; k < P; k++) {
      cur[k] = pots.a[i * P + k];
      if (!spot[cur[k]]) lit = false;
    }
    if (i > 0 && lit) {
      next.push(-1), next.push(-1), next.push(-1), next.push(-1);
      continue;
    }
    for (let k = 0; k < P; k++) occ[cur[k]] = 1;
    const pl = player.a[i];
    for (let d = 0; d < 4; d++) {
      if (!inside(pl, d)) {
        next.push(-1);
        continue;
      }
      const to = pl + step[d];
      if (!floor[to]) {
        next.push(-1);
        continue;
      }
      let key: number;
      let moved: ArrayLike<number> = cur;
      if (occ[to]) {
        if (!inside(to, d)) {
          next.push(-1);
          continue;
        }
        const nx = to + step[d];
        if (!floor[nx] || occ[nx]) {
          next.push(-1);
          continue;
        }
        // 민 화분을 바꿔 넣고 다시 정렬(삽입 정렬, 화분이 몇 개뿐)
        let m = 0;
        for (let k = 0; k < P; k++) if (cur[k] !== to) tmp[m++] = cur[k];
        let j = m - 1;
        while (j >= 0 && tmp[j] > nx) {
          tmp[j + 1] = tmp[j];
          j--;
        }
        tmp[j + 1] = nx;
        moved = tmp;
      }
      key = keyOf(to, moved);
      let j = index.get(key);
      if (j === undefined) {
        j = player.n;
        index.set(key, j);
        player.push(to);
        for (let k = 0; k < P; k++) pots.push(moved[k]);
        if (player.n > limit) return null;
      }
      next.push(j);
    }
    for (let k = 0; k < P; k++) occ[cur[k]] = 0;
  }
  const n = player.n;
  const nxt = next.a.subarray(0, n * 4);
  // 거꾸로 더듬기: 들어오는 간선을 한 배열에 모아(CSR) 너비 우선
  const deg = new Int32Array(n + 1);
  for (let e = 0; e < n * 4; e++) if (nxt[e] >= 0) deg[nxt[e] + 1]++;
  for (let i = 0; i < n; i++) deg[i + 1] += deg[i];
  const fill = deg.slice(0, n);
  const prev = new Int32Array(deg[n]);
  for (let e = 0; e < n * 4; e++) if (nxt[e] >= 0) prev[fill[nxt[e]]++] = (e / 4) | 0;
  const toGoal = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let qn = 0;
  const pa = pots.a;
  for (let i = 0; i < n; i++) {
    let lit = true;
    for (let k = 0; k < P && lit; k++) if (!spot[pa[i * P + k]]) lit = false;
    if (lit) (toGoal[i] = 0), (queue[qn++] = i);
  }
  for (let q = 0; q < qn; q++) {
    const i = queue[q];
    for (let e = deg[i]; e < deg[i + 1]; e++) {
      const p = prev[e];
      if (toGoal[p] < 0) (toGoal[p] = toGoal[i] + 1), (queue[qn++] = p);
    }
  }
  return { P, n, player: player.a.subarray(0, n), pots: pa.subarray(0, n * P), next: nxt, toGoal, find: (pl: number, ps: ArrayLike<number>) => index.get(keyOf(pl, ps)) ?? -1 };
}

/** 판으로 못 쓰는 까닭: 글자 줄 오류 · 처음부터 햇살 자리 · 상태 한도 넘음 · 못 깸 · 밀기 수 범위 밖 · 공짜 화분 */
export type Why = 'parse' | 'lit' | 'limit' | 'unsolvable' | 'push' | 'free';

/** roomgen rate 와 같은 결과(같은 null 조건·같은 점수) */
export function fastRate(rows: string[], limit: number, push: [number, number], allowFree = false): Candidate | null {
  const r = rateWhy(rows, limit, push, allowFree);
  return 'why' in r ? null : r;
}

/** fastRate 와 같되 못 쓰는 판은 까닭을 돌려준다(파이프라인이 버린 판을 까닭별로 셈) */
export function rateWhy(rows: string[], limit: number, push: [number, number], allowFree = false): Candidate | { why: Why } {
  let board: Board;
  let start: { player: number; pots: number[] };
  try {
    ({ board, start } = parse(rows));
  } catch {
    return { why: 'parse' };
  }
  const { w } = board;
  const spotSet = new Set(board.spots);
  if (start.pots.some((p) => spotSet.has(p))) return { why: 'lit' };
  const g = fastExplore(board, start, limit);
  if (!g) return { why: 'limit' };
  if (g.toGoal[0] < 0) return { why: 'unsolvable' };
  const { P, next, toGoal } = g;
  const step = [-w, 1, w, -1];
  // 가장 적은 이동 풀이(solver solve 와 같은 방향 순서), 화분 번호는 처음 상태의 순서로 따라감
  const path: number[] = [];
  const pushedBy: number[] = [];
  const cur = start.pots.slice();
  let pl = start.player;
  let pushes = 0;
  for (let i = 0; toGoal[i] > 0; ) {
    for (let d = 0; d < 4; d++) {
      const j = next[i * 4 + d];
      if (j >= 0 && toGoal[j] === toGoal[i] - 1) {
        const to = pl + step[d];
        const k = cur.indexOf(to);
        if (k >= 0) {
          cur[k] = to + step[d];
          pushes++;
        }
        pushedBy.push(k);
        path.push(d);
        pl = to;
        i = j;
        break;
      }
    }
  }
  const moves = path.length;
  if (pushes < push[0] || pushes > push[1]) return { why: 'push' };
  // 공짜 화분(roomgen hasFreePot 와 같음)
  if (!allowFree) {
    const count = new Array<number>(P).fill(0);
    const dirs = new Array<number>(P).fill(0);
    path.forEach((d, t) => {
      const k = pushedBy[t];
      if (k >= 0) (count[k]++, (dirs[k] |= 1 << d));
    });
    for (let i = 0; i < P; i++) {
      if (count[i] > 2 || (dirs[i] & (dirs[i] - 1)) !== 0) continue;
      const d = 31 - Math.clz32(dirs[i]);
      const p0 = start.pots[i];
      const stand = p0 - step[d];
      let free = true;
      for (let k = 0; k < g.n && free; k++) {
        if (g.player[k] !== stand || toGoal[k] < 0) continue;
        let has = false;
        for (let m = 0; m < P; m++) if (g.pots[k * P + m] === p0) has = true;
        if (!has) continue;
        let j = k;
        for (let c = 0; c < count[i] && j >= 0; c++) j = next[j * 4 + d];
        if (j < 0 || toGoal[j] < 0) free = false;
      }
      if (free) return { why: 'free' };
    }
  }
  // 돌려 놓는 밀기(roomgen countDetours 와 같음)
  const near = (p: number) => Math.min(...board.spots.map((s) => Math.abs((s % w) - (p % w)) + Math.abs(Math.floor(s / w) - Math.floor(p / w))));
  const pp = start.pots.slice();
  let detours = 0;
  pl = start.player;
  for (const d of path) {
    const to = pl + step[d];
    const k = pp.indexOf(to);
    if (k >= 0) {
      const nx = to + step[d];
      if (near(nx) >= near(pp[k])) detours++;
      pp[k] = nx;
    }
    pl = to;
  }
  let dead = 0;
  let goals = 0;
  for (let i = 0; i < g.n; i++) {
    if (toGoal[i] < 0) dead++;
    if (toGoal[i] === 0) goals++;
  }
  const score = detours * 14 + pushes * 6 + moves + Math.floor((dead * 40) / g.n) - 4 * (32 - Math.clz32(goals + 1));
  return { rows, moves, pushes, states: g.n, detours, score };
}
