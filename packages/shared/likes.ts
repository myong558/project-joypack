// 조이필드 게임 좋아요(기준서 1.13). 게임마다 한 기기(익명 계정) 한 번. 누르는 곳은 게임 시작 화면 위 메뉴(likeButton),
// 숫자는 허브 게임 카드에도 보인다(likeCounts·likeLabel). 개인정보는 받지 않는다: Firebase 익명 인증의 무작위 uid 만 쓴다.
//
// 저장 모양(firestore.rules "■ 좋아요")
//   games/<게임 id>/likes/<uid>   { at }          누른 기기 1개 = 문서 1개(본인만 읽기·만들기·지우기)
//   stats/likes                   { <게임 id>: 수 }  게임별 합계(누구나 읽기). 규칙이 위 문서를 만들거나 지울 때만 ±1 을 받는다
//
// Firebase SDK 대신 REST 로 부른다(인증 SDK 를 넣지 않아 허브·게임이 거의 커지지 않음, 허브는 숫자 읽기만).
// 화면은 누르는 즉시 바뀌고, 서버에는 뒤에서 보낸다. 오프라인이면 기기에 남겨 두었다가 연결되거나 다음에 열 때 보낸다.
import './joyfield.js';
import { playRecipe } from './sfx.js';

const ENV = Joyfield.FIREBASE_ENV;
const STATE_KEY = `joyfield.likes.${ENV}`; // { mine: 내가 좋아요한 게임 id[], sent: 서버에 반영된 게임 id[] }
const COUNTS_KEY = `joyfield.likeCounts.${ENV}`; // { 게임 id: 수 } 마지막으로 받은 합계
const AUTH_KEY = `joyfield.likeAuth.${ENV}`; // { uid, refresh } 익명 계정(기기 저장을 지우면 새 계정)

const TIMEOUT_MS = 8000;

interface LikeState {
  mine: string[];
  sent: string[];
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v && typeof v === 'object' ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 시크릿 창·용량 초과는 무시(이번 화면에서만 기억)
  }
}

const state = (): LikeState => {
  const s = readJson<Partial<LikeState>>(STATE_KEY, {});
  return { mine: Array.isArray(s.mine) ? s.mine : [], sent: Array.isArray(s.sent) ? s.sent : [] };
};
const cachedCounts = (): Record<string, number> => readJson<Record<string, number>>(COUNTS_KEY, {});

/** 이 기기가 좋아요했는지(서버에 아직 안 갔어도 누른 상태면 true) */
export function isLiked(gameId: string): boolean {
  return state().mine.includes(gameId);
}

/** 화면에 보일 수: 마지막으로 받은 합계 + 아직 서버에 안 간 내 누름 */
export function likeCount(gameId: string): number {
  const s = state();
  const diff = Number(s.mine.includes(gameId)) - Number(s.sent.includes(gameId));
  return Math.max(0, (Number(cachedCounts()[gameId]) || 0) + diff);
}

/** 좋아요 수 표기: 0 → ''(하트만), 999 까지 그대로, 1.2K · 12K · 999K, 1.2M · 12M. 반올림하지 않고 버린다(999,999 → 999K) */
export function formatLikes(n: number): string {
  n = Math.max(0, Math.floor(n || 0));
  if (n === 0) return '';
  if (n < 1000) return String(n);
  const unit = n < 1e6 ? { d: 1e3, s: 'K' } : { d: 1e6, s: 'M' };
  const v = n / unit.d;
  return (v < 10 ? (Math.floor(v * 10) / 10).toString() : String(Math.floor(v))) + unit.s;
}

const ko = () => (Joyfield.get('lang') || Joyfield.deviceLang()) === 'ko';

/** 읽어 주기용 이름: "좋아요 12개" / "12 likes" */
export function likeLabel(gameId: string): string {
  const n = likeCount(gameId);
  return ko() ? `좋아요 ${n.toLocaleString('ko-KR')}개` : `${n.toLocaleString('en-US')} ${n === 1 ? 'like' : 'likes'}`;
}

