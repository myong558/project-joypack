import type { GameMeta } from './games';
import { formatNumber, getLang, t, type MessageKey } from './i18n';
import { META } from './meta';

/**
 * 허브 카드·설정 "게임 데이터"의 "내 최고 기록". 각 게임의 허브 연결 메타(games/<id>/joyfield.meta.ts)가 자기 저장 값을 읽어
 * 문구 값을 돌려주고, 허브는 'best.<id>' 문구로 보인다(board 는 순위표 이름으로, score 는 천 단위 쉼표). 메타가 없으면 기록 줄이 안 보인다
 */
export function bestRecord(game: GameMeta): string | null {
  let params: Record<string, string | number> | null = null;
  try {
    params = META[game.id]?.best?.() ?? null;
  } catch {
    return null;
  }
  if (!params) return null;
  const out: Record<string, string | number> = { ...params };
  if (typeof out.score === 'number') out.score = formatNumber(out.score);
  if (out.board !== undefined) {
    const board = game.ranking?.boards.find((b) => b.id === String(out.board));
    out.board = board ? board.name[getLang()] : String(out.board);
  }
  return t(`best.${game.id}` as MessageKey, out);
}

/**
 * 허브 설정의 "내 기록 지우기". 각 게임 안의 같은 버튼과 같은 범위만 지운다(이 기기의 최고 기록·도감).
 * 온라인 랭킹, 설정, 등록 대기 기록은 남긴다
 */
export function canClearRecords(game: GameMeta): boolean {
  return !!META[game.id]?.clear && bestRecord(game) !== null;
}

export function clearRecords(game: GameMeta): void {
  try {
    META[game.id]?.clear?.();
  } catch {
    // 저장소를 못 쓰는 환경
  }
}
