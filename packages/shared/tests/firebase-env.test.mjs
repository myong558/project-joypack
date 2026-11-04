// 랭킹 DB 고르기(Joyfield.FIREBASE, README 4.4) 검사: node --test
//   내 PC·같은 와이파이 주소면 개발 DB(joyfield-dev), 배포 사이트면 운영 DB(joyfield-41b5a)
import assert from 'node:assert/strict';
import { test } from 'node:test';

await import('../joyfield.js');
const { isLocalHost, isDevHost, FIREBASE, FIREBASE_ENV, shareUrl } = globalThis.Joyfield;

test('개발 사이트(dev.pocketgamelab.com, Pages 브랜치·미리보기)는 개발 DB, 운영 주소는 운영 DB', () => {
  for (const host of ['localhost', '192.168.0.3', 'dev.pocketgamelab.com', 'dev.pocketgamelab.pages.dev', 'a1b2c3d4.pocketgamelab.pages.dev']) {
    assert.equal(isDevHost(host), true, host);
  }
  for (const host of ['pocketgamelab.com', 'www.pocketgamelab.com', 'pocketgamelab.pages.dev', 'myong558.github.io', 'dev.pocketgamelab.com.evil.com']) {
    assert.equal(isDevHost(host), false, host);
  }
});

test('공유 주소는 개발 중에도 운영 주소(pocketgamelab.com/joyfield/)', () => {
  assert.equal(shareUrl(), 'https://pocketgamelab.com/joyfield/?from=share');
  assert.equal(shareUrl('hammer'), 'https://pocketgamelab.com/joyfield/games/hammer/?from=share');
});

test('내 PC·사설 주소는 개발 DB 쪽', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '::1', '192.168.0.12', '10.0.0.5', '172.16.1.1', '172.31.255.255', 'my-pc.local', 'a.localhost']) {
    assert.equal(isLocalHost(host), true, host);
  }
});

test('배포 사이트·공인 주소는 운영 DB 쪽', () => {
  for (const host of ['myong558.github.io', 'pocketgamelab.com', 'www.pocketgamelab.com', '172.15.0.1', '172.32.0.1', '8.8.8.8', '192.169.0.1', '', 'localhost.evil.com']) {
    assert.equal(isLocalHost(host), false, host);
  }
});

test('주소가 없는 곳(node)은 운영 DB 설정을 쓴다', () => {
  assert.equal(FIREBASE_ENV, 'prod');
  assert.equal(FIREBASE.projectId, 'joyfield-41b5a');
});
