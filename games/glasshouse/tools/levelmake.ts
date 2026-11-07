/**
 * 정원 판 만들기 파이프라인(배포에 안 들어감). 설정은 tools/levelplan.ts 한 곳.
 *   pnpm --filter glasshouse levelmake gather <분> [판 번호(1부터) …] [--workers N]   후보 모으기
 *   pnpm --filter glasshouse levelmake climb <분> [판 번호 …] [--workers N]           모은 후보 다듬기
 *   pnpm --filter glasshouse levelmake pick [--write]                                   고르기·비교표(--write 면 판 바꾸기까지)
 *   pnpm --filter glasshouse levelmake report                                           지금 판의 체감 난이도 요소 표
 *   pnpm --filter glasshouse levelmake check                                         빠른 판 재기가 roomgen rate 와 같은지
 *
 * 흐름: gather 는 무작위 방 구조(벽·창)를 만들고 tools/reverse.ts(역방향 탐색)로 그 방에서 깰 수 있는 배치 가운데
 * 밀기가 가장 많이 필요한 배치 몇 개를 바로 찾아 tools/fastrate.ts(roomgen rate 와 같은 점수, 약 4배 빠름)로 잰다.
 * 예전 levelpool 처럼 화분을 무작위로 놓고 앞방향으로 다 풀어 본 뒤 버리는 일이 없다. CPU 코어마다 하나씩 동시에 돌고,
 * 버린 방은 까닭별로 센다. 후보는 tools/out/pool-<단계>-<화분>.jsonl 에 쌓인다(지우지 않으면 다음 실행에 이어 씀).
 * 후보는 체감 점수(tools/difficulty.ts)가 가장 높은 배치로 고르고 체감 점수를 함께 적는다.
 * pick 은 체감 점수 기준: 7판부터 앞 판보다 체감 점수가 높은 후보 가운데 판마다 정한 목표(levelplan PLAN target)에 가장 가까운 판.
 * 지금 판이 목표에서 KEEP_WITHIN 안이면 그대로 두고, 같은 화분 수의 지금 판은 다른 번호 자리로 옮겨 쓸 수 있다. 크기·바깥 벽이 같은 방은 한 번만.
 * report 는 지금 판마다 사람이 느끼는 난이도 요소(tools/difficulty.ts)와 체감 점수를 표로 내고, 체감 점수가 앞 판보다 낮은 판을 짚는다.
 * --write 는 src/game/levels.ts 판 줄 · src/game/solutions.ts · README 판 표를 고치고 판 테스트를 돌린다.
 * 판을 바꾼 뒤 사람이 할 일: 개발자 모드 풀이 보기로 판 확인, 모의 플레이(tests/balance.test.ts) 수치를 README 에 옮기기, 버전 올리기
 */
import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { makeRoom, rate, type Candidate, type RoomSize } from '../src/game/roomgen.ts';
import { fastRate, rateWhy, type Why } from './fastrate.ts';
import { KEEP_WITHIN, PLAN, PUSH, README_ROWS, STATE_LIMIT } from './levelplan.ts';
import { humanScore, measure } from './difficulty.ts';
import { boardOf, farthest, place, shell } from './reverse.ts';

const OUT = new URL('./out/', import.meta.url);
const LEVELS_FILE = new URL('../src/game/levels.ts', import.meta.url);
const README = new URL('../README.md', import.meta.url);
/** 체감 점수 기억: 후보마다 몇 초씩 걸려 한 번 잰 판은 다시 재지 않음 */
const HUMAN_CACHE = new URL('human.json', OUT);
const LINE = /L\((\d+), (\d+), (\[[^\]]+\])\)/g;

/** 후보 한 줄: 어려움 점수(score)와 함께 체감 점수(human, tools/difficulty.ts) */
type Rated = Candidate & { human: number };
type Pooled = Candidate & { size: RoomSize; human?: number };
type Stats = Record<'rooms' | 'noStart' | 'kept' | Why, number> & { best: number };

const potCount = (rows: string[]) => rows.join('').split('o').length - 1;
/** 크기·바깥 벽(창 배치)이 같은 방은 겉모습이 같아 한 번만 쓴다 */
const rim = (r: string[]) => [r.length, r[0], r[r.length - 1], ...r.map((x) => x[0] + x[x.length - 1])].join('|');
const poolFile = (size: number, pots: number) => new URL(`pool-${size}-${pots}.jsonl`, OUT);

