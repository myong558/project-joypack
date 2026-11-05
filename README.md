# 조이필드 (joyfield)

간단한 미니 게임을 하나씩 만들어 모아 두는 미니 게임 마당 웹앱(PWA, 소개 문구 "하나씩 자라나는 미니 게임 마당" / "A growing field of mini games")입니다. 첫 화면에서 게임을 고르면 바로 플레이하고, 게임마다 Firebase 공유 랭킹이 붙어 있습니다.

이 문서는 **이미 따로 만든 게임들을 조이필드 하나로 합치는 계획**입니다. 진행하면서 체크박스를 채우고, 결정이 바뀌면 이 문서를 먼저 고칩니다.

> **진행 상황 (2026-11-05)**: 통합 0~4단계 끝(6장). 업다운·두더지잡기가 `games/` 아래로 옮겨졌고, 허브·공통 설정·전체 랭킹·사이트 서비스 워커가 동작합니다. 남은 일은 Firestore 규칙 대조입니다. 통합 전 저장소 `project-updown`·`project-hammer` 는 2026-11-05 삭제했습니다(코드·이력은 subtree 로 `games/` 에 있음, 5장).
>
> | 주소 (2026-11 `github.io` → `pocketgamelab.com` 이전, 8장) | |
> | --- | --- |
> | 조이필드 | `https://pocketgamelab.com/joyfield/` (개발 사이트 `https://dev.pocketgamelab.com/joyfield/`) |
> | 업다운 | `https://pocketgamelab.com/joyfield/games/updown/` |
> | 두더지잡기 | `https://pocketgamelab.com/joyfield/games/hammer/` |
> | 타임 투 플립 | `https://pocketgamelab.com/joyfield/games/timetoflip/` |
> | 온실정원 | `https://pocketgamelab.com/joyfield/games/glasshouse/` (미리보기: 개발자 모드에서만) |

---

## 1. 통합 전 상태 (기록)

> 아래 두 저장소와 주소는 **2026-11-05 삭제**했습니다(사용자 결정). 코드와 커밋 이력은 2단계(6장)의 `git subtree add` 로 `games/updown`·`games/hammer` 에 남아 있고, 랭킹은 Firebase 에 그대로 있습니다. 표는 통합할 때의 기록입니다.

| 항목 | 업다운 (`project-updown`) | 두더지잡기 (`project-hammer`) |
| --- | --- | --- |
| 저장소 | `myong558/project-updown` | `myong558/project-hammer` |
| 주소 | `https://myong558.github.io/project-updown/` | `https://myong558.github.io/project-hammer/` |
| 기술 | 순수 HTML·CSS·JS (빌드 없음) | Vite + TypeScript (pnpm, Vitest) |
| 배포 | Pages "Deploy from a branch" (`main` / root) | GitHub Actions → `dist/` |
| 오프라인 | 직접 쓴 `sw.js` (`CACHE_NAME` 수동 증가) | `vite-plugin-pwa` (workbox, autoUpdate) |
| 랭킹 클라이언트 | Firestore REST + `fetch` (`js/ranking.js`) | Firebase SDK + 트랜잭션 (`src/online.ts`) |
| 랭킹 경로 | `games/updown/scores-<50·100·200>/{id}` (범위별 컬렉션, 기록 1건 = 문서 1개, 점수 하나로 정렬) | `games/hammer/rankings/{board}` (순위표 1개 = 문서 1개, `entries` 배열) |
| 기기 저장 | `localStorage` `updown.*` (scores, theme, skin, lang, sound, vibrate, initials) | `localStorage` `project-hammer:v1` (JSON 한 덩어리) |
| 공통 설정 | 컬러 모드, 스킨, 언어(ko/en), 효과음·진동 | 컬러 모드, 스킨, 언어(ko/en), 사운드 |
| 랭킹 이름 | 영문 대문자 1~5자 | 영문 대문자 A–Z 최대 5자 |

이미 맞춰져 있어 통합이 쉬운 부분:

- **Firebase 프로젝트가 하나**(`joyfield-41b5a`)이고, 게임마다 `games/<게임ID>/` 아래만 씁니다. 통합해도 게임 ID(`updown`, `hammer`)만 그대로 두면 **기존 랭킹이 그대로 이어집니다.**
- **같은 출처(origin)** 입니다. 세 사이트 모두 `https://myong558.github.io` 라서 `localStorage` 를 같이 씁니다. 게임을 `/project-joyfield/games/...` 로 옮겨도 **기기에 남은 최고 기록·설정이 그대로 읽힙니다.** 저장 키 이름도 서로 겹치지 않습니다.
- 두 게임 모두 상대 경로(`./`)로 만들어져 있어 하위 경로로 옮겨도 깨지지 않습니다.
- 랭킹 이름 규칙(영문 대문자 5자)이 같아 한 번 입력한 이름을 게임 간에 공유할 수 있습니다.

---

## 2. 통합 방식 결정

### 검토한 방식

| 방식 | 내용 | 장점 | 단점 |
| --- | --- | --- | --- |
| A. 링크 허브 | 조이필드는 게임 목록만 두고 기존 주소로 이동 | 오늘 바로 가능, 게임 수정 없음 | 앱 설치가 게임마다 따로, 설정 공유 불가, 저장소·배포가 계속 흩어짐 |
| B. 모노레포 + 다중 페이지 | 게임 코드를 조이필드 저장소로 옮겨 한 사이트(`/project-joyfield/games/<id>/`)로 배포 | 앱 하나로 설치·오프라인, 설정·이름 공유, 배포 한 번, 새 게임 추가가 정형화 | 옮기는 작업, 서비스 워커 정리 필요 |
| C. iframe 임베드 | 허브 화면 안에 게임을 iframe 으로 띄움 | 허브 UI 가 늘 보임 | 전체 화면·진동·공유(Web Share)·키보드 초점이 iframe 에서 불안정, 화면 높이 계산이 이중으로 꼬임 |

### 결정: **A로 먼저 열고, B로 완성한다** (C는 쓰지 않음)

- 게임은 **각자 독립된 페이지**로 둡니다. 허브에서 게임으로는 일반 페이지 이동입니다. 게임마다 글꼴·색·CSS 가 달라도 서로 간섭하지 않고, 게임 쪽 코드는 거의 그대로 씁니다.
- 모든 게임이 Vite + TypeScript 로 빌드해 같은 `dist/` 에 모읍니다(업다운도 v1.21.0, 2026-11-05 에 정적 파일에서 옮김). 대화상자·랭킹 창·등록 카드·순위표 저장·결과 이미지·진동·뒤로 가기·허브 메타는 `packages/shared` 공통 모듈(기준서 1.2).
- 앞으로 만들 게임은 조이필드 안에서 바로 시작합니다(9장 "새 게임 추가").

