import '@joyfield/shared';
import { rankStore } from '@joyfield/shared/rank';
import { insertEntry, sanitizeRankings, type RankEntry } from './ranking';
import type { Mode } from './ranking';

/**
 * 온라인 순위표(Firebase Firestore, 조이필드 공통 순위표 문서 방식 @joyfield/shared/rank).
 *   클래식:          games/timetoflip/rankings/classic
 *   오늘의 챌린지:   games/timetoflip/rankings/daily-YYYY-MM-DD (날짜마다 새 문서라 매일 새로 시작한다)
 * 문서 하나에 1~10위를 { entries: [{ name, score, stage, date }, ...] }로 담는다. 쓰기 제한은 Firestore 규칙이 맡는다
 */
// 첫 화면을 가볍게 열도록 Firebase(서버 없이 쓰는 가벼운 lite SDK)는 순위표가 필요할 때 불러온다
const store = rankStore('timetoflip', () => Promise.all([import('firebase/app'), import('firebase/firestore/lite')]));

export function boardId(mode: Mode, today: string): string {
  return mode === 'classic' ? 'classic' : `daily-${today}`;
}

/** 저장된 순위표가 깨졌거나 규칙에 안 맞는 줄이 있어도 쓸 수 있는 모양으로 고친다 */
function clean(raw: unknown): RankEntry[] {
  return sanitizeRankings({ classic: raw }).classic;
}

export async function fetchBoard(mode: Mode, today: string): Promise<RankEntry[]> {
  return clean(await store.read(boardId(mode, today)));
}

/** 순위표에 이름을 올린다. 그사이 다른 사람이 올려 10위 밖으로 밀렸으면 place는 -1 */
export function submitEntry(mode: Mode, today: string, entry: RankEntry): Promise<{ place: number; entries: RankEntry[] }> {
  return store.insert(boardId(mode, today), clean, (entries) => insertEntry(entries, entry));
}
