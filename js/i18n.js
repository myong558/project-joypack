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
      'difficulty.extreme': '최상위',
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
      'result.share': '공유하기',
      'share.wonText': (p) => '업다운 게임 ' + p.level + '(' + p.min + '~' + p.max + ') ' + p.tries + '번 만에 성공! 도전해 보세요 🎯',
      'share.lostText': (p) => '업다운 게임 ' + p.level + '(' + p.min + '~' + p.max + ') 아깝게 실패… 도전해 보세요 🎯',
      'share.copied': '결과 이미지를 저장하고 링크를 복사했어요',
      'share.saved': '결과 이미지를 저장했어요',
      'share.linkCopied': '링크를 복사했어요',
      'share.failed': '공유하지 못했어요',
      'nav.home': '홈',
      'ranking.open': '랭킹',
      'ranking.register': '랭킹 등록',
      'ranking.title': '랭킹 TOP 10',
      'ranking.prompt': (p) => p.level + ' ' + p.tries + '번 · ' + p.time + ' 만에 성공! TOP 10 에 들었어요. 이니셜을 등록하세요',
      'ranking.time': (p) => (p.min ? p.min + '분 ' : '') + p.sec + '초',
      'ranking.initials': '영문 이니셜 5자까지',
      'ranking.submit': '등록',
      'ranking.loading': '불러오는 중…',
      'ranking.empty': '아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!',
      'ranking.failed': '랭킹을 불러오지 못했어요. 인터넷 연결을 확인해 주세요',
      'ranking.submitFailed': '등록하지 못했어요. 다시 시도해 주세요',
      'ranking.done': (p) => (p.rank ? p.rank + '위로 등록했어요!' : '등록했어요! 아쉽게 10위 밖이에요'),
      'ranking.score': (p) => p.tries + '회 · ' + p.time,
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
      'settings.fx': '효과음·진동',
      'settings.sound': (p) => '효과음 ' + (p.on ? '켬' : '끔'),
      'settings.vibrate': (p) => '진동 ' + (p.on ? '켬' : '끔'),
      'settings.version': (p) => '버전 ' + p.version,
      'settings.shareGame': '링크 공유',
      'settings.shareText': '숫자 맞추기 업다운 게임, 같이 해요! 🎯',
      'settings.linkCopied': '복사했어요',
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
      'difficulty.extreme': 'Extreme',
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
      'result.share': 'Share',
      'share.wonText': (p) => 'Up-Down Game ' + p.level + ' (' + p.min + '-' + p.max + '): got it in ' + tries(p.tries) + '! Can you beat it? 🎯',
      'share.lostText': (p) => 'Up-Down Game ' + p.level + ' (' + p.min + '-' + p.max + '): so close! Can you beat it? 🎯',
      'share.copied': 'Result image saved and link copied',
      'share.saved': 'Result image saved',
      'share.linkCopied': 'Link copied',
      'share.failed': "Couldn't share",
      'nav.home': 'Home',
      'ranking.open': 'Ranking',
      'ranking.register': 'Join ranking',
      'ranking.title': 'Top 10',
      'ranking.prompt': (p) => p.level + ': ' + tries(p.tries) + ' in ' + p.time + '. You made the top 10! Enter your initials',
      'ranking.time': (p) => (p.min ? p.min + 'm ' : '') + p.sec + 's',
      'ranking.initials': 'Initials (up to 5 letters)',
      'ranking.submit': 'Submit',
      'ranking.loading': 'Loading…',
      'ranking.empty': 'No records yet. Be the first!',
      'ranking.failed': "Couldn't load the ranking. Check your connection",
      'ranking.submitFailed': "Couldn't submit. Please try again",
      'ranking.done': (p) => (p.rank ? 'You placed #' + p.rank + '!' : 'Submitted! Just outside the top 10'),
      'ranking.score': (p) => tries(p.tries) + ' · ' + p.time,
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
      'settings.fx': 'Effects',
      'settings.sound': (p) => 'Sound ' + (p.on ? 'on' : 'off'),
      'settings.vibrate': (p) => 'Vibration ' + (p.on ? 'on' : 'off'),
      'settings.version': (p) => 'Version ' + p.version,
      'settings.shareGame': 'Share link',
      'settings.shareText': "Let's play the Up-Down number guessing game! 🎯",
      'settings.linkCopied': 'Copied',
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
