import type { Card } from '../game/engine';
import type { StageDef } from '../game/stages';
import { faceName } from '../cards';
import { t } from '../i18n';
import { CARD_BACK, faceSvg } from './art';

/** 카드 폭 ÷ 높이 */
const ASPECT = 0.78;

/**
 * 카드 판 그리기. 카드는 버튼이라 누르기·Enter·스페이스로 뒤집고, 화살표로 옆 카드로 옮겨 간다.
 * 휴대폰 세로 배치(StageDef cols×rows)를 기본으로, 판 자리가 가로로 넓으면 행과 열을 바꿔 카드를 더 크게 놓는다
 */
export class Board {
  cards: HTMLButtonElement[] = [];
  private def: StageDef | null = null;
  private cols = 1;

  constructor(
    readonly el: HTMLElement,
    private readonly onFlip: (index: number) => void,
  ) {
    el.addEventListener('pointerdown', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('.card');
      if (!btn) return;
      // 누르는 순간 바로 뒤집는다(click 을 기다리면 손을 뗄 때까지 늦게 느껴짐). 키보드는 click 으로 온다
      e.preventDefault();
      btn.focus({ preventScroll: true });
      this.onFlip(Number(btn.dataset.i));
    });
    el.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLButtonElement>('.card');
      // 포인터로 누른 것은 pointerdown 에서 이미 처리했다(detail 0 = 키보드·보조기기)
      if (btn && (e as MouseEvent).detail === 0) this.onFlip(Number(btn.dataset.i));
    });
    el.addEventListener('keydown', (e) => this.onKey(e));
    new ResizeObserver(() => this.layout()).observe(el.parentElement!);
  }

  deal(cards: Card[], def: StageDef): void {
    this.def = def;
    this.el.replaceChildren(
      ...cards.map((c, i) => {
        const btn = document.createElement('button');
        btn.className = `card${c.special ? ` special ${c.special}` : ''}${c.gold ? ' gold' : ''}${c.twin ? ' twin' : ''}`;
        btn.dataset.i = String(i);
        btn.style.setProperty('--i', String(i));
        btn.innerHTML = `<span class="inner"><span class="side back">${CARD_BACK}</span><span class="side front">${faceSvg(c.face)}</span></span>`;
        btn.tabIndex = i === 0 ? 0 : -1;
        return btn;
      }),
    );
    this.cards = [...this.el.children] as HTMLButtonElement[];
    cards.forEach((c) => this.label(c));
    this.el.classList.remove('dealt');
    void this.el.offsetWidth;
    this.el.classList.add('dealt', 'peek');
    this.layout();
  }

  endPeek(): void {
    this.el.classList.remove('peek');
  }

  flip(card: Card): void {
    this.cards[card.index].classList.add('up');
    this.label(card);
  }

  hide(cards: Card[]): void {
    for (const c of cards) {
      this.cards[c.index].classList.remove('up', 'wrong');
      this.label(c);
    }
  }

  match(a: Card, b: Card): void {
    for (const c of [a, b]) {
      const btn = this.cards[c.index];
      btn.classList.add('up', 'gone');
      btn.setAttribute('aria-disabled', 'true');
      this.label(c);
    }
  }

  wrong(a: Card, b: Card): void {
    for (const c of [a, b]) {
      const btn = this.cards[c.index];
      btn.classList.remove('wrong');
      void btn.offsetWidth;
      btn.classList.add('wrong');
    }
  }

  /** 엿보기 카드: 남은 카드를 ms 동안 보여 준다 */
  reveal(ms: number): void {
    this.el.classList.add('reveal');
    setTimeout(() => this.el.classList.remove('reveal'), ms);
  }

  /** 시간이 끝나면 남은 카드를 모두 펼쳐 보여 준다 */
  showAll(): void {
    this.el.classList.add('over');
  }

  private label(c: Card): void {
    const n = c.index + 1;
    this.cards[c.index]?.setAttribute(
      'aria-label',
      c.state === 'gone' ? t('card.gone', { n }) : c.state === 'up' ? t('card.up', { n, name: faceName(c.face) }) : t('card.down', { n }),
    );
  }

  /** 판 자리에 맞춰 카드 크기·행렬을 정한다 */
  layout(): void {
    if (!this.def) return;
    const wrap = this.el.parentElement!;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    const { cols: c0, rows: r0 } = this.def;
    const fit = (cols: number, rows: number) => {
      const gap = Math.max(4, Math.min(12, Math.min(w, h) * 0.018));
      const cw = Math.min((w - gap * (cols - 1)) / cols, ((h - gap * (rows - 1)) / rows) * ASPECT);
      return { cols, rows, gap, cw };
    };
    // 두 배치 중 카드가 더 큰 쪽(세로 화면은 대개 그대로, 가로 화면은 행·열을 바꾼 쪽)
    const a = fit(c0, r0);
    const b = fit(r0, c0);
    const best = b.cw > a.cw * 1.04 ? b : a;
    this.cols = best.cols;
    this.el.style.setProperty('--cols', String(best.cols));
    this.el.style.setProperty('--cw', `${Math.floor(best.cw)}px`);
    this.el.style.setProperty('--ch', `${Math.floor(best.cw / ASPECT)}px`);
    this.el.style.setProperty('--gap', `${best.gap.toFixed(1)}px`);
  }

  /** 화살표로 판 위를 옮겨 다닌다(맞힌 카드도 지나가며 초점은 하나만 탭 순서에 둔다) */
  private onKey(e: KeyboardEvent): void {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -this.cols, ArrowDown: this.cols };
    const d = step[e.key];
    const from = this.cards.indexOf(document.activeElement as HTMLButtonElement);
    if (d === undefined || from < 0) return;
    e.preventDefault();
    const to = from + d;
    if (to < 0 || to >= this.cards.length) return;
    this.cards[from].tabIndex = -1;
    this.cards[to].tabIndex = 0;
    this.cards[to].focus();
  }
}
