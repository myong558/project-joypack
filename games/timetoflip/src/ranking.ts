import { insertBy, placeBy } from '@joyfield/shared/rank';
import { RANK_SIZE, isValidName } from '@joyfield/shared/ui';
/** 순위표 종류: 클래식(끝없이 이어지는 판), 오늘의 챌린지(날짜 시드, 모두 같은 판) */
export type Mode = 'classic' | 'daily';

// 순위표 칸 수(10)·이름 규칙(영문 대문자 5자)은 조이필드 공통(@joyfield/shared/ui)
export { NAME_MAX, RANK_SIZE, cleanName, isValidName } from '@joyfield/shared/ui';

/** 점수가 높을수록 앞(같으면 먼저 올린 기록이 앞) */
const higher = (a: { score: number }, b: { score: number }) => a.score > b.score;

export interface RankEntry {
  name: string;
  score: number;
  /** 도달한 판(랭킹에 함께 보여 줌) */
  stage: number;
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

/** 결과 화면에서 등록하지 않고 넘어간 기록. 나중에 랭킹 창에서 등록할 수 있다 */
export interface PendingRanks {
  classic: PendingRecord | null;
  daily: (PendingRecord & { date: string }) | null;
}

export interface PendingRecord {
  score: number;
  stage: number;
}

export function emptyRankings(): Rankings {
  return { classic: [], daily: { date: '', entries: [] } };
}

export function emptyPending(): PendingRanks {
  return { classic: null, daily: null };
}

/** 입력한 글자를 대문자로 바꾸고 A–Z가 아닌 글자는 버린다 */
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

/** 아직 등록하지 않았고 지금도 10위 안에 드는 기록. 없으면 null */
export function pendingRecord(rankings: Rankings, pending: PendingRanks, mode: Mode, today: string): PendingRecord | null {
  const rec = mode === 'classic' ? pending.classic : pending.daily?.date === today ? pending.daily : null;
  if (!rec || placeOf(boardEntries(rankings, mode, today), rec.score) === -1) return null;
  return { score: rec.score, stage: rec.stage };
}

/** 등록 대기 기록을 남긴다. 모드마다 하나만 두고, 더 높은 점수가 오면 바꾼다 */
export function keepPending(pending: PendingRanks, mode: Mode, today: string, rec: PendingRecord): void {
  if (mode === 'classic') {
    if (!pending.classic || pending.classic.score < rec.score) pending.classic = { ...rec };
  } else if (pending.daily?.date !== today || pending.daily.score < rec.score) {
    pending.daily = { ...rec, date: today };
  }
}

/** 그 점수를 등록했으면 대기에서 지운다 */
export function clearPending(pending: PendingRanks, mode: Mode, score: number): void {
  if (mode === 'classic') {
    if (pending.classic?.score === score) pending.classic = null;
  } else if (pending.daily?.score === score) {
    pending.daily = null;
  }
}

const validEntry = (e: unknown): e is RankEntry => {
  const r = e as RankEntry | null;
  return !!r && isValidName(r.name) && Number.isInteger(r.score) && Number.isInteger(r.stage) && typeof r.date === 'string';
};

/** 저장된 값이 깨졌어도 쓸 수 있는 모양으로 고친다 */
export function sanitizeRankings(raw: unknown): Rankings {
  const fix = (list: unknown): RankEntry[] =>
    (Array.isArray(list) ? list : [])
      .filter(validEntry)
      .map(({ name, score, stage, date, dev }) => (dev === 'm' || dev === 'p' ?{ name, score, stage, date, dev } : { name, score, stage, date }))
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
  const ok = (r: PendingRecord | null | undefined): r is PendingRecord => !!r && Number.isInteger(r.score) && Number.isInteger(r.stage) && r.score > 0;
  return {
    classic: ok(p.classic) ? { score: p.classic.score, stage: p.classic.stage } : null,
    daily: ok(p.daily) && typeof p.daily.date === 'string' ? { score: p.daily.score, stage: p.daily.stage, date: p.daily.date } : null,
  };
}
