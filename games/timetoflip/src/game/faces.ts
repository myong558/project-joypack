/**
 * 카드 그림 목록(도감). 묶음 6개 × 8장 = 48장. 그림 자체는 ui/art.ts 가 SVG 로 그린다.
 * 묶음은 판이 올라갈수록 하나씩 열린다(1판 과일 → 6판 장난감). 뒤쪽 묶음은 멀리 가야만 만난다
 */
export const FACE_SETS = [
  { id: 'fruit', faces: ['apple', 'cherry', 'grape', 'lemon', 'strawberry', 'watermelon', 'pear', 'orange'] },
  { id: 'animal', faces: ['cat', 'dog', 'bear', 'rabbit', 'frog', 'chick', 'pig', 'panda'] },
  { id: 'sea', faces: ['fish', 'octopus', 'whale', 'crab', 'shell', 'starfish', 'jellyfish', 'turtle'] },
  { id: 'sky', faces: ['sun', 'moon', 'star', 'cloud', 'rainbow', 'bolt', 'snow', 'drop'] },
  { id: 'sweet', faces: ['cupcake', 'donut', 'icecream', 'candy', 'cookie', 'pudding', 'cake', 'lollipop'] },
  { id: 'toy', faces: ['ball', 'kite', 'rocket', 'robot', 'balloon', 'top', 'blocks', 'car'] },
] as const;

export type SetId = (typeof FACE_SETS)[number]['id'];
export type FaceId = (typeof FACE_SETS)[number]['faces'][number];

/** 효과가 있는 특수 카드. 도감에는 넣지 않는다 */
export type SpecialId = 'clock' | 'peek';

export const ALL_FACES: FaceId[] = FACE_SETS.flatMap((s) => [...s.faces]);

/** 그 판에서 열려 있는 묶음 수(1판 1개 … 6판부터 6개 모두) */
export function setsOpen(stage: number): number {
  return Math.min(FACE_SETS.length, Math.max(1, stage));
}

export function setOf(face: FaceId): SetId {
  return FACE_SETS.find((s) => (s.faces as readonly string[]).includes(face))!.id;
}
