import { DURATION, type Game } from '../game/engine';
import { FEVER_COMBO, FEVER_DURATION, comboMultiplier } from '../game/scoring';
import { t } from '../i18n';
import { ICONS } from './icons';

/** 점수·시간·콤보·피버 게이지·미션. 바뀐 값만 DOM에 쓴다 */
export class Hud {
  private readonly score: HTMLElement;
  private readonly time: HTMLElement;
  private readonly timebar: HTMLElement;
  private readonly combo: HTMLElement;
  private readonly mult: HTMLElement;
  private readonly gauge: HTMLElement;
  private readonly mission: HTMLElement;
  private readonly missionProgress: HTMLElement;
  private readonly last = new Map<string, string>();

  /** trailing: 점수·시간·콤보 줄 끝에 함께 놓아 높이를 맞출 요소(일시정지 버튼) */
  constructor(readonly el: HTMLElement, game: Game, trailing?: HTMLElement | null) {
    el.innerHTML = `
      <div class="hud-row">
        <div class="stat"><span class="label">${t('hud.score')}</span><b class="score">0</b></div>
        <div class="stat"><span class="label">${t('hud.time')}</span><b class="time">30</b></div>
        <div class="stat combo-stat"><span class="label">${t('hud.combo')}</span><b class="combo">0</b><i class="mult">x1</i></div>
      </div>
      <div class="timebar"><span></span></div>
      <div class="gauge" title="${t('hud.feverTip', { n: FEVER_COMBO })}"><span></span><em>${t('hud.fever')}</em></div>
      <p class="mission">${ICONS.target} ${t(`mission.${game.mission.id}`)} <b></b></p>`;
    const q = (s: string) => el.querySelector<HTMLElement>(s)!;
    if (trailing) q('.hud-row').append(trailing);
    this.score = q('.score');
    this.time = q('.time');
    this.timebar = q('.timebar span');
    this.combo = q('.combo');
    this.mult = q('.mult');
    this.gauge = q('.gauge span');
    this.mission = q('.mission');
    this.missionProgress = q('.mission b');
  }

  render(game: Game): void {
    this.set('score', game.score.toLocaleString(), (v) => {
      this.score.textContent = v;
      bump(this.score);
    });
    this.set('time', String(Math.ceil(game.remaining / 1000)), (v) => (this.time.textContent = v));
    this.set('timebar', Math.min(1, game.remaining / DURATION).toFixed(3), (v) => {
      this.timebar.style.transform = `scaleX(${v})`;
    });
    this.set('combo', String(game.combo), (v) => {
      this.combo.textContent = v;
      if (game.combo > 0) bump(this.combo);
    });
    this.set('mult', String(comboMultiplier(game.combo)), (v) => {
      this.mult.textContent = `x${v}`;
      this.mult.dataset.level = v;
    });
    const fill = game.inFever
      ? (game.feverUntil - game.time) / FEVER_DURATION
      : (game.combo % FEVER_COMBO) / FEVER_COMBO;
    this.set('gauge', Math.max(0, Math.min(1, fill)).toFixed(3), (v) => (this.gauge.style.transform = `scaleX(${v})`));

    const { mission, stats } = game;
    const state = mission.failed(stats) ? 'failed' : mission.done(stats) ? 'done' : '';
    this.set('mission', `${mission.progress(stats)}|${state}`, () => {
      this.missionProgress.textContent = state === 'failed' ? t('mission.failed') : mission.progress(stats);
      this.mission.dataset.state = state;
    });
  }

  private set(key: string, value: string, apply: (v: string) => void): void {
    if (this.last.get(key) === value) return;
    this.last.set(key, value);
    apply(value);
  }
}

/** 숫자가 통 튄다. 클래스를 뗐다 붙이며 레이아웃을 강제하지 않도록 Web Animations로 재생 */
function bump(el: HTMLElement): void {
  el.animate([{ scale: '1' }, { scale: '1.25', offset: 0.4 }, { scale: '1' }], { duration: 180, easing: 'ease-out' });
}
