// 공통 모듈을 맨 먼저 불러, 이름 바꾸기 전 저장 키를 다른 코드가 읽기 전에 옮긴다
import '@joyfield/shared';
import type { VibrationName } from '@joyfield/shared';
import '@joyfield/shared/topbar.css';
import '@joyfield/shared/settings.css';
import './styles.css';
import { Sound } from './audio';
import { Game, type GameEvent, type GameResult } from './game/engine';
import { type FaceId, type ItemId } from './game/faces';
import { dateKey, dateSeed, mulberry32, randomSeed } from './game/rng';
import { WARN_MS } from './game/stages';
import { preloadFaces } from './ui/art';
import { setLang, t } from './i18n';
import { fetchBoard, submitEntry } from './online';
import { boardEntries, placeOf, type Mode, type RankEntry } from './ranking';
import { shareResult } from './share';
import { ICONS } from './ui/icons';
import { configureUi, leaveRankEntry } from '@joyfield/shared/ui';
import { emptyRecords, loadSave, writeSave } from './storage';
import { applySkin, applyTheme, resolveSkin } from './theme';
import { Board } from './ui/board';
import { Effects } from './ui/effects';
import { mountScene } from './ui/scene';
import { gameScreen, resultScreen, startScreen, type Goal, type RankingView } from './ui/screens';

const app = document.querySelector<HTMLDivElement>('#app')!;
const save = loadSave();
const sound = new Sound(save.sound);
setLang(save.lang);
applyTheme(save.theme);
applySkin(resolveSkin(save.skin, new Date()));
let teardown: (() => void) | null = null;
// 공통 화면 조각(대화상자·랭킹 창·등록 카드)이 쓸 문구·아이콘
configureUi({ t, icons: { trophy: ICONS.trophy, close: ICONS.close } });

function mount(el: HTMLElement): void {
  teardown?.();
  teardown = null;
  app.replaceChildren(el);
}

function todayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 진동: 조이필드 공통 세기표(기준서 1.7, Joyfield.vibrate) */
function vibrate(pattern: VibrationName): void {
  Joyfield.vibrate(pattern, save.vibrate);
}

/** 초 단위 글(1.5 → "1.5", 2 → "2") */
const secs = (ms: number) => String(Math.round(ms / 100) / 10);
/** 판을 깬 뒤 쉬는 시간(1.1초) 중 남은 시간 막대가 0까지 줄며 점수로 바뀌는 시간. 남은 0.3초는 빈 막대·오른 점수를 보여 준다 */
const DRAIN_MS = 800;

function cacheBoard(mode: Mode, today: string, entries: RankEntry[]): void {
  if (mode === 'classic') save.rankings.classic = entries;
  else save.rankings.daily = { date: today, entries };
  writeSave(save);
}

/** 순위표 보기·등록. day는 그 판을 시작한 날로, 오늘의 챌린지 순위표가 어느 날 것인지 정한다 */
function rankingView(day: Date): RankingView {
  const today = dateKey(day);
  return {
    save,
    today,
    todayLabel: todayLabel(day),
    async refresh(mode) {
      try {
        cacheBoard(mode, today, await fetchBoard(mode, today));
        return true;
      } catch {
        return false;
      }
    },
    // 판이 끝날 때마다 불린다: 방금 한 모드를 최근 탭으로 남기고(조이필드 공통 기준), TOP 10 에 들 자리(0부터, 못 들면 -1)를 돌려준다.
    // 등록은 결과 화면에서만 한다(등록 대기 없음, 기준서 1.6)
    consider(mode, score) {
      Joyfield.setRankBoard('timetoflip', mode);
      return placeOf(boardEntries(save.rankings, mode, today), score);
    },
    async register(mode, name, score, stage) {
      save.playerName = name;
      const { place, entries } = await submitEntry(mode, today, { name, score, stage, date: today, dev: Joyfield.playDevice() });
      cacheBoard(mode, today, entries);
      return place;
    },
  };
}

