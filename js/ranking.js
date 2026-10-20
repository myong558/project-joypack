// 공유 랭킹: Firebase Firestore(REST API)에 정답 기록을 올리고 난이도별 TOP 10 을 읽는다. SDK 없이 fetch 만 쓴다.
// 여러 게임이 한 Firebase 프로젝트를 같이 쓰므로 이 게임 기록은 games/updown/scores 아래에 둔다.
// 기록 형식 검사(이니셜 영문 대문자 1~5자, 난이도, 시도 횟수 1~6, 서버 시각)와 고치기·지우기 금지는 Firestore 보안 규칙이 맡는다.
// 순위 쿼리(난이도 같음 + 시도 횟수 → 등록 시각 오름차순)에는 Firestore 복합 색인이 필요하다(README 참고).
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

  async function request(path, body) {
    const res = await fetch(API + path + '?key=' + FIREBASE.apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('firestore ' + res.status + ' ' + (await res.text()));
    return res.json();
  }

  // 난이도별 TOP 10: 시도 횟수가 적을수록, 같으면 먼저 등록한 기록이 위.
  async function top(difficulty) {
    const rows = await request('/' + PARENT + ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: 'scores' }],
        where: { fieldFilter: { field: { fieldPath: 'difficulty' }, op: 'EQUAL', value: { stringValue: difficulty } } },
        orderBy: [
          { field: { fieldPath: 'tries' }, direction: 'ASCENDING' },
          { field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' },
        ],
        limit: LIMIT,
      },
    });
    return rows
      .filter((row) => row.document)
      .map((row) => {
        const f = row.document.fields;
        return {
          id: row.document.name.split('/').pop(),
          initials: f.initials.stringValue,
          tries: Number(f.tries.integerValue),
          createdAt: new Date(f.createdAt.timestampValue),
        };
      });
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
            },
          },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    });
    return id;
  }

  // 이니셜 정리: 영문만 남기고 대문자로, 최대 5자.
  function cleanInitials(text) {
    return String(text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  }

  global.UpDownRanking = { LIMIT: LIMIT, top: top, submit: submit, cleanInitials: cleanInitials };
})(window);
