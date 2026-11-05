// 조이필드 랭킹 저장 공통(순위표 문서 방식, 기준서 1.6). 게임마다 games/<게임 id>/rankings/<순위표 id> 문서 하나에
// { entries: [...] }(1~10위)를 담는다. 올릴 때는 트랜잭션이라 여러 사람이 동시에 올려도 "10위까지, 같은 기록은 기존 우선"이 지켜진다.
// 형식 검사·고치기 제한은 Firestore 규칙(firestore.rules)이 맡는다. 개발·운영 DB 는 Joyfield.FIREBASE 가 주소로 고른다.
//
// Firebase SDK 는 게임이 불러오는 함수를 넘긴다(공통 모듈은 의존성을 두지 않음, 첫 화면을 가볍게 열도록 필요할 때만 불러옴):
//   const store = rankStore('hammer', () => Promise.all([import('firebase/app'), import('firebase/firestore/lite')]));
import './joyfield.js';
import { RANK_SIZE } from './ui';

/** 응답이 이보다 늦으면 오프라인으로 보고 기기에 남은 순위를 보여 준다 */
export const RANK_TIMEOUT_MS = 8000;

// firebase 타입을 공통 모듈에서 가져오지 않으려고 쓰는 만큼만 적는다
interface DocRef {
  readonly id: string;
}
interface Snap {
  data(): unknown;
}
interface Tx {
  get(ref: DocRef): Promise<Snap>;
  set(ref: DocRef, data: unknown): unknown;
}
interface FirestoreLite {
  getFirestore(app: unknown): unknown;
  doc(db: unknown, ...path: string[]): DocRef;
  getDoc(ref: DocRef): Promise<Snap>;
  runTransaction<T>(db: unknown, fn: (tx: Tx) => Promise<T>): Promise<T>;
}
interface FirebaseApp {
  initializeApp(config: object, name?: string): unknown;
}
export type FirebaseLoader = () => Promise<[unknown, unknown]>;

export interface RankStore {
  /** 순위표 문서의 entries(정리 전 그대로, 없으면 undefined) */
  read(board: string): Promise<unknown>;
  /** 트랜잭션으로 끼운다: clean 으로 지금 목록을 고친 뒤 insert 가 자리(0부터, 못 들면 -1)를 돌려준다. 들면 문서를 새 목록으로 */
  insert<T>(board: string, clean: (raw: unknown) => T[], insert: (list: T[]) => number): Promise<{ place: number; entries: T[] }>;
}

export function withTimeout<T>(p: Promise<T>, ms = RANK_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

export function rankStore(gameId: string, loadFirebase: FirebaseLoader): RankStore {
  let sdk: Promise<{ db: unknown; fs: FirestoreLite }> | null = null;
  const load = () => {
    sdk ??= loadFirebase().then(([app, fs]) => ({
      db: (fs as FirestoreLite).getFirestore((app as FirebaseApp).initializeApp(Joyfield.FIREBASE, gameId)),
      fs: fs as FirestoreLite,
    }));
    // 불러오기에 실패하면(오프라인 등) 다음에 다시 시도한다
    sdk.catch(() => (sdk = null));
    return sdk;
  };
  const entriesOf = (raw: unknown) => (raw as { entries?: unknown } | undefined)?.entries;
  return {
    read: (board) =>
      withTimeout(
        (async () => {
          const { db, fs } = await load();
          return entriesOf((await fs.getDoc(fs.doc(db, 'games', gameId, 'rankings', board))).data());
        })(),
      ),
    insert: (board, clean, insert) =>
      withTimeout(
        (async () => {
          const { db, fs } = await load();
          const ref = fs.doc(db, 'games', gameId, 'rankings', board);
          return fs.runTransaction(db, async (tx) => {
            const entries = clean(entriesOf((await tx.get(ref)).data()));
            const place = insert(entries);
            if (place >= 0) tx.set(ref, { entries });
            return { place, entries };
          });
        })(),
      ),
  };
}

/**
 * better(a, b): a 가 b 보다 앞서면 true. 같은 기록이면 먼저 올린 쪽이 앞서므로 새 기록은 그 뒤에 선다.
 * 새 기록이 설 자리(0부터), 10위 밖이면 -1
 */
export function placeBy<T>(entries: readonly T[], entry: T, better: (a: T, b: T) => boolean): number {
  const below = entries.findIndex((e) => better(entry, e));
  const at = below === -1 ? entries.length : below;
  return at < RANK_SIZE ? at : -1;
}

/** 끼워 넣고 10위 밖으로 밀린 최하위를 지운다. 들어가지 못하면 그대로 두고 -1 */
export function insertBy<T>(entries: T[], entry: T, better: (a: T, b: T) => boolean): number {
  const at = placeBy(entries, entry, better);
  if (at === -1) return -1;
  entries.splice(at, 0, entry);
  entries.length = Math.min(entries.length, RANK_SIZE);
  return at;
}

/** 순위표 날짜 칸: 2026-11-05 → 11/5 */
export function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}
