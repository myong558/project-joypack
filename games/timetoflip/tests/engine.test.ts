import { describe, expect, it } from 'vitest';
import { Game, buildCards, type GameEvent } from '../src/game/engine';
import { mulberry32 } from '../src/game/rng';
import { DEAL_MS, MAX_MS, MIN_GAIN_RATE, START_MS, comboMultiplier, stageDef } from '../src/game/stages';

function setup(seed = 1) {
  const game = new Game(mulberry32(seed));
  const events: GameEvent[] = [];
  game.on((e) => events.push(e));
  game.start();
  // 카드가 다 깔릴 때까지(그 전의 누름은 무시된다)
  game.tick(DEAL_MS);
  return { game, events };
}

/** 같은 key 를 가진 두 자리 */
function pairOf(game: Game, key: string): [number, number] {
  const [a, b] = game.cards.filter((c) => c.key === key).map((c) => c.index);
  return [a, b];
}

/** 서로 짝이 아닌 두 자리 */
function wrongPair(game: Game): [number, number] {
  const a = game.cards.find((c) => c.state === 'down')!;
  const b = game.cards.find((c) => c.state === 'down' && c.key !== a.key)!;
  return [a.index, b.index];
}

function clearStage(game: Game): void {
  for (const key of new Set(game.cards.filter((c) => c.state === 'down').map((c) => c.key))) {
    const [a, b] = pairOf(game, key);
    game.flip(a);
    game.flip(b);
  }
}

describe('판 구성', () => {
  it('판마다 정해진 짝 수만큼 두 장씩 놓는다', () => {
    for (let stage = 1; stage <= 9; stage++) {
      const def = stageDef(stage);
      const cards = buildCards(stage, def, mulberry32(stage));
      expect(cards).toHaveLength(def.pairs * 2);
      expect(def.cols * def.rows).toBe(cards.length);
      const counts = new Map<string, number>();
      cards.forEach((c) => counts.set(c.key, (counts.get(c.key) ?? 0) + 1));
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(cards.filter((c) => c.twin).length).toBe(def.twins * 2);
    }
  });

  it('1판은 특수·황금 카드 없이 과일만', () => {
    for (let seed = 1; seed < 30; seed++) {
      const cards = buildCards(1, stageDef(1), mulberry32(seed));
      expect(cards.some((c) => c.special || c.gold)).toBe(false);
    }
  });

  it('같은 시드면 같은 판(오늘의 챌린지)', () => {
    const a = buildCards(4, stageDef(4), mulberry32(42)).map((c) => c.key);
    const b = buildCards(4, stageDef(4), mulberry32(42)).map((c) => c.key);
    expect(a).toEqual(b);
  });

  it('오늘의 챌린지: 위치 난수만 바꾸면 같은 카드가 다른 자리에 놓인다', () => {
    const a = buildCards(4, stageDef(4), mulberry32(42), mulberry32(1)).map((c) => c.key);
    const b = buildCards(4, stageDef(4), mulberry32(42), mulberry32(2)).map((c) => c.key);
    expect([...a].sort()).toEqual([...b].sort());
    expect(a).not.toEqual(b);
  });
});

