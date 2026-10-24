/** 빌드할 때 vite.config.ts가 채워 넣는 값 */
declare const __APP_VERSION__: string;
/** 게임 id → 게임 버전(빌드할 때 각 게임 package.json 에서 읽음) */
declare const __GAME_VERSIONS__: Record<string, string>;
