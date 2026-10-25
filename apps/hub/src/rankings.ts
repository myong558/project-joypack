/**
 * 전체 랭킹 화면용 읽기 전용 순위 조회(Firestore REST, SDK 없이 fetch).
 * 게임들과 같은 Firebase 프로젝트(joypack-c6bd2)를 읽기만 한다. 등록은 각 게임이 한다.
 *
 * 서버 부담을 줄이려고
 * - 랭킹 창을 열 때, 보고 있는 순위표만 읽는다(허브를 여는 것만으로는 읽지 않음)
 * - 처음에는 게임별 1위(TOP 1)만 읽고, "TOP 10 보기"로 펼칠 때만 10위까지 읽는다(문서 1개 방식 게임은 어차피 한 번에 옴)
 * - 불러온 순위는 기기에 남겨 두고 5분 안에 다시 열면 서버를 부르지 않는다
 * - 오프라인이거나 실패하면 마지막으로 불러온 순위를 보여 준다
 */
const FIREBASE = {
  apiKey: 'AIzaSyChpbX7wDj2GQF7O4QqR-5g7QYpCVkx_9s',
  projectId: 'joypack-c6bd2',
};
const API = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
/** 랭킹 창에서 게임마다 처음 보이는 줄 수. 게임이 늘어도 창이 길어지지 않게 1위만 */
export const TOP = 1;
/** "TOP 10 보기"로 펼쳤을 때 */
export const FULL = 10;
const FRESH_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 8000;
const CACHE_KEY = 'joypack.rankingCache';

/** thermo: 업다운에서 온도계를 쓴 기록(🌡️ 표시, 순위에는 영향 없음) */
export type Row = { name: string; tries: number; time: number } | { name: string; score: number; thermo?: boolean };

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

/** 두더지잡기와 같은 날짜 규칙(기기 시각 기준 YYYY-MM-DD) */
function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Fetcher = (board: string, limit: number) => Promise<Row[]>;

/**
 * 순위표 1개 = 문서 1개 방식(기준서 1.6 새 게임 기본) 게임의 읽기. games/<id>/rankings/classic · daily-YYYY-MM-DD
 * 새 게임이 이 방식이면 FETCHERS 에 boardDoc('<id>') 한 줄만 더한다
 */
function boardDoc(gameId: string, classic = 'classic'): { key: (board: string) => string; fetch: Fetcher } {
  const doc = (board: string) => (board === 'daily' ? `daily-${dateKey()}` : classic);
  return {
    key: doc,
    async fetch(board, limit) {
      const res = await request(`games/${gameId}/rankings/${doc(board)}`);
      if (res.status === 404) return []; // 오늘 아직 아무도 안 올림
      if (!res.ok) throw new Error(`firestore ${res.status}`);
      type Value = { stringValue?: string; integerValue?: string; mapValue?: { fields: Record<string, Value> } };
      const data = (await res.json()) as { fields?: { entries?: { arrayValue?: { values?: Value[] } } } };
      return (data.fields?.entries?.arrayValue?.values ?? [])
        .map((v) => ({
          name: v.mapValue?.fields.name?.stringValue ?? '',
          score: Number(v.mapValue?.fields.score?.integerValue ?? 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
  };
}

const FETCHERS: Record<string, { key: (board: string) => string; fetch: Fetcher }> = {
  // 업다운: 기록 1건 = 문서 1개, 범위(1~50·1~100·1~200)마다 컬렉션이 따로(scores-<끝 숫자>). 게임과 같은 정렬(점수 높은 순 → 먼저 등록)
  updown: {
    key: (board) => `s${board}`,
    async fetch(board, limit) {
      const res = await request('games/updown:runQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: `scores-${board}` }],
            orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
            limit,
          },
        }),
      });
      if (!res.ok) throw new Error(`firestore ${res.status}`);
      type Fields = Record<string, { stringValue?: string; integerValue?: string; timestampValue?: string; booleanValue?: boolean }>;
      const rows = (await res.json()) as { document?: { fields: Fields } }[];
      return rows
        .filter((r) => r.document)
        .map(({ document }) => ({
          name: document!.fields.initials.stringValue ?? '',
          score: Number(document!.fields.score.integerValue),
          at: Date.parse(document!.fields.createdAt.timestampValue ?? ''),
          thermo: document!.fields.thermo?.booleanValue === true,
        }))
        .sort((a, b) => b.score - a.score || a.at - b.at)
        .map(({ name, score, thermo }) => (thermo ? { name, score, thermo } : { name, score }));
    },
  },
  // 두더지잡기·타임 투 플립: 순위표 1개 = 문서 1개({ entries: [...] }). 오늘의 챌린지는 날짜마다 새 문서다
  hammer: boardDoc('hammer'),
  timetoflip: boardDoc('timetoflip'),
  // 온실정원: 정원 점수는 garden 문서(점수 높은 순), 오늘의 정원은 daily-YYYY-MM-DD 문서(이동 수 적은 순 → 시간 짧은 순, 횟수·시간으로 보임)
  glasshouse: {
    key: (board) => (board === 'daily' ? `daily-${dateKey()}` : 'garden'),
    async fetch(board, limit) {
      if (board !== 'daily') return boardDoc('glasshouse', 'garden').fetch(board, limit);
      const res = await request(`games/glasshouse/rankings/daily-${dateKey()}`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`firestore ${res.status}`);
      type Value = { stringValue?: string; integerValue?: string; mapValue?: { fields: Record<string, Value> } };
      const data = (await res.json()) as { fields?: { entries?: { arrayValue?: { values?: Value[] } } } };
      return (data.fields?.entries?.arrayValue?.values ?? [])
        .map((v) => ({
          name: v.mapValue?.fields.name?.stringValue ?? '',
          tries: Number(v.mapValue?.fields.moves?.integerValue ?? 0),
          time: Number(v.mapValue?.fields.time?.integerValue ?? 0),
        }))
        .sort((a, b) => a.tries - b.tries || a.time - b.time)
        .slice(0, limit);
    },
  },
};

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
