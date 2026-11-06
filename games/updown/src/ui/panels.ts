// 업다운 대화상자 내용: 설정·직접 정하기·온도계. 열 때마다 새로 만들고, 틀은 조이필드 공통 openModal(@joyfield/shared/ui)에 넣는다.
import '@joyfield/shared';
import { bindSettings, choiceGroup, switchRow } from '@joyfield/shared/settings';
import { likeSection } from '@joyfield/shared/likes';
import { closeButton, html } from '@joyfield/shared/ui';
import { CUSTOM_MAX, CUSTOM_MIN, PRESETS } from '../game/rules';
import { LANGS, NAMES, getLang, t, type Lang, type MessageKey } from '../i18n';
import { icon } from './icons';

const pressed = (on: boolean) => `aria-pressed="${on}"`;

function header(title: string): string {
  return `<div class="settings-header"><h2>${title}</h2>${closeButton()}</div>`;
}

export type Theme = 'system' | 'light' | 'dark';
export type FxKind = 'sound' | 'vibrate';

export interface SettingsOptions {
  theme: Theme;
  skin: string;
  sound: boolean;
  vibrate: boolean;
  /** 범위별 최고 기록(지우기 칩을 끌지 정함) */
  best: Partial<Record<number, number>>;
  onTheme: (theme: Theme) => void;
  onSkin: (skin: string) => void;
  onLang: (lang: Lang) => void;
  /** 켬/끔을 바꾸고 바뀐 값을 돌려준다 */
  onToggle: (kind: FxKind) => boolean;
  /** 'all' 또는 끝 숫자 */
  onReset: (key: 'all' | number) => void;
}

const THEMES: [Theme, string, MessageKey][] = [
  ['system', 'auto', 'settings.system'],
  ['light', 'sun', 'settings.light'],
  ['dark', 'moon', 'settings.dark'],
];
const SKINS: [string, string][] = [
  ['auto', 'calendar'],
  ['spring', 'flower'],
  ['summer', 'sun'],
  ['autumn', 'leaf'],
  ['winter', 'snow'],
];

/**
 * 설정 창 내용. 항목 순서는 모든 게임 공통(기준서 1.4): 컬러 모드 · 언어 · 스킨 · 소리·진동 · 내 기록 지우기 · 버전·저작권.
 * 하나 고르기·스위치는 조이필드 공통 조각(@joyfield/shared/settings), 모양은 이 게임의 칩.
 * 내 기록 지우기는 칩(전체·범위별)을 누르면 아래에 확인 상자가 열린다(같은 칩을 다시 누르면 닫힘)
 */
export function settingsPanel(o: SettingsOptions): HTMLElement {
  const lang = getLang();
  const el = html(`
    <div class="settings">
      <div class="settings-body">
        ${header(t('settings.title'))}
        <section class="settings-group">
          <h3>${t('settings.theme')}</h3>
          ${choiceGroup('theme', THEMES.map(([v, ic, key]) => ({ value: v, label: t(key), icon: icon(ic) })), o.theme, { cls: 'chip-row theme-row', itemCls: 'chip', label: t('settings.theme') })}
        </section>
        <section class="settings-group">
          <h3>${t('settings.language')}</h3>
          ${choiceGroup('lang', Joyfield.langOrder(LANGS).map((l) => ({ value: l, label: NAMES[l], lang: l })), lang, { cls: 'chip-row', itemCls: 'chip', label: t('settings.language') })}
        </section>
        <section class="settings-group">
          <h3>${t('settings.skin')}</h3>
          ${choiceGroup('skin', SKINS.map(([v, ic]) => ({ value: v, label: t(`skin.${v}` as MessageKey), icon: icon(ic) })), o.skin, { cls: 'chip-row theme-row skin-row', itemCls: 'chip', label: t('settings.skin') })}
        </section>
        <section class="settings-group">
          <h3>${t('settings.fx')}</h3>
          <div class="jp-switches">
            ${switchRow('sound', o.sound, t('settings.sound'), [icon('sound'), icon('sound')])}
            ${Joyfield.canVibrate() ? switchRow('vibrate', o.vibrate, t('settings.vibrate'), [icon('vibrate'), icon('vibrate')]) : '' /* 진동을 못 하는 기기(아이폰 등)에는 숨긴다 */}
          </div>
        </section>
        <section class="settings-group">
          <h3>${t('settings.records')}</h3>
          <div class="chip-row reset-row">
            <button type="button" class="chip" data-reset="all" ${pressed(false)}>${t('settings.resetAll')}</button>
            ${PRESETS.map((p) => `<button type="button" class="chip" data-reset="${p}" ${pressed(false)}>1 ~ ${p}</button>`).join('')}
          </div>
          <div class="reset-confirm" hidden>
            <p class="reset-confirm-message"></p>
            <div class="confirm-actions">
              <button type="button" class="secondary" data-cancel>${t('confirm.cancel')}</button>
              <button type="button" class="danger-button" data-ok>${t('confirm.delete')}</button>
            </div>
          </div>
        </section>
        <p class="app-version">${t('settings.version', { version: 'v' + __APP_VERSION__ })}</p>
        <p class="app-copyright">${Joyfield.COPYRIGHT}</p>
      </div>
    </div>`);
  // 좋아요 칸: 소리·진동 다음, 내 기록 지우기 앞(기준서 1.4)
  el.querySelector('.reset-row')!.closest('section')!.before(likeSection('updown', 'settings-group'));
  const all = <T extends HTMLElement = HTMLElement>(s: string) => [...el.querySelectorAll<T>(s)];
  bindSettings(el, {
    onChoice(name, value) {
      if (name === 'theme') o.onTheme(value as Theme);
      else if (name === 'skin') o.onSkin(value);
      else if (value !== lang) o.onLang(value as Lang);
    },
    onSwitch: (name) => o.onToggle(name as FxKind),
  });
  // 내 기록 지우기: 칩은 탭처럼 고른 범위가 바뀌고(문구에 범위를 적어 무엇을 지우는지 늘 보임), 같은 칩을 다시 누르면 닫힌다
  const box = el.querySelector<HTMLElement>('.reset-confirm')!;
  const message = box.querySelector<HTMLElement>('.reset-confirm-message')!;
  let chosen: string | null = null;
  const sync = () => {
    all<HTMLButtonElement>('[data-reset]').forEach((b) => {
      const key = b.dataset.reset!;
      b.disabled = key === 'all' ? !Object.keys(o.best).length : !o.best[Number(key)];
      b.setAttribute('aria-pressed', String(key === chosen));
    });
    box.hidden = chosen === null;
    if (chosen) message.textContent = chosen === 'all' ? t('settings.confirmAll') : t('settings.confirmOne', { level: t('board.level', { max: chosen }) });
  };
  const close = () => {
    const key = chosen;
    chosen = null;
    sync();
    const chip = el.querySelector<HTMLButtonElement>(`[data-reset="${key}"]`);
    if (chip && !chip.disabled) chip.focus();
  };
  all('[data-reset]').forEach((b) =>
    b.addEventListener('click', () => {
      if (chosen === b.dataset.reset) return close();
      chosen = b.dataset.reset!;
      sync();
    }),
  );
  box.querySelector('[data-cancel]')!.addEventListener('click', close);
  box.querySelector('[data-ok]')!.addEventListener('click', () => {
    if (chosen === null) return;
    o.onReset(chosen === 'all' ? 'all' : Number(chosen));
    close();
  });
  sync();
  return el;
}

