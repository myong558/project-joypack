// 화면 크기 점검(pnpm check:screens updown)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
export const base = 'games/updown/';

// 다이얼을 맨 왼쪽(가능한 가장 작은 수)에 두고 확인을 누른다
const guessLowest = (p) =>
  p.eval(`(() => { document.getElementById('dial').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); document.getElementById('guess-form').requestSubmit(); return true; })()`);

async function finish(p) {
  await p.click('.difficulty');
  await p.wait(600);
  for (let i = 0; i < 40 && !(await p.eval(`!document.getElementById('screen-result').hidden`)); i++) {
    await guessLowest(p);
    await p.wait(600);
  }
  await p.wait(1500);
}

export const screens = [
  { name: 'start' },
  { name: 'ranking', go: (p) => p.click('#ranking-open') },
  { name: 'settings', go: (p) => p.click('#settings-open') },
  {
    name: 'play',
    async go(p) {
      await p.click('.difficulty');
      await p.wait(600);
      await guessLowest(p);
      await guessLowest(p);
    },
  },
  { name: 'result', reach: 'once', go: finish },
  // TOP 10 에 든 결과: 랭킹 등록 칸이 펼쳐진 가장 긴 결과 화면(온라인 없이 칸만 펼쳐 본다)
  {
    name: 'result-rank',
    reach: 'once',
    async go(p) {
      await finish(p);
      await p.eval(`(() => { document.getElementById('result-rank').hidden = false; document.getElementById('result-rank-prompt').textContent = '쉬움 5번 · 12초 만에 성공! TOP 10 에 들었어요. 이니셜을 등록하세요'; document.getElementById('result-best').hidden = false; return true; })()`);
    },
  },
];
