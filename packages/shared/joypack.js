// 조이팩 공통 모듈. 허브와 모든 게임이 같은 파일을 쓴다.
// - 빌드 없는 게임(업다운)은 <script src="../../shared/joypack.js"> 로, 빌드하는 게임·허브는 import '@joypack/shared' 로 불러온다.
// - 어느 쪽이든 window.Joypack 하나를 만든다(두 번 불러와도 처음 것을 쓴다).
(function (global) {
  'use strict';
  if (global.Joypack) return;

  // 허브 설정에서 고르면 모든 게임이 따르는 공통 설정. 값 형식은 README 4.2
  const KEYS = {
    theme: 'joypack.theme', // system | light | dark
    lang: 'joypack.lang', // ko | en
    sound: 'joypack.sound', // on | off
    vibrate: 'joypack.vibrate', // on | off
    initials: 'joypack.initials', // A–Z 1~5자
  };

  const GAME_CACHE_PREFIX = 'joypack-game-';

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // 저장 실패는 무시한다(시크릿 창, 용량 초과 등)
    }
  }

  // 공통 설정을 먼저 읽고, 없으면 게임이 예전에 쓰던 키를 읽는다. 그래서 통합 전 설정이 그대로 이어진다.
  function get(name, legacyKey) {
    const value = read(KEYS[name]);
    if (value !== null) return value;
    return legacyKey ? read(legacyKey) : null;
  }

  // 공통 키와 게임 키에 같이 쓴다. 게임 키도 맞춰 두면 게임 코드를 예전 방식으로 되돌려도 설정이 어긋나지 않는다.
  function set(name, value, legacyKey) {
    write(KEYS[name], value);
    if (legacyKey) write(legacyKey, value);
  }

  // 랭킹 이름 규칙(모든 게임 공통): 영문 대문자 A–Z 최대 5자
  function cleanInitials(text) {
    return String(text || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  }

  /**
   * 조이팩 서비스 워커를 등록한다. 서비스 워커는 사이트에 하나(root/sw.js)이고, 게임 페이지에서 등록해도 같은 것을 쓴다.
   * game 을 주면 그 게임 파일 전체를 캐시하라고(이미 있으면 바뀐 파일만 다시 받으라고) 서비스 워커에 알린다.
   * root: 이 페이지에서 사이트 루트까지의 상대 경로(허브 './', 게임 '../../')
   */
  function registerSW(options) {
    const root = (options && options.root) || './';
    const game = options && options.game;
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return Promise.resolve(null);
    const base = new URL(root, location.href).href;
    return navigator.serviceWorker
      .register(base + 'sw.js', { scope: base })
      .then((registration) => {
        // 설치한 앱은 백그라운드에 오래 남아 있으므로 다시 화면에 나올 때도 새 버전을 확인한다.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
        if (game) {
          navigator.serviceWorker.ready.then((ready) => {
            if (ready.active) ready.active.postMessage({ type: 'cache-game', id: game });
          });
        }
        return registration;
      })
      .catch(() => null);
  }

  // 그 게임 파일 전체가 캐시돼 있으면(= 오프라인에서 열림) true. 캐시를 다 받은 뒤에 넣는 files.json 으로 판단한다.
  function isGameCached(id) {
    if (!('caches' in global)) return Promise.resolve(false);
    // caches.open 은 없는 캐시를 새로 만들므로 먼저 있는지 본다
    return caches
      .has(GAME_CACHE_PREFIX + id)
      .then((has) => (has ? caches.open(GAME_CACHE_PREFIX + id).then((cache) => cache.keys()) : []))
      .then((keys) => keys.some((req) => req.url.endsWith('/games/' + id + '/files.json')))
      .catch(() => false);
  }

  // 게임 파일 캐시만 지운다. 최고 기록·설정(localStorage)은 남는다.
  function clearGameCache(id) {
    if (!('caches' in global)) return Promise.resolve(false);
    return caches.delete(GAME_CACHE_PREFIX + id).catch(() => false);
  }

  global.Joypack = {
    KEYS: KEYS,
    get: get,
    set: set,
    cleanInitials: cleanInitials,
    registerSW: registerSW,
    isGameCached: isGameCached,
    clearGameCache: clearGameCache,
  };
})(typeof window !== 'undefined' ? window : globalThis);
