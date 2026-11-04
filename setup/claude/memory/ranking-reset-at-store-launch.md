---
name: ranking-reset-at-store-launch
description: 안드로이드 마켓(플레이 스토어) 최초 등록 직전에 모든 게임 랭킹 초기화를 사용자에게 먼저 요청·안내할 것
metadata:
  node_type: memory
  type: project
  originSessionId: d82bcbd3-5dad-4659-aaf1-8952437e80a6
  modified: 2026-11-04T00:36:07.379Z
---

플레이 스토어(TWA) 최초 등록·공개 작업을 할 때, 공개 직전에 **모든 게임 랭킹 초기화를 사용자에게 먼저 요청**한다(2026-11-04 사용자 지시). 사용자가 직접 Firebase 콘솔에서 지워야 하므로, 지울 문서 목록을 정리해 준다.

**Why:** 지금 기록은 대부분 테스트 점수(테스트하는 사람 10명 이하)라 실제 이용자에게 의미가 없고, 2026-11-04 에 추가한 랭킹 기기 아이콘(`dev`: 모바일·PC)이 예전 기록에는 없어 초기화하면 모든 줄에 고르게 붙는다. "정식 오픈 = 새 시즌".

**How to apply:**
- 출시 준비·마켓 등록·TWA(Bubblewrap)·`assetlinks.json` 이야기가 나오면 이 할 일을 먼저 꺼낸다. 어느 PC 세션이든 같음(이 메모리는 `setup/claude/memory` 로 저장소에 있음).
- 시점은 공개 직전(그 전에 지우면 테스트 기록이 다시 쌓임).
- 규칙이 `delete: if false` 라 앱에서는 못 지운다. 콘솔에서 사람이 지울 것: `games/updown/scores-50`·`scores-100`·`scores-200` 컬렉션의 문서 전부, `games/hammer/rankings/*`, `games/timetoflip/rankings/*`, `games/glasshouse/rankings/*`(그 사이 새 게임이 생겼으면 `firestore.rules` 목차로 다시 확인).
- 초기화 뒤 허브·게임의 기기 저장 순위 사본은 다음에 랭킹을 열 때 새로 받으므로 따로 할 일 없음.
- 관련: [[two-pc-setup]]
