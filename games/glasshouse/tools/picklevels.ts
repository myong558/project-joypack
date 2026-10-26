/**
 * 정원 24개 고르기(배포에 안 들어감). 판마다 방 크기 단계·화분 수·기준 이동 범위(난이도 곡선)를 정해 두고,
 * 무작위 방을 풀이기로 걸러 가장 어려운 판을 고른다. 결과 줄을 src/game/levels.ts 의 LEVELS 에 옮겨 적는다.
 *   node tools/picklevels.ts [판 번호 …]            고품질(상태 30만 개까지, 후보 12개 중 최고). 화분 3개 판은 하나에 몇 분~수십 분
 *   node tools/picklevels.ts --quick [판 번호 …]    임시 판(상태 6만 개까지, 이동 범위 넓게, 후보 4개). 판 하나에 1~2분
 * 판 번호마다 따로 돌려도 된다(동시에 여러 개: for i in 15 16 17; do node tools/picklevels.ts $i & done; wait)
 */
import { makeRoom, rate, type Candidate, type RoomSize } from '../src/game/roomgen.ts';

// [방 크기 단계, 화분, 이동 범위, 밀기 범위]
const PLAN: [RoomSize, number, [number, number], [number, number]][] = [
  [1, 1, [9, 11], [3, 8]], [1, 1, [13, 16], [5, 10]], [1, 2, [17, 20], [6, 14]],
  [1, 2, [21, 24], [7, 16]], [1, 2, [25, 28], [8, 18]], [1, 2, [29, 32], [9, 20]],
  [2, 2, [24, 27], [8, 18]], [2, 2, [28, 31], [9, 20]], [2, 2, [32, 35], [10, 22]],
  [2, 2, [36, 39], [11, 24]], [2, 2, [40, 43], [12, 26]], [3, 2, [42, 50], [12, 30]],
  [3, 2, [26, 30], [9, 20]], [3, 3, [30, 34], [10, 24]], [3, 3, [35, 38], [11, 26]],
  [3, 3, [39, 42], [12, 28]], [3, 3, [43, 46], [13, 30]], [3, 3, [47, 50], [14, 32]],
  [4, 3, [34, 38], [11, 26]], [4, 3, [39, 43], [12, 28]], [4, 3, [46, 50], [13, 30]],
  [4, 3, [50, 55], [14, 34]], [4, 3, [51, 58], [15, 36]], [4, 3, [58, 70], [16, 40]],
];

const args = process.argv.slice(2);
const quick = args.includes('--quick');
const only = args.filter((a) => a !== '--quick').map(Number);

PLAN.forEach(([size, pots, [lo, hi], push], i) => {
  if (only.length && !only.includes(i)) return;
  let seed = (quick ? 5000 : 1000) + i * (quick ? 104729 : 7919);
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const found: Candidate[] = [];
  const [limit, want, slack] = quick ? [60_000, 4, 8] : [300_000, 12, 0];
  for (let t = 0; t < 30000 && found.length < want; t++) {
    const rows = makeRoom(size, rnd, { pots, maxW: i < 6 ? 7 : 8 });
    const c = rows && rate(rows, limit, quick ? [8, 40] : push);
    if (c && c.moves >= lo && c.moves <= hi + slack) found.push(c);
  }
  found.sort((a, b) => b.score - a.score);
  const c = found[0];
  const rows = c && `[${c.rows.map((r) => `'${r}'`).join(', ')}]`;
  console.log(c ? `  L(${i}, ${c.moves}, ${rows}),${quick ? ' // 임시 판(빠른 생성)' : ''} // 밀기 ${c.pushes} 상태 ${c.states} 점수 ${c.score}` : `${i} 못 찾음`);
});
