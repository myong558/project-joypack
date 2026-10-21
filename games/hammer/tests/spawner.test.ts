import { describe, expect, it } from 'vitest';
import { COUNTDOWN, DEBUT_GAP, DURATION, GOLDEN_PITY, EMERGE_RISE, Game, PEEK_FROM } from '../src/game/engine';
import { mulberry32 } from '../src/game/rng';
import { FEVER_COMBO } from '../src/game/scoring';
import { FEVER_SEGMENT, SEGMENTS, neighbors, pickKind, segmentIndexAt } from '../src/game/spawner';
import type { GameEvent, MoleKind } from '../src/game/types';

/** 정해진 값을 차례로 돌려주는 난수. 다 쓰면 마지막 값을 반복 */
function seq(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/** 아무것도 치지 않고 한 판을 끝까지 돌린 등장 기록(왕 두더지 제외) */
function spawnLog(rng: () => number) {
  const { game } = playingGame(rng);
  const spawns: { kind: MoleKind; time: number }[] = [];
  game.on((e) => e.type === 'spawn' && e.mole.kind !== 'king' && spawns.push({ kind: e.mole.kind, time: game.time }));
  while (game.phase === 'playing') game.tick(50);
  return spawns;
}

function playingGame(rng = seq(0)) {
  const game = new Game(rng);
  const events: GameEvent[] = [];
  game.on((e) => events.push(e));
  game.start();
  game.tick(COUNTDOWN);
  return { game, events };
}

describe('구간', () => {
  it('진행 시간에 맞는 구간을 고른다', () => {
    expect(segmentIndexAt(0)).toBe(0);
    expect(segmentIndexAt(4_999)).toBe(0);
    expect(segmentIndexAt(5_000)).toBe(1);
    expect(segmentIndexAt(19_999)).toBe(2);
    expect(segmentIndexAt(25_000)).toBe(4);
    expect(SEGMENTS[4].id).toBe('spurt');
  });

  it('구간마다 가중치 합이 100이라 그대로 퍼센트다', () => {
    for (const seg of [...SEGMENTS, FEVER_SEGMENT]) {
      expect(Object.values(seg.weights).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
});

describe('pickKind', () => {
  it('가중치 구간대로 고른다', () => {
    const w = { normal: 80, golden: 20 };
    expect(pickKind(w, () => 0)).toBe('normal');
    expect(pickKind(w, () => 0.79)).toBe('normal');
    expect(pickKind(w, () => 0.8)).toBe('golden');
  });

  it('제외한 종류는 고르지 않는다', () => {
    expect(pickKind({ clock: 50, normal: 50 }, () => 0, ['clock'])).toBe('normal');
  });
});

describe('neighbors', () => {
  it('3×3 격자의 모서리·가운데', () => {
    expect(neighbors(0, 3)).toEqual([1, 3, 4]);
    expect(neighbors(4, 3)).toHaveLength(8);
    expect(neighbors(8, 3)).toEqual([4, 5, 7]);
  });
});

describe('Game', () => {
  it('3·2·1·GO! 동안은 시간이 흐르지 않고 두더지도 나오지 않으며, GO! 뒤 30초 만에 끝난다', () => {
    const game = new Game(seq(0));
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    game.start();
    expect(game.phase).toBe('countdown');
    for (let t = 0; t < COUNTDOWN - 100; t += 100) {
      game.tick(100);
      expect(game.moles).toHaveLength(0);
    }
    expect(game.phase).toBe('countdown');
    expect(game.time).toBe(0);
    game.tick(100);
    expect(game.phase).toBe('playing');
    expect(events.filter((e) => e.type === 'countdown').map((e) => (e as { n: number }).n)).toEqual([3, 2, 1, 0]);
    for (let t = 0; t < DURATION; t += 100) game.tick(100);
    expect(game.phase).toBe('over');
    expect(game.result).not.toBeNull();
  });

  it('워밍업에는 한 번에 한 마리만 나온다', () => {
    const { game } = playingGame();
    for (let t = 0; t < 4_000; t += 50) {
      game.tick(50);
      expect(game.moles.length).toBeLessThanOrEqual(1);
    }
  });

  it('헛치면 잠깐 경직되고 그동안의 타격은 무시된다', () => {
    const { game, events } = playingGame();
    game.place('normal', 0);
    game.hit(5);
    expect(events.at(-1)).toEqual({ type: 'whiff', hole: 5 });
    game.hit(0);
    expect(game.moles).toHaveLength(1);
    game.tick(300);
    game.hit(0);
    expect(game.score).toBe(10);
  });

  it('폭탄을 치면 감점되고 콤보가 끊긴다', () => {
    const { game } = playingGame();
    game.place('normal', 0);
    game.hit(0);
    game.place('normal', 1);
    game.hit(1);
    expect(game.combo).toBe(2);
    game.place('bomb', 2);
    game.hit(2);
    expect(game.combo).toBe(0);
    expect(game.score).toBe(0);
    expect(game.stats.bombs).toBe(1);
  });

  it('놓치면 콤보가 끊기고, 폭탄을 그냥 보내는 건 괜찮다', () => {
    const { game } = playingGame();
    game.place('normal', 0);
    game.hit(0);
    game.place('bomb', 4);
    game.tick(1_500);
    expect(game.combo).toBe(1);
    expect(game.stats.missed).toBe(0);
  });

  it('헬멧 두더지는 두 번 쳐야 쓰러진다', () => {
    const { game, events } = playingGame();
    game.place('helmet', 3);
    game.hit(3);
    expect(events.at(-1)?.type).toBe('damage');
    game.hit(3);
    expect(game.stats.kills.helmet).toBe(1);
    expect(game.score).toBe(25);
  });

  it('날쌘 두더지는 한 번 옆 구멍으로 옮겨 간다', () => {
    const { game, events } = playingGame();
    const mole = game.place('swift', 4)!;
    game.tick(mole.hideAt - game.time);
    const jump = events.find((e) => e.type === 'jump');
    expect(jump).toBeDefined();
    expect(mole.hole).not.toBe(4);
    expect(game.moles).toContain(mole);
  });

  it('시계 두더지는 남은 시간을 3초 늘린다', () => {
    const { game } = playingGame();
    const before = game.remaining;
    game.place('clock', 0);
    game.hit(0);
    expect(game.remaining).toBe(before + 3_000);
  });

  it('얼음 두더지는 다른 두더지가 숨는 시각을 늦춘다', () => {
    const { game } = playingGame();
    const other = game.place('normal', 1)!;
    const hideAt = other.hideAt;
    game.place('ice', 0);
    game.hit(0);
    expect(game.slowed).toBe(true);
    expect(other.hideAt).toBe(hideAt + 1_000);
  });

  it('15콤보에 피버가 시작되고 폭탄이 사라진다', () => {
    const { game, events } = playingGame();
    game.place('bomb', 8);
    for (let i = 0; i < FEVER_COMBO; i++) {
      game.place('normal', i % 8);
      game.hit(i % 8);
    }
    expect(events.some((e) => e.type === 'feverStart')).toBe(true);
    expect(game.inFever).toBe(true);
    expect(game.moles.some((m) => m.kind === 'bomb')).toBe(false);
  });

  it('남은 시간 5초에 왕 두더지가 한 번 나온다', () => {
    const { game, events } = playingGame(seq(0.99));
    let kings = 0;
    game.on((e) => {
      if (e.type === 'spawn' && e.mole.kind === 'king') kings++;
    });
    for (let t = 0; t < DURATION; t += 50) game.tick(50);
    expect(kings).toBe(1);
    expect(events.some((e) => e.type === 'segment' && e.id === 'spurt')).toBe(true);
  });

  it(`황금 두더지가 ${GOLDEN_PITY}번 연달아 안 나오면 다음은 반드시 황금`, () => {
    // 난수 0이면 가중치 첫 항목(보통 두더지)만 뽑혀, 확정 등장과 보정으로만 황금이 나온다
    const spawns = spawnLog(seq(0));
    let since = 0;
    let pityHits = 0;
    for (const { kind } of spawns) {
      if (kind === 'golden') {
        if (since === GOLDEN_PITY) pityHits++;
        since = 0;
      } else since++;
      expect(since).toBeLessThanOrEqual(GOLDEN_PITY);
    }
    expect(pityHits).toBeGreaterThan(0);
  });

  it('새 두더지는 자기 구간 초반에 확정으로 한 번씩 선보인다', () => {
    const spawns = spawnLog(seq(0));
    const first = (kind: MoleKind) => spawns.find((s) => s.kind === kind)!;
    expect(spawns[0].kind).toBe('normal');
    expect(first('golden').time).toBeLessThan(5_000);
    expect(first('bomb').time).toBeGreaterThanOrEqual(5_000);
    expect(first('bomb').time).toBeLessThan(10_000);
    expect(first('helmet').time).toBeGreaterThanOrEqual(10_000);
    expect(first('swift').time).toBeGreaterThan(first('helmet').time);
    expect(first('swift').time).toBeLessThan(20_000);
    const between = spawns.indexOf(first('swift')) - spawns.indexOf(first('helmet'));
    expect(between).toBeGreaterThanOrEqual(DEBUT_GAP);
  });

  it('같은 특수 두더지는 연달아 나오지 않고, 폭탄은 구간 상한을 넘지 않는다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const game = new Game(mulberry32(seed));
      const kinds: MoleKind[] = [];
      game.on((e) => e.type === 'spawn' && e.mole.kind !== 'king' && kinds.push(e.mole.kind));
      game.start();
      game.tick(COUNTDOWN);
      while (game.phase === 'playing') {
        game.tick(50);
        const seg = SEGMENTS[segmentIndexAt(game.time)];
        expect(game.moles.filter((m) => m.kind === 'bomb').length).toBeLessThanOrEqual(seg.maxBombs);
      }
      for (let i = 1; i < kinds.length; i++) {
        if (kinds[i] !== 'normal') expect(kinds[i]).not.toBe(kinds[i - 1]);
      }
    }
  });

  it('엿보는 두더지는 아직 안 나온 것이라 치면 헛치기가 된다', () => {
    const { game, events } = playingGame();
    game.place('normal', 2, { peek: 500 });
    game.hit(2);
    expect(events.at(-1)).toEqual({ type: 'whiff', hole: 2 });
    expect(game.moles).toHaveLength(1);
  });

  it('엿보기가 끝나면 다 올라오고, 노출 시간은 그때부터 센다', () => {
    const { game, events } = playingGame();
    const mole = game.place('normal', 2, { peek: 500 })!;
    const exposure = mole.hideAt - mole.peekUntil;
    game.tick(500);
    expect(events.at(-1)).toEqual({ type: 'emerge', mole });
    expect(mole.peekUntil).toBe(0);
    expect(mole.hideAt - game.time).toBe(exposure + EMERGE_RISE);
    game.tick(EMERGE_RISE);
    game.hit(2);
    expect(game.score).toBe(10);
  });

  it('엿보던 두더지는 다 올라오기 전(올라오는 중)에 치면 헛치기가 된다', () => {
    const { game, events } = playingGame();
    game.place('normal', 2, { peek: 500 });
    game.tick(500);
    expect(events.at(-1)?.type).toBe('emerge');
    game.hit(2);
    expect(events.at(-1)).toEqual({ type: 'whiff', hole: 2 });
    expect(game.score).toBe(0);
    game.tick(EMERGE_RISE + 300);
    game.hit(2);
    expect(game.score).toBe(10);
  });

  it('속임수 두더지는 엿보기만 하고 들어가며, 놓친 것으로 치지 않는다', () => {
    const { game, events } = playingGame();
    game.place('normal', 0);
    game.hit(0);
    const mole = game.place('normal', 2, { peek: 500, fake: true })!;
    game.tick(500);
    expect(events).toContainEqual({ type: 'duck', mole });
    expect(game.moles).not.toContain(mole);
    expect(game.combo).toBe(1);
    expect(game.stats.missed).toBe(0);
  });

  it('엿보기는 ${PEEK_FROM / 1000}초 뒤부터, 보상 두더지는 속임수가 없고, 처음 나오는 두더지는 엿보지 않는다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const game = new Game(mulberry32(seed));
      const firsts = new Set<MoleKind>();
      game.on((e) => {
        if (e.type !== 'spawn' || e.mole.kind === 'king') return;
        const { mole } = e;
        if (mole.peekUntil > 0) {
          expect(game.progress).toBeGreaterThanOrEqual(PEEK_FROM);
          expect(game.inFever).toBe(false);
          if (mole.fake) expect(['normal', 'bomb', 'helmet', 'swift']).toContain(mole.kind);
        }
        if (!firsts.has(mole.kind)) {
          firsts.add(mole.kind);
          expect(mole.peekUntil).toBe(0);
        }
      });
      game.start();
      game.tick(COUNTDOWN);
      while (game.phase === 'playing') game.tick(50);
    }
  });

  it('같은 시드면 같은 판이 나온다', () => {
    const run = () => {
      const game = new Game(seq(0.1, 0.5, 0.9, 0.3, 0.7));
      const spawns: string[] = [];
      game.on((e) => e.type === 'spawn' && spawns.push(`${e.mole.kind}@${e.mole.hole}`));
      game.start();
      for (let t = 0; t < 10_000; t += 50) game.tick(50);
      return spawns;
    };
    expect(run()).toEqual(run());
  });
});
