import { pickMission, type MissionDef } from './missions';
import { MOLES, MOLE_ORDER } from './moles';
import {
  FEVER_DURATION,
  LAST_SPURT,
  MISSION_BONUS,
  accuracyOf,
  comboMultiplier,
  gradeFor,
  pointsFor,
  shouldStartFever,
  starsFor,
} from './scoring';
import { FEVER_SEGMENT, SEGMENTS, neighbors, pickKind, pickOne, segmentIndexAt, type Segment } from './spawner';
import type { GameEvent, GameResult, Mole, MoleKind, Phase, Rng, Stats } from './types';

export const DURATION = 30_000;
/** 3 · 2 · 1을 1초씩, 마지막에 GO!를 0.5초 보여 준 뒤 시작한다 */
export const GO_TIME = 500;
export const COUNTDOWN = 3_000 + GO_TIME;
export const GRID = 3;
export const HOLES = GRID * GRID;

const WHIFF_STUN = 300;
const HOLE_COOLDOWN = 300;
const TIME_BONUS = 3_000;
const MAX_CLOCKS = 2;
/** 황금 두더지가 이만큼 연달아 안 나오면 다음은 반드시 황금 */
export const GOLDEN_PITY = 10;
/** 엿보기는 이만큼 진행된 뒤부터(워밍업 중반). 첫 두더지들은 곧장 나와 리듬을 익히게 한다 */
export const PEEK_FROM = 2_000;
/** 머리만 내밀고 엿보는 시간(ms) 범위 */
export const PEEK_MIN = 450;
export const PEEK_MAX = 700;
/** 엿보던 두더지가 다 올라오는 데 걸리는 시간(ms). 화면의 올라오는 연출(.mole transition 130ms)보다 조금 길게 */
export const EMERGE_RISE = 150;
/** 엿보던 두더지가 나오지 않고 도로 들어갈 확률 */
export const FAKE_CHANCE = 0.4;
/** 속임수로 들어가도 되는 두더지. 보상(황금·시계·얼음)은 엿봤으면 반드시 나온다 */
const FAKEABLE: readonly MoleKind[] = ['normal', 'bomb', 'helmet', 'swift'];
/** 확정 등장 사이에 끼는 최소 두더지 수. 새 얼굴이 한꺼번에 몰려나오지 않게 한다 */
export const DEBUT_GAP = 3;
const SLOW_DURATION = 2_000;
const SLOW_FACTOR = 1.6;
const FREEZE_EXTEND = 1_000;

type Listener = (event: GameEvent) => void;

/** 카운트다운 표시 숫자. 0은 GO! */
function countdownStep(left: number): number {
  return Math.max(0, Math.ceil((left - GO_TIME) / 1000));
}

export function emptyStats(): Stats {
  const kills = Object.fromEntries(MOLE_ORDER.map((k) => [k, 0])) as Record<MoleKind, number>;
  return { taps: 0, hits: 0, whiffs: 0, bombs: 0, missed: 0, kills, maxCombo: 0, timeBonus: 0 };
}

/**
 * 한 판의 상태 머신. DOM을 모르고, 시간은 tick(dt)으로만 흐른다.
 * ready → countdown → playing ⇄ paused → over
 */
export class Game {
  phase: Phase = 'ready';
  /** playing 상태로 흐른 게임 시간(ms) */
  time = 0;
  remaining = DURATION;
  countdownLeft = COUNTDOWN;
  score = 0;
  combo = 0;
  moles: Mole[] = [];
  feverUntil = 0;
  slowUntil = 0;
  stunUntil = 0;
  segmentIndex = -1;
  result: GameResult | null = null;
  readonly stats = emptyStats();
  readonly mission: MissionDef;

