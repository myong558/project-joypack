import { bindSettings, choiceGroup, devSection, switchRow } from '@joyfield/shared/settings';
import { FLOWER, FLOWERS, type Flower, type FlowerId } from '../flora';
import { LEVELS, levelName } from '../game/levels';
import { LANGS, getLang, iga, t, type Lang } from '../i18n';
import { cardFlipper, closeButton, html, openModal as openSharedModal, openRanking as openSharedRanking, pauseLayer, rankEntryForm } from '@joyfield/shared/ui';
import { shortDate } from '@joyfield/shared/rank';
import { clock, type DailyEntry, type DailyRecord } from '../ranking';
import { captureResult, type ShareOutcome } from '../share';
import { flowerCount, gardenScore, nextLevel, petalCount, type SaveData } from '../storage';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { countUp, reducedMotion } from './effects';
import { GARDENER, POT } from './board';
import { flowerSvg } from './flowers';
import { ICONS, SUN_ICON, SKIN_ICONS, THEME_ICONS } from './icons';

/** 대화상자(공통 @joyfield/shared/ui). kind 는 .modal 에 더할 클래스(창 크기 고정 등) */
function openModal(host: HTMLElement, content: HTMLElement, label: string, reopen?: string, kind = ''): () => void {
  return openSharedModal(host, content, label, { reopen, kind: kind || undefined });
}

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };


/**
 * 봉오리를 delay 뒤에 피우고, 다 핀 뒤(openMs: 꽃잎이 벌어지는 시간 + 꽃잎마다 늦게 시작하는 시간) 판과 같은 마무리 동작(styles.css .fl.flourish).
 * 도감 큰 카드 2.2초 · 결과 카드 1.8초(styles.css .fl .pt), 꽃잎마다 늦게 시작하는 시간은 꽃에 따라 0~0.95초
 */
function bloomThenFlourish(fl: Element | null, delay: number, openMs: number): void {
  if (!fl) return;
  setTimeout(() => {
    fl.classList.remove('closed');
    setTimeout(() => fl.classList.add('flourish'), reducedMotion.matches ? 0 : openMs);
  }, delay);
}
const text = (f: Flower) => f[getLang()];
/** 꽃잎 표시(꽃잎 3장 중 받은 만큼 채움) */
/** 이어 가꾸기 단추 옆 표시: 몇 번째 꽃인지 번호 + 그 꽃 이름("7 · 물망초") */
const levelTag = (i: number) => `${i + 1} · ${text(FLOWER[LEVELS[i].flower]).name}`;

