// 숨김 미리보기: games.json status "preview" 게임을 비밀번호를 확인한 기기에서만 보이게 한다.
// 설정 → 정보의 버전 글자를 7번 연속 누르면 비밀번호 창이 뜬다. 한 번 맞으면 이 기기(사이트 저장소)에 계속 켜져 있다.
// 공개 저장소라 비밀번호 대신 SHA-256 값만 둔다. 보안 장치가 아니라 미완성 게임을 일반 사용자 눈에서 숨기는 용도다.

const KEY = 'joypack.preview';
const PASS_SHA256 = 'cd53601f3f65a23fc9f7c22319324670e59f6e0fe2bad42982cef0392e2b6d5c';

export function previewOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setPreview(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // 저장소를 못 쓰는 환경
  }
}

export async function checkPassword(input: string): Promise<boolean> {
  // crypto.subtle 은 https·localhost 에서만 있다
  if (!crypto.subtle) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.trim()));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === PASS_SHA256;
}
