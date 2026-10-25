import { playRecipe, type RecipeNote } from '@joypack/shared/sfx.js';

/**
 * 효과음(파일 없이 Web Audio 합성). 소리는 조이팩 효과음 목록(sounds/catalog.json)에서 골라 온실 결에 맞게 낮췄다:
 * 테라코타 화분이 돌바닥을 긁는 낮은 스르륵, 햇살 자리에 놓으면 맑은 종소리, 꽃이 피면 높은 마림바가 흩어짐
 */
type Note = RecipeNote;
const R = {
  // new/click 을 낮고 작게: 돌바닥 발소리
  step: [{ k: 'noise', dur: 0.03, vol: 0.05, band: 900 }],
  // new/slide 를 낮춰 화분 긁는 소리로
  push: [{ k: 'tone', f: 260, to: 360, dur: 0.11, wave: 'triangle', vol: 0.09 }, { k: 'noise', dur: 0.1, vol: 0.06, band: 1100, bandTo: 1500 }],
  // updown/edge: 막힘
  bump: [{ k: 'tone', f: 220, to: 150, dur: 0.06, wave: 'square', vol: 0.04, attack: 0.01 }],
  // new/chime: 햇살 자리에 놓임
  happy: [{ k: 'tone', f: 1047, dur: 0.5, wave: 'sine', vol: 0.1, attack: 0.01 }, { k: 'tone', f: 1568, dur: 0.4, wave: 'sine', vol: 0.05, attack: 0.01 }],
  // 햇살 자리에서 벗어남: 낮게 꺼짐
  unhappy: [{ k: 'tone', f: 520, to: 390, dur: 0.18, wave: 'sine', vol: 0.06 }],
  undo: [{ k: 'tone', f: 900, to: 600, dur: 0.06, wave: 'triangle', vol: 0.05 }],
  // new/sparkle + timetoflip/clear: 꽃이 핌
  bloom: [
    { k: 'mallet', f: 784, dur: 0.4, vol: 0.16 },
    { k: 'mallet', at: 0.12, f: 988, dur: 0.4, vol: 0.15 },
    { k: 'mallet', at: 0.24, f: 1175, dur: 0.5, vol: 0.14 },
    { k: 'mallet', at: 0.42, f: 1568, dur: 0.8, vol: 0.12 },
    { k: 'mallet', at: 0.5, f: 2349, dur: 0.3, vol: 0.05 },
    { k: 'mallet', at: 0.6, f: 3136, dur: 0.4, vol: 0.04 },
  ],
  // new/unlock: 도감 새 쪽
  unlock: [{ k: 'mallet', f: 1047, dur: 0.16, vol: 0.18 }, { k: 'mallet', at: 0.09, f: 1568, dur: 0.4, vol: 0.18 }, { k: 'tone', at: 0.09, f: 3136, dur: 0.25, wave: 'sine', vol: 0.03 }],
  // timetoflip/record
  record: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => ({ k: 'mallet', at: i * 0.1, f, dur: 0.28, vol: 0.18 })),
  // 도감 넘김: 종이 스치는 잡음
  page: [{ k: 'noise', dur: 0.18, vol: 0.12, band: 2400, bandTo: 900 }],
} satisfies Record<string, Note[]>;
export type SoundName = keyof typeof R;

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

  play(name: SoundName, pitch = 1): void {
    if (!this.enabled || !this.ctx) return;
    playRecipe(this.ctx, R[name], { pitch });
  }
}
