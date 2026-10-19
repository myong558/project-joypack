// 업다운 게임 규칙. DOM을 건드리지 않는다.
(function (global) {
  'use strict';

  const DIFFICULTIES = {
    // 화면에 보이는 난이도 이름은 js/i18n.js 의 difficulty.<키> 에 있다.
    easy: { min: 1, max: 50, maxTries: 6 },
    normal: { min: 1, max: 100, maxTries: 5 },
    hard: { min: 1, max: 100, maxTries: 4 },
    extreme: { min: 1, max: 200, maxTries: 3 },
  };

  // min~max 의 모든 숫자가 같은 확률로 나온다.
  function pickAnswer(min, max, rand) {
    return min + Math.floor(rand() * (max - min + 1));
  }

  // random 은 테스트에서 정답을 고정하기 위한 것으로, 0 이상 1 미만의 수를 돌려주는 함수다.
  function createGame(difficulty, random) {
    const config = DIFFICULTIES[difficulty];
    if (!config) throw new Error('알 수 없는 난이도: ' + difficulty);
    const answer = pickAnswer(config.min, config.max, random || Math.random);
    return {
      difficulty: difficulty,
      answer: answer,
      maxTries: config.maxTries,
      guesses: [],
      low: config.min,
      high: config.max,
      status: 'playing',
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

  // 검증에 걸리면 { ok: false, error } 를 돌려주고 기회를 차감하지 않는다.
  function guess(state, value) {
    const error = checkInput(state, value);
    if (error) return { ok: false, error: error };

    let result;
    if (value === state.answer) {
      result = 'CORRECT';
      state.status = 'won';
    } else if (value < state.answer) {
      result = 'UP';
      state.low = Math.max(state.low, value + 1);
    } else {
      result = 'DOWN';
      state.high = Math.min(state.high, value - 1);
    }

    state.guesses.push({ value: value, result: result });
    if (state.status === 'playing' && state.guesses.length >= state.maxTries) {
      state.status = 'lost';
    }
    return { ok: true, result: result, value: value };
  }

  function triesLeft(state) {
    return state.maxTries - state.guesses.length;
  }

  const api = {
    DIFFICULTIES: DIFFICULTIES,
    createGame: createGame,
    guess: guess,
    triesLeft: triesLeft,
  };
  global.UpDown = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
