import { describe, expect, it } from 'vitest';
import { SCORE_MAX, cleanName, insertEntry, pendingRecord, placeOf, sanitizeEntries, type RankEntry } from '../src/ranking';
import { LEVELS } from '../src/game/levels';

const e = (name: string, score: number): RankEntry => ({ name, score, flowers: 3, date: '2026-10-25' });

describe('정원 점수 순위표', () => {
  it('같은 점수는 먼저 올린 기록이 앞선다', () => {
    const list = [e('AAA', 900), e('BBB', 500)];
    expect(placeOf(list, 500)).toBe(2);
    expect(placeOf(list, 501)).toBe(1);
  });

  it('같은 이름은 더 높은 점수 한 줄만 남는다', () => {
    const list = [e('AAA', 900), e('BBB', 500)];
    expect(insertEntry(list, e('BBB', 950))).toBe(0);
    expect(list.map((x) => x.name)).toEqual(['BBB', 'AAA']);
    expect(insertEntry(list, e('BBB', 700))).toBe(-1);
  });

  it('10위까지만', () => {
    const list = Array.from({ length: 10 }, (_, i) => e(`N${'ABCDEFGHIJ'[i]}`, 1000 - i));
    expect(insertEntry(list, e('ZZ', 5))).toBe(-1);
    expect(insertEntry(list, e('ZZ', 2000))).toBe(0);
    expect(list).toHaveLength(10);
  });

  it('대기 기록은 아직 10위 안일 때만', () => {
    const list = Array.from({ length: 10 }, (_, i) => e(`N${'ABCDEFGHIJ'[i]}`, 1000 - i));
    expect(pendingRecord(list, { score: 10, flowers: 1 })).toBeNull();
    expect(pendingRecord(list, { score: 5000, flowers: 4 })).toEqual({ score: 5000, flowers: 4 });
  });

  it('이름은 영문 대문자 5자, 점수 상한은 판 수 × 1000', () => {
    expect(cleanName('ab-c12defg')).toBe('ABCDE');
    expect(SCORE_MAX).toBe(LEVELS.length * 1000);
    expect(sanitizeEntries([e('OK', 100), { ...e('BAD', SCORE_MAX + 10) }, { name: 'x', score: 1 }])).toHaveLength(1);
  });
});
