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

  // ── 공유 ──
  // 공유 링크에는 ?from=share 를 붙인다. 받은 사람이 열면 설치 안내(게임: 아래 띠, 허브: 첫 화면 카드)를 보여 준다.
  // 개발 서버에서 공유해도 친구가 열 수 있도록 배포 주소로 고정한다.
  const SITE = 'https://myong558.github.io/project-joypack/';
  const INVITE_KEY = 'joypack.invite';

  function shareUrl(gameId) {
    return SITE + (gameId ? 'games/' + gameId + '/' : '') + '?from=share';
  }

  function isStandalone() {
    return (global.matchMedia && matchMedia('(display-mode: standalone)').matches) || global.navigator.standalone === true;
  }

  // 공유 링크로 들어왔는지. 주소에서 표시를 지우고 이번 방문 동안 기억한다(허브로 넘어가도 설치 안내가 이어지게)
  function readInvite() {
    try {
      const url = new URL(location.href);
      if (url.searchParams.get('from') === 'share') {
        url.searchParams.delete('from');
        history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        sessionStorage.setItem(INVITE_KEY, '1');
        return true;
      }
      return sessionStorage.getItem(INVITE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function copyText(text) {
    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {}
      area.remove();
      return ok;
    };
    try {
      return navigator.clipboard.writeText(text).then(() => true, fallback);
    } catch (e) {
      return Promise.resolve(fallback());
    }
  }

  // 결과 화면의 "기록 공유하기"(모든 게임 같은 방식).
  // 결과 캡처 이미지 한 장 + 조이팩 설치 주소 한 줄을 기기 공유 창으로 한 번에 보낸다. 결과 글은 이미지에 다 있으므로 따로 보내지 않는다.
  // 받는 앱이 이미지와 같이 온 글을 버려도(카카오톡 등) 붙여 넣을 수 있게, 공유 창을 열기 전에 주소 줄을 클립보드에도 넣어 둔다.
  // 공유 창이 없으면(주로 PC) 이미지를 내려받고 주소 줄을 복사한다.
  // 결과: 'shared' | 'cancelled' | 'saved'(이미지 저장 + 주소 복사) | 'copied'(주소만 복사) | 'failed'
  function shareResult(options) {
    const text = options.installText + ' ' + shareUrl();
    const image = options.image;
    const name = 'joypack-' + options.gameId + '-result.png';
    const file = image && typeof File !== 'undefined' ? new File([image], name, { type: 'image/png' }) : null;
    const nav = global.navigator;
    return copyText(text).then((copied) => {
      const data = file && nav.canShare && nav.canShare({ files: [file] }) ? { files: [file], text: text } : nav.share ? { title: options.title, text: text } : null;
      const shared = data ? nav.share(data).then(() => 'shared', (e) => (e && e.name === 'AbortError' ? 'cancelled' : null)) : Promise.resolve(null);
      return shared.then((outcome) => {
        if (outcome) return outcome;
        if (image) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(image);
          link.download = name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
          return copied ? 'saved' : 'failed';
        }
        return copied ? 'copied' : 'failed';
      });
    });
  }

  // 게임 화면 아래 "조이팩 앱으로 설치하기" 띠. 공유 링크로 게임에 바로 들어온 사람에게만, 앱으로 실행 중이 아닐 때만 보인다.
  // 누르면 허브로 가서 설치 안내 카드를 본다. 게임을 시작하려고 화면 다른 곳을 누르면 판을 가리지 않게 사라진다.
  function inviteBar(options) {
    const root = (options && options.root) || '../../';
    let closed = false;
    try {
      closed = sessionStorage.getItem(INVITE_KEY + 'BarClosed') === '1';
    } catch (e) {}
    if (!readInvite() || closed || isStandalone() || document.querySelector('.joypack-invite')) return;
    const ko = (get('lang') || navigator.language || 'ko').slice(0, 2) !== 'en';
    const style = document.createElement('style');
    style.textContent =
      '.joypack-invite{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:4px;' +
      'max-width:calc(100% - 24px);padding:6px 6px 6px 8px;border-radius:999px;background:#ffb703;color:#3d2a00;font:15px/1.2 system-ui,sans-serif;' +
      'box-shadow:0 8px 24px rgb(120 70 0/.35);transform:translateX(-50%);animation:joypack-invite-in .4s cubic-bezier(.2,.9,.3,1.2) both}' +
      '.joypack-invite a{display:flex;align-items:center;gap:8px;padding:4px 8px;color:inherit;text-decoration:none;white-space:nowrap}' +
      '.joypack-invite img{width:26px;height:26px}' +
      '.joypack-invite button{width:30px;height:30px;border:0;border-radius:50%;background:rgb(61 42 0/.12);color:#3d2a00;font:18px/1 system-ui;cursor:pointer}' +
      '@keyframes joypack-invite-in{from{opacity:0;transform:translate(-50%,20px)}}' +
      '@media (prefers-reduced-motion:reduce){.joypack-invite{animation:none}}';
    const bar = document.createElement('div');
    bar.className = 'joypack-invite';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', ko ? '조이팩 앱 설치' : 'Install Joypack');
    bar.innerHTML =
      '<a href="' + root + '"><img src="' + root + 'logo.svg" alt="">' + (ko ? '조이팩 앱으로 설치하기' : 'Install the Joypack app') + '</a>' +
      '<button type="button" aria-label="' + (ko ? '닫기' : 'Close') + '">×</button>';
    const close = () => {
      // 한 번 닫으면 이번 방문 동안 다른 게임에서도 다시 띄우지 않는다(허브 첫 화면 카드는 그대로)
      try {
        sessionStorage.setItem(INVITE_KEY + 'BarClosed', '1');
      } catch (e) {}
      bar.remove();
      document.removeEventListener('pointerdown', outside, true);
    };
    const outside = (e) => {
      if (!bar.contains(e.target)) close();
    };
    bar.querySelector('button').addEventListener('click', close);
    document.head.append(style);
    document.body.append(bar);
    // 띠가 나타난 직후의 누름(공유 링크를 연 손가락 등)은 무시하고, 그다음 화면 누름부터 닫는다
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 600);
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
    shareUrl: shareUrl,
    shareResult: shareResult,
    readInvite: readInvite,
    inviteBar: inviteBar,
  };
})(typeof window !== 'undefined' ? window : globalThis);
