import type { ShareOutcome } from '@joypack/shared';
import { t } from './i18n';

/** 결과 화면 "기록 공유하기": 결과 캡처 이미지 + 조이팩 설치 주소를 한 번에 보낸다(모든 게임 같은 방식, Joypack.shareResult) */
export function shareResult(image: Blob | null): Promise<ShareOutcome> {
  return Joypack.shareResult({ gameId: 'hammer', image, title: t('app.title'), installText: t('share.install') });
}

/**
 * 결과 화면을 PNG로 찍는다. 화면이 깜빡이지 않도록 보이지 않는 복제본을 찍으며,
 * 복제본에서는 위에 게임 아이콘과 이름을 붙이고 버튼·폭죽·토스트를 뺀다
 */
export async function captureResult(el: HTMLElement): Promise<Blob | null> {
  const { toBlob } = await import('html-to-image');
  const clone = el.cloneNode(true) as HTMLElement;
  clone.classList.add('capturing');
  // 등록 카드 때문에 숨겼던 다음 목표·잡은 두더지 목록은 공유 이미지에 다시 넣는다
  clone.classList.remove('has-entry');
  clone.querySelectorAll('.actions, .toast, .confetti-layer, .rank-entry').forEach((n) => n.remove());
  const brand = document.createElement('p');
  brand.className = 'share-brand';
  brand.innerHTML = `<img src="${new URL('favicon.svg', document.baseURI).href}" alt="">${t('app.title')}`;
  clone.querySelector('.main-col')?.prepend(brand);
  // 복제본은 원래 자리에 그대로 두되, 감싼 상자를 완전히 잘라 화면에는 보이지 않게 한다
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  Object.assign(holder.style, { position: 'fixed', inset: '0', clipPath: 'inset(100%)', pointerEvents: 'none' });
  // 높이는 내용에 맞춰 줄여 빈 여백 없이 담는다(카카오톡 미리보기에서 잘리지 않도록)
  Object.assign(clone.style, { width: `${el.offsetWidth}px`, height: 'auto', justifyContent: 'flex-start', gap: '1.2em' });
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
