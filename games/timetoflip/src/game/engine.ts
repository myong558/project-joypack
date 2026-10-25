import { ALL_FACES, FACE_SETS, setsOpen, type FaceId, type SpecialId } from './faces';
import { shuffle, type Rng } from './rng';
import {
  CLEAR_GAIN,
  CLEAR_PAUSE,
  CLOCK_GAIN,
  DEAL_MS,
  COMBO_GAIN,
  GOLD_CHANCE,
  HIDE_DELAY,
  LUCKY_BONUS,
  MATCH_POINTS,
  MAX_MS,
  MEMORY_BONUS,
  MISTAKE_FROM_STAGE,
  MISTAKE_PENALTY,
  PEEK_REVEAL,
  PERFECT_BONUS,
  PERFECT_GAIN,
  STAGE_BONUS,
  START_MS,
  WARN_MS,
  comboMultiplier,
  specialCount,
  stageDef,
  type StageDef,
} from './stages';

export interface Card {
  /** 판 안의 자리(0부터) */
  index: number;
  /** 같은 key 두 장이 짝이다. 닮은 짝은 face 가 같아도 key 가 다르다 */
  key: string;
  face: FaceId | SpecialId;
  special: SpecialId | null;
  /** 색만 다른 닮은 그림 */
  twin: boolean;
  gold: boolean;
  state: 'down' | 'up' | 'gone';
  /** 한 번이라도 뒤집어 본 카드인지(판 시작 때 미리 보기는 치지 않음) */
  seen: boolean;
}

export type Phase = 'idle' | 'peek' | 'playing' | 'clear' | 'paused' | 'over';

export interface GameResult {
  score: number;
  /** 도달한 판(시간이 다 된 판) */
  stage: number;
  pairs: number;
  maxCombo: number;
  /** 맞힌 짝 ÷ (맞힌 짝 + 틀린 번) */
  accuracy: number;
  perfects: number;
  mistakes: number;
  /** 시간이 다 됐을 때 그 판에 남은 짝 */
  pairsLeft: number;
  /** 이번 판에 맞힌 그림(도감) */
  faces: FaceId[];
}

export type GameEvent =
  | { type: 'deal'; stage: number; def: StageDef; cards: Card[] }
  | { type: 'peekEnd' }
  | { type: 'flip'; card: Card }
  | { type: 'hide'; cards: [Card, Card] }
  | {
      type: 'match';
      a: Card;
      b: Card;
      points: number;
      gain: number;
      combo: number;
      multiplier: number;
      bonus: 'memory' | 'lucky' | null;
    }
  | { type: 'mismatch'; a: Card; b: Card; mistake: boolean; penalty: number; comboLost: number }
  | { type: 'reveal'; ms: number }
  | { type: 'revealEnd' }
  | { type: 'stageClear'; stage: number; bonus: number; gain: number; perfect: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'over'; result: GameResult };

type Listener = (e: GameEvent) => void;

/**
 * 한 게임(여러 판)의 규칙과 상태. 화면을 모르고, 시간은 tick(dt)로만 흐른다.
 * 오늘의 챌린지는 날짜 시드 난수로 모두 같은 카드를 받고, 카드 위치만 시도마다 새로 섞는다(난수는 판을 놓을 때만 쓴다)
 */
export class Game {
  phase: Phase = 'idle';
  stage = 0;
  def: StageDef = stageDef(1);
  cards: Card[] = [];
  score = 0;
  remaining = START_MS;
  combo = 0;
  maxCombo = 0;
  /** 판 시작 미리 보기·판 사이 쉬는 시간이 얼마나 남았는지 */
  phaseLeft = 0;
  /** 돋보기 카드로 남은 카드를 모두 보여 주는 시간이 얼마나 남았는지. 이 동안은 시간이 멈추고 누름을 받지 않는다(판 시작 미리 보기와 같은 규칙) */
  revealLeft = 0;

  private first: Card | null = null;
  private firstSeenBefore = false;
  /** 틀려서 잠깐 보여 주는 두 장. 시간이 되거나 다른 카드를 누르면 덮는다 */
  private wrong: { cards: [Card, Card]; left: number } | null = null;
  private resumeTo: Phase = 'playing';
  private stageMistakes = 0;
  private stats = { pairs: 0, misses: 0, mistakes: 0, perfects: 0 };
  private faces = new Set<FaceId>();
  private listeners = new Set<Listener>();

