import { applyTheme, type Theme } from './settings';

/**
 * 허브 톤(스킨) 5개. 날마다 하나가 정해지고(index.html 의 <head> 스크립트) 사용자가 고르는 설정은 없다(개발자 모드 미리보기만).
 * 색은 styles.css 의 :root[data-skin='…'] 토큰에 있다.
 */
export const SKINS = ['grape', 'candy', 'soda', 'lemon', 'mint'] as const;
export type Skin = (typeof SKINS)[number];

const isSkin = (v: unknown): v is Skin => SKINS.includes(v as Skin);

/** 오늘 날짜로 정해진 톤 */
export function todaySkin(): Skin {
  const today = document.documentElement.dataset.skinToday;
  return isSkin(today) ? today : 'grape';
}

/** 지금 화면에 적용된 톤(임시 미리보기 포함) */
export function currentSkin(): Skin {
  const skin = document.documentElement.dataset.skin;
  return isSkin(skin) ? skin : todaySkin();
}

// ---------- 개발자 모드: 설정에서 톤 미리보기 ----------
// 개발자 모드(preview.ts)를 켠 기기에서만 설정에 보이고, index.html 도 개발자 모드일 때만 joypack.hubSkin 을 읽는다.
// 개발자 모드를 끄면 고른 톤을 지운다(main.ts openPreviewSwitch). 평소에는 날마다 정해진 톤으로 고정.

const PREVIEW_KEY = 'joypack.hubSkin';

/** 미리보기로 고른 톤. 없으면 'auto'(오늘의 톤) */
export function previewSkin(): Skin | 'auto' {
  try {
    const value = localStorage.getItem(PREVIEW_KEY);
    return isSkin(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function setPreviewSkin(value: Skin | 'auto', theme: Theme): void {
  try {
    if (value === 'auto') localStorage.removeItem(PREVIEW_KEY);
    else localStorage.setItem(PREVIEW_KEY, value);
  } catch {
    // 저장소를 못 쓰면 이번 화면에만 적용
  }
  document.documentElement.dataset.skin = value === 'auto' ? todaySkin() : value;
  // 주소창 색(theme-color)이 톤의 배경색을 따라가게 다시 적용
  applyTheme(theme);
}
