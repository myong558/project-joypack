import { playRecipe, type RecipeNote } from '@joyfield/shared/sfx.js';

export type SoundName =
  | 'flip'
  | 'match'
  | 'miss'
  | 'mistake'
  | 'clock'
  | 'peek'
  | 'gold'
  | 'deal'
  | 'clear'
  | 'perfect'
  | 'tick'
  | 'tock'
  | 'end'
  | 'record';

/** 콤보마다 한 칸씩 오르는 음계(장조 5음 음계, 두 옥타브). 콤보를 이을수록 소리가 높아진다 */
const LADDER = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

// 효과음 recipe(sounds/catalog.json 과 같은 형식, 조이필드 공통 재생기 playRecipe 로 울림).
// 소리 결은 마림바처럼 짧은 사인파(mallet: 배음 하나를 얹어 나무 느낌)
const tone = (f: number, dur: number, wave: OscillatorType, vol: number, to?: number, at = 0): RecipeNote => ({ k: 'tone', f, dur, wave, vol, to, at });
const mallet = (f: number, dur: number, vol: number, at = 0): RecipeNote => ({ k: 'mallet', f, dur, vol, at });
/** 걸러 낸 잡음(카드 넘기는 바람 소리) */
const noise = (dur: number, vol: number, band: number, at = 0): RecipeNote => ({ k: 'noise', dur, vol, band, at });

const FIXED: Record<Exclude<SoundName, 'match'>, RecipeNote[]> = {
  // 카드가 휙 넘어가는 바람 소리 + 톡
  flip: [noise(0.05, 0.05, 2400), tone(1400, 0.035, 'triangle', 0.08, 900)],
  miss: [tone(200, 0.12, 'sine', 0.2, 130)],
  mistake: [tone(200, 0.12, 'sine', 0.2, 130), tone(620, 0.16, 'square', 0.05, 300, 0.06)],
  clock: [mallet(1568, 0.12, 0.2), mallet(1175, 0.12, 0.2, 0.1), mallet(2093, 0.4, 0.16, 0.22)],
  peek: [880, 1109, 1319, 1760].map((f, i) => tone(f, 0.18, 'sine', 0.1, undefined, i * 0.04)),
  gold: [1319, 1568, 2093, 2637].map((f, i) => mallet(f, 0.25, 0.14, i * 0.05)),
  deal: Array.from({ length: 5 }, (_, i) => noise(0.03, 0.04, 3000, i * 0.035)),
  clear: [523, 659, 784, 1047].map((f, i) => mallet(f, 0.3, 0.24, i * 0.08)),
  perfect: [784, 1047, 1319, 1568, 2093].map((f, i) => mallet(f, 0.3, 0.2, 0.3 + i * 0.06)),
  tick: [mallet(1800, 0.04, 0.12)],
  tock: [mallet(1350, 0.04, 0.12)],
  end: [784, 587, 440, 330].map((f, i) => mallet(f, 0.3, 0.22, i * 0.13)),
  record: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => mallet(f, 0.28, 0.2, i * 0.1)),
};

/** 짝 맞춤: 콤보 칸의 음 + 5도 위 음 */
function matchRecipe(combo: number): RecipeNote[] {
  const f = LADDER[Math.min(LADDER.length - 1, Math.max(0, combo - 1))];
  return [mallet(f, 0.32, 0.3), mallet(f * 1.5, 0.22, 0.12, 0.05)];
}

/** 효과음은 파일 없이 Web Audio로 합성한다 */
export class Sound {
  enabled: boolean;
  private ctx: AudioContext | null = null;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  /** 사용자 입력 직후에 불러야 브라우저가 소리를 허용한다 */
  unlock(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /** combo: 맞힌 소리의 음 높이(1콤보가 맨 아래) */
  play(name: SoundName, combo = 1): void {
    if (!this.enabled || !this.ctx) return;
    playRecipe(this.ctx, name === 'match' ? matchRecipe(combo) : FIXED[name]);
  }
}
