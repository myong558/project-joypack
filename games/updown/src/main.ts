// 업다운: 화면 이벤트 처리, 렌더링, 최고 기록 저장, 랭킹, 서비스 워커 등록(조이필드 공통 서비스 워커).
// 언어를 바꾸면 현재 화면을 상태에서 다시 그리므로, 화면 문구는 모두 render* 함수에서 채운다.
// 공통 모듈을 맨 먼저 불러 공통 설정·뒤로 가기·진동을 쓸 수 있게 한다
import '@joyfield/shared';
import '@joyfield/shared/topbar.css';
import './styles.css';
import { configureUi, openModal, openRanking as openSharedRanking, rankEntryForm, type RankTab } from '@joyfield/shared/ui';
import { play as fx, isOn as fxOn, setOn as setFx } from './audio';
import {
  LUCK_TONE,
  PRESETS,
  clampMax,
  createGame,
  guess,
  isPreset,
  luckTier,
  remaining,
  score as scoreOf,
  thermoCost,
  thermoLimit,
  thermoStatus,
  useThermo as applyThermo,
  type GameState,
  type LuckTier,
  type Preset,
  type Temp,
} from './game/rules';
import { LANGS, getLang, luckLines, setLang, t, type Lang, type MessageKey } from './i18n';
import { fetchBoard, submitEntry } from './online';
import { keepPending, pendingRecord, placeOf, sameRecord, type PendingRecord, type RankEntry } from './ranking';
import { captureResult, shareResult } from './share';
import { apply as applySkinBg, screenScale, SKINS, type SkinSetting } from './skins';
import {
  LEGACY,
  loadBest,
  loadBoards,
  loadCustom,
  loadInitials,
  loadLuck,
  loadPending,
  loadSkin,
  saveBest,
  saveBoards,
  saveCustom,
  saveInitials,
  saveLuck,
  savePending,
  saveSkin,
} from './storage';
import { icon, SPRITE } from './ui/icons';
import { customPanel, settingsPanel, thermoPanel, type Theme } from './ui/panels';
import { APP } from './ui/screens';

// ── 화면 틀 ──
document.body.insertAdjacentHTML('afterbegin', SPRITE);
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = APP;
// 공통 화면 조각(대화상자·랭킹 창·등록 카드)이 쓸 문구·아이콘
configureUi({ t, icons: { trophy: icon('trophy'), close: icon('close') } });

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
type ScreenName = 'start' | 'play' | 'result';
const screens: Record<ScreenName, HTMLElement> = { start: $('screen-start'), play: $('screen-play'), result: $('screen-result') };

let screen: ScreenName = 'start';
let game: GameState = createGame(100);
let newBest = false;
let updateReady = false; // 새 버전 서비스 워커가 화면을 넘겨받았다. 홈으로 갈 때 새로 고친다.
let pick: number | null = null; // 다이얼로 고른 숫자. null 이면 다음 렌더링 때 범위 최솟값(왼쪽 끝)에서 시작한다.
let autoGame: GameState | null = null; // 남은 숫자가 하나라 자동으로 맞히는 중인 판(autoLastOne). 그동안 확인은 무시한다.
let best = loadBest();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// 판 결과(맞힌 뒤): 운 문구·점수·걸린 시간
interface Finish {
  score: number;
  time: number;
  luck: { tier: LuckTier; index: number };
}
let finish: Finish | null = null;

function show(name: ScreenName): void {
  screen = name;
  (Object.keys(screens) as ScreenName[]).forEach((key) => (screens[key].hidden = key !== name));
  // 왼쪽 위: 시작 화면은 조이필드 게임 목록·언어 전환, 게임 화면은 홈. 오른쪽 위 설정 버튼은 항상 보인다.
  $('hub-link').hidden = name !== 'start';
  $('lang-toggle').hidden = name !== 'start';
  $('home').hidden = name !== 'play';
  $('ranking-open').hidden = name === 'play';
  if (name !== 'start') endIntro();
  else freezeStartLayout();
  syncBack();
}

// 휴대폰 시작 화면: 처음 그린 배치(로고 위·로고와 카드 사이 여백)를 px 로 고정한다. 설치 앱에서 1~2초 뒤 화면 높이가
// 조금 줄면, 가운데 맞춤(margin auto) 때문에 로고가 줄어든 높이의 절반만큼 위로 덜컥 움직였다.
// 고정해 두면 높이가 줄어도 아래 남는 공간만 줄고(모자라면 화면 안쪽 스크롤), 폭이 바뀔 때(회전 등)만 다시 잰다.
// PC(마우스)는 창 크기를 자유롭게 바꾸므로 고정하지 않는다.
const touchScreen = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let frozenWidth = 0;
function freezeStartLayout(): void {
  if (!touchScreen || screens.start.hidden) return;
  const parts = [screens.start.firstElementChild as HTMLElement, $('difficulty-list')];
  parts.forEach((el) => (el.style.marginTop = ''));
  const margins = parts.map((el) => getComputedStyle(el).marginTop);
  parts.forEach((el, i) => (el.style.marginTop = margins[i]));
  frozenWidth = window.innerWidth;
}
window.addEventListener('resize', () => {
  if (window.innerWidth !== frozenWidth) freezeStartLayout();
});

// 첫 실행 인트로(css 의 .intro)는 한 번만 재생한다.
function endIntro(): void {
  app.classList.remove('intro');
}

// ── 컬러 모드·스킨 ──
// 컬러 모드: 'system'(기기 설정을 따름) · 'light' · 'dark'. 기본은 기기 설정이다.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let themePreference: Theme = (() => {
  const saved = Joyfield.get('theme', LEGACY.theme);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
})();
// 계절 스킨. 'auto'(기본)면 날마다 무작위 스킨을 쓴다(skins.ts 의 dailySkin)
let skinPreference: SkinSetting = (() => {
  const saved = loadSkin();
  return (SKINS as readonly string[]).includes(saved ?? '') ? (saved as SkinSetting) : 'auto';
})();