const petalRow = (n: number) => `<span class="petals" role="img" aria-label="${t('pick.cleared', { p: n })}">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

/**
 * 판 바로가기(Joyfield.devJump: 개발자 모드이고 "출시 화면" 보기가 꺼져 있을 때, 정식 공개 뒤에도 보임):
 * 정원 24개를 모두 연 것처럼 고를 수 있고, 도감도 모든 쪽이 열려 보인다(저장된 기록은 그대로, 바로 연 판의 기록은 남지 않음)
 */
export const ALL_OPEN = () => !__JOYFIELD_PROD__ && Joyfield.devJump();

/** 판을 고를 수 있는지: 첫 판이거나 앞 판을 깼을 때 */
export const unlocked = (save: SaveData, i: number) => ALL_OPEN() || i === 0 || !!save.levels[i - 1] || !!save.levels[i];

/**
 * 로고 = 게임 시연(실제 규칙대로)이 든 4×2 작은 온실. 위 줄은 네 칸을 덮는 막돌 블록 한 장에 게임 이름을 새긴 간판(판 벽과 같은 돌, 스킨마다 바뀜), 아래 줄은 빈칸 → 정원사 → 화분 → 창 칸(게임 판의 벽·창 칸과 같은 그림).
 * 정원사가 화분을 한 칸 밀어 창 바로 앞 햇살 자리에 넣으면 화분 바닥이 빛나고 튤립 꽃잎이 천천히 벌어진다. 8초 반복, 움직임은 CSS(.demo)
 */
function heroDemo(): string {
  return `<div class="demo">
    <span class="d-sign"><b>${t('app.title')}</b></span>
    <i class="d-wall"><i class="d-win"></i></i><i class="d-beam"></i><i class="d-ray"></i>
    <span class="d-pot"><span class="glow"></span><span class="plant">${flowerSvg('tulip', false, 'game')}</span>${POT}</span>
    <span class="d-man">${GARDENER}</span>
  </div>`;
}

function logo(cls = ''): string {
  return `<div class="logo ${cls}" aria-hidden="true">${heroDemo()}</div>`;
}

/* ---------- 시작 화면 ---------- */

type Toggle = 'sound' | 'vibrate';

export interface StartOptions {
  save: SaveData;
  todaySkin: Skin;
  onPlay: (level: number) => void;
  onDaily: () => void;
  onToggle: (key: Toggle) => void;
  onLang: (lang: Lang) => void;
  /** 시작 화면을 다시 그린다. settings 면 설정 창을 다시 연다(출시 화면 보기 전환 뒤) */
  onRefresh: (settings?: boolean) => void;
  onTheme: (theme: Theme) => void;
  onSkin: (skin: SkinSetting) => void;
  onReset: () => void;
  onDexSeen: (page: number) => void;
  ranking: RankingView;
  settings?: 'open' | 'reset';
  settingsFocus?: string;
  opening?: boolean;
}

export function startScreen(opts: StartOptions): HTMLElement {
  const { save } = opts;
  const lang = getLang();
  const otherLang = LANGS.find((l) => l !== lang)!;
  const next = nextLevel(save);
  const today = opts.ranking.today();
  const best = save.daily?.date === today ? save.daily : null;
  const newPages = save.levels.filter((r, i) => r && !save.seen.includes(i)).length;
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
        ${logo()}
        <h1 class="sr-only">${t('app.title')}</h1>
        <p class="tagline">${t('app.tagline')}</p>
      </div>
      <div class="col side-col">
        <button class="btn primary big" data-play>
          ${next < 0 ? t('start.allDone') : `<span>${next === 0 ? t('start.play') : t('start.continue')}</span><small>${levelTag(next)}</small>`}
        </button>
        <button class="btn daily-btn" data-daily>
          ${ICONS.calendar}<span class="daily-text"><b>${t('start.daily')}</b><small>${
            best ? t('start.dailyBest', { moves: best.moves, time: clock(best.time) }) : t('start.dailySub')
          }</small></span>${ICONS.arrow}
        </button>
        <div class="row two">
          <button class="btn pic-btn" data-pick>${ICONS.garden}<span>${t('start.pick')}</span></button>
          <button class="btn pic-btn dex-btn" data-dex aria-label="${t('dex.open')}">${ICONS.book}<span>${t('dex.title')}</span>${newPages ? `<em title="NEW">N</em>` : ''}</button>
        </div>
        <p class="best">${t('start.score', { score: gardenScore(save) })}<br>${t('start.progress', { n: flowerCount(save), p: petalCount(save) })}</p>
        <p class="hint">${t('start.hint')}</p>
      </div>
    </main>`);

  if (opts.opening) {
    el.classList.add('opening');
    el.addEventListener('pointerdown', () => el.classList.remove('opening'), { once: true });
  }
  el.querySelector('[data-play]')!.addEventListener('click', () => (next < 0 ? openPicker(el, save, opts.onPlay) : opts.onPlay(next)));
  el.querySelector('[data-pick]')!.addEventListener('click', () => openPicker(el, save, opts.onPlay));
  el.querySelector('[data-daily]')!.addEventListener('click', opts.onDaily);
  el.querySelector('.top-lang')!.addEventListener('click', () => opts.onLang(otherLang));
  el.querySelector('[data-dex]')!.addEventListener('click', () => {
    el.querySelector('.dex-btn em')?.remove();
    openDex(el, save, null, opts.onDexSeen);
  });
  const rankBtn = el.querySelector('[data-ranking]')!;
  rankBtn.addEventListener('click', () => openRanking(el, opts.ranking, null));
  // 오프라인이면 판을 시작하기 전에 랭킹에 올릴 수 없음을 알린다(조이필드 공통, 기준서 1.6)
  Joyfield.offlineMark(rankBtn, t('ranking.offlineBadge'));
  const showSettings = (reopen?: string) => openModal(el, settingsPanel(opts), t('settings.title'), reopen);
  el.querySelector('.settings-btn')!.addEventListener('click', () => showSettings());
  if (opts.settings) queueMicrotask(() => showSettings(opts.settingsFocus ?? (opts.settings === 'reset' ? '[data-reset]' : '[aria-checked="true"]')));
  return el;
}

/* ---------- 꽃 고르기 ---------- */

/**
 * 꽃 고르기: 판 24개를 꽃 카드로(계절 구분 없이). 핀 꽃은 그 꽃이 핀 그림·이름·꽃잎, 다음에 피울 꽃은 봉오리와 이름,
 * 아직 안 열린 꽃은 자물쇠만. 꽃을 보고 다시 피울 꽃을 고른다
 */
