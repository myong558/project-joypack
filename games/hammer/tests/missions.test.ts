import { describe, expect, it } from 'vitest';
import { emptyStats } from '../src/game/engine';
import { MISSIONS, pickMission } from '../src/game/missions';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('미션', () => {
  it('황금 두더지 3마리', () => {
    const s = emptyStats();
    s.kills.golden = 2;
    expect(mission('golden3').done(s)).toBe(false);
    expect(mission('golden3').progress(s)).toBe('2/3');
    s.kills.golden = 3;
    expect(mission('golden3').done(s)).toBe(true);
  });

  it('폭탄 안 치고 20마리: 폭탄 한 번이면 실패 확정', () => {
    const s = emptyStats();
    s.kills.normal = 20;
    expect(mission('noBomb').done(s)).toBe(true);
    s.bombs = 1;
    expect(mission('noBomb').done(s)).toBe(false);
    expect(mission('noBomb').failed(s)).toBe(true);
  });

  it('20콤보', () => {
    const s = emptyStats();
    s.maxCombo = 20;
    expect(mission('combo20').done(s)).toBe(true);
  });

  it('왕 두더지', () => {
    const s = emptyStats();
    expect(mission('king').done(s)).toBe(false);
    s.kills.king = 1;
    expect(mission('king').done(s)).toBe(true);
  });

  it('명중률 90%는 15번 이상 쳐야 인정', () => {
    const s = emptyStats();
    s.taps = 10;
    s.hits = 10;
    expect(mission('accuracy90').done(s)).toBe(false);
    s.taps = 20;
    s.hits = 18;
    expect(mission('accuracy90').done(s)).toBe(true);
    s.hits = 17;
    expect(mission('accuracy90').done(s)).toBe(false);
  });

  it('난수로 미션을 고른다', () => {
    expect(pickMission(() => 0)).toBe(MISSIONS[0]);
    expect(pickMission(() => 0.999)).toBe(MISSIONS.at(-1));
  });
});
