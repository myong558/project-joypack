/**
 * 사람이 느끼는 난이도 요소 재기(배포에 안 들어감). 지금 어려움 점수(roomgen rate)는 이동 수·밀기 수와
 * "갈 수 있는 모든 상태 가운데 막힌 상태 비율"로 재서, 오래 걷기만 하는 판이나 풀이와 상관없는 구석의 막힘도 어렵다고 본다.
 * 여기서는 사람이 실제로 생각하는 순간 — 화분을 밀기 직전(결정점) — 마다 무엇이 놓여 있는지를 잰다.
 *
 *   결정점: 가장 적은 이동 풀이에서 밀기 하나 직전 상태. 그 자리에서 정원사가 걸어 닿아 할 수 있는 밀기가 "선택지"
 *   함정: 선택지 가운데 밀면 다시는 못 깨는 밀기
 *   숨은 함정: 함정인데 밀고 나서도 구석에 박힌 화분(게임이 빨간 테두리로 알려 주는 막힘)이 없어 사람이 바로 모르는 것
 *   유혹 함정: 숨은 함정 가운데 민 화분이 햇살 자리에 더 가까워지는 밀기(그럴듯해 보여 사람이 먼저 손이 감)
 *   외길: 선택지가 둘 이상인데 깰 수 있는 밀기가 하나뿐인 결정점
 *   화분 바꾸기: 풀이에서 이어 미는 화분이 바뀌는 횟수(여러 화분을 함께 머릿속에 두어야 함)
 *   돌려 놓기: 민 화분이 햇살 자리에서 멀어지거나 그대로인 밀기. 거리는 벽을 따라 화분 혼자 밀어 가는 실제 밀기 수
 *   사람 흉내 봇: 결정점마다 구석에 안 박히는 밀기 가운데 화분들을 햇살 자리에 가장 가깝게 하는 밀기를 둠(먼저 본 상태는 피함).
 *                 깨면 "보이는 대로 밀어도 풀리는 판"
 *   걷기 비율: 이동 ÷ 밀기(높으면 오래 걸을 뿐 생각할 것은 같음)
 */
import { DX, DY, Tile, parse, stuckPots, type Board } from '../src/game/rules.ts';
import { fastExplore, type FastGraph } from './fastrate.ts';
import { HUMAN_WEIGHTS, STATE_LIMIT } from './levelplan.ts';

export interface Difficulty {
  moves: number;
  pushes: number;
  /** 결정점마다 선택지 수 평균 */
  options: number;
  traps: number;
  hidden: number;
  tempting: number;
  /** 외길 결정점 수 */
  narrow: number;
  switches: number;
  detours: number;
  /** 사람 흉내 봇: 깸이면 'solve', 아니면 숨은 막힘에 빠지기까지 민 수 'dead@n' 또는 'loop' */
  greedy: string;
  walk: number;
  states: number;
}

/** 칸마다 화분 혼자 밀어 가장 가까운 햇살 자리까지 밀기 수(못 가면 큰 값). 햇살 자리에서 당기기로 거꾸로 퍼짐 */
function pushDistance(board: Board): Int32Array {
  const { w, tiles } = board;
  const dist = new Int32Array(w * board.h).fill(999);
  const queue: number[] = [];
  for (const s of board.spots) (dist[s] = 0), queue.push(s);
  for (let q = 0; q < queue.length; q++) {
    const b = queue[q];
    for (let d = 0; d < 4; d++) {
      const step = DX[d] + DY[d] * w;
      const p = b + step;
      if (tiles[p] !== Tile.Floor || tiles[p + step] !== Tile.Floor || dist[p] <= dist[b] + 1) continue;
      dist[p] = dist[b] + 1;
      queue.push(p);
    }
  }
  return dist;
}

/** 정원사가 걸어 닿는 칸 */
function region(board: Board, player: number, pots: readonly number[]): Set<number> {
  const { w, tiles } = board;
  const occ = new Set(pots);
  const seen = new Set([player]);
  const queue = [player];
  for (let q = 0; q < queue.length; q++)
    for (let d = 0; d < 4; d++) {
      const n = queue[q] + DX[d] + DY[d] * w;
      if (tiles[n] === Tile.Floor && !occ.has(n) && !seen.has(n)) seen.add(n), queue.push(n);
    }
  return seen;
}

interface Option {
  pot: number;
  from: number;
  to: number;
  pots: number[];
  id: number;
}

