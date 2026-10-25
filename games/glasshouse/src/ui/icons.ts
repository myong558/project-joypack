import type { SkinSetting, Theme } from '../theme';

/** 선 아이콘(24×24, currentColor). 위 메뉴 아이콘은 공통 모듈 Joypack.topIcon 을 쓴다 */
const svg = (body: string) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  pause: svg('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  share: svg('<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/>'),
  /** 도감: 펼친 식물 도감(왼쪽 쪽에 눌러 말린 튤립, 오른쪽 쪽에 글 줄, 가운데 빨간 책갈피 끈). 선 아이콘이 아니라 색이 든 작은 그림 */
  book: `<svg class="icon icon-pic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M1.5 5.2Q6.8 3.6 12 6.2Q17.2 3.6 22.5 5.2V18.8Q17.2 17.2 12 19.8Q6.8 17.2 1.5 18.8Z" fill="#f4ecd8" stroke="#6b5434" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 6.2V19.8" stroke="#6b5434" stroke-width="1"/><path d="M12.6 19.5v3.6l1.1-.9 1.1.9v-4.3" fill="#c4524a" stroke="#7a2a22" stroke-width=".5" stroke-linejoin="round"/><path d="M6.8 16V10.6" stroke="#3f5a2e" stroke-width=".9" stroke-linecap="round"/><path d="M6.8 14.2C5 14 4.1 12.9 4 11.8 5.6 11.9 6.5 12.8 6.8 14.2Z" fill="#6f9a52" stroke="#3f5a2e" stroke-width=".5"/><path d="M5 10.4C5 8.6 5.8 7.6 6.8 7 7.8 7.6 8.6 8.6 8.6 10.4A1.8 1.8 0 0 1 5 10.4Z" fill="#d9534a" stroke="#7a2a22" stroke-width=".6"/><path d="M6.8 7.4V11" stroke="#7a2a22" stroke-width=".4"/><path d="M14.5 9.4h5.2M14.5 11.8h5.2M14.5 14.2h3.6" stroke="#9b8766" stroke-width=".9" stroke-linecap="round"/></svg>`,
  /** 꽃 고르기: 나무 모종 상자 세 칸에 튤립·새싹·노란 꽃(도감 책과 같은 색·선의 작은 그림) */
  garden: `<svg class="icon icon-pic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.8 12.6V8.8M12 12.6V7.4M18.2 12.6V8.9" stroke="#3f5a2e" stroke-width=".9" stroke-linecap="round"/><path d="M5.8 11.3C4.3 11.1 3.5 10.2 3.4 9.2 4.8 9.3 5.6 10.1 5.8 11.3Z" fill="#6f9a52" stroke="#3f5a2e" stroke-width=".5"/><path d="M4 8.5C4 6.6 4.8 5.6 5.8 5 6.8 5.6 7.6 6.6 7.6 8.5A1.8 1.8 0 0 1 4 8.5Z" fill="#d9534a" stroke="#7a2a22" stroke-width=".6"/><path d="M12 9.6C9.9 9.6 8.8 8.3 8.7 6.8 10.6 6.8 11.8 7.9 12 9.6ZM12 8.6C14.1 8.6 15.2 7.3 15.3 5.8 13.4 5.8 12.2 6.9 12 8.6Z" fill="#6f9a52" stroke="#3f5a2e" stroke-width=".5"/><circle cx="18.2" cy="7.4" r="2.2" fill="#f2c94c" stroke="#8a6a1e" stroke-width=".6"/><circle cx="18.2" cy="7.4" r=".8" fill="#b8643a"/><path d="M2 12.6H22L20.4 20.6A1.2 1.2 0 0 1 19.2 21.6H4.8A1.2 1.2 0 0 1 3.6 20.6Z" fill="#a8754a" stroke="#5a3d26" stroke-width="1.1" stroke-linejoin="round"/><path d="M8.8 12.6L9.1 21.6M15.2 12.6L14.9 21.6" stroke="#5a3d26" stroke-width=".8"/><path d="M2.6 15.4H21.4" stroke="#7a5236" stroke-width=".6"/></svg>`,
  soundOn: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 10l4 4M21 10l-4 4"/>'),
  vibrateOn: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 8v8M20 8v8"/>'),
  vibrateOff: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M3 3l18 18"/>'),
};

/** 햇살 자리 안내 칩의 해 그림 */
export const SUN_ICON = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="4" fill="#f2b632" stroke="#9a6a10" stroke-width=".8"/><path d="M10 1.8v2.6M10 15.6v2.6M1.8 10h2.6M15.6 10h2.6M4.2 4.2l1.8 1.8M14 14l1.8 1.8M4.2 15.8L6 14M14 6l1.8-1.8" stroke="#c98a14" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export const THEME_ICONS: Record<Theme, string> = {
  system: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'),
  dark: svg('<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'),
};

/** 스킨(날씨 톤) 단추: 그 톤의 하늘색 동그라미 */
export const SKIN_ICONS: Record<SkinSetting, string> = {
  auto: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>'),
  clear: `<span class="skin-dot" data-swatch="clear" aria-hidden="true"></span>`,
  rain: `<span class="skin-dot" data-swatch="rain" aria-hidden="true"></span>`,
  dusk: `<span class="skin-dot" data-swatch="dusk" aria-hidden="true"></span>`,
  snow: `<span class="skin-dot" data-swatch="snow" aria-hidden="true"></span>`,
};