// 화면에는 항상 light/dark 둘 중 하나만 적용한다. CSS 는 data-theme='dark' 만 본다.
function applyTheme(): void {
  const dark = themePreference === 'dark' || (themePreference === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  applySkinBg(skinPreference); // 배경 입자 색도 테마를 따른다.
  updateThemeColor();
}

// 주소창·상태바 색(theme-color)을 현재 스킨·테마의 배경색에 맞춘다.
function updateThemeColor(): void {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

applyTheme();
// '기기 설정'이면 앱을 켜 둔 채 기기 설정을 바꿔도 바로 따라간다.
darkQuery.addEventListener('change', () => themePreference === 'system' && applyTheme());

// ── 문구 ──
// 화면 틀의 data-i18n* 속성이 붙은 고정 문구를 채운다.
function renderStaticTexts(): void {
  document.documentElement.lang = getLang();
  document.title = t('app.title');
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n as MessageKey)));
  // 언어 버튼 글자는 바꿀 언어로 쓰여 있으므로 그 언어를 단다(위 메뉴 공통 css 가 한글이면 조금 더 내린다)
  $('lang-toggle').querySelector('span')!.lang = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel as MessageKey)));
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder as MessageKey)));
}

// 범위 버튼 색: 1~50 초록, 1~100 파랑, 1~200 빨강
const TONES: Record<Preset, string> = { 50: 'easy', 100: 'normal', 200: 'hard' };
const TEMP_EMOJI: Record<Temp, string> = { hot: '🔥', warm: '☀️', cool: '🌊', cold: '❄️' };

const fmt = (n: number) => n.toLocaleString(getLang() === 'ko' ? 'ko-KR' : 'en-US');

/** 걸린 시간(ms) → "12.3초", 1분 이상이면 "1분 05초" */
function duration(ms: number): string {
  const total = ms / 1000;
  const min = Math.floor(total / 60);
  return t('ranking.time', { min, sec: min ? String(Math.floor(total % 60)).padStart(2, '0') : total.toFixed(1) });
}

const resultIcon = (kind: 'up' | 'down' | 'correct') => icon(kind === 'up' ? 'up' : kind === 'down' ? 'down' : 'star');
const kindOf = (r: string): 'up' | 'down' | 'correct' => (r === 'UP' ? 'up' : r === 'DOWN' ? 'down' : 'correct');

// ── 시작 화면 ──
function renderStart(): void {
  const list = $('difficulty-list');
  list.innerHTML =
    PRESETS.map((max) => {
      const level = t('board.level', { max });
      // 최고 점수가 있으면 트로피 + 점수, 없으면 "기록 없음"
      const record = best[max] ? `${icon('trophy')}${t('start.best', { score: fmt(best[max]!) })}` : t('start.noBest');
      const plain = best[max] ? t('start.best', { score: fmt(best[max]!) }) : t('start.noBest');
      // 오른쪽 둥근 시작 표시: 정보 목록이 아니라 누르면 바로 시작하는 버튼으로 보이게 한다
      return `<button type="button" class="difficulty difficulty-${TONES[max]}" data-max="${max}" aria-label="${level}, ${plain}"><span class="difficulty-label">${level}</span><span class="difficulty-detail"><span class="difficulty-best">${record}</span></span><span class="difficulty-go">${icon('play')}</span></button>`;
    }).join('') +
    // 직접 정하기(연습): 범위 버튼보다 작은 한 줄 버튼. 누르면 끝 숫자를 고르는 창이 뜬다.
    `<button type="button" class="custom-start">${icon('range')}<span class="custom-start-name">${t('custom.open')}</span><span class="custom-start-sub">${t('custom.sub')}</span></button>`;
  list.querySelectorAll<HTMLButtonElement>('[data-max]').forEach((b) => b.addEventListener('click', () => startGame(Number(b.dataset.max))));
  list.querySelector('.custom-start')!.addEventListener('click', openCustom);
}

