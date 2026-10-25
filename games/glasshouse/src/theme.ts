export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

/**
 * 스킨 묶음: 온실 유리 너머의 날씨 톤. 하늘·햇살 색, 바깥 날씨(구름·비·노을·눈), 단추 강조색이 바뀐다(styles.css [data-skin], ui/scene.ts).
 * 판 규칙·꽃과는 상관없다(온실 안이라 꽃은 날씨·계절과 상관없이 핀다)
 */
export const SKINS = ['clear', 'rain', 'dusk', 'snow'] as const;
export type Skin = (typeof SKINS)[number];
export type SkinSetting = 'auto' | Skin;
export const SKIN_SETTINGS: SkinSetting[] = ['auto', ...SKINS];

/** 날짜 번호(1970-01-01부터 며칠째, 그 기기 날짜). 같은 날에는 어디서나 같다 */
const dayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);

/** 오늘의 톤: 날마다 차례로 바뀐다 */
export const todaySkin = (date: Date): Skin => SKINS[dayNumber(date) % SKINS.length];

/** 자동이면 처음 화면은 오늘의 톤, 정원에 들어가면 정원마다 다음 톤으로 돌아가 지루하지 않게. 고르면 그 톤으로 고정 */
export function resolveSkin(setting: SkinSetting, date: Date, garden?: number): Skin {
  if (setting !== 'auto') return setting;
  return SKINS[(dayNumber(date) + (garden ?? 0)) % SKINS.length];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export function applySkin(skin: Skin): void {
  document.documentElement.dataset.skin = skin;
}
