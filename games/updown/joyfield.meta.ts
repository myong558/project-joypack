// 허브 연결 메타(@joyfield/shared/meta): 허브 카드의 내 최고 기록·내 기록 지우기·전체 랭킹 읽기. 저장 키는 src/storage.ts 와 같게
import { boardDoc, devOf, int, readJson, type HubMeta } from '@joyfield/shared/meta';

const meta: HubMeta = {
  // updown.scores = { 50: 1120, 100: 980, ... } (범위별 최고 점수). 가장 넓은 범위 기록을 보여 준다
  best() {
    const best = readJson('updown.scores') as Record<string, number> | null;
    const board = ['200', '100', '50'].find((b) => typeof best?.[b] === 'number' && best[b] > 0);
    return board ? { board, score: best![board] } : null;
  },
  clear: () => localStorage.removeItem('updown.scores'),
  // 순위표 문서 games/updown/rankings/50 · 100 · 200(업다운 v1.21.0~). 온도계를 쓴 기록은 🌡️
  ranking: boardDoc(
    'updown',
    (board) => board,
    (f) => ({ name: f.name?.stringValue ?? '', score: int(f.score), ...(f.thermo?.booleanValue === true ? { thermo: true } : {}), ...devOf(f.dev) }),
  ),
};
export default meta;
