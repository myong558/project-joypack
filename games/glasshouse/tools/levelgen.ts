/**
 * 판 만들기 도구(배포에 안 들어감). 무작위 온실 방을 만들어 풀이기로 풀고, 쉬운 길이 없는 판만 남긴다.
 *   node tools/levelgen.ts <계절 spring|summer|autumn|winter> <화분 S,SH,…> <밀기 최소-최대> <개수> [시드] [최대 폭]
 * 고른 판은 src/game/levels.ts 에 옮겨 적고 tests/levels.test.ts 가 다시 풀어 기준 이동 수를 확인한다.
 * 방 만들기·거르기는 오늘의 정원 판 만들기(tools/dailygen.ts)와 같은 src/game/roomgen.ts 를 쓴다
 */
import type { Season } from '../src/flora';
import { makeRoom, rate, type Candidate } from '../src/game/roomgen.ts';

const season = (process.argv[2] ?? 'spring') as Season;
const pots = (process.argv[3] ?? 'S').split(',').map((k) => [...k]);
const [minPush, maxPush] = (process.argv[4] ?? '3-99').split('-').map(Number);
const want = Number(process.argv[5] ?? 6);
let seed = Number(process.argv[6] ?? 1);
const maxW = Number(process.argv[7] ?? 8);
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const found: Candidate[] = [];
for (let tries = 0; tries < 40000 && found.length < want * 25; tries++) {
  const rows = makeRoom(season, rnd, { pots, maxW });
  const c = rows && rate(season, rows, 250_000, [minPush, maxPush]);
  if (c) found.push(c);
}
found.sort((a, b) => b.score - a.score);
const seen = new Set<string>();
const out = found.filter((f) => (seen.has(f.rows.join()) ? false : (seen.add(f.rows.join()), true))).slice(0, want);
for (const f of out) console.log(JSON.stringify(f.rows), `moves ${f.moves} pushes ${f.pushes} states ${f.states} score ${f.score}`);
