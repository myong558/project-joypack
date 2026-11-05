// 웹 글꼴 실제 적용 점검(기준서 1.10·7장): 브라우저가 실제로 그린 글꼴(CDP CSS.getPlatformFontsForNode)을 보고,
// 시스템 글꼴(맑은 고딕 등)로 빠진 글자가 있으면 그 글을 알리고 실패한다. 서브셋에 글자가 빠졌거나, 글꼴에 없는 기호(· © 등)를
// 채울 글꼴이 없을 때 잡힌다(빌드의 서브셋 검사는 "문구 파일에 있는 글자"만 보므로 실제 그려진 글꼴은 여기서 본다).
//
//   pnpm check:fonts <hub | 게임 id>   (먼저 pnpm build)
//
// 보는 곳: 시작 화면 전체, 랭킹 창, 설정 창, 오프라인일 때 위 메뉴 안내(Joyfield.offlineMark),
// 게임은 결과 화면 공통 조각(오프라인 등록 카드 글·"등록하지 않고 나갈까요?" 확인 창, 게임 문구 그대로)도 그 게임 글꼴로 그려 본다.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const target = process.argv[2];
if (!target) {
  console.error('사용: pnpm check:fonts <hub | 게임 id>');
  process.exit(1);
}
if (!existsSync(join(ROOT, 'dist'))) {
  console.error('dist 가 없어요. 먼저 pnpm build');
  process.exit(1);
}
const isHub = target === 'hub';
// 게임 문구(i18n.ts)에서 공통 조각이 쓰는 글을 꺼낸다(첫 번째 = 한국어)
const say = (key) => {
  if (isHub) return '';
  const src = readFileSync(join(ROOT, 'games', target, 'src/i18n.ts'), 'utf8');
  const m = src.match(new RegExp(`'${key.replace('.', '\\.')}':\\s*(['"])(.*?)\\1`));
  return m ? m[2] : '';
};

const PORT = 4600 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [join(ROOT, 'scripts/preview.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const page = await launch();
let bad = 0;
const offline = (on) => page.send('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

/** selector 안 모든 글자 마디의 실제 글꼴. 시스템 글꼴이 섞인 마디만 알린다 */
async function check(selector, label) {
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await page.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  const seen = new Set();
  for (const nodeId of nodeIds) {
    const { node } = await page.send('DOM.describeNode', { nodeId, depth: -1 });
    const texts = [];
    const walk = (n) => {
      if (n.nodeType === 3 && n.nodeValue.trim()) texts.push(n);
      else if (!/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(n.nodeName)) (n.children || []).forEach(walk);
    };
    walk(node);
    for (const tn of texts) {
      if (seen.has(tn.backendNodeId)) continue;
      seen.add(tn.backendNodeId);
      const {
        nodeIds: [id],
      } = await page.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [tn.backendNodeId] });
      const parent = (await page.send('DOM.describeNode', { nodeId: id })).node.parentId;
      let fonts;
      try {
        ({ fonts } = await page.send('CSS.getPlatformFontsForNode', { nodeId: parent ?? id }));
      } catch {
        continue;
      }
      const sys = fonts.filter((f) => !f.isCustomFont);
      if (!sys.length) continue;
      bad++;
      console.log(`  ✗ ${label} "${tn.nodeValue.trim().slice(0, 40)}" → ${fonts.map((f) => `${f.familyName}${f.isCustomFont ? '' : '(시스템)'}×${f.glyphCount}`).join(', ')}`);
    }
  }
}

try {
  await page.send('DOM.enable');
  await page.send('CSS.enable');
  await page.send('Network.enable');
  await page.size(390, 844);
  await page.goto(`http://localhost:${PORT}/joyfield/${isHub ? '' : `games/${target}/`}`);
  await page.wait(2500);
  await check('body', '시작 화면');
  // 랭킹·설정 창(앱마다 버튼 이름이 달라 차례로 찾는다)
  const open = async (sels, label) => {
    for (const sel of sels) {
      if (await page.click(sel)) {
        await page.wait(900);
        await check('body', label);
        await page.eval("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
        await page.wait(400);
        return;
      }
    }
    console.log(`  (${label}을 열지 못함)`);
  };
  await open(['[data-ranking]', '[data-open=ranking]', '#ranking-open'], '랭킹 창');
  await open(['.settings-btn', '[data-open=settings]', '#settings-open'], '설정 창');
  await offline(true);
  await page.wait(500);
  await check('.jp-top-offline', '위 메뉴 오프라인 안내');
  if (!isHub) {
    // 결과 화면 공통 조각: 실제와 같은 짜임(rankEntryForm 오프라인 칸·leaveRankEntry 창)에 그 게임 문구를 넣어 그 게임 글꼴로 그린다
    const card = `<div class="rank-entry done offline" style="position:fixed;left:0;right:0;bottom:0;z-index:9999"><div class="rank-entry-done"><p class="rank-entry-title"><span>${say('ranking.offlineEntry')}</span></p></div></div>`;
    const dialog = `<div class="modal-backdrop instant"><div class="modal rank-leave-modal" role="dialog"><div class="rank-leave"><h2>${say('ranking.leaveTitle')}</h2><p class="note">${say('ranking.leaveText')}</p><p class="note">${say('ranking.leaveFailed')}</p><div class="rank-leave-actions"><button type="button" class="btn primary">${say('ranking.leaveStay')}</button><button type="button" class="btn">${say('ranking.leaveGo')}</button></div></div></div></div>`;
    await page.eval(`(() => { const host = document.querySelector('.screen, main, #app') || document.body; host.insertAdjacentHTML('beforeend', ${JSON.stringify(card)}); document.body.insertAdjacentHTML('beforeend', ${JSON.stringify(dialog)}); return true; })()`);
    await page.wait(500);
    await check('.rank-entry.offline', '오프라인 등록 카드');
    await check('.rank-leave', '나갈 때 확인 창');
  }
  await offline(false);
  console.log(bad ? `\n${target}: 시스템 글꼴로 빠진 글 ${bad}곳 → 서브셋 글자(package.json "font")·기호 글꼴(=+jua)·font-family 대체 글꼴을 확인` : `${target}: 모두 웹 글꼴`);
} finally {
  page.close();
  server.kill();
}
process.exit(bad ? 1 : 0);
