import { playRecipe, type RecipeNote } from '@joyfield/shared/sfx.js';

export type SoundName =
  | 'hit'
  | 'golden'
  | 'clink'
  | 'king'
  | 'bomb'
  | 'whiff'
  | 'tease'
  | 'jump'
  | 'comboUp'
  | 'comboBreak'
  | 'fever'
  | 'tick'
  | 'count'
  | 'go'
  | 'timeBonus'
  | 'freeze'
  | 'end'
  | 'record';

// 효과음 recipe(sounds/catalog.json 과 같은 형식, 조이필드 공통 재생기 playRecipe 로 울림).
// 이 게임 소리는 모두 바로 최대 크기로 시작한다(attack 0). 잡음(noise)은 피버 음높이를 따르지 않는다
const tone = (f: number, dur: number, wave: OscillatorType, vol: number, to?: number, at = 0): RecipeNote => ({ k: 'tone', f, dur, wave, vol, to, at, attack: 0 });
const noise = (dur: number, vol: number, at = 0): RecipeNote => ({ k: 'noise', dur, vol, at });
const run = (freqs: number[], step: number, dur: number, wave: OscillatorType, vol: number) => freqs.map((f, i) => tone(f, dur, wave, vol, undefined, i * step));

const RECIPES: Record<SoundName, RecipeNote[]> = {
  // 뿅망치: 짧게 퉁 하는 소리 위로 뿅! 하고 올라가는 소리
  hit: [tone(220, 0.06, 'triangle', 0.25, 110), tone(700, 0.09, 'sine', 0.22, 1700), noise(0.025, 0.08)],
  golden: run([880, 1175, 1568], 0.05, 0.12, 'triangle', 0.18),
  clink: [tone(1500, 0.08, 'triangle', 0.2, 1100), tone(2300, 0.06, 'sine', 0.08)],
  king: [tone(180, 0.12, 'square', 0.22, 90), noise(0.08, 0.15)],
  bomb: [noise(0.45, 0.35), tone(140, 0.45, 'sine', 0.4, 35)],
  whiff: [tone(260, 0.07, 'sine', 0.08, 160)],
  tease: [tone(420, 0.14, 'sawtooth', 0.05, 700)],
  jump: [tone(300, 0.1, 'triangle', 0.1, 900)],
  comboUp: run([660, 990], 0.06, 0.1, 'square', 0.1),
  comboBreak: [tone(330, 0.18, 'triangle', 0.12, 160)],
  fever: run([523, 659, 784, 1047, 1319], 0.06, 0.12, 'square', 0.12),
  tick: [tone(1200, 0.03, 'square', 0.08)],
  count: [tone(440, 0.12, 'square', 0.12)],
  go: [tone(880, 0.3, 'square', 0.14)],
  timeBonus: [tone(784, 0.08, 'triangle', 0.18), tone(1175, 0.14, 'triangle', 0.18, undefined, 0.07)],
  freeze: [tone(1600, 0.4, 'sine', 0.12, 500), tone(2400, 0.3, 'sine', 0.05, 900, 0.05)],
  end: run([784, 587, 392], 0.14, 0.18, 'triangle', 0.18),
  record: run([523, 659, 784, 1047, 784, 1047], 0.1, 0.16, 'square', 0.12),
};

/** 효과음은 파일 없이 Web Audio로 합성한다 */
export class Sound {
  enabled: boolean;
  /** 피버 때 음높이를 올린다 */
  pitch = 1;
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

  play(name: SoundName): void {
    if (!this.enabled || !this.ctx) return;
    playRecipe(this.ctx, RECIPES[name], { pitch: this.pitch });
  }
}
