import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/engine';
import { mulberry32 } from '../src/game/rng';

/**
 * 모의 플레이로 시간 규칙(stages.ts)을 맞춘다. 사람처럼 본 카드를 일정 확률로만 기억하고,
 * 한 장 뒤집는 데 일정 시간이 걸리는 봇이다. "보통 실력이면 4~6판, 1~3분"이 목표
 */
function simulate(seed: number, memory: number, flipMs: number) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const game = new Game(mulberry32(seed));
  let elapsed = 0;
  let known = new Map<number, string>();
  game.on((e) => {
    if (e.type === 'deal') known = new Map();
    if (e.type === 'flip' && rng() < memory) known.set(e.card.index, e.card.key);
  });
  game.start();
  const step = (ms: number) => {
    game.tick(ms);
    elapsed += ms;
  };
  const down = (i: number) => game.cards[i].state === 'down';
  for (let guard = 0; guard < 5000 && game.phase !== 'over'; guard++) {
    if (game.phase !== 'playing') {
      step(game.phase === 'peek' ? game.phaseLeft : 100);
      continue;
    }
    const pick = () => {
      // 기억 속에 짝이 둘 다 있으면 그 둘
      const byKey = new Map<string, number[]>();
      for (const [i, k] of known) if (down(i)) byKey.set(k, [...(byKey.get(k) ?? []), i]);
      const pair = [...byKey.values()].find((v) => v.length === 2);
      if (pair) return pair;
      const unknown = game.cards.filter((c) => c.state === 'down' && !known.has(c.index));
      const a = (unknown[0] ?? game.cards.find((c) => c.state === 'down'))!.index;
      return [a];
    };
    const [a, b0] = pick();
    game.flip(a);
    step(flipMs);
    if (game.phase !== 'playing') continue;
    const key = game.cards[a].key;
    const mate = [...known].find(([i, k]) => i !== a && k === key && down(i))?.[0];
    const b = b0 ?? mate ?? game.cards.find((c) => c.state === 'down' && !known.has(c.index))?.index ?? game.cards.find((c) => c.state === 'down')!.index;
    game.flip(b);
    step(flipMs);
  }
  return { stage: game.stage, seconds: elapsed / 1000, score: game.score };
}

function average(memory: number, flipMs: number) {
  const runs = Array.from({ length: 60 }, (_, i) => simulate(i + 1, memory, flipMs));
  const avg = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
  return { stage: avg((r) => r.stage), seconds: avg((r) => r.seconds), score: avg((r) => r.score) };
}

describe('밸런스(모의 플레이)', () => {
  it('보통 실력은 4~6판, 1~3분 안에 끝난다', () => {
    const normal = average(0.7, 700);
    console.log('보통', normal);
    expect(normal.stage).toBeGreaterThanOrEqual(4);
    expect(normal.stage).toBeLessThanOrEqual(6.5);
    expect(normal.seconds).toBeGreaterThan(60);
    expect(normal.seconds).toBeLessThan(180);
  });

  it('잘하는 사람은 더 멀리 가지만 끝없이 이어지지는 않는다', () => {
    const good = average(0.9, 550);
    const casual = average(0.5, 850);
    console.log('잘함', good, '서툼', casual);
    expect(good.stage).toBeGreaterThan(casual.stage);
    expect(good.seconds).toBeLessThan(420);
    expect(casual.stage).toBeGreaterThanOrEqual(2);
  });
});
