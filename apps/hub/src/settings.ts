import '@joypack/shared';
import { LANGS, detectLang, setLang, type Lang } from './i18n';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

export interface Settings {
  theme: Theme;
  lang: Lang;
  sound: boolean;
  vibrate: boolean;
  initials: string;
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 통합 전 게임에서 고른 설정을 공통 설정으로 한 번 옮긴다. 공통 설정이 이미 있으면 건드리지 않는다.
 * 업다운은 updown.* 키, 두더지잡기는 project-hammer:v1 JSON 안에 설정을 둔다
 */
export function migrateLegacy(): void {
  let hammer: Record<string, unknown> = {};
  try {
    hammer = JSON.parse(readLocal('project-hammer:v1') ?? '{}') ?? {};
  } catch {
    // 깨진 저장 값은 무시한다
  }
  const onOff = (v: unknown) => (typeof v === 'boolean' ? (v ? 'on' : 'off') : null);
  const candidates: Record<keyof Settings, (string | null)[]> = {
    theme: [readLocal('updown.theme'), hammer.theme as string],
    lang: [readLocal('updown.lang'), hammer.lang as string],
    sound: [readLocal('updown.sound'), onOff(hammer.sound)],
    vibrate: [readLocal('updown.vibrate'), onOff(hammer.shake)],
    initials: [readLocal('updown.initials'), hammer.playerName as string],
  };
  const valid: Record<keyof Settings, (v: string) => boolean> = {
    theme: (v) => THEMES.includes(v as Theme),
    lang: (v) => LANGS.includes(v as Lang),
    sound: (v) => v === 'on' || v === 'off',
    vibrate: (v) => v === 'on' || v === 'off',
    initials: (v) => Joypack.cleanInitials(v).length > 0,
  };
  for (const name of Object.keys(candidates) as (keyof Settings)[]) {
    if (Joypack.get(name) !== null) continue;
    const found = candidates[name].find((v) => typeof v === 'string' && valid[name](v));
    if (found) Joypack.set(name, name === 'initials' ? Joypack.cleanInitials(found) : found);
  }
}

export function loadSettings(): Settings {
  const theme = Joypack.get('theme') as Theme | null;
  const lang = Joypack.get('lang') as Lang | null;
  return {
    theme: theme && THEMES.includes(theme) ? theme : 'system',
    lang: lang && LANGS.includes(lang) ? lang : detectLang(),
    sound: Joypack.get('sound') !== 'off',
    vibrate: Joypack.get('vibrate') !== 'off',
    initials: Joypack.cleanInitials(Joypack.get('initials') ?? ''),
  };
}

export function saveSetting<K extends keyof Settings>(settings: Settings, name: K, value: Settings[K]): void {
  settings[name] = value;
  const stored = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  Joypack.set(name, stored);
}

const darkQuery = matchMedia('(prefers-color-scheme: dark)');

// 화면에는 항상 light/dark 둘 중 하나만 적용한다. CSS 는 data-theme 만 본다
export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute('media');
    meta.setAttribute('content', bg);
  });
}

export function applySettings(settings: Settings): void {
  applyTheme(settings.theme);
  setLang(settings.lang);
}

/** '기기 설정'이면 앱을 켜 둔 채 기기 설정을 바꿔도 바로 따라간다 */
export function watchSystemTheme(current: () => Theme): void {
  darkQuery.addEventListener('change', () => {
    if (current() === 'system') applyTheme('system');
  });
}

export const canVibrate = typeof navigator.vibrate === 'function';
