import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/engine';
import { mulberry32 } from '../src/game/rng';
import {
  RANK_SIZE,
  clearPending,
  emptyPending,
  emptyRankings,
  insertEntry,
  keepPending,
  pendingRecord,
  placeOf,
  sanitizePending,
  sanitizeRankings,
  type RankEntry,
} from '../src/ranking';

const entry = (score: number, name = 'AAA', stage = 3): RankEntry => ({ name, score, stage, date: '2026-10-24' });

describe('순위표', () => {
  it('같은 점수면 먼저 올린 기록이 앞선다', () => {
    const list = [entry(500), entry(300)];
    expect(placeOf(list, 300)).toBe(2);
    expect(placeOf(list, 301)).toBe(1);
    expect(placeOf(list, 0)).toBe(-1);
  });

  it('10위가 차면 꼴찌가 밀려나고, 그보다 낮으면 못 들어간다', () => {
    const list = Array.from({ length: RANK_SIZE }, (_, i) => entry(1000 - i * 10));
    expect(insertEntry(list, entry(5))).toBe(-1);
    expect(insertEntry(list, entry(995, 'NEW'))).toBe(1);
    expect(list).toHaveLength(RANK_SIZE);
    expect(list[RANK_SIZE - 1].score).toBe(920);
  });

  it('등록 대기는 모드마다 가장 높은 기록 하나, 오늘의 챌린지는 그날만', () => {
    const pending = emptyPending();
    const rankings = emptyRankings();
    keepPending(pending, 'classic', '2026-10-24', { score: 300, stage: 3 });
    keepPending(pending, 'classic', '2026-10-24', { score: 200, stage: 2 });
    expect(pendingRecord(rankings, pending, 'classic', '2026-10-24')).toEqual({ score: 300, stage: 3 });
    keepPending(pending, 'daily', '2026-10-24', { score: 100, stage: 1 });
    expect(pendingRecord(rankings, pending, 'daily', '2026-10-25')).toBeNull();
    clearPending(pending, 'classic', 300);
    expect(pending.classic).toBeNull();
  });

  it('깨진 저장 값은 쓸 수 있는 모양으로 고친다', () => {
    const r = sanitizeRankings({ classic: [entry(10), { name: 'bad', score: 5 }, entry(30, 'BBB')] });
    expect(r.classic.map((e) => e.score)).toEqual([30, 10]);
    expect(sanitizePending({ classic: { score: 'x' } })).toEqual({ classic: null, daily: null });
  });
});

describe('서버 규칙의 점수 상한(firestore.rules)', () => {
  // stage × 9300 + 100 × stage × (stage + 1). 완벽하게 기억하는 봇이 아주 빨리 풀어도 넘지 않아야 한다
  const cap = (stage: number) => stage * 9300 + 100 * stage * (stage + 1);

  it('완벽한 플레이도 상한 안', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = new Game(mulberry32(seed));
      game.start();
      for (let guard = 0; guard < 400 && game.phase !== 'over'; guard++) {
        if (game.phase !== 'playing' && game.phase !== 'peek') {
          game.tick(game.phaseLeft + 1);
          continue;
        }
        const card = game.cards.find((c) => c.state === 'down')!;
        const mate = game.cards.find((c) => c !== card && c.key === card.key)!;
        game.flip(card.index);
        game.flip(mate.index);
        game.tick(50);
        if (game.stage >= 30) break;
      }
      expect(game.score).toBeLessThanOrEqual(cap(game.stage));
    }
  });
});