// ── 게임 화면 ──
// animate 가 true 면 방금 나온 힌트의 애니메이션을 재생한다. 언어 전환 때는 재생하지 않는다.
function renderPlay(animate: boolean): void {
  const won = game.status === 'won';
  // 위 카드는 전체 범위(연습 판은 "연습" 표), 다이얼 위 알약은 아직 가능한 범위
  $('play-level').textContent = t('board.level', { max: game.max });
  $('play-practice').hidden = game.ranked;
  ($('play-board-icon') as unknown as SVGElement).toggleAttribute('hidden', !game.ranked);
  $('range').textContent = won ? String(game.answer) : `${game.low} ~ ${game.high}`;
  // 지금 몇 번째 추측인지(맞힌 뒤에는 맞힌 횟수)
  $('tries-count').textContent = t('play.tries', { n: game.guesses.length + (won ? 0 : 1) });
  renderBar(animate);

  const hint = $('hint');
  const last = game.guesses[game.guesses.length - 1];
  hint.textContent = '';
  hint.className = 'hint';
  // 첫 입력 전에는 문장 대신 물음표 하나만 보여준다. 범위는 위 카드에 있다.
  $('hint-value').textContent = last ? String(last.value) : '?';
  if (last) {
    const kind = kindOf(last.result);
    hint.innerHTML = resultIcon(kind) + (kind === 'correct' ? t('result.won') : last.result);
    if (animate) void hint.offsetWidth; // 같은 힌트가 연달아 나와도 애니메이션을 다시 재생한다.
    hint.className = `hint ${animate ? 'pop ' : ''}${kind}`;
  }
  renderThermo(false);
  setPick(pick === null ? game.low : pick);

  const history = $('history');
  history.innerHTML = game.guesses
    .map((g, i) => {
      const kind = kindOf(g.result);
      const temp = g.temp ? `<span class="history-temp" title="${t(`temp.${g.temp}` as MessageKey)}">${TEMP_EMOJI[g.temp]}</span>` : '';
      // "3번째" 대신 동그라미 번호를 붙인다.
      return `<li class="${g.result.toLowerCase()}"><span class="history-guess"><span class="history-no">${i + 1}</span>${g.value}</span><span class="history-result ${kind}">${temp}${resultIcon(kind)}${kind === 'correct' ? t('result.won') : g.result}</span></li>`;
    })
    .join('');
  history.dataset.empty = t('play.historyEmpty');
  // 방금 추가된 기록은 떠오르며 나타난다.
  if (animate && history.lastElementChild) history.lastElementChild.classList.add('enter');
  // 최신 기록은 맨 아래(숫자 상자 바로 위)에 붙으므로, 넘칠 때는 맨 아래가 보이게 스크롤한다.
  history.scrollTo({ top: history.scrollHeight, behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto' });
  updateHistoryFade();
}

// 온도계 자리: 쓰기 전에는 버튼(쓸 수 없는 때는 흐리게, 눌러서 이유를 본다), 쓴 직후에는 그 숫자의 온도,
// 그 뒤 숫자를 더 넣으면 "온도계 사용함". 맞힌 뒤에는 숨긴다. pop 이 true 면 온도가 톡 튀어나온다.
function renderThermo(pop: boolean): void {
  const row = document.querySelector<HTMLElement>('.temp-row')!;
  const button = $('thermo-open');
  const temp = $('temp');
  row.hidden = game.status !== 'playing';
  button.hidden = !!game.thermo;
  temp.hidden = !game.thermo;
  if (!game.thermo) {
    const cost = thermoCost(game);
    // 버튼 글자 "온도계" + 점수 차감 꼬리표 "−250점"(연습 판은 꼬리표 없음)
    $('thermo-open-label').textContent = t('thermo.open');
    $('thermo-open-cost').hidden = !cost;
    $('thermo-open-cost').textContent = cost ? t('thermo.openCost', { cost }) : '';
    button.classList.toggle('blocked', thermoStatus(game) !== 'ready');
    return;
  }
  const used = game.guesses[game.thermo.at];
  const latest = game.thermo.at === game.guesses.length - 1;
  temp.textContent = latest ? t(`temp.${used.temp}` as MessageKey) : t('thermo.used');
  temp.className = `temp ${latest ? `temp-${used.temp}` : 'temp-used'}`;
  if (pop) {
    void temp.offsetWidth;
    temp.classList.add('pop');
  }
}

// 온도계 창: 설명(한 번만·차감 점수·남은 숫자가 적으면 못 씀·시간은 흐름)과 [사용하기]. 쓸 수 없으면 이유와 [닫기]만
function openThermo(): void {
  if (game.status !== 'playing' || game.thermo || paused) return;
  const status = thermoStatus(game);
  const cost = thermoCost(game);
  const close = openModal(
    screens.play,
    thermoPanel(
      {
        ready: status === 'ready',
        block: status === 'noGuess' ? t('thermo.noGuess') : status === 'tooFew' ? t('thermo.tooFew', { n: remaining(game) }) : '',
        rules: [t('thermo.ruleOnce'), cost ? t('thermo.ruleCost', { cost }) : t('thermo.ruleFree'), t('thermo.ruleFew', { limit: thermoLimit(game) }), t('thermo.ruleTime')],
        cost,
      },
      () => {
        close();
        useThermo();
      },
    ),
    t('thermo.title'),
    // 실수로 Enter 를 눌러도 점수가 깎이지 않게 취소에 초점. 창을 닫으면 다이얼로 돌아가 바로 숫자를 고를 수 있게
    { reopen: '[data-close].secondary', onClose: () => screen === 'play' && $('dial').focus() },
  );
}

function useThermo(): void {
  const r = applyThermo(game);
  if (!r.ok) return;
  renderPlay(false);
  renderThermo(!reducedMotion.matches);
  // 아주 가까우면(🔥) 두근, 아니면 짧은 확인음
  fx(r.temp === 'hot' ? 'danger' : 'edge');
  $('dial').focus();
}

// 위로 밀려난 기록이 있으면(스크롤이 맨 위가 아니면) 판 위쪽을 흐리게 한다.
function updateHistoryFade(): void {
  const history = $('history');
  history.classList.toggle('fade-top', history.scrollTop > 0);
}

// 막대가 보여 주는 숫자 구간(barView). 숫자 v 의 칸은 v-0.5 ~ v+0.5 이다.
// 막대는 남은 범위(low~high)만 꽉 채워 보여 준다. 남은 숫자가 BAR_TICKS 개 이하로 줄면 막대 안을 숫자 칸마다 눈금으로 나눈다.
const BAR_TICKS = 20;
let barView = { from: 0.5, to: 1.5 };

// 좌우 여백(--bar-pad)을 뺀 막대 안쪽 기준 자리
function barPos(view: { from: number; to: number }, value: number): string {
  const r = (value - view.from) / (view.to - view.from);
  return `calc(var(--bar-pad) + (100% - 2 * var(--bar-pad)) * ${r})`;
}

// 새 판·언어 전환(animate 아님)은 움직이지 않고 바로 그린다.
function renderBar(animate: boolean): void {
  const bar = $('range-bar');
  const prev = barView;
  barView = { from: game.low - 0.5, to: game.high + 0.5 };
  bar.classList.toggle('instant', !animate);
  const cells = game.high - game.low + 1;
  bar.style.setProperty('--cells', String(cells));
  // 눈금이 나오면 좌우 여백 없이 꽉 채우고, 점 대신 고른 칸을 칠한다(styles.css 의 .range-bar.ticks)
  bar.classList.toggle('ticks', cells > 1 && cells <= BAR_TICKS);
  // 확대하는 동안은 고르는 자리 점도 막대와 같은 속도로 움직인다. 바로 그린 뒤에는 다시 움직임을 켠다.
  const zoom = animate && (prev.from !== barView.from || prev.to !== barView.to);
  bar.classList.toggle('zoom', zoom);
  if (zoom) setTimeout(() => bar.classList.remove('zoom'), 450);
  if (!animate) {
    void bar.offsetWidth;
    bar.classList.remove('instant');
  }
}

// 정답 축하 색종이. big 이면(최고 기록 갱신) 양쪽 아래 모서리에서도 쏘아 올려 더 크게 터진다.
function confetti(big: boolean): void {
  if (reducedMotion.matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  // PC 화면 확대 배수만큼 종이 크기·속도·중력을 키운다(배경 입자와 같은 기준).
  const scale = screenScale();
  // 색은 현재 테마의 역할 토큰을 그대로 쓴다.
  const style = getComputedStyle(document.documentElement);
  const colors = ['--up', '--down', '--star', '--success', '--heart'].map((name) => style.getPropertyValue(name).trim());
  const pieces: { x: number; y: number; vx: number; vy: number; size: number; rot: number; spin: number; color: string }[] = [];
  const burst = (x: number, y: number, count: number, angle: number, spread: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * scale * (0.5 + Math.random() * 0.7);
      pieces.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: (6 + Math.random() * 6) * scale, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.4, color: colors[i % colors.length] });
    }
  };
  burst(width / 2, height * 0.35, big ? 120 : 80, -Math.PI / 2, Math.PI * 1.6, 13);
  if (big) {
    burst(0, height, 110, -Math.PI / 3, 0.8, 24);
    burst(width, height, 110, (-Math.PI * 2) / 3, 0.8, 24);
  }
  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const step = Math.min((now - last) / 16.7, 3); // 60fps 기준 한 프레임 = 1
    last = now;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // 캔버스가 되살아나 배수가 풀려도 다시 건다
    ctx.clearRect(0, 0, width, height);
    let alive = 0;
    for (const p of pieces) {
      p.vx *= Math.pow(0.985, step);
      p.vy = p.vy * Math.pow(0.985, step) + 0.32 * scale * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rot += p.spin * step;
      if (p.y > height + 20 * scale) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      // 세로 폭을 cos 로 줄였다 늘려 종이가 뒤집히며 떨어지는 느낌을 낸다.
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.rot * 1.7)) + 1);
      ctx.restore();
    }
    if (alive && now - start < 5000) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// ── 결과 운 문구 ──
