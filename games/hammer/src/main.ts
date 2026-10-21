import './styles.css';
import { Sound, type SoundName } from './audio';
import { Game } from './game/engine';
import { MOLES } from './game/moles';
import { dateKey, dateSeed, mulberry32, randomSeed } from './game/rng';
import { nextGoal } from './game/scoring';
import type { MissionId } from './game/missions';
import type { GameEvent, GameResult, MoleKind } from './game/types';
import { setLang, t } from './i18n';
import { shareLink, shareResult, shareText } from './share';
import { fetchBoard, submitEntry } from './online';
import { boardEntries, clearPending, keepPending, placeOf, type RankEntry } from './ranking';
import { emptyProgress, loadSave, writeSave } from './storage';
import { applySkin, applyTheme, resolveSkin } from './theme';
import { Board } from './ui/board';
import { Effects, Hammer } from './ui/effects';
import { Hud } from './ui/hud';
import { gameScreen, resultScreen, startScreen, type Mode, type RankingView } from './ui/screens';

const app = document.querySelector<HTMLDivElement>('#app')!;
const save = loadSave();
const sound = new Sound(save.sound);
setLang(save.lang);
applyTheme(save.theme);
applySkin(resolveSkin(save.skin, new Date()));
let teardown: (() => void) | null = null;

/** 숫자패드 배치: 7 8 9 / 4 5 6 / 1 2 3 */
const NUMPAD: Record<string, number> = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
const COMBO_WORDS: Record<number, string> = { 2: 'Nice!', 3: 'Great!' };
const HIT_SOUND: Partial<Record<MoleKind, SoundName>> = { golden: 'golden', king: 'king', clock: 'timeBonus', ice: 'freeze' };

function mount(el: HTMLElement): void {
  teardown?.();
  teardown = null;
  app.replaceChildren(el);
}

function todayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function vibrate(pattern: number | number[]): void {
  if (save.shake) navigator.vibrate?.(pattern);
}

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
    // 온라인 순위표를 받아 기기에 남겨 둔다. 오프라인이면 남겨 둔 순위를 그대로 보여 준다
    async refresh(mode) {
      try {
        cacheBoard(mode, today, await fetchBoard(mode, today));
        return true;
      } catch {
        return false;
      }
    },
    consider(mode, score) {
      const place = placeOf(boardEntries(save.rankings, mode, today), score);
      if (place >= 0) {
        keepPending(save.pending, mode, today, score);
        writeSave(save);
      }
      return place;
    },
    async register(mode, name, score) {
      save.playerName = name;
      const { place, entries } = await submitEntry(mode, today, { name, score, date: today });
      cacheBoard(mode, today, entries);
      // 그사이 다른 사람들에게 밀려 10위 밖이 됐어도 더 올릴 수 없으므로 대기에서 지운다
      clearPending(save.pending, mode, score);
      writeSave(save);
      return place;
    },
  };
}

function showStart(settings?: 'open' | 'reset', settingsFocus?: string, opening = false): void {
  const today = new Date();
  const todaySkin = resolveSkin('auto', today);
  applySkin(resolveSkin(save.skin, today));
  mount(
    startScreen({
      save,
      today: dateKey(today),
      todayLabel: todayLabel(today),
      todaySkin,
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
        Object.assign(save, emptyProgress());
        writeSave(save);
        showStart('reset');
      },
    }),
  );
}