---

## 3. 구조

```
project-joyfield/
├── apps/
│   └── hub/                    조이필드 첫 화면 (Vite + TypeScript)
│       ├── index.html          head(og 태그·컬러 모드 깜빡임 방지·오늘의 톤 고르기)
│       ├── src/
│       │   ├── main.ts         첫 화면(진입 연출·게임 카드), 전체 랭킹·설정 창, 서비스 워커 등록
│       │   ├── skins.ts        오늘의 톤 5개(포도·캔디·소다·레몬·민트), 톤 미리보기(개발자 모드에서만)
│       │   ├── games.ts        games.json 읽기, 게임 아이콘을 허브 빌드에 포함
│       │   ├── settings.ts     공통 설정 읽기·쓰기, 통합 전 설정 옮기기, 컬러 모드
│       │   ├── records.ts      카드의 "내 최고 기록"·내 기록 지우기(게임 메타 joyfield.meta.ts 를 씀)
│       │   ├── meta.ts         games/*/joyfield.meta.ts 를 자동으로 모음
│       │   ├── rankings.ts     전체 랭킹(게임 메타의 ranking, Firestore REST 읽기 전용, 5분 기기 캐시)
│       │   ├── i18n.ts         한국어·영어 문구
│       │   └── fonts/          Jua 서브셋(pnpm font)
│       ├── public/             로고, 앱 아이콘, manifest, og-image
│       └── scripts/            build-icons.mjs(로고 → PNG·og-image)
├── games/
│   ├── updown/                 업다운 (git subtree, Vite + TS, v1.21.0~)
│   └── hammer/                 두더지잡기 (git subtree, vite build → dist/)
├── packages/
│   └── shared/joyfield.js       공통 모듈 window.Joyfield (공통 설정, 랭킹 이름 규칙, 서비스 워커 등록, 게임 캐시 확인·비우기)
├── games.json                  게임 목록(ID, 이름·설명 ko/en, 경로, 아이콘, 색, 공개 여부, 랭킹 순위표)
├── firestore.rules             모든 게임의 보안 규칙 원본 (콘솔에 붙여 넣는 기준 파일)
├── firestore.indexes.json      복합 색인 기록
├── scripts/
│   ├── build.mjs               허브·게임 빌드 → dist/ 에 모으기 → 게임별 files.json → 서비스 워커 생성
│   ├── sw-template.js          서비스 워커 원본(build.mjs 가 허브 파일 목록·버전을 채워 dist/sw.js 로)
│   └── preview.mjs             dist/ 를 /project-joyfield/ 하위 경로로 띄우는 확인용 서버
├── .github/workflows/deploy.yml
├── pnpm-workspace.yaml
└── package.json
```

공통 모듈(`packages/shared/joyfield.js`)은 `window.Joyfield` 전역을 만드는 일반 스크립트이고 허브·모든 게임이 `import '@joyfield/shared'` 로 불러옵니다(타입은 `joyfield.d.ts`). 게임 화면 조각·랭킹·결과 이미지·허브 연결 메타는 TypeScript 로 `@joyfield/shared/ui`·`/rank`·`/capture`·`/meta` 에 있습니다(기준서 1.2). 허브 첫 화면 깜빡임 방지 스크립트 등 그대로 쓰는 파일을 위해 빌드가 `dist/shared/joyfield.js` 사본도 둡니다.

배포 결과(`dist/`)와 주소:

```
dist/                       → https://pocketgamelab.com/joyfield/ (배포 묶음 site/joyfield/, 8장)
├── index.html              조이필드 허브
├── sw.js                   서비스 워커 (사이트 전체에 하나)
├── manifest.webmanifest    조이필드 앱 하나
├── shared/joyfield.js       공통 모듈
└── games/
    ├── updown/index.html   → .../project-joyfield/games/updown/
    └── hammer/index.html   → .../project-joyfield/games/hammer/
```

---

## 4. 핵심 설계

### 4.1 서비스 워커는 사이트에 하나

서비스 워커는 자기 경로 아래 전체를 관리합니다. 조이필드 루트에 하나를 두면 `games/` 아래도 모두 맡게 되므로, **통합 빌드에서는 게임이 자기 서비스 워커를 등록하지 않게** 합니다.

- 업다운: 자기 `sw.js`·`manifest.webmanifest` 를 지우고, `Joyfield.registerSW({ root: '../../', game: 'updown' })` 로 조이필드 서비스 워커를 등록합니다. `<link rel="manifest">` 는 `../../manifest.webmanifest`.
- 두더지잡기: `vite-plugin-pwa` 를 빼고, 빌드 때 루트 manifest 링크를 넣는 작은 Vite 플러그인을 둡니다. 서비스 워커 등록은 업다운과 같습니다.
- 게임은 이제 조이필드 안에서만 배포하므로 "조이필드 안인지" 분기는 두지 않습니다.
- 조이필드 서비스 워커는 `scripts/build.mjs` 가 `scripts/sw-template.js` 로 만듭니다(workbox 없이 직접 작성, 약 150줄). 빌드마다 허브 파일 해시로 버전이 바뀌므로 업다운의 `CACHE_NAME` 수동 증가는 더 이상 필요 없습니다.

**캐시 정책: 허브만 미리, 게임은 처음 열 때**

게임이 늘어도 처음 방문한 사람이 모든 게임을 내려받지 않게 합니다.

| 대상 | 언제 캐시 | 방식 |
| --- | --- | --- |
| 허브(`index.html`, 허브 JS·CSS·글꼴, manifest, 아이콘, `shared/joyfield.js`) | 서비스 워커 설치 때 (precache) | 해시로 버전 관리, 새 배포 시 자동 교체 |
| 게임 파일(`games/<id>/**`) | 그 게임을 **처음 열 때** (runtime caching) | 게임마다 캐시 하나(`joyfield-game-<id>`) |
| Firestore 요청 | 캐시 안 함 | 네트워크만 (랭킹 결과는 게임이 기기에 따로 저장) |
| `og-image.png` | 캐시 안 함 | 링크 미리보기 전용 |

