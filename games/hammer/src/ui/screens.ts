import { bindSettings, choiceGroup, devSection, switchRow } from '@joyfield/shared/settings';
import { MOLES, MOLE_ORDER } from '../game/moles';
import type { Goal } from '../game/scoring';
import { SEGMENTS } from '../game/spawner';
import type { GameResult, MoleKind } from '../game/types';
import type { MissionId } from '../game/missions';
import { LANGS, getLang, moleDesc, moleName, t, type Lang, type MessageKey } from '../i18n';
import type { SaveData } from '../storage';
import { closeButton, html, openModal as openSharedModal, openRanking as openSharedRanking, pauseLayer, rankEntryForm } from '@joyfield/shared/ui';
import { shortDate } from '@joyfield/shared/rank';
import { boardEntries } from '../ranking';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { createMoleEl, holeInner } from './board';
import { captureResult, type ShareOutcome } from '../share';
import { confetti, countUp } from './effects';
import { DECO_ART, HAMMER, ICONS, MORE_ICONS, SKIN_ICONS, STAR_OFF, STAR_ON, THEME_ICONS } from './icons';

export type Mode = 'classic' | 'daily';

/** 대화상자: 글자 크기를 판(화면) 크기에 맞춘다(시작 화면 --fit 이 바뀔 때도) */
function openModal(host: HTMLElement, content: HTMLElement, label: string, reopen?: string): () => void {
  return openSharedModal(host, content, label, { reopen, fitFont: true });
}

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };

function holeMarkup(cls: string): string {
  return `<div class="${cls}" aria-hidden="true">${holeInner()}</div>`;
}

/** 작은 두더지 초상. 도감 칸·결과 화면에 쓴다 */
function thumbMarkup(kind: MoleKind, cls = 'thumb'): string {
  return `<span class="${cls}" data-thumb="${kind}" aria-hidden="true"><span class="slot"></span></span>`;
}

function fillThumbs(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-thumb]').forEach((t) => {
    const mole = createMoleEl(t.dataset.thumb as MoleKind);
    mole.classList.add('up');
    t.querySelector('.slot')!.append(mole);
  });
}

/* ---------- 시작 화면 ---------- */

export interface StartOptions {
  save: SaveData;
  today: string;
  todayLabel: string;
  todaySkin: Skin;
  onPlay: (mode: Mode) => void;
  onToggle: (key: Toggle) => void;
  onLang: (lang: Lang) => void;
  onTheme: (theme: Theme) => void;
  onSkin: (skin: SkinSetting) => void;
  onReset: () => void;
  /** 개발자 모드 "출시 화면" 단추: 보기 방식을 바꾼 뒤 설정 창을 연 채로 다시 그린다 */
  onRefresh: () => void;
  ranking: RankingView;
  /** 다시 그린 뒤 설정 창을 열어 둘지. 'reset'이면 초기화 완료 문구도 보인다 */
  settings?: 'open' | 'reset';
  /** 페이지에 처음 들어왔을 때만 오프닝 연출을 튼다 */
  opening?: boolean;
  /** 다시 연 설정 창에서 초점을 둘 버튼 */
  settingsFocus?: string;
}

