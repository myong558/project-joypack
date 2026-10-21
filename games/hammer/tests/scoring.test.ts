import { describe, expect, it } from 'vitest';
import { emptyStats } from '../src/game/engine';
import { comboMultiplier, gradeFor, nextGoal, pointsFor, shouldStartFever, starsFor } from '../src/game/scoring';
import type { MoleKind } from '../src/game/types';

const plain = { fever: false, lastSpurt: false };

describe('comboMultiplier', () => {
  it('0–4콤보 x1, 5–9콤보 x2, 10콤보 이상 x3', () => {
    expect([0, 1, 4].map(comboMultiplier)).toEqual([1, 1, 1]);
    expect([5, 9].map(comboMultiplier)).toEqual([2, 2]);
    expect([10, 50].map(comboMultiplier)).toEqual([3, 3]);
  });
});

describe('pointsFor', () => {
  it('콤보 배율을 곱한다', () => {
    expect(pointsFor(10, 1, plain)).toBe(10);
    expect(pointsFor(10, 5, plain)).toBe(20);
    expect(pointsFor(30, 12, plain)).toBe(90);
  });

  it('피버 x2, 라스트 스퍼트 x1.5가 겹친다', () => {
    expect(pointsFor(10, 1, { fever: true, lastSpurt: false })).toBe(20);
    expect(pointsFor(10, 1, { fever: false, lastSpurt: true })).toBe(15);
    expect(pointsFor(10, 10, { fever: true, lastSpurt: true })).toBe(90);
  });

  it('감점에는 배율을 적용하지 않는다', () => {
    expect(pointsFor(-20, 12, { fever: true, lastSpurt: true })).toBe(-20);
  });
});

describe('shouldStartFever', () => {
  it('15콤보마다, 피버 중이 아닐 때만', () => {
    expect(shouldStartFever(14, false)).toBe(false);
    expect(shouldStartFever(15, false)).toBe(true);
    expect(shouldStartFever(15, true)).toBe(false);
    expect(shouldStartFever(30, false)).toBe(true);
  });
});

describe('평가', () => {
  it('등급 구간', () => {
    expect(gradeFor(0)).toBe('C');
    expect(gradeFor(599)).toBe('C');
    expect(gradeFor(600)).toBe('B');
    expect(gradeFor(1000)).toBe('A');
    expect(gradeFor(1500)).toBe('S');
  });

  it('별: 점수 · 미션 · 노미스', () => {
    const stats = emptyStats();
    expect(starsFor(600, true, stats)).toEqual([true, true, true]);
    stats.bombs = 1;
    expect(starsFor(599, false, stats)).toEqual([false, false, false]);
    stats.bombs = 0;
    stats.missed = 6;
    expect(starsFor(700, false, stats)[2]).toBe(false);
  });
});

describe('nextGoal', () => {
  const all = new Set<MoleKind>(['normal', 'golden', 'helmet', 'swift', 'bomb', 'clock', 'ice', 'king']);

  it('첫 판과 신기록', () => {
    expect(nextGoal(300, 0, all)).toEqual({ type: 'first' });
    expect(nextGoal(500, 400, all)).toEqual({ type: 'record', diff: 100 });
  });

  it('신기록에 가까우면 남은 점수를, 멀면 못 잡은 두더지를 알려 준다', () => {
    expect(nextGoal(900, 1000, new Set(['normal']))).toEqual({ type: 'gap', gap: 101 });
    expect(nextGoal(100, 1000, new Set(['normal']))).toEqual({ type: 'missing', kind: 'golden' });
    expect(nextGoal(100, 1000, all)).toEqual({ type: 'gap', gap: 901 });
  });
});
