import { describe, expect, it } from 'vitest';
import { clampMax, createGame, guess, luckTier, optimalTries, score, thermoCost, thermoStatus, useThermo } from '../src/game/rules';

describe('업다운 규칙', () => {
  it('정석 횟수: 1~50 6번, 1~100 7번, 1~200 8번(Firestore 규칙의 표와 같다)', () => {
    expect([50, 100, 200].map(optimalTries)).toEqual([6, 7, 8]);
  });

  it('점수 = 1000 + 100 × (정석 − 시도) − 0.1초마다 1점 − 온도계 차감, 0점 아래는 없음', () => {
    expect(score(100, 7, 0)).toBe(1000);
    expect(score(100, 5, 12_345)).toBe(1000 + 200 - 123);
    expect(score(100, 7, 0, 300)).toBe(700);
    expect(score(50, 50, 600_000)).toBe(0);
  });

  it('추측하면 범위가 좁혀지고, 맞히면 끝난다', () => {
    const g = createGame(100, () => 0.42); // 정답 43
    expect(g.answer).toBe(43);
    expect(guess(g, 50)).toMatchObject({ ok: true, result: 'DOWN' });
    expect([g.low, g.high]).toEqual([1, 49]);
    expect(guess(g, 10)).toMatchObject({ ok: true, result: 'UP' });
    expect([g.low, g.high]).toEqual([11, 49]);
    expect(guess(g, 60)).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
    expect(guess(g, 43)).toMatchObject({ ok: true, result: 'CORRECT' });
    expect(g.status).toBe('won');
    expect(guess(g, 43)).toEqual({ ok: false, error: 'FINISHED' });
  });

  it('직접 정하기는 연습 판(랭킹 없음), 끝 숫자는 10 ~ 9999', () => {
    expect(createGame(345).ranked).toBe(false);
    expect(createGame(100, Math.random, true).ranked).toBe(false);
    expect(createGame(200).ranked).toBe(true);
    expect([clampMax(3), clampMax(20000), clampMax('abc')]).toEqual([10, 9999, 100]);
  });

  it('온도계: 한 판에 한 번, 넣은 숫자가 있어야 하고 남은 숫자가 10% 이하면 못 씀, 연습 판은 차감 없음', () => {
    const g = createGame(100, () => 0.42);
    expect(thermoStatus(g)).toBe('noGuess');
    guess(g, 50);
    expect(useThermo(g)).toMatchObject({ ok: true, cost: 300 });
    expect(thermoStatus(g)).toBe('used');
    const small = createGame(50, () => 0.5);
    expect(thermoCost(small)).toBe(250);
    expect(thermoCost(createGame(100, Math.random, true))).toBe(0);
    const near = createGame(100, () => 0.42);
    guess(near, 50);
    guess(near, 40); // 41 ~ 49 남음(9개 ≤ 10)
    expect(thermoStatus(near)).toBe('tooFew');
  });

  it('운 문구 단계: 한 번에 맞히면 miracle, 정석과 비교해 나눈다', () => {
    expect(luckTier(100, 1)).toBe('miracle');
    expect(luckTier(100, 4)).toBe('jackpot');
    expect(luckTier(100, 6)).toBe('lucky');
    expect(luckTier(100, 7)).toBe('par');
    expect(luckTier(100, 9)).toBe('meh');
    expect(luckTier(100, 10)).toBe('flop');
  });
});
