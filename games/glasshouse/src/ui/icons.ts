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
  grid: svg('<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'),
  calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/>'),
  /** 도감: 펼친 책(왼쪽 쪽에 잎 하나). 선 아이콘이 아니라 색이 든 작은 그림 */
  book: `<svg class="icon icon-book" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 5.5Q7 4 12 6.5Q17 4 22 5.5V19Q17 17.5 12 20Q7 17.5 2 19Z" fill="#f4ecd8" stroke="#6b5434" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 6.5V20" stroke="#6b5434" stroke-width="1"/><path d="M5.5 15.5C5 11.5 7 9 9.5 8.5C10 12 8.5 14.5 5.5 15.5Z" fill="#6f9a52" stroke="#3f5a2e" stroke-width=".6"/><path d="M5.8 15.2L9 9.2" stroke="#3f5a2e" stroke-width=".5"/><path d="M14.5 10h5M14.5 12.5h5M14.5 15h3.5" stroke="#9b8766" stroke-width=".9" stroke-linecap="round"/></svg>`,
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