export function startScreen(opts: StartOptions): HTMLElement {
  const { save } = opts;
  // 개발자 모드(출시 화면 보기 꺼짐)면 도감을 모두 열어 보인다. 저장된 기록(save.dex)은 그대로 둔다
  const dex = new Set<MoleKind>(!__JOYFIELD_PROD__ && Joyfield.devJump() ? MOLE_ORDER : save.dex);
  const dailyBest = save.daily?.date === opts.today ? save.daily.best : 0;
  const lang = getLang();
  const otherLang = LANGS.find((l) => l !== lang)!;
  const el = html(`
    <main class="screen start">
      <nav class="jp-topbar" aria-label="${t('app.title')}">
        <div class="jp-topbar-group">
          <a class="jp-top-btn hub-btn" href="../../" aria-label="${t('nav.hub')}" title="${t('nav.hub')}">${Joyfield.topIcon('apps')}</a>
          <button class="jp-top-btn jp-top-pill top-lang" data-lang="${otherLang}" aria-label="${t('lang.label')}: ${LANG_LABEL[lang]} → ${LANG_LABEL[otherLang]}">${Joyfield.topIcon('globe')}<span lang="${otherLang}">${LANG_LABEL[otherLang]}</span></button>
        </div>
        <div class="jp-topbar-group">
          <button class="jp-top-btn rank-btn" data-ranking aria-label="${t('ranking.open')}" title="${t('ranking.open')}">${Joyfield.topIcon('trophy')}</button>
          <button class="jp-top-btn settings-btn" aria-label="${t('settings.open')}" title="${t('settings.open')}">${Joyfield.topIcon('gear')}</button>
        </div>
      </nav>
      <div class="col main-col">
        ${holeMarkup('title-hole')}
        <h1 aria-label="${t('app.title')}"><span class="title-text" aria-hidden="true">${titleLetters(t('app.title'))}</span> <span class="title-hammer">${HAMMER}</span></h1>
        <p class="tagline">${t('app.tagline')}</p>
        <div class="modes">
          <button class="btn primary" data-mode="classic">${t('start.classic')}</button>
          <button class="btn daily" data-mode="daily">
            <span class="cal" aria-hidden="true"><i></i><b>${Number(opts.today.slice(-2))}</b></span>
            <span class="daily-text">${t('start.daily')} <small>${t('start.dailySub', { date: opts.todayLabel })}</small></span>
            <span class="go">${ICONS.arrow}</span>
          </button>
        </div>
        <p class="best">${t('start.best', { best: save.best, daily: dailyBest })}</p>
      </div>
      <div class="col side-col">
        <section class="dex" aria-label="${t('dex.title')}">
          <h2>${t('dex.title')} <small>${dex.size}/${MOLE_ORDER.length}</small></h2>
          <ul>${MOLE_ORDER.map((k, i) => `<li style="--i:${i}">${dexItem(k, dex.has(k))}</li>`).join('')}</ul>
        </section>
        <p class="hint">${t('start.hint')}</p>
      </div>
    </main>`);

  // 오프닝에서 망치가 두더지를 치러 갈 거리: 제자리 망치에서 구멍 위쪽(두더지 머리)까지.
  // 오프닝 중에는 요소들이 움직이거나 커지는 중이라 화면 위치 대신 움직임과 관계없는 배치 위치(offset)로 잰다
  const layoutBox = (node: HTMLElement) => {
    let x = 0;
    let y = 0;
    for (let n: HTMLElement | null = node; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: node.offsetWidth, h: node.offsetHeight };
  };
  const aimHammer = () => {
    const hammer = el.querySelector<HTMLElement>('.title-hammer')!;
    const ham = layoutBox(hammer);
    const hole = layoutBox(el.querySelector<HTMLElement>('.title-hole')!);
    const home = { x: ham.x + ham.w / 2, y: ham.y + ham.h / 2 };
    const target = { x: hole.x + hole.w * 1.1, y: hole.y + hole.h * 0.04 };
    hammer.style.setProperty('--hit-x', `${Math.round(target.x - home.x)}px`);
    hammer.style.setProperty('--hit-y', `${Math.round(target.y - home.y)}px`);
  };

  // 화면 비율에 따라 내용(특히 아래 도감)이 설계 높이를 넘으면 잘리므로, 넘친 만큼 시작 화면 전체를 줄인다(--fit, styles.css .start).
  // 크기가 바뀌면 망치가 갈 거리도 다시 잰다
  const fitStart = () => {
    if (!el.isConnected) return window.removeEventListener('resize', fitStart);
    el.style.setProperty('--fit', '1');
    const cols = [...el.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
    // 내용은 세로 가운데 정렬이라 넘치면 위로도 삐져나간다(가로 모드에서 제목이 위 메뉴 밑으로 숨음).
    // 그래서 아래 끝만 보지 않고 내용 전체 높이(맨 위 칸 ~ 맨 아래 칸)를 위·아래 여백을 뺀 자리와 비교한다.
    // 위 메뉴·버튼 글자 최소 크기(px) 등 줄지 않는 부분이 섞여, 많이 줄이면 버튼 글이 줄바꿈돼 오히려 길어지기도 한다.
    // 그래서 1배에서 조금씩 줄여 가며 처음 들어가는 배율을 쓰고, 끝까지 안 들어가면 가장 덜 넘치는 배율을 쓴다(0.6배까지)
    const over = () => {
      const cs = getComputedStyle(el);
      const room = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      return Math.max(...cols.map((c) => c.offsetTop + c.offsetHeight)) - Math.min(...cols.map((c) => c.offsetTop)) - room;
    };
    let best = { fit: 1, over: over() };
    for (let fit = 0.975; best.over > 0 && fit >= 0.6; fit -= 0.025) {
      el.style.setProperty('--fit', fit.toFixed(3));
      const o = over();
      if (o < best.over) best = { fit, over: o };
    }
    el.style.setProperty('--fit', best.fit.toFixed(3));
    el.dispatchEvent(new Event('fitchange'));
    if (opts.opening) aimHammer();
  };
  window.addEventListener('resize', fitStart);
  requestAnimationFrame(fitStart);
  // 글꼴·그림이 늦게 들어와 내용 높이가 바뀌어도 다시 맞춘다. 맞춘 뒤 크기가 그대로면 다시 불리지 않는다.
  // 화면(el) 자체도 지켜본다: 설치 앱에서 처음 열 때는 상태 표시줄·주소창이 자리 잡으며 화면 높이만 나중에 줄어드는데,
  // 이때 window resize 가 오지 않아 줄어든 높이를 놓치고 도감이 잘렸다(앱을 내렸다 올리면 그제야 맞춰짐)
  const resized = new ResizeObserver(() => (el.isConnected ? fitStart() : resized.disconnect()));
  resized.observe(el);
  el.querySelectorAll('.col').forEach((c) => resized.observe(c));
  // 화면을 보이는 크기(visualViewport)가 바뀌거나 앱으로 돌아왔을 때도 다시 맞춘다
  const refit = () => (el.isConnected ? fitStart() : (visualViewport?.removeEventListener('resize', refit), window.removeEventListener('pageshow', refit)));
  visualViewport?.addEventListener('resize', refit);
  window.addEventListener('pageshow', refit);

  if (opts.opening) {
    el.classList.add('opening');
    // 누르면 바로 건너뛴다. 저절로 끝날 때는 클래스를 그대로 둬야 이어지는 망치·두더지 연출이 처음부터 다시 돌지 않는다
    el.addEventListener('pointerdown', () => el.classList.remove('opening'), { once: true });
  }

  const titleMole = createMoleEl('normal');
  el.querySelector('.title-hole .slot')!.append(titleMole);
  titleMole.classList.add('bob');
  // 오프닝에서 망치가 두더지 머리 오른쪽 위를 칠 때 번쩍이는 효과(styles.css .title-bonk)
  el.querySelector('.title-hole')!.insertAdjacentHTML('beforeend', '<span class="title-bonk"><b></b><i></i><i></i><i></i><i></i><i></i></span>');
  fillThumbs(el);

  el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => opts.onPlay(b.dataset.mode as Mode)),
  );
  el.querySelector('.top-lang')!.addEventListener('click', () => opts.onLang(otherLang));
  el.querySelectorAll<HTMLButtonElement>('.dex [data-kind]').forEach((b) =>
    b.addEventListener('click', () => {
      const found = MOLE_ORDER.filter((k) => dex.has(k));
      openDexBrowser(el, found, found.indexOf(b.dataset.kind as MoleKind), save);
    }),
  );

  // 처음 탭은 조이필드 공통 기준: 최근 모드(방금 한 판·마지막으로 본 탭) → 클래식. 조이필드 전체 랭킹과 같은 값을 쓴다
  const rankBtn = el.querySelector('[data-ranking]')!;
  rankBtn.addEventListener('click', () => openRanking(el, opts.ranking, Joyfield.rankTab('hammer', ['classic', 'daily'], 'classic') as Mode, null));
  // 오프라인이면 판을 시작하기 전에 랭킹에 올릴 수 없음을 알린다(조이필드 공통, 기준서 1.6)
  Joyfield.offlineMark(rankBtn, t('ranking.offlineBadge'));

  const showSettings = (reopen?: string) => openModal(el, settingsPanel(opts), t('settings.title'), reopen);
  el.querySelector('.settings-btn')!.addEventListener('click', () => showSettings());
  if (opts.settings) queueMicrotask(() => showSettings(opts.settingsFocus ?? (opts.settings === 'reset' ? '[data-reset]' : '[aria-checked="true"]')));
  return el;
}

