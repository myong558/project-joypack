---
name: studio-domain-pocketgamelab
description: "게임 스튜디오 이름·도메인을 Pocket Game Lab(pocketgamelab.com/.kr/.co.kr)으로 정함, 구매 뒤 다른 PC에서 연결·조이필드 주소 이전을 이어 감"
metadata:
  node_type: memory
  type: project
  originSessionId: 52d9cf93-5348-4c30-b05a-6553a8fd0050
  modified: 2026-11-04T15:48:24.861Z
---

2026-11-04 사용자가 게임 스튜디오 이름을 **Pocket Game Lab(포켓게임랩)** 으로 정하고, `pocketgamelab.com`·`.kr`·`.co.kr` 세 주소를 아이티이지(iteasy.co.kr)에서 한꺼번에 사기로 함(소문자 그대로, 하이픈 주소는 안 삼). `.kr`·`.co.kr`은 `.com`으로 301 연결.

- 확인한 것: 세 주소 WHOIS 모두 미등록(2026-11-04 17:33), KIPRIS 에서 사용자가 "포켓게임랩", "pocketgamelab", "포켓 게임 랩", "pocket game lab" 검색 → 없음. 웹에는 비슷한 이름 Pocket PlayLab(방콕 모바일 게임사)·Pocket Card Game Lab(인도)만 있음.
- 남은 것: 해외 상표(WIPO Global Brand Database) 확인, 구글 플레이 개발자 이름 확보, 상표 출원은 이름만으로는 식별력 약해 로고와 함께 권장.

