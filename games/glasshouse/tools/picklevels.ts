/**
 * 정원 24개 고르기(배포에 안 들어감). 판마다 방 크기 단계·화분 수와 난이도(기준 이동 범위 또는 어려움 점수 범위)를 정해 두고,
 * 무작위 방을 풀이기로 걸러 고른다. 결과 줄을 src/game/levels.ts 의 LEVELS 에 옮겨 적는다.
 *   node tools/picklevels.ts [판 번호 …] [--seed N] [--min M]   고품질. 화분 4~5개 판은 하나에 수십 분(MINUTES 에서 끊음)
 *   node tools/picklevels.ts --quick [판 번호 …]                  임시 판(상태 6만 개까지, 이동 범위 넓게, 후보 4개). 판 하나에 1~2분
 * 판 번호(0부터)마다 따로 동시에 돌린다. 어려운 판은 --seed 를 바꿔 여러 개 돌리고 점수 높은 쪽을 쓴다(--min: 끊는 시간, 분)
 */
import { makeRoom, rate, type Candidate, type RoomSize } from '../src/game/roomgen.ts';

type Range = [number, number];
/** [방 크기 단계, 화분, 기준 이동 범위, 밀기 범위, 어려움 점수 범위(있으면 이것으로 고름)] */
type Plan = [RoomSize, number, Range, Range, Range?];

const ANY: Range = [1, 999];
const PUSH: Range = [8, 200];
// 1~6 은 규칙 배우기(기준 이동으로 고름). 7 부터는 2판마다 한 단계(방 크기·화분 수·벽 토막 통로가 늘어남),
// 각 판은 어려움 점수(roomgen rate)가 정해 둔 범위에 드는 판 가운데 가장 높은 판. 끝 판 점수는 tools/levelclimb.ts 로 다듬어 v0.9.0 의 24(점수 306)의 약 2배(v0.10.0)
const PLAN: Plan[] = [
  [1, 1, [9, 11], [3, 8]], [1, 1, [13, 16], [5, 10]], [1, 2, [17, 20], [6, 14]],
  [1, 2, [21, 24], [7, 16]], [1, 2, [25, 28], [8, 18]], [1, 2, [29, 32], [9, 20]],
  [3, 2, ANY, PUSH, [170, 190]], [3, 2, ANY, PUSH, [190, 215]],
  [4, 3, ANY, PUSH, [215, 237]], [4, 3, ANY, PUSH, [237, 260]],
  [5, 3, ANY, PUSH, [260, 282]], [5, 3, ANY, PUSH, [282, 305]],
  [6, 3, ANY, PUSH, [305, 330]], [6, 3, ANY, PUSH, [330, 355]],
  [7, 4, ANY, PUSH, [355, 380]], [7, 4, ANY, PUSH, [380, 405]],
  [8, 4, ANY, PUSH, [405, 415]], [8, 4, ANY, PUSH, [415, 430]],
  [8, 4, ANY, PUSH, [430, 450]], [8, 4, ANY, PUSH, [450, 488]],
  [9, 5, ANY, PUSH, [480, 490]], [9, 5, ANY, PUSH, [490, 500]],
  [9, 5, ANY, PUSH, [500, 550]], [9, 5, ANY, PUSH, [550, 2000]],
];

const args = process.argv.slice(2);

