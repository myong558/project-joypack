import { describe, expect, it } from 'vitest';
import { FLOWER, FLOWERS } from '../src/flora';
import { LEVELS, seasonOf, speciesFor } from '../src/game/levels';
import { Tile, happy, light, parse, step } from '../src/game/rules';
import { explore, solve } from '../src/game/solver';

/** 판마다: 풀리고, 기준 이동 수가 맞고, 처음엔 맞는 화분이 없고, 그 계절 요소를 실제로 써야 깨진다 */
describe('정원 24개', () => {
  it('판 수와 꽃이 맞물린다', () => {
    expect(LEVELS).toHaveLength(24);
    expect(LEVELS.map((l) => l.flower)).toEqual(FLOWERS.map((f) => f.id));
  });

  LEVELS.forEach((lv, i) => {
    it(`${i + 1}. ${FLOWER[lv.flower].ko.name}`, () => {
      const { board, start } = parse(lv.rows);
      const graph = explore(board, start, 2_000_000)!;
      const sol = solve(board, start, graph)!;
      expect(sol.moves).toBe(lv.par);
      expect(happy(board, start.pots).some(Boolean)).toBe(false);
      // 그 판의 꽃과 습성이 같은 화분이 있다(그 꽃이 핀다)
      expect(speciesFor(i, board.habits)).toContain(lv.flower);
      // 칸 100개 미만(상태 번호 규칙)
      expect(board.w * board.h).toBeLessThan(100);
      // 계절 요소
      let s = start;
      let slid = false;
      for (const d of sol.path) {
        const r = step(board, s, d);
        slid ||= r.trail.length > 1;
        s = r.state;
      }
      const season = seasonOf(i);
      if (season === 'summer') expect(board.habits).toContain('moist');
      if (season === 'autumn') {
        const bent = light(board, s.pots).path.some(([c]) => board.tiles[c] === Tile.MirrorA || board.tiles[c] === Tile.MirrorB);
        expect(bent).toBe(true);
      }
      if (season === 'winter') expect(slid).toBe(true);
    });
  });
});
