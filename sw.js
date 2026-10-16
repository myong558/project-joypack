// 서비스 워커는 자기 위치 아래만 관리할 수 있어서, js/ 로 옮기지 않고 루트에 둔다.
// 파일을 고쳐 배포할 때마다 이 버전을 올려야 사용자에게 새 파일이 전달된다.
const CACHE_NAME = 'updown-v119';

// GitHub Pages 하위 경로에서도 동작하도록 모두 상대 경로로 쓴다.
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/game.js',
  'js/i18n.js',
  'js/skins.js',
  'js/app.js',
  'fonts/jua-subset.woff2',
  'images/icon.svg',
  'images/icon-maskable.svg',
  'images/icon-192.png',
  'images/icon-512.png',
  'images/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // 브라우저 HTTP 캐시에 남은 옛 파일을 담지 않도록 항상 새로 받는다.
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
