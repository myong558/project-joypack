// 좋아요 수 표기(likes.ts formatLikes, 기준서 1.13) 검사: node --test
//   0 → 하트만(''), 999 까지 그대로, 1.2K · 12K · 999K, 1.2M. 반올림하지 않고 버림
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { formatLikes } = await import('../likes.ts');

test('좋아요 수는 최대 4글자로 줄여 보인다', () => {
  const cases = [
    [0, ''],
    [-3, ''],
    [1, '1'],
    [85, '85'],
    [999, '999'],
    [1000, '1K'],
    [1234, '1.2K'],
    [9999, '9.9K'],
    [12345, '12K'],
    [999999, '999K'],
    [1000000, '1M'],
    [1250000, '1.2M'],
    [12000000, '12M'],
  ];
  for (const [n, want] of cases) assert.equal(formatLikes(n), want, String(n));
  for (const [n] of cases) assert.ok(formatLikes(n).length <= 4, String(n));
});