function play(mode: Mode): void {
  sound.unlock();
  sound.pitch = 1;
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

  const fx = new Effects(view.stage, () => save.shake);
  const hammer = new Hammer(view.stage);
  const board = new Board(view.board, (hole) => game.hit(hole));
  const hud = new Hud(view.hud, game, view.el.querySelector<HTMLElement>('.pause-btn'));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  let hitstopUntil = 0;

  // 잡은 두더지는 그 자리에서 도감·누적 기록에 남긴다. 판 도중에 나가도 사라지지 않게
  const dexBefore = new Set(save.dex);
  const record = (kind: MoleKind, el: HTMLElement) => {
    save.kills[kind]++;
    if (save.dex.includes(kind)) return;
    save.dex.push(kind);
    writeSave(save);
    fx.popup(el, 'NEW!', 'new');
  };
  let lastSecond = -1;

  view.stage.addEventListener('pointerdown', (e) => {
    hammer.swing(e.clientX, e.clientY, e.pointerType !== 'mouse');
  });

  const holeEl = (hole: number) => board.holes[hole];
  const hitstop = (ms: number) => (hitstopUntil = performance.now() + ms);

  const handle = (e: GameEvent) => {
    switch (e.type) {
      case 'countdown':
        view.showCountdown(e.n > 0 ? String(e.n) : 'GO!');
        sound.play(e.n > 0 ? 'count' : 'go');
        break;
      case 'start':
        view.showCountdown(null);
        break;
      case 'segment':
        if (e.id === 'spurt') {
          view.el.classList.add('spurt');
          fx.banner(t('segment.spurt'), 'spurt');
        } else if (e.id === 'main' || e.id === 'melee' || e.id === 'rush') {
          fx.banner(t(`segment.${e.id}`));
        }
        break;
      case 'spawn':
        board.spawn(e.mole);
        if (e.mole.kind === 'king') fx.banner(t('banner.kingAppear'), 'king');
        break;
      case 'emerge':
        board.emerge(e.mole);
        break;
      case 'duck':
        board.duck(e.mole);
        break;
      case 'jump':
        board.jump(e.mole, e.from);
        sound.play('jump');
        break;
      case 'escape':
        board.escape(e.mole);
        if (MOLES[e.mole.kind].good && game.phase === 'playing') sound.play('tease');
        break;
      // 소리는 화면 연출(DOM 작업)보다 먼저 낸다. 연출에 걸리는 시간만큼 소리가 늦어지지 않게
      case 'damage':
        sound.play(e.mole.kind === 'helmet' ? 'clink' : 'king');
        board.damage(e.mole);
        if (e.mole.kind === 'helmet') {
          fx.popup(holeEl(e.mole.hole), t('popup.clink'), 'clink');
        } else {
          fx.popup(holeEl(e.mole.hole), `${e.mole.hp}`, 'king');
          fx.shake('small');
        }
        hitstop(40);
        vibrate(10);
        break;
      case 'hit': {
        const { mole, points } = e;
        sound.play(HIT_SOUND[mole.kind] ?? 'hit');
        const el = holeEl(mole.hole);
        board.hit(mole);
        const variant = mole.kind === 'golden' || mole.kind === 'king' ? 'gold' : game.inFever ? 'fever' : '';
        fx.popup(el, `+${points}`, variant);
        record(mole.kind, el);
        if (mole.kind === 'clock') fx.popup(el, t('popup.time'), 'time');
        if (mole.kind === 'ice') fx.popup(el, t('popup.ice'), 'ice');
        fx.burst(el, mole.kind === 'golden' || mole.kind === 'king' ? ['#ffd84d', '#fff3a6', '#ff9f43'] : ['#ffffff', '#ffd84d', '#ffb37a']);
        if (mole.kind === 'king') {
          fx.banner(t('banner.kingDown'), 'king');
          fx.shake('big');
          hitstop(140);
          vibrate([30, 30, 60]);
        } else {
          hitstop(55);
          vibrate(15);
        }
        break;
      }
      case 'bomb':
        sound.play('bomb');
        board.bomb(e.mole);
        fx.popup(holeEl(e.mole.hole), `${e.points}`, 'bad');
        fx.burst(holeEl(e.mole.hole), ['#ff5a3c', '#ffb02e', '#5a5470'], 10);
        record('bomb', holeEl(e.mole.hole));
        fx.shake('big');
        hitstop(120);
        vibrate([60, 40, 60]);
        break;
      case 'whiff':
        sound.play('whiff');
        board.whiff(e.hole);
        hammer.stun();
        break;
      case 'comboUp':
        if (COMBO_WORDS[e.multiplier]) fx.banner(`${COMBO_WORDS[e.multiplier]} x${e.multiplier}`, 'combo');
        sound.play('comboUp');
        break;
      case 'comboBreak':
        if (e.combo >= 5) {
          fx.banner(t('banner.comboBreak', { n: e.combo }), 'break');
          sound.play('comboBreak');
        }
        break;
      case 'feverStart':
        view.el.classList.add('fever');
        sound.pitch = 1.25;
        fx.banner(t('banner.fever'), 'fever');
        sound.play('fever');
        break;
      case 'feverEnd':
        view.el.classList.remove('fever');
        sound.pitch = 1;
        break;
      case 'timeBonus':
        sound.play('timeBonus');
        break;
      case 'freeze':
        view.el.classList.add('frozen');
        later(2000, () => view.el.classList.remove('frozen'));
        break;
      case 'pause':
        view.showPause(true);
        break;
      case 'resume':
        view.showPause(false);
        break;
      case 'over':
        view.el.classList.remove('fever', 'spurt', 'frozen');
        view.showCountdown(t('countdown.end'));
        sound.pitch = 1;
        sound.play('end');
        later(1100, () => showResult(e.result, game.mission.id, mode, today, dexBefore));
        break;
    }
  };
  const off = game.on(handle);

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(now - last, 100);
    last = now;
    if (now >= hitstopUntil) game.tick(dt);
    hud.render(game);
    if (game.phase === 'playing' && game.lastSpurt) {
      const sec = Math.ceil(game.remaining / 1000);
      if (sec !== lastSecond) {
        lastSecond = sec;
        sound.play('tick');
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (game.phase === 'playing') game.pause();
      else game.resume();
      return;
    }
    const hole = NUMPAD[e.key];
    if (hole === undefined || e.repeat) return;
    e.preventDefault();
    const rect = board.holes[hole].getBoundingClientRect();
    hammer.swing(rect.left + rect.width / 2, rect.top + rect.height / 3, true);
    board.press(hole);
    game.hit(hole);
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
}

function showResult(result: GameResult, missionId: MissionId, mode: Mode, date: Date, dexBefore: ReadonlySet<MoleKind>): void {
  const daily = mode === 'daily';
  const today = dateKey(date);
  const prevBest = daily ? (save.daily?.date === today ? save.daily.best : 0) : save.best;
  const isRecord = result.score > prevBest && result.score > 0;
  if (isRecord) {
    if (daily) save.daily = { date: today, best: result.score };
    else save.best = result.score;
  }

  // 도감·누적 기록은 판 도중에 이미 남겼다. 여기서는 이번 판에 새로 오른 것만 골라 보여 준다
  const dex = new Set(save.dex);
  const newDex = save.dex.filter((k) => !dexBefore.has(k));
  writeSave(save);

  mount(
    resultScreen({
      result,
      daily,
      isRecord,
      newDex,
      goal: nextGoal(result.score, prevBest, dex),
      missionId,
      onRetry: () => play(mode),
      onHome: () => showStart(),
      onShare: (image) => shareResult(shareText(result, { date, daily }), image),
      onShareLink: () => shareLink(shareText(result, { date, daily })),
      ranking: rankingView(date),
    }),
  );
  if (isRecord) sound.play('record');

  const onKey = (e: KeyboardEvent) => {
    // 이름을 치는 중이거나 랭킹 창·등록 카드 안에서 누른 키는 그쪽에 맡긴다
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      play(mode);
    } else if (e.key === 'Escape') {
      showStart();
    }
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

showStart(undefined, undefined, true);
