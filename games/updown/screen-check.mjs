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
    await p.wait(1000); // 맞히면 0.38초 뒤 결과 화면으로 간다(하나 남으면 자동으로 맞히는 1.05초 포함해도 넉넉히)
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
  // 온도계 창(쓸 수 있는 때): 설명·규칙 목록·[취소][사용하기]가 가장 긴 상태
  {
    name: 'thermo',
    async go(p) {
      await p.click('.difficulty');
      await p.wait(600);
      await guessMiddle(p);
      await p.wait(300);
      await p.click('#thermo-open');
    },
  },
  // 온도계를 쓴 뒤의 플레이 화면(온도 표시)
  {
    name: 'play-thermo',
    async go(p) {
      await p.click('.difficulty');
      await p.wait(600);
      await guessMiddle(p);
      await p.wait(300);
      await p.click('#thermo-open');
      await p.wait(300);
      await p.click('.thermo [data-use]');
      await p.wait(400);
    },
  },
  { name: 'result', reach: 'once', go: finish },
  // TOP 10 에 든 결과: 등록 카드(공통 @joyfield/shared/ui)가 버튼 위에 들어온 가장 긴 결과 화면. 순위표가 비었거나 덜 찬 개발 DB·오프라인이면 늘 나온다
  {
    name: 'result-rank',
    reach: 'once',
    async go(p) {
      await finish(p);
      await p.wait(1200);
      await p.eval(`(() => { document.getElementById('result-best').hidden = false; return true; })()`);
    },
  },
  // 일시정지 창(휴대폰 뒤로 가기·앱을 내렸을 때)
  {
    name: 'pause',
    async go(p) {
      await p.click('.difficulty');
      await p.wait(600);
      await p.eval(`(() => { history.back(); return true; })()`);
      await p.wait(400);
    },
  },
];
