import { describe, expect, it } from 'vitest';
import { DAILY, DAILY_START } from '../src/game/daily-data';
import { dailyLevel, dayIndex, seasonOfKey, unpack } from '../src/game/daily';
import { LEVELS, dailySpecies } from '../src/game/levels';
import { lit, parse } from '../src/game/rules';
import { explore, solve } from '../src/game/solver';
import { dailyAhead, insertDaily, placeOfDaily, sanitizeDaily, type DailyEntry } from '../src/ranking';

/** 오늘의 정원: 미리 만든 판 목록(tools/dailygen.ts)이 정해 둔 판과 같은 기준을 지키는지 */
describe('오늘의 정원 판', () => {
  it('2027년 끝까지 날마다 한 판(그 전에 목록을 늘린다)', () => {
    expect(DAILY_START <= '2026-10-25').toBe(true);
    expect(dayIndex('2027-12-31')).toBeLessThan(DAILY.length);
  });

  it('같은 판이 두 날 나오지 않는다', () => {
    expect(new Set(DAILY).size).toBe(DAILY.length);
  });

  it('모든 판: 칸 100개 미만, 처음엔 햇살 자리에 화분이 없고, 판 계절 = 그날 계절, 기준 이동 14~40', () => {
    DAILY.forEach((line, i) => {
      const { season, par, rows } = unpack(line);
      const date = new Date(2026, 9, 25 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      expect(season, key).toBe(seasonOfKey(key));
      expect(par).toBeGreaterThanOrEqual(14);
      expect(par).toBeLessThanOrEqual(40);
      const { board, start } = parse(rows);
      expect(board.w * board.h).toBeLessThan(100);
      expect(lit(board, start.pots).some(Boolean)).toBe(false);
    });
  });

  // 전부 풀면 오래 걸려 열흘에 하루씩 다시 푼다
  DAILY.filter((_, i) => i % 10 === 0).forEach((line, k) => {
    it(`${k * 10}일째 판을 다시 풀면 기준 이동 수가 같다`, () => {
      const { par, rows } = unpack(line);
      const { board, start } = parse(rows);
      const sol = solve(board, start, explore(board, start, 2_000_000)!)!;
      expect(sol.moves).toBe(par);
    });
  });

  it('같은 날짜면 같은 판, 목록 끝 뒤에는 처음부터 다시', () => {
    expect(dailyLevel('2026-11-03')).toEqual(dailyLevel('2026-11-03'));
    expect(dailyLevel('2026-11-03').rows).not.toEqual(dailyLevel('2026-11-04').rows);
    const after = new Date(2026, 9, 25 + DAILY.length);
    const key = `${after.getFullYear()}-${String(after.getMonth() + 1).padStart(2, '0')}-${String(after.getDate()).padStart(2, '0')}`;
    expect(dailyLevel(key).rows).toEqual(dailyLevel(DAILY_START).rows);
  });

  it('그날 꽃 한 종을 모든 화분에, 이미 연 꽃 가운데서', () => {
    const opened = (i: number) => i < 6 || i === 10;
    const ids = dailySpecies(3, 3, opened);
    expect(new Set(ids).size).toBe(1);
    const seen = new Set(LEVELS.filter((_, i) => opened(i)).map((l) => l.flower));
    ids.forEach((id) => expect(seen.has(id)).toBe(true));
    expect(dailySpecies(3, 4, opened)).not.toEqual(ids);
  });
});

describe('오늘의 정원 순위표', () => {
  const e = (name: string, moves: number, time: number): DailyEntry => ({ name, moves, time, date: '2026-10-25' });

  it('적은 이동이 앞, 같으면 짧은 시간이 앞, 둘 다 같으면 먼저 올린 기록이 앞', () => {
    const list = [e('AAA', 18, 40_000), e('BBB', 20, 30_000)];
    expect(placeOfDaily(list, { moves: 18, time: 39_000 })).toBe(0);
    expect(placeOfDaily(list, { moves: 18, time: 40_000 })).toBe(1);
    expect(placeOfDaily(list, { moves: 25, time: 1_000 })).toBe(2);
    expect(dailyAhead({ moves: 18, time: 1 }, { moves: 18, time: 1 })).toBe(false);
  });

  it('같은 이름은 가장 좋은 한 줄만', () => {
    const list = [e('AAA', 18, 40_000), e('BBB', 20, 30_000)];
    expect(insertDaily(list, e('BBB', 19, 90_000))).toBe(1);
    expect(list.map((x) => x.name)).toEqual(['AAA', 'BBB']);
    expect(insertDaily(list, e('BBB', 19, 95_000))).toBe(-1);
    expect(insertDaily(list, e('BBB', 17, 95_000))).toBe(0);
    expect(list).toHaveLength(2);
  });

  it('10위까지, 깨진 값은 버림', () => {
    const list = Array.from({ length: 10 }, (_, i) => e(`N${'ABCDEFGHIJ'[i]}`, 20 + i, 30_000));
    expect(insertDaily(list, e('ZZ', 40, 1_000))).toBe(-1);
    expect(insertDaily(list, e('ZZ', 15, 1_000))).toBe(0);
    expect(list).toHaveLength(10);
    expect(sanitizeDaily([e('OK', 18, 1000), { ...e('BAD', 0, 1000) }, { name: 'x', moves: 3 }])).toHaveLength(1);
  });
});
