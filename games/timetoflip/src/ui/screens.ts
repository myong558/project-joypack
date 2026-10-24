import type { GameResult } from '../game/engine';
import { ALL_FACES, FACE_SETS, type FaceId } from '../game/faces';
import { cardInfo, faceName, setName } from '../cards';
import { LANGS, getLang, t, type Lang } from '../i18n';
import type { SaveData } from '../storage';
import { NAME_MAX, RANK_SIZE, boardEntries, cleanName, isValidName, pendingRecord, placeOf, type Mode } from '../ranking';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { captureResult, type ShareOutcome } from '../share';
import { CARD_BACK, MASCOT, faceSvg } from './art';
import { confetti, countUp, reducedMotion } from './effects';
import { ICONS, SKIN_ICONS, THEME_ICONS } from './icons';

export type { Mode };

const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' };
const DEX_TOTAL = FACE_SETS.reduce((n, s) => n + s.faces.length, 0);

function html(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

function closeButton(): string {
  return `<button class="modal-x icon-btn" data-close aria-label="${t('common.close')}">${ICONS.close}</button>`;
}

function pressed(on: boolean): string {
  return `aria-pressed="${on}"`;
}

/** 작은 카드 그림(도감·결과 화면) */
function miniCard(face: FaceId, opts: { gold?: boolean; locked?: boolean; isNew?: boolean } = {}): string {
  if (opts.locked) return `<span class="mini-card locked" aria-hidden="true">${CARD_BACK}</span>`;
  return `<span class="mini-card${opts.gold ? ' gold' : ''}" aria-hidden="true">${faceSvg(face)}${opts.isNew ? '<em>NEW</em>' : ''}</span>`;
}

/**
 * 화면 안에 띄우는 대화상자. Esc·바깥 누르기·닫기 버튼으로 닫힌다.
 * reopen은 화면을 다시 그린 뒤 같은 창을 되살리는 경우라 등장 연출 없이 그대로 보이고, 그 선택자에 초점을 둔다
 */
function openModal(host: HTMLElement, content: HTMLElement, label: string, reopen?: string): () => void {
  const backdrop = html(`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"></div></div>`);
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
  // 화면을 다시 그려 화면이 바뀌면 대화상자도 함께 사라진다
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
  return `<div class="demo">${card(1, 'circle')}${card(2, 'triangle')}${card(3, 'circle')}<b class="demo-pop">+1.5</b></div><div class="demo-timer"><i></i></div>`;
}

/**
 * 출시 전 확인용: true 면 시작 화면 로고 위에 "N판부터 바로 시작" 단추(클래식, 기록·랭킹에 안 남음).
 * 사용자가 원복을 지시하면 false 로 되돌린다
 */
const STAGE_JUMP = true;

export function startScreen(opts: StartOptions): HTMLElement {
  const { save } = opts;
  const dailyBest = save.daily?.date === opts.today ? save.daily.best : 0;
  const lang = getLang();
  const otherLang = LANGS.find((l) => l !== lang)!;
  const pendingIn = (m: Mode) => !!pendingRecord(save.rankings, save.pending, m, opts.today);
  const el = html(`
    <main class="screen start">
      <nav class="jp-topbar" aria-label="${t('app.title')}">
        <div class="jp-topbar-group">
          <a class="jp-top-btn hub-btn" href="../../" aria-label="${t('nav.hub')}" title="${t('nav.hub')}">${Joypack.topIcon('apps')}</a>
          <button class="jp-top-btn jp-top-pill top-lang" data-lang="${otherLang}" aria-label="${t('lang.label')}: ${LANG_LABEL[lang]} → ${LANG_LABEL[otherLang]}">${Joypack.topIcon('globe')}<span lang="${otherLang}">${LANG_LABEL[otherLang]}</span></button>
        </div>
        <div class="jp-topbar-group">
          <button class="jp-top-btn rank-btn" data-ranking aria-label="${t('ranking.open')}">${Joypack.topIcon('trophy')}${pendingIn('classic') || pendingIn('daily') ? `<i class="jp-top-dot" role="img" aria-label="${t('ranking.newBadge')}"></i>` : ''}</button>
          <button class="jp-top-btn settings-btn" aria-label="${t('settings.open')}">${Joypack.topIcon('gear')}</button>
        </div>
      </nav>
      <div class="col main-col">
        ${STAGE_JUMP ? `<div class="stage-jump" role="group" aria-label="${t('test.jump')}"><span>TEST</span>${[2, 3, 4, 5, 6, 7, 8].map((n) => `<button type="button" data-from="${n}">${n}</button>`).join('')}</div>` : ''}
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
  el.querySelectorAll<HTMLButtonElement>('[data-from]').forEach((b) => b.addEventListener('click', () => opts.onPlay('classic', Number(b.dataset.from))));
  el.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => opts.onPlay(b.dataset.mode as Mode)));
  el.querySelector('.top-lang')!.addEventListener('click', () => opts.onLang(otherLang));
  el.querySelector('[data-dex]')!.addEventListener('click', () => openDex(el, save));
  el.querySelector('[data-ranking]')!.addEventListener('click', () =>
    // 처음 탭은 조이팩 공통 기준: 등록 대기 → 최근 모드(방금 한 판·마지막으로 본 탭) → 클래식
    openRanking(el, opts.ranking, Joypack.rankTab('timetoflip', ['classic', 'daily'], 'classic') as Mode, null, () => {
      if (!pendingIn('classic') && !pendingIn('daily')) el.querySelector('.jp-top-dot')?.remove();
    }),
  );
  const showSettings = (reopen?: string) => openModal(el, settingsPanel(opts), t('settings.title'), reopen);
  el.querySelector('.settings-btn')!.addEventListener('click', () => showSettings());
  if (opts.settings) queueMicrotask(() => showSettings(opts.settingsFocus ?? (opts.settings === 'reset' ? '[data-reset]' : '[aria-pressed="true"]')));
  return el;
}

/* ---------- 도감 ---------- */

/**
 * 도감: 위 가운데 큰 카드(처음엔 뒷면) + 그 아래 설명, 아래쪽에 묶음별 작은 카드.
 * 작은 카드를 누르면 큰 카드가 뒤집혀 그 그림으로 바뀌고 제목·작가·설명이 나온다.
 * 큰 카드·설명 칸은 크기를 고정해(설명은 최대 4줄) 글 길이가 달라도 화면이 덜컥이지 않는다
 */
/**
 * 출시 전 확인용: true 면 도감에서 48장을 모두 연 것처럼 보여 준다(저장된 기록은 그대로).
 * 사용자가 원복을 지시하면 false 로 되돌린다
 */
const DEX_ALL_OPEN = true;

function openDex(host: HTMLElement, save: SaveData): void {
  const found = new Set<FaceId>(DEX_ALL_OPEN ? ALL_FACES : save.dex);
  const gold = new Set(save.gold);
  const box = html(`
    <div class="dex">
      ${closeButton()}
      <h2>${ICONS.album} ${t('dex.title')} <small>${found.size}/${DEX_TOTAL} · ${t('dex.goldCount', { n: gold.size })}</small></h2>
      <div class="dex-stage">
        <div class="dex-big" aria-hidden="true">
          <span class="dex-flip"><span class="side back">${CARD_BACK}</span><span class="side front"></span></span>
          <b class="dex-star">★</b>
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
                const label = found.has(f) ? `${faceName(f)}${gold.has(f) ? ` · ${t('dex.gold')}` : ''}` : `??? — ${t('dex.locked')}`;
                return `<li><button class="dex-item" type="button" data-face="${f}" data-stage="${i + 1}" aria-pressed="false" aria-label="${label}">${miniCard(f, found.has(f) ? { gold: gold.has(f) } : { locked: true })}</button></li>`;
              })
              .join('')}</ul>
          </section>`,
        ).join('')}
      </div>
    </div>`);

  const big = box.querySelector<HTMLElement>('.dex-big')!;
  const flip = box.querySelector<HTMLElement>('.dex-flip')!;
  const front = flip.querySelector<HTMLElement>('.front')!;
  const info = box.querySelector<HTMLElement>('.dex-info')!;
  const [title, by, desc] = [...info.children] as HTMLElement[];
  let selected: HTMLButtonElement | null = null;

  const show = (item: HTMLButtonElement) => {
    if (item === selected) return;
    selected?.setAttribute('aria-pressed', 'false');
    item.setAttribute('aria-pressed', 'true');
    selected = item;
    const face = item.dataset.face as FaceId;
    const open = found.has(face);
    const apply = () => {
      front.innerHTML = open ? faceSvg(face) : '';
      big.classList.toggle('gold', open && gold.has(face));
      const text = open ? cardInfo(face) : null;
      title.textContent = text ? text.title : '???';
      by.textContent = text ? text.by : t('dex.locked');
      desc.textContent = text ? text.desc : t('dex.lockedDesc', { n: Number(item.dataset.stage) });
      info.classList.remove('swap');
      void info.offsetWidth;
      info.classList.add('swap');
    };
    const wasUp = flip.classList.contains('up');
    // 앞면끼리 바꿀 때는 옆으로 세워(90°) 안 보이는 순간에 그림을 갈아 끼우고 다시 펼친다
    if (wasUp && open && !reducedMotion.matches) {
      flip.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(270deg)' }], { duration: 120, easing: 'ease-in' }).onfinish = () => {
        apply();
        flip.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(180deg)' }], { duration: 180, easing: 'cubic-bezier(.3,1.4,.5,1)' });
      };
    } else {
      // 뒷면 ↔ 앞면은 CSS 전환으로 뒤집는다(잠긴 카드는 뒷면으로 돌아감)
      if (open) apply();
      else setTimeout(apply, wasUp ? 130 : 0);
      flip.classList.toggle('up', open);
    }
    big.classList.remove('pop');
    void big.offsetWidth;
    big.classList.add('pop');
  };
  box.querySelectorAll<HTMLButtonElement>('.dex-item').forEach((b) => b.addEventListener('click', () => show(b)));
  openModal(host, box, t('dex.title'));
}

