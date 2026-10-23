// 공유 랭킹: Firebase Firestore(REST API)에 정답 기록을 올리고 범위별 TOP 10 을 읽는다. SDK 없이 fetch 만 쓴다.
// 여러 게임이 한 Firebase 프로젝트를 같이 쓰므로 이 게임 기록은 games/updown/scores-<끝 숫자> 아래에 둔다(1~50 → scores-50).
// 범위마다 컬렉션을 나눠 "점수 내림차순" 한 가지 정렬만 쓰므로 복합 색인이 필요 없다.
// 기록 형식 검사(이니셜 영문 대문자 1~5자, 점수가 시도 횟수·걸린 시간으로 낸 점수를 넘지 않음, 서버 시각)와
// 고치기·지우기 금지는 Firestore 보안 규칙이 맡는다.
// 순위: 점수가 높을수록 → 같으면 먼저 등록한 기록이 위.
// thermo: 온도계를 쓴 판이면 true(v1.15.0~). 순위에는 영향이 없고 목록에 🌡️ 로만 보인다. 그 전 기록에는 없다(= 안 씀).
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
  // 마지막으로 받은 범위별 순위표 { [끝 숫자]: { at, rows } }. 오프라인일 때 보여 주고 TOP 10 판단에 쓴다.
  const CACHE_KEY = 'updown.rankings2';

  const collection = (board) => 'scores-' + board;

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

  function writeCache(board, rows) {
    try {
      const data = readCache();
      data[board] = { at: Date.now(), rows: rows.map((row) => Object.assign({}, row, { createdAt: row.createdAt.toISOString() })) };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  // 마지막으로 받은 그 범위 순위표 { at, rows }. 받은 적이 없거나 저장 값이 깨졌으면 null.
  function cached(board) {
    const saved = readCache()[board];
    if (!saved || !Array.isArray(saved.rows)) return null;
    const rows = saved.rows
      .filter((row) => row && typeof row.initials === 'string' && Number.isFinite(row.score))
      .map((row) => Object.assign({}, row, { createdAt: new Date(row.createdAt) }))
      .slice(0, LIMIT);
    return { at: Number(saved.at) || 0, rows: rows };
  }

  // 범위별 TOP 10. 같은 점수는 먼저 등록한 기록을 위로 다시 늘어놓는다.
  async function top(board) {
    const rows = await request('/' + PARENT + ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: collection(board) }],
        orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
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
          score: Number(f.score.integerValue),
          tries: Number(f.tries.integerValue),
          time: Number(f.time.integerValue),
          thermo: !!(f.thermo && f.thermo.booleanValue),
          createdAt: new Date(f.createdAt.timestampValue),
        };
      })
      .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
    // 받은 순위표는 오프라인 대비로 기기에 남긴다(cached).
    writeCache(board, result);
    return result;
  }

  // 기록 등록. 등록 시각은 서버 시각(REQUEST_TIME)으로 채운다. 만든 문서 ID 를 돌려줘 목록에서 내 기록을 찾게 한다.
  async function submit(entry) {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
    await request(':commit', {
      writes: [
        {
          update: {
            name: DOCS + '/' + PARENT + '/' + collection(entry.board) + '/' + id,
            fields: {
              initials: { stringValue: entry.initials },
              score: { integerValue: String(entry.score) },
              tries: { integerValue: String(entry.tries) },
              time: { integerValue: String(entry.time) },
              thermo: { booleanValue: !!entry.thermo },
            },
          },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    });
    return id;
  }

  // 새 기록이 TOP 10 에 들 수 있나: 10명이 안 찼으면 들고, 다 찼으면 10위보다 높아야 든다(같으면 기존 기록 유지).
  function qualifies(rows, entry) {
    if (rows.length < LIMIT) return true;
    return entry.score > rows[LIMIT - 1].score;
  }

  // 이니셜 정리: 영문만 남기고 대문자로, 최대 5자.
  function cleanInitials(text) {
    return String(text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  }

  global.UpDownRanking = { LIMIT: LIMIT, top: top, cached: cached, submit: submit, qualifies: qualifies, cleanInitials: cleanInitials };
})(window);
