// 업다운 게임 규칙. DOM을 건드리지 않는다.
(function (global) {
  'use strict';

  const DIFFICULTIES = {
    // 화면에 보이는 난이도 이름은 js/i18n.js 의 difficulty.<키> 에 있다.
    easy: { min: 1, max: 50, maxTries: 6 },
    normal: { min: 1, max: 100, maxTries: 5 },
    hard: { min: 1, max: 100, maxTries: 4 },
    extreme: { min: 1, max: 150, maxTries: 3 },
  };

  // 이분 탐색이 n번째로 찍는 숫자가 뽑힐 비율(앞에서부터 1번째, 2번째, ...). 목록보다 늦게 찍히는 숫자는 1.
  // 중간값부터 반씩 찍는 방법이 일찍 맞히지 못하도록, 일찍 찍히는 숫자일수록 정답으로 덜 나오게 한다.
  const SEARCH_WEIGHTS = [0.2, 0.4, 0.6, 0.8];
  // 범위의 처음·마지막 숫자(1~100 이면 1 과 100)가 뽑힐 비율. 끝 숫자부터 찍어 보는 경우도 쉽게 맞히지 않게 한다.
  const EDGE_WEIGHT = 0.2;
  // 다이얼을 움직이지 않고 확인만 누르면 매번 남은 범위의 최솟값을 찍어 min, min+1, ... 순서로 기회 수만큼 찍게 된다.
  // 이 숫자들(1~100, 기회 5번이면 1~5)이 뽑힐 비율을 크게 낮춰 생각 없이 눌러서는 거의 맞히지 못하게 한다.
  const CLICK_RUN_WEIGHT = 0.05;

  // 각 숫자가 이분 탐색 몇 번째에 찍히는지 구한다. 가운데가 둘일 때 작은 쪽을 찍는 경우와
  // 큰 쪽을 찍는 경우(1~100 이면 50 과 51)를 모두 따져 더 이른 쪽을 쓴다.
  function searchDepths(min, max) {
    const depths = {};
    function visit(low, high, depth, roundUp) {
      if (low > high) return;
      const mid = roundUp ? Math.ceil((low + high) / 2) : Math.floor((low + high) / 2);
      depths[mid] = Math.min(depths[mid] || Infinity, depth);
      visit(low, mid - 1, depth + 1, roundUp);
      visit(mid + 1, high, depth + 1, roundUp);
    }
    visit(min, max, 1, false);
    visit(min, max, 1, true);
    return depths;
  }

  // 이분 탐색에 늦게 찍히는 숫자일수록 무게가 큰 가중 추첨. random() 한 번으로 정답 하나를 고른다.
  function pickAnswer(min, max, maxTries, rand) {
    const depths = searchDepths(min, max);
    const weights = [];
    let total = 0;
    for (let n = min; n <= max; n++) {
      let w = n === min || n === max ? EDGE_WEIGHT : SEARCH_WEIGHTS[depths[n] - 1] || 1;
      if (n < min + maxTries) w = Math.min(w, CLICK_RUN_WEIGHT);
      weights.push(w);
      total += w;
    }
    let target = rand() * total;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target < 0) return min + i;
    }
    return max;
  }

  // random 은 테스트에서 정답을 고정하기 위한 것으로, 0 이상 1 미만의 수를 돌려주는 함수다.
  function createGame(difficulty, random) {
    const config = DIFFICULTIES[difficulty];
    if (!config) throw new Error('알 수 없는 난이도: ' + difficulty);
    const answer = pickAnswer(config.min, config.max, config.maxTries, random || Math.random);
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
