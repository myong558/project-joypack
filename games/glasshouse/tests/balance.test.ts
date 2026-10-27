import { describe, expect, it } from 'vitest';
import { levelScore, petals } from '../src/game/engine';
import { LEVELS } from '../src/game/levels';
import { parse, type Dir } from '../src/game/rules';
import { explore } from '../src/game/solver';
import { mulberry32 } from './rng';

/**
 * 모의 플레이(기준서 11.2-3): 실력별 봇으로 판마다 걸리는 시간·이동 수·꽃잎을 잰다.
 * 봇은 걸음마다 skill 확률로 깨는 데 가까워지는 수를 두고, 아니면 아무 데로나 움직인다.
 * 다시는 못 깨는 상태에 빠지면 몇 걸음 헤매다(알아채는 시간) 처음부터 다시 한다(되돌리기 없음, v0.7.15. 처음부터 하면 이동 수도 0부터).
 * 시간 = 손이 움직인 걸음 × 0.4초 + 화분을 민 번마다 생각하는 시간(실력별) + 막힘마다 다시 생각 6초
 */
const SKILLS = { 서툼: [0.55, 4], 보통: [0.7, 3], 잘함: [0.85, 2], 고수: [0.96, 1.2] } as const;

/** 판마다 상태 그래프는 한 번만 만든다(화분 4개 판은 상태가 수십만 개) */
const graphs = new Map<number, NonNullable<ReturnType<typeof explore>>>();

function play(level: number, [skill, think]: readonly [number, number], seed: number) {
  if (!graphs.has(level)) {
    const { board, start } = parse(LEVELS[level].rows);
    graphs.set(level, explore(board, start, 2_000_000)!);
  }
  const g = graphs.get(level)!;
  const rng = mulberry32(seed);
  const path: number[] = [0];
  let hands = 0;
  let pushes = 0;
  const pushed = (a: number, b: number) => g.states[a].pots.some((p, k) => p !== g.states[b].pots[k]);
  let stuck = 0;
  let lost = 0;
  // 끝 판은 기준 이동 100번 넘고 서툰 봇은 여러 번 처음부터 다시 하므로 걸음 한도를 넉넉히
  for (let guard = 0; guard < 200_000; guard++) {
    const cur = path[path.length - 1];
    if (g.toGoal[cur] === 0) break;
    if (g.toGoal[cur] < 0) {
      // 막힌 걸 알아채기까지 몇 걸음 더 헤맨다
      if (++lost < 4) {
        const opts = [0, 1, 2, 3].map((d) => g.next[cur * 4 + d]).filter((j) => j >= 0);
        if (opts.length) {
          path.push(opts[Math.floor(rng() * opts.length)]);
          hands++;
          continue;
        }
      }
      path.length = 1;
      stuck++;
      lost = 0;
      continue;
    }
    const moves = ([0, 1, 2, 3] as Dir[]).map((d) => g.next[cur * 4 + d]).filter((j) => j >= 0);
    const good = moves.filter((j) => g.toGoal[j] === g.toGoal[cur] - 1);
    const next = rng() < skill && good.length ? good[Math.floor(rng() * good.length)] : moves[Math.floor(rng() * moves.length)];
    if (pushed(cur, next)) pushes++;
    path.push(next);
    hands++;
  }
  const moves = path.length - 1;
  const par = LEVELS[level].par;
  return { solved: g.toGoal[path[path.length - 1]] === 0, moves, seconds: hands * 0.4 + pushes * think + stuck * 6, petals: petals(par, moves), score: levelScore(par, moves) };
}

describe('모의 플레이', () => {
  it('실력별로 모든 판을 깰 수 있고, 한 판은 30초~5분 안팎(끝 판은 더 김)', () => {
    const rows: string[] = [];
    let avgNormal = 0;
    let proPetals = 0;
    for (const [name, skill] of Object.entries(SKILLS)) {
      let total = 0;
      let petalSum = 0;
      let scoreSum = 0;
      const byTier: number[][] = [[], [], [], []];
      for (let i = 0; i < LEVELS.length; i++) {
        const runs = Array.from({ length: 12 }, (_, k) => play(i, skill, i * 100 + k + 1));
        expect(runs.every((r) => r.solved)).toBe(true);
        const sec = runs.reduce((n, r) => n + r.seconds, 0) / runs.length;
        byTier[Math.floor(i / 6)].push(sec);
        total += sec;
        petalSum += runs.reduce((n, r) => n + r.petals, 0) / runs.length;
        scoreSum += runs.reduce((n, r) => n + r.score, 0) / runs.length;
      }
      const avg = (l: number[]) => Math.round(l.reduce((a, b) => a + b, 0) / l.length);
      rows.push(
        `${name}: 판 평균 ${Math.round(total / 24)}초 (정원 1~6 ${avg(byTier[0])} · 7~12 ${avg(byTier[1])} · 13~18 ${avg(byTier[2])} · 19~24 ${avg(byTier[3])}초), 24판 ${Math.round(total / 60)}분, 꽃잎 ${petalSum.toFixed(0)}/72, 정원 점수 ${Math.round(scoreSum)}`,
      );
      if (name === '보통') avgNormal = total / 24;
      if (name === '고수') proPetals = petalSum;
    }
    console.log(rows.join('\n'));
    // v0.10.0 끝 판을 v0.9.0 보다 2배쯤 어렵게(사용자 요청) 해 보통 판 평균 3분 → 5분 안
    expect(avgNormal).toBeLessThan(300);
    expect(proPetals).toBeGreaterThan(50);
  }, 300_000);
});
