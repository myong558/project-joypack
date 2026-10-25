import { FLOWER, FLOWERS, SEASONS, type Flower, type Habit, type Season } from '../flora';
import { LEVELS, levelName, seasonOf } from '../game/levels';
import { LANGS, getLang, iga, t, type Lang } from '../i18n';
import { NAME_MAX, RANK_SIZE, cleanName, clock, isValidName, pendingRecord, placeOf, placeOfDaily, type DailyEntry, type DailyRecord } from '../ranking';
import { captureResult, type ShareOutcome } from '../share';
import { dailyOpen, flowerCount, gardenScore, nextLevel, petalCount, type SaveData } from '../storage';
import { SKIN_SETTINGS, THEMES, type Skin, type SkinSetting, type Theme } from '../theme';
import { countUp, reducedMotion } from './effects';
import { flowerSvg } from './flowers';
import { HABIT_ICON, ICONS, SKIN_ICONS, THEME_ICONS } from './icons';

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
 * 로고 = 게임 시연(실제 규칙대로): 오른쪽 벽 창 바로 앞 한 칸에 햇살이 고인 작은 온실에서 정원사가 화분을 두 칸 밀어
 * 햇살 자리에 넣으면 화분 바닥이 빛나고 튤립 꽃잎이 천천히 벌어진다. 8초 반복, 움직임은 CSS(.demo)
 */
function heroDemo(): string {
  return `<div class="demo">
    <i class="d-win"></i><i class="d-beam"></i>
    <span class="d-pot"><span class="glow"></span><svg class="pot-body" viewBox="0 0 40 40" focusable="false"><path d="M8 15h24l-3.2 19.2q-.3 1.8-2.2 1.8H13.4q-1.9 0-2.2-1.8z" fill="#b8613a"/><path d="M8 15h7l1.2 21h-2.8q-1.9 0-2.2-1.8z" fill="#d98a5c" opacity=".55"/><rect x="6.5" y="11" width="27" height="6" rx="2" fill="#c96f45"/><ellipse cx="20" cy="12.2" rx="11.2" ry="1.7" fill="#4a3324"/></svg><span class="plant">${flowerSvg('tulip', false)}</span></span>
    <span class="d-man"><svg viewBox="0 0 40 40" focusable="false"><circle cx="20" cy="20" r="14.5" fill="#d8b46a" stroke="#9a7434" stroke-width=".8"/><circle cx="20" cy="20" r="8" fill="#e6c57d"/><circle cx="20" cy="20" r="8.6" fill="none" stroke="var(--accent)" stroke-width="2"/></svg></span>
  </div>`;
}

