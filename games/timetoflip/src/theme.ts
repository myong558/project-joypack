import { dateSeed } from './game/rng';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

/** 스킨 묶음: 하루의 시간대. 배경 하늘·빛 입자·강조색이 바뀐다(styles.css [data-skin]) */
export type Skin = 'morning' | 'noon' | 'sunset' | 'night';
export type SkinSetting = 'auto' | Skin;
const SKINS: Skin[] = ['morning', 'noon', 'sunset', 'night'];
export const SKIN_SETTINGS: SkinSetting[] = ['auto', ...SKINS];

/** 자동이면 날짜마다 바뀐다. 같은 날에는 어디서나 같은 스킨 */
export function resolveSkin(setting: SkinSetting, date: Date): Skin {
  return setting === 'auto' ? SKINS[dateSeed(date) % SKINS.length] : setting;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applySkin(skin: Skin): void {
  document.documentElement.dataset.skin = skin;
}
