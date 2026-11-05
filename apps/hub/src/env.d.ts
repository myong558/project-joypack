/** 빌드할 때 vite.config.ts가 채워 넣는 값 */
declare const __APP_VERSION__: string;
/** 운영 빌드(main 배포, JOYFIELD_SITE=prod)면 true. 개발 전용 코드 앞에 `!__JOYFIELD_PROD__ && …` 를 붙이면 운영 빌드에서 통째로 빠진다(vite.config define) */
declare const __JOYFIELD_PROD__: boolean;
/** 게임 id → 게임 버전(빌드할 때 각 게임 package.json 에서 읽음) */
declare const __GAME_VERSIONS__: Record<string, string>;
/** 게임 id → COMING SOON 카드 그림판 번호(아이콘과 잘 구분되는 후보, scripts/check-icons.mjs TEASER_BACKDROPS) */
declare const __TEASER_BACKDROP__: Record<string, number>;
