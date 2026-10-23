/**
 * 조이팩 앱 설치(홈 화면에 추가).
 * - 안드로이드 Chrome·Edge·삼성 인터넷 등: 브라우저가 설치 가능하다고 알려 주면(beforeinstallprompt) 그 이벤트를 잡아 두었다가
 *   설정의 "조이팩 다운로드" 버튼으로 설치 창을 띄운다
 * - 설치 창을 띄우는 기능은 Chrome 계열(Chrome·Edge·삼성 인터넷·웨일·오페라)에만 있다. 그 밖의 브라우저는
 *   브라우저마다 직접 추가하는 방법이 달라 manualGuide() 로 골라 안내한다
 *   (아이폰 Safari·아이폰 Chrome 등·맥 Safari·안드로이드 Firefox, 설치가 아예 안 되는 PC Firefox)
 * - 그 밖에 설치 창을 못 받은 경우(이미 설치함 등): 브라우저 메뉴의 "앱 설치"·"홈 화면에 추가" 안내
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState = 'standalone' | 'installed' | 'ready' | 'ios' | 'manual' | 'inapp';

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
// 사본을 돈다. 듣는 쪽이 다시 그리면서 새로 등록하면 Set 순회에 끼어들어 끝없이 도는 것을 막는다
const notify = () => [...listeners].forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  // 브라우저가 알아서 띄우는 작은 설치 안내 대신, 설정의 버튼으로 띄운다
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  installedNow = true;
  notify();
});

function isIos(): boolean {
  // iPadOS 는 데스크톱 Safari 처럼 보이므로 터치 지원으로 가린다
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/**
 * 메신저·SNS 앱 안의 브라우저(카카오톡·네이버·인스타그램·페이스북·라인 등).
 * 공유받은 링크는 대개 여기서 열리는데, 이 안에서는 앱 설치·홈 화면 추가가 안 되므로 기본 브라우저로 열어 달라고 안내한다
 */
export function inAppBrowser(): 'kakao' | 'other' | null {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  if (/NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua)) return 'other';
  return null;
}

/**
 * 지금 주소를 기본 브라우저로 여는 주소. 카카오톡은 자체 주소로 바깥 브라우저를 열 수 있고,
 * 그 밖의 안드로이드 앱은 Chrome 으로 여는 intent 주소를 쓴다. 아이폰의 다른 앱은 방법이 없어 null(메뉴의 "Safari로 열기" 안내)
 */
export function externalOpenUrl(): string | null {
  const url = location.href;
  if (inAppBrowser() === 'kakao') return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (/android/i.test(navigator.userAgent)) {
    return `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=${location.protocol.replace(':', '')};package=com.android.chrome;end`;
  }
  return null;
}

/**
 * 설치 창을 띄울 수 없을 때 보여 줄 안내 종류(브라우저마다 메뉴 이름·버튼 위치가 다르다).
 * - iosSafari: 아래쪽 공유 버튼 → 홈 화면에 추가
 * - iosOther: 아이폰·아이패드의 Chrome·Edge·Firefox 등(iOS 16.4~). 공유 버튼이 주소창 옆이나 메뉴 안에 있다
 * - macSafari: 맥 Safari(macOS 14~) 파일 메뉴 → Dock에 추가
 * - firefoxAndroid: 안드로이드 Firefox 메뉴 → 설치·홈 화면에 추가
 * - unsupported: 앱 설치 기능이 없는 브라우저(PC Firefox) → Chrome·Edge 로 열기
 * - menu: 그 밖(Chrome 계열인데 설치 창이 오지 않음 등) → 브라우저 메뉴의 "앱 설치"
 */
export type ManualGuide = 'iosSafari' | 'iosOther' | 'macSafari' | 'firefoxAndroid' | 'unsupported' | 'menu';

export function manualGuide(): ManualGuide {
  const ua = navigator.userAgent;
  if (isIos()) return /CriOS|EdgiOS|FxiOS|OPiOS|Whale|NAVER/i.test(ua) ? 'iosOther' : 'iosSafari';
  if (/Firefox\//i.test(ua)) return /android/i.test(ua) ? 'firefoxAndroid' : 'unsupported';
  // 맥 Safari: Chrome 계열(Chrome·Edg·OPR·Whale)이 아닌 Safari
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\/|OPR\/|Whale/i.test(ua)) return 'macSafari';
  return 'menu';
}

export function installState(): InstallState {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'standalone';
  if (installedNow) return 'installed';
  // 앱 안 브라우저는 설치 창을 받더라도 앱 쪽에서 막히는 경우가 많아 먼저 가린다
  if (inAppBrowser()) return 'inapp';
  if (deferred) return 'ready';
  return isIos() ? 'ios' : 'manual';
}

/** 설치 창을 띄운다. 설치했으면 true */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  // 설치 창 이벤트는 한 번만 쓸 수 있다. 닫으면 브라우저가 나중에 다시 보내 준다
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installedNow = true;
  notify();
  return outcome === 'accepted';
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