  /**
   * rng: 어떤 카드가 나올지(그림·특수·닮은 짝·황금). layout: 카드를 어디에 놓을지.
   * 오늘의 챌린지는 rng 를 날짜로 고정하고 layout 은 시도마다 새로 뽑아, 모두 같은 카드로 겨루되 다시 해도 위치를 외울 수 없게 한다
   */
  constructor(
    private readonly rng: Rng,
    private readonly layout: Rng = rng,
  ) {}

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: GameEvent): void {
    this.listeners.forEach((fn) => fn(e));
  }

  /** from: 시작할 판(출시 전 확인용 바로 시작, 보통은 1) */
  start(from = 1): void {
    this.deal(from);
  }

  get pairsLeft(): number {
    return this.cards.filter((c) => c.state !== 'gone').length / 2;
  }

  /** 시간이 얼마 안 남아 경고 중인지 */
  get danger(): boolean {
    return this.phase === 'playing' && this.remaining <= WARN_MS;
  }

  private deal(stage: number): void {
    this.stage = stage;
    this.def = stageDef(stage);
    this.first = null;
    this.wrong = null;
    this.stageMistakes = 0;
    this.revealLeft = 0;
    this.cards = buildCards(stage, this.def, this.rng, this.layout);
    this.phase = 'peek';
    this.phaseLeft = this.def.peekMs;
    this.emit({ type: 'deal', stage, def: this.def, cards: this.cards });
  }

  private endPeek(): void {
    this.phase = 'playing';
    this.phaseLeft = 0;
    this.emit({ type: 'peekEnd' });
  }

  tick(dt: number): void {
    if (this.phase === 'paused' || this.phase === 'over' || this.phase === 'idle') return;
    if (this.wrong) {
      this.wrong.left -= dt;
      if (this.wrong.left <= 0) this.hideWrong();
    }
    if (this.phase === 'peek') {
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) this.endPeek();
    } else if (this.phase === 'clear') {
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) this.deal(this.stage + 1);
    } else if (this.phase === 'playing') {
      if (this.revealLeft > 0) {
        this.revealLeft -= dt;
        if (this.revealLeft <= 0) {
          this.revealLeft = 0;
          this.emit({ type: 'revealEnd' });
        }
        return;
      }
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.finish();
      }
    }
  }

  private hideWrong(): void {
    if (!this.wrong) return;
    const [a, b] = this.wrong.cards;
    this.wrong = null;
    a.state = b.state = 'down';
    this.emit({ type: 'hide', cards: [a, b] });
  }

  /** 카드를 누름. 미리 보기 중에 누르면 미리 보기를 건너뛰고 바로 뒤집는다(카드가 깔리는 동안의 누름은 실수로 보고 무시) */
  flip(index: number): void {
    if (this.phase === 'peek') {
      if (this.def.peekMs - this.phaseLeft < DEAL_MS) return;
      this.endPeek();
    }
    if (this.phase !== 'playing' || this.revealLeft > 0) return;
    // 틀린 두 장을 보여 주는 중에 다음 카드를 누르면 기다리지 않고 바로 덮는다(손이 빠른 사람이 막히지 않게)
    if (this.wrong) this.hideWrong();
    const card = this.cards[index];
    if (!card || card.state !== 'down') return;
    const seenBefore = card.seen;
    card.state = 'up';
    card.seen = true;
    this.emit({ type: 'flip', card });
    if (!this.first) {
      this.first = card;
      this.firstSeenBefore = seenBefore;
      return;
    }
    const a = this.first;
    this.first = null;
    if (a.key === card.key) this.match(a, card, this.firstSeenBefore && seenBefore, !this.firstSeenBefore && !seenBefore);
    else this.mismatch(a, card);
  }

  private match(a: Card, b: Card, memory: boolean, lucky: boolean): void {
    a.state = b.state = 'gone';
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.stats.pairs++;
    const multiplier = comboMultiplier(this.combo);
    const bonus = memory ? 'memory' : lucky ? 'lucky' : null;
    let points = Math.round(MATCH_POINTS * multiplier) + (memory ? MEMORY_BONUS : lucky ? LUCKY_BONUS : 0);
    if (a.gold) points *= 2;
    let gain = this.def.matchGain + (this.combo >= 3 ? COMBO_GAIN : 0);
    if (a.special === 'clock') gain += CLOCK_GAIN;
    gain = Math.round(gain * this.def.gainRate);
    this.score += points;
    this.addTime(gain);
    if (!a.special) this.faces.add(a.face as FaceId);
    this.emit({ type: 'match', a, b, points, gain, combo: this.combo, multiplier, bonus });
    if (this.pairsLeft === 0) this.clearStage();
    else if (a.special === 'peek') {
      this.revealLeft = PEEK_REVEAL;
      this.emit({ type: 'reveal', ms: PEEK_REVEAL });
    }
  }

  private mismatch(a: Card, b: Card): void {
    // 기억 실수: 처음 뒤집은 카드의 짝을 이미 본 적이 있는데 엉뚱한 카드를 뒤집음.
    // 처음 보는 카드끼리 틀린 것(탐색)은 시간을 깎지 않는다
    const partner = this.cards.find((c) => c !== a && c.key === a.key)!;
    const mistake = this.stage >= MISTAKE_FROM_STAGE && partner.seen && partner !== b;
    const penalty = mistake ? Math.min(MISTAKE_PENALTY, this.remaining) : 0;
    const comboLost = this.combo;
    this.combo = 0;
    this.stats.misses++;
    this.stageMistakes++;
    if (mistake) this.stats.mistakes++;
    this.remaining -= penalty;
    this.wrong = { cards: [a, b], left: HIDE_DELAY };
    this.emit({ type: 'mismatch', a, b, mistake, penalty, comboLost });
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.finish();
    }
  }

  private clearStage(): void {
    const perfect = this.stageMistakes === 0;
    const bonus = this.stage * STAGE_BONUS + (perfect ? PERFECT_BONUS : 0);
    const gain = Math.round((CLEAR_GAIN + (perfect ? PERFECT_GAIN : 0)) * this.def.gainRate);
    if (perfect) this.stats.perfects++;
    this.score += bonus;
    this.addTime(gain);
    this.phase = 'clear';
    this.phaseLeft = CLEAR_PAUSE;
    this.emit({ type: 'stageClear', stage: this.stage, bonus, gain, perfect });
  }

  private addTime(ms: number): void {
    this.remaining = Math.min(MAX_MS, this.remaining + ms);
  }

  pause(): void {
    if (this.phase === 'paused' || this.phase === 'over' || this.phase === 'idle') return;
    this.resumeTo = this.phase;
    this.phase = 'paused';
    this.emit({ type: 'pause' });
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = this.resumeTo;
    this.emit({ type: 'resume' });
  }

  private finish(): void {
    this.phase = 'over';
    this.emit({ type: 'over', result: this.result() });
  }

  result(): GameResult {
    const { pairs, misses, mistakes, perfects } = this.stats;
    return {
      score: this.score,
      stage: this.stage,
      pairs,
      maxCombo: this.maxCombo,
      accuracy: pairs + misses ? pairs / (pairs + misses) : 0,
      perfects,
      mistakes,
      pairsLeft: this.pairsLeft,
      faces: [...this.faces],
    };
  }
}