- **처음 열 때 그 게임 전체를 받습니다.** 화면에 처음 쓰인 파일만 캐시하면, 나중에 불러오는 글꼴·효과음·이미지가 빠져 오프라인에서 깨집니다. 그래서 `build.mjs` 가 게임마다 파일 목록 `games/<id>/files.json`(경로 + 해시)을 만들고, 게임 페이지가 처음 열리면 서비스 워커가 이 목록을 모두 그 게임 캐시에 담습니다.
- **요청 처리**
  - 게임 HTML·해시 없는 파일(업다운 `js/`, `css/` 등): 네트워크 먼저. 브라우저 HTTP 캐시도 건너뛰고(`cache: 'no-cache'`, 안 바뀌었으면 304) 3초 안에 응답이 없거나 오프라인이면 캐시(NetworkFirst). 예전 StaleWhileRevalidate 는 고쳐서 배포해도 첫 실행이 늘 옛 버전이었다.
  - 해시가 붙은 파일(두더지잡기 `assets/*`): 캐시 먼저(CacheFirst).
- **게임 갱신**: 새 배포로 `files.json` 해시가 바뀌면, 캐시가 있는 게임만 다음 실행 때 바뀐 파일을 다시 받습니다. 한 번도 안 연 게임은 받지 않습니다.
- **허브 표시**
  - 캐시된 게임 카드에는 "오프라인 가능" 표시를 합니다.
  - 오프라인일 때 캐시가 없는 게임 카드는 흐리게 하고 "인터넷 연결 후 한 번 열어 주세요"라고 안내합니다.
  - 허브는 그 게임 캐시에 `files.json` 이 들어 있는지(= 다 받음)로 판단합니다(`Joyfield.isGameCached`). 서비스 워커가 다 받으면 `game-cached` 메시지로 알려 표시가 바로 바뀝니다.
  - 캐시가 없는 게임을 오프라인으로 열면 서비스 워커가 허브로 돌려보냅니다.
- 설정에 **게임별 저장 공간 비우기**를 둡니다. 게임 캐시만 지우고 기록은 남깁니다.
- 서비스 워커는 `autoUpdate`(새 버전이 있으면 바로 교체)로 둡니다.

### 4.2 공통 설정 (`joyfield.*`)

허브 설정에서 한 번 고르면 모든 게임이 따릅니다.

| 키 | 값 | 비고 |
| --- | --- | --- |
| `joyfield.theme` | `system` / `light` / `dark` | 컬러 모드 |
| `joyfield.lang` | `ko` / `en` | 언어 |
| `joyfield.sound` | `on` / `off` | 효과음 |
| `joyfield.vibrate` | `on` / `off` | 진동 |
| `joyfield.initials` | `A–Z` 1~5자 | 랭킹 이름 (모든 게임에 미리 채움) |

- 게임은 **`joyfield.*` 를 먼저 읽고, 없으면 자기 키**(`updown.theme`, `project-hammer:v1` 안의 설정)를 읽습니다. 그래서 기존 사용자 설정이 사라지지 않습니다.
- 허브를 처음 열면 공통 설정이 비어 있는 항목만 통합 전 게임 설정에서 한 번 옮겨 옵니다(업다운 우선, 다음 두더지잡기).
- 게임 안에서 설정을 바꾸면 `joyfield.*` 에 씁니다(공통 항목만). 업다운은 자기 키에도 같이 씁니다. 스킨은 게임마다 종류가 달라(계절 / 정원·사막·밀림·설산) **게임별로 유지**합니다.
- 두더지잡기의 설정은 "진동"만 있습니다(예전 "흔들림" 설정 값은 진동으로 옮김). 화면 흔들림은 선택 사항이 아니라 늘 켜져 있고, 기기의 "동작 줄이기"가 켜져 있을 때만 뺍니다.
- 최고 기록·도감 같은 게임 데이터는 지금 키 그대로 둡니다. 옮기지 않습니다.
- 다른 탭에서 바꾼 설정은 `storage` 이벤트로 바로 반영합니다.

### 4.3 허브와 게임 사이 이동

- 게임 시작 화면 왼쪽 위(언어 버튼 왼쪽)에 **조이필드 게임 목록** 버튼(네 칸 아이콘, 링크 `../../`)을 둡니다. 게임마다 자기 버튼 모양에 맞춰 직접 넣었습니다.
- 게임에서 뒤로 가기로 허브에 돌아오면(bfcache) 최고 기록·오프라인 표시를 다시 읽습니다.
- (보류) 카드가 커지며 넘어가는 전환 애니메이션(View Transitions API).

### 4.4 랭킹 (Firebase)

- Firebase 프로젝트 `joyfield-41b5a`(운영) 하나를 모든 게임이 같이 쓰고, 게임 ID 는 **그대로**입니다.
- 조이팩 시절 옛 프로젝트 `joypack-c6bd2` 는 2026-11-04 이름을 바꿀 때 `joyfield-41b5a` 로 옮기며 쓰지 않게 됐고(기록은 새로 시작), 2026-11-05 콘솔에서 삭제했습니다(사용자 결정). 코드에서 다시 쓰지 않습니다.
- **개발용 DB `joyfield-dev`**(2026-11-04, 무료 Spark): 내 PC·같은 와이파이 주소(`localhost`, `127.0.0.1`, `192.168.x` 등 사설 주소 — `pnpm dev`·`pnpm preview`)와 개발 사이트(`dev.pocketgamelab.com`, Pages 브랜치·미리보기 주소)에서 열면 개발 DB, 운영 사이트(`pocketgamelab.com`)에서 열면 운영 DB 에 씁니다. 개발 중 테스트 점수가 실제 랭킹에 섞이지 않습니다. 설정은 `packages/shared/joyfield.js` 의 `FIREBASE` 한 곳(허브·모든 게임이 `Joyfield.FIREBASE` 를 씀). 로컬에서 운영 DB 를 봐야 하면 개발자 도구에서 `localStorage.setItem('joyfield.db', 'prod')`(되돌리기 `removeItem`).
- **규칙은 두 프로젝트에 똑같이 게시**합니다(`firestore.rules` 를 운영·개발 콘솔 각각에 붙여 넣기). 한쪽만 게시하면 그쪽만 새 규칙으로 동작합니다.
- 각 게임의 랭킹 코드는 처음에는 손대지 않습니다(업다운 REST, 두더지잡기 SDK). 두 방식 모두 잘 돌고 있고, 억지로 합치면 위험만 커집니다.
- 보안 규칙은 지금 콘솔에만 있으므로 **`firestore.rules` 파일 하나로 모아 저장소에서 관리**합니다. 게임을 추가할 때 이 파일에 블록을 더하고 콘솔에 붙여 넣습니다(Firebase CLI `firebase deploy --only firestore:rules` 로 바꿀 수도 있음).
- 허브에 **전체 랭킹** 화면: 게임별 1위를 한 화면에 보여 주고 "TOP 10 보기"로 그 자리에서 10위까지 펼칩니다(허브 v1.17.1부터, 이전엔 TOP 3)(순위표는 칩으로 고름: 업다운 범위 1~50·1~100·1~200, 두더지잡기 클래식·오늘의 챌린지).
  - 읽기 횟수를 아끼려고 허브에 들어올 때가 아니라 그 화면을 열 때, 보고 있는 순위표만 읽습니다.
  - 불러온 순위는 기기(`joyfield.rankingCache`)에 남겨 두고 5분 안에 다시 열면 서버를 부르지 않습니다. 오프라인·실패 때는 마지막 순위를 보여 줍니다.
  - 허브는 SDK 없이 REST 로 읽기만 합니다(등록은 각 게임). 업다운 조회는 게임과 같은 정렬(범위별 컬렉션의 점수 내림차순)이라 복합 색인이 필요 없습니다.
