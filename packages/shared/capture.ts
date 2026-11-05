// 결과 이미지 공통(기록 공유하기, 기준서 1.5): 결과 화면을 PNG 로 찍는다. 화면이 깜빡이지 않도록 보이지 않는 복제본을 찍으며,
// 복제본에서는 위에 게임 아이콘과 이름을 붙이고 버튼·토스트·등록 카드처럼 이미지에 필요 없는 것을 뺀다.
// html-to-image 는 게임이 불러오는 함수를 넘긴다(공통 모듈은 의존성을 두지 않음): () => import('html-to-image')
type ToBlob = (node: HTMLElement, options?: { pixelRatio?: number; backgroundColor?: string }) => Promise<Blob | null>;

export interface CaptureOptions {
  /** () => import('html-to-image') */
  load: () => Promise<{ toBlob: ToBlob }>;
  /** 게임 이름(복제본 맨 위 아이콘 옆) */
  title: string;
  /** 아이콘 파일(document.baseURI 기준, 기본 favicon.svg) */
  icon?: string;
  /** 복제본에서 뺄 것(기본 .actions, .toast, .rank-entry) */
  remove?: string;
  /** 복제본에서 지울 클래스(등록 카드 때문에 숨겼던 것을 다시 보이게 등, 기본 has-entry) */
  removeClass?: string[];
  /** 아이콘·이름 줄을 넣을 곳(기본 .main-col, 없으면 맨 앞) */
  brandInto?: string;
  /** 복제본 요소 사이 간격(기본 1.2em) */
  gap?: string;
}

export async function captureResult(el: HTMLElement, opts: CaptureOptions): Promise<Blob | null> {
  try {
    const { toBlob } = await opts.load();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.classList.add('capturing');
    clone.classList.remove(...(opts.removeClass ?? ['has-entry']));
    clone.querySelectorAll(opts.remove ?? '.actions, .toast, .rank-entry').forEach((n) => n.remove());
    const brand = document.createElement('p');
    brand.className = 'share-brand';
    const img = document.createElement('img');
    img.src = new URL(opts.icon ?? 'favicon.svg', document.baseURI).href;
    img.alt = '';
    brand.append(img, opts.title);
    (clone.querySelector(opts.brandInto ?? '.main-col') ?? clone).prepend(brand);
    // 복제본은 원래 자리에 그대로 두되, 감싼 상자를 완전히 잘라 화면에는 보이지 않게 한다
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    Object.assign(holder.style, { position: 'fixed', inset: '0', clipPath: 'inset(100%)', pointerEvents: 'none' });
    // 높이는 내용에 맞춰 줄여 빈 여백 없이 담는다(카카오톡 미리보기에서 잘리지 않도록)
    Object.assign(clone.style, { width: `${el.offsetWidth}px`, height: 'auto', justifyContent: 'flex-start', gap: opts.gap ?? '1.2em' });
    holder.append(clone);
    el.after(holder);
    try {
      return await toBlob(clone, {
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
    } finally {
      holder.remove();
    }
  } catch {
    return null;
  }
}
