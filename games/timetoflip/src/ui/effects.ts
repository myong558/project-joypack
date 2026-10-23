/** 기기의 "동작 줄이기" 설정. 켜져 있으면 흔들림·튀어 오름만 뺀다(진동·소리·색 변화는 그대로) */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** 손맛 연출: 점수·시간 팝업, 반짝 고리, 별 파티클, 화면 흔들림, 배너 */
export class Effects {
  constructor(private readonly stage: HTMLElement) {}

  /** target 위에 글자가 크게 튀었다가 떠오르며 사라진다 */
  popup(target: HTMLElement, text: string, variant = '', delay = 0): void {
    const el = document.createElement('span');
    el.className = `popup ${variant}`;
    el.textContent = text;
    if (delay) el.style.animationDelay = `${delay}ms`;
    this.place(el, target);
    el.addEventListener('animationend', () => el.remove());
  }

  /** 별 조각이 사방으로 튄다 */
  burst(target: HTMLElement, colors: string[], count = 8): void {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'particle';
      el.style.background = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 2.2 + Math.random() * 1.6;
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}em`);
      el.style.setProperty('--dy', `${Math.sin(angle) * dist}em`);
      this.place(el, target);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  /** 맞힌 카드 자리에 하얀 고리가 퍼진다 */
  ring(target: HTMLElement, variant = ''): void {
    const el = document.createElement('span');
    el.className = `ring ${variant}`;
    this.place(el, target);
    el.addEventListener('animationend', () => el.remove());
  }

  /** tiny: 맞힘(아래로 툭), small: 황금·퍼펙트, big: 시간 끝 */
  shake(strength: 'tiny' | 'small' | 'big'): void {
    if (reducedMotion.matches) return;
    this.stage.classList.remove('shake-tiny', 'shake-small', 'shake-big');
    void this.stage.offsetWidth;
    this.stage.classList.add(`shake-${strength}`);
  }

  banner(text: string, variant = ''): void {
    const layer = this.stage.querySelector('.banners')!;
    const el = document.createElement('div');
    el.className = `banner ${variant}`;
    el.textContent = text;
    layer.replaceChildren(el);
    el.addEventListener('animationend', () => el.remove());
  }

  /** 연출 조각은 카드 안에 넣지 않고 판 위 층에 카드 가운데 좌표로 띄운다(카드가 뒤집히며 함께 돌지 않게) */
  private place(el: HTMLElement, target: HTMLElement): void {
    const layer = this.stage.querySelector<HTMLElement>('.fx-layer')!;
    const box = layer.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    el.style.left = `${r.left - box.left + r.width / 2}px`;
    el.style.top = `${r.top - box.top + r.height / 2}px`;
    layer.append(el);
  }
}

/** 신기록 때 시곗바늘·별 모양 색종이가 떨어진다 */
export function confetti(container: HTMLElement, count = 60): void {
  const colors = ['#ff5d5d', '#ffb703', '#12a4b8', '#7c5cff', '#4ade80'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = `confetti${i % 3 === 0 ? ' hand' : ''}`;
    el.style.left = `${Math.random() * 100}%`;
    el.style.background = colors[i % colors.length];
    el.style.animationDelay = `${Math.random() * 0.6}s`;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    el.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    container.append(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/** 숫자가 차르르 올라가는 연출 */
export function countUp(el: HTMLElement, to: number, ms = 900): void {
  if (reducedMotion.matches) {
    el.textContent = to.toLocaleString();
    return;
  }
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(to * (1 - (1 - t) ** 3)).toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
