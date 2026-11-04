import '@joypack/shared/topbar.css';
import './styles.css';
import { Sound } from './audio';
import { FLOWER } from './flora';
import { Game, levelScore, petals } from './game/engine';
import { dailyLevel, dateKey, dayIndex } from './game/daily';
import { LEVELS, TIPS, dailySpecies, speciesFor } from './game/levels';
import { step, type Dir, type State } from './game/rules';
import { SOLUTIONS } from './game/solutions';
import { setLang, t } from './i18n';
import { fetchBoard, fetchDaily, submitDaily, submitEntry } from './online';
import { BOARD, dailyAhead, placeOf, placeOfDaily, type DailyEntry, type RankEntry } from './ranking';
import { shareResult } from './share';
import { emptyRecords, flowerCount, gardenScore, loadSave, writeSave } from './storage';
import { applySkin, applyTheme, resolveSkin, todaySkin } from './theme';
import { BoardView, IDLE_KINDS, type IdleKind } from './ui/board';
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
      todaySkin: todaySkin(now),
      settings,
      settingsFocus,
      opening,
      ranking,
      onPlay: play,
      onDaily: () => play('daily'),
      onRefresh: (settings) => showStart(settings ? 'open' : undefined, '[data-release]'),
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
  if (!daily && !unlocked(save, level as number)) return;
  sound.unlock();
  const def = daily ?? LEVELS[level as number];
  // 출시 전 확인용으로 아직 안 열린 판을 바로 연 경우는 기록에 남기지 않는다(오늘의 정원은 순위표 등록도 막음)
  const test = !daily && ALL_OPEN() && (level as number) > 0 && !save.levels[(level as number) - 1] && !save.levels[level as number];
  applySkin(resolveSkin(save.skin, new Date()));
  const game = new Game(def.rows);
  const species = daily
    ? dailySpecies(game.state.pots.length, dayIndex(daily.date), (i) => !!save.levels[i])
    : speciesFor(level as number, game.state.pots.length);
  const view = gameScreen({
    level: daily ? null : (level as number),
    flower: species[0],
    par: def.par,
    onPause: () => setPaused(true),
    onResume: () => setPaused(false),
    onRestart: () => {
      setPaused(false);
      solEnd();
      restart();
    },
    onQuit: () => showStart(),
    solve:
      !daily && ALL_OPEN()
        ? { onPrev: () => solPrev(), onNext: () => solNext(), onAuto: () => solAutoToggle() }
        : undefined,
  });
  mount(view.el);
  const board = new BoardView(view.boardHost, game.board, species, game.state);
  const fx = new Effects(view.stage);
  let paused = false;
  // 오늘의 정원 시간: 화면에는 안 보이고(차분한 퍼즐이라 재촉하지 않게) 순위의 동점 가르기에만 씀. 일시정지(화면을 떠나면 저절로 멈춤) 동안은 세지 않는다
  let spent = 0;
  let runAt: number | null = performance.now();
  const elapsed = () => Math.round(spent + (runAt === null ? 0 : performance.now() - runAt));
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

  // 처음 알려 줄 것은 그 판에서 안내한다(같은 판을 다시 해도 보임). 오늘의 정원은 아직 정원 1을 안 깬 사람에게만 첫 규칙 안내
  const tipKey = daily ? (save.levels[0] ? undefined : TIPS[0]) : TIPS[level as number];
  const tip = tipKey ? t(tipKey) : '';
  let lastLit = game.lit;
  const render = (initial = false) => {
    view.moves.textContent = String(game.moves);
    view.moves.classList.toggle('over', game.moves > def.par);
    const lit = game.lit;
    const stuck = game.stuck;
    board.mood(lit, stuck);
    view.note.textContent = stuck.length ? t('tip.stuck') : tip;
    view.note.classList.toggle('warn', stuck.length > 0);
    if (!initial) {
      lit.forEach((ok, i) => {
        if (ok && !lastLit[i] && !game.done) {
          sound.play('happy');
          vibrate(30);
          fx.ring(board.pots[i].el);
        } else if (!ok && lastLit[i]) sound.play('unhappy');
      });
    }
    lastLit = lit;
  };
  render(true);

  // 가만히 있으면(8초) 정원사가 쉬는 동작 하나를 하고, 10초마다 다른 동작(바로 앞과 같은 것은 빼고 무작위:
  // 땀 닦기 · 두리번 · 기지개 · 하품 · 모자 부채질). 움직이거나 처음부터 하면 바로 멈추고 다시 센다.
  // 일시정지·판을 깬 뒤·화면을 떠나 있으면 하지 않는다
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let idleLast: IdleKind | null = null;
  const idleAct = () => {
    if (!paused && !game.done && !document.hidden) {
      const choices = IDLE_KINDS.filter((k) => k !== idleLast);
      idleLast = choices[Math.floor(Math.random() * choices.length)];
      board.idle(idleLast);
    }
    idleTimer = setTimeout(idleAct, 10000);
  };
  const poke = () => {
    board.idle(null);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(idleAct, 8000);
  };
  poke();

  // 드래그 한 번 = 한 칸. 앞 걸음이 움직이는 중에 들어온 드래그는 버리지 않고 2개까지 줄 세워 이어 간다
  const STEP_GAP = 90;
  let queued: Dir[] = [];
  let queueTimer: ReturnType<typeof setTimeout> | null = null;
  let lastStep = 0;
  const stopWalk = () => {
    if (walking) clearTimeout(walking);
    walking = null;
    if (queueTimer) clearTimeout(queueTimer);
    queueTimer = null;
    queued = [];
  };
  const pump = () => {
    queueTimer = null;
    const d = queued.shift();
    if (d === undefined) return;
    lastStep = performance.now();
    move(d);
    if (queued.length) queueTimer = setTimeout(pump, STEP_GAP);
  };
  const swipeStep = (d: Dir) => {
    solEnd();
    if (walking) stopWalk();
    if (queued.length >= 2) return;
    queued.push(d);
    if (queueTimer) return;
    const wait = STEP_GAP - (performance.now() - lastStep);
    if (wait <= 0) pump();
    else queueTimer = setTimeout(pump, wait);
  };

  const move = (dir: Dir) => {
    if (paused || game.done) return;
    poke();
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
      sound.play('push');
      vibrate(35);
      board.place(game.state, dir);
      board.push();
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
    poke();
    board.place(game.state, 2);
    sound.play('restart');
    render(true);
    lastLit = game.lit;
    solInit();
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
    solAutoOff();
    view.showPause(on);
    if (!on) view.boardHost.focus({ preventScroll: true });
  };

  // 판을 깸: 누름을 막고 꽃이 차례로 피어난 뒤 결과 화면
  const clear = () => {
    stopWalk();
    if (runAt !== null) spent += performance.now() - runAt;
    runAt = null;
    view.el.classList.add('cleared');
    clearTimeout(idleTimer);
    board.idle(null);
    const f = FLOWER[daily ? species[0] : LEVELS[level as number].flower];
    later(260, () => {
      sound.play('bloom');
      vibrate([60, 50, 60, 50, 220]);
      fx.shake('small');
      board.bloom();
      later(260, () => board.pots.forEach((p) => fx.petals(p.el, accentOf(f.id))));
    });
    // 모든 화분 꽃이 함께 다 피면(시작 260 + board.bloom 200 + 판 위 꽃잎이 벌어지는 데 약 1.3초, styles.css .pot .fl) 마무리 동작(0.9초, 톡 튕긴 듯 떨리다 멈춤),
    // 멈춘 뒤 0.5초 더 핀 꽃을 보여 주고 결과 화면
    later(260 + 200 + 1300, () => board.flourish());
    later(260 + 200 + 1300 + 900 + 500, () => finish());
  };

  const finish = () => {
    if (daily) return finishDaily();
    const lv = level as number;
    const moves = game.moves;
    const score = levelScore(def.par, moves);
    const prev = save.levels[lv];
    const firstBloom = !prev && !test && !assisted;
    const better = !test && !assisted && (!prev || moves < prev.moves);
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
    showResult(result, test || assisted);
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

  // 입력: 화살표·WASD, R 처음부터, Esc·P 일시정지
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as Element | null)?.closest?.('.modal')) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') return setPaused(!paused);
    if (paused) return;
    const d = DIRS[e.key];
    if (d !== undefined) {
      e.preventDefault();
      solEnd();
      stopWalk();
      move(d);
    } else if (e.key === 'r' || e.key === 'R') {
      solEnd();
      restart();
    }
  };
  // 판 위에서 드래그(한 번에 한 칸: 20px 를 넘는 순간 가고, 손을 뗄 때까지 더 가지 않음. 칸 크기와 상관없이 같은 거리)
  // 또는 칸 누르기(옆 칸이면 한 걸음, 멀면 걸어감)
  const SWIPE_PX = 20;
  let start: { x: number; y: number; id: number; moved: boolean } | null = null;
  const onDown = (e: PointerEvent) => {
    if (paused || game.done) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    view.boardHost.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!start || start.moved || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    start.moved = true;
    swipeStep(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  };
  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const tapped = !start.moved;
    start = null;
    if (!tapped || paused || game.done) return;
    const cell = board.cellAt(e.clientX, e.clientY);
    if (cell < 0) return;
    solEnd();
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
  // 출시 전 확인(TEST) 풀이 보기: 판 아래 줄(늘 보임)에서 가장 적은 이동 풀이를 밀기 하나 단위로 앞뒤로 넘겨 보며 판의 의도를 확인한다.
  // 처음 상태면 미리 적은 풀이(solutions.ts), 하다 만 상태면 ▶ 를 누를 때 워커가 거기서 이어지는 풀이를 찾는다.
  // ◀·▶·▶▶ 를 한 번이라도 누른 판은 기록·순위에 남기지 않는다. 직접 움직이면 풀이를 버리고 "여기서부터 풀이"로 돌아간다
  interface Seg {
    dirs: Dir[];
    pot: number;
    dir: Dir;
    from: State;
    moves: number;
  }
  let assisted = false;
  let sol: { segs: Seg[]; at: number } | null = null;
  let solFinding = false;
  let solAuto = false;
  let worker: Worker | null = null;
  const sameState = (a: State, b: State) => a.player === b.player && a.pots.every((p, i) => p === b.pots[i]);
  const jump = (s: State, moves: number) => {
    game.state = s;
    game.moves = moves;
    board.place(s, null);
    render(true);
  };
  /** 풀이 줄 글·단추. 화살표는 풀이를 넘겨 보기 시작한 뒤에만(그 전엔 직접 풀어 보는 데 방해되지 않게) */
  const solShow = () => {
    if (!view.sol) return;
    if (!sol) {
      board.hint(null);
      return view.sol.set(t('sol.ready'), false, !game.done);
    }
    const { segs, at } = sol;
    view.sol.set(t('sol.step', { n: at, total: segs.length }), at > 0 && !game.done, at < segs.length && !game.done);
    board.hint(assisted && at < segs.length ? segs[at].pot : null, segs[at]?.dir);
  };
  const solStart = (path: Dir[]) => {
    const segs: Seg[] = [];
    let s = game.state;
    let m = game.moves;
    let seg: Seg = { dirs: [], pot: -1, dir: 0, from: s, moves: m };
    for (const d of path) {
      const r = step(game.board, s, d);
      seg.dirs.push(d);
      s = r.state;
      m++;
      if (r.pushed >= 0) {
        segs.push({ ...seg, pot: r.pushed, dir: d });
        seg = { dirs: [], pot: -1, dir: 0, from: s, moves: m };
      }
    }
    sol = { segs, at: 0 };
    solShow();
  };
  /** 처음 상태(판 시작·처음부터)면 미리 적은 풀이를 걸어 둔다 */
  const solInit = () => {
    if (!view.sol || game.moves !== 0) return;
    solStart([...SOLUTIONS[level as number]].map((c) => 'URDL'.indexOf(c) as Dir));
  };
  const solAutoOff = () => {
    solAuto = false;
    view.sol?.playing(false);
  };
  /** 직접 움직였을 때: 걸어 둔 풀이를 버린다 */
  const solEnd = () => {
    if (!sol && !solFinding) return;
    stopWalk();
    solAutoOff();
    sol = null;
    solFinding = false;
    solShow();
  };
  /** 풀이가 없으면(하다 만 상태) 워커로 찾은 뒤 then */
  const ensureSol = (then: () => void) => {
    if (sol) return then();
    if (solFinding) return;
    if (game.stuck.length) return view.sol?.set(t('sol.none'), false, false);
    view.sol?.set(t('sol.finding'), false, false);
    solFinding = true;
    const asked = game.state;
    worker ??= new Worker(new URL('./game/solve.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Dir[] | null>) => {
      if (!solFinding || game.state !== asked) return;
      solFinding = false;
      if (!e.data) return view.sol?.set(t('sol.none'), false, false);
      solStart(e.data);
      then();
    };
    worker.postMessage({ rows: def.rows, state: game.state });
  };
  /** 밀기 하나(걸어가서 한 번 밂)를 걸음마다 보여 준다. 중간에 멈췄던 밀기는 그 밀기 처음 자리부터 */
  const playSeg = (then?: () => void) => {
    if (!sol || sol.at >= sol.segs.length || game.done) return;
    const seg = sol.segs[sol.at];
    if (!sameState(game.state, seg.from)) jump(seg.from, seg.moves);
    const dirs = [...seg.dirs];
    const stepNext = () => {
      const d = dirs.shift();
      if (d === undefined) {
        walking = null;
        sol!.at++;
        solShow();
        return then?.();
      }
      move(d);
      walking = setTimeout(stepNext, 85);
    };
    stepNext();
  };
  const solNext = () => {
    if (walking || paused || game.done) return;
    assisted = true;
    ensureSol(() => playSeg());
  };
  const solPrev = () => {
    if (!sol || paused || game.done) return;
    stopWalk();
    solAutoOff();
    assisted = true;
    const cur = sol.segs[sol.at];
    // 밀기 중간이면 그 밀기 처음으로, 아니면 앞 밀기 처음으로
    if (!cur || sameState(game.state, cur.from)) sol.at = Math.max(0, sol.at - 1);
    const seg = sol.segs[sol.at];
    jump(seg.from, seg.moves);
    solShow();
  };
  const solAutoToggle = () => {
    if (paused || game.done) return;
    if (solAuto) {
      stopWalk();
      return solAutoOff();
    }
    if (walking) return;
    assisted = true;
    ensureSol(() => {
      solAuto = true;
      view.sol?.playing(true);
      const go = () => {
        if (!solAuto || !sol || sol.at >= sol.segs.length || game.done) return solAutoOff();
        playSeg(() => (walking = setTimeout(go, 260)));
      };
      go();
    });
  };
  solInit();

  const onVisibility = () => document.hidden && !game.done && setPaused(true);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  teardown = () => {
    stopWalk();
    worker?.terminate();
    clearTimeout(idleTimer);
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
    forgetmenot: '#7aa8dc', hydrangea: '#8f9ce0', lavender: '#9a80c8', iris: '#7d64b6', balsam: '#e0507a', sunflower: '#e8b528',
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
