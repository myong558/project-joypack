import '@joyfield/shared';
import type { HubRow } from '@joyfield/shared/meta';
import { META } from './meta';
/**
 * 전체 랭킹 화면용 읽기 전용 순위 조회(Firestore REST, SDK 없이 fetch).
 * 게임들과 같은 Firebase 프로젝트(운영 joyfield-41b5a · 내 PC 에서는 개발 joyfield-dev)를 읽기만 한다. 등록은 각 게임이 한다.
 *
 * 서버 부담을 줄이려고
 * - 랭킹 창을 열 때, 보고 있는 순위표만 읽는다(허브를 여는 것만으로는 읽지 않음)
 * - 처음에는 게임별 1위(TOP 1)만 읽고, "TOP 10 보기"로 펼칠 때만 10위까지 읽는다(문서 1개 방식 게임은 어차피 한 번에 옴)
 * - 불러온 순위는 기기에 남겨 두고 5분 안에 다시 열면 서버를 부르지 않는다
 * - 오프라인이거나 실패하면 마지막으로 불러온 순위를 보여 준다
 */
// 개발(내 PC)·운영(배포 사이트) DB 는 공통 모듈이 주소를 보고 고른다(packages/shared/joyfield.js 의 FIREBASE)
const FIREBASE = Joyfield.FIREBASE;
const API = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
/** 랭킹 창에서 게임마다 처음 보이는 줄 수. 게임이 늘어도 창이 길어지지 않게 1위만 */
export const TOP = 1;
/** "TOP 10 보기"로 펼쳤을 때 */
export const FULL = 10;
const FRESH_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 8000;
const CACHE_KEY = 'joyfield.rankingCache';

/** 랭킹 한 줄(@joyfield/shared/meta 의 HubRow). thermo: 업다운 온도계(🌡️), tries·time: 이동·시간으로 겨루는 순위표, dev: 기기 아이콘 */
export type Row = HubRow;

export interface BoardResult {
  rows: Row[];
  /** 서버 대신 기기에 남은 순위를 보여 주는 중(오프라인·실패) */
  stale: boolean;
}

/** limit: 이 항목을 읽을 때 요청한 줄 수(예전 항목은 없음 = TOP) */
type Cache = Record<string, { at: number; rows: Row[]; limit?: number }>;

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  // 오래된 항목(하루 지난 오늘의 챌린지 등)은 지운다
  const now = Date.now();
  for (const key of Object.keys(cache)) if (now - cache[key].at > 7 * 86400000) delete cache[key];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 저장 실패는 무시한다
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}key=${FIREBASE.apiKey}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 게임마다 순위 읽기(허브 연결 메타 games/<id>/joyfield.meta.ts 의 ranking). 새 게임은 그 파일에 ranking 을 적으면 된다 */
const FETCHERS: Record<string, { key: (board: string) => string; fetch: (board: string, limit: number) => Promise<Row[]> }> = Object.fromEntries(
  Object.entries(META)
    .filter(([, m]) => m.ranking)
    .map(([id, m]) => [id, { key: m.ranking!.key, fetch: (board: string, limit: number) => m.ranking!.fetch(board, limit, request) }]),
);

export function hasRanking(gameId: string): boolean {
  return gameId in FETCHERS;
}

/** 기기에 남은 순위(있으면). 창을 열자마자 먼저 보여 주는 데 쓴다 */
export function cachedBoard(gameId: string, board: string): Row[] | null {
  const f = FETCHERS[gameId];
  return f ? (readCache()[`${gameId}:${f.key(board)}`]?.rows ?? null) : null;
}

export async function loadBoard(gameId: string, board: string, limit = TOP): Promise<BoardResult> {
  const f = FETCHERS[gameId];
  if (!f) return { rows: [], stale: false };
  const cacheKey = `${gameId}:${f.key(board)}`;
  const cache = readCache();
  const hit = cache[cacheKey];
  // 펼친 상태(10위)를 1위만 읽어 둔 항목으로 채우지 않는다. 줄 수가 모자라도 그 이하만 있으면 끝까지 읽은 것
  const enough = hit && ((hit.limit ?? TOP) >= limit || hit.rows.length < (hit.limit ?? TOP));
  if (hit && enough && Date.now() - hit.at < FRESH_MS) return { rows: hit.rows, stale: false };
  if (!navigator.onLine) {
    if (hit) return { rows: hit.rows, stale: true };
    throw new Error('offline');
  }
  try {
    const rows = await f.fetch(board, limit);
    cache[cacheKey] = { at: Date.now(), rows, limit };
    writeCache(cache);
    return { rows, stale: false };
  } catch (err) {
    if (hit) return { rows: hit.rows, stale: true };
    throw err;
  }
}