describe('뒤집기', () => {
  it('미리 보기 중에는 시간이 흐르지 않고, 누르면 건너뛰고 바로 뒤집는다', () => {
    const { game, events } = setup();
    expect(game.phase).toBe('peek');
    game.tick(500);
    expect(game.remaining).toBe(START_MS);
    game.flip(0);
    expect(game.phase).toBe('playing');
    expect(events.some((e) => e.type === 'peekEnd')).toBe(true);
    expect(game.cards[0].state).toBe('up');
  });

  it('카드가 깔리는 동안의 누름은 무시하고 미리 보기를 이어 간다', () => {
    const game = new Game(mulberry32(1));
    game.start();
    game.tick(DEAL_MS - 100);
    game.flip(0);
    expect(game.phase).toBe('peek');
    expect(game.cards[0].state).toBe('down');
  });

  it('미리 보기는 판이 올라도 짧아지지 않고(높은 판 2.6초 이상), 카드 한 장에 주는 시간은 줄어든다', () => {
    const perCard = (n: number) => stageDef(n).viewMs / (stageDef(n).pairs * 2);
    for (let n = 1; n <= 9; n++) {
      const def = stageDef(n);
      expect(def.viewMs).toBeGreaterThanOrEqual(2000);
      if (n >= 6) expect(def.viewMs).toBeGreaterThanOrEqual(2600);
      expect(def.peekMs).toBe(DEAL_MS + def.viewMs);
    }
    // 닮은 카드가 처음 나오는 5판만 조금 더 주고, 큰 흐름은 1판 → 4판 → 6판 → 8판으로 줄어든다
    expect(perCard(4)).toBeLessThan(perCard(1));
    expect(perCard(6)).toBeLessThan(perCard(4));
    expect(perCard(8)).toBeLessThan(perCard(6));
  });

  it('9판부터 얻는 시간 비율이 판마다 10%씩 줄어 15판에서 30%로 멈춘다', () => {
    expect(stageDef(8).gainRate).toBe(1);
    expect(stageDef(9).gainRate).toBe(0.9);
    expect(stageDef(12).gainRate).toBe(0.6);
    expect(stageDef(15).gainRate).toBe(MIN_GAIN_RATE);
    expect(stageDef(40).gainRate).toBe(MIN_GAIN_RATE);
    expect(stageDef(40).matchGain).toBe(stageDef(8).matchGain);
  });

  it('짝을 맞히면 점수·시간이 오르고 콤보가 쌓인다', () => {
    const { game } = setup();
    game.tick(2000);
    const key = game.cards[0].key;
    const [a, b] = pairOf(game, key);
    game.flip(a);
    game.flip(b);
    expect(game.cards[a].state).toBe('gone');
    expect(game.combo).toBe(1);
    expect(game.score).toBeGreaterThan(0);
    expect(game.remaining).toBe(START_MS + stageDef(1).matchGain);
  });

  it('틀린 두 장은 잠시 뒤 덮이고, 그 전에 다른 카드를 누르면 바로 덮인다', () => {
    const { game, events } = setup();
    game.tick(2000);
    const [a, b] = wrongPair(game);
    game.flip(a);
    game.flip(b);
    expect(game.cards[a].state).toBe('up');
    const c = game.cards.find((x) => x.state === 'down')!.index;
    game.flip(c);
    expect(game.cards[a].state).toBe('down');
    expect(game.cards[c].state).toBe('up');
    expect(events.filter((e) => e.type === 'hide')).toHaveLength(1);
  });

  it('1판에서는 기억 실수로 시간을 깎지 않는다', () => {
    const { game } = setup();
    game.tick(2000);
    const [a, b] = wrongPair(game);
    game.flip(a);
    game.flip(b);
    const before = game.remaining;
    // a 의 짝 자리를 아직 모르므로, 같은 카드를 다시 뒤집어도 짝이 보인 적 없음 → 실수 아님
    game.flip(b);
    const other = game.cards.find((x) => x.state === 'down' && x.key !== game.cards[b].key)!;
    game.flip(other.index);
    expect(game.remaining).toBe(before);
  });

  it('2판부터는 짝을 이미 봤는데 엉뚱한 카드를 뒤집으면 1초를 깎는다', () => {
    const { game, events } = setup();
    game.flip(0);
    game.flip(pairOf(game, game.cards[0].key)[1]);
    clearStage(game);
    game.tick(2000); // 판 사이 쉬는 시간
    expect(game.stage).toBe(2);
    game.tick(5000); // 미리 보기
    const x = game.cards.find((c) => !c.special)!;
    const [xa, xb] = pairOf(game, x.key);
    const other = () => game.cards.find((c) => c.state === 'down' && c.key !== x.key && !c.seen)!.index;
    // xb 를 먼저 봐 두고(탐색이라 깎지 않음)
    game.flip(xb);
    game.flip(other());
    const before = game.remaining;
    // 이제 xa 를 뒤집고 짝(xb)이 아닌 다른 카드를 고르면 기억 실수
    game.flip(xa);
    game.flip(other());
    const miss = events.filter((e) => e.type === 'mismatch').pop();
    expect(miss && miss.type === 'mismatch' && miss.mistake).toBe(true);
    expect(game.remaining).toBe(before - 1000);
  });

  it('판을 다 맞히면 보너스와 시간을 받고 다음 판으로 간다(시간은 최대치까지)', () => {
    const { game, events } = setup();
    clearStage(game);
    const clear = events.find((e) => e.type === 'stageClear');
    expect(clear && clear.type === 'stageClear' && clear.perfect).toBe(true);
    expect(game.phase).toBe('clear');
    expect(game.remaining).toBeLessThanOrEqual(MAX_MS);
    game.tick(1200);
    expect(game.stage).toBe(2);
    expect(game.phase).toBe('peek');
  });

  it('시간이 다 되면 끝나고 결과를 낸다', () => {
    const { game, events } = setup();
    game.flip(0);
    game.tick(START_MS + 10);
    expect(game.phase).toBe('over');
    const over = events.find((e) => e.type === 'over');
    expect(over && over.type === 'over' && over.result.stage).toBe(1);
  });

  it('일시 정지 동안에는 시간이 흐르지 않는다', () => {
    const { game } = setup();
    game.flip(0);
    game.pause();
    game.tick(10_000);
    expect(game.remaining).toBe(START_MS);
    game.resume();
    game.tick(1000);
    expect(game.remaining).toBe(START_MS - 1000);
  });
});

describe('점수', () => {
  it('콤보 배수는 0.5씩 올라 5배에서 멈춘다', () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1.5);
    expect(comboMultiplier(9)).toBe(5);
    expect(comboMultiplier(20)).toBe(5);
  });
});
