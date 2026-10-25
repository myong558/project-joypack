import type { ShareOutcome } from '@joypack/shared';
import { t } from './i18n';

/** 결과 화면 "기록 공유하기": 결과 캡처 이미지 + 조이팩 설치 주소를 한 번에 보낸다(모든 게임 같은 방식, Joypack.shareResult) */
export function shareResult(image: Blob | null): Promise<ShareOutcome> {
  return Joypack.shareResult({ gameId: 'glasshouse', image, title: t('app.title'), installText: t('share.install') });
}

/**
 * 결과 화면을 PNG로 찍는다. 화면이 깜빡이지 않도록 보이지 않는 복제본을 찍으며,
 * 복제본에서는 위에 게임 아이콘과 이름을 붙이고 버튼·토스트·등록 카드를 뺀다(두더지잡기·타임 투 플립과 같은 방식, 공통화 대기 4번)
 */
export async function captureResult(el: HTMLElement): Promise<Blob | null> {
  const { toBlob } = await import('html-to-image');
  const clone = el.cloneNode(true) as HTMLElement;
  clone.classList.add('capturing');
  clone.classList.remove('has-entry');
  clone.querySelectorAll('.actions, .toast, .rank-entry, .more').forEach((n) => n.remove());
  const brand = document.createElement('p');
  brand.className = 'share-brand';
  brand.innerHTML = `<img src="${new URL('favicon.svg', document.baseURI).href}" alt="">${t('app.title')}`;
  clone.querySelector('.main-col')?.prepend(brand);
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  Object.assign(holder.style, { position: 'fixed', inset: '0', clipPath: 'inset(100%)', pointerEvents: 'none' });
  Object.assign(clone.style, { width: `${el.offsetWidth}px`, height: 'auto', justifyContent: 'flex-start', gap: '1em' });
  holder.append(clone);
  el.after(holder);
  try {
    return await toBlob(clone, {
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      backgroundColor: getComputedStyle(document.body).backgroundColor,
    });
  } catch {
    return null;
  } finally {
    holder.remove();
  }
}

export type { ShareOutcome };
