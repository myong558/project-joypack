import '@joypack/shared';
import type { SharedSetting } from '@joypack/shared';
import { ALL_FACES, ITEMS, type FaceId, type ItemId } from './game/faces';
import { LANGS, detectLang, type Lang } from './i18n';
import { cleanName, emptyPending, emptyRankings, sanitizePending, sanitizeRankings, type PendingRanks, type Rankings } from './ranking';
import { SKIN_SETTINGS, THEMES, type SkinSetting, type Theme } from './theme';

const KEY = 'timetoflip:v1';

export interface SaveData {
  /** 클래식 최고 점수와 그 판에 도달한 판 */
  best: number;
  bestStage: number;
  daily: { date: string; best: number } | null;
  /** 도감: 한 번이라도 맞힌 그림, 황금으로 맞힌 그림 */
  dex: FaceId[];
  /** 도감 특수 카드 칸: 한 번이라도 맞힌 특수 카드·황금 카드 */
  items: ItemId[];
  /** 게임 중 처음 만날 때 한 번만 띄우는 특수 카드 안내를 이미 본 것(기록 지우기와 상관없이 남김) */
  itemHints: ItemId[];
  /** 지금까지 맞힌 짝 수 */
  pairs: number;
  /** 이 기기의 순위표 사본(클래식·오늘의 챌린지) */
  rankings: Rankings;
  pending: PendingRanks;
  /** 지난번 순위표에 쓴 이름. 다음 등록 때 미리 채운다 */
  playerName: string;
  sound: boolean;
  /** 진동(지원하는 기기만). 화면 흔들림은 설정이 아니라 늘 켜져 있다(기기의 동작 줄이기 설정만 따름) */
  vibrate: boolean;
  lang: Lang;
  theme: Theme;
  skin: SkinSetting;
}

function defaults(): SaveData {
  return {
    ...emptyRecords(),
    rankings: emptyRankings(),
    pending: emptyPending(),
    sound: true,
    vibrate: true,
    lang: detectLang(),
    theme: 'system',
    skin: 'auto',
    playerName: '',
    itemHints: [],
  };
}

/**
 * "내 기록 지우기"로 지워지는 부분: 이 기기의 최고 기록·도감·맞힌 짝 수.
 * 온라인 순위표 사본(rankings)과 아직 올리지 않은 등록 대기 기록(pending)은 남긴다(조이팩 허브의 "내 기록 지우기"도 같은 범위)
 */
export function emptyRecords(): Pick<SaveData, 'best' | 'bestStage' | 'daily' | 'dex' | 'items' | 'pairs'> {
  return { best: 0, bestStage: 0, daily: null, dex: [], items: [], pairs: 0 };
}

export function loadSave(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return withShared(base);
    const data = { ...base, ...(JSON.parse(raw) as Partial<SaveData>) } as SaveData;
    // v0.9.0 에서 도형 '반원(arch)'을 '초승달(moon)'로 바꿨다. 모은 도감은 그대로 이어지게 옮긴다
    data.dex = (Array.isArray(data.dex) ? (data.dex as string[]) : []).map((f) => (f === 'arch' ? 'moon' : f)) as FaceId[];
    data.dex = data.dex.filter((f) => ALL_FACES.includes(f));
    for (const k of ['items', 'itemHints'] as const) data[k] = (Array.isArray(data[k]) ? data[k] : []).filter((i) => ITEMS.includes(i));
    // v0.11.0 에서 도감의 황금 ★ 기록을 없앴다(예전 저장의 gold 는 버림)
    delete (data as { gold?: unknown }).gold;
    for (const k of ['best', 'bestStage', 'pairs'] as const) if (!Number.isFinite(data[k])) data[k] = 0;
    data.rankings = sanitizeRankings(data.rankings);
    data.pending = sanitizePending(data.pending);
    data.playerName = cleanName(String(data.playerName ?? ''));
    if (!LANGS.includes(data.lang)) data.lang = base.lang;
    if (!THEMES.includes(data.theme)) data.theme = base.theme;
    if (!SKIN_SETTINGS.includes(data.skin)) data.skin = base.skin;
    return withShared(data);
  } catch {
    return withShared(base);
  }
}

const SHARED: SharedSetting[] = ['theme', 'lang', 'sound', 'vibrate', 'initials'];
/** 이 게임이 마지막으로 읽거나 쓴 공통 설정 값. 저장할 때 이것과 달라진(이 게임에서 바꾼) 값만 공통 키에 쓴다 */
const synced: Partial<Record<SharedSetting, string | null>> = {};

/** 조이팩 공통 설정(허브·다른 게임에서 고른 값)이 있으면 이 게임 저장 값보다 앞선다. 스킨은 게임마다 달라 공통으로 두지 않는다 */
function withShared(data: SaveData): SaveData {
  for (const name of SHARED) synced[name] = Joypack.get(name);
  const theme = Joypack.get('theme') as Theme | null;
  if (theme && THEMES.includes(theme)) data.theme = theme;
  const lang = Joypack.get('lang') as Lang | null;
  if (lang && LANGS.includes(lang)) data.lang = lang;
  const sound = Joypack.get('sound');
  if (sound) data.sound = sound !== 'off';
  const vibrate = Joypack.get('vibrate');
  if (vibrate) data.vibrate = vibrate !== 'off';
  const initials = cleanName(Joypack.get('initials') ?? '');
  if (initials) data.playerName = initials;
  return data;
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 무시한다(시크릿 창, 용량 초과 등)
  }
  // 이 게임에서 바꾼 공통 설정만 조이팩 공통 키에 쓴다. 판 끝 저장처럼 설정과 상관없는 저장에서는 쓰지 않으므로
  // 다른 화면에서 바꾼 값을 예전 값으로 덮어쓰지 않는다. 공통 키가 아직 없으면(처음 열었을 때) 이 게임 값을 한 번 써 둔다
  const values: Record<SharedSetting, string> = {
    theme: data.theme,
    lang: data.lang,
    sound: data.sound ? 'on' : 'off',
    vibrate: data.vibrate ? 'on' : 'off',
    initials: data.playerName,
  };
  for (const name of SHARED) {
    if (!values[name] || values[name] === synced[name]) continue;
    Joypack.set(name, values[name]);
    synced[name] = values[name];
  }
}
