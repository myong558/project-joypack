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

  // 랭킹 이름 금지어(모든 게임 공통, 기준서 10.3). 랭킹 이름은 다른 사람에게 보이는 사용자 생성 콘텐츠라
  // 구글 플레이 UGC 정책·애플 심사 지침 1.2 에 따라 욕설·혐오·성적 표현을 걸러야 한다.
  // CONTAINS: 이름 어디에 들어 있어도 막는다. EXACT: 다른 낱말 속에 흔히 들어가 이름 전체가 같을 때만 막는다.
  const BAD_NAME_CONTAINS = [
    'FUCK', 'FUK', 'FCK', 'SHIT', 'CUNT', 'COCK', 'DICK', 'PUSSY', 'BITCH', 'BICH', 'SLUT', 'WHORE', 'PENIS', 'VAGIN',
    'NIGG', 'NIGA', 'FAGG', 'RAPE', 'PORN', 'NAZI', 'HITLR', 'HITLE', 'KKK', 'BOOB', 'DILDO', 'JIZZ', 'TWAT', 'WANK',
    'SIBAL', 'SSIBA', 'SHIBA', 'SIBBA', 'JOTGA', 'JOTKA', 'BYUNS', 'GAESE', 'GESEK', 'GAESA', 'JIRAL', 'JIRAR', 'NIGMI', 'NIMIR', 'BOJI', 'JAJI',
  ];
  const BAD_NAME_EXACT = ['ASS', 'ARSE', 'CUM', 'FAG', 'SEX', 'SEXY', 'TIT', 'TITS', 'ANAL', 'ANUS', 'HOMO', 'GAY', 'JAP', 'SIBA', 'SSIB', 'BYUNG', 'GSAEK', 'SEKI', 'SAEKI', 'SEKKI'];

  // 랭킹 이름으로 써도 되는지(영문 대문자 1~5자이고 금지어가 아님). 등록 버튼·등록 직전에 검사한다.
  // 서버(firestore.rules 의 allowedName)도 같은 목록으로 다시 검사하므로, 금지어를 고치면 두 곳을 같이 고친다
  function isAllowedName(name) {
    const clean = cleanInitials(name);
    if (!clean || clean !== String(name || '').toUpperCase()) return false;
    if (BAD_NAME_EXACT.indexOf(clean) >= 0) return false;
    return !BAD_NAME_CONTAINS.some((word) => clean.indexOf(word) >= 0);
  }

  /**
   * 랭킹 이름(이니셜) 입력 칸을 공통 규칙으로 맞춘다: 영문 대문자 A–Z 5자까지만 들어간다.
   * - 휴대폰 키보드: 웹에서는 키보드 언어를 직접 고를 수 없어서, 한국어 키보드도 영문 자판으로 바뀌는
   *   이메일 입력 종류(inputmode="email")로 열고, 대문자 시작(autocapitalize="characters")을 함께 건다.
   *   소문자로 쳐도 바로 대문자로 바뀌고, 한글·숫자·기호는 들어가지 않는다(붙여 넣기 포함).
   * - 한글 조합 중(isComposing)에는 건드리지 않고 조합이 끝나면 걸러 낸다(조합 중에 값을 바꾸면 글자가 겹쳐 들어간다).
   * onChange(clean): 걸러 낸 값이 바뀔 때마다 부른다(허브 설정처럼 바로 저장할 때).
   */
  function initialsInput(input, onChange) {
    if (!input) return;
    input.type = 'text';
    input.maxLength = 5;
    input.setAttribute('inputmode', 'email');
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('lang', 'en');
    input.style.textTransform = 'uppercase';
    const sync = function () {
      const clean = cleanInitials(input.value);
      if (clean !== input.value) {
        const end = input.selectionEnd;
        const cut = input.value.length - clean.length;
        input.value = clean;
        try {
          input.setSelectionRange(Math.max(0, end - cut), Math.max(0, end - cut));
        } catch (e) {}
      }
      if (onChange) onChange(clean);
    };
    input.addEventListener('input', function (e) {
      if (!e.isComposing) sync();
    });
    input.addEventListener('compositionend', sync);
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
          markPlayed(game);
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
    const ko = (get('lang') || deviceLang()) === 'ko';
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

  // ── 오래 안 한 게임 자동 정리(기준서 1.11) ──
  // 게임이 계속 늘어나므로, 게임을 마지막으로 연 날을 적어 두고 IDLE_DAYS 동안 열지 않은 게임의 파일 캐시를 허브가 지운다.
  // 다음에 열면(인터넷 연결 시) 다시 받는다. 최고 기록·설정은 그대로
  const PLAYED_KEY = 'joypack.played'; // { 게임 id: 마지막으로 연 시각(ms) }
  const IDLE_DAYS = 60;

  function readPlayed() {
    try {
      return JSON.parse(read(PLAYED_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function markPlayed(id) {
    const played = readPlayed();
    played[id] = Date.now();
    write(PLAYED_KEY, JSON.stringify(played));
  }

  // 오프라인이면 아무것도 지우지 않는다(지운 게임을 바로 다시 받을 수 없으므로).
  // 마지막으로 연 날이 적혀 있지 않은 저장본(이 기능 전에 받은 것)은 지우지 않고 오늘부터 센다. 지운 게임 id 목록을 돌려준다
  function cleanupIdleGames(ids) {
    if (!('caches' in global) || !navigator.onLine) return Promise.resolve([]);
    const played = readPlayed();
    const limit = Date.now() - IDLE_DAYS * 86400000;
    return Promise.all(
      ids.map((id) =>
        isGameCached(id).then((cached) => {
          if (!cached) return null;
          if (!played[id]) {
            markPlayed(id);
            return null;
          }
          return played[id] < limit ? clearGameCache(id).then(() => id) : null;
        }),
      ),
    ).then((list) => list.filter(Boolean));
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

  // 기본 언어: 저장한 선택이 없으면 기기(휴대폰·PC)의 설정 언어를 따른다. 한국어면 'ko', 그 밖의 언어는 모두 'en'.
  // 조이팩과 모든 게임이 같은 규칙을 쓴다
  function deviceLang() {
    const nav = global.navigator || {};
    const first = (nav.languages && nav.languages[0]) || nav.language || '';
    return String(first).toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en';
  }

  function topIcon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (TOP_ICONS[name] || '') + '</svg>';
  }

  // 숨김 미리보기로 배포된 게임인지(games.json status "preview"). 빌드가 그 게임 index.html 의 <html> 에 data-jp-preview 를 붙인다.
  // 미리보기 동안에도 랭킹은 실제로 등록된다(테스트용). 공개 전 테스트 점수를 지울지는 사람이 정한다(기준서 7.3)
  // 공개 예약(games.json open)이 있으면 빌드가 data-jp-open 에 그 시각을 적는다. 그 시각이 지나면 미리보기가 아니라 공개된 게임으로 본다
  function isPreview() {
    if (typeof document === 'undefined' || !document.documentElement.hasAttribute('data-jp-preview')) return false;
    const open = openTime();
    return !(open && Date.now() >= open);
  }

  function openTime() {
    const value = typeof document !== 'undefined' && document.documentElement.getAttribute('data-jp-open');
    const ms = value ? Date.parse(value) : NaN;
    return Number.isFinite(ms) ? ms : 0;
  }

  // 공개 전 막기: 미리보기(공개 예약 포함)로 배포된 게임을 개발자 모드가 아닌 기기에서 주소로 직접 열면
  // 게임 대신 "곧 공개" 화면만 보인다. 공개 시각이 되면 다시 읽어 게임을 연다(기준서 7.4).
  // 기기 시계로 판단하므로 시계를 바꾸면 열 수 있지만, 랭킹 등록은 Firestore 규칙이 서버 시각으로 막는다
  function gatePreview() {
    if (typeof document === 'undefined' || !isPreview() || devMode()) return;
    const open = openTime();
    const ko = (get('lang') || deviceLang()) === 'ko';
    const when = open
      ? new Date(open).toLocaleString(ko ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' })
      : '';
    const gate = document.createElement('div');
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;justify-items:center;gap:14px;padding:24px;' +
      'background:#1b1730;color:#fff;font:16px/1.5 system-ui,sans-serif;text-align:center;touch-action:none';
    gate.innerHTML =
      '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#ffd84d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' +
      '<strong style="font-size:26px;letter-spacing:.02em">COMING SOON</strong>' +
      '<p style="margin:0;opacity:.85">' +
      (open ? (ko ? when + ' 공개' : 'Opens ' + when) : ko ? '준비 중인 게임이에요' : 'This game is not open yet') +
      '</p>' +
      '<a href="../../" style="margin-top:8px;padding:12px 22px;border-radius:999px;background:#ffd84d;color:#2a1d00;font-weight:700;text-decoration:none">' +
      (ko ? '조이팩으로' : 'Back to Joypack') +
      '</a>';
    const stopKeys = (e) => e.stopImmediatePropagation();
    window.addEventListener('keydown', stopKeys, true);
    window.addEventListener('keyup', stopKeys, true);
    const show = () => {
      document.documentElement.style.overflow = 'hidden';
      document.body.append(gate);
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
    if (open) setTimeout(() => location.reload(), Math.min(open - Date.now() + 500, 2 ** 31 - 1));
  }

  // 개발자 모드(조이팩 설정 → 정보의 버전을 7번 눌러 비밀번호로 켬, 허브 preview.ts 와 같은 키 joypack.preview).
  // 켠 기기에서만 게임의 출시 전 확인 기능(판별 바로 시작·도감 전부 열기 등)을 보인다
  function devMode() {
    try {
      const value = localStorage.getItem('joypack.preview');
      return value === 'on' || value === '1';
    } catch (e) {
      return false;
    }
  }

  // 출시 모드 보기: 개발자 모드를 켠 기기에서 출시 전 확인 기능(판별 바로 시작·도감 전부 열기 등)을 잠시 숨기고
  // 실제 출시 화면 그대로 확인할 때 켠다. 끄고 켜는 단추는 개발자 모드인 동안 늘 보인다
  const RELEASE_VIEW_KEY = 'joypack.releaseView';
  function releaseView() {
    return read(RELEASE_VIEW_KEY) === 'on';
  }
  function setReleaseView(on) {
    try {
      if (on) localStorage.setItem(RELEASE_VIEW_KEY, 'on');
      else localStorage.removeItem(RELEASE_VIEW_KEY);
    } catch (e) {}
  }
  // 출시 전 확인 단계인지: 개발자 모드를 켠 기기에서, 아직 미리보기(games.json status "preview")로 배포된 게임일 때만.
  // 정식 공개(pnpm release → live)하면 개발자 모드여도 출시 전 확인 기능과 "출시 화면" 단추가 모두 사라진다
  function prerelease() {
    return devMode() && isPreview();
  }
  // 출시 전 확인 기능(판별 바로 시작·도감 전부 열기 등)을 보일지: 출시 전 확인 단계이고 "출시 화면" 보기가 꺼져 있을 때만
  function devTools() {
    return prerelease() && !releaseView();
  }
  // 판 바로가기(모든 판 열기·판별 바로 시작)를 보일지: 개발자 모드이고 "출시 화면" 보기가 꺼져 있으면 정식 공개 뒤에도 보인다.
  // 바로가기로 시작한 판은 각 게임이 최고 기록·랭킹에 남기지 않으므로 공개된 순위표에 영향이 없다
  function devJump() {
    return devMode() && !releaseView();
  }

  // ── 날마다 바뀌는 자동 스킨(조이팩 오늘의 톤·모든 게임 스킨 "자동", 기준서 1.4) ──
  // 날짜로 정해지는 무작위 번호(0 ~ count-1): 같은 날은 어느 기기에서나 같고, 이틀 연속 같은 번호는 나오지 않는다.
  // count 일씩 묶어 그 묶음 안에서 count 개를 섞은 순서대로 쓴다(앞 묶음 마지막 날과 겹치면 첫 두 날을 바꿈) → 고르게 돌아감.
  // salt(게임 id)마다 섞는 순서가 달라 같은 날 게임끼리 같은 순서가 되지 않는다. 기기 날짜(자정) 기준
  /* dailyPick: begin — 허브·업다운 index.html 의 첫 화면 스크립트에 같은 글자 그대로 복사돼 있다(packages/shared/tests 가 같은지 검사) */
  function dailyPick(salt, count, date) {
    date = date || new Date();
    var day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
    if (count < 2) return 0;
    var seed = 2166136261;
    for (var c = 0; c < salt.length; c++) seed = Math.imul(seed ^ salt.charCodeAt(c), 16777619);
    function mix(n) {
      n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
      n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
      return (n ^ (n >>> 16)) >>> 0;
    }
    function order(block) {
      var list = [];
      for (var k = 0; k < count; k++) list.push(k);
      for (var i = count - 1; i > 0; i--) {
        var j = mix((seed + block * 31 + i) | 0) % (i + 1);
        var tmp = list[i];
        list[i] = list[j];
        list[j] = tmp;
      }
      return list;
    }
    // 두 개면 번갈아(묶음 경계 바꾸기가 다음 묶음과 겹칠 수 있어 따로)
    if (count === 2) return (day + (mix(seed) & 1)) % 2;
    var block = Math.floor(day / count);
    var list = order(block);
    if (list[0] === order(block - 1)[count - 1]) {
      var t0 = list[0];
      list[0] = list[1];
      list[1] = t0;
    }
    return list[day - block * count];
  }
  /* dailyPick: end */

  // ── 랭킹 탭 공통 기준(조이팩 전체 랭킹·모든 게임 랭킹 창, 기준서 1.6) ──
  // 랭킹 창을 열 때 처음 고를 탭: ① 등록 대기 기록이 있는 탭(여럿이면 최근 탭, 아니면 첫 번째) → ② 최근 탭(방금 한 판 또는 마지막으로 본 탭 중 나중)
  // → ③ 기본 탭. 한 기기 안에서 조이팩과 모든 게임이 같은 값을 읽고 써서, 어디서 열어도 이어진다.
  // joypack.rankBoard = { [게임 ID]: { last: 탭 ID, pending: [{ board, day? }] } }. day(YYYY-MM-DD, 기기 날짜)가 있으면 그날만 유효(오늘의 챌린지 등)
  const RANK_KEY = 'joypack.rankBoard';

  function localDay(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function readRank() {
    try {
      const data = JSON.parse(read(RANK_KEY));
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeRank(gameId, patch) {
    const data = readRank();
    data[gameId] = Object.assign({}, data[gameId], patch);
    write(RANK_KEY, JSON.stringify(data));
  }

  // 판을 끝냈을 때, 랭킹 창에서 탭을 골랐을 때 부른다
  function setRankBoard(gameId, board) {
    writeRank(gameId, { last: String(board) });
  }

  // 등록 대기 기록이 있는 탭 목록을 알린다(바뀔 때마다 통째로). 항목은 탭 ID 문자열 또는 { board, day }
  function setRankPending(gameId, items) {
    const list = (items || []).map((item) => (typeof item === 'object' ? { board: String(item.board), day: item.day } : { board: String(item) }));
    writeRank(gameId, { pending: list });
  }

  // 위 기준으로 고른 탭 ID. boards 는 그 게임의 탭 ID 목록(화면 순서), fallback 은 기본 탭
  function rankTab(gameId, boards, fallback) {
    const ids = boards.map(String);
    const entry = readRank()[gameId] || {};
    const today = localDay();
    const pending = (Array.isArray(entry.pending) ? entry.pending : [])
      .filter((p) => p && ids.indexOf(String(p.board)) >= 0 && (!p.day || p.day === today))
      .map((p) => String(p.board));
    const last = ids.indexOf(String(entry.last)) >= 0 ? String(entry.last) : null;
    if (pending.length) return last && pending.indexOf(last) >= 0 ? last : ids.find((id) => pending.indexOf(id) >= 0);
    return last || String(fallback);
  }

  // 화면 확대·축소 막기(허브와 모든 게임 공통, 이 파일을 불러오면 바로 적용).
  // 게임 중 두 손가락이 닿거나 두 번 톡톡 쳐서 화면이 커지면 판·버튼이 밀려 조작이 망가지기 때문이다.
  //   - touch-action: pan-x pan-y → 스크롤만 허용하고 두 손가락 확대·두 번 탭 확대는 막는다(안드로이드·iOS 13+)
  //   - iOS Safari 는 viewport 의 user-scalable=no 를 무시하고 touch-action 도 놓칠 때가 있어
  //     gesturestart/gesturechange 와 손가락 2개 이상인 touchmove 의 기본 동작(확대)도 막는다
  // 손가락마다 따로 오는 pointerdown·touchstart 는 막지 않으므로 두더지잡기 같은 멀티 터치 입력은 그대로다.
  // PC 의 Ctrl+휠·Ctrl+(+/−) 확대는 접근성 때문에 그대로 둔다
  function blockZoom() {
    if (typeof document === 'undefined') return;
    const apply = (el) => el && (el.style.touchAction = 'pan-x pan-y');
    apply(document.documentElement);
    if (document.body) apply(document.body);
    else document.addEventListener('DOMContentLoaded', () => apply(document.body));
    const stop = (e) => e.preventDefault();
    document.addEventListener('gesturestart', stop, { passive: false });
    document.addEventListener('gesturechange', stop, { passive: false });
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length > 1) e.preventDefault();
      },
      { passive: false },
    );
  }
  blockZoom();
  gatePreview();

  // 저작권 표기: 조이팩 설정 → 정보, 각 게임 설정 맨 아래 버전 밑에 그대로 쓴다(기준서 1.4). 바꿀 때는 여기 한 곳만
  var COPYRIGHT = '© 2026 Myong Bum Soo. All rights reserved.';

  global.Joypack = {
    KEYS: KEYS,
    COPYRIGHT: COPYRIGHT,
    isPreview: isPreview,
    devMode: devMode,
    releaseView: releaseView,
    setReleaseView: setReleaseView,
    prerelease: prerelease,
    devTools: devTools,
    devJump: devJump,
    dailyPick: dailyPick,
    topIcon: topIcon,
    deviceLang: deviceLang,
    guardBottom: guardBottom,
    trackViewport: trackViewport,
    viewportReport: viewportReport,
    get: get,
    set: set,
    cleanInitials: cleanInitials,
    isAllowedName: isAllowedName,
    initialsInput: initialsInput,
    registerSW: registerSW,
    isGameCached: isGameCached,
    clearGameCache: clearGameCache,
    cleanupIdleGames: cleanupIdleGames,
    IDLE_DAYS: IDLE_DAYS,
    shareUrl: shareUrl,
    shareResult: shareResult,
    readInvite: readInvite,
    inviteBar: inviteBar,
    setRankBoard: setRankBoard,
    setRankPending: setRankPending,
    rankTab: rankTab,
  };
})(typeof window !== 'undefined' ? window : globalThis);