// 같은 문구가 자주 나오지 않게 단계마다 문구 순서를 섞어 차례로 꺼낸다(다 보기 전에는 다시 안 나옴).
// 섞은 순서와 꺼낸 자리를 기기에 남겨 게임을 껐다 켜도 이어서 꺼내고, 다시 섞을 때는 방금 본 문구가 맨 앞에 오지 않게 한다.
function pickLuck(tier: LuckTier): { tier: LuckTier; index: number } {
  const count = luckLines(tier).length;
  const saved = loadLuck();
  let bag = saved[tier];
  const valid = !!bag && Array.isArray(bag.order) && bag.order.length === count && bag.order.every((i) => Number.isInteger(i) && i >= 0 && i < count) && Number.isInteger(bag.next);
  if (!valid || bag.next < 0 || bag.next >= count) {
    const last = valid && bag.next > 0 ? bag.order[bag.next - 1] : -1;
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order[0] === last) order.push(order.shift()!);
    bag = { order, next: 0 };
  }
  const index = bag.order[bag.next];
  bag.next++;
  saved[tier] = bag;
  saveLuck(saved);
  return { tier, index };
}

const luckLine = (f: Finish) => luckLines(f.luck.tier)[f.luck.index] ?? '';

// ── 결과 화면 ──
// 트로피 → 운 문구 → 점수(+최고 기록) → 정답 숫자·횟수·시간 한 줄 → 랭킹 등록 → 버튼
function renderResult(): void {
  if (!finish) return;
  $('result-title').textContent = luckLine(finish);
  $('result-title').className = `luck-${LUCK_TONE[finish.luck.tier]}`;
  $('result-score').textContent = t('result.score', { score: fmt(finish.score) });
  $('result-detail').textContent = t('result.wonDetail', { answer: game.answer, tries: game.guesses.length, time: duration(finish.time) });
  $('result-practice').hidden = game.ranked;
  const thermo = $('result-thermo');
  thermo.hidden = !game.thermo;
  if (game.thermo) thermo.textContent = game.thermo.cost ? t('result.thermo', { cost: fmt(game.thermo.cost) }) : t('result.thermoFree');
  $('result-best').hidden = !newBest;
}

// ── 공유하기 ──
// 결과 화면을 찍은 이미지 + 조이필드 설치 주소를 기기 공유 창으로 보낸다(모든 게임 같은 방식, 결과 이미지는 조이필드 공통 captureResult).
// 공유 창은 버튼을 누른 직후에만 열 수 있어서 결과 화면이 뜨면 미리 찍어 둔다. 스킨·테마·언어를 바꾸면 다시 찍는다.
let shot: { game: GameState; key: string; image: Promise<Blob | null> } | null = null;
let toastTimer = 0;

function prepareShot(): Promise<Blob | null> {
  const root = document.documentElement;
  const key = [root.dataset.theme, root.dataset.skin, getLang()].join('|');
  if (!shot || shot.game !== game || shot.key !== key) shot = { game, key, image: captureResult(screens.result) };
  return shot.image;
}

function showToast(message: string, ms = 2600): void {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), ms);
}

async function share(): Promise<void> {
  const button = $<HTMLButtonElement>('share');
  button.disabled = true;
  try {
    const outcome = await shareResult(await prepareShot());
    if (outcome !== 'cancelled') showToast(t(`share.${outcome}` as MessageKey), 3200);
  } finally {
    button.disabled = false;
  }
}

// ── 랭킹(조이필드 공통 순위표 문서 방식, 범위마다 1~10위) ──
// 정답을 맞힌 판이 TOP 10 에 들면 결과 화면 버튼 위에 이름 등록 카드를 띄우고, 그 기록을 범위별 "등록 대기"로 기기에 남긴다.
// 등록하지 않고 넘어가거나 새로 고쳐도 대기 기록은 남아, 나중에 랭킹 창에서 올릴 수 있다(모든 게임 같은 방식, 기준서 1.6).
// 순위표는 마지막으로 받은 것을 기기에 두어 오프라인이어도 보여 주고 TOP 10 판단에 쓴다.
const boards = loadBoards();
const pending = loadPending();
const entries = (board: Preset) => boards[board] ?? [];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 대기 기록이 있는 범위를 조이필드 공통 랭킹 탭 기준(Joyfield.rankTab)에 알리고, 랭킹 버튼을 대표색으로 채운다(이름도 "랭킹 등록") */
function renderRankingButton(): void {
  const waiting = PRESETS.filter((b) => !!pendingRecord(entries(b), pending, b));
  Joyfield.setRankPending('updown', waiting);
  const button = $('ranking-open');
  const label = t(waiting.length ? 'ranking.register' : 'ranking.open');
  button.classList.toggle('is-on', waiting.length > 0);
  button.setAttribute('aria-label', label);
  button.title = label;
}

