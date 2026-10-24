// 화면 크기 점검(pnpm check:screens timetoflip)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
export const base = 'games/timetoflip/';

// 도감을 일부 채운 기록(도감 창에 그림·잠긴 칸이 섞여 보이게)
const SAVE = `localStorage.setItem('timetoflip:v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('timetoflip:v1') || '{}'), dex: ['apple', 'cherry', 'grape', 'lemon', 'cat', 'dog', 'fish', 'sun', 'cupcake', 'robot'], best: 12340, bestStage: 6 }))`;

// 판 위에서 짝 하나를 찾아 누른다(그림이 같은 두 장. 닮은 카드는 class 로 구분)
const MATCH_ONE = `(() => {
  const groups = {};
  for (const b of document.querySelectorAll('.card:not(.gone)')) {
    const k = b.classList.contains('twin') + b.querySelector('.front').innerHTML;
    (groups[k] ??= []).push(b);
  }
  const pair = Object.values(groups).find((v) => v.length === 2);
  pair?.forEach((b) => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
})()`;

const play = async (p) => {
  await p.click('[data-mode="classic"]');
  await p.wait(2400); // 미리 보기가 끝나 카드가 덮일 때까지
};

export const screens = [
  { name: 'start', setup: SAVE },
  { name: 'ranking', setup: SAVE, go: (p) => p.click('[data-ranking]') },
  { name: 'settings', setup: SAVE, go: (p) => p.click('.settings-btn') },
  { name: 'dex', setup: SAVE, go: (p) => p.click('[data-dex]') },
  { name: 'play', setup: SAVE, go: async (p) => (await play(p), p.eval(MATCH_ONE), p.wait(300)) },
  { name: 'pause', setup: SAVE, go: async (p) => (await play(p), p.click('.pause-btn')) },
  // 짝 하나를 맞혀 점수를 낸 뒤 시간(40초 + 보너스)이 다 가면 결과 화면. 순위표가 비어 있으면 등록 칸이 함께 나온다(가장 긴 결과)
  {
    name: 'result',
    setup: SAVE,
    reach: 'once',
    async go(p) {
      await play(p);
      await p.eval(MATCH_ONE);
      await p.waitFor(`!!document.querySelector('.screen.result')`, 90000);
      await p.wait(2500);
    },
  },
];
