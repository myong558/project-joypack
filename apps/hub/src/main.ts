import '@joypack/shared/topbar.css';
import './styles.css';
import { GAMES, gameVersion, iconUrl, type GameMeta } from './games';
import { LANG_LABEL, LANGS, formatNumber, getLang, t } from './i18n';
import { TOP, cachedBoard, hasRanking, loadBoard, type Row } from './rankings';
import { externalOpenUrl, installState, onInstallChange, promptInstall } from './install';
import { bestRecord, canClearRecords, clearRecords } from './records';
import { THEMES, applySettings, applyTheme, canVibrate, loadSettings, migrateLegacy, saveSetting, watchSystemTheme } from './settings';
import { SKINS, previewSkin, setPreviewSkin, todaySkin, type Skin } from './skins';

migrateLegacy();
const settings = loadSettings();
applySettings(settings);
watchSystemTheme(() => settings.theme);

const app = document.querySelector<HTMLDivElement>('#app')!;
const live = GAMES.filter((g) => g.status === 'live');

const ICON = {
  trophy:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4M12 13v3.5M8.5 20h7M9.5 16.5h5V20h-5z"/></svg>',
  // 플레이 화살표는 그림 칸에 빈 여백이 없게 딱 맞춰 그린다(여백이 있으면 버튼 안 글자와 함께 한쪽으로 쏠려 보인다)
  play: '<svg viewBox="0 0 14 16" aria-hidden="true"><path d="M1.5 1.5v13l11-6.5z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/><path d="m9.5 13.5 2 2 3.5-3.5"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.6 4.2 2.3 6 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.5 5.9-2.3 6.5-6.5z"/><path d="M18.5 15.5c.3 1.8 1 2.6 2.5 3-1.5.3-2.2 1.1-2.5 3-.3-1.9-1-2.7-2.5-3 1.5-.4 2.2-1.2 2.5-3z"/></svg>',
};

// 조이팩 로고(public/logo.svg 와 같은 그림): 레몬 상자에 게임기 부품으로 만든 웃는 얼굴.
// 첫 화면에서는 부품(십자 버튼 → 동그란 버튼 → 입 → 볼)이 하나씩 튀어 들어오도록 그림자와 함께 나눠 그린다.
// 앱 아이콘과 같은 색으로 고정한다(오늘의 톤을 따르지 않음).
const HERO_LOGO = `
  <svg class="hero-logo" viewBox="0 0 512 512" aria-hidden="true">
    <rect class="logo-box" width="512" height="512" rx="120"/>
    <g class="logo-tile" style="--i:0"><g transform="translate(0 16)"><rect x="120" y="198" width="116" height="40" rx="14" fill="#d98f00"/><rect x="158" y="160" width="40" height="116" rx="14" fill="#d98f00"/></g><rect x="120" y="198" width="116" height="40" rx="14" fill="#3d2a00"/><rect x="158" y="160" width="40" height="116" rx="14" fill="#3d2a00"/></g>
    <g class="logo-tile" style="--i:1"><g transform="translate(0 16)"><circle cx="336" cy="218" r="44" fill="#d98f00"/></g><circle cx="336" cy="218" r="44" fill="#3d2a00"/></g>
    <g class="logo-tile" style="--i:2"><g transform="translate(0 16)"><path d="M152 318 Q256 428 360 318" fill="none" stroke="#d98f00" stroke-width="40" stroke-linecap="round"/></g><path d="M152 318 Q256 428 360 318" fill="none" stroke="#3d2a00" stroke-width="40" stroke-linecap="round"/></g>
    <g class="logo-tile" style="--i:3"><circle cx="122" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/><circle cx="390" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/></g>
  </svg>`;

