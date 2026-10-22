import list from '../../../games.json';
import type { Lang } from './i18n';

export type Text = Record<Lang, string>;

export interface Board {
  id: string;
  name: Text;
}

export interface GameMeta {
  id: string;
  name: Text;
  desc: Text;
  /** 사이트 루트 기준 게임 주소 */
  path: string;
  /** 저장소 루트 기준 아이콘 파일. 허브 빌드에 함께 넣어 오프라인에서도 보인다 */
  icon: string;
  color: string;
  /**
   * live: 공개. preview: 배포하지만 비밀번호를 확인한 기기에만 카드가 보임(그 밖에는 soon 처럼).
   * soon: 배포하지 않고 "다음 게임" 띠에 이름만
   */
  status: 'live' | 'preview' | 'soon';
  /** 조이팩에 추가한 날(YYYY-MM-DD). 허브 카드는 이 날짜가 늦은 게임부터 보인다 */
  added: string;
  ranking?: { path: string; default: string; boards: Board[] };
}

export const GAMES = list as GameMeta[];

/** 가장 최근에 추가한 게임에 NEW 를 붙여 두는 날 수 */
const NEW_DAYS = 14;

/** 최근에 추가한 게임부터. 날짜가 같으면 games.json 에서 뒤에 적힌 게임이 앞에 온다 */
export function byNewest(games: GameMeta[]): GameMeta[] {
  return games
    .map((game, i) => ({ game, i }))
    .sort((a, b) => b.game.added.localeCompare(a.game.added) || b.i - a.i)
    .map(({ game }) => game);
}

/** 허브 카드 그림판 무늬 가짓수(styles.css .card-art[data-pat]) */
const PATTERNS = 6;

/** 그림판 무늬 번호: 추가한 순서(오래된 게임부터 0)대로 돌려 쓴다. 새 게임이 생겨도 기존 게임 무늬는 그대로 */
export function patternOf(game: GameMeta): number {
  return byNewest(GAMES).reverse().indexOf(game) % PATTERNS;
}

/** NEW 표시: 가장 최근에 추가한 게임 하나만, 추가한 날부터 NEW_DAYS 동안 */
export function isNew(game: GameMeta, newest: GameMeta | undefined, now = Date.now()): boolean {
  if (game !== newest) return false;
  const added = Date.parse(game.added + 'T00:00:00');
  return now - added < NEW_DAYS * 86_400_000;
}

// 게임 아이콘을 허브 빌드에 넣는다(작은 SVG 는 허브 JS 안에 그대로 들어감).
const ICONS = import.meta.glob<string>(['../../../games/*/**/*.svg', '!**/node_modules/**', '!**/dist/**'], {
  eager: true,
  query: '?url',
  import: 'default',
});

export function iconUrl(game: GameMeta): string {
  return ICONS[`../../../${game.icon}`] ?? '';
}

export function gameVersion(id: string): string {
  return __GAME_VERSIONS__[id] ?? '';
}
