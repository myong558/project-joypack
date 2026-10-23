import '@joypack/shared/topbar.css';
import './styles.css';
import { Sound } from './audio';
import { Game, type GameEvent, type GameResult } from './game/engine';
import { FACE_SETS, type FaceId } from './game/faces';
import { dateKey, dateSeed, mulberry32, randomSeed } from './game/rng';
import { MAX_MS, WARN_MS } from './game/stages';
import { setLang, setName, t } from './i18n';
import { fetchBoard, submitEntry } from './online';
import { boardEntries, clearPending, keepPending, pendingRecord, placeOf, type Mode, type RankEntry } from './ranking';
import { shareResult } from './share';
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

function mount(el: HTMLElement): void {
  teardown?.();
  teardown = null;
  app.replaceChildren(el);
}

function todayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 진동 세기는 기준서 1.7 표: 눈금 12, 가벼운 타격 35, 좋은 타격 [45,30,60], 큰 사건 [60,40,120] … */
function vibrate(pattern: number | number[]): void {
  if (save.vibrate) navigator.vibrate?.(pattern);
}

/** 초 단위 글(1.5 → "1.5", 2 → "2") */
const secs = (ms: number) => String(Math.round(ms / 100) / 10);

function cacheBoard(mode: Mode, today: string, entries: RankEntry[]): void {
  if (mode === 'classic') save.rankings.classic = entries;
  else save.rankings.daily = { date: today, entries };
  writeSave(save);
  publishPending(today);
}

/** 랭킹 탭 공통 기준(Joypack.rankTab)에 쓸 등록 대기 탭 목록을 알린다. 오늘의 챌린지 대기 기록은 그날만 유효하다 */
function publishPending(today: string): void {
  const modes = (['classic', 'daily'] as Mode[]).filter((m) => pendingRecord(save.rankings, save.pending, m, today));
  Joypack.setRankPending('timetoflip', modes.map((m) => (m === 'daily' ? { board: m, day: today } : m)));
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
    // 판이 끝날 때마다 불린다: 방금 한 모드를 최근 탭으로 남기고(조이팩 공통 기준), TOP 10 에 들면 등록 대기로 둔다
    consider(mode, score, stage) {
      Joypack.setRankBoard('timetoflip', mode);
      const place = placeOf(boardEntries(save.rankings, mode, today), score);
      if (place >= 0) {
        keepPending(save.pending, mode, today, { score, stage });
        writeSave(save);
      }
      publishPending(today);
      return place;
    },
    async register(mode, name, score, stage) {
      save.playerName = name;
      const { place, entries } = await submitEntry(mode, today, { name, score, stage, date: today });
      cacheBoard(mode, today, entries);
      // 그사이 다른 사람들에게 밀려 10위 밖이 됐어도 더 올릴 수 없으므로 대기에서 지운다
      clearPending(save.pending, mode, score);
      writeSave(save);
      publishPending(today);
      return place;
    },
  };
}

