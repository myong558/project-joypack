// joyfield.js 가 만드는 window.Joyfield 의 타입. import '@joyfield/shared' 를 하면 전역 Joyfield 을 쓸 수 있다.
export type SharedSetting = 'theme' | 'lang' | 'sound' | 'vibrate' | 'initials';

/** 공통 상단 메뉴 아이콘 이름(topbar.css 의 .jp-top-btn 안에 넣는다) */
export type TopIcon = 'apps' | 'globe' | 'trophy' | 'gear' | 'home';
/** 랭킹 기록을 남긴 입력: m 모바일(터치·펜), p PC(마우스) */
export type Device = 'm' | 'p';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type ShareOutcome = 'shared' | 'cancelled' | 'saved' | 'copied' | 'failed';

export interface JoyfieldApi {
  KEYS: Record<SharedSetting, string>;
  /** 저작권 표기 한 줄. 설정 맨 아래 버전 밑에 그대로 보인다 */
  COPYRIGHT: string;
  /** 랭킹 Firebase 웹 설정. 내 PC·사설 주소·개발 사이트(dev.pocketgamelab.com)면 개발 DB(joyfield-dev), 운영 사이트면 운영 DB(joyfield-41b5a). localStorage 'joyfield.db' = 'dev' | 'prod' 로 바꿀 수 있음 */
  FIREBASE: FirebaseWebConfig;
  /** 지금 쓰는 랭킹 DB: 'dev' 개발 · 'prod' 운영 */
  FIREBASE_ENV: 'dev' | 'prod';
  /** 내 PC·같은 와이파이 주소인지(localhost, 127.x, 10.x, 172.16~31.x, 192.168.x, *.local) */
  /** 운영 빌드에는 없음(개발 빌드·테스트 전용) */
  isLocalHost(host: string): boolean;
  /** 개발 DB 를 쓸 주소인지: 내 PC·사설 주소, dev.pocketgamelab.com, Cloudflare Pages 브랜치·미리보기 주소(<이름>.<프로젝트>.pages.dev) */
  isDevHost(host: string): boolean;
  /** 숨김 미리보기(games.json status "preview")로 배포된 게임인지. 랭킹은 미리보기 동안에도 등록된다 */
  isPreview(): boolean;
  /** 이 기기에서 조이필드 개발자 모드(숨김 미리보기 보기)를 켰는지. 게임의 출시 전 확인 기능을 이때만 보인다 */
  /** 개발자 모드인지: 주소로 정함. 개발 사이트·내 PC(isDevHost)는 늘 true, 운영 사이트는 늘 false(켜는 방법 없음) */
  devMode(): boolean;
  /** 개발자 모드에서 "출시 모드 보기"를 켰는지(출시 전 확인 기능을 숨기고 실제 출시 화면으로 봄) */
  releaseView(): boolean;
  setReleaseView(on: boolean): void;
  /** 출시 전 확인 단계인지: 개발자 모드이고 아직 미리보기(preview)로 배포된 게임일 때. 정식 공개하면 false("출시 화면" 단추도 사라짐) */
  prerelease(): boolean;
  /** 출시 전 확인 기능(판별 바로 시작·도감 전부 열기 등)을 보일지: 출시 전 확인 단계이고 "출시 화면" 보기가 꺼져 있을 때 */
  devTools(): boolean;
  /** 판 바로가기(모든 판 열기·판별 바로 시작)를 보일지: 개발자 모드이고 "출시 화면" 보기가 꺼져 있을 때. 정식 공개 뒤에도 보인다(바로가기 판은 기록·랭킹에 안 남김) */
  devJump(): boolean;
  /** 날짜로 정해지는 무작위 번호(0 ~ count-1). 같은 날은 어디서나 같고 이틀 연속 같은 번호는 없음(자동 스킨용). salt 는 게임 id */
  dailyPick(salt: string, count: number, date?: Date): number;
  /** 공통 상단 메뉴 아이콘 SVG 문자열 */
  topIcon(name: TopIcon): string;
  /** 기본 언어: 기기 설정 언어가 한국어면 'ko', 그 밖은 모두 'en' */
  deviceLang(): 'ko' | 'en';
  /** 설정 창 언어 버튼·언어 목록 순서: 기기 기본 언어가 맨 앞, 기본 언어가 한국어가 아니면 한국어는 맨 끝 */
  langOrder<T extends string>(langs: readonly T[]): T[];
  /** 랭킹 기록의 기기: 마지막으로 누른 입력이 마우스면 'p'(PC), 터치·펜이면 'm'(모바일). 누른 적 없으면 기기 기본 입력으로 */
  playDevice(): Device;
  /** 순위표 이름 옆 기기 아이콘 HTML(.jp-dev). dev 가 없거나 이상하면 빈 문자열 */
  deviceIcon(dev: unknown): string;  /** 설치 앱에서 내비게이션 바 높이가 0으로 와 맨 아래가 가릴 때 --jp-bottom-guard(px)를 넣는다. 게임 css 의 아래 여백에 쓴다 */
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
  /** 랭킹 이름으로 써도 되는지: 영문 대문자 1~5자이고 금지어(욕설·혐오·성적 표현)가 아님. 등록 전에 꼭 검사(기준서 10.3) */
  isAllowedName(name: string): boolean;
  /** 랭킹 이름 입력 칸: 영문 대문자 5자만, 휴대폰은 영문 자판·대문자로 열기. onChange 는 걸러 낸 값이 바뀔 때마다 */
  initialsInput(input: HTMLInputElement | null, onChange?: (clean: string) => void): void;
  registerSW(options?: { root?: string; game?: string }): Promise<ServiceWorkerRegistration | null>;
  isGameCached(id: string): Promise<boolean>;
  clearGameCache(id: string): Promise<boolean>;
  /** 오래 안 한 게임 자동 정리: IDLE_DAYS 동안 열지 않은 게임의 파일 캐시를 지우고 지운 id 를 돌려준다(오프라인이면 아무것도 안 함) */
  cleanupIdleGames(ids: string[]): Promise<string[]>;
  /** 이 날 수 동안 열지 않은 게임은 저장본을 자동으로 비운다 */
  IDLE_DAYS: number;
  /** 공유할 배포 주소(+ ?from=share). gameId 를 주면 그 게임 주소, 없으면 조이필드 첫 화면 */
  shareUrl(gameId?: string): string;
  /**
   * 결과 화면 "기록 공유하기": 결과 캡처 이미지 + "<installText> <조이필드 주소>" 한 줄을 공유 창으로 한 번에 보낸다.
   * 주소 줄은 공유 전에 클립보드에도 넣는다. 공유 창이 없으면 이미지를 내려받고 주소를 복사한다
   */
  shareResult(options: { gameId: string; image: Blob | null; title: string; installText: string }): Promise<ShareOutcome>;
  /** 공유 링크로 들어왔는지(이번 방문 동안 기억). 주소의 ?from=share 는 지운다 */
  readInvite(): boolean;
  /** 공유 링크로 게임에 바로 들어온 사람에게 "조이필드 앱으로 설치하기" 띠를 보여 준다 */
  inviteBar(options?: { root?: string }): void;
  /** 랭킹 탭 공통 기준: 판을 끝냈을 때·랭킹 창에서 탭을 골랐을 때 그 탭을 최근 탭으로 남긴다 */
  setRankBoard(gameId: string, board: string | number): void;
  /** 랭킹 창을 열 때 처음 고를 탭: 최근 탭(방금 한 판·마지막으로 본 탭) → fallback */
  rankTab(gameId: string, boards: (string | number)[], fallback: string | number): string;
  /** 위 메뉴 랭킹 버튼 아래 오프라인 안내(오프라인일 때만 보임, 연결되면 사라짐). text 는 앱 i18n 의 "오프라인 · 랭킹 등록 안 됨" */
  offlineMark(button: Element | null, text: string): void;
  /** 진동 세기표(sounds/catalog.json "vibrations" 와 같은 값, ms) */
  VIBRATIONS: Record<VibrationName, number | number[]>;
  /** 이 기기가 진동을 할 수 있는지(아이폰 등은 false → 설정의 진동 칩을 숨김) */
  canVibrate(): boolean;
  /** 진동: 세기표 이름이나 패턴(ms). on 이 false(진동 설정 끔)면 아무것도 안 함 */
  vibrate(pattern: VibrationName | number | number[], on?: boolean): void;
  /** 뒤로 가기 단계(기준서 1.3): 화면 깊이·대화상자 층 */
  back: BackNav;
}

export type VibrationName = 'tick' | 'press' | 'light' | 'match' | 'hit' | 'fever' | 'good' | 'up' | 'down' | 'big' | 'warn' | 'fail' | 'lost' | 'celebrate';

export interface BackNav {
  /**
   * 지금 화면의 깊이(뒤로 가기를 몇 번 받아 낼지)와 그때 할 일. 화면을 바꿀 때마다 부른다.
   * 시작 0 · 결과 1 · 일시정지 1 · 플레이 2. onBack 은 뒤로 가기 한 번마다 불린다(플레이 → 일시정지, 일시정지·결과 → 시작 화면)
   */
  screen(depth: number, onBack?: () => void): void;
  /** 대화상자를 열 때: 뒤로 가기가 오면 onClose 로 닫는다. 돌려받은 함수는 창이 다른 방법으로 닫힐 때 부른다 */
  layer(onClose: () => void): () => void;
}

declare global {
  const Joyfield: JoyfieldApi;
  interface Window {
    Joyfield: JoyfieldApi;
  }
}
