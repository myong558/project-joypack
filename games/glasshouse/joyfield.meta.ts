// 허브 연결 메타(@joyfield/shared/meta): 허브 카드의 내 최고 기록·내 기록 지우기·전체 랭킹 읽기. 저장 키는 src/storage.ts 와 같게
import { boardDoc, dateKey, devOf, int, patchJson, readJson, type HubMeta, type HubRequest } from '@joyfield/shared/meta';

const KEY = 'glasshouse:v1';
const meta: HubMeta = {
  // glasshouse:v1 = { levels: [판마다 { moves, score, petals } | null], ... }. 정원 점수(판 점수 합)와 핀 꽃 수
  best() {
    const save = readJson(KEY) as { levels?: ({ score?: number } | null)[] } | null;
    const done = (save?.levels ?? []).filter((l) => l && typeof l.score === 'number');
    return done.length ? { score: done.reduce((n, l) => n + (l!.score ?? 0), 0), n: done.length } : null;
  },
  // 판 기록은 비워 두면 게임이 불러올 때 24칸을 null 로 채운다
  clear: () => patchJson(KEY, { levels: [], seen: [], daily: null }),
  // 정원 점수는 garden 문서(점수 높은 순), 오늘의 정원은 daily-YYYY-MM-DD 문서(이동 수 적은 순 → 시간 짧은 순, 횟수·시간으로 보임)
  ranking: (() => {
    const garden = boardDoc('glasshouse', () => 'garden');
    const daily = boardDoc(
      'glasshouse',
      () => `daily-${dateKey()}`,
      (f) => ({ name: f.name?.stringValue ?? '', tries: int(f.moves), time: int(f.time), ...devOf(f.dev) }),
      (a, b) => ('tries' in a && 'tries' in b ? a.tries - b.tries || a.time - b.time : 0),
    );
    return {
      key: (board: string) => (board === 'daily' ? daily.key(board) : garden.key(board)),
      fetch: (board: string, limit: number, request: HubRequest) => (board === 'daily' ? daily : garden).fetch(board, limit, request),
    };
  })(),
};
export default meta;
