/**
 * 역방향 탐색(배포에 안 들어감). 방 구조(벽·창)만 정해 두고, 다 놓인 상태에서 화분을 "당겨" 거꾸로 퍼져 나가
 * 깰 수 있는 모든 배치와 그 배치에서 깨기까지 필요한 가장 적은 밀기 수를 한 번에 구한다.
 * 무작위로 화분을 놓고 풀어 보는 앞방향 방식은 대부분 못 깨거나 쉬운 배치를 뽑지만, 이 방식은 깰 수 있는 배치 가운데
 * 밀기가 가장 많이 필요한 배치를 바로 고를 수 있다. 상태는 밀기 단위(정원사는 걸어서 닿는 구역으로만 구분)라 앞방향보다 훨씬 작다.
 */
import { DX, DY, Tile, parse, type Board } from '../src/game/rules.ts';

export interface Far {
  /** 화분 자리(정렬됨) */
  pots: number[];
  /** 정원사가 걸어서 닿는 구역의 칸들(여기 어디에 세워도 같은 밀기 상태) */
  region: number[];
  /** 깨기까지 가장 적은 밀기 수 */
  pushes: number;
}

/** 화분 자리(정렬)와 구역 대표 칸(가장 작은 번호)을 숫자 하나로. 칸 100개·화분 6개까지 정확 */
const keyOf = (pots: readonly number[], rep: number) => {
  let k = rep;
  for (const p of pots) k = k * 100 + p;
  return k;
};

/** 정원사가 from 에서 걸어서 닿는 칸들(화분·벽은 못 지나감) */
function flood(board: Board, occ: Uint8Array, from: number, mark: Int32Array, stamp: number): number[] {
  const { w, h, tiles } = board;
  const out = [from];
  mark[from] = stamp;
  for (let q = 0; q < out.length; q++) {
    const c = out[q];
    const x = c % w;
    const y = (c - x) / w;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (mark[n] === stamp || tiles[n] !== Tile.Floor || occ[n]) continue;
      mark[n] = stamp;
      out.push(n);
    }
  }
  return out;
}

/**
 * 화분 하나가 혼자 있을 때 햇살 자리로 밀어 넣을 수 있는 칸(살아 있는 칸). 여기 밖에 놓인 화분은 영영 못 넣는다.
 * 햇살 자리에서 당기기로 거꾸로 퍼져 구한다(정원사는 화분 앞뒤 칸이 바닥이기만 하면 됨)
 */
export function liveCells(board: Board): boolean[] {
  const { w, tiles } = board;
  const live = new Array<boolean>(w * board.h).fill(false);
  const queue = [...board.spots];
  for (const s of queue) live[s] = true;
  for (let q = 0; q < queue.length; q++) {
    const b = queue[q];
    for (let d = 0; d < 4; d++) {
      const step = DX[d] + DY[d] * w;
      const p = b + step; // 화분이 옮겨 갈 칸(정원사가 서 있던 칸)
      const back = p + step; // 정원사가 물러설 칸
      if (tiles[p] !== Tile.Floor || tiles[back] !== Tile.Floor || live[p]) continue;
      live[p] = true;
      queue.push(p);
    }
  }
  return live;
}

/**
 * 다 놓인 상태에서 거꾸로 퍼져 깰 수 있는 모든 밀기 상태를 구하고, 밀기 수가 가장 많은 쪽부터 top 개를 돌려준다.
 * 처음부터 햇살 자리에 화분이 있는 배치는 뺀다(판 규칙). 상태가 limit 을 넘으면 그때까지 구한 것으로 고른다
 */
