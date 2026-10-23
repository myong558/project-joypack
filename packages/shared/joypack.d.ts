// joypack.js 가 만드는 window.Joypack 의 타입. import '@joypack/shared' 를 하면 전역 Joypack 을 쓸 수 있다.
export type SharedSetting = 'theme' | 'lang' | 'sound' | 'vibrate' | 'initials';

/** 공통 상단 메뉴 아이콘 이름(topbar.css 의 .jp-top-btn 안에 넣는다) */
export type TopIcon = 'apps' | 'globe' | 'trophy' | 'gear' | 'home';

export type ShareOutcome = 'shared' | 'cancelled' | 'saved' | 'copied' | 'failed';

export interface JoypackApi {
  KEYS: Record<SharedSetting, string>;
  /** 저작권 표기 한 줄. 설정 맨 아래 버전 밑에 그대로 보인다 */
  COPYRIGHT: string;
  /** 숨김 미리보기(games.json status "preview")로 배포된 게임인지. 랭킹은 미리보기 동안에도 등록된다 */
  isPreview(): boolean;
  /** 공통 상단 메뉴 아이콘 SVG 문자열 */
  topIcon(name: TopIcon): string;
  /** 기본 언어: 기기 설정 언어가 한국어면 'ko', 그 밖은 모두 'en' */
  deviceLang(): 'ko' | 'en';
  /** 설치 앱에서 내비게이션 바 높이가 0으로 와 맨 아래가 가릴 때 --jp-bottom-guard(px)를 넣는다. 게임 css 의 아래 여백에 쓴다 */
  guardBottom(): void;
  /** 보이는 화면 높이(페이지·보이는 영역 중 작은 값)를 --jp-vh(px)로 넣고 바뀔 때마다 갱신한다 */
  trackViewport(): void;
  /** 원인 확인용: 처음 잰 화면 값과 지금 값 */
  viewportReport(): string;
  /** 공통 설정을 먼저 읽고, 없으면 게임이 예전에 쓰던 키(legacyKey)를 읽는다 */
  get(name: SharedSetting, legacyKey?: string): string | null;
  /** 공통 키에 쓰고, legacyKey 를 주면 거기에도 같이 쓴다 */
  set(name: SharedSetting, value: string, legacyKey?: string): void;
  cleanInitials(text: string): string;
  /** 랭킹 이름 입력 칸: 영문 대문자 5자만, 휴대폰은 영문 자판·대문자로 열기. onChange 는 걸러 낸 값이 바뀔 때마다 */
  initialsInput(input: HTMLInputElement | null, onChange?: (clean: string) => void): void;
  registerSW(options?: { root?: string; game?: string }): Promise<ServiceWorkerRegistration | null>;
  isGameCached(id: string): Promise<boolean>;
  clearGameCache(id: string): Promise<boolean>;
  /** 공유할 배포 주소(+ ?from=share). gameId 를 주면 그 게임 주소, 없으면 조이팩 첫 화면 */
  shareUrl(gameId?: string): string;
  /**
   * 결과 화면 "기록 공유하기": 결과 캡처 이미지 + "<installText> <조이팩 주소>" 한 줄을 공유 창으로 한 번에 보낸다.
   * 주소 줄은 공유 전에 클립보드에도 넣는다. 공유 창이 없으면 이미지를 내려받고 주소를 복사한다
   */
  shareResult(options: { gameId: string; image: Blob | null; title: string; installText: string }): Promise<ShareOutcome>;
  /** 공유 링크로 들어왔는지(이번 방문 동안 기억). 주소의 ?from=share 는 지운다 */
  readInvite(): boolean;
  /** 공유 링크로 게임에 바로 들어온 사람에게 "조이팩 앱으로 설치하기" 띠를 보여 준다 */
  inviteBar(options?: { root?: string }): void;
  /** 랭킹 탭 공통 기준: 판을 끝냈을 때·랭킹 창에서 탭을 골랐을 때 그 탭을 최근 탭으로 남긴다 */
  setRankBoard(gameId: string, board: string | number): void;
  /** 등록 대기 기록이 있는 탭 목록(바뀔 때마다 통째로). day(YYYY-MM-DD)를 주면 그날만 유효 */
  setRankPending(gameId: string, items: (string | number | { board: string | number; day?: string })[]): void;
  /** 랭킹 창을 열 때 처음 고를 탭: 등록 대기 → 최근 탭(방금 한 판·마지막으로 본 탭) → fallback */
  rankTab(gameId: string, boards: (string | number)[], fallback: string | number): string;
}

declare global {
  const Joypack: JoypackApi;
  interface Window {
    Joypack: JoypackApi;
  }
}
