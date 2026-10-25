import { FLOWER, FLOWERS, type Flower } from '../flora';
import { LEVELS, levelName } from '../game/levels';
import { LANGS, getLang, iga, t, type Lang } from '../i18n';
import { NAME_MAX, RANK_SIZE, cleanName, clock, isValidName, pendingRecord, placeOf, placeOfDaily, type DailyEntry, type DailyRecord } from '../ranking';
import { captureResult, type ShareOutcome } from '../share';
import { flowerCount, gardenScore, nextLevel, petalCount, type SaveData } from '../storage';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { countUp, reducedMotion } from './effects';
import { GARDENER, POT } from './board';
import { flowerSvg } from './flowers';
import { ICONS, SUN_ICON, SKIN_ICONS, THEME_ICONS } from './icons';

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };

function html(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

function closeButton(): string {
  return `<button class="modal-x icon-btn" data-close aria-label="${t('common.close')}">${ICONS.close}</button>`;
}

const pressed = (on: boolean) => `aria-pressed="${on}"`;
const text = (f: Flower) => f[getLang()];
/** 꽃잎 표시(꽃잎 3장 중 받은 만큼 채움) */
const petalRow = (n: number) => `<span class="petals" role="img" aria-label="${t('pick.cleared', { p: n })}">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

/**
 * 출시 전 확인용(Joypack.devTools: 개발자 모드 + 미리보기 배포, 정식 공개하면 사라짐):
 * 정원 24개를 모두 연 것처럼 고를 수 있고, 도감도 모든 쪽이 열려 보인다(저장된 기록은 그대로, 바로 연 판의 기록은 남지 않음)
 */
export const ALL_OPEN = () => Joypack.devTools();

/** 판을 고를 수 있는지: 첫 판이거나 앞 판을 깼을 때 */
export const unlocked = (save: SaveData, i: number) => ALL_OPEN() || i === 0 || !!save.levels[i - 1] || !!save.levels[i];

/**
 * 화면 안에 띄우는 대화상자. Esc·바깥 누르기·닫기 버튼으로 닫힌다.
 * reopen은 화면을 다시 그린 뒤 같은 창을 되살리는 경우라 등장 연출 없이 그대로 보이고, 그 선택자에 초점을 둔다
 */
function openModal(host: HTMLElement, content: HTMLElement, label: string, reopen?: string, kind = ''): () => void {
  const backdrop = html(`<div class="modal-backdrop"><div class="modal ${kind}" role="dialog" aria-modal="true"></div></div>`);
  if (reopen) backdrop.classList.add('instant');
  const modal = backdrop.querySelector('.modal')!;
  modal.setAttribute('aria-label', label);
  modal.append(content);
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const onKey = (e: KeyboardEvent) => {
    if (!backdrop.isConnected) return document.removeEventListener('keydown', onKey, true);
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  };
  const watch = new MutationObserver(() => host.isConnected || close());
  if (host.parentNode) watch.observe(host.parentNode, { childList: true });
  const close = () => {
    backdrop.remove();
    watch.disconnect();
    document.removeEventListener('keydown', onKey, true);
    if (opener?.isConnected) opener.focus();
  };
  // 딤을 눌러 닫을 때는 누름과 뗌이 모두 딤 위여야 한다(곧바로 닫으면 이어지는 click 이 아래 화면에 떨어짐)
  let downOnBackdrop = false;
  backdrop.addEventListener('pointerdown', (e) => (downOnBackdrop = e.target === backdrop));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && downOnBackdrop) close();
    downOnBackdrop = false;
  });
  content.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  (content.querySelector<HTMLElement>(reopen || '[aria-pressed="true"]') ?? content.querySelector('button'))?.focus();
  return close;
}

/**
 * 로고 = 게임 시연(실제 규칙대로)이 든 4×2 작은 온실. 위 줄은 네 칸을 한 장으로 덮은 나무 간판(게임 이름, 칸 선 없음), 아래 줄은 빈칸 → 정원사 → 화분 → 창 칸(게임 판의 벽·창 칸과 같은 그림).
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
  const pending = () => !!pendingRecord(save.rankings, save.pending) || !!dailyPendingRecord(opts.ranking);
  const today = opts.ranking.today();
  const best = save.daily?.date === today ? save.daily : null;
  const newPages = save.levels.filter((r, i) => r && !save.seen.includes(i)).length;
  const el = html(`
    <main class="screen start">
      <nav class="jp-topbar" aria-label="${t('app.title')}">
        <div class="jp-topbar-group">
          <a class="jp-top-btn hub-btn" href="../../" aria-label="${t('nav.hub')}" title="${t('nav.hub')}">${Joypack.topIcon('apps')}</a>
          <button class="jp-top-btn jp-top-pill top-lang" data-lang="${otherLang}" aria-label="${t('lang.label')}: ${LANG_LABEL[lang]} → ${LANG_LABEL[otherLang]}">${Joypack.topIcon('globe')}<span lang="${otherLang}">${LANG_LABEL[otherLang]}</span></button>
        </div>
        <div class="jp-topbar-group">
          <button class="jp-top-btn rank-btn" data-ranking aria-label="${t('ranking.open')}">${Joypack.topIcon('trophy')}${pending() ? `<i class="jp-top-dot" role="img" aria-label="${t('ranking.newBadge')}"></i>` : ''}</button>
          <button class="jp-top-btn settings-btn" aria-label="${t('settings.open')}">${Joypack.topIcon('gear')}</button>
        </div>
      </nav>
      <div class="col main-col">
        ${logo()}
        <h1 class="sr-only">${t('app.title')}</h1>
        <p class="tagline">${t('app.tagline')}</p>
      </div>
      <div class="col side-col">
        <button class="btn primary big" data-play>
          ${next < 0 ? t('start.allDone') : `<span>${next === 0 ? t('start.play') : t('start.continue')}</span><small>${levelName(next)}</small>`}
        </button>
        <button class="btn daily-btn" data-daily>
          ${ICONS.calendar}<span class="daily-text"><b>${t('start.daily')}</b><small>${
            best ? t('start.dailyBest', { moves: best.moves, time: clock(best.time) }) : t('start.dailySub', { date: longDate(today) })
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
  el.querySelector('[data-ranking]')!.addEventListener('click', () =>
    openRanking(el, opts.ranking, null, () => {
      if (!pending()) el.querySelector('.jp-top-dot')?.remove();
    }),
  );
  const showSettings = (reopen?: string) => openModal(el, settingsPanel(opts), t('settings.title'), reopen);
  el.querySelector('.settings-btn')!.addEventListener('click', () => showSettings());
  if (opts.settings) queueMicrotask(() => showSettings(opts.settingsFocus ?? (opts.settings === 'reset' ? '[data-reset]' : '[aria-pressed="true"]')));
  return el;
}

/* ---------- 정원 고르기 ---------- */

/**
 * 정원 24곳을 꽃 카드로(계절 구분 없이). 핀 정원은 그 꽃이 핀 그림·이름·꽃잎, 다음에 가꿀 정원은 봉오리와 이름,
 * 아직 안 열린 정원은 자물쇠만. 꽃을 보고 다시 가꿀 정원을 고른다
 */
function openPicker(host: HTMLElement, save: SaveData, onPlay: (level: number) => void): void {
  const box = html(`
    <div class="picker">
      ${closeButton()}
      <h2>${ICONS.garden} ${t('pick.title')} <small>${save.levels.filter(Boolean).length}/${LEVELS.length}</small></h2>
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
      if (isOpen) setTimeout(() => front.querySelector('.fl')?.classList.remove('closed'), reducedMotion.matches ? 0 : 480);
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
    const wasUp = flip.classList.contains('up');
    // 다 뒤집힌 앞면은 3D 를 풀어 평면으로(.flat): 3D 층 속에서 꽃이 피면 브라우저가 낮은 해상도로 그려 흐려 보인다
    const flatten = () => isOpen && flip.classList.add('flat');
    // 평면을 풀 때는 전환 없이 바로 3D 자세로(풀면서 한 바퀴 도는 것 방지)
    if (flip.classList.contains('flat')) {
      flip.style.transition = 'none';
      flip.classList.remove('flat');
      void flip.offsetWidth;
      flip.style.transition = '';
    }
    pageSound?.();
    // 앞면끼리 바꿀 때는 옆으로 세워(90°) 안 보이는 순간에 그림을 갈아 끼우고 다시 펼친다(첫 회전은 끝 자세를 붙잡아 한 프레임 비침 방지)
    if (wasUp && isOpen && !reducedMotion.matches) {
      const out = flip.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(270deg)' }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        apply();
        flip.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(180deg)' }], { duration: 180, easing: 'cubic-bezier(.3,1.4,.5,1)' }).onfinish = flatten;
        out.cancel();
      };
    } else {
      // 뒷면 ↔ 앞면은 CSS 전환으로 뒤집는다(잠긴 꽃은 뒷면으로 돌아감)
      if (isOpen) apply();
      else setTimeout(apply, wasUp ? 130 : 0);
      flip.classList.toggle('up', isOpen);
      setTimeout(flatten, reducedMotion.matches ? 0 : 440);
    }
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
const toggleInner = (key: Toggle, on: boolean) => `${TOGGLE_ICONS[key][on ? 0 : 1]}<span class="label">${t(`${key}.${on ? 'on' : 'off'}`)}</span>`;
const toggleChip = (key: Toggle, on: boolean) => `<button class="chip" data-toggle="${key}" ${pressed(on)}>${toggleInner(key, on)}</button>`;

function settingsPanel(opts: StartOptions): HTMLElement {
  const { save } = opts;
  const lang = getLang();
  const el = html(`
    <div class="settings">
      ${closeButton()}
      <h2>${ICONS.gear} ${t('settings.title')}</h2>
      <section>
        <h3>${t('theme.label')}</h3>
        <div class="seg" role="group">
          ${THEMES.map((th) => `<button data-theme="${th}" ${pressed(save.theme === th)}>${THEME_ICONS[th]}<span class="label">${t(`theme.${th}`)}</span></button>`).join('')}
        </div>
      </section>
      <section>
        <h3>${t('lang.label')}</h3>
        <div class="seg" role="group">
          ${LANGS.map((l) => `<button data-lang="${l}" ${pressed(l === lang)}>${LANG_LABEL[l]}</button>`).join('')}
        </div>
      </section>
      <section>
        <h3>${t('skin.label')}</h3>
        <div class="skins" role="group">
          ${SKIN_SETTINGS.map((s) => `<button data-skin="${s}" ${pressed(save.skin === s)} aria-label="${t(`skin.${s}`)}">${SKIN_ICONS[s]}<span class="label">${t(`skin.${s}`)}</span></button>`).join('')}
        </div>
        <p class="note">${t('skin.autoHint', { skin: t(`skin.${opts.todaySkin}`) })}</p>
      </section>
      <section>
        <h3>${t('settings.feedback')}</h3>
        <div class="toggles">
          ${toggleChip('sound', save.sound)}
          ${'vibrate' in navigator ? toggleChip('vibrate', save.vibrate) : '' /* 진동을 못 하는 기기(아이폰 등)에는 숨긴다 */}
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
      ${
        // 미리보기 동안만: 출시 전 확인 도구. 시작 화면에 띄우면 작은 화면에서 위 메뉴·로고와 겹쳐 설정 창 맨 아래에 둔다
        Joypack.prerelease()
          ? `<section class="dev-section"><h3>TEST</h3>${ALL_OPEN() ? `<p class="note">${t('test.jump')}</p>` : ''}<button type="button" class="dev-toggle" data-release aria-pressed="${Joypack.releaseView()}">${Joypack.releaseView() ? t('test.devView') : t('test.releaseView')}</button></section>`
          : ''
      }
      <p class="app-version">${t('settings.version')} v${__APP_VERSION__}</p>
      <p class="app-copyright">${Joypack.COPYRIGHT}</p>
    </div>`);

  const select = (attr: string, value: string) =>
    el.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
  el.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      select('theme', b.dataset.theme!);
      opts.onTheme(b.dataset.theme as Theme);
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach((b) =>
    b.addEventListener('click', () => {
      select('skin', b.dataset.skin!);
      opts.onSkin(b.dataset.skin as SkinSetting);
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.lang !== lang) opts.onLang(b.dataset.lang as Lang);
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const key = b.dataset.toggle as Toggle;
      opts.onToggle(key);
      b.setAttribute('aria-pressed', String(save[key]));
      b.innerHTML = toggleInner(key, save[key]);
    }),
  );
  el.querySelector('[data-release]')?.addEventListener('click', () => {
    Joypack.setReleaseView(!Joypack.releaseView());
    opts.onRefresh(true);
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
  /** 지금 알고 있는 순위표에서 이 점수의 자리(0부터, 밖이면 -1). 안에 들면 등록 대기로 남긴다 */
  consider: (score: number, flowers: number) => number;
  /** 온라인 순위표에 이름을 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외 */
  register: (name: string, score: number, flowers: number) => Promise<number>;
  /** 오늘 날짜(YYYY-MM-DD, 기기 현지 날짜) */
  today: () => string;
  /** 오늘의 정원 순위표: 받아서 save.dailyRankings 에 남김 · 자리 보기(안에 들면 등록 대기) · 올리기 */
  refreshDaily: () => Promise<boolean>;
  considerDaily: (rec: DailyRecord) => number;
  registerDaily: (name: string, rec: DailyRecord) => Promise<number>;
}

export type RankTab = 'garden' | 'daily';

/** 오늘의 정원 순위표(날짜가 지난 사본은 빈 표) */
export const todayDaily = (view: RankingView): DailyEntry[] => (view.save.dailyRankings.date === view.today() ? view.save.dailyRankings.entries : []);

/** 오늘 등록 대기 중이고 아직 10위 안에 드는 오늘의 정원 기록 */
export function dailyPendingRecord(view: RankingView): DailyRecord | null {
  const p = view.save.dailyPending;
  if (!p || p.date !== view.today() || placeOfDaily(todayDaily(view), p) < 0) return null;
  return { moves: p.moves, time: p.time };
}

/** 10월 25일 · Oct 25 */
export function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(getLang() === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric' });
}

function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 이름 입력 카드. 영문 대문자 5자까지만 받고, 지난번 이름을 미리 채운다. 입력 칸과 완료 칸을 처음부터 같은 자리에 겹쳐 두어
 * 등록 전·중·후에 카드 높이가 바뀌지 않게 한다(타임 투 플립과 같은 방식, 공통화 대기 2번)
 */
function rankEntryForm(opts: { title: string; name: string; compact?: boolean; onSubmit: (name: string) => Promise<number>; onView?: (place: number | null) => void }): HTMLElement {
  const el = html(`
    <form class="rank-entry" novalidate>
      <div class="rank-entry-form">
        <p class="rank-entry-title">${ICONS.trophy}<span>${opts.title}</span></p>
        <div class="rank-entry-row">
          <input name="name" value="${opts.name}" maxlength="${NAME_MAX}" placeholder="AAAAA" inputmode="email" lang="en" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="${t('ranking.nameLabel')}">
          <button class="btn primary" type="submit">${t('ranking.submit')}</button>
        </div>
        <p class="rank-entry-hint">${opts.compact ? '' : t('ranking.nameLabel')}</p>
      </div>
      <div class="rank-entry-done" aria-hidden="true">
        <p class="rank-entry-title" role="status">${ICONS.trophy}<span>${t('ranking.done', { n: 10 })}</span></p>
        ${opts.onView ? `<button class="btn primary rank-view" type="button" data-view tabindex="-1">${ICONS.trophy}<span>${t('ranking.open')}</span></button>` : ''}
      </div>
    </form>`);
  const input = el.querySelector('input')!;
  const submit = el.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const hint = el.querySelector<HTMLElement>('.rank-entry-hint')!;
  const hintText = hint.innerHTML;
  let sending = false;
  // 금지어(욕설 등)는 등록 버튼을 끄고 안내 줄에 알린다(조이팩 공통 Joypack.isAllowedName, 기준서 10.3)
  const sync = (clean = cleanName(input.value)) => {
    const blocked = isValidName(clean) && !Joypack.isAllowedName(clean);
    submit.disabled = !isValidName(clean) || blocked;
    if (!sending) hint.innerHTML = blocked ? `<span class="rank-error">${t('ranking.badName')}</span>` : hintText;
  };
  Joypack.initialsInput(input, sync);
  sync();
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    sync();
    if (submit.disabled || sending) return;
    sending = true;
    const label = submit.textContent!;
    submit.style.minWidth = `${submit.offsetWidth}px`;
    submit.disabled = input.disabled = true;
    if (opts.compact) submit.textContent = '…';
    else hint.textContent = t('ranking.sending');
    let place: number;
    try {
      place = await opts.onSubmit(input.value);
    } catch {
      sending = false;
      input.disabled = false;
      submit.textContent = label;
      submit.style.minWidth = '';
      sync();
      hint.innerHTML = `<span class="rank-error">${t('ranking.failed')}</span>${hintText ? `<br>${hintText}` : ''}`;
      return;
    }
    const form = el.querySelector<HTMLElement>('.rank-entry-form')!;
    const done = el.querySelector<HTMLElement>('.rank-entry-done')!;
    done.querySelector('span')!.innerHTML = place < 0 ? t('ranking.missed') : t('ranking.done', { n: place + 1 });
    form.setAttribute('aria-hidden', 'true');
    form.inert = true;
    done.removeAttribute('aria-hidden');
    el.classList.add('done');
    const view = done.querySelector<HTMLButtonElement>('[data-view]');
    view?.removeAttribute('tabindex');
    view?.addEventListener('click', () => opts.onView!(place < 0 ? null : place));
    view?.focus();
  });
  return el;
}

/**
 * 랭킹 창: 정원 점수 · 오늘의 정원 두 탭. 처음 탭은 조이팩 공통 기준(Joypack.rankTab: 등록 대기 → 최근 탭 → 정원 점수)이고,
 * tab 을 주면 그 탭. 등록 대기 기록이 있으면 맨 위에서 올린다. mark 는 방금 올린 순위(0부터, 처음 탭에만)
 */
export function openRanking(host: HTMLElement, view: RankingView, mark: number | null, onChange?: () => void, tab?: RankTab): void {
  const { save } = view;
  let board: RankTab = tab ?? (Joypack.rankTab('glasshouse', ['garden', 'daily'], 'garden') as RankTab);
  let highlight = mark;
  const box = html(`
    <div class="ranking">
      ${closeButton()}
      <h2>${ICONS.trophy} ${t('ranking.title')}</h2>
      <div class="seg rank-tabs" role="group" aria-label="${t('ranking.title')}">
        <button type="button" data-tab="garden">${t('ranking.board')}</button>
        <button type="button" data-tab="daily">${t('ranking.daily')}</button>
      </div>
      <p class="note rank-note"></p>
      <div class="rank-pending"></div>
      <ol class="rank-list"></ol>
    </div>`);
  const list = box.querySelector<HTMLElement>('.rank-list')!;
  const slot = box.querySelector<HTMLElement>('.rank-pending')!;
  const status: Record<RankTab, 'loading' | 'online' | 'offline'> = { garden: 'loading', daily: 'loading' };
  const renderNote = () => {
    const note = box.querySelector('.rank-note')!;
    const s = status[board];
    note.textContent =
      s === 'loading' ? t('ranking.loading') : s === 'offline' ? t('ranking.offline') : board === 'garden' ? t('ranking.note') : t('ranking.dailyNote', { date: longDate(view.today()) });
    note.classList.toggle('rank-error', s === 'offline');
  };
  const row = (i: number, e: boolean, no: string, name: string, stage: string, score: string, date: string) => {
    const cls = [i < 3 ? `top top${i + 1}` : '', e ? '' : 'empty', e && i === highlight ? 'me' : ''].filter(Boolean).join(' ');
    return `<li class="${cls}"><span class="no">${no}</span><span class="name">${name}</span><span class="stage">${stage}</span><span class="score">${score}</span><span class="date">${date}</span></li>`;
  };
  const renderList = () => {
    const daily = todayDaily(view);
    list.innerHTML = Array.from({ length: RANK_SIZE }, (_, i) => {
      if (board === 'daily') {
        const e = daily[i];
        return row(i, !!e, String(i + 1), e ? e.name : '-----', '', e ? t('ranking.moves', { n: e.moves }) : '-', e ? clock(e.time) : '');
      }
      const e = save.rankings[i];
      return row(i, !!e, String(i + 1), e ? e.name : '-----', e ? t('ranking.flowers', { n: e.flowers }) : '', e ? e.score.toLocaleString() : '-', e ? shortDate(e.date) : '');
    }).join('');
  };
  const done = (place: number) => {
    highlight = place < 0 ? null : place;
    onChange?.();
    if (place >= 0) render();
    else renderList();
    return place;
  };
  const render = () => {
    renderNote();
    box.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === board)));
    let form: HTMLElement | null = null;
    if (board === 'garden') {
      const rec = pendingRecord(save.rankings, save.pending);
      if (rec)
        form = rankEntryForm({
          title: t('ranking.pending', { score: rec.score, n: placeOf(save.rankings, rec.score) + 1 }),
          name: save.playerName,
          onSubmit: async (name) => done(await view.register(name, rec.score, rec.flowers)),
        });
    } else {
      const rec = dailyPendingRecord(view);
      if (rec)
        form = rankEntryForm({
          title: t('ranking.dailyPending', { moves: rec.moves, n: placeOfDaily(todayDaily(view), rec) + 1 }),
          name: save.playerName,
          onSubmit: async (name) => done(await view.registerDaily(name, rec)),
        });
    }
    const empty = board === 'garden' ? !save.rankings.length : !todayDaily(view).length;
    slot.replaceChildren(...(form ? [form] : empty ? [html(`<p class="note rank-empty">${t('ranking.empty')}</p>`)] : []));
    renderList();
  };
  const load = (which: RankTab) =>
    void (which === 'garden' ? view.refresh() : view.refreshDaily()).then((ok) => {
      status[which] = ok ? 'online' : 'offline';
      if (!box.isConnected || board !== which) return;
      if (slot.contains(document.activeElement)) {
        renderNote();
        renderList();
      } else render();
    });
  const select = (next: RankTab) => {
    board = next;
    Joypack.setRankBoard('glasshouse', board);
    if (status[board] !== 'online') load(board);
    render();
  };
  box.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.tab === board) return;
      highlight = null;
      select(b.dataset.tab as RankTab);
    }),
  );
  select(board);
  // 창 높이를 고정해(styles.css .rank-modal) 탭·기록 등록 칸·목록이 바뀌어도 탭 단추가 위아래로 움직이지 않게
  openModal(host, box, t('ranking.title'), '[data-tab][aria-pressed="true"]', 'rank-modal');
}

/* ---------- 게임 화면 ---------- */

export interface GameView {
  el: HTMLElement;
  stage: HTMLElement;
  boardHost: HTMLElement;
  moves: HTMLElement;
  note: HTMLElement;
  undo: HTMLButtonElement;
  /** 오늘의 정원에서 걸린 시간(그 밖에는 null) */
  clock: HTMLElement | null;
  showPause(show: boolean): void;
}

/** level 이 null 이면 오늘의 정원(판 번호 자리에 걸린 시간) */
export function gameScreen(opts: { level: number | null; par: number; onPause: () => void; onResume: () => void; onRestart: () => void; onUndo: () => void; onQuit: () => void }): GameView {
  const el = html(`
    <main class="screen game">
      <div class="hud">
        <button class="pause-btn hud-btn" aria-label="${t('hud.pause')}" title="${t('hud.pause')}">${ICONS.pause}</button>
        ${
          opts.level === null
            ? `<p class="hud-level daily"><small>${t('hud.today')}</small><b class="clock" role="timer" aria-label="${t('hud.time')}">0:00</b></p>`
            : `<p class="hud-level"><small>${t('level.short')}</small><b>${opts.level + 1}</b></p>`
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
          <button class="btn primary" data-act="resume">${t('pause.resume')}</button>
          <button class="btn" data-act="restart">${t('pause.restart')}</button>
          <button class="btn ghost" data-act="quit">${t('pause.quit')}</button>
        </div>
      </div>
      <div class="dock">
        <ul class="legend"><li><span class="sun-ico">${SUN_ICON}</span><span><b>${t('legend.spot')}</b> ${t('legend.rule')}</span></li></ul>
        <button class="btn undo-btn" data-act="undo" aria-label="${t('hud.undo')}">${ICONS.undo}<span>${t('hud.undo')}</span></button>
      </div>
    </main>`);
  const q = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const pauseMenu = q('.pause-menu');
  q('.pause-btn').addEventListener('click', opts.onPause);
  q('[data-act="resume"]').addEventListener('click', opts.onResume);
  el.querySelectorAll('[data-act="restart"]').forEach((b) => b.addEventListener('click', opts.onRestart));
  q('[data-act="undo"]').addEventListener('click', opts.onUndo);
  q('[data-act="quit"]').addEventListener('click', opts.onQuit);
  return {
    el,
    stage: q('.stage'),
    boardHost: q('.board-host'),
    moves: q('.moves'),
    note: q('.note-line'),
    undo: q<HTMLButtonElement>('.undo-btn'),
    clock: el.querySelector<HTMLElement>('.clock'),
    showPause(show) {
      pauseMenu.hidden = !show;
      el.classList.toggle('paused', show);
      if (show) pauseMenu.querySelector<HTMLButtonElement>('button')!.focus();
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
  // 결과 카드의 꽃도 한 번 더 천천히 핀다
  requestAnimationFrame(() => setTimeout(() => q('.bloom-card .fl').classList.remove('closed'), 120));
  countUp(q('.level-score'), r.score);

  // 정원 점수가 10위 안에 들면 결과 화면에서 바로 이름을 받는다. 그냥 넘어가도 등록 대기로 남는다
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
 * 오늘 순위표 10위 안에 들면 바로 이름을 받고, 넘어가도 오늘 안에는 등록 대기로 남는다
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
  requestAnimationFrame(() => setTimeout(() => q('.bloom-card .fl').classList.remove('closed'), 120));

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
            onView: (at) => openRanking(el, opts.ranking, at, undefined, 'daily'),
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
  q('[data-act="ranking"]').addEventListener('click', () => openRanking(el, opts.ranking, null, undefined, 'daily'));
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
