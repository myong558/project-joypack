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

/**
 * 효과음은 파일 없이 Web Audio로 합성한다. 소리 결은 마림바처럼 짧은 사인파(배음 하나를 얹어 나무 느낌)
 */
export class Sound {
  enabled: boolean;
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

  /** combo: 맞힌 소리의 음 높이(1콤보가 맨 아래) */
  play(name: SoundName, combo = 1): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'flip':
        // 카드가 휙 넘어가는 바람 소리 + 톡
        this.noise(0.05, 0.05, t, 2400);
        this.tone(1400, 0.035, 'triangle', 0.08, 900, t);
        break;
      case 'match': {
        const f = LADDER[Math.min(LADDER.length - 1, Math.max(0, combo - 1))];
        this.mallet(f, 0.32, 0.3, t);
        this.mallet(f * 1.5, 0.22, 0.12, t + 0.05);
        break;
      }
      case 'miss':
        this.tone(200, 0.12, 'sine', 0.2, 130, t);
        break;
      case 'mistake':
        this.tone(200, 0.12, 'sine', 0.2, 130, t);
        this.tone(620, 0.16, 'square', 0.05, 300, t + 0.06);
        break;
      case 'clock':
        this.mallet(1568, 0.12, 0.2, t);
        this.mallet(1175, 0.12, 0.2, t + 0.1);
        this.mallet(2093, 0.4, 0.16, t + 0.22);
        break;
      case 'peek':
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.1, undefined, t + i * 0.04));
        break;
      case 'gold':
        [1319, 1568, 2093, 2637].forEach((f, i) => this.mallet(f, 0.25, 0.14, t + i * 0.05));
        break;
      case 'deal':
        for (let i = 0; i < 5; i++) this.noise(0.03, 0.04, t + i * 0.035, 3000);
        break;
      case 'clear':
        [523, 659, 784, 1047].forEach((f, i) => this.mallet(f, 0.3, 0.24, t + i * 0.08));
        break;
      case 'perfect':
        [784, 1047, 1319, 1568, 2093].forEach((f, i) => this.mallet(f, 0.3, 0.2, t + 0.3 + i * 0.06));
        break;
      case 'tick':
        this.mallet(1800, 0.04, 0.12, t);
        break;
      case 'tock':
        this.mallet(1350, 0.04, 0.12, t);
        break;
      case 'end':
        [784, 587, 440, 330].forEach((f, i) => this.mallet(f, 0.3, 0.22, t + i * 0.13));
        break;
      case 'record':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.mallet(f, 0.28, 0.2, t + i * 0.1));
        break;
    }
  }

  /** 나무 채로 친 소리: 사인파 + 빨리 사라지는 4배 배음 */
  private mallet(freq: number, dur: number, vol: number, at: number): void {
    this.tone(freq, dur, 'sine', vol, undefined, at);
    this.tone(freq * 4, Math.min(0.06, dur), 'sine', vol * 0.25, undefined, at);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo: number | undefined, at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  /** 걸러 낸 잡음(카드 넘기는 바람 소리) */
  private noise(dur: number, vol: number, at: number, cutoff: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(at);
    src.stop(at + dur);
  }
}
