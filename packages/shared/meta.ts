// 허브 연결 메타(기준서 6장·8장 "허브 연결"): 게임마다 games/<id>/joyfield.meta.ts 가 이 모양을 default 로 내보내면
// 허브(apps/hub/src/records.ts·rankings.ts)가 import.meta.glob 으로 자동으로 모은다. 새 게임은 이 파일 하나만 만들면 된다.
//   best   : 허브 카드·설정 "게임 데이터"의 내 최고 기록 문구 값(허브 i18n 'best.<id>' 의 {자리}). 기록이 없으면 null
//   clear  : 허브 설정 "내 기록 지우기"(게임 안 같은 버튼과 같은 범위: 이 기기의 최고 기록·도감. 온라인 랭킹·설정·등록 대기는 남김)
//   ranking: 허브 전체 랭킹 창의 읽기(서버 부담을 줄이려고 REST 로 읽기만, 등록은 게임이 한다)
// 메타 파일은 게임 코드를 불러오지 않는다(허브 묶음에 게임 코드가 섞이지 않게). 저장 키 이름은 게임 storage.ts 와 같게 적는다.

/** 허브 랭킹 한 줄. tries·time 은 이동·시간으로 겨루는 순위표(온실정원 오늘의 정원), thermo 는 업다운 온도계(🌡️), dev 는 기기 아이콘 */
export type HubRow = ({ name: string; tries: number; time: number } | { name: string; score: number; thermo?: boolean }) & { dev?: string };

/** 허브가 넘겨주는 Firestore REST 요청(개발·운영 DB·시간 제한·키를 붙여 줌). path 는 documents/ 뒤 경로 */
export type HubRequest = (path: string, init?: RequestInit) => Promise<Response>;

export interface HubRanking {
  /** 기기 사본 이름(날짜가 바뀌면 다른 이름이 되게) */
  key: (board: string) => string;
  fetch: (board: string, limit: number, request: HubRequest) => Promise<HubRow[]>;
}

export interface HubMeta {
  /** 내 최고 기록 문구 값. board 가 있으면 허브가 순위표 이름(games.json ranking.boards)으로 바꾸고, score 는 천 단위 쉼표를 찍는다 */
  best?: () => Record<string, string | number> | null;
  clear?: () => void;
  ranking?: HubRanking;
}

export function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

/** 저장 값(JSON 객체)의 일부만 바꿔 다시 쓴다. 없으면 그대로 */
export function patchJson(key: string, patch: Record<string, unknown>): void {
  const save = readJson(key) as Record<string, unknown> | null;
  if (!save || typeof save !== 'object') return;
  Object.assign(save, patch);
  localStorage.setItem(key, JSON.stringify(save));
}

/** 기기 시각 기준 YYYY-MM-DD(게임들의 오늘의 챌린지와 같은 날짜 규칙) */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Value = { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: { fields: Record<string, Value> } };
export type Fields = Record<string, Value | undefined>;

/** 서버 값의 dev 가 'm' | 'p' 일 때만 붙인다 */
export const devOf = (v?: Value) => (v?.stringValue === 'm' || v?.stringValue === 'p' ? { dev: v.stringValue } : {});
export const int = (v?: Value) => Number(v?.integerValue ?? 0);

/**
 * 순위표 1개 = 문서 1개 방식(기준서 1.6) 읽기: games/<id>/rankings/<문서>의 entries.
 * doc: 허브 탭 id → 문서 id(오늘의 챌린지는 날짜를 붙임). row: 한 줄 고치기(기본 점수 높은 순 { name, score, dev })
 */
export function boardDoc(
  gameId: string,
  doc: (board: string) => string = (board) => (board === 'daily' ? `daily-${dateKey()}` : 'classic'),
  row: (f: Fields) => HubRow = (f) => ({ name: f.name?.stringValue ?? '', score: int(f.score), ...devOf(f.dev) }),
  order: (a: HubRow, b: HubRow) => number = (a, b) => ('score' in b ? b.score : 0) - ('score' in a ? a.score : 0),
): HubRanking {
  return {
    key: doc,
    async fetch(board, limit, request) {
      const res = await request(`games/${gameId}/rankings/${doc(board)}`);
      if (res.status === 404) return []; // 아직 아무도 안 올림(오늘의 챌린지 등)
      if (!res.ok) throw new Error(`firestore ${res.status}`);
      const data = (await res.json()) as { fields?: { entries?: { arrayValue?: { values?: Value[] } } } };
      return (data.fields?.entries?.arrayValue?.values ?? [])
        .map((v) => row(v.mapValue?.fields ?? {}))
        .sort(order)
        .slice(0, limit);
    },
  };
}
