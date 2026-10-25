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
  { name: 'ranking', go: (p) => p.click('[data-open="ranking"]') },
  { name: 'settings', go: (p) => p.click('[data-open="settings"]') },
  // 설정의 게임 데이터(내 기록·오프라인 저장)를 펼친 모습
  {
    name: 'settings-data',
    async go(p) {
      await p.click('[data-open="settings"]');
      await p.eval("const d = document.querySelector('.data-group'); d.open = true; d.scrollIntoView({ block: 'start' }); true");
      await p.wait(300);
    },
  },
];