  private readonly rng: Rng;
  private readonly listeners = new Set<Listener>();
  private readonly holeFreeAt = new Array<number>(HOLES).fill(0);
  private nextSpawnAt = 0;
  private nextId = 1;
  private clocks = 0;
  private kingSpawned = false;
  private sinceGolden = 0;
  /** 이번 판에 한 번이라도 나온 두더지 */
  private readonly seen = new Set<MoleKind>();
  private segSpawnsFor: Segment | null = null;
  private segSpawns = 0;
  private sinceDebut = Infinity;
  private lastKind: MoleKind = 'normal';
  private bannerIndex = -1;

  constructor(rng: Rng) {
    this.rng = rng;
    this.mission = pickMission(rng);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get inFever(): boolean {
    return this.feverUntil > this.time;
  }

  get slowed(): boolean {
    return this.slowUntil > this.time;
  }

  get stunned(): boolean {
    return this.stunUntil > this.time;
  }

  get lastSpurt(): boolean {
    return this.remaining <= LAST_SPURT;
  }

  /** 진행 시간. 시계 두더지로 시간이 늘면 뒤로 물러난다 */
  get progress(): number {
    return Math.max(0, DURATION - this.remaining);
  }

  start(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'countdown';
    this.emit({ type: 'countdown', n: countdownStep(COUNTDOWN) });
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.emit({ type: 'pause' });
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.emit({ type: 'resume' });
  }

  tick(dt: number): void {
    if (this.phase === 'countdown') {
      const before = countdownStep(this.countdownLeft);
      this.countdownLeft -= dt;
      const after = countdownStep(this.countdownLeft);
      if (this.countdownLeft <= 0) {
        this.phase = 'playing';
        this.emit({ type: 'start' });
      } else if (after !== before) {
        this.emit({ type: 'countdown', n: after });
      }
      return;
    }
    if (this.phase !== 'playing') return;

    this.time += dt;
    this.remaining -= dt;

    if (this.feverUntil && this.time >= this.feverUntil) {
      this.feverUntil = 0;
      this.emit({ type: 'feverEnd' });
    }

    this.segmentIndex = segmentIndexAt(this.progress);
    if (this.segmentIndex > this.bannerIndex) {
      this.bannerIndex = this.segmentIndex;
      this.emit({ type: 'segment', index: this.segmentIndex, id: SEGMENTS[this.segmentIndex].id });
    }

    for (const mole of [...this.moles]) {
      if (mole.peekUntil > 0) {
        if (this.time >= mole.peekUntil) this.endPeek(mole);
      } else if (this.time >= mole.hideAt) {
        this.expire(mole);
      }
    }

    if (this.remaining <= 0) {
      this.remaining = 0;
      this.finish();
      return;
    }

    this.spawnTick();
  }

  hit(hole: number): void {
    if (this.phase !== 'playing' || this.stunned) return;
    this.stats.taps++;

    // 머리만 내민 두더지는 아직 안 나온 것이라 빈 구멍을 친 것과 같다. 다 올라오기 전(올라오는 중)도 마찬가지
    const mole = this.moles.find((m) => m.hole === hole && m.peekUntil === 0 && m.readyAt <= this.time);
    if (!mole) {
      this.stats.whiffs++;
      this.stunUntil = this.time + WHIFF_STUN;
      this.emit({ type: 'whiff', hole });
      return;
    }

    const def = MOLES[mole.kind];
    if (!def.good) {
      this.remove(mole);
      this.stats.bombs++;
      this.score = Math.max(0, this.score + def.points);
      this.emit({ type: 'bomb', mole, points: def.points });
      this.breakCombo();
      return;
    }

    this.stats.hits++;
    mole.hp--;
    if (mole.hp > 0) {
      this.emit({ type: 'damage', mole });
      return;
    }

    this.remove(mole);
    this.combo++;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    this.stats.kills[mole.kind]++;
    const points = pointsFor(def.points, this.combo, { fever: this.inFever, lastSpurt: this.lastSpurt });
    this.score += points;
    this.emit({ type: 'hit', mole, points, combo: this.combo });

    if (comboMultiplier(this.combo) > comboMultiplier(this.combo - 1)) {
      this.emit({ type: 'comboUp', multiplier: comboMultiplier(this.combo) });
    }
    this.applyEffect(mole);
    if (shouldStartFever(this.combo, this.inFever)) this.startFever();
  }

  /** 지정한 구멍에 두더지를 바로 내보낸다. 테스트·디버그용 */
  place(kind: MoleKind, hole: number, opts: { peek?: number; fake?: boolean } = {}): Mole | null {
    return this.spawn(kind, hole, opts.peek ?? 0, opts.fake ?? false);
  }

  private segment(): Segment {
    return this.inFever ? FEVER_SEGMENT : SEGMENTS[Math.max(0, this.segmentIndex)];
  }

  private freeHoles(): number[] {
    const result: number[] = [];
    for (let h = 0; h < HOLES; h++) {
      if (this.holeFreeAt[h] <= this.time && !this.moles.some((m) => m.hole === h)) result.push(h);
    }
    return result;
  }

  private exposureFor(kind: MoleKind): number {
    const def = MOLES[kind];
    const base = def.fixedExposure ?? this.segment().exposure * def.exposure;
    return base * (this.slowed ? SLOW_FACTOR : 1);
  }

  private spawnTick(): void {
    if (!this.kingSpawned && this.lastSpurt && this.spawn('king')) this.kingSpawned = true;

    if (this.time < this.nextSpawnAt) return;
    const seg = this.segment();
    this.nextSpawnAt = this.time + seg.interval * (this.slowed ? SLOW_FACTOR : 1);

    const active = this.moles.filter((m) => m.kind !== 'king').length;
    if (active >= seg.maxActive) return;

    if (this.segSpawnsFor !== seg) {
      this.segSpawnsFor = seg;
      this.segSpawns = 0;
    }
    const kind = this.chooseKind(seg);
    // 이번 판에 처음 나오는 두더지는 엿보지 않고 바로 나와 확실하게 보여 준다
    const peek = this.seen.has(kind) && this.progress >= PEEK_FROM && seg.peek > 0 && this.rng() > 1 - seg.peek;
    const fake = peek && FAKEABLE.includes(kind) && this.rng() > 1 - FAKE_CHANCE;
    if (!this.spawn(kind, undefined, peek ? PEEK_MIN + this.rng() * (PEEK_MAX - PEEK_MIN) : 0, fake)) return;
    this.segSpawns++;
    this.sinceDebut++;
    this.sinceGolden = kind === 'golden' ? 0 : this.sinceGolden + 1;
    this.lastKind = kind;
  }

  /** 황금 보정 → 확정 등장 → 가중치 추첨 순으로 고른다 */
  private chooseKind(seg: Segment): MoleKind {
    if ((seg.weights.golden ?? 0) > 0 && this.sinceGolden >= GOLDEN_PITY) return 'golden';
    const debut = seg.debut?.find((k) => !this.seen.has(k));
    if (debut && this.segSpawns >= 1 && this.sinceDebut >= DEBUT_GAP) {
      this.sinceDebut = 0;
      return debut;
    }

    const exclude: MoleKind[] = [];
    if (this.clocks >= MAX_CLOCKS) exclude.push('clock');
    if (this.moles.filter((m) => m.kind === 'bomb').length >= seg.maxBombs) exclude.push('bomb');
    // 같은 특수 두더지가 연달아 나오면 특별함이 옅어진다
    if (this.lastKind !== 'normal') exclude.push(this.lastKind);
    return pickKind(seg.weights, this.rng, exclude);
  }

  /** peek(ms)만큼 머리만 내밀고 엿본 뒤 나온다. fake면 엿보기만 하고 도로 들어간다 */
  private spawn(kind: MoleKind, hole?: number, peek = 0, fake = false): Mole | null {
    const target = hole ?? pickOne(this.freeHoles(), this.rng);
    if (target === undefined || this.moles.some((m) => m.hole === target)) return null;
    const peekUntil = peek > 0 ? this.time + peek : 0;
    const mole: Mole = {
      id: this.nextId++,
      kind,
      hole: target,
      hp: MOLES[kind].hp,
      hideAt: (peekUntil || this.time) + this.exposureFor(kind),
      jumped: false,
      peekUntil,
      fake: peek > 0 && fake,
      readyAt: 0,
    };
    if (kind === 'clock' && !mole.fake) this.clocks++;
    this.seen.add(kind);
    this.moles.push(mole);
    this.emit({ type: 'spawn', mole });
    return mole;
  }

  /** 엿보기가 끝났다: 속임수면 도로 들어가고, 아니면 다 올라온다 */
  private endPeek(mole: Mole): void {
    if (mole.fake) {
      this.remove(mole);
      this.emit({ type: 'duck', mole });
      return;
    }
    mole.peekUntil = 0;
    // 다 올라올 때까지는 칠 수 없으니 그만큼 노출 시간을 뒤로 민다
    mole.readyAt = this.time + EMERGE_RISE;
    mole.hideAt += EMERGE_RISE;
    this.emit({ type: 'emerge', mole });
  }

  private expire(mole: Mole): void {
    if (mole.kind === 'swift' && !mole.jumped) {
      const free = this.freeHoles();
      const near = neighbors(mole.hole, GRID).filter((h) => free.includes(h));
      const target = pickOne(near.length ? near : free, this.rng);
      if (target !== undefined) {
        const from = mole.hole;
        this.holeFreeAt[from] = this.time + HOLE_COOLDOWN;
        mole.hole = target;
        mole.jumped = true;
        mole.hideAt = this.time + this.exposureFor('swift');
        this.emit({ type: 'jump', mole, from });
        return;
      }
    }

    this.remove(mole);
    this.emit({ type: 'escape', mole });
    if (MOLES[mole.kind].good) {
      this.stats.missed++;
      this.breakCombo();
    }
  }

  private remove(mole: Mole): void {
    this.moles = this.moles.filter((m) => m !== mole);
    this.holeFreeAt[mole.hole] = this.time + HOLE_COOLDOWN;
  }

  private breakCombo(): void {
    if (this.combo === 0) return;
    const combo = this.combo;
    this.combo = 0;
    this.emit({ type: 'comboBreak', combo });
  }

  private applyEffect(mole: Mole): void {
    if (mole.kind === 'clock') {
      this.remaining += TIME_BONUS;
      this.stats.timeBonus += TIME_BONUS;
      this.emit({ type: 'timeBonus', ms: TIME_BONUS });
    } else if (mole.kind === 'ice') {
      this.slowUntil = this.time + SLOW_DURATION;
      for (const m of this.moles) {
        m.hideAt += FREEZE_EXTEND;
        if (m.peekUntil > 0) m.peekUntil += FREEZE_EXTEND;
      }
      this.emit({ type: 'freeze' });
    }
  }

  private startFever(): void {
    this.feverUntil = this.time + FEVER_DURATION;
    this.nextSpawnAt = this.time;
    for (const bomb of this.moles.filter((m) => !MOLES[m.kind].good)) {
      this.remove(bomb);
      this.emit({ type: 'escape', mole: bomb });
    }
    this.emit({ type: 'feverStart' });
  }

  private finish(): void {
    this.phase = 'over';
    this.moles = [];
    const missionDone = this.mission.done(this.stats);
    const missionBonus = missionDone ? MISSION_BONUS : 0;
    const score = this.score + missionBonus;
    this.result = {
      baseScore: this.score,
      missionBonus,
      score,
      missionDone,
      grade: gradeFor(score),
      stars: starsFor(score, missionDone, this.stats),
      accuracy: accuracyOf(this.stats),
      stats: structuredClone(this.stats),
    };
    this.emit({ type: 'over', result: this.result });
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