/** 제목을 한 글자씩 떨어뜨리려고 글자마다 감싼다 */
function titleLetters(title: string): string {
  return [...title].map((c, i) => (c === ' ' ? ' ' : `<span class="ch" style="--i:${i}">${c}</span>`)).join('');
}

function dexItem(kind: MoleKind, found: boolean): string {
  if (!found) {
    return `<div class="dex-item locked" role="img" aria-label="??? — ${t('dex.locked')}" title="${t('dex.locked')}">${thumbMarkup(kind)}</div>`;
  }
  const def = MOLES[kind];
  const pts = def.points > 0 ? `+${def.points}` : `${def.points}`;
  return `<button class="dex-item${def.good ? '' : ' danger'}" data-kind="${kind}" aria-label="${moleName(kind)} ${pts}" title="${moleName(kind)} · ${t('dex.tapHint')}">
    ${thumbMarkup(kind)}</button>`;
}

function appearLabel(kind: MoleKind): string {
  if (kind === 'king') return t('dex.final');
  const index = SEGMENTS.findIndex((s) => (s.weights[kind] ?? 0) > 0);
  const from = index <= 0 ? 0 : SEGMENTS[index - 1].until;
  return from === 0 ? t('dex.fromStart') : t('dex.fromSec', { s: from / 1000 });
}

