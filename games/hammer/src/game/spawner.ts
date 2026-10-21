import type { MoleKind, Rng } from './types';

export type SegmentId = 'warmup' | 'main' | 'melee' | 'rush' | 'spurt' | 'fever';

export interface Segment {
  id: SegmentId;
  /** 이 진행 시간(ms) 전까지 적용 */
  until: number;
  interval: number;
  exposure: number;
  maxActive: number;
  /** 동시에 나와 있을 수 있는 폭탄 수 */
  maxBombs: number;
  /** 머리만 살짝 내밀고 엿보다 나올 확률(0–1). 그중 일부는 나오지 않고 도로 들어간다 */
  peek: number;
  /** 등장 가중치. 구간마다 합이 100이라 그대로 퍼센트로 읽힌다 */
  weights: Partial<Record<MoleKind, number>>;
  /** 이 구간에서 처음 선보이는 두더지. 이번 판에 아직 안 나왔다면 구간 초반에 하나씩 확정으로 내보낸다 */
  debut?: MoleKind[];
}

/**
 * 30초 한 판의 설계
 * - 보통 두더지가 절반쯤을 차지해 리듬을 만들고, 특수 두더지는 반가운 손님처럼 드문드문 나온다
 * - 새 두더지는 구간마다 확정 등장(debut)으로 한 마리씩 소개해, 언제 무엇이 나오는지 몸으로 익힌다
 * - 폭탄은 5초부터 나와 러시에서 가장 많아지고, 라스트 스퍼트는 황금을 늘려 점수 잔치로 끝낸다
 * - 시계·얼음은 판의 절반 남짓에서만 만나는 행운. 얼음은 정신없는 러시에 더 자주 나온다
 */
export const SEGMENTS: Segment[] = [
  {
    id: 'warmup',
    until: 5_000,
    interval: 850,
    exposure: 1_100,
    maxActive: 1,
    maxBombs: 0,
    peek: 0.14,
    weights: { normal: 92, golden: 8 },
    debut: ['golden'],
  },
  {
    id: 'main',
    until: 10_000,
    interval: 750,
    exposure: 1_000,
    maxActive: 2,
    maxBombs: 1,
    peek: 0.2,
    weights: { normal: 76, golden: 6, bomb: 18 },
    debut: ['bomb'],
  },
  {
    id: 'melee',
    until: 20_000,
    interval: 620,
    exposure: 850,
    maxActive: 2,
    maxBombs: 1,
    peek: 0.24,
    weights: { normal: 53, golden: 6, bomb: 14, helmet: 11, swift: 11, clock: 2.5, ice: 2.5 },
    debut: ['helmet', 'swift'],
  },
  {
    id: 'rush',
    until: 25_000,
    interval: 480,
    exposure: 650,
    maxActive: 3,
    maxBombs: 2,
    peek: 0.26,
    weights: { normal: 45, golden: 6, bomb: 18, helmet: 10, swift: 11, clock: 4, ice: 6 },
  },
  {
    id: 'spurt',
    until: Infinity,
    interval: 430,
    exposure: 600,
    maxActive: 3,
    maxBombs: 2,
    peek: 0.18,
    weights: { normal: 54, golden: 12, bomb: 16, helmet: 8, swift: 10 },
  },
];

/** 피버 동안은 폭탄 없이 보통·황금 두더지가 쏟아진다 */
export const FEVER_SEGMENT: Segment = {
  id: 'fever',
  until: Infinity,
  interval: 220,
  exposure: 900,
  maxActive: 4,
  maxBombs: 0,
  peek: 0,
  weights: { normal: 75, golden: 25 },
};

export function segmentIndexAt(progress: number): number {
  return SEGMENTS.findIndex((s) => progress < s.until);
}

export function pickKind(weights: Partial<Record<MoleKind, number>>, rng: Rng, exclude: readonly MoleKind[] = []): MoleKind {
  const entries = (Object.entries(weights) as [MoleKind, number][]).filter(([k, w]) => w > 0 && !exclude.includes(k));
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [kind, w] of entries) {
    r -= w;
    if (r < 0) return kind;
  }
  return entries[entries.length - 1]?.[0] ?? 'normal';
}

export function pickOne<T>(items: readonly T[], rng: Rng): T | undefined {
  return items.length === 0 ? undefined : items[Math.floor(rng() * items.length)];
}

/** size×size 격자에서 가로·세로·대각선으로 붙은 구멍 */
export function neighbors(hole: number, size: number): number[] {
  const row = Math.floor(hole / size);
  const col = hole % size;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if ((dr || dc) && r >= 0 && r < size && c >= 0 && c < size) result.push(r * size + c);
    }
  }
  return result;
}
