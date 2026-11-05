// 조이필드 게임 공통 화면 조각(Vite 로 묶는 게임이 import '@joyfield/shared/ui' 로 씀, 기준서 1.6·5.1).
//   html()          : 문자열 → 요소
//   openModal()     : 화면 안 대화상자(Esc·바깥 누르기·닫기 단추·휴대폰 뒤로 가기로 닫힘)
//   rankEntryForm() : 랭킹 이름 등록 카드(영문 대문자 5자, 금지어 거름, 등록 전·중·후·오프라인 높이 그대로)
//   leaveRankEntry(): 결과 화면을 떠날 때 아직 올리지 않은 등록 카드가 있으면 "등록하지 않고 나갈까요?" 확인
//   openRanking()   : 랭킹 창(탭·TOP 10 목록·온라인/오프라인 안내)
// 모양(css)은 게임마다 자기 styles.css 에 둔다(같은 클래스 이름: .modal-backdrop .modal .rank-entry .ranking .rank-list …).
// 문구·아이콘은 게임이 configureUi 로 한 번 넘긴다(게임 i18n 의 같은 키, 글꼴 서브셋 검사가 게임 문구에서 글자를 모으므로).
import './joyfield.js';

export type UiTextKey =
  | 'common.close'
  | 'ranking.title'
  | 'ranking.open'
  | 'ranking.loading'
  | 'ranking.offline'
  | 'ranking.sending'
  | 'ranking.failed'
  | 'ranking.missed'
  | 'ranking.empty'
  | 'ranking.nameLabel'
  | 'ranking.badName'
  | 'ranking.submit'
  | 'ranking.done'
  | 'ranking.offlineEntry'
  | 'ranking.leaveTitle'
  | 'ranking.leaveText'
  | 'ranking.leaveFailed'
  | 'ranking.leaveStay'
  | 'ranking.leaveGo';

export interface UiConfig {
  /** 게임 i18n 의 t. 위 키를 모두 가져야 한다('ranking.done' 은 {n}) */
  t: (key: UiTextKey, params?: Record<string, string | number>) => string;
  /** 트로피·닫기(X) 아이콘 SVG 문자열 */
  icons: { trophy: string; close: string };
}

let config: UiConfig | null = null;

/** 게임 시작 때 한 번: 공통 화면 조각이 쓸 문구·아이콘 */
export function configureUi(next: UiConfig): void {
  config = next;
}

function cfg(): UiConfig {
  if (!config) throw new Error('configureUi 를 먼저 부르세요');
  return config;
}

export const RANK_SIZE = 10;
export const NAME_MAX = 5;

/** 입력한 글자를 대문자로 바꾸고 A–Z 가 아닌 글자는 버린다(5자까지) */
export function cleanName(raw: string): string {
  return String(raw).toUpperCase().replace(/[^A-Z]/g, '').slice(0, NAME_MAX);
}

export function isValidName(name: string): boolean {
  return new RegExp(`^[A-Z]{1,${NAME_MAX}}$`).test(name);
}

