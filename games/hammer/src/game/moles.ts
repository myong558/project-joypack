import type { MoleKind } from './types';

export interface MoleDef {
  kind: MoleKind;
  emoji: string;
  /** 쓰러뜨렸을 때 기본 점수. 음수면 치는 순간 손해 */
  points: number;
  /** 쓰러뜨리는 데 필요한 타격 수 */
  hp: number;
  /** 구간 노출 시간에 곱하는 배율 */
  exposure: number;
  /** 구간과 상관없이 고정된 노출 시간(ms) */
  fixedExposure?: number;
  /** 쳐야 하는 두더지인지. 놓치면 콤보가 끊긴다 */
  good: boolean;
}

export const MOLES: Record<MoleKind, MoleDef> = {
  normal: { kind: 'normal', emoji: '🐹', points: 10, hp: 1, exposure: 1, good: true },
  golden: { kind: 'golden', emoji: '⭐', points: 30, hp: 1, exposure: 0.65, good: true },
  helmet: { kind: 'helmet', emoji: '⛑️', points: 25, hp: 2, exposure: 1.4, good: true },
  swift: { kind: 'swift', emoji: '💨', points: 20, hp: 1, exposure: 0.8, good: true },
  bomb: { kind: 'bomb', emoji: '💣', points: -20, hp: 1, exposure: 1.2, good: false },
  clock: { kind: 'clock', emoji: '⏰', points: 5, hp: 1, exposure: 0.9, good: true },
  ice: { kind: 'ice', emoji: '🧊', points: 10, hp: 1, exposure: 1, good: true },
  king: { kind: 'king', emoji: '👑', points: 100, hp: 5, exposure: 1, fixedExposure: 3500, good: true },
};

export const MOLE_ORDER = Object.keys(MOLES) as MoleKind[];
