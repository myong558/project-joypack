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
}

declare global {
  const Joypack: JoypackApi;
  interface Window {
    Joypack: JoypackApi;
  }
}
