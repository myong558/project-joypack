import type { GameMeta } from './games';
import { formatNumber, getLang, t } from './i18n';

/**
 * 허브 카드에 보여 줄 "내 최고 기록". 각 게임이 자기 키에 저장한 값을 읽기만 한다(쓰지 않음).
 * 새 게임을 추가하면 여기에 읽는 방법을 하나 더한다. 없으면 카드에 기록 줄이 안 보일 뿐이다
 */
const READERS: Record<string, (game: GameMeta) => string | null> = {
  // updown.scores = { 50: 1120, 100: 980, ... } (범위별 최고 점수). 가장 넓은 범위 기록을 보여 준다
  updown(game) {
    const best = readJson('updown.scores') as Record<string, number> | null;
    if (!best || !game.ranking) return null;
    const board = [...game.ranking.boards].reverse().find((b) => typeof best[b.id] === 'number' && best[b.id] > 0);
    return board ? t('best.updown', { board: board.name[getLang()], score: formatNumber(best[board.id]) }) : null;
  },
  // project-hammer:v1 = { best: 클래식 최고 점수, ... }
  hammer() {
    const save = readJson('project-hammer:v1') as { best?: number } | null;
    return save?.best ? t('best.hammer', { score: formatNumber(save.best) }) : null;
  },
  // timetoflip:v1 = { best: 클래식 최고 점수, bestStage: 그때 도달한 판, ... }
  timetoflip() {
    const save = readJson('timetoflip:v1') as { best?: number; bestStage?: number } | null;
    return save?.best ? t('best.timetoflip', { score: formatNumber(save.best), stage: save.bestStage || 1 }) : null;
  },
  // glasshouse:v1 = { levels: [판마다 { moves, score, petals } | null], ... }. 정원 점수(판 점수 합)와 핀 꽃 수
  glasshouse() {
    const save = readJson('glasshouse:v1') as { levels?: ({ score?: number } | null)[] } | null;
    const done = (save?.levels ?? []).filter((l) => l && typeof l.score === 'number');
    if (!done.length) return null;
    return t('best.glasshouse', { score: formatNumber(done.reduce((n, l) => n + (l!.score ?? 0), 0)), n: done.length });
  },
};

/**
 * 허브 설정의 "내 기록 지우기". 각 게임 안의 같은 버튼과 같은 범위만 지운다(이 기기의 최고 기록·도감).
 * 온라인 랭킹, 설정, 두더지잡기의 등록 대기 기록은 남긴다
 */
const CLEARERS: Record<string, () => void> = {
  updown() {
    localStorage.removeItem('updown.scores');
  },
  hammer() {
    const save = readJson('project-hammer:v1') as Record<string, unknown> | null;
    if (!save) return;
    // 잡은 수(kills)는 비워 두면 게임이 불러올 때 0으로 채운다
    Object.assign(save, { best: 0, daily: null, dex: [], kills: {} });
    localStorage.setItem('project-hammer:v1', JSON.stringify(save));
  },
  timetoflip() {
    const save = readJson('timetoflip:v1') as Record<string, unknown> | null;
    if (!save) return;
    Object.assign(save, { best: 0, bestStage: 0, daily: null, dex: [], items: [], pairs: 0 });
    localStorage.setItem('timetoflip:v1', JSON.stringify(save));
  },
  glasshouse() {
    const save = readJson('glasshouse:v1') as Record<string, unknown> | null;
    if (!save) return;
    // 판 기록은 비워 두면 게임이 불러올 때 24칸을 null 로 채운다
    Object.assign(save, { levels: [], seen: [], daily: null });
    localStorage.setItem('glasshouse:v1', JSON.stringify(save));
  },
};

export function canClearRecords(game: GameMeta): boolean {
  return game.id in CLEARERS && bestRecord(game) !== null;
}

export function clearRecords(game: GameMeta): void {
  try {
    CLEARERS[game.id]?.();
  } catch {
    // 저장소를 못 쓰는 환경
  }
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

export function bestRecord(game: GameMeta): string | null {
  return READERS[game.id]?.(game) ?? null;
}
