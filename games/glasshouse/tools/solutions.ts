/**
 * 판마다 가장 적은 이동 풀이를 src/game/solutions.ts 에 적는 도구(배포에 안 들어감).
 *   pnpm --filter glasshouse solutions
 * 판(src/game/levels.ts)을 바꾸면 다시 돌린다. tests/levels.test.ts 가 풀이가 그 판을 깨고 기준 이동 수와 같은지 확인한다
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '../src/game/rules.ts';
import { explore, solve } from '../src/game/solver.ts';

// levels.ts 는 꽃 목록·문구를 함께 불러 node 로 바로 못 읽으므로 판 줄(L(꽃, 기준, [줄…]))만 글로 뽑는다
const LEVELS = [...readFileSync(new URL('../src/game/levels.ts', import.meta.url), 'utf8').matchAll(/^\s*L\(\d+, \d+, (\[.*?\])\)/gm)].map(
  (m) => JSON.parse(m[1].replace(/'/g, '"')) as string[],
);
const out = LEVELS.map((rows, i) => {
  const { board, start } = parse(rows);
  const sol = solve(board, start, explore(board, start, 3_000_000)!);
  if (!sol) throw new Error(`${i + 1}번 판을 못 풀었음`);
  console.log(`${i + 1}: 이동 ${sol.moves} 밀기 ${sol.pushes}`);
  return `  '${sol.path.map((d) => 'URDL'[d]).join('')}',`;
});
writeFileSync(
  new URL('../src/game/solutions.ts', import.meta.url),
  `/**
 * 판마다 가장 적은 이동 풀이(U 위 · R 오른쪽 · D 아래 · L 왼쪽). 출시 전 확인(TEST)의 "풀이 보기"에서만 쓴다.
 * tools/solutions.ts 가 만든 파일이라 손으로 고치지 않는다(판을 바꾸면 pnpm --filter glasshouse solutions)
 */
export const SOLUTIONS: readonly string[] = [
${out.join('\n')}
];
`,
);
