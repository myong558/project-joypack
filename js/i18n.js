// 화면 문구와 언어 설정. 언어를 추가하려면 MESSAGES 에 같은 키로 한 벌 더 넣는다.
(function (global) {
  'use strict';

  const LANG_KEY = 'updown.lang';
  const DEFAULT_LANG = 'ko';

  const tries = (n) => n + (n === 1 ? ' try' : ' tries');

  const MESSAGES = {
    ko: {
      'lang.switch': 'English',
      'lang.switchLabel': 'Switch to English',
      'app.title': '업다운 게임',
      'difficulty.easy': '쉬움',
      'difficulty.normal': '보통',
      'difficulty.hard': '어려움',
      'difficulty.detail': (p) => p.min + ' ~ ' + p.max + ' · 기회 ' + p.tries + '회',
      'difficulty.best': (p) => '최고 기록 ' + p.tries + '회',
      'difficulty.noBest': '기록 없음',
      'difficulty.bestShort': (p) => p.tries + '회',
      'play.range': '가능한 범위',
      'play.triesLeft': '남은 기회',
      'play.inputLabel': '추측할 숫자',
      'play.submit': '확인',
      'play.minus': '1 작게',
      'play.plus': '1 크게',
      'play.history': '시도 기록',
      'play.historyEmpty': '추측한 숫자가 여기에 쌓여요',
      'result.won': '정답!',
      'result.lost': '실패',
      'result.wonDetail': (p) => p.tries + '번 만에 성공!',
      'result.newBest': '최고 기록 갱신!',
      'result.retry': '다시 하기',
      'result.home': '홈으로',
      'nav.home': '홈',
      'settings.open': '설정',
      'settings.title': '설정',
      'settings.close': '닫기',
      'settings.records': '기록 리셋',
      'settings.resetAll': '전체',
      'settings.confirmAll': '모든 난이도의 최고 기록을 지울까요?',
      'settings.confirmOne': (p) => p.level + ' 최고 기록을 지울까요?',
      'settings.theme': '컬러 모드',
      'settings.system': '기기 설정',
      'settings.light': '라이트 모드',
      'settings.dark': '다크 모드',
      'settings.skin': '스킨 설정',
      'skin.auto': '자동',
      'skin.spring': '봄',
      'skin.summer': '여름',
      'skin.autumn': '가을',
      'skin.winter': '겨울',
      'settings.language': '언어 설정',
      'confirm.cancel': '취소',
      'confirm.delete': '지우기',
    },
    en: {
      'lang.switch': '한국어',
      'lang.switchLabel': '한국어로 변경',
      'app.title': 'Up-Down Game',
      'difficulty.easy': 'Easy',
      'difficulty.normal': 'Normal',
      'difficulty.hard': 'Hard',
      'difficulty.detail': (p) => p.min + ' ~ ' + p.max + ' · ' + tries(p.tries),
      'difficulty.best': (p) => 'Best: ' + tries(p.tries),
      'difficulty.noBest': 'No record',
      'difficulty.bestShort': (p) => String(p.tries),
      'play.range': 'Range',
      'play.triesLeft': 'Tries left',
      'play.inputLabel': 'Your guess',
      'play.submit': 'Guess',
      'play.minus': 'One less',
      'play.plus': 'One more',
      'play.history': 'Guess history',
      'play.historyEmpty': 'Your guesses will show up here',
      'result.won': 'Correct!',
      'result.lost': 'Game over',
      'result.wonDetail': (p) => 'Got it in ' + tries(p.tries) + '!',
      'result.newBest': 'New best record!',
      'result.retry': 'Play again',
      'result.home': 'Go home',
      'nav.home': 'Home',
      'settings.open': 'Settings',
      'settings.title': 'Settings',
      'settings.close': 'Close',
      'settings.records': 'Reset records',
      'settings.resetAll': 'All',
      'settings.confirmAll': 'Delete the best records for all levels?',
      'settings.confirmOne': (p) => 'Delete the ' + p.level + ' best record?',
      'settings.theme': 'Color mode',
      'settings.system': 'System',
      'settings.dark': 'Dark',
      'settings.light': 'Light',
      'settings.skin': 'Skin',
      'skin.auto': 'Auto',
      'skin.spring': 'Spring',
      'skin.summer': 'Summer',
      'skin.autumn': 'Autumn',
      'skin.winter': 'Winter',
      'settings.language': 'Language',
      'confirm.cancel': 'Cancel',
      'confirm.delete': 'Delete',
    },
  };

  // 언어 선택 버튼에 쓰는 이름. 어느 언어 화면에서든 그 언어 자체 표기로 보여준다.
  const NAMES = { ko: '한국어', en: 'English' };

  // 저장된 선택이 없으면 브라우저 언어를 따른다.
  function detectLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (MESSAGES[saved]) return saved;
    } catch (e) {}
    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    return MESSAGES[browser] ? browser : DEFAULT_LANG;
  }

  let lang = detectLang();

  function t(key, params) {
    const message = MESSAGES[lang][key] !== undefined ? MESSAGES[lang][key] : MESSAGES[DEFAULT_LANG][key];
    return typeof message === 'function' ? message(params || {}) : message;
  }

  function getLang() {
    return lang;
  }

  function setLang(next) {
    if (!MESSAGES[next]) return;
    lang = next;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch (e) {}
  }

  global.UpDownI18n = { LANGS: Object.keys(MESSAGES), NAMES: NAMES, t: t, getLang: getLang, setLang: setLang };
})(window);
