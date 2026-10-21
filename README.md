# 조이팩 (joypack)

간단한 미니 게임을 하나씩 만들어 모아 두는 미니 게임 모음 웹앱(PWA)입니다. 첫 화면에서 게임을 고르면 바로 플레이하고, 게임마다 Firebase 공유 랭킹이 붙어 있습니다.

이 문서는 **이미 따로 만든 게임들을 조이팩 하나로 합치는 계획**입니다. 진행하면서 체크박스를 채우고, 결정이 바뀌면 이 문서를 먼저 고칩니다.

---

## 1. 현재 상태

| 항목 | 업다운 (`project-updown`) | 두더지잡기 (`project-hammer`) |
| --- | --- | --- |
| 저장소 | `myong558/project-updown` | `myong558/project-hammer` |
| 주소 | `https://myong558.github.io/project-updown/` | `https://myong558.github.io/project-hammer/` |
| 기술 | 순수 HTML·CSS·JS (빌드 없음) | Vite + TypeScript (pnpm, Vitest) |
| 배포 | Pages "Deploy from a branch" (`main` / root) | GitHub Actions → `dist/` |
| 오프라인 | 직접 쓴 `sw.js` (`CACHE_NAME` 수동 증가) | `vite-plugin-pwa` (workbox, autoUpdate) |
| 랭킹 클라이언트 | Firestore REST + `fetch` (`js/ranking.js`) | Firebase SDK + 트랜잭션 (`src/online.ts`) |
| 랭킹 경로 | `games/updown/scores/{id}` (기록 1건 = 문서 1개) | `games/hammer/rankings/{board}` (순위표 1개 = 문서 1개, `entries` 배열) |
| 기기 저장 | `localStorage` `updown.*` (best, theme, skin, lang, sound, vibrate, initials) | `localStorage` `project-hammer:v1` (JSON 한 덩어리) |
| 공통 설정 | 컬러 모드, 스킨, 언어(ko/en), 효과음·진동 | 컬러 모드, 스킨, 언어(ko/en), 사운드 |
| 랭킹 이름 | 영문 대문자 1~5자 | 영문 대문자 A–Z 최대 5자 |

이미 맞춰져 있어 통합이 쉬운 부분:

- **Firebase 프로젝트가 하나**(`joypack-c6bd2`)이고, 게임마다 `games/<게임ID>/` 아래만 씁니다. 통합해도 게임 ID(`updown`, `hammer`)만 그대로 두면 **기존 랭킹이 그대로 이어집니다.**
- **같은 출처(origin)** 입니다. 세 사이트 모두 `https://myong558.github.io` 라서 `localStorage` 를 같이 씁니다. 게임을 `/project-joypack/games/...` 로 옮겨도 **기기에 남은 최고 기록·설정이 그대로 읽힙니다.** 저장 키 이름도 서로 겹치지 않습니다.
- 두 게임 모두 상대 경로(`./`)로 만들어져 있어 하위 경로로 옮겨도 깨지지 않습니다.
- 랭킹 이름 규칙(영문 대문자 5자)이 같아 한 번 입력한 이름을 게임 간에 공유할 수 있습니다.

---

## 2. 통합 방식 결정

### 검토한 방식

| 방식 | 내용 | 장점 | 단점 |
| --- | --- | --- | --- |
| A. 링크 허브 | 조이팩은 게임 목록만 두고 기존 주소로 이동 | 오늘 바로 가능, 게임 수정 없음 | 앱 설치가 게임마다 따로, 설정 공유 불가, 저장소·배포가 계속 흩어짐 |
| B. 모노레포 + 다중 페이지 | 게임 코드를 조이팩 저장소로 옮겨 한 사이트(`/project-joypack/games/<id>/`)로 배포 | 앱 하나로 설치·오프라인, 설정·이름 공유, 배포 한 번, 새 게임 추가가 정형화 | 옮기는 작업, 서비스 워커 정리 필요 |
| C. iframe 임베드 | 허브 화면 안에 게임을 iframe 으로 띄움 | 허브 UI 가 늘 보임 | 전체 화면·진동·공유(Web Share)·키보드 초점이 iframe 에서 불안정, 화면 높이 계산이 이중으로 꼬임 |

