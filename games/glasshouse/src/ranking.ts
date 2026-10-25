/** 순위표는 하나: 정원 점수(24개 판 가장 좋은 판 점수의 합) */
export const BOARD = 'garden';

/** 순위표에 남는 칸 수 */
export const RANK_SIZE = 10;
/** 이름은 영문 대문자 A–Z로 이 글자 수까지 */
export const NAME_MAX = 5;
/** 판 점수 상한 1000 × 24판(서버 규칙도 같은 상한을 검사) */
export const SCORE_MAX = 24_000;

export interface RankEntry {
  name: string;
  score: number;
  /** 피운 꽃(깬 판) 수 */
  flowers: number;
  /** 기록한 날(YYYY-MM-DD) */
  date: string;
}

/** 결과 화면에서 등록하지 않고 넘어간 기록. 나중에 랭킹 창에서 등록할 수 있다 */
export interface PendingRecord {
  score: number;
  flowers: number;
}

/** 입력한 글자를 대문자로 바꾸고 A–Z가 아닌 글자는 버린다 */
export function cleanName(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, NAME_MAX);
}

export function isValidName(name: string): boolean {
  return new RegExp(`^[A-Z]{1,${NAME_MAX}}$`).test(name);
}

/** 이 점수가 들어갈 자리(0부터). 같은 점수면 먼저 올린 기록이 앞서므로 그 뒤에 선다. 10위 밖이면 -1 */
export function placeOf(entries: readonly RankEntry[], score: number): number {
  if (score <= 0) return -1;
  const below = entries.findIndex((e) => e.score < score);
  const at = below === -1 ? entries.length : below;
  return at < RANK_SIZE ? at : -1;
}

/**
 * 기록을 끼워 넣는다. 정원 점수는 계속 오르는 누적 점수라 같은 이름의 예전 줄이 있으면 더 높은 쪽 하나만 남긴다
 * (한 사람이 판을 깰 때마다 순위표를 채우지 않게). 들어가지 못하면 -1
 */
export function insertEntry(entries: RankEntry[], entry: RankEntry): number {
  const mine = entries.findIndex((e) => e.name === entry.name);
  if (mine >= 0 && entries[mine].score >= entry.score) return -1;
  if (mine >= 0) entries.splice(mine, 1);
  const at = placeOf(entries, entry.score);
  if (at === -1) return -1;
  entries.splice(at, 0, entry);
  entries.length = Math.min(entries.length, RANK_SIZE);
  return at;
}

/** 아직 등록하지 않았고 지금도 10위 안에 드는 기록. 없으면 null */
export function pendingRecord(entries: readonly RankEntry[], pending: PendingRecord | null): PendingRecord | null {
  if (!pending || placeOf(entries, pending.score) === -1) return null;
  return { ...pending };
}

const validEntry = (e: unknown): e is RankEntry => {
  const r = e as RankEntry | null;
  return !!r && isValidName(r.name) && Number.isInteger(r.score) && r.score <= SCORE_MAX && Number.isInteger(r.flowers) && typeof r.date === 'string';
};

/** 저장된 값이 깨졌어도 쓸 수 있는 모양으로 고친다 */
export function sanitizeEntries(raw: unknown): RankEntry[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(validEntry)
    .map(({ name, score, flowers, date }) => ({ name, score, flowers, date }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RANK_SIZE);
}

export function sanitizePending(raw: unknown): PendingRecord | null {
  const p = raw as PendingRecord | null;
  return p && Number.isInteger(p.score) && p.score > 0 && Number.isInteger(p.flowers) ? { score: p.score, flowers: p.flowers } : null;
}

/* ---------- 오늘의 정원(날마다 새 판, 순위표도 날마다 새 문서 daily-YYYY-MM-DD) ---------- */

/** 오늘의 정원 순위표 문서 이름 */
export const dailyBoard = (date: string) => `daily-${date}`;
/** 이동 수 상한(서버 규칙도 같은 상한), 시간 상한 하루 */
export const DAILY_MOVES_MAX = 999;
export const DAILY_TIME_MAX = 86_400_000;

export interface DailyEntry {
  name: string;
  /** 깬 이동 수(적을수록 앞) */
  moves: number;
  /** 걸린 시간 ms(이동 수가 같으면 짧을수록 앞) */
  time: number;
  date: string;
}

export interface DailyRecord {
  moves: number;
  time: number;
}

/** a 가 b 보다 앞서는 기록인지(같으면 false: 먼저 올린 기록이 앞선다) */
export const dailyAhead = (a: DailyRecord, b: DailyRecord) => a.moves < b.moves || (a.moves === b.moves && a.time < b.time);

/** 이 기록이 들어갈 자리(0부터). 10위 밖이면 -1 */
export function placeOfDaily(entries: readonly DailyEntry[], rec: DailyRecord): number {
  const at = entries.findIndex((e) => dailyAhead(rec, e));
  const place = at === -1 ? entries.length : at;
  return place < RANK_SIZE ? place : -1;
}

/** 기록을 끼워 넣는다. 같은 날 여러 번 해도 이름마다 가장 좋은 한 줄만 남긴다. 들어가지 못하면 -1 */
export function insertDaily(entries: DailyEntry[], entry: DailyEntry): number {
  const mine = entries.findIndex((e) => e.name === entry.name);
  if (mine >= 0 && !dailyAhead(entry, entries[mine])) return -1;
  if (mine >= 0) entries.splice(mine, 1);
  const at = placeOfDaily(entries, entry);
  if (at === -1) return -1;
  entries.splice(at, 0, entry);
  entries.length = Math.min(entries.length, RANK_SIZE);
  return at;
}

const validDaily = (e: unknown): e is DailyEntry => {
  const r = e as DailyEntry | null;
  return (
    !!r && isValidName(r.name) && Number.isInteger(r.moves) && r.moves >= 1 && r.moves <= DAILY_MOVES_MAX && Number.isInteger(r.time) && r.time >= 0 && r.time <= DAILY_TIME_MAX && typeof r.date === 'string'
  );
};

export function sanitizeDaily(raw: unknown): DailyEntry[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(validDaily)
    .map(({ name, moves, time, date }) => ({ name, moves, time, date }))
    .sort((a, b) => a.moves - b.moves || a.time - b.time)
    .slice(0, RANK_SIZE);
}

/** 0:42 · 1:05:09 */
export function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  return mm >= 60 ? `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${mm}:${String(s % 60).padStart(2, '0')}`;
}
