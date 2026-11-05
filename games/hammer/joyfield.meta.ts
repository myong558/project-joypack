// 허브 연결 메타(@joyfield/shared/meta): 허브 카드의 내 최고 기록·내 기록 지우기·전체 랭킹 읽기. 저장 키는 src/storage.ts 와 같게
import { boardDoc, patchJson, readJson, type HubMeta } from '@joyfield/shared/meta';

const KEY = 'project-hammer:v1';
const meta: HubMeta = {
  // project-hammer:v1 = { best: 클래식 최고 점수, ... }
  best() {
    const save = readJson(KEY) as { best?: number } | null;
    return save?.best ? { score: save.best } : null;
  },
  // 잡은 수(kills)는 비워 두면 게임이 불러올 때 0으로 채운다(storage.ts emptyRecords 와 같은 범위)
  clear: () => patchJson(KEY, { best: 0, daily: null, dex: [], kills: {} }),
  // 순위표 문서 classic · daily-YYYY-MM-DD
  ranking: boardDoc('hammer'),
};
export default meta;
