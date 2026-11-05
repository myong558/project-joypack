---
name: store-launch-prep
description: 다음 주(2026-11-09 주) 앱 등록 때 할 일 3가지 — 개발 사이트 잠그기·플레이 등록 자료·출시 전 점검(어느 PC 든)
metadata:
  node_type: memory
  type: project
  originSessionId: e0651e98-2b02-45d4-baa8-ede156a475c1
  modified: 2026-11-05T04:54:36.961Z
---

2026-11-05 사용자 결정: 다음 주(2026-11-09 주) 구글 플레이 앱 등록 때 아래 셋을 진행한다. 다른 PC 에서 할 수도 있다.

1. 개발 사이트 잠그기 — **방법 A(Cloudflare Access)로 결정, 집 PC 에서만 진행**(2026-11-05). 회사 PC 는 컴퓨터 이름 `DESKTOP-B51J711`, 다른 이름이면 집 PC 로 보고 첫 답변에서 먼저 알린다. B(`_worker.js`)는 운영 요청까지 코드를 지나 무료 한도·장애 위험이 있어 쓰지 않음. 자세한 내용은 CLAUDE.md "다음 일정" 1번.
2. 구글 플레이 등록 준비 — 스토어 그래픽(512 아이콘·1024×500 대표 그래픽·스크린샷), 설명문, 데이터 보안·콘텐츠 등급 답변 초안, `assetlinks.json` 자리.
3. 출시 전 점검 — 공개 게임 `check:screens all`, 서비스 워커 업데이트, 오프라인.

2026-11-05 회사 PC 마지막 상태: `contact@pocketgamelab.com` 받기 연결 끝(Cloudflare 이메일 라우팅, 라우팅 규칙은 온보드와 별도로 만들어야 했음). 사용자가 정리한 주소 지도 — `pocketgamelab.com/joyfield/` 만 누구나 열고, `dev.pocketgamelab.com/joyfield/` 는 Access 잠금, 나머지는 잠금 또는 301, 최상위 `pocketgamelab.com/` 회사 페이지는 앱 등록 직전 제작. 그 사이 개발 일은 온실정원만 남음. 순서는 CLAUDE.md "다음 일정" 절 "지금 상태".

**Why:** 앱 등록에 맞춰 한꺼번에 하기로 미뤘다. 그 전까지는 온실정원 판 작업을 한다(최상위 페이지는 앱 등록 직전으로 미룸).

**How to apply:** "다른 PC 이어하기"·앱 등록·출시·TWA 이야기가 나오거나 날짜가 2026-11-09 이후면 CLAUDE.md "지금 상태" 순서로 먼저 꺼낸다. 같은 시점에 [[ranking-reset-at-store-launch]](랭킹 초기화·개인정보처리방침 주소)도 함께 알린다. 관련: [[studio-domain-pocketgamelab]] [[two-pc-setup]] [[glasshouse-level-review]]