function openPicker(host: HTMLElement, save: SaveData, onPlay: (level: number) => void): void {
  const box = html(`
    <div class="picker">
      ${closeButton()}
      <h2>${ICONS.garden} ${t('pick.title')} <small>${save.levels.filter(Boolean).length}/${LEVELS.length}</small></h2>
      <p class="pick-hint">${t('pick.petalHint')}<br>${t('pick.petalHint2')}</p>
      <ul class="gardens">${LEVELS.map((lv, i) => {
        const rec = save.levels[i];
        const open = unlocked(save, i);
        const name = text(FLOWER[lv.flower]).name;
        const label = open ? t('pick.level', { name: levelName(i), flower: name, state: rec ? t('pick.cleared', { p: rec.petals }) : t('pick.open') }) : `${levelName(i)} — ${t('pick.locked')}`;
        return `<li><button type="button" class="tile-btn${rec ? ' done' : ''}${open && !rec ? ' next' : ''}" data-level="${i}" ${open ? '' : 'disabled'} aria-label="${label}">
          <b>${i + 1}</b>
          <span class="mini">${rec || ALL_OPEN() ? flowerSvg(lv.flower, true, 'game') : open ? flowerSvg(lv.flower, false, 'game') : ICONS.lock}</span>
          <span class="name">${open ? name : '?'}</span>
          ${rec ? petalRow(rec.petals) : '<span class="petals ghost" aria-hidden="true"><i></i><i></i><i></i></span>'}
        </button></li>`;
      }).join('')}</ul>
    </div>`);
  const close = openModal(host, box, t('pick.title'), undefined, 'wide pick-modal');
  box.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((b) =>
    b.addEventListener('click', () => {
      close();
      onPlay(Number(b.dataset.level));
    }),
  );
  // 다음에 할 판에 초점(키보드로 바로 Enter)
  const next = nextLevel(save);
  box.querySelector<HTMLButtonElement>(`[data-level="${next < 0 ? 0 : next}"]`)?.focus();
}

/* ---------- 식물 도감(큰 카드 + 작은 카드 24장) ---------- */

const monthsText = (f: Flower) => (f.months[0] === f.months[1] ? t('dex.month', { a: f.months[0] }) : t('dex.months', { a: f.months[0], b: f.months[1] }));

// 카드 뒷면: 초록 온실 벽의 아치 창(반원 밑과 아래를 같은 높이로 나눈 창살)으로 햇살이 들어 바닥에 비스듬히 비친다
const DEX_BACK = `<svg viewBox="0 0 100 128" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="dxb-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46785a"/><stop offset="1" stop-color="#23402d"/></linearGradient><radialGradient id="dxb-glass" cx=".75" cy=".15" r="1"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffe2a0"/><stop offset="1" stop-color="#f2b866"/></radialGradient><linearGradient id="dxb-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4" stop-opacity=".5"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></linearGradient></defs><rect width="100" height="128" fill="url(#dxb-wall)"/><polygon points="22,96 78,96 56,128 -4,128" fill="url(#dxb-beam)"/><path d="M22 96V50a28 28 0 0 1 56 0v46z" fill="url(#dxb-glass)"/><path d="M22 96V50a28 28 0 0 1 56 0v46zM22 50h56M22 73h56M50 22v74" fill="none" stroke="#5a3d26" stroke-width="2.6" stroke-linejoin="round"/><rect x="17" y="95" width="66" height="4.5" rx="1" fill="#9a7350"/></svg>`;

/**
 * 도감(타임 투 플립 도감과 같은 짜임): 위 가운데 큰 카드(처음엔 뒷면) + 그 아래 설명, 아래쪽에 정원 순서대로 작은 카드 24장.
 * 작은 카드를 누르면 큰 카드가 뒤집혀 그 꽃의 사실적인 도감 그림(flowerSvg 'dex')으로 바뀌고 이름·학명·꽃말·피는 때·원산지·설명이 나온다.
 * 작은 카드는 게임 화분과 같은 약식 그림. 큰 카드·설명 칸은 크기가 고정이라 글 길이가 달라도 덜컥이지 않는다.
 * start 를 주면(결과 화면 "도감") 그 꽃을 펼친 채 연다
 */
