/**
 * 시간·판 규칙. 숫자는 tests/balance.test.ts 의 모의 플레이로 맞춘 값이다
 * (보통 실력이면 4~6판, 약 2분에서 끝나도록).
 */

/** 처음 주는 시간 */
export const START_MS = 40_000;
/** 시간을 아무리 벌어도 이 이상은 쌓이지 않는다(판이 끝없이 늘어지지 않게) */
export const MAX_MS = 60_000;
/** 판을 다 맞히면 더하는 시간. 한 번도 안 틀렸으면(퍼펙트) PERFECT_GAIN 을 더 준다 */
export const CLEAR_GAIN = 3_000;
export const PERFECT_GAIN = 2_000;
/** 콤보 3 이상으로 맞히면 짝마다 더 주는 시간 */
export const COMBO_GAIN = 500;
/** 시계 카드 짝 */
export const CLOCK_GAIN = 5_000;
/** 기억 실수(짝이 어디 있는지 이미 봤는데 다른 카드를 뒤집음)에 깎는 시간. 1판은 익히는 판이라 깎지 않는다 */
export const MISTAKE_PENALTY = 1_000;
export const MISTAKE_FROM_STAGE = 2;
/** 틀린 두 장을 보여 주는 시간. 그사이 다른 카드를 누르면 바로 덮고 넘어간다 */
export const HIDE_DELAY = 650;
/** 엿보기 카드: 남은 카드를 모두 보여 주는 시간 */
export const PEEK_REVEAL = 1_300;
/** 카드가 날아와 깔리는 시간(ui/board.ts 가 카드 수와 관계없이 이 안에 다 깔리게 간격을 맞춤). 미리 보기는 이 뒤부터 센다 */
export const DEAL_MS = 600;
/** 판을 깬 뒤 다음 판을 놓기까지(시간은 멈춤) */
export const CLEAR_PAUSE = 1_100;
/** 마지막 경고(째깍 소리·경고 진동)를 시작하는 남은 시간 */
export const WARN_MS = 5_000;

export interface StageDef {
  /** 짝 수(특수 카드·닮은 짝 포함) */
  pairs: number;
  /** 휴대폰 세로 기준 배치. 가로 화면에서는 UI 가 행·열을 바꾼다 */
  cols: number;
  rows: number;
  /** 카드가 다 깔린 뒤 모든 카드를 보여 주는 시간(시간은 멈춤, 누르면 건너뜀) */
  viewMs: number;
  /** 판을 놓은 뒤 미리 보기가 끝나기까지 = DEAL_MS + viewMs */
  peekMs: number;
  /** 짝 하나를 맞히면 더하는 시간 */
  matchGain: number;
  /** 색만 다른 닮은 짝 수 */
  twins: number;
}

/**
 * 미리 보기(viewMs)는 카드가 늘수록 조금씩 길어지지만 카드 한 장에 주는 시간은 판마다 줄어 점점 어려워진다
 * (1판 12장 2.0초 = 장당 0.17초 → 6판 30장 2.8초 = 장당 0.09초). 높은 판도 2.6초 아래로는 내려가지 않는다
 */
const TABLE: Omit<StageDef, 'peekMs'>[] = [
  { pairs: 6, cols: 3, rows: 4, viewMs: 2000, matchGain: 1500, twins: 0 },
  { pairs: 8, cols: 4, rows: 4, viewMs: 2200, matchGain: 1500, twins: 0 },
  { pairs: 10, cols: 4, rows: 5, viewMs: 2400, matchGain: 1200, twins: 0 },
  { pairs: 12, cols: 4, rows: 6, viewMs: 2500, matchGain: 1000, twins: 0 },
  { pairs: 12, cols: 4, rows: 6, viewMs: 2600, matchGain: 900, twins: 2 },
  { pairs: 15, cols: 5, rows: 6, viewMs: 2800, matchGain: 700, twins: 3 },
];

/** 9판부터 판마다 짝 시간을 이만큼 줄이고, MIN_MATCH_GAIN 아래로는 내리지 않는다(높은 판이 같은 난이도로 늘어지지 않게) */
export const MATCH_GAIN_STEP = 50;
export const MIN_MATCH_GAIN = 250;

/** n판(1부터)의 규칙. 6판부터는 같은 크기로 계속되고, 8판부터 닮은 짝이 하나 더 늘고 얻는 시간·미리 보기가 조금 줄어든다.
 * 9판부터는 짝 시간이 판마다 MATCH_GAIN_STEP 씩 줄어 13판에서 바닥(MIN_MATCH_GAIN)에 닿는다 */
export function stageDef(n: number): StageDef {
  const base = TABLE[Math.min(n, TABLE.length) - 1];
  const def = n < 8 ? base : { ...base, twins: 4, matchGain: Math.max(MIN_MATCH_GAIN, 500 - (n - 8) * MATCH_GAIN_STEP), viewMs: 2600 };
  return { ...def, peekMs: DEAL_MS + def.viewMs };
}

/** 특수 카드(시계·엿보기) 짝 수. 1판은 없음, 2~3판은 70% 확률로 1쌍, 4판부터 1쌍 + 40% 확률로 1쌍 더 */
export function specialCount(n: number, rng: () => number): number {
  if (n < 2) return 0;
  if (n < 4) return rng() < 0.7 ? 1 : 0;
  return 1 + (rng() < 0.4 ? 1 : 0);
}

/** 2판부터 판마다 이 확률로 보통 짝 하나가 황금 카드(점수 2배)가 된다 */
export const GOLD_CHANCE = 0.18;

/** 콤보에 따른 점수 배수: 1콤보 ×1, 2콤보 ×1.5 … 9콤보부터 ×5 */
export function comboMultiplier(combo: number): number {
  return Math.min(5, 1 + 0.5 * Math.max(0, combo - 1));
}

export const MATCH_POINTS = 100;
/** 두 장 다 전에 본 카드였는데 한 번에 맞힘 */
export const MEMORY_BONUS = 50;
/** 두 장 다 처음 본 카드였는데 우연히 맞음 */
export const LUCKY_BONUS = 20;
/** 판 클리어 보너스 = 판 번호 × STAGE_BONUS, 퍼펙트면 PERFECT_BONUS 를 더 */
export const STAGE_BONUS = 200;
export const PERFECT_BONUS = 500;
