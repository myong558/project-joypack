// 화면 크기 점검(pnpm check:screens updown)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
export const base = 'games/updown/';

// 다이얼을 남은 범위 가운데에 두고 확인을 누른다(반씩 좁히면 1~50 은 6번 안에 맞힌다)
const guessMiddle = (p) =>
  p.eval(`(() => {
    const dial = document.getElementById('dial');
    const key = (k) => dial.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const low = Number(dial.getAttribute('aria-valuemin'));
    const high = Number(dial.getAttribute('aria-valuemax'));
    key('Home');
    for (let i = 0; i < Math.floor((high - low) / 2); i++) key('ArrowRight');
    document.getElementById('guess-form').requestSubmit();
    return true;
  })()`);

async function finish(p) {
  await p.click('.difficulty');
  await p.wait(600);
  for (let i = 0; i < 12 && !(await p.eval(`!document.getElementById('screen-result').hidden`)); i++) {
    await guessMiddle(p);
    await p.wait(1000); // 맞히면 0.8초 동안 막대 연출을 보여 준 뒤 결과 화면으로 간다
  }
  await p.wait(1500);
}

export const screens = [
  { name: 'start' },
  { name: 'ranking', go: (p) => p.click('#ranking-open') },
  { name: 'settings', go: (p) => p.click('#settings-open') },
  { name: 'custom', go: (p) => p.click('.custom-start') },
  {
    name: 'play',
    async go(p) {
      await p.click('.difficulty');
      await p.wait(600);
      await guessMiddle(p);
      await p.wait(300);
      await guessMiddle(p);
    },
  },
  { name: 'result', reach: 'once', go: finish },
  // TOP 10 에 든 결과: 랭킹 등록 칸이 펼쳐진 가장 긴 결과 화면(온라인 없이 칸만 펼쳐 본다)
  {
    name: 'result-rank',
    reach: 'once',
    async go(p) {
      await finish(p);
      await p.eval(`(() => { document.getElementById('result-rank').hidden = false; document.getElementById('result-rank-prompt').textContent = '1 ~ 200 1,240점(5번 · 12.3초)! TOP 10 에 들었어요. 이니셜을 등록하세요'; document.getElementById('result-best').hidden = false; return true; })()`);
    },
  },
];
