---
name: glasshouse-level-review
description: 온실 정원 출시 전 판 점검 진행 상황 — 사용자가 TEST 풀이 보기로 판을 풀어 보고 구조 수정·순서 변경을 따로 전달할 예정(2026-11-04)
metadata:
  node_type: memory
  type: project
  originSessionId: 7e4bee38-6008-4a53-85de-a2046bd88f40
  modified: 2026-11-03T21:34:08.698Z
---

온실 정원(games/glasshouse)은 출시 전 판 점검 단계다(2026-11-04 기준 v0.14.2).

- 사용자가 개발자 모드의 "풀이 보기"(판 아래 ◀ 밀기 n / 전체 ▶ ▶▶ 줄, v0.14.0~0.14.1)로 24판을 직접 풀어 보고, **판 구조 수정·순서 변경을 따로 전달하기로 했다.** 그 요청이 오면 판(src/game/levels.ts)을 고친다.
- 판을 바꾸면 반드시 `pnpm --filter glasshouse solutions` 로 풀이(src/game/solutions.ts)를 다시 만든다. 안 하면 tests/levels.test.ts 가 실패한다. par(기준 이동 수)·화분 수 곡선 테스트도 함께 맞춘다.
- 판별 난이도 수치(화분·이동·밀기·돌려놓기·점수)는 src/game/roomgen.ts 의 `rate()` 로 잴 수 있다. 2026-11-04 기준 점수가 앞 판보다 낮은 판은 4판(131 < 3판 132)·6판(140 < 5판 157)뿐이다.
- 판 고르기 화면에 난이도 숫자를 붙이는 "제안 2"는 사용자가 채택하지 않았다(풀이 보기만 적용).

**Why:** 사용자가 직접 플레이 체감으로 판 난이도·순서를 다듬으려 한다.
**How to apply:** 사용자가 판 번호와 함께 수정·순서 변경을 말하면 이 흐름대로 진행한다. 관련 조작 결정은 [[glasshouse-push-controls]].