/** 온라인 순위표를 받아 기기에 남긴다. 10위 밖으로 밀린 대기 기록은 지운다. 실패하면 false */
async function refresh(board: Preset): Promise<boolean> {
  try {
    boards[board] = await fetchBoard(board);
  } catch {
    return false;
  }
  saveBoards(boards);
  if (pending[board] && !pendingRecord(entries(board), pending, board)) {
    delete pending[board];
    savePending(pending);
  }
  renderRankingButton();
  return true;
}

/** 지금 아는 순위표에서 이 기록의 자리(0부터, 밖이면 -1). 안에 들면 등록 대기로 남긴다 */
function consider(board: Preset, rec: PendingRecord): number {
  const place = placeOf(entries(board), rec.score);
  if (place >= 0) {
    keepPending(pending, board, rec);
    savePending(pending);
  }
  renderRankingButton();
  return place;
}

/** 온라인 순위표에 올리고 순위(0부터)를 돌려준다. 그사이 밀려났으면 -1, 연결 실패면 예외(대기 기록은 남음) */
async function register(board: Preset, name: string, rec: PendingRecord): Promise<number> {
  saveInitials(name);
  const entry: RankEntry = { name, score: rec.score, tries: rec.tries, time: rec.time, date: today(), dev: Joyfield.playDevice(), ...(rec.thermo ? { thermo: true } : {}) };
  const { place, entries: next } = await submitEntry(board, entry);
  boards[board] = next;
  saveBoards(boards);
  // 그사이 밀려 10위 밖이 됐어도 더 올릴 수 없으므로 대기에서 지운다
  if (sameRecord(pending[board], rec)) {
    delete pending[board];
    savePending(pending);
  }
  renderRankingButton();
  return place;
}

/** 랭킹 창(공통 @joyfield/shared/ui). 범위마다 탭, 줄마다 점수 + 횟수·시간(온도계를 쓴 판은 🌡️), 같은 점수는 같은 순위 */
function openRanking(mark: number | null = null, start?: Preset): void {
  const tabs: RankTab[] = PRESETS.map((board) => ({
    id: String(board),
    label: t('board.level', { max: board }),
    columns: [{ cls: 'score', empty: '-' }],
    note: () => t('ranking.note'),
    rows: () =>
      entries(board).map((e) => ({
        name: e.name,
        dev: e.dev,
        tieKey: e.score,
        cells: [
          `${t('ranking.score', { score: fmt(e.score) })}<small>${t('ranking.detail', { tries: e.tries, time: duration(e.time) })}${
            e.thermo ? ` <span class="ranking-thermo" title="${t('ranking.thermo')}" aria-label="${t('ranking.thermo')}">🌡️</span>` : ''
          }</small>`,
        ],
      })),
    pending: () => {
      const rec = pendingRecord(entries(board), pending, board);
      if (!rec) return null;
      return { title: t('ranking.pending', { score: fmt(rec.score), n: placeOf(entries(board), rec.score) + 1 }), submit: (name: string) => register(board, name, rec) };
    },
    refresh: () => refresh(board),
  }));
  openSharedRanking(document.body.querySelector<HTMLElement>('#app')!, {
    gameId: 'updown',
    tabs,
    start: start === undefined ? undefined : String(start),
    mark,
    name: loadInitials,
    onChange: renderRankingButton,
  });
}

// 결과 화면 등록 카드: 먼저 기기에 남은 순위표로 판단해 바로 보여 주고, 온라인 순위표를 받으면 자리를 다시 맞춘다
let entryCard: HTMLElement | null = null;
function showEntry(board: Preset, rec: PendingRecord, place: number): void {
  // 이미 등록했거나 이름을 치는 중이면 건드리지 않는다
  if (entryCard && (entryCard.classList.contains('done') || (entryCard.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT'))) return;
  const typed = entryCard?.querySelector('input')?.value;
  entryCard?.remove();
  entryCard =
    place >= 0
      ? rankEntryForm({
          title: t('ranking.enter', { n: place + 1 }),
          name: typed ?? loadInitials(),
          compact: true,
          onSubmit: (name) => register(board, name, rec),
          onView: (at) => openRanking(at, board),
        })
      : null;
  if (entryCard) screens.result.querySelector('.result-side')!.prepend(entryCard);
  shot = null; // 공유 이미지에는 등록 카드를 넣지 않지만 화면 높이가 바뀌므로 다시 찍는다
}

function clearEntry(): void {
  entryCard?.remove();
  entryCard = null;
}

// ── 다이얼(110° 원호) ──
// viewBox(300×105) 기준 원 중심·반지름과 원호 양 끝 각도. 왼쪽 끝(145°)이 최솟값, 오른쪽 끝(35°)이 최댓값.
const DIAL_CX = 150;
const DIAL_CY = 179;
const DIAL_R = 161;
const DIAL_START = (145 * Math.PI) / 180;
const DIAL_END = (35 * Math.PI) / 180;

const dialPoint = (angle: number) => `${(DIAL_CX + DIAL_R * Math.cos(angle)).toFixed(1)} ${(DIAL_CY - DIAL_R * Math.sin(angle)).toFixed(1)}`;
// 왼쪽 끝에서 angle 까지의 원호 경로(110° 이하라 항상 작은 호).
const dialArc = (angle: number) => `M ${dialPoint(DIAL_START)} A ${DIAL_R} ${DIAL_R} 0 0 1 ${dialPoint(angle)}`;

// 고른 숫자를 좁혀진 범위 안으로 맞추고 다이얼(손잡이·채움)과 위 숫자 상자를 갱신한다.
function setPick(value: number): void {
  const prev = pick;
  pick = Math.min(game.high, Math.max(game.low, value));
  if (prev !== null && prev !== pick) {
    // 범위 끝에 닿으면 툭(조금 센 진동 + 다이얼이 살짝 튕김), 그 사이는 눈금마다 톡(약한 진동 + 숫자 상자가 통통)
    const atEdge = game.high > game.low && (pick === game.low || pick === game.high);
    fx(atEdge ? 'edge' : 'tick');
    if (!reducedMotion.matches) {
      $('pick-value').animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 120, easing: 'ease-out' });
      if (atEdge) {
        const dx = pick === game.low ? -5 : 5;
        $('dial').animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 160, easing: 'ease-out' });
      }
    }
  }
  // 숫자가 하나만 남으면 가운데에 둔다.
  const ratio = game.high === game.low ? 0.5 : (pick - game.low) / (game.high - game.low);
  const angle = DIAL_START - (DIAL_START - DIAL_END) * ratio;
  const [x, y] = dialPoint(angle).split(' ');
  $('dial-thumb').setAttribute('cx', x);
  $('dial-thumb').setAttribute('cy', y);
  $('dial-fill').setAttribute('d', dialArc(angle));
  $('range-bar-pick').style.left = barPos(barView, pick);
  const dial = $('dial');
  dial.setAttribute('aria-valuemin', String(game.low));
  dial.setAttribute('aria-valuemax', String(game.high));
  dial.setAttribute('aria-valuenow', String(pick));
  $('pick-value').textContent = String(pick);
  $<HTMLButtonElement>('pick-down').disabled = pick <= game.low;
  $<HTMLButtonElement>('pick-up').disabled = pick >= game.high;
}

