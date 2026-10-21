import type { Mode } from './ui/screens';

/** 순위표에 남는 칸 수 */
export const RANK_SIZE = 10;
/** 이름은 영문 대문자 A–Z로 이 글자 수까지 */
export const NAME_MAX = 5;

export interface RankEntry {
  name: string;
  score: number;
  /** 기록한 날(YYYY-MM-DD) */
  date: string;
}

export interface Rankings {
  classic: RankEntry[];
  /** 오늘의 챌린지 순위는 그날 하루만 유효하다. 날짜가 바뀌면 빈 순위표로 본다 */
  daily: { date: string; entries: RankEntry[] };
}

/** 결과 화면에서 등록하지 않고 넘어간 기록. 나중에 랭킹 창에서 등록할 수 있다 */
export interface PendingRanks {
  classic: number;
  daily: { date: string; score: number } | null;
}

export function emptyRankings(): Rankings {
  return { classic: [], daily: { date: '', entries: [] } };
}

export function emptyPending(): PendingRanks {
  return { classic: 0, daily: null };
}

/** 입력한 글자를 대문자로 바꾸고 A–Z가 아닌 글자는 버린다 */
export function cleanName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, NAME_MAX);
}

export function isValidName(name: string): boolean {
  return new RegExp(`^[A-Z]{1,${NAME_MAX}}$`).test(name);
}

/**
 * 이 점수가 들어갈 자리(0부터). 같은 점수면 먼저 올린 기록이 앞서므로 그 뒤에 선다.
 * 10위 안에 들지 못하면 -1
 */
export function placeOf(entries: readonly RankEntry[], score: number): number {
  if (score <= 0) return -1;
  const below = entries.findIndex((e) => e.score < score);
  const at = below === -1 ? entries.length : below;
  return at < RANK_SIZE ? at : -1;
}

/** 기록을 끼워 넣고 10위 밖으로 밀린 최하위를 지운다. 들어가지 못하면 그대로 두고 -1을 돌려준다 */
export function insertEntry(entries: RankEntry[], entry: RankEntry): number {
  const at = placeOf(entries, entry.score);
  if (at === -1) return -1;
  entries.splice(at, 0, entry);
  entries.length = Math.min(entries.length, RANK_SIZE);
  return at;
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

/** 아직 등록하지 않았고 지금도 10위 안에 드는 기록 점수. 없으면 0 */
export function pendingScore(rankings: Rankings, pending: PendingRanks, mode: Mode, today: string): number {
  const score = mode === 'classic' ? pending.classic : pending.daily?.date === today ? pending.daily.score : 0;
  return placeOf(boardEntries(rankings, mode, today), score) === -1 ? 0 : score;
}

/** 등록 대기 기록을 남긴다. 판마다 하나만 두고, 더 높은 점수가 오면 바꾼다 */
export function keepPending(pending: PendingRanks, mode: Mode, today: string, score: number): void {
  if (mode === 'classic') {
    pending.classic = Math.max(pending.classic, score);
  } else if (pending.daily?.date !== today || pending.daily.score < score) {
    pending.daily = { date: today, score };
  }
}

/** 그 점수를 등록했으면 대기에서 지운다 */
export function clearPending(pending: PendingRanks, mode: Mode, score: number): void {
  if (mode === 'classic') {
    if (pending.classic === score) pending.classic = 0;
  } else if (pending.daily?.score === score) {
    pending.daily = null;
  }
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

export function sanitizePending(raw: unknown): PendingRanks {
  const p = (raw ?? {}) as Partial<PendingRanks>;
  const daily = p.daily && typeof p.daily.date === 'string' && Number.isFinite(p.daily.score) ? p.daily : null;
  return { classic: Number.isFinite(p.classic) ? (p.classic as number) : 0, daily };
}