// ── REST ──
const cfg = () => Joyfield.FIREBASE as { apiKey: string; projectId: string };
const DOCS = () => `projects/${cfg().projectId}/databases/(default)/documents`;
const API = () => `https://firestore.googleapis.com/v1/${DOCS()}`;

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw Object.assign(new Error(`likes ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

type Fields = Record<string, { integerValue?: string }>;
const countsOf = (fields: Fields | undefined) =>
  Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, Number(v.integerValue) || 0]));

let fetching: Promise<Record<string, number>> | null = null;

/** 게임별 합계를 서버에서 받아 기기에 남기고 돌려준다(문서 1개 읽기). 실패하면 마지막으로 받은 값 */
export function refreshLikeCounts(): Promise<Record<string, number>> {
  fetching ??= (async () => {
    try {
      const res = await call(`${API()}/stats/likes?key=${cfg().apiKey}`);
      const counts = res.status === 404 ? {} : countsOf((await json<{ fields?: Fields }>(res)).fields);
      writeJson(COUNTS_KEY, counts);
      return counts;
    } catch {
      return cachedCounts();
    } finally {
      fetching = null;
    }
  })();
  return fetching;
}

// 익명 계정: 처음 누를 때 만들고, 1시간마다 바뀌는 열쇠(idToken)는 refresh 로 새로 받는다
let token: { id: string; uid: string; exp: number } | null = null;

async function signIn(): Promise<{ id: string; uid: string }> {
  if (token && token.exp > Date.now() + 60_000) return token;
  const key = cfg().apiKey;
  const saved = readJson<{ uid?: string; refresh?: string }>(AUTH_KEY, {});
  if (saved.refresh) {
    const res = await call(`https://securetoken.googleapis.com/v1/token?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(saved.refresh)}`,
    });
    if (res.ok) {
      const r = (await res.json()) as { id_token: string; refresh_token: string; user_id: string; expires_in: string };
      writeJson(AUTH_KEY, { uid: r.user_id, refresh: r.refresh_token });
      token = { id: r.id_token, uid: r.user_id, exp: Date.now() + Number(r.expires_in) * 1000 };
      return token;
    }
    // 400(계정이 지워짐·열쇠 만료)일 때만 새 계정으로. 그 밖(서버 오류)은 다음에 다시
    if (res.status !== 400) throw new Error(`likes refresh ${res.status}`);
  }
  const r = await json<{ idToken: string; refreshToken: string; localId: string; expiresIn: string }>(
    await call(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }),
  );
  writeJson(AUTH_KEY, { uid: r.localId, refresh: r.refreshToken });
  // 새 계정에는 서버에 반영된 좋아요가 없다
  writeJson(STATE_KEY, { ...state(), sent: [] });
  token = { id: r.idToken, uid: r.localId, exp: Date.now() + Number(r.expiresIn) * 1000 };
  return token;
}

/** 한 게임의 내 좋아요를 서버와 맞춘다(트랜잭션: 내 문서 만들기·지우기 + 합계 ±1 을 함께). 바뀐 합계를 돌려준다 */
async function push(gameId: string, want: boolean): Promise<number> {
  const { id, uid } = await signIn();
  const auth = { Authorization: `Bearer ${id}`, 'Content-Type': 'application/json' };
  const post = <T>(op: string, body: unknown) =>
    call(`${API()}:${op}?key=${cfg().apiKey}`, { method: 'POST', headers: auth, body: JSON.stringify(body) }).then((r) => json<T>(r));
  const countsName = `${DOCS()}/stats/likes`;
  const mineName = `${DOCS()}/games/${gameId}/likes/${uid}`;
  for (let attempt = 0; ; attempt++) {
    const { transaction } = await post<{ transaction: string }>('documents:beginTransaction', {});
    const got = await post<{ found?: { name: string; fields?: Fields }; missing?: string }[]>('documents:batchGet', {
      documents: [countsName, mineName],
      transaction,
    });
    const counts = countsOf(got.find((g) => g.found?.name === countsName)?.found?.fields);
    const has = got.some((g) => g.found?.name === mineName);
    const now = counts[gameId] || 0;
    if (has === want) return now;
    const next = Math.max(0, now + (want ? 1 : -1));
    const writes = [
      { update: { name: countsName, fields: { [gameId]: { integerValue: String(next) } } }, updateMask: { fieldPaths: [gameId] } },
      want
        ? {
            update: { name: mineName, fields: {} },
            currentDocument: { exists: false },
            updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
          }
        : { delete: mineName, currentDocument: { exists: true } },
    ];
    try {
      await post('documents:commit', { writes, transaction });
      return next;
    } catch (e) {
      // 다른 사람과 동시에 고쳐 트랜잭션이 밀렸으면(409 ABORTED) 몇 번 다시
      if ((e as { status?: number }).status !== 409 || attempt >= 3) throw e;
    }
  }
}

