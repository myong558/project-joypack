// 공유 랭킹: Firebase Firestore(REST API)에 정답 기록을 올리고 난이도별 TOP 10 을 읽는다. SDK 없이 fetch 만 쓴다.
// 여러 게임이 한 Firebase 프로젝트를 같이 쓰므로 이 게임 기록은 games/updown/scores 아래에 둔다.
// 기록 형식 검사(이니셜 영문 대문자 1~5자, 난이도, 시도 횟수 1~6, 걸린 시간 ms, 서버 시각)와 고치기·지우기 금지는 Firestore 보안 규칙이 맡는다.
// 순위: 시도 횟수가 적을수록 → 같으면 빨리 맞힐수록(걸린 시간) → 그것도 같으면 먼저 등록한 기록이 위.
// 이 순위 쿼리(난이도 같음 + tries → time → createdAt 오름차순)에는 Firestore 복합 색인이 필요하다(README 참고).
(function (global) {
  'use strict';

  // 웹 앱 공개 설정 값. 원래 웹페이지에 드러나는 값이고, 저장소를 지키는 건 보안 규칙이다.
  const FIREBASE = {
    apiKey: 'AIzaSyChpbX7wDj2GQF7O4QqR-5g7QYpCVkx_9s',
    projectId: 'joypack-c6bd2',
  };
  const GAME_ID = 'updown';
  const LIMIT = 10;
  const DOCS = 'projects/' + FIREBASE.projectId + '/databases/(default)/documents';
  const API = 'https://firestore.googleapis.com/v1/' + DOCS;
  const PARENT = 'games/' + GAME_ID;
  // 응답이 이만큼 늦으면 포기한다(느린 망에서 멈춘 것처럼 보이지 않게, 두더지잡기와 같은 8초).
  const TIMEOUT_MS = 8000;
  // 마지막으로 받은 난이도별 순위표 { [난이도]: { at, rows } }. 오프라인일 때 보여 주고 TOP 10 판단에 쓴다.
  const CACHE_KEY = 'updown.rankings';

  async function request(path, body) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller && setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(API + path + '?key=' + FIREBASE.apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      });
      if (!res.ok) throw new Error('firestore ' + res.status + ' ' + (await res.text()));
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function readCache() {
    try {
      const data = JSON.parse(localStorage.getItem(CACHE_KEY));
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeCache(difficulty, rows) {
    try {
      const data = readCache();
      data[difficulty] = { at: Date.now(), rows: rows.map((row) => Object.assign({}, row, { createdAt: row.createdAt.toISOString() })) };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  // 마지막으로 받은 그 난이도 순위표 { at, rows }. 받은 적이 없거나 저장 값이 깨졌으면 null.
  function cached(difficulty) {
    const board = readCache()[difficulty];
    if (!board || !Array.isArray(board.rows)) return null;
    const rows = board.rows
      .filter((row) => row && typeof row.initials === 'string' && Number.isFinite(row.tries) && Number.isFinite(row.time))
      .map((row) => Object.assign({}, row, { createdAt: new Date(row.createdAt) }))
      .slice(0, LIMIT);
    return { at: Number(board.at) || 0, rows: rows };
  }

  // 난이도별 TOP 10
  async function top(difficulty) {
    const rows = await request('/' + PARENT + ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: 'scores' }],
        where: { fieldFilter: { field: { fieldPath: 'difficulty' }, op: 'EQUAL', value: { stringValue: difficulty } } },
        orderBy: [
          { field: { fieldPath: 'tries' }, direction: 'ASCENDING' },
          { field: { fieldPath: 'time' }, direction: 'ASCENDING' },
          { field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' },
        ],
        limit: LIMIT,
      },
    });
    const result = rows
      .filter((row) => row.document)
      .map((row) => {
        const f = row.document.fields;
        return {
          id: row.document.name.split('/').pop(),
          initials: f.initials.stringValue,
          tries: Number(f.tries.integerValue),
          time: Number(f.time.integerValue),
          createdAt: new Date(f.createdAt.timestampValue),
        };
      });
    // 받은 순위표는 오프라인 대비로 기기에 남긴다(cached).
    writeCache(difficulty, result);
    return result;
  }

  // 기록 등록. 등록 시각은 서버 시각(REQUEST_TIME)으로 채운다. 만든 문서 ID 를 돌려줘 목록에서 내 기록을 찾게 한다.
  async function submit(entry) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
    await request(':commit', {
      writes: [
        {
          update: {
            name: DOCS + '/' + PARENT + '/scores/' + id,
            fields: {
              initials: { stringValue: entry.initials },
              difficulty: { stringValue: entry.difficulty },
              tries: { integerValue: String(entry.tries) },
              time: { integerValue: String(entry.time) },
            },
          },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    });
    return id;
  }

  // 새 기록이 TOP 10 에 들 수 있나: 10명이 안 찼으면 들고, 다 찼으면 10위보다 앞서야 든다(완전히 같으면 기존 기록 유지).
  function qualifies(rows, entry) {
    if (rows.length < LIMIT) return true;
    const last = rows[LIMIT - 1];
    return entry.tries < last.tries || (entry.tries === last.tries && entry.time < last.time);
  }

  // 이니셜 정리: 영문만 남기고 대문자로, 최대 5자.
  function cleanInitials(text) {
    return String(text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  }

  global.UpDownRanking = { LIMIT: LIMIT, top: top, cached: cached, submit: submit, qualifies: qualifies, cleanInitials: cleanInitials };
})(window);