export function html(markup: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

/** 대화상자 오른쪽 위 닫기 단추(.modal-x, 누르면 닫힘) */
export function closeButton(): string {
  return `<button type="button" class="modal-x icon-btn" data-close aria-label="${cfg().t('common.close')}">${cfg().icons.close}</button>`;
}

export interface ModalOptions {
  /** 화면을 다시 그린 뒤 같은 창을 되살리는 경우: 등장 연출 없이 그대로 보이고 이 선택자에 초점을 둔다 */
  reopen?: string;
  /** .modal 에 더할 클래스(창 크기 고정 등) */
  kind?: string;
  /** 딤 글자 크기를 host(판) 글자 크기에 맞춘다(판 크기로 글자를 키우는 게임). host 의 'fitchange' 이벤트 때도 다시 맞춘다 */
  fitFont?: boolean;
  /** 닫힐 때(어떤 방법이든) */
  onClose?: () => void;
}

/**
 * 화면 안에 띄우는 대화상자. Esc·바깥 누르기·닫기 단추([data-close])·휴대폰 뒤로 가기로 닫힌다.
 * host 가 화면에서 빠지면(화면을 다시 그림) 함께 닫힌다. 닫는 함수를 돌려준다
 */
export function openModal(host: HTMLElement, content: HTMLElement, label: string, opts: ModalOptions = {}): () => void {
  const backdrop = html(`<div class="modal-backdrop"><div class="modal${opts.kind ? ` ${opts.kind}` : ''}" role="dialog" aria-modal="true"></div></div>`);
  if (opts.reopen) backdrop.classList.add('instant');
  const modal = backdrop.querySelector('.modal')!;
  modal.setAttribute('aria-label', label);
  modal.append(content);
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let closed = false;
  const onKey = (e: KeyboardEvent) => {
    if (!backdrop.isConnected) return document.removeEventListener('keydown', onKey, true);
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  };
  const fit = () => {
    if (!host.isConnected) return close();
    backdrop.style.fontSize = getComputedStyle(host).fontSize;
  };
  const watch = new MutationObserver(() => host.isConnected || close());
  if (host.parentNode) watch.observe(host.parentNode, { childList: true });
  // 휴대폰 뒤로 가기: 창만 닫는다(기준서 1.3)
  const release = Joyfield.back.layer(() => close());
  function close() {
    if (closed) return;
    closed = true;
    backdrop.remove();
    watch.disconnect();
    release();
    document.removeEventListener('keydown', onKey, true);
    if (opts.fitFont) {
      host.removeEventListener('fitchange', fit);
      window.removeEventListener('resize', fit);
    }
    if (opener?.isConnected) opener.focus();
    opts.onClose?.();
  }
  // 딤을 눌러 닫을 때는 누름과 뗌이 모두 딤 위여야 한다(곧바로 닫으면 이어지는 click 이 아래 화면에 떨어져 다른 창이 열림)
  let downOnBackdrop = false;
  backdrop.addEventListener('pointerdown', (e) => (downOnBackdrop = e.target === backdrop));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && downOnBackdrop) close();
    downOnBackdrop = false;
  });
  // 내용이 바뀌어도(도감 넘기기) 닫기 단추가 동작하도록 위임한다
  content.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey, true);
  if (opts.fitFont) {
    host.addEventListener('fitchange', fit);
    window.addEventListener('resize', fit);
    fit();
  }
  document.body.append(backdrop);
  (content.querySelector<HTMLElement>(opts.reopen || '[aria-pressed="true"]') ?? content.querySelector('button'))?.focus();
  return close;
}

export interface RankEntryOptions {
  /** 카드 제목(HTML, 예: 랭킹 <b>3위</b> 진입!) */
  title: string;
  /** 미리 채울 이름(지난번 이름) */
  name: string;
  /** 이름 규칙 안내를 숨기고 버튼 안에 진행 표시(결과 화면처럼 좁은 곳) */
  compact?: boolean;
  /** 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외 */
  onSubmit: (name: string) => Promise<number>;
  /** 등록한 뒤 "랭킹 보기" 단추를 누르면 */
  onView?: (place: number | null) => void;
}

/**
 * 등록 카드 상태(.rank-entry 의 data-state). ready 이름 받는 중 · sending 올리는 중 · failed 연결 실패(다시 누를 수 있음)
 * · done 끝(등록했거나 그사이 밀려남) · offline 기기가 오프라인이라 올릴 수 없음(연결되면 ready 로 돌아감)
 */
export type RankEntryState = 'ready' | 'sending' | 'failed' | 'done' | 'offline';

/** 아직 올리지 않았고, 나가면 다시 올릴 길이 없는 상태(나갈 때 묻는다) */
const UNSENT: readonly RankEntryState[] = ['ready', 'failed'];

/** 기기가 확실히 오프라인인지(navigator.onLine 이 false). true 여도 꼭 연결된 것은 아니어서, 그때 실패는 올릴 때 알린다 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * 이름 입력 카드. 영문 대문자 5자까지만 받고, 지난번 이름을 미리 채운다. 입력 칸과 완료 칸을 처음부터 같은 자리에 겹쳐 두어
 * 등록 전·중·후에 카드 높이가 바뀌지 않게 한다(css: .rank-entry-form · .rank-entry-done 을 grid-area 1/1 에 겹침).
 * 오프라인이면 완료 칸 자리에 "오프라인이라 올릴 수 없어요"를 보이고(.offline), 연결되면 입력 칸으로 돌아간다.
 * 등록 대기는 없다: 이 카드에서 올리지 않은 기록은 화면을 떠나면 사라지므로 떠날 때 leaveRankEntry 로 묻는다(기준서 1.6)
 */