export function farthest(board: Board, top: number, limit = 6_000_000) {
  const { w, h, tiles, spots } = board;
  const n = w * h;
  const occ = new Uint8Array(n);
  const mark = new Int32Array(n).fill(-1);
  const inReg = new Uint8Array(n);
  let stamp = 0;
  const seen = new Map<number, number>();
  // 층마다 상태를 [화분…, 구역 대표] 로 줄 세워 둔다
  const P = spots.length;
  let layer: number[] = [];
  const goal = spots.slice().sort((a, b) => a - b);
  for (const p of goal) occ[p] = 1;
  for (let c = 0; c < n; c++) {
    if (tiles[c] !== Tile.Floor || occ[c] || mark[c] >= 0) continue;
    const reg = flood(board, occ, c, mark, c);
    const rep = Math.min(...reg);
    seen.set(keyOf(goal, rep), 0);
    layer.push(...goal, rep);
  }
  for (const p of goal) occ[p] = 0;
  stamp = n;
  let depth = 0;

  let cut = false;
  while (layer.length && !cut) {
    const next: number[] = [];
    for (let i = 0; i < layer.length; i += P + 1) {
      const pots = layer.slice(i, i + P);
      const rep = layer[i + P];
      for (const p of pots) occ[p] = 1;
      stamp++;
      const reg = flood(board, occ, rep, mark, stamp);
      for (const c of reg) inReg[c] = 1;
      for (let k = 0; k < P && !cut; k++) {
        const b = pots[k];
        for (let d = 0; d < 4; d++) {
          const step = DX[d] + DY[d] * w;
          const p = b + step; // 정원사가 서 있는 칸 → 화분이 옮겨 갈 칸
          const q = p + step; // 정원사가 물러설 칸
          const px = p % w;
          const qx = q % w;
          if (p < 0 || q < 0 || p >= n || q >= n || Math.abs(px - (b % w)) > 1 || Math.abs(qx - px) > 1) continue;
          if (!inReg[p] || tiles[q] !== Tile.Floor || occ[q]) continue;
          const np = pots.slice();
          np[k] = p;
          np.sort((a, c) => a - c);
          occ[b] = 0;
          occ[p] = 1;
          stamp++;
          const nreg = flood(board, occ, q, mark, stamp);
          occ[p] = 0;
          occ[b] = 1;
          let nrep = q;
          for (const c of nreg) if (c < nrep) nrep = c;
          const key = keyOf(np, nrep);
          if (seen.has(key)) continue;
          seen.set(key, depth + 1);
          next.push(...np, nrep);
          if (seen.size > limit) {
            cut = true;
            break;
          }
        }
      }
      for (const c of reg) inReg[c] = 0;
      for (const p of pots) occ[p] = 0;
    }
    if (next.length) depth++;
    layer = next;
  }
  // 가장 깊은 층부터 거꾸로 훑어 처음부터 햇살 자리에 화분이 없는 배치를 고른다
  const spotSet = new Set(spots);
  const byDepth: Far[] = [];
  const all = [...seen.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, dist] of all) {
    if (byDepth.length >= top) break;
    let k = key;
    const pots: number[] = [];
    for (let i = 0; i < P; i++) {
      pots.unshift(k % 100);
      k = Math.floor(k / 100);
    }
    if (pots.some((p) => spotSet.has(p))) continue;
    for (const p of pots) occ[p] = 1;
    stamp++;
    const region = flood(board, occ, k, mark, stamp);
    for (const p of pots) occ[p] = 0;
    byDepth.push({ pots, region, pushes: dist });
  }

  /** 어떤 배치에서 깨기까지 가장 적은 밀기 수(못 깨면 -1). 확인·다른 도구용 */
  const distOf = (pots: readonly number[], player: number) => {
    for (const p of pots) occ[p] = 1;
    stamp++;
    const reg = flood(board, occ, player, mark, stamp);
    for (const p of pots) occ[p] = 0;
    return seen.get(keyOf(pots.slice().sort((a, b) => a - b), Math.min(...reg))) ?? -1;
  };
  return { far: byDepth, states: seen.size, cut, distOf };
}

/** 글자 줄 방에서 화분·정원사를 지운 구조(벽·창만) */
export function shell(rows: readonly string[]): string[] {
  return rows.map((r) => r.replace(/[o@]/g, '.'));
}

/** 구조에 화분·정원사를 놓은 글자 줄 */
export function place(rows: readonly string[], pots: readonly number[], player: number): string[] {
  const w = Math.max(...rows.map((r) => r.length));
  const g = rows.map((r) => r.padEnd(w, '#').split(''));
  for (const p of pots) g[Math.floor(p / w)][p % w] = 'o';
  g[Math.floor(player / w)][player % w] = '@';
  return g.map((r) => r.join(''));
}

/** 구조 글자 줄을 풀이기 판으로(화분·정원사 자리는 임시로 채워 parse 를 통과시킴) */
export function boardOf(rows: readonly string[]): Board {
  const g = shell(rows).map((r) => r.split(''));
  const spots: [number, number][] = [];
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[y].length; x++) {
      const d = 'v>^<'.indexOf(g[y][x]);
      if (d >= 0) spots.push([x + [0, 1, 0, -1][d], y + [1, 0, -1, 0][d]]);
    }
  // parse 는 화분 수 = 창 수, 정원사 하나를 요구하므로 바닥 아무 데나 임시로 둔다(구조만 쓴다)
  const free: [number, number][] = [];
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === '.') free.push([x, y]);
  const taken = new Set(spots.map(([x, y]) => `${x},${y}`));
  const left = free.filter(([x, y]) => !taken.has(`${x},${y}`));
  for (let i = 0; i < spots.length; i++) g[left[i][1]][left[i][0]] = 'o';
  g[left[spots.length][1]][left[spots.length][0]] = '@';
  return parse(g.map((r) => r.join(''))).board;
}
