/**
 * 카드 그림 목록(도감). 묶음 6개 × 8장 = 48장. 그림은 ui/art.ts(도형·팝아트는 SVG, 명화는 src/art/*.webp),
 * 이름·작가·설명은 cards.ts.
 * 묶음은 판이 올라갈수록 하나씩 열리고 뒤로 갈수록 구분이 어렵다:
 * 도형(색·모양이 뚜렷) → 팝아트 → 팝아트로 본 명화 → 서양화 인물·정물(대상이 뚜렷) → 서양화 풍경(초록 들판·하늘이 서로 닮음) → 동양화 수묵(색이 없어 가장 어려움)
 */
export const FACE_SETS = [
  { id: 'shape', faces: ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'ring', 'plus', 'moon'] },
  { id: 'pop', faces: ['lips', 'bolt', 'eye', 'pow', 'heart', 'shades', 'cone', 'crown'] },
  { id: 'popart', faces: ['girl', 'strawhat', 'rembrandt', 'modigliani', 'hals', 'wave', 'stuart', 'sunflowers'] },
  { id: 'life', faces: ['basket', 'irises', 'bedroom', 'milkmaid', 'dancers', 'cardplayers', 'tahiti', 'sisters'] },
  { id: 'landscape', faces: ['cypress', 'jatte', 'lilypond', 'harvest', 'haystacks', 'toledo', 'rainyparis', 'littlestreet'] },
  { id: 'ink', faces: ['bamboo', 'plum', 'sehando', 'inwang', 'eagles', 'ssireum', 'seodang', 'mudong'] },
] as const;

/** v1.2.0 에서 덜 알려진 명화 20점을 더 유명한 그림으로 바꿨다. 예전 도감 기록은 같은 자리의 새 카드로 이어 준다 */
export const RENAMED_FACES: Record<string, FaceId> = {
  berceuse: 'girl', madamex: 'modigliani', arlesienne: 'hals', baby: 'stuart',
  apples: 'basket', roses: 'irises', oleanders: 'bedroom', shoes: 'milkmaid', garden: 'sisters',
  olive: 'jatte', orchard: 'lilypond', gulfstream: 'haystacks', matterhorn: 'toledo', boating: 'rainyparis', oxbow: 'littlestreet',
  orchid: 'sehando', lotus: 'inwang', riverbank: 'ssireum', peaks: 'seodang', huangshan: 'mudong',
};

export type SetId = (typeof FACE_SETS)[number]['id'];
export type FaceId = (typeof FACE_SETS)[number]['faces'][number];

/** 효과가 있는 특수 카드. 도감에는 넣지 않는다 */
export type SpecialId = 'clock' | 'peek';

/** 도감 "특수 카드" 칸: 효과가 있는 특수 카드 + 황금 카드(점수 2배). 처음 맞히면 열린다. 모두 2판부터 나온다 */
export type ItemId = SpecialId | 'gold';
export const ITEMS: ItemId[] = ['clock', 'peek', 'gold'];
export const ITEM_FROM = 2;

export const ALL_FACES: FaceId[] = FACE_SETS.flatMap((s) => [...s.faces]);

/** 그 판에서 열려 있는 묶음 수(1판 1개 … 6판부터 6개 모두) */
export function setsOpen(stage: number): number {
  return Math.min(FACE_SETS.length, Math.max(1, stage));
}