export function rankEntryForm(opts: RankEntryOptions): HTMLElement {
  const { t, icons } = cfg();
  const el = html(`
    <form class="rank-entry" novalidate>
      <div class="rank-entry-form">
        <p class="rank-entry-title">${icons.trophy}<span>${opts.title}</span></p>
        <div class="rank-entry-row">
          <input name="name" value="${cleanName(opts.name)}" maxlength="${NAME_MAX}" placeholder="AAAAA" inputmode="email" lang="en" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="${t('ranking.nameLabel')}">
          <button class="btn primary" type="submit">${t('ranking.submit')}</button>
        </div>
        <p class="rank-entry-hint">${opts.compact ? '' : t('ranking.nameLabel')}</p>
      </div>
      <div class="rank-entry-done" aria-hidden="true">
        <p class="rank-entry-title" role="status">${icons.trophy}<span>${t('ranking.done', { n: 10 })}</span></p>
        ${opts.onView ? `<button class="btn primary rank-view" type="button" data-view tabindex="-1">${icons.trophy}<span>${t('ranking.open')}</span></button>` : ''}
      </div>
    </form>`);
  const input = el.querySelector('input')!;
  const submit = el.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const hint = el.querySelector<HTMLElement>('.rank-entry-hint')!;
  const form = el.querySelector<HTMLElement>('.rank-entry-form')!;
  const done = el.querySelector<HTMLElement>('.rank-entry-done')!;
  const doneText = done.querySelector('span')!;
  const view = done.querySelector<HTMLButtonElement>('[data-view]');
  const hintText = hint.innerHTML;
  const state = () => el.dataset.state as RankEntryState;
  const setState = (next: RankEntryState) => (el.dataset.state = next);
  setState('ready');
  // 금지어(욕설 등)는 등록 단추를 끄고 안내 줄에 알린다(조이필드 공통 Joyfield.isAllowedName, 기준서 10.3)
  const sync = (clean = cleanName(input.value)) => {
    const blocked = isValidName(clean) && !Joyfield.isAllowedName(clean);
    submit.disabled = !isValidName(clean) || blocked;
    if (state() !== 'sending') hint.innerHTML = blocked ? `<span class="rank-error">${t('ranking.badName')}</span>` : hintText;
  };
  // 입력 칸 ↔ 완료 칸(등록 결과·오프라인 안내). 두 칸은 같은 자리에 겹쳐 있어 카드 높이는 그대로다
  const showDone = (on: boolean, text?: string) => {
    if (text !== undefined) doneText.innerHTML = text;
    form.toggleAttribute('aria-hidden', on);
    form.inert = on;
    done.toggleAttribute('aria-hidden', !on);
    el.classList.toggle('done', on);
  };
  // 영문 대문자 5자까지, 휴대폰은 영문 자판·대문자로 연다(한글 조합 중에는 끝난 뒤 거름)
  Joyfield.initialsInput(input, sync);
  sync();
  // 오프라인이면 올릴 수 없음을 먼저 알리고, 연결되면 입력 칸으로 돌아간다. 카드가 화면에서 빠진 뒤 신호가 오면 듣기를 그만둔다
  let mounted = false;
  const net = () => {
    if (mounted && !el.isConnected) {
      window.removeEventListener('online', net);
      window.removeEventListener('offline', net);
      return;
    }
    if (isOffline() && UNSENT.includes(state())) {
      setState('offline');
      el.classList.add('offline');
      if (view) view.hidden = true;
      showDone(true, t('ranking.offlineEntry'));
    } else if (!isOffline() && state() === 'offline') {
      setState('ready');
      el.classList.remove('offline');
      if (view) view.hidden = false;
      showDone(false);
      sync();
    }
  };
  window.addEventListener('online', net);
  window.addEventListener('offline', net);
  net();
  setTimeout(() => (mounted = true));
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    sync();
    if (submit.disabled || !UNSENT.includes(state())) return;
    setState('sending');
    const label = submit.textContent!;
    submit.style.minWidth = `${submit.offsetWidth}px`;
    submit.disabled = input.disabled = true;
    if (opts.compact) submit.textContent = '…';
    else hint.textContent = t('ranking.sending');
    let place: number;
    try {
      place = await opts.onSubmit(cleanName(input.value));
    } catch {
      // 연결이 안 되면 이 화면에서 다시 누르게 한다(나가려 하면 leaveRankEntry 가 기록이 사라진다고 알림)
      setState('failed');
      input.disabled = false;
      submit.textContent = label;
      submit.style.minWidth = '';
      sync();
      hint.innerHTML = `<span class="rank-error">${t('ranking.failed')}</span>${hintText ? `<br>${hintText}` : ''}`;
      net();
      return;
    }
    setState('done');
    showDone(true, place < 0 ? t('ranking.missed') : t('ranking.done', { n: place + 1 }));
    view?.removeAttribute('tabindex');
    view?.addEventListener('click', () => opts.onView!(place < 0 ? null : place));
    view?.focus();
  });
  return el;
}