### 결정: **A로 먼저 열고, B로 완성한다** (C는 쓰지 않음)

- 게임은 **각자 독립된 페이지**로 둡니다. 허브에서 게임으로는 일반 페이지 이동입니다. 게임마다 글꼴·색·CSS 가 달라도 서로 간섭하지 않고, 게임 쪽 코드는 거의 그대로 씁니다.
- 기술 스택을 하나로 억지로 맞추지 않습니다. 업다운은 빌드 없는 정적 파일로, 두더지잡기는 Vite 빌드 결과로 같은 `dist/` 에 모읍니다.
- 앞으로 만들 게임은 조이팩 안에서 바로 시작합니다(9장 "새 게임 추가").

---

## 3. 목표 구조

```
project-joypack/
├── apps/
│   └── hub/                    조이팩 첫 화면 (Vite + TypeScript)
│       ├── index.html          게임 목록, 설정, 전체 랭킹 바로가기
│       ├── src/
│       └── public/             앱 아이콘, og-image
├── games/
│   ├── updown/                 업다운 (git subtree, 빌드 없음 → 그대로 복사)
│   └── hammer/                 두더지잡기 (git subtree, vite build)
├── packages/
│   └── shared/                 공통 모듈 (설정, 랭킹 이름, 게임 목록 메타, 허브로 돌아가기 버튼)
├── games.json                  게임 목록(ID, 이름 ko/en, 아이콘, 색, 경로, 버전, 공개 여부)
├── firestore.rules             모든 게임의 보안 규칙 원본 (콘솔에 붙여 넣는 기준 파일)
├── firestore.indexes.json      복합 색인 기록
├── scripts/
│   └── assemble.mjs            각 게임 빌드 결과를 dist/ 한 곳에 모으고 서비스 워커 생성
├── .github/workflows/deploy.yml
├── pnpm-workspace.yaml
└── package.json
```

배포 결과(`dist/`)와 주소:

```
dist/                       → https://myong558.github.io/project-joypack/
├── index.html              조이팩 허브
├── sw.js                   서비스 워커 (사이트 전체에 하나)
├── manifest.webmanifest    조이팩 앱 하나
└── games/
    ├── updown/index.html   → .../project-joypack/games/updown/
    └── hammer/index.html   → .../project-joypack/games/hammer/
```

---

## 4. 핵심 설계

### 4.1 서비스 워커는 사이트에 하나

서비스 워커는 자기 경로 아래 전체를 관리합니다. 조이팩 루트에 하나를 두면 `games/` 아래도 모두 맡게 되므로, **통합 빌드에서는 게임이 자기 서비스 워커를 등록하지 않게** 합니다.

- 업다운: `js/app.js` 의 `sw.js` 등록을 "조이팩 안에서는 건너뜀"으로 바꾸고, 통합 빌드에는 `sw.js`·`manifest.webmanifest` 를 넣지 않습니다.
- 두더지잡기: 통합 빌드에서 `VitePWA` 플러그인을 끕니다(환경 변수 `JOYPACK=1` 로 분기).
- 조이팩 서비스 워커는 `scripts/assemble.mjs` 가 workbox 로 만듭니다. 빌드마다 새로 만들어지므로 업다운의 `CACHE_NAME` 수동 증가는 더 이상 필요 없습니다.

**캐시 정책: 허브만 미리, 게임은 처음 열 때**

게임이 늘어도 처음 방문한 사람이 모든 게임을 내려받지 않게 합니다.