/** 지금 판(levels.ts 의 판 줄을 글로 뽑음: levels.ts 는 꽃 목록·문구를 불러 node 로 바로 못 읽음) */
function currentLevels() {
  return [...readFileSync(LEVELS_FILE, 'utf8').matchAll(LINE)].map((m) => ({ i: +m[1], par: +m[2], rows: JSON.parse(m[3].replace(/'/g, '"')) as string[] }));
}

function readPool(size: number, pots: number): Pooled[] {
  const f = poolFile(size, pots);
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Pooled);
}

/**
 * 방 구조 하나에서 체감 점수가 가장 높은 판. 역방향 탐색으로 밀기가 많이 필요한 배치를 깊은 쪽부터 sets 개(화분 자리가 서로 다른 것),
 * 정원사는 그 구역에서 고르게 players 군데 놓아 잰다. 버린 까닭은 stats 에 센다
 */
function bestStart(rows: string[], stats: Stats | null, sets = 3, players = 2): Rated | null {
  let board;
  try {
    board = boardOf(rows);
  } catch {
    return null;
  }
  const { far } = farthest(board, 300);
  if (!far.length) {
    if (stats) stats.noStart++;
    return null;
  }
  const bare = shell(rows);
  const seen = new Set<string>();
  let best: Rated | null = null;
  for (const f of far) {
    const key = f.pots.join();
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > sets) break;
    const picks = new Set<number>();
    for (let i = 0; i < players; i++) picks.add(f.region[Math.floor(((i + 0.5) * f.region.length) / players)]);
    for (const player of picks) {
      const r = rateWhy(place(bare, f.pots, player), STATE_LIMIT, PUSH);
      if ('why' in r) {
        if (stats) stats[r.why]++;
        continue;
      }
      const d = measure(r.rows);
      if (!d) continue;
      const human = humanScore(d);
      if (!best || human > best.human) best = { ...r, human };
    }
  }
  return best;
}

/** 방 구조를 조금 바꾼다: 안쪽 벽 한 칸 넣기·빼기(햇살 자리·바깥 벽은 그대로) */
function mutate(rows: string[], rnd: () => number): string[] | null {
  const g = shell(rows).map((r) => r.split(''));
  const h = g.length;
  const w = g[0].length;
  const spots = new Set<string>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = 'v>^<'.indexOf(g[y][x]);
      if (d >= 0) spots.add(`${x + [0, 1, 0, -1][d]},${y + [1, 0, -1, 0][d]}`);
    }
  const want = rnd() < 0.55 ? '.' : '#';
  const cells: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g[y][x] === want && !spots.has(`${x},${y}`)) cells.push([x, y]);
  if (!cells.length) return null;
  const [x, y] = cells[Math.floor(rnd() * cells.length)];
  g[y][x] = want === '.' ? '#' : '.';
  return g.map((r) => r.join(''));
}

// ───────── 일꾼(스레드 하나) ─────────

interface Job {
  mode: 'gather' | 'climb';
  size: RoomSize;
  pots: number;
  /** 이 체감 점수 이상만 후보 파일에 남김 */
  keep: number;
  until: number;
  seed: number;
}

function work(job: Job) {
  const stats: Stats = { rooms: 0, noStart: 0, kept: 0, parse: 0, lit: 0, limit: 0, unsolvable: 0, push: 0, free: 0, best: 0 };
  let seed = job.seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const save = (c: Rated) => {
    appendFileSync(poolFile(job.size, job.pots), JSON.stringify({ size: job.size, ...c }) + '\n');
    stats.kept++;
    stats.best = Math.max(stats.best, c.human);
  };
  if (job.mode === 'gather') {
    while (Date.now() < job.until) {
      const rows = makeRoom(job.size, rnd, { pots: job.pots });
      if (!rows) continue;
      stats.rooms++;
      const c = bestStart(rows, stats);
      if (c && c.human >= job.keep) save(c);
    }
  } else {
    // 점수 높은 방 몇 개를 돌아가며: 벽 한 칸을 바꾸고 시작 배치를 다시 골라 점수가 떨어지지 않으면 남김
    const seenRim = new Set<string>();
    const heads = readPool(job.size, job.pots)
      .filter((c): c is Pooled & Rated => c.human !== undefined)
      .sort((a, b) => b.human - a.human)
      .filter((c) => (seenRim.has(rim(c.rows)) ? false : (seenRim.add(rim(c.rows)), true)))
      .slice(job.seed % 3, (job.seed % 3) + 6);
    for (let t = 0; heads.length && Date.now() < job.until; t++) {
      const head = heads[t % heads.length];
      const rows = mutate(head.rows, rnd);
      if (!rows) continue;
      stats.rooms++;
      const c = bestStart(rows, stats);
      if (!c || c.human < head.human) continue;
      const up = c.human > head.human;
      Object.assign(head, c);
      if (up) save(c);
    }
  }
  return stats;
}

if (!isMainThread) {
  parentPort!.postMessage(work(workerData as Job));
} else {
  await main();
}

// ───────── 명령 ─────────

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? Number(args[i + 1]) : undefined;
  };
  const nums = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--workers').map(Number);
  if (cmd === 'gather' || cmd === 'climb') await run(cmd, nums[0] ?? 10, nums.slice(1), opt('--workers') ?? availableParallelism());
  else if (cmd === 'pick') pick(args.includes('--write'));
  else if (cmd === 'check') check();
  else if (cmd === 'report') report();
  else console.log('사용법은 tools/levelmake.ts 맨 위 설명');
}