/**
 * 도감 설명 창. 좌우 버튼·스와이프·←→ 키로 만난 두더지를 차례로 넘기고, 끝에서는 처음으로 돌아간다
 */
function openDexBrowser(host: HTMLElement, kinds: MoleKind[], start: number, save: SaveData): void {
  const box = html(`<div class="dex-browser"></div>`);
  let index = Math.max(0, start);
  let modal: HTMLElement | null = null;

  // 만난 두더지 설명을 모두 한 칸에 겹쳐 두고 지금 것만 보인다. 창 높이가 늘 가장 긴 설명에 맞춰져
  // 넘기기 버튼이 두더지마다 위아래로 움직이지 않는다(글꼴이 늦게 불러와지거나 창 크기가 바뀌어도 그대로)
  const details = kinds.map((kind) => dexDetail(kind, save.kills[kind] ?? 0));
  const stack = html(`<div class="dex-stack"></div>`);
  stack.append(...details);
  const nav =
    kinds.length > 1
      ? html(`<div class="dex-nav">
          <button class="dex-arrow prev" data-step="-1" aria-label="${t('dex.prev')}">${MORE_ICONS.chevronLeft}</button>
          <p class="dex-pager" aria-live="polite"></p>
          <button class="dex-arrow next" data-step="1" aria-label="${t('dex.next')}">${MORE_ICONS.chevronRight}</button>
        </div>`)
      : null;
  // 닫기 버튼은 넘길 때 함께 미끄러지지 않도록 설명 밖에 하나만 둔다
  box.append(html(closeButton()), stack, ...(nav ? [nav] : []));

  const render = (dir: 0 | 1 | -1) => {
    details.forEach((d, i) => {
      const on = i === index;
      d.classList.toggle('current', on);
      d.classList.remove('from-right', 'from-left');
      d.inert = !on;
      d.toggleAttribute('aria-hidden', !on);
    });
    const cur = details[index];
    if (dir) {
      void cur.offsetWidth; // 같은 방향으로 연달아 넘겨도 슬라이드가 다시 돌게
      cur.classList.add(dir > 0 ? 'from-right' : 'from-left');
    }
    if (nav) nav.querySelector('.dex-pager')!.textContent = `${index + 1} / ${kinds.length}`;
    modal?.setAttribute('aria-label', moleName(kinds[index]));
  };
  const step = (d: 1 | -1) => {
    if (kinds.length < 2) return;
    index = (index + d + kinds.length) % kinds.length;
    render(d);
  };

  box.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-step]');
    if (btn) step(Number(btn.dataset.step) as 1 | -1);
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else return;
    e.preventDefault();
  });
  // 스와이프: 가로로 충분히(48px) 밀었고 세로보다 가로 움직임이 클 때만
  let sx = 0;
  let sy = 0;
  let tracking = false;
  box.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return;
    tracking = true;
    sx = e.clientX;
    sy = e.clientY;
  });
  box.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.2) step(dx < 0 ? 1 : -1);
  });
  box.addEventListener('pointercancel', () => (tracking = false));

  render(0);
  openModal(host, box, moleName(kinds[index]));
  modal = box.closest('.modal');
}

