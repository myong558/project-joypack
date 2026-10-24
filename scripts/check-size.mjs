// 용량 검사(기준서 1.11). pnpm build 가 게임별 파일 목록·허브 파일 목록을 만든 뒤 돌린다.
// 조이팩은 게임이 계속 늘어나므로 게임 하나·허브(설치 때 미리 받는 것)마다 크기 상한을 둔다.
//   경고: 빌드는 통과하고 큰 파일 순서를 보여 준다(줄일 곳을 바로 찾게)
//   실패: 빌드를 멈춘다
import { statSync } from 'node:fs';
import { join } from 'node:path';

export const LIMITS = {
  game: { warn: 1024, fail: 2048 }, // KB, 처음 열 때 받는 게임 파일 전체
  hub: { warn: 400, fail: 600 }, // KB, 설치 때 미리 받는 허브 파일 전체
};

/**
 * @param {string} dist  dist 폴더
 * @param {{ name: string, kind: 'game' | 'hub', paths: string[] }[]} groups  dist 기준 파일 경로 묶음
 * @returns {{ warnings: string[], errors: string[] }}
 */
export function checkSize(dist, groups) {
  const warnings = [];
  const errors = [];
  for (const { name, kind, paths } of groups) {
    const sizes = paths.map((p) => ({ p, kb: statSync(join(dist, p)).size / 1024 }));
    const total = sizes.reduce((sum, f) => sum + f.kb, 0);
    const { warn, fail } = LIMITS[kind];
    if (total <= warn) continue;
    const top = sizes
      .sort((a, b) => b.kb - a.kb)
      .slice(0, 5)
      .map((f) => `    ${f.kb.toFixed(0).padStart(5)} KB  ${f.p}`)
      .join('\n');
    const line = `${name}: ${total.toFixed(0)} KB (경고 ${warn} KB · 실패 ${fail} KB). 큰 파일:\n${top}`;
    (total > fail ? errors : warnings).push(line);
  }
  return { warnings, errors };
}
