// 개발자 모드(status "preview")로 확인한 게임을 정식 공개한다. 기준서 7.4 "정식 공개".
//
//   pnpm release <id>                         지금 공개: status "live", added = 오늘(공개 예약이 지났으면 그 날), open 삭제
//   pnpm release <id> --at "2026-11-01 10:00" 공개 예약(한국 시각): open·added 를 적는다. 그 전까지 허브에는 누를 수 없는
//                                             COMING SOON 카드(날짜·D-day), 그 시각부터 모두에게 정식 카드(NEW)
//   pnpm release <id> --cancel                공개 예약 취소(다시 개발자 모드에서만 보임)
//   --skip-check                              pnpm test·build 를 건너뜀
//
// games.json 은 한 줄짜리 객체(name·desc 등) 모양을 지키도록 그 게임의 필드 줄만 글자로 고친다.
// 허브 버전(루트 package.json)의 patch 를 올리고, 게임 버전이 0.x.x 면 1.0.0 으로 올린다(정식 공개 = v1). 커밋·푸시와 기준서 9장 "문서 키우기"는 사람(또는 Claude)이 한다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAMES_FILE = join(ROOT, 'games.json');
const PKG_FILE = join(ROOT, 'package.json');

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--at');
const atIndex = args.indexOf('--at');
const at = atIndex >= 0 ? args[atIndex + 1] : undefined;
const cancel = args.includes('--cancel');
const skipCheck = args.includes('--skip-check');

function fail(message) {
  console.error('✗ ' + message);
  process.exit(1);
}

if (!id) fail('게임 id 를 주세요. 예: pnpm release hammer  /  pnpm release hammer --at "2026-11-01 10:00"');

let text = readFileSync(GAMES_FILE, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const game = JSON.parse(text).find((g) => g.id === id);
if (!game) fail(`games.json 에 "${id}" 가 없습니다`);
if (game.status === 'live') fail(`"${id}" 는 이미 공개(live)입니다`);
if (game.status !== 'preview') fail(`"${id}" 는 status "${game.status}" 입니다. 먼저 "preview"(개발자 모드)로 배포해 휴대폰에서 확인한 뒤 공개합니다(기준서 7.3)`);

// 그 게임 객체의 범위(맨 앞 "  {" 부터 "  }" 까지)
const idAt = text.indexOf(`"id": "${id}"`);
const start = text.lastIndexOf(`${eol}  {`, idAt) + eol.length;
const end = text.indexOf(`${eol}  }`, idAt);
let block = text.slice(start, end);

const fieldLine = (key) => new RegExp(`^    "${key}": .*,?$`, 'm');
function setField(key, value) {
  const line = `    "${key}": ${JSON.stringify(value)},`;
  if (fieldLine(key).test(block)) block = block.replace(fieldLine(key), line);
  else block = block.replace(/^(    "status": .*,)$/m, `$1${eol}${line}`);
}
function removeField(key) {
  block = block.replace(new RegExp(`^    "${key}": .*,?${eol}`, 'm'), '');
}

const KST = 9 * 3_600_000;
const kstDate = (ms) => new Date(ms + KST).toISOString().slice(0, 10);
const now = Date.now();
let summary;

if (cancel) {
  if (!game.open) fail(`"${id}" 는 공개 예약이 없습니다`);
  removeField('open');
  summary = `공개 예약 취소: ${id} (다시 개발자 모드에서만 보임)`;
} else if (at) {
  const m = at.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) fail('--at 은 "YYYY-MM-DD HH:mm"(한국 시각)로 주세요. 예: --at "2026-11-01 10:00"');
  const iso = `${m[1]}T${m[2].padStart(2, '0')}:${m[3]}:00+09:00`;
  if (Number.isNaN(Date.parse(iso))) fail(`날짜를 읽지 못했습니다: ${at}`);
  if (Date.parse(iso) <= now) fail(`이미 지난 시각입니다: ${at}. 지금 공개하려면 --at 없이 실행하세요`);
  setField('open', iso);
  setField('added', m[1]);
  summary = `공개 예약: ${id} → ${m[1]} ${m[2].padStart(2, '0')}:${m[3]} (한국 시각). 그 전까지 허브에는 COMING SOON 카드`;
} else {
  const openedAt = game.open && Date.parse(game.open) <= now ? Date.parse(game.open) : undefined;
  if (game.open && !openedAt) console.log(`! 공개 예약(${game.open})이 있지만 지금 바로 공개합니다`);
  setField('status', 'live');
  setField('added', kstDate(openedAt ?? now));
  removeField('open');
  summary = `정식 공개: ${id} (added ${kstDate(openedAt ?? now)}, 그날부터 7일 NEW)`;
}

text = text.slice(0, start) + block + text.slice(end);
JSON.parse(text); // 고친 뒤에도 올바른 JSON 인지
writeFileSync(GAMES_FILE, text);

// 허브 버전 patch 올리기(허브 첫 화면 목록이 바뀌므로)
const pkgText = readFileSync(PKG_FILE, 'utf8');
const version = JSON.parse(pkgText).version;
const [major, minor, patch] = version.split('.').map(Number);
const next = `${major}.${minor}.${patch + 1}`;
writeFileSync(PKG_FILE, pkgText.replace(`"version": "${version}"`, `"version": "${next}"`));

console.log(`✓ ${summary}`);
console.log(`✓ 허브 버전 ${version} → ${next}`);

// 게임 버전: 정식 공개(지금·예약)하면 1.0.0 부터. 미리보기 동안은 0.x.x, 이미 1 이상이면 그대로(기준서 7.4)
if (!cancel) {
  const gamePkgFile = join(ROOT, 'games', id, 'package.json');
  const gameText = readFileSync(gamePkgFile, 'utf8');
  const gameVersion = JSON.parse(gameText).version;
  if (Number(gameVersion.split('.')[0]) < 1) {
    writeFileSync(gamePkgFile, gameText.replace(`"version": "${gameVersion}"`, '"version": "1.0.0"'));
    console.log(`✓ 게임 버전 ${gameVersion} → 1.0.0 (정식 공개)`);
  }
}

if (!skipCheck) {
  for (const cmd of ['pnpm test', 'pnpm build']) {
    console.log(`\n$ ${cmd}`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  }
}

console.log(`
다음 할 일(기준서 7.4):
  1. pnpm preview 로 첫 화면 확인${at ? '(COMING SOON 카드·날짜·D-day)' : '(NEW 카드, 랭킹 창 탭)'}
  2. ${cancel ? '—' : '기준서 9장 "문서 키우기"(8장 현황표·3.1 등록부·공통화 대기 목록), README 기록'}
  3. ${cancel || at ? '—' : '테스트하며 올린 랭킹 점수를 지울지 결정 → Firebase 콘솔 games/' + id + '/rankings (사람이 함)'}
  4. 커밋·푸시 → 자동 배포`);
