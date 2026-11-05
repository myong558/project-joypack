// 아이콘 스프라이트. <svg class="icon"><use href="#i-이름"></use></svg> 로 쓰며, 색은 글자색(currentColor)을 따른다.
// 시작할 때 body 맨 앞에 한 번 넣는다(main.ts)
export const SPRITE = `<svg class="sprite" aria-hidden="true">
  <symbol id="i-up" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3l8.5 10H15v8H9v-8H3.5z"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21l8.5-10H15V3H9v8H3.5z"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path fill="currentColor" d="M7 3h10v6a5 5 0 0 1-10 0z"/>
      <path d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4M12 14v4M8 21h8M9.5 18h5"/>
    </g>
  </symbol>
  <symbol id="i-retry" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 12a8 8 0 1 1-2.4-5.7"/>
      <path d="M20 4v5h-5"/>
    </g>
  </symbol>
  <symbol id="i-close" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
  </symbol>
  <symbol id="i-minus" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6 12h12"/>
  </symbol>
  <symbol id="i-plus" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6 12h12M12 6v12"/>
  </symbol>
  <symbol id="i-flower" viewBox="0 0 24 24">
    <g fill="currentColor">
      <circle cx="12" cy="6.5" r="3.6"/><circle cx="17.2" cy="10.3" r="3.6"/><circle cx="15.2" cy="16.4" r="3.6"/>
      <circle cx="8.8" cy="16.4" r="3.6"/><circle cx="6.8" cy="10.3" r="3.6"/>
    </g>
    <circle cx="12" cy="12" r="2.4" fill="#fff" opacity="0.85"/>
  </symbol>
  <symbol id="i-leaf" viewBox="0 0 24 24">
    <path fill="currentColor" d="M20 3C10 3 4 8 4 15c0 1.6.4 3 1 4.2L3.6 20.6l1.4 1.4 1.5-1.5C7.6 21.5 9 22 10.8 22 17 22 21 15.5 20 3zM7.4 18.4c2-3.6 5-6.5 8.6-8.6-2.7 2.6-5 5.5-6.9 8.9z"/>
  </symbol>
  <!-- 눈 결정: 여섯 갈래 가지 끝마다 V 모양 잔가지 -->
  <symbol id="i-snow" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 12L12 2.5M9.41 4.49L12 6L14.59 4.49M12 12L20.23 7.25M17.21 6L17.2 9L19.8 10.49M12 12L20.23 16.75M19.8 13.51L17.2 15L17.21 18M12 12L12 21.5M14.59 19.51L12 18L9.41 19.51M12 12L3.77 16.75M6.79 18L6.8 15L4.2 13.51M12 12L3.77 7.25M4.2 10.49L6.8 9L6.79 6"/>
  </symbol>
  <!-- 스킨 자동: 날마다(달력) 스킨을 무작위로 고른다 -->
  <symbol id="i-calendar" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>
      <path d="M3.5 10h17M8 3v4M16 3v4"/>
    </g>
    <g fill="currentColor">
      <circle cx="8" cy="14" r="1.3"/><circle cx="12" cy="14" r="1.3"/><circle cx="16" cy="14" r="1.3"/><circle cx="8" cy="17.3" r="1.3"/><circle cx="12" cy="17.3" r="1.3"/>
    </g>
  </symbol>
  <symbol id="i-moon" viewBox="0 0 24 24">
    <path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
  </symbol>
  <symbol id="i-auto" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
    <path fill="currentColor" d="M12 3a9 9 0 0 1 0 18z"/>
  </symbol>
  <symbol id="i-sun" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
    </g>
  </symbol>
  <!-- 난이도 버튼 오른쪽 시작 표시(둥근 삼각형) -->
  <symbol id="i-pause" viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8.5 5.2c-.9-.6-2 .1-2 1.1v11.4c0 1 1.1 1.7 2 1.1l9.1-5.7c.8-.5.8-1.7 0-2.2z"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 11l9-7 9 7"/>
      <path d="M5 9.5V20h5v-6h4v6h5V9.5"/>
    </g>
  </symbol>
  <symbol id="i-thermo" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z"/>
    </g>
    <circle cx="12" cy="17" r="1.8" fill="currentColor"/>
    <path d="M12 9.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </symbol>
  <symbol id="i-range" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"/>
  </symbol>
  <symbol id="i-sparkle" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 2l1.9 6.6L20.5 10.5l-6.6 1.9L12 19l-1.9-6.6L3.5 10.5l6.6-1.9z"/>
  </symbol>
  <symbol id="i-sound" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>
    </g>
  </symbol>
  <symbol id="i-vibrate" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="3.5" width="8" height="17" rx="2"/>
      <path d="M4.5 8.5v7M19.5 8.5v7M2 10.5v3M22 10.5v3"/>
    </g>
  </symbol>
  <symbol id="i-share" viewBox="0 0 24 24">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 14.5V3.5M7.5 7.5 12 3.5l4.5 4"/>
      <path d="M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5"/>
    </g>
  </symbol>
</svg>`;

/** 스프라이트 아이콘 하나(HTML) */
export function icon(name: string, cls = ''): string {
  return `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}
