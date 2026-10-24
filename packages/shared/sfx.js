// 효과음 목록(sounds/catalog.json)의 "recipe" 를 그대로 소리로 내는 작은 재생기. 소리 파일 없이 Web Audio 로 합성한다.
// 새 게임은 목록에서 고른 recipe 를 audio.ts 에 옮겨 적고 이 함수로 울리거나, 같은 방식으로 직접 합성한다(기준서 1.7).
//   import { playRecipe } from '@joypack/shared/sfx.js';
//   playRecipe(ctx, recipe, { pitch: 1, volume: 1 });
// recipe 는 음 목록이다. 음마다 k(종류)와 at(시작 초)을 갖는다.
//   tone   : f(Hz) → to(Hz, 있으면 미끄러짐), dur(초), wave(sine·triangle·square·sawtooth), vol, attack(초, 0 이면 바로 최대)
//   mallet : 나무 채로 친 소리. 사인파 f + 빨리 사라지는 4배 배음(마림바)
//   noise  : 잡음. band(Hz) 가 있으면 그 둘레만 남기고(bandpass), bandTo 가 있으면 그쪽으로 미끄러짐(휙 하는 바람)

let noiseBuffer = null;

function tone(ctx, n, at, pitch, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const dur = n.dur;
  const vol = (n.vol ?? 0.15) * volume;
  osc.type = n.wave || 'sine';
  osc.frequency.setValueAtTime(n.f * pitch, at);
  if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to * pitch, at + dur);
  const attack = n.attack ?? 0.005;
  if (attack > 0) {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + attack);
  } else {
    gain.gain.setValueAtTime(vol, at);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function noise(ctx, n, at, volume) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer;
  let tail = src;
  if (n.band) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(n.band, at);
    if (n.bandTo) filter.frequency.exponentialRampToValueAtTime(n.bandTo, at + n.dur);
    tail = src.connect(filter);
  }
  gain.gain.setValueAtTime((n.vol ?? 0.1) * volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + n.dur);
  tail.connect(gain).connect(ctx.destination);
  src.start(at);
  src.stop(at + n.dur);
}

/** recipe(음 목록)를 지금부터 울린다. pitch 는 음높이 배수(피버 등), volume 은 전체 크기 배수 */
export function playRecipe(ctx, recipe, { pitch = 1, volume = 1 } = {}) {
  const t = ctx.currentTime;
  for (const n of recipe) {
    const at = t + (n.at || 0);
    if (n.k === 'noise') noise(ctx, n, at, volume);
    else if (n.k === 'mallet') {
      tone(ctx, { f: n.f, dur: n.dur, wave: 'sine', vol: n.vol }, at, pitch, volume);
      tone(ctx, { f: n.f * 4, dur: Math.min(0.06, n.dur), wave: 'sine', vol: (n.vol ?? 0.15) * 0.25 }, at, pitch, volume);
    } else tone(ctx, n, at, pitch, volume);
  }
}
