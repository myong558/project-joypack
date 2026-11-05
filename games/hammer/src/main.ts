// 공통 모듈을 맨 먼저 불러, 이름 바꾸기 전 저장 키를 다른 코드가 읽기 전에 옮긴다
import '@joyfield/shared';
import type { VibrationName } from '@joyfield/shared';
import '@joyfield/shared/topbar.css';
import '@joyfield/shared/settings.css';
import './styles.css';
import { Sound, type SoundName } from './audio';
import { Game } from './game/engine';
import { MOLES } from './game/moles';
import { dateKey, dateSeed, mulberry32, randomSeed } from './game/rng';
import { nextGoal } from './game/scoring';
import type { MissionId } from './game/missions';
import type { GameEvent, GameResult, MoleKind } from './game/types';
import { setLang, t } from './i18n';
import { shareResult } from './share';
import { fetchBoard, submitEntry } from './online';
import { boardEntries, placeOf, type RankEntry } from './ranking';
import { emptyRecords, loadSave, writeSave } from './storage';
import { applySkin, applyTheme, resolveSkin } from './theme';
import { Board } from './ui/board';
import { MORE_ICONS } from './ui/icons';
import { configureUi, leaveRankEntry } from '@joyfield/shared/ui';
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
// 공통 화면 조각(대화상자·랭킹 창·등록 카드)이 쓸 문구·아이콘
configureUi({ t, icons: { trophy: MORE_ICONS.trophy, close: MORE_ICONS.close } });

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

/** 진동: 조이필드 공통 세기표(기준서 1.7, Joyfield.vibrate) */
function vibrate(pattern: VibrationName): void {
  Joyfield.vibrate(pattern, save.vibrate);
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
    // 판이 끝날 때마다 불린다: 방금 한 모드를 랭킹 창의 최근 탭으로 남기고(조이필드 공통 기준), TOP 10 에 들 자리(0부터, 못 들면 -1)를 돌려준다.
    // 등록은 결과 화면에서만 한다(등록 대기 없음, 기준서 1.6)
    consider(mode, score) {
      Joyfield.setRankBoard('hammer', mode);
      return placeOf(boardEntries(save.rankings, mode, today), score);
    },
    async register(mode, name, score) {
      save.playerName = name;
      const { place, entries } = await submitEntry(mode, today, { name, score, date: today, dev: Joyfield.playDevice() });
      cacheBoard(mode, today, entries);
      return place;
    },
  };
}

function showStart(settings?: 'open' | 'reset', settingsFocus?: string, opening = false): void {
  const today = new Date();
  // 뒤로 가기: 시작 화면에서는 조이필드로(기준서 1.3)
  Joyfield.back.screen(0);
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

  const fx = new Effects(view.stage);
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
        fx.impact(holeEl(e.mole.hole), 'small');
        hammer.smash();
        if (e.mole.kind === 'helmet') {
          fx.popup(holeEl(e.mole.hole), t('popup.clink'), 'clink');
          fx.shake('tiny');
        } else {
          fx.popup(holeEl(e.mole.hole), `${e.mole.hp}`, 'king');
          fx.shake('small');
        }
        hitstop(50);
        vibrate('light');
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
        const gold = mole.kind === 'golden' || mole.kind === 'king';
        // 손맛: 충격 고리·섬광 → 별·흙 파티클 → 망치 눌림 → 화면 툭 → 잠깐 멈춤(hitstop) → 진동
        fx.impact(el, gold ? 'gold' : '');
        fx.burst(el, gold ? ['#ffd84d', '#fff3a6', '#ff9f43'] : ['#ffffff', '#ffd84d', '#ffb37a'], game.inFever ? 12 : 9);
        fx.dirt(el);
        hammer.smash();
        if (mole.kind === 'king') {
          fx.banner(t('banner.kingDown'), 'king');
          fx.shake('big');
          hitstop(160);
          vibrate('big');
        } else if (mole.kind === 'golden') {
          fx.shake('small');
          hitstop(90);
          vibrate('good');
        } else {
          fx.shake('tiny');
          hitstop(70);
          vibrate(game.inFever ? 'fever' : 'hit');
        }
        break;
      }
      case 'bomb':
        sound.play('bomb');
        board.bomb(e.mole);
        fx.popup(holeEl(e.mole.hole), `${e.points}`, 'bad');
        fx.impact(holeEl(e.mole.hole), 'bad');
        fx.burst(holeEl(e.mole.hole), ['#ff5a3c', '#ffb02e', '#5a5470'], 12);
        fx.dirt(holeEl(e.mole.hole), 7);
        record('bomb', holeEl(e.mole.hole));
        fx.shake('big');
        hitstop(140);
        vibrate('fail');
        break;
      case 'whiff':
        sound.play('whiff');
        board.whiff(e.hole);
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
        syncBack();
        break;
      case 'resume':
        view.showPause(false);
        syncBack();
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
  // 뒤로 가기(기준서 1.3): 플레이 중 → 일시정지, 일시정지 중 → 시작 화면. 카운트다운·끝난 뒤에는 바로 시작 화면
  const syncBack = () =>
    Joyfield.back.screen(game.phase === 'paused' ? 1 : 2, () => {
      if (game.phase === 'playing') game.pause();
      else showStart();
    });
  syncBack();

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
      onRetry: () => leaveRankEntry(app, () => play(mode)),
      onHome: () => leaveRankEntry(app, () => showStart()),
      onShare: shareResult,
      ranking: rankingView(date),
    }),
  );
  if (isRecord) sound.play('record');
  // 뒤로 가기: 결과 → 시작 화면(올리지 않은 랭킹 등록 카드가 있으면 먼저 묻는다)
  Joyfield.back.screen(1, () => leaveRankEntry(app, () => showStart()));

  const onKey = (e: KeyboardEvent) => {
    // 이름을 치는 중이거나 랭킹 창·등록 카드 안에서 누른 키는 그쪽에 맡긴다
    if ((e.target as Element | null)?.closest?.('input, .rank-entry, .modal')) return;
    // 결과 화면이 막혀 있는 0.6초 동안(누르던 키가 바로 다시 하기가 되지 않게)은 무시한다
    if (document.querySelector('.screen.result.locked')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      leaveRankEntry(app, () => play(mode));
    } else if (e.key === 'Escape') {
      leaveRankEntry(app, () => showStart());
    }
  };
  window.addEventListener('keydown', onKey);
  teardown = () => window.removeEventListener('keydown', onKey);
}

// 설치 앱에서 내비게이션 바 높이가 0으로 와 아래 도감이 바에 가리는 경우를 막는다(#app 아래 여백, styles.css)
Joyfield.guardBottom();
// 화면 높이를 css(100dvh) 대신 실제 보이는 높이로 잡는다(설치 앱에서 조이필드 → 게임으로 넘어올 때 아래가 화면 밖으로 나가던 것)
Joyfield.trackViewport();
showStart(undefined, undefined, true);

// 조이필드 서비스 워커(사이트에 하나)를 등록하고, 이 게임 파일 전체를 캐시하라고 알린다(처음 열 때 캐시, 이후에는 바뀐 파일만)
window.addEventListener('load', () => {
  void Joyfield.registerSW({ root: '../../', game: 'hammer' });
  // 공유 링크로 바로 들어온 사람에게 조이필드 앱 설치 안내 띠
  Joyfield.inviteBar({ root: '../../' });
});
