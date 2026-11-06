import type { GameResult } from '../game/engine';
import { bindSettings, choiceGroup, devSection, switchRow } from '@joyfield/shared/settings';
import { ALL_FACES, FACE_SETS, ITEMS, ITEM_FROM, type FaceId, type ItemId } from '../game/faces';
import { cardInfo, faceName, setName } from '../cards';
import { LANGS, getLang, t, type Lang } from '../i18n';
import type { SaveData } from '../storage';
import { cardFlipper, closeButton, html, openModal as openSharedModal, openRanking as openSharedRanking, pauseLayer, rankEntryForm } from '@joyfield/shared/ui';
import { shortDate } from '@joyfield/shared/rank';
import { likeButton } from '@joyfield/shared/likes';
import { boardEntries, type Mode } from '../ranking';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { captureResult, type ShareOutcome } from '../share';
import { CARD_BACK, MASCOT, faceSvg } from './art';
import { ANTIQUE_FRAME } from './frame';
import { confetti, countUp, reducedMotion } from './effects';
import { ICONS, SKIN_ICONS, THEME_ICONS } from './icons';

export type { Mode };

/** 대화상자(공통 @joyfield/shared/ui) */
function openModal(host: HTMLElement, content: HTMLElement, label: string, reopen?: string): () => void {
  return openSharedModal(host, content, label, { reopen });
}

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };
const DEX_TOTAL = FACE_SETS.reduce((n, s) => n + s.faces.length, 0);

/** 작은 카드 그림(도감·결과 화면) */
function miniCard(face: FaceId, opts: { locked?: boolean; isNew?: boolean } = {}): string {
  if (opts.locked) return `<span class="mini-card locked" aria-hidden="true">${CARD_BACK}</span>`;
  return `<span class="mini-card" aria-hidden="true">${faceSvg(face)}${opts.isNew ? '<em>NEW</em>' : ''}</span>`;
}

/** 도감 특수 카드 칸의 황금 카드 그림: 금빛 카드 위 별(실제 황금 카드는 보통 그림이 금빛 카드에 나옴) */
const GOLD_STAR =
  '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill="#f5b301" stroke="#a86b00" stroke-width="3" stroke-linejoin="round"/><path d="M27 21l5-9 3 7" fill="none" stroke="#fff6c2" stroke-width="3" stroke-linecap="round"/></svg>';
const itemSvg = (item: ItemId) => (item === 'gold' ? GOLD_STAR : faceSvg(item));
const itemName = (item: ItemId) => (item === 'gold' ? t('face.gold') : faceName(item));
const ITEM_DESC = { clock: 'item.clock', peek: 'item.peek', gold: 'item.gold' } as const;
/** 특수 카드는 게임판과 같은 바탕(시계·돋보기는 하늘색, 황금은 금빛) */
const itemTone = (item: ItemId) => (item === 'gold' ? 'gold' : 'special');

/* ---------- 시작 화면 ---------- */

type Toggle = 'sound' | 'vibrate';

export interface StartOptions {
  save: SaveData;
  today: string;
  todayLabel: string;
  todaySkin: Skin;
  onPlay: (mode: Mode, from?: number) => void;
  onToggle: (key: Toggle) => void;
  onLang: (lang: Lang) => void;
  /** 시작 화면을 다시 그리고 설정 창을 다시 연다(개발자 모드의 출시 모드 보기를 바꿨을 때) */
  onRefresh: () => void;
  onTheme: (theme: Theme) => void;
  onSkin: (skin: SkinSetting) => void;
  onReset: () => void;
  ranking: RankingView;
  /** 다시 그린 뒤 설정 창을 열어 둘지. 'reset'이면 초기화 완료 문구도 보인다 */
  settings?: 'open' | 'reset';
  settingsFocus?: string;
  /** 페이지에 처음 들어왔을 때만 오프닝 연출을 튼다 */
  opening?: boolean;
}

/** 제목을 한 글자씩 작은 카드에 담아 차례로 뒤집혀 나오게 한다 */
function titleCards(title: string): string {
  let n = 0;
  return title
    .split(' ')
    .map((word) => `<span class="word">${[...word].map((c) => `<span class="tc" style="--i:${n++}"><span class="tc-in">${c}</span></span>`).join('')}</span>`)
    .join(' ');
}