// 손가락·마우스 위치를 원호 위 각도로 바꿔 숫자를 고른다. 원호 바깥 각도(아래쪽 등)는 가까운 끝으로 붙는다.
function pickFromPointer(event: PointerEvent): void {
  // 낮은 화면에서 다이얼이 줄어 가운데 정렬돼도 맞도록 화면 좌표를 viewBox 좌표로 바꾼다.
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(($('dial') as unknown as SVGGraphicsElement).getScreenCTM()!.inverse());
  let angle = Math.atan2(DIAL_CY - point.y, point.x - DIAL_CX);
  if (angle < 0) angle = point.x < DIAL_CX ? Math.PI : 0;
  angle = Math.min(DIAL_START, Math.max(DIAL_END, angle));
  setPick(Math.round(game.low + ((DIAL_START - angle) / (DIAL_START - DIAL_END)) * (game.high - game.low)));
}

// ── 판 진행 ──
// 걸린 시간(점수에 들어감): 판 시작부터, 일시정지(뒤로 가기·앱을 내림)한 동안은 빼고 잰다
let startedAt = 0;
let pausedTotal = 0;
let pausedAt = 0;
let paused = false;
const elapsed = (now = Date.now()) => now - startedAt - pausedTotal - (paused ? now - pausedAt : 0);

// practice: 직접 정하기(연습, 랭킹 없음)
function startGame(max: number, practice = false): void {
  clearEntry();
  finish = null;
  game = createGame(max, Math.random, practice);
  startedAt = Date.now();
  pausedTotal = 0;
  paused = false;
  $('pause-menu').hidden = true;
  pick = null;
  renderPlay(false);
  show('play');
  $('dial').focus();
}

function submitGuess(event: Event): void {
  event.preventDefault();
  if (autoGame === game || paused || pick === null) return;
  // 다이얼은 좁혀진 범위 안의 숫자만 고르므로 검증에 걸리는 일은 없다(게임이 끝난 뒤 제출 등은 무시).
  if (!guess(game, pick).ok) return;
  // 맞히면 고른 숫자를 그대로 둬 막대의 점이 정답 자리에 멈춰 있게 한다.
  if (game.status !== 'playing') {
    winGuess(elapsed());
    return;
  }
  pick = null;
  const isUp = game.guesses[game.guesses.length - 1].result === 'UP';
  fx(isUp ? 'up' : 'down');
  renderPlay(true);
  guessFeedback(isUp);
  $('dial').focus();
  if (game.low === game.high) autoLastOne();
}

