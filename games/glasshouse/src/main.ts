import '@joypack/shared/topbar.css';
import './styles.css';
import { Sound } from './audio';
import { FLOWER } from './flora';
import { Game, levelScore, petals } from './game/engine';
import { dailyLevel, dateKey, dayIndex } from './game/daily';
import { LEVELS, SEASON_TIP, TIPS, dailySpecies, seasonOf, speciesFor } from './game/levels';
import type { Dir } from './game/rules';
import { setLang, t } from './i18n';
import { fetchBoard, fetchDaily, submitDaily, submitEntry } from './online';
import { BOARD, clock, dailyAhead, placeOf, placeOfDaily, type DailyEntry, type RankEntry } from './ranking';
import { shareResult } from './share';
import { dailyOpen, emptyRecords, flowerCount, gardenScore, loadSave, writeSave } from './storage';
import { applySkin, applyTheme, calendarSeason, resolveSkin } from './theme';
import { BoardView } from './ui/board';
import { Effects } from './ui/effects';
import { mountScene } from './ui/scene';
import { ALL_OPEN, dailyPendingRecord, dailyResultScreen, gameScreen, resultScreen, setPageSound, startScreen, todayDaily, unlocked, type ClearResult, type DailyResult, type RankingView } from './ui/screens';

const app = document.querySelector<HTMLDivElement>('#app')!;
const save = loadSave();
const sound = new Sound(save.sound);
setLang(save.lang);
applyTheme(save.theme);
applySkin(resolveSkin(save.skin, new Date()));
setPageSound(() => sound.play('page'));
let teardown: (() => void) | null = null;

function mount(el: HTMLElement): void {
  teardown?.();
  teardown = null;
  app.replaceChildren(el);
}

/** 진동 세기는 기준서 1.7 표: 눈금 12, 가벼운 타격 30~40, 좋은 타격 [45,30,60], 성공 축하 [60,50,60,50,220] … */
function vibrate(pattern: number | number[]): void {
  if (save.vibrate) navigator.vibrate?.(pattern);
}

const today = () => dateKey(new Date());

/** 랭킹 탭 공통 기준(Joypack.rankTab)에 쓸 등록 대기 탭. 오늘의 정원 대기 기록은 그날만 유효 */
function publishPending(): void {
  const items: (string | { board: string; day: string })[] = [];
  if (save.pending && placeOf(save.rankings, save.pending.score) >= 0) items.push(BOARD);
  if (dailyPendingRecord(ranking)) items.push({ board: 'daily', day: today() });
  Joypack.setRankPending('glasshouse', items);
}

const ranking: RankingView = {
  save,
  async refresh() {
    try {
      save.rankings = await fetchBoard();
      // 새 순위표에서 10위 밖으로 밀린 대기 기록은 버린다
      if (save.pending && placeOf(save.rankings, save.pending.score) < 0) save.pending = null;
      writeSave(save);
      publishPending();
      return true;
    } catch {
      return false;
    }
  },
  consider(score, flowers) {
    Joypack.setRankBoard('glasshouse', BOARD);
    // 이미 순위표에 같은 이름으로 이 점수 이상이 올라가 있으면 대기로 두지 않는다
    const mine = save.rankings.find((e) => e.name === save.playerName);
    if (mine && mine.score >= score) return -1;
    const place = placeOf(save.rankings.filter((e) => e !== mine), score);
    if (place >= 0 && (!save.pending || save.pending.score < score)) {
      save.pending = { score, flowers };
      writeSave(save);
    }
    publishPending();
    return place;
  },
  async register(name, score, flowers) {
    save.playerName = name;
    const entry: RankEntry = { name, score, flowers, date: today() };
    const { place, entries } = await submitEntry(entry);
    save.rankings = entries;
    if (save.pending && save.pending.score <= score) save.pending = null;
    writeSave(save);
    publishPending();
    return place;
  },
  today,
  async refreshDaily() {
    const date = today();
    try {
      save.dailyRankings = { date, entries: await fetchDaily(date) };
      const p = save.dailyPending;
      if (p && (p.date !== date || placeOfDaily(save.dailyRankings.entries, p) < 0)) save.dailyPending = null;
      writeSave(save);
      publishPending();
      return true;
    } catch {
      return false;
    }
  },
  considerDaily(rec) {
    Joypack.setRankBoard('glasshouse', 'daily');
    const date = today();
    const entries = todayDaily(ranking);
    const mine = entries.find((e) => e.name === save.playerName);
    if (mine && !dailyAhead(rec, mine)) return -1;
    const place = placeOfDaily(entries.filter((e) => e !== mine), rec);
    const p = save.dailyPending;
    if (place >= 0 && (!p || p.date !== date || dailyAhead(rec, p))) {
      save.dailyPending = { ...rec, date };
      writeSave(save);
    }
    publishPending();
    return place;
  },
  async registerDaily(name, rec) {
    save.playerName = name;
    const entry: DailyEntry = { name, moves: rec.moves, time: rec.time, date: today() };
    const { place, entries } = await submitDaily(entry);
    save.dailyRankings = { date: entry.date, entries };
    const p = save.dailyPending;
    if (p && (p.date !== entry.date || !dailyAhead(p, rec))) save.dailyPending = null;
    writeSave(save);
    publishPending();
    return place;
  },
};
function showStart(settings?: 'open' | 'reset', settingsFocus?: string, opening = false): void {
  const now = new Date();
  publishPending();
  applySkin(resolveSkin(save.skin, now));
  mount(
    startScreen({
      save,
      todaySkin: calendarSeason(now),
      settings,
      settingsFocus,
      opening,
      ranking,
      onPlay: play,
      onDaily: () => play('daily'),
      onRefresh: () => showStart(),
      onToggle(key) {
        save[key] = !save[key];
        sound.enabled = save.sound;
        writeSave(save);
      },
      onLang(lang) {
        save.lang = lang;
        setLang(lang);
        writeSave(save);
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
        applySkin(resolveSkin(skin, now));
        writeSave(save);
      },
      onReset() {
        Object.assign(save, emptyRecords());
        writeSave(save);
        showStart('reset');
      },
      onDexSeen(i) {
        if (save.seen.includes(i)) return;
        save.seen.push(i);
        writeSave(save);
      },
    }),
  );
}