| 대상 | 언제 캐시 | 방식 |
| --- | --- | --- |
| 허브(`index.html`, 허브 JS·CSS, manifest, 아이콘, `games.json`) | 서비스 워커 설치 때 (precache) | 해시로 버전 관리, 새 배포 시 자동 교체 |
| 게임 파일(`games/<id>/**`) | 그 게임을 **처음 열 때** (runtime caching) | 게임마다 캐시 하나(`joypack-game-<id>`) |
| Firestore 요청 | 캐시 안 함 | 네트워크만 (랭킹 결과는 게임이 기기에 따로 저장) |
| `og-image.png` | 캐시 안 함 | 링크 미리보기 전용 |

- **처음 열 때 그 게임 전체를 받습니다.** 화면에 처음 쓰인 파일만 캐시하면, 나중에 불러오는 글꼴·효과음·이미지가 빠져 오프라인에서 깨집니다. 그래서 `assemble.mjs` 가 게임마다 파일 목록 `games/<id>/files.json`(경로 + 해시)을 만들고, 게임 페이지가 처음 열리면 서비스 워커가 이 목록을 모두 그 게임 캐시에 담습니다.
- **요청 처리**
  - 게임 HTML: 네트워크 먼저, 3초 안에 응답이 없거나 오프라인이면 캐시(NetworkFirst).
  - 해시가 붙은 파일(두더지잡기 `assets/*`): 캐시 먼저(CacheFirst).
  - 해시 없는 파일(업다운 `js/`, `css/` 등): 캐시로 바로 보여 주고 뒤에서 새로 받아 둠(StaleWhileRevalidate).
- **게임 갱신**: 새 배포로 `files.json` 해시가 바뀌면, 캐시가 있는 게임만 다음 실행 때 바뀐 파일을 다시 받습니다. 한 번도 안 연 게임은 받지 않습니다.
- **허브 표시**
  - 캐시된 게임 카드에는 "오프라인 가능" 표시를 합니다.
  - 오프라인일 때 캐시가 없는 게임 카드는 흐리게 하고 "인터넷 연결 후 한 번 열어 주세요"라고 안내합니다.
  - 허브는 `caches.has('joypack-game-<id>')` 로 캐시 여부를 판단합니다.
- 설정에 **게임별 저장 공간 비우기**를 둡니다. 게임 캐시만 지우고 기록은 남깁니다.
- 서비스 워커는 `autoUpdate`(새 버전이 있으면 바로 교체)로 둡니다.

### 4.2 공통 설정 (`joypack.*`)

허브 설정에서 한 번 고르면 모든 게임이 따릅니다.

| 키 | 값 | 비고 |
| --- | --- | --- |
| `joypack.theme` | `system` / `light` / `dark` | 컬러 모드 |
| `joypack.lang` | `ko` / `en` | 언어 |
| `joypack.sound` | `on` / `off` | 효과음 |
| `joypack.vibrate` | `on` / `off` | 진동 |
| `joypack.initials` | `A–Z` 1~5자 | 랭킹 이름 (모든 게임에 미리 채움) |

- 게임은 **`joypack.*` 를 먼저 읽고, 없으면 자기 키**(`updown.theme`, `project-hammer:v1` 안의 설정)를 읽습니다. 그래서 기존 사용자 설정이 사라지지 않습니다.
- 게임 안에서 설정을 바꾸면 `joypack.*` 에 씁니다(공통 항목만). 스킨은 게임마다 종류가 달라(계절 / 정원·사막·밀림·설산) **게임별로 유지**합니다.
- 최고 기록·도감 같은 게임 데이터는 지금 키 그대로 둡니다. 옮기지 않습니다.
- 다른 탭에서 바꾼 설정은 `storage` 이벤트로 바로 반영합니다.

### 4.3 허브와 게임 사이 이동

- 게임 시작 화면 왼쪽 위에 **조이팩으로 돌아가기** 버튼을 둡니다(`packages/shared` 의 작은 스크립트, 게임 쪽은 한 줄 추가). 게임 단독 실행(기존 저장소)에서는 보이지 않습니다.
- 조이팩 안인지 판단: 경로에 `/games/` 가 있거나 빌드 상수 `__JOYPACK__` 가 참일 때.
- 게임 화면 전환 애니메이션은 허브에서 카드가 커지며 넘어가는 정도만(View Transitions API 지원 브라우저, 동작 줄이기 설정이면 생략).

