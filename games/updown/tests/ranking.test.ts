import { describe, expect, it } from 'vitest';
import { insertEntry, keepPending, pendingRecord, placeOf, sanitizeEntries, sanitizePending, type Pending, type RankEntry } from '../src/ranking';

const entry = (name: string, score: number, extra: Partial<RankEntry> = {}): RankEntry => ({ name, score, tries: 5, time: 10_000, date: '2026-11-05', ...extra });

describe('업다운 순위표(공통 순위표 문서 방식)', () => {
  it('점수 높은 순, 같은 점수는 먼저 올린 기록이 위(새 기록은 그 뒤)', () => {
    const list = [entry('AAA', 900), entry('BBB', 800)];
    expect(insertEntry(list, entry('CCC', 800))).toBe(2);
    expect(insertEntry(list, entry('DDD', 950))).toBe(0);
    expect(list.map((e) => e.name)).toEqual(['DDD', 'AAA', 'BBB', 'CCC']);
  });

  it('10위까지만, 꽉 차면 10위보다 높아야 들고 0점은 못 든다', () => {
    const list = Array.from({ length: 10 }, (_, i) => entry('A', 1000 - i * 10));
    expect(placeOf(list, 910)).toBe(-1);
    expect(placeOf(list, 911)).toBe(9);
    expect(insertEntry(list, entry('NEW', 2000))).toBe(0);
    expect(list).toHaveLength(10);
    expect(placeOf([], 0)).toBe(-1);
  });

  it('깨진 저장 값은 버리고 고친다', () => {
    const raw = [entry('OK', 500, { thermo: true, dev: 'm' }), { name: 'bad', score: 1 }, entry('LOW', 900, { dev: 'x' as 'm' }), null];
    const clean = sanitizeEntries(raw);
    expect(clean.map((e) => e.name)).toEqual(['LOW', 'OK']);
    expect(clean[0]).not.toHaveProperty('dev');
    expect(clean[1]).toMatchObject({ thermo: true, dev: 'm' });
  });

  it('등록 대기: 범위마다 가장 좋은 하나, 10위 밖이면 보이지 않음(예전 updown.pending2 형식 그대로)', () => {
    const pending: Pending = sanitizePending({ 100: { score: 700, tries: 6, time: 20000, thermo: false }, 999: { score: 1 } });
    expect(Object.keys(pending)).toEqual(['100']);
    keepPending(pending, 100, { score: 600, tries: 7, time: 1, thermo: false });
    expect(pending[100]!.score).toBe(700);
    keepPending(pending, 100, { score: 800, tries: 4, time: 1, thermo: true });
    expect(pending[100]!.score).toBe(800);
    const full = Array.from({ length: 10 }, () => entry('A', 900));
    expect(pendingRecord(full, pending, 100)).toBeNull();
    expect(pendingRecord([], pending, 100)).toMatchObject({ score: 800 });
  });
});
