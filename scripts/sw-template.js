/* 조이팩 서비스 워커. scripts/build.mjs 가 빌드할 때 이 파일로 dist/sw.js 를 만든다(직접 고치지 말 것).
 *
 * 캐시 정책(README 4.1)
 * - 허브: 서비스 워커 설치 때 미리 캐시(precache). 빌드마다 VERSION 이 바뀌어 새 캐시로 교체된다
 * - 게임: 그 게임을 처음 열 때 games/<id>/files.json 에 적힌 파일 전체를 게임별 캐시(joypack-game-<id>)에 담는다.
 *         이후에는 해시가 바뀐 파일만 다시 받는다. 한 번도 안 연 게임은 받지 않는다
 * - Firestore 등 다른 출처 요청, files.json, og-image.png 는 캐시하지 않는다
 */
const VERSION = '__VERSION__';
const HUB_FILES = [] /* __HUB_FILES__ */;
const HUB_CACHE = 'joypack-hub-' + VERSION;
const GAME_PREFIX = 'joypack-game-';
const NETWORK_TIMEOUT = 3000;
const SCOPE = self.registration.scope; // 끝이 / 인 사이트 루트 주소

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(HUB_CACHE)
      .then((cache) => cache.addAll(HUB_FILES.map((path) => new Request(SCOPE + path, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 지난 허브 캐시만 지운다. 게임 캐시와 다른 앱(예전 업다운 등)의 캐시는 건드리지 않는다
      for (const key of await caches.keys()) {
        if (key.startsWith('joypack-hub-') && key !== HUB_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'cache-game' && /^[a-z0-9-]+$/.test(data.id)) event.waitUntil(syncGame(data.id));
});

// 게임 파일 전체를 그 게임 캐시에 담는다. 이미 있으면 바뀐 파일만. 다 받은 뒤에 files.json 을 넣어 "다 받음"을 표시한다
async function syncGame(id) {
  const listUrl = SCOPE + 'games/' + id + '/files.json';
  let listRes;
  let list;
  try {
    listRes = await fetch(listUrl, { cache: 'no-store' });
    if (!listRes.ok) return;
    list = await listRes.clone().json();
  } catch (e) {
    return; // 오프라인이면 다음에 다시
  }
  const cache = await caches.open(GAME_PREFIX + id);
  const oldRes = await cache.match(listUrl);
  const old = oldRes ? await oldRes.json() : { files: [] };
  const oldHash = new Map(old.files.map((f) => [f.path, f.hash]));
  const changed = list.files.filter((f) => oldHash.get(f.path) !== f.hash);
  if (oldRes && !changed.length) return;
  try {
    await Promise.all(
      changed.map(async (f) => {
        const res = await fetch(SCOPE + f.path, { cache: 'no-cache' });
        if (!res.ok) throw new Error(f.path);
        await cache.put(SCOPE + f.path, res);
      }),
    );
  } catch (e) {
    return; // 하나라도 못 받으면 files.json 을 넣지 않는다 → 다음에 열 때 다시 시도
  }
  // 새 목록에 없는 옛 파일은 지운다(폴더 주소 = 페이지 이동으로 담긴 것은 남김)
  const keep = new Set(list.files.map((f) => SCOPE + f.path));
  for (const req of await cache.keys()) {
    if (!keep.has(req.url) && !req.url.endsWith('/') && req.url !== listUrl) await cache.delete(req);
  }
  await cache.put(listUrl, listRes);
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'game-cached', id }));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  const path = req.url.slice(SCOPE.length).split(/[?#]/)[0];
  if (path.endsWith('/files.json') || path.split('/').pop() === 'og-image.png') return;
  const game = path.match(/^games\/([a-z0-9-]+)\//);
  event.respondWith(game ? fromGame(event, game[1], path) : fromHub(req));
});

async function match(cacheName, req) {
  const cache = await caches.open(cacheName);
  const url = req.url.split(/[?#]/)[0];
  return (await cache.match(url)) || (url.endsWith('/') ? cache.match(url + 'index.html') : undefined);
}

async function fetchAndPut(cacheName, req) {
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(req.url.split(/[?#]/)[0], res.clone());
  }
  return res;
}

// 허브: 캐시 먼저(설치 때 다 담아 둠), 없으면 네트워크
async function fromHub(req) {
  return (await match(HUB_CACHE, req)) || fetch(req);
}

async function fromGame(event, id, path) {
  const req = event.request;
  const cacheName = GAME_PREFIX + id;

  // 게임 페이지: 네트워크 먼저, 3초 안에 응답이 없거나 오프라인이면 캐시.
  // 캐시도 없으면(한 번도 안 연 게임) 허브로 보낸다 → 허브가 "인터넷 연결 후 한 번 열어 주세요" 안내
  if (req.mode === 'navigate') {
    const network = fetchAndPut(cacheName, req);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT));
    const first = await Promise.race([network.catch(() => null), timeout]);
    if (first) return first;
    const hit = await match(cacheName, req);
    if (hit) return hit;
    return network.catch(() => Response.redirect(SCOPE, 302));
  }

  const hit = await match(cacheName, req);
  // 해시가 붙은 파일(빌드 결과 assets/): 내용이 바뀌면 이름이 바뀌므로 캐시 먼저
  if (path.includes('/assets/')) return hit || fetchAndPut(cacheName, req);
  // 해시 없는 파일: 캐시로 바로 보여 주고 뒤에서 새로 받아 둔다
  const network = fetchAndPut(cacheName, req);
  if (hit) {
    event.waitUntil(network.catch(() => {}));
    return hit;
  }
  return network;
}
