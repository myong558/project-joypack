// 숨김 미리보기: games.json status "preview" 게임을 개발자 모드에서만 보이게 한다.
// 개발자 모드는 주소로 정한다(Joyfield.devMode): 개발 사이트·내 PC 는 늘 켜짐, 운영 사이트는 늘 꺼짐이고 켜는 방법이 없다.

export function previewOn(): boolean {
  return Joyfield.devMode();
}