function showStart(settings?: 'open' | 'reset', settingsFocus?: string, opening = false): void {
  const today = new Date();
  publishPending(dateKey(today));
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
        showStart(inSettings ? 'open' : undefined, inSettings ? `[data-lang="${lang}"]` : undefined);
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

function play(mode: Mode): void {
  sound.unlock();
  const daily = mode === 'daily';
  const today = new Date();
  applySkin(resolveSkin(save.skin, today));
  const game = new Game(mulberry32(daily ? dateSeed(today) : randomSeed()));
  const view = gameScreen({
    daily,
    onPause: () => game.pause(),
    onResume: () => game.resume(),
    onRestart: () => play(mode),
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
  const dexBefore = new Set(save.dex);

  // 맞힌 그림은 그 자리에서 도감에 남긴다(판 도중에 나가도 사라지지 않게)
  const record = (face: FaceId, gold: boolean, el: HTMLElement) => {
    save.pairs++;
    let changed = false;
    if (gold && !save.gold.includes(face)) {
      save.gold.push(face);
      changed = true;
    }
    if (!save.dex.includes(face)) {
      save.dex.push(face);
      changed = true;
      fx.popup(el, t('popup.new'), 'new', 380);
    }
    if (changed) writeSave(save);
  };

  const handle = (e: GameEvent) => {
    switch (e.type) {
      case 'deal': {
        board.deal(e.cards, e.def);
        sound.play('deal');
        // 판 이름(새 묶음이 열리면 그 이름)과 "외워 두세요!"를 한 줄로. 닮은 카드가 처음 나오거나(5판) 늘어나는 판(8판)은 경고로
        const open = FACE_SETS[e.stage - 1];
        const label = e.stage > 1 && open ? t('banner.newSet', { set: setName(open.id) }) : t('banner.stage', { n: e.stage });
        const twinsUp = e.stage === 5 || e.stage === 8;
        view.showMessage(`${label} · ${t(twinsUp ? 'banner.twins' : 'banner.ready')}`, twinsUp ? 'ready warn' : 'ready');
        break;
      }
      case 'peekEnd':
        board.endPeek();
        view.showMessage(null);
        break;
      case 'flip':
        sound.play('flip');
        vibrate(12);
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
        vibrate(strong ? [45, 30, 60] : 35);
        board.match(a, b);
        const el = cardEl(b.index);
        fx.ring(cardEl(a.index), a.gold ? 'gold' : '');
        fx.ring(el, a.gold ? 'gold' : '');
        fx.burst(el, a.gold ? ['#ffd84d', '#fff3a6', '#ff9f43'] : ['#ffffff', '#ffd166', '#7dd3fc'], strong ? 12 : 8);
        fx.popup(el, `+${e.points}`, a.gold ? 'gold' : e.combo >= 3 ? 'combo' : '');
        fx.popup(cardEl(a.index), t('popup.time', { s: secs(e.gain) }), 'time');
        if (e.bonus) fx.popup(el, t(e.bonus === 'memory' ? 'popup.memory' : 'popup.lucky'), 'bonus', 200);
        if (a.gold) fx.popup(cardEl(a.index), t('popup.gold'), 'gold', 200);
        if (e.combo >= 3) fx.banner(t('banner.combo', { n: e.combo, m: e.multiplier }), 'combo');
        fx.shake(strong ? 'small' : 'tiny');
        if (!a.special) record(a.face as FaceId, a.gold, el);
        view.el.classList.toggle('hot', e.combo >= 5);
        break;
      }
      case 'reveal':
        board.reveal(e.ms);
        fx.banner(t('popup.peek'), 'peek');
        break;
      case 'mismatch':
        sound.play(e.mistake ? 'mistake' : 'miss');
        if (e.mistake) vibrate(30);
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
        vibrate([60, 50, 60, 50, 220]);
        fx.banner(e.perfect ? t('banner.perfect', { s: secs(e.gain) }) : t('banner.clear', { n: e.stage }), e.perfect ? 'perfect' : 'clear');
        fx.shake('small');
        view.showMessage(`+${e.bonus.toLocaleString()}`, 'bonus');
        later(900, () => game.phase !== 'peek' && view.showMessage(null));
        break;
      case 'pause':
        view.showPause(true);
        break;
      case 'resume':
        view.showPause(false);
        break;
      case 'over':
        sound.play('end');
        vibrate([90, 50, 140]);
        board.showAll();
        view.el.classList.remove('hot', 'danger');
        view.showMessage(t('countdown.end'), 'end');
        fx.shake('big');
        later(1500, () => showResult(e.result, mode, today, dexBefore));
        break;
    }
  };
  const off = game.on(handle);

  // HUD: 판·점수·콤보·시간 막대. 째깍이는 막대 끝을 따라 걷고, 5초 아래면 땀을 흘리며 떤다
  let lastSecond = -1;
  let warned = false;
  let shown = { score: -1, stage: -1, combo: -1 };
  const renderHud = () => {
    const { hud } = view;
    if (shown.stage !== game.stage) hud.stage.textContent = t('hud.stage', { n: game.stage });
    if (shown.score !== game.score) hud.score.textContent = game.score.toLocaleString();
    if (shown.combo !== game.combo) {
      hud.combo.textContent = game.combo >= 2 ? `${t('hud.combo')} ${game.combo}` : '';
      hud.combo.classList.toggle('on', game.combo >= 2);
    }
    shown = { score: game.score, stage: game.stage, combo: game.combo };
    const ratio = Math.max(0, Math.min(1, game.remaining / MAX_MS));
    hud.bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    hud.mascot.style.setProperty('--at', ratio.toFixed(4));
    const s = game.remaining / 1000;
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
        vibrate([90, 70, 90]);
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

  game.start();
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

function showResult(result: GameResult, mode: Mode, date: Date, dexBefore: ReadonlySet<FaceId>): void {
  const daily = mode === 'daily';
  const today = dateKey(date);
  const prevBest = daily ? (save.daily?.date === today ? save.daily.best : 0) : save.best;
  const isRecord = result.score > prevBest && result.score > 0;
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
      onRetry: () => play(mode),
      onHome: () => showStart(),
      onShare: shareResult,
      ranking: rankingView(date),
    }),
  );
  if (isRecord) {
    sound.play('record');
    vibrate([60, 40, 120]);
  }
  const onKey = (e: KeyboardEvent) => {
    // 이름을 치는 중이거나 랭킹 창·등록 카드 안에서 누른 키는 그쪽에 맡긴다
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    // 결과 화면이 막혀 있는 0.6초 동안(누르던 키가 바로 다시 하기가 되지 않게)은 무시한다
    if (document.querySelector('.screen.result.locked')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as Element | null)?.closest?.('button')) return; // 초점이 간 버튼은 그 버튼이 처리
      e.preventDefault();
      play(mode);
    } else if (e.key === 'Escape') {
      showStart();
    }
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

// 설치 앱에서 내비게이션 바 높이가 0으로 와 아래 버튼이 바에 가리는 경우를 막는다(#app 아래 여백, styles.css)
Joypack.guardBottom();
// 화면 높이를 css(100dvh) 대신 실제 보이는 높이로 잡는다(설치 앱에서 조이팩 → 게임으로 넘어올 때 아래가 잘리던 것)
Joypack.trackViewport();
mountScene();
showStart(undefined, undefined, true);
document.documentElement.classList.remove('booting');

// 조이팩 서비스 워커(사이트에 하나)를 등록하고, 이 게임 파일 전체를 캐시하라고 알린다
window.addEventListener('load', () => {
  void Joypack.registerSW({ root: '../../', game: 'timetoflip' });
  // 공유 링크로 바로 들어온 사람에게 조이팩 앱 설치 안내 띠
  Joypack.inviteBar({ root: '../../' });
});
