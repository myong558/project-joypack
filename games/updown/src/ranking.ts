// 업다운 순위표 규칙(순서·자리·등록 대기). 저장·통신은 storage.ts·online.ts.
// 순위표는 범위(1~50·1~100·1~200)마다 하나, 1~10위(조이필드 공통 순위표 문서 방식, 기준서 1.6).
// 순위: 점수가 높을수록 → 같으면 먼저 등록한 기록이 위. thermo 는 온도계를 쓴 판(목록에 🌡️, 순위에는 영향 없음, 점수에 이미 차감)
import { insertBy, placeBy } from '@joyfield/shared/rank';
import { RANK_SIZE, isValidName } from '@joyfield/shared/ui';
import { PRESETS, type Preset } from './game/rules';

export { NAME_MAX, RANK_SIZE, cleanName, isValidName } from '@joyfield/shared/ui';

export type Device = 'm' | 'p';

export interface RankEntry {
  name: string;
  score: number;
  tries: number;
  /** 걸린 시간(ms) */
  time: number;
  /** 온도계를 쓴 판이면 true */
  thermo?: boolean;
  /** 기록한 날(YYYY-MM-DD) */
  date: string;
  /** 플레이한 입력: m 모바일(터치)·p PC(마우스)(Joyfield.playDevice, 기준서 1.6) */
  dev?: Device;
}

/** 등록 대기 기록(결과 화면에서 올리지 않고 넘어간 TOP 10 기록). 범위마다 가장 좋은 하나 */
export interface PendingRecord {
  score: number;
  tries: number;
  time: number;
  thermo: boolean;
}
export type Pending = Partial<Record<Preset, PendingRecord>>;

/** 순위표 문서 ID(games/updown/rankings/<끝 숫자>) */
export const boardId = (board: Preset) => String(board);

const higher = (a: { score: number }, b: { score: number }) => a.score > b.score;

/** 이 점수가 들어갈 자리(0부터). 같은 점수면 먼저 올린 기록이 앞서므로 그 뒤에 선다. 10위 밖·0점이면 -1 */
export function placeOf(entries: readonly RankEntry[], score: number): number {
  if (score <= 0) return -1;
  return placeBy(entries, { score } as RankEntry, higher);
}

/** 기록을 끼워 넣고 10위 밖으로 밀린 최하위를 지운다. 들어가지 못하면 그대로 두고 -1 */
export function insertEntry(entries: RankEntry[], entry: RankEntry): number {
  if (entry.score <= 0) return -1;
  return insertBy(entries, entry, higher);
}

const isInt = (n: unknown): n is number => Number.isInteger(n);

function validEntry(e: unknown): e is RankEntry {
  const r = e as RankEntry | null;
  return (
    !!r &&
    isValidName(r.name) &&
    isInt(r.score) &&
    r.score >= 1 &&
    isInt(r.tries) &&
    r.tries >= 1 &&
    isInt(r.time) &&
    r.time >= 0 &&
    typeof r.date === 'string' &&
    (r.thermo === undefined || typeof r.thermo === 'boolean')
  );
}

/** 저장·서버 값이 깨졌거나 규칙에 안 맞는 줄이 있어도 쓸 수 있는 모양으로 고친다(점수 높은 순, 같으면 원래 순서) */
export function sanitizeEntries(raw: unknown): RankEntry[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(validEntry)
    .map((e) => ({
      name: e.name,
      score: e.score,
      tries: e.tries,
      time: e.time,
      date: e.date,
      ...(e.thermo ? { thermo: true } : {}),
      ...(e.dev === 'm' || e.dev === 'p' ? { dev: e.dev } : {}),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RANK_SIZE);
}

/** 점수·시도 횟수·걸린 시간이 정상인 대기 기록만 남긴다 */
export function sanitizePending(raw: unknown): Pending {
  const result: Pending = {};
  const src = (raw ?? {}) as Record<string, Partial<PendingRecord>>;
  for (const key of PRESETS) {
    const e = src[key];
    if (e && isInt(e.score) && e.score >= 0 && isInt(e.tries) && e.tries > 0 && Number.isFinite(e.time) && (e.time as number) >= 0) {
      result[key] = { score: e.score, tries: e.tries, time: e.time as number, thermo: e.thermo === true };
    }
  }
  return result;
}

/** 대기 기록 남기기: 범위마다 하나, 더 높은 점수가 오면 바꾼다 */
export function keepPending(pending: Pending, board: Preset, rec: PendingRecord): void {
  const old = pending[board];
  if (!old || rec.score > old.score) pending[board] = { ...rec };
}

export function sameRecord(a: PendingRecord | undefined | null, b: PendingRecord | undefined | null): boolean {
  return !!a && !!b && a.score === b.score && a.tries === b.tries && a.time === b.time && !!a.thermo === !!b.thermo;
}

/** 아직 올리지 않았고 지금 알고 있는 순위표에서도 10위 안에 드는 대기 기록. 없으면 null */
export function pendingRecord(entries: readonly RankEntry[], pending: Pending, board: Preset): PendingRecord | null {
  const rec = pending[board];
  return rec && placeOf(entries, rec.score) >= 0 ? rec : null;
}
