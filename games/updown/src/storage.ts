// 기기 저장(localStorage). 키 이름은 공개 뒤 바꾸지 않는다(사용자 기록 보존, CLAUDE.md 운영 기준).
//   updown.scores   { [끝 숫자]: 최고 점수 } 랭킹 범위(1~50·1~100·1~200)만
//   updown.custom   직접 정하기에서 마지막으로 고른 끝 숫자
//   updown.skin     스킨(auto · spring · summer · autumn · winter)
//   updown.luck     결과 운 문구를 꺼낸 순서(단계마다)
//   updown.boards   마지막으로 받은 순위표 사본 { [끝 숫자]: RankEntry[] } (오프라인일 때 보여 주고 TOP 10 판단에 씀)
//   공통 설정(theme·lang·sound·vibrate·initials)은 Joyfield.get/set — 예전 키(updown.theme 등)에도 같이 쓴다(이사 전 저장 호환)
import '@joyfield/shared';
import { PRESETS, type Preset } from './game/rules';
import { cleanName, sanitizeEntries, type RankEntry } from './ranking';

const BEST_KEY = 'updown.scores';
const CUSTOM_KEY = 'updown.custom';
const SKIN_KEY = 'updown.skin';
export const LUCK_KEY = 'updown.luck';
const BOARDS_KEY = 'updown.boards';
/** 공통 설정의 예전 키(첫 화면 깜빡임 방지 스크립트도 updown.theme 를 읽음) */
export const LEGACY = { theme: 'updown.theme', sound: 'updown.sound', vibrate: 'updown.vibrate', initials: 'updown.initials' } as const;

// 하트·난이도가 있던 예전 버전의 기록, 기록 1건 = 문서 1개 방식이던 때(~v1.20)의 순위표 사본은 지금 방식과 비교할 수 없어 지운다.
// updown.pending2(등록 대기 기록)는 2026-11-05 등록 대기를 없애며 버린다(출시 전이라 옮기지 않음)
for (const key of ['updown.best', 'updown.pending', 'updown.pending2', 'updown.rankings', 'updown.rankings2']) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 못 쓰는 환경이면 넘어간다
  }
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시한다(시크릿 창, 용량 초과 등)
  }
}

export type Best = Partial<Record<Preset, number>>;

export function loadBest(): Best {
  const raw = readJson(BEST_KEY) as Record<string, unknown> | null;
  const best: Best = {};
  for (const key of PRESETS) {
    const v = raw?.[key];
    if (typeof v === 'number' && v > 0) best[key] = v;
  }
  return best;
}

export function saveBest(best: Best): void {
  write(BEST_KEY, JSON.stringify(best));
}

export function loadCustom(): number {
  try {
    return Number(localStorage.getItem(CUSTOM_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveCustom(max: number): void {
  write(CUSTOM_KEY, String(max));
}

export function loadSkin(): string | null {
  try {
    return localStorage.getItem(SKIN_KEY);
  } catch {
    return null;
  }
}

export function saveSkin(skin: string): void {
  write(SKIN_KEY, skin);
}

export function loadLuck(): Record<string, { order: number[]; next: number }> {
  const raw = readJson(LUCK_KEY);
  return raw && typeof raw === 'object' ? (raw as Record<string, { order: number[]; next: number }>) : {};
}

export function saveLuck(data: object): void {
  write(LUCK_KEY, JSON.stringify(data));
}

export function loadBoards(): Partial<Record<Preset, RankEntry[]>> {
  const raw = (readJson(BOARDS_KEY) ?? {}) as Record<string, unknown>;
  const out: Partial<Record<Preset, RankEntry[]>> = {};
  for (const key of PRESETS) if (raw[key]) out[key] = sanitizeEntries(raw[key]);
  return out;
}

export function saveBoards(boards: Partial<Record<Preset, RankEntry[]>>): void {
  write(BOARDS_KEY, JSON.stringify(boards));
}

/** 지난번 랭킹에 쓴 이름(공통 설정을 먼저) */
export function loadInitials(): string {
  return cleanName(Joyfield.get('initials', LEGACY.initials) ?? '');
}

export function saveInitials(name: string): void {
  Joyfield.set('initials', name, LEGACY.initials);
}
