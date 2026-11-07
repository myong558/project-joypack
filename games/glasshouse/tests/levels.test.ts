import { describe, expect, it } from 'vitest';
import { FLOWER, FLOWERS } from '../src/flora';
import { LEVELS, speciesFor } from '../src/game/levels';
import { hasFreePot } from '../src/game/roomgen';
import { lit, parse, solved, step } from '../src/game/rules';
import { SOLUTIONS } from '../src/game/solutions';
import { explore, solve } from '../src/game/solver';

/** 판마다: 풀리고, 기준 이동 수가 맞고, 처음엔 햇살 자리에 화분이 없고, 뒤로 갈수록 화분이 많다 */
describe('정원 24개', () => {
  it('판 수와 꽃이 맞물린다', () => {
    expect(LEVELS).toHaveLength(24);
    expect(SOLUTIONS).toHaveLength(24);
    expect(LEVELS.map((l) => l.flower)).toEqual(FLOWERS.map((f) => f.id));
  });

  it('뒤로 갈수록 화분이 늘어난다(1~6 화분 1~2 · 7~8 2 · 9~14 3 · 15~20 4 · 21~24 5)', () => {
    const pots = LEVELS.map((l) => parse(l.rows).start.pots.length);
    for (let i = 1; i < 24; i++) expect(pots[i]).toBeGreaterThanOrEqual(pots[i - 1]);
    expect(pots[0]).toBe(1);
    expect(pots[8]).toBe(3);
    expect(pots[14]).toBe(4);
    expect(pots[23]).toBe(5);
  });

  LEVELS.forEach((lv, i) => {
    it(`${i + 1}. ${FLOWER[lv.flower].ko.name}`, () => {
      const { board, start } = parse(lv.rows);
      const graph = explore(board, start, 2_000_000)!;
      const sol = solve(board, start, graph)!;
      expect(sol.moves).toBe(lv.par);
      expect(lit(board, start.pots).some(Boolean)).toBe(false);
      // 공짜 화분(한 방향 1~2번 밀면 들어가고 언제 넣어도 안 막혀 다른 화분과 안 얽힘) 없음. 3판까지는 규칙 배우는 판이라 둠
      if (i >= 3) expect(hasFreePot(board, graph, sol.path)).toBe(false);
      // 화분 모두 그 판의 꽃 한 종(그 꽃이 도감에 열림)
      expect(speciesFor(i, start.pots.length)).toEqual(start.pots.map(() => lv.flower));
      // 칸 100개까지(상태 번호 규칙: 칸 번호 0~99)
      expect(board.w * board.h).toBeLessThanOrEqual(100);
      // TEST 풀이 보기의 미리 적은 풀이: 기준 이동 수 그대로 그 판을 깸(판을 바꾸면 pnpm --filter glasshouse solutions)
      expect(SOLUTIONS[i]).toHaveLength(lv.par);
      let s = start;
      for (const c of SOLUTIONS[i]) s = step(board, s, 'URDL'.indexOf(c) as 0 | 1 | 2 | 3).state;
      expect(solved(board, s.pots)).toBe(true);
    });
  });
});