async function run(mode: 'gather' | 'climb', minutes: number, only: number[], workers: number) {
  mkdirSync(OUT, { recursive: true });
  // 판 계획에서 (단계, 화분) 묶음. 판이 많은 묶음부터 일꾼을 나눠 준다
  const groups = new Map<string, { size: RoomSize; pots: number; keep: number; levels: number }>();
  PLAN.forEach((p, i) => {
    if (!p.target || (only.length && !only.includes(i + 1))) return;
    const k = `${p.size}-${p.pots}`;
    const g = groups.get(k) ?? { size: p.size, pots: p.pots, keep: Infinity, levels: 0 };
    g.keep = Math.min(g.keep, Math.floor(p.target * 0.75));
    g.levels++;
    groups.set(k, g);
  });
  const list = [...groups.values()].sort((a, b) => b.levels - a.levels);
  if (!list.length) throw new Error('고를 판 없음(1~6 은 규칙 배우는 판이라 자동으로 고르지 않음)');
  const until = Date.now() + minutes * 60_000;
  const base = Date.now() % 100_000;
  console.log(`${mode}: ${minutes}분, 일꾼 ${workers}개, 묶음 ${list.map((g) => `단계 ${g.size}·화분 ${g.pots}`).join(' / ')}`);
  const jobs = Array.from({ length: workers }, (_, k) => {
    const g = list[k % list.length];
    const job: Job = { mode, size: g.size, pots: g.pots, keep: g.keep, until, seed: base * 131 + k * 7919 + 1 };
    return new Promise<[Job, Stats]>((ok, bad) => {
      const w = new Worker(new URL(import.meta.url), { workerData: job, resourceLimits: { maxOldGenerationSizeMb: 3072 } });
      w.once('message', (s: Stats) => ok([job, s]));
      w.once('error', bad);
    });
  });
  const done = await Promise.all(jobs);
  const sum = new Map<string, Stats>();
  for (const [job, s] of done) {
    const k = `단계 ${job.size}·화분 ${job.pots}`;
    const t = sum.get(k);
    if (!t) sum.set(k, { ...s });
    else for (const key of Object.keys(s) as (keyof Stats)[]) t[key] = key === 'best' ? Math.max(t.best, s.best) : t[key] + s[key];
  }
  console.log('묶음\t방\t남김\t최고 체감\t버린 까닭(배치 하나씩): 배치 없음·상태 한도·공짜 화분·밀기 범위·못 깸');
  for (const [k, s] of sum) console.log(`${k}\t${s.rooms}\t${s.kept}\t${s.best}\t${s.noStart} · ${s.limit} · ${s.free} · ${s.push} · ${s.unsolvable}`);
}

