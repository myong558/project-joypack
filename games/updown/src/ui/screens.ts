// 업다운 화면 틀: 위 메뉴 + 시작·게임·결과 화면(시작할 때 한 번 그림). 대화상자 내용은 panels.ts.
// 화면 틀의 고정 문구는 data-i18n* 속성의 키로 main.ts 가 채운다(언어를 바꾸면 다시 채움). 대화상자는 열 때마다 새로 만든다.
// 대화상자 틀·랭킹 창·등록 카드는 조이필드 공통(@joyfield/shared/ui): Esc·바깥 누르기·닫기 단추·휴대폰 뒤로 가기로 닫힌다

/** 화면 틀(#app 안). 위 메뉴 버튼은 조이필드 공통 모양(.jp-top-btn), 아이콘은 data-top-icon 이름으로 공통 그림(Joyfield.topIcon)을 넣는다 */
export const APP = `
<nav class="topbar jp-topbar">
  <div class="jp-topbar-group">
    <a id="hub-link" class="jp-top-btn" href="../../" data-top-icon="apps" data-i18n-aria-label="nav.hub"></a>
    <button id="home" type="button" class="jp-top-btn jp-top-pill" data-top-icon="home" hidden>
      <span data-i18n="nav.home"></span>
    </button>
    <button id="lang-toggle" type="button" class="jp-top-btn jp-top-pill" data-top-icon="globe" data-i18n-aria-label="lang.switchLabel">
      <span data-i18n="lang.switch"></span>
    </button>
  </div>
  <div class="jp-topbar-group">
    <button id="ranking-open" type="button" class="jp-top-btn" data-top-icon="trophy" aria-haspopup="dialog"></button>
    <button id="settings-open" type="button" class="jp-top-btn" data-top-icon="gear" aria-haspopup="dialog" data-i18n-aria-label="settings.open"></button>
  </div>
</nav>

<section id="screen-start" class="screen">
  <div class="brand">
    <!-- 로고(images/icon.svg 와 같은 그림). 인트로에서 위·아래 삼각형을 따로 움직이려고 문서 안에 직접 넣었다. -->
    <svg class="logo" viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d3c60"/><stop offset="1" stop-color="#161f38"/></linearGradient>
        <linearGradient id="logo-up" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2705f"/><stop offset="1" stop-color="#c63f34"/></linearGradient>
        <linearGradient id="logo-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa0ff"/><stop offset="1" stop-color="#3b74ea"/></linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#logo-bg)"/>
      <g stroke-width="24" stroke-linejoin="round">
        <path class="logo-up" d="M256 82 389 230H123z" fill="url(#logo-up)" stroke="url(#logo-up)"/>
        <path class="logo-down" d="M256 430 389 282H123z" fill="url(#logo-down)" stroke="url(#logo-down)"/>
      </g>
    </svg>
    <div class="brand-text">
      <h1 data-i18n="app.title"></h1>
      <!-- 조이필드 첫 화면 카드와 같은 게임 설명(games.json 의 desc) -->
      <p class="brand-desc" data-i18n="app.desc"></p>
    </div>
  </div>
  <div id="difficulty-list" class="difficulty-list"></div>
</section>

<section id="screen-play" class="screen" hidden>
  <div class="status">
    <!-- 일시정지 단추: 다른 게임처럼 플레이 화면 위 왼쪽. 휴대폰 뒤로 가기·앱 내리기와 같은 일시정지 창을 연다(뒤로 가기 키가 없는 PC·아이폰용) -->
    <button id="pause-open" type="button" class="status-pause" data-i18n-aria-label="pause.open">
      <svg class="icon" aria-hidden="true"><use href="#i-pause"></use></svg>
    </button>
    <!-- 라벨 글자 대신 아이콘으로 보여주고, 화면 읽기용 이름은 aria-label 로 준다. -->
    <!-- 왼쪽 카드: 이번 판의 전체 범위(1 ~ 50). 연습 판은 아이콘 자리에 "연습" 표. 좁혀지는 범위는 다이얼 위 막대 쪽(#range)에 있다 -->
    <div class="status-item status-range" role="group" data-i18n-aria-label="play.board">
      <svg id="play-board-icon" class="icon status-icon" aria-hidden="true"><use href="#i-range"></use></svg>
      <span id="play-practice" class="status-practice" data-i18n="play.practiceTag" hidden></span>
      <span id="play-level" class="status-value"></span>
    </div>
    <div class="status-item status-tries" role="group" data-i18n-aria-label="play.triesLabel">
      <svg class="icon status-icon" aria-hidden="true"><use href="#i-retry"></use></svg>
      <span id="tries-count" class="status-value"></span>
    </div>
  </div>

  <div class="hint-box" aria-live="polite">
    <p id="hint-value" class="hint-value"></p>
    <p id="hint" class="hint"></p>
    <!-- 온도계: 한 판에 한 번, 방금 넣은 숫자가 정답과 얼마나 가까운지(🔥 아주 가까움 ~ ❄️ 멂). 쓰면 점수 차감.
         누르면 설명과 [사용하기]가 있는 창(#thermo)이 뜨고, 쓴 뒤에는 이 자리에 그 온도가 남는다(main.ts 의 renderThermo). -->
    <p class="temp-row">
      <button id="thermo-open" type="button" class="thermo-open">
        <svg class="icon" aria-hidden="true"><use href="#i-thermo"></use></svg>
        <span id="thermo-open-label"></span>
        <span id="thermo-open-cost" class="thermo-cost" hidden></span>
      </button>
      <span id="temp" class="temp" hidden></span>
    </p>
  </div>

  <!-- 시도 기록은 숫자 상자 위에서 위로 쌓인다. 다이얼은 화면 맨 아래에 고정돼 기록이 늘어도 움직이지 않는다. -->
  <ol id="history" class="history" data-i18n-aria-label="play.history"></ol>

  <!-- 아직 가능한 범위(13 ~ 24)와 좁혀지는 숫자 막대: 숫자를 고르는 다이얼 바로 위에 둬, 방금 넣은 기록 → 남은 범위 → 입력이 한눈에 이어진다.
       막대는 처음 범위 전체 중 아직 가능한 칸만 밝게 남고, 추측한 자리에 눈금이 찍힌다(main.ts 의 renderBar). -->
  <div class="play-meter">
    <p class="play-level" role="group" data-i18n-aria-label="play.range"><span id="range"></span></p>
    <div id="range-bar" class="range-bar" aria-hidden="true">
      <span id="range-bar-live" class="range-bar-live"></span>
      <!-- 다이얼로 고르는 중인 숫자 자리(숫자는 아래 상자에 있어 위치만). main.ts 의 setPick 이 옮긴다 -->
      <span id="range-bar-pick" class="range-bar-pick"></span>
    </div>
  </div>

  <!-- 숫자는 110° 원호 다이얼로만 고른다. 위 상자에 고른 숫자가 보이고 -/+ 로 1씩 조정한다.
       다이얼 범위는 힌트로 좁혀진 범위를 따르고(왼쪽 끝 = 최솟값), 확인 버튼은 원호 안쪽에 있다. 원호 경로는 app.js 가 그린다. -->
  <form id="guess-form" class="guess-form" novalidate>
    <div class="pick">
      <button id="pick-down" type="button" class="pick-step" data-i18n-aria-label="play.minus"><svg class="icon" aria-hidden="true"><use href="#i-minus"></use></svg></button>
      <output id="pick-value" class="pick-value"></output>
      <button id="pick-up" type="button" class="pick-step" data-i18n-aria-label="play.plus"><svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg></button>
    </div>
    <div class="dial">
      <svg id="dial" class="dial-svg" viewBox="0 0 300 105" role="slider" tabindex="0" data-i18n-aria-label="play.inputLabel">
        <path class="dial-track"/>
        <path id="dial-fill" class="dial-fill"/>
        <circle id="dial-thumb" class="dial-thumb" r="15"/>
      </svg>
      <button type="submit" class="dial-submit" data-i18n="play.submit"></button>
    </div>
  </form>
  <!-- 일시정지(휴대폰 뒤로 가기·앱을 내렸을 때, 기준서 1.3). 멈춘 동안은 시간이 흐르지 않는다 -->
  <div id="pause-menu" class="pause-menu" hidden>
    <div class="pause-card">
      <h2 data-i18n="pause.title"></h2>
      <p class="pause-note" data-i18n="pause.note"></p>
      <button id="pause-resume" type="button" class="primary" data-i18n="pause.resume"></button>
      <button id="pause-quit" type="button" class="secondary" data-i18n="pause.quit"></button>
    </div>
  </div>
</section>

<section id="screen-result" class="screen" hidden>
  <div id="result-art" class="result-art" aria-hidden="true">
    <svg class="sparkle sparkle-1"><use href="#i-sparkle"></use></svg>
    <svg id="result-icon" class="result-icon"><use href="#i-trophy"></use></svg>
    <svg class="sparkle sparkle-2"><use href="#i-sparkle"></use></svg>
  </div>
  <h1 id="result-title"></h1>
  <!-- 제목은 운 문구(main.ts 의 renderResult), 그 아래 점수 + 최고 기록 표, 정답 숫자·횟수·시간 한 줄 -->
  <div class="result-score-row">
    <p id="result-score" class="result-score"></p>
    <p id="result-best" class="new-best" hidden>
      <svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>
      <span data-i18n="result.newBest"></span>
    </p>
  </div>
  <p id="result-detail" class="lead"></p>
  <p id="result-thermo" class="result-thermo" hidden></p>
  <p id="result-practice" class="result-practice" hidden data-i18n="result.practice"></p>
  <!-- 랭킹 등록 카드 + 버튼 묶음. TOP 10 에 들면 등록 카드(공통 @joyfield/shared/ui)가 버튼 위에 들어온다(main.ts 의 showEntry).
       세로 화면에서는 display: contents 라 없는 것과 같고, 가로로 눕힌 낮은 화면에서 오른쪽 칸이 된다(styles.css) -->
  <div class="result-side">
  <div class="actions">
    <button id="retry" type="button" class="primary">
      <svg class="icon" aria-hidden="true"><use href="#i-retry"></use></svg>
      <span data-i18n="result.retry"></span>
    </button>
    <!-- 기록 공유하기: 결과 카드 이미지 + 조이필드 설치 주소(main.ts 의 shareResult → Joyfield.shareResult). -->
    <div class="action-row">
      <button id="share" type="button" class="secondary">
        <svg class="icon" aria-hidden="true"><use href="#i-share"></use></svg>
        <span data-i18n="result.share"></span>
      </button>
      <button id="go-home" type="button" class="secondary">
        <svg class="icon" aria-hidden="true"><use href="#i-home"></use></svg>
        <span data-i18n="result.home"></span>
      </button>
    </div>
  </div>
  </div>
  <p id="toast" class="toast" role="status" aria-live="polite"></p>
</section>
`;