/**
 * 시작 화면 로고 위 작은 시연: 엎어진 카드 세 장이 실제 게임처럼 뒤집힌다
 * (첫 장 → 다른 그림이라 틀림 → 셋째 장이 짝 → 시간 막대가 다시 차오름). 애니메이션은 CSS(.demo)
 */
function heroDemo(): string {
  const card = (n: number, face: FaceId) =>
    `<span class="card demo-card d${n}"><span class="inner"><span class="side back">${CARD_BACK}</span><span class="side front">${faceSvg(face)}</span></span></span>`;
  return `<div class="demo">${card(1, 'hexagon')}${card(2, 'moon')}${card(3, 'hexagon')}<b class="demo-pop">+1.5</b></div><div class="demo-timer"><i></i></div>`;
}

/**
 * 판 바로가기(Joyfield.devJump: 개발자 모드이고 "출시 화면" 보기가 꺼져 있을 때, 정식 공개 뒤에도 보임): 설정 창 맨 위 TEST 칸의 "N판부터 바로 시작" 단추(클래식, 기록·랭킹에 안 남음)
 */
const STAGE_JUMP = () => !__JOYFIELD_PROD__ && Joyfield.devJump();

export function startScreen(opts: StartOptions): HTMLElement {
  const { save } = opts;
  const dailyBest = save.daily?.date === opts.today ? save.daily.best : 0;
  const el = html(`
    <main class="screen start">
      <nav class="jp-topbar" aria-label="${t('app.title')}">
        <div class="jp-topbar-group">
          <a class="jp-top-btn hub-btn" href="../../" aria-label="${t('nav.hub')}" title="${t('nav.hub')}">${Joyfield.topIcon('apps')}</a>
        </div>
        <div class="jp-topbar-group">
          <button class="jp-top-btn rank-btn" data-ranking aria-label="${t('ranking.open')}" title="${t('ranking.open')}">${Joyfield.topIcon('trophy')}</button>
          <button class="jp-top-btn settings-btn" aria-label="${t('settings.open')}" title="${t('settings.open')}">${Joyfield.topIcon('gear')}</button>
        </div>
      </nav>
      <div class="col main-col">
        <div class="hero" aria-hidden="true">${heroDemo()}</div>
        <h1 aria-label="${t('app.title')}"><span aria-hidden="true">${titleCards(t('app.title'))}</span></h1>
        <p class="tagline">${t('app.tagline')}</p>
      </div>
      <div class="col side-col">
        <div class="modes">
          <button class="btn primary big" data-mode="classic">${t('start.classic')}</button>
          <button class="btn daily" data-mode="daily">
            <span class="cal" aria-hidden="true"><i></i><b>${Number(opts.today.slice(-2))}</b></span>
            <span class="daily-text">${t('start.daily')} <small>${t('start.dailySub', { date: opts.todayLabel })}</small></span>
            <span class="go">${ICONS.arrow}</span>
          </button>
        </div>
        <p class="best">${t('start.best', { best: save.best, stage: save.bestStage })}<br>${t('start.bestDaily', { daily: dailyBest })}</p>
        <button class="btn dex-btn" data-dex aria-label="${t('dex.open')}">${ICONS.album}<span>${t('dex.title')}</span><b>${save.dex.length}/${DEX_TOTAL}</b></button>
        <p class="hint">${t('start.hint')}</p>
      </div>
    </main>`);

  if (opts.opening) {
    el.classList.add('opening');
    el.addEventListener('pointerdown', () => el.classList.remove('opening'), { once: true });
  }

  // 제목 글자 카드는 눌러서 뒤집어 볼 수 있다(장식, 점수 없음)
  el.querySelectorAll<HTMLElement>('.tc').forEach((tc) =>
    tc.addEventListener('pointerdown', () => {
      tc.classList.remove('spin');
      void tc.offsetWidth;
      tc.classList.add('spin');
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => opts.onPlay(b.dataset.mode as Mode)));
  // 위 메뉴 조이필드 버튼 옆 좋아요(조이필드 공통, 기준서 1.13). 언어는 기기 언어로 정해지고 설정 창에서 바꾼다
  el.querySelector('.hub-btn')!.after(likeButton('timetoflip'));
  el.querySelector('[data-dex]')!.addEventListener('click', () => openDex(el, save));
  // 처음 탭은 조이필드 공통 기준: 최근 모드(방금 한 판·마지막으로 본 탭) → 클래식
  const rankBtn = el.querySelector('[data-ranking]')!;
  rankBtn.addEventListener('click', () => openRanking(el, opts.ranking, Joyfield.rankTab('timetoflip', ['classic', 'daily'], 'classic') as Mode, null));
  // 오프라인이면 판을 시작하기 전에 랭킹에 올릴 수 없음을 알린다(조이필드 공통, 기준서 1.6)
  Joyfield.offlineMark(rankBtn, t('ranking.offlineBadge'));
  const showSettings = (reopen?: string) => openModal(el, settingsPanel(opts), t('settings.title'), reopen);
  el.querySelector('.settings-btn')!.addEventListener('click', () => showSettings());
  if (opts.settings) queueMicrotask(() => showSettings(opts.settingsFocus ?? (opts.settings === 'reset' ? '[data-reset]' : '[aria-checked="true"]')));
  return el;
}

/* ---------- 도감 ---------- */

/**
 * 도감: 위 가운데 큰 카드(처음엔 뒷면) + 그 아래 설명, 아래쪽에 묶음별 작은 카드, 맨 아래 특수 카드 칸(시계·돋보기·황금, 모으는 수에는 넣지 않음).
 * 작은 카드를 누르면 큰 카드가 뒤집혀 그 그림으로 바뀌고 제목·작가·설명이 나온다.
 * 큰 카드·설명 칸은 크기를 고정해(설명은 최대 4줄) 글 길이가 달라도 화면이 덜컥이지 않는다
 */
/**
 * 출시 전 확인용: 개발자 모드 + 미리보기 배포일 때만(정식 공개하면 사라짐) 도감 48장을 모두 연 것처럼 보여 준다(저장된 기록은 그대로)
 */
const DEX_ALL_OPEN = () => !__JOYFIELD_PROD__ && Joyfield.devTools();

function openDex(host: HTMLElement, save: SaveData): void {
  const found = new Set<FaceId>(DEX_ALL_OPEN() ? ALL_FACES : save.dex);
  const itemsFound = new Set<ItemId>(DEX_ALL_OPEN() ? ITEMS : save.items);
  const box = html(`
    <div class="dex">
      ${closeButton()}
      <h2>${ICONS.album} ${t('dex.title')} <small>${found.size}/${DEX_TOTAL}</small></h2>
      <div class="dex-stage">
        <div class="dex-big" aria-hidden="true">
          <span class="dex-flip"><span class="side back">${CARD_BACK}</span><span class="side front"></span></span>
          ${ANTIQUE_FRAME}
        </div>
        <div class="dex-info" aria-live="polite">
          <p class="dex-title">${t('dex.pickTitle')}</p>
          <p class="dex-by">&nbsp;</p>
          <p class="dex-desc">${t('dex.pick')}</p>
        </div>
      </div>
      <div class="dex-sets">
        ${FACE_SETS.map(
          (s, i) => `<section>
            <h3>${s.faces.some((f) => found.has(f)) ? setName(s.id) : '???'} <small>${t('dex.from', { n: i + 1 })}</small></h3>
            <ul>${s.faces
              .map((f) => {
                const label = found.has(f) ? faceName(f) : `??? — ${t('dex.locked')}`;
                return `<li><button class="dex-item" type="button" data-face="${f}" data-stage="${i + 1}" aria-pressed="false" aria-label="${label}">${miniCard(f, found.has(f) ? {} : { locked: true })}</button></li>`;
              })
              .join('')}</ul>
          </section>`,
        ).join('')}
        <section class="dex-specials">
          <h3>${t('dex.items')} <small>${t('dex.from', { n: ITEM_FROM })}</small></h3>
          <ul>${ITEMS.map((i) => {
            const open = itemsFound.has(i);
            const label = open ? itemName(i) : `??? — ${t('dex.locked')}`;
            const card = open ? `<span class="mini-card ${itemTone(i)}" aria-hidden="true">${itemSvg(i)}</span>` : miniCard('circle', { locked: true });
            return `<li><button class="dex-item" type="button" data-item="${i}" aria-pressed="false" aria-label="${label}">${card}</button></li>`;
          }).join('')}</ul>
        </section>
      </div>
    </div>`);

  const flip = box.querySelector<HTMLElement>('.dex-flip')!;
  const front = flip.querySelector<HTMLElement>('.front')!;
  const info = box.querySelector<HTMLElement>('.dex-info')!;
  const [title, by, desc] = [...info.children] as HTMLElement[];
  let selected: HTMLButtonElement | null = null;
  let turns = 0;
  // 큰 카드 뒤집기는 조이필드 공통(@joyfield/shared/ui cardFlipper, 온실정원 도감과 같음)
  const flipTo = cardFlipper(flip, { reduced: () => reducedMotion.matches });

  const show = (item: HTMLButtonElement) => {
    if (item === selected) return;
    selected?.setAttribute('aria-pressed', 'false');
    item.setAttribute('aria-pressed', 'true');
    selected = item;
    const face = item.dataset.face as FaceId | undefined;
    const special = item.dataset.item as ItemId | undefined;
    const open = face ? found.has(face) : itemsFound.has(special!);
    // 새 그림은 미리 만들어 디코딩까지 끝낸 뒤 갈아 끼운다(끼우는 순간 빈 칸이 한 번 비치던 깜박임 방지)
    const next = document.createElement('template');
    next.innerHTML = !open ? '' : face ? faceSvg(face) : itemSvg(special!);
    const img = next.content.querySelector('img');
    const turn = ++turns;
    const apply = () => {
      front.replaceChildren(next.content);
      front.className = `side front${open && special ? ` ${itemTone(special)}` : ''}`;
      const text = !open ? null : face ? cardInfo(face) : { title: itemName(special!), by: t('dex.itemKind'), desc: t(ITEM_DESC[special!]) };
      title.textContent = text ? text.title : '???';
      by.textContent = text ? text.by : t('dex.locked');
      desc.textContent = text ? text.desc : face ? t('dex.lockedDesc', { n: Number(item.dataset.stage) }) : t('dex.itemLocked', { n: ITEM_FROM });
    };
    const run = () => {
      // 그림을 준비하는 사이 다른 카드를 눌렀으면 이 차례는 버린다
      if (turn !== turns) return;
      flipTo(open, apply);
    };
    if (img) img.decode().then(run, run);
    else run();
  };
  box.querySelectorAll<HTMLButtonElement>('.dex-item').forEach((b) => b.addEventListener('click', () => show(b)));
  openModal(host, box, t('dex.title'));
}

/* ---------- 설정 ---------- */

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
        // 개발자 모드: 판 바로가기(정식 공개 뒤에도)·출시 화면 단추. 테스트할 때 바로 누르도록 설정 창 맨 위에 둔다
        !__JOYFIELD_PROD__ && Joyfield.devMode()
          ? devSection({
              note: STAGE_JUMP() ? t('test.jump') : undefined,
              tools: STAGE_JUMP() ? `<div class="stage-jump" role="group" aria-label="${t('test.jump')}">${[2, 3, 4, 5, 6, 7, 8].map((n) => `<button type="button" data-from="${n}">${n}</button>`).join('')}</div>` : undefined,
              release: { on: Joyfield.releaseView(), label: Joyfield.releaseView() ? t('test.devView') : t('test.releaseView') },
            })
          : ''
      }
      <section>
        <h3>${t('theme.label')}</h3>
        ${choiceGroup('theme', THEMES.map((th) => ({ value: th, label: t(`theme.${th}`), icon: THEME_ICONS[th] })), save.theme, { label: t('theme.label') })}
      </section>
      <section>
        <h3>${t('lang.label')}</h3>
        ${choiceGroup('lang', LANGS.map((l) => ({ value: l, label: LANG_LABEL[l], lang: l })), lang, { label: t('lang.label') })}
      </section>
      <section>
        <h3>${t('skin.label')}</h3>
        ${choiceGroup('skin', SKIN_SETTINGS.map((s) => ({ value: s, label: t(`skin.${s}`), icon: SKIN_ICONS[s], title: t(`skin.${s}`) })), save.skin, { cls: 'skins', label: t('skin.label') })}
        <p class="note">${t('skin.autoHint', { skin: t(`skin.${opts.todaySkin}`) })}</p>
      </section>
      <section>
        <h3>${t('settings.feedback')}</h3>
        <div class="jp-switches">
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
      <p class="app-version">${t('settings.version')} v${__APP_VERSION__}</p>
      <p class="app-copyright">${Joyfield.COPYRIGHT}</p>
    </div>`);

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
  // 개발자 모드: 출시 모드 보기 ↔ 개발 기능 보기(판별 바로 시작·도감 전부 열기를 숨기거나 다시 보임)
  if (!__JOYFIELD_PROD__)
    el.querySelector('[data-release]')?.addEventListener('click', () => {
      Joyfield.setReleaseView(!Joyfield.releaseView());
      opts.onRefresh();
    });
  if (!__JOYFIELD_PROD__)
    el.querySelectorAll<HTMLButtonElement>('[data-from]').forEach((b) => b.addEventListener('click', () => opts.onPlay('classic', Number(b.dataset.from))));
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
  register: (mode: Mode, name: string, score: number, stage: number) => Promise<number>;
}

/**
 * 랭킹 창(공통 모양 @joyfield/shared/ui). 클래식·오늘의 챌린지 순위표를 탭으로 바꿔 본다(등록은 결과 화면에서만).
 * 줄마다 도달한 판을 함께 보인다. mark는 방금 올린 순위(0부터)로, 그 줄을 강조한다
 */
function openRanking(host: HTMLElement, view: RankingView, start: Mode, mark: number | null): void {
  const { save } = view;
  const tab = (mode: Mode, label: string, note: () => string) => ({
    id: mode,
    label,
    note,
    listClass: mode === 'classic' ? 'with-date' : undefined,
    columns: [{ cls: 'stage' }, { cls: 'score', empty: '-' }, ...(mode === 'classic' ? [{ cls: 'date' }] : [])],
    rows: () =>
      boardEntries(save.rankings, mode, view.today).map((e) => ({
        name: e.name,
        dev: e.dev,
        cells: [t('ranking.stage', { n: e.stage }), e.score.toLocaleString(), ...(mode === 'classic' ? [shortDate(e.date)] : [])],
      })),
    refresh: () => view.refresh(mode),
  });
  openSharedRanking(host, {
    gameId: 'timetoflip',
    start,
    mark,
    tabs: [
      tab('classic', t('mode.classic'), () => t('ranking.classicNote')),
      tab('daily', t('ranking.daily'), () => t('ranking.dailyNote', { date: view.todayLabel })),
    ],
  });
}

/* ---------- 게임 화면 ---------- */

export interface GameView {
  el: HTMLElement;
  stage: HTMLElement;
  board: HTMLElement;
  hud: {
    stage: HTMLElement;
    score: HTMLElement;
    combo: HTMLElement;
    bar: HTMLElement;
    time: HTMLElement;
    mascot: HTMLElement;
  };
  /** 판 시작 안내(판 이름·큰 안내 한 줄·경고(있는 판만)·3, 2, 1). 카드가 뒷면일 때만 판 가운데에 보인다 */
  showCountdown(info: { stage: string; time: string; note: string; warn: string } | null, n?: number): void;
  showPause(show: boolean): void;
  showMessage(text: string | null, variant?: string): void;
}

export function gameScreen(opts: { daily: boolean; onPause: () => void; onResume: () => void; onQuit: () => void }): GameView {
  const el = html(`
    <main class="screen game${opts.daily ? ' daily' : ''}">
      <div class="hud">
        <button class="pause-btn hud-btn" aria-label="${t('hud.pause')}" title="${t('hud.pause')}">${ICONS.pause}</button>
        <p class="hud-stage" aria-live="polite"></p>
        <p class="hud-combo" aria-hidden="true"></p>
        <p class="hud-score" aria-label="${t('hud.score')}"><small aria-hidden="true">${t('hud.score')}</small><b>0</b></p>
        <div class="timer" role="timer" aria-label="${t('hud.time')}">
          <div class="timer-rail">
            <div class="timer-track"><div class="timer-bar"></div></div>
            <span class="mascot">${MASCOT}</span>
          </div>
          <span class="time-card">
            <b class="timer-text"></b>
            <span class="time-back" aria-hidden="true"><svg viewBox="0 0 40 20" focusable="false"><path d="M12 7.5h5M14.5 5v5" stroke="#3d2a00" stroke-width="1.8" stroke-linecap="round"/><circle cx="26" cy="7.5" r="1.8" fill="#3d2a00"/><path d="M14 12.5q6 5 12 0" fill="none" stroke="#3d2a00" stroke-width="1.8" stroke-linecap="round"/></svg></span>
          </span>
        </div>
      </div>
      <div class="stage">
        <div class="board-wrap"><div class="board" role="group"></div></div>
        <div class="fx-layer" aria-hidden="true"></div>
        <div class="banners" aria-live="polite"></div>
        <div class="countdown" hidden><p class="cd-stage"></p><p class="cd-time"></p><p class="cd-note"></p><p class="cd-warn"></p><b class="cd-num" aria-hidden="true"></b></div>
        <div class="message" hidden></div>
        <div class="pause-menu" hidden>
          <h2>${t('pause.title')}</h2>
          <p class="pause-note">${t('pause.note')}</p>
          <button class="btn primary" data-act="resume">${t('pause.resume')}</button>
          <button class="btn" data-act="quit">${t('pause.quit')}</button>
        </div>
      </div>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  const showPauseLayer = pauseLayer(q('.pause-menu'));
  const message = q('.message');
  const countdown = q('.countdown');
  let shownNum = -1;
  q('.pause-btn').addEventListener('click', opts.onPause);
  q('[data-act="resume"]').addEventListener('click', opts.onResume);
  q('[data-act="quit"]').addEventListener('click', opts.onQuit);
  return {
    el,
    stage: q('.stage'),
    board: q('.board'),
    hud: {
      stage: q('.hud-stage'),
      score: q('.hud-score b'),
      combo: q('.hud-combo'),
      bar: q('.timer-bar'),
      time: q('.timer-text'),
      mascot: q('.timer .mascot'),
    },
    showCountdown(info, n = 0) {
      if (info === null) {
        countdown.hidden = true;
        shownNum = -1;
        return;
      }
      if (countdown.hidden) {
        countdown.hidden = false;
        q('.cd-stage').textContent = info.stage;
        q('.cd-time').textContent = info.time;
        q('.cd-note').textContent = info.note;
        q('.cd-warn').textContent = info.warn;
        q('.cd-warn').hidden = !info.warn;
      }
      if (n === shownNum) return;
      shownNum = n;
      const num = q('.cd-num');
      num.textContent = n ? String(n) : '';
      // 숫자가 바뀔 때마다 톡 튀어나온다(styles.css .cd-num.pop)
      num.classList.remove('pop');
      void num.offsetWidth;
      if (n) num.classList.add('pop');
    },
    showPause(show) {
      showPauseLayer(show);
      el.classList.toggle('paused', show);
    },
    showMessage(text, variant = '') {
      message.hidden = text === null;
      if (text === null) return;
      message.className = `message ${variant}`;
      message.textContent = text;
      message.classList.remove('pop');
      void message.offsetWidth;
      message.classList.add('pop');
    },
  };
}