// 작은 로고(설치 안내·설정의 "조이팩 앱"). 파일(logo.svg)을 따로 불러오지 않고 그려 넣어,
// 주소·캐시 상태와 관계없이 늘 보인다
function smallLogo(size: number): string {
  return `
    <svg class="mini-logo" viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true">
      <rect width="512" height="512" rx="120" fill="#ffb703"/>
      <g transform="translate(0 16)"><rect x="120" y="198" width="116" height="40" rx="14" fill="#d98f00"/><rect x="158" y="160" width="40" height="116" rx="14" fill="#d98f00"/><circle cx="336" cy="218" r="44" fill="#d98f00"/><path d="M152 318 Q256 428 360 318" fill="none" stroke="#d98f00" stroke-width="40" stroke-linecap="round"/></g>
      <circle cx="122" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/><circle cx="390" cy="300" r="26" fill="#ff7a3d" opacity="0.9"/><rect x="120" y="198" width="116" height="40" rx="14" fill="#3d2a00"/><rect x="158" y="160" width="40" height="116" rx="14" fill="#3d2a00"/><circle cx="336" cy="218" r="44" fill="#3d2a00"/><path d="M152 318 Q256 428 360 318" fill="none" stroke="#3d2a00" stroke-width="40" stroke-linecap="round"/>
    </svg>`;
}