function dexDetail(kind: MoleKind, count: number): HTMLElement {
  const def = MOLES[kind];
  const el = html(`
    <div class="dex-detail${def.good ? '' : ' danger'}">
      ${closeButton()}
      ${holeMarkup('detail-hole')}
      <h2>${moleName(kind)}</h2>
      <dl class="detail-stats">
        <div><dt>${t('dex.points')}</dt><dd>${def.points > 0 ? '+' : ''}${def.points}</dd></div>
        <div><dt>${t('dex.hits')}</dt><dd>${t('dex.hitsValue', { n: def.hp })}</dd></div>
        <div><dt>${t('dex.appears')}</dt><dd>${appearLabel(kind)}</dd></div>
      </dl>
      <p class="detail-desc">${moleDesc(kind)}</p>
      <p class="detail-count">${t(def.good ? 'dex.caught' : 'dex.exploded', { n: count })}</p>
    </div>`);
  const mole = createMoleEl(kind);
  mole.classList.add('up', 'looky');
  el.querySelector('.detail-hole .slot')!.append(mole);
  return el;
}

type Toggle = 'sound' | 'vibrate';

const TOGGLE_ICONS: Record<Toggle, [on: string, off: string]> = {
  sound: [ICONS.soundOn, ICONS.soundOff],
  vibrate: [ICONS.vibrateOn, ICONS.vibrateOff],
};

function settingsPanel(opts: StartOptions): HTMLElement {
  const { save } = opts;
  const lang = getLang();
  const el = html(`
    <div class="settings">
      ${closeButton()}
      <h2>${ICONS.gear} ${t('settings.title')}</h2>
      ${
        // 개발자 모드: 확인 도구(도감 모두 열기)와 출시 화면 단추. 테스트할 때 바로 누르도록 설정 창 맨 위에 둔다(기준서 11.5)
        !__JOYFIELD_PROD__ && Joyfield.devMode()
          ? devSection({
              note: Joyfield.devJump() ? t('test.dexAll') : undefined,
              release: { on: Joyfield.releaseView(), label: Joyfield.releaseView() ? t('test.devView') : t('test.releaseView') },
            })
          : ''
      }
      <div class="settings-grid">
        <section>
          <h3>${t('theme.label')}</h3>
          ${choiceGroup('theme', THEMES.map((th) => ({ value: th, label: t(`theme.${th}`), icon: THEME_ICONS[th] })), save.theme, { label: t('theme.label') })}
        </section>
        <section>
          <h3>${t('lang.label')}</h3>
          ${choiceGroup('lang', LANGS.map((l) => ({ value: l, label: LANG_LABEL[l], lang: l })), lang, { label: t('lang.label') })}
        </section>
        <section class="skin-section">
          <h3>${t('skin.label')}</h3>
          ${choiceGroup('skin', SKIN_SETTINGS.map((s) => ({ value: s, label: t(`skin.${s}`), icon: SKIN_ICONS[s], title: t(`skin.${s}`) })), save.skin, { cls: 'skins', label: t('skin.label') })}
          <p class="note">${t('skin.autoHint', { skin: t(`skin.${opts.todaySkin}`) })}</p>
        </section>
        <section class="toggle-section">
          <h3>${t('settings.feedback')}</h3>
          <div class="switches">
            ${switchRow('sound', save.sound, t('sound.label'), TOGGLE_ICONS.sound)}
            ${Joyfield.canVibrate() ? switchRow('vibrate', save.vibrate, t('vibrate.label'), TOGGLE_ICONS.vibrate) : '' /* 진동을 못 하는 기기(아이폰 등)에는 숨긴다 */}
          </div>
        </section>
        <section class="reset-section">
          <h3>${t('reset.label')}</h3>
          <p class="note${opts.settings === 'reset' ? ' done' : ''}">${opts.settings === 'reset' ? `${ICONS.check} ${t('reset.done')}` : t('reset.desc')}</p>
          <button class="btn danger" data-reset>${t('reset.label')}</button>
          <div class="confirm" hidden>
            <p>${t('reset.confirm')}</p>
            <div class="row">
              <button class="btn" data-cancel>${t('common.cancel')}</button>
              <button class="btn danger" data-confirm>${t('reset.yes')}</button>
            </div>
          </div>
        </section>
      </div>
      <p class="app-version">${t('settings.version')} v${__APP_VERSION__}</p>
      <p class="app-copyright">${Joyfield.COPYRIGHT}</p>    </div>`);

  // 하나 고르기·스위치(공통 @joyfield/shared/settings): 고른 표시·스위치 아이콘은 공통 조각이 바꾸고 저장·적용은 main 이 한다
  bindSettings(el, {
    onChoice(name, value) {
      if (name === 'theme') opts.onTheme(value as Theme);
      else if (name === 'skin') opts.onSkin(value as SkinSetting);
      else opts.onLang(value as Lang);
    },
    onSwitch: (name) => opts.onToggle(name as Toggle),
  });
  const resetBtn = el.querySelector<HTMLButtonElement>('[data-reset]')!;
  const confirm = el.querySelector<HTMLElement>('.confirm')!;
  resetBtn.addEventListener('click', () => {
    resetBtn.hidden = true;
    confirm.hidden = false;
    confirm.querySelector<HTMLButtonElement>('[data-cancel]')!.focus();
  });
  confirm.querySelector('[data-cancel]')!.addEventListener('click', () => {
    confirm.hidden = true;
    resetBtn.hidden = false;
    resetBtn.focus();
  });
  confirm.querySelector('[data-confirm]')!.addEventListener('click', opts.onReset);
  // 개발자 모드: 출시 화면 보기 ↔ 개발 보기(도감 모두 열기를 숨기거나 다시 보임)
  if (!__JOYFIELD_PROD__)
    el.querySelector('[data-release]')?.addEventListener('click', () => {
      Joyfield.setReleaseView(!Joyfield.releaseView());
      opts.onRefresh();
    });
  return el;
}

