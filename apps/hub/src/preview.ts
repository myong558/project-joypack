// 숨김 미리보기: games.json status "preview" 게임을 비밀번호를 확인한 기기에서만 보이게 한다.
// 설정 → 정보의 버전 글자를 7번 연속 누르면 비밀번호 창이 뜬다. 한 번 맞으면 이 기기(사이트 저장소)는 계속 잠금 해제 상태이고,
// 그 뒤로는 설정 → 정보의 스위치로 비밀번호 없이 켜고 끈다.
// 공개 저장소라 비밀번호 대신 SHA-256 값만 둔다. 보안 장치가 아니라 미완성 게임을 일반 사용자 눈에서 숨기는 용도다.

/** 값: 없음 = 잠김, 'on' = 켜짐, 'off' = 잠금은 풀렸고 꺼짐. 예전(v1.10.x) 값 '1' 은 켜짐 */
const KEY = 'joypack.preview';
const PASS_SHA256 = 'cd53601f3f65a23fc9f7c22319324670e59f6e0fe2bad42982cef0392e2b6d5c';

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(value: 'on' | 'off'): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // 저장소를 못 쓰는 환경
  }
}

/** 비밀번호를 한 번이라도 맞힌 기기인지(켜고 끄는 스위치가 보임) */
export function previewUnlocked(): boolean {
  return read() !== null;
}

/** 미리보기 게임을 보이는지 */
export function previewOn(): boolean {
  const value = read();
  return value === 'on' || value === '1';
}

/** 잠금이 풀린 기기에서만 켜고 끈다 */
export function setPreview(on: boolean): void {
  if (previewUnlocked()) write(on ? 'on' : 'off');
}

/** 비밀번호가 맞으면 잠금을 풀고 켠다 */
export async function unlockPreview(input: string): Promise<boolean> {
  // crypto.subtle 은 https·localhost 에서만 있다
  if (!crypto.subtle) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.trim()));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== PASS_SHA256) return false;
  write('on');
  return true;
}
