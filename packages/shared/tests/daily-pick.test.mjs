// 자동 스킨 공통 규칙 Joypack.dailyPick(기준서 1.4) 검사: node --test
//   1. 같은 날은 같은 값, 이틀 연속 같은 값 없음, 묶음마다 고르게
//   2. 허브·업다운 index.html 첫 화면 스크립트의 복사본이 joypack.js 와 글자 그대로 같음(공백만 무시)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
await import('../joypack.js');
const { dailyPick } = globalThis.Joypack;

const day = (n) => new Date(2026, 0, 1 + n);

test('이틀 연속 같은 값이 없고 고르게 돈다', () => {
  for (const [salt, count] of [['hub', 5], ['updown', 4], ['hammer', 4], ['timetoflip', 4], ['glasshouse', 4], ['x', 2], ['y', 3]]) {
    const seen = new Array(count).fill(0);
    let prev = -1;
    for (let n = -400; n < 4000; n++) {
      const v = dailyPick(salt, count, day(n));
      assert.ok(v >= 0 && v < count);
      assert.notEqual(v, prev, `${salt} ${day(n).toDateString()}`);
      prev = v;
      if (n >= 0 && n < count * 500) seen[v]++;
    }
    for (const c of seen) assert.ok(Math.abs(c - 500) <= 1, `${salt} 분포 ${seen}`);
  }
});

test('같은 날은 시각과 상관없이 같은 값', () => {
  assert.equal(dailyPick('hammer', 4, new Date(2026, 9, 26, 0, 0, 1)), dailyPick('hammer', 4, new Date(2026, 9, 26, 23, 59, 59)));
  assert.equal(dailyPick('hub', 1, day(3)), 0);
});

test('허브·업다운 첫 화면 스크립트의 복사본이 공통 모듈과 같다', () => {
  const block = (file) => {
    const s = readFileSync(ROOT + file, 'utf8');
    const m = s.match(/\/\* dailyPick: begin[\s\S]*?\/\* dailyPick: end \*\//);
    assert.ok(m, `${file} 에 dailyPick 복사본이 없음`);
    return m[0].replace(/\s+/g, ' ');
  };
  const source = block('packages/shared/joypack.js');
  assert.equal(block('apps/hub/index.html'), source, '허브 index.html 을 joypack.js 의 dailyPick 과 같게 고치세요');
  assert.equal(block('games/updown/index.html'), source, '업다운 index.html 을 joypack.js 의 dailyPick 과 같게 고치세요');
});
