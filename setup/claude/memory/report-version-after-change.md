---
name: report-version-after-change
description: "조이팩 수정 후 답변에 \"확인할 버전\"(어느 게임 vX.Y.Z, 어디서 보이는지)을 항상 알려 준다"
metadata:
  node_type: memory
  type: feedback
  originSessionId: f5d58410-d68e-41c3-8ab9-72dc0ae64eba
  modified: 2026-10-21T06:14:34.824Z
---

게임·허브를 수정할 때마다 버전을 올리고, 답변에 **확인할 버전**을 항상 적는다(예: "두더지잡기 v0.5.0 — 게임 설정 창 맨 아래 / 조이팩 설정 → 정보").

**Why:** 사용자가 배포된 화면이 새 버전인지 직접 확인하고 싶어 함(2026-10-21 요청: "항상 수정시 확인 버전 알려줘"). 서비스 워커 캐시 때문에 옛 화면이 보일 수 있어 버전으로 구분한다.

**How to apply:**
- 수정한 게임의 `games/<id>/package.json` version 을 올린다(기능 추가 minor, 수정 patch). 허브를 고쳤으면 루트 `package.json` version.
- 답변 끝에 "확인 버전" 줄: 바뀐 것 → 새 버전, 확인 위치(게임 설정 창 하단 `버전 vX.Y.Z` / 조이팩 설정 → 정보 줄).
- 업다운 설정에는 버전 표시가 없을 수 있으니 조이팩 설정 → 정보로 안내한다.

관련: [[joypack-structure]]
