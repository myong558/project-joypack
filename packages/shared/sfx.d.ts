/** 효과음 목록(sounds/catalog.json)의 recipe 한 음. 자세한 뜻은 sfx.js 맨 위 설명 */
export interface RecipeNote {
  k: 'tone' | 'mallet' | 'noise' | string;
  at?: number;
  [key: string]: number | string | undefined;
}

/** recipe(음 목록)를 지금부터 울린다. pitch 는 음높이 배수, volume 은 전체 크기 배수 */
export function playRecipe(ctx: AudioContext, recipe: readonly RecipeNote[], options?: { pitch?: number; volume?: number }): void;
