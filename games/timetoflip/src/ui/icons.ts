import type { SkinSetting, Theme } from '../theme';

/** 선 아이콘(24×24, currentColor). 위 메뉴 아이콘은 공통 모듈 Joypack.topIcon 을 쓴다 */
const svg = (body: string) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  pause: svg('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7"/>'),
  home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  share: svg('<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>'),
  trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  /** 도감: 부채꼴로 펼친 카드 세 장(레몬 뒷면 · 강조색 카드 · 초승달 앞면). 선 아이콘이 아니라 색이 든 작은 그림 */
  album: `<svg class="icon icon-album" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <defs><linearGradient id="alb-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd54a"/><stop offset="1" stop-color="#f2a300"/></linearGradient></defs>
    <g transform="rotate(-18 12 20)"><rect x="6.5" y="4" width="10" height="14" rx="2.2" fill="url(#alb-l)" stroke="#b77900" stroke-width=".8"/><circle cx="11.5" cy="11" r="2.4" fill="none" stroke="#fff" stroke-width="1.1" opacity=".9"/></g>
    <g transform="rotate(2 12 20)"><rect x="7" y="3.5" width="10" height="14" rx="2.2" fill="var(--accent)" stroke="rgb(0 0 0 / .25)" stroke-width=".8"/><path d="M9.3 6.2h5.4" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".45"/></g>
    <g transform="rotate(20 12 20)"><rect x="8" y="4" width="10" height="14" rx="2.2" fill="#fffaf0" stroke="#2a2433" stroke-opacity=".35" stroke-width=".8"/><path d="M13.9 7.6a3.6 3.6 0 1 0 1.3 5.6 3.1 3.1 0 0 1-1.3-5.6z" fill="#fbbf24"/></g>
  </svg>`,
  soundOn: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 10l4 4M21 10l-4 4"/>'),
  vibrateOn: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 8v8M20 8v8"/>'),
  vibrateOff: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M3 3l18 18"/>'),
};

export const THEME_ICONS: Record<Theme, string> = {
  system: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'),
  dark: svg('<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'),
};

/** 스킨(시간대) 단추 그림: 하늘색 원 위에 해·달 */
export const SKIN_ICONS: Record<SkinSetting, string> = {
  auto: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>'),
  morning: `<span class="skin-dot" data-swatch="morning" aria-hidden="true"></span>`,
  noon: `<span class="skin-dot" data-swatch="noon" aria-hidden="true"></span>`,
  sunset: `<span class="skin-dot" data-swatch="sunset" aria-hidden="true"></span>`,
  night: `<span class="skin-dot" data-swatch="night" aria-hidden="true"></span>`,
};