/** 결정점에서 할 수 있는 모든 밀기와 그 결과 상태 번호 */
function options(board: Board, g: FastGraph, player: number, pots: readonly number[]): Option[] {
  const { w, tiles } = board;
  const reach = region(board, player, pots);
  const occ = new Set(pots);
  const out: Option[] = [];
  pots.forEach((b, k) => {
    for (let d = 0; d < 4; d++) {
      const step = DX[d] + DY[d] * w;
      const stand = b - step;
      const to = b + step;
      if (!reach.has(stand) || tiles[to] !== Tile.Floor || occ.has(to)) continue;
      const np = pots.slice();
      np[k] = to;
      out.push({ pot: k, from: b, to, pots: np, id: g.find(b, np.slice().sort((x, y) => x - y)) });
    }
  });
  return out;
}

export function measure(rows: string[]): Difficulty | null {
  const { board, start } = parse(rows);
  const { w } = board;
  const g = fastExplore(board, start, STATE_LIMIT);
  if (!g || g.toGoal[0] < 0) return null;
  const dist = pushDistance(board);
  const step = [-w, 1, w, -1];
  const visible = (pots: readonly number[]) => stuckPots(board, { player: 0, pots: [...pots] }).length > 0;
  const total = (pots: readonly number[]) => pots.reduce((s, p) => s + dist[p], 0);

  // 가장 적은 이동 풀이를 따라가며 결정점마다 잼
  let i = 0;
  let pl = start.player;
  const pots = start.pots.slice();
  let moves = 0;
  let pushes = 0;
  let opts = 0;
  let traps = 0;
  let hidden = 0;
  let tempting = 0;
  let narrow = 0;
  let switches = 0;
  let detours = 0;
  let last = -1;
  while (g.toGoal[i] > 0) {
    for (let d = 0; d < 4; d++) {
      const j = g.next[i * 4 + d];
      if (j < 0 || g.toGoal[j] !== g.toGoal[i] - 1) continue;
      const to = pl + step[d];
      const k = pots.indexOf(to);
      if (k >= 0) {
        // 밀기 직전 = 결정점
        const list = options(board, g, pl, pots);
        let safe = 0;
        for (const o of list) {
          if (o.id >= 0 && g.toGoal[o.id] >= 0) {
            safe++;
            continue;
          }
          traps++;
          if (!visible(o.pots)) {
            hidden++;
            if (dist[o.to] < dist[o.from]) tempting++;
          }
        }
        opts += list.length;
        if (list.length >= 2 && safe === 1) narrow++;
        if (last >= 0 && last !== k) switches++;
        last = k;
        const nx = to + step[d];
        if (dist[nx] >= dist[to]) detours++;
        pots[k] = nx;
        pushes++;
      }
      pl = to;
      moves++;
      i = j;
      break;
    }
  }

  // 사람 흉내 봇
  let greedy = 'loop';
  {
    let p = start.player;
    let ps = start.pots.slice();
    const seen = new Set<number>();
    for (let n = 0; n < 300; n++) {
      if (ps.every((x) => board.spots.includes(x))) {
        greedy = 'solve';
        break;
      }
      const list = options(board, g, p, ps).filter((o) => o.id >= 0 && !seen.has(o.id) && !visible(o.pots));
      if (!list.length) break;
      list.sort((a, b) => total(a.pots) - total(b.pots));
      const o = list[0];
      seen.add(o.id);
      if (g.toGoal[o.id] < 0) {
        greedy = `dead@${n + 1}`;
        break;
      }
      p = o.from;
      ps = o.pots;
    }
  }

  return {
    moves,
    pushes,
    options: Math.round((opts / pushes) * 10) / 10,
    traps,
    hidden,
    tempting,
    narrow,
    switches,
    detours,
    greedy,
    walk: Math.round((moves / pushes) * 10) / 10,
    states: g.n,
  };
}

/** 체감 점수: 결정점 요소를 levelplan HUMAN_WEIGHTS 로 더함(정수) */
export function humanScore(d: Difficulty): number {
  const k = HUMAN_WEIGHTS;
  const s = d.pushes * k.push + d.detours * k.detour + d.switches * k.switch + d.narrow * k.narrow + d.hidden * k.hidden + d.tempting * k.tempting;
  return Math.round(d.greedy === 'solve' ? s * k.greedySolves : s);
}
