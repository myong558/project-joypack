/**
 * 판 만들기 설정(배포에 안 들어감). 판 만들기 도구(tools/levelmake.ts)가 읽는 곳은 여기 한 곳뿐이다.
 * 판마다 방 크기 단계·화분 수·체감 점수 목표, 상태 한도, README 판 표 묶음, 체감 점수 가중치를 적는다.
 */
import type { RoomSize } from '../src/game/roomgen.ts';

export type Range = [number, number];

export interface LevelPlan {
  /** 후보를 만들 방 크기 단계(roomgen RoomSize) */
  size: RoomSize;
  pots: number;
  /** 체감 점수 목표(tools/difficulty.ts humanScore). 없으면 규칙 배우는 판이라 자동으로 고르지 않고 지금 판을 그대로 둔다 */
  target?: number;
}

/**
 * 1~6 은 규칙 배우기(손으로 정한 판 그대로). 7 부터는 화분 수·방 크기 단계가 오르고, 판마다 체감 점수 목표에 가장 가까우면서
 * 앞 판보다 체감 점수가 높은 판을 고른다. 곡선은 "끝으로 갈수록 가파름"(앞 +5 안팎, 뒤 +10~22), 24판 250
 * (2026-11-08 사용자 결정: 지금 24판 197 의 약 1.25배, 고른 판은 곡선에서 벗어난 판만 바꿈, 고르는 기준은 체감 점수)
 */
export const PLAN: LevelPlan[] = [
  { size: 1, pots: 1 }, { size: 1, pots: 1 }, { size: 1, pots: 2 },
  { size: 1, pots: 2 }, { size: 1, pots: 2 }, { size: 1, pots: 2 },
  { size: 3, pots: 2, target: 65 }, { size: 3, pots: 2, target: 71 },
  { size: 4, pots: 3, target: 76 }, { size: 4, pots: 3, target: 82 },
  { size: 5, pots: 3, target: 87 }, { size: 5, pots: 3, target: 92 },
  { size: 6, pots: 3, target: 98 }, { size: 6, pots: 3, target: 103 },
  { size: 7, pots: 4, target: 114 }, { size: 7, pots: 4, target: 125 },
  { size: 8, pots: 4, target: 136 }, { size: 8, pots: 4, target: 147 },
  { size: 8, pots: 4, target: 158 }, { size: 8, pots: 4, target: 174 },
  { size: 9, pots: 5, target: 190 }, { size: 9, pots: 5, target: 207 },
  { size: 9, pots: 5, target: 228 }, { size: 9, pots: 5, target: 250 },
];

/** 지금 판의 체감 점수가 목표에서 이 비율 안이면 바꾸지 않는다(곡선에서 벗어난 판만 바꿈) */
export const KEEP_WITHIN = 0.12;

/**
 * 판으로 쓸 수 있는 앞방향 상태 수 상한. tests/levels.test.ts 의 explore 한도(200만)와 같게 둔다.
 * 이보다 큰 판은 테스트·출시 전 확인의 풀이 보기(기기 안 워커)가 너무 무거워 버린다(버린 수는 gather 가 셈)
 */
export const STATE_LIMIT = 2_000_000;

/** 풀이의 밀기 수 범위(roomgen rate 의 push 인자와 같은 뜻) */
export const PUSH: Range = [8, 200];

/** README "정원(판)" 표의 줄마다 판 수(위에서부터). pick --write 가 그 줄의 기준 이동 칸을 고친다 */
export const README_ROWS = [6, 2, 4, 2, 6, 4];

/**
 * 체감 점수(tools/difficulty.ts humanScore) 가중치. 사람이 밀기 직전에 생각하는 것만 센다:
 * 걷기·이동 수는 넣지 않고(오래 걸을 뿐 생각할 것은 같음), 게임이 빨간 테두리로 알려 주는 구석 막힘(보이는 함정)도 넣지 않는다.
 * 2026-11-07 처음 정한 가설값을 사람 체감(11판 < 10판, 16판 < 15판, 22판 ≈ 24판, 2026-11-08)에 맞춰 숨은 함정 1 → 0.5 로 고침.
 * 사람이 판을 풀어 본 체감 순서를 더 알게 되면 다시 맞춘다(README 정원(판) 만들기)
 */
export const HUMAN_WEIGHTS = {
  /** 밀기 하나 */
  push: 1,
  /** 돌려 놓기(햇살 자리에서 멀어지거나 그대로인 밀기) */
  detour: 3,
  /** 이어 미는 화분이 바뀜 */
  switch: 2,
  /** 외길 결정점(깰 수 있는 밀기가 하나뿐) */
  narrow: 2,
  /** 숨은 함정(밀어도 바로 티가 안 나는 막힘) */
  hidden: 0.5,
  /** 유혹 함정(숨은 함정 + 햇살 자리에 가까워 보임, 숨은 함정 1 에 더함) */
  tempting: 2,
  /** 보이는 대로 밀어도 풀리는 판(사람 흉내 봇이 깸)은 이만큼 곱함 */
  greedySolves: 0.7,
};
