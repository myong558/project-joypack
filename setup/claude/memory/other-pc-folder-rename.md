---
name: other-pc-folder-rename
description: 2026-11-04 저장소 이름을 project-joyfield 로 바꿈 — 다른 PC는 폴더 이름·원격 주소·pnpm install·setup:claude 를 아직 안 했을 수 있음, 물으면 순서대로 안내
metadata:
  type: project
---

2026-11-04 플랫폼 이름을 조이필드(Joyfield)로 바꾸면서 GitHub 저장소도 `myong558/project-joyfield` 로 바꿨다(사이트 `https://myong558.github.io/project-joyfield/`, Firebase `joyfield-41b5a`). 이 작업을 한 PC는 폴더 이름까지 바꿨고, **다른 PC는 사용자가 그 PC에서 다시 물어보기로 했다.**

**Why:** VS Code 위 가운데 제목은 GitHub 이름이 아니라 내 PC 폴더 이름이라, 폴더를 바꿔야 바뀐다. Claude 메모리는 폴더 경로마다 따로라 폴더를 바꾸면 새 경로에 다시 깔아야 한다.

**How to apply:** 다른 PC에서 저장소 이름·폴더·VS Code 제목을 물으면 아래 순서로 안내한다(README 7장에도 있음). 사용자가 원하면 1~2를 대신 한다(VS Code 가 열려 있으면 폴더가 잠기므로, 닫히면 이름을 바꾸고 설치한 뒤 다시 여는 PowerShell 스크립트를 띄워 두는 방식이 이 PC에서 썼던 방법).
1. `git remote set-url origin https://github.com/myong558/project-joyfield.git` 후 `git pull`
2. VS Code 를 닫고 폴더 이름을 `project-joyfield` 로 바꾼 뒤 새 폴더를 연다
3. 새 폴더에서 `pnpm install`(의존성 다시 연결), `pnpm setup:claude`(새 경로에 메모리 설치), Claude Code 새 세션
4. 홈 화면에 예전 주소로 설치한 앱은 열리지 않으니 새 주소에서 다시 설치(같은 사이트라 기기 설정·기록은 이어짐)
두 PC 모두 끝났다고 하면 이 메모리를 지운다. 관련: [[two-pc-setup]]
