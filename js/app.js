// 화면 이벤트 처리, 렌더링, 최고 기록 저장, 서비스 워커 등록.
// 언어를 바꾸면 현재 화면을 상태에서 다시 그리므로, 화면 문구는 모두 render* 함수에서 채운다.
(function () {
  'use strict';

  const BEST_KEY = 'updown.best';
  const THEME_KEY = 'updown.theme'; // index.html 의 <head> 스크립트와 같은 키
  const SKIN_KEY = 'updown.skin';
  const t = UpDownI18n.t;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const screens = { start: $('screen-start'), play: $('screen-play'), result: $('screen-result') };

  let screen = 'start';
  let game = null;
  let newBest = false;
  let updateReady = false; // 새 버전 서비스 워커가 화면을 넘겨받았다. 홈으로 갈 때 새로 고친다.
  let pick = null; // 다이얼로 고른 숫자. null 이면 다음 렌더링 때 범위 최솟값(왼쪽 끝)에서 시작한다.
  let best = loadBest();

  // localStorage 를 못 쓰는 환경에서도 게임은 돌아가야 하므로 실패는 조용히 넘긴다.
  function loadBest() {
    try {
      const saved = JSON.parse(localStorage.getItem(BEST_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    return {};
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(best));
    } catch (e) {}
  }

  // index.html 의 아이콘 스프라이트(<symbol id="i-이름">)를 쓰는 <svg> 를 만든다.
  function icon(name, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon' + (className ? ' ' + className : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function show(name) {
    screen = name;
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== name;
    });
    // 왼쪽 위: 시작 화면은 언어 전환, 게임 화면은 홈. 오른쪽 위 설정 버튼은 항상 보인다.
    $('lang-toggle').hidden = name !== 'start';
    $('home').hidden = name !== 'play';
    if (name !== 'start') endIntro();
  }

  // 첫 실행 인트로(css 의 .intro)는 한 번만 재생한다.
  function endIntro() {
    document.querySelector('.app').classList.remove('intro');
  }

  // 컬러 모드: 'system'(기기 설정을 따름) · 'light' · 'dark'. 기본은 기기 설정이다.
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let themePreference = loadThemePreference();

  function loadThemePreference() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'system';
  }

  // 화면에는 항상 light/dark 둘 중 하나만 적용한다. CSS 는 data-theme='dark' 만 본다.
  function applyTheme() {
    const dark = themePreference === 'dark' || (themePreference === 'system' && darkQuery.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    UpDownSkins.apply(skinPreference); // 배경 입자 색도 테마를 따른다.
    updateThemeColor();
  }

  // 주소창·상태바 색(theme-color)을 현재 스킨·테마의 배경색에 맞춘다.
  function updateThemeColor() {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
  }

  function setTheme(preference) {
    themePreference = preference;
    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch (e) {}
    applyTheme();
  }

  // 계절 스킨. 'auto'(기본)면 날마다 무작위 스킨을 쓴다(js/skins.js 의 dailySkin).
  let skinPreference = loadSkinPreference();

  function loadSkinPreference() {
    try {
      const saved = localStorage.getItem(SKIN_KEY);
      if (UpDownSkins.SKINS.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    return 'auto';
  }

  function setSkin(skin) {
    skinPreference = skin;
    try {
      localStorage.setItem(SKIN_KEY, skin);
    } catch (e) {}
    UpDownSkins.apply(skin);
    updateThemeColor();
  }

  applyTheme();

  // '기기 설정'이면 앱을 켜 둔 채 기기 설정을 바꿔도 바로 따라간다.
  darkQuery.addEventListener('change', () => {
    if (themePreference === 'system') applyTheme();
  });

  // index.html 의 data-i18n* 속성이 붙은 고정 문구를 채운다.
  function renderStaticTexts() {
    document.documentElement.lang = UpDownI18n.getLang();
    document.title = t('app.title');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
    });
  }

  // 난이도를 별 개수로 보여준다 (쉬움 1개 ~ 최상위 4개).
  function difficultyStars(key) {
    const keys = Object.keys(UpDown.DIFFICULTIES);
    const level = keys.indexOf(key);
    const stars = document.createElement('span');
    stars.className = 'difficulty-stars';
    for (let i = 0; i < keys.length; i++) stars.appendChild(icon('star', i <= level ? 'on' : ''));
    return stars;
  }

  function renderStart() {
    const list = $('difficulty-list');
    list.textContent = '';
    Object.keys(UpDown.DIFFICULTIES).forEach((key) => {
      const config = UpDown.DIFFICULTIES[key];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'difficulty difficulty-' + key;

      const label = document.createElement('span');
      label.className = 'difficulty-label';
      label.append(t('difficulty.' + key), difficultyStars(key));

      // 범위와 기회는 아이콘 + 숫자로만 보여준다. 문장은 아래 aria-label 로 화면 읽기 프로그램에 전달한다.
      const detail = document.createElement('span');
      detail.className = 'difficulty-detail';
      const range = document.createElement('span');
      range.className = 'meta';
      range.append(icon('range'), config.min + ' ~ ' + config.max);
      const tries = document.createElement('span');
      tries.className = 'meta meta-tries';
      tries.append(icon('heart'), String(config.maxTries));
      detail.append(range, tries);

      const record = document.createElement('span');
      record.className = 'difficulty-best';
      // 기록이 있으면 트로피 + 횟수, 없으면 "기록 없음"
      if (best[key]) record.append(icon('trophy'), t('difficulty.bestShort', { tries: best[key] }));
      else record.textContent = t('difficulty.noBest');

      button.setAttribute('aria-label', [
        t('difficulty.' + key),
        t('difficulty.detail', { min: config.min, max: config.max, tries: config.maxTries }),
        best[key] ? t('difficulty.best', { tries: best[key] }) : t('difficulty.noBest'),
      ].join(', '));
      button.append(label, detail, record);
      button.addEventListener('click', () => startGame(key));
      list.appendChild(button);
    });
  }

  // animate 가 true 면 방금 나온 힌트의 애니메이션을 재생한다. 언어 전환 때는 재생하지 않는다.
  function renderPlay(animate) {
    const level = $('play-level');
    level.textContent = '';
    level.append(difficultyStars(game.difficulty), t('difficulty.' + game.difficulty));
    $('range').textContent = game.low + ' ~ ' + game.high;

    // 남은 기회는 하트로 보여준다. 채운 하트가 남은 기회, 빈 하트가 쓴 기회다.
    const left = UpDown.triesLeft(game);
    const hearts = $('tries-left');
    hearts.textContent = '';
    for (let i = 0; i < game.maxTries; i++) hearts.appendChild(icon('heart', i < left ? 'on' : ''));
    hearts.setAttribute('aria-label', t('play.triesLeft') + ' ' + left);
    // 마지막 기회: 하트가 두근거리고 화면 테두리가 붉어진다(css 의 .last-chance).
    screens.play.classList.toggle('last-chance', left === 1);

    const hint = $('hint');
    const last = game.guesses[game.guesses.length - 1];
    hint.textContent = '';
    hint.className = 'hint';
    // 첫 입력 전에는 문장 대신 물음표 하나만 보여준다. 범위는 위 카드에 있다.
    $('hint-value').textContent = last ? last.value : '?';
    if (last) {
      const isUp = last.result === 'UP';
      hint.append(icon(isUp ? 'up' : 'down'), last.result);
      if (animate) void hint.offsetWidth; // 같은 힌트가 연달아 나와도 애니메이션을 다시 재생한다.
      hint.className = 'hint ' + (animate ? 'pop ' : '') + (isUp ? 'up' : 'down');
    }

    setPick(pick === null ? game.low : pick);

    const history = $('history');
    history.textContent = '';
    game.guesses.forEach((g, i) => {
      const item = document.createElement('li');
      item.className = g.result.toLowerCase();
      // "3번째" 대신 동그라미 번호를 붙인다.
      const value = document.createElement('span');
      value.className = 'history-guess';
      const no = document.createElement('span');
      no.className = 'history-no';
      no.textContent = i + 1;
      value.append(no, String(g.value));
      const result = document.createElement('span');
      result.className = 'history-result ' + g.result.toLowerCase();
      result.append(icon(g.result === 'UP' ? 'up' : 'down'), g.result);
      item.append(value, result);
      history.appendChild(item);
    });
    history.dataset.empty = t('play.historyEmpty');
    // 방금 추가된 기록은 떠오르며 나타난다.
    if (animate && history.lastElementChild) history.lastElementChild.classList.add('enter');
    // 최신 기록은 맨 아래(숫자 상자 바로 위)에 붙으므로, 넘칠 때는 맨 아래가 보이게 스크롤한다.
    history.scrollTo({ top: history.scrollHeight, behavior: animate && !reducedMotion.matches ? 'smooth' : 'auto' });
    updateHistoryFade();
  }

  // 위로 밀려난 기록이 있으면(스크롤이 맨 위가 아니면) 판 위쪽을 흐리게 한다.
  function updateHistoryFade() {
    const history = $('history');
    history.classList.toggle('fade-top', history.scrollTop > 0);
  }

  // 정답 축하 색종이. big 이면(최고 기록 갱신) 양쪽 아래 모서리에서도 쏘아 올려 더 크게 터진다.
  function confetti(big) {
    if (reducedMotion.matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    // PC 화면 확대 배수만큼 종이 크기·속도·중력을 키운다(배경 입자와 같은 기준).
    const scale = UpDownSkins.screenScale();

    // 색은 현재 테마의 역할 토큰을 그대로 쓴다.
    const style = getComputedStyle(document.documentElement);
    const colors = ['--up', '--down', '--star', '--success', '--heart'].map((name) => style.getPropertyValue(name).trim());
    const pieces = [];
    function burst(x, y, count, angle, spread, speed) {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread;
        const v = speed * scale * (0.5 + Math.random() * 0.7);
        pieces.push({
          x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          size: (6 + Math.random() * 6) * scale, rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.4,
          color: colors[i % colors.length],
        });
      }
    }
    burst(width / 2, height * 0.35, big ? 120 : 80, -Math.PI / 2, Math.PI * 1.6, 13);
    if (big) {
      burst(0, height, 110, -Math.PI / 3, 0.8, 24);
      burst(width, height, 110, (-Math.PI * 2) / 3, 0.8, 24);
    }

    const start = performance.now();
    let last = start;
    function frame(now) {
      const step = Math.min((now - last) / 16.7, 3); // 60fps 기준 한 프레임 = 1
      last = now;
      ctx.clearRect(0, 0, width, height);
      let alive = 0;
      pieces.forEach((p) => {
        p.vx *= Math.pow(0.985, step);
        p.vy = p.vy * Math.pow(0.985, step) + 0.32 * scale * step;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.rot += p.spin * step;
        if (p.y > height + 20 * scale) return;
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // 세로 폭을 cos 로 줄였다 늘려 종이가 뒤집히며 떨어지는 느낌을 낸다.
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.rot * 1.7)) + 1);
        ctx.restore();
      });
      if (alive && now - start < 5000) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  function renderResult() {
    const won = game.status === 'won';
    $('result-art').className = 'result-art ' + (won ? 'won' : 'lost');
    $('result-icon').firstElementChild.setAttribute('href', won ? '#i-trophy' : '#i-sad');
    $('result-title').textContent = t(won ? 'result.won' : 'result.lost');
    $('result-title').className = won ? 'won' : 'lost';
    $('result-answer').textContent = game.answer;
    // 실패했을 때는 제목과 정답 숫자로 충분해 설명 문장을 숨긴다.
    $('result-detail').textContent = won ? t('result.wonDetail', { tries: game.guesses.length }) : '';
    $('result-detail').hidden = !won;
    $('result-best').hidden = !newBest;
  }

  // ── 공유하기 ──
  // 결과 카드 이미지(PNG)와 게임 링크를 기기 공유 창으로 보낸다.
  // 공유 창이 없거나 이미지를 못 보내는 브라우저(주로 PC)는 이미지를 저장하고 문구·링크를 클립보드에 복사한다.
  const CARD_SIZE = 1080;
  let shareCard = null; // { game, key, promise }: 같은 판·같은 모양이면 그린 이미지를 다시 쓴다.
  let toastTimer = 0;

  // 게임 주소: 쿼리·해시와 파일 이름(index.html)을 뺀 폴더 주소.
  function gameUrl() {
    return new URL('./', location.href).href;
  }

  function shareText() {
    const config = UpDown.DIFFICULTIES[game.difficulty];
    const params = { level: t('difficulty.' + game.difficulty), min: config.min, max: config.max, tries: game.guesses.length };
    return t(game.status === 'won' ? 'share.wonText' : 'share.lostText', params);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // images/icon.svg 와 같은 로고: 남색 바탕 + 위 빨간 삼각형 + 아래 파란 삼각형.
  function drawLogo(ctx, x, y, size) {
    const s = size / 512;
    // 삼각형 색: 위(밝음) → 아래(진함) 세로 그라데이션
    const gradient = (y0, y1, from, to) => {
      const g = ctx.createLinearGradient(0, y + y0 * s, 0, y + y1 * s);
      g.addColorStop(0, from);
      g.addColorStop(1, to);
      return g;
    };
    roundRect(ctx, x, y, size, size, size * 0.24);
    const bg = ctx.createLinearGradient(x, y, x + size, y + size);
    bg.addColorStop(0, '#2d3c60');
    bg.addColorStop(1, '#161f38');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 24 * s;
    [
      [82, 230, '#f2705f', '#c63f34'],
      [430, 282, '#6aa0ff', '#3b74ea'],
    ].forEach(([tip, base, from, to]) => {
      ctx.beginPath();
      ctx.moveTo(x + 256 * s, y + tip * s);
      ctx.lineTo(x + 389 * s, y + base * s);
      ctx.lineTo(x + 123 * s, y + base * s);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle = gradient(Math.min(tip, base), Math.max(tip, base), from, to);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 결과 카드(1080×1080): 로고·제목, 난이도, 결과, 정답, 시도 기록. 색은 지금 스킨·테마를 따른다.
  // 게임 주소는 이미지에 쓰지 않고 [링크 보내기]로 눌리는 링크를 따로 보낸다.
  async function drawShareCard() {
    try {
      await document.fonts.load('80px Jua');
    } catch (e) {}
    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    const font = (size) => size + "px Jua, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CARD_SIZE;
    const ctx = canvas.getContext('2d');
    const center = CARD_SIZE / 2;
    const maxWidth = 880;
    const won = game.status === 'won';
    const config = UpDown.DIFFICULTIES[game.difficulty];

    // 배경: 스킨 배경색 위에 화면처럼 위쪽만 강조색을 옅게 깐다.
    ctx.fillStyle = color('--bg');
    ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
    const band = ctx.createLinearGradient(0, 0, 0, CARD_SIZE * 0.6);
    band.addColorStop(0, color('--primary'));
    band.addColorStop(1, color('--bg'));
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
    ctx.globalAlpha = 1;

    roundRect(ctx, 60, 60, CARD_SIZE - 120, CARD_SIZE - 120, 56);
    ctx.fillStyle = color('--surface');
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color('--line');
    ctx.stroke();

    // 내용을 카드 세로 가운데에 오게 내린다. 실패하면 성공 문장이 없어 더 내린다.
    ctx.translate(0, won ? 36 : 60);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = font(52);
    const title = t('app.title');
    const logoSize = 88;
    const headerX = center - (logoSize + 24 + ctx.measureText(title).width) / 2;
    drawLogo(ctx, headerX, 116, logoSize);
    ctx.fillStyle = color('--text');
    ctx.fillText(title, headerX + logoSize + 24, 162);

    ctx.textAlign = 'center';
    ctx.font = font(40);
    const level = t('difficulty.' + game.difficulty) + ' · ' + config.min + ' ~ ' + config.max;
    const chipWidth = ctx.measureText(level).width + 64;
    roundRect(ctx, center - chipWidth / 2, 240, chipWidth, 72, 36);
    ctx.fillStyle = color('--surface-alt');
    ctx.fill();
    ctx.fillStyle = color('--text-muted');
    ctx.fillText(level, center, 278);

    ctx.font = font(96);
    ctx.fillStyle = color(won ? '--success' : '--danger');
    ctx.fillText(t(won ? 'result.won' : 'result.lost'), center, 404, maxWidth);
    ctx.font = font(220);
    ctx.fillStyle = color('--text');
    ctx.fillText(String(game.answer), center, 574);
    if (won) {
      ctx.font = font(52);
      ctx.fillStyle = color('--text-muted');
      ctx.fillText(t('result.wonDetail', { tries: game.guesses.length }), center, 716, maxWidth);
    }

    // 시도 기록: 추측한 숫자마다 UP(빨강 ▲)·DOWN(파랑 ▼)·정답(초록 ●) 칸.
    const cellWidth = 124;
    const cellGap = 16;
    const rowY = won ? 788 : 740; // 실패하면 성공 문장 자리가 비어 기록을 조금 올린다.
    const rowX = center - (game.guesses.length * (cellWidth + cellGap) - cellGap) / 2;
    game.guesses.forEach((g, i) => {
      const x = rowX + i * (cellWidth + cellGap);
      const mid = x + cellWidth / 2;
      const tone = color(g.result === 'UP' ? '--up' : g.result === 'DOWN' ? '--down' : '--success');
      roundRect(ctx, x, rowY, cellWidth, 104, 24);
      ctx.fillStyle = color('--surface-alt');
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = tone;
      ctx.stroke();
      ctx.fillStyle = tone;
      ctx.font = font(44);
      ctx.fillText(String(g.value), mid, rowY + 36);
      ctx.beginPath();
      if (g.result === 'CORRECT') {
        ctx.arc(mid, rowY + 76, 9, 0, Math.PI * 2);
      } else {
        const tip = rowY + (g.result === 'UP' ? 67 : 85);
        const base = rowY + (g.result === 'UP' ? 85 : 67);
        ctx.moveTo(mid, tip);
        ctx.lineTo(mid + 12, base);
        ctx.lineTo(mid - 12, base);
        ctx.closePath();
      }
      ctx.fill();
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], 'updown-result.png', { type: 'image/png' }));
        else reject(new Error('toBlob'));
      }, 'image/png');
    });
  }

  // 결과 화면이 뜨면 미리 그려 둔다. 공유 창은 버튼을 누른 직후에만 열 수 있어서, 누른 뒤 그리면 늦을 수 있다.
  // 스킨·테마·언어를 바꾸면 다시 그린다.
  function prepareShareCard() {
    const root = document.documentElement;
    const key = [root.dataset.theme, root.dataset.skin, UpDownI18n.getLang()].join('|');
    if (!shareCard || shareCard.game !== game || shareCard.key !== key) {
      shareCard = { game: game, key: key, promise: drawShareCard() };
    }
    return shareCard.promise;
  }

  function saveFile(file) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function showToast(message, duration) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration || 2600);
  }

  // [공유하기]: 결과 이미지와 문구·링크를 한 번에 기기 공유 창으로 보낸다.
  // 카카오톡은 기기 공유로 받으면 글(링크)을 버리므로 [카카오톡으로 공유](shareKakao)를 따로 둔다.
  async function shareResult() {
    const button = $('share');
    button.disabled = true;
    try {
      // 게임 링크는 문구 끝 줄에 넣는다. 문구 안의 주소는 메신저가 바로 눌리는 링크로 바꿔 준다.
      const message = shareText() + '\n' + gameUrl();
      let file = null;
      try {
        file = await prepareShareCard();
      } catch (e) {}
      if (navigator.share) {
        const withImage = !!file && !!navigator.canShare && navigator.canShare({ files: [file] });
        const data = withImage ? { files: [file], text: message } : { title: t('app.title'), text: message };
        try {
          await navigator.share(data);
          return;
        } catch (e) {
          if (e.name === 'AbortError') return; // 사용자가 공유 창을 닫았다.
        }
      }
      // 공유 창이 없거나 실패하면(주로 PC) 이미지를 저장하고 문구·링크를 클립보드에 복사한다.
      if (file) saveFile(file);
      let copied = false;
      try {
        await navigator.clipboard.writeText(message);
        copied = true;
      } catch (e) {}
      showToast(t(file ? (copied ? 'share.copied' : 'share.saved') : copied ? 'share.linkCopied' : 'share.failed'));
    } finally {
      button.disabled = false;
    }
  }

  // ── 카카오톡 공유(카카오 JavaScript SDK) ──
  // 기기 공유로 카카오톡에 이미지와 글을 함께 보내면 글(링크)이 버려진다. 카카오 공유는 결과 이미지와
  // "나도 도전하기" 링크 버튼을 한 메시지(피드)로 보낸다.
  // 키: developers.kakao.com 에서 앱을 만들고 [앱 키]의 JavaScript 키를 넣는다.
  // [플랫폼 > Web] 에 사이트 도메인(https://myong558.github.io, 로컬 시험은 http://localhost:3000)을 등록해야 한다.
  // 키가 비어 있으면 버튼을 숨기고 SDK 도 불러오지 않는다.
  const KAKAO_JS_KEY = '2885e417a3550567e1558da2829327a7';
  const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
  let kakaoReady = null;

  function loadKakao() {
    if (!kakaoReady) {
      kakaoReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = KAKAO_SDK_URL;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
          resolve(window.Kakao);
        };
        script.onerror = () => {
          kakaoReady = null; // 오프라인 등으로 실패하면 다음에 다시 시도한다.
          reject(new Error('kakao sdk'));
        };
        document.head.appendChild(script);
      });
    }
    return kakaoReady;
  }

  async function shareKakao() {
    const button = $('share-kakao');
    button.disabled = true;
    try {
      const [Kakao, file] = await Promise.all([loadKakao(), prepareShareCard()]);
      // 피드 이미지는 공개 주소여야 해서 결과 이미지를 카카오 서버에 올리고 받은 주소를 쓴다.
      // 올리기가 실패하면 게임 아이콘으로라도 이미지 + 링크 메시지를 보낸다.
      let imageUrl = new URL('images/icon-512.png', gameUrl()).href;
      let imageSize = 512;
      try {
        const upload = await Kakao.Share.uploadImage({ file: [file] });
        imageUrl = upload.infos.original.url;
        imageSize = CARD_SIZE;
      } catch (e) {}
      const url = gameUrl();
      const link = { mobileWebUrl: url, webUrl: url };
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: t('app.title'),
          // 문구 아래에 게임 주소도 글자로 보여 준다. 누르는 링크는 이미지와 [나도 도전하기] 버튼이다.
          description: shareText() + '\n' + url,
          imageUrl: imageUrl,
          imageWidth: imageSize,
          imageHeight: imageSize,
          link: link,
        },
        buttons: [{ title: t('share.kakaoButton'), link: link }],
      });
    } catch (e) {
      showToast(t('share.failed'));
    } finally {
      button.disabled = false;
    }
  }

  function renderScreen() {
    if (screen === 'play') renderPlay(false);
    else if (screen === 'result') renderResult();
    else renderStart();
  }

  function goToStart() {
    if (updateReady) {
      location.reload(); // 게임 중에 받아 둔 새 버전을 홈으로 갈 때 적용한다.
      return;
    }
    renderStart();
    show('start');
  }

  // ── 다이얼(110° 원호) ──
  // viewBox(300×105) 기준 원 중심·반지름과 원호 양 끝 각도. 왼쪽 끝(145°)이 최솟값, 오른쪽 끝(35°)이 최댓값.
  // 반지름을 키워 양 끝 폭은 그대로 두고 원호를 완만하게 했다.
  const DIAL_CX = 150;
  const DIAL_CY = 179;
  const DIAL_R = 161;
  const DIAL_START = (145 * Math.PI) / 180;
  const DIAL_END = (35 * Math.PI) / 180;

  function dialPoint(angle) {
    return (DIAL_CX + DIAL_R * Math.cos(angle)).toFixed(1) + ' ' + (DIAL_CY - DIAL_R * Math.sin(angle)).toFixed(1);
  }

  // 왼쪽 끝에서 angle 까지의 원호 경로(110° 이하라 항상 작은 호).
  function dialArc(angle) {
    return 'M ' + dialPoint(DIAL_START) + ' A ' + DIAL_R + ' ' + DIAL_R + ' 0 0 1 ' + dialPoint(angle);
  }

  // 고른 숫자를 좁혀진 범위 안으로 맞추고 다이얼(손잡이·채움)과 위 숫자 상자를 갱신한다.
  function setPick(value) {
    pick = Math.min(game.high, Math.max(game.low, value));
    // 숫자가 하나만 남으면 가운데에 둔다.
    const ratio = game.high === game.low ? 0.5 : (pick - game.low) / (game.high - game.low);
    const angle = DIAL_START - (DIAL_START - DIAL_END) * ratio;
    const [x, y] = dialPoint(angle).split(' ');
    $('dial-thumb').setAttribute('cx', x);
    $('dial-thumb').setAttribute('cy', y);
    $('dial-fill').setAttribute('d', dialArc(angle));

    const dial = $('dial');
    dial.setAttribute('aria-valuemin', game.low);
    dial.setAttribute('aria-valuemax', game.high);
    dial.setAttribute('aria-valuenow', pick);
    $('pick-value').textContent = pick;
    $('pick-down').disabled = pick <= game.low;
    $('pick-up').disabled = pick >= game.high;
  }

  // 손가락·마우스 위치를 원호 위 각도로 바꿔 숫자를 고른다. 원호 바깥 각도(아래쪽 등)는 가까운 끝으로 붙는다.
  function pickFromPointer(event) {
    // 낮은 화면에서 다이얼이 줄어 가운데 정렬돼도 맞도록 화면 좌표를 viewBox 좌표로 바꾼다.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform($('dial').getScreenCTM().inverse());
    const x = point.x;
    const y = point.y;
    let angle = Math.atan2(DIAL_CY - y, x - DIAL_CX);
    if (angle < 0) angle = x < DIAL_CX ? Math.PI : 0;
    angle = Math.min(DIAL_START, Math.max(DIAL_END, angle));
    setPick(Math.round(game.low + ((DIAL_START - angle) / (DIAL_START - DIAL_END)) * (game.high - game.low)));
  }

  function startGame(difficulty) {
    game = UpDown.createGame(difficulty);
    pick = null;
    renderPlay(false);
    show('play');
    $('dial').focus();
  }

  function submitGuess(event) {
    event.preventDefault();
    // 다이얼은 좁혀진 범위 안의 숫자만 고르므로 검증에 걸리는 일은 없다(게임이 끝난 뒤 제출 등은 무시).
    if (!UpDown.guess(game, pick).ok) return;

    pick = null;
    if (game.status !== 'playing') {
      finishGame();
      return;
    }
    renderPlay(true);
    $('dial').focus();
  }

  function finishGame() {
    const tries = game.guesses.length;
    newBest = game.status === 'won' && (!best[game.difficulty] || tries < best[game.difficulty]);
    if (newBest) {
      best[game.difficulty] = tries;
      saveBest();
    }
    renderResult();
    show('result');
    // 확인 버튼을 연달아 누르던 손가락이 바로 아래 버튼을 누르지 않도록 잠깐 터치를 막는다.
    screens.result.classList.add('locked');
    setTimeout(() => screens.result.classList.remove('locked'), 600);
    $('retry').focus();
    if (game.status === 'won') confetti(newBest);
    prepareShareCard().catch(() => {});
    if (KAKAO_JS_KEY) loadKakao().catch(() => {});
  }

  function changeLang(lang) {
    UpDownI18n.setLang(lang);
    renderStaticTexts();
    renderScreen();
    if ($('settings').open) renderSettings();
  }

  function toggleLang() {
    const langs = UpDownI18n.LANGS;
    changeLang(langs[(langs.indexOf(UpDownI18n.getLang()) + 1) % langs.length]);
  }

  // 설정 메뉴: 기록 리셋, 컬러 모드, 스킨, 언어
  function renderSettings() {
    document.querySelectorAll('[data-reset]').forEach((button) => {
      const key = button.dataset.reset;
      button.disabled = key === 'all' ? Object.keys(best).length === 0 : !best[key];
    });
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === themePreference));
    });
    document.querySelectorAll('[data-skin-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.skinOption === skinPreference));
    });

    const langList = $('settings-lang');
    langList.textContent = '';
    UpDownI18n.LANGS.forEach((lang) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.lang = lang;
      button.textContent = UpDownI18n.NAMES[lang];
      button.setAttribute('aria-pressed', String(lang === UpDownI18n.getLang()));
      button.addEventListener('click', () => changeLang(lang));
      langList.appendChild(button);
    });
  }

  function openSettings() {
    renderSettings();
    $('settings').showModal();
    showVersion();
  }

  // 서비스 워커 캐시 이름(updown-v숫자)이 곧 버전이다. 캐시를 못 쓰는 환경(file:// 등)이면 숨긴다.
  function showVersion() {
    if (!window.caches) return;
    caches
      .keys()
      .then((names) => {
        const name = names.filter((n) => n.indexOf('updown-') === 0).pop();
        if (!name) return;
        $('app-version').textContent = t('settings.version', { version: name.replace('updown-', '') });
        $('app-version').hidden = false;
      })
      .catch(() => {});
  }

  // 되돌릴 수 없는 동작 전에 띄우는 확인 팝업. "지우기"를 누르면 true, 취소·Esc·바깥 클릭은 false 로 끝난다.
  function confirmDialog(message) {
    const dialog = $('confirm');
    $('confirm-message').textContent = message;
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    });
  }

  async function resetRecord(key) {
    const level = key === 'all' ? '' : t('difficulty.' + key);
    const message = key === 'all' ? t('settings.confirmAll') : t('settings.confirmOne', { level: level });
    if (!(await confirmDialog(message))) return;
    if (key === 'all') best = {};
    else delete best[key];
    saveBest();
    renderSettings();
    renderScreen(); // 시작 화면의 난이도별 최고 기록 표시도 바로 갱신한다.
  }

  $('guess-form').addEventListener('submit', submitGuess);
  // 다이얼: 누른 채 끌어서 고르고, 키보드는 화살표 1, Page Up/Down 10, Home/End 양 끝, Enter 제출.
  const dial = $('dial');
  dial.querySelector('.dial-track').setAttribute('d', dialArc(DIAL_END));
  dial.addEventListener('pointerdown', (event) => {
    pickFromPointer(event);
    dial.setPointerCapture(event.pointerId); // 다이얼 밖으로 끌고 나가도 계속 따라오게 한다.
  });
  dial.addEventListener('pointermove', (event) => {
    if (dial.hasPointerCapture(event.pointerId)) pickFromPointer(event);
  });
  dial.addEventListener('keydown', (event) => {
    const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (event.key in steps) setPick(pick + steps[event.key]);
    else if (event.key === 'Home') setPick(game.low);
    else if (event.key === 'End') setPick(game.high);
    else if (event.key === 'Enter') $('guess-form').requestSubmit();
    else return;
    event.preventDefault();
  });
  $('pick-down').addEventListener('click', () => setPick(pick - 1));
  $('pick-up').addEventListener('click', () => setPick(pick + 1));
  $('history').addEventListener('scroll', updateHistoryFade, { passive: true });
  $('home').addEventListener('click', goToStart);
  $('retry').addEventListener('click', () => startGame(game.difficulty));
  $('go-home').addEventListener('click', goToStart);
  $('share').addEventListener('click', shareResult);
  $('share-kakao').addEventListener('click', shareKakao);
  $('share-kakao').hidden = !KAKAO_JS_KEY;
  $('lang-toggle').addEventListener('click', toggleLang);

  $('settings-open').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', () => $('settings').close());
  // 대화상자 바깥(배경)을 누르면 닫는다. 내용은 .settings-body 안에 있어 배경 클릭만 대화상자 자체에 닿는다.
  ['settings', 'confirm'].forEach((id) => {
    $(id).addEventListener('click', (event) => {
      if (event.target === $(id)) $(id).close();
    });
  });
  $('confirm-cancel').addEventListener('click', () => $('confirm').close('cancel'));
  $('confirm-ok').addEventListener('click', () => $('confirm').close('ok'));
  Object.keys(UpDown.DIFFICULTIES).forEach((key) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.reset = key;
    button.dataset.i18n = 'difficulty.' + key;
    $('reset-row').appendChild(button);
  });
  document.querySelectorAll('[data-reset]').forEach((button) => {
    button.addEventListener('click', () => resetRecord(button.dataset.reset));
  });
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.themeOption);
      renderSettings();
    });
  });
  document.querySelectorAll('[data-skin-option]').forEach((button) => {
    button.addEventListener('click', () => {
      setSkin(button.dataset.skinOption);
      renderSettings();
    });
  });

  // iOS Safari 는 touchstart 리스너가 있어야 버튼에 :active(눌림 효과)를 적용한다.
  document.addEventListener('touchstart', () => {}, { passive: true });

  renderStaticTexts();
  goToStart();
  // 인트로(css 의 .intro, 약 1.1초)가 끝난 뒤 클래스를 지운다. 여러 요소가 시차를 두고 움직여서 animationend 대신 타이머를 쓴다.
  setTimeout(endIntro, 1400);

  // 서비스 워커는 HTTPS 와 localhost 에서만 등록된다. file:// 로 열면 게임만 동작한다.
  // sw.js 는 캐시 우선이라, 새 버전을 배포해도 이번 화면은 옛 파일로 열린다. 새 서비스 워커가 화면을 넘겨받으면(controllerchange)
  // 한 번 새로 고쳐 바로 새 버전을 보여 준다. 게임 중이면 판을 날리지 않도록 홈으로 갈 때까지 미룬다.
  // 처음 설치(원래 담당 워커가 없음)는 파일이 같으므로 새로 고치지 않는다.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || updateReady) return;
      updateReady = true;
      if (screen === 'start') location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js')
        .then((registration) => {
          // 설치한 앱은 백그라운드에 오래 남아 있으므로 다시 화면에 나올 때도 새 버전을 확인한다.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') registration.update().catch(() => {});
          });
        })
        .catch(() => {});
    });
  }
})();
