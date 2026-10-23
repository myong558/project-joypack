// 업다운 게임 규칙. DOM을 건드리지 않는다.
// 하트(기회 제한)·난이도 없이 1 ~ 끝 숫자 범위만 고른다. 맞힐 때까지 계속하고, 점수 하나로 순위를 겨룬다.
(function (global) {
  'use strict';

  // 랭킹이 있는 범위(끝 숫자). 화면 순서도 이 순서다. 그 밖의 끝 숫자는 "직접 정하기"(연습, 랭킹 없음).
  const PRESETS = [50, 100, 200];
  const CUSTOM_MIN = 10;
  const CUSTOM_MAX = 9999;

  // 점수 = 1000 + 100 × (정석 횟수 − 시도 횟수) − 0.1초마다 1점, 0점 아래로는 내려가지 않는다.
  // 정석 횟수는 반씩 좁히면 반드시 맞히는 횟수(1~100 이면 7번). 빨리, 적게 맞힐수록 높다.
  // Firestore 보안 규칙(firestore.rules)이 같은 식으로 올린 점수를 검사하므로 바꾸면 규칙도 같이 바꾼다.
  const BASE = 1000;
  const PER_TRY = 100;
  const MS_PER_POINT = 100;

  function isPreset(max) {
    return PRESETS.indexOf(max) >= 0;
  }

  // 직접 정한 끝 숫자를 허용 범위의 정수로 맞춘다.
  function clampMax(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return PRESETS[1];
    return Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, n));
  }

  function optimalTries(max) {
    return Math.ceil(Math.log2(max + 1));
  }

  // penalty: 온도계를 쓴 판의 차감 점수(thermoCost). 차감은 점수를 낮추기만 하므로 서버 규칙의 상한 검사와 부딪치지 않는다.
  function score(max, tries, timeMs, penalty) {
    return Math.max(0, BASE + PER_TRY * (optimalTries(max) - tries) - Math.floor(timeMs / MS_PER_POINT) - (penalty || 0));
  }

  // ── 온도계 ──
  // 한 판에 한 번, 방금 넣은 숫자의 온도(아래 temperature)를 보여 준다. 온도는 이때만 보이고 자동으로는 나오지 않는다.
  // 시도 1번 = 100점이라, 온도계로 아낄 수 있는 1~2번보다 확실히 크게 뺀다(1~50 은 정석 횟수가 적어 조금 덜).
  // 연습 판(직접 정하기)은 랭킹이 없으니 빼지 않는다. 남은 숫자가 범위의 10% 이하면 쓸 수 없다.
  const THERMO_COST = 300;
  const THERMO_COST_SMALL = 250;
  const THERMO_LIMIT = 0.1;

  function thermoCost(state) {
    if (!state.ranked) return 0;
    return state.max <= 50 ? THERMO_COST_SMALL : THERMO_COST;
  }

  // 남은 숫자가 이 개수 이하면 쓸 수 없다(1~50: 5, 1~100: 10, 1~200: 20)
  function thermoLimit(state) {
    return Math.ceil(state.max * THERMO_LIMIT);
  }

  function remaining(state) {
    return state.high - state.low + 1;
  }

  // 'ready'(쓸 수 있음) · 'used'(이미 씀) · 'finished'(판 끝남) · 'noGuess'(아직 넣은 숫자 없음) · 'tooFew'(남은 숫자가 적음)
  function thermoStatus(state) {
    if (state.thermo) return 'used';
    if (state.status !== 'playing') return 'finished';
    if (!state.guesses.length) return 'noGuess';
    if (remaining(state) <= thermoLimit(state)) return 'tooFew';
    return 'ready';
  }

  // 마지막으로 넣은 숫자의 온도를 그 기록에 남긴다
  function useThermo(state) {
    const status = thermoStatus(state);
    if (status !== 'ready') return { ok: false, error: status };
    const index = state.guesses.length - 1;
    const last = state.guesses[index];
    last.temp = temperature(state, last.value);
    state.thermo = { at: index, cost: thermoCost(state) };
    return { ok: true, temp: last.temp, cost: state.thermo.cost };
  }

  // 정답과의 거리로 나눈 온도 힌트: hot(아주 가까움) · warm · cool · cold(멀다). 범위가 커도 비율로 같은 느낌이 나게 한다.
  function temperature(state, value) {
    const distance = Math.abs(value - state.answer);
    const ratio = distance / state.max;
    if (distance <= 2 || ratio <= 0.03) return 'hot';
    if (ratio <= 0.1) return 'warm';
    if (ratio <= 0.25) return 'cool';
    return 'cold';
  }

  // 1~max 의 모든 숫자가 같은 확률로 나온다. random 은 테스트에서 정답을 고정하기 위한 것(0 이상 1 미만).
  // practice 면 랭킹 범위와 같은 끝 숫자라도 연습 판(직접 정하기)이다.
  function createGame(max, random, practice) {
    const end = isPreset(max) ? max : clampMax(max);
    return {
      max: end,
      ranked: !practice && isPreset(end),
      answer: 1 + Math.floor((random || Math.random)() * end),
      guesses: [],
      low: 1,
      high: end,
      status: 'playing',
      thermo: null, // 온도계를 쓰면 { at: 기록 번호, cost: 차감 점수 }
    };
  }

  // 추측 검증. 통과하면 null, 아니면 오류 코드. 화면의 다이얼은 범위 안 정수만 고를 수 있어 규칙을 지키기 위한 안전장치다.
  function checkInput(state, value) {
    if (state.status !== 'playing') return 'FINISHED';
    if (!Number.isInteger(value)) return 'NOT_NUMBER';
    // 힌트로 좁혀진 범위 밖은 받지 않는다. 이미 입력한 숫자도 모두 이 범위 밖에 있다.
    if (value < state.low || value > state.high) return 'OUT_OF_RANGE';
    return null;
  }

  function guess(state, value) {
    const error = checkInput(state, value);
    if (error) return { ok: false, error: error };

    let result;
    if (value === state.answer) {
      result = 'CORRECT';
      state.status = 'won';
    } else {
      if (value < state.answer) {
        result = 'UP';
        state.low = Math.max(state.low, value + 1);
      } else {
        result = 'DOWN';
        state.high = Math.min(state.high, value - 1);
      }
    }
    // temp: 온도계를 이 숫자에 썼을 때만 채워진다
    state.guesses.push({ value: value, result: result, temp: null });
    return { ok: true, result: result, value: value };
  }

  const api = {
    PRESETS: PRESETS,
    CUSTOM_MIN: CUSTOM_MIN,
    CUSTOM_MAX: CUSTOM_MAX,
    isPreset: isPreset,
    clampMax: clampMax,
    optimalTries: optimalTries,
    score: score,
    thermoCost: thermoCost,
    thermoLimit: thermoLimit,
    remaining: remaining,
    thermoStatus: thermoStatus,
    useThermo: useThermo,
    createGame: createGame,
    guess: guess,
  };
  global.UpDown = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