// 로고 둘레로 터지는 반짝이(첫 화면 진입 연출). --a 방향으로 날아가며 사라진다
const BURST = `<span class="burst" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${i % 3}"></i>`).join('')}</span>`;

// 배경에 떠다니는 조각: 로고 부품(십자 버튼·동그란 버튼·웃는 입·볼)이 중심이고, 오늘 톤 색의 장난감 조각(별·고리·동그라미·세모·네모)을 사이사이 섞는다.
// 화면 뒤에 한 번만 깔고 다시 그리지 않는다
const DECO_PART = {
  pad: '<rect x="2" y="8.5" width="20" height="7" rx="2.4"/><rect x="8.5" y="2" width="7" height="20" rx="2.4"/>',
  btn: '<circle cx="12" cy="12" r="9"/>',
  smile: '<path d="M4 8.5Q12 21 20 8.5"/>',
  cheek: '<circle cx="12" cy="12" r="7"/>',
  star: '<path d="M12 1.5 14.9 9.1 22.5 12 14.9 14.9 12 22.5 9.1 14.9 1.5 12 9.1 9.1z"/>',
  ring: '<circle cx="12" cy="12" r="8.5"/>',
  dot: '<circle cx="12" cy="12" r="11"/>',
  tri: '<path d="M12 2 23 22H1z"/>',
  square: '<rect x="2" y="2" width="20" height="20" rx="6"/>',
};
// [조각, 가로 %, 세로 %, 크기 px, 깊이 0 먼 층 · 1 중간 · 2 가까운 층]
// 먼 층은 작고 흐리고 느리게, 가까운 층은 크고 또렷하고 크게 움직여 깊이가 느껴지게 한다
const DECO_SHAPES = [
  ['pad', 8, 14, 46, 2],
  ['ring', 84, 9, 40, 1],
  ['btn', 88, 30, 18, 0],
  ['smile', 90, 50, 44, 2],
  ['tri', 5, 44, 20, 0],
  ['cheek', 7, 60, 28, 1],
  ['pad', 76, 78, 38, 1],
  ['dot', 92, 92, 36, 2],
  ['btn', 22, 88, 34, 2],
  ['star', 48, 4, 22, 0],
  ['cheek', 62, 18, 16, 0],
  ['smile', 16, 30, 24, 0],
  ['square', 40, 94, 26, 1],
  ['pad', 56, 62, 20, 0],
] as const;

function mountDeco(): void {
  if (document.querySelector('.bg-deco')) return;
  const deco = document.createElement('div');
  deco.className = 'bg-deco';
  deco.setAttribute('aria-hidden', 'true');
  deco.innerHTML = DECO_SHAPES.map(
    ([part, x, y, size, depth], i) =>
      `<i class="${part}" data-depth="${depth}" style="left:${x}%;top:${y}%;--i:${i};--s:${size}px"><svg viewBox="0 0 24 24">${DECO_PART[part]}</svg></i>`,
  ).join('');
  document.body.prepend(deco);
  // 시차: 손가락·마우스 위치와 스크롤에 따라 층마다 다르게 밀린다(가까운 층일수록 많이). 움직임 줄이기면 하지 않는다
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let px = 0;
  let py = 0;
  let frame = 0;
  const apply = () => {
    frame = 0;
    deco.style.setProperty('--px', px.toFixed(3));
    deco.style.setProperty('--py', py.toFixed(3));
    deco.style.setProperty('--sy', String(Math.min(scrollY, 2000)));
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };
  addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
      queue();
    },
    { passive: true },
  );
  addEventListener('scroll', queue, { passive: true });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 버튼 글자. Jua 글꼴은 글자를 글자 칸 위쪽에 그려 버튼 가운데보다 떠 보이므로 .lbl 로 감싸 살짝 내린다.
// 한글이 영문보다 더 떠 있어 한글이 든 글자는 .ko 로 조금 더 내린다(styles.css)
const lbl = (html: string) => `<span class="lbl${/[가-힣]/.test(html) ? ' ko' : ''}">${html}</span>`;

// ---------- 공유받은 링크로 들어온 사람: 첫 화면 위에 설치 안내 ----------

const DISMISS_KEY = 'joypack.installDismissed';

// 게임에서 공유 링크로 들어왔다가 허브로 넘어온 경우도 공통 모듈이 이번 방문 동안 기억해 둔다
const invited = Joypack.readInvite();

/**
 * 첫 화면 설치 안내를 보여 줄지.
 * - 이미 앱으로 실행 중이거나 방금 설치했으면 보이지 않는다
 * - 공유받은 링크로 들어왔으면 보인다(닫기 전까지)
 * - 그냥 들어온 사람은 브라우저가 설치 창을 준비해 줬을 때만(안드로이드), 한 번 닫으면 다시 안 보인다
 */
function showInstallCard(): boolean {
  const state = installState();
  if (state === 'standalone' || state === 'installed') return false;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === '1' || sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    // 저장소를 못 쓰는 환경
  }
  if (dismissed) return false;
  return invited || state === 'ready';
}

/** 설치 방법 안내 문구. 설치 창을 바로 띄울 수 있으면 없음 */
function installGuide(): string {
  const state = installState();
  if (state === 'inapp') return externalOpenUrl() ? t('install.inappGuide') : t('install.inappIosGuide');
  if (state === 'ios') return t('install.iosGuide');
  if (state === 'manual') return t('install.manualGuide');
  return '';
}

/** 설치 버튼: 설치 창을 띄우거나, 앱 안 브라우저면 기본 브라우저로 연다. 둘 다 못 하면 안내만 */
function installButton(): string {
  const state = installState();
  if (state === 'inapp') {
    return externalOpenUrl() ? `<a class="primary-btn" href="${esc(externalOpenUrl()!)}">${ICON.download}${lbl(t('install.openBrowser'))}</a>` : '';
  }
  return `<button class="primary-btn" data-install>${ICON.download}${lbl(t('install.button'))}</button>`;
}

function installCard(): string {
  if (!showInstallCard()) return '';
  const guide = installGuide();
  return `
    <section class="install-card" aria-label="${t('install.title')}">
      <div class="install-row">
        ${smallLogo(48)}
        <div>
          <strong>${invited ? t('invite.title') : t('install.title')}</strong>
          <p>${t('invite.desc')}</p>
        </div>
      </div>
      ${installButton()}
      ${guide && installState() !== 'ready' ? `<p class="install-guide" data-guide hidden>${guide}</p>` : ''}
      <button class="text-btn" data-dismiss>${lbl(t('invite.later'))}</button>
    </section>`;
}

function bindInstallCard(root: HTMLElement): void {
  const card = root.querySelector<HTMLElement>('.install-card');
  if (!card) return;
  card.querySelector('[data-install]')?.addEventListener('click', async () => {
    if (installState() === 'ready') {
      await promptInstall();
      renderHome();
    } else {
      // 설치 창을 띄울 수 없는 브라우저(아이폰 Safari 등): 직접 추가하는 방법을 펼친다
      const guide = card.querySelector<HTMLElement>('[data-guide]');
      if (guide) guide.hidden = false;
    }
  });
  // 앱 안 브라우저에서는 안내를 처음부터 보여 준다(버튼이 바깥 브라우저로 넘기기만 하므로)
  if (installState() === 'inapp') card.querySelector<HTMLElement>('[data-guide]')?.removeAttribute('hidden');
  card.querySelector('[data-dismiss]')!.addEventListener('click', () => {
    try {
      // 공유받은 사람은 이번 방문 동안만, 그냥 들어온 사람은 다시 묻지 않는다
      (invited ? sessionStorage : localStorage).setItem(DISMISS_KEY, '1');
    } catch {
      // 저장소를 못 쓰는 환경
    }
    card.remove();
  });
}

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
  // 게임 카드 = 장난감 버튼: 위는 게임 색 그림판(아이콘이 둥실), 아래는 이름·설명·기록, 맨 아래 "플레이" 버튼.
  // 게임이 계속 늘어나므로 휴대폰 두 칸, 넓은 화면은 칸 수가 늘어나는 바둑판으로 쌓는다(styles.css .games)
  return `
    <a class="card${blocked ? ' blocked' : ''}" href="${game.path}" style="--c:${game.color}" data-game="${game.id}"
       ${blocked ? 'aria-disabled="true"' : ''} aria-label="${esc(name)} — ${t('game.play')}">
      <span class="card-art"><img class="card-icon" src="${iconUrl(game)}" alt="" width="72" height="72" /></span>
      <span class="card-body">
        <strong class="card-name">${esc(name)}</strong>
        <span class="card-desc">${esc(game.desc[getLang()])}</span>
        <span class="card-meta">
          ${best ? `<span class="chip best">${ICON.trophy}${esc(best)}</span>` : ''}
          ${ready ? `<span class="chip ok">${ICON.cloud}${t('game.offlineReady')}</span>` : ''}
          ${blocked ? `<span class="chip warn">${t('game.needsOnline')}</span>` : ''}
        </span>
      </span>
      <span class="card-play" aria-hidden="true">${ICON.play}${lbl(t('game.play'))}</span>
    </a>`;
}

function soonCard(game?: GameMeta): string {
  return `
    <div class="card soon" aria-label="${t('game.soon')}">
      <span class="card-art">${game ? `<img class="card-icon" src="${iconUrl(game)}" alt="" width="72" height="72" />` : ICON.sparkle}</span>
      <span class="card-body">
        <strong class="card-name">${esc(game ? game.name[getLang()] : t('game.next'))}</strong>
        <span class="card-desc">${esc(game ? game.desc[getLang()] : t('game.nextDesc'))}</span>
      </span>
      <span class="card-play" aria-hidden="true">${lbl(t('game.soon'))}</span>
    </div>`;
}

const skinName = (skin: Skin) => t(`skin.${skin}`);

function renderHome(): void {
  document.title = t('app.title');
  const soon = GAMES.filter((g) => g.status === 'soon');
  const otherLang = LANGS.find((l) => l !== getLang())!;
  const title = [...t('app.title')].map((ch, i) => `<span style="--i:${i}">${esc(ch)}</span>`).join('');
  app.innerHTML = `
    <nav class="top jp-topbar" aria-label="${esc(t('app.title'))}">
      <div class="jp-topbar-group">
        <button class="jp-top-btn jp-top-pill lang-btn" data-lang="${otherLang}" aria-label="${t('settings.lang')}: ${LANG_LABEL[getLang()]} → ${LANG_LABEL[otherLang]}">${Joypack.topIcon('globe')}<span lang="${otherLang}">${LANG_LABEL[otherLang]}</span></button>
      </div>
      <div class="jp-topbar-group">
        <button class="jp-top-btn" data-open="ranking" aria-label="${t('ranking.open')}" title="${t('ranking.open')}">${Joypack.topIcon('trophy')}</button>
        <button class="jp-top-btn" data-open="settings" aria-label="${t('settings.open')}" title="${t('settings.open')}">${Joypack.topIcon('gear')}</button>
      </div>
    </nav>
    <main class="stage">
      <section class="hero">
        <div class="hero-mark">${BURST}${HERO_LOGO}</div>
        <h1 aria-label="${esc(t('app.title'))}"><span class="hero-title" aria-hidden="true">${title}</span></h1>
        <p class="tagline">${t('app.tagline')}</p>
      </section>
      <div class="side">
        ${navigator.onLine ? '' : `<p class="banner" role="status">${t('offline.banner')}</p>`}
        ${installCard()}
        <section class="games" aria-label="${t('games.label')}">
          ${live.map(gameCard).join('')}
          ${soon.length ? soon.map((g) => soonCard(g)).join('') : soonCard()}
        </section>
      </div>
    </main>
    <footer class="foot">
      <span>${t('app.title')} v${__APP_VERSION__}</span>
    </footer>`;

  app.querySelectorAll<HTMLElement>('.games > .card').forEach((card, i) => card.style.setProperty('--n', String(i)));
  app.querySelectorAll<HTMLAnchorElement>('.card.blocked').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
  // 게임 카드를 누르면 짧게 톡(진동 설정을 따른다)
  app.querySelectorAll<HTMLAnchorElement>('a.card:not(.blocked)').forEach((a) =>
    a.addEventListener('click', () => {
      if (canVibrate && settings.vibrate) navigator.vibrate(15);
    }),
  );
  // 로고를 누르면 얼굴 부품이 다시 한 번 통통 튄다(동작 줄이기면 CSS 가 움직임을 뺀다)
  const mark = app.querySelector<HTMLElement>('.hero-mark')!;
  mark.addEventListener('click', () => {
    mark.classList.remove('bounce');
    void mark.offsetWidth;
    mark.classList.add('bounce');
    if (canVibrate && settings.vibrate) navigator.vibrate(12);
  });
  // 언어 전환(설정의 언어와 같은 값, 모든 게임에 적용)
  app.querySelector<HTMLButtonElement>('[data-lang]')!.addEventListener('click', (e) => {
    saveSetting(settings, 'lang', (e.currentTarget as HTMLButtonElement).dataset.lang as typeof settings.lang);
    applySettings(settings);
    // 진입 연출 중이면 연출을 끝내고 바로 바뀐 언어로 그린다(연출이 처음부터 다시 돌지 않게)
    introRunning = false;
    app.classList.remove('intro');
    renderHome();
    app.querySelector<HTMLButtonElement>('[data-lang]')!.focus();
  });
  app.querySelector('[data-open="ranking"]')!.addEventListener('click', openRanking);
  app.querySelector('[data-open="settings"]')!.addEventListener('click', openSettings);
  bindInstallCard(app);
  fitScreen();
}

// ---------- 화면 크기에 맞추기 ----------
// 넓은 화면(가로 900px 이상, 또는 가로로 눕힌 휴대폰)은 왼쪽 간판·오른쪽 카드 두 단으로 놓고,
// 화면을 여백 6%를 남기고 채우도록 통째로 키운다(css 의 --z, 0.75~2.2배. 내용이 화면보다 길면 조금 줄인다).
// 게임 안의 PC 화면 확대(업다운 --pc-zoom)와 같은 방식이다. 휴대폰·태블릿 세로는 키우지 않고 칸 수로 맞춘다.
// 게임이 많아져 0.75배로도 다 안 들어가면 스크롤한다. css 의 @media 조건과 같아야 한다.
const wideQuery = matchMedia('(min-width: 900px), (orientation: landscape) and (min-width: 640px)');

function fitScreen(): void {
  const root = document.documentElement;
  if (!wideQuery.matches) {
    root.style.removeProperty('--z');
    return;
  }
  // 1배일 때의 자연 크기를 잰다(최소 높이를 잠깐 풀어 내용 높이만)
  root.style.setProperty('--z', '1');
  app.style.minHeight = '0';
  const width = app.offsetWidth;
  const height = app.offsetHeight;
  app.style.minHeight = '';
  const zoom = Math.min(2.2, Math.max(0.75, Math.min((innerWidth * 0.94) / width, (innerHeight * 0.94) / height)));
  root.style.setProperty('--z', zoom.toFixed(3));
}

let fitFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(fitScreen);
});
// 글꼴이 늦게 읽히면 글자 크기가 바뀌므로 한 번 더 맞춘다
void document.fonts?.ready.then(fitScreen);

// ---------- 첫 진입 연출 ----------
// 처음 그릴 때만 #app 에 .intro 를 붙여 로고·제목·카드가 차례로 튀어 들어오게 한다(styles.css).
// 연출 중에 다시 그리면(오프라인 표시·설치 안내 갱신 등) 요소가 새로 만들어져 연출이 처음부터 다시 돌므로,
// 그동안의 다시 그리기는 연출이 끝난 뒤 한 번으로 모은다.
const INTRO_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1900;
let introRunning = false;
let renderWaiting = false;

function requestRender(): void {
  if (document.querySelector('dialog[open]')) return;
  if (introRunning) {
    renderWaiting = true;
    return;
  }
  renderHome();
}

function startHome(): void {
  mountDeco();
  introRunning = INTRO_MS > 0;
  app.classList.toggle('intro', introRunning);
  renderHome();
  if (!introRunning) return;
  setTimeout(() => {
    introRunning = false;
    app.classList.remove('intro');
    if (renderWaiting) {
      renderWaiting = false;
      requestRender();
    }
  }, INTRO_MS);
}

// 브라우저가 설치 창을 준비하거나 설치가 끝나면 첫 화면의 안내를 다시 그린다
onInstallChange(requestRender);

async function refreshHome(): Promise<void> {
  await refreshCached();
  requestRender();
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
    requestRender();
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
            <a class="rank-more" href="${g.path}">${lbl(t('ranking.more'))}</a>
          </div>
          <div class="chips" role="tablist">
            ${g.ranking!.boards
              .map((b) => `<button role="tab" class="chip-btn" data-board="${b.id}" aria-selected="${b.id === board}">${lbl(esc(b.name[getLang()]))}</button>`)
              .join('')}
          </div>
          <div class="rank-rows" style="--rows:${TOP}" aria-live="polite"></div>
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
    .map((v) => `<button role="radio" data-value="${v}" aria-checked="${v === current}">${lbl(esc(label(v)))}</button>`)
    .join('')}</div>`;
}

