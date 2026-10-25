import { BOARD, dailyBoard, insertDaily, insertEntry, sanitizeDaily, sanitizeEntries, type DailyEntry, type RankEntry } from './ranking';

/**
 * 온라인 순위표(Firebase Firestore). joypack 프로젝트를 다른 게임과 같이 쓰므로
 * 온실 정원 데이터는 games/glasshouse/rankings/ 아래 문서에만 둔다(순위표 하나 = 문서 하나, 1~10위).
 *   정원 점수:    garden               { entries: [{ name, score, flowers, date }, ...] }
 *   오늘의 정원:  daily-YYYY-MM-DD     { entries: [{ name, moves, time, date }, ...] } (날짜마다 새 문서라 매일 새로 시작한다)
 * 웹 설정값은 공개되는 값이며, 쓰기 제한은 Firestore 규칙이 맡는다
 */
const firebaseConfig = {
  apiKey: 'AIzaSyChpbX7wDj2GQF7O4QqR-5g7QYpCVkx_9s',
  authDomain: 'joypack-c6bd2.firebaseapp.com',
  projectId: 'joypack-c6bd2',
  storageBucket: 'joypack-c6bd2.firebasestorage.app',
  messagingSenderId: '828719448319',
  appId: '1:828719448319:web:2109d89aa4cc23ab718cca',
};

/** 응답이 이보다 늦으면 오프라인으로 보고 기기에 남은 순위를 보여 준다 */
const TIMEOUT_MS = 8000;

// 첫 화면을 가볍게 열도록 Firebase는 순위표가 필요할 때 불러온다. 서버 없이 쓰는 가벼운(lite) SDK를 쓴다
let sdk: Promise<{ db: import('firebase/firestore/lite').Firestore; fs: typeof import('firebase/firestore/lite') }> | null = null;
function load() {
  sdk ??= Promise.all([import('firebase/app'), import('firebase/firestore/lite')]).then(([app, fs]) => ({
    db: fs.getFirestore(app.initializeApp(firebaseConfig, 'glasshouse')),
    fs,
  }));
  // 불러오기에 실패하면(오프라인 등) 다음에 다시 시도한다
  sdk.catch(() => (sdk = null));
  return sdk;
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    p.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

const entriesOf = (raw: unknown) => (raw as { entries?: unknown } | undefined)?.entries;

async function readDoc(id: string): Promise<unknown> {
  return withTimeout(
    (async () => {
      const { db, fs } = await load();
      return entriesOf((await fs.getDoc(fs.doc(db, 'games', 'glasshouse', 'rankings', id))).data());
    })(),
  );
}

/**
 * 순위표 문서에 기록 하나를 끼운다. 트랜잭션이라 여러 사람이 동시에 올려도 "10위까지, 같은 기록은 기존 우선, 이름마다 한 줄"이 지켜진다.
 * 그사이 밀려 10위 밖이 됐으면 place는 -1
 */
async function insertDoc<T>(id: string, clean: (raw: unknown) => T[], insert: (list: T[]) => number): Promise<{ place: number; entries: T[] }> {
  return withTimeout(
    (async () => {
      const { db, fs } = await load();
      const ref = fs.doc(db, 'games', 'glasshouse', 'rankings', id);
      return fs.runTransaction(db, async (tx) => {
        const entries = clean(entriesOf((await tx.get(ref)).data()));
        const place = insert(entries);
        if (place >= 0) tx.set(ref, { entries });
        return { place, entries };
      });
    })(),
  );
}

export const fetchBoard = async (): Promise<RankEntry[]> => sanitizeEntries(await readDoc(BOARD));
export const submitEntry = (entry: RankEntry) => insertDoc(BOARD, sanitizeEntries, (list) => insertEntry(list, entry));

export const fetchDaily = async (date: string): Promise<DailyEntry[]> => sanitizeDaily(await readDoc(dailyBoard(date)));
export const submitDaily = (entry: DailyEntry) => insertDoc(dailyBoard(entry.date), sanitizeDaily, (list) => insertDaily(list, entry));
