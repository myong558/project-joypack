// 화면 크기 점검(pnpm check:screens hub)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
export const base = '';

export const screens = [
  { name: 'main' },
  // 처음 온 사람(공유 링크 등)에게 보이는 설치 안내 카드
  {
    name: 'install',
    async go(p) {
      await p.eval("localStorage.removeItem('joypack.installDismissed'); true");
      await p.reload();
      await p.wait(2500);
    },
  },
  // 카드 아래 기록이 가장 길 때(온실정원 24판 모두 1,000점). 미리보기 게임은 카드가 없어 모든 카드 칩에 그 글을 넣어 본다
  {
    name: 'main-long-record',
    async go(p) {
      await p.eval(
        "document.querySelectorAll('.card-foot .chip').forEach((c) => { c.className = 'chip best'; c.textContent = '총점 24,000점 · 꽃 24/24'; }); true",
      );
      await p.wait(300);
    },
  },
  { name: 'ranking', go: (p) => p.click('[data-open="ranking"]') },
  { name: 'settings', go: (p) => p.click('[data-open="settings"]') },
  // 설정의 게임 데이터(내 기록·오프라인 저장)를 펼친 모습. 게임이 많을 때를 보려고 줄을 8개로 늘려 찍는다
  {
    name: 'settings-data',
    async go(p) {
      await p.click('[data-open="settings"]');
      await p.eval(
        "const d = document.querySelector('.data-group'); const ul = d.querySelector('.storage'); while (ul.children.length < 8) ul.append(ul.children[ul.children.length % 2].cloneNode(true)); d.open = true; d.scrollIntoView({ block: 'start' }); true",
      );
      await p.wait(300);
    },
  },
  // 기록 지우기 확인 창(기록이 없으면 버튼이 꺼져 있어 점검 때만 켜고 누른다. 확인은 누르지 않음)
  {
    name: 'settings-confirm',
    async go(p) {
      await p.click('[data-open="settings"]');
      await p.eval("const b = document.querySelector('[data-records]'); b.disabled = false; b.click(); true");
      await p.wait(400);
    },
  },
];
