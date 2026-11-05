import '@joyfield/shared';
import { rankStore } from '@joyfield/shared/rank';
import { BOARD, dailyBoard, insertDaily, insertEntry, sanitizeDaily, sanitizeEntries, type DailyEntry, type RankEntry } from './ranking';

/**
 * 온라인 순위표(Firebase Firestore, 조이필드 공통 순위표 문서 방식 @joyfield/shared/rank).
 * 온실정원 데이터는 games/glasshouse/rankings/ 아래 문서에만 둔다(순위표 하나 = 문서 하나, 1~10위).
 *   정원 점수:    garden               { entries: [{ name, score, flowers, date }, ...] }
 *   오늘의 정원:  daily-YYYY-MM-DD     { entries: [{ name, moves, time, date }, ...] } (날짜마다 새 문서라 매일 새로 시작한다)
 * 쓰기 제한은 Firestore 규칙이 맡는다. 올릴 때 "10위까지, 같은 기록은 기존 우선, 이름마다 한 줄"이 지켜진다
 */
// 첫 화면을 가볍게 열도록 Firebase(서버 없이 쓰는 가벼운 lite SDK)는 순위표가 필요할 때 불러온다
const store = rankStore('glasshouse', () => Promise.all([import('firebase/app'), import('firebase/firestore/lite')]));

export const fetchBoard = async (): Promise<RankEntry[]> => sanitizeEntries(await store.read(BOARD));
export const submitEntry = (entry: RankEntry) => store.insert(BOARD, sanitizeEntries, (list) => insertEntry(list, entry));

export const fetchDaily = async (date: string): Promise<DailyEntry[]> => sanitizeDaily(await store.read(dailyBoard(date)));
export const submitDaily = (entry: DailyEntry) => store.insert(dailyBoard(entry.date), sanitizeDaily, (list) => insertDaily(list, entry));