/** 체감 점수 기억(tools/out/human.json): 후보마다 몇 초씩 걸려 한 번 잰 판은 다시 재지 않음 */
function humanOf(rows: string[], cache: Record<string, number | null>): number | null {
  const k = rows.join('/');
  if (!(k in cache)) {
    const d = measure(rows);
    cache[k] = d ? humanScore(d) : null;
  }
  return cache[k];
}

interface Pick {
  i: number;
  /** 지금 판(체감 점수 포함) */
  now: Rated | null;
  next: Rated | null;
  /** 고른 판이 지금 판 몇 번(0부터)에서 왔는지(새 판이면 -1) */
  from: number;
}

/**
 * 판 고르기(체감 점수 기준). 7판부터 앞에서부터 차례로: 앞 판보다 체감 점수가 높고 크기·바깥 벽이 아직 안 쓴 방인 후보 가운데
 * 목표에 가장 가까운 판. 후보는 모은 판 + 같은 화분 수의 지금 판(다른 번호 자리로 옮겨 쓸 수 있음).
 * 지금 그 자리 판이 목표에서 KEEP_WITHIN 안이면 그대로 두고(곡선에서 벗어난 판만 바꿈), 지금 판은 새 판보다 조금 앞세운다
 */
function pick(write: boolean) {
  mkdirSync(OUT, { recursive: true });
  const cache: Record<string, number | null> = existsSync(HUMAN_CACHE) ? JSON.parse(readFileSync(HUMAN_CACHE, 'utf8')) : {};
  const levels = currentLevels();
  const now: (Rated | null)[] = levels.map((lv) => {
    const c = fastRate(lv.rows, STATE_LIMIT, [0, 999], true);
    const h = c ? humanOf(lv.rows, cache) : null;
    return c && h !== null ? { ...c, human: h } : null;
  });
  const used = new Set<string>();
  const usedNow = new Set<number>();
  const picks: Pick[] = [];
  let prev = -Infinity;
  for (let i = 0; i < PLAN.length; i++) {
    const { size, pots, target } = PLAN[i];
    if (!target) {
      picks.push({ i, now: now[i], next: now[i], from: i });
      continue;
    }
    const stay = now[i];
    if (stay && !usedNow.has(i) && !used.has(rim(stay.rows)) && Math.abs(stay.human - target) <= target * KEEP_WITHIN && (i < 7 || stay.human > prev)) {
      used.add(rim(stay.rows));
      usedNow.add(i);
      prev = stay.human;
      picks.push({ i, now: stay, next: stay, from: i });
      continue;
    }
    type C = Rated & { from: number };
    const pool: C[] = readPool(size, pots)
      .map((c) => ({ ...c, human: c.human ?? humanOf(c.rows, cache) ?? -1, from: -1 }))
      .filter((c) => c.human >= 0);
    const mine: C[] = now.flatMap((c, j) => (c && j >= 6 && !usedNow.has(j) && potCount(c.rows) === pots ? [{ ...c, from: j }] : []));
    const cost = (c: C) => Math.abs(c.human - target) / target - (c.from >= 0 ? 0.05 : 0);
    const c = [...mine, ...pool].filter((m) => !used.has(rim(m.rows)) && (i < 7 || m.human > prev)).sort((a, b) => cost(a) - cost(b))[0];
    if (!c) {
      picks.push({ i, now: now[i], next: null, from: -1 });
      continue;
    }
    used.add(rim(c.rows));
    if (c.from >= 0) usedNow.add(c.from);
    prev = c.human;
    picks.push({ i, now: now[i], next: c, from: c.from });
  }
  writeFileSync(HUMAN_CACHE, JSON.stringify(cache));
  console.log('판\t목표\t지금(체감·어려움·이동)\t→ 고른 판(체감·어려움·이동)\t어디서');
  const f = (c: Rated | null) => (c ? `${c.human} · ${c.score} · ${c.moves}` : '없음');
  for (const p of picks) {
    const t = PLAN[p.i].target;
    const where = p.from === p.i ? '' : p.from >= 0 ? `지금 ${p.from + 1}판을 옮김` : p.next ? '새 판' : '못 고름';
    console.log(`${p.i + 1}\t${t ?? '-'}\t${f(p.now)}\t→ ${f(p.next)}\t${where}`);
  }
  const changed = picks.filter((p) => p.from !== p.i && p.next);
  console.log(`바뀌는 판 ${changed.length}개${write ? '' : ' (바꾸려면 --write)'}`);
  if (!write || !changed.length) return;
  if (picks.some((p) => !p.next)) throw new Error('못 고른 판이 있어 쓰지 않음');
  for (let i = 7; i < picks.length; i++)
    if (picks[i].next!.human <= picks[i - 1].next!.human) throw new Error(`${i + 1}판 체감 점수가 앞 판보다 낮아 쓰지 않음`);
  let src = readFileSync(LEVELS_FILE, 'utf8');
  src = src.replace(LINE, (all, idx: string) => {
    const p = picks[+idx];
    if (p.from === p.i) return all;
    return `L(${idx}, ${p.next!.moves}, [${p.next!.rows.map((r) => `'${r}'`).join(', ')}])`;
  });
  writeFileSync(LEVELS_FILE, src);
  execSync('node tools/solutions.ts', { stdio: 'inherit', cwd: new URL('..', import.meta.url) });
  // README 판 표: "| 정원 | 화분 | 판(기준 이동) |" 아래 줄들의 셋째 칸
  const pars = picks.map((p) => p.next!.moves);
  const md = readFileSync(README, 'utf8').split('\n');
  const head = md.findIndex((l) => l.startsWith('| 정원 | 화분 | 판(기준 이동) |'));
  let at = 0;
  README_ROWS.forEach((n, r) => {
    const cells = md[head + 2 + r].split('|');
    cells[3] = ` ${pars.slice(at, at + n).join(' · ')} `;
    md[head + 2 + r] = cells.join('|');
    at += n;
  });
  writeFileSync(README, md.join('\n'));
  execSync('npx vitest run tests/levels.test.ts', { stdio: 'inherit', cwd: new URL('..', import.meta.url) });
  console.log('바꾼 판: ' + changed.map((p) => p.i + 1).join(', ') + ' — 풀이 보기로 확인, 모의 플레이 수치·버전은 사람이');
}

