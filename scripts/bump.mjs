// 버전 올리기: 파일에 지금 적힌 버전을 읽어 그 다음 버전으로 바꾼다(CLAUDE.md "수정할 때").
//   pnpm bump <게임 id | hub> <patch | minor | major>
// 여러 세션이 번갈아 고쳐도 "지금 값 + 1" 이라 번호가 뒤로 가거나 그대로 남지 않는다.
// 다른 세션이 올린 버전을 놓치지 않게, 고치기 전에 git pull 로 최신을 받아 둔다.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const [target, level = 'patch'] = process.argv.slice(2);
if (!target || !['patch', 'minor', 'major'].includes(level)) {
  console.error('쓰는 법: pnpm bump <게임 id | hub> <patch | minor | major>');
  process.exit(1);
}
const file = target === 'hub' ? join(ROOT, 'package.json') : join(ROOT, 'games', target, 'package.json');
const text = readFileSync(file, 'utf8');
const current = JSON.parse(text).version;
const [major, minor, patch] = current.split('.').map(Number);
const next = level === 'major' ? `${major + 1}.0.0` : level === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
writeFileSync(file, text.replace(`"version": "${current}"`, `"version": "${next}"`));
console.log(`${target === 'hub' ? '허브' : target} 버전 ${current} → ${next}`);
