import './styles.css';
import { GAMES, gameVersion, iconUrl, type GameMeta } from './games';
import { LANG_LABEL, LANGS, formatNumber, getLang, t } from './i18n';
import { cachedBoard, hasRanking, loadBoard, type Row } from './rankings';
import { bestRecord, canClearRecords, clearRecords } from './records';
import { THEMES, applySettings, applyTheme, canVibrate, loadSettings, migrateLegacy, saveSetting, watchSystemTheme } from './settings';

migrateLegacy();
const settings = loadSettings();
applySettings(settings);
watchSystemTheme(() => settings.theme);

const app = document.querySelector<HTMLDivElement>('#app')!;
const live = GAMES.filter((g) => g.status === 'live');

const ICON = {
  trophy:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13v3.5M8.5 20h7M9.5 16.5h5V20h-5z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/><path d="m9.5 13.5 2 2 3.5-3.5"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.6 4.2 2.3 6 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.5 5.9-2.3 6.5-6.5z"/><path d="M18.5 15.5c.3 1.8 1 2.6 2.5 3-1.5.3-2.2 1.1-2.5 3-.3-1.9-1-2.7-2.5-3 1.5-.4 2.2-1.2 2.5-3z"/></svg>',
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- 첫 화면 ----------

/** 게임별 오프라인 캐시 여부. 화면을 그릴 때마다 다시 확인한다 */
const cached = new Map<string, boolean>();

async function refreshCached(): Promise<void> {
  await Promise.all(live.map(async (g) => cached.set(g.id, await Joypack.isGameCached(g.id))));
}

function gameCard(game: GameMeta): string {
  const name = game.name[getLang()];
  const best = bestRecord(game);
  const ready = cached.get(game.id) ?? false;
  const blocked = !navigator.onLine && !ready;
  return `
    <a class="card${blocked ? ' blocked' : ''}" href="${game.path}" style="--c:${game.color}" data-game="${game.id}"
       ${blocked ? 'aria-disabled="true"' : ''} aria-label="${esc(name)} — ${t('game.play')}">
      <span class="card-icon"><img src="${iconUrl(game)}" alt="" width="56" height="56" /></span>
      <span class="card-body">
        <strong class="card-name">${esc(name)}</strong>
        <span class="card-desc">${esc(game.desc[getLang()])}</span>
        <span class="card-meta">
          ${best ? `<span class="chip best">${ICON.trophy}${esc(best)}</span>` : ''}
          ${ready ? `<span class="chip ok">${ICON.cloud}${t('game.offlineReady')}</span>` : ''}
          ${blocked ? `<span class="chip warn">${t('game.needsOnline')}</span>` : ''}
        </span>
      </span>
      <span class="card-play" aria-hidden="true">${ICON.play}</span>
    </a>`;
}

function soonCard(game?: GameMeta): string {
  return `
    <div class="card soon" aria-label="${t('game.soon')}">
      <span class="card-icon">${game ? `<img src="${iconUrl(game)}" alt="" width="56" height="56" />` : ICON.sparkle}</span>
      <span class="card-body">
        <strong class="card-name">${esc(game ? game.name[getLang()] : t('game.next'))}</strong>
        <span class="card-desc">${esc(game ? game.desc[getLang()] : t('game.nextDesc'))}</span>
      </span>
      <span class="chip">${t('game.soon')}</span>
    </div>`;
}

function renderHome(): void {
  document.title = t('app.title');
  const soon = GAMES.filter((g) => g.status === 'soon');
  app.innerHTML = `
    <header class="top">
      <div class="brand">
        <img class="logo" src="logo.svg" alt="" width="52" height="52" />
        <div>
          <h1>${t('app.title')}</h1>
          <p class="tagline">${t('app.tagline')}</p>
        </div>
      </div>
      <div class="actions">
        <button class="icon-btn" data-open="ranking" aria-label="${t('ranking.open')}" title="${t('ranking.open')}">${ICON.trophy}</button>
        <button class="icon-btn" data-open="settings" aria-label="${t('settings.open')}" title="${t('settings.open')}">${ICON.gear}</button>
      </div>
    </header>
    ${navigator.onLine ? '' : `<p class="banner" role="status">${t('offline.banner')}</p>`}
    <section class="games" aria-label="${t('games.label')}">
      ${live.map(gameCard).join('')}
      ${soon.length ? soon.map((g) => soonCard(g)).join('') : soonCard()}
    </section>
    <footer class="foot">
      <span>${t('app.title')} v${__APP_VERSION__}</span>
    </footer>`;

  app.querySelectorAll<HTMLAnchorElement>('.card.blocked').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
  app.querySelector('[data-open="ranking"]')!.addEventListener('click', openRanking);
  app.querySelector('[data-open="settings"]')!.addEventListener('click', openSettings);
}

async function refreshHome(): Promise<void> {
  await refreshCached();
  if (!document.querySelector('dialog[open]')) renderHome();
}

// ---------- 공통: 대화 상자 ----------

function openDialog(className: string, body: string, title: string): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = `sheet ${className}`;
  dialog.setAttribute('aria-label', title);
  dialog.innerHTML = `
    <div class="sheet-head">
      <h2>${title}</h2>
      <button class="icon-btn close" aria-label="${t('close')}">${ICON.close}</button>
    </div>
    <div class="sheet-body">${body}</div>`;
  document.body.append(dialog);
  const close = () => dialog.close();
  dialog.querySelector('.close')!.addEventListener('click', close);
  // 바깥(배경)을 누르면 닫는다
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    renderHome();
  });
  dialog.showModal();
  return dialog;
}

