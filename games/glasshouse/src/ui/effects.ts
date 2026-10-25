/** 기기의 "동작 줄이기" 설정. 켜져 있으면 흔들림·튀어 오름만 뺀다(진동·소리·색 변화는 그대로) */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** 손맛 연출: 햇살에 닿은 화분의 빛 고리, 꽃잎 날림, 판 흔들림, 안내 띠 */
export class Effects {
  constructor(private readonly stage: HTMLElement) {}

  /** 화분 자리에 햇빛 고리가 퍼진다(습성에 맞게 놓인 순간) */
  ring(target: HTMLElement, variant = ''): void {
    const el = document.createElement('span');
    el.className = `ring ${variant}`;
    this.place(el, target);
    el.addEventListener('animationend', () => el.remove());
  }

  /** 꽃이 필 때 꽃잎 몇 장이 위로 흩날린다(색은 그 꽃) */
  petals(target: HTMLElement, color: string, count = 6): void {
    if (reducedMotion.matches) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'petal-bit';
      el.style.background = color;
      const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.45;
      el.style.setProperty('--dx', `${Math.cos(a) * (1.6 + (i % 3) * 0.5)}em`);
      el.style.setProperty('--dy', `${Math.sin(a) * (2 + (i % 2))}em`);
      el.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (120 + i * 40)}deg`);
      el.style.animationDelay = `${i * 40}ms`;
      this.place(el, target);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  /** tiny: 화분 밀기(아래로 툭), small: 판 깸 */
  shake(strength: 'tiny' | 'small'): void {
    if (reducedMotion.matches) return;
    this.stage.classList.remove('shake-tiny', 'shake-small');
    void this.stage.offsetWidth;
    this.stage.classList.add(`shake-${strength}`);
  }

  /** 연출 조각은 판 위 층에 대상 가운데 좌표로 띄운다 */
  private place(el: HTMLElement, target: HTMLElement): void {
    const layer = this.stage.querySelector<HTMLElement>('.fx-layer')!;
    const box = layer.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    el.style.left = `${r.left - box.left + r.width / 2}px`;
    el.style.top = `${r.top - box.top + r.height * 0.7}px`;
    layer.append(el);
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