function showStart(settings?: 'open' | 'reset', settingsFocus?: string, opening = false): void {
  const today = new Date();
  // 뒤로 가기: 시작 화면에서는 조이필드로(기준서 1.3)
  Joyfield.back.screen(0);
  applySkin(resolveSkin(save.skin, today));
  mount(
    startScreen({
      save,
      today: dateKey(today),
      todayLabel: todayLabel(today),
      todaySkin: resolveSkin('auto', today),
      settings,
      settingsFocus,
      opening,
      ranking: rankingView(today),
      onPlay: play,
      onRefresh: () => showStart('open', '[data-release]'),
      onToggle(key) {
        save[key] = !save[key];
        sound.enabled = save.sound;
        writeSave(save);
      },
      onLang(lang) {
        save.lang = lang;
        setLang(lang);
        writeSave(save);
        // 글자가 모두 바뀌므로 다시 그리되, 설정 창은 깜빡임 없이 그 자리에 둔다
        const inSettings = !!document.querySelector('.modal .settings');
        showStart(inSettings ? 'open' : undefined, inSettings ? `[data-choice="lang"] [data-value="${lang}"]` : undefined);
      },
      onTheme(theme) {
        save.theme = theme;
        applyTheme(theme);
        writeSave(save);
      },
      onSkin(skin) {
        save.skin = skin;
        applySkin(resolveSkin(skin, today));
        writeSave(save);
      },
      onReset() {
        Object.assign(save, emptyRecords());
        writeSave(save);
        showStart('reset');
      },
    }),
  );
}

