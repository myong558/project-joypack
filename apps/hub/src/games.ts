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
  /** live: 공개, soon: "준비 중" 카드로만 보임 */
  status: 'live' | 'soon';
  ranking?: { path: string; default: string; boards: Board[] };
}

export const GAMES = list as GameMeta[];

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