- 무료 한도(하루 읽기 5만·쓰기 2만)는 모든 게임이 나눠 씁니다. 게임이 늘면 한도 사용량을 콘솔에서 주기적으로 확인합니다.
- API 키에 HTTP 리퍼러 제한을 걸어 두었다면 `pocketgamelab.com/*`·`dev.pocketgamelab.com/*` 를 추가합니다(Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보). 로그인(Firebase Auth)을 쓰지 않아 Firebase 의 허용 도메인 설정은 필요 없습니다.

### 4.5 게임 목록 메타 (`games.json`)

허브 화면(카드·설정), 전체 랭킹, 빌드(`build.mjs` 가 배포할 게임 목록으로 씀)가 모두 이 파일 하나를 봅니다.

```json
{
  "id": "updown",
  "name": { "ko": "업다운", "en": "Up Down" },
  "desc": { "ko": "UP · DOWN 힌트로 숨은 숫자 맞히기", "en": "Find the hidden number with UP/DOWN hints" },
  "path": "games/updown/",
  "icon": "games/updown/public/images/icon.svg",
  "color": "#0f66ff",
  "status": "live",
  "added": "2026-10-21",
  "ranking": {
    "path": "games/updown/rankings",
    "default": "100",
    "boards": [{ "id": "50", "name": { "ko": "1~50", "en": "1~50" } }, "…"]
  }
}
```

- `icon` 은 저장소 루트 기준 경로이고, 허브 빌드에 함께 들어가 오프라인에서도 보입니다.
- 버전은 여기 적지 않고 각 게임 `package.json` 의 `version` 을 빌드 때 읽습니다(중복 방지).
- `added` 는 조이필드에 추가한 날(YYYY-MM-DD)입니다. 허브는 이 날짜가 늦은 게임부터 보이고(같은 날이면 파일에서 뒤에 적힌 게임이 앞), 개발자 모드에서 보이는 테스트 중(공개 전·공개 예약 중) 게임은 그보다 앞에 파일에서 뒤에 적힌 게임부터 놓습니다(새로 더한 게임이 늘 첫 칸, 허브 v1.33.11). 공개한 게임마다 공개한 날부터 7일 동안 NEW 를 붙입니다(새 게임이 나와도 앞 게임의 NEW 는 그대로, 허브 v1.32.0부터. 업다운은 조이필드에 옮겨 오기 전 첫 공개일 2026-10-16. `apps/hub/src/games.ts`).
- `status` 가 `soon` 이면 카드로 보이지 않고 배포에서도 빠지며, 게임 목록 아래 "다음 게임" 띠에 이름만 나옵니다. `soon` 인 게임이 없으면 띠에 "다음 미니 게임을 만들고 있어요"가 보입니다.
- `open`(선택)은 공개 예약 시각(ISO, `+09:00`)입니다. `status: "preview"` 와 함께 쓰면 그 전까지 누를 수 없는 COMING SOON 카드, 그 시각부터 모두에게 정식 카드로 보입니다(`pnpm release <id> --at`).
- `status` 가 `preview` 면 배포는 하지만 허브에는 `soon` 처럼 보입니다(운영 사이트의 "다음 게임" 띠에는 이름 없이 "다음 미니 게임을 만들고 있어요"). 개발자 모드(개발 사이트·내 PC 주소에서는 늘 켜짐, 운영에서는 켤 수 없음)에서만 `TEST` 표시 카드로 보입니다(휴대폰 확인은 개발 사이트에서, 기준서 7.3). 허브 랭킹 창에도 개발자 모드에서만 그 게임 탭이 보입니다.
- 허브 카드의 "내 최고 기록"·내 기록 지우기·전체 랭킹 조회는 게임마다 저장 형식이 달라, 각 게임이 `games/<id>/joyfield.meta.ts`(허브 연결 메타, `@joyfield/shared/meta`)에 읽는 방법을 두고 허브가 자동으로 모읍니다(허브 v1.41.0~).

---

## 5. 기존 주소와 설치한 앱 처리

처음에는 `project-updown`, `project-hammer` 에 이사 안내 버전을 올리고 Archive 할 계획이었으나, 옛 주소 사용자가 거의 없어 안내 없이 **두 저장소를 삭제**했습니다(2026-11-05 사용자 결정, 옛 `project-joyfield` github.io 주소를 끈 것과 같은 판단). 옛 주소 `myong558.github.io/project-updown/`·`/project-hammer/` 는 열리지 않습니다. 다시 안내 페이지나 넘김 페이지를 만들지 않습니다.

---

## 6. 단계별 계획

통합(0~4단계)은 2026-10-21 ~ 2026-11-05 에 끝났습니다. 1단계(링크 허브)는 건너뛰고, 2단계에서 두 게임을 `git subtree add` 로 `games/updown`·`games/hammer` 에 이력째 옮겼으며(원본 저장소는 2026-11-05 삭제, 5장), 3단계에서 공통 설정·전체 랭킹·서비스 워커·허브 꾸미기를 했습니다. 끝난 항목별 기록(허브·게임 버전마다 무엇을 왜 바꿨는지)은 지웠으니 필요하면 `git log`(예: `git log --grep "허브 v1.5"`)나 이 줄을 고친 커밋 전의 README 를 봅니다. 지금 동작의 기준은 코드와 [기준서](docs/GAME_PLAYBOOK.md)입니다.

