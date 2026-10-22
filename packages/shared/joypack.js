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

  // 공통 상단 메뉴 아이콘(topbar.css 의 .jp-top-btn 안에 넣는다). 24 격자 선 그림 + 안쪽 옅은 채움(.jp-fill).
  // 조이팩 첫 화면과 모든 게임이 같은 그림을 쓴다
  const GEAR =
    'M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z';
  const TOP_ICONS = {
    apps: '<rect class="jp-fill" x="3.5" y="3.5" width="7" height="7" rx="2"/><rect class="jp-fill" x="13.5" y="13.5" width="7" height="7" rx="2"/><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    globe: '<circle class="jp-fill" cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14 14 0 0 0 0 19 14 14 0 0 0 0-19M2.5 12h19"/>',
    trophy: '<path class="jp-fill" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8M9.5 17h5v3h-5z"/>',
    gear: '<path class="jp-fill" d="' + GEAR + '"/><path d="' + GEAR + '"/><circle cx="12" cy="12" r="3"/>',
    home: '<path class="jp-fill" d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M3 11 12 3.5 21 11M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>',
  };
  // 아래 가림 막기: 안드로이드 설치 앱에서 조이팩 → 게임으로 넘어오면, 화면을 내비게이션 바 뒤까지 쓰면서도
  // 바 높이(env(safe-area-inset-bottom))를 0으로 알려 줘 맨 아래 내용이 바에 가리는 일이 있었다(앱을 내렸다 올리면 정상).
  // 그때만 "화면 전체 높이 - 시스템이 쓰는 높이"(최대 72px)를 --jp-bottom-guard 로 넣는다. 바 높이가 제대로 오면 0.
  // 게임 css 는 아래 여백을 max(env(safe-area-inset-bottom), var(--jp-bottom-guard, 0px)) 로 둔다
  function guardBottom() {
    const root = document.documentElement;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;height:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
    const update = () => {
      if (!probe.isConnected) document.body.append(probe);
      const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
      const scr = global.screen;
      const standalone = isStandalone();
      const fullScreen = scr && Math.abs(global.innerHeight - scr.height) <= 2;
      const guard = standalone && inset === 0 && fullScreen ? Math.min(72, Math.max(0, scr.height - scr.availHeight)) : 0;
      root.style.setProperty('--jp-bottom-guard', guard + 'px');
    };
    update();
    global.addEventListener('resize', update);
    global.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);
    // 바 높이가 늦게 오는 기기를 위해 처음 몇 초 동안 몇 번 더 본다
    [300, 1000, 2500].forEach((ms) => setTimeout(update, ms));
  }

  // 보이는 화면 높이 따라가기: 설치 앱에서 조이팩 → 게임으로 넘어오면 css 의 화면 높이(100dvh·100%)가 실제 보이는 높이보다
  // 크게 잡혀 맨 아래가 화면 밖으로 나가는 일이 있었다(앱을 내렸다 올리면 정상). 페이지 높이·보이는 영역 높이 중 작은 값을
  // --jp-vh(px)로 넣고, 처음 몇 초 동안과 화면이 바뀔 때마다 다시 잰다. 게임 css 는 height: var(--jp-vh, 100dvh) 로 쓴다.
  // 원인 확인용으로 처음 잰 값과 지금 값을 viewportReport() 로 돌려준다(설정 창 맨 아래에 잠깐 표시)
  let firstReport = '';
  function viewportNumbers() {
    const vv = global.visualViewport;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';
    document.body.append(probe);
    const cs = getComputedStyle(probe);
    const top = parseFloat(cs.paddingTop) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    probe.remove();
    const scr = global.screen || {};
    return {
      inner: global.innerHeight,
      vv: vv ? Math.round(vv.height) : 0,
      client: document.documentElement.clientHeight,
      screen: scr.height,
      avail: scr.availHeight,
      top: top,
      bottom: bottom,
      dpr: global.devicePixelRatio,
      standalone: isStandalone(),
    };
  }
  function trackViewport() {
    const root = document.documentElement;
    const update = () => {
      const n = viewportNumbers();
      const h = Math.min(n.inner, n.vv || n.inner, n.client || n.inner);
      root.style.setProperty('--jp-vh', h + 'px');
      if (!firstReport) firstReport = format(n) + ' → ' + h;
    };
    const format = (n) =>
      'inner ' + n.inner + ' vv ' + n.vv + ' client ' + n.client + ' screen ' + n.screen + '/' + n.avail + ' safe ' + n.top + '/' + n.bottom + ' dpr ' + n.dpr + (n.standalone ? ' app' : '');
    update();
    global.addEventListener('resize', update);
    if (global.visualViewport) global.visualViewport.addEventListener('resize', update);
    global.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);
    [100, 300, 1000, 2500].forEach((ms) => setTimeout(update, ms));
    trackViewport.format = format;
  }
  function viewportReport() {
    const now = trackViewport.format ? trackViewport.format(viewportNumbers()) : '';
    return '처음: ' + firstReport + ' / 지금: ' + now;
  }

  function topIcon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (TOP_ICONS[name] || '') + '</svg>';
  }

  global.Joypack = {
    KEYS: KEYS,
    topIcon: topIcon,
    guardBottom: guardBottom,
    trackViewport: trackViewport,
    viewportReport: viewportReport,
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
