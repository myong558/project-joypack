// 효과음(Web Audio 로 바로 합성, 소리 파일 없음)과 진동. 설정에서 각각 켜고 끈다.
// 소리는 sounds/catalog.json 의 updown/* recipe 그대로(조이필드 공통 재생기 playRecipe), 진동은 공통 세기표(Joyfield.vibrate).
// 진동은 지원하는 기기(주로 안드로이드)에서만 된다. 아이폰 Safari 는 진동 API 가 없어 설정 칩을 숨긴다.
import '@joyfield/shared';
import type { VibrationName } from '@joyfield/shared';
import { playRecipe, type RecipeNote } from '@joyfield/shared/sfx.js';
import { LEGACY } from './storage';

export type FxName = 'tick' | 'edge' | 'up' | 'down' | 'danger' | 'won';

const tri = (f: number, dur: number, vol: number, at = 0): RecipeNote => ({ k: 'tone', f, dur, wave: 'triangle', vol, at, attack: 0.01 });

// 다이얼 눈금(tick), 범위 끝에 닿음(edge), UP(올라가는 두 음), DOWN(내려가는 두 음), 온도계 '뜨거움'(danger), 정답(도미솔도)
const SOUNDS: Record<FxName, RecipeNote[]> = {
  tick: [{ k: 'tone', f: 1800, dur: 0.025, wave: 'triangle', vol: 0.06, attack: 0.01 }],
  edge: [{ k: 'tone', f: 320, to: 200, dur: 0.06, wave: 'square', vol: 0.05, attack: 0.01 }],
  danger: [
    { k: 'tone', f: 196, dur: 0.12, wave: 'square', vol: 0.06, attack: 0.01 },
    { k: 'tone', at: 0.16, f: 196, dur: 0.16, wave: 'square', vol: 0.06, attack: 0.01 },
  ],
  up: [tri(523, 0.12, 0.18), tri(784, 0.16, 0.18, 0.1)],
  down: [tri(784, 0.12, 0.18), tri(523, 0.16, 0.18, 0.1)],
  won: [tri(523, 0.14, 0.2), tri(659, 0.14, 0.2, 0.1), tri(784, 0.14, 0.2, 0.2), tri(1047, 0.45, 0.2, 0.3)],
};

// 진동: 눈금은 약하게 톡, 범위 끝은 툭, UP 은 짧게→길게, DOWN 은 길게→짧게, 온도계 '뜨거움'은 두근두근, 정답은 톡톡 쾅
const VIBRATIONS: Record<FxName, VibrationName> = { tick: 'tick', edge: 'light', up: 'up', down: 'down', danger: 'warn', won: 'celebrate' };

/** 기본은 둘 다 켬. 저장된 값이 'off' 일 때만 끈다(조이필드 공통 설정을 먼저) */
const enabled = {
  sound: Joyfield.get('sound', LEGACY.sound) !== 'off',
  vibrate: Joyfield.canVibrate() && Joyfield.get('vibrate', LEGACY.vibrate) !== 'off',
};

export function isOn(kind: 'sound' | 'vibrate'): boolean {
  return enabled[kind];
}

export function setOn(kind: 'sound' | 'vibrate', on: boolean): void {
  enabled[kind] = on;
  Joyfield.set(kind, on ? 'on' : 'off', LEGACY[kind]);
}

// 브라우저는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있게 한다. 첫 누름 때 오디오를 만들고 깨운다.
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, audio, { capture: true, passive: true });

let lastTick = 0;

export function play(name: FxName): void {
  // 다이얼을 빠르게 돌릴 때 눈금 소리·진동이 뭉개지지 않게 간격을 둔다.
  if (name === 'tick') {
    const now = Date.now();
    if (now - lastTick < 35) return;
    lastTick = now;
  }
  const c = enabled.sound ? audio() : null;
  if (c && c.state === 'running') playRecipe(c, SOUNDS[name]);
  Joyfield.vibrate(VIBRATIONS[name], enabled.vibrate);
}