/** 빠른 판 재기(fastrate)가 roomgen rate 와 같은지: 지금 판 + 단계마다 무작위 방 */
function check() {
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rooms = currentLevels().map((l) => l.rows);
  for (const s of [1, 2, 3, 4, 5, 6, 7, 8] as RoomSize[]) for (let i = 0; i < 25; i++) rooms.push(makeRoom(s, rnd) ?? []);
  let diff = 0;
  let tOld = 0;
  let tNew = 0;
  for (const r of rooms.filter((x) => x.length))
    for (const free of [false, true]) {
      let t = performance.now();
      const a = rate(r, STATE_LIMIT, [0, 999], free);
      tOld += performance.now() - t;
      t = performance.now();
      const b = fastRate(r, STATE_LIMIT, [0, 999], free);
      tNew += performance.now() - t;
      if (JSON.stringify(a) !== JSON.stringify(b)) diff++;
    }
  console.log(`방 ${rooms.length}개 × 2: 다른 결과 ${diff}개, rate ${(tOld / 1000).toFixed(1)}초 · fastRate ${(tNew / 1000).toFixed(1)}초 (${(tOld / tNew).toFixed(1)}배)`);
  if (diff) process.exit(1);
}


/** 지금 판마다 체감 난이도 요소 표. 7판부터 체감 점수가 앞 판보다 낮거나 같으면 ▼ */
function report() {
  console.log('판\t어려움\t체감\t이동\t밀기\t선택지\t함정\t숨은\t유혹\t외길\t바꾸기\t돌려\t걷기\t사람 흉내 봇');
  let prev = -1;
  for (const lv of currentLevels()) {
    const c = fastRate(lv.rows, STATE_LIMIT, [0, 999], true);
    const d = measure(lv.rows);
    if (!c || !d) {
      console.log(`${lv.i + 1}\t상태 한도 넘음`);
      continue;
    }
    const h = humanScore(d);
    const down = lv.i >= 7 && h <= prev ? ' ▼' : '';
    prev = h;
    console.log([lv.i + 1, c.score, h + down, d.moves, d.pushes, d.options, d.traps, d.hidden, d.tempting, d.narrow, d.switches, d.detours, d.walk, d.greedy].join('\t'));
  }
}
