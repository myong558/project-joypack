import { describe, expect, it } from 'vitest';
import {
  RANK_SIZE,
  boardEntries,
  cleanName,
  emptyPending,
  emptyRankings,
  insertEntry,
  isValidName,
  keepPending,
  pendingScore,
  placeOf,
  register,
  sanitizeRankings,
  type RankEntry,
} from '../src/ranking';

const entry = (name: string, score: number, date = '2026-10-21'): RankEntry => ({ name, score, date });
const full = () => Array.from({ length: RANK_SIZE }, (_, i) => entry('AAA', 1000 - i * 100));

describe('이름', () => {
  it('소문자는 대문자로 바꾸고 A–Z가 아닌 글자는 버리며 5자까지만', () => {
    expect(cleanName('ab c1d가ef')).toBe('ABCDE');
    expect(cleanName('kim')).toBe('KIM');
  });

  it('A–Z 1~5자만 올바른 이름', () => {
    expect(['A', 'ABCDE'].map(isValidName)).toEqual([true, true]);
    expect(['', 'ABCDEF', 'abc', 'AB1'].map(isValidName)).toEqual([false, false, false, false]);
  });
});

describe('placeOf', () => {
  it('높은 점수 순으로 자리를 찾고, 같은 점수는 기존 기록 뒤', () => {
    const list = [entry('A', 500), entry('B', 300), entry('C', 300), entry('D', 100)];
    expect(placeOf(list, 600)).toBe(0);
    expect(placeOf(list, 300)).toBe(3);
    expect(placeOf(list, 50)).toBe(4);
  });

  it('0점은 등록하지 않는다', () => {
    expect(placeOf([], 0)).toBe(-1);
  });

  it('10칸이 차면 10위보다 높아야 들어간다(같은 점수는 기존 우선)', () => {
    expect(placeOf(full(), 100)).toBe(-1);
    expect(placeOf(full(), 101)).toBe(9);
  });
});

describe('insertEntry', () => {
  it('끼워 넣고 최하위를 지운다', () => {
    const list = full();
    expect(insertEntry(list, entry('NEW', 950))).toBe(1);
    expect(list).toHaveLength(RANK_SIZE);
    expect(list[1].name).toBe('NEW');
    expect(list.at(-1)!.score).toBe(200);
  });

  it('못 들어가면 그대로 둔다', () => {
    const list = full();
    expect(insertEntry(list, entry('NEW', 100))).toBe(-1);
    expect(list).toEqual(full());
  });
});

describe('오늘의 챌린지 순위', () => {
  it('날짜가 바뀌면 빈 순위표로 보고, 등록하면 새로 시작한다', () => {
    const r = emptyRankings();
    register(r, 'daily', '2026-10-20', entry('OLD', 900, '2026-10-20'));
    expect(boardEntries(r, 'daily', '2026-10-20')).toHaveLength(1);
    expect(boardEntries(r, 'daily', '2026-10-21')).toEqual([]);
    expect(register(r, 'daily', '2026-10-21', entry('NEW', 10))).toBe(0);
    expect(r.daily).toEqual({ date: '2026-10-21', entries: [entry('NEW', 10)] });
  });

  it('클래식 순위는 날짜와 상관없이 남는다', () => {
    const r = emptyRankings();
    register(r, 'classic', '2026-10-20', entry('A', 500, '2026-10-20'));
    expect(boardEntries(r, 'classic', '2026-12-31')).toHaveLength(1);
  });
});

describe('등록 대기', () => {
  it('더 높은 점수만 남기고, 날짜가 지난 오늘의 챌린지 기록은 버린다', () => {
    const r = emptyRankings();
    const p = emptyPending();
    keepPending(p, 'classic', '2026-10-21', 500);
    keepPending(p, 'classic', '2026-10-21', 300);
    expect(pendingScore(r, p, 'classic', '2026-10-21')).toBe(500);
    keepPending(p, 'daily', '2026-10-20', 700);
    expect(pendingScore(r, p, 'daily', '2026-10-20')).toBe(700);
    expect(pendingScore(r, p, 'daily', '2026-10-21')).toBe(0);
  });

  it('그사이 순위표가 차서 10위 안에 못 들면 보이지 않는다', () => {
    const r = emptyRankings();
    r.classic = full();
    const p = emptyPending();
    keepPending(p, 'classic', '2026-10-21', 100);
    expect(pendingScore(r, p, 'classic', '2026-10-21')).toBe(0);
  });
});

describe('sanitizeRankings', () => {
  it('깨진 값은 버리고 점수 순으로 10개까지', () => {
    const r = sanitizeRankings({ classic: [entry('B', 1), { name: 'bad', score: 5, date: '' }, entry('A', 9), null] });
    expect(r.classic.map((e) => e.name)).toEqual(['A', 'B']);
    expect(sanitizeRankings(undefined)).toEqual(emptyRankings());
  });
});