export function openDex(host: HTMLElement, save: SaveData, start: number | null, onSeen?: (i: number) => void): void {
  const open = (i: number) => ALL_OPEN() || !!save.levels[i];
  const count = FLOWERS.filter((_, i) => open(i)).length;
  const box = html(`
    <div class="dex">
      ${closeButton()}
      <h2>${ICONS.book} ${t('dex.title')} <small>${count}/${FLOWERS.length}</small></h2>
      <div class="dex-stage">
        <div class="dex-big" aria-hidden="true">
          <span class="dex-flip"><span class="side back">${DEX_BACK}</span><span class="side front"></span></span>
        </div>
        <div class="dex-info" aria-live="polite">
          <p class="dex-title">${t('dex.pickTitle')}</p>
          <p class="dex-by">&nbsp;</p>
          <p class="dex-facts">&nbsp;</p>
          <p class="dex-desc">${t('dex.pick')}</p>
        </div>
      </div>
      <div class="dex-sets">
        <ul>${FLOWERS.map((f, i) => {
          const label = open(i) ? text(f).name : `${levelName(i)} — ${t('dex.locked')}`;
          const fresh = !!save.levels[i] && !save.seen.includes(i);
          return `<li><button class="dex-item${open(i) ? '' : ' locked'}${fresh ? ' new' : ''}" type="button" data-i="${i}" aria-pressed="false" aria-label="${label}">${open(i) ? flowerSvg(f.id, true, 'game') : ICONS.lock}</button></li>`;
        }).join('')}</ul>
      </div>
    </div>`);

  const flip = box.querySelector<HTMLElement>('.dex-flip')!;

  // 큰 카드 뒤집기는 조이필드 공통(@joyfield/shared/ui cardFlipper, 타임 투 플립 도감과 같음). 다 뒤집힌 앞면은 3D 를 풀어 평면으로(.flat):

  // 3D 층 속에서 꽃이 피면 브라우저가 낮은 해상도로 그려 흐려 보인다. 다시 돌릴 때는 전환 없이 3D 자세로 되돌린다

  const flipTo = cardFlipper(flip, { reduced: () => reducedMotion.matches, flatClass: 'flat', onShown: () => flip.classList.add('flat') });
  const front = flip.querySelector<HTMLElement>('.front')!;
  const [title, by, facts, desc] = [...box.querySelector<HTMLElement>('.dex-info')!.children] as HTMLElement[];
  let selected: HTMLButtonElement | null = null;

  const show = (item: HTMLButtonElement) => {
    if (item === selected) return;
    selected?.setAttribute('aria-pressed', 'false');
    item.setAttribute('aria-pressed', 'true');
    selected = item;
    const i = Number(item.dataset.i);
    const f = FLOWERS[i];
    const isOpen = open(i);
    const apply = () => {
      // 꽃은 바싹 움츠린 봉오리로 펼쳐 놓고, 카드가 다 뒤집힌 뒤 꽃잎이 차례로 벌어지며 핀다(styles.css .dex .fl.closed)
      front.innerHTML = isOpen ? `<div class="plate">${flowerSvg(f.id, false, 'dex')}</div>` : '';
      if (isOpen) bloomThenFlourish(front.querySelector('.fl'), reducedMotion.matches ? 0 : 480, 2100);
      if (!isOpen) {
        title.textContent = '???';
        by.textContent = t('dex.locked');
        facts.innerHTML = '&nbsp;';
        desc.textContent = t('dex.lockedDesc', { n: i + 1 });
        return;
      }
      const tx = text(f);
      title.textContent = tx.name;
      by.innerHTML = `<i>${f.sci}</i> · ${t('dex.meaning')} ${tx.meaning}`;
      facts.innerHTML = `${t('dex.bloom')} ${monthsText(f)} · ${t('dex.origin')} ${tx.origin}`;
      desc.textContent = tx.desc;
      if (save.levels[i]) {
        onSeen?.(i);
        item.classList.remove('new');
      }
    };
    pageSound?.();
    flipTo(isOpen, apply);
  };
  const items = [...box.querySelectorAll<HTMLButtonElement>('.dex-item')];
  items.forEach((b) => b.addEventListener('click', () => show(b)));
  openModal(host, box, t('dex.title'), undefined, 'dex-modal');
  const first = start === null ? null : items[start];
  if (first) {
    show(first);
    first.focus();
  }
}

