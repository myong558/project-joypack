import type { ShareOutcome } from '@joyfield/shared';
import { captureResult as capture } from '@joyfield/shared/capture';
import { t } from './i18n';

/** 결과 화면 "기록 공유하기": 결과 캡처 이미지 + 조이필드 설치 주소를 한 번에 보낸다(모든 게임 같은 방식, Joyfield.shareResult) */
export function shareResult(image: Blob | null): Promise<ShareOutcome> {
  return Joyfield.shareResult({ gameId: 'hammer', image, title: t('app.title'), installText: t('share.install') });
}

/**
 * 결과 화면을 PNG로 찍는다(조이필드 공통 @joyfield/shared/capture). 복제본 위에 게임 아이콘과 이름을 붙이고 버튼·폭죽·토스트·등록 카드를 뺀다.
 * 등록 카드 때문에 숨겼던 다음 목표·잡은 두더지 목록은 다시 넣는다(has-entry 지움)
 */
export function captureResult(el: HTMLElement): Promise<Blob | null> {
  return capture(el, { load: () => import('html-to-image'), title: t('app.title'), remove: '.actions, .toast, .confetti-layer, .rank-entry' });
}

export type { ShareOutcome };
