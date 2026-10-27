/**
 * 정원 24개 고르기(배포에 안 들어감). 판마다 방 크기 단계·화분 수·기준 이동 범위(난이도 곡선)를 정해 두고,
 * 무작위 방을 풀이기로 걸러 가장 어려운 판을 고른다. 결과 줄을 src/game/levels.ts 의 LEVELS 에 옮겨 적는다.
 *   node tools/picklevels.ts [판 번호 …]            고품질(상태 30만 개까지 · 화분 4개는 40만 개, 후보 12개 · 화분 4개는 6개 중 최고). 화분 3~4개 판은 하나에 몇 분~수십 분(30분에서 끊음)
 *   node tools/picklevels.ts --quick [판 번호 …]    임시 판(상태 6만 개까지, 이동 범위 넓게, 후보 4개). 판 하나에 1~2분
 * 판 번호마다 따로 돌려도 된다(동시에 여러 개: for i in 15 16 17; do node tools/picklevels.ts $i & done; wait)
 */
import { makeRoom, rate, type Candidate, type RoomSize } from '../src/game/roomgen.ts';

// [방 크기 단계, 화분, 이동 범위, 밀기 범위]. v0.9.0 난이도 곡선: 1~9 화분 1~2개(배우기), 10~20 화분 3개, 21~24 화분 4개(9×9까지 넓은 방)
const PLAN: [RoomSize, number, [number, number], [number, number]][] = [
  [1, 1, [9, 11], [3, 8]], [1, 1, [13, 16], [5, 10]], [1, 2, [17, 20], [6, 14]],
  [1, 2, [21, 24], [7, 16]], [1, 2, [25, 28], [8, 18]], [1, 2, [29, 32], [9, 20]],
  [2, 2, [24, 27], [8, 18]], [2, 2, [28, 31], [9, 20]], [2, 2, [32, 35], [10, 22]],
  [3, 3, [30, 36], [10, 24]], [3, 3, [34, 40], [11, 26]], [3, 3, [37, 43], [12, 28]],
  [3, 3, [40, 46], [12, 30]], [4, 3, [42, 48], [13, 30]], [4, 3, [45, 51], [13, 32]],
  [4, 3, [48, 54], [14, 34]], [4, 3, [50, 57], [15, 36]], [4, 3, [53, 60], [15, 38]],
  [5, 3, [55, 64], [16, 40]], [5, 3, [52, 64], [16, 44]], [5, 4, [32, 40], [12, 36]],
  [5, 4, [36, 44], [13, 40]], [5, 4, [40, 48], [14, 44]], [5, 4, [43, 56], [15, 50]],
];

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const only = args.filter((a) => a !== '--quick').map(Number);

PLAN.forEach(([size, pots, [lo, hi], push], i) => {
  if (only.length && !only.includes(i)) return;
  let seed = (quick ? 5000 : 1000) + i * (quick ? 104729 : 7919);
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const found: Candidate[] = [];
  // 화분 4개(9×9 방)는 기준 이동이 긴 판이 드물어 후보 6개, 상태는 40만 개까지(쓸 수 있는 판은 대부분 그 안)
  const [limit, want, slack] = quick ? [60_000, 4, 8] : pots >= 4 ? [400_000, 6, 0] : [300_000, 12, 0];
  // 너무 오래 걸리면(30분) 그때까지 모은 후보 가운데서 고른다
  const until = Date.now() + 30 * 60_000;
  for (let t = 0; t < 30000 && found.length < want && !(found.length && Date.now() > until); t++) {
    const rows = makeRoom(size, rnd, { pots, maxW: i < 6 ? 7 : 9 });
    const c = rows && rate(rows, limit, quick ? [8, 40] : push);
    if (c && c.moves >= lo && c.moves <= hi + slack) found.push(c);
  }
  found.sort((a, b) => b.score - a.score);
  const c = found[0];
  const rows = c && `[${c.rows.map((r) => `'${r}'`).join(', ')}]`;
  console.log(c ? `  L(${i}, ${c.moves}, ${rows}),${quick ? ' // 임시 판(빠른 생성)' : ''} // 밀기 ${c.pushes} 돌려 놓기 ${c.detours} 상태 ${c.states} 점수 ${c.score} 후보 ${found.length}` : `${i} 못 찾음`);
});
