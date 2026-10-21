// 효과음(Web Audio 로 바로 합성, 소리 파일 없음)과 진동(navigator.vibrate). 설정에서 각각 켜고 끈다.
// 진동은 지원하는 기기(주로 안드로이드)에서만 된다. 아이폰 Safari 는 진동 API 가 없어 설정 칩을 숨긴다.
(function (global) {
  'use strict';

  const SOUND_KEY = 'updown.sound';
  const VIBRATE_KEY = 'updown.vibrate';
  const canVibrate = typeof navigator.vibrate === 'function';

  // 기본은 둘 다 켬. 저장된 값이 'off' 일 때만 끈다. 조이팩 공통 설정을 먼저 본다.
  function load(kind, key) {
    return Joypack.get(kind, key) !== 'off';
  }

  const enabled = { sound: load('sound', SOUND_KEY), vibrate: canVibrate && load('vibrate', VIBRATE_KEY) };

  function set(kind, on) {
    enabled[kind] = on;
    Joypack.set(kind, on ? 'on' : 'off', kind === 'sound' ? SOUND_KEY : VIBRATE_KEY);
  }

  // 브라우저는 사용자가 화면을 누른 뒤에만 소리를 낼 수 있게 한다. 첫 누름 때 오디오를 만들고 깨운다.
  let ctx = null;
  function audio() {
    if (!ctx) {
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  ['pointerdown', 'keydown'].forEach((type) => document.addEventListener(type, audio, { capture: true, passive: true }));

  // 음 하나: freq(Hz)에서 시작해 to(Hz)로 미끄러지며, 짧게 커졌다가 사라진다.
  function tone(start, freq, length, opts) {
    const o = opts || {};
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, start + length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(o.volume || 0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  // 효과음: 다이얼 눈금(tick), UP(올라가는 두 음), DOWN(내려가는 두 음), 정답(도미솔도), 실패(내려가는 세 음).
  const SOUNDS = {
    tick: (t) => tone(t, 1800, 0.025, { type: 'triangle', volume: 0.05 }),
    up: (t) => {
      tone(t, 523, 0.12, { type: 'triangle' });
      tone(t + 0.1, 784, 0.16, { type: 'triangle' });
    },
    down: (t) => {
      tone(t, 784, 0.12, { type: 'triangle' });
      tone(t + 0.1, 523, 0.16, { type: 'triangle' });
    },
    won: (t) => {
      [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.1, f, i === 3 ? 0.45 : 0.14, { type: 'triangle', volume: 0.2 }));
    },
    lost: (t) => {
      [392, 330, 262].forEach((f, i) => tone(t + i * 0.18, f, i === 2 ? 0.5 : 0.2, { type: 'sawtooth', volume: 0.08 }));
    },
  };

  // 진동 패턴(ms): 눈금은 아주 짧게, 정답은 톡톡톡 축하, 실패는 길게 한 번.
  const VIBRATIONS = { tick: 4, up: 25, down: 25, won: [40, 60, 40, 60, 120], lost: [250] };

  let lastTick = 0;

  function play(name) {
    // 다이얼을 빠르게 돌릴 때 눈금 소리·진동이 뭉개지지 않게 간격을 둔다.
    if (name === 'tick') {
      const now = Date.now();
      if (now - lastTick < 35) return;
      lastTick = now;
    }
    if (enabled.sound && audio() && ctx.state === 'running') SOUNDS[name](ctx.currentTime);
    if (enabled.vibrate) navigator.vibrate(VIBRATIONS[name]);
  }

  global.UpDownFx = {
    canVibrate: canVibrate,
    play: play,
    isOn: (kind) => enabled[kind],
    set: set,
  };
})(window);
