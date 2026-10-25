import type { Season } from '../flora';
import { DAILY, DAILY_START } from './daily-data.ts';

/**
 * 오늘의 정원: 날마다 새 판 하나, 모든 사람이 같은 판. 판은 tools/dailygen.ts 가 미리 만들어 daily-data.ts 에 날짜 순으로 적어 두었다
 * (풀이기로 판 하나를 고르는 데 휴대폰에서 몇 초씩 걸려서, 미리 만들고 tests/daily.test.ts 로 다시 확인한다).
 * 날짜는 기기의 현지 날짜. 목록이 끝난 뒤의 날짜는 목록을 처음부터 다시 돈다(그 전에 목록을 늘린다)
 */
export interface DailyLevel {
  date: string;
  season: Season;
  rows: string[];
  par: number;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 달력의 계절(3~5월 봄 …). theme.ts calendarSeason 과 같다 */
export function seasonOfKey(key: string): Season {
  const m = Number(key.slice(5, 7));
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

/** 날짜 글자 사이의 날 수(시간대와 무관) */
export function dayIndex(key: string, from = DAILY_START): number {
  const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
  return Math.round((utc(key) - utc(from)) / 86400000);
}

const SEASON_CODE: Record<string, Season> = { p: 'spring', s: 'summer', a: 'autumn', w: 'winter' };
export const seasonCode = (s: Season) => ({ spring: 'p', summer: 's', autumn: 'a', winter: 'w' })[s];

/** 목록 한 줄 "계절 글자 + 기준 이동 수|줄|줄|…" (예: "a26|########|…"). 판의 계절 = 그 판에 나오는 계절 요소 */
export function unpack(line: string): { season: Season; par: number; rows: string[] } {
  const [head, ...rows] = line.split('|');
  return { season: SEASON_CODE[head[0]], par: Number(head.slice(1)), rows };
}

/** 그날의 판. 같은 날짜면 언제 어디서 불러도 같다 */
export function dailyLevel(key: string): DailyLevel {
  const n = DAILY.length;
  const i = ((dayIndex(key) % n) + n) % n;
  return { date: key, ...unpack(DAILY[i]) };
}
