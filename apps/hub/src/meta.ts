import type { HubMeta } from '@joyfield/shared/meta';

/**
 * 게임마다 games/<id>/joyfield.meta.ts(허브 연결 메타, @joyfield/shared/meta)를 모은다: 내 최고 기록·내 기록 지우기·전체 랭킹 읽기.
 * 새 게임은 그 파일 하나만 만들면 허브가 저절로 쓴다(허브 코드를 고치지 않음)
 */
const files = import.meta.glob<{ default: HubMeta }>('../../../games/*/joyfield.meta.ts', { eager: true });

export const META: Record<string, HubMeta> = Object.fromEntries(Object.entries(files).map(([path, mod]) => [path.split('/').slice(-2, -1)[0], mod.default]));
