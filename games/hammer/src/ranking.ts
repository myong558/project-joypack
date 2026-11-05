import { insertBy, placeBy } from '@joyfield/shared/rank';
import { RANK_SIZE, isValidName } from '@joyfield/shared/ui';
import type { Mode } from './ui/screens';

// 순위표 칸 수(10)·이름 규칙(영문 대문자 5자)은 조이필드 공통(@joyfield/shared/ui)
export { NAME_MAX, RANK_SIZE, cleanName, isValidName } from '@joyfield/shared/ui';

/** 점수가 높을수록 앞(같으면 먼저 올린 기록이 앞) */
const higher = (a: { score: number }, b: { score: number }) => a.score > b.score;

export interface RankEntry {
  name: string;
  score: number;
  /** 기록한 날(YYYY-MM-DD) */
  date: string;
  /** 플레이한 입력: m 모바일(터치)·p PC(마우스). 예전 기록에는 없음(Joyfield.playDevice, 기준서 1.6) */
  dev?: 'm' | 'p';
}

export interface Rankings {
  classic: RankEntry[];
  /** 오늘의 챌린지 순위는 그날 하루만 유효하다. 날짜가 바뀌면 빈 순위표로 본다 */
  daily: { date: string; entries: RankEntry[] };
}

export function emptyRankings(): Rankings {
  return { classic: [], daily: { date: '', entries: [] } };
}

/**
 * 이 점수가 들어갈 자리(0부터). 같은 점수면 먼저 올린 기록이 앞서므로 그 뒤에 선다.
 * 10위 안에 들지 못하면 -1
 */
export function placeOf(entries: readonly RankEntry[], score: number): number {
  if (score <= 0) return -1;
  return placeBy(entries, { score } as RankEntry, higher);
}

/** 기록을 끼워 넣고 10위 밖으로 밀린 최하위를 지운다. 들어가지 못하면 그대로 두고 -1을 돌려준다 */
export function insertEntry(entries: RankEntry[], entry: RankEntry): number {
  if (entry.score <= 0) return -1;
  return insertBy(entries, entry, higher);
}

/** 지금 보여 줄 순위표. 오늘의 챌린지는 오늘 날짜의 것만 */
export function boardEntries(rankings: Rankings, mode: Mode, today: string): RankEntry[] {
  if (mode === 'classic') return rankings.classic;
  return rankings.daily.date === today ? rankings.daily.entries : [];
}

/** 등록하고 순위(0부터)를 돌려준다. 오늘의 챌린지는 날짜가 바뀌었으면 비우고 시작한다 */
export function register(rankings: Rankings, mode: Mode, today: string, entry: RankEntry): number {
  if (mode === 'classic') return insertEntry(rankings.classic, entry);
  if (rankings.daily.date !== today) rankings.daily = { date: today, entries: [] };
  return insertEntry(rankings.daily.entries, entry);
}

/** 저장된 값이 깨졌어도 쓸 수 있는 모양으로 고친다 */
export function sanitizeRankings(raw: unknown): Rankings {
  const fix = (list: unknown): RankEntry[] =>
    (Array.isArray(list) ? list : [])
      .filter((e): e is RankEntry => !!e && isValidName(e.name) && Number.isFinite(e.score) && typeof e.date === 'string')
      .sort((a, b) => b.score - a.score)
      .slice(0, RANK_SIZE);
  const r = (raw ?? {}) as Partial<Rankings>;
  return {
    classic: fix(r.classic),
    daily: { date: typeof r.daily?.date === 'string' ? r.daily.date : '', entries: fix(r.daily?.entries) },
  };
}
