import type { GameMeta } from './games';
import { formatNumber, getLang, t } from './i18n';

/**
 * 허브 카드에 보여 줄 "내 최고 기록". 각 게임이 자기 키에 저장한 값을 읽기만 한다(쓰지 않음).
 * 새 게임을 추가하면 여기에 읽는 방법을 하나 더한다. 없으면 카드에 기록 줄이 안 보일 뿐이다
 */
const READERS: Record<string, (game: GameMeta) => string | null> = {
  // updown.best = { easy: 4, normal: 5, ... } (난이도별 최소 시도 횟수). 가장 어려운 난이도 기록을 보여 준다
  updown(game) {
    const best = readJson('updown.best') as Record<string, number> | null;
    if (!best || !game.ranking) return null;
    const board = [...game.ranking.boards].reverse().find((b) => typeof best[b.id] === 'number' && best[b.id] > 0);
    return board ? t('best.updown', { board: board.name[getLang()], tries: best[board.id] }) : null;
  },
  // project-hammer:v1 = { best: 클래식 최고 점수, ... }
  hammer() {
    const save = readJson('project-hammer:v1') as { best?: number } | null;
    return save?.best ? t('best.hammer', { score: formatNumber(save.best) }) : null;
  },
};

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
