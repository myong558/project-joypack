/** 빌드할 때 vite.config.ts가 채워 넣는 값 */
declare const __APP_VERSION__: string;
/** 운영 빌드(main 배포, JOYFIELD_SITE=prod)면 true. 개발 전용 코드 앞에 `!__JOYFIELD_PROD__ && …` 를 붙이면 운영 빌드에서 통째로 빠진다(vite.config define) */
declare const __JOYFIELD_PROD__: boolean;