### 남은 일
- [ ] `firestore.rules` 의 두더지잡기 블록을 콘솔에 게시된 규칙과 대조(README 설명으로 다시 쓴 것이라 실제와 다를 수 있음)
- [ ] 실제 휴대폰(안드로이드·아이폰)에서 설치·오프라인·효과음 확인

### 5단계 — 이후
- [ ] 새 게임 템플릿(`games/_template`) 정리
- [ ] 허브 꾸미기: 최근 플레이한 게임 먼저 (새 게임 먼저·NEW 배지는 허브 v1.8.0 에서 함)
- [ ] (선택) 랭킹 클라이언트 공통화 — 새 게임부터 공통 모듈을 쓰고, 기존 게임은 필요할 때만 옮김

---

## 7. 개발

새 PC에서 처음 받을 때:

- **Node 24.12 이상**(LTS, `package.json` engines — Firebase 13 이 요구). 낮으면 `pnpm install` 이 멈춘다. Node 를 바꾼 뒤에는 `pnpm install --force` 로 다시 설치한다.
- **pnpm 12.8.1**(`packageManager`). `corepack enable`, 권한이 없거나 corepack 이 오래돼 안 되면 `npm i -g pnpm@12.8.1`.
- **git**: `git clone https://github.com/myong558/project-joyfield.git` 뒤 이 저장소에서만 작성자를 다른 PC와 같게 `git config user.name "명범수(S025547)"`·`git config user.email myong558@naver.com`. 첫 `git push` 때 뜨는 GitHub 로그인 창(Git Credential Manager)으로 로그인한다.
- **저장소 이름을 바꾸기 전(2026-11-04, 옛 이름 `project-joypack`)에 받아 둔 PC**: `git pull` 뒤 `pnpm setup:rename` 한 번이면 된다(`--dry` 는 할 일만 보여 줌). 원격 주소를 `https://github.com/myong558/project-joyfield.git` 로 바꾸고, 폴더 이름을 `project-joyfield` 로 바꾼 뒤 그 폴더에서 `pnpm install`·`pnpm setup:claude`(Claude 메모리는 폴더 경로마다 따로라 새 경로에 다시 깐다)를 한다. Windows 에서는 VS Code 가 폴더를 잡고 있으므로 따로 PowerShell 창이 떠서 VS Code 를 모두 닫을 때까지 기다렸다가 이어서 하고 VS Code 를 다시 연다. VS Code 위 가운데 제목은 폴더 이름이라 이렇게 해야 바뀐다. 홈 화면에 옛 주소로 설치한 앱은 새 주소에서 다시 설치한다.
- `pnpm install` 뒤 `pnpm test`·`pnpm build` 가 통과하는지 먼저 본다(rolldown 바이너리가 빠졌다는 오류면 `pnpm install --force`).
- `pnpm setup:claude` — Claude Code 개인 설정(전역 지침·압축 뒤 한국어 훅·답변 언어)과 이 저장소 작업 메모리(`setup/claude/memory`)를 이 PC에 깐다(열린 세션은 다시 시작). 이 PC에서 메모리·설정이 늘었으면 `pnpm setup:claude --save` 뒤 커밋해 다른 PC로 넘긴다.
- `pnpm check:screens` 는 Chrome 으로 찍는다. 없으면 Windows 기본 Edge 를 쓰고, 둘 다 다른 곳에 있으면 `CHROME` 환경 변수에 실행 파일 경로를 넣는다.
- 줄바꿈은 `.gitattributes`(`* text=auto`)로 저장소에 LF 로 둔다. PC마다 `core.autocrlf` 가 달라도 괜찮다.

```bash
pnpm install
pnpm dev                 # 허브 개발 서버 http://localhost:5170/ (업다운도 같은 서버에서 /games/updown/)
pnpm --filter hammer dev # 두더지잡기만 개발 http://localhost:5173/
pnpm test                # 모든 게임 테스트
pnpm build               # 허브 + 모든 게임 → dist/ (pnpm build hammer: 허브와 그 게임만 다시 빌드)
pnpm preview             # dist/ 를 http://localhost:4170/joyfield/ 로 띄워 확인(서비스 워커 포함, 개발 DB)
pnpm check:screens hammer quick # 대표 4크기로 모든 화면을 찍어 잘림 점검(빠름). 14크기 전체는 quick 대신 all(기준서 7.1, 먼저 build)
pnpm font                # 허브·업다운 웹폰트 서브셋 다시 만들기(화면 문구를 바꾼 뒤)
pnpm release hammer      # 개발자 모드 게임 정식 공개. --at "2026-11-01 10:00" 공개 예약, --cancel 예약 취소(기준서 7.4)
pnpm --filter hub icons  # 로고(apps/hub/public/logo.svg)를 바꾼 뒤 앱 아이콘·og-image 다시 만들기
```

- `pnpm dev` 에서 두더지잡기 카드는 `pnpm --filter hammer build` 로 먼저 빌드해 두면 이어서 열립니다.
- 서비스 워커는 HTTPS 또는 `localhost` 에서만 동작합니다. 개발 서버(`pnpm dev`)에는 서비스 워커가 없으니 오프라인 확인은 `pnpm preview` 로 합니다.
- 실제 배포 경로(`/project-joyfield/`)와 같은 하위 경로로 미리 보기 해야 경로 문제가 일찍 드러납니다. 모든 경로는 상대 경로로 씁니다.

---

## 8. 배포

- **호스팅: Cloudflare Pages**(2026-11 GitHub Pages 에서 옮김, 프로젝트 이름 `pocketgamelab`). GitHub Actions(`.github/workflows/deploy.yml`)가 테스트 → `pnpm build` → `pnpm site` → `wrangler pages deploy` 를 합니다. 저장소 비밀값 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID` 가 필요합니다.
  | 브랜치 | 주소 | 랭킹 DB |
  | --- | --- | --- |
  | `main` | `https://pocketgamelab.com/joyfield/` | 운영 `joyfield-41b5a` |
  | `dev` | `https://dev.pocketgamelab.com/joyfield/` (검색 차단, 홈 화면 앱 이름 "조이필드 개발": 빌드 때 `JOYFIELD_SITE=dev`) | 개발 `joyfield-dev` |
  | (내 PC) | `pnpm dev`·`pnpm preview` → `http://localhost:4170/joyfield/` | 개발 `joyfield-dev` |
