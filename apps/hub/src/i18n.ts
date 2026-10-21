export type Lang = 'ko' | 'en';
export const LANGS: Lang[] = ['ko', 'en'];
export const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };

const ko = {
  'app.title': '조이팩',
  'app.tagline': '하나씩 늘어나는 미니 게임 모음',
  'games.label': '게임 목록',
  'game.play': '플레이',
  'game.offlineReady': '오프라인 가능',
  'game.needsOnline': '인터넷 연결 후 한 번 열어 주세요',
  'game.soon': '준비 중',
  'game.next': '다음 게임',
  'game.nextDesc': '새 미니 게임을 만들고 있어요',
  'offline.banner': '오프라인이에요. 한 번 열어 본 게임만 플레이할 수 있어요.',
  'update.ready': '새 버전이 준비됐어요',

  'best.updown': '최고 {board} {tries}회',
  'best.hammer': '최고 {score}점',

  'ranking.open': '전체 랭킹',
  'ranking.title': '전체 랭킹',
  'ranking.sub': '게임별 TOP 3',
  'ranking.loading': '불러오는 중…',
  'ranking.empty': '아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!',
  'ranking.error': '랭킹을 불러오지 못했어요',
  'ranking.cached': '마지막으로 불러온 순위예요',
  'ranking.more': 'TOP 10 전체 보기',
  'ranking.tries': '{tries}회 · {time}초',
  'ranking.score': '{score}점',

  'settings.open': '설정',
  'settings.title': '설정',
  'settings.note': '여기서 고른 설정은 모든 게임에 함께 적용돼요.',
  'settings.theme': '컬러 모드',
  'theme.system': '기기 설정',
  'theme.light': '라이트',
  'theme.dark': '다크',
  'settings.lang': '언어',
  'settings.feedback': '소리·진동',
  'settings.sound': '효과음',
  'settings.vibrate': '진동',
  'settings.initials': '랭킹 이름',
  'settings.initialsHint': '영문 대문자 5자까지. 게임에서 랭킹에 올릴 때 미리 채워져요.',
  'settings.storage': '오프라인 저장',
  'settings.storageHint': '한 번 연 게임은 기기에 저장돼 인터넷 없이도 열려요. 비워도 최고 기록은 남아요.',
  'storage.ready': '저장됨',
  'storage.none': '아직 안 받음',
  'storage.clear': '비우기',
  'settings.about': '정보',
  'close': '닫기',
};

const en: Record<keyof typeof ko, string> = {
  'app.title': 'Joypack',
  'app.tagline': 'A growing pack of mini games',
  'games.label': 'Games',
  'game.play': 'Play',
  'game.offlineReady': 'Works offline',
  'game.needsOnline': 'Open it once while online',
  'game.soon': 'Coming soon',
  'game.next': 'Next game',
  'game.nextDesc': 'A new mini game is on the way',
  'offline.banner': "You're offline. Only games you've opened before can be played.",
  'update.ready': 'A new version is ready',

  'best.updown': 'Best {board} {tries} tries',
  'best.hammer': 'Best {score}',

  'ranking.open': 'Rankings',
  'ranking.title': 'Rankings',
  'ranking.sub': 'Top 3 of each game',
  'ranking.loading': 'Loading…',
  'ranking.empty': 'No records yet. Be the first!',
  'ranking.error': "Couldn't load the ranking",
  'ranking.cached': 'Showing the last loaded ranking',
  'ranking.more': 'See full Top 10',
  'ranking.tries': '{tries} tries · {time}s',
  'ranking.score': '{score} pts',

  'settings.open': 'Settings',
  'settings.title': 'Settings',
  'settings.note': 'These settings apply to every game.',
  'settings.theme': 'Color mode',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'settings.lang': 'Language',
  'settings.feedback': 'Sound & vibration',
  'settings.sound': 'Sound',
  'settings.vibrate': 'Vibration',
  'settings.initials': 'Ranking name',
  'settings.initialsHint': 'Up to 5 letters (A–Z). Filled in when you join a ranking.',
  'settings.storage': 'Offline storage',
  'settings.storageHint': 'Games you open are saved on this device and work offline. Clearing keeps your best scores.',
  'storage.ready': 'Saved',
  'storage.none': 'Not saved yet',
  'storage.clear': 'Clear',
  'settings.about': 'About',
  close: 'Close',
};

export type MessageKey = keyof typeof ko;
const MESSAGES: Record<Lang, Record<MessageKey, string>> = { ko, en };

let lang: Lang = 'ko';

export function setLang(next: Lang): void {
  lang = next;
  document.documentElement.lang = next;
}

export function getLang(): Lang {
  return lang;
}

export function detectLang(): Lang {
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  return LANGS.includes(browser as Lang) ? (browser as Lang) : 'ko';
}

export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export function formatNumber(n: number): string {
  return n.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US');
}