// 남은 숫자가 하나가 되면 고를 것이 없으니 자동으로 맞힌다. UP/DOWN 연출이 끝나면 큰 숫자를 남은 숫자로 바꾸고
// "남은 숫자 하나"를 보여 줘 왜 자동으로 넘어가는지 알게 한 뒤, 그 숫자를 낸 것으로 처리한다(시도 1번으로 센다).
// 시간은 하나로 좁혀진 순간에 멈춰 기다리는 동안은 기록에 들어가지 않는다. 그사이 홈으로 나가거나 멈추면 그만둔다(이어하면 다시)
const AUTO_SHOW = 450;
const AUTO_SUBMIT = 1050;
function autoLastOne(): void {
  const forGame = game;
  const time = elapsed();
  autoGame = game;
  const alive = () => {
    const ok = game === forGame && screen === 'play' && !paused;
    if (!ok && autoGame === forGame) autoGame = null;
    return ok;
  };
  setTimeout(() => {
    if (!alive()) return;
    $('hint-value').textContent = String(game.low);
    const hint = $('hint');
    hint.textContent = t('play.lastOne');
    hint.className = 'hint last';
    if (!reducedMotion.matches) $('hint-value').animate([{ transform: 'scale(1.3)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
  }, AUTO_SHOW);
  setTimeout(() => {
    if (!alive()) return;
    autoGame = null;
    pick = game.low;
    guess(game, pick);
    winGuess(time);
  }, AUTO_SUBMIT);
}

// 맞힌 순간: 시간을 멈추고, 맞힌 숫자와 "정답!"을 잠깐 보여 준 뒤 결과 화면으로 간다. 그사이 홈으로 나가면 결과 화면은 띄우지 않는다.
function winGuess(time: number): void {
  const forGame = game;
  renderPlay(true);
  fx('edge');
  setTimeout(() => game === forGame && screen === 'play' && finishGame(time), reducedMotion.matches ? 200 : 380);
}

// 확인 뒤 손맛 연출: 숫자가 쾅 박히고, UP/DOWN 이 그 방향으로 튀어 나오고, 화면이 그 방향으로 툭 밀렸다 돌아오고, 좁혀진 범위가 반짝인다.
function guessFeedback(isUp: boolean): void {
  if (reducedMotion.matches) return;
  $('hint-value').animate(
    [{ transform: 'scale(1.8)', opacity: 0.2 }, { transform: 'scale(0.9)', opacity: 1, offset: 0.55 }, { transform: 'scale(1.04)', offset: 0.8 }, { transform: 'scale(1)' }],
    { duration: 340, easing: 'ease-out' },
  );
  const dy = isUp ? -7 : 7;
  screens.play.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dy}px)`, offset: 0.35 }, { transform: 'translateY(0)' }], { duration: 260, easing: 'ease-out' });
  const range = $('range');
  range.classList.remove('narrowed');
  void range.offsetWidth;
  range.classList.add('narrowed');
}

function finishGame(time: number): void {
  const tries = game.guesses.length;
  const score = scoreOf(game.max, tries, time, game.thermo ? game.thermo.cost : 0);
  finish = { score, time, luck: pickLuck(luckTier(game.max, tries)) }; // 운 문구는 한 판에 한 번만 고른다(언어를 바꿔도 같은 문구의 번역)
  // 최고 점수는 랭킹 범위만 남긴다(연습 판은 남기지 않음). 랭킹 범위 판은 랭킹 창의 최근 탭으로도 남긴다
  const board = isPreset(game.max) && game.ranked ? game.max : null;
  if (board) Joyfield.setRankBoard('updown', board);
  newBest = !!board && (!best[board] || score > best[board]!);
  if (board && newBest) {
    best[board] = score;
    saveBest(best);
  }
  renderResult();
  show('result');
  // 확인 버튼을 연달아 누르던 손가락이 바로 아래 버튼을 누르지 않도록 잠깐 터치를 막는다.
  screens.result.classList.add('locked');
  setTimeout(() => screens.result.classList.remove('locked'), 600);
  $('retry').focus();
  confetti(newBest);
  fx('won');
  if (board) {
    const rec: PendingRecord = { score, tries, time, thermo: !!game.thermo };
    const forGame = game;
    showEntry(board, rec, consider(board, rec));
    void refresh(board).then((ok) => ok && game === forGame && screen === 'result' && showEntry(board, rec, consider(board, rec)));
  }
  renderRankingButton();
  // 공유 창은 누른 직후에만 열 수 있어 축하 연출이 끝나면 미리 찍어 둔다
  const forGame = game;
  setTimeout(() => game === forGame && screen === 'result' && prepareShot(), 1200);
}

function goToStart(): void {
  if (updateReady) {
    location.reload(); // 게임 중에 받아 둔 새 버전을 홈으로 갈 때 적용한다.
    return;
  }
  paused = false;
  $('pause-menu').hidden = true;
  clearEntry();
  renderStart();
  show('start');
}

// ── 일시정지·뒤로 가기(기준서 1.3) ──
// 플레이 중 뒤로 가기 → 일시정지 창, 일시정지 중 뒤로 가기 → 시작 화면, 결과 화면 → 시작 화면, 시작 화면 → 조이필드.
// 앱을 내렸을 때(화면이 가려짐)도 일시정지해 그동안 시간이 흐르지 않는다(점수 공정)
function syncBack(): void {
  if (screen === 'start') Joyfield.back.screen(0);
  else if (screen === 'result') Joyfield.back.screen(1, goToStart);
  else
    Joyfield.back.screen(paused ? 1 : 2, () => {
      if (paused || game.status !== 'playing') goToStart();
      else pause();
    });
}

function pause(): void {
  if (screen !== 'play' || paused || game.status !== 'playing') return;
  paused = true;
  pausedAt = Date.now();
  $('pause-menu').hidden = false;
  $('pause-resume').focus();
  syncBack();
}

function resume(): void {
  if (!paused) return;
  pausedTotal += Date.now() - pausedAt;
  paused = false;
  $('pause-menu').hidden = true;
  $('dial').focus();
  syncBack();
  // 남은 숫자 하나를 자동으로 맞히던 중에 멈췄으면 다시
  if (game.status === 'playing' && game.low === game.high && autoGame !== game) autoLastOne();
}

document.addEventListener('visibilitychange', () => document.hidden && pause());

// ── 언어 ──
function changeLang(lang: Lang): void {
  setLang(lang);
  renderStaticTexts();
  renderScreen();
  renderRankingButton();
  freezeStartLayout(); // 언어마다 글자 길이가 달라 배치를 다시 잰다
}

function renderScreen(): void {
  if (screen === 'play') renderPlay(false);
  else if (screen === 'result') renderResult();
  else renderStart();
}

// ── 설정 ──
function openSettings(reopen?: string): void {
  const close = openModal(
    app,
    settingsPanel({
      theme: themePreference,
      skin: skinPreference,
      sound: fxOn('sound'),
      vibrate: fxOn('vibrate'),
      best,
      onTheme: (theme) => {
        themePreference = theme;
        Joyfield.set('theme', theme, LEGACY.theme);
        applyTheme();
      },
      onSkin: (skin) => {
        skinPreference = skin as SkinSetting;
        saveSkin(skin);
        applySkinBg(skin);
        updateThemeColor();
      },
      onLang: (lang) => {
        changeLang(lang);
        // 글자가 모두 바뀌므로 설정 창을 그 자리에서 다시 그린다(등장 연출 없이, 고른 언어에 초점)
        close();
        openSettings(`[data-lang="${lang}"]`);
      },
      onToggle: (kind) => {
        setFx(kind, !fxOn(kind));
        if (fxOn(kind)) fx('up'); // 켜면 바로 맛보기로 한 번 울린다
        return fxOn(kind);
      },
      onReset: (key) => {
        if (key === 'all') best = {};
        else delete best[key as Preset];
        saveBest(best);
        renderScreen(); // 시작 화면의 범위별 최고 기록 표시도 바로 갱신한다.
      },
    }),
    t('settings.title'),
    { reopen },
  );
}

// ── 직접 정하기(연습) ──
function openCustom(): void {
  const close = openModal(
    app,
    customPanel(clampMax(loadCustom() || 500), clampMax, (max) => {
      saveCustom(max);
      close();
      startGame(max, true);
    }),
    t('custom.title'),
  );
}

// ── 이벤트 ──
const form = $<HTMLFormElement>('guess-form');
form.addEventListener('submit', submitGuess);
// 확인 버튼은 클릭을 기다리지 않고 손을 뗄 때 바로 낸다. 화면 전체가 touch-action: pan-x pan-y(joyfield.js 의 blockZoom)라
// 누르는 동안 손가락이 몇 px 만 밀려도 브라우저가 스크롤로 보고 누름을 취소해(클릭 없음) 가끔 안 눌렸다.
// 버튼은 touch-action: none 으로 스크롤 판단에서 빼고, 뗀 곳이 버튼 둘레(SUBMIT_SLOP) 안이면 낸다. 키보드 Enter·Space 는 클릭 그대로.
const submitButton = form.querySelector<HTMLButtonElement>('.dial-submit')!;
const SUBMIT_SLOP = 16;
let submitPointer: number | null = null;
let pointerSubmitAt = 0;
submitButton.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  submitPointer = event.pointerId;
  submitButton.setPointerCapture(event.pointerId);
});
submitButton.addEventListener('pointercancel', () => (submitPointer = null));
submitButton.addEventListener('pointerup', (event) => {
  if (event.pointerId !== submitPointer) return;
  submitPointer = null;
  const r = submitButton.getBoundingClientRect();
  if (event.clientX < r.left - SUBMIT_SLOP || event.clientX > r.right + SUBMIT_SLOP || event.clientY < r.top - SUBMIT_SLOP || event.clientY > r.bottom + SUBMIT_SLOP) return;
  pointerSubmitAt = Date.now();
  form.requestSubmit();
});
// 방금 손을 떼서 낸 뒤 뒤따라오는 클릭은 두 번 내지 않게 막는다
submitButton.addEventListener('click', (event) => Date.now() - pointerSubmitAt < 800 && event.preventDefault());

// 다이얼: 누른 채 끌어서 고르고, 키보드는 화살표 1, Page Up/Down 10, Home/End 양 끝, Enter 제출.
const dial = $('dial');
dial.querySelector('.dial-track')!.setAttribute('d', dialArc(DIAL_END));
dial.addEventListener('pointerdown', (event) => {
  pickFromPointer(event);
  dial.setPointerCapture(event.pointerId); // 다이얼 밖으로 끌고 나가도 계속 따라오게 한다.
  dial.classList.add('dragging'); // 끄는 동안 손잡이를 키워 손가락 아래에서도 보이게(css 의 .dragging)
});
const endDrag = () => dial.classList.remove('dragging');
dial.addEventListener('pointerup', endDrag);
dial.addEventListener('pointercancel', endDrag);
dial.addEventListener('lostpointercapture', endDrag);
dial.addEventListener('pointermove', (event) => dial.hasPointerCapture(event.pointerId) && pickFromPointer(event));
dial.addEventListener('keydown', (event) => {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
  if (event.key in steps) setPick((pick ?? game.low) + steps[event.key]);
  else if (event.key === 'Home') setPick(game.low);
  else if (event.key === 'End') setPick(game.high);
  else if (event.key === 'Enter') form.requestSubmit();
  else return;
  event.preventDefault();
});
$('pick-down').addEventListener('click', () => setPick((pick ?? game.low) - 1));
$('pick-up').addEventListener('click', () => setPick((pick ?? game.low) + 1));
$('history').addEventListener('scroll', updateHistoryFade, { passive: true });
$('home').addEventListener('click', goToStart);
$('retry').addEventListener('click', () => startGame(game.max, !game.ranked));
$('go-home').addEventListener('click', goToStart);
$('share').addEventListener('click', () => void share());
$('lang-toggle').addEventListener('click', () => changeLang(LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length]));
$('settings-open').addEventListener('click', () => openSettings());
$('ranking-open').addEventListener('click', () => openRanking());
$('thermo-open').addEventListener('click', openThermo);
$('pause-resume').addEventListener('click', resume);
$('pause-open').addEventListener('click', pause);
$('pause-quit').addEventListener('click', goToStart);

// iOS Safari 는 touchstart 리스너가 있어야 버튼에 :active(눌림 효과)를 적용한다.
document.addEventListener('touchstart', () => {}, { passive: true });

// 위 메뉴 아이콘: 조이필드 공통 그림을 넣는다
document.querySelectorAll<HTMLElement>('[data-top-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', Joyfield.topIcon(el.dataset.topIcon as 'apps')));
renderStaticTexts();
renderRankingButton();
goToStart();
// 글자를 다 채운 뒤에 화면을 보이고 인트로를 시작한다(.booting, css). 스크립트가 늦게 오면 빈 글자로 먼저 그려졌다가
// 1~2초 뒤 글자가 채워지며 위 버튼이 커지고 화면 전체가 덜컥 밀렸다
app.classList.remove('booting');
// 인트로(css 의 .intro, 마지막 '직접 정하기'가 약 1.01초에 끝남)가 끝난 뒤 클래스를 지운다
setTimeout(endIntro, 1100);

// 서비스 워커는 조이필드 사이트에 하나(../../sw.js)다. 등록하면서 이 게임 파일 전체를 캐시하라고 알린다(처음 열 때 캐시, 이후에는 바뀐 파일만).
// 새 서비스 워커가 화면을 넘겨받으면(controllerchange) 한 번 새로 고쳐 바로 새 버전을 보여 준다.
// 게임 중이면 판을 날리지 않도록 홈으로 갈 때까지 미룬다. 처음 설치(원래 담당 워커가 없음)는 새로 고치지 않는다.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || updateReady) return;
    updateReady = true;
    if (screen === 'start') location.reload();
  });
}
window.addEventListener('load', () => {
  void Joyfield.registerSW({ root: '../../', game: 'updown' });
  // 공유 링크로 바로 들어온 사람에게 조이필드 앱 설치 안내 띠
  Joyfield.inviteBar({ root: '../../' });
});