/** from 판부터 시작한다. 1이 아니면 출시 전 확인용 바로 시작이라 최고 기록·랭킹에 남기지 않는다 */
function play(mode: Mode, from = 1): void {
  sound.unlock();
  const daily = mode === 'daily';
  const today = new Date();
  applySkin(resolveSkin(save.skin, today));
  // 오늘의 챌린지: 카드는 날짜로 모두 같게, 위치는 시도마다 새로(다시 해서 위치를 외워 점수를 올리지 못하게)
  const game = daily ? new Game(mulberry32(dateSeed(today)), mulberry32(randomSeed())) : new Game(mulberry32(randomSeed()));
  const view = gameScreen({
    daily,
    onPause: () => game.pause(),
    onResume: () => game.resume(),
    onQuit: () => showStart(),
  });
  mount(view.el);

  const fx = new Effects(view.stage);
  const board = new Board(view.board, (i) => game.flip(i));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const cardEl = (index: number) => board.cards[index];
  /** 마지막으로 맞힌 카드. 판을 깨면 그 자리에 "남은 시간 → 점수"를 띄운다 */
  let lastMatch: HTMLElement | null = null;
  const dexBefore = new Set(save.dex);

  // 맞힌 그림은 그 자리에서 도감에 남긴다(판 도중에 나가도 사라지지 않게)
  const record = (face: FaceId, el: HTMLElement) => {
    save.pairs++;
    if (!save.dex.includes(face)) {
      save.dex.push(face);
      fx.popup(el, t('popup.new'), 'new', 380);
      writeSave(save);
    }
  };

  // 특수 카드·황금 카드를 처음 맞히면 도감 "특수 카드" 칸에 남긴다
  const recordItem = (item: ItemId, el: HTMLElement) => {
    if (save.items.includes(item)) return;
    save.items.push(item);
    fx.popup(el, t('popup.new'), 'new', 380);
    writeSave(save);
  };

  let readyInfo: { stage: string; time: string; note: string; warn: string } | null = null;
  /** 판을 깬 순간 남은 시간·그 시간으로 받은 점수. 쉬는 동안 막대가 줄며 점수가 오르는 연출(renderHud)에 쓴다 */
  let clearInfo: { left: number; timePoints: number } | null = null;
  const handle = (e: GameEvent) => {
    switch (e.type) {
      case 'deal': {
        clearInfo = null;
        board.reveal(false);
        view.el.classList.remove('revealing');
        board.deal(e.cards, e.def);
        sound.play('deal');
        // 판 시작 안내: 카드가 뒷면으로 깔린 동안 판 가운데에 판 이름 + 큰 안내 한 줄 + 3, 2, 1(renderHud).
        // 안내는 모든 판에서 같은 문장(2.4초 안에 읽히게). 닮은 카드가 처음 나오거나(5판) 늘어나는 판(8판)만 짧은 경고 한 줄을 더한다.
        // 특수·황금 카드 효과는 맞힐 때 화면에 바로 보이고 도감에 설명이 있어 따로 안내하지 않는다.
        // 판마다 시간이 달라(stages.ts STAGE_TIME) 판 이름 밑에 그 판의 제한 시간을 함께 보인다
        const twinsUp = e.stage === 5 || e.stage === 8;
        readyInfo = {
          stage: t('hud.stage', { n: e.stage }),
          time: t('ready.time', { s: secs(e.def.timeMs) }),
          note: t('ready.note'),
          warn: twinsUp ? t('banner.twins') : '',
        };
        view.showCountdown(readyInfo, 0);
        break;
      }
      case 'peekStart':
        // 3, 2, 1 이 끝나면 카드가 열려 외우는 시간
        view.showCountdown(null);
        board.startPeek();
        sound.play('flip');
        break;
      case 'peekEnd':
        board.endPeek();
        sound.play('flip');
        break;
      case 'flip':
        sound.play('flip');
        vibrate('tick');
        board.flip(e.card);
        break;
      case 'hide':
        board.hide(e.cards);
        break;
      // 소리 → 진동 → 화면 연출 순(연출에 걸리는 시간만큼 소리가 늦어지지 않게)
      case 'match': {
        const { a, b } = e;
        sound.play('match', e.combo);
        if (a.gold) sound.play('gold');
        if (a.special === 'clock') sound.play('clock');
        if (a.special === 'peek') sound.play('peek');
        const strong = a.gold || e.combo >= 5;
        vibrate(strong ? 'good' : 'match');
        board.match(a, b);
        const el = cardEl(b.index);
        lastMatch = el;
        fx.ring(cardEl(a.index), a.gold ? 'gold' : '');
        fx.ring(el, a.gold ? 'gold' : '');
        fx.burst(el, a.gold ? ['#ffd84d', '#fff3a6', '#ff9f43'] : ['#ffffff', '#ffd166', '#7dd3fc'], strong ? 12 : 8);
        fx.popup(el, `+${e.points}`, a.gold ? 'gold' : e.combo >= 3 ? 'combo' : '');
        fx.popup(cardEl(a.index), t('popup.time', { s: secs(e.gain) }), 'time');
        if (e.bonus) fx.popup(el, t(e.bonus === 'memory' ? 'popup.memory' : 'popup.lucky'), 'bonus', 200);
        if (a.special) recordItem(a.special, el);
        if (a.gold) recordItem('gold', el);
        if (a.gold) fx.popup(cardEl(a.index), t('popup.gold'), 'gold', 200);
        if (e.combo >= 3) fx.banner(t('banner.combo', { n: e.combo, m: e.multiplier }), 'combo');
        fx.shake(strong ? 'small' : 'tiny');
        if (!a.special) record(a.face as FaceId, el);
        view.el.classList.toggle('hot', e.combo >= 5);
        break;
      }
      // 돋보기: 남은 카드를 모두 보여 주는 동안 시간이 멈춘다. 스톱워치가 눈으로 바뀌어 "보는 시간"임을 알린다(막대는 그 자리에 멈춤)
      case 'reveal':
        board.reveal(true);
        view.el.classList.add('revealing');
        fx.banner(t('popup.peek'), 'peek');
        break;
      case 'revealEnd':
        board.reveal(false);
        view.el.classList.remove('revealing');
        sound.play('flip');
        break;
      case 'mismatch':
        sound.play(e.mistake ? 'mistake' : 'miss');
        if (e.mistake) vibrate('light');
        board.wrong(e.a, e.b);
        if (e.mistake) {
          fx.popup(cardEl(e.b.index), t('popup.penalty', { s: secs(e.penalty) }), 'bad');
          fx.popup(cardEl(e.a.index), t('popup.mistake'), 'bad', 120);
          view.el.classList.remove('hurt');
          void view.el.offsetWidth;
          view.el.classList.add('hurt');
        }
        view.el.classList.remove('hot');
        break;
      case 'stageClear':
        sound.play('clear');
        if (e.perfect) sound.play('perfect');
        vibrate('celebrate');
        fx.banner(e.perfect ? t('banner.perfect') : t('banner.clear', { n: e.stage }), e.perfect ? 'perfect' : 'clear');
        fx.shake('small');
        view.showMessage(`+${e.bonus.toLocaleString()}`, 'bonus');
        clearInfo = { left: e.left, timePoints: e.timePoints };
        // 남은 시간은 다음 판으로 넘어가지 않고 점수로 바뀐다: 마지막 짝 자리에 "남은 n초 → +점수"(짝 점수 팝업 뒤에)
        if (e.timePoints > 0 && lastMatch) fx.popup(lastMatch, t('popup.timeScore', { s: secs(e.left), p: e.timePoints.toLocaleString() }), 'time', 250);
        later(900, () => game.phase !== 'peek' && view.showMessage(null));
        break;
      case 'pause':
        view.showPause(true);
        syncBack();
        break;
      case 'resume':
        view.showPause(false);
        syncBack();
        break;
      case 'over':
        sound.play('end');
        vibrate('fail');
        board.showAll();
        view.el.classList.remove('hot', 'danger');
        view.showMessage(t('countdown.end'), 'end');
        fx.shake('big');
        later(1500, () => showResult(e.result, mode, today, dexBefore, from));
        break;
    }
  };
  const off = game.on(handle);
  // 뒤로 가기(기준서 1.3): 플레이 중 → 일시정지, 일시정지 중 → 시작 화면. 일시정지할 수 없는 때(끝난 뒤 등)는 바로 시작 화면
  const syncBack = () =>
    Joyfield.back.screen(game.phase === 'paused' ? 1 : 2, () => {
      const before = game.phase;
      if (before !== 'paused') game.pause();
      if (before === 'paused' || game.phase !== 'paused') showStart();
    });
  syncBack();

  // HUD: 판·점수·콤보·시간 막대. 스톱워치는 막대 끝을 따라가며 바늘이 남은 시간을 가리키고, 5초 아래면 빨개져 떤다
  let lastSecond = -1;
  let warned = false;
  let shown = { score: -1, stage: -1, combo: -1 };
  let lastCount = 0;
  const renderHud = () => {
    const { hud } = view;
    // 판을 깬 뒤 쉬는 동안: 시간 막대가 0까지 줄어드는 만큼 남은 시간 점수가 위 점수 칸에 올라간다(남은 시간은 다음 판으로 넘어가지 않음)
    const elapsed = game.clearElapsed;
    const drain = clearInfo && elapsed >= 0 ? Math.min(1, elapsed / DRAIN_MS) : -1;
    const score = drain >= 0 ? game.score - Math.round(clearInfo!.timePoints * (1 - drain)) : game.score;
    if (shown.stage !== game.stage) hud.stage.textContent = t('hud.stage', { n: game.stage });
    if (shown.score !== score) hud.score.textContent = score.toLocaleString();
    if (shown.combo !== game.combo) {
      hud.combo.textContent = game.combo >= 2 ? `${t('hud.combo')} ${game.combo}` : '';
      hud.combo.classList.toggle('on', game.combo >= 2);
    }
    shown = { score, stage: game.stage, combo: game.combo };
    // 3, 2, 1: 숫자가 바뀔 때 째깍 소리와 함께 판 가운데에 크게(카드는 아직 뒷면). 시간 막대는 외우는 시간이 꽉 찬 채로 기다린다
    const count = game.countdown;
    if (readyInfo && (game.phase === 'ready' || count)) {
      if (count && count !== lastCount) sound.play('tick');
      lastCount = count;
      view.showCountdown(readyInfo, count);
    }
    // 미리 보기 동안 시간 막대는 "외우는 시간": 카드가 열린 뒤 미리 보기 시간만큼 노랗게 줄어들고 눈 아이콘·남은 초를 보인다
    const ready = game.phase === 'ready' || (game.phase === 'paused' && game.countdown > 0);
    const peeking = game.phase === 'peek' || ready;
    view.el.classList.toggle('peeking', peeking);
    if (peeking) {
      const left = ready ? game.def.viewMs : Math.max(0, Math.min(game.phaseLeft, game.def.viewMs));
      const pr = left / game.def.viewMs;
      view.el.classList.remove('over');
      hud.bar.style.transform = `scaleX(${pr.toFixed(4)})`;
      hud.mascot.style.setProperty('--at', pr.toFixed(4));
      // 숫자 칸은 카드 뒷면으로 덮여 있다가 미리 보기가 끝나면 뒤집혀 게임 시간이 나타난다(styles.css .time-card)
      hud.time.textContent = String(Math.ceil(game.remaining / 1000));
      return;
    }
    // 막대는 그 판에 준 시간(timeMs)이 꽉 찬 상태. 판 안에서 그보다 많이 모으면 가득 찬 채로 금빛(.over)이 되고 숫자로 남은 시간을 본다
    const full = game.def.timeMs;
    const shownLeft = drain >= 0 ? clearInfo!.left * (1 - drain) : game.remaining;
    const ratio = Math.max(0, Math.min(1, shownLeft / full));
    view.el.classList.toggle('over', shownLeft > full);
    hud.bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    hud.mascot.style.setProperty('--at', ratio.toFixed(4));
    const s = shownLeft / 1000;
    hud.time.textContent = s < 10 ? s.toFixed(1) : String(Math.ceil(s));
    const danger = game.phase === 'playing' && game.remaining <= WARN_MS;
    view.el.classList.toggle('danger', danger);
    view.el.classList.toggle('low', game.phase === 'playing' && game.remaining <= 10_000);
    if (danger) {
      const sec = Math.ceil(game.remaining / 1000);
      if (sec !== lastSecond) {
        lastSecond = sec;
        sound.play(sec % 2 ? 'tick' : 'tock');
      }
      if (!warned) {
        warned = true;
        vibrate('warn');
      }
    } else if (game.remaining > WARN_MS + 1000) {
      warned = false;
    }
  };

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(now - last, 100);
    last = now;
    game.tick(dt);
    renderHud();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (game.phase === 'paused') game.resume();
      else game.pause();
    }
  };
  const onVisibility = () => {
    if (document.hidden) game.pause();
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  teardown = () => {
    writeSave(save);
    cancelAnimationFrame(raf);
    off();
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
  };

  game.start(from);
  // 키보드로 바로 고를 수 있게 첫 카드에 초점
  board.cards[0]?.focus({ preventScroll: true });
}

