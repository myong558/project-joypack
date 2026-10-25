import '@joypack/shared';
import type { SharedSetting } from '@joypack/shared';
import { LEVELS } from './game/levels';
import { LANGS, detectLang, type Lang } from './i18n';
import { cleanName, sanitizeDaily, sanitizeEntries, sanitizePending, type DailyEntry, type DailyRecord, type PendingRecord, type RankEntry } from './ranking';
import { SKIN_SETTINGS, THEMES, type SkinSetting, type Theme } from './theme';

const KEY = 'glasshouse:v1';

/** 판마다 가장 좋은 기록(가장 적은 이동) */
export interface LevelRecord {
  moves: number;
  score: number;
  petals: number;
}

export interface SaveData {
  /** 판 번호(0~23)마다 가장 좋은 기록. 깬 판만 있다 = 도감에 열린 꽃 */
  levels: (LevelRecord | null)[];
  /** 도감에서 이미 펼쳐 본 쪽(새 쪽 표시용) */
  seen: number[];
  /** 게임 중 한 번만 띄우는 규칙 안내를 본 판(기록 지우기와 상관없이 남김) */
  tips: number[];
  /** 이 기기의 순위표 사본 */
  rankings: RankEntry[];
  pending: PendingRecord | null;
  /** 오늘의 정원: 이 기기의 그날 가장 좋은 기록, 그날 순위표 사본, 등록하지 않고 넘어간 기록(모두 날짜가 바뀌면 안 씀) */
  daily: (DailyRecord & { date: string }) | null;
  dailyRankings: { date: string; entries: DailyEntry[] };
  dailyPending: (DailyRecord & { date: string }) | null;
  /** 지난번 순위표에 쓴 이름. 다음 등록 때 미리 채운다 */
  playerName: string;
  sound: boolean;
  /** 진동(지원하는 기기만). 화면 흔들림은 설정이 아니라 늘 켜져 있다(기기의 동작 줄이기 설정만 따름) */
  vibrate: boolean;
  lang: Lang;
  theme: Theme;
  skin: SkinSetting;
}

/** "내 기록 지우기"로 지워지는 부분: 이 기기의 판 기록·도감·오늘의 정원 기록. 순위표 사본·등록 대기·안내 본 기록은 남긴다 */
export function emptyRecords(): Pick<SaveData, 'levels' | 'seen' | 'daily'> {
  return { levels: LEVELS.map(() => null), seen: [], daily: null };
}

function defaults(): SaveData {
  return { ...emptyRecords(), tips: [], rankings: [], pending: null, dailyRankings: { date: '', entries: [] }, dailyPending: null, playerName: '', sound: true, vibrate: true, lang: detectLang(), theme: 'system', skin: 'auto' };
}

export const gardenScore = (save: SaveData) => save.levels.reduce((n, r) => n + (r?.score ?? 0), 0);
export const flowerCount = (save: SaveData) => save.levels.filter(Boolean).length;
export const petalCount = (save: SaveData) => save.levels.reduce((n, r) => n + (r?.petals ?? 0), 0);
/** 처음부터 차례로: 아직 안 깬 첫 판(모두 깼으면 -1) */
export const nextLevel = (save: SaveData) => save.levels.findIndex((r) => !r);

/** 오늘의 정원은 봄 정원 여섯을 모두 피우면 열린다(햇살·그늘 규칙을 다 배운 뒤. 계절 요소는 판 위 안내 한 줄로 알려 줌) */
export const dailyOpen = (save: SaveData) => save.levels.slice(0, 6).every(Boolean);

const dailyRecord = (raw: unknown): (DailyRecord & { date: string }) | null => {
  const r = raw as (DailyRecord & { date: string }) | null;
  return r && Number.isInteger(r.moves) && r.moves > 0 && Number.isInteger(r.time) && r.time >= 0 && typeof r.date === 'string' ? { moves: r.moves, time: r.time, date: r.date } : null;
};

export function loadSave(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return withShared(base);
    const data = { ...base, ...(JSON.parse(raw) as Partial<SaveData>) } as SaveData;
    const ok = (r: LevelRecord | null) => !!r && Number.isInteger(r.moves) && r.moves > 0 && Number.isInteger(r.score) && Number.isInteger(r.petals);
    data.levels = LEVELS.map((_, i) => (Array.isArray(data.levels) && ok(data.levels[i]) ? data.levels[i] : null));
    for (const k of ['seen', 'tips'] as const) data[k] = (Array.isArray(data[k]) ? data[k] : []).filter((i) => Number.isInteger(i));
    data.rankings = sanitizeEntries(data.rankings);
    data.pending = sanitizePending(data.pending);
    data.daily = dailyRecord(data.daily);
    data.dailyPending = dailyRecord(data.dailyPending);
    const dr = data.dailyRankings as Partial<SaveData['dailyRankings']> | null;
    data.dailyRankings = { date: typeof dr?.date === 'string' ? dr.date : '', entries: sanitizeDaily(dr?.entries) };
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
  // 이 게임에서 바꾼 공통 설정만 조이팩 공통 키에 쓴다(판 끝 저장이 다른 화면에서 바꾼 값을 덮어쓰지 않게)
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