/** 직접 정하기(연습): 끝 숫자만 고른다(시작 숫자는 1 고정, 랭킹 없음). 마지막으로 고른 값을 기억한다 */
export function customPanel(start: number, clamp: (v: unknown) => number, onStart: (max: number) => void): HTMLElement {
  const el = html(`
    <div class="settings custom">
      <form class="settings-body" novalidate>
        ${header(t('custom.title'))}
        <p class="custom-desc">${t('custom.desc', { min: CUSTOM_MIN, max: CUSTOM_MAX })}</p>
        <div class="custom-pick">
          <button type="button" class="pick-step pick-step-ten" data-step="-10" aria-label="${t('custom.minus10')}">−10</button>
          <button type="button" class="pick-step" data-step="-1" aria-label="${t('custom.minus')}">${icon('minus')}</button>
          <span class="custom-range"><span aria-hidden="true">1 ~</span>
            <input class="custom-input" type="number" inputmode="numeric" enterkeyhint="go" aria-label="${t('custom.input')}" value="${start}">
          </span>
          <button type="button" class="pick-step" data-step="1" aria-label="${t('custom.plus')}">${icon('plus')}</button>
          <button type="button" class="pick-step pick-step-ten" data-step="10" aria-label="${t('custom.plus10')}">+10</button>
        </div>
        <p class="custom-note">${t('custom.note')}</p>
        <button type="submit" class="primary">${icon('play')}<span>${t('custom.start')}</span></button>
      </form>
    </div>`);
  const input = el.querySelector('input')!;
  // −/+ 는 1씩, −10/+10 은 10씩, 칸을 떠나면 허용 범위로 맞춘다
  const step = (d: number) => (input.value = String(clamp((Number(input.value) || 0) + d)));
  el.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.step))));
  input.addEventListener('blur', () => step(0));
  el.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    input.blur(); // 휴대폰 키보드를 닫는다
    onStart(clamp(input.value));
  });
  return el;
}

export interface ThermoView {
  ready: boolean;
  /** 쓸 수 없는 이유(ready 가 아닐 때) */
  block: string;
  rules: string[];
  cost: number;
}

/** 온도계 설명·사용 확인. 쓸 수 없을 때(아직 넣은 숫자가 없음·남은 숫자가 적음)는 이유와 [닫기]만 */
export function thermoPanel(v: ThermoView, onUse: () => void): HTMLElement {
  const el = html(`
    <div class="settings thermo">
      <div class="settings-body">
        <div class="settings-header"><h2>${icon('thermo')}<span>${t('thermo.title')}</span></h2>${closeButton()}</div>
        <p class="thermo-desc">${t('thermo.desc')}</p>
        <p class="thermo-scale">${t('thermo.scale')}</p>
        <ul class="thermo-rules">${v.rules.map((r) => `<li>${r}</li>`).join('')}</ul>
        ${v.ready ? '' : `<p class="thermo-block" role="status">${v.block}</p>`}
        <div class="confirm-actions">
          <button type="button" class="secondary" data-close>${v.ready ? t('thermo.cancel') : t('thermo.close')}</button>
          ${v.ready ? `<button type="button" class="primary" data-use>${t('thermo.use', { cost: v.cost })}</button>` : ''}
        </div>
      </div>
    </div>`);
  el.querySelector('[data-use]')?.addEventListener('click', onUse);
  return el;
}
