import { DAILY, DAILY_START } from './daily-data.ts';
import type { RoomSize } from './roomgen.ts';

/**
 * 오늘의 정원: 날마다 새 판 하나, 모든 사람이 같은 판. 판은 tools/dailygen.ts 가 미리 만들어 daily-data.ts 에 날짜 순으로 적어 두었다
 * (풀이기로 판 하나를 고르는 데 휴대폰에서 몇 초씩 걸려서, 미리 만들고 tests/daily.test.ts 로 다시 확인한다).
 * 날짜는 기기의 현지 날짜. 목록이 끝난 뒤의 날짜는 목록을 처음부터 다시 돈다(그 전에 목록을 늘린다. 목록 길이가 7의 배수라 다시 돌아도 요일 단계가 맞음)
 */
export interface DailyLevel {
  date: string;
  size: RoomSize;
  rows: string[];
  par: number;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 요일 리듬: 월·화 작은 방(단계 1) → 수·목 2 → 금·토 3 → 일요일 가장 큰 방(4). 어려운 날이 몇 달씩 몰리지 않고 한 주 안에서 오르내린다 */
const WEEK: RoomSize[] = [4, 1, 1, 2, 2, 3, 3];
export function sizeOfKey(key: string): RoomSize {
  return WEEK[new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)))).getUTCDay()];
}

/** 날짜 글자 사이의 날 수(시간대와 무관) */
export function dayIndex(key: string, from = DAILY_START): number {
  const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));
  return Math.round((utc(key) - utc(from)) / 86400000);
}

/** 목록 한 줄 "방 크기 단계 숫자 한 자 + 기준 이동 수|줄|줄|…" (예: "326|########|…" = 단계 3, 기준 이동 26) */
export function unpack(line: string): { size: RoomSize; par: number; rows: string[] } {
  const [head, ...rows] = line.split('|');
  return { size: Number(head[0]) as RoomSize, par: Number(head.slice(1)), rows };
}

/** 그날의 판. 같은 날짜면 언제 어디서 불러도 같다 */
export function dailyLevel(key: string): DailyLevel {
  const n = DAILY.length;
  const i = ((dayIndex(key) % n) + n) % n;
  return { date: key, ...unpack(DAILY[i]) };
}
