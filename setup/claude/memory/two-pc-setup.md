---
name: two-pc-setup
description: 사용자는 조이팩을 두 PC에서 번갈아 작업함 — 새 PC에서 막혔던 준비 항목과 메모리가 PC마다 따로라는 점
metadata:
  node_type: memory
  type: project
  originSessionId: b06dbca9-09f5-46f2-8f8b-3c32844e47a9
  modified: 2026-10-23T15:11:04.042Z
---

사용자는 조이팩을 두 PC에서 번갈아 작업한다(2026-10-23 다른 PC → 이 PC로 이어받음). Claude 메모리(`~/.claude/projects/.../memory`)는 PC마다 따로라, 2026-10-25부터 저장소 `setup/claude/memory` 에 원본을 두고 `pnpm setup:claude` 로 깐다. 메모리를 쓰거나 고친 작업은 커밋 전에 `pnpm setup:claude --save` 로 원본에 반영한다.

이 PC(D:\workspace)에서 처음 막힌 것:
- Node 20.11 → test·build 실패, 설치 때 rolldown 바이너리가 빠짐. winget `OpenJS.NodeJS.LTS`(24)로 올리고 `pnpm install --force`.
- 실제 최소 Node 는 24.12(Firebase 13 engines). engines·engineStrict 를 22.12 로 넣었다가 CI(Node 22) 배포가 두 번 실패함 → CI·engines 를 24 로 맞춤. Node 요구를 바꿀 땐 lockfile 의 `engines: {node:` 전부와 CI node-version 을 함께 본다.
- `corepack enable` 은 Program Files 권한·오래된 corepack 때문에 실패 → `npm i -g pnpm@12.8.1`.
- git 작성자 미설정 → 이 저장소만 `명범수(S025547) <myong558@naver.com>`(다른 PC 커밋과 같게).
- GitHub 로그인(Git Credential Manager)이 없어 첫 push 때 로그인 창으로 로그인함(2026-10-23 완료).

**Why:** 작업 시작 시 "다른 PC에서 하던 것 이어서" 요청이 반복될 수 있다.
**How to apply:** 이어받을 때 `git pull` 먼저(그다음 `pnpm setup:claude` 로 메모리 받기), node -v / pnpm -v / git config user.name / push 가능 여부를 확인한다.