// --pool <결과.jsonl …>: tools/levelpool.ts·levelclimb.ts 로 모아 둔 후보에서 점수 범위가 있는 판을 고른다. 끝 판부터 거꾸로,
// 판마다 그 단계·화분 수에서 범위 위쪽 끝을 넘지 않고 뒤 판보다 점수가 낮은 판 가운데 가장 높은 판(범위 아래쪽 끝보다 낮으면 "범위 밖" 표시).
// 거꾸로 고르는 것은 가장 어려운 계열을 끝 판이 먼저 갖게 하려고
if (args[0] === '--pool') {
  const { readFileSync } = await import('node:fs');
  const pool = args
    .slice(1)
    .flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').filter(Boolean))
    .map((l) => JSON.parse(l) as Candidate & { size: RoomSize });
  // 다듬기(tools/levelclimb.ts)는 바깥 벽(창 배치)을 건드리지 않아 한 방에서 나온 판끼리 겉모습이 같다. 크기·바깥 벽이 같은 판은 한 번만 쓴다
  const rim = (r: string[]) => [r.length, r[0], r[r.length - 1], ...r.map((x) => x[0] + x[x.length - 1])].join('|');
  const used = new Set<string>();
  const lines: string[] = [];
  let next = Infinity;
  for (let i = PLAN.length - 1; i >= 0; i--) {
    const [size, pots, , , band] = PLAN[i];
    if (!band) continue;
    const mine = pool
      .filter((c) => c.size === size && c.rows.join('').split('o').length - 1 === pots && !used.has(rim(c.rows)) && c.score <= band[1] && c.score < next)
      .sort((a, b) => b.score - a.score);
    const c = mine[0];
    if (!c) {
      lines.unshift(`${i} 못 찾음`);
      continue;
    }
    used.add(rim(c.rows));
    next = c.score;
    lines.unshift(
      `  L(${i}, ${c.moves}, [${c.rows.map((r) => `'${r}'`).join(', ')}]), // 밀기 ${c.pushes} 돌려 놓기 ${c.detours} 상태 ${c.states} 점수 ${c.score}${c.score < band[0] ? ' 범위 밖' : ''}`,
    );
  }
  console.log(lines.join('\n'));
  process.exit(0);
}

const quick = args.includes('--quick');
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};
const seedOffset = opt('--seed') ?? 0;
const minutes = opt('--min');
const only = args.filter((a, i) => !a.startsWith('--') && !['--seed', '--min'].includes(args[i - 1])).map(Number);

/** 상태 한도: 화분이 많을수록 상태가 많다 */
const limitFor = (pots: number) => (pots >= 5 ? 2_000_000 : pots >= 4 ? 1_000_000 : 600_000);

PLAN.forEach(([size, pots, [lo, hi], push, band], i) => {
  if (only.length && !only.includes(i)) return;
  let seed = (quick ? 5000 : 1000) + i * (quick ? 104729 : 7919) + seedOffset * 15485863;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const found: Candidate[] = [];
  let best: Candidate | null = null;
  const limit = quick ? 60_000 : limitFor(pots);
  const want = quick ? 4 : band ? 8 : 12;
  // 너무 오래 걸리면 그때까지 모은 후보 가운데서 고른다(범위 안 판이 하나도 없으면 범위 아래 가장 어려운 판, "범위 밖" 표시)
  const until = Date.now() + (minutes ?? (pots >= 5 ? 90 : pots >= 4 ? 60 : 30)) * 60_000;
  const t0 = Date.now();
  for (let t = 0; t < 50_000_000 && found.length < want && Date.now() < until; t++) {
    const rows = makeRoom(size, rnd, { pots, maxW: i < 6 ? 7 : 10 });
    const c = rows && rate(rows, limit, quick ? [8, 40] : push);
    if (!c) continue;
    if (band) {
      if (c.score > band[1]) continue;
      if (c.score >= band[0]) found.push(c);
      else if (!best || c.score > best.score) best = c;
    } else if (c.moves >= lo && c.moves <= hi + (quick ? 8 : 0)) found.push(c);
  }
  found.sort((a, b) => b.score - a.score);
  const c = found[0] ?? best;
  const rows = c && `[${c.rows.map((r) => `'${r}'`).join(', ')}]`;
  const tag = found.length ? '' : ' 범위 밖';
  const mins = Math.round((Date.now() - t0) / 60_000);
  console.log(
    c
      ? `  L(${i}, ${c.moves}, ${rows}),${quick ? ' // 임시 판(빠른 생성)' : ''} // 밀기 ${c.pushes} 돌려 놓기 ${c.detours} 상태 ${c.states} 점수 ${c.score} 후보 ${found.length}${tag} ${mins}분`
      : `${i} 못 찾음`,
  );
});
