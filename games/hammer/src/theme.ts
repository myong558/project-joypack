import { setSceneSkin } from './ui/scene';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

export type Skin = 'garden' | 'desert' | 'jungle' | 'snow';
export type SkinSetting = 'auto' | Skin;
export const SKINS: Skin[] = ['garden', 'desert', 'jungle', 'snow'];
export const SKIN_SETTINGS: SkinSetting[] = ['auto', ...SKINS];
export const SKIN_EMOJI: Record<SkinSetting, string> = {
  auto: '🔄',
  garden: '🌷',
  desert: '🌵',
  jungle: '🌴',
  snow: '🏔️',
};

/** 자동이면 날짜마다 바뀐다. 같은 날에는 어디서나 같은 스킨 */
export function resolveSkin(setting: SkinSetting, date: Date): Skin {
  // 자동: 조이팩 공통 규칙(날마다 무작위, 이틀 연속 같은 스킨 없음, 기준서 1.4)
  return setting === 'auto' ? SKINS[Joypack.dailyPick('hammer', SKINS.length, date)] : setting;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applySkin(skin: Skin): void {
  document.documentElement.dataset.skin = skin;
  setSceneSkin(skin);
}
