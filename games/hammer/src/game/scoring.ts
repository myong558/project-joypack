import { MOLE_ORDER } from './moles';
import type { Grade, MoleKind, Stats } from './types';

export const FEVER_COMBO = 15;
export const FEVER_DURATION = 5_000;
export const LAST_SPURT = 5_000;
export const MISSION_BONUS = 50;

/** 이번 타격을 포함한 콤보 수에 따른 배율 */
export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

export function pointsFor(base: number, combo: number, opts: { fever: boolean; lastSpurt: boolean }): number {
  if (base <= 0) return base;
  let points = base * comboMultiplier(combo);
  if (opts.fever) points *= 2;
  if (opts.lastSpurt) points *= 1.5;
  return Math.round(points);
}

export function shouldStartFever(combo: number, inFever: boolean): boolean {
  return !inFever && combo > 0 && combo % FEVER_COMBO === 0;
}

export const GRADES: { grade: Grade; min: number }[] = [
  { grade: 'S', min: 1500 },
  { grade: 'A', min: 1000 },
  { grade: 'B', min: 600 },
  { grade: 'C', min: 0 },
];

export function gradeFor(score: number): Grade {
  return GRADES.find((g) => score >= g.min)!.grade;
}

export function accuracyOf(stats: Stats): number {
  return stats.taps === 0 ? 0 : stats.hits / stats.taps;
}

export const STAR_SCORE = 600;
export const STAR_MAX_MISSED = 5;

/** 별 세 개: 점수 600 이상 · 미션 달성 · 폭탄 0회이고 놓친 두더지 5마리 이하 */
export function starsFor(score: number, missionDone: boolean, stats: Stats): [boolean, boolean, boolean] {
  return [score >= STAR_SCORE, missionDone, stats.bombs === 0 && stats.missed <= STAR_MAX_MISSED];
}

export function totalKills(stats: Stats): number {
  return MOLE_ORDER.reduce((sum, k) => sum + stats.kills[k], 0);
}

export type Goal =
  | { type: 'first' }
  | { type: 'record'; diff: number }
  | { type: 'missing'; kind: MoleKind }
  | { type: 'gap'; gap: number };

/** 결과 화면의 "다음 목표" */
export function nextGoal(score: number, prevBest: number, dex: ReadonlySet<MoleKind>): Goal {
  if (prevBest === 0) return { type: 'first' };
  if (score > prevBest) return { type: 'record', diff: score - prevBest };
  const gap = prevBest - score + 1;
  const missing = MOLE_ORDER.find((k) => !dex.has(k));
  if (missing && gap > prevBest * 0.3) return { type: 'missing', kind: missing };
  return { type: 'gap', gap };
}
