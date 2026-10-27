// 화면 크기 점검(pnpm check:screens glasshouse)에서 찍을 화면들. 쓰는 법은 scripts/screen-check/run.mjs
import { parse } from './src/game/rules.ts';
import { solve } from './src/game/solver.ts';

export const base = 'games/glasshouse/';

// 미리보기 동안은 개발자 모드여야 열리고, 출시 화면 보기로 확인 도구를 숨긴다. 판 기록은 정원 1~6을 깬 상태(도감·정원 고르기에 열린·잠긴 칸이 섞이고, 오늘의 정원이 열림)
const SAVE = `localStorage.setItem('joypack.preview', 'on'); localStorage.setItem('joypack.releaseView', 'on'); localStorage.setItem('glasshouse:v1', JSON.stringify({ levels: Array.from({ length: 24 }, (_, i) => (i < 6 ? { moves: 20, score: 900, petals: 2 } : null)) }))`;

// 정원 7(정원 1~6 다음 판, 이어 가꾸기로 열림). src/game/levels.ts 와 같은 판
const LEVEL = ['########', '#.#.#..#', '#.o@o..#', '>......#', '#...#..#', '#....#.#', '######^#'];
const KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
const { board, start } = parse(LEVEL);
const PATH = solve(board, start).path;

const play = async (p) => {
  await p.click('[data-play]');
  await p.wait(500);
};

export const screens = [
  { name: 'start', setup: SAVE },
  { name: 'pick', setup: SAVE, go: (p) => p.click('[data-pick]') },
  // 도감: 첫 꽃 카드를 눌러 큰 카드를 뒤집은 모습
  { name: 'dex', setup: SAVE, go: async (p) => (await p.click('[data-dex]'), await p.wait(300), p.click('.dex-item:not(.locked)'), p.wait(700)) },
  { name: 'ranking', setup: SAVE, go: (p) => p.click('[data-ranking]') },
  { name: 'settings', setup: SAVE, go: (p) => p.click('.settings-btn') },
  { name: 'play', setup: SAVE, go: play },
  { name: 'pause', setup: SAVE, go: async (p) => (await play(p), p.click('.pause-btn')) },
  { name: 'daily', setup: SAVE, go: async (p) => (await p.click('[data-daily]'), p.wait(500)) },
  // 가장 적은 이동으로 깨면 결과 화면. 순위표가 비어 있으면 등록 칸이 함께 나온다(가장 긴 결과)
  {
    name: 'result',
    setup: SAVE,
    reach: 'once',
    async go(p) {
      await play(p);
      for (const d of PATH) {
        await p.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '${KEYS[d]}' }))`);
        await p.wait(40);
      }
      await p.waitFor(`!!document.querySelector('.screen.result')`, 15000);
      await p.wait(1500);
    },
  },
];