/* ---------- 랭킹 ---------- */

export interface RankingView {
  save: SaveData;
  /** 오늘(YYYY-MM-DD)과 화면에 쓸 날짜(M/D) */
  today: string;
  todayLabel: string;
  /** 온라인 순위표를 받아 save.rankings에 남긴다. 실패(오프라인 등)하면 false */
  refresh: (mode: Mode) => Promise<boolean>;
  /** 지금 알고 있는 순위표에서 이 점수의 자리(0부터, 밖이면 -1) */
  consider: (mode: Mode, score: number) => number;
  /** 온라인 순위표에 이름을 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외 */
  register: (mode: Mode, name: string, score: number) => Promise<number>;
}

/**
 * 랭킹 창(공통 모양 @joyfield/shared/ui). 클래식·오늘의 챌린지 순위표를 탭으로 바꿔 본다(등록은 결과 화면에서만).
 * mark는 방금 올린 순위(0부터)로, 그 줄을 강조한다
 */
function openRanking(host: HTMLElement, view: RankingView, start: Mode, mark: number | null): void {
  const { save } = view;
  const tab = (mode: Mode, label: string, note: () => string) => ({
    id: mode,
    label,
    note,
    listClass: mode === 'classic' ? 'with-date' : undefined,
    columns: [{ cls: 'score', empty: '-' }, ...(mode === 'classic' ? [{ cls: 'date' }] : [])],
    rows: () =>
      boardEntries(save.rankings, mode, view.today).map((e) => ({
        name: e.name,
        dev: e.dev,
        cells: [e.score.toLocaleString(), ...(mode === 'classic' ? [shortDate(e.date)] : [])],
      })),
    refresh: () => view.refresh(mode),
  });
  openSharedRanking(host, {
    gameId: 'hammer',
    start,
    mark,
    fitFont: true,
    tabs: [
      tab('classic', t('mode.classic'), () => t('ranking.classicNote')),
      tab('daily', t('ranking.daily'), () => t('ranking.dailyNote', { date: view.todayLabel })),
    ],
  });
}

/* ---------- 게임 화면 ---------- */

export interface GameView {
  el: HTMLElement;
  hud: HTMLElement;
  stage: HTMLElement;
  board: HTMLElement;
  showCountdown(text: string | null): void;
  showPause(show: boolean): void;
}