/**
 * 결과 화면을 떠날 때(다시 하기·처음 화면으로·조이필드로·뒤로 가기·Esc) 부른다. host 안의 등록 카드가 아직 올리지 않은 상태(ready·failed)면
 * "등록하지 않고 나갈까요?"를 묻고 [나가기]면 go, [등록하기]·Esc·바깥 누르기·뒤로 가기면 창만 닫고 이름 칸으로 돌아간다.
 * 카드가 없거나 등록이 끝났거나 오프라인·올리는 중이면 바로 go. 이미 묻는 중이면 아무것도 하지 않는다
 */
export function leaveRankEntry(host: ParentNode, go: () => void): void {
  if (document.querySelector('.rank-leave')) return;
  const entry = host.querySelector<HTMLElement>('.rank-entry');
  const state = entry?.dataset.state as RankEntryState | undefined;
  if (!entry || !state || !UNSENT.includes(state)) return go();
  const { t } = cfg();
  const box = html(`
    <div class="rank-leave">
      <h2>${t('ranking.leaveTitle')}</h2>
      <p class="note">${t(state === 'failed' ? 'ranking.leaveFailed' : 'ranking.leaveText')}</p>
      <div class="rank-leave-actions">
        <button type="button" class="btn primary" data-stay>${t('ranking.leaveStay')}</button>
        <button type="button" class="btn secondary" data-go>${t('ranking.leaveGo')}</button>
      </div>
    </div>`);
  let leaving = false;
  const close = openModal(entry, box, t('ranking.leaveTitle'), {
    kind: 'rank-leave-modal',
    onClose: () => {
      if (leaving) return go();
      // 이름 칸으로: 휴대폰 자판이 저절로 뜨지 않게 등록 단추에 초점(이름이 비었으면 입력 칸)
      const submit = entry.querySelector<HTMLButtonElement>('[type="submit"]');
      (submit && !submit.disabled ? submit : entry.querySelector<HTMLElement>('input'))?.focus();
    },
  });
  box.querySelector('[data-stay]')!.addEventListener('click', () => close());
  box.querySelector('[data-go]')!.addEventListener('click', () => {
    leaving = true;
    close();
  });
}

export interface FlipOptions {
  /** 동작 줄이기 설정이면 true(돌리지 않고 바로 바꿈) */
  reduced?: () => boolean;
  /** 앞면이 다 펼쳐진 뒤(앞면을 평면으로 바꾸는 등) */
  onShown?: () => void;
  /** 앞면을 평면으로 바꿔 둔 경우 풀 클래스(돌리기 전에 전환 없이 3D 자세로 되돌림) */
  flatClass?: string;
}

/**
 * 도감 큰 카드 뒤집기(타임 투 플립·온실정원 도감, 기준서 5.1). flip 은 앞·뒷면을 가진 회전 요소(css: .up 이면 앞면, 전환은 css).
 * show(open, apply): 앞면끼리 바꿀 때는 옆으로 세워(90°) 안 보이는 순간에 apply(그림·설명 바꾸기)를 하고 다시 펼친다(첫 회전은 끝 자세를
 * 붙잡아 두 회전 사이에 원래 각도가 한 프레임 비치지 않게). 뒷면 ↔ 앞면은 css 전환으로 뒤집고, 잠긴 카드(open false)는 뒷면으로 돌아간 뒤 바꾼다
 */
/**
 * 일시정지 레이어(기준서 1.3, 모든 게임 같은 동작): 화면 전체를 불투명하게 덮어 판·기록·점수·시간이 보이지 않게 한다
 * (멈춘 채 판을 보며 생각·외우지 못하게). 바깥 누르기로 닫히지 않고 계속하기 단추·Esc(게임 키 처리)로만 닫힌다.
 * 열면 첫 단추(계속하기)에 초점, Tab 은 창 안에서만 돈다. 모양(배경 색·글자·단추)은 게임 css 의 .pause-menu,
 * 가리는 범위는 position: fixed; inset: 0 + 불투명 배경 + 위 메뉴보다 위(z-index 100 이상).
 * 단추 순서: 계속하기(주 단추) → 게임별 단추(예: 두더지잡기 다시 시작) → 처음 화면으로
 */
