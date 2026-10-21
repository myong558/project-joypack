import { insertEntry, sanitizeRankings, type RankEntry } from './ranking';
import type { Mode } from './ui/screens';

/**
 * 온라인 순위표(Firebase Firestore). joypack 프로젝트를 다른 게임과 같이 쓰므로
 * 두더지잡기 데이터는 games/hammer/rankings 아래에만 둔다.
 *   클래식:          games/hammer/rankings/classic
 *   오늘의 챌린지:   games/hammer/rankings/daily-YYYY-MM-DD (날짜마다 새 문서라 매일 새로 시작한다)
 * 문서 하나에 1~10위를 { entries: [...] }로 담는다. 웹 설정값은 공개되는 값이며, 쓰기 제한은 Firestore 규칙이 맡는다
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

export function boardId(mode: Mode, today: string): string {
  return mode === 'classic' ? 'classic' : `daily-${today}`;
}

// 첫 화면을 가볍게 열도록 Firebase는 순위표가 필요할 때 불러온다. 서버 없이 쓰는 가벼운(lite) SDK를 쓴다
let sdk: Promise<{ db: import('firebase/firestore/lite').Firestore; fs: typeof import('firebase/firestore/lite') }> | null = null;
function load() {
  sdk ??= Promise.all([import('firebase/app'), import('firebase/firestore/lite')]).then(([app, fs]) => ({
    db: fs.getFirestore(app.initializeApp(firebaseConfig, 'hammer')),
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

/** 저장된 순위표가 깨졌거나 규칙에 안 맞는 줄이 있어도 쓸 수 있는 모양으로 고친다 */
function clean(raw: unknown): RankEntry[] {
  return sanitizeRankings({ classic: (raw as { entries?: unknown } | undefined)?.entries }).classic;
}

export async function fetchBoard(mode: Mode, today: string): Promise<RankEntry[]> {
  return withTimeout(
    (async () => {
      const { db, fs } = await load();
      const snap = await fs.getDoc(fs.doc(db, 'games', 'hammer', 'rankings', boardId(mode, today)));
      return clean(snap.data());
    })(),
  );
}

/**
 * 순위표에 이름을 올린다. 트랜잭션이라 여러 사람이 동시에 올려도 "10위까지, 같은 점수는 기존 우선"이 지켜진다.
 * 그사이 다른 사람이 올려 10위 밖으로 밀렸으면 place는 -1
 */
export async function submitEntry(mode: Mode, today: string, entry: RankEntry): Promise<{ place: number; entries: RankEntry[] }> {
  return withTimeout(
    (async () => {
      const { db, fs } = await load();
      const ref = fs.doc(db, 'games', 'hammer', 'rankings', boardId(mode, today));
      return fs.runTransaction(db, async (tx) => {
        const entries = clean((await tx.get(ref)).data());
        const place = insertEntry(entries, entry);
        if (place >= 0) tx.set(ref, { entries });
        return { place, entries };
      });
    })(),
  );
}
