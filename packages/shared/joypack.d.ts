// joypack.js 가 만드는 window.Joypack 의 타입. import '@joypack/shared' 를 하면 전역 Joypack 을 쓸 수 있다.
export type SharedSetting = 'theme' | 'lang' | 'sound' | 'vibrate' | 'initials';

export interface JoypackApi {
  KEYS: Record<SharedSetting, string>;
  /** 공통 설정을 먼저 읽고, 없으면 게임이 예전에 쓰던 키(legacyKey)를 읽는다 */
  get(name: SharedSetting, legacyKey?: string): string | null;
  /** 공통 키에 쓰고, legacyKey 를 주면 거기에도 같이 쓴다 */
  set(name: SharedSetting, value: string, legacyKey?: string): void;
  cleanInitials(text: string): string;
  registerSW(options?: { root?: string; game?: string }): Promise<ServiceWorkerRegistration | null>;
  isGameCached(id: string): Promise<boolean>;
  clearGameCache(id: string): Promise<boolean>;
  /** 공유할 배포 주소(+ ?from=share). gameId 를 주면 그 게임 주소, 없으면 조이팩 첫 화면 */
  shareUrl(gameId?: string): string;
  /** 공유 링크로 들어왔는지(이번 방문 동안 기억). 주소의 ?from=share 는 지운다 */
  readInvite(): boolean;
  /** 공유 링크로 게임에 바로 들어온 사람에게 "조이팩 앱으로 설치하기" 띠를 보여 준다 */
  inviteBar(options?: { root?: string }): void;
}

declare global {
  const Joypack: JoypackApi;
  interface Window {
    Joypack: JoypackApi;
  }
}