export function pauseLayer(menu: HTMLElement): (show: boolean) => void {
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  const title = menu.querySelector('h2');
  if (title) {
    title.id ||= 'jf-pause-title';
    menu.setAttribute('aria-labelledby', title.id);
  }
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const buttons = [...menu.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (!buttons.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  return (show) => {
    menu.hidden = !show;
    if (show) menu.querySelector<HTMLButtonElement>('button')?.focus();
  };
}

export function cardFlipper(flip: HTMLElement, opts: FlipOptions = {}): (open: boolean, apply: () => void) => void {
  const reduced = () => !!opts.reduced?.();
  return (open, apply) => {
    if (opts.flatClass && flip.classList.contains(opts.flatClass)) {
      flip.style.transition = 'none';
      flip.classList.remove(opts.flatClass);
      void flip.offsetWidth;
      flip.style.transition = '';
    }
    const shown = () => open && opts.onShown?.();
    const wasUp = flip.classList.contains('up');
    if (wasUp && open && !reduced()) {
      const out = flip.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(270deg)' }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        apply();
        flip.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(180deg)' }], { duration: 180, easing: 'cubic-bezier(.3,1.4,.5,1)' }).onfinish = shown;
        out.cancel();
      };
    } else {
      if (open) apply();
      else setTimeout(apply, wasUp ? 130 : 0);
      flip.classList.toggle('up', open);
      if (opts.onShown) setTimeout(shown, reduced() ? 0 : 440);
    }
  };
}

/** 순위표 한 줄의 칸(이름·순위 말고). 빈 줄에는 empty 를 쓴다 */
export interface RankColumn {
  /** 칸 클래스(.stage .score .date 등, css 가 폭·정렬을 정함) */
  cls: string;
  /** 빈 줄에 쓸 글자 */
  empty?: string;
}

export interface RankRow {
  name: string;
  dev?: string;
  /** columns 순서대로 칸 내용(HTML) */
  cells: string[];
  /** 앞 줄과 이 값이 같으면 같은 순위 번호(동률, 1·1·3 …). 없으면 줄마다 번호 */
  tieKey?: string | number;
}

export interface RankTab {
  id: string;
  label: string;
  columns: RankColumn[];
  /** 목록(ol)에 더할 클래스 */
  listClass?: string;
  /** 온라인 순위표를 받았을 때 목록 위 안내 */
  note: () => string;
  /** 지금 알고 있는 순위표(기기 사본 포함), 1위부터 */
  rows: () => RankRow[];
  /** 온라인 순위표를 받아 기기에 남긴다. 실패(오프라인 등)하면 false */
  refresh: () => Promise<boolean>;
}

export interface RankingOptions {
  gameId: string;
  tabs: RankTab[];
  /** 처음 고를 탭(없으면 조이필드 공통 기준 Joyfield.rankTab) */
  start?: string;
  /** 처음 탭에서 강조할 줄(0부터, 방금 올린 순위) */
  mark?: number | null;
  /**
   * 창 높이: 'measure' 면 모든 탭을 한 번씩 그려 가장 큰 높이로 고정(창 크기를 바꾸면 다시 잼), 그 밖의 문자열은 .modal 에 더할
   * 클래스로 보고 css 가 높이를 정한다(탭·등록 칸이 바뀌어도 탭 단추가 움직이지 않게)
   */
  height?: 'measure' | string;
  fitFont?: boolean;
}

/**
 * 랭킹 창. 탭마다 순위표를 받아 오고(받는 동안·오프라인이면 기기 사본) 보여 준다. 등록은 결과 화면에서만 한다(등록 대기 없음).
 * 탭을 고르면 조이필드 공통 최근 탭(Joyfield.setRankBoard)으로 남긴다
 */
export function openRanking(host: HTMLElement, opts: RankingOptions): () => void {
  const { t, icons } = cfg();
  const ids = opts.tabs.map((tab) => tab.id);
  let current = opts.start && ids.includes(opts.start) ? opts.start : Joyfield.rankTab(opts.gameId, ids, ids[0]);
  let highlight = opts.mark ?? null;
  const tabOf = (id: string) => opts.tabs.find((tab) => tab.id === id)!;
  const box = html(`
    <div class="ranking">
      ${closeButton()}
      <h2>${icons.trophy} ${t('ranking.title')}</h2>
      ${
        opts.tabs.length > 1
          ? `<div class="seg rank-tabs" role="group" aria-label="${t('ranking.title')}">${opts.tabs.map((tab) => `<button type="button" data-tab="${tab.id}">${tab.label}</button>`).join('')}</div>`
          : ''
      }
      <p class="note rank-note"></p>
      <div class="rank-slot"></div>
      <ol class="rank-list"></ol>
    </div>`);
  const list = box.querySelector<HTMLElement>('.rank-list')!;
  const slot = box.querySelector<HTMLElement>('.rank-slot')!;
  const note = box.querySelector<HTMLElement>('.rank-note')!;
  const status: Record<string, 'loading' | 'online' | 'offline'> = Object.fromEntries(ids.map((id) => [id, 'loading']));

  const renderNote = () => {
    const s = status[current];
    note.textContent = s === 'loading' ? t('ranking.loading') : s === 'offline' ? t('ranking.offline') : tabOf(current).note();
    note.classList.toggle('rank-error', s === 'offline');
  };
  const renderList = () => {
    const tab = tabOf(current);
    const rows = tab.rows();
    list.className = `rank-list${tab.listClass ? ` ${tab.listClass}` : ''}`;
    let no = 0;
    list.innerHTML = Array.from({ length: RANK_SIZE }, (_, i) => {
      const r = rows[i];
      if (r) no = i > 0 && r.tieKey !== undefined && rows[i - 1]?.tieKey === r.tieKey ? no : i + 1;
      const place = r ? no : i + 1;
      const cls = [place <= 3 && r ? `top top${place}` : i < 3 && !r ? `top top${i + 1}` : '', r ? '' : 'empty', r && i === highlight ? 'me' : ''].filter(Boolean).join(' ');
      const cells = tab.columns.map((c, k) => `<span class="${c.cls}">${r ? (r.cells[k] ?? '') : (c.empty ?? '')}</span>`).join('');
      return `<li class="${cls}"><span class="no">${place}</span><span class="name">${r ? r.name + Joyfield.deviceIcon(r.dev) : '-----'}</span>${cells}</li>`;
    }).join('');
  };
  const render = () => {
    box.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === current)));
    renderNote();
    // 아직 아무 기록이 없으면 첫 1위 안내
    slot.replaceChildren(...(!tabOf(current).rows().length ? [html(`<p class="note rank-empty">${t('ranking.empty')}</p>`)] : []));
    renderList();
  };
  const load = (id: string) => {
    status[id] = 'loading';
    void tabOf(id)
      .refresh()
      .then((ok) => {
        status[id] = ok ? 'online' : 'offline';
        if (current !== id || !box.isConnected) return;
        render();
      });
  };
  box.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.tab === current) return;
      current = b.dataset.tab!;
      Joyfield.setRankBoard(opts.gameId, current);
      highlight = null;
      if (status[current] !== 'online') load(current);
      render();
    }),
  );
  render();
  load(current);
  const measure = opts.height === undefined || opts.height === 'measure';
  const close = openModal(host, box, t('ranking.title'), {
    kind: measure ? undefined : opts.height,
    reopen: opts.tabs.length > 1 ? '[data-tab][aria-pressed="true"]' : undefined,
    fitFont: opts.fitFont,
    onClose: () => window.removeEventListener('resize', lockHeight),
  });
  // 탭마다 안내 문구 줄 수·빈 순위 안내가 달라 창 높이가 출렁이므로, 모든 탭을 한 번씩 그려 가장 큰 높이로 고정한다(em)
  function lockHeight() {
    if (!box.isConnected) return;
    const keep = current;
    box.style.minHeight = '';
    let tallest = 0;
    for (const id of ids) {
      current = id;
      render();
      tallest = Math.max(tallest, box.offsetHeight);
    }
    current = keep;
    render();
    box.style.minHeight = `${(tallest / parseFloat(getComputedStyle(box).fontSize)).toFixed(3)}em`;
  }
  if (measure && ids.length > 1) {
    lockHeight();
    window.addEventListener('resize', lockHeight);
  }
  return close;
}