export function gameScreen(opts: {
  daily: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}): GameView {
  const el = html(`
    <main class="screen game${opts.daily ? ' daily' : ''}">
      <div class="top">
        <div class="hud"></div>
        <button class="pause-btn" aria-label="${t('hud.pause')}">${ICONS.pause}</button>
      </div>
      <div class="stage-wrap">
        <div class="stage">
          <div class="deco" aria-hidden="true">${decoMarkup()}</div>
          <div class="board"></div>
          <div class="banners" aria-live="polite"></div>
          <div class="countdown" hidden></div>
          <div class="pause-menu" hidden>
            <h2>${t('pause.title')}</h2>
            <p class="pause-note">${t('pause.note')}</p>
            <button class="btn primary" data-act="resume">${t('pause.resume')}</button>
            <button class="btn" data-act="restart">${t('pause.restart')}</button>
            <button class="btn ghost" data-act="quit">${t('pause.quit')}</button>
          </div>
        </div>
      </div>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  const countdown = q('.countdown');
  const showPauseLayer = pauseLayer(q('.pause-menu'));
  q('.pause-btn').addEventListener('click', opts.onPause);
  q('[data-act="resume"]').addEventListener('click', opts.onResume);
  q('[data-act="restart"]').addEventListener('click', opts.onRestart);
  q('[data-act="quit"]').addEventListener('click', opts.onQuit);

  // 판은 HUD를 뺀 높이에 맞추므로 HUD 높이(글자 크기·줄바꿈에 따라 달라짐)를 재서 넘겨 준다
  const top = q('.top');
  new ResizeObserver(() => el.style.setProperty('--top-h', `${top.offsetHeight}px`)).observe(top);

  return {
    el,
    hud: q('.hud'),
    stage: q('.stage'),
    board: q('.board'),
    showCountdown(text) {
      countdown.hidden = text === null;
      if (text === null) return;
      countdown.textContent = text;
      countdown.classList.remove('pop');
      void countdown.offsetWidth;
      countdown.classList.add('pop');
    },
    showPause(show) {
      showPauseLayer(show);
    },
  };
}

/** 판 가장자리 소품. 지금 적용된 스킨을 따른다 */
function decoMarkup(): string {
  const skin = (document.documentElement.dataset.skin ?? 'garden') as Skin;
  const [a, b] = DECO_ART[skin] ?? DECO_ART.garden;
  return Array.from({ length: 6 }, (_, i) => `<span>${i % 2 ? b : a}</span>`).join('');
}

/* ---------- 결과 화면 ---------- */

function goalText(goal: Goal): string {
  switch (goal.type) {
    case 'first':
      return t('goal.first');
    case 'record':
      return t('goal.record', { n: goal.diff });
    case 'missing':
      return t('goal.missing', { name: moleName(goal.kind) });
    case 'gap':
      return t('goal.gap', { n: goal.gap });
  }
}

export function resultScreen(opts: {
  result: GameResult;
  daily: boolean;
  isRecord: boolean;
  newDex: MoleKind[];
  goal: Goal;
  missionId: MissionId;
  onRetry: () => void;
  onHome: () => void;
  onShare: (image: Blob | null) => Promise<ShareOutcome>;
  ranking: RankingView;
}): HTMLElement {
  const { result } = opts;
  const { stats } = result;
  const killed = MOLE_ORDER.filter((k) => k !== 'bomb' && stats.kills[k] > 0);
  const missionLabel = t(`mission.${opts.missionId}` as MessageKey);
  const el = html(`
    <main class="screen result grade-${result.grade}">
      <div class="confetti-layer" aria-hidden="true"></div>
      <div class="col main-col">
        <p class="mode">${opts.daily ? t('start.daily') : t('mode.classic')}</p>
        <div class="grade-row">
          <div class="grade" aria-label="${t('result.grade', { g: result.grade })}">${result.grade}</div>
          <div class="stars">${result.stars.map((s, i) => `<span class="${s ? 'on' : ''}" style="--i:${i}">${s ? STAR_ON : STAR_OFF}</span>`).join('')}</div>
        </div>
        <p class="final">${t('result.final')}</p>
        ${opts.isRecord ? `<p class="record">${t('result.record')}</p>` : ''}
        <ul class="kills">
          ${killed.map((k) => `<li aria-label="${moleName(k)} ${stats.kills[k]}">${thumbMarkup(k, 'thumb mini')}<b>×${stats.kills[k]}</b>${opts.newDex.includes(k) ? '<em>NEW</em>' : ''}</li>`).join('')}
          ${stats.bombs > 0 ? `<li class="bad" aria-label="${moleName('bomb')} ${stats.bombs}">${thumbMarkup('bomb', 'thumb mini')}<b>×${stats.bombs}</b>${opts.newDex.includes('bomb') ? '<em>NEW</em>' : ''}</li>` : ''}
        </ul>
      </div>
      <div class="col side-col">
        <p class="goal">${goalText(opts.goal)}</p>
        <dl class="numbers">
          <div><dt>${t('result.accuracy')}</dt><dd>${Math.round(result.accuracy * 100)}%</dd></div>
          <div><dt>${t('result.maxCombo')}</dt><dd>${stats.maxCombo}</dd></div>
          <div><dt>${t('result.missed')}</dt><dd>${stats.missed}</dd></div>
          <div><dt>${t('result.bombs')}</dt><dd>${stats.bombs}</dd></div>
        </dl>
        <p class="mission-result ${result.missionDone ? 'done' : ''}">
          ${ICONS.target} ${missionLabel} — ${result.missionDone ? t('result.missionDone', { n: result.missionBonus }) : t('result.missionFail')}
        </p>
        <div class="actions">
          <button class="btn primary" data-act="retry">${t('result.retry')}</button>
          <button class="btn share-btn" data-act="share">${MORE_ICONS.share} ${t('result.share')}</button>
          <button class="btn icon-action" data-act="home" aria-label="${t('result.home')}" title="${t('result.home')}">${MORE_ICONS.home}</button>
        </div>
      </div>
      <p class="toast" role="status"></p>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  // 판이 끝나는 순간 두더지를 두드리던 손가락이 버튼을 잘못 누르지 않도록 0.6초 동안 버튼·등록 카드를 막는다(키 입력은 main.ts)
  el.classList.add('locked');
  setTimeout(() => el.classList.remove('locked'), 600);
  fillThumbs(el);
  countUp(q('.final-score'), result.score);
  if (opts.isRecord) setTimeout(() => confetti(q('.confetti-layer')), 400);

  // 10위 안에 들면 점수 바로 아래에서 이름을 받는다. 등록 대기는 없어서, 올리지 않고 나가려 하면 main.ts 가 leaveRankEntry 로 묻는다
  // 먼저 기기에 남은 순위표로 판단해 바로 보여 주고, 온라인 순위표를 받으면 자리를 다시 맞춘다
  const mode: Mode = opts.daily ? 'daily' : 'classic';
  let entryForm: HTMLElement | null = null;
  const showEntry = (place: number) => {
    // 이미 등록했거나 이름을 치는 중이면 건드리지 않는다
    if (entryForm && (entryForm.classList.contains('done') || entryForm.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT')) return;
    const typed = entryForm?.querySelector('input')?.value;
    const hadFocus = !!entryForm?.contains(document.activeElement);
    entryForm?.remove();
    entryForm =
      place >= 0
        ? rankEntryForm({
            title: t('ranking.enter', { n: place + 1 }),
            name: typed ?? opts.ranking.save.playerName,
            compact: true,
            onSubmit: (name) => opts.ranking.register(mode, name, result.score),
            onView: (at) => openRanking(el, opts.ranking, mode, at),
          })
        : null;
    if (entryForm) q('.kills').before(entryForm);
    // 등록 카드가 있는 동안에는 다음 목표 문구를 빼서 아래쪽 버튼이 잘리지 않게 한다
    el.classList.toggle('has-entry', !!entryForm);
    if (hadFocus) (entryForm?.querySelector<HTMLButtonElement>('[type="submit"]:not(:disabled)') ?? q('[data-act="retry"]')).focus();
  };
  showEntry(opts.ranking.consider(mode, result.score));
  opts.ranking.refresh(mode).then((ok) => ok && el.isConnected && showEntry(opts.ranking.consider(mode, result.score)));

  q('[data-act="retry"]').addEventListener('click', opts.onRetry);
  q('[data-act="home"]').addEventListener('click', opts.onHome);
  // 공유 시트는 클릭 직후에 열어야 하므로, 점수·별 연출이 끝나면 미리 결과 이미지를 찍어 둔다
  let image: Promise<Blob | null> | null = null;
  const capture = () => (image ??= captureResult(el));
  setTimeout(() => el.isConnected && capture(), 1600);
  const toast = q('.toast');
  const shareBtn = q('[data-act="share"]') as HTMLButtonElement;
  // 결과 캡처 이미지 + 조이필드 설치 주소를 한 번에 보낸다. 결과는 이미지에 다 있으므로 결과 글은 보내지 않는다
  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    toast.textContent = t('toast.preparing');
    const outcome: ShareOutcome = await opts.onShare(await capture());
    toast.textContent = outcome === 'cancelled' ? '' : t(`toast.${outcome}`);
    shareBtn.disabled = false;
  });
  // 이름이 미리 채워져 있으면 Enter 한 번에 등록되도록 등록 버튼에 초점을 둔다(휴대폰 자판이 저절로 뜨지 않게 입력 칸은 피한다)
  const submit = (entryForm as HTMLElement | null)?.querySelector<HTMLButtonElement>('[type="submit"]');
  setTimeout(() => (submit && !submit.disabled ? submit : q('[data-act="retry"]')).focus(), 0);
  return el;
}
