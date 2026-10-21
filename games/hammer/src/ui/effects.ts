import { HAMMER } from './icons';

/** 기기의 "동작 줄이기" 설정. 켜져 있으면 화면 흔들림만 뺀다(번쩍임·파티클은 짧아서 그대로) */
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/** 손맛 연출: 점수 팝업, 타격 고리·번쩍임, 파티클, 화면 흔들림, 배너, 망치 커서, 폭죽 */
export class Effects {
  constructor(private readonly stage: HTMLElement) {}

  popup(target: HTMLElement, text: string, variant = ''): void {
    const el = document.createElement('span');
    el.className = `popup ${variant}`;
    el.textContent = text;
    target.append(el);
    el.addEventListener('animationend', () => el.remove());
  }

  /** 별 모양 조각이 사방으로 튄다 */
  burst(target: HTMLElement, colors: string[], count = 7): void {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'particle';
      el.style.background = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 2.5 + Math.random() * 2;
      el.style.setProperty('--dx', `${Math.cos(angle) * dist}em`);
      el.style.setProperty('--dy', `${Math.sin(angle) * dist - 1.2}em`);
      target.append(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  /** 흙덩이가 위로 튀었다가 포물선으로 떨어진다 */
  dirt(target: HTMLElement, count = 5): void {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'particle dirt';
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 4.4}em`);
      el.style.setProperty('--dy', `${-1.4 - Math.random() * 1.6}em`);
      el.style.setProperty('--s', (0.7 + Math.random() * 0.6).toFixed(2));
      target.append(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }

  /** 맞힌 자리에 하얀 충격 고리가 퍼지고 별 모양 섬광이 번쩍인다 */
  impact(target: HTMLElement, variant: '' | 'gold' | 'small' | 'bad' = ''): void {
    const el = document.createElement('span');
    el.className = `impact ${variant}`;
    target.append(el);
    // 고리(::before)와 섬광(::after)의 animationend 가 따로 오므로 가장 긴 고리 시간 뒤에 지운다
    setTimeout(() => el.remove(), 360);
  }

  /** tiny: 보통 타격(아래로 툭), small: 황금·킹 타격, big: 킹 쓰러뜨림·폭탄 */
  shake(strength: 'tiny' | 'small' | 'big'): void {
    if (reducedMotion.matches) return;
    const cls = `shake-${strength}`;
    this.stage.classList.remove('shake-tiny', 'shake-small', 'shake-big');
    void this.stage.offsetWidth;
    this.stage.classList.add(cls);
  }

  banner(text: string, variant = ''): void {
    const layer = this.stage.querySelector('.banners')!;
    const el = document.createElement('div');
    el.className = `banner ${variant}`;
    el.textContent = text;
    layer.replaceChildren(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/** 마우스를 따라다니는 망치. 터치에서는 친 자리에 잠깐 나타난다 */
export class Hammer {
  readonly el: HTMLElement;

  constructor(private readonly stage: HTMLElement) {
    this.el = document.createElement('span');
    this.el.className = 'hammer';
    this.el.innerHTML = HAMMER;
    this.el.setAttribute('aria-hidden', 'true');
    stage.append(this.el);
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this.moveTo(e.clientX, e.clientY, true);
    });
    stage.addEventListener('pointerenter', () => (this.rect = null));
    stage.addEventListener('pointerleave', () => this.el.classList.remove('visible'));
    window.addEventListener('resize', () => (this.rect = null));
  }

  /**
   * 위치는 레이아웃을 다시 계산하지 않는 translate로 옮긴다.
   * 판 위치는 들어올 때·창 크기가 바뀔 때만 다시 잰다
   */
  moveTo(clientX: number, clientY: number, visible: boolean): void {
    this.rect ??= this.stage.getBoundingClientRect();
    this.el.style.translate = `${(clientX - this.rect.left).toFixed(1)}px ${(clientY - this.rect.top).toFixed(1)}px`;
    this.el.classList.toggle('visible', visible);
  }

  swing(clientX: number, clientY: number, touch: boolean): void {
    this.moveTo(clientX, clientY, true);
    this.el.animate([{ rotate: '0deg' }, { rotate: '65deg', offset: 0.4 }, { rotate: '0deg' }], { duration: 150, easing: 'ease-out' });
    if (touch) {
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => this.el.classList.remove('visible'), 260);
    }
  }

  /** 맞혔을 때 망치 머리가 납작하게 눌렸다 돌아온다(휘두르기 rotate 와 따로 scale 만 움직임) */
  smash(): void {
    this.el.animate([{ scale: '1' }, { scale: '1.22 0.8', offset: 0.35 }, { scale: '0.95 1.06', offset: 0.7 }, { scale: '1' }], {
      duration: 170,
      delay: 30,
      easing: 'ease-out',
    });
  }

  stun(): void {
    this.el.animate(
      [
        { rotate: '0deg', filter: 'grayscale(1)' },
        { rotate: '15deg', offset: 0.25 },
        { rotate: '-15deg', offset: 0.5 },
        { rotate: '10deg', offset: 0.75 },
        { rotate: '0deg', filter: 'grayscale(0)' },
      ],
      { duration: 300, easing: 'ease-in-out' },
    );
  }

  private rect: DOMRect | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
}

export function confetti(container: HTMLElement, count = 60): void {
  const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti';
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
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(to * (1 - (1 - t) ** 3)).toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
