// 화면 크기 점검(pnpm check:screens hammer)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
export const base = 'games/hammer/';

// 도감을 일부 채운 기록: 도감 칸이 눌리는 상태(설명 창)까지 본다
const SAVE = `localStorage.setItem('project-hammer:v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('project-hammer:v1') || '{}'), dex: ['basic', 'helmet', 'golden', 'bomb', 'king', 'clock'], best: 1234 }))`;

const play = async (p) => {
  await p.click('[data-mode="classic"]');
  await p.wait(4500); // 3·2·1 카운트다운 뒤
};

export const screens = [
  { name: 'start', setup: SAVE },
  { name: 'ranking', setup: SAVE, go: (p) => p.click('[data-ranking]') },
  { name: 'settings', setup: SAVE, go: (p) => p.click('.settings-btn') },
  { name: 'dex', setup: SAVE, go: (p) => p.click('button.dex-item') },
  { name: 'play', setup: SAVE, go: play },
  { name: 'pause', setup: SAVE, go: async (p) => (await play(p), p.click('.pause-btn')) },
  // 한 판(30초)을 그대로 두면 결과 화면
  {
    name: 'result',
    setup: SAVE,
    reach: 'once',
    async go(p) {
      await p.click('[data-mode="classic"]');
      await p.waitFor(`!!document.querySelector('.screen.result')`, 60000);
      await p.wait(2500);
    },
  },
];