/* ---------- 설정 ---------- */

const TOGGLE_ICONS: Record<Toggle, [on: string, off: string]> = {
  sound: [ICONS.soundOn, ICONS.soundOff],
  vibrate: [ICONS.vibrateOn, ICONS.vibrateOff],
};

function toggleInner(key: Toggle, on: boolean): string {
  return `${TOGGLE_ICONS[key][on ? 0 : 1]}<span class="label">${t(`${key}.${on ? 'on' : 'off'}`)}</span>`;
}

function toggleChip(key: Toggle, on: boolean): string {
  return `<button class="chip" data-toggle="${key}" ${pressed(on)}>${toggleInner(key, on)}</button>`;
}

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
  // 소리·진동은 화면을 다시 그리지 않고 버튼만 바꾼다
  el.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const key = b.dataset.toggle as Toggle;
      opts.onToggle(key);
      b.setAttribute('aria-pressed', String(save[key]));
      b.innerHTML = toggleInner(key, save[key]);
    }),
  );
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
  /** 오늘(YYYY-MM-DD)과 화면에 쓸 날짜(M/D) */
  today: string;
  todayLabel: string;
  /** 온라인 순위표를 받아 save.rankings에 남긴다. 실패(오프라인 등)하면 false */
  refresh: (mode: Mode) => Promise<boolean>;
  /** 지금 알고 있는 순위표에서 이 점수의 자리(0부터, 밖이면 -1). 안에 들면 등록 대기로 남긴다 */
  consider: (mode: Mode, score: number, stage: number) => number;
  /** 온라인 순위표에 이름을 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외 */
  register: (mode: Mode, name: string, score: number, stage: number) => Promise<number>;
}