function toggle(name: string, on: boolean, label: string): string {
  return `<label class="switch"><span>${label}</span><input type="checkbox" role="switch" data-toggle="${name}" ${on ? 'checked' : ''} /><i aria-hidden="true"></i></label>`;
}

async function openSettings(): Promise<void> {
  await refreshCached();
  const body = `
    <p class="sheet-sub">${t('settings.note')}</p>
    <section class="set-group dev">
      <h3>${t('settings.skinDev')}</h3>
      ${seg<Skin | 'auto'>('skin', ['auto', ...SKINS], previewSkin(), (v) => (v === 'auto' ? t('skin.auto') : skinName(v)))}
      <p class="hint">${t('settings.skinDevHint', { name: skinName(todaySkin()) })}</p>
    </section>
    <section class="set-group install" data-install-section></section>
    <section class="set-group">
      <h3>${t('share.title')}</h3>
      <p class="hint share-desc">${t('share.desc')}</p>
      <button class="primary-btn secondary" data-share>${ICON.share}${lbl(t('share.button'))}</button>
      <p class="install-guide" data-share-done role="status" hidden>${t('share.copied')}</p>
    </section>
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
            <button class="small-btn danger" data-records="${g.id}" ${canClearRecords(g) ? '' : 'disabled'}>${lbl(t('records.clear'))}</button>
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
            <button class="small-btn" data-clear="${g.id}" ${cached.get(g.id) ? '' : 'disabled'}>${lbl(t('storage.clear'))}</button>
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
  renderInstall(dialog.querySelector<HTMLElement>('[data-install-section]')!);
  dialog.querySelector('[data-share]')!.addEventListener('click', async () => {
    if (!(await shareJoypack())) dialog.querySelector<HTMLElement>('[data-share-done]')!.hidden = false;
  });

  dialog.querySelectorAll<HTMLElement>('[data-seg]').forEach((group) =>
    group.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const value = b.dataset.value!;
        group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        if (group.dataset.seg === 'theme') {
          saveSetting(settings, 'theme', value as typeof settings.theme);
          applyTheme(settings.theme);
        } else if (group.dataset.seg === 'skin') {
          // 개발용 임시: 톤 미리보기(설정 창 뒤 화면에 바로 보인다)
          setPreviewSkin(value as Skin | 'auto', settings.theme);
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
        b.innerHTML = lbl(t('records.confirm'));
        b.classList.add('armed');
        armed = setTimeout(() => {
          armed = undefined;
          b.innerHTML = lbl(t('records.clear'));
          b.classList.remove('armed');
        }, 3000);
        return;
      }
      clearTimeout(armed);
      armed = undefined;
      clearRecords(game);
      b.classList.remove('armed');
      b.innerHTML = lbl(t('records.cleared'));
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

// ---------- 조이팩 공유 ----------

/**
 * 기기 공유 창(카카오톡·문자 등)으로 보낸다. 공유 창이 없으면(주로 PC) 링크를 복사한다.
 * 공유 창으로 보냈거나 사용자가 닫았으면 true, 복사로 대신했으면 false(복사했다는 안내를 보여 준다)
 */
async function shareJoypack(): Promise<boolean> {
  // 공유할 주소: 조이팩 첫 화면 + 공유 표시(?from=share). 받은 사람이 열면 첫 화면에 설치 안내가 뜬다
  const data = { title: t('app.title'), text: t('share.text'), url: Joypack.shareUrl() };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return true;
    }
  }
  try {
    await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
  } catch {
    // 클립보드도 막혀 있으면 주소를 직접 고를 수 있게 띄운다
    prompt(t('share.button'), data.url);
  }
  return false;
}

// ---------- 앱 설치(설정의 "조이팩 다운로드") ----------

function renderInstall(section: HTMLElement, showGuide = false): void {
  const state = installState();
  const guide = installGuide();
  const button =
    state === 'standalone' || state === 'installed'
      ? `<button class="primary-btn" disabled>${ICON.check}${lbl(t('install.standalone'))}</button>`
      : installButton();
  section.innerHTML = `
    <h3>${t('install.title')}</h3>
    <div class="install-row">
      ${smallLogo(44)}
      <p>${state === 'installed' ? t('install.installed') : t('install.desc')}</p>
    </div>
    ${state === 'installed' ? '' : button}
    ${(showGuide || state === 'inapp') && guide ? `<p class="install-guide" role="status">${guide}</p>` : ''}`;
  section.querySelector('[data-install]')?.addEventListener('click', async () => {
    // 브라우저가 설치 창을 준비해 두었으면 바로 띄우고, 아니면(아이폰 등) 직접 추가하는 방법을 보여 준다
    if (installState() === 'ready') await promptInstall();
    renderInstall(section, true);
  });
  // 설정 창을 연 채로 설치 가능 상태가 바뀌면(설치 창 준비·설치 완료) 다시 그린다
  const off = onInstallChange(() => {
    if (section.isConnected) renderInstall(section);
    off();
  });
}

// ---------- 시작 ----------

// 오프라인 가능 표시를 처음부터 넣어 그리도록 캐시 확인을 잠깐(최대 0.3초) 기다린다. 연출 중에 바뀌면 끝난 뒤 다시 그린다
const firstCheck = refreshCached();
// 0.3초 안에 끝나지 않았으면 끝난 뒤 한 번 더 그린다(아직 그리기 전이면 건너뜀)
void firstCheck.then(() => app.childElementCount && requestRender());
void Promise.race([firstCheck, new Promise((r) => setTimeout(r, 300))]).then(startHome);

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