/** 도감 카드 뒤집는 소리(main 이 넣어 줌) */
let pageSound: (() => void) | null = null;
export function setPageSound(fn: () => void): void {
  pageSound = fn;
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
        // 개발자 모드: 판 바로가기(정식 공개 뒤에도)·출시 화면 단추. 테스트할 때 바로 누르도록 설정 창 맨 위에 둔다(시작 화면에 띄우면 작은 화면에서 위 메뉴·로고와 겹침)
        !__JOYFIELD_PROD__ && Joyfield.devMode()
          ? devSection({
              note: ALL_OPEN() ? t('test.jump') : undefined,
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
  return el;
}

/* ---------- 랭킹 ---------- */

export interface RankingView {
  save: SaveData;
  /** 온라인 순위표를 받아 save.rankings에 남긴다. 실패(오프라인 등)하면 false */
  refresh: () => Promise<boolean>;
  /** 지금 알고 있는 순위표에서 이 점수의 자리(0부터, 밖이면 -1) */
  consider: (score: number, flowers: number) => number;
  /** 온라인 순위표에 이름을 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외 */
  register: (name: string, score: number, flowers: number) => Promise<number>;
  /** 오늘 날짜(YYYY-MM-DD, 기기 현지 날짜) */
  today: () => string;
  /** 오늘의 정원 순위표: 받아서 save.dailyRankings 에 남김 · 자리 보기 · 올리기 */
  refreshDaily: () => Promise<boolean>;
  considerDaily: (rec: DailyRecord) => number;
  registerDaily: (name: string, rec: DailyRecord) => Promise<number>;
}

export type RankTab = 'garden' | 'daily';

/** 오늘의 정원 순위표(날짜가 지난 사본은 빈 표) */
export const todayDaily = (view: RankingView): DailyEntry[] => (view.save.dailyRankings.date === view.today() ? view.save.dailyRankings.entries : []);

/** 10월 25일 · Oct 25 */
export function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(getLang() === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric' });
}

/* ---------- 게임 화면 ---------- */

/**
 * 랭킹 창(공통 모양 @joyfield/shared/ui). 정원 점수·오늘의 정원 두 순위표를 탭으로 바꿔 본다(등록은 결과 화면에서만).
 * mark 는 방금 올린 순위(0부터). 창 높이는 css(.rank-modal)로 고정해 탭이 바뀌어도 탭 단추가 움직이지 않게 한다
 */
export function openRanking(host: HTMLElement, view: RankingView, mark: number | null, tab?: RankTab): void {
  const { save } = view;
  const columns = [{ cls: 'stage' }, { cls: 'score', empty: '-' }, { cls: 'date' }];
  openSharedRanking(host, {
    gameId: 'glasshouse',
    start: tab,
    mark,
    height: 'rank-modal',
    tabs: [
      {
        id: 'garden',
        label: t('ranking.board'),
        columns,
        note: () => t('ranking.note'),
        rows: () => save.rankings.map((e) => ({ name: e.name, dev: e.dev, cells: [t('ranking.flowers', { n: e.flowers }), e.score.toLocaleString(), shortDate(e.date)] })),
        refresh: () => view.refresh(),
      },
      {
        id: 'daily',
        label: t('ranking.daily'),
        columns,
        note: () => t('ranking.dailyNote', { date: longDate(view.today()) }),
        rows: () => todayDaily(view).map((e) => ({ name: e.name, dev: e.dev, cells: ['', t('ranking.moves', { n: e.moves }), clock(e.time)] })),
        refresh: () => view.refreshDaily(),
      },
    ],
  });
}

export interface GameView {
  el: HTMLElement;
  stage: HTMLElement;
  boardHost: HTMLElement;
  moves: HTMLElement;
  note: HTMLElement;
  showPause(show: boolean): void;
  /** 출시 전 확인(TEST) 풀이 보기 줄. 없는 화면(출시 화면·오늘의 정원)이면 null */
  sol: SolBar | null;
}

/** 출시 전 확인(TEST)일 때 판 아래 설명 대신 늘 보이는 풀이 조작 줄: ◀ 밀기 n / 전체 ▶ ▶▶ */
export interface SolBar {
  /** 가운데 글과 앞·다음 단추 쓸 수 있는지 */
  set(label: string, canPrev: boolean, canNext: boolean): void;
  /** 끝까지 보기 재생 중 표시 */
  playing(on: boolean): void;
}

/** level 이 null 이면 오늘의 정원(판 번호 자리에 걸린 시간) */
export function gameScreen(opts: {
  level: number | null;
  flower: FlowerId;
  par: number;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  /** 출시 전 확인(TEST)일 때만: 판 아래 설명 대신 풀이 보기 줄 */
  solve?: { onPrev: () => void; onNext: () => void; onAuto: () => void };
}): GameView {
  const el = html(`
    <main class="screen game">
      <div class="hud">
        <button class="pause-btn hud-btn" aria-label="${t('hud.pause')}" title="${t('hud.pause')}">${ICONS.pause}</button>
        ${
          opts.level === null
            ? `<p class="hud-level daily"><small>${t('hud.todayFlower')}</small><b>${text(FLOWER[opts.flower]).name}</b></p>`
            : `<p class="hud-level"><b>${opts.level + 1}</b><small class="hud-flower">${text(FLOWER[LEVELS[opts.level].flower]).name}</small></p>`
        }
        <p class="hud-moves"><small>${t('hud.moves')}</small><b class="moves">0</b><span>/</span><small>${t('hud.par')}</small><b class="par">${opts.par}</b></p>
        <button class="restart-btn hud-btn" data-act="restart" aria-label="${t('hud.restart')}" title="${t('hud.restart')}">${ICONS.restart}</button>
      </div>
      <p class="note-line" aria-live="polite"></p>
      <div class="stage">
        <div class="board-host" role="application" aria-label="${t('hud.board')}" tabindex="0"></div>
        <div class="fx-layer" aria-hidden="true"></div>
        <div class="pause-menu" hidden>
          <h2>${t('pause.title')}</h2>
          <p class="pause-note">${t('pause.note')}</p>
          <button class="btn primary" data-act="resume">${t('pause.resume')}</button>
          <button class="btn" data-act="quit">${t('pause.quit')}</button>
        </div>
      </div>
      <div class="dock">
        ${
          opts.solve
            ? `<div class="sol-bar">
          <button type="button" class="hud-btn" data-sol="prev" aria-label="${t('sol.prev')}" title="${t('sol.prev')}">${ICONS.left}</button>
          <p class="sol-label" aria-live="polite"></p>
          <button type="button" class="hud-btn" data-sol="next" aria-label="${t('sol.next')}" title="${t('sol.next')}">${ICONS.right}</button>
          <button type="button" class="hud-btn" data-sol="auto" aria-label="${t('sol.auto')}" title="${t('sol.auto')}">${ICONS.play}</button>
        </div>`
            : `<ul class="legend"><li><span class="legend-text"><span class="sun-ico">${SUN_ICON}</span>${t('legend.rule')}</span></li></ul>`
        }
      </div>
    </main>`);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const showPauseLayer = pauseLayer(q('.pause-menu'));
  q('.pause-btn').addEventListener('click', opts.onPause);
  q('[data-act="resume"]').addEventListener('click', opts.onResume);
  el.querySelectorAll('[data-act="restart"]').forEach((b) => b.addEventListener('click', opts.onRestart));
  q('[data-act="quit"]').addEventListener('click', opts.onQuit);
  let sol: SolBar | null = null;
  if (opts.solve) {
    const s = opts.solve;
    const prev = q<HTMLButtonElement>('[data-sol="prev"]');
    const next = q<HTMLButtonElement>('[data-sol="next"]');
    const auto = q<HTMLButtonElement>('[data-sol="auto"]');
    prev.addEventListener('click', s.onPrev);
    next.addEventListener('click', s.onNext);
    auto.addEventListener('click', s.onAuto);
    sol = {
      set(label, canPrev, canNext) {
        q('.sol-label').textContent = label;
        prev.disabled = !canPrev;
        next.disabled = !canNext;
        auto.disabled = !canNext;
      },
      playing(on) {
        auto.innerHTML = on ? ICONS.pause : ICONS.play;
      },
    };
  }
  return {
    sol,
    el,
    stage: q('.stage'),
    boardHost: q('.board-host'),
    moves: q('.moves'),
    note: q('.note-line'),
    showPause(show) {
      showPauseLayer(show);
      el.classList.toggle('paused', show);
    },
  };
}

/* ---------- 결과 화면 ---------- */

export interface ClearResult {
  level: number;
  moves: number;
  par: number;
  score: number;
  petals: number;
  /** 이 판 기록이 좋아졌는지, 도감 새 쪽인지 */
  better: boolean;
  firstBloom: boolean;
  garden: number;
  flowers: number;
}

function goalText(r: ClearResult): string {
  if (r.moves <= r.par) return t('goal.perfect');
  if (r.moves - r.par <= 6) return t('goal.near', { n: r.moves - r.par });
  return t('goal.par', { par: r.par });
}

export function resultScreen(opts: {
  result: ClearResult;
  test?: boolean;
  onNext: (() => void) | null;
  onRetry: () => void;
  onHome: () => void;
  onPick: () => void;
  onShare: (image: Blob | null) => Promise<ShareOutcome>;
  ranking: RankingView;
}): HTMLElement {
  const r = opts.result;
  const lv = LEVELS[r.level];
  const f = FLOWER[lv.flower];
  const tx = text(f);
  const nextLabel = opts.onNext ? t('result.next') : t('result.last');
  const el = html(`
    <main class="screen result">
      <div class="col main-col">
        ${logo('small')}
        <div class="bloom-card">
          <div class="plate">${flowerSvg(lv.flower, false)}</div>
          <div class="bloom-text">
            <p class="pg-kicker">${levelName(r.level)}${r.firstBloom ? ` · <em>${t('result.newPage')}</em>` : ''}</p>
            <h2>${t('result.bloomed', { flower: getLang() === 'ko' ? iga(tx.name) : tx.name })}</h2>
            <p class="sci">${f.sci}</p>
            ${petalRow(r.petals)}
          </div>
        </div>
        ${r.better && !r.firstBloom ? `<p class="record">${t('result.record')}</p>` : ''}
        <dl class="numbers">
          <div><dt>${t('result.moves')}</dt><dd>${r.moves}</dd></div>
          <div><dt>${t('result.par')}</dt><dd>${r.par}</dd></div>
          <div><dt>${t('result.levelScore')}</dt><dd class="level-score">${r.score}</dd></div>
          <div><dt>${t('result.garden')}</dt><dd>${r.garden.toLocaleString()}</dd></div>
        </dl>
      </div>
      <div class="col side-col">
        <p class="goal">${goalText(r)}</p>
        <div class="actions">
          <button class="btn primary big" data-act="next">${nextLabel}${ICONS.arrow}</button>
          <div class="row">
            <button class="btn" data-act="retry">${ICONS.restart}<span>${t('result.retry')}</span></button>
            <button class="btn pic-btn" data-act="dex">${ICONS.book}<span>${t('result.dex')}</span></button>
          </div>
          <div class="row">
            <button class="btn share-btn" data-act="share">${ICONS.share} ${t('result.share')}</button>
            <button class="btn icon-action" data-act="home" aria-label="${t('result.home')}" title="${t('result.home')}">${ICONS.home}</button>
          </div>
        </div>
      </div>
      <p class="toast" role="status"></p>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  // 판을 깨는 순간 화면을 누르던 손가락이 버튼을 잘못 누르지 않도록 0.6초 동안 막는다(키 입력은 main.ts)
  el.classList.add('locked');
  setTimeout(() => el.classList.remove('locked'), 600);
  // 결과 카드의 꽃도 한 번 더 천천히 피고 마무리 동작
  requestAnimationFrame(() => bloomThenFlourish(q('.bloom-card .fl'), 120, 1800));
  countUp(q('.level-score'), r.score);

  // 정원 점수가 10위 안에 들면 결과 화면에서 바로 이름을 받는다. 등록 대기는 없어서, 올리지 않고 나가려 하면 main.ts 가 leaveRankEntry 로 묻는다
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
            onSubmit: (name) => opts.ranking.register(name, r.garden, r.flowers),
            onView: (at) => openRanking(el, opts.ranking, at),
          })
        : null;
    if (entryForm) q('.numbers').after(entryForm);
    el.classList.toggle('has-entry', !!entryForm);
    if (hadFocus) (entryForm?.querySelector<HTMLButtonElement>('[type="submit"]:not(:disabled)') ?? q('[data-act="next"]')).focus();
  };
  // 정원 점수가 오르지 않았거나 출시 전 확인용 판이면 랭킹 등록을 받지 않는다
  if (!opts.test && r.better) {
    showEntry(opts.ranking.consider(r.garden, r.flowers));
    void opts.ranking.refresh().then((ok) => ok && el.isConnected && showEntry(opts.ranking.consider(r.garden, r.flowers)));
  }

  q('[data-act="next"]').addEventListener('click', () => (opts.onNext ? opts.onNext() : opts.onPick()));
  q('[data-act="retry"]').addEventListener('click', opts.onRetry);
  q('[data-act="home"]').addEventListener('click', opts.onHome);
  q('[data-act="dex"]').addEventListener('click', () => openDex(el, opts.ranking.save, r.level));
  let image: Promise<Blob | null> | null = null;
  const capture = () => (image ??= captureResult(el));
  setTimeout(() => el.isConnected && capture(), 2200);
  const toast = q('.toast');
  const shareBtn = q('[data-act="share"]') as HTMLButtonElement;
  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    toast.textContent = t('toast.preparing');
    const outcome = await opts.onShare(await capture());
    toast.textContent = outcome === 'cancelled' ? '' : t(`toast.${outcome}`);
    shareBtn.disabled = false;
  });
  const submit = (entryForm as HTMLElement | null)?.querySelector<HTMLButtonElement>('[type="submit"]');
  setTimeout(() => (submit && !submit.disabled ? submit : q('[data-act="next"]')).focus(), 0);
  return el;
}


/* ---------- 오늘의 정원 결과 ---------- */

export interface DailyResult {
  date: string;
  /** 첫 화분의 꽃(결과 카드 그림) */
  flower: Flower['id'];
  moves: number;
  par: number;
  time: number;
  petals: number;
  /** 오늘 이 기기 기록이 좋아졌는지 */
  better: boolean;
  /** 오늘 이 기기의 가장 좋은 기록(방금 기록 포함) */
  best: DailyRecord;
}

/**
 * 오늘의 정원을 깬 화면. 다음 판이 없는 하루 한 판이라 가장 큰 단추는 "한 번 더 하기"(기준서 1.3 기본).
 * 오늘 순위표 10위 안에 들면 바로 이름을 받는다(등록 대기 없음, 나가려 하면 main.ts 가 leaveRankEntry 로 묻는다)
 */
export function dailyResultScreen(opts: { result: DailyResult; onRetry: () => void; onHome: () => void; onShare: (image: Blob | null) => Promise<ShareOutcome>; ranking: RankingView }): HTMLElement {
  const r = opts.result;
  const f = FLOWER[r.flower];
  const tx = text(f);
  const goal = r.moves <= r.par ? t('goal.perfect') : r.moves - r.par <= 6 ? t('goal.near', { n: r.moves - r.par }) : t('goal.par', { par: r.par });
  const el = html(`
    <main class="screen result daily">
      <div class="col main-col">
        ${logo('small')}
        <div class="bloom-card">
          <div class="plate">${flowerSvg(r.flower, false)}</div>
          <div class="bloom-text">
            <p class="pg-kicker">${t('result.dailyTitle', { date: longDate(r.date) })}</p>
            <h2>${t('result.bloomed', { flower: getLang() === 'ko' ? iga(tx.name) : tx.name })}</h2>
            <p class="sci">${f.sci}</p>
            ${petalRow(r.petals)}
          </div>
        </div>
        ${r.better ? `<p class="record">${t('result.dailyRecord')}</p>` : ''}
        <dl class="numbers">
          <div><dt>${t('result.moves')}</dt><dd>${r.moves}</dd></div>
          <div><dt>${t('result.par')}</dt><dd>${r.par}</dd></div>
          <div><dt>${t('result.time')}</dt><dd>${clock(r.time)}</dd></div>
          <div><dt>${t('result.todayBest')}</dt><dd>${t('ranking.moves', { n: r.best.moves })} · ${clock(r.best.time)}</dd></div>
        </dl>
      </div>
      <div class="col side-col">
        <p class="goal">${goal}<small>${t('result.dailyNote')}</small></p>
        <div class="actions">
          <button class="btn primary big" data-act="retry">${ICONS.restart}${t('result.dailyAgain')}</button>
          <div class="row">
            <button class="btn" data-act="ranking">${ICONS.trophy}<span>${t('ranking.open')}</span></button>
            <button class="btn share-btn" data-act="share">${ICONS.share}<span>${t('result.share')}</span></button>
          </div>
          <div class="row">
            <button class="btn" data-act="home">${ICONS.home}<span>${t('result.home')}</span></button>
          </div>
        </div>
      </div>
      <p class="toast" role="status"></p>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  el.classList.add('locked');
  setTimeout(() => el.classList.remove('locked'), 600);
  requestAnimationFrame(() => bloomThenFlourish(q('.bloom-card .fl'), 120, 1800));

  let entryForm: HTMLElement | null = null;
  const showEntry = (place: number) => {
    if (entryForm && (entryForm.classList.contains('done') || (entryForm.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT'))) return;
    const typed = entryForm?.querySelector('input')?.value;
    const hadFocus = !!entryForm?.contains(document.activeElement);
    entryForm?.remove();
    entryForm =
      place >= 0
        ? rankEntryForm({
            title: t('ranking.dailyEnter', { n: place + 1 }),
            name: typed ?? opts.ranking.save.playerName,
            compact: true,
            onSubmit: (name) => opts.ranking.registerDaily(name, r.best),
            onView: (at) => openRanking(el, opts.ranking, at, 'daily'),
          })
        : null;
    if (entryForm) q('.numbers').after(entryForm);
    el.classList.toggle('has-entry', !!entryForm);
    if (hadFocus) (entryForm?.querySelector<HTMLButtonElement>('[type="submit"]:not(:disabled)') ?? q('[data-act="retry"]')).focus();
  };
  if (r.better) {
    showEntry(opts.ranking.considerDaily(r.best));
    void opts.ranking.refreshDaily().then((ok) => ok && el.isConnected && showEntry(opts.ranking.considerDaily(r.best)));
  }

  q('[data-act="retry"]').addEventListener('click', opts.onRetry);
  q('[data-act="home"]').addEventListener('click', opts.onHome);
  q('[data-act="ranking"]').addEventListener('click', () => openRanking(el, opts.ranking, null, 'daily'));
  let image: Promise<Blob | null> | null = null;
  const capture = () => (image ??= captureResult(el));
  setTimeout(() => el.isConnected && capture(), 2200);
  const toast = q('.toast');
  const shareBtn = q('[data-act="share"]') as HTMLButtonElement;
  shareBtn.addEventListener('click', async () => {
    shareBtn.disabled = true;
    toast.textContent = t('toast.preparing');
    const outcome = await opts.onShare(await capture());
    toast.textContent = outcome === 'cancelled' ? '' : t(`toast.${outcome}`);
    shareBtn.disabled = false;
  });
  const submit = (entryForm as HTMLElement | null)?.querySelector<HTMLButtonElement>('[type="submit"]');
  setTimeout(() => (submit && !submit.disabled ? submit : q('[data-act="retry"]')).focus(), 0);
  return el;
}