// ---------- 전체 랭킹 ----------

const boardChoice = new Map<string, string>();

function rowsHtml(game: GameMeta, rows: Row[]): string {
  if (!rows.length) return `<p class="rank-empty">${t('ranking.empty')}</p>`;
  return `<ol class="rank-list">${rows
    .map((r, i) => {
      const value =
        'score' in r
          ? t('ranking.score', { score: formatNumber(r.score) })
          : t('ranking.tries', { tries: r.tries, time: (r.time / 1000).toFixed(1) });
      return `<li class="place-${i + 1}" style="--c:${game.color}"><span class="medal">${i + 1}</span><span class="rank-name">${esc(r.name)}</span><span class="rank-value">${value}</span></li>`;
    })
    .join('')}</ol>`;
}

function openRanking(): void {
  const games = live.filter((g) => g.ranking && hasRanking(g.id));
  const body = `
    <p class="sheet-sub">${t('ranking.sub')}</p>
    ${games
      .map((g) => {
        const board = boardChoice.get(g.id) ?? g.ranking!.default;
        return `
        <section class="rank-game" data-game="${g.id}" style="--c:${g.color}">
          <div class="rank-head">
            <img src="${iconUrl(g)}" alt="" width="32" height="32" />
            <h3>${esc(g.name[getLang()])}</h3>
            <a class="rank-more" href="${g.path}">${t('ranking.more')}</a>
          </div>
          <div class="chips" role="tablist">
            ${g.ranking!.boards
              .map((b) => `<button role="tab" class="chip-btn" data-board="${b.id}" aria-selected="${b.id === board}">${esc(b.name[getLang()])}</button>`)
              .join('')}
          </div>
          <div class="rank-rows" aria-live="polite"></div>
        </section>`;
      })
      .join('')}`;
  const dialog = openDialog('ranking', body, t('ranking.title'));

  for (const game of games) {
    const section = dialog.querySelector<HTMLElement>(`.rank-game[data-game="${game.id}"]`)!;
    const show = (board: string) => {
      boardChoice.set(game.id, board);
      section.querySelectorAll<HTMLButtonElement>('[data-board]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.board === board)));
      void showBoard(section, game, board);
    };
    section.querySelectorAll<HTMLButtonElement>('[data-board]').forEach((b) => b.addEventListener('click', () => show(b.dataset.board!)));
    show(boardChoice.get(game.id) ?? game.ranking!.default);
  }
}

async function showBoard(section: HTMLElement, game: GameMeta, board: string): Promise<void> {
  const target = section.querySelector<HTMLElement>('.rank-rows')!;
  // 응답을 기다리는 사이 다른 순위표를 고르면 늦게 온 응답은 버린다
  const req = String(Number(section.dataset.req ?? 0) + 1);
  section.dataset.req = req;
  const early = cachedBoard(game.id, board);
  target.innerHTML = early ? rowsHtml(game, early) : `<p class="rank-empty">${t('ranking.loading')}</p>`;
  try {
    const result = await loadBoard(game.id, board);
    if (section.dataset.req !== req) return;
    target.innerHTML = rowsHtml(game, result.rows) + (result.stale ? `<p class="rank-note">${t('ranking.cached')}</p>` : '');
  } catch {
    if (section.dataset.req !== req) return;
    target.innerHTML = `<p class="rank-empty">${t('ranking.error')}</p>`;
  }
}

// ---------- 설정 ----------

function seg<T extends string>(name: string, options: T[], current: T, label: (v: T) => string): string {
  return `<div class="seg" role="radiogroup" data-seg="${name}">${options
    .map((v) => `<button role="radio" data-value="${v}" aria-checked="${v === current}">${esc(label(v))}</button>`)
    .join('')}</div>`;
}

function toggle(name: string, on: boolean, label: string): string {
  return `<label class="switch"><span>${label}</span><input type="checkbox" role="switch" data-toggle="${name}" ${on ? 'checked' : ''} /><i aria-hidden="true"></i></label>`;
}

async function openSettings(): Promise<void> {
  await refreshCached();
  const body = `
    <p class="sheet-sub">${t('settings.note')}</p>
    <section class="set-group">
      <h3>${t('settings.theme')}</h3>
      ${seg('theme', THEMES, settings.theme, (v) => t(`theme.${v}`))}
    </section>
    <section class="set-group">
      <h3>${t('settings.lang')}</h3>
      ${seg('lang', LANGS, settings.lang, (v) => LANG_LABEL[v])}
    </section>
    <section class="set-group">
      <h3>${t('settings.feedback')}</h3>
      ${toggle('sound', settings.sound, t('settings.sound'))}
      ${canVibrate ? toggle('vibrate', settings.vibrate, t('settings.vibrate')) : ''}
    </section>
    <section class="set-group">
      <h3><label for="initials">${t('settings.initials')}</label></h3>
      <input id="initials" class="initials" value="${esc(settings.initials)}" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="latin" placeholder="ABCDE" />
      <p class="hint">${t('settings.initialsHint')}</p>
    </section>
    <section class="set-group">
      <h3>${t('settings.records')}</h3>
      <ul class="storage">${live
        .map(
          (g) => `<li data-game="${g.id}">
            <img src="${iconUrl(g)}" alt="" width="28" height="28" />
            <span class="storage-name">${esc(g.name[getLang()])}</span>
            <span class="storage-state">${esc(bestRecord(g) ?? t('records.none'))}</span>
            <button class="small-btn danger" data-records="${g.id}" ${canClearRecords(g) ? '' : 'disabled'}>${t('records.clear')}</button>
          </li>`,
        )
        .join('')}</ul>
      <p class="hint">${t('settings.recordsHint')}</p>
    </section>
    <section class="set-group">
      <h3>${t('settings.storage')}</h3>
      <ul class="storage">${live
        .map(
          (g) => `<li data-game="${g.id}">
            <img src="${iconUrl(g)}" alt="" width="28" height="28" />
            <span class="storage-name">${esc(g.name[getLang()])}</span>
            <span class="storage-state">${cached.get(g.id) ? t('storage.ready') : t('storage.none')}</span>
            <button class="small-btn" data-clear="${g.id}" ${cached.get(g.id) ? '' : 'disabled'}>${t('storage.clear')}</button>
          </li>`,
        )
        .join('')}</ul>
      <p class="hint">${t('settings.storageHint')}</p>
    </section>
    <section class="set-group about">
      <h3>${t('settings.about')}</h3>
      <p>${t('app.title')} v${__APP_VERSION__} · ${live.map((g) => `${esc(g.name[getLang()])} v${gameVersion(g.id)}`).join(' · ')}</p>
      <p class="hint">Font: Jua (SIL OFL 1.1)</p>
    </section>`;
  const dialog = openDialog('settings', body, t('settings.title'));

  dialog.querySelectorAll<HTMLElement>('[data-seg]').forEach((group) =>
    group.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const value = b.dataset.value!;
        group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        if (group.dataset.seg === 'theme') {
          saveSetting(settings, 'theme', value as typeof settings.theme);
          applyTheme(settings.theme);
        } else {
          // 언어는 화면 문구가 모두 바뀌므로 설정 창을 새 언어로 다시 연다
          saveSetting(settings, 'lang', value as typeof settings.lang);
          applySettings(settings);
          dialog.close();
          void openSettings();
        }
      }),
    ),
  );
  dialog.querySelectorAll<HTMLInputElement>('[data-toggle]').forEach((input) =>
    input.addEventListener('change', () => saveSetting(settings, input.dataset.toggle as 'sound' | 'vibrate', input.checked)),
  );
  const initials = dialog.querySelector<HTMLInputElement>('#initials')!;
  initials.addEventListener('input', () => {
    const clean = Joypack.cleanInitials(initials.value);
    if (clean !== initials.value) initials.value = clean;
    if (clean) saveSetting(settings, 'initials', clean);
  });
  // 내 기록 지우기: 실수로 지우지 않게 두 번 눌러야 지운다(첫 번째 누름 뒤 3초 안에 한 번 더)
  dialog.querySelectorAll<HTMLButtonElement>('[data-records]').forEach((b) => {
    let armed: ReturnType<typeof setTimeout> | undefined;
    b.addEventListener('click', () => {
      const game = live.find((g) => g.id === b.dataset.records)!;
      if (!armed) {
        b.textContent = t('records.confirm');
        b.classList.add('armed');
        armed = setTimeout(() => {
          armed = undefined;
          b.textContent = t('records.clear');
          b.classList.remove('armed');
        }, 3000);
        return;
      }
      clearTimeout(armed);
      armed = undefined;
      clearRecords(game);
      b.classList.remove('armed');
      b.textContent = t('records.cleared');
      b.disabled = true;
      b.closest('li')!.querySelector('.storage-state')!.textContent = t('records.none');
    });
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach((b) =>
    b.addEventListener('click', async () => {
      await Joypack.clearGameCache(b.dataset.clear!);
      cached.set(b.dataset.clear!, false);
      b.disabled = true;
      b.closest('li')!.querySelector('.storage-state')!.textContent = t('storage.none');
    }),
  );
}

// ---------- 시작 ----------

renderHome();
void refreshHome();

// 게임에서 뒤로 가기로 돌아오면(bfcache) 최고 기록·오프라인 표시를 새로 읽는다
window.addEventListener('pageshow', (e) => {
  if (e.persisted) void refreshHome();
});
window.addEventListener('online', () => void refreshHome());
window.addEventListener('offline', () => void refreshHome());
// 다른 탭(게임)에서 바꾼 설정·기록을 따라간다
window.addEventListener('storage', (e) => {
  if (!e.key || e.key.startsWith('joypack.') || e.key.startsWith('updown.') || e.key.startsWith('project-hammer')) {
    Object.assign(settings, loadSettings());
    applySettings(settings);
    void refreshHome();
  }
});

// 서비스 워커: 허브는 설치 때 미리 캐시, 게임은 처음 열 때 캐시(README 4.1).
// 새 버전이 화면을 넘겨받으면, 대화 상자가 열려 있지 않을 때 한 번 새로 고쳐 바로 보여 준다
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !document.querySelector('dialog[open]')) location.reload();
  });
  // 서비스 워커가 게임 캐시를 다 받으면 알려 준다 → "오프라인 가능" 표시 갱신
  navigator.serviceWorker.addEventListener('message', (e) => {
    if ((e.data as { type?: string })?.type === 'game-cached') void refreshHome();
  });
}
window.addEventListener('load', () => void Joypack.registerSW({ root: './' }));