/* ---------- 결과 화면 ---------- */

export interface Goal {
  type: 'first' | 'record' | 'gap' | 'pairs' | 'dex';
  n: number;
  next?: number;
}

function goalText(goal: Goal): string {
  if (goal.type === 'pairs') return t('goal.pairs', { n: goal.n, next: goal.next ?? 0 });
  if (goal.type === 'dex') return t('goal.dex', { n: goal.n, total: DEX_TOTAL });
  return t(`goal.${goal.type}`, { n: goal.n });
}

export function resultScreen(opts: {
  result: GameResult;
  daily: boolean;
  isRecord: boolean;
  newFaces: FaceId[];
  goal: Goal;
  /** 출시 전 확인용 바로 시작으로 한 판(랭킹 등록 안 받음) */
  test?: boolean;
  onRetry: () => void;
  onHome: () => void;
  onShare: (image: Blob | null) => Promise<ShareOutcome>;
  ranking: RankingView;
}): HTMLElement {
  const { result } = opts;
  const shown = [...opts.newFaces, ...result.faces.filter((f) => !opts.newFaces.includes(f))].slice(0, 8);
  const el = html(`
    <main class="screen result">
      <div class="confetti-layer" aria-hidden="true"></div>
      <div class="col main-col">
        <p class="mode">${opts.daily ? t('start.daily') : t('mode.classic')}</p>
        <div class="hero result-logo" aria-hidden="true">${heroDemo()}</div>
        <h1 class="result-title" aria-label="${t('app.title')}"><span aria-hidden="true">${titleCards(t('app.title'))}</span></h1>
        <p class="final">${t('result.final')}</p>
        ${opts.isRecord ? `<p class="record">${t('result.record')}</p>` : ''}
        <dl class="numbers">
          <div><dt>${t('result.stage')}</dt><dd>${t('result.stageValue', { n: result.stage })}</dd></div>
          <div><dt>${t('result.pairs')}</dt><dd>${result.pairs}</dd></div>
          <div><dt>${t('result.maxCombo')}</dt><dd>${result.maxCombo}</dd></div>
          <div><dt>${t('result.accuracy')}</dt><dd>${Math.round(result.accuracy * 100)}%</dd></div>
        </dl>
      </div>
      <div class="col side-col">
        ${shown.length ? `<ul class="faces" aria-label="${t('result.newCards')}">${shown.map((f) => `<li aria-label="${faceName(f)}">${miniCard(f, { isNew: opts.newFaces.includes(f) })}</li>`).join('')}</ul>` : ''}
        <p class="goal">${goalText(opts.goal)}</p>
        <div class="actions">
          <button class="btn primary big" data-act="retry">${t('result.retry')}</button>
          <div class="row">
            <button class="btn share-btn" data-act="share">${ICONS.share} ${t('result.share')}</button>
            <button class="btn icon-action" data-act="home" aria-label="${t('result.home')}" title="${t('result.home')}">${ICONS.home}</button>
          </div>
        </div>
      </div>
      <p class="toast" role="status"></p>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  // 판이 끝나는 순간 카드를 누르던 손가락이 버튼을 잘못 누르지 않도록 0.6초 동안 막는다(키 입력은 main.ts)
  el.classList.add('locked');
  setTimeout(() => el.classList.remove('locked'), 600);
  countUp(q('.final-score'), result.score);
  if (opts.isRecord) setTimeout(() => confetti(q('.confetti-layer')), 400);

  // 10위 안에 들면 점수 바로 아래에서 이름을 받는다. 등록 대기는 없어서, 올리지 않고 나가려 하면 main.ts 가 leaveRankEntry 로 묻는다.
  // 먼저 기기에 남은 순위표로 판단해 바로 보여 주고, 온라인 순위표를 받으면 자리를 다시 맞춘다
  const mode: Mode = opts.daily ? 'daily' : 'classic';
  let entryForm: HTMLElement | null = null;
  const showEntry = (place: number) => {
    if (entryForm && (entryForm.classList.contains('done') || (entryForm.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT'))) return;
    const typed = entryForm?.querySelector('input')?.value;
    const hadFocus = !!entryForm?.contains(document.activeElement);
    entryForm?.remove();
    entryForm =
      place >= 0
        ? rankEntryForm({
            title: t('ranking.enter', { n: place + 1 }),
            name: typed ?? opts.ranking.save.playerName,
            compact: true,
            onSubmit: (name) => opts.ranking.register(mode, name, result.score, result.stage),
            onView: (at) => openRanking(el, opts.ranking, mode, at),
          })
        : null;
    if (entryForm) q('.numbers').before(entryForm);
    // 등록 카드가 있는 동안에는 모은 카드·다음 목표를 빼서 아래쪽 버튼이 잘리지 않게 한다
    el.classList.toggle('has-entry', !!entryForm);
    if (hadFocus) (entryForm?.querySelector<HTMLButtonElement>('[type="submit"]:not(:disabled)') ?? q('[data-act="retry"]')).focus();
  };
  // 출시 전 확인용 바로 시작 판은 랭킹 등록을 받지 않는다
  if (!opts.test) {
    showEntry(opts.ranking.consider(mode, result.score));
    void opts.ranking.refresh(mode).then((ok) => ok && el.isConnected && showEntry(opts.ranking.consider(mode, result.score)));
  }

  q('[data-act="retry"]').addEventListener('click', opts.onRetry);
  q('[data-act="home"]').addEventListener('click', opts.onHome);
  // 공유 시트는 클릭 직후에 열어야 하므로, 점수 연출이 끝나면 미리 결과 이미지를 찍어 둔다
  let image: Promise<Blob | null> | null = null;
  const capture = () => (image ??= captureResult(el));
  setTimeout(() => el.isConnected && capture(), 1600);
  const toast = q('.toast');
  const shareBtn = q('[data-act="share"]') as HTMLButtonElement;
  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    toast.textContent = t('toast.preparing');
    const outcome = await opts.onShare(await capture());
    toast.textContent = outcome === 'cancelled' ? '' : t(`toast.${outcome}`);
    shareBtn.disabled = false;
  });
  // 이름이 미리 채워져 있으면 Enter 한 번에 등록되도록 등록 버튼에 초점을 둔다(휴대폰 자판이 저절로 뜨지 않게 입력 칸은 피한다)
  const submit = (entryForm as HTMLElement | null)?.querySelector<HTMLButtonElement>('[type="submit"]');
  setTimeout(() => (submit && !submit.disabled ? submit : q('[data-act="retry"]')).focus(), 0);
  return el;
}
