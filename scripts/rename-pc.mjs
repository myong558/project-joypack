// 저장소 이름을 project-joyfield 로 바꾸기 전(2026-11-04, 옛 이름 project-joypack)에 받아 둔 PC를 새 이름으로 옮긴다.
// pnpm setup:rename          원격 주소 → git pull → 폴더 이름 → pnpm install → pnpm setup:claude
// pnpm setup:rename --dry    할 일만 보여 주고 아무것도 바꾸지 않음
// Windows 에서는 VS Code 가 폴더를 잡고 있어 바로 이름을 못 바꾼다. 그래서 따로 PowerShell 창을 띄워
// VS Code 를 닫을 때까지 기다렸다가 이름을 바꾸고, 새 폴더에서 설치한 뒤 VS Code 로 다시 연다.
import { execSync, spawn } from 'node:child_process';
import { existsSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'project-joyfield';
const REMOTE = `https://github.com/myong558/${NAME}.git`;
const DRY = process.argv.includes('--dry');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = dirname(ROOT);
const TARGET = join(PARENT, NAME);

const out = (c) => execSync(c, { cwd: ROOT, encoding: 'utf8' }).trim();
const run = (c, cwd = ROOT) => {
  console.log(`> ${c}`);
  if (!DRY) execSync(c, { cwd, stdio: 'inherit' });
};
const fail = (msg) => {
  console.error(`멈춤: ${msg}`);
  process.exit(1);
};

// 1. 원격 주소(옛 주소도 GitHub 가 넘겨 주지만 새 주소로 맞춘다)
const url = out('git remote get-url origin');
if (url.includes(NAME)) console.log(`원격 주소: 이미 새 주소 (${url})`);
else run(`git remote set-url origin ${REMOTE}`);

// 2. 최신 받기(고치던 파일이 있으면 git 이 멈추므로 먼저 정리하라고 알림)
if (out('git status --porcelain') && !DRY) fail('커밋하지 않은 변경이 있습니다. 커밋하거나 치운 뒤 다시 실행하세요.');
run('git pull --ff-only');

// 3. 폴더 이름
if (basename(ROOT) === NAME) {
  console.log(`폴더 이름: 이미 ${NAME}`);
  run('pnpm install');
  run('pnpm setup:claude');
  console.log('\n끝. Claude Code 세션을 다시 시작하세요. 홈 화면에 옛 주소로 설치한 앱은 새 주소에서 다시 설치합니다.');
  process.exit(0);
}
if (existsSync(TARGET)) fail(`${TARGET} 가 이미 있습니다. 어느 쪽을 쓸지 정한 뒤 다른 쪽을 치우세요.`);

if (process.platform !== 'win32') {
  // macOS·Linux 는 열린 폴더도 이름을 바꿀 수 있다
  console.log(`> 폴더 이름 ${ROOT} → ${TARGET}`);
  if (!DRY) renameSync(ROOT, TARGET);
  run('pnpm install', DRY ? ROOT : TARGET);
  run('pnpm setup:claude', DRY ? ROOT : TARGET);
  console.log(`\n끝. 편집기에서 ${TARGET} 를 다시 열고 Claude Code 새 세션을 시작하세요.`);
  process.exit(0);
}

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const ps1 = join(tmpdir(), 'joyfield-rename-pc.ps1');
const script = `$ErrorActionPreference = 'Continue'
$old = ${q(ROOT)}
$new = ${q(TARGET)}
Write-Host '조이필드 폴더 이름 바꾸기'
Write-Host "  $old"
Write-Host "  -> $new"
Write-Host ''
Write-Host 'VS Code 창을 모두 닫아 주세요(이 폴더를 연 터미널·프로그램도). 닫히면 이어서 진행합니다...'
while ($true) {
  try { Rename-Item -LiteralPath $old -NewName ${q(NAME)} -ErrorAction Stop; break }
  catch { Start-Sleep -Seconds 2 }
}
Write-Host '폴더 이름을 바꿨습니다.'
Set-Location -LiteralPath $new
pnpm install
pnpm setup:claude
if (Get-Command code -ErrorAction SilentlyContinue) { code $new }
Write-Host ''
Write-Host '끝. VS Code 에서 Claude Code 새 세션을 시작하세요.'
Write-Host '홈 화면에 옛 주소로 설치한 조이필드 앱은 새 주소에서 다시 설치합니다.'
Read-Host '엔터를 누르면 창을 닫습니다'
`;
console.log(`> PowerShell 창을 띄워 VS Code 를 닫으면 폴더 이름 바꾸기 → pnpm install → pnpm setup:claude → VS Code 다시 열기`);
if (DRY) {
  console.log(`(--dry: 스크립트만 ${ps1} 에 씀)`);
  writeFileSync(ps1, '﻿' + script, 'utf8');
  process.exit(0);
}
writeFileSync(ps1, '﻿' + script, 'utf8'); // PowerShell 5.1 은 BOM 이 있어야 한글을 UTF-8 로 읽음
// 옛 폴더를 잡지 않도록 상위 폴더에서 띄운다(Windows 에서 detached 는 따로 콘솔 창을 연다)
spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
  cwd: PARENT,
  detached: true,
  stdio: 'ignore',
}).unref();
console.log('\n새 PowerShell 창이 떴습니다. 이제 VS Code 를 모두 닫으세요. 나머지는 그 창이 합니다.');