const DIRS: Record<string, Dir> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };

/** level: 정원 번호(0~23) 또는 오늘의 정원 */
function play(level: number | 'daily'): void {
  const daily = level === 'daily' ? dailyLevel(today()) : null;
  if (daily ? !(ALL_OPEN() || dailyOpen(save)) : !unlocked(save, level as number)) return;
  sound.unlock();
  const def = daily ?? LEVELS[level as number];
  // 출시 전 확인용으로 아직 안 열린 판을 바로 연 경우는 기록에 남기지 않는다(오늘의 정원은 순위표 등록도 막음)
  const test = daily ? !dailyOpen(save) : ALL_OPEN() && (level as number) > 0 && !save.levels[(level as number) - 1] && !save.levels[level as number];
  applySkin(resolveSkin(save.skin, new Date(), daily ? daily.season : seasonOf(level as number)));
  const game = new Game(def.rows);
  const view = gameScreen({
    level: daily ? null : (level as number),
    par: def.par,
    habits: game.board.habits,
    onPause: () => setPaused(true),
    onResume: () => setPaused(false),
    onRestart: () => {
      setPaused(false);
      restart();
    },
    onUndo: () => undo(),
    onQuit: () => showStart(),
  });
  mount(view.el);
  const species = daily
    ? dailySpecies(daily.season, game.board.habits, dayIndex(daily.date), (i) => !!save.levels[i])
    : speciesFor(level as number, game.board.habits);
  const board = new BoardView(view.boardHost, game.board, species, game.state);
  const fx = new Effects(view.stage);
  let paused = false;
  // 오늘의 정원 시간: 일시정지(화면을 떠나면 저절로 멈춤) 동안은 세지 않는다
  let spent = 0;
  let runAt: number | null = performance.now();
  const elapsed = () => Math.round(spent + (runAt === null ? 0 : performance.now() - runAt));
  const tick = view.clock ? setInterval(() => (view.clock!.textContent = clock(elapsed())), 250) : null;
  let walking: ReturnType<typeof setTimeout> | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => (timers.delete(id), fn()), ms);
    timers.add(id);
  };

  // 판 자리에 맞춰 칸 크기를 정한다(화면을 돌리거나 주소창이 접혀도 다시)
  const fit = () => board.layout(view.boardHost.clientWidth, view.boardHost.clientHeight);
  const ro = new ResizeObserver(fit);
  ro.observe(view.boardHost);

  // 처음 나오는 규칙은 그 판에서 한 번 안내한다(같은 판을 다시 해도 보임). 안내가 없으면 비워 둔다
  const tipKey = daily ? SEASON_TIP[daily.season] : TIPS[level as number];
  const tip = tipKey ? t(tipKey) : '';
  let lastHappy = game.happy;
  const render = (initial = false) => {
    view.moves.textContent = String(game.moves);
    view.moves.classList.toggle('over', game.moves > def.par);
    view.undo.disabled = !game.canUndo;
    board.beam(game.light);
    const happy = game.happy;
    const stuck = game.stuck;
    board.mood(happy, stuck);
    view.note.textContent = stuck.length ? t('tip.stuck') : tip;
    view.note.classList.toggle('warn', stuck.length > 0);
    if (!initial) {
      happy.forEach((ok, i) => {
        if (ok && !lastHappy[i] && !game.done) {
          sound.play('happy');
          vibrate(30);
          fx.ring(board.pots[i].el, game.board.habits[i]);
        } else if (!ok && lastHappy[i]) sound.play('unhappy');
      });
    }
    lastHappy = happy;
  };
  render(true);

  const stopWalk = () => {
    if (walking) clearTimeout(walking);
    walking = null;
  };

  const move = (dir: Dir) => {
    if (paused || game.done) return;
    const r = game.move(dir);
    if (!r.moved) {
      board.bump(dir);
      sound.play('bump');
      vibrate(12);
      stopWalk();
      return;
    }
    // 소리 → 진동 → 화면 연출 순
    if (r.pushed >= 0) {
      const slid = r.trail.length > 1;
      sound.play(slid ? 'slide' : 'push');
      vibrate(slid ? [30, 40, 70] : 35);
      board.place(game.state, dir, slid ? { pot: r.pushed, cells: r.trail.length } : undefined);
      fx.shake('tiny');
    } else {
      sound.play('step');
      board.place(game.state, dir);
    }
    render();
    if (game.done) clear();
  };

  const restart = () => {
    if (game.done) return;
    stopWalk();
    game.restart();
    board.place(game.state, 2);
    sound.play('undo');
    render(true);
    lastHappy = game.happy;
  };

  const undo = () => {
    stopWalk();
    if (paused || !game.undo()) return;
    sound.play('undo');
    vibrate(12);
    board.place(game.state, null);
    render();
  };

  /** 멀리 있는 칸을 누르면 화분을 밀지 않는 가장 짧은 길로 걸어간다(걸음마다 이동 수에 들어감) */
  const walkTo = (cell: number) => {
    const path = game.pathTo(cell);
    if (!path?.length) return;
    stopWalk();
    const stepNext = () => {
      const d = path.shift();
      if (d === undefined || game.done) return (walking = null);
      move(d);
      walking = setTimeout(stepNext, 85);
    };
    stepNext();
  };

  const setPaused = (on: boolean) => {
    if (game.done) return;
    paused = on;
    if (on && runAt !== null) {
      spent += performance.now() - runAt;
      runAt = null;
    } else if (!on && runAt === null) runAt = performance.now();
    stopWalk();
    view.showPause(on);
    if (!on) view.boardHost.focus({ preventScroll: true });
  };

  // 판을 깸: 누름을 막고 꽃이 차례로 피어난 뒤 결과 화면
  const clear = () => {
    stopWalk();
    if (runAt !== null) spent += performance.now() - runAt;
    runAt = null;
    if (tick) clearInterval(tick);
    if (view.clock) view.clock.textContent = clock(elapsed());
    view.el.classList.add('cleared');
    const f = FLOWER[daily ? species[0] : LEVELS[level as number].flower];
    later(260, () => {
      sound.play('bloom');
      vibrate([60, 50, 60, 50, 220]);
      fx.shake('small');
      board.bloom();
      board.pots.forEach((p, i) => later(260 + i * 320, () => fx.petals(p.el, FLOWER[species[i]].habit === 'moist' ? '#9cc4e8' : i === 0 ? accentOf(f.id) : accentOf(species[i]))));
    });
    later(2600, () => finish());
  };

  const finish = () => {
    if (daily) return finishDaily();
    const lv = level as number;
    const moves = game.moves;
    const score = levelScore(def.par, moves);
    const prev = save.levels[lv];
    const firstBloom = !prev && !test;
    const better = !test && (!prev || moves < prev.moves);
    if (better) save.levels[lv] = { moves, score, petals: petals(def.par, moves) };
    writeSave(save);
    const result: ClearResult = {
      level: lv,
      moves,
      par: def.par,
      score,
      petals: petals(def.par, moves),
      better: better && (!prev || score > prev.score),
      firstBloom,
      garden: gardenScore(save),
      flowers: flowerCount(save),
    };
    showResult(result, test);
  };

  const finishDaily = () => {
    const rec = { moves: game.moves, time: Math.max(1000, elapsed()) };
    const prev = save.daily?.date === daily!.date ? save.daily : null;
    const better = !test && (!prev || dailyAhead(rec, prev));
    if (better) save.daily = { ...rec, date: daily!.date };
    writeSave(save);
    showDailyResult({
      date: daily!.date,
      flower: species[0],
      moves: rec.moves,
      par: daily!.par,
      time: rec.time,
      petals: petals(daily!.par, rec.moves),
      better,
      best: better || !prev ? rec : { moves: prev.moves, time: prev.time },
    });
  };

  // 입력: 화살표·WASD, Z·Backspace 되돌리기, R 처음부터, Esc·P 일시정지
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as Element | null)?.closest?.('.modal')) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') return setPaused(!paused);
    if (paused) return;
    const d = DIRS[e.key];
    if (d !== undefined) {
      e.preventDefault();
      stopWalk();
      move(d);
    } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      e.preventDefault();
      undo();
    } else if (e.key === 'r' || e.key === 'R') restart();
  };
  // 판 위에서 밀기(한 칸 · 손을 떼지 않고 계속 밀면 일정 거리마다 한 칸 더) 또는 칸 누르기(옆 칸이면 한 걸음, 멀면 걸어감)
  let start: { x: number; y: number; id: number; moved: boolean } | null = null;
  const cellPx = () => view.boardHost.querySelector<HTMLElement>('.board')!.getBoundingClientRect().width / game.board.w;
  const onDown = (e: PointerEvent) => {
    if (paused || game.done) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    view.boardHost.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const need = Math.max(22, cellPx() * 0.55);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < need) return;
    stopWalk();
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
    start = { ...start, x: e.clientX, y: e.clientY, moved: true };
  };
  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const tapped = !start.moved;
    start = null;
    if (!tapped || paused || game.done) return;
    const cell = board.cellAt(e.clientX, e.clientY);
    if (cell < 0) return;
    const w = game.board.w;
    const p = game.state.player;
    const dx = (cell % w) - (p % w);
    const dy = Math.floor(cell / w) - Math.floor(p / w);
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      stopWalk();
      move(dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0);
    } else walkTo(cell);
  };
  view.boardHost.addEventListener('pointerdown', onDown);
  view.boardHost.addEventListener('pointermove', onMove);
  view.boardHost.addEventListener('pointerup', onUp);
  view.boardHost.addEventListener('pointercancel', () => (start = null));
  const onVisibility = () => document.hidden && !game.done && setPaused(true);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  teardown = () => {
    stopWalk();
    if (tick) clearInterval(tick);
    ro.disconnect();
    timers.forEach(clearTimeout);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  requestAnimationFrame(fit);
  view.boardHost.focus({ preventScroll: true });
}

