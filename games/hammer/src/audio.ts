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

/** 효과음은 파일 없이 Web Audio로 합성한다 */
export class Sound {
  enabled: boolean;
  /** 피버 때 음높이를 올린다 */
  pitch = 1;
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

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
    const t = this.ctx.currentTime;
    switch (name) {
      case 'hit':
        // 뿅망치: 짧게 퉁 하는 소리 위로 뿅! 하고 올라가는 소리
        this.tone(220, 0.06, 'triangle', 0.25, 110, t);
        this.tone(700, 0.09, 'sine', 0.22, 1700, t);
        this.noise(0.025, 0.08, t);
        break;
      case 'golden':
        [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.18, undefined, t + i * 0.05));
        break;
      case 'clink':
        this.tone(1500, 0.08, 'triangle', 0.2, 1100, t);
        this.tone(2300, 0.06, 'sine', 0.08, undefined, t);
        break;
      case 'king':
        this.tone(180, 0.12, 'square', 0.22, 90, t);
        this.noise(0.08, 0.15, t);
        break;
      case 'bomb':
        this.noise(0.45, 0.35, t);
        this.tone(140, 0.45, 'sine', 0.4, 35, t);
        break;
      case 'whiff':
        this.tone(260, 0.07, 'sine', 0.08, 160, t);
        break;
      case 'tease':
        this.tone(420, 0.14, 'sawtooth', 0.05, 700, t);
        break;
      case 'jump':
        this.tone(300, 0.1, 'triangle', 0.1, 900, t);
        break;
      case 'comboUp':
        [660, 990].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, undefined, t + i * 0.06));
        break;
      case 'comboBreak':
        this.tone(330, 0.18, 'triangle', 0.12, 160, t);
        break;
      case 'fever':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, undefined, t + i * 0.06));
        break;
      case 'tick':
        this.tone(1200, 0.03, 'square', 0.08, undefined, t);
        break;
      case 'count':
        this.tone(440, 0.12, 'square', 0.12, undefined, t);
        break;
      case 'go':
        this.tone(880, 0.3, 'square', 0.14, undefined, t);
        break;
      case 'timeBonus':
        this.tone(784, 0.08, 'triangle', 0.18, undefined, t);
        this.tone(1175, 0.14, 'triangle', 0.18, undefined, t + 0.07);
        break;
      case 'freeze':
        this.tone(1600, 0.4, 'sine', 0.12, 500, t);
        this.tone(2400, 0.3, 'sine', 0.05, 900, t + 0.05);
        break;
      case 'end':
        [784, 587, 392].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, undefined, t + i * 0.14));
        break;
      case 'record':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
          this.tone(f, 0.16, 'square', 0.12, undefined, t + i * 0.1),
        );
        break;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo: number | undefined, at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * this.pitch, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo * this.pitch, at + dur);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noise(dur: number, vol: number, at: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = this.noiseBuffer;
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(gain).connect(ctx.destination);
    src.start(at);
    src.stop(at + dur);
  }
}