- 운영 빌드(2026-11-05): `main` 은 `JOYFIELD_SITE=prod` 로 빌드합니다. 공개 예약 없는 미리보기 게임과 효과음 견본 페이지(`/sounds/`)를 넣지 않고, 개발자 모드를 끄고 랭킹을 운영 DB 로 고정합니다(기준서 7.3). `dev`·내 PC 빌드는 지금처럼 모두 넣습니다.
- 흐름(2026-11-05 결정, 개발 먼저): 작업은 `dev` 브랜치에서 하고 푸시는 `dev` 에만 → 개발 사이트에서 확인 → "운영 반영"을 요청할 때만 `dev` 를 `main` 에 합쳐 푸시 → 운영(새 게임은 숨김 미리보기로 마지막 확인 → 정식 공개).
- `pnpm site`(`scripts/site.mjs`)가 `dist/` 를 `site/joyfield/` 로 넣고 `_redirects`(첫 화면 `/` → `/joyfield/` 302, 스튜디오 소개를 만들 때까지)·`_headers`(`sw.js` no-cache, 개발 주소 noindex)·`robots.txt` 를 만듭니다. 도메인 최상위는 스튜디오(Pocket Game Lab) 자리라 나중에 소개·개인정보처리방침·스토어 앱 연결(`/.well-known/assetlinks.json`)을 둡니다.
- **옛 주소** `https://myong558.github.io/project-joyfield/`: 쓰지 않습니다. 2026-11-05 잠시 "새 주소로 옮겼어요" 안내 페이지를 두었다가, 옛 주소 사용자가 거의 없어 안내 페이지(`moved.yml`·`scripts/moved-site.mjs`)를 지우고 GitHub Pages 를 껐습니다(사용자 결정). 공유 링크·문서에는 새 주소만 씁니다.
- 서비스 워커와 게임별 `files.json` 은 빌드할 때마다 새로 만들어지므로 수동으로 캐시 버전을 올릴 필요가 없습니다.
- 게임별 버전은 각 게임 `package.json` 의 `version` 을 쓰고, 그 게임 설정 화면 맨 아래에 `vX.Y.Z` 로 표시합니다. 조이필드 전체 버전은 루트 `package.json` 이고 조이필드 설정 창 맨 아래와 첫 화면 맨 아래에 보입니다(게임별 버전은 나열하지 않음).

### 8.1 사용 저작물과 라이선스 (상업 이용 점검표)

조이필드는 상업적으로 씁니다(광고, 구글 플레이·앱스토어). 그래서 쓰는 저작물마다 **상업 이용이 되는지**를 이 표에 남깁니다(기준서 10.1). 화면에는 글꼴 이름을 표시하지 않고, 글꼴 파일과 함께 라이선스 파일을 배포합니다(OFL 1.1 은 화면 표기를 요구하지 않고, 글꼴을 배포할 때 저작권 표시·라이선스 전문을 함께 두도록 요구함).

| 저작물 | 쓰는 곳 | 출처·라이선스 | 상업 이용 | 함께 배포하는 파일 |
| --- | --- | --- | --- | --- |
| Jua 글꼴 | 허브·업다운·두더지잡기(전체), 온실정원(화면 전체, 긴 설명 글만 Gowun Dodum), 타임 투 플립(위 메뉴 언어 단추) | SIL OFL 1.1(Reserved Font Name 없음 → 서브셋 허용) | 가능(글꼴만 따로 팔기는 불가) | 허브 `fonts/LICENSE-Jua.txt`(apps/hub/public), 업다운 `games/updown/fonts/LICENSE-Jua.txt`, 두더지잡기 `fonts/LICENSE-Jua.txt`, 타임 투 플립 `fonts/LICENSE-Jua.txt`, 온실정원 `fonts/LICENSE-Jua.txt` |
| Gothic A1 글꼴(Bold, 기호 채움) | 허브·업다운·두더지잡기: Jua 에 없는 기호(… → © ① ※ ℃ 등 86자, 약 8 KB)만 | SIL OFL 1.1(© HanYang I&C, Reserved Font Name 없음 → 서브셋 허용), Google Fonts 저장소 원본 | 가능(글꼴만 따로 팔기는 불가) | 허브 `fonts/LICENSE-GothicA1.txt`(apps/hub/public), 업다운 `games/updown/fonts/LICENSE-GothicA1.txt`, 두더지잡기 `fonts/LICENSE-GothicA1.txt` |
| Do Hyeon 글꼴 | 타임 투 플립(본문·숫자) | SIL OFL 1.1(Reserved Font Name 없음 → 서브셋 허용), Google Fonts 저장소 원본 | 가능(글꼴만 따로 팔기는 불가) | 타임 투 플립 `fonts/LICENSE-DoHyeon.txt`(games/timetoflip/public/fonts) |
| 명화 카드 그림 32장 | 타임 투 플립(3판부터 나오는 카드 앞면) | 메트로폴리탄·시카고 미술관 Open Access(CC0 1.0), 암스테르담 국립미술관(Public Domain Mark 1.0), 국립중앙박물관(공공누리 제1유형: 출처 표시). 작품 번호·출처 `games/timetoflip/art-src/meta.json` | 가능(수정·상업 이용 자유. 공공누리 1유형 5점은 출처 표시 의무 → 도감 작가 줄 "국립중앙박물관" + 배포 파일) | 타임 투 플립 `art-credits.txt`(games/timetoflip/public, `art-src/credits.mjs` 로 만듦) |
| Gowun Batang 글꼴(Bold) | 지금 쓰는 곳 없음(온실정원 v0.6.0 에서 Jua 로 바꿈, 목록에는 남김) | SIL OFL 1.1(© The Gowun Batang Project Authors, Reserved Font Name 없음 → 서브셋 허용), Google Fonts 저장소 원본 | 가능(글꼴만 따로 팔기는 불가) | 없음 |
| Gowun Dodum 글꼴 | 온실정원(긴 설명 글) | SIL OFL 1.1(© The Gowun Dodum Project Authors, Reserved Font Name 없음 → 서브셋 허용), Google Fonts 저장소 원본 | 가능(글꼴만 따로 팔기는 불가) | 온실정원 `fonts/LICENSE-GowunDodum.txt`(games/glasshouse/public/fonts) |
| Dongle 글꼴(Bold) | 타임 투 플립(제목·팝업) | SIL OFL 1.1(© The Dongle Project Authors, Reserved Font Name 없음 → 서브셋 허용), Google Fonts 저장소 원본 | 가능(글꼴만 따로 팔기는 불가) | 타임 투 플립 `fonts/LICENSE-Dongle.txt`(games/timetoflip/public/fonts) |
| 아이콘·로고·캐릭터·배경 그림 | 허브·모든 게임 | 직접 제작(코드로 그린 SVG·CSS·캔버스, 그 PNG 사본) | 가능(자체 저작물) | 없음 |
| 효과음·진동 | 모든 게임 | 직접 제작(Web Audio 로 그 자리에서 합성, 소리 파일 없음) | 가능(자체 저작물) | 없음 |
| 이모지(업다운 온도 힌트 🔥☀️🌊❄️) | 업다운 | 글자로만 쓰고 그림은 기기 글꼴이 그림(파일 포함 안 함) | 가능 | 없음 |
| 외부 라이브러리 | 허브·두더지잡기·타임 투 플립·온실정원 빌드 | Vite·TypeScript 등 개발 도구(MIT 등). 배포 파일에 들어가는 실행 라이브러리는 두더지잡기·타임 투 플립·온실정원의 Firebase JS SDK(Apache-2.0, 랭킹)·html-to-image(MIT, 결과 이미지) | 가능 | 없음 |

