// 허브 연결 메타(@joyfield/shared/meta): 허브 카드의 내 최고 기록·내 기록 지우기·전체 랭킹 읽기. 저장 키는 src/storage.ts 와 같게
import { boardDoc, patchJson, readJson, type HubMeta } from '@joyfield/shared/meta';

const KEY = 'timetoflip:v1';
const meta: HubMeta = {
  // timetoflip:v1 = { best: 클래식 최고 점수, bestStage: 그때 도달한 판, ... }
  best() {
    const save = readJson(KEY) as { best?: number; bestStage?: number } | null;
    return save?.best ? { score: save.best, stage: save.bestStage || 1 } : null;
  },
  clear: () => patchJson(KEY, { best: 0, bestStage: 0, daily: null, dex: [], items: [], pairs: 0 }),
  // 순위표 문서 classic · daily-YYYY-MM-DD
  ranking: boardDoc('timetoflip'),
};
export default meta;