**다음 일정(다른 PC에서 진행, 사용자 요청):** 세션 첫 답변에서 먼저 꺼내 알린다.
0. 이름 바뀐 것 반영 먼저: 그 PC 폴더·`git remote -v` 가 옛 이름(`project-joypack`)이면 [[other-pc-folder-rename]] 대로 `pnpm setup:rename` 을 먼저 알리고 진행, 새 세션에서 1번부터 잇는다.
1. 구매 확인: **2026-11-04 사용자가 세 주소 구매 완료라고 알림.** 구매 화면은 네임서버 기본값, 포워딩·파킹·자동연결·잠금 미신청으로 안내함(잠금은 네임서버 변경 뒤 켜기). 등록인 본인 이름·자동 연장은 사용자 확인 필요.
2. Cloudflare(무료)에 세 주소 추가 → 아이티이지에서 네임서버를 Cloudflare 것으로 변경 → Redirect Rules 로 `.kr`·`.co.kr` → `https://pocketgamelab.com` 301. (2026-11-04 사용자에게 단계별 안내함. 그 뒤 사용자가 "한 번 하고 잊고 싶다, 사이트를 까먹을 것 같다"며 Cloudflare가 꼭 필요하냐고 물음 → 관리할 곳을 아이티이지 한 곳으로 줄이는 안(아이티이지 포워딩, .com DNS도 아이티이지)을 권함. 그래도 사용자가 Cloudflare 가입을 마치고 이어서 진행하기로 함(Cloudflare 방식 확정). 가입 이메일이 `gmil.co…` 오타로 보여 고치라고 알림. `.com` Cloudflare 네임서버: `doug.ns.cloudflare.com`, `gail.ns.cloudflare.com`(옛 `ns1/ns2.ksdom.kr` 삭제). `.com` 아이티이지 파킹 A 레코드(222.234.220.139) 2줄은 지우라고 안내함. 2026-11-04 아이티이지에서 `.com` 네임서버 변경 완료, 1.1.1.1·8.8.8.8 에서 doug/gail 확인됨. Cloudflare 에 `.kr`(네임서버 doug/gail)·`.co.kr`(네임서버 `cesar.ns.cloudflare.com`/`sreeni.ns.cloudflare.com`, 다름) 추가함. 2026-11-04 아이티이지에서 두 주소 네임서버 변경완료(인증코드는 도메인 하나씩 따로 받아야 했음). 직후 공개 DNS 조회는 SERVFAIL(.kr 레지스트리 반영 대기), Cloudflare 쪽은 응답함. 같은 날 두 주소에 A @·www 192.0.2.1 프록시 + Redirect Rule 301 배포, curl 로 `.kr` http/https/www 모두 301 → `https://pocketgamelab.com/경로` 확인. `.co.kr` 은 http 301 정상, https 는 그때 Cloudflare 인증서 발급 대기(curl exit 35) → 나중에 다시 확인. 아이티이지는 **자동 연장 기능이 없음**(사용자 확인) → 세 주소 만기 2027-11-04(연장 가능 ~2027-12-04)를 사람이 직접 연장해야 함. 여러 해 미리 연장 + 달력 알림을 권함. 2027년 가을 세션에서 만기를 먼저 알린다. 도메인잠금은 복수 선택 불가라 한 줄씩. `.co.kr` https 도 301 확인됨(2026-11-04), 2번(연결) 끝. `.com` 은 레코드가 없어 접속 시간 초과(정상). 남은 것: 도메인잠금 3개(사용자 진행), 연장·달력 알림, 그다음 3번(조이필드 주소 이전 계획). 2026-11-04 개발용 DB `joyfield-dev` 를 먼저 만들고 연결함(README 4.4). 같은 날 사용자 결정: 호스팅 **Cloudflare Pages**(프로젝트 `pocketgamelab`, GitHub Actions + wrangler 직접 업로드), 주소 **`pocketgamelab.com/joyfield/`**(최상위 `/` 는 스튜디오 자리, 지금은 302 로 조이필드), **개발 사이트 `dev.pocketgamelab.com`**(`dev` 브랜치, 개발 DB), 옛 주소는 **안내만**(기기 기록 안 옮김). 코드·문서 반영함(README 8장, CLAUDE.md 일정 절). 남은 것은 CLAUDE.md "스튜디오 도메인·주소 이전 다음 일정" 1~4번. 2026-11-05 1·2번 끝: Pages 프로젝트·도메인(dev CNAME → dev.pocketgamelab.pages.dev)·GitHub 비밀값·API 키 제한 "없음" 확인, 커밋 4515f30·e97c285(wrangler-action 은 pnpm 작업 공간 루트 설치 실패 → pnpm dlx wrangler@4) 배포 성공. 실제 브라우저로 운영=운영 DB·개발=개발 DB, SW 범위 /joyfield/ 확인. 다음: 사용자가 Actions 에서 "Old address notice" 실행 → 옛 주소 확인 → CLAUDE.md 일정 절 정리. → 네임서버 변경 → Redirect Rules. 아이티이지 화면: 보유도메인 → 줄 체크 → [네임서버변경](확인 체크, 이메일 인증코드, HOST만 입력·IP 빈칸). 끝나면 `curl -I` 로 301 확인, 이어서 아이티이지 도메인잠금 켜기.)
3. 조이필드 주소 이전 계획: 지금은 GitHub Pages `/project-joyfield/`. 새 구조(예: `pocketgamelab.com/joyfield/`, 게임은 그 아래) 결정 → GitHub Pages 사용자 도메인 또는 다른 호스팅, Vite base 경로, PWA 범위·manifest·서비스 워커(`Joyfield.registerSW`), Firebase 허용 도메인(인증·Firestore), 공유 링크, 옛 주소에서 새 주소로 안내를 한 번에 계획하고 사용자와 정한 뒤 진행. 홈 화면에 설치한 앱은 새 주소에서 다시 설치해야 함을 알린다.

**Why:** 조이필드와 앞으로 만들 게임을 이 도메인 아래로 연결할 계획이고, 사용자가 구매 뒤 다른 PC에서 이어 가겠다고 함.

**How to apply:** 위 순서대로 진행. 주소 이전은 바로 고치지 말고 계획부터. 관련: [[ranking-reset-at-store-launch]] [[other-pc-folder-rename]]