새 게임이 글꼴·소리·그림 등 남의 저작물을 쓰면 이 표에 한 줄 더하고, 그 라이선스 파일이 `dist` 에 들어가는지 확인합니다(기준서 6장 9번·10.1).

### 8.2 저작권

- 표기: `© 2026 Myong Bum Soo. All rights reserved.` — 공통 모듈 `Joyfield.COPYRIGHT` 한 곳에 두고, 조이필드·각 게임 설정 맨 아래 버전 밑에 보입니다.
- 루트 `LICENSE`: 저작권 표기와 제3자 저작물(글꼴) 목록. 모든 `package.json` 에 `"author": "Myong Bum Soo"`, `"license": "UNLICENSED"`(공개 라이선스 없음).
- 글꼴 등 제3자 저작물은 위 "All rights reserved" 에 포함되지 않고 각자의 라이선스를 따릅니다(8.1).

### 8.3 상업 배포·마켓 등록 준비 (기준서 10장)

지금 상태 점검(2026-10-23):

| 항목 | 상태 |
| --- | --- |
| 저작물 | 그림·소리는 모두 직접 제작, 글꼴 4종(Jua·Do Hyeon·Dongle·Gowun Dodum, 모두 OFL. 목록 `fonts/catalog.json`)은 상업 이용 가능(8.1). 외부 CDN 없음 |
| 랭킹 이름(사용자 글) | 영문 대문자 1~5자, 금지어 필터 `Joyfield.isAllowedName`(허브 v1.21.2 · 업다운 v1.13.0 · 두더지잡기 v0.14.0), 서버 규칙 `allowedName` 으로 한 번 더 검사 |
| 서버에 저장하는 개인정보 | 랭킹 이니셜·점수·시각, 플레이 입력 종류(모바일·PC 두 값)뿐(로그인·이메일·기기 ID·위치 없음). 나머지는 기기 `localStorage` |
| 내용 등급 | 전체 이용가 목표(만화 같은 두더지 때리기 수준), 도박처럼 보이는 요소 없음 |

**출시 전에 사람이 정할 것 / 할 것**

1. ~~**두더지잡기 영어 이름**~~ — 완료(허브 v1.21.4 · 두더지잡기 v0.14.2): 등록 상표 "Whac-A-Mole"과 거의 같던 "Whack-a-Mole"을 "Mole Bonk"로 바꿨다가, 같은 이름·비슷한 방식의 웹 게임(visu.network "Mole Bonk")이 있어 **"Peekaboo Moles"** 로 다시 바꿨습니다. 웹 검색(2026-10-23): 같은 이름의 게임·상표는 찾지 못함(피한 이름: "Molehill ○○"은 Whac-a-Mole Molehill Mania 제품, "Mole Pop"은 iOS Pop Mole, "Mole Mash"는 같은 이름 다수). 출시 전에 KIPRIS·USPTO 상표 검색을 한 번 더 합니다. 한국어 이름 "두더지잡기"는 놀이를 가리키는 일반 명칭이라 그대로 씁니다("까꿍 두더지"로 바꿨다가 v0.15.2에서 되돌림).
   - 상표 검색(2026-10-23, KIPRIS·USPTO 웹 검색): "PEEKABOO MOLES" 그대로는 한국·미국 모두 없음. 다만 "PEEKABOO"는 흔한 낱말이라 이미 많이 등록돼 있음 — 미국 살아 있는 34건(9류 컴퓨터 하드웨어·음원, 28류 카드게임 소품 등, 게임 소프트웨어는 못 봄), 한국 222건 중 53건 확인(28류 장난감 "피카부(PEEKABOO)" 등록, 9류 "PEEKABOO MONSTER" 등록, 9류 "피카부랩스" 출원 중). 일부만 확인했으므로 출시 전 변리사 확인 권장.
2. **앱 이름 "조이필드/Joyfield" 상표**: 마켓 등록 직전에 한국 KIPRIS(9·41류)·미국 USPTO·구글 플레이·앱스토어 이름 검색을 한 번 더 하고, 가능하면 변리사 확인을 받습니다.
   - 상표 검색(2026-11-04, 웹 검색): USPTO "JOYFIELD" 2건 — 97404331(Bluebird Aspen, 16·20·35류, 소멸), 98905375(Hong Kong Joyfield Biological Technology, 5류 의약품, 등록). 게임·소프트웨어(9·41류)는 못 찾음. 웹·마켓에서 "조이필드" 게임 앱도 못 찾음. 마켓 등록 직전에 KIPRIS(9·41류)·USPTO·구글 플레이·앱스토어 이름 검색을 한 번 더 하고, 가능하면 변리사 확인을 받습니다.