function logo(cls = ''): string {
  return `<div class="logo ${cls}" aria-hidden="true">${heroDemo()}<p class="logo-title">${t('app.title')}</p>${getLang() === 'ko' ? '<p class="logo-sub">Glasshouse Garden</p>' : ''}</div>`;
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
  onRefresh: () => void;
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
  const dailyOn = ALL_OPEN() || dailyOpen(save);
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
        ${
          Joypack.prerelease()
            ? `<div class="dev-row">${ALL_OPEN() ? `<span>TEST · ${t('test.jump')}</span>` : ''}<button type="button" class="dev-toggle" data-release aria-pressed="${Joypack.releaseView()}">${Joypack.releaseView() ? t('test.devView') : t('test.releaseView')}</button></div>`
            : ''
        }
        ${logo()}
        <h1 class="sr-only">${t('app.title')}</h1>
        <p class="tagline">${t('app.tagline')}</p>
      </div>
      <div class="col side-col">
        <button class="btn primary big" data-play>
          ${next < 0 ? t('start.allDone') : `<span>${next === 0 ? t('start.play') : t('start.continue')}</span><small>${levelName(next)}</small>`}
        </button>
        <div class="row two">
          <button class="btn" data-pick>${ICONS.grid}<span>${t('start.pick')}</span></button>
          <button class="btn dex-btn" data-dex aria-label="${t('dex.open')}">${ICONS.book}<span>${t('dex.title')}</span>${newPages ? `<em>NEW</em>` : ''}</button>
        </div>
        <button class="btn daily-btn" data-daily ${dailyOn ? '' : 'disabled'}>
          ${ICONS.calendar}<span class="daily-text"><b>${t('start.daily')}</b><small>${
            !dailyOn ? t('start.dailyLocked') : best ? t('start.dailyBest', { moves: best.moves, time: clock(best.time) }) : t('start.dailySub', { date: longDate(today) })
          }</small></span>${dailyOn ? ICONS.arrow : ICONS.lock}
        </button>
        <p class="best">${t('start.score', { score: gardenScore(save) })}<br>${t('start.progress', { n: flowerCount(save), p: petalCount(save) })}</p>
        <p class="hint">${t('start.hint')}</p>
      </div>
    </main>`);

  if (opts.opening) {
    el.classList.add('opening');
    el.addEventListener('pointerdown', () => el.classList.remove('opening'), { once: true });
  }
  el.querySelector('[data-release]')?.addEventListener('click', () => {
    Joypack.setReleaseView(!Joypack.releaseView());
    opts.onRefresh();
  });
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

function openPicker(host: HTMLElement, save: SaveData, onPlay: (level: number) => void): void {
  const box = html(`
    <div class="picker">
      ${closeButton()}
      <h2>${ICONS.grid} ${t('pick.title')}</h2>
      <div class="seasons">
        ${SEASONS.map(
          (s) => `<section class="season" data-season="${s}">
            <h3>${t(`season.${s}`)} <small>${t(`season.${s}Idea`)}</small></h3>
            <ul>${LEVELS.map((lv, i) => ({ lv, i }))
              .filter(({ i }) => seasonOf(i) === s)
              .map(({ lv, i }) => {
                const rec = save.levels[i];
                const open = unlocked(save, i);
                const label = open ? t('pick.level', { season: t(`season.${s}`), n: (i % 6) + 1, state: rec ? t('pick.cleared', { p: rec.petals }) : t('pick.open') }) : `${levelName(i)} — ${t('pick.locked')}`;
                return `<li><button type="button" class="tile-btn${rec ? ' done' : ''}" data-level="${i}" ${open ? '' : 'disabled'} aria-label="${label}">
                  <b>${(i % 6) + 1}</b>
                  <span class="mini">${rec || ALL_OPEN() ? flowerSvg(lv.flower) : open ? flowerSvg(lv.flower, false) : ICONS.lock}</span>
                  ${rec ? petalRow(rec.petals) : '<span class="petals"></span>'}
                </button></li>`;
              })
              .join('')}</ul>
          </section>`,
        ).join('')}
      </div>
    </div>`);
  const close = openModal(host, box, t('pick.title'), undefined, 'wide');
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

/* ---------- 식물 도감(넘기는 책) ---------- */

const monthsText = (f: Flower) => (f.months[0] === f.months[1] ? t('dex.month', { a: f.months[0] }) : t('dex.months', { a: f.months[0], b: f.months[1] }));
const HABIT_KEY: Record<Habit, 'habit.sun' | 'habit.shade' | 'habit.moist'> = { sun: 'habit.sun', shade: 'habit.shade', moist: 'habit.moist' };

function bookPage(save: SaveData, page: number): string {
  if (page === 0) {
    // 차례: 계절마다 여섯 꽃. 아직 안 핀 꽃은 이름 대신 점선
    return `<div class="page contents">
      <p class="pg-kicker">${t('dex.contents')}</p>
      <h3 class="pg-title">${t('dex.cover')}</h3>
      <p class="pg-sub">${t('dex.coverSub')}</p>
      <div class="toc">${SEASONS.map(
        (s) => `<section><h4>${t(`season.${s}`)}</h4><ol>${FLOWERS.map((f, i) => ({ f, i }))
          .filter(({ i }) => seasonOf(i) === s)
          .map(({ f, i }) => {
            const open = ALL_OPEN() || !!save.levels[i];
            return `<li><button type="button" data-goto="${i + 1}" ${open ? '' : 'class="locked"'}><span>${open ? text(f).name : '· · · · ·'}</span><i>${i + 1}</i></button></li>`;
          })
          .join('')}</ol></section>`,
      ).join('')}</div>
    </div>`;
  }
  const i = page - 1;
  const f = FLOWERS[i];
  const open = ALL_OPEN() || !!save.levels[i];
  const s = seasonOf(i);
  if (!open) {
    return `<div class="page flower locked">
      <p class="pg-kicker">${levelName(i)}</p>
      <div class="plate">${flowerSvg(f.id)}</div>
      <h3 class="pg-title">${t('dex.locked')}</h3>
      <p class="pg-desc">${t('dex.lockedDesc', { season: t(`season.${s}`), n: (i % 6) + 1 })}</p>
      <p class="folio">— ${page} —</p>
    </div>`;
  }
  const tx = text(f);
  return `<div class="page flower">
    <p class="pg-kicker">${levelName(i)}</p>
    <div class="plate">${flowerSvg(f.id)}</div>
    <div class="pg-text">
      <h3 class="pg-title">${tx.name}</h3>
      <p class="sci">${f.sci}</p>
      <dl class="facts">
        <div><dt>${t('dex.meaning')}</dt><dd>${tx.meaning}</dd></div>
        <div><dt>${t('dex.bloom')}</dt><dd>${monthsText(f)}</dd></div>
        <div><dt>${t('dex.origin')}</dt><dd>${tx.origin}</dd></div>
        <div><dt>${t('dex.habit')}</dt><dd><span class="habit-ico">${HABIT_ICON[f.habit]}</span>${t(HABIT_KEY[f.habit])}</dd></div>
      </dl>
      <p class="pg-desc">${tx.desc}</p>
    </div>
    <p class="folio">— ${page} —</p>
  </div>`;
}

/**
 * 도감: 오래된 식물 도감 한 쪽(미색 종이, 겹줄 테두리 속 삽화, 학명 이탤릭, 꽃말·피는 때·원산지·습성, 짧은 설명).
 * 차례(0쪽) + 꽃 24쪽. 앞·뒤 단추나 밀기·화살표 키로 넘기면 종이가 책등을 축으로 넘어간다. 쪽 크기는 고정이라 글 길이가 달라도 덜컥이지 않는다
 */
export function openDex(host: HTMLElement, save: SaveData, start: number | null, onSeen?: (page: number) => void): void {
  const last = FLOWERS.length;
  let page = start === null ? 0 : start + 1;
  const box = html(`
    <div class="book">
      ${closeButton()}
      <h2 class="sr-only">${t('dex.title')}</h2>
      <div class="spread"><div class="sheet" aria-live="polite"></div></div>
      <div class="book-nav">
        <button class="icon-btn" data-prev aria-label="${t('dex.prev')}">${ICONS.left}</button>
        <span class="book-no"></span>
        <button class="icon-btn" data-next aria-label="${t('dex.next')}">${ICONS.right}</button>
      </div>
    </div>`);
  const spread = box.querySelector<HTMLElement>('.spread')!;
  let sheet = box.querySelector<HTMLElement>('.sheet')!;
  const no = box.querySelector<HTMLElement>('.book-no')!;
  const prev = box.querySelector<HTMLButtonElement>('[data-prev]')!;
  const nextBtn = box.querySelector<HTMLButtonElement>('[data-next]')!;
  const fill = (el: HTMLElement, p: number) => {
    el.innerHTML = bookPage(save, p);
    el.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.goto))));
    if (p > 0 && save.levels[p - 1]) onSeen?.(p - 1);
  };
  const status = () => {
    no.textContent = page === 0 ? t('dex.contents') : t('dex.page', { n: page });
    prev.disabled = page === 0;
    nextBtn.disabled = page === last;
  };
  let turning = false;
  const go = (to: number) => {
    to = Math.max(0, Math.min(last, to));
    if (to === page || turning) return;
    const forward = to > page;
    page = to;
    status();
    if (reducedMotion.matches) {
      fill(sheet, page);
      return;
    }
    // 새 쪽을 밑에 깔고, 앞으로 넘길 때는 지금 쪽이 왼쪽 책등을 축으로 넘어가고, 뒤로 갈 때는 새 쪽이 왼쪽에서 넘어와 덮는다
    turning = true;
    const fresh = document.createElement('div');
    fresh.className = 'sheet';
    fill(fresh, page);
    const old = sheet;
    if (forward) {
      spread.insertBefore(fresh, old);
      old.classList.add('turn-out');
      old.addEventListener('animationend', () => {
        old.remove();
        turning = false;
      }, { once: true });
    } else {
      spread.append(fresh);
      fresh.classList.add('turn-in');
      fresh.addEventListener('animationend', () => {
        fresh.classList.remove('turn-in');
        old.remove();
        turning = false;
      }, { once: true });
    }
    sheet = fresh;
    pageSound?.();
  };
  prev.addEventListener('click', () => go(page - 1));
  nextBtn.addEventListener('click', () => go(page + 1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(page - 1);
    else if (e.key === 'ArrowRight') go(page + 1);
  });
  // 가로로 밀어 넘기기
  let sx = 0;
  let sy = 0;
  spread.addEventListener('pointerdown', (e) => ((sx = e.clientX), (sy = e.clientY)));
  spread.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - sy)) go(page + (dx < 0 ? 1 : -1));
  });
  fill(sheet, page);
  status();
  openModal(host, box, t('dex.title'), undefined, 'book-modal');
  nextBtn.focus();
}

/** 도감 넘김 소리(main 이 넣어 줌) */
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
  openModal(host, box, t('ranking.title'), '[data-tab][aria-pressed="true"]');
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
            : `<p class="hud-level"><small>${t(`season.${seasonOf(opts.level)}`)}</small><b>${(opts.level % 6) + 1}</b></p>`
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
        <ul class="legend"><li><span class="habit-ico">${HABIT_ICON.sun}</span><span><b>${t('legend.spot')}</b> ${t('legend.rule')}</span></li></ul>
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
  const s = seasonOf(r.level);
  if (r.moves <= r.par) return r.level % 6 === 5 ? `${t('goal.perfect')} · ${t('goal.season', { season: t(`season.${s}`) })}` : t('goal.perfect');
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
  const nextSeason = r.level < LEVELS.length - 1 && seasonOf(r.level + 1) !== seasonOf(r.level) ? seasonOf(r.level + 1) : null;
  const nextLabel = !opts.onNext ? t('result.last') : nextSeason ? t('result.nextSeason', { season: t(`season.${nextSeason}`) }) : t('result.next');
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
            <button class="btn" data-act="dex">${ICONS.book}<span>${t('result.dex')}</span></button>
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

export type { Season };

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
