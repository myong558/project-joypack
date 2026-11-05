/**
 * 출시 전 확인(TEST) 풀이 보기 워커를 띄운다. main.ts 가 개발 빌드에서만 동적으로 불러,
 * 운영 빌드(__JOYFIELD_PROD__)에는 워커 파일이 생기지 않는다
 */
export const startSolveWorker = (): Worker => new Worker(new URL('./solve.worker.ts', import.meta.url), { type: 'module' });
