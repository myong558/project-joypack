/**
 * 판 다듬기(배포에 안 들어감). tools/levelpool.ts 로 모은 후보 가운데 점수 높은 판을 출발점으로,
 * 방을 조금씩 바꿔(안쪽 벽 한 칸 넣기·빼기, 화분 한 개·정원사 옮기기) 다시 풀어 보고 어려움 점수가 떨어지지 않으면 그 방을 남긴다.
 * 규칙은 그대로이고 방 구조만 더 복잡해진다. 점수가 오른 판은 찾는 즉시 JSON 줄로 덧붙인다(picklevels --pool 이 그대로 읽음).
 *   node tools/levelclimb.ts <단계> <화분> <분> <시드> <결과.jsonl> <후보.jsonl …>
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { rate, type Candidate } from '../src/game/roomgen.ts';

const [size, pots, minutes, seed0, out, ...inputs] = process.argv.slice(2);
const P = Number(pots);
const limit = P >= 5 ? 1_200_000 : P >= 4 ? 1_000_000 : 600_000;
let seed = Number(seed0) * 15485863 + Number(size) * 7919 + 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const until = Date.now() + Number(minutes) * 60_000;

const potCount = (rows: string[]) => rows.join('').split('o').length - 1;
const start = inputs
  .flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').filter(Boolean))
  .map((l) => JSON.parse(l) as Candidate & { size: number })
  .filter((c) => c.size === Number(size) && potCount(c.rows) === P)
  .sort((a, b) => b.score - a.score);
if (!start.length) throw new Error('출발점 판 없음');

/** 햇살 자리(창 바로 앞 칸) */
function spotsOf(g: string[][]) {
  const s = new Set<string>();
  const h = g.length;
  const w = g[0].length;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = g[y][x];
      if (c === 'v') s.add(`${x},${y + 1}`);
      if (c === '^') s.add(`${x},${y - 1}`);
      if (c === '>') s.add(`${x + 1},${y}`);
      if (c === '<') s.add(`${x - 1},${y}`);
    }
  return s;
}

/** 방 하나를 조금 바꾼다(안쪽 칸만). 바꿀 수 없으면 null */
function mutate(rows: string[]): string[] | null {
  const g = rows.map((r) => r.split(''));
  const h = g.length;
  const w = g[0].length;
  const spots = spotsOf(g);
  const cells: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) cells.push([x, y]);
  const any = (want: string) => {
    const l = cells.filter(([x, y]) => g[y][x] === want && (want !== '.' || !spots.has(`${x},${y}`)));
    return l.length ? l[Math.floor(rnd() * l.length)] : null;
  };
  const k = rnd();
  if (k < 0.35) {
    const c = any('.'); // 벽 한 칸 넣기
    if (!c) return null;
    g[c[1]][c[0]] = '#';
  } else if (k < 0.6) {
    const c = any('#'); // 벽 한 칸 빼기
    if (!c) return null;
    g[c[1]][c[0]] = '.';
  } else {
    const from = any(k < 0.85 ? 'o' : '@'); // 화분·정원사 옮기기
    const to = any('.');
    if (!from || !to) return null;
    g[to[1]][to[0]] = g[from[1]][from[0]];
    g[from[1]][from[0]] = '.';
  }
  return g.map((r) => r.join(''));
}

// 출발점: 점수 높은 판 몇 개를 돌아가며 다듬는다(한 판에 갇히지 않게). 시드마다 출발 판을 2개씩 밀어 여러 프로세스가 다른 판을 다듬음
const from = (Number(seed0) * 2) % Math.max(1, start.length - 5);
const heads = start.slice(from, from + 6).map((c) => ({ ...c }));
let best = heads[0].score;
let tried = 0;
for (let t = 0; Date.now() < until; t++) {
  const head = heads[t % heads.length];
  const rows = mutate(head.rows);
  if (!rows) continue;
  tried++;
  const c = rate(rows, limit, [8, 200]);
  if (!c || c.score < head.score) continue;
  const up = c.score > head.score;
  Object.assign(head, c);
  if (up) appendFileSync(out, JSON.stringify({ size: Number(size), ...c }) + '\n');
  if (c.score > best) best = c.score;
}
console.log(`단계 ${size} 화분 ${pots}: 바꿔 본 방 ${tried}개, 최고 점수 ${start[0].score} → ${best}`);
