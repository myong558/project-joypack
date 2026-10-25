import type { Season } from './flora';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

/** 스킨 묶음: 계절의 빛. 온실 유리 너머 하늘·햇살 색·바깥 날씨와 꽃 강조색이 바뀐다(styles.css [data-skin]) */
export type Skin = Season;
export type SkinSetting = 'auto' | Skin;
const SKINS: Skin[] = ['spring', 'summer', 'autumn', 'winter'];
export const SKIN_SETTINGS: SkinSetting[] = ['auto', ...SKINS];

/** 달력의 계절(3~5월 봄 …). 같은 날에는 어디서나 같다 */
export function calendarSeason(date: Date): Skin {
  const m = date.getMonth() + 1;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

/** 자동이면 게임 중에는 그 정원의 계절, 그 밖에는 오늘의 계절 */
export function resolveSkin(setting: SkinSetting, date: Date, garden?: Season): Skin {
  if (setting !== 'auto') return setting;
  return garden ?? calendarSeason(date);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applySkin(skin: Skin): void {
  document.documentElement.dataset.skin = skin;
}