### 4.4 랭킹 (Firebase)

- Firebase 프로젝트 `joypack-c6bd2` 와 게임 ID 는 **그대로**. 데이터 이전은 없습니다.
- 각 게임의 랭킹 코드는 처음에는 손대지 않습니다(업다운 REST, 두더지잡기 SDK). 두 방식 모두 잘 돌고 있고, 억지로 합치면 위험만 커집니다.
- 보안 규칙은 지금 콘솔에만 있으므로 **`firestore.rules` 파일 하나로 모아 저장소에서 관리**합니다. 게임을 추가할 때 이 파일에 블록을 더하고 콘솔에 붙여 넣습니다(Firebase CLI `firebase deploy --only firestore:rules` 로 바꿀 수도 있음).
- 허브에 **전체 랭킹** 화면: 게임별 TOP 3 를 한 화면에 보여 줍니다. 읽기 횟수를 아끼려고 허브에 들어올 때가 아니라 그 화면을 열 때만 읽고, 마지막 결과를 기기에 남겨 둡니다.
- 무료 한도(하루 읽기 5만·쓰기 2만)는 모든 게임이 나눠 씁니다. 게임이 늘면 한도 사용량을 콘솔에서 주기적으로 확인합니다.
- API 키에 HTTP 리퍼러 제한을 걸어 두었다면 `myong558.github.io/project-joypack/*` 를 추가합니다(같은 도메인이라 `myong558.github.io/*` 로 걸려 있다면 그대로 됨).

### 4.5 게임 목록 메타 (`games.json`)

허브 화면, 전체 랭킹, 서비스 워커, og 태그가 모두 이 파일 하나를 봅니다.

```json
[
  {
    "id": "updown",
    "name": { "ko": "업다운", "en": "Up Down" },
    "desc": { "ko": "숫자를 UP·DOWN 힌트로 맞히기", "en": "Guess the number with UP/DOWN hints" },
    "path": "games/updown/",
    "icon": "games/updown/images/icon.svg",
    "color": "#…",
    "ranking": "games/updown/scores",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "hammer",
    "name": { "ko": "두더지잡기", "en": "Whack-a-Mole" },
    "desc": { "ko": "튀어나오는 두더지를 빠르게 때리기", "en": "Whack the moles as fast as you can" },
    "path": "games/hammer/",
    "icon": "games/hammer/favicon.svg",
    "color": "#ff7a3d",
    "ranking": "games/hammer/rankings",
    "version": "0.3.4",
    "status": "live"
  }
]
```

`status` 가 `soon` 이면 허브에 "준비 중" 카드로만 보입니다.

---

## 5. 기존 주소와 설치한 앱 처리

이미 `project-updown`, `project-hammer` 를 설치했거나 링크를 공유한 사람이 있으므로 갑자기 끊지 않습니다.

1. 조이팩이 배포되고 안정되면, 기존 저장소에 **마지막 버전**을 하나씩 올립니다.
   - 시작 화면에 "조이팩으로 이사했어요" 안내와 이동 버튼(기록·설정은 그대로라는 문구 포함).
   - 서비스 워커는 옛 캐시를 지우고 스스로 해제(`registration.unregister()`)하도록 바꿉니다. 그래야 설치한 앱이 옛 파일에 갇히지 않습니다.
2. 2~4주 뒤 기존 사이트의 `index.html` 을 새 주소로 바로 넘기는 페이지(`<meta http-equiv="refresh">` + `location.replace`)로 바꿉니다.
3. 기존 저장소는 README 맨 위에 이사 안내를 쓰고 **Archive** 합니다(코드와 이력은 조이팩 저장소에도 subtree 로 남아 있음).

---

## 6. 단계별 계획

