import { accuracyOf, totalKills } from './scoring';
import type { Rng, Stats } from './types';

export type MissionId = 'golden3' | 'noBomb' | 'combo20' | 'king' | 'accuracy90';

export interface MissionDef {
  id: MissionId;
  /** HUD에 보여 줄 진행 상황 */
  progress(stats: Stats): string;
  done(stats: Stats): boolean;
  /** 이미 실패가 확정됐는지 */
  failed(stats: Stats): boolean;
}

const never = () => false;

export const MISSIONS: MissionDef[] = [
  {
    id: 'golden3',
    progress: (s) => `${Math.min(s.kills.golden, 3)}/3`,
    done: (s) => s.kills.golden >= 3,
    failed: never,
  },
  {
    id: 'noBomb',
    progress: (s) => `${Math.min(totalKills(s), 20)}/20`,
    done: (s) => s.bombs === 0 && totalKills(s) >= 20,
    failed: (s) => s.bombs > 0,
  },
  {
    id: 'combo20',
    progress: (s) => `${Math.min(s.maxCombo, 20)}/20`,
    done: (s) => s.maxCombo >= 20,
    failed: never,
  },
  {
    id: 'king',
    progress: (s) => (s.kills.king > 0 ? '1/1' : '0/1'),
    done: (s) => s.kills.king > 0,
    failed: never,
  },
  {
    id: 'accuracy90',
    progress: (s) => `${Math.round(accuracyOf(s) * 100)}%`,
    done: (s) => s.taps >= 15 && accuracyOf(s) >= 0.9,
    failed: never,
  },
];

export function pickMission(rng: Rng): MissionDef {
  return MISSIONS[Math.floor(rng() * MISSIONS.length)];
}
