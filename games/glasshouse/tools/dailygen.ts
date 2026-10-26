/**
 * 오늘의 정원 판 만들기(배포에 안 들어감). 날짜마다 날짜 시드로 방을 여러 개 만들어 풀이기로 거르고 가장 어려운 판을 고른다.
 *   node tools/dailygen.ts <시작 YYYY-MM-DD> <날 수> <결과 json>      날짜 범위 하나 만들기(여러 개를 동시에 돌려도 됨)
 *   node tools/dailygen.ts merge <결과 json …>                          모아서 src/game/daily-data.ts 로 쓰기
 * 기준은 정해 둔 판(levels.ts)과 같다: 처음부터 햇살 자리에 있는 화분이 없고, 가장 적은 이동이 PAR 범위 안. 방 크기·화분 수는 그날 요일 단계(daily.ts sizeOfKey)를 따른다.
 * merge 는 지금 목록에 결과를 덮어 쓰되 오늘까지의 날짜는 바꾸지 않는다(그날 순위표와 어긋남). 목록 길이는 7의 배수여야 한다(다시 돌 때 요일 단계가 맞게)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { DAILY, DAILY_START } from '../src/game/daily-data.ts';
import { dateKey, sizeOfKey } from '../src/game/daily.ts';
import { makeRoom, rate, type Candidate } from '../src/game/roomgen.ts';

/** 기준 이동 수 범위(정해 둔 판 24개가 9~70) */
const PAR: [number, number] = [14, 40];
const PUSH: [number, number] = [4, 14];
const LIMIT = 60_000;
/** 쓸 만한 후보를 이만큼 모으면 그중 가장 어려운 판 */
const WANT = 6;

function seed(key: string): number {
  let h = 2166136261;
  for (const ch of `glasshouse:${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry32(s: number) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 그날 시드로 못 찾으면(드묾) 시드 글자에 #1, #2 … 를 붙여 다시 */
function generate(key: string, salt = 0): string {
  const size = sizeOfKey(key);
  const r = mulberry32(seed(salt ? `${key}#${salt}` : key));
  const found: Candidate[] = [];
  for (let i = 0; i < 6000 && found.length < WANT; i++) {
    const rows = makeRoom(size, r);
    if (!rows) continue;
    const c = rate(rows, LIMIT, PUSH);
    if (c && c.moves >= PAR[0] && c.moves <= PAR[1]) found.push(c);
  }
  if (!found.length) return generate(key, salt + 1);
  found.sort((a, b) => b.score - a.score);
  return `${size}${found[0].moves}|${found[0].rows.join('|')}`;
}

if (process.argv[2] === 'merge') {
  const all = new Map<string, string>();
  const [y0, m0, d0] = DAILY_START.split('-').map(Number);
  DAILY.forEach((line, i) => all.set(dateKey(new Date(y0, m0 - 1, d0 + i)), line));
  const today = dateKey(new Date());
  for (const f of process.argv.slice(3)) for (const [k, v] of Object.entries(JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>)) if (k > today || !all.has(k)) all.set(k, v);
  const keys = [...all.keys()].sort();
  if (keys.length % 7) throw new Error(`날 수 ${keys.length} 가 7의 배수가 아님`);
  // 시드가 달라도 mulberry32 수열이 겹치면 같은 판이 나온다. 뒤 날짜를 다른 시드로 다시 만든다
  const seen = new Set<string>();
  const lines = keys.map((k) => {
    let line = all.get(k)!;
    for (let salt = 1; seen.has(line); salt++) {
      line = generate(k, salt);
      console.log(`${k}: 앞 날과 같은 판이라 #${salt} 로 다시`);
    }
    seen.add(line);
    return line;
  });
  const out = `// tools/dailygen.ts 가 만든 오늘의 정원 판(손으로 고치지 않는다). ${keys[0]} 부터 하루 한 줄, ${keys.length}일(${keys.at(-1)} 까지)\nexport const DAILY_START = '${keys[0]}';\nexport const DAILY: string[] = [\n${lines.map((l) => `  '${l.replace(/\\/g, '\\\\')}',`).join('\n')}\n];\n`;
  writeFileSync(new URL('../src/game/daily-data.ts', import.meta.url), out);
  console.log(`${keys.length}일 → src/game/daily-data.ts`);
} else {
  const [start, count, outFile] = process.argv.slice(2);
  const [y, m, d] = start.split('-').map(Number);
  const res: Record<string, string> = {};
  for (let i = 0; i < Number(count); i++) {
    const key = dateKey(new Date(y, m - 1, d + i));
    res[key] = generate(key);
    if (i % 10 === 0) console.log(key, res[key].split('|')[0]);
  }
  writeFileSync(outFile, JSON.stringify(res));
}