/**
 * 한 판의 카드를 만든다. 새로 열린 묶음 그림을 절반 이상 넣어 판이 오를 때마다 새 그림을 만나게 하고,
 * 7판부터는 48장 전체에서 고른다
 */
export function buildCards(stage: number, def: StageDef, rng: Rng, layout: Rng = rng): Card[] {
  const specials = Math.min(specialCount(stage, rng), def.pairs - def.twins - 1);
  const normal = def.pairs - specials - def.twins;
  let picked: FaceId[];
  if (stage <= FACE_SETS.length) {
    const open = setsOpen(stage);
    const newest = shuffle([...FACE_SETS[open - 1].faces] as FaceId[], rng);
    const older = shuffle(FACE_SETS.slice(0, open - 1).flatMap((s) => [...s.faces]) as FaceId[], rng);
    const fromNew = Math.min(newest.length, open === 1 ? normal : Math.ceil(normal / 2));
    picked = [...newest.slice(0, fromNew), ...older.slice(0, normal - fromNew)];
  } else {
    picked = shuffle([...ALL_FACES], rng).slice(0, normal);
  }
  const twinOf = shuffle([...picked], rng).slice(0, def.twins);
  const goldFace = stage >= 2 && rng() < GOLD_CHANCE ? picked[Math.floor(rng() * picked.length)] : null;
  const kinds: SpecialId[] = shuffle(['clock', 'peek'] as SpecialId[], rng);

  type Spec = Pick<Card, 'key' | 'face' | 'special' | 'twin' | 'gold'>;
  const specs: Spec[] = [
    ...picked.map((face) => ({ key: face, face, special: null, twin: false, gold: face === goldFace })),
    ...twinOf.map((face) => ({ key: `${face}~twin`, face, special: null, twin: true, gold: false })),
    ...kinds.slice(0, specials).map((s) => ({ key: s, face: s, special: s, twin: false, gold: false })),
  ];
  const deck = shuffle(specs.flatMap((s) => [s, s]), layout);
  return deck.map((s, index) => ({ ...s, index, state: 'down', seen: false }));
}
