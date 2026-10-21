import type { Rng } from './types';

/** 시드가 같으면 같은 수열을 내는 32비트 난수 생성기 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 현지 날짜 기준 'YYYY-MM-DD' */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** 같은 날짜면 기기와 관계없이 같은 시드 */
export function dateSeed(date: Date): number {
  let h = 2166136261;
  for (const ch of `hammer:${dateKey(date)}`) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}
