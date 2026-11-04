---
name: other-pc-folder-rename
description: "2026-11-04 저장소 이름을 project-joypack → project-joyfield 로 바꿈 — 다른 PC에서 \"이름 바뀐 것 반영해줘\" 하면 git pull 뒤 pnpm setup:rename 으로 진행"
metadata:
  node_type: memory
  type: project
  originSessionId: 3dcf9f1f-8816-43c7-a41f-b2b00db7adec
  modified: 2026-11-04T05:54:07.791Z
---

2026-11-04 플랫폼 이름을 조이팩 → 조이필드(Joyfield)로 바꾸면서 GitHub 저장소도 `myong558/project-joypack` → `myong558/project-joyfield` 로 바꿨다(사이트 `https://myong558.github.io/project-joyfield/`, Firebase `joyfield-41b5a`). 이 작업을 한 PC는 폴더 이름까지 바꿨고, **다른 PC는 사용자가 그 PC에서 "제목(이름) 바뀐 것 반영해줘"라고 요청하기로 했다.**

**Why:** VS Code 위 가운데 제목은 GitHub 이름이 아니라 내 PC 폴더 이름이라, 폴더를 바꿔야 바뀐다. Claude 메모리는 폴더 경로마다 따로라 폴더를 바꾸면 새 경로에 다시 깔아야 한다. VS Code 가 열려 있으면 폴더가 잠겨 이름을 못 바꾼다.

**How to apply:** 다른 PC에서 그 요청을 받거나 폴더·원격 주소가 옛 이름이면 묻지 않고 진행한다.
1. 고친 파일이 없는지 보고 `git pull`(옛 원격 주소도 GitHub 가 넘겨 줌)
2. `pnpm setup:rename` — 원격 주소 → 폴더 이름 → `pnpm install` → `pnpm setup:claude`. Windows 에서는 따로 PowerShell 창이 떠서 VS Code 를 모두 닫을 때까지 기다렸다가 이름을 바꾸고 설치한 뒤 VS Code 를 다시 연다(이 PC에서 잠금 풀릴 때까지 기다리는 동작 시험함).
3. 사용자에게 "VS Code 를 모두 닫으면 이어서 됨, 다시 열리면 Claude Code 새 세션"과 "홈 화면에 옛 주소로 설치한 앱은 새 주소에서 다시 설치(같은 사이트라 기기 설정·기록은 이어짐)"를 알린다.
두 PC 모두 끝났다고 하면 이 메모리와 `scripts/rename-pc.mjs`·`setup:rename` 을 지운다. 관련: [[two-pc-setup]]