### 0단계 — 준비
- [ ] 이 계획 확정
- [ ] 조이팩 저장소 GitHub Pages 를 GitHub Actions 배포로 설정
- [ ] 콘솔의 Firestore 보안 규칙·복합 색인을 `firestore.rules`, `firestore.indexes.json` 으로 옮겨 커밋
- [ ] 조이팩 이름·로고·대표 색 정하기, 앱 아이콘·og-image 제작

### 1단계 — 링크 허브 공개 (방식 A)
- [ ] pnpm 워크스페이스, `apps/hub` (Vite + TypeScript) 초기화
- [ ] `games.json` 작성, 허브 첫 화면: 게임 카드(아이콘·이름·한 줄 설명), 카드를 누르면 **기존 주소**로 이동
- [ ] 허브 설정: 컬러 모드, 언어 (`joypack.*` 에 저장)
- [ ] 허브 PWA(manifest, 서비스 워커), og 태그
- [ ] 배포 → `https://myong558.github.io/project-joypack/` 확인

### 2단계 — 게임 코드 옮기기 (방식 B)
- [ ] `git subtree add --prefix=games/updown https://github.com/myong558/project-updown.git main` (이력 보존)
- [ ] `git subtree add --prefix=games/hammer https://github.com/myong558/project-hammer.git main`
- [ ] 두더지잡기: 커밋돼 있는 `dist/`, `dev-dist/` 는 통합 저장소에서 `.gitignore` 처리
- [ ] 업다운: 통합 빌드에서 서비스 워커 등록 건너뛰기
- [ ] 두더지잡기: `JOYPACK=1` 일 때 `VitePWA` 끄기, `outDir` 를 `../../dist/games/hammer` 로
- [ ] `scripts/assemble.mjs`: 허브·게임 빌드 결과 합치기 → 게임별 `files.json` 생성 → 사이트 서비스 워커 생성(허브만 precache, 게임은 runtime caching)
- [ ] 루트 `pnpm build` 한 번으로 전체 빌드, `pnpm test` 로 모든 게임 테스트
- [ ] GitHub Actions: 테스트 → 빌드 → Pages 배포
- [ ] 허브 카드 링크를 새 경로(`games/<id>/`)로 변경
- [ ] 확인
  - 같은 기기에서 기존 최고 기록·설정이 그대로 보이는지
  - 랭킹 읽기·등록이 되는지
  - 오프라인(비행기 모드)에서 허브가 열리는지
  - 한 번 연 게임은 오프라인에서 끝까지(글꼴·효과음 포함) 동작하는지
  - 안 연 게임 카드가 오프라인 안내로 바뀌는지
- [ ] 허브 첫 방문 때 게임 파일을 받지 않는지 확인(DevTools Network)

### 3단계 — 하나의 앱처럼
- [ ] `packages/shared`: 공통 설정 읽기·쓰기, 랭킹 이름, 돌아가기 버튼
- [ ] 두 게임이 `joypack.*` 설정을 먼저 읽도록 수정(없으면 기존 키)
- [ ] 랭킹 이름 공유(`joypack.initials`)
- [ ] 게임 시작 화면에 조이팩으로 돌아가기 버튼
- [ ] 허브 전체 랭킹 화면(게임별 TOP 3)
- [ ] 허브 화면에 각 게임의 내 최고 기록 표시(각 게임 저장 키를 읽기만 함)

### 4단계 — 이사 마무리
- [ ] 기존 두 사이트에 이사 안내 버전 배포, 서비스 워커 자체 해제
- [ ] 2~4주 뒤 기존 주소를 새 주소로 넘기는 페이지로 교체
- [ ] 기존 저장소 Archive

### 5단계 — 이후
- [ ] 새 게임 템플릿(`games/_template`) 정리
- [ ] 허브 꾸미기: 최근 플레이한 게임 먼저, 새 게임 배지
- [ ] (선택) 랭킹 클라이언트 공통화 — 새 게임부터 공통 모듈을 쓰고, 기존 게임은 필요할 때만 옮김

---

## 7. 개발