function nextGoal(result: GameResult, prevBest: number, isRecord: boolean): Goal {
  if (isRecord && prevBest > 0) return { type: 'record', n: result.score - prevBest };
  if (isRecord) return { type: 'first', n: 0 };
  if (result.pairsLeft > 0 && result.pairsLeft <= 3) return { type: 'pairs', n: result.pairsLeft, next: result.stage + 1 };
  if (prevBest - result.score <= Math.max(500, prevBest * 0.25)) return { type: 'gap', n: prevBest - result.score };
  return { type: 'dex', n: save.dex.length };
}

function showResult(result: GameResult, mode: Mode, date: Date, dexBefore: ReadonlySet<FaceId>, from = 1): void {
  const test = from > 1;
  const daily = mode === 'daily';
  const today = dateKey(date);
  const prevBest = daily ? (save.daily?.date === today ? save.daily.best : 0) : save.best;
  const isRecord = !test && result.score > prevBest && result.score > 0;
  if (isRecord) {
    if (daily) save.daily = { date: today, best: result.score };
    else {
      save.best = result.score;
      save.bestStage = result.stage;
    }
  }
  const newFaces = save.dex.filter((f) => !dexBefore.has(f));
  writeSave(save);
  mount(
    resultScreen({
      result,
      daily,
      isRecord,
      newFaces,
      goal: nextGoal(result, prevBest, isRecord),
      test,
      onRetry: () => leaveRankEntry(app, () => play(mode, from)),
      onHome: () => leaveRankEntry(app, () => showStart()),
      onShare: shareResult,
      ranking: rankingView(date),
    }),
  );
  if (isRecord) {
    sound.play('record');
    vibrate('big');
  }
  // 뒤로 가기: 결과 → 시작 화면(올리지 않은 랭킹 등록 카드가 있으면 먼저 묻는다)
  Joyfield.back.screen(1, () => leaveRankEntry(app, () => showStart()));
  const onKey = (e: KeyboardEvent) => {
    // 이름을 치는 중이거나 랭킹 창·등록 카드 안에서 누른 키는 그쪽에 맡긴다
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    // 결과 화면이 막혀 있는 0.6초 동안(누르던 키가 바로 다시 하기가 되지 않게)은 무시한다
    if (document.querySelector('.screen.result.locked')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as Element | null)?.closest?.('button')) return; // 초점이 간 버튼은 그 버튼이 처리
      e.preventDefault();
      leaveRankEntry(app, () => play(mode));
    } else if (e.key === 'Escape') {
      leaveRankEntry(app, () => showStart());
    }
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

// 설치 앱에서 내비게이션 바 높이가 0으로 와 아래 버튼이 바에 가리는 경우를 막는다(#app 아래 여백, styles.css)
Joyfield.guardBottom();
// 화면 높이를 css(100dvh) 대신 실제 보이는 높이로 잡는다(설치 앱에서 조이필드 → 게임으로 넘어올 때 아래가 잘리던 것)
Joyfield.trackViewport();
mountScene();
showStart(undefined, undefined, true);
document.documentElement.classList.remove('booting');

// 조이필드 서비스 워커(사이트에 하나)를 등록하고, 이 게임 파일 전체를 캐시하라고 알린다
window.addEventListener('load', () => {
  // 명화 카드 그림을 미리 받아 둔다(뒤집는 순간 빈칸이 보이지 않게)
  preloadFaces();
  void Joyfield.registerSW({ root: '../../', game: 'timetoflip' });
  // 공유 링크로 바로 들어온 사람에게 조이필드 앱 설치 안내 띠
  Joyfield.inviteBar({ root: '../../' });
});
