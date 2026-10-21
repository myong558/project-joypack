import { emptyStats } from './game/engine';
import { MOLE_ORDER } from './game/moles';
import type { MoleKind } from './game/types';
import { LANGS, detectLang, type Lang } from './i18n';
import { emptyPending, emptyRankings, sanitizePending, sanitizeRankings, cleanName, type PendingRanks, type Rankings } from './ranking';
import { SKIN_SETTINGS, THEMES, type SkinSetting, type Theme } from './theme';

const KEY = 'project-hammer:v1';

export interface SaveData {
  best: number;
  daily: { date: string; best: number } | null;
  dex: MoleKind[];
  /** 지금까지 잡은 수(폭탄은 터뜨린 수) */
  kills: Record<MoleKind, number>;
  /** 이 기기의 순위표(클래식·오늘의 챌린지) */
  rankings: Rankings;
  pending: PendingRanks;
  /** 지난번 순위표에 쓴 이름. 다음 등록 때 미리 채운다 */
  playerName: string;
  sound: boolean;
  shake: boolean;
  lang: Lang;
  theme: Theme;
  skin: SkinSetting;
}

function defaults(): SaveData {
  let reduced = false;
  try {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // 지원하지 않는 환경
  }
  return {
    ...emptyProgress(),
    sound: true,
    shake: !reduced,
    lang: detectLang(),
    theme: 'system',
    skin: 'auto',
    playerName: '',
  };
}

/** 게임 리셋으로 지워지는 부분 */
export function emptyProgress(): Pick<SaveData, 'best' | 'daily' | 'dex' | 'kills' | 'rankings' | 'pending'> {
  return { best: 0, daily: null, dex: [], kills: emptyStats().kills, rankings: emptyRankings(), pending: emptyPending() };
}

export function loadSave(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = { ...base, ...JSON.parse(raw) } as SaveData;
    data.dex = data.dex.filter((k) => MOLE_ORDER.includes(k));
    data.kills = { ...base.kills, ...data.kills };
    data.rankings = sanitizeRankings(data.rankings);
    data.pending = sanitizePending(data.pending);
    data.playerName = cleanName(String(data.playerName ?? ''));
    if (!LANGS.includes(data.lang)) data.lang = base.lang;
    if (!THEMES.includes(data.theme)) data.theme = base.theme;
    if (!SKIN_SETTINGS.includes(data.skin)) data.skin = base.skin;
    return data;
  } catch {
    return base;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시한다(시크릿 창, 용량 초과 등)
  }
}