function shortDate(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 이름 입력 카드. 영문 대문자 5자까지만 받고, 지난번 이름을 미리 채운다.
 * 등록하면 그 자리에 순위와 랭킹 보기 버튼을 보여 준다
 */
function rankEntryForm(opts: {
  title: string;
  name: string;
  /** 이름 규칙 안내를 보일지. 결과 화면에서는 공간이 좁아 숨긴다 */
  compact?: boolean;
  onSubmit: (name: string) => Promise<number>;
  onView?: (place: number | null) => void;
}): HTMLElement {
  const el = html(`
    <form class="rank-entry" novalidate>
      <p class="rank-entry-title">${ICONS.trophy}<span>${opts.title}</span></p>
      <div class="rank-entry-row">
        <input name="name" value="${opts.name}" maxlength="${NAME_MAX}" placeholder="AAAAA" inputmode="email" lang="en" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="${t('ranking.nameLabel')}">
        <button class="btn primary" type="submit">${t('ranking.submit')}</button>
      </div>
      <p class="rank-entry-hint">${opts.compact ? '' : t('ranking.nameLabel')}</p>
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
  // 영문 대문자 5자까지, 휴대폰은 영문 자판·대문자로 연다(조이팩 공통 Joypack.initialsInput)
  Joypack.initialsInput(input, sync);
  sync();
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    sync();
    if (submit.disabled || sending) return;
    sending = true;
    // 등록하는 동안과 등록한 뒤에도 카드 높이를 그대로 둬서 아래 요소가 위아래로 덜컥이지 않게 한다
    const height = el.offsetHeight;
    el.style.minHeight = `${height}px`;
    const label = submit.textContent!;
    submit.style.minWidth = `${submit.offsetWidth}px`;
    submit.disabled = input.disabled = true;
    if (opts.compact) submit.textContent = '…';
    else hint.textContent = t('ranking.sending');
    let place: number;
    try {
      place = await opts.onSubmit(input.value);
    } catch {
      // 연결이 안 되면 기록은 등록 대기로 남아 있으니 다시 누르거나 나중에 올리면 된다
      sending = false;
      input.disabled = false;
      submit.textContent = label;
      submit.style.minWidth = '';
      el.style.minHeight = '';
      sync();
      hint.innerHTML = `<span class="rank-error">${t('ranking.failed')}</span>${hintText ? `<br>${hintText}` : ''}`;
      return;
    }
    el.classList.add('done');
    // 등록 칸이 줄어 아래 버튼이 튀지 않게 높이는 최소로만 지킨다(완료 글·버튼은 여백을 넉넉히)
    el.style.minHeight = `${height}px`;
    el.innerHTML = `<p class="rank-entry-title" role="status">${ICONS.trophy}<span>${place < 0 ? t('ranking.missed') : t('ranking.done', { n: place + 1 })}</span></p>`;
    if (opts.onView) el.insertAdjacentHTML('beforeend', `<button class="btn primary rank-view" type="button" data-view>${ICONS.trophy}<span>${t('ranking.open')}</span></button>`);
    const view = el.querySelector<HTMLButtonElement>('[data-view]');
    view?.addEventListener('click', () => opts.onView!(place < 0 ? null : place));
    view?.focus();
  });
  return el;
}

/**
 * 랭킹 창. 클래식·오늘의 챌린지 순위표를 탭으로 바꿔 보고, 등록 대기 기록이 있으면 맨 위에서 올린다.
 * mark는 방금 올린 순위(0부터)로, 그 줄을 강조한다
 */
function openRanking(host: HTMLElement, view: RankingView, start: Mode, mark: number | null, onChange?: () => void): void {
  const { save } = view;
  let mode = start;
  let highlight = mark;
  const box = html(`
    <div class="ranking">
      ${closeButton()}
      <h2>${ICONS.trophy} ${t('ranking.title')}</h2>
      <div class="seg" role="group">
        <button data-board="classic">${t('mode.classic')}</button>
        <button data-board="daily">${t('ranking.daily')}</button>
      </div>
      <p class="note rank-note"></p>
      <div class="rank-pending"></div>
      <ol class="rank-list"></ol>
    </div>`);
  const list = box.querySelector<HTMLElement>('.rank-list')!;
  const slot = box.querySelector<HTMLElement>('.rank-pending')!;

  // 탭마다 온라인 순위표를 받아 온다. 받는 동안과 오프라인일 때는 기기에 남은 순위를 보여 준다
  const status: Record<Mode, 'loading' | 'online' | 'offline'> = { classic: 'loading', daily: 'loading' };
  const fetchBoard = (m: Mode) => {
    status[m] = 'loading';
    void view.refresh(m).then((ok) => {
      status[m] = ok ? 'online' : 'offline';
      if (mode !== m || !box.isConnected) return;
      // 등록 대기 카드에 이름을 치는 중이면 카드는 그대로 두고 순위표만 바꾼다
      if (slot.contains(document.activeElement)) {
        renderNote();
        renderList();
      } else {
        render();
      }
    });
  };
  const renderNote = () => {
    const note = box.querySelector('.rank-note')!;
    note.textContent =
      status[mode] === 'loading' ? t('ranking.loading')
      : status[mode] === 'offline' ? t('ranking.offline')
      : mode === 'daily' ? t('ranking.dailyNote', { date: view.todayLabel })
      : t('ranking.classicNote');
    note.classList.toggle('rank-error', status[mode] === 'offline');
  };
  const renderList = () => {
    const entries = boardEntries(save.rankings, mode, view.today);
    list.classList.toggle('with-date', mode === 'classic');
    list.innerHTML = Array.from({ length: RANK_SIZE }, (_, i) => {
      const e = entries[i];
      const cls = [i < 3 ? `top top${i + 1}` : '', e ? '' : 'empty', e && i === highlight ? 'me' : ''].filter(Boolean).join(' ');
      return `<li class="${cls}"><span class="no">${i + 1}</span><span class="name">${e ? e.name : '-----'}</span><span class="stage">${e ? t('ranking.stage', { n: e.stage }) : ''}</span><span class="score">${e ? e.score.toLocaleString() : '-'}</span>${mode === 'classic' ? `<span class="date">${e ? shortDate(e.date) : ''}</span>` : ''}</li>`;
    }).join('');
  };
  const render = () => {
    box.querySelectorAll<HTMLButtonElement>('[data-board]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.board === mode)));
    renderNote();
    const entries = boardEntries(save.rankings, mode, view.today);
    const rec = pendingRecord(save.rankings, save.pending, mode, view.today);
    const board = mode;
    slot.replaceChildren(
      ...(rec
        ? [
            rankEntryForm({
              title: t('ranking.pending', { score: rec.score, n: placeOf(entries, rec.score) + 1 }),
              name: save.playerName,
              onSubmit: async (name) => {
                const place = await view.register(board, name, rec.score, rec.stage);
                highlight = place < 0 ? null : place;
                onChange?.();
                if (place >= 0) render();
                else renderList();
                return place;
              },
            }),
          ]
        : !entries.length
          ? [html(`<p class="note rank-empty">${t('ranking.empty')}</p>`)]
          : []),
    );
    renderList();
  };
  box.querySelectorAll<HTMLButtonElement>('[data-board]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.board === mode) return;
      mode = b.dataset.board as Mode;
      Joypack.setRankBoard('timetoflip', mode);
      highlight = null;
      if (status[mode] !== 'online') fetchBoard(mode);
      render();
    }),
  );
  render();
  fetchBoard(mode);
  openModal(host, box, t('ranking.title'));
  // 탭마다 안내 문구·등록 카드가 달라 창 높이가 출렁이므로, 두 탭을 한 번씩 그려 더 큰 높이로 고정한다
  const current = mode;
  let tallest = 0;
  for (const m of ['classic', 'daily'] as Mode[]) {
    mode = m;
    render();
    tallest = Math.max(tallest, box.offsetHeight);
  }
  mode = current;
  render();
  box.style.minHeight = `${(tallest / parseFloat(getComputedStyle(box).fontSize)).toFixed(3)}em`;
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
  showPause(show: boolean): void;
  showMessage(text: string | null, variant?: string): void;
}

export function gameScreen(opts: { daily: boolean; onPause: () => void; onResume: () => void; onRestart: () => void; onQuit: () => void }): GameView {
  const el = html(`
    <main class="screen game${opts.daily ? ' daily' : ''}">
      <div class="hud">
        <button class="pause-btn icon-btn" aria-label="${t('hud.pause')}">${ICONS.pause}</button>
        <p class="hud-stage" aria-live="polite"></p>
        <p class="hud-score" aria-label="${t('hud.score')}"><b>0</b></p>
        <p class="hud-combo" aria-hidden="true"></p>
        <div class="timer" role="timer" aria-label="${t('hud.time')}">
          <div class="timer-track"><div class="timer-bar"></div></div>
          <span class="mascot">${MASCOT}</span>
          <b class="timer-text"></b>
        </div>
      </div>
      <div class="stage">
        <div class="board-wrap"><div class="board" role="group"></div></div>
        <div class="fx-layer" aria-hidden="true"></div>
        <div class="banners" aria-live="polite"></div>
        <div class="message" hidden></div>
        <div class="pause-menu" hidden>
          <h2>${t('pause.title')}</h2>
          <button class="btn primary" data-act="resume">${t('pause.resume')}</button>
          <button class="btn" data-act="restart">${t('pause.restart')}</button>
          <button class="btn ghost" data-act="quit">${t('pause.quit')}</button>
        </div>
      </div>
    </main>`);
  const q = (s: string) => el.querySelector<HTMLElement>(s)!;
  const pauseMenu = q('.pause-menu');
  const message = q('.message');
  q('.pause-btn').addEventListener('click', opts.onPause);
  q('[data-act="resume"]').addEventListener('click', opts.onResume);
  q('[data-act="restart"]').addEventListener('click', opts.onRestart);
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
    showPause(show) {
      pauseMenu.hidden = !show;
      el.classList.toggle('paused', show);
      if (show) pauseMenu.querySelector<HTMLButtonElement>('button')!.focus();
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
  const golds = new Set(result.golds);
  const shown = [...opts.newFaces, ...result.faces.filter((f) => !opts.newFaces.includes(f))].slice(0, 8);
  const el = html(`
    <main class="screen result">
      <div class="confetti-layer" aria-hidden="true"></div>
      <div class="col main-col">
        <p class="mode">${opts.daily ? t('start.daily') : t('mode.classic')}</p>
        <div class="hero result-logo" aria-hidden="true">${heroDemo()}</div>
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
        ${shown.length ? `<ul class="faces" aria-label="${t('result.newCards')}">${shown.map((f) => `<li aria-label="${faceName(f)}">${miniCard(f, { gold: golds.has(f), isNew: opts.newFaces.includes(f) })}</li>`).join('')}</ul>` : ''}
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

  // 10위 안에 들면 점수 바로 아래에서 이름을 받는다. 그냥 넘어가도 등록 대기로 남아 메인의 랭킹에서 올릴 수 있다.
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
    showEntry(opts.ranking.consider(mode, result.score, result.stage));
    void opts.ranking.refresh(mode).then((ok) => ok && el.isConnected && showEntry(opts.ranking.consider(mode, result.score, result.stage)));
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
