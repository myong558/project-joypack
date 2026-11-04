---
name: studio-domain-pocketgamelab
description: "게임 스튜디오 이름·도메인을 Pocket Game Lab(pocketgamelab.com/.kr/.co.kr)으로 정함, 구매 뒤 다른 PC에서 연결·조이필드 주소 이전을 이어 감"
metadata:
  node_type: memory
  type: project
  originSessionId: 52d9cf93-5348-4c30-b05a-6553a8fd0050
  modified: 2026-11-04T08:55:24.104Z
---

2026-11-04 사용자가 게임 스튜디오 이름을 **Pocket Game Lab(포켓게임랩)** 으로 정하고, `pocketgamelab.com`·`.kr`·`.co.kr` 세 주소를 아이티이지(iteasy.co.kr)에서 한꺼번에 사기로 함(소문자 그대로, 하이픈 주소는 안 삼). `.kr`·`.co.kr`은 `.com`으로 301 연결.

- 확인한 것: 세 주소 WHOIS 모두 미등록(2026-11-04 17:33), KIPRIS 에서 사용자가 "포켓게임랩", "pocketgamelab", "포켓 게임 랩", "pocket game lab" 검색 → 없음. 웹에는 비슷한 이름 Pocket PlayLab(방콕 모바일 게임사)·Pocket Card Game Lab(인도)만 있음.
- 남은 것: 해외 상표(WIPO Global Brand Database) 확인, 구글 플레이 개발자 이름 확보, 상표 출원은 이름만으로는 식별력 약해 로고와 함께 권장.

**다음 일정(다른 PC에서 진행, 사용자 요청):** 세션 첫 답변에서 먼저 꺼내 알린다.
0. 이름 바뀐 것 반영 먼저: 그 PC 폴더·`git remote -v` 가 옛 이름(`project-joypack`)이면 [[other-pc-folder-rename]] 대로 `pnpm setup:rename` 을 먼저 알리고 진행, 새 세션에서 1번부터 잇는다.
1. 구매 확인: 세 주소를 샀는지, 등록인이 본인 이름인지, 자동 연장이 켜졌는지 묻는다(필요하면 WHOIS 로 등록 확인).
2. Cloudflare(무료)에 세 주소 추가 → 아이티이지에서 네임서버를 Cloudflare 것으로 변경 → Redirect Rules 로 `.kr`·`.co.kr` → `https://pocketgamelab.com` 301.
3. 조이필드 주소 이전 계획: 지금은 GitHub Pages `/project-joyfield/`. 새 구조(예: `pocketgamelab.com/joyfield/`, 게임은 그 아래) 결정 → GitHub Pages 사용자 도메인 또는 다른 호스팅, Vite base 경로, PWA 범위·manifest·서비스 워커(`Joyfield.registerSW`), Firebase 허용 도메인(인증·Firestore), 공유 링크, 옛 주소에서 새 주소로 안내를 한 번에 계획하고 사용자와 정한 뒤 진행. 홈 화면에 설치한 앱은 새 주소에서 다시 설치해야 함을 알린다.

**Why:** 조이필드와 앞으로 만들 게임을 이 도메인 아래로 연결할 계획이고, 사용자가 구매 뒤 다른 PC에서 이어 가겠다고 함.

**How to apply:** 위 순서대로 진행. 주소 이전은 바로 고치지 말고 계획부터. 관련: [[ranking-reset-at-store-launch]] [[other-pc-folder-rename]]
