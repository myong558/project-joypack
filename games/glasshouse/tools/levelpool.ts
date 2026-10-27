/**
 * 판 후보 모으기(배포에 안 들어감). 방 크기 단계 하나에서 무작위 방을 계속 만들어 풀이기로 거르고,
 * 어려움 점수(roomgen rate)가 기준 넘는 판을 찾는 즉시 JSON 줄로 파일에 덧붙인다(중간에 멈춰도 그때까지 찾은 판은 남음).
 * 다 모은 뒤 tools/picklevels.ts --pool <파일 …> 이 판 번호마다 점수 범위에 맞는 판을 나눠 준다.
 *   node tools/levelpool.ts <단계> <화분> <분> <시드> <결과.jsonl> [최소 점수=150]
 * 같은 단계를 시드만 바꿔 여러 개 동시에 돌린다(화분 5개는 하나에 메모리 2~3GB 라 4개쯤까지)
 */
import { appendFileSync } from 'node:fs';
import { makeRoom, rate, type RoomSize } from '../src/game/roomgen.ts';

const [size, pots, minutes, seed0, out, min = '150'] = process.argv.slice(2);
const limit = Number(pots) >= 5 ? 1_200_000 : Number(pots) >= 4 ? 1_000_000 : 600_000;
let seed = Number(seed0) * 15485863 + Number(size) * 7919 + 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const until = Date.now() + Number(minutes) * 60_000;
let tried = 0;
let kept = 0;
while (Date.now() < until) {
  const rows = makeRoom(Number(size) as RoomSize, rnd, { pots: Number(pots) });
  if (!rows) continue;
  tried++;
  const c = rate(rows, limit, [8, 200]);
  if (c && c.score >= Number(min)) {
    appendFileSync(out, JSON.stringify({ size: Number(size), ...c }) + '\n');
    kept++;
  }
}
console.log(`단계 ${size} 화분 ${pots}: 방 ${tried}개 시험, 점수 ${min} 넘는 판 ${kept}개`);
