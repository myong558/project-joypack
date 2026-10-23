// Claude Code 개인 설정을 이 PC의 ~/.claude/ 에 깔거나(pnpm setup:claude), 이 PC 설정을 저장소에 저장한다(pnpm setup:claude --save).
// 원본: setup/claude/ (전역 지침 CLAUDE.md, 압축 직후 한국어 규칙을 다시 넣는 훅 hooks/korean-after-compact.js)
// settings.json 은 통째로 덮지 않고 hooks.SessionStart(matcher compact)에 훅 하나만 넣는다. 훅 경로는 이 PC 사용자 폴더로 맞춘다.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'setup', 'claude');
const HOME = join(homedir(), '.claude');
const FILES = ['CLAUDE.md', 'hooks/korean-after-compact.js'];
const HOOK = 'korean-after-compact.js';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);

if (process.argv.includes('--save')) {
  // 이 PC에서 고친 개인 설정을 저장소 원본으로 가져온다(그다음 커밋·푸시)
  for (const f of FILES) {
    if (!existsSync(join(HOME, f))) throw new Error(`~/.claude/${f} 이 없습니다`);
    copyFileSync(join(HOME, f), join(SRC, f));
    console.log(`저장: ~/.claude/${f} → setup/claude/${f}`);
  }
  process.exit(0);
}

for (const f of FILES) {
  const to = join(HOME, f);
  const before = read(to);
  if (before === readFileSync(join(SRC, f), 'utf8')) {
    console.log(`그대로: ~/.claude/${f}`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  // 내용이 다른 파일이 이미 있으면 덮기 전에 .bak 으로 남긴다
  if (before !== null) copyFileSync(to, `${to}.bak`);
  copyFileSync(join(SRC, f), to);
  console.log(`설치: ~/.claude/${f}${before !== null ? ` (예전 파일은 ${f}.bak)` : ''}`);
}

const settingsPath = join(HOME, 'settings.json');
const settings = JSON.parse(read(settingsPath) ?? '{}');
const command = `node "${join(HOME, 'hooks', HOOK).replace(/\\/g, '/')}"`;
const start = ((settings.hooks ??= {}).SessionStart ??= []);
// 예전에 다른 경로로 넣은 같은 훅은 지우고 이 PC 경로로 다시 넣는다
for (const group of start) group.hooks = (group.hooks ?? []).filter((h) => !h.command?.includes(HOOK));
settings.hooks.SessionStart = start.filter((g) => g.hooks.length);
settings.hooks.SessionStart.push({ matcher: 'compact', hooks: [{ type: 'command', command, timeout: 10 }] });
writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
console.log(`설치: ~/.claude/settings.json 훅 → ${command}`);
console.log('끝. 열려 있는 Claude Code 세션은 다시 시작해야 적용됩니다.');