3. **개인정보 처리방침 페이지**: 마켓 등록에 공개 URL 이 필요합니다. 최상위 도메인 페이지(스튜디오 소개)와 함께 **앱 완성 뒤 만듭니다**(2026-11-05 사용자 결정, 앱 등록 직전에 Claude 가 알림). 초안 `docs/drafts/privacy-policy.html`(한국어·영어, 지금 저장 항목 기준, 2026-11-05 작성)을 고쳐 `pocketgamelab.com/privacy/` 에 올리고 허브 설정 맨 아래에 링크합니다. 쓰기 전에 Firestore 위치(콘솔)와 구글 플레이·애플 최신 요구 사항을 다시 확인합니다.
4. **지원 연락처**: `contact@pocketgamelab.com`(2026-11-05 결정, 2026-11-05 Cloudflare 이메일 라우팅으로 개인 Gmail 에 전달하도록 연결함, 받기 전용). 개인정보 보호책임자는 실명(명범수) + Pocket Game Lab. 마켓 등록 정보·개인정보 처리방침에 넣고, 랭킹 이름 신고 등을 받습니다.
5. **마켓 포장**: 구글 플레이는 TWA(Bubblewrap) + `assetlinks.json`, 애플은 Capacitor 로 감싸고 앱다운 기능을 함께(웹 감싸기만은 심사 지침 4.2 거절 위험).
6. **광고를 붙일 때**: 광고 자리(기준서 10.7, PC 는 옆 여백), 동의 창(UMP)·iOS 추적 허가(ATT), 데이터 보안 양식·개인정보 라벨 갱신.
7. **플레이 스토어 최초 공개 직전 랭킹 초기화**(2026-11-04 결정): 테스트 점수를 지우고 새로 시작합니다(기기 아이콘 `dev` 가 없는 예전 기록도 함께 정리). 규칙상 앱에서는 못 지우므로 Firebase 콘솔에서 사람이 지웁니다: `games/updown/rankings/*`(v1.21.0~, 옛 `scores-50`·`100`·`200` 은 규칙을 지워 막혔고 남은 문서는 함께 지움), `games/hammer/rankings/*`, `games/timetoflip/rankings/*`, `games/glasshouse/rankings/*`(그 뒤 생긴 게임은 `firestore.rules` 목차로 확인). Claude 는 출시 작업 때 이 일을 먼저 요청합니다(메모리 `ranking-reset-at-store-launch`).

---

## 9. 새 게임 추가 체크리스트

> 새 게임은 **[docs/GAME_PLAYBOOK.md](docs/GAME_PLAYBOOK.md)(미니 게임 제작 기준서)** 를 따릅니다. 게임 이름과 간단한 설명만으로 만들 수 있도록 공통 틀(설정·공유·랭킹·손맛·오프라인)과 게임에 맞게 고르는 정체성(톤·색·글꼴·캐릭터·스킨, 기존 게임과 전체 인상만 너무 같지 않게) 기준, 조이필드 연결 체크리스트, 공통 요소 현황표가 있습니다. 게임을 추가할 때마다 모든 게임을 다시 비교해 그 문서를 갱신합니다. 아래는 요약입니다.

1. `games/<id>/` 만들기(템플릿 복사). 게임 ID 는 영문 소문자, 한 번 정하면 바꾸지 않습니다(랭킹 경로·저장 키에 쓰임).
2. 게임 로직은 DOM 과 분리하고 Vitest 로 테스트합니다.
3. 기기 저장 키는 `<id>.` 로 시작합니다. 공통 설정은 `Joyfield.get('theme')` 처럼 공통 모듈로 읽고 씁니다.
4. 상대 경로만 쓰고, 자기 서비스 워커·manifest 는 만들지 않습니다. 대신 `Joyfield.registerSW({ root: '../../', game: '<id>' })` 를 부르고, manifest 는 `../../manifest.webmanifest` 를 가리킵니다. 게임은 `package.json` 에 `build` 스크립트(결과는 `dist/`)를 둡니다(빌드 없는 게임은 `"files"` 에 배포할 파일을 적는 길도 빌드 스크립트에 남아 있지만 지금은 쓰는 게임이 없음). 오프라인에 필요한 파일은 모두 `games/<id>/` 안에 둡니다. 그래야 `files.json` 에 들어가 처음 열 때 함께 캐시됩니다.
5. 랭킹이 있으면 `games/<id>/` 아래에만 쓰고, `firestore.rules` 에 블록 추가 → 콘솔 게시, 필요한 복합 색인 추가.
6. `games.json` 에 항목 추가(처음엔 `status: "soon"`, 완성되면 `"live"`). 허브 카드에 최고 기록·전체 랭킹을 보이려면 `games/<id>/joyfield.meta.ts` 를 만들고(허브 코드는 고치지 않음), 게임 이름이 바뀌었으면 `pnpm font`.
7. 시작 화면 왼쪽 위에 조이필드 게임 목록 버튼(`../../`)을 둡니다.
8. 한국어·영어 문구, 라이트·다크, 동작 줄이기 설정, 휴대폰 세로·PC 화면 확인.
9. 링크 미리보기 이미지(1200×630) 준비. 게임 `index.html` 의 og:url·og:image 는 `https://pocketgamelab.com/joyfield/games/<id>/` 기준.

---

## 10. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 옛 서비스 워커가 옛 파일을 계속 내줌 | 기존 사이트 마지막 버전에서 캐시 삭제 + 자체 해제(5장) |
| 조이필드 서비스 워커와 게임 서비스 워커 충돌 | 통합 빌드에서 게임 서비스 워커 등록 제거(4.1) |
| 게임이 늘수록 첫 방문 다운로드가 커짐 | 허브만 precache, 게임은 처음 열 때 캐시(4.1) |
| 처음 연 게임에서 늦게 불러오는 파일이 캐시에서 빠져 오프라인에서 깨짐 | `files.json` 으로 게임 전체를 한 번에 캐시(4.1) |
| 하위 경로 이동으로 파일 경로 깨짐 | 상대 경로 원칙 유지, 하위 경로 미리 보기로 확인 |
| 기존 기록·설정 유실 | 같은 출처라 그대로 유지됨. 저장 키는 바꾸지 않고, 공통 설정은 "새 키 먼저, 없으면 옛 키" |
| 기존 랭킹 유실 | 게임 ID·Firestore 경로 변경 금지 |
| 게임이 늘며 Firestore 무료 한도 초과 | 랭킹은 열 때만 읽기, 마지막 결과 기기 저장, 콘솔 사용량 확인 |
| 보안 규칙이 콘솔에만 있어 덮어쓰기 실수 | `firestore.rules` 를 원본으로 저장소에서 관리 |
| 통합 저장소 빌드 시간 증가 | 게임별 `--filter` 빌드, CI 에서 pnpm 캐시 |