```bash
pnpm install
pnpm dev                 # 허브 개발 서버
pnpm --filter hammer dev # 게임 하나만 개발
pnpm test                # 모든 게임 테스트
pnpm build               # 허브 + 모든 게임 → dist/
pnpm preview             # dist/ 를 실제와 같은 하위 경로로 띄워 확인
```

- 서비스 워커는 HTTPS 또는 `localhost` 에서만 동작합니다.
- 실제 배포 경로(`/project-joypack/`)와 같은 하위 경로로 미리 보기 해야 경로 문제가 일찍 드러납니다. 모든 경로는 상대 경로로 씁니다.

---

## 8. 배포

- `main` 에 푸시하면 GitHub Actions 가 테스트 → 빌드 → Pages 배포를 합니다.
- 서비스 워커와 게임별 `files.json` 은 빌드할 때마다 새로 만들어지므로 수동으로 캐시 버전을 올릴 필요가 없습니다.
- 게임별 버전은 각 게임 `package.json` 의 `version` 을 쓰고, 설정 화면에 `vX.Y.Z` 로 표시합니다. 조이팩 전체 버전은 루트 `package.json` 입니다.

---

## 9. 새 게임 추가 체크리스트

1. `games/<id>/` 만들기(템플릿 복사). 게임 ID 는 영문 소문자, 한 번 정하면 바꾸지 않습니다(랭킹 경로·저장 키에 쓰임).
2. 게임 로직은 DOM 과 분리하고 Vitest 로 테스트합니다.
3. 기기 저장 키는 `<id>.` 로 시작합니다. 공통 설정은 `packages/shared` 로 읽습니다.
4. 상대 경로만 쓰고, 자기 서비스 워커·manifest 는 만들지 않습니다(조이팩 것을 씀). 오프라인에 필요한 파일은 모두 `games/<id>/` 안에 둡니다. 그래야 `files.json` 에 들어가 처음 열 때 함께 캐시됩니다.
5. 랭킹이 있으면 `games/<id>/` 아래에만 쓰고, `firestore.rules` 에 블록 추가 → 콘솔 게시, 필요한 복합 색인 추가.
6. `games.json` 에 항목 추가(처음엔 `status: "soon"`, 완성되면 `"live"`).
7. 한국어·영어 문구, 라이트·다크, 동작 줄이기 설정, 휴대폰 세로·PC 화면 확인.
8. 링크 미리보기 이미지(1200×630) 준비.

---

## 10. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 옛 서비스 워커가 옛 파일을 계속 내줌 | 기존 사이트 마지막 버전에서 캐시 삭제 + 자체 해제(5장) |
| 조이팩 서비스 워커와 게임 서비스 워커 충돌 | 통합 빌드에서 게임 서비스 워커 등록 제거(4.1) |
| 게임이 늘수록 첫 방문 다운로드가 커짐 | 허브만 precache, 게임은 처음 열 때 캐시(4.1) |
| 처음 연 게임에서 늦게 불러오는 파일이 캐시에서 빠져 오프라인에서 깨짐 | `files.json` 으로 게임 전체를 한 번에 캐시(4.1) |
| 하위 경로 이동으로 파일 경로 깨짐 | 상대 경로 원칙 유지, 하위 경로 미리 보기로 확인 |
| 기존 기록·설정 유실 | 같은 출처라 그대로 유지됨. 저장 키는 바꾸지 않고, 공통 설정은 "새 키 먼저, 없으면 옛 키" |
| 기존 랭킹 유실 | 게임 ID·Firestore 경로 변경 금지 |
| 게임이 늘며 Firestore 무료 한도 초과 | 랭킹은 열 때만 읽기, 마지막 결과 기기 저장, 콘솔 사용량 확인 |
| 보안 규칙이 콘솔에만 있어 덮어쓰기 실수 | `firestore.rules` 를 원본으로 저장소에서 관리 |
| 통합 저장소 빌드 시간 증가 | 게임별 `--filter` 빌드, CI 에서 pnpm 캐시 |
