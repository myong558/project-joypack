import { describe, expect, it } from 'vitest';
import { dateKey, dateSeed, mulberry32 } from '../src/game/rng';

describe('mulberry32', () => {
  it('같은 시드면 같은 수열', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 20 }, a);
    expect(Array.from({ length: 20 }, b)).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('다른 시드면 다른 수열', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('오늘의 챌린지 시드', () => {
  it('같은 날짜면 시각과 관계없이 같은 시드', () => {
    expect(dateSeed(new Date(2026, 9, 19, 0, 1))).toBe(dateSeed(new Date(2026, 9, 19, 23, 59)));
  });

  it('날짜가 다르면 다른 시드', () => {
    expect(dateSeed(new Date(2026, 9, 19))).not.toBe(dateSeed(new Date(2026, 9, 20)));
  });

  it('dateKey는 YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
