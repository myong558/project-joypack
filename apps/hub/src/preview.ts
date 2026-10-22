// 숨김 미리보기: games.json status "preview" 게임을 비밀번호를 확인한 기기에서만 보이게 한다.
// 설정 → 정보의 버전 글자를 7번 연속 누르면 비밀번호 창이 뜨고(켜고 끌 때마다 늘), 맞으면 켜기·끄기 창이 뜬다.
// 켠 상태는 이 기기(사이트 저장소)에 남는다. 설정 화면에는 미리보기용 항목을 두지 않는다.
// 공개 저장소라 비밀번호 대신 SHA-256 값만 둔다. 보안 장치가 아니라 미완성 게임을 일반 사용자 눈에서 숨기는 용도다.

/** 값: 'on' = 켜짐, 그 밖(없음·'off') = 꺼짐. 예전(v1.10.x) 값 '1' 도 켜짐 */
const KEY = 'joypack.preview';
const PASS_SHA256 = 'cd53601f3f65a23fc9f7c22319324670e59f6e0fe2bad42982cef0392e2b6d5c';

export function previewOn(): boolean {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'on' || value === '1';
  } catch {
    return false;
  }
}

export function setPreview(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'on');
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