/** 꽃잎 날림 색: 그 꽃의 대표 색 */
function accentOf(id: string): string {
  const c: Record<string, string> = {
    tulip: '#d2554c', daffodil: '#f1d36b', hyacinth: '#8f80cf', lily: '#f4f1e6', pansy: '#7a5fb0', peony: '#e48ba2',
    forgetmenot: '#7aa8dc', hydrangea: '#8f9ce0', lavender: '#9a80c8', iris: '#7d64b6', waterlily: '#f1dbe2', sunflower: '#e8b528',
    cosmos: '#de7fa8', lycoris: '#c23a32', gujeolcho: '#f4e6ea', dahlia: '#b93a54', aster: '#8d5fba', mum: '#e09a32',
    camellia: '#c2333f', cyclamen: '#d2466e', poinsettia: '#c62d39', hellebore: '#f1ede0', snowdrop: '#f7f6f0', adonis: '#ebc42e',
  };
  return c[id] ?? '#e9c46a';
}

function showDailyResult(result: DailyResult): void {
  mount(dailyResultScreen({ result, onRetry: () => play('daily'), onHome: () => showStart(), onShare: shareResult, ranking }));
  if (result.better) {
    sound.play('record');
    vibrate([60, 40, 120]);
  }
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    if (document.querySelector('.screen.result.locked')) return;
    if (e.key === 'r' || e.key === 'R') play('daily');
    else if (e.key === 'Escape') showStart();
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

function showResult(result: ClearResult, test: boolean): void {
  const { level } = result;
  const next = level + 1 < LEVELS.length ? level + 1 : -1;
  mount(
    resultScreen({
      result,
      test,
      onNext: next >= 0 ? () => play(next) : null,
      onRetry: () => play(level),
      onHome: () => showStart(),
      onPick: () => showStart(),
      onShare: shareResult,
      ranking,
    }),
  );
  if (result.firstBloom) sound.play('unlock');
  if (result.better && !result.firstBloom) {
    sound.play('record');
    vibrate([60, 40, 120]);
  }
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    if (document.querySelector('.screen.result.locked')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as Element | null)?.closest?.('button')) return;
      e.preventDefault();
      if (next >= 0) play(next);
    } else if (e.key === 'r' || e.key === 'R') play(level);
    else if (e.key === 'Escape') showStart();
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

Joypack.guardBottom();
Joypack.trackViewport();
mountScene();
showStart(undefined, undefined, true);
document.documentElement.classList.remove('booting');

window.addEventListener('load', () => {
  void Joypack.registerSW({ root: '../../', game: 'glasshouse' });
  Joypack.inviteBar({ root: '../../' });
});