let syncing: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());
/** 화면의 좋아요 버튼을 다시 그린다(언어를 바꿔 화면을 새로 그리지 않을 때) */
export const refreshLikes = notify;

/** 서버에 아직 안 간 좋아요를 보낸다(한 번에 하나씩 차례로). 실패하면 그대로 두고 다음 기회에 */
export function flushLikes(): Promise<void> {
  syncing = syncing.then(async () => {
    for (;;) {
      const s = state();
      const gameId = [...new Set([...s.mine, ...s.sent])].find((g) => s.mine.includes(g) !== s.sent.includes(g));
      if (!gameId || !navigator.onLine) return;
      const want = s.mine.includes(gameId);
      try {
        const count = await push(gameId, want);
        const now = state();
        writeJson(STATE_KEY, { ...now, sent: want ? [...new Set([...now.sent, gameId])] : now.sent.filter((g) => g !== gameId) });
        writeJson(COUNTS_KEY, { ...cachedCounts(), [gameId]: count });
        notify();
      } catch {
        return;
      }
    }
  });
  return syncing;
}

/** 누름: 화면은 바로 바꾸고 서버에는 뒤에서 보낸다 */
export function toggleLike(gameId: string): boolean {
  const s = state();
  const on = !s.mine.includes(gameId);
  writeJson(STATE_KEY, { ...s, mine: on ? [...s.mine, gameId] : s.mine.filter((g) => g !== gameId) });
  notify();
  void flushLikes();
  return on;
}

if (typeof window !== 'undefined') window.addEventListener('online', () => void flushLikes());

const HEART = 'M12 20.2s-7.7-4.6-8.9-9.6C2.3 7.3 4.4 4.6 7.4 4.6c2 0 3.6 1.1 4.6 2.7 1-1.6 2.6-2.7 4.6-2.7 3 0 5.1 2.7 4.3 6-1.2 5-8.9 9.6-8.9 9.6z';
/** 하트 그림(위 메뉴 아이콘과 같은 선 굵기). 좋아요한 상태는 CSS 가 속을 채운다(topbar.css .jp-like) */
export const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="jp-heart" d="${HEART}"/></svg>`;

// 누를 때 소리: 효과음 목록 new/pop(거품 톡, sounds/catalog.json 그대로). 끌 때는 소리 없이. 공통 소리 설정(Joyfield.get('sound'))을 따른다
const POP = [
  { k: 'tone', f: 520, to: 1250, dur: 0.07, wave: 'sine', vol: 0.22, attack: 0.003 },
  { k: 'noise', dur: 0.02, vol: 0.04, band: 3500 },
];
let audio: AudioContext | null = null;
function pop() {
  if (Joyfield.get('sound') === 'off') return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    playRecipe(audio, POP);
  } catch {
    // 소리를 못 내는 환경은 조용히
  }
}

/**
 * 게임 시작 화면 위 메뉴 왼쪽(조이필드 버튼 옆)의 좋아요 버튼 "♡ 12". 누르면 켜고 끈다(게임을 안 해 봤어도 누를 수 있음).
 * 0개면 하트만 있는 동그란 버튼. 화면을 다시 그리면 새로 만들면 된다(지난 버튼은 화면에서 빠지면 저절로 멈춤)
 */
export function likeButton(gameId: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'jp-top-btn jp-like';
  const render = () => {
    if (!btn.isConnected && btn.dataset.ready) return void listeners.delete(render);
    const text = formatLikes(likeCount(gameId));
    btn.classList.toggle('jp-top-pill', !!text);
    btn.setAttribute('aria-pressed', String(isLiked(gameId)));
    btn.setAttribute('aria-label', likeLabel(gameId));
    btn.title = ko() ? '좋아요' : 'Like';
    btn.innerHTML = HEART_SVG + (text ? `<span>${text}</span>` : '');
  };
  render();
  requestAnimationFrame(() => (btn.dataset.ready = '1'));
  listeners.add(render);
  btn.addEventListener('click', () => {
    const on = toggleLike(gameId);
    if (on) {
      pop();
      Joyfield.vibrate('press', Joyfield.get('vibrate') !== 'off');
      btn.classList.remove('jp-like-pop');
      void btn.offsetWidth;
      btn.classList.add('jp-like-pop');
    }
  });
  btn.addEventListener('animationend', () => btn.classList.remove('jp-like-pop'));
  // 열 때 최신 합계를 받고, 못 보낸 누름이 있으면 보낸다
  void refreshLikeCounts().then(notify);
  void flushLikes();
  return btn;
}
