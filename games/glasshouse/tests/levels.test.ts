import { describe, expect, it } from 'vitest';
import { FLOWER, FLOWERS } from '../src/flora';
import { LEVELS, speciesFor } from '../src/game/levels';
import { lit, parse } from '../src/game/rules';
import { explore, solve } from '../src/game/solver';

/** 판마다: 풀리고, 기준 이동 수가 맞고, 처음엔 햇살 자리에 화분이 없고, 뒤로 갈수록 화분이 많다 */
describe('정원 24개', () => {
  it('판 수와 꽃이 맞물린다', () => {
    expect(LEVELS).toHaveLength(24);
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
      const sol = solve(board, start, explore(board, start, 2_000_000)!)!;
      expect(sol.moves).toBe(lv.par);
      expect(lit(board, start.pots).some(Boolean)).toBe(false);
      // 화분 모두 그 판의 꽃 한 종(그 꽃이 도감에 열림)
      expect(speciesFor(i, start.pots.length)).toEqual(start.pots.map(() => lv.flower));
      // 칸 100개까지(상태 번호 규칙: 칸 번호 0~99)
      expect(board.w * board.h).toBeLessThanOrEqual(100);
    });
  });
});
