import '@joyfield/shared';
import { rankStore } from '@joyfield/shared/rank';
import type { Preset } from './game/rules';
import { boardId, insertEntry, sanitizeEntries, type RankEntry } from './ranking';

/**
 * 온라인 순위표(Firebase Firestore, 조이필드 공통 순위표 문서 방식 @joyfield/shared/rank, 업다운 v1.21.0~).
 *   games/updown/rankings/50 · 100 · 200   { entries: [{ name, score, tries, time, thermo?, date, dev? }, ...] } (점수 높은 순 1~10위)
 * 예전 방식(기록 1건 = 문서 1개, games/updown/scores-<끝 숫자>)은 옛 버전 화면이 한동안 올릴 수 있게 규칙만 남겨 둔다.
 * 쓰기 제한(점수 상한 = 시도 횟수·시간으로 낸 점수)은 Firestore 규칙이 맡는다
 */
// 첫 화면을 가볍게 열도록 Firebase(서버 없이 쓰는 가벼운 lite SDK)는 순위표가 필요할 때 불러온다
const store = rankStore('updown', () => Promise.all([import('firebase/app'), import('firebase/firestore/lite')]));

export async function fetchBoard(board: Preset): Promise<RankEntry[]> {
  return sanitizeEntries(await store.read(boardId(board)));
}

/** 순위표에 이름을 올린다. 그사이 다른 사람이 올려 10위 밖으로 밀렸으면 place는 -1 */
export function submitEntry(board: Preset, entry: RankEntry): Promise<{ place: number; entries: RankEntry[] }> {
  return store.insert(boardId(board), sanitizeEntries, (entries) => insertEntry(entries, entry));
}
